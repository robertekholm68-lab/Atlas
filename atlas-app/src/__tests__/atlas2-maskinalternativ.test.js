// Askr 2.0 — alternativmaskinen säger vilken övning som ersätter.
//
// Robert: "jag såg också i förklaringen till latsdrag att den kunde ersättas
// med dips".
//
// Latsdraget listade "Assisterad dip / chin". MASKINEN ÄR RÄTT — samma stativ
// gör både dips och chins — men namnet säger dips, och dips tränar bröst och
// triceps, inte rygg. Maskinen bär fyra övningar; två ersätter latsdrag, två
// gör det inte.
//
// Att bara skriva maskinens namn lämnade användaren att gissa. Gissar man fel
// tränar man fel muskel.

import { describe, it, expect } from "vitest";
import { ersättandeÖvningar } from "../engines/machines.js";
import { MACHINE_TYPES } from "../data/machines.js";
import { EXERCISES } from "../data/exercises.js";
import { readFileSync } from "fs";
import { resolve } from "path";

const namn = id => (EXERCISES.find(e => e.id === id) || {}).name;

describe("varje maskin pekar på sin egen ersättare", () => {
  it("latsdrag får chins och pull-ups, inte dips", () => {
    const r = ersättandeÖvningar("lat_pulldown", "assisted_dip_chin", EXERCISES);
    expect(r).toContain("chin_up");
    expect(r).toContain("pull_up");
    expect(r).not.toContain("parallel_dip");
    expect(r).not.toContain("bench_dips");
  });

  it("tricepspress får dips, inte chins", () => {
    // Samma maskin, motsatt svar — det är hela poängen.
    const r = ersättandeÖvningar("triceps_press", "assisted_dip_chin", EXERCISES);
    expect(r).toContain("parallel_dip");
    expect(r).not.toContain("chin_up");
  });

  it("smithmaskin mot power rack pekar ut de gemensamma lyften", () => {
    const r = ersättandeÖvningar("smith_machine", "power_rack", EXERCISES);
    expect(r).toContain("squat");
    expect(r).toContain("bench_press");
  });
});

describe("precisering bara när den behövs", () => {
  it("en maskin med bara en muskelgrupp ger null", () => {
    // "Sittande rodd" bär bara ryggövningar — maskinens namn räcker, och en
    // extra rad vore brus.
    expect(ersättandeÖvningar("lat_pulldown", "seated_row", EXERCISES)).toBe(null);
  });

  it("okänd maskin ger null i stället för att kasta", () => {
    expect(ersättandeÖvningar("finns_inte", "assisted_dip_chin", EXERCISES)).toBe(null);
    expect(ersättandeÖvningar("lat_pulldown", "finns_inte", EXERCISES)).toBe(null);
  });

  it("utan övningsbank ger null", () => {
    expect(ersättandeÖvningar("lat_pulldown", "assisted_dip_chin", null)).toBe(null);
  });
});

describe("hela banken granskad", () => {
  it("varje spretande alternativ får en precisering", () => {
    // Mätt över alla 43 maskiner: fem alternativpar bär övningar från flera
    // muskelgrupper. Alla ska nu kunna preciseras.
    const grupp = id => (EXERCISES.find(e => e.id === id) || {}).group;
    let spretande = 0;
    for (const m of MACHINE_TYPES) {
      for (const aid of m.alternatives || []) {
        const alt = MACHINE_TYPES.find(x => x.id === aid);
        if (!alt) continue;
        const g = new Set((alt.exercises || []).map(grupp).filter(Boolean));
        if (g.size > 1) {
          spretande++;
          expect(ersättandeÖvningar(m.id, aid, EXERCISES), `${m.id}→${aid}`).toBeTruthy();
        }
      }
    }
    expect(spretande).toBeGreaterThan(0);
  });
});

describe("vyn visar preciseringen", () => {
  const src = readFileSync(resolve("src/atlas2/MachineGuide.jsx"), "utf8");

  it("alternativknappen kallar ersättandeÖvningar", () => {
    expect(src).toMatch(/ersättandeÖvningar\(m\.id, id, EXERCISES\)/);
  });

  it("högst två övningar listas", () => {
    // En knapp med sex övningsnamn är ingen genväg.
    expect(src).toMatch(/\.slice\(0, 2\)/);
  });
});
