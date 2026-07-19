import { describe, it, expect } from "vitest";
import {
  newMission, newPhases, missionGoals, standaloneGoals, unlinkMissionGoals,
  missionTimeline, currentPhase, goalAreaStatus, missionAnalysis,
  detectMissionConflicts, missionStatus, primaryMission, missionCoachSummary, missionPlan,
  MISSION_PRIORITIES,
} from "../engines/mission.js";

const DAY = 864e5;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

function baseMission(now, over = {}) {
  return newMission({
    id: "m1", name: "Thailand", type: "training",
    startDate: iso(now - 14 * DAY),
    readyDate: iso(now + 98 * DAY),      // 14 veckor kvar
    weeklyTime: 6, constraints: "återkommande vadbesvär",
    ...over,
  });
}
const G = (o) => ({ unit: "kg", higher: true, ...o });

describe("Målresa — modell & länkning", () => {
  it("newMission ger stabila defaults + 7 redigerbara faser", () => {
    const m = newMission();
    expect(m.id).toMatch(/^mission_/);
    expect(m.status).toBe("active");
    expect(m.phases).toHaveLength(7);
    expect(newPhases()).not.toBe(newPhases());   // ny array varje gång
  });
  it("missionGoals länkar via missionId, fristående exkluderas", () => {
    const goals = [G({ id: "g1", missionId: "m1", missionPriority: "Avgörande" }), G({ id: "g2" })];
    expect(missionGoals({ id: "m1" }, goals).map(g => g.id)).toEqual(["g1"]);
    expect(standaloneGoals(goals).map(g => g.id)).toEqual(["g2"]);
  });
  it("att ta bort en målresa raderar ALDRIG delmålen — bara frikopplar", () => {
    const goals = [G({ id: "g1", missionId: "m1", missionPriority: "Viktigt" }), G({ id: "g2", missionId: "m2" })];
    const after = unlinkMissionGoals(goals, "m1");
    expect(after).toHaveLength(2);                      // inget raderat
    expect(after.find(g => g.id === "g1").missionId).toBe(null);
    expect(after.find(g => g.id === "g2").missionId).toBe("m2"); // andra resan orörd
  });
});

describe("Målresa — tidslinje & faser", () => {
  const now = Date.now();
  it("räknar veckor kvar och förfluten tid (fakta, ej påhittad progress)", () => {
    const t = missionTimeline(baseMission(now), now);
    expect(t.weeksToReady).toBe(14);
    expect(t.daysToReady).toBeGreaterThan(90);
    expect(t.pctElapsed).toBeGreaterThan(0);
    expect(t.pctElapsed).toBeLessThan(20);
  });
  it("två datum: förberedelse (readyDate) och genomförande (endDate)", () => {
    const m = baseMission(now, { endDate: iso(now + 154 * DAY) });   // 6–8 v efter avresa
    const t = missionTimeline(m, now);
    expect(t.daysToEnd).toBeGreaterThan(t.daysToReady);
  });
  it("currentPhase följer aktuell fas-id när faser saknar datum", () => {
    const m = baseMission(now, { phaseId: "p_build" });
    expect(currentPhase(m, now).phase.name).toBe("Uppbyggnad");
  });
});

describe("Målresa — status per delområde (real progress vs. real tid)", () => {
  const now = Date.now();
  const m = baseMission(now);   // 14 v start -14d..+98d, ~12,5% förflutet
  it("noSource → otillräcklig data (aldrig påhittad procent)", () => {
    expect(goalAreaStatus(G({ id: "x", noSource: true, start: 0, current: 0, target: 100 }), m, now)).toBe("otillräcklig_data");
  });
  it("0 % tidigt i resan → inte påbörjat", () => {
    expect(goalAreaStatus(G({ id: "x", start: 80, current: 80, target: 100, deadline: iso(now + 98 * DAY) }), m, now)).toBe("inte_påbörjat");
  });
  it("progress klart över förväntad takt → före plan", () => {
    // ~12,5% förflutet, 40% klart
    expect(goalAreaStatus(G({ id: "x", start: 80, current: 88, target: 100, deadline: iso(now + 98 * DAY) }), m, now)).toBe("före_plan");
  });
  it("uppnått mål → slutfört", () => {
    expect(goalAreaStatus(G({ id: "x", start: 80, current: 100, target: 100, deadline: iso(now + 98 * DAY) }), m, now)).toBe("slutfört");
  });
  it("långt efter förväntad takt sent i resan → efter plan", () => {
    const late = baseMission(now, { startDate: iso(now - 84 * DAY), readyDate: iso(now + 14 * DAY) }); // ~85% förflutet
    expect(goalAreaStatus(G({ id: "x", start: 80, current: 82, target: 100, deadline: iso(now + 14 * DAY) }), late, now)).toBe("efter_plan");
  });
  it("live-mål utan tillgängligt värde → otillräcklig data", () => {
    expect(goalAreaStatus(G({ id: "x", live: "bodyfat", start: 20, current: 20, target: 14, higher: false, deadline: iso(now + 98 * DAY) }), m, now, {})).toBe("otillräcklig_data");
  });
});

