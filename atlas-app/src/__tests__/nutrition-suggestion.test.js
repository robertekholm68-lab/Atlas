import { describe, it, expect } from "vitest";
import { suggestNutritionTargets, resolveNutritionTargets } from "../engines/index.js";
import { mergeProfileFromOnboarding } from "../app/persist.js";

describe("cold-start: kostförslag ur mål + vikt", () => {
  it("utan vikt → null (inget påhittat mål)", () => {
    expect(suggestNutritionTargets({ goal: "cut" })).toBe(null);
    expect(suggestNutritionTargets({ goal: "cut", weightKg: 0 })).toBe(null);
  });

  it("cut ger måttligt underskott jämfört med maintain", () => {
    const cut = suggestNutritionTargets({ goal: "cut", weightKg: 80 });
    const maintain = suggestNutritionTargets({ goal: "maintain", weightKg: 80 });
    expect(cut.kcal).toBeLessThan(maintain.kcal);
    expect(cut.kcal).toBeGreaterThan(maintain.kcal * 0.75);   // inte aggressivt
  });

  it("bulk ger överskott", () => {
    const bulk = suggestNutritionTargets({ goal: "bulk", weightKg: 80 });
    const maintain = suggestNutritionTargets({ goal: "maintain", weightKg: 80 });
    expect(bulk.kcal).toBeGreaterThan(maintain.kcal);
  });

  it("proteinet är högre i underskott (skyddar muskel)", () => {
    const cut = suggestNutritionTargets({ goal: "cut", weightKg: 80 });
    const maintain = suggestNutritionTargets({ goal: "maintain", weightKg: 80 });
    expect(cut.protein).toBeGreaterThan(maintain.protein);
  });

  it("makrona summerar rimligt till kcal", () => {
    const s = suggestNutritionTargets({ goal: "maintain", weightKg: 80 });
    const fromMacros = s.protein * 4 + s.carbs * 4 + s.fat * 9;
    expect(Math.abs(fromMacros - s.kcal)).toBeLessThan(60);   // avrundning tillåts
    expect(s.carbs).toBeGreaterThanOrEqual(0);
  });

  it("mergeProfileFromOnboarding sparar kostmålet", () => {
    const p = mergeProfileFromOnboarding(null, { name: "R", nutritionGoal: "cut" }, "jul 2026");
    expect(p.nutritionGoal).toBe("cut");
  });

  it("resolveNutritionTargets använder ett accepterat förslag (källa atlas_suggestion)", () => {
    const sug = suggestNutritionTargets({ goal: "cut", weightKg: 80 });
    const profile = { nutritionTargets: {}, nutritionSuggestion: sug, nutritionSuggestionAccepted: true };
    const r = resolveNutritionTargets(profile, "real");
    expect(r.source).toBe("atlas_suggestion");
    expect(r.kcal).toBe(sug.kcal);
    expect(r.hasKcal).toBe(true);
  });

  it("ett VÄNTANDE (ej accepterat) förslag ger inget aktivt mål", () => {
    const sug = suggestNutritionTargets({ goal: "cut", weightKg: 80 });
    const profile = { nutritionTargets: {}, nutritionSuggestion: sug };   // accepted saknas
    const r = resolveNutritionTargets(profile, "real");
    expect(r.source).toBe("none");
    expect(r.hasKcal).toBe(false);
  });

  it("aktivitetsnivå på jobbet påverkar energibehovet (tungt > stillasittande)", () => {
    const base = { goal: "maintain", weightKg: 80, gender: "male", age: 30, heightCm: 180 };
    const sed = suggestNutritionTargets({ ...base, activityLevel: "sedentary" });
    const heavy = suggestNutritionTargets({ ...base, activityLevel: "heavy" });
    expect(heavy.kcal).toBeGreaterThan(sed.kcal);
  });
  it("träning ovanpå aktivitetsnivån höjer behovet", () => {
    const base = { goal: "maintain", weightKg: 80, gender: "male", age: 30, heightCm: 180, activityLevel: "light" };
    const rest = suggestNutritionTargets({ ...base, workoutsPerWeek: 0 });
    const train = suggestNutritionTargets({ ...base, workoutsPerWeek: 5 });
    expect(train.kcal).toBeGreaterThan(rest.kcal);
  });
  it("utan aktivitetsnivå funkar som förut (bakåtkompatibelt)", () => {
    const r = suggestNutritionTargets({ goal: "maintain", weightKg: 80, gender: "male", age: 30, heightCm: 180, workoutsPerWeek: 3 });
    expect(r && r.kcal).toBeGreaterThan(0);
  });

  it("keto kapar kolhydraterna och höjer fettet", () => {
    const base = { goal: "maintain", weightKg: 80, gender: "male", age: 30, heightCm: 180, activityLevel: "light" };
    const normal = suggestNutritionTargets(base);
    const keto = suggestNutritionTargets({ ...base, dietApproach: "keto" });
    expect(keto.carbs).toBeLessThan(normal.carbs);
    expect(keto.carbs).toBeLessThanOrEqual(30);
    expect(keto.fat).toBeGreaterThan(normal.fat);
  });
  it("LCHF ger låga men högre kolhydrater än keto", () => {
    const base = { goal: "maintain", weightKg: 80, gender: "male", age: 30, heightCm: 180 };
    const lchf = suggestNutritionTargets({ ...base, dietApproach: "lchf" });
    const keto = suggestNutritionTargets({ ...base, dietApproach: "keto" });
    expect(lchf.carbs).toBeGreaterThan(keto.carbs);
    expect(lchf.carbs).toBeLessThanOrEqual(80);
  });
  it("högprotein höjer proteinmålet", () => {
    const base = { goal: "maintain", weightKg: 80, gender: "male", age: 30, heightCm: 180 };
    const normal = suggestNutritionTargets(base);
    const hp = suggestNutritionTargets({ ...base, dietApproach: "highprotein" });
    expect(hp.protein).toBeGreaterThan(normal.protein);
  });
});
