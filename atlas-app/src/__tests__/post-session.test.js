import { describe, it, expect } from "vitest";
import {
  buildPostSession, nextStrengthDay, compareToPrevious, pickQuestion, trainedGroups, REASON_CODES,
  reasonSignal, attachReason,
} from "../engines/post-session.js";
import { EXERCISES } from "../data/exercises.js";
import { MUSCLES } from "../data/muscles.js";

const DAG = 86400000;

// En övning som säkert finns i banken, plus vilka muskler den belastar.
const bänk = EXERCISES.find(e => e.activation.some(a => MUSCLES[a.muscleId]?.group === "chest" && a.factor >= 0.5));
const rodd = EXERCISES.find(e => e.activation.some(a => MUSCLES[a.muscleId]?.group === "back" && a.factor >= 0.5));

function pass({ id = "s1", exId = bänk.id, weight = 80, reps = 8, sets = 3, at = Date.now(), loads = null }) {
  return {
    id, completedAt: at, title: "Testpass",
    sets: Array.from({ length: sets }).map(() => ({ exerciseId: exId, weight, reps, rpe: null })),
    muscleLoads: loads || Object.fromEntries(
      EXERCISES.find(e => e.id === exId).activation.filter(a => a.factor >= 0.5).map(a => [a.muscleId, 60])
    ),
  };
}

describe("trainedGroups", () => {
  it("ger grupperna passet faktiskt belastade, tyngst först", () => {
    const g = trainedGroups(pass({}));
    expect(g.length).toBeGreaterThan(0);
    expect(g[0]).toHaveProperty("group");
    expect(g[0].load).toBeGreaterThan(0);
  });
  it("klarar ett pass utan belastning", () => {
    expect(trainedGroups({ muscleLoads: {} })).toEqual([]);
    expect(trainedGroups(null)).toEqual([]);
  });
});

describe("nextStrengthDay", () => {
  it("räknar fram en dag i framtiden efter tung belastning", () => {
    const n = nextStrengthDay(pass({ loads: { pectoralis_major: 90 } }), Date.now());
    expect(n).not.toBeNull();
    expect(n.days).toBeGreaterThanOrEqual(1);
    expect(typeof n.label).toBe("string");
  });
  it("säger att lätt belastning inte kräver vila", () => {
    const n = nextStrengthDay(pass({ loads: { pectoralis_major: 10 } }), Date.now());
    expect(n.days).toBe(0);
  });
  it("returnerar null utan belastning", () => {
    expect(nextStrengthDay({ muscleLoads: {} })).toBeNull();
  });
  it("låter den långsammaste muskeln sätta gränsen", () => {
    const snabb = nextStrengthDay(pass({ loads: { pectoralis_major: 90 } }));
    const bada = nextStrengthDay(pass({ loads: { pectoralis_major: 90, gluteus_maximus: 95 } }));
    expect(bada.hours).toBeGreaterThanOrEqual(snabb.hours);
  });
});

describe("compareToPrevious", () => {
  const nu = Date.now();
  const gammalt = pass({ id: "s0", weight: 80, reps: 8, at: nu - 3 * DAG });

  it("hittar en viktökning", () => {
    const d = compareToPrevious(pass({ id: "s1", weight: 85, reps: 8, at: nu }), [gammalt], EXERCISES);
    expect(d[0]).toMatchObject({ deltaWeight: 5, deltaReps: 0, direction: "up", prevWeight: 80 });
  });
  it("hittar en sänkning", () => {
    const d = compareToPrevious(pass({ id: "s1", weight: 72.5, reps: 8, at: nu }), [gammalt], EXERCISES);
    expect(d[0]).toMatchObject({ deltaWeight: -7.5, direction: "down" });
  });
  it("tiger när ingenting ändrats", () => {
    expect(compareToPrevious(pass({ id: "s1", weight: 80, reps: 8, at: nu }), [gammalt], EXERCISES)).toEqual([]);
  });
  it("tiger när övningen aldrig gjorts förut", () => {
    expect(compareToPrevious(pass({ id: "s1", at: nu }), [], EXERCISES)).toEqual([]);
  });
  it("jämför mot senaste passet, inte det äldsta", () => {
    const äldre = pass({ id: "s0", weight: 60, reps: 8, at: nu - 20 * DAG });
    const senare = pass({ id: "s0b", weight: 80, reps: 8, at: nu - 3 * DAG });
    const d = compareToPrevious(pass({ id: "s1", weight: 85, at: nu }), [äldre, senare], EXERCISES);
    expect(d[0].prevWeight).toBe(80);
  });
});

