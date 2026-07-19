// ENGINE: ATLAS coach för program — analyserar aktivt program mot loggad historik, återhämtning,
// följsamhet, RPE/RIR, muskelvolym och andra aktiviteter (Muay Thai/löpning/lagsport).
// Producerar OBSERVATIONER (märkta mätdata/feedback/estimat) och små REVERSIBLA FÖRSLAG som
// kräver användarens godkännande. Ändrar aldrig ett aktivt program tyst.
import { EXERCISES } from "../data/exercises.js";
import { weeklyVolume, groupSv, MUSCLE_GROUPS, WEEKDAYS, alternativesFor } from "./programs.js";

const COMPOUND = ["Squat", "Hinge", "Lunge", "Horizontal Push", "Incline Push", "Vertical Push", "Horizontal Pull", "Vertical Pull"];
const isCompound = e => e && COMPOUND.includes(e.pattern);
const DAY = 86400000;
export const EVIDENCE = { measured: { label: "Mätdata", c: "#4DA3FF" }, feedback: { label: "Din feedback", c: "#9B7CFF" }, estimate: { label: "ATLAS-estimat", c: "#687385" } };

function progSessions(program, sessions) {
  return (sessions || []).filter(s => s.programId === program.id).sort((a, b) => (a.completedAt || 0) - (b.completedAt || 0));
}
export function adherence(program, sessions, weeks = 2) {
  const since = Date.now() - weeks * 7 * DAY;
  const done = progSessions(program, sessions).filter(s => (s.completedAt || 0) >= since).length;
  const expected = (program.daysPerWeek || program.workouts.length) * weeks;
  return { done, expected, rate: expected ? done / expected : 0, perWeek: Math.round(done / weeks) };
}
export function recentActivities(sessions, days = 14) {
  const since = Date.now() - days * DAY;
  const sp = (sessions || []).filter(s => s.source === "sport" && (s.completedAt || 0) >= since);
  const byName = {}; sp.forEach(s => { const n = (s.title || "Aktivitet").replace(/ \(HIIT\)$/, ""); byName[n] = (byName[n] || 0) + 1; });
  return Object.entries(byName).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}
function avgRpe(sessions, n = 3) {
  const rec = [...sessions].slice(-n); const r = [];
  rec.forEach(s => (s.sets || []).forEach(x => { if (x.rpe != null) r.push(x.rpe); }));
  return r.length ? r.reduce((a, b) => a + b, 0) / r.length : null;
}
function topWeightSeries(sessions, exId) {
  const out = [];
  sessions.forEach(s => { const w = (s.sets || []).filter(x => x.exerciseId === exId).map(x => x.weight || 0); if (w.length) out.push(Math.max(...w)); });
  return out;
}
const uid = p => `${p}_${Math.random().toString(36).slice(2, 8)}`;
function firstExerciseForGroup(group, equip, existing) {
  const pool = EXERCISES.filter(e => e.group === group && (!equip || !equip.length || equip.includes(e.equipment)) && !existing.has(e.id));
  return pool.sort((a, b) => (isCompound(b) ? 1 : 0) - (isCompound(a) ? 1 : 0))[0] || EXERCISES.find(e => e.group === group);
}
function spread(days) { const map = { 1: [2], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 3, 4, 5], 6: [0, 1, 2, 3, 4, 5] }; return (map[days] || map[3]).map(i => WEEKDAYS[i]); }

