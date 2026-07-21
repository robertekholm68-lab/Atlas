// Askr 2.0 — lagring och härledda tillstånd.
//
// EGEN NAMNRYMD (atlas.v3.*) under utvecklingen. Skälet är inte prydlighet utan
// säkerhet: Robert har riktig loggad historik i den nuvarande appen, och en bugg
// i ett halvfärdigt bygge får inte kunna skriva sönder den. När 2.0 är klar
// importeras data medvetet, en gång, med bekräftelse — inte genom att två appar
// råkar dela nycklar.

import {
  computeRecovery, computeReadiness, computeSystemicFatigue,
  computeNutrition, distinctNutritionDays,
} from "../engines/index.js";
import { MUSCLES } from "../data/muscles.js";
import { nextWorkout } from "../engines/programs.js";

const NS = "atlas.v3.";
const key = k => NS + k;

export function load(k, fallback) {
  try { const r = localStorage.getItem(key(k)); return r ? JSON.parse(r) : fallback; }
  catch (e) { return fallback; }
}
export function save(k, v) {
  try { localStorage.setItem(key(k), JSON.stringify(v)); } catch (e) {}
}

/** Finns data från den nuvarande appen att ta över? Används av importsteget. */
export function legacyAvailable() {
  try {
    for (const p of ["atlas.v2.", "atlas.mobile."]) {
      const s = localStorage.getItem(p + "sessions");
      if (s) { const arr = JSON.parse(s); if (Array.isArray(arr) && arr.length) return { prefix: p, sessions: arr.length }; }
    }
  } catch (e) {}
  return null;
}

/**
 * Muskeltillstånd för hela kroppen, härledda ur loggad historik.
 *
 * Exakt samma motoranrop som nuvarande appen gör — 2.0 byter utseende, inte
 * sanning. Utan historik returneras no_data rakt igenom; ingenting fylls i.
 */
export function bodyState(sessions, nowMs = Date.now()) {
  const states = {};
  const sysFat = computeSystemicFatigue ? computeSystemicFatigue(sessions, nowMs) : 0;
  const cardioPenalty = Math.min(18, Math.round(sysFat || 0));
  let sum = 0, n = 0;
  Object.keys(MUSCLES).forEach(id => {
    const rec = computeRecovery(sessions, id, nowMs);
    const weeklyLoad = (sessions || [])
      .filter(s => s && s.completedAt && nowMs - s.completedAt < 6048e5)
      .reduce((a, s) => a + ((s.muscleLoads && s.muscleLoads[id]) || 0), 0);
    // Cardio tär på hela systemet, inte bara den muskel som lyfte — samma
    // avdrag som nuvarande appen gör, annars skulle 2.0 visa en gladare siffra
    // för samma historik.
    const base = computeReadiness(rec.recoveryScore, weeklyLoad, rec.daysSince);
    const readiness = rec.status === "no_data" ? base : Math.max(0, Math.min(100, base - cardioPenalty));
    states[id] = { ...rec, readiness, weeklyLoad };
    if (rec.status !== "no_data" && readiness != null) { sum += readiness; n++; }
  });
  return {
    states,
    // Ingen historik → ingen siffra. Aldrig ett påhittat medelvärde.
    overall: n ? Math.round(sum / n) : null,
    covered: n,
    systemic: sysFat,
  };
}

/**
 * Ett besked i EN mening: vad kroppen säger idag.
 * Härlett, aldrig hårdkodat. Utan underlag sägs det rakt ut.
 */
export function todaysMessage(states, sessionCount) {
  const namn = id => (MUSCLES[id] && MUSCLES[id].name) || id;
  const med = Object.entries(states).filter(([, s]) => s.status !== "no_data" && s.readiness != null);
  if (!med.length) return { text: "Ingen historik än. Logga ett pass så börjar kartan färgas.", empty: true };

  const redo = med.filter(([, s]) => s.readiness >= 76).sort((a, b) => b[1].readiness - a[1].readiness);
  const trött = med.filter(([, s]) => s.readiness < 56).sort((a, b) => a[1].readiness - b[1].readiness);
  const lista = arr => arr.slice(0, 2).map(([id]) => namn(id)).join(" och ");

  if (redo.length && trött.length) return { text: `${lista(redo)} är redo. ${namn(trött[0][0])} behöver mer vila.` };
  if (redo.length) return { text: `${lista(redo)} är redo för belastning.` };
  if (trött.length) return { text: "Kroppen behöver återhämtning idag. Ta det lugnt eller vila." };
  return { text: "Måttlig beredskap över hela kroppen." };
}