describe("Målresa — analys utan falsk precision", () => {
  const now = Date.now();
  const m = baseMission(now);
  const goals = [
    G({ id: "g1", title: "Bänkpress 1RM", cat: "Styrka", start: 80, current: 88, target: 100, deadline: iso(now + 98 * DAY), missionId: "m1", missionPriority: "Avgörande" }),
    G({ id: "g2", title: "Kroppsvikt", cat: "Kropp", start: 85, current: 84, target: 80, higher: false, live: "weight", deadline: iso(now + 98 * DAY), missionId: "m1", missionPriority: "Avgörande" }),
    G({ id: "g3", title: "Löpning", cat: "Kondition", start: 0, current: 0, target: 20, deadline: iso(now + 98 * DAY), missionId: "m1", missionPriority: "Viktigt" }),
  ];
  const ctx = { weekly: 3, bodyweight: 84, bodyfat: null };

  it("criticalOnTrack räknar avgörande i fas — inte en total-procent", () => {
    const a = missionAnalysis(m, goals, ctx, now);
    expect(a.criticalOnTrack).not.toBeNull();
    expect(a.criticalOnTrack.total).toBe(2);
    expect(a.criticalOnTrack).not.toHaveProperty("pct");
  });
  it("veckans fokus lyfter det värst liggande/tyngst prioriterade området", () => {
    const a = missionAnalysis(m, goals, ctx, now);
    expect(a.focus).not.toBeNull();
    expect(a.focus.goal.title).toBe("Löpning");   // inte påbörjat, medan avgörande ligger i fas/före
  });
  it("otillräckligt underlag flaggas som otillräcklig_data", () => {
    const bare = [G({ id: "gx", title: "Steg", noSource: true, missionId: "m1", missionPriority: "Avgörande" })];
    expect(missionAnalysis(m, bare, {}, now).dataQuality).toBe("otillräcklig_data");
  });
});

describe("Målresa — målkonflikter som hypoteser", () => {
  const now = Date.now();
  const m = baseMission(now);
  it("kaloriunderskott + sport → konflikt-hypotes med förklaring och fråga", () => {
    const goals = [G({ id: "g1", title: "Gå ner i vikt", cat: "Kropp", start: 85, target: 79, higher: false, missionId: "m1", missionPriority: "Avgörande" })];
    const c = detectMissionConflicts(m, missionGoals(m, goals));
    const hit = c.find(x => x.id === "cut_vs_skill");
    expect(hit).toBeTruthy();
    expect(hit.hypothesis).toBeTruthy();
    expect(hit.question).toBeTruthy();
  });
  it("ökad löpning + angivet vadbesvär → konflikt (användarens notering, ej diagnos)", () => {
    const goals = [G({ id: "g1", title: "Löpning 5 km", cat: "Kondition", start: 0, target: 10, missionId: "m1", missionPriority: "Viktigt" })];
    const c = detectMissionConflicts(m, missionGoals(m, goals));
    expect(c.some(x => x.id === "run_vs_calf")).toBe(true);
  });
  it("för många avgörande mot tiden → kapacitetskonflikt", () => {
    const many = [1, 2, 3, 4, 5].map(i => G({ id: "g" + i, title: "Mål " + i, missionId: "m1", missionPriority: "Avgörande" }));
    const c = detectMissionConflicts(newMission({ id: "m1", weeklyTime: 4 }), missionGoals({ id: "m1" }, many));
    expect(c.some(x => x.id === "too_many_priorities")).toBe(true);
  });
});

describe("Målresa — coach-sammanfattning skiljer observation/hypotes/rekommendation", () => {
  const now = Date.now();
  const m = baseMission(now);
  const goals = [
    G({ id: "g1", title: "Bänkpress 1RM", cat: "Styrka", start: 80, current: 88, target: 100, deadline: iso(now + 98 * DAY), missionId: "m1", missionPriority: "Avgörande" }),
    G({ id: "g2", title: "Gå ner i vikt", cat: "Kropp", start: 85, current: 84, target: 79, higher: false, deadline: iso(now + 98 * DAY), missionId: "m1", missionPriority: "Avgörande" }),
  ];
  it("ger fakta-observationer, hypoteser separat, samt en fråga innan förändring", () => {
    const cs = missionCoachSummary(missionAnalysis(m, goals, { bodyweight: 84 }, now));
    expect(cs.observation.some(l => /veckor kvar/.test(l))).toBe(true);
    expect(cs.observation.some(l => /avgörande områden ligger i fas/.test(l))).toBe(true);
    expect(Array.isArray(cs.hypotheses)).toBe(true);
    expect(cs.hypotheses.length).toBeGreaterThan(0);       // kaloriunderskott + sport
    expect(cs.question).toMatch(/känns/);                   // frågar innan den ändrar
  });
});

