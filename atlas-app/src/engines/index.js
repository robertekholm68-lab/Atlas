// ATLAS BERÄKNINGSMOTORER — rena funktioner, oberoende av rendering
import { ADAPTIVE_EXERCISES, MODE_WEIGHTS } from "../data/coach.js";
import { BODYWEIGHT, EXERCISES, HIIT_MULT, HIIT_MUSCLE_MULT, MAIN_LIFTS, STRENGTH_STD } from "../data/exercises.js";
import { FOOD_DB, FOOD_INDEX, FOOD_KB, FOOD_SYN, NUTRITION_GOALS, PORTIONS } from "../data/foods.js";
import { ACT_RANK, BODY_ZONES, GROUP_SOURCES, GROUP_SV, MUSCLES, SLUG2ID, VOLUME_LANDMARKS } from "../data/muscles.js";
import { H, T, now } from "../data/tokens.js";

function computeSessionLoad(sets, exercises, bodyweight = BODYWEIGHT) {
  const loads = {};
  sets.forEach(set => {
    const ex = exercises.find(e => e.id === set.exerciseId);
    if (!ex) return;
    let baseLoad = 0;
    if (ex.loadMode === "external") baseLoad = (set.weight || 0) * set.reps;
    else if (ex.loadMode === "bodyweight") baseLoad = (bodyweight || BODYWEIGHT) * (ex.bwFraction || 0.9) * set.reps;
    else if (ex.loadMode === "time") baseLoad = (set.duration || 0) * (ex.intensityFactor || 2);
    const rpe = set.rpe ? set.rpe / 10 : 0.8;
    ex.activation.forEach(({ muscleId, factor }) => {
      loads[muscleId] = (loads[muscleId] || 0) + baseLoad * factor * rpe;
    });
  });
  return loads;
}

function computeRecovery(sessions, muscleId, nowMs) {
  const halfLifeHours = MUSCLES[muscleId].halfLife;
  const lookbackMs = 14 * 24 * 3600 * 1000;
  let remaining = 0;
  sessions.forEach(s => {
    if (nowMs - s.completedAt > lookbackMs) return;
    const load = s.muscleLoads[muscleId] || 0;
    if (load === 0) return;
    remaining += (load / 35) * Math.exp(-((nowMs - s.completedAt) / 3600000) / halfLifeHours);
  });
  const recoveryScore = Math.max(0, Math.min(100, 100 - remaining));
  const trained = sessions.some(s => s.muscleLoads[muscleId]);
  let status = "no_data";
  const lastSession = [...sessions].sort((a, b) => b.completedAt - a.completedAt).find(s => s.muscleLoads[muscleId] > 0);
  const daysSince = lastSession ? (nowMs - lastSession.completedAt) / 86400000 : 999;
  if (trained) {
    if (recoveryScore <= 30) status = "critical";
    else if (recoveryScore <= 55) status = "recovering";
    else if (recoveryScore <= 75) status = "nearly_ready";
    else status = "ready";
    if (daysSince >= 7 && recoveryScore >= 90) status = "undertrained";   // trained but idle & fully recovered → needs re-stimulus
  }
  // never trained → stays "no_data" (grey), no colour
  return { recoveryScore: Math.round(recoveryScore), status, lastTrainedAt: lastSession?.completedAt || null, daysSince };
}

function muscleWeeklySets(sessions, muscleId, now) {
  let n = 0;
  sessions.forEach(s => { if (now - s.completedAt < 7 * 864e5) (s.sets || []).forEach(set => { const ex = EXERCISES.find(e => e.id === set.exerciseId); if (ex && ((ex.activation.find(a => a.muscleId === muscleId) || {}).factor || 0) >= 0.5) n++; }); });
  return n;
}

function recoveryContributions(sessions, muscleId, now) {
  return sessions.filter(s => now - s.completedAt < 14 * 864e5 && (s.muscleLoads || {})[muscleId] > 0)
    .map(s => ({ load: Math.round(s.muscleLoads[muscleId]), days: Math.max(0, Math.round((now - s.completedAt) / 864e5)), title: s.title, sport: !!s.sport,
      sets: (s.sets || []).filter(x => { const ex = EXERCISES.find(e => e.id === x.exerciseId); return ex && ((ex.activation.find(a => a.muscleId === muscleId) || {}).factor || 0) >= 0.5; }).length }))
    .sort((a, b) => a.days - b.days);
}

function volumeStatus(sets, group) {
  const lm = VOLUME_LANDMARKS[group]; if (!lm) return null;
  let label, col;
  if (sets < lm.mev) { label = `under MEV (${lm.mev})`; col = "#5E6673"; }
  else if (sets < lm.mav[0]) { label = "nära optimalt"; col = "#39D98A"; }
  else if (sets <= lm.mav[1]) { label = "optimal volym"; col = "#39D98A"; }
  else if (sets <= lm.mrv) { label = "hög volym"; col = "#FFD166"; }
  else { label = `över MRV (${lm.mrv})`; col = "#FF5C5C"; }
  return { label, col, lm };
}

function groupWeeklySets(sessions, group, now) {
  let n = 0;
  sessions.forEach(s => { if (now - s.completedAt < 7 * 864e5) (s.sets || []).forEach(set => { const ex = EXERCISES.find(e => e.id === set.exerciseId); if (ex && ex.activation.some(a => a.factor >= 0.5 && MUSCLES[a.muscleId] && MUSCLES[a.muscleId].group === group)) n++; }); });
  return n;
}

// "Släpande muskel"-rådgivare: kopplar musklens/gruppens faktiska volym (mot MEV/MAV/MRV)
// och frekvens till evidensnära tips när något inte svarar som man vill.
function laggingMuscleAdvice(sessions, muscleId, now = Date.now()) {
  const mus = MUSCLES[muscleId];
  const group = mus ? mus.group : muscleId;                 // acceptera muskel- eller grupp-id
  const groupSv = GROUP_SV[group] || (mus && mus.name) || "muskeln";
  const sets = groupWeeklySets(sessions || [], group, now);
  const lm = VOLUME_LANDMARKS[group];
  const vs = volumeStatus(sets, group);
  const days = new Set();
  (sessions || []).forEach(s => {
    if (now - s.completedAt >= 7 * 864e5) return;
    const hit = (s.sets || []).some(set => { const ex = EXERCISES.find(e => e.id === set.exerciseId); return ex && ex.activation.some(a => a.factor >= 0.5 && MUSCLES[a.muscleId] && MUSCLES[a.muscleId].group === group); });
    if (hit) days.add(startOfLocalDay(s.completedAt));
  });
  const freq = days.size;
  const tips = [];
  if (lm && sets < lm.mev) tips.push(`Volymen är låg — ~${sets} set/vecka ligger under minsta effektiva volym (~${lm.mev}). Lägg till 3–5 hårda set i veckan och bygg gradvis uppåt.`);
  else if (lm && sets > lm.mrv) tips.push(`Du kör hög volym (~${sets} set/vecka, över taket ~${lm.mrv}). Mer är inte alltid bättre — testa en lättare vecka (deload) och se om ${groupSv.toLowerCase()} svarar bättre utvilad.`);
  else tips.push(`Volymen ser rimlig ut (~${sets} set/vecka${vs ? `, ${vs.label}` : ""}). Då sitter nyckeln oftare i frekvens, närhet till failure och progression än i ännu mer volym.`);
  if (freq <= 1) tips.push("Dela upp volymen på 2 pass i veckan i stället för allt på ett — samma mängd, oftare stimulans, ger ofta bättre svar.");
  tips.push("Prioritera den när du är fräsch: lägg övningen först i passet, inte sist när du är trött.");
  tips.push("Träna nära failure (1–3 reps kvar i tanken) och lägg till lite vikt eller reps över tid — progressiv överbelastning är motorn.");
  tips.push("Har du kört samma övning länge? Byt vinkel eller variant, och använd fullt rörelseomfång med kontrollerad excentrik och fokus på just den muskeln.");
  tips.push("Grunden avgör: tillräckligt protein, sömn och energi — muskeln byggs på vilan, inte bara på passet.");
  return `${groupSv} svarar inte som du vill? Så här skulle jag angripa det:\n\n` + tips.map(x => "• " + x).join("\n") + "\n\nGe en förändring 6–8 veckor innan du dömer ut den — muskeltillväxt är långsam.";
}

// Proaktiv upptäckt av underarbetade grupper: bara för aktiva användare, snitt över 2 veckor
// under MEV, och bara grupper som faktiskt ingår i rutinen (tränade senaste 30 dagarna).
function laggingGroups(sessions, now = Date.now()) {
  const active = (sessions || []).filter(s => now - s.completedAt < 21 * 864e5).length;
  if (active < 4) return [];                                  // för lite underlag för att uttala sig
  const out = [];
  Object.keys(VOLUME_LANDMARKS).forEach(group => {
    const lm = VOLUME_LANDMARKS[group];
    let sets14 = 0, trained30 = false;
    (sessions || []).forEach(s => {
      const age = now - s.completedAt; if (age >= 30 * 864e5) return;
      const hit = (s.sets || []).filter(set => { const ex = EXERCISES.find(e => e.id === set.exerciseId); return ex && ex.activation.some(a => a.factor >= 0.5 && MUSCLES[a.muscleId] && MUSCLES[a.muscleId].group === group); }).length;
      if (hit > 0) { trained30 = true; if (age < 14 * 864e5) sets14 += hit; }
    });
    const avgWeekly = sets14 / 2;
    if (trained30 && avgWeekly < lm.mev) out.push({ group, groupSv: GROUP_SV[group], avgWeekly: Math.round(avgWeekly), mev: lm.mev, gap: lm.mev - avgWeekly });
  });
  return out.sort((a, b) => b.gap - a.gap).slice(0, 2);
}

