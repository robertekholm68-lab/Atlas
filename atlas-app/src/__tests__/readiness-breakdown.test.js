import { describe, it, expect } from "vitest";
import { nutritionRecoveryModifier, readinessBreakdown } from "../engines/index.js";
const day = (ts, protein, kcal) => ({ ts, kcal, protein });
describe("nutrition → readiness", () => {
  it("lågt protein över flera dagar ger en liten sänkning + faktor", () => {
    const now = Date.now();
    const log = [day(now, 60, 2400), day(now - 864e5, 55, 2300)]; // ~58 g mot mål 160
    const r = nutritionRecoveryModifier({ foodLog: log, nutritionTargets: { protein: 160, kcal: 2600 } });
    expect(r.mod).toBeLessThan(0);
    expect(r.factors.some(f => /protein/i.test(f.label))).toBe(true);
  });
  it("kan bara dra ner, aldrig upp (klamp)", () => {
    const r = nutritionRecoveryModifier({ foodLog: [], nutritionTargets: { protein: 160 } });
    expect(r.mod).toBeLessThanOrEqual(0);
    expect(r.mod).toBeGreaterThanOrEqual(-8);
  });
  it("readinessBreakdown summerar bas + nutrition", () => {
    const b = readinessBreakdown(80, null, { mod: -4, factors: [{ label: "Lågt proteinintag", delta: -4 }] });
    expect(b.base).toBe(80);
    expect(b.total).toBe(76);
    expect(b.factors[0].label).toBe("Träningsåterhämtning");
  });
  it("bara träningsbas → total = bas", () => {
    const b = readinessBreakdown(72, null, { mod: 0, factors: [] });
    expect(b.total).toBe(72);
    expect(b.factors.length).toBe(1);
  });
});
