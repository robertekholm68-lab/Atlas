// MOTOR: röstinmatning av vikt och reps under pass.
//
// Två delar, medvetet åtskilda:
//   1. parseSetSpeech() — ren textfunktion, ingen webbläsare inblandad. Testbar.
//   2. createSetListener() — tunn wrapper runt Web Speech API.
//
// Grundregel: rösten FÖRESLÅR, den sparar aldrig själv. En felhörd åtta som blir
// åttio hamnar annars i loggen och förgiftar load, recovery och readiness — precis
// den sortens påhittade siffra ATLAS är byggd för att inte visa. Därför går allt
// via ett förslag som användaren bekräftar.

import { platformKind, isStandalone } from "./platform.js";

/* ---------- svenska räkneord ---------- */

const ENTAL = {
  noll: 0, en: 1, ett: 1, "två": 2, tva: 2, tre: 3, fyra: 4, fem: 5, sex: 6,
  sju: 7, "åtta": 8, atta: 8, nio: 9, tio: 10, elva: 11, tolv: 12, tretton: 13,
  fjorton: 14, femton: 15, sexton: 16, sjutton: 17, arton: 18, aderton: 18, nitton: 19,
};

const TIOTAL = {
  tjugo: 20, trettio: 30, fyrtio: 40, fyrtia: 40, femtio: 50, sextio: 60,
  sjuttio: 70, "åttio": 80, attio: 80, nittio: 90,
};

// Igenkännaren stavar inte alltid som ordboken. Normalisera bort det som skiljer.
function normalisera(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[.!?;:]/g, " ")
    .replace(/(\d),(\d)/g, "$1.$2")   // svensk decimalkomma -> punkt
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Ett enskilt ord som "åttiotvå" eller "hundratjugo" -> tal. null om det inte är ett tal.
export function ordTillTal(ord) {
  if (!ord) return null;
  const o = String(ord).toLowerCase().trim();
  if (o in ENTAL) return ENTAL[o];
  if (o in TIOTAL) return TIOTAL[o];

  // hundra, etthundra, tvåhundrafemtio ...
  const h = o.indexOf("hundra");
  if (h !== -1) {
    const före = o.slice(0, h);
    const efter = o.slice(h + 6);
    const antal = före === "" ? 1 : (ENTAL[före] ?? null);
    if (antal === null) return null;
    if (efter === "") return antal * 100;
    const rest = ordTillTal(efter);
    return rest === null ? null : antal * 100 + rest;
  }

  // sammansatt tiotal: åttiotvå, tjugofem, sjuttiosju
  for (const t of Object.keys(TIOTAL)) {
    if (o.startsWith(t) && o.length > t.length) {
      const rest = o.slice(t.length);
      if (rest in ENTAL && ENTAL[rest] > 0 && ENTAL[rest] < 10) return TIOTAL[t] + ENTAL[rest];
    }
  }
  return null;
}

// Plockar ut talen ur en REDAN normaliserad mening, i ordning, tillsammans med
// ordet som följde (så "åttio kilo åtta reps" kan tolkas på enheterna i stället
// för på ordningen).
//
// OBS: normalisera() får inte köras här. Den stryker punkt som skiljetecken, så
// ett andra varv skulle slå sönder decimalen som första varvet nyss skapade av
// "82,5". Anropas alltid med utdata från normalisera().
//
// Två ord i följd slås ALDRIG ihop till ett tal. "åttio åtta" är 80 och 8, inte 88.
// Sammansatta tal sägs i ett ord ("åttiotvå") eller kommer som siffror från
// igenkännaren. Att gissa här skulle göra 80 kg × 8 reps oskiljbart från 88.
function taUtTal(normaliserad) {
  const ord = String(normaliserad).split(" ").filter(Boolean);
  const ut = [];
  for (let i = 0; i < ord.length; i++) {
    const o = ord[i];
    if (/^\d+(\.\d+)?$/.test(o)) { ut.push({ v: parseFloat(o), efter: ord[i + 1] || "" }); continue; }
    const direkt = ordTillTal(o);
    if (direkt !== null) ut.push({ v: direkt, efter: ord[i + 1] || "" });
  }
  return ut;
}

const UPPREPNING = /\b(samma|likadant|igen|en till|ett till|en gång till)\b/;

const VIKTORD = /^(kilo|kilogram|kg|kilon)$/;
const REPSORD = /^(rep|reps|repetition|repetitioner|gång|gånger|ggr|stycken|st)$/;

