// Askr 2.0 — passtid och övergivna pass.
//
// Fynd från riktig användning: skärmen visade "PASSTID 9746 min" — nästan sju
// dygn. Ett pass hade startats, lämnats, och klockan räknade vidare. Samma
// siffra gick till kvittot när passet väl avslutades.
//
// Rättningen vilar på en princip: tiden till SISTA LOGGADE SET är den enda
// uppgift appen kan belägga. Att räkna till "nu" antar att passet pågick hela
// tiden det låg öppet, vilket är ett påstående utan täckning.

import { describe, it, expect } from "vitest";
import { buildSession } from "../engines/session.js";

const TIM = 3600e3;

// Samma beräkning som WorkoutView gör: sista ts bland loggade set.
const passMinuter = live => {
  const sista = (live.items || []).reduce((max, x) =>
    (x.loggade || []).reduce((m, l) => (l.ts && l.ts > m ? l.ts : m), max), 0);
  return Math.round(Math.max(0, (sista || Date.now()) - live.startad) / 60000);
};

const live = (startadFörTim, setTider) => ({
  startad: Date.now() - startadFörTim * TIM,
  items: [{ exId: "bench_press", loggade: setTider.map(t => ({
    vikt: 80, reps: 8, ts: Date.now() - startadFörTim * TIM + t * 60000 })) }],
});

describe("passtiden räknas till sista set", () => {
  it("ett pass som legat öppet i sju dygn får tiden till sista setet", () => {
    // Det verkliga fallet: startat för 168 timmar sedan, sista setet efter 50 min.
    const p = live(168, [10, 30, 50]);
    expect(passMinuter(p)).toBe(50);
    expect(passMinuter(p)).not.toBeGreaterThan(1000);
  });

  it("ett pågående pass räknas som vanligt", () => {
    expect(passMinuter(live(1, [15, 45]))).toBe(45);
  });

  it("utan loggade set finns ingen sista tid — då gäller nu", () => {
    // Ett pass utan set kan inte ha en ärlig längd. Att räkna till nu är rätt
    // här, eftersom passet just startats i det normala fallet.
    const p = live(0, []);
    expect(passMinuter(p)).toBe(0);
  });
});

describe("sessionen bär inte den falska tiden", () => {
  it("set behåller sina tidsstämplar genom buildSession", () => {
    // ts på seten är förutsättningen för hela beräkningen. Tappas de går det
    // inte att veta när passet pågick, bara när det startades.
    const nu = Date.now();
    const s = buildSession({
      source: "training", title: "Pass", completedAt: nu,
      sets: [{ exerciseId: "bench_press", weight: 80, reps: 8, ts: nu - 600e3 }],
    });
    expect(s.sets[0].ts).toBe(nu - 600e3);
  });
});
