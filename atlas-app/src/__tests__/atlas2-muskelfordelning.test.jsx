// @vitest-environment jsdom
// Askr 2.0 — muskelfördelning.
//
// `muscleLoads` har funnits på varje session sedan schemaV 2: volym i kilo per
// muskel, summerad ur övningarnas aktiveringsvektorer. Ingen vy visade den.
// Sjätte gången i rad med samma mönster — funktionen fanns, vägen dit saknades.
//
// Volym per övning säger vad man GJORT. Volym per muskel säger vad kroppen
// FÅTT. Obalanser syns bara i den andra vyn.

import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { MuscleSplit } from "../atlas2/MuscleSplit.jsx";
import { buildSession } from "../engines/session.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const DAG = 864e5;

const pass = (dagarSedan, sets) => buildSession({
  title: "Pass", source: "training", completedAt: Date.now() - dagarSedan * DAG, sets,
});

const roots = [];
afterEach(async () => {
  await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) {} el.remove(); }); });
});
const rendera = async sessions => {
  const el = document.createElement("div"); document.body.appendChild(el);
  const r = createRoot(el); roots.push({ r, el });
  await act(async () => { r.render(createElement(MuscleSplit, { sessions })); });
  return el;
};
const rader = el => [...el.querySelectorAll('div[data-muskel="1"]')];

describe("fördelningen räknas ur motorns egna tal", () => {
  it("muskler rangordnas efter volym", async () => {
    const el = await rendera([pass(1, [
      { exerciseId: "bench_press", weight: 100, reps: 10 },
      { exerciseId: "bench_press", weight: 100, reps: 10 },
    ])]);
    const r = rader(el);
    expect(r.length).toBeGreaterThan(0);
    // Bänkpress: bröst 1,0, triceps och främre axel 0,5. Bröstet ska stå först.
    expect(r[0].textContent).toMatch(/Pectoralis Major/);
  });

  it("INGEN rad visar 0 kg", async () => {
    // Kroppsviktsövningar registrerar muskeln men bidrar med 0 kg. En rad som
    // säger både att något hänt och att inget hänt svarar inte på sin fråga.
    const el = await rendera([pass(1, [
      { exerciseId: "bench_press", weight: 80, reps: 8 },
      { exerciseId: "plank", weight: 0, reps: 1 },
    ])]);
    for (const r of rader(el)) expect(r.textContent).not.toMatch(/\b0 kg\b/);
  });

  it("set räknas bara för muskler som fått last", async () => {
    // Utan filtret visades "0 kg · 27 set" — två tal som motsäger varandra.
    const el = await rendera([pass(1, [{ exerciseId: "bench_press", weight: 80, reps: 8 }])]);
    for (const r of rader(el)) {
      const kg = Number((r.textContent.match(/([\d\s]+) kg/) || [])[1]?.replace(/\s/g, "") || 0);
      const set = Number((r.textContent.match(/(\d+) set/) || [])[1] || 0);
      if (kg > 0) expect(set, r.textContent).toBeGreaterThan(0);
    }
  });
});

describe("det som saknas får också en rad", () => {
  it("otränade muskler listas — obalanser syns bara då", async () => {
    const el = await rendera([pass(1, [{ exerciseId: "bench_press", weight: 80, reps: 8 }])]);
    expect(el.textContent).toMatch(/Inte tränat på/i);
    // Ben tränades inte i passet ovan.
    expect(el.textContent).toMatch(/Quadriceps/);
  });
});

describe("perioden avgränsar", () => {
  it("pass utanför perioden räknas inte", async () => {
    const el = await rendera([
      pass(2, [{ exerciseId: "bench_press", weight: 80, reps: 8 }]),
      pass(200, [{ exerciseId: "squat", weight: 200, reps: 10 }]),
    ]);
    // 30 dagar är förval; knäböjet ligger 200 dagar bort.
    expect(el.textContent).not.toMatch(/Quadriceps · Ben \d/);
  });

  it("utan pass i perioden sägs det rakt ut", async () => {
    const el = await rendera([pass(200, [{ exerciseId: "squat", weight: 100, reps: 5 }])]);
    expect(el.textContent).toMatch(/Inga loggade pass/i);
    expect(rader(el).length).toBe(0);
  });
});