describe("pickQuestion – frågar bara när det finns något att fråga om", () => {
  it("frågar vid tydlig sänkning", () => {
    const q = pickQuestion([{ exerciseId: "x", name: "Bänkpress", deltaWeight: -10, prevWeight: 80, deltaReps: 0, direction: "down" }]);
    expect(q).not.toBeNull();
    expect(q.prompt).toMatch(/sänkte vikten 10 kg/);
    expect(q.options).toEqual(REASON_CODES.down);
  });
  it("frågar vid tydlig ökning, med andra alternativ", () => {
    const q = pickQuestion([{ exerciseId: "x", name: "Marklyft", deltaWeight: 15, prevWeight: 100, deltaReps: 0, direction: "up" }]);
    expect(q.options).toEqual(REASON_CODES.up);
  });
  it("tiger vid små skillnader", () => {
    expect(pickQuestion([{ exerciseId: "x", name: "Bänk", deltaWeight: 2.5, prevWeight: 100, deltaReps: 1, direction: "up" }])).toBeNull();
  });
  it("tiger utan avvikelser alls", () => {
    expect(pickQuestion([])).toBeNull();
    expect(pickQuestion(null)).toBeNull();
  });
  it("ställer bara EN fråga även vid flera avvikelser", () => {
    const q = pickQuestion([
      { exerciseId: "a", name: "A", deltaWeight: -10, prevWeight: 80, deltaReps: 0, direction: "down" },
      { exerciseId: "b", name: "B", deltaWeight: -20, prevWeight: 80, deltaReps: 0, direction: "down" },
    ]);
    expect(q.exerciseId).toBe("a");
  });
});

describe("buildPostSession", () => {
  const nu = Date.now();

  it("håller sig kort — aldrig mer än fem rader", () => {
    const many = Array.from({ length: 8 }).map((_, i) => pass({ id: "h" + i, at: nu - (i + 1) * DAG }));
    const r = buildPostSession({ session: pass({ id: "s1", weight: 90, at: nu }), sessions: many, exercises: EXERCISES, now: nu });
    expect(r.lines.length).toBeGreaterThan(0);
    expect(r.lines.length).toBeLessThanOrEqual(5);
  });

  it("varje rad är en kort mening", () => {
    const r = buildPostSession({ session: pass({ id: "s1", at: nu }), sessions: [], exercises: EXERCISES, now: nu });
    r.lines.forEach(l => {
      expect(typeof l.text).toBe("string");
      expect(l.text.length).toBeLessThan(120);
    });
  });

  it("berättar vad som belastades och när nästa pass är rimligt", () => {
    const r = buildPostSession({ session: pass({ id: "s1", at: nu }), sessions: [], exercises: EXERCISES, now: nu });
    expect(r.lines.some(l => l.kind === "trained")).toBe(true);
    expect(r.lines.some(l => l.kind === "next")).toBe(true);
  });

  it("nämner förändringen mot förra passet", () => {
    const förra = pass({ id: "s0", weight: 80, at: nu - 3 * DAG });
    const r = buildPostSession({ session: pass({ id: "s1", weight: 85, at: nu }), sessions: [förra], exercises: EXERCISES, now: nu });
    const d = r.lines.find(l => l.kind === "delta");
    expect(d).toBeTruthy();
    expect(d.text).toMatch(/5 kg upp/);
  });

  it("hittar på ingenting när loggen är tom", () => {
    const r = buildPostSession({ session: { id: "s1", sets: [], muscleLoads: {}, completedAt: nu }, sessions: [], exercises: EXERCISES, now: nu });
    expect(r.lines.every(l => typeof l.text === "string")).toBe(true);
    expect(r.question).toBeNull();
  });

  it("kraschar inte på trasig indata", () => {
    for (const s of [{}, { sets: null, muscleLoads: null }, { id: "x" }]) {
      expect(() => buildPostSession({ session: s, sessions: [], exercises: EXERCISES })).not.toThrow();
    }
  });

  it("gör inga nätverksanrop — allt härleds lokalt", () => {
    // Sammanfattningen måste fungera i en gymkällare utan täckning.
    const orig = globalThis.fetch;
    globalThis.fetch = () => { throw new Error("sammanfattningen försökte nå nätet"); };
    expect(() => buildPostSession({ session: pass({ id: "s1" }), sessions: [], exercises: EXERCISES })).not.toThrow();
    globalThis.fetch = orig;
  });
});

