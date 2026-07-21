// Askr-persistens — sparar användardata i localStorage så den överlever omladdning.
// TVÅ NAMESPACES: demo (atlas.v2.demo.*) och riktig användare (atlas.v2.real.*) hålls helt åtskilda.
// Aktivt läge lagras i atlas.mode ("demo" | "real" | saknas = första start). Ingen backend.
import { useState, useEffect } from "react";

const ROOT = "atlas.v2.";
const MODE_KEY = "atlas.mode";
export const SCHEMA_VERSION = 2;
const hasLS = () => { try { return typeof window !== "undefined" && !!window.localStorage; } catch (e) { return false; } };

// ── Läge ──
export function getMode() { if (!hasLS()) return null; try { return window.localStorage.getItem(MODE_KEY); } catch (e) { return null; } }
export function setModeStored(m) { if (!hasLS()) return; try { m == null ? window.localStorage.removeItem(MODE_KEY) : window.localStorage.setItem(MODE_KEY, m); } catch (e) { } }

// ── Stabila ID:n för poster (oberoende av synligt namn) ──
let _idc = 0;
export function newId(prefix = "id") { return `${prefix}_${Date.now().toString(36)}_${(_idc++).toString(36)}${Math.random().toString(36).slice(2, 6)}`; }

// ── Namespaced storage ──
const nsKey = (mode, key) => ROOT + (mode || "demo") + "." + key;
export function loadState(key, fallback, mode) {
  if (!hasLS()) return fallback;
  try { const raw = window.localStorage.getItem(nsKey(mode, key)); return raw == null ? fallback : JSON.parse(raw); }
  catch (e) { return fallback; }
}
export function saveState(key, value, mode) {
  if (!hasLS()) return false;
  try { window.localStorage.setItem(nsKey(mode, key), JSON.stringify(value)); return true; }
  catch (e) { return false; }
}
// useState som synkas till localStorage under aktivt läge. Byt läge = montera om (key={mode}).
export function usePersistentState(key, initial, mode) {
  const [state, setState] = useState(() => loadState(key, initial, mode));
  useEffect(() => { saveState(key, state, mode); }, [key, mode, state]);
  return [state, setState];
}

// ── Demo-seed: säkerställ att demo-läget alltid är förifyllt med färsk exempeldata ──
// Om demons localStorage saknas ELLER seedades med en äldre version, rensas demo-nycklarna
// så att fixtures (INITIAL_*) återfylls vid nästa state-init. Bumpa DEMO_SEED_VERSION när
// demodatan uppdaterats så att alla får den nya datan nästa gång de öppnar demo.
export const DEMO_SEED_VERSION = 4;
export function maybeReseedDemo(version = DEMO_SEED_VERSION) {
  if (!hasLS()) return;
  try {
    const vKey = ROOT + "demo.__seedVersion";
    if (window.localStorage.getItem(vKey) === String(version)) return; // redan seedad med denna version
    clearModeData("demo");                                             // rensa ev. gammal/tom demodata
    window.localStorage.setItem(vKey, String(version));                // markera som seedad → fixtures fyller på
  } catch (e) { }
}
// Manuell återställning av demo till fabriksdata (för en "återställ demo"-knapp).
export function resetDemoSeed() { if (!hasLS()) return; try { clearModeData("demo"); window.localStorage.removeItem(ROOT + "demo.__seedVersion"); } catch (e) { } }

// Rensa ETT läges data (påverkar inte det andra läget).
export function clearModeData(mode) {
  if (!hasLS()) return;
  try { const p = ROOT + (mode || "demo") + "."; Object.keys(window.localStorage).filter(k => k.startsWith(p)).forEach(k => window.localStorage.removeItem(k)); } catch (e) { }
}
// ── §4: Scope:ade, avsiktliga raderingsoperationer ──
export function clearDemoData() { clearModeData("demo"); }                 // rör inte real
export function deleteRealProfile() { clearModeData("real"); }             // rör inte demo
export function clearOnboardingDraft(mode) { if (!hasLS()) return; try { window.localStorage.removeItem(nsKey(mode || "real", "onboarding")); } catch (e) { } }
export function resetActiveMode() { setModeStored(null); }                 // tillbaka till läges-valet, raderar ingen data
// Full nollställning — ENDAST för en separat, tydligt märkt "radera allt"-åtgärd.
export function clearAllAtlasData() {
  if (!hasLS()) return;
  try { Object.keys(window.localStorage).filter(k => k.startsWith("atlas.")).forEach(k => window.localStorage.removeItem(k)); } catch (e) { }
}
export const clearAtlasData = clearAllAtlasData; // bakåtkompatibelt alias

