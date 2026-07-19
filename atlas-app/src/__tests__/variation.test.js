import { describe, it, expect } from "vitest";
import { variationAdvice, balanceScore } from "../engines/index.js";
const D = 864e5, now = Date.now();
const mkSession = (daysAgo, sets) => ({ completedAt: now - daysAgo * D, sets });
const benchSets = n => Array.from({ length: n }, () => ({ exerciseId: "bench_press", weight: 80, reps: 8 }));

describe("variationsrådgivare", () => {
  it("för lite loggat → hasData false (ingen gissning)", () => {
    expect(variationAdvice([]).hasData).toBe(false);
    expect(variationAdvice([mkSession(1, benchSets(2))]).hasData).toBe(false);
  });
  it("bara en övning för en grupp → tips om vinklar/regionspecifik tillväxt", () => {
    const s = [mkSession(2, benchSets(4)), mkSession(5, benchSets(4)), mkSession(9, benchSets(4))];
    const va = variationAdvice(s);
    expect(va.hasData).toBe(true);
    expect(va.tips.join(" ")).toMatch(/regionspecifikt|vinkl/i);
  });
  it("stagnerad vikt över en månad → progressionstips", () => {
    const s = [mkSession(2, benchSets(3)), mkSession(14, benchSets(3)), mkSession(35, benchSets(3))];
    const va = variationAdvice(s);
    expect(va.tips.join(" ")).toMatch(/[Pp]rogressiv överbelastning|Samma vikt/);
  });
});

describe("balansmätarens viktning", () => {
  const base = { systemicRecovery: 60, now };
  it("träning väger tyngst — hög träning ger högre balans än hög vila vid samma snitt", () => {
    const trainHigh = balanceScore({ overallReadiness: 50, systemicRecovery: 50, sessions: [], foodLog: [], now });
    expect(trainHigh.pillars.find(p => p.key === "training").weight).toBe(0.40);
    expect(trainHigh.pillars.find(p => p.key === "rest").weight).toBe(0.15);
  });
  it("pelarna har vikter som summerar till 1", () => {
    const r = balanceScore({ overallReadiness: 70, systemicRecovery: 70, now });
    const sum = r.pillars.reduce((a, p) => a + p.weight, 0);
    expect(Math.round(sum * 100) / 100).toBe(1);
  });
  it("obalans straffas mildare när träningen är den starka pelaren", () => {
    // hög readiness (återhämtning) men låg vila → obalans utan att träning leder
    const r = balanceScore({ overallReadiness: 90, systemicRecovery: 40, now });
    expect(r.trainingLeads).toBe(false);
    expect(r.overall).toBeLessThan(90);
  });
});
