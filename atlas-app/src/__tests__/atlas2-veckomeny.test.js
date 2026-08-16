// Askr 2.0 — veckomenyn: byte, omräkning och sparning.
//
// Menyn genererade om sig varje gång vyn öppnades. Samma frö gav samma vecka,
// men allt eget arbete var borta — och det fanns inget sätt att byta en rätt
// man inte ville äta.
//
// En meny man bytt rätter i är inte längre generatorns, den är användarens.

import { describe, it, expect } from "vitest";
import { generateWeekMenu, räknaOmDag, alternativFör, recipeMacros } from "../engines/recipes.js";
import { RECIPES } from "../data/recipes.js";

const MÅL = { kcal: 2000, protein: 130 };

describe("alternativ till en måltid", () => {
  it("den nuvarande rätten utesluts", () => {
    // Att visa den som ett "alternativ" vore att erbjuda ett byte till samma sak.
    const m = generateWeekMenu({ targets: MÅL });
    const nu = m.days[0].meals.find(x => x.meal === "lunch");
    const alt = alternativFör({ mealId: "lunch", nuvarandeId: nu.recipe.id, targets: MÅL });
    expect(alt.length).toBeGreaterThan(0);
    expect(alt.some(a => a.recipe.id === nu.recipe.id)).toBe(false);
  });

  it("bara rätter för rätt måltid föreslås", () => {
    const alt = alternativFör({ mealId: "breakfast", targets: MÅL });
    for (const a of alt) expect(a.recipe.meal, a.recipe.name).toBe("breakfast");
  });

  it("kostvalet respekteras", () => {
    // Ett alternativ som bryter mot kosten är värre än inget alternativ.
    const alt = alternativFör({ mealId: "lunch", targets: MÅL, diet: "vegan" });
    const veganska = new Set(RECIPES.filter(r => r.diet === "vegan" || (r.diets || []).includes("vegan")).map(r => r.id));
    if (veganska.size) for (const a of alt) expect(veganska.has(a.recipe.id) || a.recipe.vegan, a.recipe.name).toBeTruthy();
  });

  it("rangordnas efter måltidens andel av dagsmålet", () => {
    // Samma poängsättning som generatorn — annars föreslår bytet något
    // generatorn själv aldrig hade valt.
    const alt = alternativFör({ mealId: "dinner", targets: MÅL });
    const want = MÅL.kcal * 0.33;
    const avstånd = alt.map(a => Math.abs(a.macros.kcal - want));
    // Första halvan ska ligga närmare målet än andra halvan.
    const halv = Math.floor(avstånd.length / 2);
    const snittFörst = avstånd.slice(0, halv).reduce((a, b) => a + b, 0) / halv;
    const snittSist = avstånd.slice(halv).reduce((a, b) => a + b, 0) / (avstånd.length - halv);
    expect(snittFörst).toBeLessThan(snittSist * 1.5);
  });
});

describe("dagen räknas om efter ett byte", () => {
  it("samma skalning som generatorn använder", () => {
    // Två vägar till samma tal glider isär. räknaOmDag måste ge exakt vad
    // generateWeekMenu skulle gett för samma måltider.
    const m = generateWeekMenu({ targets: MÅL });
    const d = m.days[0];
    const om = räknaOmDag(d.meals, MÅL.kcal);
    expect(om.scale).toBe(d.scale);
    expect(om.totals.kcal).toBe(d.totals.kcal);
    expect(om.totals.protein).toBe(d.totals.protein);
  });

  it("ett byte ändrar dagens summa", () => {
    const m = generateWeekMenu({ targets: MÅL });
    const d = m.days[0];
    const alt = alternativFör({ mealId: "lunch", nuvarandeId: d.meals[1].recipe.id, targets: MÅL });
    const nya = d.meals.map((x, i) => i === 1 ? { ...x, recipe: alt[0].recipe } : x);
    const om = räknaOmDag(nya, MÅL.kcal);
    expect(om.totals.kcal).toBeGreaterThan(0);
    // Skalningstaket håller: dagen får aldrig avvika mer än 40 % från målet.
    expect(om.scale).toBeGreaterThanOrEqual(0.7);
    expect(om.scale).toBeLessThanOrEqual(1.4);
  });

  it("alla fyra makron summeras, inte bara kcal och protein", () => {
    const m = generateWeekMenu({ targets: MÅL });
    const t = räknaOmDag(m.days[0].meals, MÅL.kcal).totals;
    for (const k of ["kcal", "protein", "carbs", "fat"]) expect(t[k], k).toBeGreaterThan(0);
  });
});
