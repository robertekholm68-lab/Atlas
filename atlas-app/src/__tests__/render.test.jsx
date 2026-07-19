// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { createRoot } from "react-dom/client";
import Atlas from "../app/App.jsx";

// Spåra rötter så de kan avmonteras mellan tester — annars lever gamla App-instanser
// kvar och deras effekter skriver om localStorage (t.ex. onboarding-draften), vilket
// gör routing-tester flakiga (jfr känd rot-pollution).
let _roots = [];
beforeEach(() => {
  _roots.forEach(r => { try { r.unmount(); } catch (e) {} });
  _roots = [];
  try { window.localStorage.clear(); } catch (e) {}
  try { document.body.innerHTML = ""; } catch (e) {}
});

async function mount(width, mode, opts = {}) {
  try { window.localStorage.clear(); } catch (e) {}
  if (mode) { try { window.localStorage.setItem("atlas.mode", mode); } catch (e) {} }
  if (opts.onboardingDone) { try { window.localStorage.setItem("atlas.v2.real.onboarding", JSON.stringify({ step: 6, completed: true, name: "Testperson" })); } catch (e) {} }
  Object.defineProperty(window, "innerWidth", { value: width, writable: true, configurable: true });
  const errs = [];
  const orig = console.error;
  console.error = (...a) => errs.push(a.map(x => (x && x.message) ? x.message : String(x)).join(" "));
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  _roots.push(root);
  root.render(<Atlas />);
  await new Promise(r => setTimeout(r, 200));
  console.error = orig;
  const real = errs.filter(e => !/not wrapped in act|Warning:|useLayoutEffect|getContext/.test(e));
  return { el, real };
}

describe("ATLAS — första start + lägen renderar utan fel", () => {
  it("första start (inget läge valt) → läges-väljaren visas", async () => {
    const { el, real } = await mount(1280, null);
    expect(real).toEqual([]);
    expect(el.textContent).toMatch(/Skapa min profil/);
    expect(el.textContent).toMatch(/Utforska demo/);
  });
  it("demo-läge desktop renderar fullt", async () => {
    const { el, real } = await mount(1280, "demo");
    expect(real).toEqual([]);
    expect(el.innerHTML.length).toBeGreaterThan(2000);
    expect(el.textContent).not.toMatch(/Jag behöver mer data innan jag kan bedöma/);
  });
  it("demo-läge mobil renderar fullt", async () => {
    const { el, real } = await mount(400, "demo");
    expect(real).toEqual([]);
    expect(el.innerHTML.length).toBeGreaterThan(2000);
  });
  it("real-läge (färsk) → ONBOARDING visas, inte dashboarden", async () => {
    const { el, real } = await mount(1280, "real");
    expect(real).toEqual([]);
    expect(el.textContent).toMatch(/Steg 1 av 7/);
    expect(el.textContent).toMatch(/Om dig/);
    expect(el.textContent).not.toMatch(/Jag behöver mer data innan jag kan bedöma/); // dashboarden visas ej än
  });
  it("real-läge mobil (färsk) → onboarding renderar", async () => {
    const { el, real } = await mount(400, "real");
    expect(real).toEqual([]);
    expect(el.textContent).toMatch(/Steg 1 av 7/);
  });
  it("real-läge EFTER slutförd onboarding → tom dashboard utan falska värden", async () => {
    const { el, real } = await mount(1280, "real", { onboardingDone: true });
    expect(real).toEqual([]);
    expect(el.innerHTML.length).toBeGreaterThan(2000);
    expect(el.textContent).not.toMatch(/null|NaN|Good morning, Robert/);
    expect(el.textContent).toMatch(/Jag behöver mer data innan jag kan bedöma din readiness/);
    expect(el.textContent).toMatch(/Analyskammare/);                       // ny spatial dashboard renderar
    expect(el.textContent).toMatch(/Välkommen till ATLAS/);
    expect(el.textContent).toMatch(/Jag behöver fler loggade pass innan jag kan bedöma din återhämtning/);
  });
});
