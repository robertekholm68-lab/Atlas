// MOTOR: sömn, vilopuls och HRV ur en exportfil.
//
// VARFÖR FIL OCH INTE API. Garmins API kräver partnergodkännande, Apple Hälsa
// går bara att nå från en native iOS-app, och Samsung kräver Health Connect
// med native kod. Det som är öppet för ALLA märken är exporten: Garmin Connect,
// Polar Flow och Apple Hälsa kan alla lämna ifrån sig en fil. Den tolkas här,
// på telefonen, och datan lämnar den aldrig. Samma väg som Omron-vågen tar
// (tolkaOmronCsv i utveckling.js) och av samma skäl.
//
// FORMATEN VARIERAR — mellan märken, regioner och appversioner. Därför matchas
// kolumner och nycklar på NYCKELORD i stället för exakta strängar, och filen
// får innehålla fält vi inte känner igen. En rad som inte går att tolka hoppas
// över; den stoppar aldrig resten.
//
// DET HÄR ÄR INTE READINESS. Posterna visas och sparas, men de räknas ännu inte
// in i någon readiness-siffra. Att börja väga in sömn i ett tal användaren
// redan känner igen är ett beslut för sig, och det tas inte i tysthet av en
// importfunktion.

import { startOfLocalDay } from "./index.js";

// Rimliga gränser. Utanför dem sparas INGET värde — hellre en lucka än ett tal
// som ser ut som en mätning. En vilopuls på 12 är en tom cell som blivit en
// nolla, inte en puls.
const GRÄNSER = {
  // 1–16 timmar. Övre gränsen är satt DÄR den faktiskt skiljer en lång natt
  // från ett fel: 13 timmars sömn händer när man är sjuk, 18 gör det inte —
  // då är det en veckosumma eller en kolumn som lästs som fel enhet.
  sömnMin: [60, 960],
  vilopuls: [25, 120],     // bpm
  hrv: [5, 300],           // ms
};

const tal = v => {
  if (v == null) return null;
  const n = Number(String(v).replace(",", ".").replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const inom = (fält, v) => {
  const g = GRÄNSER[fält];
  return v != null && v >= g[0] && v <= g[1] ? v : null;
};

/**
 * Sömn till MINUTER, ur de former exporterna faktiskt använder.
 *
 *   "7h 32m", "7 tim 32 min", "7:32"   → 452
 *   7.5                                 → 450   (timmar)
 *   452                                 → 452   (minuter)
 *   27120                               → 452   (sekunder)
 *
 * GRÄNSERNA ÄR EN HEURISTIK, och det ska stå: ett blankt tal bär ingen enhet.
 * ≤ 24 läses som timmar, ≤ 1440 som minuter, större som sekunder. Det gör
 * "1440" till en dags minuter i stället för 24 minuters sekunder — vilket är
 * rätt gissning, för 24 minuter är ingen natt.
 */
export function tolkaSömnMin(v) {
  if (v == null || v === "") return null;
  const s = String(v).trim().toLowerCase();

  // "7h 32m" och släktingarna.
  const hm = /^(\d+)\s*(?:h|t|tim|timmar|hours?)\b[^\d]*(\d+)?/.exec(s);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2] || 0);

  // "7:32". Tre delar ("7:32:00") är timmar:minuter:sekunder.
  const kolon = /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/.exec(s);
  if (kolon) return Number(kolon[1]) * 60 + Number(kolon[2]);

  // Bara minuter: "452 min".
  if (/\bmin/.test(s) && !/\b(h|t|tim)\b/.test(s)) { const n = tal(s); return n != null ? Math.round(n) : null; }

  const n = tal(s);
  if (n == null || n <= 0) return null;
  if (n <= 24) return Math.round(n * 60);        // timmar
  if (n <= 1440) return Math.round(n);           // minuter
  return Math.round(n / 60);                     // sekunder
}

/**
 * En dags hälsopost — eller null när inget av värdena höll.
 *
 * `dag` är midnatt lokal tid: posterna är per KALENDERDYGN, inte per
 * tidpunkt. En sömnpost hör till natten man vaknade, och det är det dygnet
 * användaren tänker på när hen tittar bakåt.
 */
export function byggHälsodag({ dag, sömnMin = null, hrv = null, vilopuls = null, källa = "import" } = {}) {
  const d = dag == null ? null : startOfLocalDay(dag);
  if (d == null || !Number.isFinite(d)) return null;
  const post = {
    dag: d,
    sömnMin: inom("sömnMin", sömnMin == null ? null : Math.round(tolkaSömnMin(sömnMin) ?? NaN)),
    vilopuls: inom("vilopuls", vilopuls == null ? null : Math.round(tal(vilopuls) ?? NaN)),
    hrv: inom("hrv", hrv == null ? null : Math.round(tal(hrv) ?? NaN)),
    källa,
  };
  return post.sömnMin != null || post.vilopuls != null || post.hrv != null ? post : null;
}

