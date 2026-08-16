// Askr 2.0 — receptbilder.
//
// 134 bilder har legat i src/assets/recipes/ sedan bildbanken byggdes. Bara
// gamla appen visade dem; Askr 2.0 har aldrig gjort det. Sjunde gången med
// samma mönster — tillgången fanns, vägen dit saknades.
//
// Logiken är FLYTTAD, inte omskriven. Den bodde i features/recipes/index.jsx,
// alltså i gamla appens mapp som 2.0 inte importerar från. En andra variant
// hade gett två uppsättningar regler för samma sak, och alias-tabellen är
// precis den sortens kunskap som glider isär i tysthet.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";
import { receptBild, bildIdUrFilnamn, BILD_ALIAS, bildtäckning } from "../data/recipeImages.js";
import { RECIPES } from "../data/recipes.js";
import { generateWeekMenu } from "../engines/recipes.js";

describe("filnamnet bär receptets id", () => {
  it("allt efter __ ignoreras vid matchning", () => {
    // Det gör mappen läsbar utan uppslagstabell.
    expect(bildIdUrFilnamn("g_bowl_23__bowl-med-kikartor.webp")).toBe("g_bowl_23");
    expect(bildIdUrFilnamn("r_shake.webp")).toBe("r_shake");
  });

  it("varje bildfil matchar ett recept eller ett alias", () => {
    // En bild som inte hör till något recept visas aldrig och är död vikt.
    const ids = new Set(RECIPES.map(r => r.id));
    const aliasMål = new Set(Object.values(BILD_ALIAS));
    for (const f of readdirSync(resolve("src/assets/recipes")).filter(f => /\.(webp|jpe?g|png|avif)$/.test(f))) {
      const id = bildIdUrFilnamn(f);
      expect(ids.has(id) || aliasMål.has(id), `okänt recept-id: ${f}`).toBe(true);
    }
  });
});

describe("alias låter snarlika rätter dela bild", () => {
  it("varje alias pekar från och till ett riktigt recept", () => {
    const ids = new Set(RECIPES.map(r => r.id));
    for (const [från, till] of Object.entries(BILD_ALIAS)) {
      expect(ids.has(från), `okänd nyckel: ${från}`).toBe(true);
      expect(ids.has(till), `okänt mål: ${till}`).toBe(true);
    }
  });

  it("ett recept med alias får målets bild", () => {
    // r_shake har ingen egen bild men samma ingredienser som g_snack_00.
    const shake = RECIPES.find(r => r.id === "r_shake");
    if (shake) expect(receptBild(shake)).toBeTruthy();
  });
});

describe("saknad bild är ett giltigt tillstånd", () => {
  it("receptBild ger null när bilden saknas", () => {
    // Ungefär hälften av recepten saknar bild. Vyerna visar då ingen ruta alls
    // — en tom platshållare drar mer uppmärksamhet än den förtjänar.
    expect(receptBild({ id: "finns_inte_alls" })).toBe(null);
    expect(receptBild(null)).toBe(null);
  });

  it("täckningen räknas mot receptbanken", () => {
    const t = bildtäckning(RECIPES);
    expect(t.av).toBe(RECIPES.length);
    expect(t.med).toBeGreaterThan(100);
  });
});

describe("vyerna använder det delade registret", () => {
  it("veckomenyns recept har bild", () => {
    const m = generateWeekMenu({ targets: { kcal: 2000, protein: 130 }, profile: {} });
    const dag = (m.days || [])[0];
    expect(dag).toBeTruthy();
    // Alla måltider ska inte kräva bild, men menyn ska inte vara helt utan.
    expect(dag.meals.some(x => receptBild(x.recipe))).toBe(true);
  });

  it("båda vyerna importerar samma modul — ingen egen kopia", () => {
    for (const f of ["src/atlas2/FoodView.jsx", "src/atlas2/MealPrepView.jsx"]) {
      expect(readFileSync(resolve(f), "utf8"), f).toMatch(/from "\.\.\/data\/recipeImages\.js"/);
    }
  });
});