// ── §5: Strukturerad metadata + migrering per läge ──
export function getMeta(mode) { return loadState("__meta", null, mode); }
export function ensureMeta(mode) {
  let m = getMeta(mode);
  const nowIso = new Date().toISOString();
  if (!m || m.schemaVersion == null) {
    m = { schemaVersion: SCHEMA_VERSION, mode, userId: newId(mode === "real" ? "user" : "demo"), createdAt: nowIso, updatedAt: nowIso };
    saveState("__meta", m, mode);
  }
  return m;
}
export function touchMeta(mode) { const m = ensureMeta(mode); m.updatedAt = new Date().toISOString(); saveState("__meta", m, mode); return m; }
// Idempotent: kör bara en gång per schemaversion, raderar aldrig legacy-data.
export function runMigrations(mode) {
  const m = ensureMeta(mode);
  const legacyDetected = hasLegacyV1();
  if (m.schemaVersion < SCHEMA_VERSION) { m.schemaVersion = SCHEMA_VERSION; m.updatedAt = new Date().toISOString(); saveState("__meta", m, mode); }
  // Legacy v1-data lämnas orörd; osäker data importeras ALDRIG tyst till en riktig profil.
  return { legacyDetected, migratedTo: SCHEMA_VERSION, meta: m };
}

// ── §11: Strukturerad export av riktig personlig data ──
export function exportRealData() {
  const keys = ["profile", "goals", "missions", "sessions", "measurements", "foodLog", "mealMemory", "nutStyle", "equipProfile", "onboarding"];
  const data = {};
  keys.forEach(k => { const v = loadState(k, undefined, "real"); if (v !== undefined) data[k] = v; });
  return { schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), mode: "real", storage: "local browser storage (ingen server)", meta: getMeta("real"), data };
}
// Detektera legacy v1-data.
export function hasLegacyV1() {
  if (!hasLS()) return false;
  try { return Object.keys(window.localStorage).some(k => k.startsWith("atlas.v1.")); } catch (e) { return false; }
}

// ── §5: SÄKER SAMMANFOGNING av profil vid (om)start av onboarding ──
// Endast fält som faktiskt samlas in i onboarding uppdateras. Allt annat bevaras:
// stabilt ID, avatar, progressbilder, kroppsmått, vikthistorik, medlemsdatum, created-timestamp m.m.
// Att starta om onboarding får ALDRIG radera eller nollställa loggad historik.
export function mergeProfileFromOnboarding(existing, dr, memberSince) {
  const base = existing || {};
  const d = dr || {};
  const onboardingFields = {
    name: d.name != null ? d.name : (base.name || ""),
    age: d.age ?? base.age ?? null,
    height: d.height ?? base.height ?? null,
    weight: d.weight ?? base.weight ?? null,
    bodyFat: d.bodyFat ?? base.bodyFat ?? null,
    goalPrimary: d.primaryGoal || base.goalPrimary || null,
    secondaryGoals: d.secondaryGoals || base.secondaryGoals || [],
    level: d.level || base.level || null,
    equipment: d.equipment || base.equipment || [],
    avoidMovements: d.avoidMovements != null ? d.avoidMovements : (base.avoidMovements || ""),
    injuryNotes: d.injuryNotes != null ? d.injuryNotes : (base.injuryNotes || ""),
    weeklyTarget: d.workoutsPerWeek ?? base.weeklyTarget ?? null,   // stated frekvens → veckomål (cold-start-signal)
    trainingTypes: d.trainingTypes || base.trainingTypes || [],
    nutritionGoal: d.nutritionGoal || base.nutritionGoal || null,
    nutritionTargets: { kcal: d.calorieTarget ?? null, protein: d.proteinTarget ?? null },
  };
  return {
    ...base,                                   // bevara alla ej-onboardade fält
    ...onboardingFields,                        // skriv över bara det onboarding redigerar
    id: base.id || newId("user"),               // stabilt användar-ID bevaras (eller skapas en gång)
    avatar: base.avatar ?? null,                // bevara avatar
    photos: base.photos || [],                  // bevara progressbilder
    measurements: base.measurements || {},      // bevara kroppsmått (cm)
    weightHistory: base.weightHistory || [],    // bevara vikthistorik — nollställs ALDRIG
    memberSince: base.memberSince || memberSince,
    createdAt: base.createdAt || new Date().toISOString(),
  };
}

