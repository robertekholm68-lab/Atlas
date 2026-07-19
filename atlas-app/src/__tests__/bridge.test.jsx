// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import Atlas from "../app/App.jsx";
import { writeBridge, readBridge, pendingFromBridge, clearBridge } from "../engines/bridge.js";

const S = (id, ts = Date.now()) => ({ id, title: "Pass " + id, completedAt: ts, sets: [], muscleLoads: {}, schemaV: 2 });
const F = id => ({ id, ts: Date.now(), name: "Mat " + id, kcal: 400 });

describe("brygga mobil → webb", () => {
  beforeEach(() => localStorage.clear());

  it("mobilen lämnar av och webben ser samma innehåll", () => {
    writeBridge({ sessions: [S("a")], food: [F("f1")] });
    const box = readBridge();
    expect(box.sessions.length).toBe(1);
    expect(box.food.length).toBe(1);
    expect(box.ts).toBeTruthy();
  });

  it("bara det som saknas räknas som väntande", () => {
    writeBridge({ sessions: [S("a"), S("b")], food: [F("f1")] });
    const p = pendingFromBridge({ sessions: [S("a")], foodLog: [F("f1")] });
    expect(p.sessions.map(x => x.id)).toEqual(["b"]);
    expect(p.food.length).toBe(0);                    // redan importerat räknas inte igen
  });

  it("tom brevlåda ger inget väntande", () => {
    expect(pendingFromBridge({ sessions: [], foodLog: [] }).sessions.length).toBe(0);
  });

  it("skriver inte om ingenting ändrats — väcker inte andra fliken i onödan", () => {
    expect(writeBridge({ sessions: [S("a")], food: [] })).toBe(true);
    expect(writeBridge({ sessions: [S("a")], food: [] })).toBe(false);
  });

  it("trasigt innehåll i brevlådan kraschar inte, det ignoreras", () => {
    localStorage.setItem("atlas.bridge.v1", "{trasigt");
    expect(readBridge().sessions).toEqual([]);
  });

  it("töms efter import så den inte växer i all evighet", () => {
    writeBridge({ sessions: [S("a")], food: [] });
    clearBridge();
    expect(readBridge().sessions.length).toBe(0);
  });
});

describe("bryggan i webbappen", () => {
  const roots = [];
  afterEach(async () => { await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) { } el.remove(); }); }); });
  const mount = async () => { const el = document.createElement("div"); document.body.appendChild(el); const r = createRoot(el); roots.push({ r, el }); await act(async () => { r.render(<Atlas />); }); await new Promise(x => setTimeout(x, 300)); return el; };
  const clickTitle = (el, t) => { const b = el.querySelector(`[title="${t}"]`); if (b) b.dispatchEvent(new MouseEvent("click", { bubbles: true })); return !!b; };

  it("väntande material upptäcks och erbjuds — inget tas i tysthet", async () => {
    localStorage.clear(); localStorage.setItem("atlas.mode", "demo");
    Object.defineProperty(window, "innerWidth", { value: 1400, configurable: true });
    writeBridge({ sessions: [S("brygga_1", Date.now() - 864e5)], food: [] });
    const el = await mount();
    clickTitle(el, "Profil"); await act(async () => { }); await new Promise(r => setTimeout(r, 250));
    expect(/väntar från mobilen/.test(el.textContent)).toBe(true);
    expect(/Ingen kod behövs/.test(el.textContent)).toBe(true);
    // fortfarande kvar i brevlådan tills användaren själv hämtar
    expect(readBridge().sessions.length).toBe(1);
  });
});

describe("bryggan bär hela mobilresan", () => {
  it("vikter som redan finns som mätpunkter räknas inte som väntande", () => {
    localStorage.clear();
    writeBridge({ sessions: [], food: [], weights: [{ id: "w1", ts: 5000, kg: 80 }, { id: "w2", ts: 9000, kg: 79 }] });
    const p = pendingFromBridge({ sessions: [], foodLog: [], measurements: [{ date: 5000, weight: 80 }] });
    expect(p.weights.map(x => x.id)).toEqual(["w2"]);
  });

  it("anteckningar och check-ins följer med i brevlådan", () => {
    localStorage.clear();
    writeBridge({ sessions: [], food: [], notes: [{ id: "n1", ts: 1, text: "tungt" }], checkins: [{ id: "c1", ts: 1, level: "low" }] });
    const box = readBridge();
    expect(box.notes.length).toBe(1);
    expect(box.checkins.length).toBe(1);
  });

  it("äldre brevlåda utan de nya fälten kraschar inte", () => {
    localStorage.clear();
    localStorage.setItem("atlas.bridge.v1", JSON.stringify({ v: 1, ts: 1, sessions: [], food: [] }));
    const box = readBridge();
    expect(box.weights).toEqual([]);
    expect(box.checkins).toEqual([]);
  });
});
