// @vitest-environment jsdom
// Askr 2.0 — redigera loggad mat.
//
// Man skriver fel mängd eller loggar fel sak. Utan ändring och borttagning
// fanns ingen väg tillbaka: dagens summa var fel resten av dygnet, och allt som
// läser den räknade vidare på felet — coachen, näringsmålen,
// readiness-modifieraren.

import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { readFileSync } from "fs";
import { resolve } from "path";
import { FoodView } from "../atlas2/FoodView.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const POSTER = [
  { id: "f_1", foodId: "keso", name: "Keso", grams: 100, kcal: 98, protein: 12, carbs: 3, fat: 4, ts: Date.now() },
  { id: "f_2", name: "Fotad måltid", kcal: 450, protein: 35, carbs: 40, fat: 12, ts: Date.now(), quality: "photo" },
];

const roots = [];
afterEach(async () => {
  await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) {} el.remove(); }); });
});

const rendera = async () => {
  let logg = POSTER.map(x => ({ ...x }));
  const el = document.createElement("div"); document.body.appendChild(el);
  const r = createRoot(el); roots.push({ r, el });
  const rita = async () => {
    await act(async () => {
      r.render(createElement(FoodView, {
        foodLog: logg,
        setFoodLog: f => { logg = typeof f === "function" ? f(logg) : f; rita(); },
        nutritionTargets: null, onSätta: () => {}, profile: {}, setProfile: () => {},
      }));
    });
  };
  await rita();
  return { el, logg: () => logg };
};

const poster = el => [...el.querySelectorAll('button[data-post="1"]')];

describe("posterna går att öppna", () => {
  it("varje loggad post är en knapp, inte en död rad", async () => {
    const { el } = await rendera();
    expect(poster(el).length).toBe(2);
  });

  it("nyckeln är postens id, inte index", async () => {
    // Med key={i} återanvänder React fel rad när en post tas bort mitt i
    // listan — den utfällda redigeringen följer med till nästa post. Buggen var
    // latent så länge inget gick att ta bort.
    const src = readFileSync(resolve("src/atlas2/FoodView.jsx"), "utf8");
    expect(src).toMatch(/key=\{e\.id\}/);
  });
});

describe("mängden går att ändra", () => {
  it("näringen räknas om ur livsmedlet, inte skalas ur den gamla summan", async () => {
    // Skalning av ett redan avrundat tal driver iväg efter några ändringar.
    const { el, logg } = await rendera();
    await act(async () => { poster(el)[0].click(); });
    await act(async () => { el.querySelector('[aria-label="Öka mängd"]').click(); });
    const p = logg().find(x => x.id === "f_1");
    expect(p.grams).toBe(105);
    // Keso: 98 kcal/100 g → 105 g ger 103.
    expect(p.kcal).toBe(103);
  });

  it("mängden kan inte gå under 5 g", async () => {
    const { el, logg } = await rendera();
    await act(async () => { poster(el)[0].click(); });
    for (let i = 0; i < 30; i++) {
      await act(async () => { el.querySelector('[aria-label="Minska mängd"]').click(); });
    }
    expect(logg().find(x => x.id === "f_1").grams).toBeGreaterThanOrEqual(5);
  });

  it("en post utan livsmedel får ett kcal-fält i stället för gram", async () => {
    // Först stod det bara "ta bort och logga om" här. Det var fel svar på "jag
    // åt lite mindre" — en fotad eller AI-hämtad post har en färdig summa, men
    // summan är precis det man vill rätta.
    //
    // Gramfältet hör inte hit: posten bär inget livsmedel att räkna ur. Men
    // kalorierna går att sätta, och makrona följer med.
    const { el } = await rendera();
    await act(async () => { poster(el)[1].click(); });
    expect(el.querySelector('input[data-kcal="1"]')).toBeTruthy();
    expect(el.querySelector('input[data-gram="1"]')).toBeFalsy();
  });
});

describe("posten går att ta bort", () => {
  it("borttag tar bort rätt post", async () => {
    const { el, logg } = await rendera();
    await act(async () => { poster(el)[1].click(); });
    await act(async () => { el.querySelector('button[data-tabort="1"]').click(); });
    expect(logg().length).toBe(1);
    expect(logg()[0].id).toBe("f_1");
  });
});

