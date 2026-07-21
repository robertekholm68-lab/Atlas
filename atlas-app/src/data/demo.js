// Askr DEMODATA — seedade exempel. FÅR EJ blandas med riktig användardata.
import { computeSessionLoad, daysLeft, roundInc } from "../engines/index.js";
import { ALL_TEMPLATES, copyProgram } from "../engines/programs.js";
import { EXERCISES } from "./exercises.js";
import { H, T, now } from "./tokens.js";

const INITIAL_PROFILE = {
  name: "Robert", age: 44, height: 180, weight: 82.4, bodyFat: 18, memberSince: "Jan 2026",
  avatar: null, photos: [],
  measurements: { "Hals": 38, "Bröst": 104, "Midja": 88, "Höft": 100, "Överarm": 38, "Lår": 60, "Vad": 39, "Axlar": 120 },
  weightHistory: [83.5, 83.1, 82.9, 82.6, 82.5, 82.4],
};

// Datumhjälpare för demons målresa (relativa till nu så demon alltid ser aktuell ut).
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);
const DEMO_MISSION_ID = "mission_demo_thailand";

const INITIAL_GOALS = [
  { id: "g1", title: "Bänkpress 1RM", cat: "Styrka", start: 80, current: 90, target: 100, unit: "kg", higher: true, deadline: isoDay(now + 84 * H(24)), missionId: DEMO_MISSION_ID, missionPriority: "Avgörande" },
  { id: "g2", title: "Knäböj 1RM", cat: "Styrka", start: 100, current: 120, target: 140, unit: "kg", higher: true, deadline: isoDay(now + 84 * H(24)), missionId: DEMO_MISSION_ID, missionPriority: "Stödjande" },
  { id: "g3", title: "Kroppsvikt", cat: "Kropp", start: 85, current: 82.4, target: 80, unit: "kg", higher: false, live: "weight", deadline: isoDay(now + 84 * H(24)), missionId: DEMO_MISSION_ID, missionPriority: "Avgörande" },
  { id: "g4", title: "Kroppsfett", cat: "Kropp", start: 20, current: 18, target: 14, unit: "%", higher: false, live: "bodyfat", deadline: "2026-11-01" },
  { id: "g5", title: "Träna 4 pass/vecka", cat: "Vana", start: 0, current: 0, target: 4, unit: "pass", higher: true, live: "weekly", deadline: "", missionId: DEMO_MISSION_ID, missionPriority: "Viktigt" },
  { id: "g6", title: "10 000 steg/dag", cat: "Kondition", start: 0, current: 0, target: 10000, unit: "steg", higher: true, noSource: true, deadline: "" },
];

// DEMO: en Målresa (Askr Mission) — samlar delmål kring en personlig, betydelsefull resa.
const INITIAL_MISSIONS = [
  {
    id: DEMO_MISSION_ID,
    name: "Thailand — thaiboxning",
    description: "6–8 veckors thaiboxningsläger i Thailand. Vara förberedd för hela perioden, inte bara redo vid avresan.",
    why: "En dröm jag skjutit upp i åratal. Jag vill komma dit stark, seg och redo att träna varje dag utan att bryta ihop.",
    type: "training",
    startDate: isoDay(now - 14 * H(24)),   // började för 2 veckor sedan
    readyDate: isoDay(now + 84 * H(24)),    // redo vid avresa om 12 veckor
    endDate: isoDay(now + 140 * H(24)),     // genomförandet klart ~8 v efter avresa
    status: "active",
    priority: "Avgörande",
    phaseId: "p_build",
    phases: [
      { id: "p_now", name: "Nuläge", note: "Utgångsläge kartlagt" },
      { id: "p_base", name: "Grundperiod" },
      { id: "p_build", name: "Uppbyggnad", note: "Styrka + kondition parallellt" },
      { id: "p_specific", name: "Specifik förberedelse", note: "Mer boxning, mindre tung skivstång" },
      { id: "p_peak", name: "Toppning" },
      { id: "p_execute", name: "Genomförande", note: "På plats i Thailand" },
      { id: "p_followup", name: "Uppföljning" },
    ],
    weeklyTime: 6,
    constraints: "Återkommande vadbesvär vid mycket löpning. Ont om tid vissa veckor.",
    successDefinition: "Att kunna träna två pass om dagen i Thailand utan att skada mig, hålla vikten och känna mig teknisk och trygg i sparringen.",
    checkins: [
      { ts: now - 7 * H(24), energy: 4, motivation: 5, obstacles: "Stressig vecka på jobbet", note: "Ändå tre pass. Nöjd.", priorityChange: "" },
    ],
    skillCheckins: [
      { ts: now - 5 * H(24), area: "Thaiboxning", technique: "Bättre balans i clinch", quality: 3, better: "Rörligheten i höften", improve: "Timing på lågspark", coach: "Tränaren sa att gardering ser stabilare ut", pain: "", note: "" },
    ],
    createdAt: new Date(now - 14 * H(24)).toISOString(),
    updatedAt: new Date(now - 2 * H(24)).toISOString(),
  },
];

