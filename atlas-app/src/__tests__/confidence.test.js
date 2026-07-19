import { describe, it, expect } from "vitest";
import { dataConfidence, confidenceLevel } from "../engines/index.js";

describe("§6 domän-specifik datakonfidens", () => {
  it("trösklar: 0/1-9/10-29/30+", () => {
    expect(confidenceLevel(0)).toBe("no_data");
    expect(confidenceLevel(5)).toBe("limited_data");
    expect(confidenceLevel(12)).toBe("sufficient_data");
    expect(confidenceLevel(30)).toBe("personal_model");
  });
  it("olika domäner utvärderas separat", () => {
    const ctx = { sessions: new Array(12).fill({}), weightPoints: 1, nutritionDays: 0, recentLoad: 0 };
    expect(dataConfidence("training", ctx).level).toBe("sufficient_data");
    expect(dataConfidence("weight_trend", ctx).level).toBe("limited_data"); expect(dataConfidence("weight_trend", ctx).eligibleForNumericScore).toBe(false);
    expect(dataConfidence("nutrition", ctx).level).toBe("no_data");
  });
  it("readiness: ingen numerisk poäng utan färsk belastning", () => {
    expect(dataConfidence("readiness", { sessions: [{}], recentLoad: 0 }).eligibleForNumericScore).toBe(false);
    expect(dataConfidence("readiness", { sessions: [{}], recentLoad: 5 }).eligibleForNumericScore).toBe(true);
    expect(dataConfidence("readiness", { sessions: [{}] }).missingInputs).toContain("HRV");
  });
  it("weight_trend numerisk först vid ≥2 punkter", () => {
    expect(dataConfidence("weight_trend", { weightPoints: 1 }).eligibleForNumericScore).toBe(false);
    expect(dataConfidence("weight_trend", { weightPoints: 2 }).eligibleForNumericScore).toBe(true);
  });
  it("30 pass ger personal_model-behörighet men strukturen finns", () => {
    const r = dataConfidence("training", { sessions: new Array(30).fill({}) });
    expect(r.level).toBe("personal_model");
    expect(r).toHaveProperty("missingInputs");
    expect(r).toHaveProperty("eligibleForNumericScore");
  });
});