describe("namnet går att rätta", () => {
  it("fältet visar postens nuvarande namn", async () => {
    // Man loggar "kyckl" i farten, eller får "Fotad måltid" ur fotovyn. Utan
    // ett fält står felstavningen kvar i historiken för alltid — och historiken
    // är det man bläddrar i när man försöker minnas vad man åt.
    const { el } = await rendera();
    await act(async () => { poster(el)[0].click(); });
    expect(el.querySelector('input[data-namn="1"]').value).toBe("Keso");
  });

  it("ändringen sparas i loggen", async () => {
    const { el, logg } = await rendera();
    await act(async () => { poster(el)[0].click(); });
    const f = el.querySelector('input[data-namn="1"]');
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(f, "Kyckling med ris");
      f.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(logg().find(x => x.id === "f_1").name).toBe("Kyckling med ris");
  });

  it("näringen rörs inte av en omdöpning", async () => {
    // Namnet är en etikett. Att låta det räkna om kalorierna vore att gissa att
    // posten också fick nytt innehåll — den som rättar "kyckl" till "kyckling"
    // har inte ätit något annat.
    const { el, logg } = await rendera();
    const före = logg().find(x => x.id === "f_1");
    await act(async () => { poster(el)[0].click(); });
    const f = el.querySelector('input[data-namn="1"]');
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(f, "Något helt annat");
      f.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const efter = logg().find(x => x.id === "f_1");
    for (const k of ["kcal", "protein", "carbs", "fat", "grams", "foodId"]) {
      expect(efter[k], k).toBe(före[k]);
    }
  });

  it("även en post utan livsmedel går att döpa om", async () => {
    // En fotad post heter "Fotad måltid" tills någon säger vad det var.
    const { el, logg } = await rendera();
    await act(async () => { poster(el)[1].click(); });
    const f = el.querySelector('input[data-namn="1"]');
    expect(f).toBeTruthy();
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(f, "Lunch på jobbet");
      f.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(logg().find(x => x.id === "f_2").name).toBe("Lunch på jobbet");
  });
});

describe("mängden går att skriva, inte bara stega", () => {
  const skriv = async (el, fält, värde) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(fält, värde);
      fält.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };

  it("fältet visar nuvarande mängd", async () => {
    // Från 100 till 250 g är trettio tryck på plusknappen. Knapparna är rätt
    // för finjustering, fältet för att byta storleksordning.
    const { el } = await rendera();
    await act(async () => { poster(el)[0].click(); });
    expect(el.querySelector('input[data-gram="1"]').value).toBe("100");
  });

  it("skriven mängd räknar om näringen", async () => {
    const { el, logg } = await rendera();
    await act(async () => { poster(el)[0].click(); });
    await skriv(el, el.querySelector('input[data-gram="1"]'), "250");
    const p = logg().find(x => x.id === "f_1");
    expect(p.grams).toBe(250);
    // Keso 98 kcal/100 g → 245.
    expect(p.kcal).toBe(245);
  });

  it("tomt fält tillåts under skrivandet och ger inte NaN", async () => {
    // Raderar man 100 för att skriva 250 passerar fältet genom tomt. Att då
    // tvinga tillbaka en etta gör det omöjligt att skriva, och utan Number()
    // blir summan NaN — ett fel som ser ut som en krasch men bara är ett
    // halvskrivet tal.
    const { el, logg } = await rendera();
    await act(async () => { poster(el)[0].click(); });
    await skriv(el, el.querySelector('input[data-gram="1"]'), "");
    expect(logg().find(x => x.id === "f_1").kcal).toBe(0);
    expect(el.textContent).not.toMatch(/NaN/);
  });

  it("bokstäver ignoreras", async () => {
    const { el, logg } = await rendera();
    await act(async () => { poster(el)[0].click(); });
    await skriv(el, el.querySelector('input[data-gram="1"]'), "12a3b");
    expect(logg().find(x => x.id === "f_1").grams).toBe(123);
  });

  it("orimliga tal kapas", async () => {
    const { el, logg } = await rendera();
    await act(async () => { poster(el)[0].click(); });
    await skriv(el, el.querySelector('input[data-gram="1"]'), "99999");
    expect(logg().find(x => x.id === "f_1").grams).toBeLessThanOrEqual(5000);
  });

  it("stegknapparna fungerar efter ett tomt fält", async () => {
    // Utan Number() i stegfunktionen ger "" + 5 strängen "5" — eller NaN.
    const { el, logg } = await rendera();
    await act(async () => { poster(el)[0].click(); });
    await skriv(el, el.querySelector('input[data-gram="1"]'), "");
    await act(async () => { el.querySelector('[aria-label="Öka mängd"]').click(); });
    expect(logg().find(x => x.id === "f_1").grams).toBe(5);
  });
});

