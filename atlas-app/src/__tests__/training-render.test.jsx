// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import Atlas from "../app/App.jsx";

function clickText(el, text) {
  const nodes = [...el.querySelectorAll("*")].filter(n => (n.textContent || "").includes(text));
  const target = nodes[nodes.length - 1] || nodes[0];
  target && target.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
}

async function mount(width, mode) {
  try { window.localStorage.clear(); } catch (e) {}
  if (mode) { try { window.localStorage.setItem("atlas.mode", mode); } catch (e) {} }
  Object.defineProperty(window, "innerWidth", { value: width, writable: true, configurable: true });
  const errs = []; const orig = console.error;
  console.error = (...a) => errs.push(a.map(x => (x && x.message) ? x.message : String(x)).join(" "));
  const el = document.createElement("div"); document.body.appendChild(el);
  await act(async () => { createRoot(el).render(<Atlas />); await new Promise(r => setTimeout(r, 220)); });
  const done = () => { console.error = orig; return errs.filter(e => !/not wrapped in act|Warning:|useLayoutEffect|getContext/.test(e)); };
  return { el, done };
}

describe("Träningsmotor — redigera pass via kalendern (integration)", () => {
  it("demo desktop: Kalender → klick på pass → 'Redigera pass' öppnas, utan fel", async () => {
    const { el, done } = await mount(1280, "demo");
    await act(async () => { clickText(el, "Historik"); await new Promise(r => setTimeout(r, 60)); });
    await act(async () => { clickText(el, "Kalender"); await new Promise(r => setTimeout(r, 60)); });
    // Klick på ett sessionskort (subtitlen innehåller "redigera" när redigering är möjlig)
    await act(async () => { clickText(el, "redigera"); await new Promise(r => setTimeout(r, 60)); });
    expect(el.textContent).toMatch(/Redigera pass/);
    expect(el.textContent).toMatch(/Spara ändringar/);
    expect(done()).toEqual([]);
  });
});
