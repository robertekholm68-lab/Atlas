import { describe, it, expect } from "vitest";
import { buildSession, buildSet, updateSet, deleteSet, normalizeSession, migrateSessions } from "../engines/session.js";
import {
  computeSessionLoad, computeRecovery, best1RM, lastPerformance, liftTrend,
  progressionSuggestion, epley1RM,
} from "../engines/index.js";
import { EXERCISES, BODYWEIGHT } from "../data/exercises.js";

const DAY = 864e5;
const bwEx = EXERCISES.find(e => e.loadMode === "bodyweight");   // t.ex. pull_up

describe("Kanonisk session — samma kompletta struktur oavsett loggnings-väg", () => {
  const rawSets = [
    { exerciseId: "bench_press", weight: 100, reps: 5, rpe: 8 },
    { exerciseId: "bench_press", weight: 90, reps: 8, rpe: 7 },
    { exerciseId: "squat", weight: 120, reps: 5, rpe: 8 },
  ];
  const quick = buildSession({ title: "Quick", completedAt: Date.now(), sets: rawSets, source: "quicklog", bodyweight: 85 });
  const train = buildSession({ title: "Träning", completedAt: Date.now(), sets: rawSets, source: "training", bodyweight: 85 });

  it("stabila id:n för session, exercise-entries och set", () => {
    expect(quick.id).toMatch(/^sess_/);
    expect(quick.sets.every(s => /^set_/.test(s.id))).toBe(true);
    const ids = quick.sets.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);                       // unika set-id:n
    // samma övning → samma entryId, olika övning → olika
    const bench = quick.sets.filter(s => s.exerciseId === "bench_press");
    expect(bench[0].entryId).toBe(bench[1].entryId);
    expect(bench[0].entryId).not.toBe(quick.sets.find(s => s.exerciseId === "squat").entryId);
  });
  it("kompletta sets persist:as (vikt, reps, RPE, tidsstämpel)", () => {
    const s = quick.sets[0];
    expect(s.weight).toBe(100); expect(s.reps).toBe(5); expect(s.rpe).toBe(8);
    expect(typeof s.ts).toBe("number");
  });
  it("valfria fält är förberedda (null) och tas emot om de anges", () => {
    const s = buildSet({ exerciseId: "squat", weight: 100, reps: 5 });
    expect(s.rir).toBeNull(); expect(s.tempo).toBeNull(); expect(s.rest).toBeNull();
    expect(s.setType).toBeNull(); expect(s.note).toBeNull(); expect(s.pain).toBeNull(); expect(s.substitutedFrom).toBeNull();
    const s2 = buildSet({ exerciseId: "squat", weight: 100, reps: 5, rir: 2, setType: "backoff", pain: true, substitutedFrom: "front_squat" });
    expect(s2.rir).toBe(2); expect(s2.setType).toBe("backoff"); expect(s2.pain).toBe(true); expect(s2.substitutedFrom).toBe("front_squat");
  });
  it("Quick Log och Träningsläge ger identisk struktur (nycklar + muscleLoads)", () => {
    expect(Object.keys(quick).sort()).toEqual(Object.keys(train).sort());
    expect(quick.muscleLoads).toEqual(train.muscleLoads);            // samma sets + bodyweight → samma last
    expect(quick.schemaV).toBe(train.schemaV);
    expect(quick.sets.length).toBe(3);                               // BUGGFIX: Quick Log sparar nu sets
  });
});

describe("Kroppsvikt-last använder faktisk bodyweight (ej fast 80)", () => {
  it("computeSessionLoad skalar med bodyweight för kroppsviktsövning", () => {
    const sets = [{ exerciseId: bwEx.id, reps: 10 }];
    const light = computeSessionLoad(sets, EXERCISES, 60);
    const heavy = computeSessionLoad(sets, EXERCISES, 100);
    const mid = computeSessionLoad(sets, EXERCISES);                 // default = BODYWEIGHT
    const anyMuscle = bwEx.activation[0].muscleId;
    expect(heavy[anyMuscle]).toBeGreaterThan(light[anyMuscle]);
    expect(mid[anyMuscle]).toBeCloseTo(computeSessionLoad(sets, EXERCISES, BODYWEIGHT)[anyMuscle], 5);
  });
  it("buildSession använder angiven bodyweight och lagrar bodyweightAtLog", () => {
    const s = buildSession({ sets: [{ exerciseId: bwEx.id, reps: 10 }], bodyweight: 95, source: "quicklog" });
    expect(s.bodyweightAtLog).toBe(95);
    const m = bwEx.activation[0].muscleId;
    expect(s.muscleLoads[m]).toBeCloseTo(computeSessionLoad(s.sets, EXERCISES, 95)[m], 5);
  });
});

