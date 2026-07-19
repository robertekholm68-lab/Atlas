import { describe, it, expect } from "vitest";
import { EXERCISES, STABLE_ID, EX_GROUPS, EQUIP_ALL } from "../data/exercises.js";
import { MUSCLES } from "../data/muscles.js";
import { normalizeProgram } from "../engines/programs.js";
import { computeSessionLoad } from "../engines/index.js";

describe("övningsbank v2.0 — 160 övningar", () => {
  it("exakt 160 övningar med unika stabila ID 001–160", () => {
    expect(EXERCISES.length).toBe(160);
    const stable = EXERCISES.map(e => e.stableId);
    expect(new Set(stable).size).toBe(160);
    expect(stable.every(s => /^\d{3}$/.test(s))).toBe(true);
    const nums = stable.map(Number).sort((a, b) => a - b);
    expect(nums[0]).toBe(1);
    expect(nums[159]).toBe(160);
  });

  it("inga dubblett-string-ID och inga dubblettnamn", () => {
    expect(new Set(EXERCISES.map(e => e.id)).size).toBe(160);
    expect(new Set(EXERCISES.map(e => e.name)).size).toBe(160);
  });

  it("behåller befintliga stabila ID 001–110 mappade mot befintliga string-ID", () => {
    expect(STABLE_ID.bench_press).toBe("001");
    expect(STABLE_ID.face_pull).toBe("110");
    expect(EXERCISES.find(e => e.id === "bench_press").stableId).toBe("001");
    // 50 nya
    expect(EXERCISES.filter(e => e.isNew).length).toBe(50);
    expect(EXERCISES.find(e => e.id === "tibialis_raise").stableId).toBe("160");
  });

  it("giltiga kategorier och utrustningstyper genomgående", () => {
    EXERCISES.forEach(e => {
      expect(EX_GROUPS, `okänd grupp ${e.group} (${e.id})`).toContain(e.group);
      expect(EQUIP_ALL, `okänd utrustning ${e.equipment} (${e.id})`).toContain(e.equipment);
    });
  });

  it("kategoriserings- och utrustningskrav", () => {
    expect(EXERCISES.find(e => e.id === "burpees").group).toBe("Legs"); // ej Glutes
    expect(EXERCISES.find(e => e.id === "t_bar_row").equipment).toBe("T-bar");
    expect(EXERCISES.find(e => e.id === "trap_bar_deadlift").equipment).toBe("Trap bar");
    expect(EXERCISES.find(e => e.id === "landmine_press").equipment).toBe("Landmine");
  });

  it("full muskelmapping ELLER tydlig draft-status för varje övning", () => {
    EXERCISES.forEach(e => {
      // full muskelmapping = icke-tom, giltig aktivering med primär + ev. sekundära
      expect(Array.isArray(e.activation) && e.activation.length > 0, `saknar aktivering: ${e.id}`).toBe(true);
      e.activation.forEach(a => {
        expect(MUSCLES[a.muscleId], `okänt muscleId ${a.muscleId} i ${e.id}`).toBeTruthy();
        expect(typeof a.factor === "number" && a.factor > 0 && a.factor <= 1).toBe(true);
      });
      // draft är en boolean-flagga när den finns (antagen belastningsandel)
      if ("draft" in e) expect(typeof e.draft).toBe("boolean");
    });
    // varje draft-märkt övning är en ny variant/maskin (antaganden, ej vetenskaplig precision)
    EXERCISES.filter(e => e.draft).forEach(e => expect(e.isNew, `draft men ej ny: ${e.id}`).toBe(true));
    expect(EXERCISES.some(e => e.draft)).toBe(true);
  });

  it("nya övningar kan användas och sparas i program/pass", () => {
    const newOnes = ["landmine_squat", "sled_push", "ab_wheel", "pistol_squat", "reverse_pec_deck"];
    const prog = normalizeProgram({
      id: "p_test", name: "Test", family: "Egen split", level: "Intermediate", goal: "Hypertrophy", split: "Egen", daysPerWeek: 1, weekdays: ["Mån"], equipment: ["Machine", "Landmine", "Sled", "Ab Wheel", "Bodyweight"], sessionDuration: 45, isTemplate: false,
      workouts: [{ id: "w1", name: "Pass", exercises: newOnes.map(id => ({ exId: id, sets: 3, repMin: 8, repMax: 12, rir: 2, restSec: 90, progression: "Dubbel progression (reps → vikt)" })) }],
    });
    expect(prog.workouts[0].exercises.length).toBe(5);
    // loggning: sessions-set med nya övningar ger muskelbelastning (viktad, ej övningsantal)
    const load = computeSessionLoad([{ exerciseId: "landmine_squat", weight: 60, reps: 8 }, { exerciseId: "sled_push", weight: 80, reps: 10 }], EXERCISES, 82.4);
    expect(Object.keys(load).length).toBeGreaterThan(0);
    expect(load.quadriceps).toBeGreaterThan(0);
  });
});