// ── NYCKELORD ───────────────────────────────────────────────────────────────
// Ett ställe för vad som räknas som en datum-, sömn-, vilopuls- eller
// HRV-kolumn. Både CSV-rubriker och JSON-nycklar går genom samma mönster, så
// de två vägarna inte kan börja tolka olika filer olika.
const nyckel = s => String(s || "").toLowerCase().replace(/[^a-z0-9åäö]/g, "");
const MÖNSTER = {
  dag: /^date$|calendardate|datum|^dag$|^day$|starttime|timestamp|sleepstart/,
  sömn: /sleep|sömn|somn/,
  vilopuls: /restingheartrate|restinghr|restingpulse|vilopuls|^resting$/,
  hrv: /hrv|heartratevariability|variabilitet|variability/,
};
// Sömnkolumner som INTE är sömnlängd. "sleep score" och "deep sleep" är
// intressanta, men inte det vi lagrar — och en poäng på 82 hade blivit
// 82 minuters sömn.
const EJ_SÖMNLÄNGD = /score|poäng|deep|djup|light|lätt|rem|awake|vaken|efficiency|resting/;

const ärSömnlängd = k => MÖNSTER.sömn.test(nyckel(k)) && !EJ_SÖMNLÄNGD.test(nyckel(k));

/** Enheten ur nyckelns eget namn, när den står där. */
function sömnUrNyckel(k, v) {
  const n = nyckel(k);
  if (/second/.test(n)) { const t = tal(v); return t != null ? Math.round(t / 60) : null; }
  if (/minute|^sleepmin/.test(n)) { const t = tal(v); return t != null ? Math.round(t) : null; }
  return tolkaSömnMin(v);
}

// ── CSV ─────────────────────────────────────────────────────────────────────

function tolkaCsv(text, källa) {
  const rader = String(text || "").split(/\r?\n/).filter(r => r.trim());
  if (rader.length < 2) return { poster: [], fel: "Filen ser tom ut." };
  const dela = r => r.split(/[,;\t]/).map(c => c.trim().replace(/^"|"$/g, ""));
  const rubrik = dela(rader[0]);

  const iDag = rubrik.findIndex(c => MÖNSTER.dag.test(nyckel(c)));
  const iSömn = rubrik.findIndex(c => ärSömnlängd(c));
  const iPuls = rubrik.findIndex(c => MÖNSTER.vilopuls.test(nyckel(c)));
  const iHrv = rubrik.findIndex(c => MÖNSTER.hrv.test(nyckel(c)));

  if (iDag < 0) return { poster: [], fel: "Hittar ingen datumkolumn i filen." };
  if (iSömn < 0 && iPuls < 0 && iHrv < 0) {
    return { poster: [], fel: "Hittar varken sömn, vilopuls eller HRV i filen." };
  }

  const poster = [];
  for (const rad of rader.slice(1)) {
    const c = dela(rad);
    const d = new Date(c[iDag]);
    if (Number.isNaN(d.getTime())) continue;
    const p = byggHälsodag({
      dag: d.getTime(),
      sömnMin: iSömn >= 0 ? sömnUrNyckel(rubrik[iSömn], c[iSömn]) : null,
      vilopuls: iPuls >= 0 ? c[iPuls] : null,
      hrv: iHrv >= 0 ? c[iHrv] : null,
      källa,
    });
    if (p) poster.push(p);
  }
  return { poster, fält: { sömn: iSömn >= 0, vilopuls: iPuls >= 0, hrv: iHrv >= 0 }, fel: null };
}

// ── JSON ────────────────────────────────────────────────────────────────────

/**
 * Garmins egen export är JSON, djupt nästlad och olika mellan filer. I stället
 * för att kunna varje form letas ALLA objekt igenom rekursivt: ett objekt som
 * bär både ett datum och minst ett av våra tre värden blir en post.
 */
function objektPoster(nod, ut, källa, djup = 0) {
  if (!nod || djup > 6) return;
  if (Array.isArray(nod)) { for (const x of nod) objektPoster(x, ut, källa, djup + 1); return; }
  if (typeof nod !== "object") return;

  const nycklar = Object.keys(nod);
  const kDag = nycklar.find(k => MÖNSTER.dag.test(nyckel(k)));
  const kSömn = nycklar.find(k => ärSömnlängd(k) && typeof nod[k] !== "object");
  const kPuls = nycklar.find(k => MÖNSTER.vilopuls.test(nyckel(k)) && typeof nod[k] !== "object");
  const kHrv = nycklar.find(k => MÖNSTER.hrv.test(nyckel(k)) && typeof nod[k] !== "object");

  if (kDag && (kSömn || kPuls || kHrv)) {
    const rå = nod[kDag];
    const d = typeof rå === "number" ? new Date(rå < 1e12 ? rå * 1000 : rå) : new Date(String(rå));
    if (!Number.isNaN(d.getTime())) {
      const p = byggHälsodag({
        dag: d.getTime(),
        sömnMin: kSömn ? sömnUrNyckel(kSömn, nod[kSömn]) : null,
        vilopuls: kPuls ? nod[kPuls] : null,
        hrv: kHrv ? nod[kHrv] : null,
        källa,
      });
      if (p) ut.push(p);
    }
  }
  // Vidare nedåt oavsett: en fil kan bära både en summering och dagposter.
  for (const k of nycklar) objektPoster(nod[k], ut, källa, djup + 1);
}

