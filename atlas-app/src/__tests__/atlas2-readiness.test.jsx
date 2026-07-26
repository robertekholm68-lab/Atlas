// @vitest-environment jsdom
// Askr 2.0 — kosten in i readiness, och readiness gjord förklarbar.
//
// Två löften bevakas.
//
// DET FÖRSTA är att siffran går att fråga varför. En readiness på 62 utan
// uppdelning är en gåta, och en gåta går varken att lita på eller påverka.
//
// DET ANDRA är grinden: med för få loggade matdagar ska kosten INTE räknas in,
// och appen ska säga att den inte gör det. Att tyst utelämna en faktor och ändå
// visa samma tal vore att ljuga med utelämnande — värre än att säga "vet inte".

import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { nutritionRecoveryModifier, readinessBreakdown, logReliability } from "../engines/index.js";
import { coachFacts } from "../engines/facts.js";
import { buildSession } from "../engines/session.js";
import { EXERCISES } from "../data/exercises.js";
import { ReadinessSheet } from "../atlas2/ReadinessSheet.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const DAG = 864e5;
const MÅL = { kcal: 2400, protein: 180 };
const ÖVNING = (EXERCISES.find(e => e.loadMode === "external") || {}).id;

const pass = dagarSen => buildSession({
  title: "Pass", source: "training", completedAt: Date.now() - dagarSen * DAG,
  sets: [{ exerciseId: ÖVNING, weight: 80, reps: 8 }],
});
// n distinkta dagar med loggad mat, valfri proteinnivå.
const logg = (dagar, protein, kcal = 2200) =>
  Array.from({ length: dagar }, (_, i) => ({
    id: "f" + i, name: "mat", ts: Date.now() - i * DAG, kcal, protein,
  }));

describe("grinden — när kosten får räknas", () => {
  it("logReliability kräver tre loggade dagar av fem", () => {
    expect(logReliability(logg(1, 100)).reliable).toBe(false);
    expect(logReliability(logg(2, 100)).reliable).toBe(false);
    expect(logReliability(logg(3, 100)).reliable).toBe(true);
  });

  it("lågt protein sänker readiness — men bara med underlag", () => {
    const svält = nutritionRecoveryModifier({ foodLog: logg(4, 60), nutritionTargets: MÅL });
    expect(svält.mod).toBeLessThan(0);
    expect(svält.factors.length).toBeGreaterThan(0);

    // En enda loggad dag räcker inte för motorn heller (den kräver ≥2).
    const tunt = nutritionRecoveryModifier({ foodLog: logg(1, 60), nutritionTargets: MÅL });
    expect(tunt.mod).toBe(0);
    expect(tunt.factors).toHaveLength(0);
  });

  it("protein i nivå med målet drar inte ner något", () => {
    const bra = nutritionRecoveryModifier({ foodLog: logg(4, 185), nutritionTargets: MÅL });
    expect(bra.mod).toBe(0);
  });

  it("avdraget har ett golv — kosten kan inte ensam sänka readiness hur långt som helst", () => {
    const uselt = nutritionRecoveryModifier({ foodLog: logg(5, 20, 800), nutritionTargets: MÅL });
    expect(uselt.mod).toBeGreaterThanOrEqual(-8);
  });
});

describe("uppdelningen — talet ska gå att härleda", () => {
  it("summan är basen plus modifierarna, inget annat", () => {
    const nutRec = nutritionRecoveryModifier({ foodLog: logg(4, 60), nutritionTargets: MÅL });
    const b = readinessBreakdown(70, null, nutRec);
    expect(b.base).toBe(70);
    expect(b.total).toBe(70 + nutRec.mod);
    // Varje modifierare ska bära sin egen förklaring — annars är den inte till hjälp.
    b.factors.filter(f => f.delta != null).forEach(f => {
      expect(typeof f.label).toBe("string");
      expect(f.note && f.note.length).toBeGreaterThan(0);
    });
  });

  it("coachFacts exponerar både råtalet och hela förklaringen", () => {
    const sessions = [pass(1), pass(3), pass(5)];
    const nutRec = nutritionRecoveryModifier({ foodLog: logg(4, 60), nutritionTargets: MÅL });
    const utan = coachFacts({ sessions }).kropp;
    const med = coachFacts({ sessions, nutRec }).kropp;
    expect(med.readinessWhy).not.toBe(null);
    expect(med.readinessRaw).toBe(utan.readinessRaw);          // basen är orörd
    expect(med.readiness).toBeLessThan(utan.readiness);        // kosten drar ner
  });

  it("utan loggade pass finns ingen readiness att förklara — och ingen hittas på", () => {
    const k = coachFacts({ sessions: [] }).kropp;
    expect(k.readiness).toBe(null);
    expect(k.readinessWhy).toBe(null);
  });
});

describe("readiness-arket", () => {
  const roots = [];
  afterEach(async () => {
    await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) {} el.remove(); }); });
  });
  const rendera = async props => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const r = createRoot(el); roots.push({ r, el });
    await act(async () => { r.render(createElement(ReadinessSheet, { onClose: () => {}, ...props })); });
    return el;
  };

  it("visar basen och varje modifierare med sitt tecken", async () => {
    const nutRec = nutritionRecoveryModifier({ foodLog: logg(4, 60), nutritionTargets: MÅL });
    const why = readinessBreakdown(70, null, nutRec);
    const el = await rendera({ why, readiness: why.total, logg: logReliability(logg(4, 60)) });
    expect(el.textContent).toContain("Träningsåterhämtning");
    expect(el.textContent).toContain("70");
    expect(el.textContent).toMatch(/-\d/);                     // ett negativt avdrag syns
    expect(el.textContent).toMatch(/protein/i);                // med sin motivering
  });

  it("säger rakt ut när kosten INTE räknas in, och varför", async () => {
    const why = readinessBreakdown(70, null, { mod: 0, factors: [] });
    const el = await rendera({ why, readiness: 70, logg: logReliability(logg(1, 60)) });
    expect(el.textContent).toMatch(/räknas\s*inte\s*in/i);
    expect(el.textContent).toMatch(/1 av de senaste fem/);
  });

  it("bekräftar när kosten räknas in", async () => {
    const nutRec = nutritionRecoveryModifier({ foodLog: logg(4, 60), nutritionTargets: MÅL });
    const why = readinessBreakdown(70, null, nutRec);
    const el = await rendera({ why, readiness: why.total, logg: logReliability(logg(4, 60)) });
    expect(el.textContent).toMatch(/Räknas in/i);
  });

  it("utan underlag förklaras ingenting bort — arket säger att talet saknas", async () => {
    const el = await rendera({ why: null, readiness: null, logg: logReliability([]) });
    expect(el.textContent).toMatch(/inte tillräckligt loggat/i);
    expect(el.textContent).not.toMatch(/Så räknas det/i);
  });

  it("påminner om att readiness är vägledning, inte diagnos", async () => {
    const why = readinessBreakdown(70, null, null);
    const el = await rendera({ why, readiness: 70, logg: logReliability([]) });
    expect(el.textContent).toMatch(/vägledning, inte en diagnos/i);
  });
});
