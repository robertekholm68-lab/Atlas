// Askr — viktrastret i passloggen.
//
// Fynd från gymmet: vikterna visade 61,3 och 61,8. Två fel som förstärkte
// varandra.
//
//   1. roundInc kvantiserade till 1,25 kg, så ett förslag aldrig kunde landa på
//      ett helt kilo som inte var delbart med 1,25. 61 blev 61,25, 63 blev 62,5.
//   2. Stegknappen körde .toFixed(1) på resultatet, vilket gjorde 63,75 till
//      63,8 — och felet ackumulerades för varje tryck: 61,25 → 63,8 → 66,3.
//
// Talen på skärmen var alltså inte de vikter som låg på stången. Det är värre
// än en skönhetsfläck: loggen är appens enda sanning, och en logg som inte
// stämmer med verkligheten förgiftar volym, belastning och progression.

import { describe, it, expect } from "vitest";
import { roundInc, formatWeight, formatKg, progressionSuggestion } from "../engines/index.js";
import { EXERCISES } from "../data/exercises.js";

const ÖVN = "bench_press";
const finns = EXERCISES.some(e => e.id === ÖVN);
const pass = (w, reps) => ({
  id: "s1", completedAt: Date.now() - 3 * 864e5,
  sets: [{ exerciseId: ÖVN, weight: w, reps }],
});

describe("rastret är 0,25 kg förankrat i hela kilon", () => {
  it("hela kilon överlever", () => {
    [60, 61, 62, 63, 80, 100].forEach(w => expect(roundInc(w), `${w} kg`).toBe(w));
  });

  it("kvartar är giltiga vikter", () => {
    [60.25, 60.5, 60.75, 61.25].forEach(w => expect(roundInc(w)).toBe(w));
  });

  it("allt annat snäpps till närmaste kvart", () => {
    expect(roundInc(61.3)).toBe(61.25);
    expect(roundInc(61.8)).toBe(61.75);
    expect(roundInc(60.1)).toBe(60);
    expect(roundInc(60.13)).toBe(60.25);
  });

  it("rastret är INTE 1,25 längre — 61 ska inte bli 61,25", () => {
    expect(roundInc(61)).not.toBe(61.25);
    expect(roundInc(63)).not.toBe(62.5);
  });
});

describe("vikten skrivs som den är", () => {
  it("inga falska decimaler", () => {
    expect(formatWeight(61)).toBe("61");
    expect(formatWeight(61.5)).toBe("61,5");
    expect(formatWeight(61.25)).toBe("61,25");
    expect(formatWeight(61.75)).toBe("61,75");
  });

  it("61,25 skrivs aldrig som 61,3", () => {
    // Det var precis det som stod på skärmen i gymmet.
    expect(formatWeight(61.25)).not.toBe("61,3");
    expect(formatWeight(61.75)).not.toBe("61,8");
  });

  it("saknad vikt blir streck, inte noll", () => {
    expect(formatWeight(null)).toBe("—");
    expect(formatWeight(undefined)).toBe("—");
  });
});

describe.skipIf(!finns)("progressionen håller sig på rastret", () => {
  it("varje förslag är en giltig vikt", () => {
    for (const reps of [6, 8, 10, 12, 15, 20]) {
      const p = progressionSuggestion(ÖVN, [pass(100, reps)], 8);
      expect(p.weight * 4, `${reps} reps gav ${p.weight}`).toBe(Math.round(p.weight * 4));
    }
  });

  it("från ett helt kilo hamnar man inte i en decimalsoppa", () => {
    const p = progressionSuggestion(ÖVN, [pass(60, 8)], 8);
    expect(formatWeight(p.weight)).not.toMatch(/,\d\d\d/);
  });
});

// ── GRÄNSEN MOT KROPPSVIKT ────────────────────────────────────────────
//
// formatWeight snäpper till 0,25. Det är rätt för vikt man LÄGGER PÅ — skivor
// finns bara i vissa storlekar. Det är fel för en MÄTNING: 82,4 kg på vågen får
// aldrig skrivas som 82,5, för då står det en siffra på skärmen som användaren
// aldrig vägde. Därför finns formatKg, och därför måste skillnaden bevakas —
// det är precis en sån gräns som någon river i god tro nästa gång.
describe("skivstångsvikt och kroppsvikt formateras INTE likadant", () => {
  it("formatKg avrundar inte — mätningen står kvar", () => {
    expect(formatKg(82.4)).toBe("82,4");
    expect(formatKg(82.1)).toBe("82,1");
    expect(formatKg(79.9)).toBe("79,9");
    expect(formatKg(80)).toBe("80");
  });

  it("och formatWeight skulle ha förvanskat samma tal", () => {
    // Bevisar att gränsen inte är kosmetisk. Rivs den blir 82,4 till 82,5.
    expect(formatWeight(82.4)).toBe("82,5");
    expect(formatKg(82.4)).not.toBe(formatWeight(82.4));
  });

  it("flyttalsbrus kapas, men aldrig värdet", () => {
    // 82,7 − 82,4 ger 0,29999999999999716 i JS. Talet ska bli "0,3", inte en
    // rad decimaler — och inte 0,25, vilket rastret hade gjort.
    expect(formatKg(82.7 - 82.4)).toBe("0,3");
    expect(formatKg(-0.5)).toBe("-0,5");
  });

  it("saknat värde blir streck i båda, inte noll", () => {
    expect(formatKg(null)).toBe("—");
    expect(formatKg(undefined)).toBe("—");
    expect(formatWeight(null)).toBe("—");
  });
});