const VIKT_MAX = 500;
const REPS_MAX = 100;

/**
 * Tolkar en talad sträng till { weight, reps }.
 * Godtar "80 8", "åttio åtta", "åttio kilo åtta reps", "82,5 kilo 6 gånger",
 * "kroppsvikt 12" och "samma igen".
 *
 * Returnerar alltid ett objekt. `ok:false` med `reason` när det inte gick att tolka —
 * hellre ett ärligt nej än en gissning.
 */
export function parseSetSpeech(text) {
  const rå = String(text || "");
  const norm = normalisera(rå);
  if (!norm) return { ok: false, reason: "tomt", raw: rå };

  const upprepa = () => UPPREPNING.test(norm) ? { ok: true, repeat: true, weight: null, reps: null, raw: rå } : null;

  const tal = taUtTal(norm);
  if (tal.length === 0) return upprepa() || { ok: false, reason: "inga-tal", raw: rå };

  let weight = null, reps = null;

  // 1. enheter vinner alltid över ordning
  for (const t of tal) {
    if (VIKTORD.test(t.efter) && weight === null) weight = t.v;
    else if (REPSORD.test(t.efter) && reps === null) reps = t.v;
  }

  // 2. kroppsviktsövningar: "kroppsvikt 12"
  if (weight === null && /\b(kroppsvikt|egen vikt|utan vikt)\b/.test(norm)) weight = 0;

  // 3. fyll luckorna på ordning
  const oanvända = tal.filter(t => !VIKTORD.test(t.efter) && !REPSORD.test(t.efter)).map(t => t.v);
  if (weight === null && reps === null) {
    // "en till" ger ett tal (en = 1) men betyder upprepa. Pröva upprepning innan vi ger upp.
    if (oanvända.length < 2) return upprepa() || { ok: false, reason: "ett-tal", raw: rå, hint: oanvända[0] ?? null };
    weight = oanvända[0]; reps = oanvända[1];
  } else if (weight === null && oanvända.length) weight = oanvända[0];
  else if (reps === null && oanvända.length) reps = oanvända[0];

  if (weight === null || reps === null) return upprepa() || { ok: false, reason: "ofullständigt", raw: rå };

  // 4. rimlighetsspärr. Utanför intervallet är det nästan alltid en felhörning.
  if (weight < 0 || weight > VIKT_MAX) return { ok: false, reason: "vikt-orimlig", raw: rå };
  if (!Number.isFinite(reps) || reps < 1 || reps > REPS_MAX) return { ok: false, reason: "reps-orimliga", raw: rå };

  return { ok: true, repeat: false, weight: Math.round(weight * 10) / 10, reps: Math.round(reps), raw: rå };
}

/* ---------- webbläsardelen ---------- */

/**
 * Kan den här telefonen lyssna? Svaret är inte "finns API:et" — på iPhone finns
 * API:et i hemskärmsappen men gör ingenting alls, så en ren funktionsdetektering
 * ljuger. Därför stängs det av uttryckligen där.
 */
export function voiceSupport() {
  if (typeof window === "undefined") return { ok: false, reason: "ingen-window", note: "" };
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) return {
    ok: false, reason: "saknas",
    note: "Den här webbläsaren har inte taligenkänning. Chrome på Android fungerar.",
  };
  if (platformKind() === "ios" && isStandalone()) return {
    ok: false, reason: "ios-hemskarm",
    note: "Apple har inte kopplat in mikrofonen för webbappar som ligger på hemskärmen — funktionen finns men är tyst. Öppna ATLAS i Safari om du vill prova rösten där.",
  };
  if (platformKind() === "ios") return {
    ok: true, reason: "ios-safari",
    note: "Fungerar i Safari, men inte om du lägger till ATLAS på hemskärmen.",
  };
  return { ok: true, reason: "ok", note: "Säg vikt och reps, till exempel \"åttio åtta\"." };
}


/**
 * Kollar att mikrofonen faktiskt är tillgänglig INNAN taligenkänningen startas.
 *
 * Varför: i en installerad Android-app (TWA) utan RECORD_AUDIO i manifestet finns
 * ingen väg att fråga användaren om lov. Att då starta SpeechRecognition dödar
 * hela processen — appen "kraschar" utan felmeddelande. getUserMedia misslyckas
 * däremot med ett fångbart löfte, så vi frågar den först och startar bara om den
 * säger ja. Spåret stängs direkt; vi ville bara veta om dörren är öppen.
 */
