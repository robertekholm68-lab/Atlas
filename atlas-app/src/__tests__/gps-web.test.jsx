// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import Atlas from "../app/App.jsx";
import { buildSession } from "../engines/session.js";

const roots = [];
const mount = async () => { const el = document.createElement("div"); document.body.appendChild(el); const r = createRoot(el); roots.push({ r, el }); await act(async () => { r.render(<Atlas />); }); await new Promise(x => setTimeout(x, 300)); return el; };
afterEach(async () => { await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) { } el.remove(); }); }); });
const clickTitle = (el, t) => { const b = el.querySelector(`[title="${t}"]`); if (b) b.dispatchEvent(new MouseEvent("click", { bubbles: true })); return !!b; };
const GPS = { id: "g_test", title: "Löpning 5.20 km", completedAt: Date.now() - 864e5, sport: true, source: "gps", cardioLoad: 250, muscleLoads: {}, sets: [], distanceKm: 5.2, durationMin: 28, steps: 5400, schemaV: 2 };

describe("GPS-pass i webbappen", () => {
  it("buildSession behåller sträcka, tid och steg från mobilen", () => {
    const s = buildSession({ ...GPS });
    expect(s.distanceKm).toBe(5.2);
    expect(s.durationMin).toBe(28);
    expect(s.steps).toBe(5400);
  });

  it("utepass-kortet visar distans och snittempo i Framsteg", async () => {
    window.localStorage.clear(); window.localStorage.setItem("atlas.mode", "demo");
    Object.defineProperty(window, "innerWidth", { value: 1400, configurable: true });
    let el = await mount();
    const key = "atlas.v2.demo.sessions";
    const list = JSON.parse(localStorage.getItem(key) || "[]"); list.push(GPS);
    localStorage.setItem(key, JSON.stringify(list));
    el = await mount();
    clickTitle(el, "Historik"); await act(async () => { }); await new Promise(r => setTimeout(r, 250));
    expect(/Utepass · GPS/.test(el.textContent)).toBe(true);
    expect(/5\.2 km/.test(el.textContent)).toBe(true);
    expect(/Snittempo/.test(el.textContent)).toBe(true);
  });

  it("inga utepass → inget kort (inga nollor)", async () => {
    window.localStorage.clear(); window.localStorage.setItem("atlas.mode", "demo");
    Object.defineProperty(window, "innerWidth", { value: 1400, configurable: true });
    const el = await mount();
    clickTitle(el, "Historik"); await act(async () => { }); await new Promise(r => setTimeout(r, 250));
    expect(/Utepass · GPS/.test(el.textContent)).toBe(false);
  });
});
