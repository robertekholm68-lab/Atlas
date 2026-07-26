// @vitest-environment jsdom
// Askr 2.0 — händelsedrivna påminnelser.
//
// Det som bevakas hårdast är när påminnelsen ska TIGA. En påminnelse som dyker
// upp när den inte gäller är inte en hjälp utan en tjatmaskin, och en tjatmaskin
// lär man sig svepa bort — varpå även de relevanta försvinner.
//
// Fyra sätt den ska tiga på: när inget pass loggats, när det gått för kort eller
// för lång tid, när mat redan loggats efter passet, och när användaren avfärdat
// just den händelsen.

import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { buildNudges, activeNudges, pruneDismissed } from "../engines/nudges.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const MIN = 60000;
const NU = Date.now();
const MÅL = { kcal: 2400, protein: 180 };
const pass = (minSedan, id = "s1") => ({ id, completedAt: NU - minSedan * MIN, sets: [] });
const mat = (minSedan, protein = 30) => ({ id: "f" + minSedan, ts: NU - minSedan * MIN, protein, kcal: 400 });

describe("protein efter passet — när den talar", () => {
  it("dyker upp när ett pass loggats och inget ätits sedan dess", () => {
    const n = buildNudges({ sessions: [pass(45)], foodLog: [], nutritionTargets: MÅL, now: NU });
    expect(n).toHaveLength(1);
    expect(n[0].kind).toBe("protein");
    expect(n[0].text).toMatch(/45 min sedan/);
    expect(n[0].cta).toBe("Logga mat");
  });

  it("räknar ut hur mycket protein som är kvar på dagens mål", () => {
    const n = buildNudges({ sessions: [pass(45)], foodLog: [mat(600, 80)], nutritionTargets: MÅL, now: NU });
    expect(n[0].text).toMatch(/100 g protein kvar/);        // 180 − 80
  });

  it("utan proteinmål påstås ingen siffra — bara skälet", () => {
    const n = buildNudges({ sessions: [pass(45)], foodLog: [], nutritionTargets: null, now: NU });
    expect(n).toHaveLength(1);
    expect(n[0].text).not.toMatch(/\d+ g protein kvar/);
    expect(n[0].text).toMatch(/bygger upp musklerna/);
  });
});

describe("när den ska tiga", () => {
  it("inget loggat pass — inget att påminna om", () => {
    expect(buildNudges({ sessions: [], foodLog: [], nutritionTargets: MÅL, now: NU })).toHaveLength(0);
  });

  it("för tidigt: fem minuter efter sista setet står man kvar i gymmet", () => {
    expect(buildNudges({ sessions: [pass(5)], foodLog: [], nutritionTargets: MÅL, now: NU })).toHaveLength(0);
  });

  it("för sent: efter tre timmar är påminnelsen meningslös", () => {
    expect(buildNudges({ sessions: [pass(200)], foodLog: [], nutritionTargets: MÅL, now: NU })).toHaveLength(0);
  });

  it("har man redan ätit efter passet är saken avklarad", () => {
    const n = buildNudges({ sessions: [pass(60)], foodLog: [mat(30)], nutritionTargets: MÅL, now: NU });
    expect(n).toHaveLength(0);
  });

  it("mat som loggats FÖRE passet räknas inte som avklarat", () => {
    const n = buildNudges({ sessions: [pass(60)], foodLog: [mat(90)], nutritionTargets: MÅL, now: NU });
    expect(n).toHaveLength(1);
  });
});

describe("avfärdande gäller händelsen, inte påminnelsen för alltid", () => {
  it("ett avfärdat pass tystas — men nästa pass talar igen", () => {
    const idag = buildNudges({ sessions: [pass(45, "s1")], foodLog: [], nutritionTargets: MÅL, now: NU });
    const avfärdat = { [idag[0].id]: NU };
    expect(activeNudges(idag, avfärdat, NU)).toHaveLength(0);

    // Nytt pass, nytt id — påminnelsen kommer tillbaka.
    const imorgon = buildNudges({ sessions: [pass(45, "s2")], foodLog: [], nutritionTargets: MÅL, now: NU });
    expect(activeNudges(imorgon, avfärdat, NU)).toHaveLength(1);
  });

  it("id:t bär passets id, så avfärdandet kan knytas till rätt händelse", () => {
    const n = buildNudges({ sessions: [pass(45, "abc")], foodLog: [], nutritionTargets: MÅL, now: NU });
    expect(n[0].id).toContain("abc");
  });

  it("utgångna påminnelser filtreras bort även utan avfärdande", () => {
    const n = buildNudges({ sessions: [pass(45)], foodLog: [], nutritionTargets: MÅL, now: NU });
    expect(activeNudges(n, {}, NU + 200 * MIN)).toHaveLength(0);
  });

  it("gamla avfärdanden städas bort — listan får inte växa för evigt", () => {
    const gammalt = { "protein:s1": NU - 30 * 864e5, "protein:s2": NU - 60000 };
    const kvar = pruneDismissed(gammalt, NU);
    expect(Object.keys(kvar)).toEqual(["protein:s2"]);
  });
});

describe("påminnelsen i hemvyn", () => {
  const roots = [];
  afterEach(async () => {
    await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) {} el.remove(); }); });
    localStorage.clear();
  });

  it("tar dagens beskeds plats i stället för att lägga till höjd", async () => {
    // Hemskärmen ryms exakt på en liten telefon. Ett extra kort hade brutit
    // scrollfriheten, så påminnelsen delar slot med beskedet.
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true, writable: true });
    localStorage.setItem("atlas.v3.mode", JSON.stringify("demo"));
    const { Atlas2 } = await import("../atlas2/App2.jsx");
    const el = document.createElement("div"); document.body.appendChild(el);
    const r = createRoot(el); roots.push({ r, el });
    await act(async () => { r.render(createElement(Atlas2)); });
    for (let i = 0; i < 60 && el.querySelectorAll('[aria-label="Meny"]').length === 0; i++) {
      await act(async () => { await new Promise(x => setTimeout(x, 10)); });
    }
    // Demoläget har inga pass som slutade för en timme sedan, så ingen
    // påminnelse ska visas — och beskedet ska stå kvar.
    expect(el.querySelector('[aria-label="Avfärda påminnelsen"]')).toBe(null);
    expect(el.textContent.length).toBeGreaterThan(50);
  });
});