describe("loggknappen står före listan", () => {
  it("knappen renderas ovanför dagens måltider", async () => {
    // Efter listan vandrar den nedåt för varje loggad måltid: en dag med sex
    // poster kräver att man scrollar förbi allt man redan gjort för att komma
    // åt det man vill göra. Handlingen ska inte bli svårare att nå ju mer man
    // använt appen.
    const { el } = await rendera();
    const knapp = el.querySelector('button[data-logga-maltid="1"]');
    const första = el.querySelector('button[data-post="1"]');
    expect(knapp).toBeTruthy();
    expect(första).toBeTruthy();
    // compareDocumentPosition: 4 = knappen kommer före posten i dokumentet.
    expect(knapp.compareDocumentPosition(första) & 4).toBeTruthy();
  });
});

describe("listan är kolumner, inte löpande text", () => {
  it("mängden står i en egen kolumn", async () => {
    // "100 g · P 12 g · uppskattat" tvingar ögat att läsa en mening för att
    // hitta ett tal. Med mängden i egen kolumn kan man skanna listan lodrätt:
    // namn, mängd, kalorier.
    const { el } = await rendera();
    const rad = poster(el)[0];
    const kolumner = [...rad.children].map(x => x.textContent.trim());
    expect(kolumner.length).toBeGreaterThanOrEqual(3);
    expect(kolumner[0]).toBe("Keso");
    expect(kolumner[1]).toBe("100 g");
  });

  it("styckvaror visas som antal, inte som gram", async () => {
    // "2 knäckebröd" räknades om till 22 g för näringen, men listan visade
    // "22 g" — ett tal användaren aldrig sagt och inte känner igen. Antalet är
    // det man minns; gramtalet är motorns mellansteg.
    const el = document.createElement("div"); document.body.appendChild(el);
    const r = createRoot(el); roots.push({ r, el });
    await act(async () => {
      r.render(createElement(FoodView, {
        foodLog: [{ id: "k1", name: "Knäckebröd", antal: 2, antalOrd: "knäckebröd",
          kcal: 75, protein: 2, carbs: 14, fat: 1, ts: Date.now() }],
        setFoodLog: () => {}, nutritionTargets: null, onSätta: () => {},
        profile: {}, setProfile: () => {},
      }));
    });
    const rad = el.querySelector('button[data-post="1"]');
    expect([...rad.children].map(x => x.textContent.trim())[1]).toBe("2 st");
  });

  it("proteinet flyttade till detaljvyn", async () => {
    // På raden konkurrerade det med mängden och gjorde den svår att skanna.
    const { el } = await rendera();
    expect(poster(el)[0].textContent).not.toMatch(/P \d+ g/);
    await act(async () => { poster(el)[0].click(); });
    expect(el.textContent).toMatch(/P \d+ g/);
  });
});

describe("tilliten syns på raden", () => {
  it("en uppskattad post märks med tilde i mängdkolumnen", async () => {
    // Orden "uppskattat" och "ur foto" flyttades till detaljvyn för att
    // kolumnen skulle gå att skanna — men då försvann all markering av att
    // talet är osäkert, och DOM-verifieringen fångade det.
    //
    // ~ betyder ungefär och kostar inte en rad.
    const el = document.createElement("div"); document.body.appendChild(el);
    const r = createRoot(el); roots.push({ r, el });
    await act(async () => {
      r.render(createElement(FoodView, {
        foodLog: [{ id: "u1", name: "Kyckling med ris", kcal: 620, protein: 48,
          carbs: 70, fat: 8, ts: Date.now(), quality: "estimated" }],
        setFoodLog: () => {}, nutritionTargets: null, onSätta: () => {},
        profile: {}, setProfile: () => {},
      }));
    });
    expect(el.querySelector('button[data-post="1"]').textContent).toMatch(/~/);
  });

  it("en vägd post har ingen tilde", async () => {
    // Keso 100 g är mätt, inte uppskattat — då vore tecknet vilseledande.
    const { el } = await rendera();
    expect(poster(el)[0].textContent).not.toMatch(/~/);
  });
});

