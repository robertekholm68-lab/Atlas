// MOTOR: vad den här telefonen faktiskt klarar, och om appen är installerad.
// Allt detekteras i körtid — ETT bygge som anpassar sig, inte separata byggen per plattform.
// (Gränserna följer inte ens alltid operativsystemet: Web Bluetooth finns i Chrome på
// Android men inte i Firefox på Android. Därför frågar vi webbläsaren, inte OS:et.)

// Installerad app på Android (TWA eller hemskärms-PWA). Rösten är avstängd där
// tills vi vet varför den dödar processen — en krasch är värre än en saknad funktion.
export function isInstalledAndroid() {
  return platformKind() === "android" && isStandalone();
}

export function isStandalone() {
  try {
    if (typeof window === "undefined") return false;
    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
    return !!window.navigator.standalone;                 // iOS-varianten
  } catch (e) { return false; }
}

export function platformKind() {
  try {
    const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
    if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && typeof document !== "undefined" && "ontouchend" in document)) return "ios";
    if (/Android/.test(ua)) return "android";
    return "desktop";
  } catch (e) { return "desktop"; }
}

const has = (obj, key) => { try { return !!obj && key in obj; } catch (e) { return false; } };

// En rad per funktion: finns den, och vad betyder det i praktiken.
export function capabilities() {
  const nav = typeof navigator !== "undefined" ? navigator : null;
  const win = typeof window !== "undefined" ? window : null;
  return [
    { id: "geolocation", label: "GPS", ok: !!(nav && nav.geolocation), note: "Sträcka och tempo på utepass." },
    { id: "motion", label: "Rörelsesensor", ok: !!(win && "DeviceMotionEvent" in win), note: "Stegskattning medan passet är igång." },
    { id: "wakeLock", label: "Skärmen tänd", ok: !!(nav && has(nav, "wakeLock")), note: "Skärmen slocknar inte mitt i passet." },
    { id: "camera", label: "Kamera", ok: !!(nav && nav.mediaDevices && nav.mediaDevices.getUserMedia), note: "Behövs för streckkodsläsaren." },
    { id: "barcode", label: "Streckkodsläsare", ok: !!(win && "BarcodeDetector" in win), note: "Skanna matvaror direkt. Saknas på iPhone — skriv in koden i stället." },
    { id: "notifications", label: "Notiser", ok: !!(win && "Notification" in win), note: "Når fram när appen inte är i förgrunden. På iPhone krävs att appen ligger på hemskärmen." },
    { id: "vibration", label: "Vibration", ok: !!(nav && "vibrate" in nav), note: "Haptik när vilan är slut. Finns inte på iPhone — använd ljud i stället." },
    { id: "audio", label: "Ljudsignal", ok: !!(win && (win.AudioContext || win.webkitAudioContext)), note: "Pip när vilan är slut. Fungerar överallt." },
    { id: "voiceInput", label: "Röstinmatning", ok: !!(win && (win.SpeechRecognition || win.webkitSpeechRecognition)) && !(platformKind() === "ios" && isStandalone()), note: "Säg vikt och reps under passet. Apple har inte kopplat in mikrofonen för webbappar på hemskärmen, så den är tyst där." },
    { id: "speech", label: "Talad cue", ok: !!(win && "speechSynthesis" in win), note: "Säger till när vilan är slut." },
    { id: "bluetooth", label: "Pulsband", ok: !!(nav && nav.bluetooth), note: "Puls från BLE-band. Apple har inte implementerat Web Bluetooth, så det saknas på iPhone." },
    { id: "nfc", label: "NFC-taggar", ok: !!(win && "NDEFReader" in win), note: "Tagga maskiner i gymmet. Apple har inte implementerat Web NFC, så det saknas på iPhone." },
    { id: "share", label: "Dela", ok: !!(nav && nav.share), note: "Dela pass via telefonens delningsmeny." },
    { id: "storage", label: "Beständig lagring", ok: !!(nav && nav.storage && nav.storage.persist), note: "Skyddar din data från att rensas automatiskt." },
  ];
}

export function capabilitySummary() {
  const caps = capabilities();
  return { caps, ok: caps.filter(c => c.ok).length, total: caps.length };
}

// Installationsråd. Poängen är INTE att tjata om installation, utan att data faktiskt
// kan rensas bort på iOS när en webbapp bara ligger som en flik — och all träningshistorik
// bor i webbläsarens lagring.
export function installAdvice() {
  const kind = platformKind();
  const installed = isStandalone();
  if (installed) return { installed: true, kind, needed: false, steps: [], why: null };
  if (kind === "ios") return {
    installed: false, kind, needed: true,
    why: "På iPhone kan webbläsaren rensa lagrad data för sajter som inte används på ett tag. Lägger du till ATLAS på hemskärmen behandlas den som en app — historiken ligger kvar, och notiser kan fungera.",
    steps: ["Tryck på Dela-ikonen i Safari (fyrkanten med pilen)", "Bläddra ner och välj \"Lägg till på hemskärmen\"", "Bekräfta med \"Lägg till\"", "Öppna ATLAS från hemskärmen härefter"],
  };
  if (kind === "android") return {
    installed: false, kind, needed: true,
    why: "Installerad som app får ATLAS egen ikon, startar utan webbläsarens ram och behåller din data tryggare.",
    steps: ["Öppna webbläsarens meny (tre prickar)", "Välj \"Installera app\" eller \"Lägg till på startskärmen\"", "Bekräfta", "Öppna ATLAS från startskärmen härefter"],
  };
  return { installed: false, kind, needed: false, steps: [], why: null };
}
