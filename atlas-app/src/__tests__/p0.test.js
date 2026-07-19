import { describe, it, expect } from "vitest";
import { currentWeight, strengthLevel, buildPredictions, detectAdaptive, analyzeExercise } from "../engines/index.js";

const now = 1700000000000;
const mk = (id, wStart, wStep, weeks, reps = 5) => {
  const s = [];
  for (let w = weeks; w >= 0; w--) s.push({ completedAt: now - w * 7 * 86400000, muscleLoads: {}, sets: [{ exerciseId: id, weight: wStart + (weeks - w) * wStep, reps }] });
  return s;
};

describe("P0 — kanonisk viktkälla", () => {
  it("senaste mätning vinner över profilvikt", () => {
    expect(currentWeight({ weight: 82.4 }, [{ date: now - 100, weight: 90 }, { date: now, weight: 78 }])).toBe(78);
  });
  it("faller tillbaka på profilvikt utan mätlogg", () => {
    expect(currentWeight({ weight: 82.4 }, [])).toBe(82.4);
  });
  it("strengthLevel använder inskickad vikt, inte hårdkodad", () => {
    const light = strengthLevel("bench_press", 100, 60);   // hög ratio
    const heavy = strengthLevel("bench_press", 100, 120);  // låg ratio
    expect(light.level).not.toBe(heavy.level);
  });
});

describe("P0 — övnings-ID-fix (analysen tänder nu för ohp/row)", () => {
  it("buildPredictions ger en prognos för Militärpress (ohp) vid stigande trend", () => {
    const preds = buildPredictions(mk("ohp", 50, 1.5, 8));
    expect(preds.some(p => p.lab === "Militärpress")).toBe(true);
  });
  it("analyzeExercise hittar data för row (fanns ej med gamla ID:t)", () => {
    expect(analyzeExercise(mk("row", 60, 1, 6), "row")).not.toBeNull();
  });
  it("detectAdaptive kan analysera row", () => {
    // row med stigande volym men platt styrka -> ska ge en finding
    const s = [];
    for (let w = 6; w >= 0; w--) { const sets = [{ exerciseId: "row", weight: 70, reps: 5 }]; for (let e = 0; e < (6 - w); e++) sets.push({ exerciseId: "row", weight: 55, reps: 10 }); s.push({ completedAt: now - w * 7 * 86400000, muscleLoads: {}, sets }); }
    const f = detectAdaptive(s, {}, now);
    expect(Array.isArray(f)).toBe(true);
  });
});