// ── §7: LEGACY-MIGRERING (atlas.v1.*) — synligt beslut, idempotent, aldrig tyst import/radering ──
const MIG_KEY = "atlas.migration.v1";
export function getLegacyRecordTypes() {
  if (!hasLS()) return [];
  const out = [];
  try {
    Object.keys(window.localStorage).filter(k => k.startsWith("atlas.v1.")).sort().forEach(k => {
      let type = "okänd", count = null;
      try { const v = JSON.parse(window.localStorage.getItem(k)); if (Array.isArray(v)) { type = "poster"; count = v.length; } else if (v && typeof v === "object") { type = "objekt"; count = Object.keys(v).length; } else { type = typeof v; } }
      catch (e) { type = "text"; }
      out.push({ key: k, name: k.replace("atlas.v1.", ""), type, count });
    });
  } catch (e) { }
  return out;
}
export function getMigrationStatus() { if (!hasLS()) return null; try { const raw = window.localStorage.getItem(MIG_KEY); return raw == null ? null : JSON.parse(raw); } catch (e) { return null; } }
function saveMigrationStatus(s) { if (!hasLS()) return; try { window.localStorage.setItem(MIG_KEY, JSON.stringify(s)); } catch (e) { } }
// "Behåll som demodata" — permanent beslut, ingen dataflytt, legacy lämnas orörd. Frågar inte igen.
export function markLegacyKeptAsDemo() { saveMigrationStatus({ status: "kept_demo", decidedAt: new Date().toISOString(), recordTypes: getLegacyRecordTypes(), importedKeys: {} }); return getMigrationStatus(); }
// "Importera till min riktiga profil" — best-effort, idempotent, icke-destruktiv. Original-legacy bevaras.
export function importLegacyIntoReal() {
  const prev = getMigrationStatus() || {};
  const importedKeys = { ...(prev.importedKeys || {}) };
  const summary = [];
  const arrKeys = { sessions: "sessions", measurements: "measurements", foodLog: "foodLog", goals: "goals" };
  Object.entries(arrKeys).forEach(([legacyName, realKey]) => {
    if (!hasLS()) return;
    const lk = "atlas.v1." + legacyName;
    let raw; try { raw = window.localStorage.getItem(lk); } catch (e) { raw = null; }
    if (raw == null) return;
    const sig = legacyName + ":" + raw.length;
    if (importedKeys[lk] === sig) { summary.push({ key: lk, skipped: true }); return; }   // exakt samma data redan importerad → hoppa (idempotent)
    let val; try { val = JSON.parse(raw); } catch (e) { return; }
    if (!Array.isArray(val)) return;
    const existing = loadState(realKey, [], "real") || [];
    const seen = new Set(existing.map(x => x && x.id).filter(Boolean));
    const added = val.filter(x => !(x && x.id && seen.has(x.id)));   // deduplicera på id → förhindrar upprepad import
    saveState(realKey, existing.concat(added), "real");
    importedKeys[lk] = sig; summary.push({ key: lk, added: added.length });
  });
  // profil: sammanfoga bara SAKNADE fält, skriv aldrig över befintliga riktiga värden
  try {
    if (hasLS()) { const raw = window.localStorage.getItem("atlas.v1.profile"); if (raw != null) { const sig = "profile:" + raw.length; if (importedKeys["atlas.v1.profile"] !== sig) { const p = JSON.parse(raw); if (p && typeof p === "object") { const cur = loadState("profile", {}, "real") || {}; saveState("profile", { ...p, ...cur }, "real"); importedKeys["atlas.v1.profile"] = sig; summary.push({ key: "atlas.v1.profile", merged: true }); } } } }
  } catch (e) { }
  const status = { status: "imported", decidedAt: new Date().toISOString(), importedKeys, recordTypes: getLegacyRecordTypes(), summary };
  saveMigrationStatus(status);                          // original-legacy-nycklar raderas aldrig
  return status;
}
