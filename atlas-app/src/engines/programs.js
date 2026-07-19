// ENGINE: ATLAS Program-motor. Rena funktioner — bygger program ur familj+nivå, beräknar
// veckovolym per muskelgrupp, validerar (varnar, blockerar ej) och rekommenderar program.
// Återanvänder befintliga EXERCISES (id/group/pattern/equipment/activation) och muskelmappning.
import { EXERCISES } from "../data/exercises.js";

export const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Core", "Legs", "Glutes", "Calves"];
const SV = { Chest: "Bröst", Back: "Rygg", Shoulders: "Axlar", Biceps: "Biceps", Triceps: "Triceps", Core: "Core", Legs: "Ben", Glutes: "Säte", Calves: "Vader" };
const COMPOUND = ["Squat", "Hinge", "Lunge", "Horizontal Push", "Incline Push", "Vertical Push", "Horizontal Pull", "Vertical Pull"];
const isCompound = e => COMPOUND.includes(e.pattern);

export const WEEKDAYS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

// ── Nivåparametrar: skiljer sig i volym, intensitet, komplexitet, progression, återhämtning ──
export const LEVELS = {
  Novice:       { mainPerSlot: 1, accessory: 1, sets: 3, rir: 3, restSec: 90,  progression: "Linjär (öka vikt varje pass)",      complexity: "compound", defaultDays: 3, dayRange: [2, 3], setBias: 0 },
  Intermediate: { mainPerSlot: 1, accessory: 2, sets: 3, rir: 2, restSec: 105, progression: "Dubbel progression (reps → vikt)",   complexity: "mixed",    defaultDays: 4, dayRange: [3, 5], setBias: 1 },
  Advanced:     { mainPerSlot: 2, accessory: 3, sets: 4, rir: 1, restSec: 135, progression: "Dubbel progression + periodisering", complexity: "full",     defaultDays: 5, dayRange: [4, 6], setBias: 1 },
};
// Passlängd → max antal övningar (färre vid 30 min, fler vid 60–90)
const DURATION_MAX = d => d <= 30 ? 4 : d <= 45 ? 5 : d <= 60 ? 6 : d <= 75 ? 7 : 8;
function intensityWeight(rir) { const w = 1 - ((rir == null ? 2 : rir) - 2) * 0.08; return Math.max(0.6, Math.min(1.12, w)); }

// ── Rep-scheman per mål ──
const GOAL_REPS = {
  Strength: { comp: [3, 6], iso: [6, 10], restMul: 1.3 },
  Hypertrophy: { comp: [6, 10], iso: [10, 15], restMul: 1.0 },
  General: { comp: [6, 12], iso: [10, 15], restMul: 0.9 },
};

// ── Dagsmallar per familj: varje dag = lista av slots {g: muskelgrupp, c: kräver compound} ──
const DAY = {
  FBA: { name: "Helkropp A", slots: [["Legs", 1], ["Chest", 1], ["Back", 1], ["Shoulders", 0], ["Core", 0]] },
  FBB: { name: "Helkropp B", slots: [["Glutes", 1], ["Back", 1], ["Chest", 1], ["Triceps", 0], ["Calves", 0]] },
  FBC: { name: "Helkropp C", slots: [["Legs", 1], ["Shoulders", 1], ["Back", 1], ["Biceps", 0], ["Core", 0]] },
  Upper: { name: "Överkropp", slots: [["Chest", 1], ["Back", 1], ["Shoulders", 1], ["Biceps", 0], ["Triceps", 0]] },
  Lower: { name: "Underkropp", slots: [["Legs", 1], ["Glutes", 1], ["Legs", 0], ["Calves", 0], ["Core", 0]] },
  Push: { name: "Push", slots: [["Chest", 1], ["Shoulders", 1], ["Chest", 0], ["Triceps", 0], ["Triceps", 0]] },
  Pull: { name: "Pull", slots: [["Back", 1], ["Back", 1], ["Biceps", 0], ["Biceps", 0], ["Core", 0]] },
  Legs: { name: "Ben", slots: [["Legs", 1], ["Glutes", 1], ["Legs", 0], ["Calves", 0], ["Core", 0]] },
  Chest: { name: "Bröst", slots: [["Chest", 1], ["Chest", 1], ["Chest", 0], ["Triceps", 0]] },
  BackD: { name: "Rygg", slots: [["Back", 1], ["Back", 1], ["Back", 0], ["Biceps", 0]] },
  ShouldersD: { name: "Axlar", slots: [["Shoulders", 1], ["Shoulders", 0], ["Shoulders", 0], ["Core", 0]] },
  Arms: { name: "Armar", slots: [["Biceps", 0], ["Triceps", 0], ["Biceps", 0], ["Triceps", 0]] },
  Torso: { name: "Torso", slots: [["Chest", 1], ["Back", 1], ["Shoulders", 1], ["Core", 0], ["Core", 0]] },
  Limbs: { name: "Extremiteter", slots: [["Legs", 1], ["Glutes", 1], ["Biceps", 0], ["Triceps", 0], ["Calves", 0]] },
};