describe("Historik/progression/PR läser rätt oavsett loggnings-väg (buggfixen)", () => {
  const now = Date.now();
  // Tre Quick Log-pass för bänk över tid — tidigare osynliga för dessa läsare.
  const sessions = [
    buildSession({ completedAt: now - 14 * DAY, sets: [{ exerciseId: "bench_press", weight: 90, reps: 5, rpe: 8 }], source: "quicklog" }),
    buildSession({ completedAt: now - 7 * DAY, sets: [{ exerciseId: "bench_press", weight: 95, reps: 5, rpe: 8 }], source: "quicklog" }),
    buildSession({ completedAt: now - 1 * DAY, sets: [{ exerciseId: "bench_press", weight: 100, reps: 5, rpe: 8 }], source: "quicklog" }),
  ];
  it("best1RM, lastPerformance, liftTrend ser Quick Log-passen", () => {
    expect(best1RM(sessions, "bench_press")).toBe(epley1RM(100, 5));
    expect(lastPerformance(sessions, "bench_press").weight).toBe(100);
    const t = liftTrend(sessions, "bench_press");
    expect(t.n).toBe(3); expect(t.pct).toBeGreaterThan(0);
  });
  it("progressionSuggestion bygger på senaste passet", () => {
    const p = progressionSuggestion("bench_press", sessions, 5);
    expect(p).not.toBeNull();
    expect(p.prev.weight).toBe(100);
    expect(p.weight).toBeGreaterThanOrEqual(100);                    // klart @ RPE8 → öka
  });
});

describe("Felaktigt loggade set kan redigeras och raderas (recompute)", () => {
  const base = buildSession({ sets: [
    { exerciseId: "bench_press", weight: 100, reps: 5, rpe: 8 },
    { exerciseId: "squat", weight: 120, reps: 5, rpe: 8 },
  ], source: "quicklog", bodyweight: 85 });
  const benchSetId = base.sets.find(s => s.exerciseId === "bench_press").id;
  const squatSetId = base.sets.find(s => s.exerciseId === "squat").id;

  it("updateSet ändrar värde och räknar om muscleLoads", () => {
    const before = base.muscleLoads.pectoralis_major;
    const after = updateSet(base, benchSetId, { weight: 120 }, 85);
    expect(after.sets.find(s => s.id === benchSetId).weight).toBe(120);
    expect(after.muscleLoads.pectoralis_major).toBeGreaterThan(before);
    expect(best1RM([after], "bench_press")).toBe(epley1RM(120, 5));  // PR följer redigeringen
  });
  it("deleteSet tar bort set och räknar om; sista set → tom muscleLoads", () => {
    const noSquat = deleteSet(base, squatSetId, 85);
    expect(noSquat.sets.some(s => s.id === squatSetId)).toBe(false);
    expect(noSquat.muscleLoads.quadriceps || 0).toBe(0);            // knäböjs-last borta
    const empty = deleteSet(deleteSet(base, squatSetId, 85), benchSetId, 85);
    expect(empty.sets).toHaveLength(0);
    expect(empty.muscleLoads).toEqual({});
  });
});