// Demodata: normal, daglig kosthållning på ~2500 kcal, ~30 dagar bakåt (underhållsnivå,
// stämmer med stabil vikt ~82 kg). Tre roterande dagsmenyer, var och en ≈2500 kcal.
// (Real Mode börjar tom — detta påverkar bara demo.)
const INITIAL_FOOD_LOG = (() => {
  const DAY = H(24);
  // Varje meny summerar till ~2470–2500 kcal (kcal/100g ur foods.js).
  const menus = [
    [["oats", 100], ["milk", 250], ["quark", 250], ["banana", 120], ["chicken", 200], ["rice", 250], ["olive_oil", 10], ["bread", 100], ["egg", 120], ["almonds", 30], ["salmon", 150], ["potato", 200]],
    [["oats", 90], ["milk", 200], ["peanut_butter", 30], ["banana", 100], ["beef", 200], ["pasta", 250], ["quark", 300], ["almonds", 25], ["egg", 150], ["bread", 100], ["tuna", 100], ["rice", 100]],
    [["oats", 100], ["milk", 250], ["banana", 150], ["chicken", 250], ["rice", 300], ["quark", 250], ["peanut_butter", 25], ["salmon", 150], ["potato", 250], ["olive_oil", 10], ["bread", 100]],
  ];
  const out = [];
  for (let d = 0; d <= 29; d++) {
    const menu = menus[d % menus.length];
    menu.forEach(([foodId, grams], i) => out.push({ foodId, grams, ts: now - d * DAY + (7 + (i % 12)) * H(1) }));
  }
  return out;
})();

const NUTRITION_WEEK = [2100, 1950, 2280, 2040, 2230, 1890];

const INITIAL_MEAL_MEMORY = [
  { name: "Clear whey", kcal: 90, protein: 22, carbs: 1, fat: 0, count: 20, quality: "exact" },
  { name: "Frukostbowl (kvarg, bär, granola)", kcal: 420, protein: 38, carbs: 48, fat: 9, count: 14, quality: "calculated" },
  { name: "Äggröra + 2 knäckebröd", kcal: 340, protein: 24, carbs: 26, fat: 16, count: 11, quality: "calculated" },
  { name: "Kyckling, ris och broccoli", kcal: 560, protein: 52, carbs: 60, fat: 12, count: 9, quality: "exact" },
  { name: "Köttbullar på restaurang", kcal: 850, protein: 34, carbs: 78, fat: 43, count: 5, quality: "estimated" },
  { name: "Korvkiosken efter innebandyn", kcal: 1100, protein: 40, carbs: 80, fat: 60, count: 4, quality: "estimated" },
];

