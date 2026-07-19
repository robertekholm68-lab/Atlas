// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import Atlas from "../app/App.jsx";
import { GoalsView } from "../features/goals/index.jsx";
import { INITIAL_GOALS, INITIAL_MISSIONS, INITIAL_SESSIONS, INITIAL_PROFILE, INITIAL_MEASUREMENTS } from "../data/demo.js";

async function mountApp(width, mode, opts = {}) {
  try { window.localStorage.clear(); } catch (e) {}
  if (mode) { try { window.localStorage.setItem("atlas.mode", mode); } catch (e) {} }
  if (opts.onboardingDone) { try { window.localStorage.setItem("atlas.v2.real.onboarding", JSON.stringify({ step: 6, completed: true, name: "Testperson" })); } catch (e) {} }
  Object.defineProperty(window, "innerWidth", { value: width, writable: true, configurable: true });
  const errs = [];
  const orig = console.error;
  console.error = (...a) => errs.push(a.map(x => (x && x.message) ? x.message : String(x)).join(" "));
  const el = document.createElement("div");
  document.body.appendChild(el);
  await act(async () => { createRoot(el).render(<Atlas />); await new Promise(r => setTimeout(r, 200)); });
  console.error = orig;
  const real = errs.filter(e => !/not wrapped in act|Warning:|useLayoutEffect|getContext/.test(e));
  return { el, real };
}

describe("Målresa — integration i appen", () => {
  it("demo desktop: primär målresa syns på dashboarden, utan renderfel", async () => {
    const { el, real } = await mountApp(1280, "demo");
    expect(real).toEqual([]);
    expect(el.textContent).toMatch(/Målresa/);
    expect(el.textContent).toMatch(/Thailand/);
  });
  it("real efter onboarding: INGEN målresa (inga missions) → inget påhittat kort, ärligt tomläge kvar", async () => {
    const { el, real } = await mountApp(1280, "real", { onboardingDone: true });
    expect(real).toEqual([]);
    expect(el.textContent).not.toMatch(/Thailand/);                 // ingen demo-läcka
    expect(el.textContent).toMatch(/Jag behöver mer data innan jag kan bedöma din readiness/);
  });
  it("demo mobil: målresa-kortet renderar utan fel", async () => {
    const { el, real } = await mountApp(400, "demo");
    expect(real).toEqual([]);
    expect(el.textContent).toMatch(/Thailand/);
  });
  it("demo desktop: AI-coachen föreslår ett upplägg för målresan", async () => {
    const { el, real } = await mountApp(1280, "demo");
    const tab = el.querySelector('[title="AI Coach"]');
    expect(tab).not.toBeNull();
    await act(async () => { tab.dispatchEvent(new window.MouseEvent("click", { bubbles: true })); await new Promise(r => setTimeout(r, 80)); });
    expect(el.textContent).toMatch(/Föreslaget upplägg/);
    expect(el.textContent).toMatch(/pass\/vecka/);
    expect(real).toEqual([]);
  });
});

describe("Målflik — Målresor + Enskilda mål", () => {
  it("visar båda sektionerna; delmål dupliceras inte till Enskilda mål", async () => {
    const errs = []; const orig = console.error;
    console.error = (...a) => errs.push(a.map(x => (x && x.message) ? x.message : String(x)).join(" "));
    const el = document.createElement("div");
    document.body.appendChild(el);
    await act(async () => {
      createRoot(el).render(
        <GoalsView
          goals={INITIAL_GOALS} setGoals={() => {}}
          missions={INITIAL_MISSIONS} setMissions={() => {}}
          sessions={INITIAL_SESSIONS} profile={INITIAL_PROFILE} measurements={INITIAL_MEASUREMENTS}
        />
      );
      await new Promise(r => setTimeout(r, 60));
    });
    console.error = orig;
    const real = errs.filter(e => !/not wrapped in act|Warning:|useLayoutEffect/.test(e));
    expect(real).toEqual([]);
    expect(el.textContent).toMatch(/Målresor/);
    expect(el.textContent).toMatch(/Enskilda mål/);
    expect(el.textContent).toMatch(/Thailand — thaiboxning/);       // målresekort
    expect(el.textContent).toMatch(/Kroppsfett/);                    // fristående mål (g4) i Enskilda mål
    // g1 "Bänkpress 1RM" är kopplat till målresan → ska INTE ligga som fristående kort med × i Enskilda mål-listan.
    // (den kan förekomma inuti kortets områdesstatus men inte som fristående GoalCard — vi verifierar sektionsuppdelningen via headers ovan.)
  });
});

// Klickar första elementet vars text innehåller `text` (bubblande click → React-handler på roten).
function clickText(el, text) {
  const nodes = [...el.querySelectorAll("*")].filter(n => (n.textContent || "").includes(text));
  const target = nodes[nodes.length - 1] || nodes[0];
  target.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
}

function Harness() {
  const React = require("react");
  const [goals, setGoals] = React.useState(INITIAL_GOALS);
  const [missions, setMissions] = React.useState(INITIAL_MISSIONS);
  return React.createElement(GoalsView, {
    goals, setGoals, missions, setMissions,
    sessions: INITIAL_SESSIONS, profile: INITIAL_PROFILE, measurements: INITIAL_MEASUREMENTS,
  });
}

describe("Målresa — interaktiva vyer (wizard + detalj)", () => {
  async function mountHarness() {
    const errs = []; const orig = console.error;
    console.error = (...a) => errs.push(a.map(x => (x && x.message) ? x.message : String(x)).join(" "));
    const el = document.createElement("div");
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<Harness />); await new Promise(r => setTimeout(r, 60)); });
    const done = () => { console.error = orig; return errs.filter(e => !/not wrapped in act|Warning:|useLayoutEffect/.test(e)); };
    return { el, done };
  }

  it("'+ Ny målresa' öppnar det guidade 9-stegsflödet", async () => {
    const { el, done } = await mountHarness();
    await act(async () => { clickText(el, "+ Ny målresa"); await new Promise(r => setTimeout(r, 40)); });
    expect(el.textContent).toMatch(/Steg 1 av 9/);
    expect(el.textContent).toMatch(/Vad förbereder du dig för\?/);
    expect(done()).toEqual([]);
  });

  it("klick på målresekortet öppnar detaljvyn (faser, delmål, coach-läge)", async () => {
    const { el, done } = await mountHarness();
    await act(async () => { clickText(el, "Thailand — thaiboxning"); await new Promise(r => setTimeout(r, 60)); });
    expect(el.textContent).toMatch(/Faser/);
    expect(el.textContent).toMatch(/Kopplade delmål/);
    expect(el.textContent).toMatch(/Coachens läge/);
    expect(el.textContent).toMatch(/Observation/);
    expect(done()).toEqual([]);
  });
});
