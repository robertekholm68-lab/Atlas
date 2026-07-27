// MOTOR: röstinmatning av vikt och reps under pass.
//
// Två delar, medvetet åtskilda:
//   1. parseSetSpeech() — ren textfunktion, ingen webbläsare inblandad. Testbar.
//   2. createSetListener() — tunn wrapper runt Web Speech API.
//
// Grundregel: rösten FÖRESLÅR, den sparar aldrig själv. En felhörd åtta som blir
// åttio hamnar annars i loggen och förgiftar load, recovery och readiness — precis
// den sortens påhittade siffra Askr är byggd för att inte visa. Därför går allt
// via ett förslag som användaren bekräftar.

import { platformKind, isStandalone, isAndroidWebView } from "./platform.js";

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
/**
 * NATIV RÖSTBRYGGA (Android-skalet).
 *
 * WebView får inte öppna mikrofonen på minst en telefon: getUserMedia kastar
 * NotReadableError och Androids egen mikrofonhistorik visar att appen aldrig
 * nådde hårdvaran. Skalet exponerar därför operativsystemets egen
 * taligenkänning som `window.AskrNative`, och den här adaptern får den att se
 * ut precis som webbläsarens SpeechRecognition.
 *
 * Poängen med att härma gränssnittet i stället för att skriva en andra väg
 * genom koden: tolkningen (parseSetSpeech) och all felhantering nedanför är
 * densamma. Bara ordens ursprung skiljer.
 */
// Svaret memoiseras. `tillgänglig()` är ett SYNKRONT anrop över JS↔Java-bryggan
// som i sin tur gör SpeechRecognizer.isRecognitionAvailable() — ett binder-anrop
// mot en annan process. hasNativeVoice() nås från voiceSupport(), som vyerna
// anropar vid varje omritning, så utan minne blir det ett processhopp per
// rendering mitt i ett pass. Att enheten skulle få eller tappa taligenkänning
// medan appen är igång är inte ett fall värt att betala för.
//
// null = inte frågat än. Nollställs av _glömNativRöst() i testerna.
let nativSvar = null;

export function hasNativeVoice() {
  if (nativSvar !== null) return nativSvar;
  try {
    nativSvar = typeof window !== "undefined" && !!window.AskrNative
      && typeof window.AskrNative.starta === "function"
      && !!window.AskrNative.tillgänglig();
  } catch (e) { nativSvar = false; }
  return nativSvar;
}

/** Endast för tester: glöm det memoiserade svaret. */
export function _glömNativRöst() { nativSvar = null; }

/** Konstruktor med samma yta som SpeechRecognition: lang, start, stop, onresult, onerror, onend. */
function NativRecognition() {
  this.lang = "sv-SE";
  this.onresult = null; this.onerror = null; this.onend = null;
  this._aktiv = false;
}
NativRecognition.prototype.start = function () {
  const jag = this;
  this._aktiv = true;
  // Java svarar genom att anropa de här. Formen på ev.results[0] efterliknar
  // webbläsarens, så koden nedanför inte behöver veta varifrån orden kom.
  window.__askrRöstResultat = function (alternativ) {
    if (!jag._aktiv) return;
    const lista = (alternativ || []).map(t => ({ transcript: t, confidence: 1 }));
    jag.onresult && jag.onresult({ results: [lista] });
  };
  window.__askrRöstFel = function (kod) {
    if (!jag._aktiv) return;
    jag.onerror && jag.onerror({ error: kod });
  };
  window.__askrRöstSlut = function () {
    if (!jag._aktiv) return;
    jag._aktiv = false;
    jag.onend && jag.onend();
  };
  try { window.AskrNative.starta(this.lang); }
  catch (e) { this.onerror && this.onerror({ error: "start-misslyckades" }); }
};
NativRecognition.prototype.stop = function () {
  this._aktiv = false;
  try { window.AskrNative.stoppa(); } catch (e) {}
};

/** Taligenkännaren som ska användas: skalets nativa om den finns, annars webbläsarens. */
function hämtaRecognition() {
  if (hasNativeVoice()) return NativRecognition;
  return (typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition)) || null;
}