const S1_SETS = [
  { exerciseId: "bench_press", weight: 80, reps: 10, rpe: 8 }, { exerciseId: "bench_press", weight: 80, reps: 8, rpe: 9 },
  { exerciseId: "ohp", weight: 50, reps: 10, rpe: 7 }, { exerciseId: "pull_up", reps: 8, rpe: 8 }, { exerciseId: "curl", weight: 15, reps: 12, rpe: 7 },
];

const S2_SETS = [
  { exerciseId: "squat", weight: 100, reps: 8, rpe: 8 }, { exerciseId: "squat", weight: 100, reps: 6, rpe: 9 },
  { exerciseId: "deadlift", weight: 120, reps: 5, rpe: 9 }, { exerciseId: "lunge", weight: 20, reps: 12, rpe: 7 }, { exerciseId: "calf_raise", weight: 60, reps: 15, rpe: 7 },
];

// Demo-program: en aktiv personlig kopia av PPL Intermediate, med STABILT id så att
// de seedade passen kan taggas mot programmet (adherence, progression, coach-analys).
const DEMO_PROGRAM = copyProgram(
  ALL_TEMPLATES.find(t => t.family === "Push/Pull/Legs" && t.level === "Intermediate"),
  { id: "prog_demo_ppl", name: "Min PPL", active: true }
);
const DEMO_PROGRAMS = [DEMO_PROGRAM];

// Träningshistorik som om användaren följt "Min PPL" i ~14 veckor, 3 pass/vecka.
// Vikterna progresserar ~2%/vecka; huvudlyftet på push-passet planar ut de sista veckorna
// (en realistisk platå för coachen att diskutera). Varje pass taggas med programId + workoutId.
const DEMO_SESSIONS = (() => {
  const GROUP_BASE = { Chest: 60, Back: 60, Shoulders: 35, Arms: 22, Legs: 95, Glutes: 75, Calves: 60, Core: 0 };
  const baseFor = ex => { if (!ex) return 40; if (ex.loadMode === "bodyweight" || ex.loadMode === "time") return null; return GROUP_BASE[ex.group] ?? 40; };
  const wos = DEMO_PROGRAM.workouts;               // [Push, Pull, Legs]
  const WEEKS = 14, PER = wos.length || 3;
  const out = []; let id = 200;
  for (let w = WEEKS - 1; w >= 0; w--) {            // w = veckor sedan (0 = denna vecka)
    const wk = WEEKS - 1 - w;                       // 0 = äldsta veckan
    for (let d = 0; d < PER; d++) {
      const wo = wos[d]; if (!wo) continue;
      const sets = [];
      wo.exercises.forEach((e, ei) => {
        const ex = EXERCISES.find(x => x.id === e.exId);
        const bw = baseFor(ex);
        const reps = Math.max(4, Math.round(((e.repMin ?? 8) + (e.repMax ?? 12)) / 2));
        const nSets = e.sets || 3;
        let weight = bw ? roundInc(bw * (1 + 0.02 * wk)) : null;
        // huvudlyftet på push-passet (dag 0, första övningen) planar ut sista 4 veckorna
        if (bw && d === 0 && ei === 0 && wk >= WEEKS - 4) weight = roundInc(bw * (1 + 0.02 * (WEEKS - 5)));
        for (let s = 0; s < nSets; s++) sets.push(bw ? { exerciseId: e.exId, weight, reps: Math.max(3, reps - (s > 0 ? 1 : 0)), rpe: 7 + Math.min(2, s + 1) } : { exerciseId: e.exId, reps, rpe: 8 });
      });
      const completedAt = now - (w * 7 + (PER - 1 - d) * 2 + 1) * H(24);
      out.push({ id: "d" + (id++), title: wo.name, programId: DEMO_PROGRAM.id, workoutId: wo.id, completedAt, sets, muscleLoads: computeSessionLoad(sets, EXERCISES) });
    }
  }
  return out;
})();

const INITIAL_SESSIONS = DEMO_SESSIONS;

