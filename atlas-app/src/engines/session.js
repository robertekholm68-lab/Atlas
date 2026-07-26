// Askr Training Engine v1 — kanonisk sessionsmodell.
// EN enda komplett sessionsstruktur som ALLA loggnings-vägar (Quick Log, Träningsläge, sport)
// bygger via buildSession(). Rena funktioner — ingen rendering, inget beroende av persist/react.
//
// Session-schema (schemaV 2):
//   { id, title, completedAt, createdAt, source, schemaV,
//     sets: [SET], bodyweightAtLog, muscleLoads,
//     [sport, hiit, cardioLoad]  (endast sportpass) }
// Set-schema:
//   { id, entryId, exerciseId, weight, reps, duration, rpe, ts,
//     rir, tempo, rest, setType, note, pain, substitutedFrom }  (optional-fälten = null tills de används)
import { EXERCISES, BODYWEIGHT } from "../data/exercises.js";
import { computeSessionLoad } from "./index.js";

export const SESSION_SCHEMA_V = 2;

let _c = 0;
function uid(prefix) { return `${prefix}_${Date.now().toString(36)}_${(_c++).toString(36)}${Math.random().toString(36).slice(2, 6)}`; }

// Ett set med stabilt id, tidsstämpel och FÖRBEREDDA valfria fält (belamrar inte Quick Log).
function buildSet(partial = {}, fallbackTs) {
  const s = partial || {};
  return {
    id: s.id || uid("set"),
    entryId: s.entryId || null,                         // fylls av buildSession (en post per övning)
    exerciseId: s.exerciseId,
    weight: s.weight != null ? s.weight : null,         // extern last (kg); 0 för kroppsvikt, null om okänt
    reps: s.reps != null ? s.reps : null,
    duration: s.duration != null ? s.duration : null,   // tidsbaserade övningar (s)
    rpe: s.rpe != null ? s.rpe : null,
    ts: s.ts != null ? s.ts : (fallbackTs != null ? fallbackTs : Date.now()),
    // Förberedda, valfria fält — synliggörs inte i Quick Log men persist:as om de finns:
    rir: s.rir != null ? s.rir : null,
    tempo: s.tempo != null ? s.tempo : null,
    rest: s.rest != null ? s.rest : null,
    setType: s.setType || null,                         // "warmup" | "working" | "backoff" | "drop" | "failure" ...
    note: s.note || null,
    pain: s.pain != null ? !!s.pain : null,             // smärt-flagga
    substitutedFrom: s.substitutedFrom || null,         // original-övningens id om utbytt
  };
}

// Ger varje set ett entryId — samma övning inom ett pass = samma "exercise entry".
function withEntryIds(sets) {
  const byEx = {};
  return sets.map(s => {
    const built = buildSet(s, s.ts);
    if (!built.entryId) { if (!byEx[built.exerciseId]) byEx[built.exerciseId] = uid("entry"); built.entryId = byEx[built.exerciseId]; }
    return built;
  });
}

// Bygger EN komplett, konsekvent session. Kroppsvikt-last använder faktisk bodyweight (ej fast 80).
// `partial.bodyweight` används för beräkning men lagras som `bodyweightAtLog` (inte som eget fält).
function buildSession(partial = {}) {
  const { bodyweight, ...p } = partial || {};
  const completedAt = p.completedAt != null ? p.completedAt : Date.now();
  const sets = withEntryIds(p.sets || []);
  const bw = bodyweight != null ? bodyweight : (p.bodyweightAtLog != null ? p.bodyweightAtLog : BODYWEIGHT);
  const muscleLoads = p.muscleLoads != null ? p.muscleLoads : computeSessionLoad(sets, EXERCISES, bw);
  return {
    ...p,                                               // bevara ev. extra fält (sport, hiit, cardioLoad …)
    id: p.id || uid("sess"),
    title: p.title || "Pass",
    completedAt,
    createdAt: p.createdAt || new Date().toISOString(),
    source: p.source || "session",                      // "training" | "quicklog" | "sport" | "legacy"
    schemaV: SESSION_SCHEMA_V,
    sets,
    bodyweightAtLog: bw,
    muscleLoads,
  };
}

// ── Redigering av redan sparade set (recompute:ar muscleLoads → återhämtning hålls konsekvent) ──
function recomputeSession(session, bodyweight) {
  const bw = bodyweight != null ? bodyweight : (session.bodyweightAtLog != null ? session.bodyweightAtLog : BODYWEIGHT);
  return { ...session, bodyweightAtLog: bw, muscleLoads: computeSessionLoad(session.sets || [], EXERCISES, bw) };
}
function updateSet(session, setId, patch, bodyweight) {
  const sets = (session.sets || []).map(s => s.id === setId ? buildSet({ ...s, ...patch }, s.ts) : s);
  return recomputeSession({ ...session, sets }, bodyweight);
}
function deleteSet(session, setId, bodyweight) {
  const sets = (session.sets || []).filter(s => s.id !== setId);
  return recomputeSession({ ...session, sets }, bodyweight);
}

