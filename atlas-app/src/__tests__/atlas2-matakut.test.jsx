// @vitest-environment jsdom
// Askr 2.0 — matakuten ("Rädda måltiden").
//
// Det som bevakas är löftena, inte pixlarna: att fritext tolkas till rätt läge,
// att förslagen kommer ur motorn och inte ur vyn, att SKYDDSRÄCKET alltid syns
// när ett råd ges, och att tonläget överlever som inställning.
//
// Skyddsräcket har ett eget testfall med flit. Det är den mening som skiljer
// "hjälp att fatta ett realistiskt beslut" från "en app som får dig att
// kompensera", och den ska inte kunna försvinna i en framtida städning utan att
// ett test går sönder.

import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { interpretCrisis, buildRescue, recentIntakeSummary } from "../engines/index.js";
import { RESCUE_SITUATIONS, NUTRITION_STYLES } from "../data/foods.js";
import { RescueView } from "../atlas2/RescueView.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const DAG = 864e5;
const MÅL = { kcal: 2400, protein: 180 };

describe("motorn bakom akuten", () => {
  it("tolkar fritext till rätt läge", () => {
    expect(interpretCrisis("sug på tacos, sen kväll")).toBe("fastfood");
    expect(interpretCrisis("orkar inte laga något")).toBe("nocook");
    expect(interpretCrisis("jättesötsugen")).toBe("sweet");
    expect(interpretCrisis("bakis idag")).toBe("hungover");
    expect(interpretCrisis("")).toBe(null);
    expect(interpretCrisis("nåt helt annat")).toBe("custom");
  });

  it("ger alltid ett rekommenderat förslag med en motivering", () => {
    for (const s of RESCUE_SITUATIONS) {
      const r = buildRescue(s.id, { kcal: 600, protein: 60 }, "balanced", []);
      expect(r.opts.length).toBeGreaterThan(1);
      expect(r.rec.pick).toBeGreaterThanOrEqual(1);
      expect(r.rec.pick).toBeLessThanOrEqual(r.opts.length);
      expect(typeof r.rec.why).toBe("string");
      expect(r.rec.why.length).toBeGreaterThan(0);
    }
  });

  it("skyddsräcket finns för ALLA tonlägen och nämner varken svält eller straffträning", () => {
    for (const t of NUTRITION_STYLES) {
      const g = buildRescue("sweet", { kcal: 300, protein: 40 }, t.id, []).guard;
      expect(g.length).toBeGreaterThan(20);
      // Räcket ska avråda från kompensation — inte föreslå den.
      expect(/svälta|kompensation|dåligt samvete|straff/i.test(g)).toBe(true);
    }
  });

  it("tonläget ändrar hur rakt coachen säger ifrån", () => {
    const kvar = { kcal: 250, protein: 30 };
    const strikt = buildRescue("pizza", kvar, "focused", []).coach;
    const flexibel = buildRescue("pizza", kvar, "flexible", []).coach;
    expect(strikt).not.toBe(flexibel);
  });

  it("utan loggade dagar säger motorn ärligt att underlaget saknas", () => {
    const tomt = recentIntakeSummary([], MÅL);
    expect(tomt.enough).toBe(false);
  });
});

describe("matakuten i gränssnittet", () => {
  const roots = [];
  afterEach(async () => {
    await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) {} el.remove(); }); });
  });
  const rendera = async (props = {}) => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const r = createRoot(el); roots.push({ r, el });
    await act(async () => {
      r.render(createElement(RescueView, { foodLog: [], nutritionTargets: MÅL, profile: {}, weights: [], ...props }));
    });
    return el;
  };
  const knapp = (el, t) => [...el.querySelectorAll("button")].find(b => (b.textContent || "").toLowerCase().includes(t.toLowerCase()));

  it("visar lägena men inga råd förrän ett valts", async () => {
    const el = await rendera();
    expect(el.textContent).toContain("Rädda måltiden");
    for (const s of RESCUE_SITUATIONS) expect(el.textContent).toContain(s.label);
    expect(el.textContent).not.toContain("Rekommenderas");
  });

  it("ett valt läge ger förslag, ETT rekommenderat, och skyddsräcket", async () => {
    const el = await rendera();
    await act(async () => { knapp(el, "Sötsugen").click(); });
    expect(el.textContent).toContain("Rekommenderas");
    expect((el.textContent.match(/Rekommenderas/g) || []).length).toBe(1);
    expect(/svälta|kompensation|dåligt samvete/i.test(el.textContent)).toBe(true);
  });

  it("fritext tolkas och kvitteras så att användaren ser vad appen förstod", async () => {
    const el = await rendera();
    const fält = el.querySelector('input[aria-label="Beskriv ditt läge"]');
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(fält, "orkar inte laga");
      fält.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => { knapp(el, "Fråga").click(); });
    expect(el.textContent).toContain("Uppfattat");
    expect(el.textContent).toContain("orkar inte laga");
  });

  it("visar dagens kvarvarande ram när ett mål finns", async () => {
    const nu = Date.now();
    const el = await rendera({ foodLog: [{ ts: nu, kcal: 900, protein: 60, name: "lunch" }] });
    await act(async () => { knapp(el, "Jag är hungrig").click(); });
    expect(el.textContent).toMatch(/Kvar idag/);
    expect(el.textContent).toContain("1500");        // 2400 − 900
  });

  it("utan dagsmål påstås ingen ram — hellre säga det än hitta på en", async () => {
    const el = await rendera({ nutritionTargets: null });
    await act(async () => { knapp(el, "Jag är hungrig").click(); });
    expect(el.textContent).toContain("Inget dagsmål satt");
    expect(el.textContent).not.toMatch(/Kvar idag/);
  });

  it("tonvalet sparas på profilen, inte bara i vyn", async () => {
    let sparad = null;
    const el = await rendera({ setProfile: uppd => { sparad = typeof uppd === "function" ? uppd({}) : uppd; } });
    await act(async () => { knapp(el, "Ton:").click(); });
    await act(async () => { knapp(el, "Flexibel").click(); });
    expect(sparad.nutStyle).toBe("flexible");
  });

  it("erbjuder vägen till loggen — skyddsräcket ber en registrera valet", async () => {
    let gick = false;
    const el = await rendera({ onLogga: () => { gick = true; } });
    await act(async () => { knapp(el, "Sugen på pizza").click(); });
    await act(async () => { knapp(el, "Logga det jag valde").click(); });
    expect(gick).toBe(true);
  });
});
