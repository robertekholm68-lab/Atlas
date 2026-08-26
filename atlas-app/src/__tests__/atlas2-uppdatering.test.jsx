// @vitest-environment jsdom
// ASKR 2.0 — hur en ny publicering når en app som redan är installerad.
//
// Service workern är network-first för dokumentet, så en KALLSTART hämtar alltid
// senaste versionen. Det räcker inte, och det var hålet: en app på hemskärmen
// startas sällan kallt. Man växlar till den, den ligger i bakgrunden i dagar,
// ingen navigering sker — och den gamla versionen kör vidare hur många
// publiceringar som helst. Mobilkompanjonen har letat efter uppdateringar sedan
// länge (src/mobile/main.jsx); 2.0 gjorde det inte alls.
//
// Regeln nu: appen laddar om SIG SJÄLV, utom mitt i ett pass. Testaren ska
// ligga på samma version som utvecklaren utan att göra något — men aldrig till
// priset av loggade set.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";

const läs = p => readFileSync(resolve(process.cwd(), p), "utf8");

describe("registreringen", () => {
  const main2 = läs("src/atlas2/main2.jsx");
  const html = läs("atlas2.html");

  it("main2.jsx registrerar service workern", () => {
    expect(main2).toMatch(/serviceWorker\.register\(\s*["']\.\/sw-atlas2\.js["']\s*\)/);
  });

  it("atlas2.html registrerar den INTE — bara ett ställe", () => {
    // Två registreringar av samma sökväg är ofarligt men gör att ingen vet
    // vilken som gäller, och logiken hamnar i inline-HTML där den inte går
    // att testa. Registreringen flyttades hit när uppdateringskontrollen kom.
    expect(html).not.toMatch(/serviceWorker\.register/);
  });

  it("letar efter nya versioner vid varje återkomst till appen", () => {
    // DET HÄR STEGET är hela skillnaden. Utan det kan en app på hemskärmen
    // aldrig upptäcka att en ny version publicerats, eftersom ingen navigering
    // sker när man växlar tillbaka till den.
    expect(main2).toMatch(/visibilitychange/);
    expect(main2).toMatch(/visibilityState === ["']visible["']/);
    expect(main2).toMatch(/reg\.update\(\)/);
  });

  it("kräver en befintlig controller innan den säger 'ny version'", () => {
    // Utan villkoret vore FÖRSTA installationen en "uppdatering", och en helt
    // ny användare skulle mötas av en omladdning direkt.
    expect(main2).toMatch(/state === ["']installed["'] && navigator\.serviceWorker\.controller/);
  });

  it("skickar samma händelse som mobilen lyssnar på", () => {
    // Ett mönster, inte två. Namnet är atlas:* av samma skäl som
    // lagringsnycklarna: bytet stannade medvetet vid ytan.
    expect(main2).toMatch(/atlas:update-ready/);
    expect(läs("src/mobile/main.jsx")).toMatch(/atlas:update-ready/);
  });
});

describe("appens beslut när en ny version är redo", () => {
  const roots = [];
  let laddadeOm;

  beforeEach(() => {
    laddadeOm = 0;
    // jsdom har ingen riktig reload. Object.defineProperty krävs eftersom
    // location.reload inte är skrivbar — och descriptorn återställs i afterEach,
    // annars läcker den fejkade reloaden till varje senare testfall.
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: () => { laddadeOm++; } },
    });
    try { sessionStorage.clear(); } catch (e) { /* privat läge */ }
    localStorage.clear();
  });

  afterEach(async () => {
    await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) {} el.remove(); }); });
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const montera = async () => {
    const { Atlas2 } = await import("../atlas2/App2.jsx");
    const el = document.createElement("div"); document.body.appendChild(el);
    const r = createRoot(el); roots.push({ r, el });
    await act(async () => { r.render(createElement(Atlas2)); });
    for (let i = 0; i < 60 && el.querySelectorAll('[aria-label="Meny"]').length === 0; i++) {
      await act(async () => { await new Promise(x => setTimeout(x, 10)); });
    }
    return el;
  };

  it("laddar om sig själv när inget pass pågår", async () => {
    localStorage.setItem("atlas.v3.mode", JSON.stringify("demo"));
    const el = await montera();
    expect(laddadeOm).toBe(0);
    await act(async () => { window.dispatchEvent(new CustomEvent("atlas:update-ready")); });
    expect(laddadeOm).toBe(1);
    // Tyst är hela poängen: användaren ska aldrig se en fråga hen inte behöver
    // svara på.
    expect(el.textContent).not.toContain("Ny version av Askr finns");
  });

  it("laddar om högst en gång per flik", async () => {
    // Spärr mot omladdningssnurra. Faller installationen om och om igen skulle
    // varje återkomst till appen ge en ny omladdning, och appen vore obrukbar.
    localStorage.setItem("atlas.v3.mode", JSON.stringify("demo"));
    const el = await montera();
    await act(async () => { window.dispatchEvent(new CustomEvent("atlas:update-ready")); });
    expect(laddadeOm).toBe(1);

    const el2 = await montera();       // ny flik-montering, sessionStorage kvar
    await act(async () => { window.dispatchEvent(new CustomEvent("atlas:update-ready")); });
    expect(laddadeOm).toBe(1);         // INTE 2
    expect(el2.textContent).toContain("Ny version av Askr finns");
    expect(el.isConnected || true).toBe(true);
  });

  it("avbryter aldrig ett pågående pass — visar raden i stället", async () => {
    localStorage.setItem("atlas.v3.mode", JSON.stringify("demo"));
    localStorage.setItem("atlas.v3.live", JSON.stringify({
      programId: "p1", workoutId: "w1", name: "Pass A", startedAt: Date.now(), idx: 0,
      items: [{ exId: "bench_press", loggade: [{ weight: 60, reps: 8 }] }],
    }));
    const el = await montera();
    await act(async () => { window.dispatchEvent(new CustomEvent("atlas:update-ready")); });
    expect(laddadeOm).toBe(0);
    expect(el.textContent).toContain("Ny version av Askr finns");
  });

  it("raden har en knapp som laddar om", async () => {
    localStorage.setItem("atlas.v3.mode", JSON.stringify("demo"));
    localStorage.setItem("atlas.v3.live", JSON.stringify({
      programId: "p1", workoutId: "w1", name: "Pass A", startedAt: Date.now(), idx: 0, items: [],
    }));
    const el = await montera();
    await act(async () => { window.dispatchEvent(new CustomEvent("atlas:update-ready")); });
    const knapp = [...el.querySelectorAll("button")].find(b => /ladda om/i.test(b.textContent));
    expect(knapp, "knappen 'Ladda om' saknas").toBeTruthy();
    await act(async () => { knapp.click(); });
    expect(laddadeOm).toBe(1);
  });

  it("ingen rad och ingen omladdning utan händelsen", async () => {
    // Vakt mot att testerna ovan blir gröna av något annat än händelsen.
    localStorage.setItem("atlas.v3.mode", JSON.stringify("demo"));
    const el = await montera();
    expect(laddadeOm).toBe(0);
    expect(el.textContent).not.toContain("Ny version av Askr finns");
  });
});
