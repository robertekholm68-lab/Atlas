// @vitest-environment jsdom
// Askr 2.0 — coachvyns hopfällbara delar.
//
// Fynd från riktig användning: chatten gick att fälla ut men inte in igen.
// Knappen BYTTES UT mot chatten, så vägen tillbaka fanns helt enkelt inte.
//
// Det värsta var att skälfliken bredvid gjorde rätt hela tiden — två olika sätt
// att fälla ut saker i samma vy, varav det ena var trasigt. Testerna nedan
// prövar därför båda med samma krav, så att de inte kan glida isär igen.

import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { CoachView } from "../atlas2/CoachView.jsx";
import { buildSession } from "../engines/session.js";
import { EXERCISES } from "../data/exercises.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const DAG = 864e5;
const ÖVN = (EXERCISES.find(e => e.loadMode === "external") || {}).id;
const pass = d => buildSession({
  title: "Pass", source: "training", completedAt: Date.now() - d * DAG,
  sets: [{ exerciseId: ÖVN, weight: 80, reps: 8 }],
});

describe("coachvyn går att fälla in igen", () => {
  const roots = [];
  afterEach(async () => {
    await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) {} el.remove(); }); });
  });
  const rendera = async () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const r = createRoot(el); roots.push({ r, el });
    await act(async () => {
      r.render(createElement(CoachView, { sessions: [pass(1), pass(3), pass(5)], weights: [], foodLog: [] }));
    });
    return el;
  };
  const knapp = (el, t) => [...el.querySelectorAll("button")].find(b => (b.textContent || "").toLowerCase().includes(t.toLowerCase()));

  it("chattrubriken finns kvar när chatten är utfälld", async () => {
    const el = await rendera();
    const rubrik = knapp(el, "Fråga coachen");
    expect(rubrik.getAttribute("aria-expanded")).toBe("false");

    await act(async () => { rubrik.click(); });
    // Rubriken MÅSTE finnas kvar — förut byttes den ut mot chatten, och då
    // fanns ingen väg tillbaka.
    const efter = knapp(el, "Fråga coachen");
    expect(efter, "rubriken försvann när chatten öppnades").toBeTruthy();
    expect(efter.getAttribute("aria-expanded")).toBe("true");

    await act(async () => { efter.click(); });
    expect(knapp(el, "Fråga coachen").getAttribute("aria-expanded")).toBe("false");
  });

  it("skälfliken beter sig likadant", async () => {
    const el = await rendera();
    const r = knapp(el, "Varför denna rekommendation");
    if (!r) return;                                  // saknas utan skäl att visa
    expect(r.getAttribute("aria-expanded")).toBe("false");
    await act(async () => { r.click(); });
    expect(knapp(el, "Varför denna rekommendation").getAttribute("aria-expanded")).toBe("true");
    await act(async () => { knapp(el, "Varför denna rekommendation").click(); });
    expect(knapp(el, "Varför denna rekommendation").getAttribute("aria-expanded")).toBe("false");
  });

  it("allt hopfällbart i vyn redovisar sitt läge för skärmläsare", async () => {
    // Ett hopfällbart avsnitt utan aria-expanded är osynligt för den som inte
    // ser pilen vända.
    const el = await rendera();
    const fällbara = [...el.querySelectorAll("button")]
      .filter(b => /fråga coachen|varför denna/i.test(b.textContent || ""));
    expect(fällbara.length).toBeGreaterThan(0);
    fällbara.forEach(b => expect(b.getAttribute("aria-expanded"), b.textContent.slice(0, 30)).not.toBe(null));
  });
});
