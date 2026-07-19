// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { PostSessionModal } from "../features/training/index.jsx";
import { buildSession } from "../engines/session.js";

// Bygger en riktig session via motorn så muscleLoads härleds äkta (inga påhittade siffror).
function makeSession() {
  return buildSession({
    title: "Bröst & Rygg-pass",
    source: "training",
    bodyweight: 80,
    sets: [
      { exerciseId: "bench_press", weight: 60, reps: 8, rpe: 8 },
      { exerciseId: "bench_press", weight: 60, reps: 8, rpe: 9 },
      { exerciseId: "row", weight: 50, reps: 10, rpe: 7 },
    ],
  });
}

describe("Avslutningsmomentet (PostSessionModal)", () => {
  it("renderar nyckeltal, tränade muskler och nästa rekommendation utan fel", async () => {
    const session = makeSession();
    const trainedIds = Object.keys(session.muscleLoads).filter(id => session.muscleLoads[id] > 5);
    expect(trainedIds.length).toBeGreaterThan(0);
    const muscleStates = {};
    trainedIds.forEach(id => { muscleStates[id] = { status: "recovering", recoveryScore: 48 }; });
    const recommendation = { title: "Ben & Core", summary: "Överkroppen belastades — kör underkropp nästa pass." };

    const errs = []; const orig = console.error;
    console.error = (...a) => errs.push(a.map(x => (x && x.message) ? x.message : String(x)).join(" "));
    const el = document.createElement("div"); document.body.appendChild(el);
    await act(async () => { createRoot(el).render(
      <PostSessionModal session={session} muscleStates={muscleStates} recommendation={recommendation} onClose={() => {}} />
    ); });
    console.error = orig;

    expect(el.textContent).toMatch(/Pass avslutat/);
    expect(el.textContent).toMatch(/Bröst & Rygg-pass/);
    expect(el.textContent).toMatch(/Träningslast/);
    expect(el.textContent).toMatch(/Muskler du tränade/);
    expect(el.textContent).toMatch(/Nästa rekommendation/);
    expect(el.textContent).toMatch(/Ben & Core/);
    expect(el.textContent).toMatch(/Till översikten/);
    // Volym = 60*8 + 60*8 + 50*10 = 1460 kg (formaterad sv-SE)
    expect(el.textContent).toMatch(/1\s?460/);
    expect(errs.filter(e => !/not wrapped in act|Warning:/.test(e))).toEqual([]);
  });
});
