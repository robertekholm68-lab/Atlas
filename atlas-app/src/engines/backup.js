// MOTOR: datasäkerhet — backup till fil, återläsning och beständig lagring.
// Bakgrund: hela Askr ligger i localStorage. Webbläsare kan rensa den lagringen —
// iOS gör det för sajter som inte använts på ett tag, och kvoterna är snålare där.
// Därför: be om beständig lagring, och gör det enkelt att ta en riktig backup-fil.

const ROOT = "atlas.v2.";
export const BACKUP_VERSION = 1;

function ls() { try { return typeof window !== "undefined" && window.localStorage ? window.localStorage : null; } catch (e) { return null; } }

// Alla Askr-nycklar (båda lägena + mobilens namnrymd om den finns i samma webbläsare).
export function atlasKeys() {
  const s = ls(); if (!s) return [];
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const k = s.key(i);
    if (k && (k.startsWith(ROOT) || k === "atlas.mode" || k.startsWith("atlas.mobile."))) out.push(k);
  }
  return out.sort();
}

// Bygger backup-objektet. Rör inte data — bara läser.
export function buildBackup(now = Date.now()) {
  const s = ls(), data = {};
  atlasKeys().forEach(k => { try { data[k] = s.getItem(k); } catch (e) { } });
  const sessions = countIn(data, "sessions"), food = countIn(data, "foodLog");
  return {
    app: "Askr", backupVersion: BACKUP_VERSION, createdAt: new Date(now).toISOString(),
    keys: Object.keys(data).length, summary: { sessions, foodLog: food }, data,
  };
}

function countIn(data, needle) {
  let n = 0;
  Object.entries(data).forEach(([k, v]) => {
    if (!k.includes(needle)) return;
    try { const arr = JSON.parse(v); if (Array.isArray(arr)) n += arr.length; } catch (e) { }
  });
  return n;
}

export function backupFilename(now = Date.now()) {
  const d = new Date(now), p = n => String(n).padStart(2, "0");
  return `atlas-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
}

// Granskar en inläst fil innan något skrivs — visar vad den innehåller.
export function inspectBackup(text) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { return { ok: false, error: "Filen är inte giltig JSON." }; }
  if (!obj || obj.app !== "Askr" || !obj.data || typeof obj.data !== "object")
    return { ok: false, error: "Det här ser inte ut som en Askr-backup." };
  if (obj.backupVersion > BACKUP_VERSION)
    return { ok: false, error: "Backupen kommer från en nyare version av Askr än den du kör." };
  const keys = Object.keys(obj.data);
  return {
    ok: true, obj, keys: keys.length, createdAt: obj.createdAt || null,
    summary: obj.summary || { sessions: countIn(obj.data, "sessions"), foodLog: countIn(obj.data, "foodLog") },
  };
}

// Skriver tillbaka en backup. replace=true rensar befintliga Askr-nycklar först.
export function restoreBackup(obj, { replace = true } = {}) {
  const s = ls(); if (!s) return { ok: false, error: "Ingen lagring tillgänglig." };
  if (replace) atlasKeys().forEach(k => { try { s.removeItem(k); } catch (e) { } });
  let written = 0;
  Object.entries(obj.data).forEach(([k, v]) => { try { s.setItem(k, v); written++; } catch (e) { } });
  return { ok: true, written };
}

// Beständig lagring: ber webbläsaren att inte rensa data automatiskt.
export async function persistentStorageStatus() {
  try {
    if (typeof navigator === "undefined" || !navigator.storage || !navigator.storage.persisted)
      return { supported: false, persisted: false };
    const persisted = await navigator.storage.persisted();
    let quota = null, usage = null;
    if (navigator.storage.estimate) { const e = await navigator.storage.estimate(); quota = e.quota || null; usage = e.usage || null; }
    return { supported: true, persisted, quota, usage };
  } catch (e) { return { supported: false, persisted: false }; }
}

export async function requestPersistentStorage() {
  try {
    if (typeof navigator === "undefined" || !navigator.storage || !navigator.storage.persist) return false;
    return await navigator.storage.persist();
  } catch (e) { return false; }
}
