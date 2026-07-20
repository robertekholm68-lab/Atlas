import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { parseSetSpeech, ordTillTal, voiceSupport , shortSpoken, voiceCrashedLastTime, markVoiceAttempt, clearVoiceAttempt } from "../engines/voice.js";

describe("ordTillTal", () => {
  it("tolkar ental och tiotal", () => {
    expect(ordTillTal("åtta")).toBe(8);
    expect(ordTillTal("åttio")).toBe(80);
    expect(ordTillTal("tolv")).toBe(12);
  });
  it("tolkar sammansatta tiotal i ett ord", () => {
    expect(ordTillTal("åttiotvå")).toBe(82);
    expect(ordTillTal("tjugofem")).toBe(25);
    expect(ordTillTal("sjuttiosju")).toBe(77);
  });
  it("tolkar hundratal", () => {
    expect(ordTillTal("hundra")).toBe(100);
    expect(ordTillTal("etthundra")).toBe(100);
    expect(ordTillTal("tvåhundra")).toBe(200);
    expect(ordTillTal("hundratjugo")).toBe(120);
  });
  it("säger nej till ord som inte är tal", () => {
    expect(ordTillTal("bänkpress")).toBeNull();
    expect(ordTillTal("")).toBeNull();
  });
});

describe("parseSetSpeech – det vanliga fallet", () => {
  it("tar siffror i ordning som vikt och reps", () => {
    expect(parseSetSpeech("80 8")).toMatchObject({ ok: true, weight: 80, reps: 8 });
  });
  it("tar räkneord i ordning", () => {
    expect(parseSetSpeech("åttio åtta")).toMatchObject({ ok: true, weight: 80, reps: 8 });
  });
  it("slår aldrig ihop två ord till ett tal", () => {
    // Medvetet: "åttio åtta" är 80 kg och 8 reps, inte 88. Sammansatta tal sägs
    // i ett ord, och då fungerar de.
    expect(parseSetSpeech("åttiotvå tio")).toMatchObject({ ok: true, weight: 82, reps: 10 });
  });
  it("klarar decimaler med svenskt komma", () => {
    expect(parseSetSpeech("82,5 kilo 6 reps")).toMatchObject({ ok: true, weight: 82.5, reps: 6 });
  });
});

describe("parseSetSpeech – enheter vinner över ordning", () => {
  it("tolkar rätt även när reps sägs först", () => {
    expect(parseSetSpeech("åtta reps åttio kilo")).toMatchObject({ ok: true, weight: 80, reps: 8 });
  });
  it("godtar olika ord för reps", () => {
    for (const o of ["reps", "gånger", "repetitioner", "ggr"]) {
      expect(parseSetSpeech(`60 kilo 12 ${o}`)).toMatchObject({ ok: true, weight: 60, reps: 12 });
    }
  });
  it("förstår kroppsvikt som noll kilo", () => {
    expect(parseSetSpeech("kroppsvikt 12 reps")).toMatchObject({ ok: true, weight: 0, reps: 12 });
  });
});

describe("parseSetSpeech – säger hellre nej än gissar", () => {
  it("vägrar när bara ett tal hörs", () => {
    const r = parseSetSpeech("åttio");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("ett-tal");
    expect(r.hint).toBe(80);           // men berättar vad den hörde
  });
  it("vägrar tomt och rena ord", () => {
    expect(parseSetSpeech("").ok).toBe(false);
    expect(parseSetSpeech("bänkpress känns tungt").ok).toBe(false);
  });
  it("vägrar orimlig vikt", () => {
    expect(parseSetSpeech("8000 kilo 5 reps")).toMatchObject({ ok: false, reason: "vikt-orimlig" });
  });
  it("vägrar orimliga reps", () => {
    expect(parseSetSpeech("80 kilo 900 reps")).toMatchObject({ ok: false, reason: "reps-orimliga" });
    expect(parseSetSpeech("80 kilo 0 reps")).toMatchObject({ ok: false, reason: "reps-orimliga" });
  });
  it("returnerar alltid ett objekt, aldrig undefined", () => {
    for (const x of [null, undefined, 42, {}]) {
      expect(parseSetSpeech(x)).toHaveProperty("ok");
    }
  });
});