// Balansmätare: poängsätter fyra pelare (träning, återhämtning, kost, vila) och belönar
// JÄMNHET — det samlade värdet dras ned av obalans, så systemet gynnar en balanserad helhet
// och lyfter den svagaste länken. Pelare utan underlag blir null (ärligt, ingen fejkad poäng).
// Variationsrådgivare: mäter faktisk variation i loggen (övningar, rörelsemönster,
// repsintervall, bas/isolation, progression) och ger evidensnära tips.
// Grund: variation + progression stimulerar tillväxt, hypertrofi sker regionspecifikt
// (olika vinklar träffar olika delar), bas- och isolationsövningar kompletterar varandra,
// och FYSS lyfter att intensitet, vila och tempo kan varieras med goda resultat.
function variationAdvice(sessions, now = Date.now()) {
  const recent = (sessions || []).filter(s => now - s.completedAt < 56 * 864e5); // 8 veckor
  const allSets = recent.flatMap(s => s.sets || []);
  if (recent.length < 3 || allSets.length < 8) return { hasData: false, tips: [] };
  const tips = [];
  // 1) Övnings- och vinkelvariation per muskelgrupp
  const byGroup = {};
  allSets.forEach(set => {
    const ex = EXERCISES.find(e => e.id === set.exerciseId); if (!ex) return;
    const g = ex.group || "Övrigt";
    byGroup[g] = byGroup[g] || { ex: new Set(), pat: new Set(), sets: 0, iso: 0 };
    byGroup[g].ex.add(ex.id); byGroup[g].pat.add(ex.pattern || ex.id);
    byGroup[g].sets++;
    if ((ex.activation || []).filter(a => a.factor >= 0.5).length <= 1) byGroup[g].iso++;
  });
  const monotone = Object.entries(byGroup).filter(([, v]) => v.sets >= 8 && v.ex.size === 1).map(([g]) => g);
  if (monotone.length) tips.push(`Du kör bara en enda övning för ${monotone.slice(0, 2).join(" och ")}. Muskeltillväxt sker regionspecifikt — olika vinklar och rörelsemönster träffar olika delar av muskeln. Lägg till en variant (t.ex. lutande, sittande eller ett annat grepp) så täcker du hela muskeln.`);
  const fewAngles = Object.entries(byGroup).filter(([, v]) => v.sets >= 10 && v.ex.size >= 2 && v.pat.size === 1).map(([g]) => g);
  if (fewAngles.length && !monotone.length) tips.push(`För ${fewAngles[0]} kör du flera övningar men i samma rörelsemönster. Variera vinkeln (t.ex. lutande/nedåtlutande, smalt/brett grepp) för att träffa muskeln från fler håll.`);
  // 2) Bas + isolation
  const noIso = Object.entries(byGroup).filter(([, v]) => v.sets >= 10 && v.iso === 0).map(([g]) => g);
  if (noIso.length) tips.push(`${noIso[0]} tränas bara med flerledsövningar. Basövningar räcker långt för styrka, men isolationsövningar ger ett tillskott för hypertrofi — särskilt när du tränat ett tag och volymen är hög.`);
  // 3) Repsintervall
  const withReps = allSets.filter(s => typeof s.reps === "number" && s.reps > 0);
  if (withReps.length >= 10) {
    const band = r => r <= 5 ? "tungt" : r <= 12 ? "medel" : "lätt";
    const counts = {}; withReps.forEach(s => { const b = band(s.reps); counts[b] = (counts[b] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] / withReps.length > 0.9) {
      const t = top[0];
      tips.push(t === "tungt"
        ? "Nästan all din träning ligger i tunga låga reps (≤5). Tyngre vikter är bäst för maxstyrka, men lägg in set i 6–12 för mer volym och tillväxt utan att slita lika hårt på leder och nervsystem."
        : t === "lätt"
          ? "Nästan all din träning ligger på höga reps (15+). Det fungerar för tillväxt om du går nära failure, men lägg in tyngre set (6–12) — det finns god evidens för att tyngre vikter är att föredra för styrka."
          : "Du kör nästan uteslutande i 6–12-intervallet. Det är ett bra hypertrofispann, men FYSS lyfter att variation i intensitet, vilotid och tempo fungerar väl — prova några tyngre set (3–5) för styrka eller högreps som avslutning.");
    }
  }
  // 4) Progression — samma vikt på samma övning över tid
  const byEx = {};
  recent.forEach(s => (s.sets || []).forEach(set => {
    if (typeof set.weight !== "number" || !set.weight) return;
    byEx[set.exerciseId] = byEx[set.exerciseId] || [];
    byEx[set.exerciseId].push({ ts: s.completedAt, w: set.weight });
  }));
  const stale = Object.entries(byEx).filter(([, arr]) => {
    if (arr.length < 6) return false;
    const sorted = arr.slice().sort((a, b) => a.ts - b.ts);
    const span = sorted[sorted.length - 1].ts - sorted[0].ts;
    if (span < 28 * 864e5) return false;                       // minst 4 veckors spann
    return Math.max(...sorted.map(x => x.w)) <= Math.min(...sorted.map(x => x.w)) * 1.02;
  }).map(([id]) => { const ex = EXERCISES.find(e => e.id === id); return ex ? ex.name : id; });
  if (stale.length) tips.push(`Samma vikt i ${stale[0]} i över en månad. Progressiv överbelastning är motorn — lägg till lite vikt eller en rep, eller byt variant för ny stimulans.`);
  if (!tips.length) tips.push("Din träning ser varierad ut — flera övningar, olika vinklar och progression i vikterna. Håll i det, och byt inte i onödan: att köra en övning tillräckligt länge för att bli bra på den är också en fördel.");
  return { hasData: true, tips, groups: Object.keys(byGroup).length };
}

function balanceScore({ overallReadiness, sessions, foodLog, nutritionTargets, systemicRecovery, now = Date.now() } = {}) {
  const s = sessions || [];
  const recent = s.filter(x => now - x.completedAt < 7 * 864e5);
  // TRÄNING — frekvens + andel grupper i rimlig volym
  let training = null;
  if (s.filter(x => now - x.completedAt < 14 * 864e5).length > 0) {
    const freq = recent.length;
    const freqScore = freq === 0 ? 20 : freq === 1 ? 45 : freq === 2 ? 72 : freq <= 5 ? 100 : 85;
    let inRange = 0, tot = 0;
    Object.keys(VOLUME_LANDMARKS).forEach(g => { const sets = groupWeeklySets(s, g, now); if (sets > 0) { tot++; const lm = VOLUME_LANDMARKS[g]; if (sets >= lm.mev && sets <= lm.mrv) inRange++; } });
    const volScore = tot ? Math.round(inRange / tot * 100) : freqScore;
    training = Math.round(freqScore * 0.55 + volScore * 0.45);
  }
  // ÅTERHÄMTNING
  const recovery = (typeof overallReadiness === "number") ? overallReadiness : null;
  // KOST — protein + energi mot mål (senaste loggade dagarna)
  let nutrition = null;
  const rn = recentDailyNutrition(foodLog);
  if (rn._days >= 1 && nutritionTargets && nutritionTargets.protein) {
    const pPct = Math.min(1, rn.protein / nutritionTargets.protein);
    let eScore = 100;
    if (nutritionTargets.kcal) { const ratio = rn.kcal / nutritionTargets.kcal; eScore = (ratio >= 0.85 && ratio <= 1.15) ? 100 : ratio < 0.85 ? Math.max(40, Math.round(ratio / 0.85 * 100)) : Math.max(60, Math.round((2 - ratio) * 100)); }
    nutrition = Math.round(pPct * 100 * 0.6 + eScore * 0.4);
  }
  // VILA — låg systemisk fatigue + tillräckligt med vilodagar
  let rest = null;
  if (typeof systemicRecovery === "number") {
    const restDays = 7 - new Set(recent.map(x => startOfLocalDay(x.completedAt))).size;
    const restPenalty = restDays <= 0 ? 25 : restDays === 1 ? 8 : 0;
    rest = Math.max(0, Math.min(100, systemicRecovery - restPenalty));
  }
  const pillars = [
    { key: "training", label: "Träning", score: training, weight: 0.40, low: "Träningen är låg eller ojämn — muskelstärkande träning minst 2 ggr/vecka för kroppens stora muskelgrupper är basrekommendationen (FYSS), och volymen är den starkaste drivkraften för resultat." },
    { key: "recovery", label: "Återhämtning", score: recovery, weight: 0.25, low: "Återhämtningen är låg — prioritera sömn och protein, och ta gärna en lugnare dag." },
    { key: "nutrition", label: "Kost", score: nutrition, weight: 0.20, low: "Kosten släpar efter — logga mer komplett och sikta på proteinmålet." },
    { key: "rest", label: "Vila", score: rest, weight: 0.15, low: "Du vilar för lite — lägg in en vilodag, kroppen byggs på återhämtningen." },
  ];
  const avail = pillars.filter(p => p.score != null);
  if (avail.length < 2) return { pillars, overall: null, weakest: null, hasData: false };
  // Viktat snitt: träningen väger tyngst (0,40) — den är motorn, resten är stödsystem.
  // Vikterna normaliseras över de pelare som faktiskt har underlag.
  const wSum = avail.reduce((a, p) => a + p.weight, 0);
  const weighted = avail.reduce((a, p) => a + p.score * p.weight, 0) / wSum;
  const scores = avail.map(p => p.score);
  const imbalance = Math.max(...scores) - Math.min(...scores);
  // Obalans drar ned, men mildare än tidigare och aldrig när träningen är den starka pelaren:
  // att prioritera träning ska aldrig straffa sig.
  const trainingP = pillars.find(p => p.key === "training");
  const trainingLeads = trainingP.score != null && trainingP.score >= Math.max(...scores) - 5;
  const overall = Math.max(0, Math.min(100, Math.round(weighted - imbalance * (trainingLeads ? 0.12 : 0.22))));
  const weakest = avail.slice().sort((a, b) => a.score - b.score)[0];
  return { pillars, overall, weakest, hasData: true, trainingLeads };
}

function computeReadiness(recoveryScore, weeklyLoad, daysSince) {
  const threshold = 1000;
  const overloadPenalty = weeklyLoad > threshold ? Math.min(20, (weeklyLoad - threshold) / threshold * 20) : 0;
  const undertrain = daysSince >= 5 ? Math.min(10, (daysSince - 4) * 2) : 0;
  return Math.max(0, Math.min(100, recoveryScore - overloadPenalty + undertrain));
}

function computeRecommendation(muscleStates) {
  const candidates = Object.entries(muscleStates)
    .filter(([, s]) => s.recoveryScore > 55)
    .map(([id, s]) => ({ id, score: s.readiness - (s.recentlyTrained ? 10 : 0), weeklyLoad: s.weeklyLoad, name: MUSCLES[id].name, group: MUSCLES[id].group }))
    .sort((a, b) => b.score - a.score || a.weeklyLoad - b.weeklyLoad || a.id.localeCompare(b.id));
  if (!candidates.length) return { title: "Rest & Recover", group: "recovery", summary: "Most muscle groups still carry fatigue. A rest day now sets up a stronger session tomorrow.", targetMuscles: [], actionLabel: "View Recovery", explanation: [{ label: "Recovery state", direction: "decrease", description: "No muscle group is above 55% recovery yet." }] };
  const top = candidates[0];
  const groupLabel = top.group.charAt(0).toUpperCase() + top.group.slice(1);
  return {
    title: `${groupLabel} Strength`, group: top.group,
    summary: `${top.name} is recovered and primed. Your ${top.group} work fits today's load profile — focus on progressive overload.`,
    targetMuscles: [top.id], actionLabel: "Start Workout",
    explanation: [
      { label: "Readiness", direction: "increase", description: `${top.name} is at ${Math.round(top.score)}% readiness — well recovered.` },
      { label: "Training balance", direction: "increase", description: "This group hasn't been overloaded recently, so quality work is available." },
    ],
  };
}

function computeSportLoad(sport, minutes, intMult, hiit) {
  const mm = hiit ? HIIT_MUSCLE_MULT : 1;
  const loads = {};
  sport.activation.forEach(a => { loads[a.muscleId] = Math.round(minutes * 9 * intMult * mm * a.factor); });
  return loads;
}

function computeCardioLoad(sport, minutes, intMult, hiit) {
  return Math.round(minutes * 10 * sport.cardio * intMult * (hiit ? HIIT_MULT : 1));
}

function computeSystemicFatigue(sessions, now) {
  let f = 0;
  sessions.forEach(s => { if (s.cardioLoad && now - s.completedAt < 10 * 864e5) f += (s.cardioLoad / 100) * Math.exp(-((now - s.completedAt) / 36e5) / 30); });
  return f;
}

async function importLivsmedelsverket(onBatch, base = "https://dataportal.livsmedelsverket.se/livsmedel/api/v1") {
  const out = []; let offset = 0, limit = 200, total = Infinity;
  while (offset < total) {
    const r = await fetch(`${base}/livsmedel?offset=${offset}&limit=${limit}&sprak=1`);
    const d = await r.json(); total = (d._meta && d._meta.totalRecords) || 0;
    for (const lm of (d.livsmedel || [])) {
      const nr = lm.nummer || lm.livsmedelsNummer;
      const nv = await (await fetch(`${base}/livsmedel/${nr}/naringsvarden?sprak=1`)).json();
      const pick = namn => { const x = (nv.naringsvarden || nv).find(n => (n.namn || n.euroFIRkod || "").toLowerCase().includes(namn)); return x ? x.varde : 0; };
      out.push({ id: "slv_" + nr, name: lm.namn, group: "Livsmedelsverket", source: "livsmedelsverket", source_id: String(nr), db_version: FOOD_DB.version, ver: "verified",
        kcal: pick("energi"), protein: pick("protein"), carbs: pick("kolhydrat"), fat: pick("fett") });
    }
    if (onBatch) onBatch(out.length, total);
    offset += limit; if (!d.livsmedel || !d.livsmedel.length) break;
  }
  return out;   // → skrivs till FOOD_INDEX i backend/persistens
}

function foldStr(s) { return (s || "").toLowerCase().replace(/[àáâã]/g, "a").replace(/ä/g, "a").replace(/å/g, "a").replace(/ö/g, "o").replace(/[éè]/g, "e").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim(); }

function triSet(s) { s = "  " + s + " "; const t = new Set(); for (let i = 0; i < s.length - 2; i++) t.add(s.slice(i, i + 3)); return t; }

function triSim(a, b) { const A = triSet(a), B = triSet(b); let inter = 0; A.forEach(x => { if (B.has(x)) inter++; }); return inter / (A.size + B.size - inter || 1); }

function editDist(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 9; const m = a.length, n = b.length; let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; } return prev[n];
}

function scoreFood(qf, food, freq) {
  const nf = food._nf || (food._nf = foldStr(food.name)); if (!qf) return 0;
  let s = 0;
  if (nf === qf) s = 1000;
  else if (nf.startsWith(qf)) s = 640 - Math.min(180, nf.length - qf.length);
  else { const words = nf.split(" ");
    if (words.some(w => w.startsWith(qf))) s = 470;
    else if (nf.includes(qf)) s = 360;
    else { // typo / fuzzy per word + whole
      let best = 0; if (qf.length >= 4) words.concat([nf]).forEach(w => { const d = editDist(qf, w.slice(0, qf.length + 2)); if (d <= 2) best = Math.max(best, 300 - d * 70); });
      const sim = triSim(qf, nf); if (sim > 0.3) best = Math.max(best, Math.round(240 * sim));
      s = best;
    }
  }
  if (!s) { const syn = FOOD_SYN[qf]; if (syn && syn.some(t => nf.includes(t))) s = 330; }
  if (!s) return 0;
  s += Math.min(90, (freq[food.id] || 0) * 30);          // user history (rank #2)
  if (food.name.length < 15) s += 18;                     // common/likely (rank #3)
  if (food.source === "livsmedelsverket") s += 4;
  return s;
}

function searchFoods(q, group, history, limit = 50) {
  const qf = foldStr(q); if (!qf) return null;
  const freq = {}; (history || []).forEach(e => { if (e.foodId) freq[e.foodId] = (freq[e.foodId] || 0) + 1; });
  const res = [];
  for (const f of FOOD_INDEX) { if (group && group !== "Alla" && f.group !== group) continue; const s = scoreFood(qf, f, freq); if (s > 0) res.push([s, f]); }
  res.sort((a, b) => b[0] - a[0]);
  return res.slice(0, limit).map(x => x[1]);
}

