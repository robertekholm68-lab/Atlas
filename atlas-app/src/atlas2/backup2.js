// Askr 2.0 — backup av v3-datan. Rena funktioner, testbara utan webbläsare.
//
// VARFÖR: all 2.0-data bor i localStorage under atlas.v3.*. En rensad
// webbläsare raderar allt tyst — och till skillnad från nuvarande appen fanns
// ingen väg ut. Import från v2/mobile läser bara; det här är v3:s egen export
// och återläsning.
//
// Samma filformat som engines/backup.js (app: "Askr", data: nyckel→råvärde)
// men med scope "v3" och en HÅRD SPÄRR: återställning skriver ALDRIG nycklar
// utanför atlas.v3.*. En fil kan alltså aldrig skriva sönder nuvarande appens
// eller mobilens data, ens om den är korrupt eller manipulerad.

export const V3_BACKUP_VERSION = 1;
const NS = "atlas.v3.";

function ls() { try { return typeof window !== "undefined" && window.localStorage ? window.localStorage : null; } catch (e) { return null; } }

/** Alla 2.0-nycklar. Rör inte v2/mobile — de har sin egen backup i nuvarande appen. */
export function v3Keys() {
  const s = ls(); if (!s) return [];
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i);
    if (k && k.startsWith(NS)) out.push(k);
  }
  return out.sort();
}

function countIn(data, needle) {
  let n = 0;
  Object.entries(data).forEach(([k, v]) => {
    if (!k.includes(needle)) return;
    try { const arr = JSON.parse(v); if (Array.isArray(arr)) n += arr.length; } catch (e) { }
  });
  return n;
}

/** Bygger backup-objektet. Läser bara — rör aldrig lagringen. */
export function buildV3Backup(now = Date.now()) {
  const s = ls(), data = {};
  v3Keys().forEach(k => { try { data[k] = s.getItem(k); } catch (e) { } });
  return {
    app: "Askr", scope: "v3", backupVersion: V3_BACKUP_VERSION,
    createdAt: new Date(now).toISOString(),
    keys: Object.keys(data).length,
    summary: {
      sessions: countIn(data, "sessions"),
      foodLog: countIn(data, "foodLog"),
      weights: countIn(data, "weights"),
    },
    data,
  };
}

export function v3BackupFilename(now = Date.now()) {
  const d = new Date(now), p = n => String(n).padStart(2, "0");
  return `askr-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
}

/**
 * Granskar en inläst fil INNAN något skrivs — visar vad den innehåller och
 * säger ärligt nej till fel sorts fil. En backup från nuvarande appen (v2)
 * avvisas med en förklaring i stället för att halvt läsas in.
 */
export function inspectV3Backup(text) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { return { ok: false, error: "Filen är inte giltig JSON." }; }
  if (!obj || obj.app !== "Askr" || !obj.data || typeof obj.data !== "object")
    return { ok: false, error: "Det här ser inte ut som en Askr-backup." };
  if (obj.backupVersion > V3_BACKUP_VERSION)
    return { ok: false, error: "Backupen kommer från en nyare version av Askr än den du kör." };
  const keys = Object.keys(obj.data);
  const v3 = keys.filter(k => k.startsWith(NS));
  if (keys.length && v3.length === 0)
    return { ok: false, error: "Det här är en backup från nuvarande appen, inte från Askr 2.0. Läs in den i nuvarande appens datasäkerhet i stället." };
  return {
    ok: true, obj,
    keys: v3.length,
    ignorerade: keys.length - v3.length,   // nycklar utanför v3 — skrivs aldrig
    createdAt: obj.createdAt || null,
    summary: obj.summary || {
      sessions: countIn(obj.data, "sessions"),
      foodLog: countIn(obj.data, "foodLog"),
      weights: countIn(obj.data, "weights"),
    },
  };
}

/**
 * Skriver tillbaka en backup. replace=true rensar befintliga v3-nycklar först.
 * SPÄRREN: endast nycklar som börjar på atlas.v3. skrivs — allt annat i filen
 * ignoreras tyst räknat, aldrig skrivet.
 */
export function restoreV3Backup(obj, { replace = true } = {}) {
  const s = ls(); if (!s) return { ok: false, error: "Ingen lagring tillgänglig." };
  if (replace) v3Keys().forEach(k => { try { s.removeItem(k); } catch (e) { } });
  let written = 0, skipped = 0;
  Object.entries(obj.data).forEach(([k, v]) => {
    if (!k.startsWith(NS) || typeof v !== "string") { skipped++; return; }
    try { s.setItem(k, v); written++; } catch (e) { }
  });
  return { ok: true, written, skipped };
}
