// @vitest-environment jsdom
// Askr 2.0 — programvalet: familj först, nivå sedan.
//
// Robert: "Vi har ju gjort många fler pass och olika nivåer. Jag vill ha in
// alla. Jag vill också ha in helkropp, upper-lower och ppl."
//
// Allt fanns redan — 31 mallar, 106 pass. Men listan visade SEX åt gången med
// resten bakom "Visa alla 31 program", och Upper/Lower och Push/Pull/Legs låg
// på plats 5-10. Alltså precis utanför. Han hade dem hela tiden men såg dem
// aldrig, och nivån stod bara som text inne i namnet.

import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { ProgramSheet } from "../atlas2/ProgramSheet.jsx";
import { ALL_TEMPLATES } from "../engines/programs.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("mallarna finns", () => {
  it("Full Body, Upper/Lower och Push/Pull/Legs finns i tre nivåer var", () => {
    for (const familj of ["Full Body", "Upper/Lower", "Push/Pull/Legs"]) {
      const nivåer = ALL_TEMPLATES.filter(t => t.family === familj).map(t => t.level);
      expect(nivåer, familj).toEqual(["Novice", "Intermediate", "Advanced"]);
    }
  });

  it("varje mall har pass, och inget pass är tomt", () => {
    for (const t of ALL_TEMPLATES) {
      expect((t.workouts || []).length, t.name).toBeGreaterThan(0);
      for (const w of t.workouts) expect((w.exercises || []).length, `${t.name}/${w.name}`).toBeGreaterThan(0);
    }
  });
});

describe("valet är familj först", () => {
  const roots = [];
  afterEach(async () => {
    await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) {} el.remove(); }); });
  });
  const rendera = async () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const r = createRoot(el); roots.push({ r, el });
    await act(async () => {
      r.render(createElement(ProgramSheet, {
        aktiv: null, sessions: [], setPrograms: () => {}, setActiveProgramId: () => {},
        nästa: null, onStarta: () => {}, onClose: () => {},
      }));
    });
    return el;
  };

  it("alla upplägg syns utan att man behöver trycka Visa alla", async () => {
    // Det var precis det som gömde Upper/Lower och PPL.
    const el = await rendera();
    const fam = el.querySelectorAll('button[data-familj="1"]');
    const unika = new Set(ALL_TEMPLATES.map(t => t.family || t.name));
    expect(fam.length).toBe(unika.size);
    expect(el.textContent).not.toMatch(/Visa alla \d+ program/);
  });

  it("de vanligaste uppläggen står tidigt", async () => {
    const el = await rendera();
    const namn = [...el.querySelectorAll('button[data-familj="1"]')].map(b => b.textContent);
    const idx = f => namn.findIndex(n => n.toUpperCase().includes(f.toUpperCase()));
    expect(idx("Full Body")).toBeLessThan(5);
    expect(idx("Upper/Lower")).toBeLessThan(5);
    expect(idx("Push/Pull/Legs")).toBeLessThan(5);
  });

  it("nivåerna framgår redan i familjelistan", async () => {
    const el = await rendera();
    const ul = [...el.querySelectorAll('button[data-familj="1"]')].find(b => /Upper\/Lower/i.test(b.textContent));
    expect(ul.textContent).toMatch(/Novice/);
    expect(ul.textContent).toMatch(/Advanced/);
  });

  it("en familj öppnar sina nivåer, med väg tillbaka", async () => {
    const el = await rendera();
    const ul = [...el.querySelectorAll('button[data-familj="1"]')].find(b => /Upper\/Lower/i.test(b.textContent));
    await act(async () => { ul.click(); });
    expect(el.querySelectorAll('button[data-mall="1"]').length).toBe(3);
    // Utan väg tillbaka fastnar man i en familj.
    expect(el.textContent).toMatch(/Alla upplägg/);
  });

  it("en familj med bara en variant hoppar över nivåsteget", async () => {
    // Askr 50+ finns i en enda version. Ett nivåsteg med ett val är ett tomt steg.
    const el = await rendera();
    const solo = [...el.querySelectorAll('button[data-familj="1"]')]
      .find(b => /ASKR 50\+/i.test(b.textContent));
    expect(solo.textContent).not.toMatch(/Novice · Intermediate/);
  });
});