describe("Säker migrering/fallback för äldre lagrade pass", () => {
  const now = Date.now();
  it("legacy-pass med sets utan id:n → backfill av id/ts/entryId/schemaV, muscleLoads bevaras", () => {
    const legacy = { id: "old1", title: "Pass", completedAt: now, muscleLoads: { pectoralis_major: 123 }, sets: [{ exerciseId: "bench_press", weight: 80, reps: 8 }] };
    const n = normalizeSession(legacy);
    expect(n.schemaV).toBe(2);
    expect(n.sets[0].id).toMatch(/^set_/);
    expect(n.sets[0].entryId).toBeTruthy();
    expect(n.sets[0].ts).toBe(now);                                 // backfill från completedAt
    expect(n.muscleLoads).toEqual({ pectoralis_major: 123 });       // historik oförändrad
    expect(n.source).toBe("legacy");
  });
  it("legacy-pass med muscleLoads men UTAN sets (gamla Quick Log-buggen) — last bevaras, recovery funkar", () => {
    const legacy = { id: "old2", title: "Quick", completedAt: now, muscleLoads: { pectoralis_major: 200 } };
    const n = normalizeSession(legacy);
    expect(n.sets).toEqual([]);                                     // hittar inte på set som aldrig fanns
    expect(n.muscleLoads).toEqual({ pectoralis_major: 200 });
    expect(computeRecovery([n], "pectoralis_major", now).recoveryScore).toBeLessThan(100); // återhämtning ser lasten
    expect(best1RM([n], "bench_press")).toBe(0);                    // ärligt: ingen set-historik → ingen PR
  });
  it("migrateSessions är idempotent (andra körningen ändrar inget)", () => {
    const list = [{ id: "a", completedAt: now, muscleLoads: {}, sets: [{ exerciseId: "squat", weight: 100, reps: 5 }] }];
    const first = migrateSessions(list);
    expect(first.changed).toBe(true);
    const second = migrateSessions(first.sessions);
    expect(second.changed).toBe(false);
    expect(second.sessions[0]).toBe(first.sessions[0]);            // samma referens → ingen omskrivning
  });
});

describe("End-to-end: ett riktigt testpass genom hela kedjan", () => {
  const now = Date.now();
  it("logga → historik → progression → muscleLoads → recovery, sedan redigera", () => {
    // 1) Starta tomt, logga ett pass (som App.handleComplete gör): bänk + knäböj, bodyweight 85.
    let sessions = [];
    const raw = { title: "Bröst & ben", completedAt: now, source: "quicklog", sets: [
      { exerciseId: "bench_press", weight: 100, reps: 5, rpe: 8 },
      { exerciseId: "bench_press", weight: 90, reps: 8, rpe: 8 },
      { exerciseId: "squat", weight: 120, reps: 5, rpe: 8 },
    ] };
    sessions = [...sessions, buildSession({ ...raw, bodyweight: 85 })];

    // 2) Historik + PR + progression ser passet
    expect(sessions).toHaveLength(1);
    expect(best1RM(sessions, "bench_press")).toBe(epley1RM(100, 5));
    expect(progressionSuggestion("bench_press", sessions, 5)).not.toBeNull();

    // 3) muscleLoads + recovery är konsekventa
    const sess = sessions[0];
    expect(sess.muscleLoads.pectoralis_major).toBeGreaterThan(0);
    expect(sess.muscleLoads.quadriceps).toBeGreaterThan(0);
    const rec = computeRecovery(sessions, "pectoralis_major", now);
    expect(rec.status).not.toBe("no_data");
    expect(rec.recoveryScore).toBeLessThan(100);

    // 4) Redigera ett felaktigt set (bänk 100→110) → PR + last uppdateras
    const id = sess.sets.find(s => s.exerciseId === "bench_press").id;
    const edited = updateSet(sess, id, { weight: 110 }, 85);
    sessions = sessions.map(x => x.id === edited.id ? edited : x);
    expect(best1RM(sessions, "bench_press")).toBe(epley1RM(110, 5));

    // 5) Radera knäböjs-setet → quad-last försvinner, recovery följer med
    const sq = edited.sets.find(s => s.exerciseId === "squat").id;
    const afterDel = deleteSet(edited, sq, 85);
    sessions = sessions.map(x => x.id === afterDel.id ? afterDel : x);
    expect(sessions[0].muscleLoads.quadriceps || 0).toBe(0);
    expect(computeRecovery(sessions, "quadriceps", now).status).toBe("no_data");
  });
});
