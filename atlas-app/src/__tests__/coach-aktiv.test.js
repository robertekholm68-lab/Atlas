// Askr 2.0 — coachen mer aktiv, nivå 1 och 2.
//
// Robert: "Jag funderar på om vi kan göra coachen mer aktiv". Coachen var
// reaktiv: den svarade när man öppnade fliken. Den enda proaktiva delen var
// en nudge om protein efter pass.
//
// NIVÅ 1: fyra nya nudges på hemvyn, byggda i den motor som redan fanns.
// NIVÅ 2: coachen kommenterar varje set under passet.

import { describe, it, expect } from "vitest";
import { buildNudges } from "../engines/nudges.js";
import { coachKommentar } from "../engines/coachKommentar.js";
import { epley1RM, progressionskarta } from "../engines/utveckling.js";
import { MAIN_LIFTS } from "../data/exercises.js";

const nu = Date.now(); const D = 864e5;
const p = (d, ex, w, reps = 8, id) => ({
  id: id || `${ex}${d}`, completedAt: nu - d * D,
  sets: [{ exerciseId: ex, weight: w, reps }, { exerciseId: ex, weight: w, reps }],
});

describe("nivå 1 — nudges på hemvyn", () => {
  it("rekord dagen efter, bara stora lyft", () => {
    const ss = [p(20, "squat", 80), p(10, "squat", 85), p(1, "squat", 90)];
    const n = buildNudges({ sessions: ss, now: nu });
    expect(n[0].kind).toBe("rekord");
    expect(n[0].text).toMatch(/Back Squat.*114 kg.*upp från 108/);
    expect(n[0].ctaMål).toBe("utveckling");
  });

  it("rekord kräver ett tidigare värde att slå", () => {
    // Första passet är per definition ett rekord — att fira det vore att fira
    // ingenting.
    const n = buildNudges({ sessions: [p(1, "squat", 90)], now: nu });
    expect(n.find(x => x.kind === "rekord")).toBeUndefined();
  });

  it("frånvaro kräver återhämtade muskler, inte bara dagar", () => {
    // Regel 1 i nudge-motorn: händelse, inte tidpunkt. Den som vilar för att
    // kroppen behöver det ska inte skuldbeläggas.
    const ss = [p(5, "squat", 90)];
    const utan = buildNudges({ sessions: ss, now: nu });
    expect(utan.find(x => x.kind === "franvaro")).toBeUndefined();
    const med = buildNudges({ sessions: ss, muscleStates: { quadriceps: { readiness: 90 }, pectoralis_major: { readiness: 92 }, gluteals: { readiness: 88 } }, now: nu });
    expect(med[0].kind).toBe("franvaro");
    expect(med[0].text).toMatch(/5 dagar/);
  });

  it("frånvaro nämner stora muskler, inte de som råkar stå först", () => {
    // Mätt: utan sortering blev det "Anterior Neck och Trapezius".
    const ms = { anterior_neck: { readiness: 95 }, trapezius: { readiness: 95 }, quadriceps: { readiness: 90 }, pectoralis_major: { readiness: 90 } };
    const n = buildNudges({ sessions: [p(5, "squat", 90)], muscleStates: ms, now: nu });
    expect(n[0].text).toMatch(/^5 dagar.*Quadriceps och Pectoralis/);
  });

  it("stagnation efter tre pass utan framsteg", () => {
    // Två pass kan vara en dålig dag; tre är ett mönster.
    const ss = [p(30, "squat", 90), p(20, "squat", 90), p(10, "squat", 90), p(1, "squat", 88)];
    const n = buildNudges({ sessions: ss, now: nu + 2 * D });
    expect(n[0].kind).toBe("stagnation");
    expect(n[0].ctaMål).toBe("program");
  });

  it("obalans när en grupp tränas tre gånger oftare än sin motpart", () => {
    // Stigande vikt, så stagnation inte triggar först — den rankas högre, och
    // med fyra pass på samma vikt hade den vunnit. Rätt beteende.
    const ss = [p(12, "bench_press", 80), p(9, "bench_press", 82.5), p(6, "bench_press", 85), p(3, "bench_press", 87.5), p(7, "wide_pulldown", 60)];
    const n = buildNudges({ sessions: ss, now: nu + 2 * D });
    expect(n[0].kind).toBe("obalans");
    expect(n[0].text).toMatch(/4 pass bröst.*1 rygg/);
  });

  it("max en nudge åt gången, prioriterad", () => {
    // Två samtidigt är brus. Frånvaro (beslut) slår rekord (information).
    const ss = [p(20, "squat", 80), p(10, "squat", 85), p(5, "squat", 90)];
    const ms = { quadriceps: { readiness: 90 }, pectoralis_major: { readiness: 90 }, gluteals: { readiness: 88 } };
    const n = buildNudges({ sessions: ss, muscleStates: ms, now: nu });
    expect(n).toHaveLength(1);
    expect(n[0].kind).toBe("franvaro");
  });

  it("MAIN_LIFTS är [id, namn]-par och packas upp", () => {
    // Rekord och stagnation var TYSTA tills detta upptäcktes: loopen
    // itererade över paren, inte id:na. Samma bugg i progressionskartan.
    expect(Array.isArray(MAIN_LIFTS[0])).toBe(true);
    const k = progressionskarta([p(20, "squat", 80), p(1, "squat", 90)], "styrka", MAIN_LIFTS);
    expect(k.find(r => r.id === "squat").stort).toBe(true);
  });
});

