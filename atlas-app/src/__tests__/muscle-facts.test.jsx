// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import Atlas from "../app/App.jsx";
import { NAME2MUSCLE, MUSCLES, GROUP_SV } from "../data/muscles.js";
import ATLAS_HITMAP_DATA from "../assets/data/hitmap_data.json";

describe("Muskelfakta — inforutans data (region → muskel → grupp/storlek/återhämtning)", () => {
  it("region-namn löser till muskel med svensk grupp, storlek och återhämtningstid", () => {
    const id = NAME2MUSCLE["Biceps brachii"];
    expect(id).toBe("biceps_brachii");
    const M = MUSCLES[id];
    expect(GROUP_SV[M.group]).toBe("Armar");
    expect(M.size).toBe("small");
    expect(M.halfLife).toBe(24);
  });
  it("varje hitmap-region har ett funktions-fält (sträng) som inforutan visar", () => {
    const r = ATLAS_HITMAP_DATA.front.regions.find(x => x.name === "Biceps brachii");
    expect(typeof r.fn).toBe("string");
    expect(r.fn.length).toBeGreaterThan(5);            // riktig text, inte ett enstaka tecken (gamla fn[1]-buggen)
  });
});

describe("Muskelfakta — alla regioner är rätt markerade / klickbara", () => {
  it("varje region-namn har en känd mappning (muskel-id eller medvetet null för ansikte)", () => {
    const missing = [];
    for (const view of ["front", "back"]) for (const r of ATLAS_HITMAP_DATA[view].regions) {
      if (NAME2MUSCLE[r.name] === undefined) missing.push(`${view} [${r.id}] ${r.name}`);
    }
    expect(missing).toEqual([]);                        // inga oavsiktligt omappade regioner
  });
  it("triceps är klickbar: baksidan har en Triceps brachii-region → triceps_brachii", () => {
    const tri = ATLAS_HITMAP_DATA.back.regions.filter(r => r.name === "Triceps brachii");
    expect(tri.length).toBeGreaterThan(0);
    expect(NAME2MUSCLE["Triceps brachii"]).toBe("triceps_brachii");
    expect(GROUP_SV[MUSCLES.triceps_brachii.group]).toBe("Armar");
    // och den pekar inte längre felaktigt på bakre delten
    expect(tri.every(r => NAME2MUSCLE[r.name] === "triceps_brachii")).toBe(true);
  });
  it("triceps-masken ligger på armarna (lateralt, nedanför axeln) — inte på ryggen", () => {
    const V = ATLAS_HITMAP_DATA.back;
    const tri = V.regions.filter(r => r.name === "Triceps brachii");
    expect(tri.length).toBe(2);
    const cx = r => (r.bx + r.bw / 2) / V.W * 100;
    const cy = r => (r.by + r.bh / 2) / V.H * 100;
    // en region på vänster arm (lateralt), en på höger arm — inte centralt på ryggen
    expect(tri.some(r => cx(r) < 35)).toBe(true);
    expect(tri.some(r => cx(r) > 65)).toBe(true);
    // nedanför axeln (överarmshöjd), inte uppe mellan skulderbladen (som var ~21%)
    expect(tri.every(r => cy(r) > 28)).toBe(true);
  });
  it("endast kända aggregeringar saknar egen region (regressionsvakt)", () => {
    const named = new Set();
    for (const view of ["front", "back"]) ATLAS_HITMAP_DATA[view].regions.forEach(r => { const id = NAME2MUSCLE[r.name]; if (id) named.add(id); });
    const without = Object.keys(MUSCLES).filter(id => !named.has(id)).sort();
    expect(without).toEqual(["deltoid_lateral", "hip_flexors", "serratus_anterior"]);
  });
});

describe("Muskelfakta — vyn renderar", () => {
  it("demo desktop: Muskelfakta öppnas utan fel med fram/bak-växling", async () => {
    try { window.localStorage.clear(); } catch (e) {}
    window.localStorage.setItem("atlas.mode", "demo");
    Object.defineProperty(window, "innerWidth", { value: 1280, writable: true, configurable: true });
    const errs = []; const orig = console.error;
    console.error = (...a) => errs.push(a.map(x => (x && x.message) ? x.message : String(x)).join(" "));
    const el = document.createElement("div"); document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<Atlas />); await new Promise(r => setTimeout(r, 200)); });
    const tab = el.querySelector('[title="Kroppen"]');
    expect(tab).not.toBeNull();
    await act(async () => { tab.dispatchEvent(new window.MouseEvent("click", { bubbles: true })); await new Promise(r => setTimeout(r, 120)); });
    const fakta = [...el.querySelectorAll("button")].find(b => (b.textContent || "").trim() === "Fakta");
    expect(fakta).not.toBeNull();
    await act(async () => { fakta.dispatchEvent(new window.MouseEvent("click", { bubbles: true })); await new Promise(r => setTimeout(r, 150)); });
    console.error = orig;
    const real = errs.filter(e => !/not wrapped in act|Warning:|useLayoutEffect|getContext|Not implemented|canvas/i.test(e));
    expect(real).toEqual([]);
    expect(el.textContent).toMatch(/Framsida/);
    expect(el.textContent).toMatch(/Baksida/);
  });
});