// schema: familj → funktion(days) → lista av dagsmall-nycklar
const cycle = (keys, days) => Array.from({ length: days }, (_, i) => keys[i % keys.length]);

export const FAMILIES = {
  "Full Body": { goal: "General", desc: "Hela kroppen varje pass — hög frekvens per muskel, tidseffektivt.", rec: [3, 4], sched: d => cycle(["FBA", "FBB", "FBC"], d), equip: "any" },
  "Upper/Lower": { goal: "Hypertrophy", desc: "Överkropp/underkropp växelvis — bra balans mellan frekvens och volym.", rec: [4], sched: d => cycle(["Upper", "Lower"], d), equip: "any" },
  "Push/Pull/Legs": { goal: "Hypertrophy", desc: "Tryck/drag/ben — hög volym per muskelgrupp, skalar till 6 dagar.", rec: [3, 6], sched: d => cycle(["Push", "Pull", "Legs"], d), equip: "any" },
  "Bro Split": { goal: "Hypertrophy", desc: "En muskelgrupp per dag — maximal volym och fokus, låg frekvens.", rec: [5], sched: d => cycle(["Chest", "BackD", "ShouldersD", "Arms", "Legs"], d), equip: "any" },
  "Torso/Limbs": { goal: "Hypertrophy", desc: "Torso/extremiteter — hög frekvens, jämn fördelning.", rec: [4], sched: d => cycle(["Torso", "Limbs"], d), equip: "any" },
  "Kettlebell": { goal: "General", desc: "Kettlebell-baserad helkropp — kondition + styrka, minimal utrustning.", rec: [3], sched: d => cycle(["FBA", "FBB", "FBC"], d), equip: ["Kettlebell", "Bodyweight"] },
  "Bodyweight": { goal: "General", desc: "Kroppsvikt — träna var som helst, progression via svårighetsgrad och reps.", rec: [3, 4], sched: d => cycle(["FBA", "FBB", "FBC"], d), equip: ["Bodyweight"] },
  "Strength-focused": { goal: "Strength", desc: "Fokus på de stora lyften — låga reps, hög intensitet, lång vila.", rec: [3, 4], sched: d => cycle(["Upper", "Lower"], d), equip: "any" },
  "Hypertrophy-focused": { goal: "Hypertrophy", desc: "Maximal muskeltillväxt — högre volym, moderata reps.", rec: [4, 5], sched: d => cycle(["Push", "Pull", "Legs"], d), equip: "any" },
  "General Fitness": { goal: "General", desc: "Allmän hälsa och form — balanserat, hållbart, tidseffektivt.", rec: [3], sched: d => cycle(["FBA", "FBB", "FBC"], d), equip: "any" },
};
export const FAMILY_NAMES = Object.keys(FAMILIES);