describe("nivå 2 — coachen under passet", () => {
  const övning = (senaste, loggade = 1, set = 4) => ({
    exId: "bench_press", senaste, set,
    loggade: Array(loggade).fill({ vikt: 80, reps: 8 }),
  });

  it("mer vikt än förra passet", () => {
    const r = coachKommentar({ vikt: 82.5, reps: 8 }, övning([{ vikt: 80, reps: 8 }]));
    expect(r).toBe("2,5 kg mer än förra passet.");
  });

  it("mer vikt OCH fler reps", () => {
    const r = coachKommentar({ vikt: 82.5, reps: 9 }, övning([{ vikt: 80, reps: 8 }]));
    expect(r).toMatch(/2,5 kg mer.*1 rep till/);
  });

  it("fler reps på samma vikt", () => {
    const r = coachKommentar({ vikt: 80, reps: 10 }, övning([{ vikt: 80, reps: 8 }]));
    expect(r).toBe("2 reps mer än förra passet på samma vikt.");
  });

  it("exakt som sist → tystnad, inte 'samma som sist'", () => {
    // Regel 3: tystnad är ett giltigt svar.
    const r = coachKommentar({ vikt: 80, reps: 8 }, övning([{ vikt: 80, reps: 8 }]));
    expect(r).toBe(null);
  });

  it("en rep mindre → tystnad. Dagsform, inte trend", () => {
    const r = coachKommentar({ vikt: 80, reps: 7 }, övning([{ vikt: 80, reps: 8 }]));
    expect(r).toBe(null);
  });

  it("tydligt lättare sägs, utan skuld", () => {
    const r = coachKommentar({ vikt: 75, reps: 8 }, övning([{ vikt: 80, reps: 8 }]));
    expect(r).toBe("5 kg lättare än sist. Tunga dagar finns.");
  });

  it("rekord slår allt annat", () => {
    const r = coachKommentar({ vikt: 85, reps: 8 }, övning([{ vikt: 80, reps: 8 }]), 100);
    expect(r).toMatch(/^Nytt bästa: 108 kg/);
  });

  it("rekord kräver ett tidigare värde", () => {
    const r = coachKommentar({ vikt: 85, reps: 8 }, övning(null), null);
    // Inget förra pass, inget rekord → läget i passet, eller tystnad
    expect(r === null || !/Nytt bästa/.test(r)).toBe(true);
  });

  it("jämför med samma setnummer, inte förra passets sista", () => {
    // Set 1 mot set 1. Annars säger den "2,5 kg mer" om ett uppvärmningsset
    // jämfört med förra passets tyngsta.
    const senaste = [{ vikt: 60, reps: 10 }, { vikt: 80, reps: 8 }];
    const r = coachKommentar({ vikt: 60, reps: 10 }, övning(senaste, 1));
    expect(r).toBe(null);
  });

  it("ett set kvar sägs bara om inget annat gäller", () => {
    const r = coachKommentar({ vikt: 80, reps: 8 }, övning(null, 3, 4));
    expect(r).toBe("Ett set kvar på den här.");
  });

  it("epley1RM är samma formel som kurvan", () => {
    expect(epley1RM(80, 8)).toBe(101);
    expect(epley1RM(100, 1)).toBe(103);
  });
});