async function lookupBarcode(code) {
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_sv,brands,nutriments,serving_size,quantity`);
  const d = await r.json();
  if (d.status !== 1 || !d.product) return null;
  const p = d.product, n = p.nutriments || {};
  return {
    code, source: "off", ver: "unverified",
    name: p.product_name_sv || p.product_name || "Okänd produkt",
    brand: (p.brands || "").split(",")[0].trim(),
    serving: p.serving_size || "",
    kcal: Math.round(n["energy-kcal_100g"] || (n["energy_100g"] ? n["energy_100g"] / 4.184 : 0)),
    protein: Math.round((n.proteins_100g || 0) * 10) / 10,
    carbs: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
    fat: Math.round((n.fat_100g || 0) * 10) / 10,
  };
}

function goalProgress(g) {
  const span = g.higher ? g.target - g.start : g.start - g.target;
  const done = g.higher ? g.current - g.start : g.start - g.current;
  if (span <= 0) return g.current >= g.target ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round(done / span * 100)));
}

function daysLeft(deadline) {
  if (!deadline) return null;
  return Math.round((new Date(deadline) - Date.now()) / 86400000);
}

// ── Quick Log-motor (REGELBASERAD prototyp — ingen riktig AI-modell analyserar måltiden) ──
const GENERIC_FOODS = {
  fisk: { q: "Vilken sorts fisk var det?", opts: [["lax", "Lax / fet fisk"], ["torsk", "Torsk / mager vit fisk"], ["panerad fisk", "Panerad/stekt fisk"], ["fiskrätt restaurang", "Fiskrätt på restaurang"], ["__normal", "Vet inte — normal portion"]] },
  kött: { q: "Vilket kött var det?", opts: [["nötkött biff", "Nöt / biff"], ["fläsk", "Fläsk"], ["köttfärs", "Färs"], ["kyckling", "Kyckling"], ["__normal", "Vet inte — normal portion"]] },
  sallad: { q: "Vad var i salladen?", opts: [["kycklingsallad", "Med kyckling"], ["räksallad", "Med skaldjur"], ["ostsallad ägg", "Med ost/ägg"], ["grönsallad", "Mest grönt"], ["__normal", "Vet inte — normal portion"]] },
  soppa: { q: "Vilken sorts soppa?", opts: [["köttsoppa", "Med kött"], ["fisksoppa", "Med fisk"], ["grönsakssoppa", "Grönsaks"], ["__normal", "Vet inte — normal portion"]] },
};
const VAGUE_CAFE = { q: "Vad blev det på fiket?", opts: [["kaffe kanelbulle", "Kaffe + kanelbulle"], ["kaffe kaka", "Kaffe + kaka/cookie"], ["macka kaffe", "Smörgås + kaffe"], ["större cafémål latte", "Större cafémål"], ["__normal", "Vet inte — uppskatta"]] };
const VAGUE_MEAL = { q: "Ungefär hur stor måltid?", opts: [["__small", "Liten måltid"], ["__normal", "Normal måltid"], ["__large", "Stor måltid"]] };
const SPECIFIC_DISHES = ["pizza", "hamburgare", "burger", "köttbull", "kebab", "sushi", "tacos", "lasagne", "gryta", "pannkak", "omelett"];

function mealDecision(text) {
  const t = (text || "").toLowerCase().trim();
  if (!t) return { kind: "unknown", ...VAGUE_MEAL };
  if (/^__(small|normal|large)$/.test(t)) return { kind: "described" };
  const words = t.split(/\s+/).filter(Boolean);
  const kbHits = FOOD_KB.filter(it => it.k.some(kw => t.includes(kw))).length;
  const specific = SPECIFIC_DISHES.some(d => t.includes(d));
  if ((/\bfika\b/.test(t) || ((/\bkaffe\b/.test(t) || /\bcafé\b|\bcafe\b/.test(t)) && (/\bstan\b|\bstad\b|\bute\b/.test(t)))) && !specific) return { kind: "vague", ...VAGUE_CAFE };
  if (words.length <= 2 && /^(lunch|middag|frukost|mellanmål|kvällsmat)$/.test(words[0]) && kbHits === 0) return { kind: "vague", ...VAGUE_MEAL };
  for (const g in GENERIC_FOODS) { if (words.length <= 2 && t.includes(g) && !specific && kbHits <= 1) return { kind: "generic", ...GENERIC_FOODS[g] }; }
  if (specific || kbHits >= 1) return { kind: "described" };
  return { kind: "unknown", ...VAGUE_MEAL };
}

function estimateMeal(text, portion) {
  let t = (text || "").toLowerCase(); let pf = portion;
  if (/^__(small|normal|large)$/.test(t.trim())) { pf = { __small: "small", __normal: "normal", __large: "large" }[t.trim()]; t = ""; }
  let kcal = 0, p = 0, c = 0, f = 0, hits = 0;
  FOOD_KB.forEach(it => { if (it.k.some(kw => t.includes(kw))) { kcal += it.kcal; p += it.p; c += it.c; f += it.f; hits++; } });
  const m = PORTIONS[pf] || 1;
  let confidence, spread, method, assumptions;
  if (hits === 0) { kcal = 650; p = 28; c = 65; f = 28; confidence = "low"; spread = 0.35; method = "fallback"; assumptions = "Ingen igenkänd maträtt — generell normalmåltid antagen."; }
  else if (hits >= 3) { confidence = "medium"; spread = 0.18; method = "keyword"; assumptions = "Normala svenska portioner för igenkända delar."; }
  else { confidence = "medium"; spread = 0.25; method = "keyword"; assumptions = hits === 1 ? "En igenkänd komponent — övrigt antaget." : "Igenkända komponenter, normala portioner."; }
  if (pf && pf !== "normal") assumptions += ` Portion: ${pf === "small" ? "liten" : "stor"}.`;
  const mid = Math.round(kcal * m);
  return {
    kcal: mid, protein: Math.round(p * m), carbs: Math.round(c * m), fat: Math.round(f * m), hits,
    estimateMid: mid, estimateLow: Math.round(mid * (1 - spread)), estimateHigh: Math.round(mid * (1 + spread)),
    confidence, assumptions, estimateReason: hits ? `${hits} igenkänd(a) komponent(er).` : "Ingen igenkänd komponent.", estimationMethod: method,
  };
}

function dayNutritionRange(log) {
  let mid = 0, low = 0, high = 0, estimatedCount = 0;
  (log || []).forEach(e => {
    if (e.foodId) { const f = FOOD_INDEX.find(x => x.id === e.foodId); if (f) { const v = f.kcal * e.grams / 100; mid += v; low += v; high += v; } }
    else if (e.kcal != null) {
      mid += e.kcal;
      if (e.estimateLow != null && e.estimateHigh != null) { low += e.estimateLow; high += e.estimateHigh; estimatedCount++; }
      else if (e.quality === "ai_estimated" || e.quality === "estimated") { low += Math.round(e.kcal * 0.8); high += Math.round(e.kcal * 1.25); estimatedCount++; }
      else { low += e.kcal; high += e.kcal; }
    }
  });
  return { mid: Math.round(mid), low: Math.round(low), high: Math.round(high), estimatedCount };
}

function qualityColor(q) { return (q === "verified" || q === "exact" || q === "user_confirmed") ? T.accent.success : q === "calculated" ? T.accent.warning : q === "external" ? T.accent.primary : T.text.muted; }

// ── RÄDDA MÅLTIDEN v2 ──────────────────────────────────────────────
// Situationsspecifika förslag (variation mellan lägen OCH mellan gångerna via
// tidsbaserad rotation), flerdagars intag, mål + viktutveckling, längre stil-svar.
// lean = lägre kcal / högre protein → föredras när man ligger över målet.
const RESCUE_POOLS = {
  hungry: [
    { title: "Proteinbomb-tallrik", detail: "Färdig kyckling eller keso + kokt potatis + snabbgrönt. Mättar rejält och lyfter proteinet.", kcal: "~550 kcal", tag: "~45 g P", lean: true },
    { title: "Äggröra på fullkorn", detail: "3 ägg med bönor eller ost på rostat fullkornsbröd. Snabbt och matigt.", kcal: "~450 kcal", tag: "~28 g P" },
    { title: "Tonfisk- eller kycklingwrap", detail: "Tortilla + tonfisk/kyckling + grönt + lite dressing. Klar på minuter.", kcal: "~500 kcal", tag: "~35 g P", lean: true },
    { title: "Kvargbowl med crunch", detail: "Stor kvarg + granola + bär + en näve nötter. Mycket protein för kalorierna.", kcal: "~380 kcal", tag: "~30 g P", lean: true },
    { title: "Soppa + rejäl macka", detail: "Färdig soppa + smörgås med kött/ost-pålägg. Varmt och mättande utan disk.", kcal: "~480 kcal", tag: "~20 g P" },
    { title: "Köttbullar + mos", detail: "Frysta köttbullar + potatismos + lingon. Husmanshunger utan planering.", kcal: "~600 kcal", tag: "~30 g P" },
  ],
  nocook: [
    { title: "Kyckling + färdig sallad", detail: "Färdiggrillad kyckling + påssallad. Noll matlagning, mycket protein.", kcal: "~450 kcal", tag: "~35 g P", lean: true },
    { title: "Kvarg + granola + bär", detail: "Häll upp, ät. Två minuter, mättande, proteinrikt.", kcal: "~350 kcal", tag: "~28 g P", lean: true },
    { title: "Tonfisk ur burken", detail: "Tonfisk + knäckebröd + lite ost. Kräver bara en burköppnare.", kcal: "~400 kcal", tag: "~35 g P", lean: true },
    { title: "Micro-gryta + grönt", detail: "Färdig lasagne eller gryta i micron + en näve färdiggrönt vid sidan.", kcal: "~600 kcal", tag: "0 disk" },
    { title: "Proteinshake + banan", detail: "Shake med mjölk, banan och en sked jordnötssmör. Dryck-måltid när orken är slut.", kcal: "~450 kcal", tag: "~40 g P" },
    { title: "3-ägg på rostat", detail: "Snabb äggröra eller kokta ägg på rostat bröd. Alltid räddningen.", kcal: "~400 kcal", tag: "~24 g P" },
  ],
  hungover: [
    { title: "Ägg + rostat + vätska", detail: "Ägg, rostat bröd, salt och en stor klunk vatten/elektrolyter. Precis vad kroppen skriker efter.", kcal: "~400 kcal", tag: "salt + protein" },
    { title: "Bananshake med havre", detail: "Banan, havre, mjölk och jordnötssmör. Milt för magen, ger snabb energi.", kcal: "~450 kcal", tag: "skonsamt" },
    { title: "Nudelsoppa + ägg", detail: "Färdig nudelsoppa med ett extra ägg i. Varmt, salt och lätt att få i sig.", kcal: "~450 kcal", tag: "vätska" },
    { title: "Keso + salta kex", detail: "Keso med honung + några salta kex. Salt och protein utan att laga.", kcal: "~380 kcal", tag: "~25 g P", lean: true },
    { title: "Klassisk ostmacka + juice", detail: "Ost/skinkmacka + ett glas juice. Enkelt, salt och lite snabbt socker.", kcal: "~500 kcal", tag: "snabbt" },
  ],
  sweet: [
    { title: "Kvarg med kakao + bär", detail: "Kvarg rörd med kakao, lite sötning och bär. Smakar dessert, räddar proteinet.", kcal: "~250 kcal", tag: "~25 g P", lean: true },
    { title: "Proteinbar + kaffe", detail: "En proteinbar till kaffet. Stillar suget direkt, tar dig mot proteinmålet.", kcal: "~230 kcal", tag: "~20 g P", lean: true },
    { title: "Fryst banan + mörk choklad", detail: "Fryst banan doppad i en bit mörk choklad. Litet, sött, klart.", kcal: "~200 kcal", tag: "litet", lean: true },
    { title: "Yoghurt + granola + hallon", detail: "Grekisk yoghurt med granola och hallon. Krispigt och sött utan att spåra ur.", kcal: "~280 kcal", tag: "~18 g P" },
    { title: "Chokladpudding på keso", detail: "Keso + kakao + sötning rörd slät. Proteinpudding som mättar suget.", kcal: "~220 kcal", tag: "~28 g P", lean: true },
    { title: "Riskaka + jordnötssmör", detail: "Riskaka med jordnötssmör och en skiva banan. Sött, salt och krispigt.", kcal: "~250 kcal", tag: "snabbt" },
  ],
  empty: [
    { title: "Pasta + burktomat", detail: "Pasta + krossade tomater + vitlök + olivolja. Skafferi-klassiker som alltid går.", kcal: "~500 kcal", tag: "billigt" },
    { title: "Omelett på det som finns", detail: "Ägg + vad du hittar (lök, ost, rester). Töm kylen i en panna.", kcal: "~400 kcal", tag: "~24 g P" },
    { title: "Havregröt + sylt", detail: "Havregrynsgröt med mjölk och sylt eller banan. Kostar nästan inget, mättar.", kcal: "~350 kcal", tag: "lätt", lean: true },
    { title: "Stekt ris med ägg", detail: "Ris + fryst grönt + ägg + soja i en panna. Snabbt av rester.", kcal: "~450 kcal", tag: "en panna" },
    { title: "Tonfiskpasta", detail: "Pasta + tonfisk + majs/ärtor. Tre burkar blir en måltid.", kcal: "~500 kcal", tag: "~30 g P" },
    { title: "Allt-på-knäcke", detail: "Knäckebröd med allt pålägg du hittar. Ingen matlagning alls.", kcal: "~350 kcal", tag: "nödlösning" },
  ],
  pizza: [
    { title: "Beställ men balansera", detail: "Kör kyckling/skinka som topping, ät halva nu med en sallad vid sidan och spara resten till imorgon.", kcal: "~700 kcal", tag: "smart variant" },
    { title: "Snabb tortillapizza", detail: "Tortilla + tomat + ost + grönt i ugnen 8 min. Pizzakänsla för halva kalorierna.", kcal: "~450 kcal", tag: "hemma", lean: true },
    { title: "Mindre pizza + sallad", detail: "Beställ en mindre och lägg till en sallad. Suget stillat, portionen under kontroll.", kcal: "~750 kcal", tag: "beställ" },
    { title: "Vänta ut suget först", detail: "Om det är känslosug: ät något proteinigt nu och vänta 15 min. Ofta släpper det.", kcal: "~250 kcal", tag: "paus", lean: true },
  ],
  fastfood: [
    { title: "Grillad kyckling istället", detail: "Grillad kyckling-burgare + sallad i stället för pommes. Samma snabbhet, mer protein.", kcal: "~550 kcal", tag: "~40 g P", lean: true },
    { title: "Kebabtallrik, inte rulle", detail: "Tallrik i stället för rulle → mer kött och grönt, mindre bröd.", kcal: "~650 kcal", tag: "mer protein" },
    { title: "Sallad med kyckling", detail: "Kycklingsallad med dressingen vid sidan. Snabbmat som faktiskt mättar rätt.", kcal: "~450 kcal", tag: "lean", lean: true },
    { title: "Välj minsta + vatten", detail: "Kör du menyn ändå: ta minsta storleken och drick vatten/light i stället för läsk.", kcal: "~700 kcal", tag: "dämpat" },
  ],
  custom: [
    { title: "Snabb proteinfix", detail: "Kvarg eller keso + bär. Två minuter, mättar och räddar proteinmålet.", kcal: "~300 kcal", tag: "~30 g P", lean: true },
    { title: "Kyckling + färdig sallad", detail: "Färdiggrillad kyckling + påssallad. Noll matlagning.", kcal: "~450 kcal", tag: "~35 g P", lean: true },
    { title: "Äggröra på fullkorn", detail: "3 ägg på rostat fullkornsbröd. Snabbt, matigt, alltid tillgängligt.", kcal: "~400 kcal", tag: "~24 g P" },
    { title: "Proteinshake + frukt", detail: "Shake + en frukt när inget annat känns görbart.", kcal: "~350 kcal", tag: "dryck-måltid", lean: true },
    { title: "Micro-gryta + grönt", detail: "Färdig gryta i micron + en näve grönt. Riktigt mål, minimal ansträngning.", kcal: "~550 kcal", tag: "0 disk" },
  ],
};

// Tolkar fritext-\"kris\" lokalt (regelbaserat, offline) → närmaste situations-id.
function interpretCrisis(text) {
  const t = (text || "").toLowerCase();
  if (!t.trim()) return null;
  const has = (...ks) => ks.some(k => t.includes(k));
  if (has("bakis", "bakfull", "baksmäll", "hångover", "kropps")) return "hungover";
  if (has("söt", "socker", "choklad", "godis", "glass", "kaka", "bulle", "glass")) return "sweet";
  if (has("pizza")) return "pizza";
  if (has("snabbmat", "burg", "hamburg", "kebab", "mcdon", "pommes", "gatukök", "korv", "drive")) return "fastfood";
  if (has("orka", "trött", "sliten", "laga", "disk", "ork", "seg")) return "nocook";
  if (has("tomt", "inget hemma", "inget i kyl", "slut på mat", "skafferi", "handlat")) return "empty";
  if (has("hungr", "svält", "utsvulten", "käk", "matt", "äta nu")) return "hungry";
  return "custom";
}

// Flerdagars intag ur foodLog. Ärligt \"för lite data\" utan loggade dagar.
function recentIntakeSummary(foodLog, targets, now = Date.now()) {
  const today = startOfLocalDay(now);
  const byDay = {};
  (foodLog || []).forEach(e => {
    if (e.ts == null) return;
    const d = startOfLocalDay(e.ts);
    if (!byDay[d]) byDay[d] = { kcal: 0, protein: 0, n: 0 };
    let kc = 0, pr = 0;
    if (e.foodId) { const f = FOOD_INDEX.find(x => x.id === e.foodId); if (f) { const k = e.grams / 100; kc = f.kcal * k; pr = f.protein * k; } }
    else if (e.kcal != null) { kc = e.kcal; pr = e.protein || 0; }
    byDay[d].kcal += kc; byDay[d].protein += pr; byDay[d].n++;
  });
  const priorDays = Object.keys(byDay).map(Number).filter(d => d < today).sort((a, b) => b - a).slice(0, 4);
  const todayKcal = byDay[today] ? Math.round(byDay[today].kcal) : 0;
  const todayProtein = byDay[today] ? Math.round(byDay[today].protein) : 0;
  const loggedDays = priorDays.length;
  if (loggedDays === 0) return { enough: false, loggedDays: 0, todayKcal, todayProtein };
  const avgKcal = Math.round(priorDays.reduce((a, d) => a + byDay[d].kcal, 0) / loggedDays);
  const avgProtein = Math.round(priorDays.reduce((a, d) => a + byDay[d].protein, 0) / loggedDays);
  const days = priorDays.map(d => ({ date: d, kcal: Math.round(byDay[d].kcal), protein: Math.round(byDay[d].protein) }));
  const tKcal = targets && targets.kcal;
  let trend = "nodata", vsKcal = null;
  if (typeof tKcal === "number" && tKcal > 0) { vsKcal = avgKcal - tKcal; trend = vsKcal > 200 ? "over" : vsKcal < -200 ? "under" : "on"; }
  return { enough: true, loggedDays, days, avgKcal, avgProtein, vsKcal, trend, todayKcal, todayProtein, targetKcal: (typeof tKcal === "number" ? tKcal : null), targetProtein: (targets && targets.protein) || null };
}

// Mål-riktning + viktutveckling (ur measurements). Ärligt tomt utan underlag.
function nutritionProgress(profile, measurements, now = Date.now()) {
  const goal = (profile && profile.nutritionGoal) || null;
  const series = metricSeries(measurements, "weight");
  let weight = { enough: false };
  if (series.length >= 2) {
    const first = series[0], last = series[series.length - 1];
    const spanDays = Math.max(1, (last.date - first.date) / DAY_MS);
    const deltaKg = Math.round((last.value - first.value) * 10) / 10;
    const perWeek = Math.round((deltaKg / spanDays) * 7 * 100) / 100;
    const dir = Math.abs(perWeek) < 0.1 ? "flat" : perWeek < 0 ? "down" : "up";
    weight = { enough: true, deltaKg, perWeek, spanDays: Math.round(spanDays), dir, points: series.length, current: last.value };
  }
  return { goal, weight };
}

// Stämmer intaget med målet? (t.ex. cut men äter över → skaver)
function goalAlignment(goal, recent) {
  if (!goal || !recent || !recent.enough || recent.targetKcal == null) return null;
  const over = recent.vsKcal;
  if (goal === "cut") {
    if (over > 150) return { ok: false, msg: "över målet trots att du vill ner i vikt" };
    if (over < -150) return { ok: true, msg: "i ett underskott som matchar ditt mål" };
    return { ok: true, msg: "på linje med ditt mål" };
  }
  if (goal === "bulk") {
    if (over < -150) return { ok: false, msg: "under målet trots att du vill bygga muskler" };
    if (over > 150) return { ok: true, msg: "i det överskott bygget behöver" };
    return { ok: true, msg: "på linje med ditt mål" };
  }
  if (goal === "maintain") return { ok: Math.abs(over) <= 200, msg: Math.abs(over) <= 200 ? "stabilt kring ditt underhåll" : "en bit från ditt underhåll" };
  return null; // health: ingen kalorimålslogik
}

// Väljer 3 förslag ur poolen: roterar per 30-min-hink (varierar mellan gångerna,
// reproducerbart i stunden) och prioriterar lean när man ligger över/har lite kvar.
// Ett indulgens-alternativ (pizza/burgare/vad du är sugen på) som bara dyker upp
// när det är förtjänat. treat=true → filtreras bort vid strikt stil / ej förtjänat.
const TREAT = { title: "Unna dig det du är sugen på", detail: "Sug på pizza, burgare eller något annat gott? Kör på det ikväll. Beställ, ät tills du är nöjd och logga det — du ligger så pass bra att en enskild måltid inte rör utvecklingen.", kcal: "valfritt", tag: "förtjänat", lean: false, treat: true };

// Får coachen erbjuda indulgens? Fokuserad → aldrig. Flexibel → alltid (filosofin).
// Balanserad → bara om man loggat bra OCH ligger rätt i målkurvan (och vikten åt rätt håll).
function indulgenceAllowed(style, recent, progress) {
  if (style === "focused") return false;
  if (style === "flexible") return true;
  const loggedWell = !!(recent && recent.enough && recent.loggedDays >= 3);
  const align = progress ? goalAlignment(progress.goal, recent) : null;
  const onTrack = align ? align.ok : !!(recent && recent.enough && recent.trend !== "over");
  let weightOk = true;
  if (progress && progress.weight && progress.weight.enough && progress.goal) {
    if (progress.goal === "cut") weightOk = progress.weight.dir !== "up";
    else if (progress.goal === "bulk") weightOk = progress.weight.dir !== "down";
  }
  return loggedWell && onTrack && weightOk;
}

function pickRescueOptions(situation, recent, remaining, memory, now, style, progress) {
  const pool = (RESCUE_POOLS[situation] || RESCUE_POOLS.custom).slice();
  const seed = Math.floor(now / 1800000);
  const rot = ((seed % pool.length) + pool.length) % pool.length;
  let rotated = pool.slice(rot).concat(pool.slice(0, rot));
  const over = recent && recent.enough && recent.targetKcal != null ? recent.vsKcal : null;
  const tight = remaining.kcal > 0 && remaining.kcal <= 400;
  const under = over != null && over < -150;
  const preferLean = style === "focused" || tight || (over != null && over > 150);
  if (preferLean) rotated = rotated.slice().sort((a, b) => (b.lean ? 1 : 0) - (a.lean ? 1 : 0));
  else if (under) rotated = rotated.slice().sort((a, b) => (a.lean ? 1 : 0) - (b.lean ? 1 : 0));
  let opts = rotated.slice(0, 3);
  // Förtjänad frihet: ge ett indulgens-alternativ (utom när läget redan ÄR pizza/snabbmat,
  // där poolen redan täcker det). Vid strikt/ej förtjänat kommer inget treat med.
  const indulge = indulgenceAllowed(style, recent, progress) && !tight;
  if (indulge && situation !== "pizza" && situation !== "fastfood") opts = opts.slice(0, 2).concat(TREAT);
  else opts = opts.filter(o => !o.treat);
  const fav = (memory || []).filter(m => m.protein >= 18 && m.kcal <= 520).sort((a, b) => b.count - a.count)[0];
  if (fav && seed % 2 === 0) opts = [{ title: "Din vanliga snabbis", detail: `${fav.name} — du gör den ofta och den tar dig snabbt mot proteinmålet.`, kcal: `~${fav.kcal} kcal`, tag: `~${fav.protein} g P`, lean: fav.kcal <= 450 }, ...opts].slice(0, 3);
  let recIndex = 0;
  if (!preferLean) { const i = opts.findIndex(o => !o.lean && !o.treat); recIndex = i >= 0 ? i : 0; }
  return { opts, recIndex, preferLean, under, indulge };
}


function rescueWhy(i, opts, ctx) {
  const o = opts[i]; if (!o) return "";
  const name = o.title.toLowerCase();
  if (ctx.tight) return `Lite kvar på dagens ram — ${name} räddar både hunger och protein utan att spräcka den.`;
  if (ctx.over) return `Du har legat över målet på sistone, så ${name} håller snittet i schack utan att du behöver kompensera.`;
  if (ctx.under) return `Du har ätit i underkant — ${name} ger dig ett ordentligt mål, precis vad du behöver just nu.`;
  return `${o.title} ger bäst balans mot dagens ram och minst krångel.`;
}

// Kommenterar senaste dagars intag + mål + viktutveckling (färgat av strikthet).
function rescueContext(recent, progress, style) {
  const lines = [];
  if (recent && recent.enough) {
    const d = recent.loggedDays, dw = d === 1 ? "dagen" : `${d} dagarna`;
    if (recent.targetKcal != null) {
      const abs = Math.abs(recent.vsKcal);
      if (recent.trend === "over") lines.push(`De senaste ${dw} har du legat ~${abs} kcal över målet i snitt (~${recent.avgKcal} kcal/dag).`);
      else if (recent.trend === "under") lines.push(`De senaste ${dw} har du legat ~${abs} kcal under målet i snitt (~${recent.avgKcal} kcal/dag).`);
      else lines.push(`De senaste ${dw} har du legat stabilt kring målet (~${recent.avgKcal} kcal/dag).`);
    } else lines.push(`Snittet ligger på ~${recent.avgKcal} kcal/dag de senaste ${dw}. Ange ett kalorimål så kan jag säga om det är över eller under.`);
  } else lines.push("Jag har för lite loggat de senaste dagarna för att se ett tydligt mönster ännu — jag väger in dagens ram i stället.");

  if (progress) {
    const goalSv = { cut: "gå ner i vikt", bulk: "bygga muskler", maintain: "hålla vikten", health: "äta hälsosammare" }[progress.goal];
    const align = goalAlignment(progress.goal, recent);
    if (goalSv && align) lines.push(align.ok ? `Det ligger ${align.msg}.` : `Här skaver det lite: intaget ligger ${align.msg}.`);
    else if (goalSv) lines.push(`Ditt mål är att ${goalSv}.`);
    if (progress.weight && progress.weight.enough && progress.weight.dir !== "flat") {
      const dirSv = progress.weight.dir === "down" ? "nedåt" : "uppåt";
      lines.push(`Vikten går ${dirSv} ~${Math.abs(progress.weight.perWeek)} kg/vecka de senaste ${progress.weight.spanDays} dagarna.`);
    }
  }
  return lines.join(" ");
}

// Längre coach-avslut: erkänner situationen, motiverar valet, kopplar till mål — stil-färgat.
function rescueCoach(situation, style, recent, progress, rec, remaining, opts, indulge) {
  const parts = [];
  const sit = { hungry: "Riktig hunger möter man med riktig mat, inte viljestyrka.", nocook: "När orken är slut är det viktigare att du äter något vettigt än att det blir perfekt.", hungover: "Kroppen vill ha salt, vätska och protein just nu — ge den det.", sweet: "Sötsug är helt normalt och går att möta smart i stället för att kämpa emot.", empty: "Tomt skafferi är inget nederlag — vi jobbar med det som finns.", pizza: "Suget på pizza är mänskligt; vi gör bara ett lite smartare drag av det.", fastfood: "På väg till snabbmat? Då maxar vi det bästa alternativet på menyn." }[situation] || "";
  if (sit) parts.push(sit);
  const o = opts[rec.pick - 1];
  parts.push(`Jag lutar åt alternativ ${rec.pick}${o ? ` — ${o.title.toLowerCase()}` : ""}. ${rec.why}`);
  if (remaining && remaining.kcal > 0) parts.push(`Du har ~${remaining.kcal} kcal${remaining.protein > 0 ? ` och ~${remaining.protein} g protein` : ""} kvar på dagens ram.`);
  if (indulge) parts.push("Du har loggat stabilt och ligger bra i målkurvan, så du har marginal att unna dig något idag — helt utan dåligt samvete.");
  else if (style === "focused" && (situation === "pizza" || situation === "fastfood")) parts.push("Med Fokuserad stil styr jag dig mot den smartare varianten. Vill du ha mer svängrum när du väl ligger bra i målkurvan — byt till Balanserad eller Flexibel.");
  const goalSv = progress ? { cut: "gå ner i vikt", bulk: "bygga muskler", maintain: "hålla vikten", health: "äta bättre" }[progress.goal] : null;
  const tail = goalSv ? ` mot ditt mål att ${goalSv}` : " mot målet";
  const close = {
    focused: `Registrera valet direkt och håll linjen — det är konsekvensen över veckor som tar dig${tail}, inte enskilda perfekta måltider.`,
    balanced: `Logga det du väljer och kör vidare som vanligt, ingen kompensation behövs. Ett bra genomsnitt över tid slår varje enskild måltid på vägen${tail}.`,
    flexible: `Välj, njut och logga det — släpp det sen. Din relation till maten på lång sikt betyder mer${tail} än vilken enskild måltid som helst.`,
  }[style] || "Registrera valet och kör vidare vid nästa måltid.";
  parts.push(close);
  return parts.join(" ");
}

function rescueGuard(style) {
  return style === "focused"
    ? "Registrera valet direkt — även ett sämre val är data, inte ett misslyckande. Ingen svält och ingen straff-cardio."
    : style === "flexible"
      ? "Logga det och släpp det. Ingen kompensation, inget dåligt samvete — vi kör vidare vid nästa måltid."
      : "Oavsett vad du väljer: registrera det direkt. En sämre måltid är inget att svälta eller köra extra cardio för.";
}

function buildRescue(situation, remaining, style, memory, recent = null, progress = null, now = Date.now()) {
  const sit = situation || "custom";
  const { opts, recIndex, preferLean, under, indulge } = pickRescueOptions(sit, recent, remaining, memory, now, style, progress);
  const tight = remaining.kcal > 0 && remaining.kcal <= 400;
  const over = recent && recent.enough && recent.targetKcal != null && recent.vsKcal > 150;
  const rec = { pick: recIndex + 1, why: rescueWhy(recIndex, opts, { tight, over, under }) };
  return { opts, rec, context: rescueContext(recent, progress, style), coach: rescueCoach(sit, style, recent, progress, rec, remaining, opts, indulge), guard: rescueGuard(style) };
}

function normMeal(s) { return (s || "").toLowerCase().replace(/[^a-zåäö0-9 ]/g, "").trim(); }

function matchMemory(memory, text) {
  const t = normMeal(text); if (t.length < 3) return null;
  const toks = t.split(/\s+/).filter(w => w.length >= 3); if (!toks.length) return null;
  let best = null;
  memory.forEach(m => { const mt = normMeal(m.name).split(/\s+/); const o = toks.filter(w => mt.some(x => x.includes(w) || w.includes(x))).length; if (o > 0 && (!best || o > best.o || (o === best.o && m.count > best.m.count))) best = { m, o }; });
  return best ? best.m : null;
}

function rememberMeal(memory, entry) {
  const key = normMeal(entry.name), idx = memory.findIndex(m => normMeal(m.name) === key);
  if (idx >= 0) { const m = memory[idx], n = m.count + 1, bl = (a, b) => Math.round((a * m.count + b) / n); return memory.map((x, i) => i === idx ? { ...m, count: n, kcal: bl(m.kcal, entry.kcal), protein: bl(m.protein, entry.protein), carbs: bl(m.carbs, entry.carbs || 0), fat: bl(m.fat, entry.fat || 0) } : x); }
  return [...memory, { name: entry.name, kcal: entry.kcal, protein: entry.protein, carbs: entry.carbs || 0, fat: entry.fat || 0, count: 1, quality: entry.quality || "estimated" }];
}

function computeNutrition(log) {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, estimated: 0, total: 0 };
  log.forEach(e => {
    t.total++;
    if (e.foodId) { const f = FOOD_INDEX.find(x => x.id === e.foodId); if (f) { const k = e.grams / 100; t.kcal += f.kcal * k; t.protein += f.protein * k; t.carbs += f.carbs * k; t.fat += f.fat * k; } }
    else if (e.kcal != null) { t.kcal += e.kcal; t.protein += e.protein || 0; t.carbs += e.carbs || 0; t.fat += e.fat || 0; if (e.quality === "estimated") t.estimated++; }
  });
  ["kcal", "protein", "carbs", "fat"].forEach(k => t[k] = Math.round(t[k]));
  return t;
}

// ── MIKRONÄRING ────────────────────────────────────────────────────
// Referensvärden (ungefärliga NNR/SLV-riktvärden för vuxna). Järn/zink/magnesium
// skiljer sig med kön; salt är ett maxvärde, inte ett mål. Endast en fingervisning.
const MICRO_REF = {
  iron: { label: "Järn", unit: "mg", ri: 12, riF: 15, riM: 9 },
  calcium: { label: "Kalcium", unit: "mg", ri: 800 },
  magnesium: { label: "Magnesium", unit: "mg", ri: 320, riF: 280, riM: 350 },
  potassium: { label: "Kalium", unit: "mg", ri: 3500, riF: 3100, riM: 3500 },
  zinc: { label: "Zink", unit: "mg", ri: 8, riF: 7, riM: 9 },
  vitD: { label: "D-vitamin", unit: "µg", ri: 10 },
  b12: { label: "B12", unit: "µg", ri: 2 },
  folate: { label: "Folat", unit: "µg", ri: 300 },
  vitC: { label: "C-vitamin", unit: "mg", ri: 75 },
  omega3: { label: "Omega-3 (EPA+DHA)", unit: "g", ri: 0.25 },
  salt: { label: "Salt", unit: "g", ri: 6, kind: "max" },
};
const MICRO_KEYS = Object.keys(MICRO_REF);
// Summerar dagens mikronäring ur loggen (bara källförda livsmedel med micro-data).
function computeMicros(log) {
  const t = {}, has = {};
  (log || []).forEach(e => {
    if (!e.foodId) return;
    const f = FOOD_INDEX.find(x => x.id === e.foodId);
    if (!f || !f.micro) return;
    const k = e.grams / 100;
    MICRO_KEYS.forEach(m => { if (typeof f.micro[m] === "number") { t[m] = (t[m] || 0) + f.micro[m] * k; has[m] = true; } });
  });
  const out = {};
  MICRO_KEYS.forEach(m => { if (has[m]) out[m] = Math.round(t[m] * 100) / 100; });
  return out;   // { iron, calcium, … } för dagens loggade livsmedel med data
}
// Referens för en person (könsjusterad där det gäller).
function microRef(key, gender) {
  const r = MICRO_REF[key]; if (!r) return null;
  const ri = gender === "female" && r.riF ? r.riF : gender === "male" && r.riM ? r.riM : r.ri;
  return { ...r, ri };
}
// Snitt-mikronäring per dag över senaste loggade dagarna (bara källförda livsmedel).
function recentDailyMicros(log, days = 7) {
  const byDay = {};
  (log || []).forEach(e => { if (!e.foodId || e.ts == null) return; const d = startOfLocalDay(e.ts); (byDay[d] = byDay[d] || []).push(e); });
  const keys = Object.keys(byDay).sort().slice(-days);
  const sums = {}, counts = {};
  keys.forEach(d => { const m = computeMicros(byDay[d]); MICRO_KEYS.forEach(k => { if (m[k] != null) { sums[k] = (sums[k] || 0) + m[k]; counts[k] = (counts[k] || 0) + 1; } }); });
  const out = { _days: keys.length };
  MICRO_KEYS.forEach(k => { if (counts[k]) out[k] = sums[k] / counts[k]; });
  return out;
}
// Snitt-makros per dag över senaste loggade dagarna (källförda + fritext med kcal/protein).
function recentDailyNutrition(log, days = 5) {
  const byDay = {};
  (log || []).forEach(e => { if (e.ts == null) return; const d = startOfLocalDay(e.ts); (byDay[d] = byDay[d] || []).push(e); });
  const keys = Object.keys(byDay).sort().slice(-days);
  if (!keys.length) return { _days: 0 };
  let p = 0, k = 0;
  keys.forEach(d => { const t = computeNutrition(byDay[d]); p += t.protein; k += t.kcal; });
  return { protein: p / keys.length, kcal: k / keys.length, _days: keys.length };
}
// Nutrition → readiness: ärlig, LITEN sänkning när bränslet brister (protein/energi/järn).
// Kan bara dra NER (dålig kost höjer inte återhämtningen över den träningsbaserade).
function nutritionRecoveryModifier({ foodLog, nutritionTargets, profile } = {}) {
  const factors = []; let mod = 0;
  const g = nutritionTargets || {};
  const rn = recentDailyNutrition(foodLog);
  if (rn._days >= 2) {
    if (g.protein) {
      const pct = rn.protein / g.protein;
      if (pct < 0.7) { mod -= 4; factors.push({ label: "Lågt proteinintag", delta: -4, note: `~${Math.round(rn.protein)} g/dag mot mål ${g.protein} g — protein bygger upp musklerna mellan pass.` }); }
      else if (pct < 0.85) { mod -= 2; factors.push({ label: "Protein under mål", delta: -2, note: `~${Math.round(rn.protein)} g/dag mot mål ${g.protein} g.` }); }
    }
    if (g.kcal && rn.kcal < g.kcal * 0.7) { mod -= 3; factors.push({ label: "Kraftigt underskott", delta: -3, note: `~${Math.round(rn.kcal)} kcal/dag mot ${g.kcal} — för lite energi bromsar återhämtningen.` }); }
  }
  const rm = recentDailyMicros(foodLog);
  if (rm._days >= 2 && typeof rm.iron === "number") {
    const ref = microRef("iron", profile && profile.gender).ri;
    if (rm.iron < ref * 0.5) { mod -= 2; factors.push({ label: "Lågt järnintag", delta: -2, note: `~${Math.round(rm.iron * 10) / 10} mg/dag mot ~${ref} mg — järn bär syre till musklerna.` }); }
  }
  return { mod: Math.max(-8, mod), factors };
}
// Samlad förklaring av readiness-siffran: träningsbas + cykel + nutrition.
function readinessBreakdown(trainingBase, cycle, nutRec) {
  const factors = [{ label: "Träningsåterhämtning", delta: null, base: Math.round(trainingBase), note: "Viktat snitt av hur utvilade dina muskelgrupper är." }];
  if (cycle && cycle.readiness) factors.push({ label: `Menscykel (${cycle.sv})`, delta: cycle.readiness, note: cycle.note });
  if (nutRec && nutRec.factors) nutRec.factors.forEach(f => factors.push(f));
  const total = Math.max(0, Math.min(100, Math.round(trainingBase) + (cycle ? cycle.readiness : 0) + (nutRec ? nutRec.mod : 0)));
  return { total, base: Math.round(trainingBase), factors };
}
// Hur tillförlitlig är kostloggen? Antal distinkta loggade dagar senaste `days`.
function logReliability(foodLog, days = 5) {
  const now = Date.now(), set = new Set();
  (foodLog || []).forEach(e => { if (e.ts && now - e.ts < days * 864e5) set.add(startOfLocalDay(e.ts)); });
  const d = set.size;
  return { days: d, reliable: d >= 3, loggedToday: set.has(startOfLocalDay(now)) };
}
// Personlig dagsinsikt (opt-in): väger in cykel + kost-signaler till EN ärlig rad.
function personalInsight({ readiness, cycle, nutRec, includeNutrition = true }) {
  const low = includeNutrition && nutRec && nutRec.factors ? nutRec.factors : [];
  const iron = low.find(f => /järn/i.test(f.label));
  const protein = low.find(f => /protein/i.test(f.label));
  const energy = low.find(f => /underskott/i.test(f.label));
  const parts = [];
  if (cycle && (cycle.phase === "luteal" || cycle.phase === "menstrual") && readiness != null && readiness < 66)
    parts.push(`${cycle.sv} och lägre beredskap idag — håll intensiteten måttlig och var snäll mot dig själv.`);
  if (iron) parts.push("Järnet har legat lågt — prioritera järnrik mat, och håll dagens pass måttligt tills det är uppe.");
  else if (protein) parts.push("Proteinet har legat under mål — fyll på innan ett hårt pass, annars bygger du inte muskel av jobbet.");
  else if (energy) parts.push("Energiintaget har varit lågt — se till att äta ordentligt idag så återhämtningen hänger med.");
  if (!parts.length) parts.push(includeNutrition ? "Kost och cykel ser bra ut — inget talar emot att köra på planen fullt ut idag." : "Inget som drar ner idag — kör på planen.");
  return parts.join(" ");
}

// Behovs-rådgivare: datadrivna, ärliga förslag på tillskott. Inga förslag på sådant
// användaren redan loggat. Medicinskt känsliga (järn, B12) flaggas.
function supplementAdvice({ profile, foodLog, sessions, nutritionTotals, nutritionTargets, existing = [] } = {}) {
  const have = new Set(existing), gender = profile && profile.gender, diet = profile && profile.diet, out = [];
  const add = (id, why, medical) => { if (have.has(id) || out.some(o => o.id === id)) return; out.push({ id, why, medical: !!medical }); };
  const vegan = diet === "vegan", vegetarian = diet === "vegetarian";
  // Kostbaserade behov (kategoriska — kräver ingen loggdata) rankas först.
  if (vegan) {
    add("b12", "På vegankost är B12 ett måste — det finns i princip inte i växtbaserad mat, och brist utvecklas smygande.", true);
    add("omega3", "På vegankost får du sällan EPA/DHA från maten — algolja är ett växtbaserat alternativ till fiskolja.");
    add("vitd", "Vegansk D-vitamin (D3 från lav eller D2) kan behövas, särskilt vinterhalvåret.");
  } else if (vegetarian) {
    add("b12", "På vegetarisk kost kan B12 bli lågt (du får det mest via mejeri och ägg) — värt att hålla koll på eller komplettera.", true);
  }
  const approach = profile && profile.dietApproach;
  if (approach === "keto" || approach === "lchf") {
    add("electrolytes", "På " + (approach === "keto" ? "keto" : "LCHF") + " tappar kroppen mer vätska och salter — natrium, kalium och magnesium hjälper mot trötthet och kramp (\"keto-influensa\").");
    add("magnesium", "Lågkolhydratkost ökar ofta behovet av magnesium — kan dämpa kramp och stötta sömnen.");
  }
  if (sessions && sessions.length >= 2)
    add("creatine", "Du styrketränar regelbundet — kreatin (3–5 g/dag) är ett av de mest välbeforskade tillskotten för styrka och högintensiv träning" + (vegan || vegetarian ? ", och kan ge extra effekt eftersom växtbaserad kost ger mindre kreatin via maten." : ", och fungerar lika bra för kvinnor."));
  if (nutritionTargets && nutritionTargets.protein && nutritionTotals && nutritionTotals.protein > 0 && nutritionTotals.protein < nutritionTargets.protein * 0.85)
    add("protein", `Du ligger under proteinmålet idag (${nutritionTotals.protein}/${nutritionTargets.protein} g) — proteinpulver är ett enkelt sätt att fylla gapet.`);
  const m = recentDailyMicros(foodLog);
  if (m._days >= 2) {
    const low = (k, f) => typeof m[k] === "number" && m[k] < microRef(k, gender).ri * f;
    if (low("iron", 0.55)) add("iron", "Ditt järnintag har legat lågt de senaste dagarna" + (gender === "female" ? " — som menstruerande har du dessutom högre behov" : "") + (vegan || vegetarian ? ", och växtbaserat järn tas upp sämre än järn från kött" : "") + ". Testa via vården innan du tar järntillskott.", true);
    if (low("vitD", 0.6)) add("vitd", "Lågt D-vitaminintag i maten. I Sverige, särskilt oktober–mars, räcker inte solen — ~10 µg/dag är en vanlig rekommendation.");
    if (low("b12", 0.5)) add("b12", "Lågt B12-intag i maten. B12 finns nästan bara i animaliska livsmedel — äter du lite sådant kan tillskott behövas.", true);
    if (low("calcium", 0.6)) add("calcium", "Lågt kalciumintag — viktigt för benhälsan" + (gender === "female" ? ", särskilt genom klimakteriet" : "") + (vegan ? ", och extra värt att bevaka utan mejeri i kosten" : ", främst relevant om du undviker mejeri") + ".");
    if (low("omega3", 0.5)) add("omega3", "Lågt omega-3 (EPA+DHA) i maten — relevant om du sällan äter fet fisk.");
  }
  return out.slice(0, vegan || vegetarian ? 5 : 4);
}

// ── §2/§9: HÄRLEDDA PERSONLIGA MÅTT (aktiv historik → aldrig demo-fixtures) ──
function startOfLocalDay(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
const DAY_MS = 864e5;

// ── MENSCYKEL (opt-in) ─────────────────────────────────────────────
// Ärliga, generella mönster — individuellt olika. Modifierarna är små och tänkta
// som en påminnelse, inte en dom. Ingen medicinsk rådgivning.
const CYCLE_PHASES = {
  menstrual: { sv: "Menstruation", short: "Mens", readiness: -6, kcalPct: 0, note: "Energi och readiness kan vara lägre. Prioritera järn (rött kött, baljväxter, mörkgröna blad) och vätska. Rörelse kan lindra besvär — sänk intensiteten om kroppen ber om det, men du behöver inte vila om du känner dig pigg." },
  follicular: { sv: "Follikelfas", short: "Follikel", readiness: 3, kcalPct: 0, note: "Ofta stigande energi och god återhämtning. Bra fönster för tyngre pass och att pusha progression." },
  ovulation: { sv: "Ägglossning", short: "Ägglossning", readiness: 2, kcalPct: 0, note: "Toppenergi för många. Lederna kan vara något lösare — värm upp ordentligt vid tunga lyft." },
  luteal: { sv: "Lutealfas", short: "Luteal", readiness: -3, kcalPct: 0.07, note: "Energibehovet stiger något (~5–10 %) och sötsug är vanligt — extra protein och fullkornskolhydrater hjälper. Readiness kan dippa sista dagarna (PMS); planera lättare pass då." },
};
function cyclePhase(profile, now = Date.now()) {
  if (!profile || !profile.cycleTracking || !profile.lastPeriodStart) return null;
  const len = (profile.cycleLength >= 20 && profile.cycleLength <= 40) ? profile.cycleLength : 28;
  const periodLen = (profile.periodLength >= 2 && profile.periodLength <= 10) ? profile.periodLength : 5;
  const elapsed = Math.floor((startOfLocalDay(now) - startOfLocalDay(profile.lastPeriodStart)) / DAY_MS);
  if (elapsed < 0) return null;
  const day = ((elapsed % len) + len) % len + 1;      // dag 1..len
  const ovDay = len - 14;                             // ägglossning ~14 dagar före nästa mens
  let phase;
  if (day <= periodLen) phase = "menstrual";
  else if (day < ovDay) phase = "follicular";
  else if (day <= ovDay + 1) phase = "ovulation";
  else phase = "luteal";
  const daysToNext = len - day + 1;
  return { phase, day, cycleLength: len, daysToNext, ...CYCLE_PHASES[phase] };
}
function cycleReadinessModifier(profile, now) { const c = cyclePhase(profile, now); return c ? c.readiness : 0; }

// Streak beräknas ur faktiska pass-datum. Aldrig demo-värdet 42.
function workoutStreak(sessions, now = Date.now()) {
  const today = startOfLocalDay(now);
  const days = [...new Set((sessions || []).map(s => startOfLocalDay(s.completedAt)))].sort((a, b) => b - a);
  if (!days.length) return 0;
  if (days[0] < today - DAY_MS) return 0;           // senaste passet äldre än igår → streak bruten
  let streak = 0, expect = days[0];
  for (const d of days) { if (d === expect) { streak++; expect -= DAY_MS; } else break; }
  return streak;
}

// Enkla, ärliga milstolpar ur loggad historik. Räknar TOTALT antal pass — belönar
// konsistens över tid, inte dagar i rad (vilodagar ska aldrig bestraffas).
function milestones(sessions) {
  const n = (sessions || []).length;
  const TIERS = [1, 10, 25, 50, 100];
  const list = TIERS.map(t => ({ id: "pass_" + t, label: t === 1 ? "Första passet" : `${t} pass`, target: t, current: Math.min(n, t), reached: n >= t }));
  const next = list.find(m => !m.reached) || null;
  return { list, next, earned: list.filter(m => m.reached).length, total: list.length, count: n };
}

// 7-dagars träningsbelastning per kalenderdag (för grafen). Tom historik → nollor, som gränssnittet visar som tomt-tillstånd.
const SV_DAY = ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"];
function sevenDayTrainingLoad(sessions, now = Date.now()) {
  const today = startOfLocalDay(now), out = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = today - i * DAY_MS, dayEnd = dayStart + DAY_MS;
    const load = (sessions || []).filter(s => s.completedAt >= dayStart && s.completedAt < dayEnd)
      .reduce((a, s) => a + Object.values(s.muscleLoads || {}).reduce((x, y) => x + y, 0), 0);
    out.push({ dayStart, label: SV_DAY[new Date(dayStart).getDay()], value: Math.round(load) });
  }
  return out;
}

// Samlad, härledd träningsöversikt ur den AKTIVA historiken.
function deriveTrainingMetrics(sessions, now = Date.now(), weeklyTarget = null) {
  const list = sessions || [];
  const total = list.length;
  const weekSessions = list.filter(s => now - s.completedAt < 7 * DAY_MS);
  const thisWeek = weekSessions.length;   // RULLANDE 7 dygn — används för belastning/trend
  const load7 = sevenDayTrainingLoad(list, now);
  const weeklyVolume = Math.round(weekSessions.reduce((a, s) => a + Object.values(s.muscleLoads || {}).reduce((x, y) => x + y, 0), 0));
  const lastWorkout = total ? [...list].sort((a, b) => b.completedAt - a.completedAt)[0] : null;
  const first = total ? Math.min(...list.map(s => s.completedAt)) : now;
  const spanDays = Math.max(1, (now - first) / DAY_MS);
  const perDay = +(total / spanDays).toFixed(2);
  // VECKOMÅL = innevarande KALENDERVECKA (måndag–söndag). Ett mål ska nollställas förutsägbart,
  // till skillnad från rullande 7 dygn där räknaren kan sjunka mitt i veckan när pass åldras ut.
  const d = new Date(now); const dow = (d.getDay() + 6) % 7;   // 0 = måndag
  const weekStart = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow).getTime();
  const weekDone = list.filter(s => s.completedAt >= weekStart).length;
  const target = (typeof weeklyTarget === "number" && weeklyTarget > 0) ? Math.round(weeklyTarget) : null;
  return { total, thisWeek, streak: workoutStreak(list, now), load7, weeklyVolume, lastWorkout, perDay, currentLoad: load7[load7.length - 1].value, has: total > 0, weeklyTarget: target, weekDone, weeklyProgress: target ? Math.min(1, weekDone / target) : null };
}

// §9: distinkta loggade kost-DAGAR (lokal kalenderdag), inom ett rullande fönster. Odaterade poster hoppas över.
function distinctNutritionDays(foodLog, now = Date.now(), windowDays = 28) {
  const cutoff = now - windowDays * DAY_MS, set = new Set();
  (foodLog || []).forEach(e => { const ts = e && e.ts; if (ts == null || ts < cutoff) return; set.add(startOfLocalDay(ts)); });
  return set.size;
}

// §8: styrke-konfidens PER ÖVNING — räknar relevanta prestationer för just den övningen,
// inte totala antalet pass. Använder centrala per-domän-regler via dataConfidence("strength").
function exerciseStrengthConfidence(sessions, exId, now = Date.now()) {
  const perf = (sessions || []).filter(s => (s.sets || []).some(x => x.exerciseId === exId && x.weight));
  const times = perf.map(s => s.completedAt);
  const spanDays = times.length >= 2 ? Math.round((Math.max(...times) - Math.min(...times)) / DAY_MS) : 0;
  return dataConfidence("strength", { strengthSessions: perf.length, spanDays });
}

// §4: EN källa för kostmål. Prioritet: användarens mål → accepterat ATLAS-förslag → inget.
// Hittar aldrig på kolhydrat/fett om användaren inte accepterat ett beräknat förslag. Demo behåller demo-målen.
// ── Cold-start: föreslå ett startmål för kalorier/protein ur kostmål + kroppsvikt ──
// Grovt, tydligt ett estimat, aldrig aggressivt, alltid justerbart. Returnerar null utan vikt.
// Underhållsskattning ~31 kcal/kg (måttligt aktiv). Underskott hålls måttligt (~18 %).
const DIETS = [
  { id: "omnivore", label: "Allätare" },
  { id: "pescetarian", label: "Pescetarian" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
];
const DIET_APPROACHES = [
  { id: "none", label: "Ingen särskild" },
  { id: "mediterranean", label: "Medelhavskost" },
  { id: "highprotein", label: "Högprotein" },
  { id: "lchf", label: "LCHF" },
  { id: "keto", label: "Keto" },
  { id: "gi", label: "GI-metoden" },
  { id: "paleo", label: "Paleo" },
];
const DIET_RESTRICTIONS = [
  { id: "lactose", label: "Laktosfri" },
  { id: "gluten", label: "Glutenfri" },
  { id: "nuts", label: "Nötallergi" },
  { id: "shellfish", label: "Skaldjursallergi" },
  { id: "egg", label: "Äggallergi" },
  { id: "soy", label: "Sojaallergi" },
  { id: "pork", label: "Fläskfritt" },
  { id: "alcohol", label: "Alkoholfritt" },
];
const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "Stillasittande", hint: "kontor/skrivbord, mest sittande", base: 1.2 },
  { id: "light", label: "Lätt aktivt", hint: "mest stående eller gående", base: 1.35 },
  { id: "active", label: "Aktivt", hint: "fysiskt arbete på fötterna", base: 1.5 },
  { id: "heavy", label: "Tungt", hint: "tungt kroppsarbete", base: 1.65 },
];
function suggestNutritionTargets({ goal, weightKg, gender, age, heightCm, workoutsPerWeek, activityLevel, dietApproach } = {}) {
  const w = typeof weightKg === "number" && weightKg > 0 ? weightKg : null;
  if (!w) return null;
  const g = goal || "maintain";
  // Underhållsbehov: Mifflin-St Jeor (könsjusterat) om längd finns, annars vikt-heuristik.
  let maint, method;
  if (typeof heightCm === "number" && heightCm > 0) {
    const a = (typeof age === "number" && age > 0) ? age : 30;               // rimlig fallback
    const s = gender === "female" ? -161 : gender === "male" ? 5 : -78;       // ospecificerat → mitt emellan
    const bmr = 10 * w + 6.25 * heightCm - 5 * a + s;
    // Aktivitetsfaktor: yrkes-/vardagsnivå som bas + träning ovanpå (~+0,05 per pass, tak +0,25).
    // Utan angiven nivå: gammal träningsbaserad heuristik (bakåtkompatibelt).
    const lvl = ACTIVITY_LEVELS.find(l => l.id === activityLevel);
    const wk = workoutsPerWeek > 0 ? workoutsPerWeek : 0;
    const act = lvl ? Math.min(1.95, lvl.base + Math.min(0.25, wk * 0.05))
      : (workoutsPerWeek >= 5 ? 1.6 : workoutsPerWeek >= 3 ? 1.475 : workoutsPerWeek >= 1 ? 1.375 : 1.3);
    maint = bmr * act; method = "mifflin";
  } else { maint = w * 31; method = "weight"; }
  const kcalRaw = g === "cut" ? maint * 0.82 : g === "bulk" ? maint * 1.12 : maint;
  const kcal = Math.round(kcalRaw / 10) * 10;                        // avrundat till närmaste 10
  const perKgBase = g === "cut" ? 2.0 : g === "bulk" ? 1.8 : 1.6;    // högre protein i underskott skyddar muskel
  const perKg = dietApproach === "highprotein" ? Math.max(perKgBase, 2.1) : perKgBase;
  const protein = Math.round(w * perKg);
  let fat, carbs;
  if (dietApproach === "keto" || dietApproach === "lchf") {
    carbs = dietApproach === "keto" ? 30 : 80;                       // kolhydraterna kapas (g/dag), fett fyller resten
    fat = Math.max(0, Math.round((kcal - protein * 4 - carbs * 4) / 9));
  } else {
    fat = Math.round((kcal * 0.25) / 9);                            // ~25 % av energin från fett
    carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  }
  return { kcal, protein, carbs, fat, basis: { goal: g, weightKg: w, perKg, method, gender: gender || "unspecified", dietApproach: dietApproach || null } };
}

function resolveNutritionTargets(profile, mode) {
  if (mode === "demo") return { kcal: NUTRITION_GOALS.kcal, protein: NUTRITION_GOALS.protein, carbs: NUTRITION_GOALS.carbs, fat: NUTRITION_GOALS.fat, source: "demo", hasKcal: true, hasProtein: true, hasMacros: true };
  const nt = (profile && profile.nutritionTargets) || {};
  let acc = (profile && profile.nutritionSuggestionAccepted && profile.nutritionSuggestion) ? profile.nutritionSuggestion : null;
  // Håll ett accepterat ATLAS-förslag AKTUELLT: räkna om live om vikt eller kostmål ändrats sedan det
  // accepterades, så gamla makron aldrig ligger kvar. Egna angivna siffror (nt) rörs aldrig av detta.
  if (acc) {
    const curW = profile && profile.weight, curGoal = profile && profile.nutritionGoal, b = acc.basis || {};
    const stale = (typeof curW === "number" && curW > 0 && curW !== b.weightKg) || (curGoal && curGoal !== b.goal);
    if (stale) { const fresh = suggestNutritionTargets({ goal: curGoal || b.goal, weightKg: (typeof curW === "number" && curW > 0) ? curW : b.weightKg, gender: profile && profile.gender, age: profile && profile.age, heightCm: profile && profile.height, workoutsPerWeek: profile && profile.workoutsPerWeek, activityLevel: profile && profile.activityLevel, dietApproach: profile && profile.dietApproach }); if (fresh) acc = fresh; }
  }
  const kcal = typeof nt.kcal === "number" ? nt.kcal : (acc && typeof acc.kcal === "number" ? acc.kcal : null);
  const protein = typeof nt.protein === "number" ? nt.protein : (acc && typeof acc.protein === "number" ? acc.protein : null);
  const carbs = acc && typeof acc.carbs === "number" ? acc.carbs : null;   // bara från accepterat förslag
  const fat = acc && typeof acc.fat === "number" ? acc.fat : null;
  const userSet = typeof nt.kcal === "number" || typeof nt.protein === "number";
  return { kcal, protein, carbs, fat, source: userSet ? "user" : acc ? "atlas_suggestion" : "none", hasKcal: kcal != null, hasProtein: protein != null, hasMacros: carbs != null && fat != null };
}

// §12: nästa milstolpe ur användarens faktiska mål. Inga mål → null (gränssnittet visar "Inget aktivt mål ännu.").
function deriveMilestone(goals) {
  const list = (goals || []).filter(g => g && g.title);
  if (!list.length) return null;
  const scored = list.map(g => ({ title: g.title, pct: goalProgress(g), daysLeft: daysLeft(g.deadline) }));
  const open = scored.filter(x => x.pct < 100);
  const pool = open.length ? open : scored;
  pool.sort((a, b) => (a.daysLeft == null ? Infinity : a.daysLeft) - (b.daysLeft == null ? Infinity : b.daysLeft) || b.pct - a.pct);
  return pool[0];
}

// Måltidscoaching (endast dagens data) — ANVÄNDS EJ för readiness, bara för nästa-mål-tips.
function nutritionReadinessModifier(t, g) {
  const proteinPct = t.protein / g.protein, energyPct = t.kcal / g.kcal;
  return { proteinPct, energyPct, remainingKcal: Math.max(0, Math.round(g.kcal - t.kcal)), remainingProtein: Math.max(0, Math.round(g.protein - t.protein)) };
}
// ── §8: Central datakonfidens per analysdomän (används av readiness, coach, empty states) ──
// Nivåer: no_data / limited_data / sufficient_data / personal_model. Utvärderas SEPARAT per domän
// med EGNA trösklar. All konfiguration ligger i DOMAIN_RULES nedan — inga spridda 10/30-magiska tal.
const CONF_THRESH = { sufficient: 10, personal: 30 };                 // generisk standard (fallback)
// Per-domän-regler: sufficient/personal = min-antal relevanta prover; minSpanDays/personalSpanDays = krav på dokumenterad tidsrymd.
const DOMAIN_RULES = {
  training:          { sufficient: 10, personal: 30 },                                   // 0 / 1–9 / 10–29 / 30+
  muscle_recovery:   { sufficient: 10, personal: 30 },                                   // relevanta pass i återhämtningsfönstret
  readiness:         { sufficient: 10, personal: 30 },                                   // träningsbaserad — märks alltid som sådan
  weight_trend:      { sufficient: 3, personal: 8, minSpanDays: 14, personalSpanDays: 42 }, // 3+ punkter över ≥14 dagar; personlig modell kräver längre period
  measurement_trend: { sufficient: 3, personal: 8, minSpanDays: 14 },                    // per relevant mått-typ, inte blandat
  strength:          { sufficient: 5, personal: 15 },                                    // per övning — relevanta prestationer
  nutrition:         { sufficient: 3, personal: 14 },                                    // distinkta loggade dagar; personlig modell = flera veckor
  coach_longterm:    { sufficient: 10, personal: 30 },                                   // långtidsslutsatser kräver historik
};
function domainLevel(domain, n, spanDays) {
  const r = DOMAIN_RULES[domain] || CONF_THRESH;
  if (n <= 0) return "no_data";
  if (n < r.sufficient) return "limited_data";
  if (r.minSpanDays != null && (spanDays == null || spanDays < r.minSpanDays)) return "limited_data";
  if (n < r.personal) return "sufficient_data";
  if (r.personalSpanDays != null && (spanDays == null || spanDays < r.personalSpanDays)) return "sufficient_data";
  return "personal_model";
}
// Generisk nivå (standardtrösklar) — behålls för bakåtkompatibilitet och enkla anrop.
function confidenceLevel(n) { return domainLevel("__generic", n); }
const CONF_EXPL = {
  no_data: "Ingen relevant personlig data ännu.",
  limited_data: "Tidig uppskattning baserad på begränsad data.",
  sufficient_data: "Tillräckligt med data för bredare trender, men modellen lär sig fortfarande.",
  personal_model: "Bygger på din personliga historik.",
};
function dataConfidence(domain, ctx = {}) {
  const mk = (sampleCount, { relevantPeriod = "", missingInputs = [], availableInputs = [], numeric = null, note = "", spanDays = null } = {}) => {
    const level = domainLevel(domain, sampleCount, spanDays);
    const eligibleForNumericScore = numeric != null ? numeric : level !== "no_data";
    return { domain, level, sampleCount, spanDays, relevantPeriod, missingInputs, availableInputs, explanation: CONF_EXPL[level] + (note ? " " + note : ""), eligibleForNumericScore };
  };
  const sess = ctx.sessions || [];
  switch (domain) {
    case "training": return mk(sess.length, { relevantPeriod: "alla loggade pass", availableInputs: ["pass"] });
    case "muscle_recovery": return mk(ctx.relevantWorkouts != null ? ctx.relevantWorkouts : sess.length, { relevantPeriod: "14 dagar", availableInputs: ["träningsbelastning", "tid sedan pass"], note: "Resultatet är träningsbelastnings-baserat." });
    case "readiness": return mk(sess.length, { relevantPeriod: "senaste 7 dagarna", availableInputs: ["träningsbelastning"], missingInputs: ["sömn", "HRV", "vilopuls", "stress", "upplevd trötthet"], numeric: (ctx.recentLoad || 0) > 1, note: "Baseras endast på loggad träning — hälsodata (sömn/HRV) saknas, så detta är en träningsbaserad skattning, inte en komplett personlig readiness-modell." });
    case "weight_trend": return mk(ctx.weightPoints || 0, { relevantPeriod: "loggade vikter", availableInputs: ["vikt"], numeric: (ctx.weightPoints || 0) >= 2, spanDays: ctx.spanDays });
    case "measurement_trend": return mk(ctx.measurementPoints || 0, { relevantPeriod: "loggade mått (per typ)", availableInputs: ["mått"], numeric: (ctx.measurementPoints || 0) >= 2, spanDays: ctx.spanDays });
    case "strength": return mk(ctx.strengthSessions != null ? ctx.strengthSessions : 0, { relevantPeriod: "loggade prestationer för övningen", availableInputs: ["set", "vikt", "reps"], spanDays: ctx.spanDays });
    case "nutrition": return mk(ctx.nutritionDays || 0, { relevantPeriod: "distinkta loggade dagar", availableInputs: ["måltider"], missingInputs: (ctx.nutritionDays || 0) < 3 ? ["fler loggade dagar"] : [], numeric: (ctx.nutritionDays || 0) >= 1 });
    case "coach_longterm": return mk(sess.length, { relevantPeriod: "träningshistorik", availableInputs: ["pass"], numeric: sess.length >= 10, note: sess.length < 10 ? "Långsiktiga slutsatser kräver mer historik." : "" });
    default: return mk(0, {});
  }
}
// Kräver ≥3 rimligt kompletta dagar för en försiktig signal, ≥7 för tydlig trend.
// Ingen flerdagshistorik lagras ännu → returnerar alltid "insufficient" (neutral, påverkar ej readiness). PROTOTYP.
function nutritionReadinessSignal(dailyHistory) {
  const days = (dailyHistory || []).filter(d => d && d.complete).length;
  if (days < 3) return { status: "insufficient", mod: 0, message: "Inte tillräckligt tillförlitlig kosthistorik för att bedöma påverkan på återhämtning." };
  return { status: days >= 7 ? "trend" : "cautious", mod: 0, message: "Kostmönster följs över tid — påverkar inte dagens readiness direkt." };
}

function resolveSlug(view, slug) {
  if (slug === "deltoids") {
    return view === "anterior"
      ? { ids: ["deltoid_anterior", "deltoid_lateral"], primary: "deltoid_anterior" }
      : { ids: ["deltoid_posterior", "deltoid_lateral"], primary: "deltoid_posterior" };
  }
  const id = SLUG2ID[view][slug];
  return id ? { ids: [id], primary: id } : null;
}

function repState(ids, ms) {
  const withData = ids.map(i => ms[i]).filter(s => s && s.status !== "no_data");
  if (!withData.length) return ms[ids[0]];
  return withData.reduce((a, b) => (b.recoveryScore < a.recoveryScore ? b : a));
}

function repActivation(ids, am) {
  let best = null;
  ids.forEach(i => { const l = am[i]; if (l && (best === null || ACT_RANK[l] > ACT_RANK[best])) best = l; });
  return best;
}

function bestRecoveredMuscle(ms, exclude) {
  const e = Object.entries(ms).filter(([id, s]) => s.status !== "no_data" && !exclude.includes(id));
  if (!e.length) return null;
  return e.sort((a, b) => b[1].recoveryScore - a[1].recoveryScore)[0];
}

function coachFor(ex, ms) {
  if (!ex) return { tone: T.accent.secondary, text: "Välj en övning — jag visar vilka muskler den tränar och hur redo de är." };
  const prim = ex.activation.filter(a => a.factor >= 0.8).map(a => a.muscleId);
  const ids = (prim.length ? prim : ex.activation.map(a => a.muscleId));
  const rated = ids.map(id => ({ id, r: ms[id] ? ms[id].recoveryScore : 100 })).sort((a, b) => a.r - b.r);
  const w = rated[0], nm = MUSCLES[w.id] ? MUSCLES[w.id].name : w.id;
  const alt = bestRecoveredMuscle(ms, ex.activation.map(a => a.muscleId));
  const altClause = alt ? ` eller byt till ${MUSCLES[alt[0]].name.toLowerCase()} (${alt[1].recoveryScore}%)` : "";
  if (w.r < 40) return { tone: T.accent.danger, text: `⚠ ${nm} är bara på ${w.r}% återhämtning. Vila den${altClause}.` };
  if (w.r < 60) return { tone: T.accent.warning, text: `${nm} är på ${w.r}% — kör lätt vikt och fokusera på teknik${altClause}.` };
  if (w.r < 76) return { tone: T.accent.warning, text: `${nm} är på ${w.r}% — kör moderat vikt${altClause}.` };
  return { tone: T.accent.success, text: `${nm} är redo (${w.r}%). Kör tungt med bra teknik och full rörlighet.` };
}

function subExercise(ex, equip) {
  if (equip.includes(ex.equipment)) return ex;
  const primary = ex.activation.filter(a => a.factor >= 0.8).map(a => a.muscleId);
  let best = null, bs = -1;
  EXERCISES.forEach(e => {
    if (!equip.includes(e.equipment) || e.id === ex.id) return;
    const shared = e.activation.filter(a => a.factor >= 0.8 && primary.includes(a.muscleId)).length;
    if (!shared) return;
    const sc = shared * 10 + (e.group === ex.group ? 3 : 0) + (e.pattern === ex.pattern ? 2 : 0);
    if (sc > bs) { bs = sc; best = e; }
  });
  return best;
}

function epley1RM(weight, reps) { return reps <= 1 ? weight : Math.round(weight * (1 + reps / 30)); }

function roundInc(w) { return Math.round(w / 1.25) * 1.25; }

function lastPerformance(sessions, exId) {
  const withEx = sessions.filter(s => s.sets && s.sets.some(x => x.exerciseId === exId)).sort((a, b) => b.completedAt - a.completedAt);
  if (!withEx.length) return null;
  const sets = withEx[0].sets.filter(x => x.exerciseId === exId);
  return sets.slice().sort((a, b) => (b.weight || 0) - (a.weight || 0) || (b.reps || 0) - (a.reps || 0))[0];
}

// Alla set för en övning från det senaste passet där den utfördes (i loggad ordning).
// Används av "Kopiera förra passet" så hela set×rep×vikt-schemat kan återskapas med ett tryck.
function lastSessionSets(sessions, exId) {
  const withEx = (sessions || []).filter(s => s.sets && s.sets.some(x => x.exerciseId === exId)).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  if (!withEx.length) return null;
  const s = withEx[0];
  const sets = s.sets.filter(x => x.exerciseId === exId).map(x => ({ weight: x.weight ?? null, reps: x.reps ?? null, rpe: x.rpe ?? null }));
  return { sets, completedAt: s.completedAt, count: sets.length };
}

function best1RM(sessions, exId) {
  let best = 0;
  sessions.forEach(s => (s.sets || []).forEach(x => { if (x.exerciseId === exId && x.weight) best = Math.max(best, epley1RM(x.weight, x.reps)); }));
  return best;
}

function progressionSuggestion(exId, sessions, targetReps) {
  const ex = EXERCISES.find(e => e.id === exId);
  if (!ex || ex.loadMode !== "external") return null;
  const prev = lastPerformance(sessions, exId);
  if (!prev || prev.weight == null) return null;
  const inc = /squat|deadlift|press|bench|row|ohp|rdl|hip_thrust/.test(exId) ? 2.5 : 1.25;
  const t = targetReps || prev.reps || 8;
  let weight = prev.weight, reps = t, note;
  if (prev.rpe && prev.rpe >= 9.5) { weight = roundInc(prev.weight * 0.95); note = `Tungt sist (RPE ${prev.rpe}) — backa lite.`; }
  else if ((prev.reps || 0) >= t && (!prev.rpe || prev.rpe <= 8)) { weight = prev.weight + inc; note = "Klart sist — öka vikten."; }
  else if ((prev.reps || 0) < t) { weight = prev.weight; reps = Math.min(t, (prev.reps || 0) + 1); note = "Sikta på en rep till på samma vikt."; }
  else { weight = prev.weight + inc; note = "Öka lätt."; }
  return { weight: roundInc(weight), reps, prev, note };
}

// Kanonisk mätvärdes-tidsserie: measurements[] = [{date, weight?, waist?, bodyFat?, ...}] är enda källan.
function metricSeries(measurements, key) {
  return (measurements || []).filter(m => m && typeof m[key] === "number").sort((a, b) => a.date - b.date).map(m => ({ date: m.date, value: m[key] }));
}
function latestMetric(measurements, key) {
  const s = metricSeries(measurements, key);
  return s.length ? s[s.length - 1].value : null;
}
// Kanonisk viktkälla: senaste loggade vikt → profilvikt → fallback (enda sanningen för aktuell vikt)
function currentWeight(profile, measurements) {
  const w = latestMetric(measurements, "weight");
  if (w != null) return w;
  if (profile && typeof profile.weight === "number") return profile.weight;
  return BODYWEIGHT;
}
function strengthLevel(exId, oneRM, bodyweight = BODYWEIGHT) {
  const std = STRENGTH_STD[exId]; if (!std || !oneRM) return null;
  const r = oneRM / (bodyweight || BODYWEIGHT);
  const level = r >= std[2] ? "Avancerad" : r >= std[1] ? "Medel" : r >= std[0] ? "Nybörjare" : "Otränad";
  const col = { Avancerad: "#FF5C5C", Medel: "#4DA3FF", Nybörjare: "#39D98A", Otränad: "#687385" }[level];
  return { level, col, ratio: r };
}

function polyArea(pts) {
  const p = pts.split(" ").map(s => s.split(",").map(Number));
  let a = 0; for (let i = 0; i < p.length; i++) { const j = (i + 1) % p.length; a += p[i][0] * p[j][1] - p[j][0] * p[i][1]; }
  return Math.abs(a / 2);
}

function sessionVolume(s) { return Object.values(s.muscleLoads || {}).reduce((a, b) => a + b, 0); }

function liftTrend(sessions, exId) {
  const pts = [];
  sessions.forEach(s => { let b = 0; (s.sets || []).forEach(x => { if (x.exerciseId === exId && x.weight) b = Math.max(b, epley1RM(x.weight, x.reps)); }); if (b) pts.push({ t: s.completedAt, v: b }); });
  pts.sort((a, b) => a.t - b.t);
  if (pts.length < 2) return null;
  const first = pts[0], last = pts[pts.length - 1];
  return { spanD: Math.round((last.t - first.t) / 864e5), pct: Math.round((last.v - first.v) / first.v * 100), n: pts.length, last: last.v };
}

function prioritizeInsights(list, mode, goals) {
  const w = MODE_WEIGHTS[mode] || {};
  const strengthGoal = Array.isArray(goals) && goals.some(g => /styrka|1rm|\bkg\b|press|böj|mark|lyft/i.test((g.title || g.name || g.label || "")));
  return list.map((it, i) => {
    let score = it.sev * 100;              // safety(4)/critical(3)/warning(2)/info(1)
    score += (w[it.kind] || 0) * 8;        // active mode
    if (strengthGoal && (it.kind === "progress" || it.kind === "plateau")) score += 6;  // goal relevance
    if (it.action) score += 3;             // actionability
    score += (list.length - i) * 0.1;      // stable tiebreak
    return { ...it, score };
  }).sort((a, b) => b.score - a.score);
}

function computeInsights(sessions, muscleStates, goals, nutri, mode, now, proteinTarget = null) {
  const nm = id => MUSCLES[id] ? MUSCLES[id].name : id;
  const out = [];
  const lastTrained = {};
  sessions.forEach(s => { const ml = s.muscleLoads || {}; Object.keys(ml).forEach(id => { if (ml[id] > 0) lastTrained[id] = Math.max(lastTrained[id] || 0, s.completedAt); }); });
  // overload (safety)
  Object.entries(muscleStates).forEach(([id, s]) => { if (s.status === "critical") out.push({ kind: "overload", sev: 4, tone: "danger", icon: "alert-circle", title: `${nm(id)} behöver mer återhämtning`, body: `${s.recoveryScore}% återhämtad just nu.`, why: `Låg återhämtningsnivå (${s.recoveryScore}%).`, action: `Undvik tung ${nm(id).toLowerCase()}-träning 1–2 dagar till.` }); });
  // weekly volume vs landmarks
  Object.keys(VOLUME_LANDMARKS).forEach(g => {
    const sets = groupWeeklySets(sessions, g, now), vs = volumeStatus(sets, g); if (!vs) return;
    if (sets > vs.lm.mrv) out.push({ kind: "volume_high", sev: 4, tone: "danger", icon: "alert-triangle", title: `Hög volym: ${GROUP_SV[g] || g}`, body: `${sets} set denna vecka — över din MRV (${vs.lm.mrv}).`, why: `Veckovolym ${sets} set, över ditt vanliga spann (MRV ${vs.lm.mrv}) — hög total belastning.`, action: "Dra ner 2–4 set nästa vecka." });
    else if (sets > 0 && sets < vs.lm.mev) out.push({ kind: "volume_low", sev: 1, tone: "primary", icon: "trending-down", title: `Låg volym: ${GROUP_SV[g] || g}`, body: `${sets} set denna vecka — under MEV (${vs.lm.mev}).`, why: `Veckovolym ${sets} set < MEV ${vs.lm.mev} → för lite stimulans.`, action: "Lägg till 1–2 set för att driva utveckling." });
  });
  // neglected muscles
  Object.keys(MUSCLES).forEach(id => { const lt = lastTrained[id]; const days = lt ? Math.floor((now - lt) / 864e5) : null; if (days != null && days >= 10) out.push({ kind: "neglect", sev: 2, tone: "warning", icon: "clock", title: `${nm(id)} tränas för sällan`, body: `Inte tränad på ${days} dagar.`, why: `Senaste belastning för ${days} dagar sedan.`, action: `Lägg in ${nm(id).toLowerCase()} i nästa pass.` }); });
  // plateau / progress on main lifts
  MAIN_LIFTS.forEach(([ex, lab]) => {
    const t = liftTrend(sessions, ex); if (!t) return;
    if (t.pct >= 5 && t.spanD >= 10) out.push({ kind: "progress", sev: 1, tone: "success", icon: "trending-up", title: `${lab} +${t.pct}%`, body: `+${t.pct}% på ${t.spanD} dagar (est. 1RM ${t.last} kg).`, why: `Est. 1RM-trend stigande över ${t.spanD} dagar.`, action: "Fortsätt progressiv överbelastning." });
    else if (Math.abs(t.pct) <= 2 && t.spanD >= 21 && t.n >= 3) out.push({ kind: "plateau", sev: 2, tone: "warning", icon: "minus", title: `${lab} står stilla`, body: `Ingen ökning på ~${t.spanD} dagar.`, why: `Est. 1RM oförändrad över ${t.spanD} dagar (${t.n} pass).`, action: "Byt rep-range eller kör en deload-vecka." });
  });
  // frequency
  const last7 = sessions.filter(s => now - s.completedAt < 7 * 864e5).length;
  if (last7 === 0) out.push({ kind: "frequency_low", sev: 2, tone: "primary", icon: "calendar", title: "Inga pass denna vecka", body: "Konsekvens slår intensitet.", why: "0 loggade pass senaste 7 dagarna.", action: "Kör ett kort pass idag för att hålla vanan." });
  else if (last7 >= 6) out.push({ kind: "frequency_high", sev: 2, tone: "warning", icon: "flame", title: "Hög träningsfrekvens", body: `${last7} pass på 7 dagar.`, why: `${last7} pass senaste 7 dagarna → hög systemisk belastning.`, action: "Planera en lättare dag och prioritera sömn/protein." });
  // symmetry: push vs pull
  const chest = groupWeeklySets(sessions, "chest", now), back = groupWeeklySets(sessions, "back", now);
  if (chest + back >= 6) { const r = chest / Math.max(1, back); if (r >= 1.6) out.push({ kind: "balance", sev: 2, tone: "warning", icon: "scale", title: "Bröst > rygg i volym", body: `${chest} vs ${back} set denna vecka.`, why: `Kvot bröst/rygg ${r.toFixed(1)} → obalans.`, action: "Lägg till ryggvolym för hållning och axelhälsa." }); else if (r <= 0.62) out.push({ kind: "balance", sev: 1, tone: "primary", icon: "scale", title: "Rygg > bröst i volym", body: `${back} vs ${chest} set — bra ryggfokus.`, why: `Kvot bröst/rygg ${r.toFixed(1)}.`, action: "Håll koll så bröstet inte hamnar efter." }); }
  // protein — endast om ett riktigt proteinmål finns (inget påhittat 148 g-standardmål i Real Mode)
  if (proteinTarget != null) {
    const pg = proteinTarget - ((nutri && nutri.protein) || 0);
    if (pg > 25) out.push({ kind: "protein", sev: 2, tone: "warning", icon: "beef", title: "Lågt proteinintag", body: `${pg} g under målet (${proteinTarget} g).`, why: `Intag ${(nutri && nutri.protein) || 0} g mot mål ${proteinTarget} g.`, action: "Fyll på protein — det driver återhämtningen." });
  }
  return prioritizeInsights(out, mode, goals);
}

function bestStrengthTrend(sessions) {
  let best = null;
  MAIN_LIFTS.forEach(([ex, lab]) => { const t = liftTrend(sessions, ex); if (t && t.spanD >= 10 && (!best || t.pct > best.pct)) best = { ...t, lab }; });
  return best;
}

function coachGreeting() { const h = new Date().getHours(); return h < 10 ? "God morgon" : h < 18 ? "Hej" : "God kväll"; }

function buildBriefing(name, readiness, ready, fatigued, recommendation, trend) {
  const nm = id => MUSCLES[id] ? MUSCLES[id].name : id;
  const s = [`${coachGreeting()}${name ? " " + name : ""}. Din beredskap är ${readiness}%.`];
  if (ready.length) s.push(`${ready.slice(0, 2).map(([id]) => nm(id)).join(" och ")} är återhämtade.`);
  if (fatigued.length) s.push(`${fatigued.slice(0, 2).map(([id]) => nm(id)).join(" och ")} bär fortfarande trötthet.`);
  if (recommendation) s.push(`Jag föreslår ${recommendation.title} idag.`);
  if (trend && trend.pct >= 3) s.push(`Din ${trend.lab.toLowerCase()} pekar uppåt (+${trend.pct}%).`);
  return s;
}

function buildUserModel(sessions, now) {
  if (!sessions || !sessions.length) return null;
  const dow = [0, 0, 0, 0, 0, 0, 0], dn = ["sön", "mån", "tis", "ons", "tor", "fre", "lör"];
  sessions.forEach(s => dow[new Date(s.completedAt).getDay()]++);
  const topDays = dow.map((c, i) => [i, c]).sort((a, b) => b[1] - a[1]).filter(x => x[1] > 0).slice(0, 2).map(x => dn[x[0]]);
  const first = Math.min(...sessions.map(s => s.completedAt));
  const span = Math.max(1, (now - first) / (7 * 864e5));
  const freq = (sessions.length / span).toFixed(1);
  const exCount = {};
  sessions.forEach(s => (s.sets || []).forEach(x => { if (x.exerciseId) exCount[x.exerciseId] = (exCount[x.exerciseId] || 0) + 1; }));
  const exName = id => { const e = EXERCISES.find(e => e.id === id); return e ? e.name : id; };
  const fav = Object.entries(exCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => exName(id));
  return { topDays, freq, fav, count: sessions.length };
}

function buildPredictions(sessions) {
  const out = [];
  MAIN_LIFTS.forEach(([ex, lab]) => {
    const t = liftTrend(sessions, ex); if (!t || t.pct < 3 || t.spanD < 14) return;
    const startV = t.last / (1 + t.pct / 100), gain = (t.last - startV) / (t.spanD / 7);   // kg/week
    if (gain <= 0.05) return;
    const target = Math.ceil((t.last + 2.5) / 5) * 5, weeks = (target - t.last) / gain;
    if (weeks <= 0 || weeks > 52) return;
    out.push({ lab, target, cur: Math.round(t.last), range: `${Math.max(1, Math.floor(weeks * 0.8))}–${Math.ceil(weeks * 1.2)} veckor` });
  });
  return out;
}

function analyzeExercise(sessions, exId) {
  const pts = [];
  sessions.forEach(s => { let b = 0, vol = 0; (s.sets || []).forEach(x => { if (x.exerciseId === exId && x.weight) { b = Math.max(b, epley1RM(x.weight, x.reps)); vol += x.weight * (x.reps || 0); } }); if (b) pts.push({ t: s.completedAt, e1: b, vol }); });
  pts.sort((a, b) => a.t - b.t);
  if (pts.length < 4) return null;
  const first = pts[0], last = pts[pts.length - 1], spanD = Math.round((last.t - first.t) / 864e5);
  const half = Math.floor(pts.length / 2);
  const volEarly = pts.slice(0, half).reduce((a, p) => a + p.vol, 0) / Math.max(1, half);
  const volLate = pts.slice(half).reduce((a, p) => a + p.vol, 0) / Math.max(1, pts.length - half);
  return { n: pts.length, spanD, e1pct: Math.round((last.e1 - first.e1) / first.e1 * 100), volPct: Math.round((volLate - volEarly) / Math.max(1, volEarly) * 100), lastE1: Math.round(last.e1) };
}

function detectAdaptive(sessions, muscleStates, now) {
  const findings = [], seen = new Set();
  const OPTS = ["Stark men fastnat", "Tung redan från första setet", "Leden/muskeln känns sliten", "Jag tappar motivationen", "Svårt att säga"];
  ADAPTIVE_EXERCISES.forEach(([ex, lab]) => {
    if (seen.has(ex)) return; seen.add(ex);
    const a = analyzeExercise(sessions, ex); if (!a || a.spanD < 21) return;
    const weeks = Math.max(1, Math.round(a.spanD / 7));
    const obsConf = Math.min(95, 45 + weeks * 5 + a.n * 3);
    if (Math.abs(a.e1pct) <= 2) {
      if (a.volPct >= 20) findings.push({ kind: "volume_mismatch", lab, obsConf, causeConf: 40, observation: `Volymen för ${lab.toLowerCase()} har ökat ${a.volPct}% på ~${weeks} veckor, men uppskattad styrka är i princip oförändrad (${a.n} pass).`, question: `Hur känns ${lab.toLowerCase()} just nu?`, options: OPTS, A: "Minska volymen ~15 % i två veckor (deload), kör sedan igång igen.", B: "Behåll volymen men byt övningsvariant i 4 veckor och jämför." });
      else findings.push({ kind: "strength_plateau", lab, obsConf, causeConf: 45, observation: `Din uppskattade styrka i ${lab.toLowerCase()} har stått stilla i ~${weeks} veckor (${a.n} pass).`, question: `Hur känns ${lab.toLowerCase()} just nu?`, options: OPTS, A: "Byt rep-range eller lägg in en deload-vecka.", B: "Öka intensiteten (tyngre, färre reps) i 3 veckor." });
    }
  });
  return findings;
}

function plateauResponse(f, idx) {
  if (idx === 1 || idx === 2) return { pick: "A", text: f.A, why: "Din upplevelse (tung/sliten) pekar mot trötthet snarare än behov av mer volym." };
  if (idx === 0) return { pick: "B", text: f.B, why: "Känns du stark men fastnad är variation/intensitet oftast bättre än mer av samma." };
  if (idx === 3) return { pick: "A", text: "En lättare deload-vecka kan ge både kropp och motivation en nystart.", why: "Motivationsdipp plus platå = ofta dags för en planerad paus." };
  return { pick: "?", text: "Då samlar jag mer data innan jag föreslår en förändring.", why: "Låg säkerhet — jag vill inte gissa." };
}

function analyzeBodyComp(measurements, goals) {
  if (!measurements || measurements.length < 3) return null;
  const s = [...measurements].sort((a, b) => a.date - b.date), first = s[0], last = s[s.length - 1];
  const spanD = Math.round((last.date - first.date) / 864e5); if (spanD < 21) return null;
  const dW = +(last.weight - first.weight).toFixed(1);
  const dWaist = (last.waist != null && first.waist != null) ? +(last.waist - first.waist).toFixed(1) : null;
  if (Math.abs(dW) < 0.6 && (dWaist == null || Math.abs(dWaist) < 1)) {
    return { spanD, weeks: Math.round(spanD / 7),
      observation: `De senaste ~${Math.round(spanD / 7)} veckorna har din vikt ändrats ${dW > 0 ? "+" : ""}${dW} kg${dWaist != null ? ` och midjemåttet ${dWaist > 0 ? "+" : ""}${dWaist} cm` : ""} — i princip oförändrat.`,
      question: "Hur tycker du själv att kosten känns?",
      options: ["Jag är ofta hungrig", "Det fungerar bra", "Jag småäter ibland", "Helgerna är svåra", "Jag loggar inte allt"],
      responses: {
        0: { text: "Då ska vi inte skära hårdare — hunger på en platå leder oftast till bakslag. Vi ser över mättnad (protein/fiber) i stället.", why: "Hunger + platå = risk för överätning; hårdare underskott är sällan svaret." },
        1: { text: "Känns kosten bra men vikten står still verkar intaget matcha förbrukningen. Ett litet, tillfälligt underskott kan starta rörelse igen.", why: "Stabilt intag + platå = nära energibalans." },
        2: { text: "Småätandet kan vara den dolda skillnaden. Vi testar att logga allt i en vecka innan vi ändrar målet.", why: "Oregistrerat intag förklarar ofta en platå." },
        3: { text: "Då tror jag inte vi ska sänka ditt dagliga mål. Vardagen ser stabil ut — vi testar en fördelning där du får mer utrymme fre–sön.", why: "Variationen helg vs vardag, inte vardagsnivån, verkar vara problemet." },
        4: { text: "Låt oss börja med en vecka fullständig loggning — jag vill inte gissa om underlaget är ofullständigt.", why: "Låg datakvalitet → jag frågar hellre än gissar." },
      } };
  }
  return null;
}

function readImage(cb) {
  return e => { const f = e.target.files && e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => cb(ev.target.result); r.readAsDataURL(f); e.target.value = ""; };
}

function hexToRgb(h) { const n = parseInt(h.replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

function zoneMuscle(frame, nx, ny) {
  const bands = BODY_ZONES[frame] || BODY_ZONES[0];
  for (const [yMax, m] of bands) { if (ny <= yMax) return Array.isArray(m) ? ((nx < 0.36 || nx > 0.64) ? m[0] : m[1]) : m; }
  return "calves";
}

function bodyGlow(st) {
  if (!st) return null;
  const score = st.recoveryScore != null ? st.recoveryScore : 100;
  const f = Math.max(0, Math.min(1, 1 - score / 100));
  switch (st.status) {
    case "ready": return { c: [40, 220, 175], a: 0.42 };
    case "nearly_ready": return { c: [255, 190, 95], a: 0.4 + f * 0.28 };
    case "recovering": return { c: [255, 150, 45], a: 0.48 + f * 0.34 };
    case "critical": return { c: [210, 35, 58], a: 0.6 + f * 0.3 };
    case "undertrained": return { c: [40, 135, 255], a: 0.58 };
    default: return null;
  }
}

function groupState(group, ms) {
  const src = GROUP_SOURCES[group] || [group];
  const arr = src.map(id => ms && ms[id]).filter(Boolean);
  if (!arr.length) return null;
  return arr.reduce((a, b) => (a.recoveryScore <= b.recoveryScore ? a : b));
}

function recoveryColor(score) {
  const f = Math.max(0, Math.min(1, 1 - score / 100));
  let r, g, b;
  if (f < 0.5) { const t = f / 0.5; r = Math.round(55 + t * 200); g = Math.round(214 - t * 44); b = Math.round(130 - t * 90); }
  else { const t = (f - 0.5) / 0.5; r = 255; g = Math.round(170 - t * 135); b = Math.round(40 + t * 18); }
  return `rgb(${r},${g},${b})`;
}

export { computeSessionLoad, computeRecovery, muscleWeeklySets, recoveryContributions, volumeStatus, groupWeeklySets, laggingMuscleAdvice, laggingGroups, balanceScore, variationAdvice, computeReadiness, computeRecommendation, computeSportLoad, computeCardioLoad, computeSystemicFatigue, importLivsmedelsverket, foldStr, triSet, triSim, editDist, scoreFood, searchFoods, lookupBarcode, goalProgress, daysLeft, estimateMeal, mealDecision, dayNutritionRange, qualityColor, buildRescue, recentIntakeSummary, nutritionProgress, interpretCrisis, normMeal, matchMemory, rememberMeal, computeNutrition, nutritionReadinessModifier, nutritionReadinessSignal, dataConfidence, confidenceLevel, domainLevel, DOMAIN_RULES, resolveSlug, repState, repActivation, bestRecoveredMuscle, coachFor, subExercise, epley1RM, roundInc, lastPerformance, lastSessionSets, best1RM, progressionSuggestion, strengthLevel, currentWeight, latestMetric, metricSeries, polyArea, sessionVolume, liftTrend, prioritizeInsights, computeInsights, bestStrengthTrend, coachGreeting, buildBriefing, buildUserModel, buildPredictions, analyzeExercise, detectAdaptive, plateauResponse, analyzeBodyComp, readImage, hexToRgb, zoneMuscle, bodyGlow, groupState, recoveryColor, startOfLocalDay, workoutStreak, milestones, sevenDayTrainingLoad, deriveTrainingMetrics, distinctNutritionDays, resolveNutritionTargets, suggestNutritionTargets, ACTIVITY_LEVELS, DIETS, DIET_APPROACHES, DIET_RESTRICTIONS, deriveMilestone, exerciseStrengthConfidence, cyclePhase, cycleReadinessModifier, CYCLE_PHASES, computeMicros, microRef, MICRO_REF, MICRO_KEYS, recentDailyMicros, supplementAdvice, recentDailyNutrition, nutritionRecoveryModifier, readinessBreakdown, logReliability, personalInsight };
