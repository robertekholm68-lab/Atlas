import { describe, it, expect } from "vitest";
import {
  buildPostSession, nextStrengthDay, compareToPrevious, pickQuestion, trainedGroups, REASON_CODES,
  reasonSignal, attachReason, målrad,
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

// ── KVITTOTS MÅLRAD ─────────────────────────────────────────────────────────
//
// Raden svarar på frågan man bär med sig ut ur gymmet: förde passet mig närmare?
// Det som prövas hårdast är att den räknar MED passet som just loggades — läget
// FÖRE passet är inte det man vill veta när man står där med kvittot — och att
// den tiger om planen när det inte finns någon takt att mäta mot.

describe("målrad på kvittot", () => {
  // Onsdag kl 12 i en fix vecka. Veckogränsen är måndag 00:00, och med ett
  // rörligt "idag" hade samma test betytt olika saker olika veckodagar.
  const NU = new Date(2026, 0, 7, 12, 0, 0).getTime();
  const MÅNDAG = new Date(2026, 0, 5, 0, 0, 0).getTime();
  const styrka = (id, ts) => ({ id, completedAt: ts, title: "Pass", sets: [], muscleLoads: {} });
  const sportpass = (id, ts) => ({ ...styrka(id, ts), source: "sport", sport: true });
  const dag = (n, tim = 9) => MÅNDAG + n * DAG + tim * 3600000;
  // Tre styrkepass den här veckan; det tredje är det som just avslutades.
  const denHärVeckan = [styrka("v1", dag(0)), styrka("v2", dag(1))];
  const passet = styrka("v3", dag(2));
  const förraVeckan = n => Array.from({ length: n }, (_, i) => styrka("f" + i, dag(i - 7)));

  const mål = (extra = {}) => ({
    namn: "Ner 5 kg", typ: "fatloss", passPerVecka: 3,
    startDatum: NU - 14 * DAG, målDatum: NU + 60 * DAG,
    plan: { dimensioner: {}, viktmål: null, cardioPerVecka: null },
    delmål: [], ...extra,
  });

  it("testets antagande: NU är en onsdag", () => {
    // Halva uppsättningen vilar på det. Går antagandet sönder ska DET testet
    // falla, inte fem andra med obegripliga meddelanden.
    expect(new Date(NU).getDay()).toBe(3);
    expect(new Date(MÅNDAG).getDay()).toBe(1);
  });

  it("utan mål och utan program: bara veckans räkning, i ord", () => {
    const r = målrad({ session: passet, sessions: denHärVeckan, now: NU });
    expect(r.text).toBe("Tredje passet den här veckan.");
    expect(r.läge).toBe("neutral");
  });

  it("passet som just loggades räknas MED — annars visas läget före passet", () => {
    // sessions saknar passet, precis som kvittot skickar in det.
    const utan = målrad({ session: passet, sessions: [], now: NU });
    expect(utan.text).toBe("Första passet den här veckan.");
  });

  it("med program blir programmets takt nämnare", () => {
    const r = målrad({ session: passet, sessions: denHärVeckan, activeProgram: { daysPerWeek: 4 }, now: NU });
    expect(r.text).toBe("Pass 3 av 4 den här veckan.");
  });

  it("i fas med planen sägs rakt ut", () => {
    // Två veckor à tre pass = sex förväntade. Tre förra veckan plus tre nu.
    const r = målrad({ session: passet, sessions: [...förraVeckan(3), ...denHärVeckan], goal: mål(), now: NU });
    expect(r.text).toBe("Pass 3 av 3 den här veckan. Du ligger i fas med Ner 5 kg.");
    expect(r.läge).toBe("ifas");
  });

  it("efter planen formuleras som det som återstår, inte som en tillrättavisning", () => {
    const r = målrad({ session: passet, sessions: [...förraVeckan(2), ...denHärVeckan], goal: mål(), now: NU });
    expect(r.text).toBe("Pass 3 av 3 den här veckan. 1 pass kvar till planens takt mot Ner 5 kg.");
    expect(r.läge).toBe("efter");
    expect(r.text).not.toMatch(/efter planen/);
  });

  it("före planen säger det utan att uppmana till mer", () => {
    const r = målrad({ session: passet, sessions: [...förraVeckan(4), ...denHärVeckan], goal: mål(), now: NU });
    expect(r.text).toMatch(/1 pass före planen mot Ner 5 kg\.$/);
    expect(r.läge).toBe("fore");
  });

  it("första veckan finns ingen takt att mäta mot — då sägs bara räkningen", () => {
    const färskt = mål({ startDatum: NU - 3 * DAG });
    const r = målrad({ session: passet, sessions: denHärVeckan, goal: färskt, now: NU });
    expect(r.text).toBe("Pass 3 av 3 den här veckan.");
    expect(r.läge).toBe("neutral");
  });

  it("passerat måldatum ger ingen avvikelse mot en kurva som tagit slut", () => {
    const slut = mål({ startDatum: NU - 90 * DAG, målDatum: NU - 2 * DAG });
    const r = målrad({ session: passet, sessions: denHärVeckan, goal: slut, now: NU });
    expect(r.text).toMatch(/Måldatumet för Ner 5 kg har passerat\.$/);
    expect(r.text).not.toMatch(/planens takt|i fas|före planen/);
  });

  it("ett sportpass räknas för sig och mot cardiodelen", () => {
    const cardio = mål({ plan: { dimensioner: {}, viktmål: null, cardioPerVecka: 2 } });
    const löprunda = sportpass("s2", dag(2));
    const r = målrad({
      session: löprunda,
      sessions: [...denHärVeckan, sportpass("s1", dag(0))],
      goal: cardio, now: NU,
    });
    expect(r.text).toBe("Pass 2 av 2 den här veckan.");
    // Styrkeplanens avvikelse gäller inte en löprunda.
    expect(r.text).not.toMatch(/i fas|planens takt|före planen/);
  });

  it("ett sportpass utan cardiomål påstår ingen nämnare", () => {
    const r = målrad({ session: sportpass("s1", dag(2)), sessions: denHärVeckan, goal: mål(), now: NU });
    expect(r.text).toBe("Första sportpasset den här veckan.");
  });

  it("utan pass finns inget att säga", () => {
    expect(målrad({ session: null, sessions: denHärVeckan, now: NU })).toBe(null);
    expect(målrad()).toBe(null);
  });
});
