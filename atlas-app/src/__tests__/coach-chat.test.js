import { describe, it, expect } from "vitest";
import { coachReply, findMuscle, findTopic } from "../features/ai-coach/index.jsx";
import { defaultGoalProfile } from "../engines/goal.js";
import { citableTopic } from "../data/knowledge.js";

const DAY = 86400000;
const now = Date.now();

const fullCtx = {
  overallReadiness: 72,
  muscleStates: {
    pectoralis_major: { recoveryScore: 82, status: "ready" },
    quadriceps: { recoveryScore: 40, status: "recovering" },
    calves: { recoveryScore: 90, status: "ready" },
  },
  sessions: [{ source: "training", completedAt: now - 2 * DAY, sets: new Array(12).fill({}) }],
  activeProgram: { name: "Min PPL", workouts: [{ id: "w1", name: "Push", exercises: [{}, {}] }] },
  goalProfile: defaultGoalProfile(),
  nutritionTotals: { kcal: 2000, protein: 150 },
  nutritionTargets: { kcal: 2200, protein: 165 },
  nutritionDays: 4,
  measurements: [{ date: now - 30 * DAY, bodyFat: 20 }, { date: now - 2 * DAY, bodyFat: 18.4 }],
};

describe("coach-chat: nyckelord → muskel", () => {
  it("hittar muskler ur svenska nyckelord", () => {
    expect(findMuscle("berätta om bröst")).toBe("pectoralis_major");
    expect(findMuscle("hur tränar jag vaden")).toBe("calves");
    expect(findMuscle("biceps")).toBe("biceps_brachii");
    expect(findMuscle("baksida lår")).toBe("hamstrings");
    expect(findMuscle("rumpa")).toBe("gluteals");
  });
  it("returnerar null utan muskelord", () => {
    expect(findMuscle("hur går det med kosten")).toBeNull();
  });
});

describe("coach-chat: intent-router (grundade svar)", () => {
  it("återhämtning → nämner beredskap i procent", () => {
    const r = coachReply("hur ser återhämtningen ut?", fullCtx);
    expect(r.text).toMatch(/beredskap är 72%/);
    expect(r.chips.length).toBeGreaterThan(0);
  });

  it("återhämtning → listar fräscha och trötta muskler", () => {
    const r = coachReply("är jag redo att träna?", fullCtx);
    expect(r.text).toMatch(/Calves|Pectoralis/);
  });

  it("dagens pass → nästa pass ur aktivt program + startknapp", () => {
    const r = coachReply("vad ska jag träna idag?", fullCtx);
    expect(r.text).toMatch(/Min PPL/);
    expect(r.action.kind).toBe("start");
  });

  it("mål → resonemang ur målresan", () => {
    const r = coachReply("hur går mitt mål?", fullCtx);
    expect(r.text.toLowerCase()).toMatch(/recomp|vikt just nu/);
  });

  it("kost → proteinmål + energibalans", () => {
    const r = coachReply("hur ligger jag till med protein?", fullCtx);
    expect(r.text).toMatch(/Proteinmål: 165 g/);
    expect(r.text).toMatch(/kcal/);
  });

  it("muskel → citerar kunskapsbanken + returnerar topic", () => {
    const r = coachReply("berätta om bröst", fullCtx);
    expect(r.text).toMatch(/kunskapsbanken/i);
    expect(r.muscle).toBe("pectoralis_major");
    expect(r.topic).toEqual({ kind: "muscle", muscle: "pectoralis_major" });
  });

  it("uppföljning: 'hur tränar jag den?' använder förra muskeln", () => {
    const r = coachReply("hur tränar jag den?", fullCtx, { kind: "muscle", muscle: "pectoralis_major" });
    expect(r.muscle).toBe("pectoralis_major");
    expect(r.text.toLowerCase()).toMatch(/tränar|tryck|bänk/);
  });

  it("uppföljning: 'vad gör den?' ger funktionsfakta för förra muskeln", () => {
    const r = coachReply("vad gör den?", fullCtx, { kind: "muscle", muscle: "biceps_brachii" });
    expect(r.muscle).toBe("biceps_brachii");
    expect(r.text.toLowerCase()).toMatch(/böjer|supin/);
  });

  it("uppföljning krockar inte när ny muskel nämns explicit", () => {
    const r = coachReply("hur tränar jag vaden?", fullCtx, { kind: "muscle", muscle: "pectoralis_major" });
    expect(r.muscle).toBe("calves");
  });

  it("programförslag utan aktivt program → öppna program", () => {
    const r = coachReply("förslag på programändring", { ...fullCtx, activeProgram: null });
    expect(r.action.kind).toBe("programs");
  });

  it("okänd fråga → hjälp-fallback med förslag", () => {
    const r = coachReply("vad är meningen med livet", fullCtx);
    expect(r.chips.length).toBeGreaterThan(0);
  });

  it("tomt läge utan data → svarar grundat, kraschar inte", () => {
    const empty = { overallReadiness: null, muscleStates: {}, sessions: [], activeProgram: null, goalProfile: null, nutritionTotals: null, nutritionTargets: null, nutritionDays: 0, measurements: [] };
    expect(() => coachReply("hur går mitt mål?", empty)).not.toThrow();
    expect(() => coachReply("vad ska jag träna?", empty)).not.toThrow();
    const r = coachReply("vad ska jag träna?", empty);
    expect(r.action.kind).toBe("programs");
  });
});

