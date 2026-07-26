// @vitest-environment jsdom
// Askr 2.0 — svaren på varför-frågan får konsekvenser.
//
// Signalen bar redan progressionBias och confidencePenalty; ingenting läste dem.
// Nu gör två saker det: viktförslaget och tilliten till readiness.
//
// DEN VIKTIGASTE REGELN, och den som testas hårdast: biasen får DÄMPA eller
// FÖRSTÄRKA en riktning, aldrig vända den. Ett "kändes lätt"-mönster över tre
// veckor får inte göra om en backning efter RPE 9.5 till en ökning. Det som
// hände i går väger tyngre än en tendens, och en signal som kan vända
// säkerhetsregler är farligare än ingen signal alls.
//
// OCH: straffet sänker TILLITEN, aldrig siffran. Readiness räknas ur loggad
// belastning; att någon sovit dåligt syns inte där. Att dra ner talet vore att
// förfalska en beräkning som är korrekt utifrån det den mäter.

import { describe, it, expect } from "vitest";
import { progressionSuggestion } from "../engines/index.js";
import { coachFacts } from "../engines/facts.js";
import { reasonSignal, attachReason } from "../engines/post-session.js";
import { buildSession } from "../engines/session.js";
import { EXERCISES } from "../data/exercises.js";

const DAG = 864e5;
const ÖVN = "bench_press";
const finns = EXERCISES.some(e => e.id === ÖVN);

// Ett pass med ett set på given vikt/reps/rpe.
const pass = (dagarSen, weight, reps = 8, rpe = null, id = "s" + dagarSen) => buildSession({
  id, title: "Pass", source: "training", completedAt: Date.now() - dagarSen * DAG,
  sets: [{ exerciseId: ÖVN, weight, reps, rpe }],
});
const medSkäl = (p, code) => attachReason(p, code, { exerciseId: ÖVN, direction: "down" });

describe.skipIf(!finns)("biasen dämpar och förstärker — men vänder aldrig", () => {
  it("utan bias är förslaget oförändrat (gamla anropare påverkas inte)", () => {
    const s = [pass(3, 100, 8, 7)];
    const utan = progressionSuggestion(ÖVN, s, 8);
    const noll = progressionSuggestion(ÖVN, s, 8, 0);
    expect(utan.weight).toBe(noll.weight);
    expect(utan.riktning).toBe("upp");
  });

  it("negativ bias håller vikten i stället för att öka", () => {
    const s = [pass(3, 100, 8, 7)];
    const upp = progressionSuggestion(ÖVN, s, 8, 0);
    const håll = progressionSuggestion(ÖVN, s, 8, -1);
    expect(upp.weight).toBeGreaterThan(100);
    expect(håll.weight).toBe(100);
    expect(håll.biasAnledning).toMatch(/sömn|smärta|trötthet/i);
  });

  it("positiv bias tar ett större kliv när ökning ändå var på väg", () => {
    const s = [pass(3, 100, 8, 7)];
    const normal = progressionSuggestion(ÖVN, s, 8, 0);
    const stor = progressionSuggestion(ÖVN, s, 8, 1);
    expect(stor.weight).toBeGreaterThan(normal.weight);
    expect(stor.biasAnledning).toMatch(/för lågt/i);
  });

  it("positiv bias vänder ALDRIG en backning efter tungt pass", () => {
    // RPE 9.5 säger backa. Ett "kändes lätt"-mönster får inte köra över det.
    const s = [pass(3, 100, 8, 9.5)];
    const utan = progressionSuggestion(ÖVN, s, 8, 0);
    const med = progressionSuggestion(ÖVN, s, 8, 1);
    expect(utan.riktning).toBe("ner");
    expect(med.weight).toBe(utan.weight);
    expect(med.weight).toBeLessThan(100);
    expect(med.biasAnledning).toBe(null);
  });

  it("negativ bias backar inte ytterligare på ett pass som redan håller", () => {
    // Att straffa ärlighet vore fel väg: den som svarat sanning ska inte få
    // sämre förslag än den som inte svarat alls.
    const s = [pass(3, 100, 5, 7)];                    // klarade inte målreps
    const utan = progressionSuggestion(ÖVN, s, 8, 0);
    const med = progressionSuggestion(ÖVN, s, 8, -1);
    expect(med.weight).toBe(utan.weight);
    expect(med.biasAnledning).toBe(null);
  });
});

