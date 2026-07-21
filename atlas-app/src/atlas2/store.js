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

// ASYNKRONT API — localStorage är rygg TILLS VIDARE. Sömmen är async med flit:
// en framtida rygg (IndexedDB eller enhetssynk) är oundvikligen asynkron, och
// då ska den kunna bytas utan att röra en enda vy. Ingen nätverks- eller
// inloggningskod byggs här — bara formen. Vyerna hydreras EN gång via load()
// och skriver via save(); ingen läser localStorage direkt (utom importsteget,
// som medvetet läser de GAMLA namnrymderna).
export async function load(k, fallback) {
  try { const r = localStorage.getItem(key(k)); return r != null ? JSON.parse(r) : fallback; }
  catch (e) { return fallback; }
}
export async function save(k, v) {
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

// ── SYNK-FORM (ingen server, ingen inloggning, ingen nätverkskod) ────────────
// Förbereder framtida enhetssynk genom att ge varje post fyra fält:
//   id         — stabil identitet för merge/dedup
//   userId     — vem posten hör till (anonymt lokalt-id nu, kopplas till konto sen)
//   deviceId   — vilken enhet posten skapades på (sync-proveniens)
//   updatedAt  — postens ändringstid; det en framtida last-write-wins läser
// Här byggs BARA formen. Inget skickas någonstans.

// Deterministisk sträng-hash, base36. Samma sträng ger samma hash på alla
// enheter och vid varje körning — det är HELA poängen: en post utan id (t.ex. en
// gammal vikt { ts, kg }) måste få SAMMA id oavsett var migreringen körs, annars
// dubblas den vid framtida synk.
//
// ~64 bitar (två oberoende 32-bitars FNV-1a-varianter sammanfogade), INTE 32.
// En 32-bitars hash kolliderar med några få procents sannolikhet redan vid
// ~20 000 poster (en mångårig matloggare), och en kollision skulle tyst släppa
// en post vid synk — just den sortens ofelbar-om-fel vi inte får ta. Vid 64
// bitar är risken försumbar även för en tung användare.
function hash64(s) {
  let a = 0x811c9dc5, b = 0xcbf29ce4;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x85ebca77) >>> 0;
  }
  return a.toString(36) + b.toString(36);
}

// Per typ: postens händelsetid (blir updatedAt vid migrering) och en
// INNEHÅLLSbaserad id-nyckel för poster som saknar id. Sessioner och mål har
// redan egna id ur motorn — bara vikt och matlogg saknar och får ett här.
const EVENT_TIME = { session: r => r.completedAt, weight: r => r.ts, food: r => r.ts, goal: r => r.startDatum };
const ID_FROM_CONTENT = {
  session: r => "s_" + hash64([r.completedAt, r.title || "", (r.sets || []).length].join("|")),
  weight:  r => "w_" + hash64([r.ts, r.kg].join("|")),
  food:    r => "f_" + hash64([r.ts, r.foodId || r.name || "", r.grams != null ? r.grams : "", r.kcal != null ? r.kcal : "", r.recipeId || ""].join("|")),
  goal:    r => "g_" + hash64([r.startDatum, r.målDatum, r.typ || ""].join("|")),
};

// Slumpat, stabilt id för NYA poster. Sätts vid SKAPANDET och överlever
// redigering: rättar användaren ett värde byter posten inte identitet, så synken
// ser en ÄNDRING och inte radering + ny post. Innehållshashen ovan är däremot
// BARA till för att ge redan befintlig data (utan id) ett id vid migrering.
export function nyId(prefix = "r_") {
  try { if (typeof crypto !== "undefined" && crypto.randomUUID) return prefix + crypto.randomUUID().slice(0, 12); } catch (e) {}
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/**
 * Stämpla EN post med de fyra synkfälten. Fyller bara det som SAKNAS — befintliga
 * värden rörs aldrig. Därför är den idempotent: en redan stämplad post kommer ut
 * oförändrad. `updatedAt` sätts till postens händelsetid (completedAt/ts/…), inte
 * "nu": det gör migreringen körbar hur många gånger som helst utan att ändra
 * något, OCH ger en migrerad post rätt ålder för en framtida merge.
 *
 * `idGen` körs BARA vid migrering (befintlig data utan id → innehållshash). På
 * SKRIVVÄGEN skickas ingen idGen: då hittas inget id på ur innehållet, och en
 * post som redan har ett id (slumpat vid skapandet, eller hashat vid migrering)
 * behåller det oförändrat även när innehållet redigeras.
 */
export function stämplaPost(rec, typ, identitet, idGen) {
  if (!rec || typeof rec !== "object") return rec;
  const id = identitet || {};
  const ev = EVENT_TIME[typ] ? EVENT_TIME[typ](rec) : null;
  return {
    ...rec,
    id: rec.id != null ? rec.id : (idGen ? idGen(rec, typ) : rec.id),
    userId: rec.userId != null ? rec.userId : id.userId,
    deviceId: rec.deviceId != null ? rec.deviceId : id.deviceId,
    updatedAt: rec.updatedAt != null ? rec.updatedAt : (ev != null ? ev : 0),
  };
}

export const stämplaLista = (arr, typ, identitet, idGen) =>
  Array.isArray(arr) ? arr.map(r => stämplaPost(r, typ, identitet, idGen)) : arr;

// Innehållshash — ENDAST migrering av befintlig data utan id.
const migreringsIdGen = (rec, typ) => (ID_FROM_CONTENT[typ] ? ID_FROM_CONTENT[typ](rec) : undefined);

/**
 * Migrera hela datamängden: stämpla varje pass, vikt, matloggspost och målet, och
 * ge poster utan id ett INNEHÅLLSbaserat id (så samma gamla post får samma id på
 * olika enheter). Ren funktion av (data, identitet) — idempotent:
 * migrera(migrera(x)) === migrera(x). Programmen lämnas orörda tills vidare.
 */
export function migrera(data, identitet) {
  const d = data || {};
  return {
    ...d,
    sessions: stämplaLista(d.sessions, "session", identitet, migreringsIdGen),
    weights: stämplaLista(d.weights, "weight", identitet, migreringsIdGen),
    foodLog: stämplaLista(d.foodLog, "food", identitet, migreringsIdGen),
    goal: d.goal ? stämplaPost(d.goal, "goal", identitet, migreringsIdGen) : d.goal,
  };
}

// Enhets-/användaridentitet. Genereras EN gång per installation och lagras under
// egna atlas.v3.*-nycklar. userId är anonymt nu och kopplas till ett riktigt
// konto den dag inloggning byggs; deviceId stannar enhetslokalt som proveniens.
// Cachas i minnet så att stämplingen på skrivvägen kan vara synkron.
let _identitet = null;
function slumpId(prefix) {
  try { if (typeof crypto !== "undefined" && crypto.randomUUID) return prefix + crypto.randomUUID().slice(0, 12); } catch (e) {}
  return prefix + Math.random().toString(36).slice(2, 14);
}
export async function identitet() {
  if (_identitet) return _identitet;
  let userId = await load("userId", null);
  let deviceId = await load("deviceId", null);
  if (!userId) { userId = slumpId("u_"); await save("userId", userId); }
  if (!deviceId) { deviceId = slumpId("d_"); await save("deviceId", deviceId); }
  _identitet = { userId, deviceId };
  return _identitet;
}
// Synkron åtkomst till redan hämtad identitet (för stämpling på skrivvägen efter
// hydrering). null innan identitet() körts.
export const identitetSync = () => _identitet;
// Endast för test: nollställ minnescachen.
export const _nollställIdentitet = () => { _identitet = null; };