export async function micReady() {
  try {
    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { ok: false, reason: "saknas", note: "Den här enheten ger inte webbappar tillgång till mikrofonen." };
    }
    const ström = await navigator.mediaDevices.getUserMedia({ audio: true });
    try { ström.getTracks().forEach(t => t.stop()); } catch (e) {}
    return { ok: true, reason: "ok", note: "" };
  } catch (err) {
    const namn = (err && err.name) || "";
    return {
      ok: false,
      reason: namn === "NotAllowedError" ? "nekad" : namn === "NotFoundError" ? "ingen-mikrofon" : "fel",
      note: namn === "NotAllowedError"
        ? "Mikrofonen är inte tillåten. Tillåt mikrofon för ATLAS i appens eller webbläsarens inställningar."
        : namn === "NotFoundError"
        ? "Ingen mikrofon hittades."
        : "Mikrofonen går inte att använda här. Är ATLAS installerad som app kan den sakna mikrofonbehörighet — öppna den i webbläsaren i stället.",
    };
  }
}

/**
 * Startar en lyssning. Returnerar en avbrytfunktion.
 *
 * Två saker värda att veta om lagret under:
 *  - Igenkänningen går som standard via en server, alltså inte offline. Vi ber om
 *    lokal bearbetning när webbläsaren kan, men får inte kräva det: stödet har
 *    slagits av och på i olika Chrome-versioner.
 *  - maxAlternatives ger flera tolkningar av samma yttrande. Vi tar den första som
 *    går att tolka som ett set, vilket räddar en del "åtta/åttio"-förväxlingar.
 */
export function createSetListener({ onResult, onError, onEnd, timeoutMs = 8000 } = {}) {
  const stöd0 = voiceSupport();
  if (!stöd0.ok) { onError && onError(stöd0.reason, stöd0.note); return () => {}; }
  // Fråga mikrofonen först. Startar vi igenkänningen utan lov dör processen.
  let avbruten0 = false, stoppaInre = null;
  micReady().then(m => {
    if (avbruten0) return;
    if (!m.ok) { onError && onError(m.reason, m.note); onEnd && onEnd(); return; }
    stoppaInre = _startcreateSetListener({ onResult, onError, onEnd, timeoutMs });
  });
  return () => { avbruten0 = true; if (stoppaInre) stoppaInre(); };
}

function _startcreateSetListener({ onResult, onError, onEnd, timeoutMs }) {
  const stöd = voiceSupport();
  if (!stöd.ok) { onError && onError(stöd.reason, stöd.note); return () => {}; }

  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec, klar = false, vakt = null;

  const städa = () => { if (vakt) { clearTimeout(vakt); vakt = null; } };
  const avsluta = () => { if (klar) return; klar = true; städa(); try { rec && rec.stop(); } catch (e) {} onEnd && onEnd(); };

  try {
    rec = new Rec();
    rec.lang = "sv-SE";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 4;
    // Be om lokal bearbetning där den finns — då fungerar det utan täckning i källaren.
    try { if ("processLocally" in rec) rec.processLocally = true; } catch (e) {}
  } catch (e) {
    onError && onError("start-misslyckades", "Kunde inte starta mikrofonen."); return () => {};
  }

  rec.onresult = (ev) => {
    const alt = ev.results && ev.results[0] ? Array.from(ev.results[0]) : [];
    let bäst = null;
    for (const a of alt) {
      const tolkning = parseSetSpeech(a.transcript);
      if (tolkning.ok) { bäst = tolkning; break; }
      if (!bäst) bäst = tolkning;               // spara första misslyckandet som förklaring
    }
    klar = true; städa();
    onResult && onResult(bäst || { ok: false, reason: "inget-svar", raw: "" });
    onEnd && onEnd();
  };

  rec.onerror = (ev) => {
    klar = true; städa();
    const kod = (ev && ev.error) || "okänt";
    const text = kod === "not-allowed" || kod === "service-not-allowed"
      ? "Mikrofonen är blockerad. Tillåt mikrofon för ATLAS i webbläsarens inställningar."
      : kod === "no-speech" ? "Hörde ingenting."
      : kod === "network" ? "Taligenkänningen behöver nät just nu — den här telefonen kan inte tolka lokalt."
      : "Det gick inte att tolka ljudet.";
    onError && onError(kod, text);
    onEnd && onEnd();
  };

  rec.onend = () => { if (!klar) { klar = true; städa(); onEnd && onEnd(); } };

  // Vakthund: vissa webbläsare varken svarar eller avslutar. Släpp aldrig knappen i "lyssnar" för evigt.
  vakt = setTimeout(() => { if (!klar) { onError && onError("timeout", "Hörde ingenting."); avsluta(); } }, timeoutMs);

  try { rec.start(); } catch (e) { klar = true; städa(); onError && onError("start-misslyckades", "Mikrofonen är upptagen."); onEnd && onEnd(); }

  return avsluta;
}

