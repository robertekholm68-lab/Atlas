// MOTOR: automatisk brygga mobil → webb.
// Webbappen och mobilkompanjonen är två HTML-filer, men ligger de på SAMMA domän delar de
// webbläsarens lagring. Då kan mobilen lämna av nya pass i en gemensam brevlåda som
// webbappen läser — utan server, utan konto och utan kod att kopiera.
//
// GRÄNSER, ärligt: det här fungerar bara på samma enhet och samma domän. Tränar du med
// telefonen och analyserar på en dator är det fortfarande två webbläsare — då gäller
// den manuella koden. Öppnade filer via file:// delar inte heller lagring.

const KEY = "atlas.bridge.v1";

function ls() { try { return typeof window !== "undefined" && window.localStorage ? window.localStorage : null; } catch (e) { return null; } }

const EMPTY = { sessions: [], food: [], weights: [], notes: [], checkins: [], ts: null };
const arr = v => (Array.isArray(v) ? v : []);

export function readBridge() {
  const s = ls(); if (!s) return { ...EMPTY };
  try {
    const raw = s.getItem(KEY); if (!raw) return { ...EMPTY };
    const o = JSON.parse(raw);
    return { sessions: arr(o.sessions), food: arr(o.food), weights: arr(o.weights), notes: arr(o.notes), checkins: arr(o.checkins), ts: o.ts || null };
  } catch (e) { return { ...EMPTY }; }
}

// Mobilen lägger sitt obehandlade material i brevlådan. Skriver bara om något faktiskt
// ändrats, så webbappens storage-lyssnare inte väcks i onödan.
export function writeBridge({ sessions = [], food = [], weights = [], notes = [], checkins = [] } = {}) {
  const s = ls(); if (!s) return false;
  try {
    const body = { sessions, food, weights, notes, checkins };
    const next = JSON.stringify({ v: 1, ts: Date.now(), ...body });
    const prev = s.getItem(KEY);
    if (prev) {
      try {
        const p = JSON.parse(prev);
        const same = Object.keys(body).every(k => JSON.stringify(p[k] || []) === JSON.stringify(body[k]));
        if (same) return false;
      } catch (e) { }
    }
    s.setItem(KEY, next);
    return true;
  } catch (e) { return false; }
}

// Vad i brevlådan är nytt för mottagaren? Jämför mot det som redan finns.
export function pendingFromBridge({ sessions = [], foodLog = [], measurements = [] } = {}) {
  const box = readBridge();
  const haveS = new Set((sessions || []).map(x => x.id));
  const haveF = new Set((foodLog || []).map(x => x.id));
  // Vikter jämförs på tidpunkt, eftersom webbappens mätpunkter saknar mobilens id.
  const haveW = new Set((measurements || []).filter(m => m && m.weight != null).map(m => m.date));
  return {
    sessions: box.sessions.filter(x => x && x.id && !haveS.has(x.id)),
    food: box.food.filter(x => x && x.id && !haveF.has(x.id)),
    weights: box.weights.filter(x => x && x.ts && !haveW.has(x.ts)),
    notes: box.notes || [],
    checkins: box.checkins || [],
    ts: box.ts,
  };
}

// Töms när materialet är importerat — brevlådan ska inte växa i all evighet.
export function clearBridge() {
  const s = ls(); if (!s) return false;
  try { s.removeItem(KEY); return true; } catch (e) { return false; }
}

// Lyssnar på ändringar från den andra fliken/appen i samma webbläsare.
export function onBridgeChange(cb) {
  if (typeof window === "undefined") return () => { };
  const handler = e => { if (!e || e.key === KEY || e.key === null) cb(); };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
