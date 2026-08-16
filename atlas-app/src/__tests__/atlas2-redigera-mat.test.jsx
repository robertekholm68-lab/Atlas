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

  it("en post utan livsmedel erbjuder ingen gramknapp", async () => {
    // En fotad eller uppskattad post har en färdig summa, inte ett gramtal att
    // skala. En knapp som inte gör något är värre än ingen knapp.
    const { el } = await rendera();
    await act(async () => { poster(el)[1].click(); });
    expect(el.textContent).toMatch(/färdig summa/i);
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
