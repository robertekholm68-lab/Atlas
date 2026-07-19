// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import Atlas from "../app/App.jsx";

function clickText(el, text) {
  const nodes = [...el.querySelectorAll("*")].filter(n => (n.textContent || "").trim() === text || (n.tagName === "BUTTON" && (n.textContent || "").includes(text)));
  const target = nodes[nodes.length - 1];
  target && target.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
}
function backBtn(el) { return el.querySelector('[aria-label="Tillbaka"]'); }

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

describe("Tillbakapilar i alla vyer", () => {
  it("desktop: hemvyn har ingen pil; efter navigering visas pil och tar en tillbaka hem", async () => {
    const { el, done } = await mount(1280, "demo");
    expect(backBtn(el)).toBeNull();                                  // Dashboard = hem, ingen pil
    await act(async () => { clickText(el, "Nutrition"); await new Promise(r => setTimeout(r, 60)); });
    expect(el.textContent).toMatch(/Kaloritrend|Snabblogg/);        // Nutrition-vyn
    expect(backBtn(el)).not.toBeNull();                             // pil visas
    await act(async () => { backBtn(el).dispatchEvent(new window.MouseEvent("click", { bubbles: true })); await new Promise(r => setTimeout(r, 60)); });
    expect(el.textContent).toMatch(/Välkommen tillbaka/);           // tillbaka på hem
    expect(backBtn(el)).toBeNull();                                 // pil borta igen
    expect(done()).toEqual([]);
  });

  it("mobil: efter flikbyte visas tillbakapil i toppfältet och tar en tillbaka hem", async () => {
    const { el, done } = await mount(400, "demo");
    expect(backBtn(el)).toBeNull();
    await act(async () => { clickText(el, "Progress"); await new Promise(r => setTimeout(r, 60)); });
    expect(backBtn(el)).not.toBeNull();
    await act(async () => { backBtn(el).dispatchEvent(new window.MouseEvent("click", { bubbles: true })); await new Promise(r => setTimeout(r, 60)); });
    expect(backBtn(el)).toBeNull();                                 // hem igen
    expect(done()).toEqual([]);
  });

  it("profilregistrering: steg 1 har en väg UT till läges-valet", async () => {
    const { el, done } = await mount(1280, "real");                 // färsk real → onboarding
    expect(el.textContent).toMatch(/Steg 1 av 7/);
    const exit = el.querySelector('[aria-label="Till läges-valet"]');
    expect(exit).not.toBeNull();                                    // pil ut finns på steg 1
    await act(async () => { exit.dispatchEvent(new window.MouseEvent("click", { bubbles: true })); await new Promise(r => setTimeout(r, 80)); });
    expect(el.textContent).toMatch(/Skapa min profil/);            // tillbaka på läges-valet
    expect(el.textContent).toMatch(/Utforska demo/);
    expect(done()).toEqual([]);
  });

  it("demo är nåbart från real-läge via sidomenyns läges-växlare", async () => {
    // real med slutförd onboarding → dashboard
    try { window.localStorage.clear(); } catch (e) {}
    window.localStorage.setItem("atlas.mode", "real");
    window.localStorage.setItem("atlas.v2.real.onboarding", JSON.stringify({ completed: true, name: "X" }));
    Object.defineProperty(window, "innerWidth", { value: 1280, writable: true, configurable: true });
    const el = document.createElement("div"); document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<Atlas />); await new Promise(r => setTimeout(r, 200)); });
    const toDemo = [...el.querySelectorAll("button")].find(b => /Utforska demo/.test(b.textContent));
    expect(toDemo).not.toBeNull();                                  // läges-växlaren finns i nav-skenan
    await act(async () => { toDemo.dispatchEvent(new window.MouseEvent("click", { bubbles: true })); await new Promise(r => setTimeout(r, 200)); });
    expect(el.textContent).toMatch(/Thailand/);                     // nu i demo (demo-målresan syns)
    expect(el.textContent).toMatch(/Analyskammare/);
  });
});
