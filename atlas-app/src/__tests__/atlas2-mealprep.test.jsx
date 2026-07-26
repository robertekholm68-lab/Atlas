// @vitest-environment jsdom
// Askr 2.0 — meal prep: kostval, veckomeny, inköpslista.
//
// Det som bevakas hårdast är ALLERGISÄKERHETEN. En veckomeny är ett löfte om
// sju dagars mat; bryter den mot en angiven allergi är det inte en bugg i
// utseendet utan en risk. Motorn har rätt hållning inbyggd — recept med
// otaggade ingredienser utesluts helt när en restriktion är vald, eftersom
// frihet från nötter inte kan LOVAS — och de testerna finns här för att den
// hållningen aldrig ska kunna mjukas upp av misstag.
//
// Näst hårdast bevakas det ärliga tomtillståndet: hellre ingen vecka alls än en
// vecka som bryter mot det användaren sagt.

import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { generateWeekMenu, shoppingList, filterRecipes, recipeAllergens, recipeDiet, recipeHasUnknown } from "../engines/recipes.js";
import { RECIPES } from "../data/recipes.js";
import { MealPrepView } from "../atlas2/MealPrepView.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const MÅL = { kcal: 2400, protein: 180 };

describe("kostfiltret — löftet till användaren", () => {
  it("en vegansk vecka innehåller inte ett enda djurbaserat recept", () => {
    const meny = generateWeekMenu({ targets: MÅL, diet: "vegan", seed: 4 });
    expect(meny.hasData).toBe(true);
    meny.days.forEach(d => d.meals.forEach(m => {
      expect(recipeDiet(m.recipe)).toBe("vegan");
    }));
  });

  it("en angiven allergi bryts ALDRIG i veckomenyn", () => {
    for (const allergi of ["nuts", "gluten", "lactose", "shellfish"]) {
      const meny = generateWeekMenu({ targets: MÅL, diet: "omnivore", restrictions: [allergi], seed: 7 });
      if (meny.hasData === false) continue;                       // ärligt tomt är också godkänt
      meny.days.forEach(d => d.meals.forEach(m => {
        expect(recipeAllergens(m.recipe)).not.toContain(allergi);
      }));
    }
  });

  it("med allergi vald plockas ÄVEN ofullständigt märkta recept bort", () => {
    // Frihet från nötter kan inte lovas för ett recept med otaggad ingrediens.
    // Ett smalare utbud är rätt fel att göra.
    const utan = filterRecipes({ diet: "omnivore", restrictions: ["nuts"] });
    expect(utan.every(r => !recipeHasUnknown(r))).toBe(true);
    const med = filterRecipes({ diet: "omnivore" });
    expect(med.length).toBeGreaterThan(utan.length);
  });

  it("dietrangordningen är inklusiv nedåt: en allätare får se veganska recept", () => {
    const alla = filterRecipes({ diet: "omnivore" }).length;
    const vegan = filterRecipes({ diet: "vegan" }).length;
    expect(alla).toBeGreaterThan(vegan);
    expect(vegan).toBeGreaterThan(0);
  });
});

