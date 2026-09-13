/**
 * @vitest-environment jsdom
 */
// PULSBAND I ASKR 2.0.
//
// Motorn (engines/hr.js) har funnits sedan mobilkompanjonen, men 2.0 hade
// aldrig kopplat in den: inget fält på passet, ingen visning, och sport-
// belastningen räknades ur gissad intensitet. Robert har Garmin, testarna
// blandat — och Apple har inte implementerat Web Bluetooth, så appen måste
// säga VARFÖR det inte går, inte bara att det inte går.
//
// Bluetooth finns inte i jsdom. Kopplingen prövas därför mot en fejkad GATT
// som beter sig som ett riktigt band: en karakteristik som avger
// Heart Rate Measurement-paket. Det är samma väg koden tar med ett riktigt
// band — bara datan är påhittad, inte anropen.

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import {
  parseHeartRate, hrSummary, hrIntensity, bluetoothStatus, sessionPulsFält,
} from "../engines/hr.js";
import { buildSession } from "../engines/session.js";
import { WorkoutView, DoneView, buildLive } from "../atlas2/WorkoutView.jsx";
import { byggSportpass } from "../atlas2/SportView.jsx";
import { resolveActivity } from "../data/exercises.js";

const src = readFileSync(resolve("src/atlas2/WorkoutView.jsx"), "utf8");
const sportSrc = readFileSync(resolve("src/atlas2/SportView.jsx"), "utf8");

/** Ett Heart Rate Measurement-paket: flaggbyte + puls (8 eller 16 bitar). */
function paket(bpm, sexton = false) {
  const buf = new ArrayBuffer(sexton ? 3 : 2);
  const dv = new DataView(buf);
  dv.setUint8(0, sexton ? 0x01 : 0x00);
  if (sexton) dv.setUint16(1, bpm, true); else dv.setUint8(1, bpm);
  return dv;
}

// ── Motorn ────────────────────────────────────────────────────────────────

describe("pulsmotorn", () => {
  it("tolkar både 8- och 16-bitarsformatet", () => {
    expect(parseHeartRate(paket(132))).toBe(132);
    expect(parseHeartRate(paket(132, true))).toBe(132);
    // Noll och orimliga tal är brus, inte puls.
    expect(parseHeartRate(paket(0))).toBeNull();
    expect(parseHeartRate(paket(250, true))).toBeNull();
  });

  it("sammanfattar snitt, max och zoner ur åldern", () => {
    expect(hrSummary([])).toBeNull();
    const s = hrSummary([120, 130, 140, 170], { age: 40 });   // maxpuls 180
    expect(s.avg).toBe(140);
    expect(s.max).toBe(170);
    expect(s.samples).toBe(4);
    // 120 < 126 lätt · 130, 140 < 153 medel · 170 hård → 25/50/25
    expect(s.zones).toEqual({ latt: 25, medel: 50, hard: 25 });
    // Utan ålder finns ingen maxpuls — då finns inga zoner, inte gissade zoner.
    expect(hrSummary([120, 130]).zones).toBeNull();
  });

  it("intensitet ur puls kräver ålder", () => {
    expect(hrIntensity(125, 40)).toBe("Lätt");
    expect(hrIntensity(130, 40)).toBe("Medel");
    expect(hrIntensity(160, 40)).toBe("Hård");
    expect(hrIntensity(160, null)).toBeNull();
  });

  it("passets pulsfält: allt eller inget", () => {
    // Ett pass utan band ska inte bära avgHr: null som ser ut som glömt.
    expect(sessionPulsFält([], 40)).toEqual({});
    expect(sessionPulsFält(null, 40)).toEqual({});
    const f = sessionPulsFält([120, 130, 140], 40);
    expect(f).toEqual({ avgHr: 130, maxHr: 140, hrSamples: 3, hrZones: { latt: 33, medel: 67, hard: 0 } });
    // Utan ålder: snitt och max, men inga zoner.
    expect(sessionPulsFält([120, 130, 140])).toEqual({ avgHr: 130, maxHr: 140, hrSamples: 3 });
  });

  it("buildSession släpper igenom pulsfälten oförändrade", () => {
    const s = buildSession({ sets: [{ exerciseId: "bench_press", weight: 60, reps: 8 }], ...sessionPulsFält([130, 150], 40) });
    expect(s.avgHr).toBe(140);
    expect(s.maxHr).toBe(150);
    expect(s.hrZones).toBeTruthy();
  });
});

// ── Skälet när det inte går ───────────────────────────────────────────────