describe("Målresa — primär målresa & pausning", () => {
  const now = Date.now();
  it("väljer aktiv resa med närmast readyDate", () => {
    const a = newMission({ id: "a", status: "active", readyDate: iso(now + 200 * DAY) });
    const b = newMission({ id: "b", status: "active", readyDate: iso(now + 30 * DAY) });
    expect(primaryMission([a, b], now).id).toBe("b");
  });
  it("pausad resa → status pausat och väljs bort som primär när aktiv finns", () => {
    const paused = newMission({ id: "p", status: "paused", readyDate: iso(now + 5 * DAY) });
    const active = newMission({ id: "x", status: "active", readyDate: iso(now + 50 * DAY) });
    expect(missionStatus({ status: "paused" }, [])).toBe("pausat");
    expect(primaryMission([paused, active], now).id).toBe("x");
  });
  it("MISSION_PRIORITIES i spec-ordning", () => {
    expect(MISSION_PRIORITIES).toEqual(["Avgörande", "Viktigt", "Stödjande", "Extra"]);
  });
});

describe("Målresa — föreslaget upplägg (deterministiskt ur mål + delmål)", () => {
  const now = Date.now();
  const m = baseMission(now);   // veckotid 6, fas p_now, vadbesvär som begränsning
  const goals = [
    G({ id: "g1", title: "Bänkpress 1RM", cat: "Styrka", start: 80, current: 88, target: 100, deadline: iso(now + 98 * DAY), missionId: "m1", missionPriority: "Avgörande" }),
    G({ id: "g2", title: "Kroppsvikt", cat: "Kropp", start: 85, current: 84, target: 80, higher: false, live: "weight", deadline: iso(now + 98 * DAY), missionId: "m1", missionPriority: "Avgörande" }),
    G({ id: "g3", title: "Löpning", cat: "Kondition", start: 0, current: 2, target: 20, deadline: iso(now + 98 * DAY), missionId: "m1", missionPriority: "Viktigt" }),
  ];
  const ctx = { weekly: 3, bodyweight: 84, bodyfat: null };

  it("härleder pass/vecka ur veckotid och viktar avgörande högst", () => {
    const p = missionPlan(missionAnalysis(m, goals, ctx, now));
    expect(p).not.toBeNull();
    expect(p.sessionsFrom).toBe("time");
    expect(p.sessions).toBeGreaterThanOrEqual(2);
    const bench = p.blocks.find(b => b.title === "Bänkpress 1RM");
    const run = p.blocks.find(b => b.title === "Löpning");
    expect(bench.sessions).toBeGreaterThanOrEqual(run.sessions);   // avgörande ≥ viktigt
    expect(bench.sessions).toBeGreaterThanOrEqual(1);              // avgörande får minst ett pass
  });
  it("använder frekvensmål (pass/vecka) som volym och exkluderar det ur fördelningen", () => {
    const withFreq = [...goals, G({ id: "gf", title: "Träna 4 pass/vecka", cat: "Vana", start: 0, current: 0, target: 4, live: "weekly", missionId: "m1", missionPriority: "Viktigt" })];
    const p = missionPlan(missionAnalysis(m, withFreq, ctx, now));
    expect(p.sessionsFrom).toBe("goal");
    expect(p.sessions).toBe(4);
    expect(p.blocks.some(b => /pass\/vecka/i.test(b.title))).toBe(false);   // styr volym, inte ett fokusområde
  });
  it("speglar begränsningar (vadbesvär + löpning) som hänsyn — självrapporterat", () => {
    const p = missionPlan(missionAnalysis(m, goals, ctx, now));
    expect(p.cautions.some(c => /vad/i.test(c))).toBe(true);
  });
  it("pekar ut nästa fas", () => {
    const p = missionPlan(missionAnalysis(m, goals, ctx, now));
    expect(p.phaseName).toBe("Nuläge");
    expect(p.nextPhase.name).toBe("Grundperiod");
  });
  it("utan veckotid och utan frekvensmål → ingen påhittad passiffra (prioritetsordning)", () => {
    const noTime = baseMission(now, { weeklyTime: null });
    const p = missionPlan(missionAnalysis(noTime, goals, ctx, now));
    expect(p.sessions).toBeNull();
    expect(p.blocks.every(b => b.sessions === null)).toBe(true);
  });
  it("inga delmål → inget upplägg", () => {
    expect(missionPlan(missionAnalysis(m, [], ctx, now))).toBeNull();
  });
  it("upplägget ingår i coach-sammanfattningen", () => {
    const cs = missionCoachSummary(missionAnalysis(m, goals, ctx, now));
    expect(cs.plan).not.toBeNull();
    expect(Array.isArray(cs.plan.blocks)).toBe(true);
  });
});