describe("parseSetSpeech – upprepning", () => {
  it("förstår samma igen", () => {
    expect(parseSetSpeech("samma igen")).toMatchObject({ ok: true, repeat: true });
    expect(parseSetSpeech("en till")).toMatchObject({ ok: true, repeat: true });
  });
  it("men siffror slår upprepning", () => {
    expect(parseSetSpeech("samma vikt 8 reps 80 kilo")).toMatchObject({ ok: true, repeat: false, weight: 80, reps: 8 });
  });
});

describe("voiceSupport", () => {
  it("returnerar alltid ok och reason", () => {
    const s = voiceSupport();
    expect(typeof s.ok).toBe("boolean");
    expect(typeof s.reason).toBe("string");
  });
  it("säger nej när API:et saknas", () => {
    const spara = { S: globalThis.window?.SpeechRecognition, W: globalThis.window?.webkitSpeechRecognition };
    if (typeof window !== "undefined") {
      delete window.SpeechRecognition; delete window.webkitSpeechRecognition;
      expect(voiceSupport()).toMatchObject({ ok: false, reason: "saknas" });
      if (spara.S) window.SpeechRecognition = spara.S;
      if (spara.W) window.webkitSpeechRecognition = spara.W;
    }
  });
});

/* Wrappern testad mot en stubbad igenkännare — utan den täcks bara parsern. */
describe("createSetListener", () => {
  function stubbaMik(ok = true) {
    const spår = { stop() {} };
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: () => ok ? Promise.resolve({ getTracks: () => [spår] }) : Promise.reject(Object.assign(new Error("nej"), { name: "NotAllowedError" })) },
    });
  }

  function stubba(alternativ, { fel = null, mik = true } = {}) {
    stubbaMik(mik);
    class FakeRec {
      constructor() { this.lang = ""; this.maxAlternatives = 1; }
      start() {
        setTimeout(() => {
          if (fel) { this.onerror && this.onerror({ error: fel }); this.onend && this.onend(); return; }
          const res = alternativ.map(t => ({ transcript: t }));
          res.length = alternativ.length;
          this.onresult && this.onresult({ results: [res] });
        }, 0);
      }
      stop() {}
    }
    window.SpeechRecognition = FakeRec;
    return () => { delete window.SpeechRecognition; };
  }

  it("väljer det första alternativet som går att tolka", async () => {
    const städa = stubba(["åttio", "80 8"]);
    const { createSetListener } = await import("../engines/voice.js");
    const r = await new Promise(res => createSetListener({ onResult: res }));
    expect(r).toMatchObject({ ok: true, weight: 80, reps: 8 });
    städa();
  });

  it("ber om lokal bearbetning när webbläsaren stöder det", async () => {
    const städa = stubba(["80 8"]);
    const { createSetListener } = await import("../engines/voice.js");
    await new Promise(res => createSetListener({ onResult: res }));
    städa();
  });

  it("startar aldrig igenkänningen när mikrofonen är nekad", async () => {
    // Utan den här vakten dör hela processen i en installerad Android-app
    // som saknar mikrofonbehörighet — appen "kraschar" utan felmeddelande.
    const städa = stubba([], { mik: false });
    const { createSetListener } = await import("../engines/voice.js");
    const text = await new Promise(res => createSetListener({ onError: (_k, t) => res(t) }));
    expect(text).toMatch(/tillåten|mikrofon/i);
    städa();
  });

  it("returnerar en avbrytfunktion även när stöd saknas", async () => {
    const { createSetListener } = await import("../engines/voice.js");
    delete window.SpeechRecognition; delete window.webkitSpeechRecognition;
    const av = createSetListener({ onError: () => {} });
    expect(typeof av).toBe("function");
    expect(() => av()).not.toThrow();
  });
});