/**
 * Volym för ett pass, i kg.
 *
 * BUGG SOM LEVT LÄNGE: buildSession sätter aldrig `totalVolume`, men både
 * mobilens framstegsvy och första versionen av 2.0:s läste det fältet. Alla
 * riktiga pass räknades därför som noll volym — bara demodata såg rätt ut,
 * eftersom fixturen bär fältet. Här räknas volymen ur seten, med fältet som
 * fallback för gamla poster som faktiskt har det.
 */
export function sessionVolume(s) {
  if (!s) return 0;
  const ur = (s.sets || []).reduce((a, x) => a + (x.weight || 0) * (x.reps || 0), 0);
  return ur > 0 ? ur : (s.totalVolume || 0);
}

/** Veckans pass, kalendervecka måndag–söndag (samma definition som nutrition). */
export function weekSessions(sessions, nowMs = Date.now()) {
  const d = new Date(nowMs);
  const vd = (d.getDay() + 6) % 7;
  const start = new Date(d); start.setDate(d.getDate() - vd); start.setHours(0, 0, 0, 0);
  return (sessions || []).filter(s => s && s.completedAt >= start.getTime());
}

/** "Igår", "3 dgr", eller streck. Aldrig "0 dagar sedan" utan underlag. */
export function lastSessionLabel(sessions, nowMs = Date.now()) {
  const t = (sessions || []).map(s => s && s.completedAt).filter(Boolean).sort((a, b) => b - a)[0];
  if (!t) return null;
  const d0 = new Date(nowMs); d0.setHours(0, 0, 0, 0);
  const d1 = new Date(t); d1.setHours(0, 0, 0, 0);
  const dgr = Math.round((d0 - d1) / 86400000);
  return dgr <= 0 ? "Idag" : dgr === 1 ? "Igår" : `${dgr} dgr`;
}

export { nextWorkout };

// ── NÄRING ───────────────────────────────────────────────────────────────────
// v3 saknade näringsmål, så matvyn kunde inte visa framsteg och coachen svarade
// alltid att den inte kunde bedöma kost. Målet lagras under nyckeln
// `atlas.v3.nutritionTargets` via load/save ovan. Fältnamnen är kcal/protein/
// carbs/fat — aldrig `calories`, det är lag i hela kodbasen.

// Samma "idag" som matvyn: lokal kalenderdag, inte ett rullande dygn.
const sammaDag = (a, b) => {
  const x = new Date(a), y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
};

/**
 * Dagens näring, summerad ur matloggen med SAMMA motorfunktion (computeNutrition)
 * som matvyn använder — en sanning, inte två. Returnerar { kcal, protein, carbs,
 * fat, estimated, total }. `total` är antalet loggade poster idag; noll betyder
 * att inget loggats än idag.
 */
export function dagensNutrition(foodLog, now = Date.now()) {
  const idag = (foodLog || []).filter(e => e && e.ts != null && sammaDag(e.ts, now));
  return computeNutrition(idag);
}

/**
 * Kost-kontexten coachen får. Här bor ÄRLIGHETSGRINDEN, samlad på ETT ställe så
 * att coachen kan skilja tre tillstånd åt:
 *
 *   · inget mål satt            → nutritionTargets = null
 *     (appen vet inte vad du vill — coachReply säger "inga kostmål inställda")
 *   · mål satt, inget loggat idag → nutritionTotals = null, INTE nollor
 *     (noll loggat ≠ noll ätet; en nolla hade ljugit om ett kraftigt underskott,
 *      jfr "Falskt värde ≠ utelämnat värde" i CLAUDE.md — coachen visar då bara
 *      målet, utan att påstå något om dagens intag)
 *   · mål satt och loggat idag  → båda satta, coachen får räkna på riktigt
 *
 * Coachlogiken (coachReply) tolkar själv de tre utfallen; vi matar bara rätt
 * data — en coach, inte två.
 */
export function nutritionCtx(foodLog, targets, now = Date.now()) {
  const totals = dagensNutrition(foodLog, now);
  return {
    nutritionTargets: targets || null,
    nutritionTotals: totals.total > 0 ? totals : null,
    nutritionDays: distinctNutritionDays(foodLog, now),
  };
}
