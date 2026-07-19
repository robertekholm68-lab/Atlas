// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { RECIPES } from "../data/recipes.js";
import { recipeMacros, recipeDiet, recipeAllergens, recipeFits, filterRecipes, generateWeekMenu, shoppingList, recipeLogEntry } from "../engines/recipes.js";
import { recipePhoto } from "../features/recipes/index.jsx";

describe("recept — makron ur ingredienser", () => {
  it("alla recept får kompletta makron (inga okända ingredienser)", () => {
    const bad = RECIPES.filter(r => !recipeMacros(r).complete).map(r => r.id);
    expect(bad).toEqual([]);
  });
  it("makron är rimliga och positiva", () => {
    RECIPES.forEach(r => { const m = recipeMacros(r); expect(m.kcal).toBeGreaterThan(50); expect(m.protein).toBeGreaterThanOrEqual(0); });
  });
});

describe("recept — kost och allergier härleds ur innehållet", () => {
  it("kött → omnivore, fisk → pescetarian, mejeri → vegetarisk, växt → vegansk", () => {
    expect(recipeDiet(RECIPES.find(r => r.id === "r_chicken_rice"))).toBe("omnivore");
    expect(recipeDiet(RECIPES.find(r => r.id === "r_salmon_potato"))).toBe("pescetarian");
    expect(recipeDiet(RECIPES.find(r => r.id === "r_quark_bowl"))).toBe("vegetarian");
    expect(recipeDiet(RECIPES.find(r => r.id === "r_vegan_oats"))).toBe("vegan");
  });
  it("allergener hittas ur ingredienserna", () => {
    expect(recipeAllergens(RECIPES.find(r => r.id === "r_shrimp_pasta"))).toContain("shellfish");
    expect(recipeAllergens(RECIPES.find(r => r.id === "r_apple_pb"))).toContain("nuts");
  });
  it("vegan ser aldrig kött, fisk, mejeri eller ägg", () => {
    filterRecipes({ diet: "vegan" }).forEach(r => expect(recipeDiet(r)).toBe("vegan"));
  });
  it("restriktioner filtreras bort helt — säkerhet först", () => {
    filterRecipes({ diet: "omnivore", restrictions: ["nuts", "lactose"] }).forEach(r => {
      const a = recipeAllergens(r);
      expect(a).not.toContain("nuts");
      expect(a).not.toContain("lactose");
    });
  });
  it("keto släpper bara igenom lågkolhydratsrecept", () => {
    filterRecipes({ diet: "omnivore", dietApproach: "keto" }).forEach(r => expect(recipeMacros(r).carbs).toBeLessThanOrEqual(15));
  });
});

describe("veckomeny", () => {
  const targets = { kcal: 2600, protein: 160 };
  it("bygger 7 dagar och landar nära kcal-målet", () => {
    const menu = generateWeekMenu({ targets, diet: "omnivore", seed: 3 });
    expect(menu.hasData).toBe(true);
    expect(menu.days.length).toBe(7);
    menu.days.forEach(d => {
      expect(Math.abs(d.totals.kcal - targets.kcal) / targets.kcal).toBeLessThan(0.2);
    });
  });
  it("respekterar restriktioner i hela menyn", () => {
    const menu = generateWeekMenu({ targets, diet: "vegetarian", restrictions: ["nuts"], seed: 5 });
    if (menu.hasData) menu.days.forEach(d => d.meals.forEach(m => {
      expect(recipeAllergens(m.recipe)).not.toContain("nuts");
      expect(["vegan", "vegetarian"]).toContain(recipeDiet(m.recipe));
    }));
  });
  it("samma frö ger samma meny (deterministisk)", () => {
    const a = generateWeekMenu({ targets, diet: "omnivore", seed: 11 });
    const b = generateWeekMenu({ targets, diet: "omnivore", seed: 11 });
    expect(a.days[0].meals.map(m => m.recipe.id)).toEqual(b.days[0].meals.map(m => m.recipe.id));
  });
  it("för smal pool → hasData false i stället för påhittad meny", () => {
    const menu = generateWeekMenu({ targets, diet: "vegan", restrictions: ["gluten", "nuts", "soy", "egg", "lactose"], dietApproach: "keto" });
    expect(menu.hasData).toBe(false);
  });

  it("veganskt, keto och vegetariskt utan laktos går alla att bygga en vecka på", () => {
    [["vegan", {}], ["omnivore", { dietApproach: "keto" }], ["vegetarian", { restrictions: ["lactose"] }],
     ["vegan", { restrictions: ["gluten", "nuts"] }]].forEach(([diet, extra]) => {
      const m = generateWeekMenu({ targets, diet, seed: 5, ...extra });
      expect(m.hasData).toBe(true);
      expect(m.days.length).toBe(7);
    });
  });

  it("honung räknas inte som veganskt", () => {
    const honey = RECIPES.find(r => (r.i || []).some(x => x.id === "slv_honung"));
    if (honey) expect(recipeDiet(honey)).not.toBe("vegan");
  });
  it("inköpslistan summerar ingredienser per kategori", () => {
    const menu = generateWeekMenu({ targets, diet: "omnivore", seed: 3 });
    const list = shoppingList(menu);
    expect(list.length).toBeGreaterThan(2);
    list.forEach(g => g.items.forEach(it => expect(it.grams).toBeGreaterThan(0)));
  });
  it("recept kan loggas som måltid med skalade makron", () => {
    const r = RECIPES[0], e = recipeLogEntry(r, 2);
    expect(e.kcal).toBe(recipeMacros(r).kcal * 2);
    expect(e.source).toBe("recipe");
  });
});

describe("receptbilder — sömmen mot riktiga foton", () => {
  it("utan fil i assets/recipes faller receptet tillbaka på genererad identitet", () => {
    RECIPES.forEach(r => { if (!r.image) expect(recipePhoto(r)).toBe(null); });
  });
  it("ett recept med image-fält (extern URL) används rakt av", () => {
    expect(recipePhoto({ id: "finns_inte", image: "https://exempel.se/bild.webp" })).toBe("https://exempel.se/bild.webp");
  });
  it("varje recept har ett tema och motiv för identiteten", () => {
    RECIPES.forEach(r => { expect(r.theme).toBeTruthy(); expect(r.icon).toBeTruthy(); });
  });
});
