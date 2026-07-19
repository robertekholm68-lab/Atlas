// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { createRoot } from "react-dom/client";
import Atlas from "../app/App.jsx";
import { computeSessionLoad } from "../engines/index.js";
import { EXERCISES } from "../data/exercises.js";
import { saveState, loadState, getMode, setModeStored, hasLegacyV1, clearDemoData, deleteRealProfile } from "../app/persist.js";

const DAY = 864e5;
function makeSessions(n) {
  const out = []; const now = Date.now();
  for (let i = 0; i < n; i++) {
    const sets = [{ exerciseId: "squat", weight: 100, reps: 5, rpe: 8 }, { exerciseId: "bench_press", weight: 70, reps: 5, rpe: 8 }];
    out.push({ id: "s" + i, title: "Pass", completedAt: now - (i % 10) * DAY - i * 3600000, sets, muscleLoads: computeSessionLoad(sets, EXERCISES) });
  }
  return out;
}
let _root = null;
async function mountReal(width, { sessions = [], onboarding = { completed: true }, measurements = [] } = {}) {
  if (_root) { try { _root.unmount(); } catch (e) {} _root = null; }
  try { window.localStorage.clear(); } catch (e) {}
  try { document.body.innerHTML = ""; } catch (e) {}
  window.localStorage.setItem("atlas.mode", "real");
  window.localStorage.setItem("atlas.v2.real.onboarding", JSON.stringify(onboarding));
  if (sessions.length) window.localStorage.setItem("atlas.v2.real.sessions", JSON.stringify(sessions));
  if (measurements.length) window.localStorage.setItem("atlas.v2.real.measurements", JSON.stringify(measurements));
  Object.defineProperty(window, "innerWidth", { value: width, writable: true, configurable: true });
  const errs = []; const orig = console.error;
  console.error = (...a) => errs.push(a.map(x => (x && x.message) ? x.message : String(x)).join(" "));
  const el = document.createElement("div"); document.body.appendChild(el);
  _root = createRoot(el); _root.render(<Atlas />);
  await new Promise(r => setTimeout(r, 220));
  console.error = orig;
  const real = errs.filter(e => !/not wrapped in act|Warning:|useLayoutEffect|getContext/.test(e));
  return { el, real };
}

describe("§13 scenariomatris — real-profil med olika mängd data", () => {
  it("real med 1 pass → readiness-siffra + PRELIMINÄR-etikett, inga fel", async () => {
    const { el, real } = await mountReal(1280, { sessions: makeSessions(1) });
    expect(real).toEqual([]);
    expect(el.textContent).not.toMatch(/Jag behöver mer data innan jag kan bedöma din readiness/);
    expect(el.textContent).toMatch(/Preliminär bedömning baserad på begränsad data/);
    expect(el.textContent).not.toMatch(/null|NaN/);
  });
  it("real med 12 pass → readiness utan preliminär-etikett, inga fel", async () => {
    const { el, real } = await mountReal(1280, { sessions: makeSessions(12) });
    expect(real).toEqual([]);
    expect(el.textContent).not.toMatch(/Jag behöver mer data/);
    expect(el.textContent).not.toMatch(/Preliminär bedömning/);
    expect(el.innerHTML.length).toBeGreaterThan(2000);
  });
  it("real med 30 pass men ingen kost → renderar utan fel", async () => {
    const { el, real } = await mountReal(1280, { sessions: makeSessions(30) });
    expect(real).toEqual([]);
    expect(el.textContent).not.toMatch(/null|NaN/);
    expect(el.innerHTML.length).toBeGreaterThan(2000);
  });
  it("real mobil med 12 pass renderar utan fel", async () => {
    const { real } = await mountReal(400, { sessions: makeSessions(12) });
    expect(real).toEqual([]);
  });
});

describe("§13 onboarding avbryt/återuppta", () => {
  it("avbruten onboarding återupptas på rätt steg med bevarat värde", async () => {
    const { el, real } = await mountReal(1280, { onboarding: { step: 2, completed: false, name: "Kaj", primaryGoal: "muscle" } });
    expect(real).toEqual([]);
    expect(el.textContent).toMatch(/Steg 3 av 7/);   // step 2 (0-index) → "Steg 3"
  });
});

describe("§13 lägesbyte, omladdning, legacy, radering", () => {
  beforeEach(() => { try { window.localStorage.clear(); } catch (e) {} });
  it("byt läge fram och tillbaka → båda dataseten bevaras", () => {
    saveState("sessions", [{ id: "demoS" }], "demo");
    saveState("sessions", [{ id: "realS" }], "real");
    setModeStored("real"); expect(getMode()).toBe("real");
    setModeStored("demo"); expect(getMode()).toBe("demo");   // "omladdning": getMode läser från storage
    expect(loadState("sessions", [], "demo")).toEqual([{ id: "demoS" }]);
    expect(loadState("sessions", [], "real")).toEqual([{ id: "realS" }]);
  });
  it("radera bara demo → real intakt; radera bara real → demo intakt", () => {
    saveState("sessions", [{ id: "d" }], "demo"); saveState("sessions", [{ id: "r" }], "real");
    clearDemoData();
    expect(loadState("sessions", null, "demo")).toBe(null);
    expect(loadState("sessions", null, "real")).toEqual([{ id: "r" }]);
    saveState("sessions", [{ id: "d2" }], "demo"); deleteRealProfile();
    expect(loadState("sessions", null, "real")).toBe(null);
    expect(loadState("sessions", null, "demo")).toEqual([{ id: "d2" }]);
  });
  it("legacy v1-data detekteras", () => {
    expect(hasLegacyV1()).toBe(false);
    window.localStorage.setItem("atlas.v1.sessions", "[]");
    expect(hasLegacyV1()).toBe(true);
  });
});
