// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import Atlas from "../app/App.jsx";

async function mount(width, mode) {
  try { window.localStorage.clear(); } catch (e) {}
  if (mode) window.localStorage.setItem("atlas.mode", mode);
  Object.defineProperty(window, "innerWidth", { value: width, writable: true, configurable: true });
  const errs = []; const orig = console.error;
  console.error = (...a) => errs.push(a.map(x => (x && x.message) ? x.message : String(x)).join(" "));
  const el = document.createElement("div"); document.body.appendChild(el);
  await act(async () => { createRoot(el).render(<Atlas />); await new Promise(r => setTimeout(r, 220)); });
  const done = () => { console.error = orig; return errs.filter(e => !/not wrapped in act|Warning:|useLayoutEffect|getContext|Not implemented|canvas/i.test(e)); };
  return { el, done };
}

describe("Askr Analyskammare", () => {
  it("demo desktop: kammaren renderar med kropp, plattform och flytande paneler — utan fel", async () => {
    const { el, done } = await mount(1440, "demo");
    expect(el.textContent).toMatch(/Analyskammare/);
    expect(el.textContent).not.toMatch(/Starta träningsläge/);      // borttagen på webben (redundant)
    // flytande paneler (Dash-moduler) närvarande
    expect(el.textContent).toMatch(/AI-coach/);
    expect(el.textContent).toMatch(/Thailand/);                     // målrese-panel (demo)
    // den interaktiva kroppen behåller fram/bak/sida
    expect(el.textContent).toMatch(/Fram/);
    expect(el.textContent).toMatch(/Bak/);
    expect(el.textContent).toMatch(/Sida/);
    expect(done()).toEqual([]);
  });

  it("nav-skenan byter vy (kammaren ↔ andra vyer)", async () => {
    const { el, done } = await mount(1440, "demo");
    const nut = el.querySelector('[title="Nutrition"]');
    expect(nut).not.toBeNull();
    await act(async () => { nut.dispatchEvent(new window.MouseEvent("click", { bubbles: true })); await new Promise(r => setTimeout(r, 80)); });
    expect(el.textContent).toMatch(/Kaloritrend|Snabblogg/);       // Nutrition-vyn visas nu
    expect(el.textContent).not.toMatch(/Thailand/);                // dashboardens målrese-panel borta
    const dash = el.querySelector('[title="Dashboard"]');
    await act(async () => { dash.dispatchEvent(new window.MouseEvent("click", { bubbles: true })); await new Promise(r => setTimeout(r, 80)); });
    expect(el.textContent).toMatch(/Analyskammare/);               // tillbaka i kammaren
    expect(done()).toEqual([]);
  });
});
