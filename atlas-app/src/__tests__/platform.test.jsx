// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MobileApp } from "../mobile/MobileApp.jsx";
import { capabilities, capabilitySummary, installAdvice, isStandalone, platformKind } from "../engines/platform.js";

const roots = [];
const mount = async () => { const el = document.createElement("div"); document.body.appendChild(el); const r = createRoot(el); roots.push({ r, el }); await act(async () => { r.render(<MobileApp />); }); await new Promise(x => setTimeout(x, 200)); return el; };
afterEach(async () => { await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) { } el.remove(); }); }); });
const clickText = (el, t) => { const b = [...el.querySelectorAll("button")].find(x => x.textContent.includes(t)); if (b) b.dispatchEvent(new MouseEvent("click", { bubbles: true })); return !!b; };

describe("plattformsdetektering", () => {
  it("varje kapabilitet har etikett, status och förklaring", () => {
    capabilities().forEach(c => {
      expect(c.label).toBeTruthy();
      expect(typeof c.ok).toBe("boolean");
      expect(c.note.length).toBeGreaterThan(10);
    });
  });
  it("summeringen räknar bara det som faktiskt finns", () => {
    const { caps, ok, total } = capabilitySummary();
    expect(total).toBe(caps.length);
    expect(ok).toBe(caps.filter(c => c.ok).length);
  });
  it("iPhone-råd förklarar risken att data rensas, inte bara 'installera'", () => {
    const ua = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", { value: "iPhone Safari", configurable: true });
    const adv = installAdvice();
    expect(adv.kind).toBe("ios");
    expect(adv.needed).toBe(true);
    expect(/rensa/.test(adv.why)).toBe(true);
    expect(adv.steps.length).toBeGreaterThan(2);
    Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });
  });
  it("redan installerad → inget råd alls", () => {
    const mm = window.matchMedia;
    window.matchMedia = q => ({ matches: /standalone/.test(q), media: q, addListener() { }, removeListener() { } });
    expect(isStandalone()).toBe(true);
    expect(installAdvice().needed).toBe(false);
    window.matchMedia = mm;
  });
  it("desktop får inget installationsråd", () => {
    expect(platformKind()).toBe("desktop");
    expect(installAdvice().needed).toBe(false);
  });
});

describe("installationskortet i mobilen", () => {
  it("visas på iPhone och kan avfärdas permanent", async () => {
    window.localStorage.clear(); localStorage.setItem("atlas.mobile.mode", JSON.stringify("demo"));
    const ua = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", { value: "iPhone Safari", configurable: true });
    let el = await mount();
    expect(/Lägg ATLAS på hemskärmen/.test(el.textContent)).toBe(true);
    await act(async () => { clickText(el, "Visa hur"); }); await new Promise(r => setTimeout(r, 120));
    expect(/Lägg till på hemskärmen/.test(el.textContent)).toBe(true);
    const x = [...el.querySelectorAll("button")].find(b => b.getAttribute("aria-label") === "Stäng");
    await act(async () => { x.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); await new Promise(r => setTimeout(r, 150));
    expect(/Lägg ATLAS på hemskärmen/.test(el.textContent)).toBe(false);
    expect(JSON.parse(localStorage.getItem("atlas.mobile.installHidden"))).toBe(true);
    Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });
  });
});