describe("bluetoothStatus säger varför", () => {
  const ua = navigator.userAgent;
  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });
    delete navigator.bluetooth;
  });
  const sättUA = v => Object.defineProperty(navigator, "userAgent", { value: v, configurable: true });

  it("ok när webbläsaren har det", () => {
    Object.defineProperty(navigator, "bluetooth", { value: {}, configurable: true });
    expect(bluetoothStatus()).toEqual({ ok: true, skäl: null });
  });

  it("iPhone: Apple, inte användaren", () => {
    sättUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1");
    const st = bluetoothStatus();
    expect(st.ok).toBe(false);
    expect(st.skäl).toMatch(/Apple/);
  });

  it("Android-skalet: öppna i Chrome", () => {
    // ";  wv)" är WebViewens signatur i user agent-strängen.
    sättUA("Mozilla/5.0 (Linux; Android 14; Pixel 7; wv) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36");
    const st = bluetoothStatus();
    expect(st.ok).toBe(false);
    expect(st.skäl).toMatch(/skal/);
    expect(st.skäl).toMatch(/Chrome/);
  });

  it("annan webbläsare: Web Bluetooth saknas", () => {
    sättUA("Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0");
    expect(bluetoothStatus().skäl).toMatch(/Web Bluetooth/);
  });
});

// ── Sportpasset ───────────────────────────────────────────────────────────

describe("snittpuls på sportpass", () => {
  const löpning = resolveActivity("running");

  it("avgHr sparas bara när den angavs", () => {
    const akt = löpning || { id: "x", name: "Löpning", cardio: 1, activation: [] };
    const utan = byggSportpass(akt, 30, "Medel", false, 1, null);
    expect(utan).not.toHaveProperty("avgHr");
    const med = byggSportpass(akt, 30, "Medel", false, 1, null, 148.4);
    expect(med.avgHr).toBe(148);
  });

  it("vyn skickar den giltiga pulsen till byggSportpass, och låter pulsen välja intensitet", () => {
    // Statiskt: signaturen och anropet ska hänga ihop, annars sparas talet aldrig.
    // Anropet har nästlade parenteser (Date.now(), parseFloat(…)) — ett regex
    // som stannar vid första ")" ser aldrig sista argumentet. Därför en
    // ordagrann sträng.
    expect(sportSrc).toContain("|| null, pulsGiltig)");
    expect(sportSrc).toMatch(/if \(urPulsen\) setIntensitet\(urPulsen\);/);
  });
});

// ── Passvyn med ett fejkat band ───────────────────────────────────────────

/** En GATT som beter sig som ett band: samma anrop som ett riktigt, påhittad data. */
function fejkatBand() {
  const lyssnare = {};
  const spår = { startade: 0, stoppade: 0, nerkopplad: 0 };
  const ch = {
    addEventListener: (t, f) => { lyssnare[t] = f; },
    removeEventListener: () => {},
    startNotifications: async () => { spår.startade++; },
    stopNotifications: async () => { spår.stoppade++; },
  };
  const device = {
    name: "Fejkband H10",
    gatt: {
      connected: true,
      connect: async () => ({ getPrimaryService: async () => ({ getCharacteristic: async () => ch }) }),
      disconnect: () => { spår.nerkopplad++; device.gatt.connected = false; },
    },
    addEventListener: () => {}, removeEventListener: () => {},
  };
  const bt = { requestDevice: async () => device };
  const sänd = bpm => lyssnare.characteristicvaluechanged && lyssnare.characteristicvaluechanged({ target: { value: paket(bpm) } });
  return { bt, sänd, spår };
}

function livePass() {
  const live = buildLive(null, { id: "w", name: "Testpass", exercises: [{ exId: "bench_press", sets: 3, repMax: 8, restSec: 60 }] }, []);
  // Ett loggat set — annars avbryter avsluta() i stället för att bygga passet.
  live.items[0].loggade = [{ vikt: 60, reps: 8, ts: Date.now() }];
  return live;
}

