// Askr 2.0 — coachknappen lovade en muskel men startade ett program.
//
// Robert: "i min plan idag står det starta pass adductors. men i passet ligger
// bara bröstövningar."
//
// Knappen skrev ut den mest UTVILADE MUSKELN: "Starta pass – Adductors". Men
// onStart startar programmets NÄSTA PASS, som var ett bröstpass. Texten lovade
// något appen inte kunde leverera.
//
// Rubriken står kvar — "Adductors är redo" är sant. Det är knappen som ska
// beskriva handlingen.

import { describe, it, expect } from "vitest";
import { recommendation, coachFacts } from "../engines/facts.js";
import { computeSessionLoad } from "../engines/index.js";
import { EXERCISES } from "../data/exercises.js";
import { readFileSync } from "fs";
import { resolve } from "path";

const NU = Date.now();
const pass = (dagar, exId, vikt) => {
  const sets = [...Array(4)].map(() => ({ exerciseId: exId, weight: vikt, reps: 8, ts: NU - dagar * 864e5 }));
  return { id: `s${dagar}${exId}`, completedAt: NU - dagar * 864e5, source: "training", sets,
    muscleLoads: computeSessionLoad(sets, EXERCISES) };
};
const facts = () => coachFacts({
  sessions: [pass(6, "bench_press", 80), pass(4, "barbell_row", 70), pass(2, "squat", 100)],
});

describe("knappen beskriver vad som startar", () => {
  it("visar passets namn, inte muskelns", () => {
    const r = recommendation(facts(), "Pass A – Överkropp");
    expect(r.knapp).toBe("Starta pass – Pass A – Överkropp");
    expect(r.knapp).not.toMatch(/Adductors|Deltoid/);
  });

  it("utan program står bara Starta pass", () => {
    // Ingen påhittad passetikett när det inte finns något program.
    expect(recommendation(facts(), null).knapp).toBe("Starta pass");
  });

  it("rubriken nämner fortfarande muskeln", () => {
    // "X är redo" är sant och användbart — det var knappen som ljög.
    expect(recommendation(facts(), "Push").rubrik).toMatch(/är redo/);
  });
});

describe("redo-listan kräver att muskeln går att träna", () => {
  it("bara muskler med en egen övning", () => {
    // Rubriken säger "där ger ett pass mest effekt". Det är bara sant om det
    // FINNS en övning för muskeln.
    const primära = new Set(
      EXERCISES.flatMap(e => (e.activation || []).filter(a => a.factor >= 0.7).map(a => a.muscleId))
    );
    for (const m of facts().kropp.redo) {
      expect(primära.has(m.id), `${m.id} saknar egen övning`).toBe(true);
    }
  });

  it("adduktorer HAR en egen övning och får vara med", () => {
    // Mätt under arbetet: hip_adduction har adductors med faktor 1,0. Mitt
    // första antagande — att de saknade övningar — var fel, och filtret bygger
    // nu på mätning i stället.
    const primära = new Set(
      EXERCISES.flatMap(e => (e.activation || []).filter(a => a.factor >= 0.7).map(a => a.muscleId))
    );
    expect(primära.has("adductors")).toBe(true);
  });

  it("filtret släpper igenom de flesta musklerna", () => {
    // 18 av 21 har egna övningar — filtret ska stoppa undantagen, inte hälften.
    const primära = new Set(
      EXERCISES.flatMap(e => (e.activation || []).filter(a => a.factor >= 0.7).map(a => a.muscleId))
    );
    expect(primära.size).toBeGreaterThanOrEqual(15);
  });
});

describe("vyn skickar in passnamnet", () => {
  it("CoachView tar emot det", () => {
    const src = readFileSync(resolve("src/atlas2/CoachView.jsx"), "utf8");
    expect(src).toMatch(/recommendation\(facts, nästaPassNamn\)/);
  });

  it("App2 räknar fram det ur programmet", () => {
    const src = readFileSync(resolve("src/atlas2/App2.jsx"), "utf8");
    expect(src).toMatch(/nästaPassNamn=\{activeProgram \?/);
  });
});
