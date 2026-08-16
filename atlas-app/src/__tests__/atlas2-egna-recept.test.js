// Askr 2.0 — egna recept.
//
// Receptbanken har 276 rätter men inget sätt att lägga till en egen. Den som
// lagar samma sak varje vecka fick logga ingredienserna en och en, varje gång.
//
// NÄRINGEN RÄKNAS, DEN SKRIVS INTE IN. Ett recept är { i: [{id, g}] } och
// recipeMacros summerar ur samma livsmedelsdatabas som matloggen. Ett
// handskrivet kcal-tal hade blivit en andra sanning om samma mat, och den
// skulle glida isär från databasen vid första tillfället.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { byggEgetRecept } from "../atlas2/CustomRecipe.jsx";
import { recipeMacros, recipeLogEntry } from "../engines/recipes.js";
import { RECIPES } from "../data/recipes.js";
import { FOOD_INDEX } from "../data/foods.js";

const ing = (id, g) => ({ id, g });
const eget = (extra = {}) => byggEgetRecept({
  namn: "Roberts gryta", meal: "dinner", servings: 2, time: 30,
  ingredienser: [ing(FOOD_INDEX[0].id, 200), ing(FOOD_INDEX[1].id, 100)],
  steps: ["Bryn", "Koka"], ...extra,
});

describe("formen är bankens", () => {
  it("samma fält som ett inbyggt recept", () => {
    // Avviker formen går motorn sönder på ställen som inte har med den här
    // vyn att göra: veckomenyn, inköpslistan, preferensberäkningen.
    const bankens = new Set(Object.keys(RECIPES[0]));
    for (const k of bankens) expect(Object.keys(eget()), `saknar ${k}`).toContain(k);
  });

  it("ingredienserna bär id och gram, inget annat", () => {
    for (const x of eget().i) {
      expect(Object.keys(x).sort()).toEqual(["g", "id"]);
      expect(x.g).toBeGreaterThan(0);
    }
  });

  it("id:t krockar inte med bankens", () => {
    const r = eget();
    expect(r.id).toMatch(/^r_egen_/);
    expect(RECIPES.some(x => x.id === r.id)).toBe(false);
  });

  it("tomma ingredienser och steg rensas bort", () => {
    // En ingrediens med noll gram bidrar inte till näringen men skulle synas i
    // inköpslistan. Ett tomt steg är en rad utan innehåll.
    const r = byggEgetRecept({
      namn: "X", meal: "lunch", servings: 1,
      ingredienser: [ing(FOOD_INDEX[0].id, 100), ing(FOOD_INDEX[1].id, 0), ing("", 50)],
      steps: ["Gör", "", "   "],
    });
    expect(r.i.length).toBe(1);
    expect(r.steps.length).toBe(1);
  });
});

describe("näringen räknas ur livsmedelsdatan", () => {
  it("recipeMacros fungerar på ett eget recept", () => {
    const m = recipeMacros(eget());
    expect(m).toBeTruthy();
    expect(m.kcal).toBeGreaterThan(0);
    for (const k of ["kcal", "protein", "carbs", "fat"]) expect(typeof m[k], k).toBe("number");
  });

  it("portioner delar näringen", () => {
    // Samma ingredienser på fyra portioner ska ge hälften mot två.
    const två = recipeMacros(eget({ servings: 2 }));
    const fyra = recipeMacros(eget({ servings: 4 }));
    expect(fyra.kcal).toBeLessThan(två.kcal);
  });

  it("receptet går att logga som vilket recept som helst", () => {
    const post = recipeLogEntry(eget(), 1);
    expect(post.kcal).toBeGreaterThan(0);
    expect(post.recipeId).toMatch(/^r_egen_/);
  });
});

describe("vyn skriver inte in näring för hand", () => {
  it("inget fält för kcal, protein, kolhydrater eller fett", () => {
    // Skulle användaren kunna skriva talen själv fanns två sanningar om samma
    // mat, och de skulle glida isär vid första tillfället.
    const src = readFileSync(resolve("src/atlas2/CustomRecipe.jsx"), "utf8");
    expect(src).not.toMatch(/aria-label="(Kalorier|Protein|Kolhydrater|Fett)"/i);
    expect(src).toMatch(/recipeMacros/);
  });

  it("ofullständig näring sägs rakt ut", () => {
    // Saknar ett livsmedel värden blir summan lägre än den verkliga. Att visa
    // den utan förbehåll vore att påstå mer än vi vet.
    const src = readFileSync(resolve("src/atlas2/CustomRecipe.jsx"), "utf8");
    expect(src).toMatch(/complete/);
    // Texten är radbruten i källan — matcha på en fras som inte korsar raden.
    expect(src).toMatch(/saknar fullständiga näringsvärden/);
  });
});