function tolkaJson(text, källa) {
  let data;
  try { data = JSON.parse(text); } catch (e) { return { poster: [], fel: "Filen är inte läsbar JSON." }; }
  const ut = [];
  objektPoster(data, ut, källa);
  if (!ut.length) return { poster: [], fel: "Hittar varken sömn, vilopuls eller HRV i filen." };
  return {
    poster: ut,
    fält: {
      sömn: ut.some(p => p.sömnMin != null),
      vilopuls: ut.some(p => p.vilopuls != null),
      hrv: ut.some(p => p.hrv != null),
    },
    fel: null,
  };
}

/**
 * Tolkar en exportfil — CSV eller JSON, valfritt märke.
 *
 * Returnerar `{ poster, fält, format, fel }`. Formatet avgörs av innehållet,
 * inte av filnamnet: en fil som heter .txt men bär JSON ska fungera, och en
 * felaktig filändelse ska inte ge ett obegripligt fel.
 */
export function tolkaHälsofil(text, källa = "import") {
  const s = String(text || "").trim();
  if (!s) return { poster: [], fält: {}, format: null, fel: "Filen ser tom ut." };
  const json = s.startsWith("{") || s.startsWith("[");
  const r = json ? tolkaJson(s, källa) : tolkaCsv(s, källa);
  return { ...r, fält: r.fält || {}, format: json ? "json" : "csv" };
}

/**
 * Slår ihop nya dagar med befintliga — EN POST PER DYGN.
 *
 * Samma regel som mätningarna: ett ifyllt värde vinner över ett tomt, oavsett
 * vilken post det kom från. Importerar man sömnfilen och sedan vilopulsfilen
 * ska dagen bära båda, inte den sista filens tomma fält. (Den buggen kostade
 * en gång en vikt som försvann ur en sammanslagning.)
 */
export function slåIhopHälsa(befintliga, nya) {
  const ut = [...(befintliga || [])].filter(p => p && p.dag != null);
  for (const n of nya || []) {
    if (!n || n.dag == null) continue;
    const i = ut.findIndex(p => p.dag === n.dag);
    if (i < 0) { ut.push({ ...n }); continue; }
    const s = { ...ut[i] };
    for (const f of ["sömnMin", "vilopuls", "hrv"]) if (n[f] != null) s[f] = n[f];
    if (n.källa) s.källa = n.källa;
    ut[i] = s;
  }
  return ut.sort((a, b) => a.dag - b.dag);
}

/** Dagar med ett värde för fältet, äldst först. */
export function hälsoSerie(poster, fält, dagar = 90, nu = Date.now()) {
  const gräns = startOfLocalDay(nu) - (dagar - 1) * 864e5;
  return (poster || [])
    .filter(p => p && p.dag >= gräns && p[fält] != null)
    .sort((a, b) => a.dag - b.dag)
    .map(p => ({ dag: p.dag, värde: p[fält] }));
}

/** Senaste posten med ett värde för fältet — eller null. */
export function senasteHälsa(poster, fält) {
  const s = (poster || []).filter(p => p && p[fält] != null).sort((a, b) => b.dag - a.dag);
  return s.length ? { dag: s[0].dag, värde: s[0][fält] } : null;
}

/**
 * Snitt över de senaste dagarna — null under `minst` mätningar.
 *
 * Ett snitt ur två nätter är inte ett snitt, det är två nätter. Tröskeln finns
 * för att ett tal med tre decimalers självförtroende inte ska byggas på
 * ingenting.
 */
export function hälsoSnitt(poster, fält, dagar = 7, nu = Date.now(), minst = 3) {
  const s = hälsoSerie(poster, fält, dagar, nu);
  if (s.length < minst) return null;
  return Math.round(s.reduce((a, b) => a + b.värde, 0) / s.length);
}

/** "7 h 32 min" ur minuter. För visning — aldrig för lagring. */
export function visaSömn(min) {
  if (min == null) return null;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/**
 * Vad appen FAKTISKT har för underlag, och vad som saknas.
 *
 * Den här listan är till för att kunna säga "sömn: ur Garmin-export 12 sep" i
 * stället för att låta importerad data smälta in som om appen alltid vetat.
 * Readiness räknar ännu inte med något av det — det är ett eget beslut.
 */
export function hälsoUnderlag(poster, nu = Date.now()) {
  const fält = [["sömnMin", "sömn"], ["vilopuls", "vilopuls"], ["hrv", "HRV"]];
  const finns = [], saknas = [];
  for (const [f, namn] of fält) {
    const senaste = senasteHälsa(poster, f);
    if (senaste && senaste.dag >= startOfLocalDay(nu) - 13 * 864e5) finns.push(namn);
    else saknas.push(namn);
  }
  return { finns, saknas, dagar: (poster || []).length };
}