/* ---------- diktering ---------- */

/**
 * Fri diktering — för coachfrågor, inte för siffror.
 *
 * Skillnaden mot createSetListener är principiell: här ska ingenting tolkas.
 * Coachen förstår meningen själv, och blir texten fel ser du den i rutan innan
 * du skickar. Därför ingen sifferparser, ingen rimlighetsspärr — bara text.
 */
export function createDictation({ onResult, onError, onEnd, timeoutMs = 12000 } = {}) {
  const stöd0 = voiceSupport();
  if (!stöd0.ok) { onError && onError(stöd0.reason, stöd0.note); return () => {}; }
  // Fråga mikrofonen först. Startar vi igenkänningen utan lov dör processen.
  let avbruten0 = false, stoppaInre = null;
  micReady().then(m => {
    if (avbruten0) return;
    if (!m.ok) { onError && onError(m.reason, m.note); onEnd && onEnd(); return; }
    stoppaInre = _startcreateDictation({ onResult, onError, onEnd, timeoutMs });
  });
  return () => { avbruten0 = true; if (stoppaInre) stoppaInre(); };
}

function _startcreateDictation({ onResult, onError, onEnd, timeoutMs }) {
  const stöd = voiceSupport();
  if (!stöd.ok) { onError && onError(stöd.reason, stöd.note); return () => {}; }

  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec, klar = false, vakt = null;
  const städa = () => { if (vakt) { clearTimeout(vakt); vakt = null; } };
  const avsluta = () => { if (klar) return; klar = true; städa(); try { rec && rec.stop(); } catch (e) {} onEnd && onEnd(); };

  try {
    rec = new Rec();
    rec.lang = "sv-SE";
    rec.continuous = false;
    rec.interimResults = true;          // visa texten medan den talas — känns levande
    rec.maxAlternatives = 1;
    try { if ("processLocally" in rec) rec.processLocally = true; } catch (e) {}
  } catch (e) { onError && onError("start-misslyckades", "Kunde inte starta mikrofonen."); return () => {}; }

  rec.onresult = (ev) => {
    let text = "", slutgiltig = false;
    for (let i = 0; i < ev.results.length; i++) {
      text += ev.results[i][0].transcript;
      if (ev.results[i].isFinal) slutgiltig = true;
    }
    onResult && onResult(text.trim(), slutgiltig);
    if (slutgiltig) { klar = true; städa(); onEnd && onEnd(); }
  };

  rec.onerror = (ev) => {
    klar = true; städa();
    const kod = (ev && ev.error) || "okänt";
    onError && onError(kod,
      kod === "not-allowed" || kod === "service-not-allowed" ? "Mikrofonen är blockerad. Tillåt mikrofon för ATLAS i webbläsarens inställningar."
      : kod === "no-speech" ? "Hörde ingenting."
      : kod === "network" ? "Taligenkänningen behöver nät just nu."
      : "Det gick inte att tolka ljudet.");
    onEnd && onEnd();
  };

  rec.onend = () => { if (!klar) { klar = true; städa(); onEnd && onEnd(); } };
  vakt = setTimeout(() => { if (!klar) avsluta(); }, timeoutMs);

  try { rec.start(); } catch (e) { klar = true; städa(); onError && onError("start-misslyckades", "Mikrofonen är upptagen."); onEnd && onEnd(); }
  return avsluta;
}

/**
 * Kortar ett coachsvar till det som är rimligt att säga högt.
 *
 * En coach som läser upp femton meningar i ett gym krockar med hela poängen med
 * korta svar. Skärmen får bära djupet; rösten säger huvudsaken.
 */
export function shortSpoken(text, maxMeningar = 2) {
  const rå = String(text || "").replace(/\s+/g, " ").trim();
  if (!rå) return "";
  const meningar = rå.match(/[^.!?]+[.!?]*/g) || [rå];
  return meningar.slice(0, maxMeningar).map(m => m.trim()).filter(Boolean).join(" ").trim();
}
