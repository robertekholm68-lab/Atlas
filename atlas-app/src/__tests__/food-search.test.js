// Ordgränsen i livsmedelssökningen — regressionsskydd.
//
// VARFÖR FILEN FINNS KVAR EFTER KONSOLIDERINGEN: sökningen låg en period i en
// egen `engines/foodSearch.js` vid sidan av motorns `searchFoods`. Den dubbletten
// är borttagen och beteendet bor nu i `scoreFood` — vilket är rätt, en sökning
// och inte två. Men testerna som bevisade att grundbuggen var fixad låg i den
// raderade filen, och skulle ha försvunnit med den.
//
// Det här är den bugg som startade hela arbetet: sökningen matchade inuti ord.
//   "läsk" gav Fläskfilé   — "fläskfilé" INNEHÅLLER "läsk"
//   "fil"  gav Kycklingfilé
//   "korv" gav Korvbröd
// Den som loggade fil fick kyckling. Det är inte ett rankningsproblem utan ett
// felaktigt svar, och det ska aldrig kunna återuppstå tyst.
//
// `meal-parts.test.js` täcker sökningens ÖVRIGA egenskaper (synonymer,
// ordposition, råvaruranking, stavfel). Den här filen täcker bara ordgränsen.

import { describe, it, expect } from "vitest";
import { searchFoods } from "../engines/index.js";

/** Namnen på de N första träffarna, gemener för jämförelse. */
const topp = (q, n = 5) =>
  (searchFoods(q, "Alla", [], n) || []).map(f => f.name.toLowerCase());

describe("ordgränsen — felet som gjorde skada", () => {
  it('"läsk" ger läsk, inte fläskfilé', () => {
    const t = topp("läsk");
    expect(t[0]).toContain("läsk");
    expect(t[0]).not.toContain("fläsk");
  });

  it('"fil" ger filmjölk eller filbunke, inte kycklingfilé', () => {
    const t = topp("fil");
    expect(t[0]).toMatch(/^fil/);
    expect(t[0]).not.toContain("kyckling");
  });

  it('"korv" ger korv, inte korvbröd', () => {
    const t = topp("korv");
    expect(t[0]).toMatch(/^korv/);
    expect(t[0]).not.toContain("bröd");
  });

  it('"smör" ger smör, inte jordnötssmör', () => {
    const t = topp("smör");
    expect(t[0]).toMatch(/^smör/);
    expect(t[0]).not.toContain("jordnöt");
  });

  it("inget av ursprungsfelen finns kvar bland de tre första", () => {
    // Samlad grind: skulle rankningen ändras igen ska DEN HÄR falla, inte en
    // användare som loggat fel frukost i tre veckor.
    const fel = [
      ["läsk", "fläsk"],
      ["fil", "kyckling"],
      ["korv", "korvbröd"],
    ];
    fel.forEach(([sök, otillåtet]) => {
      const t = topp(sök, 3);
      expect(t.some(n => n.includes(otillåtet))).toBe(false);
    });
  });

  it("mitt-i-ordet får finnas kvar längre ner — det är rankning, inte förbud", () => {
    // Poängen är inte att gömma träffar, utan att rätt svar vinner. En sökning
    // som helt slutade hitta sammansättningar vore ett annat fel.
    expect(topp("läsk", 25).length).toBeGreaterThan(0);
  });
});
