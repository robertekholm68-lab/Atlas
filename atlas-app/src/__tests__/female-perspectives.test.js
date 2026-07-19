import { describe, it, expect } from "vitest";
import { suggestNutritionTargets, cyclePhase, cycleReadinessModifier } from "../engines/index.js";
import { TOPICS } from "../data/knowledge.js";

const DAY = 864e5;

describe("könsjusterade näringsmål (Mifflin-St Jeor)", () => {
  it("kvinna får lägre underhåll än man vid samma mått", () => {
    const base = { goal: "maintain", weightKg: 65, age: 30, heightCm: 165, workoutsPerWeek: 3 };
    const f = suggestNutritionTargets({ ...base, gender: "female" });
    const m = suggestNutritionTargets({ ...base, gender: "male" });
    expect(f.basis.method).toBe("mifflin");
    expect(m.kcal).toBeGreaterThan(f.kcal);          // +5 vs −161 → man högre
  });
  it("utan längd faller tillbaka på vikt-heuristik (oförändrat)", () => {
    const s = suggestNutritionTargets({ goal: "maintain", weightKg: 80 });
    expect(s.basis.method).toBe("weight");
    expect(s.kcal).toBe(Math.round(80 * 31 / 10) * 10);
  });
  it("ospecificerat kön hamnar mellan man och kvinna", () => {
    const base = { goal: "maintain", weightKg: 70, age: 30, heightCm: 170, workoutsPerWeek: 3 };
    const u = suggestNutritionTargets({ ...base, gender: "unspecified" }).kcal;
    const f = suggestNutritionTargets({ ...base, gender: "female" }).kcal;
    const m = suggestNutritionTargets({ ...base, gender: "male" }).kcal;
    expect(u).toBeGreaterThan(f);
    expect(u).toBeLessThan(m);
  });
});

describe("menscykel (opt-in)", () => {
  const now = new Date("2026-07-15T12:00:00").getTime();
  it("null när spårning är av eller data saknas", () => {
    expect(cyclePhase(null, now)).toBe(null);
    expect(cyclePhase({ cycleTracking: false, lastPeriodStart: now }, now)).toBe(null);
    expect(cyclePhase({ cycleTracking: true }, now)).toBe(null);
  });
  it("dag 2 → menstruation, med negativ readiness-modifierare", () => {
    const p = { cycleTracking: true, lastPeriodStart: now - 1 * DAY, cycleLength: 28, periodLength: 5 };
    const c = cyclePhase(p, now);
    expect(c.phase).toBe("menstrual");
    expect(c.day).toBe(2);
    expect(c.readiness).toBeLessThan(0);
    expect(cycleReadinessModifier(p, now)).toBe(c.readiness);
  });
  it("dag 10 → follikelfas (positiv), dag 20 → luteal", () => {
    const mk = offset => ({ cycleTracking: true, lastPeriodStart: now - offset * DAY, cycleLength: 28, periodLength: 5 });
    expect(cyclePhase(mk(9), now).phase).toBe("follicular");   // dag 10
    expect(cyclePhase(mk(9), now).readiness).toBeGreaterThan(0);
    expect(cyclePhase(mk(19), now).phase).toBe("luteal");      // dag 20
  });
});

describe("kvinnligt kunskapsinnehåll", () => {
  it("TOPICS innehåller de fem kvinno-ämnena, taggade och med källa", () => {
    const ids = ["kvinnor_bulkmyt", "kvinnor_menscykel", "kvinnor_jarn_reds", "kvinnor_backenbotten", "kvinnor_klimakteriet", "kvinnor_kreatin", "kvinnor_graviditet", "kvinnor_benskorhet", "kvinnor_pcos", "kvinnor_ppiller"];
    ids.forEach(id => {
      expect(TOPICS[id]).toBeTruthy();
      expect(TOPICS[id].tag).toBe("Kvinnor & träning");
      expect(TOPICS[id].sections.length).toBeGreaterThan(0);
      expect(TOPICS[id].sections.every(s => s.source && s.source.name)).toBe(true);
    });
  });
});
