// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MachinesView } from "../features/machines/index.jsx";

describe("MachinesView — render", () => {
  it("renderar prototypen utan att krascha och visar maskinkort + filter", async () => {
    try { window.localStorage.clear(); } catch (e) {}
    const el = document.createElement("div");
    document.body.appendChild(el);
    const errs = [];
    const orig = console.error;
    console.error = (...a) => errs.push(a.map(x => (x && x.message) ? x.message : String(x)).join(" "));
    await act(async () => { createRoot(el).render(<MachinesView mode="demo" />); });
    console.error = orig;
    const real = errs.filter(e => !/not wrapped in act|Warning:/.test(e));
    expect(real).toEqual([]);
    expect(el.textContent).toMatch(/Min klubb/);
    expect(el.textContent).toMatch(/maskinmodell/i);
    expect(el.textContent).toMatch(/Kedja/);
    expect(el.textContent).toMatch(/Rörelsemönster/);
  });
});