describe("poster utan livsmedel går också att justera", () => {
  const aiPost = () => [{ id: "a1", name: "Max Dubbel Original", kcal: 760,
    protein: 46, carbs: 44, fat: 44, grams: 310, ts: Date.now(), quality: "ai" }];

  const renderaAI = async () => {
    let logg = aiPost();
    const el = document.createElement("div"); document.body.appendChild(el);
    const r = createRoot(el); roots.push({ r, el });
    const rita = async () => {
      await act(async () => {
        r.render(createElement(FoodView, {
          foodLog: logg,
          setFoodLog: f => { logg = typeof f === "function" ? f(logg) : f; rita(); },
          nutritionTargets: null, onSätta: () => {}, profile: {}, setProfile: () => {},
        }));
      });
    };
    await rita();
    return { el, logg: () => logg };
  };

  it("en AI-post har ett kcal-fält", async () => {
    // Tidigare stod det bara "ta bort och logga om", vilket är fel svar på
    // "jag åt lite mindre".
    const { el } = await renderaAI();
    await act(async () => { el.querySelector('button[data-post="1"]').click(); });
    expect(el.querySelector('input[data-kcal="1"]')).toBeTruthy();
  });

  it("makrona skalas i samma förhållande som kalorierna", async () => {
    // 380 kcal med 46 g protein finns inte som mat. Att låta kcal ändras
    // ensamt hade gjort posten inkonsekvent.
    const { el, logg } = await renderaAI();
    await act(async () => { el.querySelector('button[data-post="1"]').click(); });
    const f = el.querySelector('input[data-kcal="1"]');
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(f, "380");
      f.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const p = logg()[0];
    expect(p.kcal).toBe(380);
    expect(p.protein).toBe(23);
    expect(p.carbs).toBe(22);
    expect(p.fat).toBe(22);
  });

  it("stegknappen ändrar tio procent", async () => {
    const { el, logg } = await renderaAI();
    await act(async () => { el.querySelector('button[data-post="1"]').click(); });
    await act(async () => { el.querySelector('[aria-label="Minska mängd"]').click(); });
    expect(logg()[0].kcal).toBe(684);
  });
});

describe("detaljvyn visar alla fyra makron", () => {
  it("kolhydrater och fett står bredvid protein", async () => {
    // Posten har burit carbs och fat hela tiden — motorn räknar dem,
    // buildEstimatedEntry sparar dem — men vyn visade bara P. Robert jämförde
    // med en annan app och trodde att Askr räknade fel; det var ett
    // VISNINGSfel, siffrorna fanns.
    const el = document.createElement("div"); document.body.appendChild(el);
    const r = createRoot(el); roots.push({ r, el });
    await act(async () => {
      r.render(createElement(FoodView, {
        foodLog: [{ id: "s1", name: "300 gram köttfärssås", kcal: 300, protein: 25,
          carbs: 14, fat: 15, ts: Date.now(), quality: "estimated" }],
        setFoodLog: () => {}, nutritionTargets: null, onSätta: () => {},
        profile: {}, setProfile: () => {},
      }));
    });
    await act(async () => { el.querySelector('button[data-post="1"]').click(); });
    expect(el.textContent).toMatch(/P 25 g · K 14 g · F 15 g/);
  });

  it("räknas ur livsmedlet när posten bär ett", async () => {
    // Samma väg som kcal och protein — annars skulle en justerad mängd ge rätt
    // kalorier men fel kolhydrater.
    const { el } = await rendera();
    await act(async () => { poster(el)[0].click(); });
    expect(el.textContent).toMatch(/P \d+ g · K \d+ g · F \d+ g/);
  });
});