describe("coach-chat: träningsprinciper (TOPICS) är citerbara", () => {
  it("findTopic hittar principer ur nyckelord", () => {
    expect(findTopic("vad är progressiv överbelastning?")).toBe("progressiv_overbelastning");
    expect(findTopic("hur ofta ska jag träna?")).toBe("traningsfrekvens");
    expect(findTopic("behöver jag en deload?")).toBe("deload");
    expect(findTopic("hur värmer jag upp?")).toBe("uppvarmning");
    expect(findTopic("hur många set ska jag köra?")).toBe("traningsvolym");
    expect(findTopic("berätta om energibalans")).toBe("energibalans");
    expect(findTopic("hur bygger jag muskler efter 50?")).toBe("muskler_efter_50");
    expect(findTopic("tips för äldre som tränar")).toBe("muskler_efter_50");
    expect(findTopic("behöver jag kolhydrater för att bygga muskler?")).toBe("kolhydrater");
    expect(findTopic("påverkar alkohol min träning?")).toBe("alkohol");
    expect(findTopic("kan jag träna bakfull?")).toBe("alkohol");
  });

  it("returnerar null utan principord", () => {
    expect(findTopic("berätta om bröst")).toBeNull();
  });

  it("princip-intent citerar TOPICS med källa och sätter topic", () => {
    const r = coachReply("vad är progressiv överbelastning?", fullCtx);
    expect(r.text).toMatch(/Progressiv överbelastning/);
    expect(r.text).toMatch(/Styrkelabbet/);
    expect(r.topic).toEqual({ kind: "topic", id: "progressiv_overbelastning" });
  });

  it("deload-fråga → citerar deload-principen", () => {
    const r = coachReply("behöver jag en deload?", fullCtx);
    expect(r.topic).toEqual({ kind: "topic", id: "deload" });
    expect(r.text.toLowerCase()).toMatch(/deload|avlastning/);
  });

  it("programförslag grundas i en princip (progressiv överbelastning/volym m.fl.)", () => {
    // Program med volymlucka → analyzeProgram föreslår 'add-exercise' (kind → träningsvolym)
    const gapProgram = { name: "Testprogram", equipment: ["barbell"], workouts: [{ id: "w1", name: "Pass A", exercises: [] }], weekdays: ["Mån"] };
    const r = coachReply("förslag på programändring", { ...fullCtx, activeProgram: gapProgram, sessions: [] });
    expect(r.text).toMatch(/Princip:/);
    expect(r.topic && r.topic.kind).toBe("topic");
  });

  it("kost-svaret grundar proteinriktlinjen i kunskapsbanken (källa)", () => {
    const r = coachReply("hur ligger jag till med protein?", fullCtx);
    expect(r.text).toMatch(/Proteinmål: 165 g/);
    expect(r.text).toMatch(/Styrkelabbet/);
    expect(r.topic).toEqual({ kind: "topic", id: "protein_kost" });
  });

  it("citableTopic ger citerbara fakta med källa", () => {
    const facts = citableTopic("progressiv_overbelastning");
    expect(facts.length).toBeGreaterThan(0);
    expect(facts.every(f => typeof f.fact === "string" && f.fact.length > 0)).toBe(true);
    expect(facts.some(f => f.source && f.source.name === "Styrkelabbet")).toBe(true);
  });
});
