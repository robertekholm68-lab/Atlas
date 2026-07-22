// Bevisar att readiness är ENAD: desktop (App.jsx), mobil (MobileApp) och 2.0
// (App2/facts) ger SAMMA tal för samma data, och att talet är oförändrat mot den
// gamla lastviktade formeln som apparna räknade själva innan omkopplingen.
import { describe, it, expect } from "vitest";
import { coachFacts } from "../engines/facts.js";
import { computeRecovery, computeReadiness, computeSystemicFatigue, readinessBreakdown } from "../engines/index.js";
import { MUSCLES } from "../data/muscles.js";

const D = 864e5, now = Date.now();
const sess = (d, l) => ({ completedAt: now - d * D, muscleLoads: l, sets: [{ exerciseId: "x", weight: 60, reps: 8 }] });
const sessions = [
  sess(1, { pectoralis_major: 500, triceps_brachii: 200 }),
  sess(3, { quadriceps: 800, gluteals: 400 }),
  sess(5, { latissimus_dorsi: 500, biceps_brachii: 200 }),
];

// Den GAMLA formeln, återskapad exakt som App.jsx/MobileApp räknade: per-muskel
// readiness med cardioavdrag, lastviktat snitt, gate på totalvikt > 1.
function trainingBase(sessions) {
  const nowMs = now;
  const cardio = Math.min(18, Math.round(computeSystemicFatigue(sessions, nowMs)));
  const ms = {};
  Object.keys(MUSCLES).forEach(id => {
    const rec = computeRecovery(sessions, id, nowMs);
    const weeklyLoad = sessions.filter(s => nowMs - s.completedAt < 7 * 24 * 3600000).reduce((sum, s) => sum + ((s.muscleLoads || {})[id] || 0), 0);
    const base = computeReadiness(rec.recoveryScore, weeklyLoad, rec.daysSince);
    const readiness = rec.status === "no_data" ? base : Math.max(0, Math.min(100, base - cardio));
    ms[id] = { ...rec, weeklyLoad, readiness };
  });
  const totalW = Object.values(ms).reduce((a, s) => a + s.weeklyLoad, 0) || 1;
  return totalW > 1 ? Object.values(ms).reduce((a, s) => a + s.readiness * (s.weeklyLoad / totalW), 0) : null;
}
// App.jsx gamla headline: readinessBreakdown(base, cycle, nutRec).total
const legacyDesktop = (sessions, cycle, nutRec) => { const tb = trainingBase(sessions); return tb != null ? readinessBreakdown(tb, cycle, nutRec).total : null; };
// MobileApp gamla headline: Math.round(base) (+ ev. check-in ±6)
const legacyMobile = (sessions, nudge = 0) => { const tb = trainingBase(sessions); if (tb == null) return null; return Math.max(0, Math.min(100, Math.round(tb) + nudge)); };

describe("enad readiness — desktop, mobil och 2.0 ger samma tal", () => {
  it("samma data utan modifierare → identisk readiness i alla tre", () => {
    const källa = coachFacts({ sessions }).kropp.readiness;           // §13, det alla tre nu läser
    expect(källa).not.toBeNull();
    expect(legacyDesktop(sessions, null, { mod: 0, factors: [] })).toBe(källa);   // desktop oförändrad
    expect(legacyMobile(sessions)).toBe(källa);                                    // mobil oförändrad
    // (2.0 läste redan facts.kropp.readiness — samma källa per definition.)
  });

  it("desktopens cykel/kost-modifierare räknas fortfarande, ur samma källa", () => {
    const cycle = { sv: "Lutealfas", readiness: -3, note: "" }, nutRec = { mod: -4, factors: [] };
    const medMod = coachFacts({ sessions, cycle, nutRec }).kropp.readiness;
    expect(medMod).toBe(legacyDesktop(sessions, cycle, nutRec));       // facts reproducerar desktop-formeln exakt
    expect(medMod).toBe(coachFacts({ sessions }).kropp.readiness - 7); // -3 -4 ovanpå basen
  });

  it("mobilens check-in-nudge (+6) läggs på samma bas", () => {
    const bas = coachFacts({ sessions }).kropp.readiness;
    expect(legacyMobile(sessions, 6)).toBe(Math.min(100, bas + 6));
  });

  it("utan färsk belastning → null i alla tre (ingen påhittad siffra)", () => {
    const gammalt = [sess(20, { pectoralis_major: 500 })];            // > 7 dygn → ingen veckolast
    expect(coachFacts({ sessions: gammalt }).kropp.readiness).toBeNull();
    expect(legacyDesktop(gammalt, null, { mod: 0, factors: [] })).toBeNull();
    expect(legacyMobile(gammalt)).toBeNull();
  });
});