const INITIAL_MEASUREMENTS = [
  { date: now - H(56 * 24), weight: 83.4, waist: 85.5 },
  { date: now - H(42 * 24), weight: 82.9, waist: 85.0 },
  { date: now - H(28 * 24), weight: 82.5, waist: 84.5, bodyFat: 18.6 },
  { date: now - H(14 * 24), weight: 82.5, waist: 84.5, bodyFat: 18.2 },
  { date: now - H(2 * 24), weight: 82.4, waist: 84.5, bodyFat: 18.0 },
];

const MOCK = {
  trainingLoad: [520, 470, 610, 540, 690, 650, 678], trainingLoadDays: ["M", "T", "W", "T", "F", "S", "S"],
  recovery: 76, sleep: "7h 45m", hrv: "68 ms", restingHr: "48 bpm",
  metrics: [
    { icon: "♥", label: "HRV", value: "68", unit: "ms", state: "Good", color: T.accent.success, spark: [60, 64, 62, 66, 65, 68], sparkColor: T.accent.success },
    { icon: "☾", label: "Sleep", value: "7h 45m", unit: "", state: "Good", color: T.accent.success, spark: [7, 6.5, 7.2, 7, 7.8, 7.75], sparkColor: T.accent.secondary },
    { icon: "↗", label: "Steps", value: "8,342", unit: "/10k", state: "Good", color: T.accent.success, spark: [6, 7, 5, 8, 7.5, 8.3], sparkColor: T.accent.success },
    { icon: "🔥", label: "Calories", value: "2,341", unit: "/2,800", state: "On track", color: T.accent.warning, spark: [2, 2.3, 2.1, 2.5, 2.2, 2.34], sparkColor: T.accent.warning },
    { icon: "⚖", label: "Body Weight", value: "82.4", unit: "kg", state: "Stable", color: T.accent.primary, spark: [83, 82.8, 82.6, 82.5, 82.4, 82.4], sparkColor: T.accent.primary },
  ],
  streak: 42, milestone: { title: "Build stronger legs", pct: 72, daysLeft: 14 },
  nutrition: { calories: { now: 1920, goal: 2200 }, protein: { now: 132, goal: 160 }, carbs: { now: 184, goal: 240 }, water: { now: 2.1, goal: 3.0 } },
};

const DEMO_LEVELS = {
  pectoralis_major: { status: "ready", recoveryScore: 92 }, deltoids: { status: "recovering", recoveryScore: 45 },
  biceps_brachii: { status: "critical", recoveryScore: 18 }, triceps_brachii: { status: "recovering", recoveryScore: 48 },
  forearms: { status: "nearly_ready", recoveryScore: 68 }, rectus_abdominis: { status: "undertrained", recoveryScore: 60 },
  external_obliques: { status: "recovering", recoveryScore: 52 }, serratus_anterior: { status: "ready", recoveryScore: 84 },
  trapezius: { status: "ready", recoveryScore: 88 }, latissimus_dorsi: { status: "critical", recoveryScore: 22 },
  erector_spinae: { status: "ready", recoveryScore: 80 }, teres_major: { status: "nearly_ready", recoveryScore: 66 },
  gluteals: { status: "ready", recoveryScore: 90 }, quadriceps: { status: "critical", recoveryScore: 25 },
  hamstrings: { status: "recovering", recoveryScore: 42 }, adductors: { status: "recovering", recoveryScore: 40 },
  calves: { status: "undertrained", recoveryScore: 55 }, tibialis_anterior: { status: "nearly_ready", recoveryScore: 70 },
};

export { INITIAL_PROFILE, INITIAL_GOALS, INITIAL_MISSIONS, INITIAL_FOOD_LOG, NUTRITION_WEEK, INITIAL_MEAL_MEMORY, S1_SETS, S2_SETS, DEMO_SESSIONS, INITIAL_SESSIONS, INITIAL_MEASUREMENTS, MOCK, DEMO_LEVELS, DEMO_PROGRAM, DEMO_PROGRAMS };
