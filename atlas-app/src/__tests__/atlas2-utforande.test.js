// Askr 2.0 — utförandet visas i övningsbanken.
//
// Robert: "det ska vara mer information. I den gamla vyn var både utförandet
// beskrivet och sekundära muskler med."
//
// TEKNIKPUNKTERNA FANNS REDAN SKRIVNA för 47 övningar (CUES i exercises.js),
// men visades ingenstans: exporterade, aldrig importerade i banken. Namnet
// krockade dessutom med vilosignalernas CUES i engines/cues.js, vilket är
// varför de exporteras som TEKNIK_CUES här.

import { describe, it, expect } from "vitest";
import { TEKNIK_CUES, EXERCISES } from "../data/exercises.js";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("teknikpunkterna finns och visas", () => {
  it("banken importerar och renderar dem", () => {
    const src = readFileSync(resolve("src/atlas2/ExerciseBank.jsx"), "utf8");
    expect(src).toMatch(/import \{ EXERCISES, TEKNIK_CUES \}/);
    expect(src).toMatch(/\{TEKNIK_CUES\[e\.id\] && \(/);
    expect(src).toMatch(/>Utförande</);
  });

  it("som numrerad lista — stegen sker i ordning", () => {
    const src = readFileSync(resolve("src/atlas2/ExerciseBank.jsx"), "utf8");
    expect(src).toMatch(/<ol style/);
  });

  it("triceps pressdown har fyra steg", () => {
    expect(TEKNIK_CUES.triceps_pushdown).toHaveLength(4);
  });

  it("varje id pekar på en riktig övning", () => {
    // En felstavad nyckel skulle aldrig visas och aldrig märkas.
    const ids = new Set(EXERCISES.map(e => e.id));
    for (const id of Object.keys(TEKNIK_CUES)) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it("inga tomma listor", () => {
    for (const [id, rader] of Object.entries(TEKNIK_CUES)) {
      expect(Array.isArray(rader), id).toBe(true);
      expect(rader.length, id).toBeGreaterThan(0);
      for (const r of rader) expect(String(r).trim().length, id).toBeGreaterThan(5);
    }
  });
});

describe("triceps pressdown fick INTE påhittade sekundärmuskler", () => {
  it("bara triceps brachii, faktor 1", () => {
    // Källorna (styrkelabbet.se, muscles.se, privatetrainingonline.se) är
    // entydiga: en renodlad isolationsövning. Flera understryker att man
    // känner den i bröst eller rygg om TEKNIKEN brustit — inte att de
    // musklerna belastas. Att lägga in dem hade varit att skriva in ett fel
    // i den data som driver kroppskartan.
    const e = EXERCISES.find(x => x.id === "triceps_pushdown");
    expect(e.activation).toHaveLength(1);
    expect(e.activation[0].muscleId).toBe("triceps_brachii");
    expect(e.activation[0].factor).toBe(1);
  });

  it("övningar som FAKTISKT har sekundärmuskler visar dem", () => {
    // Robert såg dem i bänkpress: 1 / 0,5 / 0,5. Det fungerade redan.
    const bänk = EXERCISES.find(x => x.id === "bench_press");
    expect(bänk.activation.length).toBeGreaterThan(1);
    expect(bänk.activation[0].factor).toBe(1);
    expect(bänk.activation.some(a => a.factor < 1)).toBe(true);
  });
});
