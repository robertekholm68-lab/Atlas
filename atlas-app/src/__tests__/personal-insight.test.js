import { describe, it, expect } from "vitest";
import { logReliability, personalInsight } from "../engines/index.js";
const now = Date.now();
describe("logg-tillförlitlighet", () => {
  it("färre än 3 loggade dagar = ej tillförlitlig", () => {
    const log = [{ ts: now, foodId: "x", grams: 100 }, { ts: now - 864e5, foodId: "y", grams: 100 }];
    const r = logReliability(log);
    expect(r.days).toBe(2); expect(r.reliable).toBe(false);
  });
  it("3+ distinkta dagar = tillförlitlig", () => {
    const log = [0, 1, 2, 3].map(d => ({ ts: now - d * 864e5, foodId: "x", grams: 100 }));
    expect(logReliability(log).reliable).toBe(true);
  });
});
describe("personlig insikt", () => {
  it("lyfter järn när det draggat readiness", () => {
    const t = personalInsight({ readiness: 70, cycle: null, nutRec: { factors: [{ label: "Lågt järnintag", delta: -2 }] }, includeNutrition: true });
    expect(/järn/i.test(t)).toBe(true);
  });
  it("väger inte in kost när includeNutrition=false", () => {
    const t = personalInsight({ readiness: 70, cycle: null, nutRec: { factors: [{ label: "Lågt järnintag", delta: -2 }] }, includeNutrition: false });
    expect(/järn/i.test(t)).toBe(false);
  });
  it("cykel + låg beredskap → varsam rad", () => {
    const t = personalInsight({ readiness: 60, cycle: { phase: "luteal", sv: "Lutealfas" }, nutRec: { factors: [] }, includeNutrition: true });
    expect(/Lutealfas/.test(t)).toBe(true);
  });
});
