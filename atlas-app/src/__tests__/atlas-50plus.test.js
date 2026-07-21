import { describe, it, expect } from "vitest";
import { ALL_TEMPLATES, CURATED_TEMPLATES, validateProgram, weeklyVolume, programMuscleLoad } from "../engines/programs.js";
import { EXERCISES } from "../data/exercises.js";

const prog = ALL_TEMPLATES.find(t => t.id === "tmpl_atlas_50plus");

describe("Askr 50+ Performance – curated program", () => {
  it("finns i biblioteket och bland kurerade mallar", () => {
    expect(prog).toBeTruthy();
    expect(CURATED_TEMPLATES.some(t => t.id === "tmpl_atlas_50plus")).toBe(true);
    expect(prog.name).toBe("Askr 50+ Performance");
    expect(prog.isTemplate).toBe(true);
  });

  it("har två pass med totalt 12 övningar", () => {
    expect(prog.workouts.length).toBe(2);
    expect(prog.workouts.map(w => w.name)).toEqual(["Pass A", "Pass B"]);
    expect(prog.workouts.reduce((n, w) => n + w.exercises.length, 0)).toBe(12);
  });

  it("alla övnings-ID resolvar mot övningsbanken", () => {
    const ids = prog.workouts.flatMap(w => w.exercises.map(e => e.exId));
    const missing = ids.filter(id => !EXERCISES.find(e => e.id === id));
    expect(missing).toEqual([]);
  });

  it("håller RIR 2 och dubbel progression genomgående", () => {
    const all = prog.workouts.flatMap(w => w.exercises);
    expect(all.every(e => e.rir === 2)).toBe(true);
    expect(all.every(e => /Dubbel progression/.test(e.progression))).toBe(true);
  });

  it("validerar och ger meningsfull veckovolym + muskelbelastning", () => {
    expect(() => validateProgram(prog)).not.toThrow();
    const vol = weeklyVolume(prog);
    expect(Object.values(vol).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    const load = programMuscleLoad(prog);
    expect(Object.keys(load).length).toBeGreaterThan(4);
  });
});
