// ATLAS MISSION (Målresa) — deterministisk missionsmotor.
// Rena funktioner ovanpå det befintliga målsystemet. Läser mål via goalProgress/daysLeft.
// Ger AI-coachen STRUKTURERAT underlag (observation/hypotes/rekommendation) — hittar aldrig på siffror.
import { goalProgress, daysLeft } from "./index.js";
import { T } from "../data/tokens.js";

// ── Konstanter ──────────────────────────────────────────────────────────────
const MISSION_TYPES = [
  { id: "training", label: "Träningsresa", icon: "dumbbell" },
  { id: "event", label: "Bröllop / event", icon: "gem" },
  { id: "birthday", label: "Födelsedag / ålder", icon: "cake" },
  { id: "race", label: "Lopp / tävling", icon: "flag" },
  { id: "lifestyle", label: "Livsstilsförändring", icon: "sprout" },
  { id: "custom", label: "Eget mål", icon: "target" },
];
const MISSION_TYPE_LABEL = Object.fromEntries(MISSION_TYPES.map(t => [t.id, t.label]));

// Prioritet på kopplade delmål (spec-ordning, hög → låg).
const MISSION_PRIORITIES = ["Avgörande", "Viktigt", "Stödjande", "Extra"];
const PRIO_W = { "Avgörande": 4, "Viktigt": 3, "Stödjande": 2, "Extra": 1 };

// Redigerbara standardfaser. Ny array varje gång så olika målresor inte delar referens.
function newPhases() {
  return [
    { id: "p_now", name: "Nuläge" },
    { id: "p_base", name: "Grundperiod" },
    { id: "p_build", name: "Uppbyggnad" },
    { id: "p_specific", name: "Specifik förberedelse" },
    { id: "p_peak", name: "Toppning" },
    { id: "p_execute", name: "Genomförande" },
    { id: "p_followup", name: "Uppföljning" },
  ];
}

// Analys-statusar (spec). Egna nycklar, svenska etiketter, färger ur temat.
const STATUS_LABEL = {
  otillräcklig_data: "Otillräcklig data",
  inte_påbörjat: "Inte påbörjat",
  före_plan: "Före plan",
  i_fas: "I fas",
  behöver_uppmärksamhet: "Behöver uppmärksamhet",
  efter_plan: "Efter plan",
  pausat: "Pausat",
  slutfört: "Slutfört",
  inga_delmål: "Inga delmål",
  begränsad: "Begränsad datakvalitet",
  tillräcklig: "Tillräcklig datakvalitet",
};
const STATUS_COLOR = {
  otillräcklig_data: T.text.muted,
  inte_påbörjat: T.text.muted,
  före_plan: T.accent.success,
  i_fas: T.accent.success,
  behöver_uppmärksamhet: T.accent.warning,
  efter_plan: T.accent.danger,
  pausat: T.accent.secondary,
  slutfört: T.accent.success,
  inga_delmål: T.text.muted,
  begränsad: T.accent.warning,
  tillräcklig: T.accent.primary,
};
// Hur illa en status är (positivt = kräver uppmärksamhet). Styr veckans fokus.
const STATUS_SEV = { efter_plan: 3, behöver_uppmärksamhet: 2, inte_påbörjat: 1, otillräcklig_data: 0, i_fas: -1, före_plan: -2, slutfört: -3, pausat: 0 };

// ── Fabrik + små hjälpare ────────────────────────────────────────────────────
let _mc = 0;
function newMissionId() { return `mission_${Date.now().toString(36)}_${(_mc++).toString(36)}`; }
function toMs(d) { return d ? new Date(d).getTime() : null; }

