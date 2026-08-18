// @vitest-environment jsdom
// Askr 2.0 — signal när vilan är slut.
//
// engines/cues.js har funnits sedan 1.0 med fyra kanaler (ljud, röst,
// vibration, notis) och aldrig anropats från 2.0. Vilotimern räknade ner i
// TYSTNAD, vilket är det sämsta läget: man tittar inte på telefonen mellan set,
// så vilan blir antingen för kort eller för lång.
//
// Samma mönster som musikknappen och kunskapsbasen — motorn fanns, vägen dit
// saknades.

import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { restDoneCue, DEFAULT_CUES } from "../engines/cues.js";

const src = readFileSync(resolve("src/atlas2/WorkoutView.jsx"), "utf8");

describe("motorn signalerar", () => {
  it("vibration anropas när den är påslagen", () => {
    const v = vi.fn(() => true);
    navigator.vibrate = v;
    const used = restDoneCue({ sound: false, voice: false, vibrate: true, notify: false });
    expect(used).toContain("vibrate");
    expect(v).toHaveBeenCalled();
  });

  it("avstängda kanaler tiger", () => {
    const v = vi.fn(() => true);
    navigator.vibrate = v;
    const used = restDoneCue({ sound: false, voice: false, vibrate: false, notify: false });
    expect(used).toEqual([]);
    expect(v).not.toHaveBeenCalled();
  });
});

describe("två vakter mot falska signaler", () => {
  it("ljuder inte när vilan STARTAR", () => {
    // vila går 0 -> 90 när ett set loggas. Utan förraVila hade övergången
    // till 0 tolkats som "vilan är slut" redan innan den börjat.
    expect(src).toMatch(/förraVila\.current > 0 && vila === 0/);
  });

  it("ljuder inte när man hoppar över vilan", () => {
    // Då har man aktivt avbrutit den, och signalen skulle säga "du tryckte på
    // en knapp" i stället för "vilan är slut". Mätt i webbläsaren: utan
    // avbröt.current ljöd den vid varje överhoppning.
    expect(src).toMatch(/&& !avbröt\.current\) restDoneCue/);
    expect(src).toMatch(/avbröt\.current = true; setVila\(0\)/);
  });

  it("flaggan nollställs så nästa vila ljuder", () => {
    // Utan återställning hade EN överhoppning tystat alla följande vilor.
    expect(src).toMatch(/if \(vila === 0\) avbröt\.current = false/);
  });
});

describe("inställningarna", () => {
  it("ljud och vibration på, röst och notis av", () => {
    // Röst kräver att man vill höra appen tala i ett gym; notiser kräver ett
    // tillstånd man inte ska behöva ge för att träna.
    expect(DEFAULT_CUES.sound).toBe(true);
    expect(DEFAULT_CUES.vibrate).toBe(true);
    expect(DEFAULT_CUES.voice).toBe(false);
    expect(DEFAULT_CUES.notify).toBe(false);
  });

  it("alla fyra kanalerna går att växla", () => {
    for (const n of ["sound", "vibrate", "voice", "notify"]) {
      expect(src, n).toMatch(new RegExp(`data-signal=\\{nyckel\\}|"${n}"`));
    }
  });

  it("valet sparas", () => {
    expect(src).toMatch(/save\("cues", ny\)/);
  });

  it("en påslagen kanal hörs direkt", () => {
    // Annars vet man inte om den fungerar förrän nästa vila, och då är det
    // för sent att justera.
    expect(src).toMatch(/if \(ny\[nyckel\]\) restDoneCue/);
  });

  it("bara kända nycklar tas emot vid hydrering", () => {
    // En trasig eller gammal post ska inte kunna slå av allt tyst.
    expect(src).toMatch(/\{ \.\.\.DEFAULT_CUES, \.\.\.c \}/);
  });
});
