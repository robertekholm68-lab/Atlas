import { describe, it, expect } from "vitest";
import { GOAL_TYPES, goalProfileFromOnboarding, goalReasoning, derivedProgramGoal } from "../engines/goal.js";

describe("cold-start: goalProfile seedas ur onboardingens mål", () => {
  it("returnerar null utan primärt mål", () => {
    expect(goalProfileFromOnboarding(null)).toBe(null);
    expect(goalProfileFromOnboarding(undefined, ["muscle"])).toBe(null);
  });

  it("primärt mål mappas till rätt axel-typ", () => {
    expect(goalProfileFromOnboarding("muscle").type).toBe("muscle");
    expect(goalProfileFromOnboarding("strength").type).toBe("strength");
    expect(goalProfileFromOnboarding("lose").type).toBe("fatloss");   // onboarding "lose" → axel fatloss
    expect(goalProfileFromOnboarding("cardio").type).toBe("conditioning");
  });

  it("'health' ger en bred allmän-form-profil", () => {
    const gp = goalProfileFromOnboarding("health");
    expect(gp.type).toBe("general");
    expect(gp.weights).toEqual(GOAL_TYPES.general.weights);
  });

  it("muskel + fett samtidigt = body recomp", () => {
    const gp = goalProfileFromOnboarding("muscle", ["lose"]);
    expect(gp.type).toBe("recomp");
    const gp2 = goalProfileFromOnboarding("lose", ["muscle"]);
    expect(gp2.type).toBe("recomp");
  });

  it("sekundära mål lyfts till aktiv nivå i viktningen", () => {
    const gp = goalProfileFromOnboarding("strength", ["cardio"]);
    expect(gp.type).toBe("strength");
    expect(gp.weights.conditioning).toBeGreaterThanOrEqual(25); // med i coach-resonemanget
  });

  it("alla seedade profiler har fyra numeriska axlar", () => {
    for (const g of ["muscle", "strength", "lose", "cardio", "health"]) {
      const gp = goalProfileFromOnboarding(g);
      for (const axis of ["muscle", "strength", "fatloss", "conditioning"]) {
        expect(gp.weights[axis], `${g}.${axis}`).toBeTypeOf("number");
      }
    }
  });

  it("en seedad profil ger direkt coach-resonemang (utan loggad data, märkt som estimat)", () => {
    const gp = goalProfileFromOnboarding("muscle", ["strength"]);
    const r = goalReasoning({ goalProfile: gp, sessions: [], measurements: [], nutritionDays: 0 });
    expect(r).not.toBe(null);
    expect(r.components.length).toBeGreaterThan(0);            // coachen har något att säga från start
    expect(r.components.every(c => typeof c.text === "string" && c.text.length > 0)).toBe(true);
    // Utan loggad data ska det vara ett estimat, inte påstådd mätdata.
    expect(r.components.some(c => c.evidence === "estimate")).toBe(true);
    expect(derivedProgramGoal(gp)).toBeTypeOf("string");       // programmotorn kan härleda ett mål
  });
});
