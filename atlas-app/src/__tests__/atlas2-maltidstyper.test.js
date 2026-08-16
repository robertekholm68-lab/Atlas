// Askr 2.0 — måltidstyper.
//
// Varje loggpost bar redan en tidstämpel, så appen visste när man åt — den
// visade det bara aldrig. Att i stället lägga till ett valsteg vid loggningen
// hade kostat ett tryck varje gång, och matloggning är redan det som oftast
// hoppas över. Ett extra steg där gör mer skada än grupperingen gör nytta.
//
// Därför HÄRLEDS måltiden ur klockslaget och kan RÄTTAS på posten.

import { describe, it, expect } from "vitest";
import { måltidAvTid, grupperaMåltider, MÅLTID_SV, MÅLTID_ORDNING } from "../engines/recipes.js";
import { RECIPES } from "../data/recipes.js";

const kl = h => { const d = new Date(2026, 7, 16); d.setHours(h, 0, 0, 0); return d.getTime(); };

describe("måltiden härleds ur klockslaget", () => {
  it("fyra tidsfönster täcker dygnet", () => {
    expect(måltidAvTid(kl(7))).toBe("breakfast");
    expect(måltidAvTid(kl(12))).toBe("lunch");
    expect(måltidAvTid(kl(15))).toBe("snack");
    expect(måltidAvTid(kl(19))).toBe("dinner");
  });

  it("sena kvällen är fortfarande middag", () => {
    // Ett femte fönster för "kvällsmat" hade gett en rubrik som nästan alltid
    // innehåller en post — det är brus, inte information.
    expect(måltidAvTid(kl(23))).toBe("dinner");
  });

  it("typerna är samma som recepten använder", () => {
    // En loggad rätt och ett recept ska tala samma språk.
    const iRecept = new Set(RECIPES.map(r => r.meal));
    for (const t of MÅLTID_ORDNING) expect(iRecept.has(t), t).toBe(true);
  });
});

describe("grupperingen", () => {
  const poster = [
    { id: "a", ts: kl(8), kcal: 420, protein: 30 },
    { id: "b", ts: kl(12), kcal: 680, protein: 45 },
    { id: "c", ts: kl(19), kcal: 750, protein: 50 },
    { id: "d", ts: kl(20), kcal: 150, protein: 5 },
  ];

  it("varje grupp bär sin egen summa", () => {
    // En lista på sex poster säger inte var kalorierna ligger; rubriker med
    // summor gör det på en blick.
    const g = grupperaMåltider(poster);
    const middag = g.find(x => x.typ === "dinner");
    expect(middag.kcal).toBe(900);
    expect(middag.protein).toBe(55);
    expect(middag.rader.length).toBe(2);
  });

  it("tomma grupper utelämnas", () => {
    // En rubrik utan innehåll är brus.
    const g = grupperaMåltider(poster);
    expect(g.some(x => x.typ === "snack")).toBe(false);
    expect(g.length).toBe(3);
  });

  it("ordningen är kronologisk, inte alfabetisk", () => {
    const g = grupperaMåltider(poster).map(x => x.typ);
    expect(g).toEqual(["breakfast", "lunch", "dinner"]);
  });

  it("postens egen meal vinner över klockslaget", () => {
    // Den som jobbar natt äter middag klockan fyra på morgonen. En rättelse
    // ska stå kvar.
    const g = grupperaMåltider([{ id: "x", ts: kl(4), meal: "dinner", kcal: 600, protein: 40 }]);
    expect(g[0].typ).toBe("dinner");
  });

  it("näringen kan hämtas via en funktion", () => {
    // Poster med foodId bär gram, inte färdiga kcal — summan måste räknas ur
    // livsmedlet, precis som i listan.
    const g = grupperaMåltider(
      [{ id: "y", ts: kl(8), foodId: "keso", grams: 200 }],
      () => ({ kcal: 196, protein: 24 })
    );
    expect(g[0].kcal).toBe(196);
  });

  it("tom logg ger inga grupper", () => {
    expect(grupperaMåltider([]).length).toBe(0);
    expect(grupperaMåltider(null).length).toBe(0);
  });
});

describe("svenska namn finns för alla typer", () => {
  it("ingen typ saknar etikett", () => {
    for (const t of MÅLTID_ORDNING) expect(MÅLTID_SV[t], t).toBeTruthy();
  });
});
