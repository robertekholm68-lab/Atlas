// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MobileApp } from "../mobile/MobileApp.jsx";
const clickText = (el, t) => { const b = [...el.querySelectorAll("button")].find(x => x.textContent.includes(t)); if (b) b.dispatchEvent(new MouseEvent("click", { bubbles: true })); return !!b; };

describe("mobil — GPS-utepass", () => {
  it("knappen finns och sheeten öppnas med aktivitetsval", async () => {
    window.localStorage.clear(); localStorage.setItem("atlas.mobile.mode", JSON.stringify("demo"));
    const el = document.createElement("div"); document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<MobileApp />); }); await new Promise(r => setTimeout(r, 200));
    const opened = clickText(el, "Utepass");
    await act(async () => { }); await new Promise(r => setTimeout(r, 150));
    expect(opened).toBe(true);
    expect(/Utepass med GPS/.test(el.textContent)).toBe(true);
    expect(/Löpning/.test(el.textContent)).toBe(true);
  });

  it("är ärlig om vad stegräkningen är — ingen låtsas-dagsräknare", async () => {
    window.localStorage.clear(); localStorage.setItem("atlas.mobile.mode", JSON.stringify("demo"));
    const el = document.createElement("div"); document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<MobileApp />); }); await new Promise(r => setTimeout(r, 200));
    clickText(el, "Utepass"); await act(async () => { }); await new Promise(r => setTimeout(r, 150));
    expect(/kan inte läsa telefonens dagliga stegräknare/.test(el.textContent)).toBe(true);
  });

  it("utan GPS i miljön sägs det rakt ut i stället för att fejka ett pass", async () => {
    window.localStorage.clear(); localStorage.setItem("atlas.mobile.mode", JSON.stringify("demo"));
    const el = document.createElement("div"); document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<MobileApp />); }); await new Promise(r => setTimeout(r, 200));
    clickText(el, "Utepass"); await act(async () => { }); await new Promise(r => setTimeout(r, 150));
    await act(async () => { clickText(el, "Starta passet"); }); await new Promise(r => setTimeout(r, 200));
    // jsdom saknar navigator.geolocation → tydligt besked, inga påhittade siffror
    expect(/kräver att appen körs över HTTPS|Ingen åtkomst till platsinformation/.test(el.textContent)).toBe(true);
  });
});
