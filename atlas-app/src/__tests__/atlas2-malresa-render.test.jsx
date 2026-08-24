// GoalSheet med coachplanerad målresa — delmålen och planen ska synas,
// och ärlighetsraderna ska stå där när mätdata saknas.
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { GoalSheet } from "../atlas2/GoalSheet.jsx";
import { byggMålFrånPlan } from "../engines/intervju.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const DAG = 864e5;
const NU = Date.now();
const START = NU - 28 * DAG;

// Rötter spåras och unmountas — testförorening via kvarlämnade React-rötter
// har fällt sviten förut.
const rötter = [];
afterEach(() => { rötter.forEach(r => act(() => r.unmount())); rötter.length = 0; document.body.innerHTML = ""; });

function rendera(props) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const rot = createRoot(el);
  rötter.push(rot);
  act(() => rot.render(<GoalSheet {...props} />));
  return el;
}

const mål = byggMålFrånPlan({
  klar: true, namn: "Bröllop", typ: "fatloss",
  målDatum: new Date(START + 112 * DAG).toISOString().slice(0, 10),
  beskrivning: "x",
  viktmål: { startKg: 96, målKg: 90 },
  passPerVecka: 3, cardioPerVecka: 2,
  dimensioner: { träning: "Tre helkroppspass.", kost: "Måttligt underskott.", cardio: "Två lugna pass.", vila: "En vilodag mellan tunga pass.", sömn: "Sikta på regelbunden läggtid." },
}, { nu: START });

describe("GoalSheet med plan", () => {
  it("visar delmål, plandimensioner och läge mot plan", () => {
    const el = rendera({ mål, setMål: () => {}, sessions: [], weights: [{ ts: NU - DAG, kg: 95 }], onClose: () => {} });
    const text = el.textContent;
    expect(text).toMatch(/Delmål/);
    expect(text).toMatch(/Styrkepass/);
    expect(text).toMatch(/Planen/);
    expect(text).toMatch(/Sömn/);
    expect(text).toMatch(/regelbunden läggtid/);
    expect(text).toMatch(/Läge mot plan/);
    expect(text).toMatch(/planens kurva/);
  });
  it("utan färsk vägning: 'väg dig', aldrig en siffra", () => {
    const el = rendera({ mål, setMål: () => {}, sessions: [], weights: [{ ts: NU - 30 * DAG, kg: 95 }], onClose: () => {} });
    expect(el.textContent).toMatch(/väg dig/);
    expect(el.textContent).not.toMatch(/planens kurva/);
  });
  it("ett mål UTAN plan (gamla vägen) renderas som förut, utan delmålssektion", () => {
    const gammalt = { id: "g1", typ: "muscle", namn: "Muskelmassa", startDatum: START, målDatum: START + 84 * DAG, passPerVecka: 3 };
    const el = rendera({ mål: gammalt, setMål: () => {}, sessions: [], weights: [], onClose: () => {} });
    expect(el.textContent).toMatch(/Faser/);
    expect(el.textContent).not.toMatch(/Läge mot plan/);
  });
});
