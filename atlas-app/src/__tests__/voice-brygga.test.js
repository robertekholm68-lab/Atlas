// Askr — den nativa röstbryggan i Android-skalet.
//
// WebView får inte öppna mikrofonen: getUserMedia kastar NotReadableError och
// Androids egen mikrofonhistorik visar att appen aldrig nådde hårdvaran.
// Bryggan går runt problemet i stället för genom det — operativsystemets egen
// SpeechRecognizer spelar in, webbappen får bara texten.
//
// Det som testas här är att bryggan HÄRMAR webbläsarens gränssnitt tillräckligt
// väl för att resten av koden inte ska behöva veta varifrån orden kom. Hade den
// varit en andra väg genom koden hade tolkningen kunnat glida isär från
// webbläsarens — två uppsättningar regler för samma sak.

import { describe, it, expect, afterEach } from "vitest";
import { hasNativeVoice, createSetListener, _glömNativRöst } from "../engines/voice.js";

const UA_SKAL = "Mozilla/5.0 (Linux; Android 14; SM-S911B; wv) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";

function skalMedRöst({ tillgänglig = true } = {}) {
  // Svaret memoiseras i motorn (binder-anrop per rendering vore dyrt) — varje
  // testfall bygger en ny miljö och måste därför nollställa minnet först.
  _glömNativRöst();
  const anrop = { startade: 0, stoppade: 0, språk: null };
  globalThis.window = globalThis;
  Object.defineProperty(globalThis, "navigator", {
    value: { userAgent: UA_SKAL }, configurable: true, writable: true,
  });
  globalThis.AskrNative = {
    tillgänglig: () => tillgänglig,
    starta: (l) => { anrop.startade++; anrop.språk = l; },
    stoppa: () => { anrop.stoppade++; },
  };
  return anrop;
}

afterEach(() => {
  delete globalThis.AskrNative;
  delete globalThis.__askrRöstResultat;
  delete globalThis.__askrRöstFel;
  delete globalThis.__askrRöstSlut;
  // Minnet i motorn måste också bort, annars bär nästa testfil med sig svaret
  // "det finns en nativ brygga" in i en miljö där den inte finns.
  _glömNativRöst();
});

describe("bryggan upptäcks bara när den finns OCH fungerar", () => {
  it("skal med taligenkänning → nativ väg", () => {
    skalMedRöst();
    expect(hasNativeVoice()).toBe(true);
  });

  it("skal där enheten saknar taligenkänning → INTE nativ väg", () => {
    // Java svarar tillgänglig() === false. Då ska webbappen falla tillbaka i
    // stället för att anropa något som inte finns.
    skalMedRöst({ tillgänglig: false });
    expect(hasNativeVoice()).toBe(false);
  });

  it("utan brygga alls → INTE nativ väg", () => {
    globalThis.window = globalThis;
    delete globalThis.AskrNative;
    expect(hasNativeVoice()).toBe(false);
  });
});

describe("bryggan lämnar samma sorts resultat som webbläsaren", () => {
  it("ett yttrande tolkas till ett set — utan att röra getUserMedia", async () => {
    const anrop = skalMedRöst();
    let svar = null;
    const stoppa = createSetListener({ onResult: r => { svar = r; } });

    // Bryggan ska ha startats med svenskt språk.
    expect(anrop.startade).toBe(1);
    expect(anrop.språk).toBe("sv-SE");

    // Java svarar som Android gör: en lista med alternativa tolkningar.
    globalThis.__askrRöstResultat(["åttio åtta", "80 8"]);
    globalThis.__askrRöstSlut();

    expect(svar).not.toBe(null);
    expect(svar.ok).toBe(true);
    stoppa();
  });

  it("flera alternativ: den första som går att läsa som ett set vinner", () => {
    skalMedRöst();
    let svar = null;
    createSetListener({ onResult: r => { svar = r; } });
    // Första alternativet är obegripligt, andra är ett giltigt set.
    globalThis.__askrRöstResultat(["hallå där", "sjuttio fem gånger tio"]);
    globalThis.__askrRöstSlut();
    expect(svar.ok).toBe(true);
  });

  it("Androids felkoder når fram som fel, inte som tystnad", () => {
    skalMedRöst();
    let kod = null;
    createSetListener({ onError: k => { kod = k; } });
    globalThis.__askrRöstFel("no-speech");
    expect(kod).toBe("no-speech");
  });

  it("avbrott stoppar bryggan i Java, inte bara i JavaScript", () => {
    const anrop = skalMedRöst();
    const stoppa = createSetListener({});
    stoppa();
    expect(anrop.stoppade).toBeGreaterThan(0);
  });
});