// ── Redigering på LISTNIVÅ (2.0:s redigera/radera pass) ──────────────────────
// updateSet/deleteSet ovan ändrar ETT pass. Här ligger de två operationer som rör
// själva historiken: byt ut ett pass, ta bort ett pass.
//
// VARFÖR touchSession finns: synkformen i store.js fyller bara fält som SAKNAS
// (stämplingen är idempotent med flit). En redigerad post skulle därför behålla
// sin gamla `updatedAt`, och en framtida last-write-wins-merge skulle inte se
// ändringen alls — den skulle tyst tappas bort mot en äldre kopia från en annan
// enhet. Identiteten (`id`) rörs däremot ALDRIG: synken ska se en ÄNDRING, inte
// en radering plus en ny post.
function touchSession(session, now = Date.now()) {
  if (!session || typeof session !== "object") return session;
  return { ...session, updatedAt: now };
}

// Ersätt ett pass i listan. Finns id:t inte kvar returneras listan oförändrad —
// hellre ingen ändring än ett pass som återuppstår ur en gammal vy.
function replaceSession(sessions, next, now = Date.now()) {
  const arr = Array.isArray(sessions) ? sessions : [];
  if (!next || next.id == null) return arr;
  if (!arr.some(s => s && s.id === next.id)) return arr;
  return arr.map(s => (s && s.id === next.id ? touchSession(next, now) : s));
}

// Ta bort ett pass. Belastningen försvinner därmed ur recovery, readiness och
// veckovolym vid nästa beräkning — inget skuggregister behålls.
function removeSession(sessions, id) {
  const arr = Array.isArray(sessions) ? sessions : [];
  if (id == null) return arr;
  return arr.filter(s => !(s && s.id === id));
}

// Bär passet någon belastning alls? Ett pass vars sista set redigerats bort är
// kvar som post men väger noll — det ska sägas rakt ut i gränssnittet, inte
// döljas bakom en tom lista.
function sessionHasLoad(session) {
  if (!session) return false;
  if ((session.sets || []).length > 0) return true;
  return Object.values(session.muscleLoads || {}).some(v => v > 0);
}

// ── Säker migrering/fallback för äldre lokalt lagrade pass ────────────────────
// Backfill:ar id/tidsstämplar/entryId/schemaV UTAN att hitta på set som aldrig fanns.
// muscleLoads bevaras alltid (räknas bara om det saknas OCH set finns) → historik ändras inte.
function normalizeSession(raw) {
  if (!raw || typeof raw !== "object") return raw;
  if (raw.schemaV === SESSION_SCHEMA_V && Array.isArray(raw.sets) && raw.id && (raw.sets.length === 0 || raw.sets.every(s => s && s.id && s.entryId))) return raw; // redan aktuell
  const completedAt = raw.completedAt != null ? raw.completedAt : Date.now();
  const sets = withEntryIds((raw.sets || []).map(s => ({ ...s, ts: s.ts != null ? s.ts : completedAt })));
  const hadLoads = raw.muscleLoads && typeof raw.muscleLoads === "object";
  return {
    ...raw,
    id: raw.id || uid("sess"),
    title: raw.title || "Pass",
    completedAt,
    createdAt: raw.createdAt || new Date(completedAt).toISOString(),
    source: raw.source || "legacy",
    schemaV: SESSION_SCHEMA_V,
    sets,
    bodyweightAtLog: raw.bodyweightAtLog != null ? raw.bodyweightAtLog : null,   // okänt för legacy — markeras med null
    muscleLoads: hadLoads ? raw.muscleLoads : computeSessionLoad(sets, EXERCISES, BODYWEIGHT),
  };
}
// Migrerar en lista; returnerar { sessions, changed } så anroparen bara skriver vid faktisk ändring.
function migrateSessions(list) {
  const arr = Array.isArray(list) ? list : [];
  let changed = false;
  const sessions = arr.map(s => { const n = normalizeSession(s); if (n !== s) changed = true; return n; });
  return { sessions, changed };
}

export {
  uid, buildSet, buildSession, recomputeSession, updateSet, deleteSet,
  touchSession, replaceSession, removeSession, sessionHasLoad,
  normalizeSession, migrateSessions,
};
