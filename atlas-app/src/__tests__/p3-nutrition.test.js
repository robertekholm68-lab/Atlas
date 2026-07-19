import { describe, it, expect } from "vitest";
import { mealDecision, estimateMeal, dayNutritionRange, searchFoods, computeNutrition, nutritionReadinessSignal } from "../engines/index.js";
import { FOOD_INDEX } from "../data/index.js";

describe("Nutrition — Quick Log beslutsflöde (avsnitt 1)", () => {
  it("TEST 2: generisk 'Fisk' → fråga med val, inget auto-värde", () => {
    const d = mealDecision("Fisk");
    expect(d.kind).toBe("generic");
    expect(d.q).toMatch(/fisk/i);
    expect(d.opts.some(([v]) => v === "__normal")).toBe(true); // "Vet inte — uppskatta"
  });
  it("TEST 4: vag 'fika på stan' → café-val", () => {
    expect(mealDecision("fika på stan").kind).toBe("vague");
  });
  it("TEST 3: beskriven restaurangmåltid → described", () => {
    expect(mealDecision("köttbullar potatis gräddsås på restaurang").kind).toBe("described");
  });
  it("okänd beskrivning → fråga om liten/normal/stor", () => {
    const d = mealDecision("qwerty zxcv");
    expect(d.kind).toBe("unknown");
    expect(d.opts.map(o => o[0])).toContain("__normal");
  });
});

describe("Nutrition — osäkerhetsintervall (avsnitt 2)", () => {
  it("TEST 3: estimat ger low < mid < high + konfidens + antaganden", () => {
    const e = estimateMeal("köttbullar potatis gräddsås", "normal");
    expect(e.estimateLow).toBeLessThan(e.kcal);
    expect(e.kcal).toBeLessThan(e.estimateHigh);
    expect(["low", "medium", "high"]).toContain(e.confidence);
    expect(typeof e.assumptions).toBe("string");
    expect(e.estimationMethod).toBe("keyword");
  });
  it("fallback (okänt) → låg konfidens, aldrig presenterat som exakt", () => {
    const e = estimateMeal("__normal", "normal");
    expect(e.confidence).toBe("low");
    expect(e.estimationMethod).toBe("fallback");
  });
  it("dagsintervall summeras ur måltidsintervall, ej antal × 120", () => {
    const log = [
      { foodId: "egg", grams: 100 },
      { name: "est", kcal: 600, protein: 20, carbs: 60, fat: 25, quality: "ai_estimated", estimateLow: 480, estimateHigh: 780 },
    ];
    const r = dayNutritionRange(log);
    expect(r.estimatedCount).toBe(1);
    expect(r.low).toBeLessThan(r.mid);
    expect(r.high).toBeGreaterThan(r.mid);
  });
});

describe("Nutrition — bevarade delar + korrekthet (avsnitt 9)", () => {
  it("TEST 1: stavfelstolerant sök 'abbore' → Abborre först", () => {
    expect((searchFoods("abbore", "Alla", [], 3) || [])[0].name).toMatch(/Abborre/);
  });
  it("TEST 9: exakt portion 150 g = 1,5 × värde per 100 g", () => {
    const egg = FOOD_INDEX.find(f => f.id === "egg");
    expect(computeNutrition([{ foodId: "egg", grams: 150 }]).kcal).toBe(Math.round(egg.kcal * 1.5));
  });
});

describe("Nutrition — readiness frikopplad (avsnitt 6)", () => {
  it("TEST 7: ingen flerdagshistorik → neutral signal, påverkar ej readiness", () => {
    const s = nutritionReadinessSignal(null);
    expect(s.mod).toBe(0);
    expect(s.status).toBe("insufficient");
    expect(s.message).toMatch(/[Ii]nte tillräckligt/);
  });
});