describe.skipIf(!finns)("signalen når fram till förslaget", () => {
  it("tre återhämtningsskäl ger negativ bias, som håller vikten", () => {
    const sessions = [pass(2, 100, 8, 7, "a"), pass(5, 100, 8, 7, "b"), pass(8, 100, 8, 7, "c")]
      .map(p => medSkäl(p, "somn"));
    const sig = reasonSignal(sessions);
    expect(sig.kind).toBe("recovery");
    expect(sig.progressionBias).toBe(-1);

    const senaste = [pass(2, 100, 8, 7)];
    expect(progressionSuggestion(ÖVN, senaste, 8, sig.progressionBias).weight).toBe(100);
  });

  it("tre \"kändes lätt\" ger positiv bias", () => {
    const sessions = [pass(2, 100, 8, 7, "a"), pass(5, 100, 8, 7, "b"), pass(8, 100, 8, 7, "c")]
      .map(p => medSkäl(p, "latt"));
    const sig = reasonSignal(sessions);
    expect(sig.kind).toBe("progression");
    expect(sig.progressionBias).toBe(1);
  });

  it("under tre svar finns ingen signal — och därmed ingen bias", () => {
    const sessions = [pass(2, 100, 8, 7, "a"), pass(5, 100, 8, 7, "b")].map(p => medSkäl(p, "somn"));
    expect(reasonSignal(sessions)).toBe(null);
  });
});

describe.skipIf(!finns)("straffet sänker tilliten, aldrig siffran", () => {
  const sessions = Array.from({ length: 12 }, (_, i) => pass(i + 1, 100, 8, 7, "p" + i));
  const medSömnskäl = sessions.map((p, i) => (i < 4 ? medSkäl(p, "somn") : p));

  it("readiness-TALET är detsamma med och utan signal", () => {
    const sig = reasonSignal(medSömnskäl);
    expect(sig).not.toBe(null);
    const utan = coachFacts({ sessions: medSömnskäl }).kropp;
    const med = coachFacts({ sessions: medSömnskäl, reasonSignal: sig }).kropp;
    // Talet räknas ur belastning och är korrekt utifrån det. Det ska inte röras.
    expect(med.readiness).toBe(utan.readiness);
  });

  it("men tilliten sänks ett steg, med ett skäl", () => {
    const sig = reasonSignal(medSömnskäl);
    const utan = coachFacts({ sessions: medSömnskäl }).kropp.tillit;
    const med = coachFacts({ sessions: medSömnskäl, reasonSignal: sig }).kropp.tillit;
    const ordning = { ingen: 0, svag: 1, ok: 2, god: 3 };
    expect(ordning[med.nivå]).toBeLessThan(ordning[utan.nivå]);
    expect(med.sänkt).toBe(true);
    expect(med.skäl.length).toBeGreaterThan(10);
  });

  it("utan signal är tilliten oförändrad — gamla appen påverkas inte", () => {
    const utan = coachFacts({ sessions }).kropp.tillit;
    expect(utan.sänkt).toBeUndefined();
  });

  it("ett \"kändes lätt\"-mönster sänker inte tilliten", () => {
    const lätta = sessions.map((p, i) => (i < 4 ? medSkäl(p, "latt") : p));
    const sig = reasonSignal(lätta);
    expect(sig.confidencePenalty).toBe(0);
    const med = coachFacts({ sessions: lätta, reasonSignal: sig }).kropp.tillit;
    expect(med.sänkt).toBeUndefined();
  });
});