describe("veckomenyn", () => {
  it("samma frö ger samma vecka, nytt frö ger en annan", () => {
    const a = generateWeekMenu({ targets: MÅL, diet: "omnivore", seed: 11 });
    const b = generateWeekMenu({ targets: MÅL, diet: "omnivore", seed: 11 });
    const c = generateWeekMenu({ targets: MÅL, diet: "omnivore", seed: 12 });
    const namn = m => m.days.map(d => d.meals.map(x => x.recipe.id).join()).join("|");
    expect(namn(a)).toBe(namn(b));
    expect(namn(a)).not.toBe(namn(c));
  });

  it("veckan varierar — inte samma två rätter om och om igen", () => {
    // Innan variationsspärren gav en vecka 13–15 unika rätter av 28 måltider,
    // och frukosten växlade mellan exakt två. En meny som upprepar sig är inte
    // meal prep. Spärren håller de tre senast använda borta per måltid.
    const meny = generateWeekMenu({ targets: MÅL, diet: "omnivore", seed: 3 });
    const perMåltid = {};
    meny.days.forEach(d => d.meals.forEach(m => {
      (perMåltid[m.meal] = perMåltid[m.meal] || new Set()).add(m.recipe.id);
    }));
    Object.entries(perMåltid).forEach(([måltid, unika]) => {
      expect(unika.size, `${måltid} har för få olika rätter`).toBeGreaterThanOrEqual(4);
    });
    const alla = meny.days.flatMap(d => d.meals.map(m => m.recipe.id));
    expect(new Set(alla).size).toBeGreaterThanOrEqual(18);
  });

  it("variationen kostar inte träffsäkerhet mot kcal-målet", () => {
    // Portionsskalningen har tak på ±40 %. Slår en dag i taket når den inte
    // målet — och att jaga variation får inte skapa sådana dagar.
    const meny = generateWeekMenu({ targets: MÅL, diet: "omnivore", seed: 11 });
    const utanför = meny.days.filter(d => d.scale <= 0.7 || d.scale >= 1.4);
    expect(utanför).toHaveLength(0);
  });

  it("med ett smalt urval upprepas rätter hellre än att veckan vägras", () => {
    // Vegansk + glutenfri + sojafri kost har EN frukost i banken. Då är
    // upprepning oundviklig, och spärren måste ge vika — annars skulle motorn
    // vägra en vecka den faktiskt kan sätta ihop.
    const meny = generateWeekMenu({ targets: MÅL, diet: "vegan", restrictions: ["gluten", "soy"], seed: 3 });
    expect(meny.hasData).toBe(true);
    expect(meny.days).toHaveLength(7);
  });

  it("sju dagar, och ingen rätt två dagar i rad i samma måltid", () => {
    const meny = generateWeekMenu({ targets: MÅL, diet: "omnivore", seed: 3 });
    expect(meny.days).toHaveLength(7);
    for (let i = 1; i < meny.days.length; i++) {
      meny.days[i].meals.forEach((m, j) => {
        expect(m.recipe.id).not.toBe(meny.days[i - 1].meals[j].recipe.id);
      });
    }
  });

  it("inköpslistan kommer FÄRDIGT grupperad per kategori", () => {
    // shoppingList returnerar [{ cat, items }] — inte en platt lista. Vyn ska
    // läsa den grupperingen, inte gruppera om på egen hand.
    const meny = generateWeekMenu({ targets: MÅL, diet: "omnivore", seed: 5 });
    const grupper = shoppingList(meny);
    expect(grupper.length).toBeGreaterThan(2);
    let rader = 0;
    grupper.forEach(g => {
      expect(typeof g.cat).toBe("string");
      expect(g.items.length).toBeGreaterThan(0);
      g.items.forEach(r => {
        expect(r.grams).toBeGreaterThan(0);
        expect(typeof r.name).toBe("string");
        rader++;
      });
    });
    expect(rader).toBeGreaterThan(10);
  });
});

describe("meal prep i gränssnittet", () => {
  const roots = [];
  afterEach(async () => {
    await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) {} el.remove(); }); });
  });
  const rendera = async (props = {}) => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const r = createRoot(el); roots.push({ r, el });
    await act(async () => {
      r.render(createElement(MealPrepView, { nutritionTargets: MÅL, profile: {}, setProfile: () => {}, ...props }));
    });
    return el;
  };
  const knapp = (el, t) => [...el.querySelectorAll("button")].find(b => (b.textContent || "").toLowerCase().includes(t.toLowerCase()));

  it("visar veckans dagar med dagssummor", async () => {
    const el = await rendera();
    expect(el.textContent).toContain("Måndag");
    expect(el.textContent).toContain("Söndag");
    expect(el.textContent).toMatch(/kcal/);
  });

  it("säger hur många recept som passar kosten", async () => {
    const el = await rendera({ profile: { diet: "vegan" } });
    expect(el.textContent).toMatch(/\d+ recept passar din kost/);
  });

  it("varnar ärligt när en allergi krymper utbudet", async () => {
    const el = await rendera({ profile: { diet: "omnivore", restrictions: ["nuts"] } });
    await act(async () => { knapp(el, "Ändra kost").click(); });
    expect(el.textContent).toMatch(/kan inte lova att de är fria/i);
  });

  it("kostvalet skrivs till profilen, inte bara till vyn", async () => {
    let sparad = null;
    const el = await rendera({ setProfile: uppd => { sparad = typeof uppd === "function" ? uppd({}) : uppd; } });
    await act(async () => { knapp(el, "Ändra kost").click(); });
    await act(async () => { knapp(el, "Vegetarian").click(); });
    expect(sparad.diet).toBe("vegetarian");
  });

  it("inköpslistan går att fälla ut och innehåller gram", async () => {
    const el = await rendera();
    await act(async () => { knapp(el, "Inköpslista").click(); });
    expect(el.textContent).toMatch(/\d+ g/);
    expect(el.textContent).toMatch(/Runda upp/);
  });

  it("ny vecka ger en annan meny", async () => {
    const el = await rendera();
    const före = el.textContent;
    await act(async () => { knapp(el, "Ny vecka").click(); });
    expect(el.textContent).not.toBe(före);
  });

  it("när underlaget inte räcker visas inget påhittat — bara sanningen", async () => {
    // Alla restriktioner samtidigt: motorn ska hellre säga att det inte går.
    const el = await rendera({
      profile: { diet: "vegan", restrictions: ["lactose", "gluten", "nuts", "soy", "egg", "shellfish"] },
    });
    const t = el.textContent;
    const tomt = /går inte att sätta ihop/i.test(t);
    const meny = /Måndag/.test(t);
    expect(tomt || meny).toBe(true);                       // ett av två, aldrig något mittemellan
    if (tomt) expect(t).toMatch(/Hellre ingen vecka/i);
  });
});
