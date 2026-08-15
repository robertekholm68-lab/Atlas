// @vitest-environment jsdom
// Askr 2.0 — maskinguiden.
//
// 43 maskintyper och 67 modeller låg i datan utan en enda referens i 2.0.
// Femte fyndet i rad med samma form: funktionen fanns, vägen dit saknades.
//
// Och det här är den RIKASTE datan i appen. Till skillnad från övningsbanken,
// där ingen övning har teknikbeskrivning, bär varje maskintyp svenskt namn,
// inställningar att göra innan man sätter sig, vanliga fel och alternativ när
// maskinen är upptagen. Alla 43 har alla tre fälten ifyllda.

import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { MachineGuide } from "../atlas2/MachineGuide.jsx";
import { MACHINE_TYPES, MACHINE_MODELS } from "../data/machines.js";
import { MUSCLES } from "../data/muscles.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("datan håller vad guiden lovar", () => {
  it("varje maskin har inställningar, vanliga fel och justeringar", () => {
    // Guiden visar dem som rubriker. Saknas de blir rubriken tom, vilket är
    // värre än att inte visa något alls.
    for (const m of MACHINE_TYPES) {
      expect((m.setup || []).length, `${m.name} setup`).toBeGreaterThan(0);
      expect((m.commonErrors || []).length, `${m.name} fel`).toBeGreaterThan(0);
      expect((m.adjustments || []).length, `${m.name} justering`).toBeGreaterThan(0);
    }
  });

  it("alternativen pekar på maskiner som finns", () => {
    // Ett alternativ som inte går att öppna är en död knapp.
    const ids = new Set(MACHINE_TYPES.map(m => m.id));
    for (const m of MACHINE_TYPES)
      for (const a of m.alternatives || [])
        expect(ids.has(a), `${m.name} → ${a}`).toBe(true);
  });

  it("muskelvektorn använder samma ID som kroppskartan", () => {
    // Ingen andra sanning om vad något belastar.
    for (const m of MACHINE_TYPES)
      for (const a of m.muscles || [])
        expect(MUSCLES[a.muscleId], `${m.name} → ${a.muscleId}`).toBeTruthy();
  });

  it("varje modell pekar på en giltig typ", () => {
    const ids = new Set(MACHINE_TYPES.map(m => m.id));
    for (const mo of MACHINE_MODELS) expect(ids.has(mo.typeId), mo.model).toBe(true);
  });
});

describe("guiden visar allt", () => {
  const roots = [];
  afterEach(async () => {
    await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) {} el.remove(); }); });
  });
  const rendera = async () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const r = createRoot(el); roots.push({ r, el });
    await act(async () => { r.render(createElement(MachineGuide, {})); });
    return el;
  };
  const sök = async (el, q) => {
    const f = el.querySelector('input[aria-label="Sök bland maskiner"]');
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(f, q);
      f.dispatchEvent(new Event("input", { bubbles: true }));
    });
    return el.querySelectorAll('button[data-maskin="1"]');
  };

  it("alla maskiner listas utan gräns", async () => {
    const el = await rendera();
    expect(el.querySelectorAll('button[data-maskin="1"]').length).toBe(MACHINE_TYPES.length);
  });

  it("sökning på märke fungerar — man vet ofta bara vad det står på maskinen", async () => {
    const el = await rendera();
    expect((await sök(el, "technogym")).length).toBeGreaterThan(0);
  });

  it("sökning på svensk muskel fungerar", async () => {
    const el = await rendera();
    expect((await sök(el, "säte")).length).toBeGreaterThan(0);
  });

  it("en öppnad maskin visar inställningar OCH vanliga fel", async () => {
    const el = await rendera();
    await act(async () => { el.querySelector('button[data-maskin="1"]').click(); });
    expect(el.textContent).toMatch(/Ställ in först/i);
    expect(el.textContent).toMatch(/Vanliga fel/i);
    expect(el.textContent).toMatch(/Om den är upptagen/i);
  });
});
