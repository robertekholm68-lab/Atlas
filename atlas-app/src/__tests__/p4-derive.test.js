import { describe, it, expect } from "vitest";
import { workoutStreak, sevenDayTrainingLoad, deriveTrainingMetrics, distinctNutritionDays, resolveNutritionTargets, deriveMilestone, dataConfidence, exerciseStrengthConfidence, computeSessionLoad } from "../engines/index.js";
import { EXERCISES } from "../data/exercises.js";

const DAY = 864e5;
const at = (daysAgo, now) => now - daysAgo * DAY;
const sess = (daysAgo, now, sets = [{ exerciseId: "squat", weight: 100, reps: 5, rpe: 8 }]) =>
  ({ id: "s" + daysAgo + Math.random(), completedAt: at(daysAgo, now), sets, muscleLoads: computeSessionLoad(sets, EXERCISES) });

describe("§2 workoutStreak — ur faktiska datum, aldrig 42", () => {
  const now = Date.now();
  it("0 pass → 0", () => { expect(workoutStreak([], now)).toBe(0); });
  it("tre dagar i rad t.o.m. idag → 3", () => {
    expect(workoutStreak([sess(0, now), sess(1, now), sess(2, now)], now)).toBe(3);
  });
  it("två pass samma dag räknas som en dag", () => {
    expect(workoutStreak([sess(0, now), sess(0, now), sess(1, now)], now)).toBe(2);
  });
  it("lucka bryter streaken", () => {
    expect(workoutStreak([sess(0, now), sess(2, now), sess(3, now)], now)).toBe(1);
  });
  it("senaste passet äldre än igår → 0", () => {
    expect(workoutStreak([sess(3, now), sess(4, now)], now)).toBe(0);
  });
  it("aldrig demo-värdet 42", () => {
    const many = []; for (let i = 0; i < 50; i++) many.push(sess(i, now));
    expect(workoutStreak(many, now)).not.toBe(42);
  });
});

describe("§2 sevenDayTrainingLoad + deriveTrainingMetrics", () => {
  const now = Date.now();
  it("7 dagpunkter, idag sist, nollor utan pass", () => {
    const load = sevenDayTrainingLoad([sess(0, now)], now);
    expect(load).toHaveLength(7);
    expect(load[6].value).toBeGreaterThan(0);   // idag
    expect(load[0].value).toBe(0);              // 6 dagar sedan – inget pass
  });
  it("deriveTrainingMetrics tom historik → allt 0/tomt, has=false", () => {
    const m = deriveTrainingMetrics([], now);
    expect(m.total).toBe(0); expect(m.thisWeek).toBe(0); expect(m.streak).toBe(0); expect(m.has).toBe(false);
    expect(m.load7.every(d => d.value === 0)).toBe(true);
  });
  it("deriveTrainingMetrics räknar total/denna vecka/streak", () => {
    const m = deriveTrainingMetrics([sess(0, now), sess(1, now), sess(9, now)], now);
    expect(m.total).toBe(3); expect(m.thisWeek).toBe(2); expect(m.streak).toBe(2); expect(m.has).toBe(true);
  });
});

describe("§9 distinctNutritionDays — distinkta kalenderdagar", () => {
  const now = Date.now();
  it("odaterade poster räknas inte", () => {
    expect(distinctNutritionDays([{ foodId: "egg", grams: 100 }], now)).toBe(0);
  });
  it("tre poster över två dagar → 2", () => {
    expect(distinctNutritionDays([{ kcal: 1, ts: now }, { kcal: 1, ts: now }, { kcal: 1, ts: now - DAY }], now)).toBe(2);
  });
  it("kan passera limited_data (≥3 dagar → sufficient)", () => {
    const log = [{ kcal: 1, ts: now }, { kcal: 1, ts: now - DAY }, { kcal: 1, ts: now - 2 * DAY }];
    const days = distinctNutritionDays(log, now);
    expect(days).toBe(3);
    expect(dataConfidence("nutrition", { nutritionDays: days }).level).toBe("sufficient_data");
  });
});

describe("§4 resolveNutritionTargets — prioritet & inga påhittade makros", () => {
  it("demo → demo-mål kompletta", () => {
    const t = resolveNutritionTargets({}, "demo");
    expect(t.hasKcal).toBe(true); expect(t.hasProtein).toBe(true); expect(t.kcal).toBe(2200);
  });
  it("real utan mål → inget, inga påhittade kolhydrat/fett", () => {
    const t = resolveNutritionTargets({ nutritionTargets: {} }, "real");
    expect(t.hasKcal).toBe(false); expect(t.hasProtein).toBe(false);
    expect(t.carbs).toBe(null); expect(t.fat).toBe(null); expect(t.source).toBe("none");
  });
  it("real med användarmål → användarens siffror, källa=user", () => {
    const t = resolveNutritionTargets({ nutritionTargets: { kcal: 2600, protein: 180 } }, "real");
    expect(t.kcal).toBe(2600); expect(t.protein).toBe(180); expect(t.source).toBe("user");
    expect(t.carbs).toBe(null); expect(t.fat).toBe(null);   // aldrig uppdiktade
  });
  it("real med accepterat Askr-förslag → förslagets makros", () => {
    const t = resolveNutritionTargets({ nutritionTargets: {}, nutritionSuggestionAccepted: true, nutritionSuggestion: { kcal: 2400, protein: 160, carbs: 250, fat: 80 } }, "real");
    expect(t.kcal).toBe(2400); expect(t.carbs).toBe(250); expect(t.fat).toBe(80); expect(t.source).toBe("atlas_suggestion");
  });
});

describe("§12 deriveMilestone", () => {
  it("inga mål → null", () => { expect(deriveMilestone([])).toBe(null); expect(deriveMilestone(null)).toBe(null); });
  it("väljer mål med närmast deadline och ger titel/pct", () => {
    const m = deriveMilestone([
      { id: "a", title: "Bänk 100", cat: "Styrka", start: 80, current: 90, target: 100, higher: true, deadline: "2099-12-01" },
      { id: "b", title: "Knäböj 140", cat: "Styrka", start: 100, current: 120, target: 140, higher: true, deadline: "2099-06-01" },
    ]);
    expect(m.title).toBe("Knäböj 140");
    expect(typeof m.pct).toBe("number");
  });
});

describe("§8 per-domän-konfidens med tidsspann", () => {
  it("weight_trend: 3 punkter men <14 dagar → limited; med ≥14 dagar → sufficient", () => {
    expect(dataConfidence("weight_trend", { weightPoints: 3, spanDays: 5 }).level).toBe("limited_data");
    expect(dataConfidence("weight_trend", { weightPoints: 3, spanDays: 20 }).level).toBe("sufficient_data");
  });
  it("strength: per övning — <5 → limited, ≥5 → sufficient", () => {
    const now = Date.now();
    const s = []; for (let i = 0; i < 6; i++) s.push(sess(i, now, [{ exerciseId: "bench_press", weight: 80, reps: 5 }]));
    expect(exerciseStrengthConfidence(s, "bench_press", now).level).toBe("sufficient_data");
    expect(exerciseStrengthConfidence(s, "squat", now).level).toBe("no_data");   // ingen knäböj loggad
  });
});
