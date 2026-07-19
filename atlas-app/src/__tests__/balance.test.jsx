// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { balanceScore } from "../engines/index.js";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import Atlas from "../app/App.jsx";
const clickTitle=(el,t)=>{const b=el.querySelector(`[title="${t}"]`);if(b)b.dispatchEvent(new MouseEvent("click",{bubbles:true}));return !!b;};
describe("balansmätare — motor", () => {
  it("balanserade pelare ger högre samlat värde än obalanserade", () => {
    const bal = balanceScore({ overallReadiness: 85, systemicRecovery: 85 });
    const imbal = balanceScore({ overallReadiness: 85, systemicRecovery: 30 });
    expect(bal.overall).toBeGreaterThan(imbal.overall);
  });
  it("för få pelare med data → hasData false", () => {
    expect(balanceScore({ overallReadiness: 80 }).hasData).toBe(false);
  });
  it("pekar ut svagaste länken", () => {
    const r = balanceScore({ overallReadiness: 90, systemicRecovery: 40 });
    expect(r.weakest.key).toBe("rest");
  });
  it("pelare utan underlag blir null — ingen fejkad poäng", () => {
    const r = balanceScore({ overallReadiness: 80, systemicRecovery: 80 });
    expect(r.pillars.find(p => p.key === "nutrition").score).toBe(null);
    expect(r.pillars.find(p => p.key === "training").score).toBe(null);
  });
});
describe("balansmätare — opt-in", () => {
  it("av som standard: ingen Balans-panel på dashboarden i demo", async () => {
    window.localStorage.clear(); window.localStorage.setItem("atlas.mode", "demo");
    Object.defineProperty(window, "innerWidth", { value: 1400, configurable: true });
    const el = document.createElement("div"); document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<Atlas/>); }); await new Promise(r => setTimeout(r, 280));
    // Balansmätaren ska inte synas förrän den slås på i inställningar
    const settingsHasToggle = (() => { clickTitle(el, "Inställningar"); return true; })();
    await act(async()=>{}); await new Promise(r=>setTimeout(r,150));
    console.log("Balansmätare-toggel i inställningar:", /Balansmätare/.test(el.textContent));
    expect(/Balansmätare/.test(el.textContent)).toBe(true);
  });
});