describe("passvyn och bandet", () => {
  let root, el;
  const ua = navigator.userAgent;
  afterEach(() => {
    if (root) act(() => root.unmount());
    if (el) el.remove();
    root = null; el = null;
    Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });
    delete navigator.bluetooth;
  });

  const montera = props => {
    el = document.createElement("div"); document.body.appendChild(el);
    root = createRoot(el);
    act(() => { root.render(createElement(WorkoutView, props)); });
  };

  it("hooks och komponenter ligger där projektlagen kräver", () => {
    // Alla hooks före den tidiga returen (React #310), och PulsKnapp på
    // modulnivå — en komponent inuti WorkoutView rivs vid varje render.
    expect(src.indexOf("const [puls, setPuls]")).toBeGreaterThan(0);
    expect(src.indexOf("const [puls, setPuls]")).toBeLessThan(src.indexOf("if (!it) return ("));
    expect(src).toMatch(/^function PulsKnapp\(/m);
    expect(src).toMatch(/^function PulsNot\(/m);
  });

  it("utan Web Bluetooth: knappen finns, och trycket ger skälet — inte en krasch", () => {
    Object.defineProperty(navigator, "userAgent", { value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1", configurable: true });
    montera({ live: livePass(), setLive: () => {}, sessions: [], setSessions: () => {}, onDone: () => {}, onAbort: () => {}, profile: { age: 40 } });
    const knapp = el.querySelector('[data-puls="1"]');
    expect(knapp).toBeTruthy();
    expect(knapp.getAttribute("aria-label")).toBe("Koppla pulsband");
    expect(el.querySelector('[data-puls-fel="1"]')).toBeNull();
    act(() => { knapp.click(); });
    const not = el.querySelector('[data-puls-fel="1"]');
    expect(not).toBeTruthy();
    expect(not.textContent).toMatch(/Apple/);
    expect(el.textContent).toMatch(/Pågående pass/);
  });

  it("med band: pulsen visas i rubriken och hamnar på passet", async () => {
    const { bt, sänd, spår } = fejkatBand();
    Object.defineProperty(navigator, "bluetooth", { value: bt, configurable: true });
    let byggt = null;
    const props = { live: livePass(), setLive: () => {}, sessions: [], setSessions: () => {}, onDone: r => { byggt = r; }, onAbort: () => {}, profile: { age: 40 } };
    montera(props);

    await act(async () => { el.querySelector('[data-puls="1"]').click(); });
    expect(spår.startade).toBe(1);
    await act(async () => { sänd(120); sänd(130); sänd(140); });

    const knapp = el.querySelector('[data-puls="1"]');
    expect(knapp.textContent).toMatch(/140/);
    expect(knapp.getAttribute("aria-label")).toMatch(/Puls 140/);

    // Passet avslutas: snitt, max och zoner följer med — och bandet kopplas ner.
    await act(async () => { root.render(createElement(WorkoutView, { ...props, avslutaDirekt: true })); });
    expect(byggt).toBeTruthy();
    expect(byggt.session.avgHr).toBe(130);
    expect(byggt.session.maxHr).toBe(140);
    expect(byggt.session.hrSamples).toBe(3);
    expect(byggt.session.hrZones).toEqual({ latt: 33, medel: 67, hard: 0 });
  });

  it("bandet kopplas ner när vyn lämnas", async () => {
    const { bt, spår } = fejkatBand();
    Object.defineProperty(navigator, "bluetooth", { value: bt, configurable: true });
    montera({ live: livePass(), setLive: () => {}, sessions: [], setSessions: () => {}, onDone: () => {}, onAbort: () => {}, profile: null });
    await act(async () => { el.querySelector('[data-puls="1"]').click(); });
    expect(spår.nerkopplad).toBe(0);
    act(() => root.unmount()); root = null;
    // Nerkopplingen är asynkron med flit: motorn väntar in stopNotifications()
    // innan den släpper GATT:en, så räknaren stiger en mikrotask senare.
    await new Promise(r => setTimeout(r, 0));
    expect(spår.stoppade).toBe(1);
    expect(spår.nerkopplad).toBe(1);
  });
});

// ── Kvittot ───────────────────────────────────────────────────────────────

describe("kvittot", () => {
  let root, el;
  afterEach(() => { if (root) act(() => root.unmount()); if (el) el.remove(); root = null; el = null; });
  const montera = session => {
    el = document.createElement("div"); document.body.appendChild(el);
    root = createRoot(el);
    act(() => { root.render(createElement(DoneView, { resultat: { session, minuter: 40 }, sessions: [session], onReason: () => {}, onHome: () => {} })); });
  };
  const bas = () => buildSession({ sets: [{ exerciseId: "bench_press", weight: 60, reps: 8 }], source: "training", title: "Push" });

  it("visar snitt, max och zoner när passet bär puls", () => {
    montera({ ...bas(), avgHr: 132, maxHr: 168, hrSamples: 900, hrZones: { latt: 20, medel: 50, hard: 30 } });
    const rad = el.querySelector('[data-puls-kvitto="1"]');
    expect(rad).toBeTruthy();
    expect(rad.textContent).toMatch(/Snitt 132 · max 168/);
    expect(rad.textContent).toMatch(/30 % hårt/);
  });

  it("visar ingenting alls utan puls — inte ett streck", () => {
    montera(bas());
    expect(el.querySelector('[data-puls-kvitto="1"]')).toBeNull();
    expect(el.textContent).not.toMatch(/slag\/min/);
  });
});