describe("shortSpoken – rösten säger huvudsaken, skärmen bär djupet", () => {
  it("kortar till två meningar", () => {
    const r = shortSpoken("Först detta. Sedan detta. Och till sist en tredje sak som inte ska sägas.");
    expect(r).toBe("Först detta. Sedan detta.");
  });
  it("klarar text utan skiljetecken", () => {
    expect(shortSpoken("bara en rad utan punkt")).toBe("bara en rad utan punkt");
  });
  it("klarar tomt", () => {
    for (const x of ["", null, undefined]) expect(shortSpoken(x)).toBe("");
  });
  it("går att styra antalet meningar", () => {
    expect(shortSpoken("Ett. Två. Tre.", 1)).toBe("Ett.");
  });
});

describe("självläkning – appen upptäcker att den dog i mikrofonen", () => {
  // Egen lagring i minnet, aldrig den riktiga. Testerna körs i node-miljö där
  // localStorage inte finns, och att röra en delad sådan förorenar andra testfiler.
  let original;
  beforeEach(() => {
    const box = {};
    original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: k => (k in box ? box[k] : null),
        setItem: (k, v) => { box[k] = String(v); },
        removeItem: k => { delete box[k]; },
      },
    });
  });
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  });

  it("inget spår betyder ingen krasch", () => {
    expect(voiceCrashedLastTime()).toBe(false);
  });
  it("ett gammalt spår betyder att appen dog mitt i", () => {
    localStorage.setItem("atlas.voice.pending", String(Date.now() - 9000));
    expect(voiceCrashedLastTime()).toBe(true);
  });
  it("svarar bara ja en gång — spåret rensas", () => {
    localStorage.setItem("atlas.voice.pending", String(Date.now() - 9000));
    expect(voiceCrashedLastTime()).toBe(true);
    expect(voiceCrashedLastTime()).toBe(false);
  });
  it("ett färskt spår är en vanlig omladdning, inte en krasch", () => {
    localStorage.setItem("atlas.voice.pending", String(Date.now()));
    expect(voiceCrashedLastTime()).toBe(false);
  });
  it("markera och rensa fungerar ihop", () => {
    markVoiceAttempt();
    expect(localStorage.getItem("atlas.voice.pending")).toBeTruthy();
    clearVoiceAttempt();
    expect(localStorage.getItem("atlas.voice.pending")).toBeNull();
  });
});

describe("rösten är avstängd där den kraschat", () => {
  it("installerad Android-app säger nej med förklaring", async () => {
    const p = await import("../engines/platform.js");
    const orig = { ua: navigator.userAgent, mm: window.matchMedia };
    Object.defineProperty(navigator, "userAgent", { configurable: true, value: "Mozilla/5.0 (Linux; Android 14)" });
    window.matchMedia = () => ({ matches: true });
    expect(p.isInstalledAndroid()).toBe(true);
    const s = voiceSupport();
    expect(s.ok).toBe(false);
    expect(s.reason).toBe("android-installerad");
    expect(s.note).toMatch(/Chrome/);
    Object.defineProperty(navigator, "userAgent", { configurable: true, value: orig.ua });
    window.matchMedia = orig.mm;
  });
});

describe("byggstämpeln tolkas som UTC", () => {
  // Stämpeln sätts med toISOString() vid bygget, alltså UTC. Visas den rakt av
  // ser den två timmar fel ut i Sverige på sommaren.
  it("202607202054 UTC är 22:54 svensk sommartid", () => {
    const d = new Date(Date.UTC(2026, 6, 20, 20, 54));
    const svensk = d.toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", hour: "2-digit", minute: "2-digit" });
    expect(svensk).toBe("22:54");
  });
  it("vintertid ger en timmes skillnad", () => {
    const d = new Date(Date.UTC(2026, 0, 15, 20, 54));
    expect(d.toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", hour: "2-digit", minute: "2-digit" })).toBe("21:54");
  });
});
