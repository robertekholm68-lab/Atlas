// Askr — decimaler sagda med ord.
//
// Hittat vid en genomgång av vad tolkningen klarar: "sjuttio komma fem åtta"
// blev 70 kg × 5 reps. Både vikten och repsen fel, från en mening som var helt
// entydig — ordet "komma" bröt talet i två och det andra halvan blev repsen.
//
// Siffror med komma ("82,5") hanterades redan i normalisera(); det var bara
// talen sagda med ORD som saknade vägen.

import { describe, it, expect } from "vitest";
import { parseSetSpeech } from "../engines/voice.js";

describe("decimaler sagda med ord", () => {
  it("\"sjuttio komma fem åtta\" är 70,5 kg × 8 — inte 70 × 5", () => {
    const r = parseSetSpeech("sjuttio komma fem åtta");
    expect(r.ok).toBe(true);
    expect(r.weight).toBe(70.5);
    expect(r.reps).toBe(8);
  });

  it("fungerar även med enhetsord", () => {
    const r = parseSetSpeech("sjuttio komma fem kilo åtta reps");
    expect(r.weight).toBe(70.5);
    expect(r.reps).toBe(8);
  });

  it("siffror med komma fungerar som förut", () => {
    const r = parseSetSpeech("82,5 kilo 6");
    expect(r.weight).toBe(82.5);
    expect(r.reps).toBe(6);
  });

  it("bara en decimal — \"komma tjugofem\" gissas inte till 0,25", () => {
    // Att tolka fler siffror efter kommat vore en gissning om hur talaren tänkte.
    // Ett ensiffrigt decimalsteg täcker halvkilon, som är det som sägs i verkligheten.
    const r = parseSetSpeech("sjuttio komma tjugofem åtta");
    expect(r.weight).not.toBe(70.25);
  });
});

describe("de befintliga reglerna står kvar", () => {
  it("två tal delas ALDRIG ihop — 80 × 8 måste förbli skiljbart från 88", () => {
    const r = parseSetSpeech("åttio åtta");
    expect(r.weight).toBe(80);
    expect(r.reps).toBe(8);
  });

  it("ett ensamt tal är fortfarande otillräckligt, men bär talet vidare", () => {
    const r = parseSetSpeech("88");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("ett-tal");
    expect(r.hint).toBe(88);
  });
});