// ── Huvudanalys ──
export function analyzeProgram({ program, sessions = [], readiness = null }) {
  if (!program) return { observations: [], proposals: [], adherence: null, activities: [] };
  const ps = progSessions(program, sessions);
  const adh = adherence(program, sessions);
  const acts = recentActivities(sessions);
  const vol = weeklyVolume(program);
  const equip = program.equipment || [];
  const observations = [], proposals = [];
  const O = (evidence, severity, title, detail) => observations.push({ id: uid("obs"), evidence, severity, title, detail });
  const P = pr => proposals.push({ id: uid("prop"), ...pr });

  // 1) Saknad stor muskelgrupp (mätdata) — strukturell, alltid ok
  ["Chest", "Back", "Legs", "Shoulders"].forEach(g => {
    if ((vol[g] || 0) === 0) {
      O("measured", "warn", `Ingen direkt volym för ${groupSv(g)}`, `Programmet har inga arbetsset för ${groupSv(g).toLowerCase()} — en lucka för balanserad utveckling.`);
      P({
        kind: "add-exercise", evidence: "measured", severity: "warn",
        title: `Lägg till en ${groupSv(g).toLowerCase()}-övning`,
        why: `${groupSv(g)} tränas inte direkt. En sammansatt övning täcker luckan utan att öka belastningen mycket.`,
        expectedEffect: `+3 set/vecka för ${groupSv(g).toLowerCase()}, jämnare fördelning.`,
        diffText: () => { const ex = firstExerciseForGroup(g, equip, existingIds(program)); const wi = smallestWorkout(program); return `Lägg till “${ex ? ex.name : g}” i ${program.workouts[wi].name} (3×8–12).`; },
        note: `La till ${groupSv(g).toLowerCase()}-övning`,
        mutate: c => { const ex = firstExerciseForGroup(g, equip, existingIds(program)); if (!ex) return; const wi = smallestWorkout(program); c.workouts[wi].exercises.push({ exId: ex.id, sets: 3, repMin: 8, repMax: 12, rir: 2, restSec: 90, progression: "Dubbel progression (reps → vikt)" }); },
      });
    }
  });

  // 2) Orealistiskt hög volym (mätdata)
  MUSCLE_GROUPS.forEach(g => {
    if ((vol[g] || 0) > 22) {
      O("measured", "warn", `Hög volym för ${groupSv(g)} (${vol[g]} set/v)`, `Över ~22 set/vecka ger ofta avtagande avkastning och sämre återhämtning.`);
      P({
        kind: "reduce-volume", evidence: "measured", severity: "warn",
        title: `Sänk volymen för ${groupSv(g).toLowerCase()} något`,
        why: `${vol[g]} set/vecka är i överkant. Ett set mindre på de tyngsta övningarna räcker ofta.`,
        expectedEffect: `≈ -${countGroupExercises(program, g)} set/vecka, bättre återhämtning — behåll om du svarar bra.`,
        diffText: () => `-1 set på ${groupSv(g).toLowerCase()}-övningar (behåller övningsval).`,
        note: `Sänkte ${groupSv(g).toLowerCase()}-volym`,
        mutate: c => c.workouts.forEach(w => w.exercises.forEach(x => { const e = EXERCISES.find(z => z.id === x.exId); if (e && e.group === g && x.sets > 2) x.sets -= 1; })),
      });
    }
  });

  // 3) Dålig återhämtningsspridning (mätdata)
  const wk = program.weekdays || [];
  const bad = consecutiveOverlap(program);
  if (bad && wk.length === program.workouts.length) {
    O("measured", "info", "Passen ligger tätt inpå varandra", `${bad} tränar liknande muskler på dagar som följer direkt på varandra.`);
    const proposed = spread(program.workouts.length);
    P({
      kind: "respread-days", evidence: "measured", severity: "info",
      title: "Sprid ut träningsdagarna",
      why: "Muskler växer under vila. Att sprida passen jämnare ger bättre återhämtning mellan liknande pass.",
      expectedEffect: "Minst en vilodag mellan pass som tränar samma muskler.",
      diffText: () => `Veckodagar: ${wk.join(", ")} → ${proposed.join(", ")}.`,
      note: "Spred ut träningsdagarna",
      mutate: c => { c.weekdays = proposed; },
    });
  }

  // 4) Möjlig platå (mätdata) — kräver historik + följsamhet + upprepad evidens
  if (ps.length >= 6 && adh.rate >= 0.5) {
    const mains = new Set();
    program.workouts.forEach(w => w.exercises.slice(0, 2).forEach(x => mains.add(x.exId)));
    for (const exId of mains) {
      const series = topWeightSeries(ps, exId); if (series.length < 5) continue;
      const recent = series.slice(-4), priorMax = Math.max(...series.slice(0, -4), 0);
      if (Math.max(...recent) <= priorMax) {   // ingen ny topp på 4 pass
        const e = EXERCISES.find(z => z.id === exId);
        O("measured", "info", `${e ? e.name : exId} har planat ut`, `Toppvikten har inte ökat på ${recent.length} loggade pass (${series.length} totalt). Kan vara en platå — inte en enskild dålig dag.`);
        P({
          kind: "plateau", evidence: "measured", severity: "info",
          title: `Bryt platån på ${e ? e.name : "övningen"}`,
          why: "Efter en stillastående period hjälper variation: bredare rep-spann + RPE-styrning, eller en lätt deload.",
          expectedEffect: "Ny stimulans utan att kasta bort det som fungerar — behåll om PR kommer tillbaka.",
          followUp: { question: "Hur har de senaste passen känts?", options: ["Tunga/slitna", "Okej", "Lätta men ingen ökning"] },
          diffText: () => `${e ? e.name : "Övningen"}: progression → RPE-styrd, rep-spann +2 i topp.`,
          note: "Justerade progression mot platå",
          mutate: c => c.workouts.forEach(w => w.exercises.forEach(x => { if (x.exId === exId) { x.progression = "RPE-styrd"; x.repMax = Math.min(20, x.repMax + 2); } })),
        });
        break;   // ett förslag i taget
      }
    }
  }

  // 5) För hög trötthet (estimat + feedback) — inte på en enda dålig dag
  const rpe = avgRpe(ps, 3);
  const last7 = ps.filter(s => (s.completedAt || 0) >= Date.now() - 7 * DAY).length;
  if (readiness != null && readiness < 55 && (last7 >= (program.daysPerWeek || 3) || (rpe != null && rpe >= 8.5))) {
    O(rpe != null ? "feedback" : "estimate", "warn", "Tecken på ansamlad trötthet", `Beredskap ${readiness}${rpe != null ? `, snitt-RPE ${rpe.toFixed(1)}` : ""}${last7 ? `, ${last7} pass senaste 7 dagarna` : ""}. Detta är ett estimat — din upplevelse väger tyngst.`);
    P({
      kind: "deload", evidence: rpe != null ? "feedback" : "estimate", severity: "warn",
      title: "Lägg in en lättare vecka (deload)",
      why: "Ansamlad trötthet sänker både prestation och återhämtning. En lättare vecka brukar återställa mer än den kostar.",
      expectedEffect: "≈15% mindre volym i en vecka → bättre sömn, mindre värk, starkare comeback.",
      followUp: { question: "Känner du dig ovanligt trött, sliten eller sömnbristig?", options: ["Ja, tydligt", "Lite grann", "Nej egentligen inte"] },
      diffText: () => "-1 set på alla övningar (deload-vecka). Enkelt att återställa efteråt.",
      note: "Deload-vecka",
      mutate: c => c.workouts.forEach(w => w.exercises.forEach(x => { if (x.sets > 2) x.sets -= 1; })),
    });
  }

  // 6) Programmet passar inte schemat (mätdata) — kräver ≥2 veckors möjlighet
  if (adh.expected >= 4 && adh.done >= 2 && adh.rate < 0.6) {
    const target = Math.max(2, adh.perWeek || program.daysPerWeek - 1);
    if (target < program.workouts.length) {
      O("measured", "info", "Färre pass än planerat", `Du har gjort ${adh.done} av ${adh.expected} planerade pass de senaste 2 veckorna (≈${adh.perWeek}/vecka).`);
      P({
        kind: "reduce-days", evidence: "measured", severity: "info",
        title: `Anpassa till ${target} pass/vecka`,
        why: "Ett program du faktiskt hinner med slår ett “perfekt” program du missar. Bättre följsamhet ger bättre resultat.",
        expectedEffect: `Mer realistiskt schema. Volymen omfördelas till ${target} pass.`,
        followUp: { question: `Passar ${target} pass/vecka din vardag bättre just nu?`, options: ["Ja", "Nej, jag kör vidare", "Tillfälligt"] },
        diffText: () => `Ta bort “${program.workouts[program.workouts.length - 1].name}”, ${program.workouts.length} → ${target} pass, dagar ${spread(target).join(", ")}.`,
        note: `Anpassade till ${target} pass/vecka`,
        mutate: c => { c.workouts = c.workouts.slice(0, target); c.daysPerWeek = target; c.weekdays = spread(target); },
      });
    }
  }

  // 7) Andra aktiviteter (mätdata) — hela målresan
  if (acts.length) {
    const top = acts[0];
    const legVol = (vol.Legs || 0) + (vol.Glutes || 0);
    O("measured", "info", `Du kombinerar med ${top.name}`, `${top.count} ${top.name.toLowerCase()}-pass senaste 2 veckorna. Det belastar ben och nervsystem utöver styrkan.`);
    if (legVol > 10) {
      P({
        kind: "balance-activity", evidence: "measured", severity: "info",
        title: `Balansera benvolym mot ${top.name}`,
        why: `${top.name} lägger redan hög belastning på ben och kondition. Något mindre bendirekt volym skyddar återhämtningen.`,
        expectedEffect: "Bättre balans mellan styrka och din övriga träning — mindre risk för överbelastning.",
        diffText: () => "-1 set på en ben-övning.",
        note: `Balanserade ben mot ${top.name}`,
        mutate: c => { for (const w of c.workouts) { const x = w.exercises.find(e => { const ex = EXERCISES.find(z => z.id === e.exId); return ex && ex.group === "Legs" && e.sets > 2; }); if (x) { x.sets -= 1; break; } } },
      });
    }
  }

  return { observations, proposals, adherence: adh, activities: acts, avgRpe: rpe };
}