describe("reasonSignal – svaren måste få konsekvenser", () => {
  const nu = Date.now();
  const medSkäl = (code, dagarSen) => ({ id: "r" + Math.random(), completedAt: nu - dagarSen * DAG, sets: [], muscleLoads: {}, reason: { code, at: nu - dagarSen * DAG } });

  it("tiger när underlaget är för tunt", () => {
    expect(reasonSignal([medSkäl("somn", 1), medSkäl("somn", 3)], nu)).toBeNull();
    expect(reasonSignal([], nu)).toBeNull();
  });
  it("flaggar upprepade återhämtningsskäl och sänker tilliten", () => {
    const r = reasonSignal([medSkäl("somn", 1), medSkäl("somn", 4), medSkäl("trott", 7)], nu);
    expect(r.kind).toBe("recovery");
    expect(r.confidencePenalty).toBeGreaterThan(0);
    expect(r.progressionBias).toBeLessThan(0);
  });
  it("höjer progressionen när det upprepat känts lätt", () => {
    const r = reasonSignal([medSkäl("latt", 1), medSkäl("latt", 4), medSkäl("latt", 8)], nu);
    expect(r.kind).toBe("progression");
    expect(r.progressionBias).toBe(1);
  });
  it("bortser från gamla svar", () => {
    expect(reasonSignal([medSkäl("somn", 40), medSkäl("somn", 50), medSkäl("trott", 60)], nu)).toBeNull();
  });
});

describe("attachReason", () => {
  it("lägger svaret på passet utan att mutera originalet", () => {
    const s = { id: "a", sets: [] };
    const ny = attachReason(s, "somn", { exerciseId: "bench", direction: "down" });
    expect(s.reason).toBeUndefined();
    expect(ny.reason).toMatchObject({ code: "somn", exerciseId: "bench", direction: "down" });
  });
  it("returnerar passet oförändrat utan kod", () => {
    const s = { id: "a" };
    expect(attachReason(s, null)).toBe(s);
  });
});

describe("frågan är osymmetrisk med flit", () => {
  it("frågar vid 5 % sänkning men inte vid 5 % höjning", () => {
    const ner = pickQuestion([{ exerciseId: "x", name: "A", deltaWeight: -5, prevWeight: 100, deltaReps: 0, direction: "down" }]);
    const upp = pickQuestion([{ exerciseId: "x", name: "A", deltaWeight: 5, prevWeight: 100, deltaReps: 0, direction: "up" }]);
    expect(ner).not.toBeNull();
    expect(upp).toBeNull();
  });
  it("men frågar vid ett större hopp uppåt", () => {
    expect(pickQuestion([{ exerciseId: "x", name: "A", deltaWeight: 10, prevWeight: 100, deltaReps: 0, direction: "up" }])).not.toBeNull();
  });
});
