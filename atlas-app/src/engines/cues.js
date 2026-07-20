// MOTOR: signaler när något händer i passet (vilan slut, sista setet).
// Tre kanaler med olika räckvidd — appen använder dem tillsammans så minst en når fram:
//   ljud   → fungerar överallt, även där vibration saknas (iOS)
//   röst   → talad cue, bra när telefonen ligger på golvet
//   notis  → når fram även när appen inte är i förgrunden
// Allt är opt-in och görs tyst om webbläsaren säger nej.

let _ctx = null;
function audioCtx() {
  try {
    const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    if (!_ctx) _ctx = new AC();
    if (_ctx.state === "suspended") _ctx.resume();
    return _ctx;
  } catch (e) { return null; }
}

// Kort pipsignal, genererad i farten — inga ljudfiler att baka in i bygget.
export function playBeep({ times = 2, freq = 880, ms = 140, gap = 110 } = {}) {
  const ctx = audioCtx(); if (!ctx) return false;
  try {
    for (let i = 0; i < times; i++) {
      const t0 = ctx.currentTime + i * ((ms + gap) / 1000);
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.28, t0 + 0.02);      // mjuk attack, inget klick
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t0); osc.stop(t0 + ms / 1000 + 0.02);
    }
    return true;
  } catch (e) { return false; }
}

export function speak(text, { lang = "sv-SE", rate = 1.05 } = {}) {
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) return false;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = rate;
    const sv = window.speechSynthesis.getVoices().find(v => /sv/i.test(v.lang));
    if (sv) u.voice = sv;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    return true;
  } catch (e) { return false; }
}

export function notificationState() {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission;                                  // granted | denied | default
  } catch (e) { return "unsupported"; }
}

export async function requestNotifications() {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return await Notification.requestPermission();
  } catch (e) { return "denied"; }
}

// Visar notis bara när fönstret inte är i förgrunden — annars räcker ljudet.
export function notify(title, body, { force = false } = {}) {
  try {
    if (notificationState() !== "granted") return false;
    if (!force && typeof document !== "undefined" && document.visibilityState === "visible") return false;
    new Notification(title, { body, tag: "atlas-cue", silent: false });
    return true;
  } catch (e) { return false; }
}

// Samlad signal för "vilan är slut".
export function restDoneCue(prefs = {}) {
  const used = [];
  if (prefs.sound !== false && playBeep({ times: 2 })) used.push("sound");
  if (prefs.voice && speak("Vilan är slut")) used.push("voice");
  if (prefs.vibrate !== false) { try { if (navigator.vibrate && navigator.vibrate([120, 80, 120])) used.push("vibrate"); } catch (e) { } }
  if (prefs.notify && notify("Vilan är slut", "Dags för nästa set.")) used.push("notify");
  return used;
}

// voiceInput = röstinmatning av vikt/reps under pass. Tillval, av som standard:
// gymljud gör igenkänningen ojämn, och den ska aldrig vara enda vägen in.
export const DEFAULT_CUES = { sound: true, voice: false, vibrate: true, notify: false, voiceInput: false };
