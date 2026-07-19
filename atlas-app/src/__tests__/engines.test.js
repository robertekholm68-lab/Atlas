import { describe, it, expect } from "vitest";
import ref from "./reference.json";
import {
  computeSessionLoad, computeRecovery, computeReadiness, computeNutrition,
  searchFoods, estimateMeal, liftTrend, buildPredictions, epley1RM,
} from "../engines/index.js";
import { EXERCISES, FOOD_INDEX, MUSCLES } from "../data/index.js";

const now = 1700000000000;
const S = [];
for (let w = 8; w >= 0; w--) {
  const sets = [{ exerciseId: "bench_press", weight: 100, reps: 5 }];
  for (let e = 0; e < Math.min(5, Math.floor((8 - w) / 2)); e++) sets.push({ exerciseId: "bench_press", weight: 80, reps: 8 });
  S.push({ completedAt: now - w * 7 * 86400000, muscleLoads: { pectoralis_major: 100 }, sets });
}
const S2 = [{ completedAt: now - 86400000, muscleLoads: { quadriceps: 120 }, sets: [{ exerciseId: "squat", weight: 110, reps: 5 }] }].concat(S);

describe("ATLAS-motorerna matchar originalprototypen", () => {
  it("epley1RM", () => expect(epley1RM(100, 5)).toBe(ref.epley1RM));
  it("computeSessionLoad", () => expect(computeSessionLoad([{ exerciseId: "bench_press", weight: 100, reps: 5 }, { exerciseId: "squat", weight: 100, reps: 5 }], EXERCISES)).toEqual(ref.sessionLoad));
  it("computeRecovery", () => expect(computeRecovery(S2, "pectoralis_major", now)).toEqual(ref.recovery_pec));
  it("computeReadiness", () => expect(computeReadiness(70, 12, 2)).toBe(ref.readiness));
  it("computeNutrition", () => expect(computeNutrition([{ foodId: "egg", grams: 100 }, { name: "X", kcal: 200, protein: 10, carbs: 5, fat: 8, quality: "estimated" }])).toEqual(ref.nutrition));
  it("searchFoods stavfel (abbore→Abborre)", () => expect((searchFoods("abbore", "Alla", [], 3) || []).map(f => f.name)).toEqual(ref.search_abbore));
  it("searchFoods synonym (lask→Läsk)", () => expect((searchFoods("lask", "Alla", [], 2) || []).map(f => f.name)).toEqual(ref.search_lask));
  it("estimateMeal", () => { const e = estimateMeal("köttbullar potatis gräddsås", "normal"); expect({ kcal: e.kcal, protein: e.protein, carbs: e.carbs, fat: e.fat, hits: e.hits }).toEqual(ref.estimate); });
  it("liftTrend", () => expect(liftTrend(S2, "bench_press")).toEqual(ref.liftTrend_bench));
  it("buildPredictions", () => expect(buildPredictions(S2).map(p => ({ lab: p.lab, target: p.target, range: p.range }))).toEqual(ref.predictions));
  it("FOOD_INDEX längd (Livsmedelsverket inbakad)", () => expect(FOOD_INDEX.length).toBe(ref.foodIndexLen));
  it("MUSCLES antal", () => expect(Object.keys(MUSCLES).length).toBe(ref.muscleCount));
});
