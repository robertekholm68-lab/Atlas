import { describe, it, expect } from "vitest";
import { GOAL_TYPES, GOAL_AXES, defaultGoalProfile, derivedProgramGoal, goalReasoning } from "../engines/goal.js";

const DAY = 86400000;
const now = Date.now();

describe("goal: mål-typer och härlett programmål", () => {
  it("defaultGoalProfile är recomp med vikter", () => {
    const gp = defaultGoalProfile();
    expect(gp.type).toBe("recomp");
    expect(gp.weights.muscle).toBeGreaterThan(0);
    expect(gp.weights.fatloss).toBeGreaterThan(0);
  });

  it("alla mål-typer har fyra axlar", () => {
    for (const [k, o] of Object.entries(GOAL_TYPES)) {
      for (const [axis] of GOAL_AXES) expect(o.weights[axis], `${k}.${axis}`).toBeTypeOf("number");
    }
  });

  it("härleder Hypertrophy när muskel dominerar", () => {
    expect(derivedProgramGoal({ weights: { muscle: 100, strength: 20, fatloss: 0, conditioning: 0 } })).toBe("Hypertrophy");
  });

  it("härleder Strength när styrka dominerar", () => {
    expect(derivedProgramGoal({ weights: { muscle: 30, strength: 100, fatloss: 0, conditioning: 0 } })).toBe("Strength");
  });

  it("härleder General när fett/kondition dominerar", () => {
    expect(derivedProgramGoal({ weights: { muscle: 20, strength: 10, fatloss: 100, conditioning: 40 } })).toBe("General");
  });

  it("null utan profil", () => {
    expect(derivedProgramGoal(null)).toBeNull();
    expect(derivedProgramGoal({})).toBeNull();
  });
});

describe("goal: goalReasoning (målresa-resonemang)", () => {
  const sessions = [
    { source: "training", completedAt: now - 2 * DAY, sets: new Array(18).fill({ exerciseId: "bench_press" }) },
    { source: "sport", title: "Muay Thai", completedAt: now - 3 * DAY },
    { source: "sport", title: "Löpning", completedAt: now - 6 * DAY },
  ];
  const base = {
    goalProfile: defaultGoalProfile(),
    sessions,
    nutritionTotals: { kcal: 2000, protein: 150 },
    nutritionTargets: { kcal: 2200, protein: 165 },
    nutritionDays: 5,
    readiness: 52,
    measurements: [{ date: now - 30 * DAY, bodyFat: 20 }, { date: now - 2 * DAY, bodyFat: 18.4 }],
  };

  it("returnerar aktiva delar med vikt, evidens och text", () => {
    const r = goalReasoning(base);
    expect(r).not.toBeNull();
    expect(r.components.length).toBeGreaterThan(0);
    for (const c of r.components) {
      expect(c.weight).toBeGreaterThanOrEqual(25);
      expect(["measured", "estimate", "missing"]).toContain(c.evidence);
      expect(c.text.length).toBeGreaterThan(0);
    }
  });

  it("känner igen recomp (muskel + fett) i syntesen", () => {
    const r = goalReasoning(base);
    expect(r.synthesis.toLowerCase()).toMatch(/recomp/);
    expect(r.tradeoffs.length).toBeGreaterThan(0);
  });

  it("läser kaloriunderskott ur kostdatan", () => {
    const r = goalReasoning(base);
    expect(r.signals.balance).toBe("deficit");
  });

  it("flaggar recovery när beredskap är låg och flera mål drivs", () => {
    const r = goalReasoning(base);
    expect(r.recovery).not.toBeNull();
    expect(r.recovery.text).toMatch(/beredskap/i);
  });

  it("markerar fettprocent-trend som mätdata", () => {
    const r = goalReasoning(base);
    const fat = r.components.find(c => c.key === "fatloss");
    expect(fat).toBeTruthy();
    expect(fat.evidence).toBe("measured");
  });

  it("returnerar null utan mål", () => {
    expect(goalReasoning({ goalProfile: null })).toBeNull();
    expect(goalReasoning({ goalProfile: { weights: {} } })).toBeNull();
  });

  it("hanterar avsaknad av kost/mätdata utan att krascha", () => {
    const r = goalReasoning({ goalProfile: defaultGoalProfile(), sessions: [], readiness: null });
    expect(r).not.toBeNull();
    expect(r.signals.hasNutrition).toBe(false);
  });
});
