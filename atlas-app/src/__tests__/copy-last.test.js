import { describe, it, expect } from "vitest";
import { lastSessionSets, lastPerformance } from "../engines/index.js";

const H = h => h * 3600000;
const sessions = [
  { completedAt: Date.now() - H(200), sets: [{ exerciseId: "bench_press", weight: 70, reps: 8, rpe: 7 }, { exerciseId: "bench_press", weight: 70, reps: 7, rpe: 8 }] },
  { completedAt: Date.now() - H(48), sets: [
    { exerciseId: "bench_press", weight: 80, reps: 6, rpe: 8 },
    { exerciseId: "bench_press", weight: 80, reps: 5, rpe: 9 },
    { exerciseId: "bench_press", weight: 75, reps: 8, rpe: 8 },
    { exerciseId: "squat", weight: 100, reps: 5, rpe: 8 },
  ] },
];

describe("lastSessionSets — kopiera förra passet", () => {
  it("returnerar alla set för övningen från senaste passet, i ordning", () => {
    const r = lastSessionSets(sessions, "bench_press");
    expect(r.count).toBe(3);
    expect(r.sets.map(s => s.weight)).toEqual([80, 80, 75]);
    expect(r.sets.map(s => s.reps)).toEqual([6, 5, 8]);
    // tar det SENASTE passet, inte det äldre 70 kg-passet
    expect(r.sets.every(s => s.weight >= 75)).toBe(true);
  });

  it("null när övningen aldrig loggats", () => {
    expect(lastSessionSets(sessions, "deadlift")).toBeNull();
    expect(lastSessionSets([], "bench_press")).toBeNull();
  });

  it("lastPerformance ger fortfarande det tyngsta setet (oförändrat)", () => {
    const p = lastPerformance(sessions, "bench_press");
    expect(p.weight).toBe(80);
  });
});
