// Askr 2.0 — snabbloggens hjälpare + röstparserns roll i 2.0.
//
// Testar kedjan motor → loggpost med RIKTIGA motoranrop, inte attrapper:
// en ändring i estimateMeal ska synas här. Coachens kostkontext testas där
// den bor (store.nutritionCtx) — inte här.

import { describe, it, expect } from "vitest";
import { estimateMeal, mealDecision, computeNutrition } from "../engines/index.js";
import { buildEstimatedEntry } from "../atlas2/foodlog.js";
import { parseSetSpeech } from "../engines/voice.js";

const NU = new Date("2026-07-24T12:00:00").getTime();

describe("buildEstimatedEntry", () => {
  it("bygger en post med kcal-fältnamn och kvalitetsmärkning ur motorns svar", () => {
    const est = estimateMeal("korv stroganoff med ris", null);
    const e = buildEstimatedEntry("korv stroganoff med ris", est, NU);
    expect(e.kcal).toBeGreaterThan(0);
    expect(e.calories).toBeUndefined();          // lag: aldrig `calories`
    expect(e.quality).toBe("estimated");
    expect(e.estimateLow).toBeLessThanOrEqual(e.kcal);
    expect(e.estimateHigh).toBeGreaterThanOrEqual(e.kcal);
    expect(e.ts).toBe(NU);
    expect(e.name).toBe("korv stroganoff med ris");
  });

  it("tom text ger namnet Måltid — aldrig en namnlös rad", () => {
    const e = buildEstimatedEntry("  ", estimateMeal("__normal", null), NU);
    expect(e.name).toBe("Måltid");
  });

  it("utan motorsvar byggs ingen post alls", () => {
    expect(buildEstimatedEntry("x", null, NU)).toBeNull();
  });

  it("posten räknas in av computeNutrition som uppskattad", () => {
    const e = buildEstimatedEntry("pizza", estimateMeal("pizza", null), NU);
    const t = computeNutrition([e]);
    expect(t.kcal).toBe(e.kcal);
    expect(t.estimated).toBe(1);
  });
});

describe("mealDecision i loggflödet", () => {
  it("vag beskrivning ger följdfråga, beskriven rätt går direkt", () => {
    expect(mealDecision("lunch").kind).not.toBe("described");
    expect(mealDecision("pizza").kind).toBe("described");
  });
});

describe("röstens sifferparser i passflödet", () => {
  it("tolkar vikt och reps som WorkoutView förväntar sig", () => {
    const t = parseSetSpeech("åttio"); // bara ett tal → ärligt nej, ingen gissning
    expect(t.ok).toBe(false);
    const s = parseSetSpeech("82,5 kilo 6 reps");
    expect(s).toMatchObject({ ok: true, weight: 82.5, reps: 6 });
    const u = parseSetSpeech("samma igen");
    expect(u).toMatchObject({ ok: true, repeat: true });
  });
});
