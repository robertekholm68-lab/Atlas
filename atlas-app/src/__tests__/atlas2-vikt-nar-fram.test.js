// Askr 2.0 — en loggad vägning måste nå resten av appen.
//
// Robert: "det blir konstiga värden när jag försöker lägga in längd och vikt."
// Längden var talfältet (se atlas2-profilfalt). Vikten var värre: den sparades
// i `matningar` medan profilen, coachen, framstegsvyn, målplanen och backupen
// alla läser `weights` — en lista som BARA historikimporten fyllde. Man kunde
// alltså väga sig i appen och ändå få streck i "Om dig", ingen kroppsfetts-
// beräkning och en målresa mätt mot tom historik.
//
// Reproducerat mot bygget före fixen:
//   matningar: [{ts, kg: 84.5, …}]
//   weights:   []
//
// Riktningen är enkelriktad med flit: mätningarna är den rikare källan, vikten
// härleds ur dem. Åt andra hållet hade det blivit två ställen att ändra samma
// tal på — precis det profilvyn varnar för.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { vikterUrMätningar, slåIhopMätningar, byggMätning } from "../engines/utveckling.js";

const T = 1_700_000_000_000;

describe("vikterUrMätningar", () => {
  it("en vägning blir en viktpost", () => {
    const ut = vikterUrMätningar([], [{ ts: T, kg: 84.5, fat: null }]);
    expect(ut).toEqual([{ ts: T, kg: 84.5 }]);
  });

  it("mätningar utan kg ger ingen post — fett utan vikt är inte en vägning", () => {
    expect(vikterUrMätningar([], [{ ts: T, kg: null, fat: 18 }])).toEqual([]);
    expect(vikterUrMätningar([], [{ ts: T, fat: 18 }])).toEqual([]);
  });

  it("skräp i kg tas inte in", () => {
    expect(vikterUrMätningar([], [{ ts: T, kg: "abc" }])).toEqual([]);
  });

  it("befintlig historik behålls", () => {
    const gammal = [{ ts: T - 864e5, kg: 86 }];
    const ut = vikterUrMätningar(gammal, [{ ts: T, kg: 84.5 }]);
    expect(ut.map(w => w.kg)).toEqual([86, 84.5]);
  });

  it("samma vägning två gånger blir en post", () => {
    // Samma tidsfönster som slåIhopMätningar: en importerad och en manuell
    // post från samma morgon är samma vägning, inte två.
    const ut = vikterUrMätningar([{ ts: T, kg: 84.5 }], [{ ts: T + 60e3, kg: 84.7 }]);
    expect(ut.length).toBe(1);
    expect(ut[0].kg).toBe(84.7);
  });

  it("en vägning ett dygn senare är en egen post", () => {
    const ut = vikterUrMätningar([{ ts: T, kg: 84.5 }], [{ ts: T + 864e5, kg: 84.1 }]);
    expect(ut.length).toBe(2);
  });

  it("posterna kommer i tidsordning", () => {
    const ut = vikterUrMätningar([], [{ ts: T + 864e5, kg: 84 }, { ts: T, kg: 86 }]);
    expect(ut.map(w => w.ts)).toEqual([T, T + 864e5]);
  });

  it("fälten som fanns på viktposten bevaras", () => {
    // weights-posterna stämplas med id:n av migreringen. En uppdaterad vikt får
    // inte kasta bort stämpeln — då ser posten ut som ny för synk och backup.
    const ut = vikterUrMätningar([{ ts: T, kg: 84.5, userId: "u_1", updatedAt: 1 }], [{ ts: T, kg: 85 }]);
    expect(ut[0]).toMatchObject({ kg: 85, userId: "u_1" });
  });

  it("tål tomt och saknat helt", () => {
    expect(vikterUrMätningar(null, null)).toEqual([]);
    expect(vikterUrMätningar(undefined, [])).toEqual([]);
  });

  it("hela kedjan: väg dig i Utveckling → vikten finns i weights", () => {
    const post = byggMätning({ kg: 84.5, källa: "manuell" });
    const mätningar = slåIhopMätningar([], [post]);
    const weights = vikterUrMätningar([], mätningar);
    expect(weights.length).toBe(1);
    expect(weights[0].kg).toBe(84.5);
  });
});

describe("appen kopplar ihop listorna", () => {
  const src = readFileSync(resolve("src/atlas2/App2.jsx"), "utf8");

  it("en sparad mätning uppdaterar weights", () => {
    const block = src.slice(src.indexOf("const sättMätningar"), src.indexOf("const [live"));
    expect(block).toMatch(/vikterUrMätningar/);
    expect(block).toMatch(/save\("weights"/);
  });

  it("gamla vägningar slås in vid start", () => {
    // Den som loggade vägningar innan kopplingen fanns ska se dem utan att
    // behöva göra om något.
    expect(src).toMatch(/vikterUrMätningar\(migr\.weights, mätLista\)/);
  });
});
