import { describe, it, expect } from "vitest";
import { deriveTrainingMetrics } from "../engines/index.js";
import { mergeProfileFromOnboarding } from "../app/persist.js";

const DAY = 86400000;
const now = Date.now();
const sess = (daysAgo) => ({ completedAt: now - daysAgo * DAY, muscleLoads: { chest: 100 } });

describe("cold-start: veckomål ur onboardingens träningsfrekvens", () => {
  it("utan angivet mål → weeklyTarget/weeklyProgress är null", () => {
    const m = deriveTrainingMetrics([], now);
    expect(m.weeklyTarget).toBe(null);
    expect(m.weeklyProgress).toBe(null);
  });

  it("angivet mål utan loggade pass → target satt, progress 0", () => {
    const m = deriveTrainingMetrics([], now, 3);
    expect(m.weeklyTarget).toBe(3);
    expect(m.thisWeek).toBe(0);
    expect(m.weeklyProgress).toBe(0);
  });

  it("progress speglar pass under INNEVARANDE kalendervecka (mån–sön) och kapas vid 1", () => {
    // Fast onsdag för determinism: 14 jan 2026. Veckan är mån 12 – sön 18.
    const wed = new Date(2026, 0, 14, 12, 0, 0).getTime();
    const mon = new Date(2026, 0, 12, 9, 0, 0).getTime();
    const tue = new Date(2026, 0, 13, 9, 0, 0).getTime();
    const lastSun = new Date(2026, 0, 11, 9, 0, 0).getTime();   // förra veckan → räknas INTE
    const m = deriveTrainingMetrics([{ completedAt: mon, muscleLoads: {} }, { completedAt: tue, muscleLoads: {} }, { completedAt: lastSun, muscleLoads: {} }], wed, 3);
    expect(m.weekDone).toBe(2);                 // mån + tis, inte förra söndagen
    expect(m.weeklyProgress).toBeCloseTo(2 / 3, 5);
    const done = deriveTrainingMetrics([{ completedAt: mon, muscleLoads: {} }, { completedAt: tue, muscleLoads: {} }, { completedAt: wed, muscleLoads: {} }, { completedAt: wed, muscleLoads: {} }], wed, 3);
    expect(done.weeklyProgress).toBe(1);        // aldrig över 100%
  });

  it("0 eller negativt mål behandlas som inget mål", () => {
    expect(deriveTrainingMetrics([], now, 0).weeklyTarget).toBe(null);
    expect(deriveTrainingMetrics([], now, -2).weeklyTarget).toBe(null);
  });

  it("mergeProfileFromOnboarding fångar frekvens och träningstyper", () => {
    const p = mergeProfileFromOnboarding(null, { name: "R", workoutsPerWeek: 4, trainingTypes: ["Styrka", "Kondition"] }, "jul 2026");
    expect(p.weeklyTarget).toBe(4);
    expect(p.trainingTypes).toEqual(["Styrka", "Kondition"]);
  });

  it("omstartad onboarding utan frekvens bevarar tidigare veckomål", () => {
    const base = { weeklyTarget: 3, trainingTypes: ["Styrka"] };
    const p = mergeProfileFromOnboarding(base, { name: "R" }, "jul 2026");
    expect(p.weeklyTarget).toBe(3);
    expect(p.trainingTypes).toEqual(["Styrka"]);
  });
});
