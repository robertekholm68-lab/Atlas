// @vitest-environment jsdom
// Askr 2.0 — redigera/radera pass + varför-frågan efter passet.
//
// Det som bevakas här är inte utseendet utan kedjan: en rättad vikt ska räknas
// om hela vägen ut i muskellasten, ett borttaget pass ska försvinna ur
// historiken utan att ta grannarna med sig, och ett svar på varför-frågan ska
// hamna PÅ passet — men först när användaren själv valt ett alternativ.

import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import {
  buildSession, updateSet, deleteSet,
  touchSession, replaceSession, removeSession, sessionHasLoad,
} from "../engines/session.js";
import { attachReason, pickQuestion, reasonSignal, compareToPrevious } from "../engines/post-session.js";
import { SessionSheet } from "../atlas2/SessionSheet.jsx";
import { DoneView } from "../atlas2/WorkoutView.jsx";
import { ProgressView } from "../atlas2/ProgressView.jsx";
import { EXERCISES } from "../data/exercises.js";

const DAG = 864e5;
// React vill veta att vi är i en act-miljö. Utan flaggan dränks konsolen i
// varningar och en ÄKTA act-varning skulle drunkna i bruset.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// En övning med yttre vikt, så att muskellasten faktiskt beror på kilona.
const ÖVNING = (EXERCISES.find(e => e.loadMode === "external" && e.id === "bench_press")
  || EXERCISES.find(e => e.loadMode === "external")).id;

const pass = (dagarSen, vikt, reps = 8, extra = {}) => buildSession({
  title: "Testpass", source: "training", completedAt: Date.now() - dagarSen * DAG,
  sets: [
    { exerciseId: ÖVNING, weight: vikt, reps },
    { exerciseId: ÖVNING, weight: vikt, reps },
  ],
  ...extra,
});

describe("listoperationer — historiken som helhet", () => {
  it("replaceSession byter ut RÄTT pass och lämnar grannarna orörda", () => {
    const a = pass(3, 60), b = pass(1, 80);
    const nytt = { ...b, title: "Ändrat" };
    const ut = replaceSession([a, b], nytt);
    expect(ut).toHaveLength(2);
    expect(ut[0]).toBe(a);                       // samma objekt, inte ens kopierat
    expect(ut[1].title).toBe("Ändrat");
  });

  it("replaceSession behåller id men bumpar updatedAt — synken ska se en ÄNDRING", () => {
    const a = { ...pass(1, 80), updatedAt: 1000 };
    const ut = replaceSession([a], { ...a, title: "Rättat" }, 9999);
    expect(ut[0].id).toBe(a.id);                 // identiteten överlever redigering
    expect(ut[0].updatedAt).toBe(9999);          // annars tappas ändringen vid merge
  });

  it("replaceSession låter ett borttaget pass förbli borttaget", () => {
    const a = pass(2, 60);
    expect(replaceSession([], a)).toEqual([]);   // återuppstår aldrig ur en gammal vy
  });

  it("removeSession tar bort exakt ett pass", () => {
    const a = pass(3, 60), b = pass(1, 80);
    const ut = removeSession([a, b], b.id);
    expect(ut).toHaveLength(1);
    expect(ut[0].id).toBe(a.id);
    expect(removeSession([a, b], null)).toHaveLength(2);   // inget id → ingen radering
  });

  it("touchSession rör bara updatedAt", () => {
    const a = pass(1, 80);
    const ut = touchSession(a, 4242);
    expect(ut.updatedAt).toBe(4242);
    expect({ ...ut, updatedAt: a.updatedAt }).toEqual({ ...a, updatedAt: a.updatedAt });
  });
});

describe("redigering räknas om hela vägen", () => {
  it("en rättad vikt ändrar muskellasten, inte bara siffran i loggen", () => {
    const p = pass(1, 100);
    const före = Object.values(p.muscleLoads).reduce((a, b) => a + b, 0);
    const efter = updateSet(p, p.sets[0].id, { weight: 50 });
    const summa = Object.values(efter.muscleLoads).reduce((a, b) => a + b, 0);
    expect(före).toBeGreaterThan(0);
    expect(summa).toBeLessThan(före);            // halverad vikt → mindre last
  });

  it("ett borttaget set försvinner ur både set och belastning", () => {
    const p = pass(1, 100);
    const efter = deleteSet(p, p.sets[0].id);
    expect(efter.sets).toHaveLength(1);
    const summa = Object.values(efter.muscleLoads).reduce((a, b) => a + b, 0);
    const heltUtan = deleteSet(efter, efter.sets[0].id);
    expect(summa).toBeGreaterThan(0);
    expect(Object.values(heltUtan.muscleLoads).reduce((a, b) => a + b, 0)).toBe(0);
  });

  it("sessionHasLoad säger ärligt att ett tömt pass väger noll", () => {
    const p = pass(1, 100);
    expect(sessionHasLoad(p)).toBe(true);
    const tomt = p.sets.reduce((acc, s) => deleteSet(acc, s.id), p);
    expect(sessionHasLoad(tomt)).toBe(false);
  });
});