function newMission(partial = {}) {
  return {
    id: newMissionId(),
    name: "", description: "", why: "",
    type: "training",
    startDate: null, readyDate: null, endDate: null,
    status: "active",            // active | paused | done (användarens toppstatus)
    priority: "Viktigt",         // målresans egen vikt
    phaseId: "p_now",
    phases: newPhases(),
    weeklyTime: null,            // tillgänglig träningstid (h/vecka)
    constraints: "",             // begränsningar / problemområden
    successDefinition: "",       // personlig definition av lyckad resa
    checkins: [],                // veckoavstämningar
    skillCheckins: [],           // färdighets-check-ins (självrapporterat / tränarrapporterat)
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

// ── Länkning av delmål (utan duplicering: delmål bär missionId) ───────────────
function missionGoals(mission, goals) {
  if (!mission || !Array.isArray(goals)) return [];
  return goals
    .filter(g => g && g.missionId === mission.id)
    .map(g => ({ ...g, missionPriority: g.missionPriority || "Viktigt" }));
}
function standaloneGoals(goals) {
  return (goals || []).filter(g => g && !g.missionId);
}
// Att ta bort en målresa får ALDRIG radera delmålen — bara frikoppla dem.
function unlinkMissionGoals(goals, missionId) {
  return (goals || []).map(g => (g && g.missionId === missionId ? { ...g, missionId: null, missionPriority: null } : g));
}
// Live-mål (weekly/weight/bodyfat) räknas mot härledda värden, precis som i målvyn.
function resolveGoalCurrent(g, ctx = {}) {
  if (!g) return g;
  if (g.live === "weekly" && ctx.weekly != null) return { ...g, current: ctx.weekly };
  if (g.live === "weight" && ctx.bodyweight != null) return { ...g, current: ctx.bodyweight };
  if (g.live === "bodyfat" && ctx.bodyfat != null) return { ...g, current: ctx.bodyfat };
  return g;
}
function liveButUnavailable(g, ctx = {}) {
  if (!g || !g.live) return false;
  if (g.live === "weekly") return ctx.weekly == null;
  if (g.live === "weight") return ctx.bodyweight == null;
  if (g.live === "bodyfat") return ctx.bodyfat == null;
  return false;
}

// ── Tidslinje / faser ────────────────────────────────────────────────────────
function missionTimeline(mission, now = Date.now()) {
  const startMs = toMs(mission && mission.startDate);
  const readyMs = toMs(mission && mission.readyDate);
  const endMs = toMs(mission && mission.endDate);
  const daysToReady = readyMs != null ? Math.round((readyMs - now) / 864e5) : null;
  const daysToEnd = endMs != null ? Math.round((endMs - now) / 864e5) : null;
  const weeksToReady = daysToReady != null ? Math.max(0, Math.round(daysToReady / 7)) : null;
  const pctElapsed = (startMs != null && readyMs != null && readyMs > startMs)
    ? Math.max(0, Math.min(100, Math.round((now - startMs) / (readyMs - startMs) * 100))) : null;
  return { startMs, readyMs, endMs, daysToReady, daysToEnd, weeksToReady, pctElapsed };
}

function currentPhase(mission, now = Date.now()) {
  const phases = (mission && mission.phases) || [];
  if (!phases.length) return null;
  const dated = phases.filter(p => p.startDate || p.endDate);
  if (dated.length) {
    const hit = phases.find(p => {
      const s = toMs(p.startDate), e = toMs(p.endDate);
      if (s == null && e == null) return false;
      if (s != null && now < s) return false;
      if (e != null && now > e) return false;
      return true;
    });
    if (hit) return { phase: hit, index: phases.indexOf(hit) };
  }
  if (mission.phaseId) { const i = phases.findIndex(p => p.id === mission.phaseId); if (i >= 0) return { phase: phases[i], index: i }; }
  return { phase: phases[0], index: 0 };
}

// ── Status per delområde (real progress vs. real förfluten tid — ingen påhittad %) ─
function goalAreaStatus(goal, mission, now = Date.now(), ctx = {}) {
  if (!goal) return "otillräcklig_data";
  if (goal.noSource) return "otillräcklig_data";
  if (liveButUnavailable(goal, ctx)) return "otillräcklig_data";
  const g = resolveGoalCurrent(goal, ctx);
  const actual = goalProgress(g);
  if (actual >= 100) return "slutfört";
  const startMs = toMs(mission && mission.startDate);
  const endMs = toMs(g.deadline) || toMs(mission && mission.readyDate) || toMs(mission && mission.endDate);
  if (startMs == null || endMs == null || endMs <= startMs) {
    return actual <= 0 ? "inte_påbörjat" : "i_fas";     // utan tidsankare kan takten inte bedömas
  }
  const frac = Math.max(0, Math.min(1, (now - startMs) / (endMs - startMs)));
  const expected = Math.round(frac * 100);
  if (actual <= 0 && expected < 25) return "inte_påbörjat";   // 0 % progress tidigt = inte påbörjat, inte "efter plan"
  if (actual >= expected + 12) return "före_plan";
  if (actual >= expected - 12) return "i_fas";
  if (actual >= expected - 30) return "behöver_uppmärksamhet";
  return "efter_plan";
}

function goalAreaReport(goal, mission, now = Date.now(), ctx = {}) {
  const g = resolveGoalCurrent(goal, ctx);
  const status = goalAreaStatus(goal, mission, now, ctx);
  const startMs = toMs(mission && mission.startDate);
  const endMs = toMs(g.deadline) || toMs(mission && mission.readyDate) || toMs(mission && mission.endDate);
  let expected = null;
  if (startMs != null && endMs != null && endMs > startMs) expected = Math.round(Math.max(0, Math.min(1, (now - startMs) / (endMs - startMs))) * 100);
  const actual = (goal.noSource || liveButUnavailable(goal, ctx)) ? null : goalProgress(g);
  return {
    goal, status,
    priority: goal.missionPriority || "Viktigt",
    actual, expected,
    daysLeft: daysLeft(goal.deadline),
    measured: goal.live ? "auto" : "manual",
  };
}

// ── Veckans fokus: värst liggande, tyngst prioriterade område ─────────────────
function pickFocus(reports) {
  const judge = reports.filter(r => r.status !== "otillräcklig_data");
  if (!judge.length) return null;
  const sorted = [...judge].sort((a, b) =>
    (STATUS_SEV[b.status] - STATUS_SEV[a.status]) ||
    (PRIO_W[b.priority] - PRIO_W[a.priority]) ||
    ((a.daysLeft == null ? 1e9 : a.daysLeft) - (b.daysLeft == null ? 1e9 : b.daysLeft))
  );
  const top = sorted[0];
  const needsWork = STATUS_SEV[top.status] > 0;
  return {
    goal: top.goal, priority: top.priority, status: top.status, needsWork,
    reason: needsWork
      ? `${top.goal.title} ligger "${STATUS_LABEL[top.status].toLowerCase()}" och är prioriterat som ${top.priority.toLowerCase()}.`
      : `${top.goal.title} ligger i fas — håll kursen.`,
  };
}

// ── Rimlig arbetsbörda mot tillgänglig tid ────────────────────────────────────
function loadReasonable(mission, linked) {
  const crit = linked.filter(g => (g.missionPriority || "Viktigt") === "Avgörande").length;
  const high = linked.filter(g => ["Avgörande", "Viktigt"].includes(g.missionPriority || "Viktigt")).length;
  const wt = mission && typeof mission.weeklyTime === "number" ? mission.weeklyTime : null;
  if (wt != null) {
    const cap = Math.max(2, Math.round(wt / 2));
    if (crit > cap || high > wt) return { ok: false, crit, high, weeklyTime: wt, note: `${crit} avgörande och ${high} högt prioriterade delmål mot ~${wt} h/vecka kan bli mycket att driva parallellt.` };
    return { ok: true, crit, high, weeklyTime: wt };
  }
  if (crit >= 5) return { ok: false, crit, high, weeklyTime: null, note: `${crit} avgörande delmål samtidigt är många att hålla i fas parallellt.` };
  return { ok: true, crit, high, weeklyTime: null };
}

// ── Målkonflikter (HYPOTESER, inte bevis — coachen förklarar och frågar) ──────
function detectMissionConflicts(mission, linked, ctx = {}) {
  const out = [];
  const constraints = ((mission && mission.constraints) || "").toLowerCase();
  const titleRe = re => linked.find(g => re.test((g.title || "").toLowerCase()));
  const skillPresent = !!(mission && (mission.skillCheckins || []).length) ||
    (mission && ["training", "race"].includes(mission.type)) ||
    !!titleRe(/box|thai|kamp|sparr|rond|teknik|kondition|löp|spring/);
  // meningsfullt kaloriunderskott = viktmål nedåt med marginal
  const cut = linked.find(g => (g.cat === "Kropp" || g.live === "weight") && g.higher === false && (g.start - g.target) >= 2);
  const runGoal = titleRe(/löp|spring|kondition|steg|distans/);
  const calf = /vad|vader|vadmusk|calf|hälsen|akilles|smärta i ben/.test(constraints);
  const strengthGoals = linked.filter(g => /1rm|styrka|press|böj|mark|lyft/.test((g.title || "").toLowerCase()) || g.cat === "Styrka");
  const freqGoal = linked.find(g => g.live === "weekly" || /pass|rond|gång|tillfäll/.test((g.title || "").toLowerCase()));
  const isCrit = g => (g && (g.missionPriority || "Viktigt") === "Avgörande");

  if (cut && skillPresent) out.push({
    id: "cut_vs_skill", kind: "recovery_quality", tone: "warning", area: cut.title,
    hypothesis: "Ett stort kaloriunderskott kan sänka kvaliteten i den sportspecifika träningen.",
    explain: `Du siktar på att gå ner från ${cut.start} till ${cut.target} ${cut.unit || ""} samtidigt som teknik/kondition ska hålla hög kvalitet. Ett för aggressivt underskott brukar märkas först i explosivitet och fokus.`,
    question: "Vill du prioritera viktnedgången eller kvaliteten i passen just nu?",
  });
  if (runGoal && calf) out.push({
    id: "run_vs_calf", kind: "load_constraint", tone: "warning", area: runGoal.title,
    hypothesis: "Ökad löpning kan krocka med de vadbesvär du angett som begränsning.",
    explain: `Du har angett vadbesvär som problemområde, och ${runGoal.title.toLowerCase()} ökar belastningen just där. Detta är din egen notering — inte en medicinsk bedömning.`,
    question: "Vill du trappa upp löpningen försiktigare, eller hålla nuvarande plan och följa hur vaderna känns?",
  });
  if (strengthGoals.length >= 2 && skillPresent) out.push({
    id: "volume_vs_sport", kind: "recovery_quality", tone: "warning", area: "Styrka vs. sport",
    hypothesis: "Hög styrke-/volymträning kan konkurrera med återhämtningen för sporten.",
    explain: `${strengthGoals.length} styrkeinriktade delmål plus sportspecifik träning drar på samma återhämtning. Det behöver inte vara ett problem, men det är värt att hålla ögonen på.`,
    question: "Ska styrkan vara stödjande under den här perioden, eller lika prioriterad som sporten?",
  });
  if (freqGoal && strengthGoals.length && isCrit(freqGoal) && strengthGoals.some(isCrit)) out.push({
    id: "freq_vs_maxstrength", kind: "priority", tone: "primary", area: "Frekvens vs. maxstyrka",
    hypothesis: "Fler sportpass och maximal styrkeutveckling som båda är avgörande kan konkurrera om tid och energi.",
    explain: `Både "${freqGoal.title}" och styrkemålen är satta som avgörande. Att maxa båda samtidigt är svårt — oftast får det ena vara stödjande.`,
    question: "Vilket väger tyngst just nu — sportfrekvensen eller maxstyrkan?",
  });
  const load = loadReasonable(mission, linked);
  if (!load.ok) out.push({
    id: "too_many_priorities", kind: "capacity", tone: "warning", area: "Prioritering",
    hypothesis: "Antalet högt prioriterade delmål kan vara för många för tillgänglig tid.",
    explain: load.note,
    question: "Vill du sänka något delmål till stödjande, eller utöka tiden per vecka?",
  });
  return out;
}

// ── Övergripande missionsstatus ──────────────────────────────────────────────
function missionStatus(mission, reports, now = Date.now()) {
  if (mission && mission.status === "paused") return "pausat";
  const endMs = toMs(mission && mission.endDate);
  const crit = reports.filter(r => r.priority === "Avgörande");
  if ((endMs != null && now > endMs) || (crit.length && crit.every(r => r.status === "slutfört"))) return "slutfört";
  const judge = reports.filter(r => r.status !== "otillräcklig_data");
  if (!reports.length) return "inte_påbörjat";
  if (!judge.length) return "otillräcklig_data";
  const critJudge = crit.filter(r => r.status !== "otillräcklig_data");
  const pool = critJudge.length ? critJudge : judge;
  if (pool.some(r => r.status === "efter_plan")) return "efter_plan";
  if (pool.some(r => r.status === "behöver_uppmärksamhet")) return "behöver_uppmärksamhet";
  if (pool.every(r => r.status === "inte_påbörjat")) return "inte_påbörjat";
  if (pool.some(r => r.status === "före_plan") && pool.every(r => ["före_plan", "slutfört", "i_fas"].includes(r.status))) return "före_plan";
  return "i_fas";
}

// ── Full analys ───────────────────────────────────────────────────────────────
function missionAnalysis(mission, goals, ctx = {}, now = Date.now()) {
  const linked = missionGoals(mission, goals);
  const reports = linked.map(g => goalAreaReport(g, mission, now, ctx));
  const judge = reports.filter(r => r.status !== "otillräcklig_data");
  const crit = reports.filter(r => r.priority === "Avgörande" && r.status !== "otillräcklig_data");
  const criticalOnTrack = crit.length
    ? { onTrack: crit.filter(r => ["i_fas", "före_plan", "slutfört"].includes(r.status)).length, total: crit.length }
    : null;
  const dataQuality = !linked.length ? "inga_delmål"
    : (judge.length === 0 ? "otillräcklig_data"
      : (judge.length < Math.max(1, Math.ceil(linked.length / 2)) ? "begränsad" : "tillräcklig"));
  return {
    mission, linked, reports, judge,
    timeline: missionTimeline(mission, now),
    phase: currentPhase(mission, now),
    criticalOnTrack,
    focus: pickFocus(reports),
    load: loadReasonable(mission, linked),
    conflicts: detectMissionConflicts(mission, linked, ctx),
    status: missionStatus(mission, reports, now),
    dataQuality,
  };
}

// ── Välj primär målresa (för dashboard-kort + coach) ─────────────────────────
function primaryMission(missions, now = Date.now()) {
  const list = (missions || []).filter(m => m && m.status !== "done");
  if (!list.length) return null;
  const active = list.filter(m => m.status !== "paused");
  const pool = active.length ? active : list;
  const withReady = pool.filter(m => m.readyDate);
  if (withReady.length) return [...withReady].sort((a, b) => new Date(a.readyDate) - new Date(b.readyDate))[0];
  return pool[0];
}

// ── Föreslaget upplägg: deterministiskt utifrån målresa + delmål (fas, tid, prioritet, begränsningar) ──
// Ingen falsk precision: fördelar FOKUS/pass på områdesnivå, hittar inte på övningar/vikter.
const _PHASE_EMPHASIS = {
  "Nuläge": "Kartlägg utgångsläget och etablera vanor.",
  "Grundperiod": "Bygg grund — volym och kondition, teknik före tyngd.",
  "Uppbyggnad": "Öka belastningen stegvis på de avgörande områdena.",
  "Specifik förberedelse": "Skifta mot det sportspecifika; behåll styrkan men sänk volymen något.",
  "Toppning": "Vässa formen — lägre volym, högre kvalitet, mer återhämtning.",
  "Genomförande": "Underhåll och håll dig skadefri — prestera, bygg inte nytt.",
  "Uppföljning": "Utvärdera och återhämta; planera nästa steg.",
};
const _isSporty = g => /box|thai|kamp|sparr|rond|teknik|löp|spring|kondition|distans|pass|steg/i.test((g && g.title || "") + " " + (g && g.cat || ""));
// Fasfaktor: mild justering (0.85–1.25) så prioritet fortfarande dominerar.
function phaseFactor(phaseName, goal) {
  const early = ["Nuläge", "Grundperiod", "Uppbyggnad"].includes(phaseName);
  const late = ["Specifik förberedelse", "Toppning", "Genomförande"].includes(phaseName);
  const cat = goal && goal.cat;
  if (early) { if (cat === "Styrka" || cat === "Kondition") return 1.15; return 1.0; }
  if (late) { if (_isSporty(goal)) return 1.25; if (cat === "Kropp") return 0.85; if (cat === "Styrka") return 0.9; return 1.0; }
  return 1.0;
}
function missionPlan(analysis) {
  if (!analysis || !analysis.mission || !analysis.reports.length) return null;
  const { mission, reports, phase } = analysis;
  const phaseName = phase && phase.phase ? phase.phase.name : null;

  // Volym: pass/vecka ur ett frekvensmål, annars ur veckotid (~1,25h/pass), annars okänt.
  const freqGoal = reports.map(r => r.goal).find(g => g.live === "weekly" || /pass|gång|tillfäll/i.test(g.title || ""));
  const weeklyTime = typeof mission.weeklyTime === "number" ? mission.weeklyTime : null;
  let sessions = null, sessionsFrom = null;
  if (freqGoal && typeof freqGoal.target === "number" && freqGoal.target > 0) { sessions = freqGoal.target; sessionsFrom = "goal"; }
  else if (weeklyTime != null && weeklyTime > 0) { sessions = Math.max(2, Math.min(7, Math.round(weeklyTime / 1.25))); sessionsFrom = "time"; }

  // Fördela fokus på delområden (exkl. frekvens-styrmålet och otillräcklig data), viktat på prioritet × fas.
  const areas = reports
    .filter(r => (!freqGoal || r.goal.id !== freqGoal.id) && r.status !== "otillräcklig_data")
    .map(r => ({ title: r.goal.title, priority: r.priority, status: r.status, w: PRIO_W[r.priority] * phaseFactor(phaseName, r.goal) }));
  const totalW = areas.reduce((a, r) => a + r.w, 0) || 1;
  const blocks = areas.map(r => {
    const share = r.w / totalW;
    let s = sessions != null ? Math.round(share * sessions) : null;
    if (s != null && r.priority === "Avgörande") s = Math.max(1, s);   // avgörande får minst ett pass
    return { title: r.title, priority: r.priority, status: r.status, share: Math.round(share * 100), sessions: s };
  }).sort((a, b) => b.share - a.share).slice(0, 5);

  // Hänsyn ur begränsningar — användarens egna noteringar, ingen medicinsk bedömning.
  const cautions = [];
  const c = (mission.constraints || "").toLowerCase();
  if (/vad|akilles|hälsen|calf/.test(c) && areas.some(a => /löp|spring|kondition|steg|distans/i.test(a.title))) cautions.push("Trappa upp löpning/kondition försiktigt — du har angett vadbesvär som begränsning.");
  if (/tid|hinner|stress|jobb/.test(c)) cautions.push("Snäva veckor: prioritera de avgörande passen, låt stödjande vila.");

  // Nästa fas
  const idx = phase ? phase.index : -1;
  const phases = mission.phases || [];
  const next = idx >= 0 && idx + 1 < phases.length ? phases[idx + 1] : null;

  return {
    phaseName,
    emphasis: phaseName ? (_PHASE_EMPHASIS[phaseName] || null) : null,
    sessions, sessionsFrom, weeklyTime,
    blocks,
    cautions,
    nextPhase: next ? { name: next.name, note: _PHASE_EMPHASIS[next.name] || null } : null,
  };
}


// Frågar innan förändring; skiljer fakta från gissning. Ingen falsk totalprocent.
function missionCoachSummary(analysis) {
  if (!analysis || !analysis.mission) return null;
  const { mission, timeline, phase, criticalOnTrack, focus, conflicts, dataQuality, status } = analysis;
  const observation = [];
  if (timeline.weeksToReady != null) observation.push(`${timeline.weeksToReady} ${timeline.weeksToReady === 1 ? "vecka" : "veckor"} kvar till ${mission.name || "målet"}.`);
  if (phase && phase.phase) observation.push(`Aktuell fas: ${phase.phase.name}.`);
  if (criticalOnTrack) observation.push(`${criticalOnTrack.onTrack} av ${criticalOnTrack.total} avgörande områden ligger i fas.`);
  if (dataQuality === "otillräcklig_data") observation.push("Underlaget är än så länge för tunt för säkra slutsatser.");
  else if (dataQuality === "begränsad") observation.push("Underlaget är begränsat — läs siffrorna som riktning, inte facit.");

  const hypotheses = conflicts.map(c => ({ text: c.hypothesis, explain: c.explain, question: c.question }));

  let recommendation = null, question = null;
  if (focus) {
    recommendation = focus.needsWork
      ? `Jag föreslår att du prioriterar ${focus.goal.title.toLowerCase()} den här veckan.`
      : `Håll nuvarande upplägg — ${focus.goal.title.toLowerCase()} ligger i fas.`;
    question = "Hur känns den prioriteringen?";
  }
  return { title: mission.name || "Målresa", status, observation, hypotheses, recommendation, question, plan: missionPlan(analysis) };
}

export {
  MISSION_TYPES, MISSION_TYPE_LABEL, MISSION_PRIORITIES, PRIO_W,
  STATUS_LABEL, STATUS_COLOR, STATUS_SEV,
  newPhases, newMission, newMissionId,
  missionGoals, standaloneGoals, unlinkMissionGoals, resolveGoalCurrent,
  missionTimeline, currentPhase,
  goalAreaStatus, goalAreaReport, pickFocus, loadReasonable,
  detectMissionConflicts, missionStatus, missionAnalysis,
  primaryMission, missionCoachSummary, missionPlan,
};
