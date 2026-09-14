/**
 * @vitest-environment jsdom
 */
// KVITTOTS MÅLRAD — VÄGEN FRAM, INTE RÄKNINGEN.
//
// Motorn prövas i post-session.test.js. Här prövas att raden når skärmen, att
// den står FÖRE sammanfattningen (frågan "förde det mig närmare?" möts först),
// och att den inte påstår något om en plan som inte finns.
//
// Kopplingen har brustit förr i det här projektet: `nutritionTargets` fanns
// färdig i motorn långt innan någon vy skickade in den, och `muscleLoads` lästes
// på flera ställen utan att någon satte fältet.

import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { DoneView } from "../atlas2/WorkoutView.jsx";
import { buildSession } from "../engines/session.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const DAG = 86400000;

describe("målraden på kvittot", () => {
  let root, el;
  afterEach(() => { if (root) act(() => root.unmount()); if (el) el.remove(); root = null; el = null; });

  const passet = () => ({
    ...buildSession({ sets: [{ exerciseId: "bench_press", weight: 60, reps: 8 }], source: "training", title: "Push A" }),
    id: "nytt", completedAt: Date.now(),
  });

  const montera = (extra = {}) => {
    const session = extra.session || passet();
    el = document.createElement("div"); document.body.appendChild(el);
    root = createRoot(el);
    act(() => {
      root.render(createElement(DoneView, {
        resultat: { session, minuter: 40 },
        sessions: extra.sessions || [],
        onReason: () => {}, onHome: () => {},
        mål: extra.mål || null,
        weights: extra.weights || [],
        activeProgram: extra.activeProgram || null,
      }));
    });
    return el.querySelector('[data-malrad="1"]');
  };

  it("utan mål och utan program: veckans räkning, inget påstående om en plan", () => {
    const rad = montera();
    expect(rad).toBeTruthy();
    expect(rad.textContent).toMatch(/passet den här veckan/);
    expect(rad.textContent).not.toMatch(/plan/i);
  });

  it("med program blir programmets takt nämnare", () => {
    const rad = montera({ activeProgram: { daysPerWeek: 4 } });
    expect(rad.textContent).toMatch(/^Pass \d+ av 4 den här veckan\./);
  });

  it("med mål och plan når läget mot planen ända fram till skärmen", () => {
    // Två veckor in i en plan på tre pass i veckan, med bara det här passet
    // loggat: klart efter takten, och det ska stå på kvittot.
    const nu = Date.now();
    const mål = {
      namn: "Ner 5 kg", typ: "fatloss", passPerVecka: 3,
      startDatum: nu - 14 * DAG, målDatum: nu + 60 * DAG,
      plan: { dimensioner: {}, viktmål: null, cardioPerVecka: null }, delmål: [],
    };
    const rad = montera({ mål });
    expect(rad.textContent).toMatch(/pass kvar till planens takt mot Ner 5 kg\./);
  });

  it("står FÖRE sammanfattningen — det är den frågan man bär med sig ut", () => {
    const rad = montera({ activeProgram: { daysPerWeek: 4 } });
    const rubriker = [...el.querySelectorAll("div")].filter(d => d.textContent.trim() === "Sammanfattning");
    expect(rubriker.length).toBeGreaterThan(0);
    // DOCUMENT_POSITION_FOLLOWING = 4: rubriken kommer EFTER raden.
    expect(rad.compareDocumentPosition(rubriker[0]) & 4).toBe(4);
  });
});