describe("varför-frågan", () => {
  it("ställs bara vid en verklig avvikelse — inte vid brus", () => {
    const gammalt = pass(7, 100), nytt = pass(0, 99);
    const brus = compareToPrevious(nytt, [gammalt], EXERCISES);
    expect(pickQuestion(brus)).toBe(null);       // 1 % — inte värt en fråga

    const sänkt = pass(0, 80);
    const diff = compareToPrevious(sänkt, [gammalt], EXERCISES);
    const fråga = pickQuestion(diff);
    expect(fråga).not.toBe(null);
    expect(fråga.direction).toBe("down");
    expect(fråga.options.length).toBeGreaterThan(1);
  });

  it("attachReason skriver svaret på passet utan att röra loggen", () => {
    const p = pass(0, 80);
    const med = attachReason(p, "somn", { exerciseId: ÖVNING, direction: "down" });
    expect(med.reason.code).toBe("somn");
    expect(med.reason.exerciseId).toBe(ÖVNING);
    expect(med.sets).toEqual(p.sets);            // svaret ändrar aldrig vad som loggades
    expect(p.reason).toBeUndefined();            // ren funktion — originalet orört
  });

  it("reasonSignal tiger tills det finns ett mönster", () => {
    const ett = [attachReason(pass(1, 80), "trott")];
    expect(reasonSignal(ett)).toBe(null);
    const tre = [pass(1, 80), pass(3, 80), pass(5, 80)].map(p => attachReason(p, "trott"));
    expect(reasonSignal(tre).kind).toBe("recovery");
  });
});

describe("rendering — arket och kvittot", () => {
  const roots = [];
  afterEach(async () => {
    // Omonterade rötter läcker mellan testfall (se CLAUDE.md) — montera av alla.
    await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) {} el.remove(); }); });
  });
  const rendera = async (komp, props) => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const r = createRoot(el); roots.push({ r, el });
    await act(async () => { r.render(createElement(komp, props)); });
    return el;
  };
  const knapp = (el, text) => [...el.querySelectorAll("button")]
    .find(b => (b.textContent || "").toLowerCase().includes(text.toLowerCase()));

  it("arket visar passets set och sparar först när något ändrats", async () => {
    const p = pass(1, 80);
    let sparat = null;
    const el = await rendera(SessionSheet, { session: p, onSpara: s => { sparat = s; }, onRadera: () => {}, onClose: () => {} });
    expect(el.textContent).toContain("Redigera pass");
    expect(el.querySelectorAll('input[type="number"]').length).toBeGreaterThan(0);

    const spara = knapp(el, "Spara ändringar");
    expect(spara.disabled).toBe(true);           // inget ändrat än

    const viktfält = el.querySelector('input[aria-label="Vikt set 1"]');
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(viktfält, "60");
      viktfält.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(knapp(el, "Spara ändringar").disabled).toBe(false);
    await act(async () => { knapp(el, "Spara ändringar").click(); });
    expect(sparat.sets[0].weight).toBe(60);
    expect(sparat.id).toBe(p.id);                // identiteten överlever
  });

  it("radering kräver bekräftelse — ett tryck räcker inte", async () => {
    const p = pass(1, 80);
    let raderat = null;
    const el = await rendera(SessionSheet, { session: p, onSpara: () => {}, onRadera: id => { raderat = id; }, onClose: () => {} });
    await act(async () => { knapp(el, "Ta bort passet").click(); });
    expect(raderat).toBe(null);                  // första trycket varnar bara
    expect(el.textContent).toContain("går inte att ångra");
    await act(async () => { knapp(el, "Ja, ta bort").click(); });
    expect(raderat).toBe(p.id);
  });

  it("kvittot ställer frågan och sparar svaret först när användaren väljer", async () => {
    const gammalt = pass(7, 100);
    const nytt = pass(0, 80);
    let svar = null;
    const el = await rendera(DoneView, {
      resultat: { session: nytt, minuter: 42 }, sessions: [gammalt, nytt],
      onReason: s => { svar = s; }, onHome: () => {},
    });
    expect(el.textContent).toContain("Vad berodde det på?");
    expect(svar).toBe(null);                     // inget antas innan användaren svarat
    await act(async () => { knapp(el, "Sov dåligt").click(); });
    expect(svar.reason.code).toBe("somn");
    expect(el.textContent).toContain("Tack");
  });

  it("hoppa över sparar ingenting", async () => {
    const el = await rendera(DoneView, {
      resultat: { session: pass(0, 80), minuter: 30 }, sessions: [pass(7, 100)],
      onReason: () => { throw new Error("fick inte sparas"); }, onHome: () => {},
    });
    await act(async () => { knapp(el, "Hoppa över").click(); });
    expect(el.textContent).toContain("Inget svar sparat");
  });

  it("framstegsvyn listar loggade pass och öppnar rätt pass", async () => {
    const a = pass(3, 60), b = pass(1, 80);
    let öppnat = null;
    const el = await rendera(ProgressView, { sessions: [a, b], weights: [], onOpenSession: id => { öppnat = id; } });
    expect(el.textContent).toContain("Loggade pass");
    const rader = [...el.querySelectorAll("button")].filter(x => (x.textContent || "").includes("Testpass"));
    expect(rader.length).toBe(2);
    await act(async () => { rader[0].click(); });
    expect(öppnat).toBe(b.id);                   // senaste passet överst
  });
});