// ── Övningsval ──
function equipList(family, equip) {
  const f = FAMILIES[family];
  if (f.equip !== "any") return f.equip;            // familj tvingar utrustning (kettlebell/bodyweight)
  return equip && equip.length ? equip : ["Barbell", "Dumbbell", "Machine", "Cable", "Bodyweight", "EZ Bar", "Kettlebell"];
}
// Rankad pool för en grupp, filtrerad på utrustning (ALDRIG fallback till otillåten utrustning), compound först om c=1
function poolFor(group, compoundPref, allowedEquip, complexity) {
  let pool = EXERCISES.filter(e => e.group === group && allowedEquip.includes(e.equipment));
  pool = pool.slice().sort((a, b) => {
    const ca = isCompound(a) ? 1 : 0, cb = isCompound(b) ? 1 : 0;
    if (compoundPref || complexity === "compound") return cb - ca;   // compound först (Novice föredrar sammansatta)
    return ca - cb;
  });
  return pool;
}

let _uid = 0;
const uid = p => `${p}_${Date.now().toString(36)}${(_uid++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Bygg ett pass ur en dagsmall (nivåskalat, tidsbudgeterat, utrustningssäkert)
function buildWorkout(dayKey, family, level, goal, allowedEquip, duration) {
  const tpl = DAY[dayKey], L = LEVELS[level], reps = GOAL_REPS[goal] || GOAL_REPS.General;
  const exercises = [], warnings = [];
  const used = new Set();
  const maxEx = DURATION_MAX(duration || 60);
  const addEx = (e, isMain) => {
    const isC = isCompound(e); const [lo, hi] = isC ? reps.comp : reps.iso;
    exercises.push({ exId: e.id, sets: L.sets + (isMain ? L.setBias : 0), repMin: lo, repMax: hi, rir: L.rir, restSec: Math.round((isMain ? L.restSec : L.restSec - 25) * reps.restMul), progression: L.progression });
    used.add(e.id);
  };
  // 1) huvud- och accessory-slots (huvud = de två första, får mainPerSlot övningar)
  tpl.slots.forEach(([group, cPref], si) => {
    const isMain = si < 2;
    const want = isMain ? L.mainPerSlot : 1;
    const pool = poolFor(group, cPref, allowedEquip, L.complexity).filter(e => !used.has(e.id));
    if (!pool.length) { warnings.push({ group, msg: `Ingen ${allowedEquip.join("/")}-övning för ${SV[group] || group} — hoppade över.` }); return; }
    for (let k = 0; k < want && k < pool.length; k++) addEx(pool[k], isMain);
  });
  // 2) extra accessory-övningar (nivåberoende) för mindre muskler — bara om tid finns
  let added = 0;
  for (const g of ["Triceps", "Biceps", "Shoulders", "Calves", "Core"]) {
    if (added >= L.accessory || exercises.length >= maxEx) break;
    const pool = poolFor(g, 0, allowedEquip, L.complexity).filter(e => !used.has(e.id));
    if (pool[0]) { addEx(pool[0], false); added++; }
  }
  // 3) tidsbudget: trimma minst prioriterade (accessories låg sist, huvud-compounds bevaras) om över cap
  while (exercises.length > maxEx) exercises.pop();
  return { id: uid("wo"), name: tpl.name, exercises, warnings };
}

// ── Generera ett fullständigt program ──
export function generateProgram(family, level, opts = {}) {
  const F = FAMILIES[family]; if (!F) return null;
  const goal = opts.goal || F.goal;
  const days = opts.days || F.rec[0] || LEVELS[level].defaultDays;
  const allowedEquip = equipList(family, opts.equip);
  const duration = opts.sessionDuration || 60;
  const schedule = F.sched(days);
  const built = schedule.map(k => buildWorkout(k, family, level, goal, allowedEquip, duration));
  const workouts = built.map(w => ({ id: w.id, name: w.name, exercises: w.exercises }));
  const equipmentWarnings = [...new Set(built.flatMap(w => (w.warnings || []).map(x => x.msg)))];
  const weekdays = (opts.weekdays && opts.weekdays.length === days) ? opts.weekdays : defaultWeekdays(days);
  return normalizeProgram({
    id: opts.id || uid("prog"),
    templateId: opts.templateId || null,
    isTemplate: !!opts.isTemplate,
    name: opts.name || `${family} · ${level}`,
    family, level, goal,
    split: family,
    daysPerWeek: days,
    weekdays,
    sessionDuration: duration,
    equipment: allowedEquip,
    equipmentWarnings,
    workouts,
    version: 1,
    createdAt: Date.now(), updatedAt: Date.now(),
    archived: false, active: false,
  });
}

// Rekommenderade veckodagar med jämn spridning (bättre återhämtning)
export function defaultWeekdays(days) {
  const map = { 1: [2], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 3, 4, 5], 6: [0, 1, 2, 3, 4, 5] };
  return (map[days] || map[3]).map(i => WEEKDAYS[i]);
}
function durationFor(workouts) {
  const avgEx = workouts.reduce((a, w) => a + w.exercises.length, 0) / Math.max(1, workouts.length);
  return Math.round((avgEx * 8 + 8) / 5) * 5;   // ~8 min/övning + uppvärmning, avrundat
}

export function normalizeProgram(p) {
  const wk = (p.workouts || []).map(w => ({ id: w.id || uid("wo"), name: w.name || "Pass", exercises: (w.exercises || []).map(x => ({ exId: x.exId, sets: x.sets ?? 3, repMin: x.repMin ?? 8, repMax: x.repMax ?? 12, rir: x.rir ?? 2, restSec: x.restSec ?? 90, progression: x.progression || "Dubbel progression" })) }));
  return { archived: false, active: false, version: 1, ...p, workouts: wk };
}

// ── Skapa personlig kopia av en mall (originalet bevaras) ──
export function copyProgram(src, patch = {}) {
  return normalizeProgram({ ...src, id: uid("prog"), templateId: src.isTemplate ? src.id : (src.templateId || null), isTemplate: false, name: patch.name || (src.isTemplate ? src.name : src.name + " (kopia)"), version: 1, createdAt: Date.now(), updatedAt: Date.now(), active: false, archived: false, ...patch, workouts: (patch.workouts || src.workouts).map(w => ({ ...w, id: uid("wo"), exercises: w.exercises.map(e => ({ ...e })) })) });
}
export function bumpVersion(p) { return { ...p, version: (p.version || 1) + 1, updatedAt: Date.now() }; }

// ── Alla mallar: 10 familjer × 3 nivåer ──
export const LEVEL_NAMES = ["Novice", "Intermediate", "Advanced"];
const LEVEL_DURATION = { Novice: 45, Intermediate: 60, Advanced: 75 };

// ── Handskrivna, kurerade mallar (utanför den genererade familjelogiken) ──
// ATLAS 50+ Performance: 2-dagars helkropp för träningsvana 50+. Axelvänliga val,
// dubbel progression, RIR 2, minst två vilodagar mellan passen.
const ex = (exId, sets, repMin, repMax, restSec) => ({ exId, sets, repMin, repMax, rir: 2, restSec, progression: "Dubbel progression (reps → vikt)" });
const ATLAS_50PLUS = normalizeProgram({
  id: "tmpl_atlas_50plus",
  name: "ATLAS 50+ Performance",
  family: "ATLAS 50+",
  level: "Intermediate",
  goal: "Hypertrophy",
  split: "Helkropp 2-dagars",
  daysPerWeek: 2,
  weekdays: ["Mån", "Tor"],
  equipment: ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight"],
  sessionDuration: 65,
  isTemplate: true,
  desc: "Två helkroppspass i veckan för dig som är träningsvan och 50+. Axelvänliga övningsval, dubbel progression och normalt RIR 2 (två reps i reserv). Lägg minst två vilodagar mellan passen. Failure behövs sällan — spara det för säkra isolationsövningar. Smärta som ändrar rörelsemönstret ska inte pressas igenom; anpassa övningen (t.ex. benpress istället för knäböj, bröstpress istället för hantelpress) och utred återkommande besvär.",
  workouts: [
    { id: "wo_50plus_a", name: "Pass A", exercises: [
      ex("safety_bar_squat", 3, 5, 8, 150),
      ex("db_neutral_press", 3, 6, 10, 120),
      ex("chest_supported_row", 3, 6, 10, 120),
      ex("seated_leg_curl", 3, 10, 15, 90),
      ex("cable_lateral_raise", 3, 12, 20, 75),
      ex("pallof_press", 3, 10, 15, 60),
    ] },
    { id: "wo_50plus_b", name: "Pass B", exercises: [
      ex("trap_bar_deadlift", 3, 4, 6, 150),
      ex("close_pulldown", 3, 6, 10, 120),
      ex("landmine_press", 3, 6, 10, 120),
      ex("leg_extension", 3, 10, 15, 90),
      ex("face_pull", 3, 12, 20, 75),
      ex("calf_raise", 3, 8, 15, 90),
    ] },
  ],
});
export const CURATED_TEMPLATES = [ATLAS_50PLUS];

export const ALL_TEMPLATES = [
  ...CURATED_TEMPLATES,
  ...FAMILY_NAMES.flatMap(family =>
    LEVEL_NAMES.map(level => {
      const days = FAMILIES[family].rec[0] || LEVELS[level].defaultDays;
      return generateProgram(family, level, { isTemplate: true, days, sessionDuration: LEVEL_DURATION[level], id: `tmpl_${family}_${level}`.replace(/[^a-zA-Z0-9_]/g, "") });
    })
  ),
];

// ── Veckovolym per muskelgrupp (arbetsset per grupp/vecka) ──
export function weeklyVolume(program) {
  const byGroup = {}; MUSCLE_GROUPS.forEach(g => byGroup[g] = 0);
  (program.workouts || []).forEach(w => w.exercises.forEach(x => {
    const e = EXERCISES.find(z => z.id === x.exId); if (!e) return;
    byGroup[e.group] = (byGroup[e.group] || 0) + (x.sets || 0);
  }));
  return byGroup;
}
// Belastning per finmuskel (via activation) — kopplar till muskelkarta/återhämtning
export function weeklyMuscleLoad(program) {
  const load = {};
  (program.workouts || []).forEach(w => w.exercises.forEach(x => {
    const e = EXERCISES.find(z => z.id === x.exId); if (!e) return;
    (e.activation || []).forEach(a => { load[a.muscleId] = (load[a.muscleId] || 0) + (x.sets || 0) * (a.factor || 0); });
  }));
  return load;
}
// Effektiva veckoset per muskel-ID: arbetsset × primär/sekundär aktivering × RIR-vikt.
// Ger { muscleId: { direct, effective, exercises:[{name,sets,factor,effective}] } } — bas för live-belastningskroppen.
export function programMuscleLoad(program) {
  const out = {};
  (program.workouts || []).forEach(w => w.exercises.forEach(x => {
    const e = EXERCISES.find(z => z.id === x.exId); if (!e) return;
    const iw = intensityWeight(x.rir);
    (e.activation || []).forEach(a => {
      const m = out[a.muscleId] || (out[a.muscleId] = { direct: 0, effective: 0, exercises: [] });
      const eff = (x.sets || 0) * (a.factor || 0) * iw;
      m.effective += eff;
      if ((a.factor || 0) >= 0.7) m.direct += (x.sets || 0);
      const ex = m.exercises.find(z => z.name === e.name);
      if (ex) { ex.sets += (x.sets || 0); ex.effective = +(ex.effective + eff).toFixed(1); }
      else m.exercises.push({ name: e.name, sets: x.sets || 0, factor: a.factor || 0, effective: +eff.toFixed(1), primary: (a.factor || 0) >= 0.7 });
    });
  }));
  Object.values(out).forEach(m => { m.effective = +m.effective.toFixed(1); m.exercises.sort((a, b) => b.effective - a.effective); });
  return out;
}

// ── Validering: varnar, blockerar ej ──
export function validateProgram(program) {
  const warnings = [];
  const vol = weeklyVolume(program);
  const days = program.workouts.length;
  // veckodagar måste matcha antal pass
  const dpw = program.daysPerWeek || days;
  if ((program.weekdays || []).length !== dpw) warnings.push({ type: "weekdays", level: "warn", msg: `Valda veckodagar (${(program.weekdays || []).length}) matchar inte antal pass (${dpw}).` });
  // utrustningsvarningar från generering (aldrig tyst insatt otillåten utrustning)
  (program.equipmentWarnings || []).forEach(msg => warnings.push({ type: "equipment", level: "warn", msg }));
  // saknade stora muskelgrupper
  const major = ["Chest", "Back", "Legs", "Shoulders"];
  major.forEach(g => { if ((vol[g] || 0) === 0) warnings.push({ type: "missing", level: "warn", msg: `Ingen direkt volym för ${SVG(g)} — överväg att lägga till en övning.` }); });
  // orealistisk volym
  MUSCLE_GROUPS.forEach(g => {
    if (vol[g] > 24) warnings.push({ type: "volume-high", level: "warn", msg: `${SVG(g)}: ${vol[g]} set/vecka är mycket — risk för dålig återhämtning.` });
  });
  if (["Chest", "Back", "Legs"].some(g => vol[g] > 0 && vol[g] < 6)) {
    const low = ["Chest", "Back", "Legs"].filter(g => vol[g] > 0 && vol[g] < 6).map(SVG);
    warnings.push({ type: "volume-low", level: "info", msg: `Låg volym för ${low.join(", ")} (<6 set/vecka) — kan räcka för nybörjare, annars öka.` });
  }
  // återhämtningsspridning: samma stora grupp tunga pass på rad
  const wk = program.weekdays || [];
  if (days >= 5 && (program.daysPerWeek || days) >= 6) warnings.push({ type: "recovery", level: "info", msg: `${program.daysPerWeek || days} pass/vecka ställer höga krav på sömn och kost — planera minst en vilodag.` });
  // överlapp: två pass i rad med samma huvudgrupp
  for (let i = 1; i < program.workouts.length; i++) {
    const a = mainGroups(program.workouts[i - 1]), b = mainGroups(program.workouts[i]);
    const shared = a.filter(g => b.includes(g));
    if (shared.length >= 2 && consecutive(wk, i - 1, i)) warnings.push({ type: "overlap", level: "info", msg: `${program.workouts[i - 1].name} och ${program.workouts[i].name} tränar ${shared.map(SVG).join("/")} tätt inpå varandra.` });
  }
  return warnings;
}
function mainGroups(w) { const c = {}; w.exercises.forEach(x => { const e = EXERCISES.find(z => z.id === x.exId); if (e) c[e.group] = (c[e.group] || 0) + x.sets; }); return Object.keys(c).filter(g => c[g] >= 3); }
function consecutive(weekdays, i, j) { if (!weekdays || weekdays.length <= j) return true; const a = WEEKDAYS.indexOf(weekdays[i]), b = WEEKDAYS.indexOf(weekdays[j]); return b - a === 1; }
function SVG(g) { return SV[g] || g; }
export { SVG as groupSv };

// ── Rekommendation: rangordna mallar efter mål, nivå, dagar, utrustning, återhämtning, historik ──
export function recommendPrograms({ goal, level, days, equip, recovery, history, weights } = {}) {
  const lvl = level || (history && history.length >= 30 ? "Advanced" : history && history.length >= 8 ? "Intermediate" : "Novice");
  const scored = ALL_TEMPLATES.map(t => {
    let s = 0;
    if (goal && t.goal === goal) s += 5; else if (goal) s += 0; else s += 2;
    if (t.level === lvl) s += 5;
    // dagar: matcha önskade eller rekommenderade (kurerade mallar saknar FAMILIES-post)
    const fam = FAMILIES[t.family];
    const wantDays = days || (fam ? fam.rec[0] : t.daysPerWeek);
    if (t.daysPerWeek === wantDays) s += 3;
    else s += Math.max(0, 3 - Math.abs(t.daysPerWeek - wantDays));
    // rekommenderad dag-range för familjen
    if (fam && fam.rec.includes(t.daysPerWeek)) s += 2;
    // utrustning: kan alla pass utföras?
    if (equip && equip.length) { const cover = coverage(t, equip); s += cover * 3; }
    // återhämtning låg → föredra färre dagar / lägre nivå
    if (recovery != null) { if (recovery < 55 && t.daysPerWeek <= 3) s += 2; if (recovery < 55 && t.level === "Advanced") s -= 2; if (recovery >= 76 && t.daysPerWeek >= 4) s += 1; }
    // historik → nivåpassning
    if (history) { if (history.length < 8 && t.level !== "Novice") s -= 1; if (history.length >= 30 && t.level === "Novice") s -= 1; }
    // §mål-viktning: sammansatt mål (t.ex. recomp) styr inriktningen bortom en enda etikett
    if (weights) {
      const mus = (weights.muscle || 0) / 100, str = (weights.strength || 0) / 100, fat = (weights.fatloss || 0) / 100, cond = (weights.conditioning || 0) / 100;
      if (t.goal === "Hypertrophy") s += mus * 3;
      if (t.goal === "Strength") s += str * 3;
      if (t.goal === "General") s += (fat + cond) / 2 * 3;
      // fettreducering/kondition gynnas av högre frekvens och helkroppsupplägg
      s += (fat + cond) * Math.max(0, t.daysPerWeek - 3) * 0.5;
      if ((fat + cond) >= 1.2 && t.family === "full_body") s += 1.5;
    }
    return { template: t, score: s, recommended: !!fam && fam.rec.includes(t.daysPerWeek) && t.level === lvl };
  });
  return scored.sort((a, b) => b.score - a.score);
}
function coverage(program, equip) {
  let ok = 0, tot = 0;
  program.workouts.forEach(w => w.exercises.forEach(x => { tot++; const e = EXERCISES.find(z => z.id === x.exId); if (e && equip.includes(e.equipment)) ok++; }));
  return tot ? ok / tot : 1;
}

// ── Nästa pass i ett aktivt program (utifrån historik) → för Training Mode / Calendar ──
export function nextWorkout(program, sessions = []) {
  if (!program || !program.workouts.length) return null;
  const progSessions = (sessions || []).filter(s => s.programId === program.id).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  const last = progSessions[0];
  let idx = 0;
  if (last && last.workoutId) { const li = program.workouts.findIndex(w => w.id === last.workoutId); idx = li >= 0 ? (li + 1) % program.workouts.length : 0; }
  return { workout: program.workouts[idx], index: idx };
}
// Övningsdata för ett pass (för preview / Training Mode-seed)
export function workoutExercises(workout) {
  return (workout.exercises || []).map(x => ({ ...x, exercise: EXERCISES.find(e => e.id === x.exId) })).filter(x => x.exercise);
}

// ── Versionering: tillämpa en liten reversibel ändring, spara föregående version ──
export function applyChange(program, mutate, note) {
  const snap = { version: program.version || 1, workouts: JSON.parse(JSON.stringify(program.workouts)), weekdays: [...(program.weekdays || [])], daysPerWeek: program.daysPerWeek, note: program._lastNote || "Ursprunglig version", at: program.updatedAt || Date.now() };
  const clone = JSON.parse(JSON.stringify({ ...program, history: undefined }));
  mutate(clone);
  const history = [snap, ...(program.history || [])].slice(0, 12);
  return { ...clone, history, version: (program.version || 1) + 1, updatedAt: Date.now(), _lastNote: note };
}
export function restoreVersion(program, idx) {
  const h = (program.history || [])[idx]; if (!h) return program;
  return applyChange(program, c => { c.workouts = JSON.parse(JSON.stringify(h.workouts)); c.weekdays = [...(h.weekdays || [])]; if (h.daysPerWeek) c.daysPerWeek = h.daysPerWeek; }, `Återställd till v${h.version}`);
}
// Alternativa övningar för samma grupp (byte vid utrustning/obehag/preferens)
export function alternativesFor(exId, allowedEquip, limit = 6) {
  const e = EXERCISES.find(x => x.id === exId); if (!e) return [];
  return EXERCISES.filter(x => x.id !== exId && x.group === e.group && (!allowedEquip || !allowedEquip.length || allowedEquip.includes(x.equipment)))
    .sort((a, b) => (isCompound(b) === isCompound(e) ? 1 : 0) - (isCompound(a) === isCompound(e) ? 1 : 0)).slice(0, limit);
}