export function voiceSupport() {
  if (typeof window === "undefined") return { ok: false, reason: "ingen-window", note: "" };
  // HÄR LÅG EN GENERELL AVSTÄNGNING FÖR INSTALLERADE ANDROID-APPAR.
  //
  // Den byggdes när mikrofonen dödade appen och orsaken var okänd. Nu är den
  // känd, och spärren gjorde tre saker fel:
  //
  //   · Den påstod att appen kraschar. Det gör den inte — getUserMedia
  //     avvisas prydligt med NotReadableError, och micReady fångar det innan
  //     taligenkänningen ens startas.
  //   · Den hänvisade till Chrome. På telefonen som prövades var det just
  //     Chrome som INTE fungerade; Samsung Browser gjorde det.
  //   · Den generaliserade ur ett enda fall. WebView-versioner och
  //     tillverkare skiljer sig — en telefon är inte alla telefoner.
  //
  // Knappen försöker nu, och micReady förklarar ärligt när den inte kan.
  const Rec = hämtaRecognition();
  if (!Rec) return {
    ok: false, reason: "saknas",
    note: "Den här webbläsaren har inte taligenkänning. Chrome på Android fungerar.",
  };
  if (platformKind() === "ios" && isStandalone()) return {
    ok: false, reason: "ios-hemskarm",
    note: "Apple har inte kopplat in mikrofonen för webbappar som ligger på hemskärmen — funktionen finns men är tyst. Öppna Askr i Safari om du vill prova rösten där.",
  };
  if (platformKind() === "ios") return {
    ok: true, reason: "ios-safari",
    note: "Fungerar i Safari, men inte om du lägger till Askr på hemskärmen.",
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
    const namn = (err && err.name) || "okänt fel";
    // DET OKÄNDA FALLET SKA SÄGA ATT DET ÄR OKÄNT.
    //
    // Tidigare gissade den här grenen på behörigheten: "kan sakna
    // mikrofonbehörighet — öppna i webbläsaren". Det var fel råd i det fall som
    // faktiskt inträffade på telefon: behörigheten VAR beviljad i Androids
    // inställningar, och felet var något annat. Ett felmeddelande som pekar åt
    // fel håll är värre än ett som erkänner sin okunskap — användaren letar på
    // rätt ställe och hittar inget fel, och slutar lita på appen.
    //
    // Felnamnet skrivs ut. Det är inte vackert, men det är det enda som gör
    // problemet diagnosticerbart för den som ska laga det.
    return {
      ok: false,
      reason: namn === "NotAllowedError" ? "nekad" : namn === "NotFoundError" ? "ingen-mikrofon" : "fel",
      namn,
      note: namn === "NotAllowedError"
        ? "Mikrofonen är inte tillåten. Tillåt mikrofon för Askr i appens eller webbläsarens inställningar."
        : namn === "NotFoundError"
        ? "Ingen mikrofon hittades."
        : namn === "NotReadableError"
        // I ETT APP-SKAL BETYDER DET NÅGOT ANNAT ÄN "UPPTAGEN".
        //
        // Bevis från telefon: behörigheten beviljad, ingen annan app igång, och
        // Androids EGEN mikrofonhistorik visade inte Askr alls — inspelningen
        // nådde alltså aldrig operativsystemet. NotReadableError var WebViewens
        // sätt att säga att den inte fick öppna hårdvaran, inte att någon annan
        // höll den.
        //
        // Att då skicka användaren på jakt efter en app som spelar in är att
        // skicka hen efter något som inte finns. Beskedet säger vad vi vet och
        // pekar på vägen som fungerar.
        ? isAndroidWebView()
          ? `Röstloggning fungerar inte i app-skalet på den här telefonen (${namn}). Android ger inte skalet tillgång till mikrofonen trots att behörigheten är beviljad, och det går inte att lösa inifrån appen. Öppna Askr i webbläsaren om du vill diktera.`
          : "Mikrofonen är upptagen av något annat. Stäng appar som spelar in och försök igen."
        : `Mikrofonen gick inte att öppna (${namn}). Behörigheten kan mycket väl vara i ordning — det här är något annat, och felnamnet är ledtråden.`,
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
  // Spåret läggs FÖRE anropet så vi vet om appen dog här.
  markVoiceAttempt();
  // Den nativa vägen går inte genom WebViewens mikrofon alls — operativsystemet
  // spelar in. Att fråga getUserMedia först vore att kontrollera en dörr vi
  // inte tänker gå igenom, och den dörren är dessutom just den som är låst.
  if (hasNativeVoice()) {
    clearVoiceAttempt();
    return _startcreateSetListener({ onResult, onError, onEnd, timeoutMs });
  }
  let avbruten0 = false, stoppaInre = null;
  micReady().then(m => {
    if (avbruten0) return;
    if (!m.ok) { clearVoiceAttempt(); onError && onError(m.reason, m.note); onEnd && onEnd(); return; }
    stoppaInre = _startcreateSetListener({ onResult, onError, onEnd, timeoutMs });
  });
  return () => { avbruten0 = true; if (stoppaInre) stoppaInre(); };
}

function _startcreateSetListener({ onResult, onError, onEnd, timeoutMs }) {
  const stöd = voiceSupport();
  if (!stöd.ok) { onError && onError(stöd.reason, stöd.note); return () => {}; }

  const Rec = hämtaRecognition();
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
    klar = true; städa(); clearVoiceAttempt();
    onResult && onResult(bäst || { ok: false, reason: "inget-svar", raw: "" });
    onEnd && onEnd();
  };

  rec.onerror = (ev) => {
    klar = true; städa();
    const kod = (ev && ev.error) || "okänt";
    const text = kod === "not-allowed" || kod === "service-not-allowed"
      ? "Mikrofonen är blockerad. Tillåt mikrofon för Askr i webbläsarens inställningar."
      : kod === "no-speech" ? "Hörde ingenting."
      : kod === "network" ? "Taligenkänningen behöver nät just nu — den här telefonen kan inte tolka lokalt."
      : "Det gick inte att tolka ljudet.";
    onError && onError(kod, text);
    onEnd && onEnd();
  };

  rec.onend = () => { clearVoiceAttempt(); if (!klar) { klar = true; städa(); onEnd && onEnd(); } };

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
  // Spåret läggs FÖRE anropet så vi vet om appen dog här.
  markVoiceAttempt();
  // Samma sak här: den nativa vägen rör aldrig WebViewens mikrofon.
  if (hasNativeVoice()) {
    clearVoiceAttempt();
    return _startcreateDictation({ onResult, onError, onEnd, timeoutMs });
  }
  let avbruten0 = false, stoppaInre = null;
  micReady().then(m => {
    if (avbruten0) return;
    if (!m.ok) { clearVoiceAttempt(); onError && onError(m.reason, m.note); onEnd && onEnd(); return; }
    stoppaInre = _startcreateDictation({ onResult, onError, onEnd, timeoutMs });
  });
  return () => { avbruten0 = true; if (stoppaInre) stoppaInre(); };
}

function _startcreateDictation({ onResult, onError, onEnd, timeoutMs }) {
  const stöd = voiceSupport();
  if (!stöd.ok) { onError && onError(stöd.reason, stöd.note); return () => {}; }

  const Rec = hämtaRecognition();
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
      kod === "not-allowed" || kod === "service-not-allowed" ? "Mikrofonen är blockerad. Tillåt mikrofon för Askr i webbläsarens inställningar."
      : kod === "no-speech" ? "Hörde ingenting."
      : kod === "network" ? "Taligenkänningen behöver nät just nu."
      : "Det gick inte att tolka ljudet.");
    onEnd && onEnd();
  };

  rec.onend = () => { clearVoiceAttempt(); if (!klar) { klar = true; städa(); onEnd && onEnd(); } };
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

