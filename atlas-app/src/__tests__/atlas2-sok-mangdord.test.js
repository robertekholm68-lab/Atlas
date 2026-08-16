// Askr 2.0 — sökningen tål mängdord, och basvaror har generiska poster.
//
// TVÅ FEL SOM DOLDE VARANDRA.
//
// searchFoods fick hela frasen inklusive siffror och enheter. "100 gram keso"
// matchades mot "Keso", där varken talet eller ordet "gram" finns — resultatet
// blev NOLL träffar. Varje sökning med en mängd i föll igenom.
//
// Det märktes inte i matloggen, för estimateMeal har en kurerad lista som
// räddar de vanligaste orden. Allt utanför den listan blev tyst osynligt, och
// felet hittades först när "50 milliliter olja" gav 0 träffar.

import { describe, it, expect } from "vitest";
import { searchFoods, estimateMeal } from "../engines/index.js";
import { FOOD_INDEX } from "../data/foods.js";

describe("mängdord stör inte sökningen", () => {
  it("en fras med gram hittar livsmedlet", () => {
    const t = searchFoods("100 gram keso", null, null, 2) || [];
    expect(t.length).toBeGreaterThan(0);
    expect(t[0].name).toMatch(/keso/i);
  });

  it("utskrivna enheter rensas också", () => {
    for (const q of ["2 deciliter mjölk", "5 centiliter grädde", "50 milliliter olja"]) {
      expect((searchFoods(q, null, null, 1) || []).length, q).toBeGreaterThan(0);
    }
  });

  it("räkneord och antal rensas", () => {
    const t = searchFoods("2 knäckebröd", null, null, 1) || [];
    expect(t[0].name).toMatch(/knäckebröd/i);
  });

  it("en fras som BARA är en mängd faller tillbaka på originalet", () => {
    // "100 g" har inget livsmedel kvar efter rensning. Att då returnera noll
    // hade varit rätt, men att krascha eller returnera null vore fel.
    expect(() => searchFoods("100 g", null, null, 1)).not.toThrow();
  });
});

describe("basvaror har en generisk post", () => {
  it("olja ger olja, inte tomat med olja", () => {
    // Databasen hade bara sammansatta namn — Olivolja, Majsolja — så "olja"
    // matchade "Tomat torkad m. olja". Fel vara, och tyst.
    const t = (searchFoods("olja", null, null, 1) || [])[0];
    expect(t.name.toLowerCase().startsWith("olja")).toBe(true);
    // Alla matoljor ligger på 884 kcal, så schablonen är exakt.
    expect(t.kcal).toBe(884);
  });

  it("mjöl, kött och kryddor likaså", () => {
    for (const [ord, väntad] of [["mjöl", /^mjöl/i], ["kött", /^kött/i], ["kryddor", /^kryddor/i]]) {
      const t = (searchFoods(ord, null, null, 1) || [])[0];
      expect(t && t.name, ord).toMatch(väntad);
    }
  });

  it("specifika sökningar träffar fortfarande rätt", () => {
    // De generiska posterna får inte tränga undan de exakta.
    expect((searchFoods("olivolja", null, null, 1) || [])[0].name).toMatch(/olivolja/i);
    expect((searchFoods("nötfärs", null, null, 1) || [])[0].name).toMatch(/nötfärs/i);
  });

  it("de generiska posterna har fullständiga näringsvärden", () => {
    // En post utan värden ger 0 kcal och ser ut som att maten var kalorifri.
    for (const id of ["olja_gen", "mjol_gen", "kott_gen", "kryddor_gen"]) {
      const f = FOOD_INDEX.find(x => x.id === id);
      expect(f, id).toBeTruthy();
      for (const k of ["kcal", "protein", "carbs", "fat"]) expect(typeof f[k], `${id}.${k}`).toBe("number");
    }
  });
});

describe("hela kedjan", () => {
  it("50 milliliter olja räknas på 50 g olja", () => {
    const e = estimateMeal("50 milliliter olja");
    expect(e.angivenMängd).toBe(50);
    // 884 kcal/100 g → 442.
    expect(e.kcal).toBe(442);
  });
});