// ── hjälpare ──
function existingIds(program) { const s = new Set(); program.workouts.forEach(w => w.exercises.forEach(x => s.add(x.exId))); return s; }
function smallestWorkout(program) { let wi = 0, min = Infinity; program.workouts.forEach((w, i) => { if (w.exercises.length < min) { min = w.exercises.length; wi = i; } }); return wi; }
function countGroupExercises(program, g) { let n = 0; program.workouts.forEach(w => w.exercises.forEach(x => { const e = EXERCISES.find(z => z.id === x.exId); if (e && e.group === g && x.sets > 2) n++; })); return n; }
function mainGroups(w) { const c = {}; w.exercises.forEach(x => { const e = EXERCISES.find(z => z.id === x.exId); if (e) c[e.group] = (c[e.group] || 0) + x.sets; }); return Object.keys(c).filter(g => c[g] >= 3); }
function consecutiveOverlap(program) {
  const wk = program.weekdays || [];
  for (let i = 1; i < program.workouts.length; i++) {
    const a = mainGroups(program.workouts[i - 1]), b = mainGroups(program.workouts[i]);
    if (a.filter(g => b.includes(g)).length >= 2) {
      if (wk.length > i && WEEKDAYS.indexOf(wk[i]) - WEEKDAYS.indexOf(wk[i - 1]) === 1) return `${program.workouts[i - 1].name} och ${program.workouts[i].name}`;
    }
  }
  return null;
}
export { alternativesFor };
