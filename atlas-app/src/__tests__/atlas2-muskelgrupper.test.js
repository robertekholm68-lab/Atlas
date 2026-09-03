// Askr 2.0 — muskelgruppsvyn: kroppen som ingång till övningarna.
//
// Robert visade Gymlifys "Exercise Guide": tolv kort, en figur per kort med
// muskelgruppen markerad. Han valde väg 2 — bygga på det som finns i stället
// för att klippa in statiska bilder.
//
// SKILLNADEN: Gymlifys bröst är alltid rött. Askrs bröst är rött dagen efter
// bänkpress och grönt tre dagar senare. Samma regioner, samma figur, samma
// färgskala som kroppskartan på hemvyn.

import { describe, it, expect } from "vitest";
import { GRUPPER } from "../atlas2/MuskelgruppsVy.jsx";
import REGIONS from "../atlas2/body_regions.json";
import { EXERCISES } from "../data/exercises.js";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("grupperna är övningsbankens", () => {
  it("varje grupp finns i banken", () => {
    // "Legs and hips" finns inte i Askr. Kortet ska leda till rätt lista.
    const bankGrupper = new Set(EXERCISES.map(e => e.group));
    for (const g of GRUPPER) expect(bankGrupper.has(g.id), g.id).toBe(true);
  });

  it("alla bankens grupper har ett kort", () => {
    const kort = new Set(GRUPPER.map(g => g.id));
    for (const g of new Set(EXERCISES.map(e => e.group))) expect(kort.has(g), g).toBe(true);
  });
});

describe("regionerna finns i kartan", () => {
  it("varje region-id pekar på en ritad region i rätt vy", () => {
    // Ett felstavat id skulle rendera ett tomt kort utan felmeddelande.
    for (const g of GRUPPER) {
      for (const vy of ["front", "back"]) {
        for (const rid of g.regioner[vy] || []) {
          const finns = REGIONS[vy].regions.some(r => r.id === rid);
          expect(finns, `${g.id}/${vy}/${rid}`).toBe(true);
        }
      }
    }
  });

  it("varje grupp har minst en region", () => {
    for (const g of GRUPPER) {
      const n = (g.regioner.front || []).length + (g.regioner.back || []).length;
      expect(n, g.id).toBeGreaterThan(0);
    }
  });

  it("rygg visas bakifrån, bröst framifrån", () => {
    expect(GRUPPER.find(g => g.id === "Back").regioner.front).toBeUndefined();
    expect(GRUPPER.find(g => g.id === "Chest").regioner.back).toBeUndefined();
  });

  it("ben visas från båda hållen", () => {
    // Quadriceps fram, hamstrings bak — en vy hade dolt halva gruppen.
    const ben = GRUPPER.find(g => g.id === "Legs");
    expect(ben.regioner.front).toContain("quadriceps");
    expect(ben.regioner.back).toContain("hamstrings");
  });
});

describe("vyn ärver kartans regler", () => {
  const src = readFileSync(resolve("src/atlas2/MuskelgruppsVy.jsx"), "utf8");

  it("färgen kommer från recoveryColor", () => {
    expect(src).toMatch(/recoveryColor\(st\.readiness\)/);
  });

  it("otränad är ofärgad men konturerad", () => {
    // Ofärgat = ingen data, samma regel som kartan. Men kortet måste ändå visa
    // VAR gruppen sitter.
    expect(src).toMatch(/fill=\{färg \|\| "none"\}/);
    expect(src).toMatch(/stroke=\{färg \|\| C\.muted\}/);
  });

  it("två kolumner — figurerna behöver plats", () => {
    // Vid tre kolumner blir muskeln en fläck på 20 px.
    expect(src).toMatch(/gridTemplateColumns: "repeat\(2, 1fr\)"/);
  });

  it("gruppens readiness är snittet av regioner med data", () => {
    // En grupp där bara en av tre regioner har data ska visa den regionens
    // värde, inte dra ner snittet med nollor.
    expect(src).toMatch(/if \(!värden\.length\) return null;/);
  });
});

describe("ingången leder till rätt lista", () => {
  it("övningsbanken tar emot startGrupp", () => {
    const src = readFileSync(resolve("src/atlas2/ExerciseBank.jsx"), "utf8");
    expect(src).toMatch(/startGrupp = null/);
    expect(src).toMatch(/useState\(startGrupp\)/);
  });

  it("App2 nollställer gruppen när banken öppnas på vanligt sätt", () => {
    // Annars skulle "Bläddra bland alla övningar" ärva senaste gruppvalet.
    const src = readFileSync(resolve("src/atlas2/App2.jsx"), "utf8");
    expect(src).toMatch(/setBankGrupp\(null\); setSheet\("ovningar"\)/);
  });
});