/* ---------- självläkning efter en krasch ---------- */
//
// En dödad renderare går inte att fånga med try/catch — ingen kod hinner köra.
// Men vi kan lämna ett spår INNAN mikrofonen rörs och sudda det när allt gick bra.
// Ligger spåret kvar vid nästa start vet vi att appen dog mitt i, och då stänger
// vi av röstinmatningen automatiskt i stället för att låta användaren gå på samma
// mina igen. Bättre en funktion som stänger av sig än en app som dör.

const SPÅR = "atlas.voice.pending";

function sparaSpår(v) { try { localStorage.setItem(SPÅR, String(v)); } catch (e) {} }
function läsSpår() { try { return localStorage.getItem(SPÅR); } catch (e) { return null; } }
function rensaSpår() { try { localStorage.removeItem(SPÅR); } catch (e) {} }

/** Anropas precis innan mikrofonen används. */
export function markVoiceAttempt() { sparaSpår(Date.now()); }

/** Anropas när användningen avslutats normalt. */
export function clearVoiceAttempt() { rensaSpår(); }

/**
 * Kördes appen ner förra gången mikrofonen användes?
 * Anropas en gång vid start. Rensar spåret, så den svarar bara ja en gång.
 */
export function voiceCrashedLastTime() {
  const v = läsSpår();
  if (!v) return false;
  rensaSpår();
  const när = Number(v);
  // Ett spår från samma sekund kan vara en helt vanlig omladdning mitt i.
  return Number.isFinite(när) && Date.now() - när > 1500;
}
