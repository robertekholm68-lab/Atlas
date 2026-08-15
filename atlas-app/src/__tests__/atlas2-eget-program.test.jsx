// @vitest-environment jsdom
// Askr 2.0 — bygg eget program.
//
// Alla 31 program var mallar. Man kunde välja bland dem men inte bygga något
// eget, och den som tränat länge har oftast ett upplägg i huvudet som ingen
// mall matchar.
//
// DET VIKTIGASTE HÄR ÄR FORMEN. Ett eget program måste bära exakt samma fält
// som en mall-kopia, annars går motorn sönder på ställen som inte har med
// programvyn att göra: nextWorkout, progressionSuggestion och analyzeProgram
// läser alla samma struktur.

import { describe, it, expect } from "vitest";
import { byggEgetProgram } from "../atlas2/CustomProgram.jsx";
import { ALL_TEMPLATES, copyProgram, nextWorkout } from "../engines/programs.js";
import { EXERCISES } from "../data/exercises.js";

const övn = id => ({ exId: id, sets: 3, repMin: 8, repMax: 12, rir: 2, restSec: 90 });
const eget = () => byggEgetProgram({
  namn: "Mitt", pass: [
    { name: "A", exercises: [övn("bench_press"), övn("squat")] },
    { name: "B", exercises: [övn("deadlift")] },
  ],
});

describe("formen är mallarnas", () => {
  it("samma fält som en kopierad mall — inga saknade, inga extra", () => {
    const mall = copyProgram(ALL_TEMPLATES[1], { name: "X", active: true });
    expect(Object.keys(eget()).sort()).toEqual(Object.keys(mall).sort());
  });

  it("passen har id, namn och övningar", () => {
    for (const w of eget().workouts) {
      expect(w.id).toBeTruthy();
      expect(w.name).toBeTruthy();
      expect(w.exercises.length).toBeGreaterThan(0);
    }
  });

  it("daysPerWeek följer antalet pass — det är vad motorn läser", () => {
    expect(eget().daysPerWeek).toBe(2);
  });

  it("nextWorkout klarar ett eget program", () => {
    // Om formen avviker returnerar den undefined och passvyn blir tom.
    const n = nextWorkout(eget(), []);
    expect(n && n.workout).toBeTruthy();
  });

  it("utrustningen härleds ur övningarna, inte gissas", () => {
    const u = eget().equipment;
    expect(u.length).toBeGreaterThan(0);
    for (const e of u) expect(EXERCISES.some(x => x.equipment === e)).toBe(true);
  });

  it("id:t krockar inte med mallarnas", () => {
    expect(eget().id).toMatch(/^prog_egen_/);
    expect(ALL_TEMPLATES.some(t => t.id === eget().id)).toBe(false);
  });

  it("tomma pass tas bort innan sparning", () => {
    // Ett pass utan övningar skulle synas i listan och sedan ge ett tomt pass.
    const p = byggEgetProgram({ namn: "X", pass: [{ name: "A", exercises: [övn("squat")] }] });
    expect(p.workouts.length).toBe(1);
  });
});

describe("sökorden är delade mellan vyerna", () => {
  it("bygg-vyn och övningsbanken förstår samma svenska ord", async () => {
    // Låg först bara i ExerciseBank. När bygg-eget fick egen övningssökning gav
    // "bänk" noll träffar där — två sökningar över samma data måste förstå
    // samma ord, annars beror svaret på vilken väg man gick in.
    const { sökordFör } = await import("../atlas2/sokord.js");
    expect(sökordFör("Barbell Bench Press")).toMatch(/bänk/);
    expect(sökordFör("Back Squat")).toMatch(/knäböj/);
  });
});
