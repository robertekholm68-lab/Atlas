// @vitest-environment jsdom
// Täcker det som motortesterna missade: ren förstastart, att data faktiskt lagras,
// att pågående pass överlever omladdning, och att överföringen bär med sig allt.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MobileApp } from "../mobile/MobileApp.jsx";
import { readBridge } from "../engines/bridge.js";

const öppnaMeny = async (el) => {
  const b = el.querySelector('[aria-label="Meny"]');
  if (!b) throw new Error("hittar inte menyknappen");
  await act(async () => { b.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
  await new Promise(x => setTimeout(x, 60));
};

const roots = [];

// Real Mode startar utan program sedan demo-läckaget stängdes (2026-07-21).
// Testerna måste därför välja ett program innan ett pass kan startas — samma
// väg en riktig användare går.
const väljProgram = async (el) => {
  await click(el, "Välj program");
  const knappar = [...el.querySelectorAll("button")];
  const mall = knappar.find(b => /Full Body/.test(b.textContent));
  if (!mall) throw new Error("hittade ingen programmall");
  await act(async () => { mall.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
  await new Promise(x => setTimeout(x, 80));
  await click(el, "Tillbaka till hem");
};

const mount = async () => {
  const el = document.createElement("div"); document.body.appendChild(el);
  const r = createRoot(el); roots.push({ r, el });
  await act(async () => { r.render(<MobileApp />); });
  await new Promise(x => setTimeout(x, 120));
  return el;
};
const unmountAll = async () => { await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) { } el.remove(); }); }); };
const btn = (el, text) => [...el.querySelectorAll("button")].find(b => b.textContent.includes(text));
const click = async (el, text) => { const b = btn(el, text); if (!b) throw new Error(`hittade ingen knapp: ${text}`); await act(async () => { b.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); await new Promise(x => setTimeout(x, 60)); };
const LS = k => JSON.parse(localStorage.getItem(`atlas.mobile.${k}`) || "null");

beforeEach(() => { localStorage.clear(); });
afterEach(unmountAll);

describe("mobilen — första start", () => {
  it("ny användare möter ett val, inte någon annans exempeldata", async () => {
    const el = await mount();
    // Startsidan först (2026-07-21). Lägesvalet ligger bakom Kom igång — men det
    // MÅSTE finnas där, och exempeldata får inte möta en oinvigd.
    await click(el, "Kom igång");
    expect(/Riktig profil/.test(el.textContent)).toBe(true);
    expect(/Demo/.test(el.textContent)).toBe(true);
    expect(/Hej, Robert/.test(el.textContent)).toBe(false);
  });

  it("riktig profil startar tom — inga påhittade pass", async () => {
    const el = await mount();
    await click(el, "Kom igång");        // startsidan (2026-07-21)
    await click(el, "Riktig profil");
    await click(el, "Kom igång");        // "om dig"-steget
    expect(LS("mode")).toBe("real");
    expect(LS("sessions")).toEqual([]);
  });

  it("namnet i menyn kommer från profilen, inte från koden", async () => {
    // Hälsningen på startsidan togs bort i designspråket 2026-07-20; namnet visas
    // överst i menyn i stället. Avsikten är oförändrad: profilens namn, aldrig kodens.
    localStorage.setItem("atlas.mobile.mode", JSON.stringify("real"));
    localStorage.setItem("atlas.mobile.profile", JSON.stringify({ name: "Sara", weight: 64 }));
    const el = await mount();
    await öppnaMeny(el);
    expect(/Sara/.test(el.textContent)).toBe(true);
    expect(/Robert/.test(el.textContent)).toBe(false);
  });

  it("demoläget säger tydligt att siffrorna inte är dina", async () => {
    const el = await mount();
    await click(el, "Kom igång");   // startsidan (2026-07-21)
    expect(/Inget av det är dina siffror/.test(el.textContent)).toBe(true);
  });

  it("valt läge frågas inte igen vid nästa start", async () => {
    localStorage.setItem("atlas.mobile.mode", JSON.stringify("demo"));
    const el = await mount();
    expect(/Välj hur du vill börja/.test(el.textContent)).toBe(false);
  });
});

describe("mobilen — data som sägs sparas ska sparas", () => {
  beforeEach(() => { localStorage.setItem("atlas.mobile.mode", JSON.stringify("demo")); });

  it("vikt lagras på riktigt, inte bara ett kvitto på skärmen", async () => {
    const el = await mount();
    await click(el, "Vikt");
    const input = el.querySelector('input[inputMode="decimal"]');
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(input, "81,2");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click(el, "Spara");
    const w = LS("weights");
    expect(w.length).toBe(1);
    expect(w[0].kg).toBe(81.2);           // komma tolkas som decimaltecken
  });

  it("orimlig vikt avvisas i stället för att lagras", async () => {
    const el = await mount();
    await click(el, "Vikt");
    const input = el.querySelector('input[inputMode="decimal"]');
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(input, "820"); input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click(el, "Spara");
    expect(LS("weights") || []).toEqual([]);   // inget lagrat
    expect(/mellan 25 och 300/.test(el.textContent)).toBe(true);
  });

  it("pågående pass överlever att appen stängs och öppnas igen", async () => {
    const el = await mount();
    await väljProgram(el);
    await click(el, "Starta");
    expect(LS("live")).toBeTruthy();
    const namn = LS("live").name;
    await unmountAll();
    const el2 = await mount();                       // som en omladdning
    expect(LS("live").name).toBe(namn);
    expect(el2.textContent.includes(namn)).toBe(true);
  });
});

describe("mobilen — överföringen bär med sig allt", () => {
  it("brevlådan innehåller vikt, anteckningar och check-ins, inte bara pass", async () => {
    localStorage.setItem("atlas.mobile.mode", JSON.stringify("demo"));
    localStorage.setItem("atlas.mobile.weights", JSON.stringify([{ id: "w1", ts: 1, kg: 80 }]));
    localStorage.setItem("atlas.mobile.notes", JSON.stringify([{ id: "n1", ts: 1, text: "tungt" }]));
    localStorage.setItem("atlas.mobile.checkins", JSON.stringify([{ id: "c1", ts: 1, level: "low" }]));
    await mount();
    const box = readBridge();
    expect(box.weights.length).toBe(1);
    expect(box.notes.length).toBe(1);
    expect(box.checkins.length).toBe(1);
  });
});

describe("mobilen — Progress", () => {
  it("knappen öppnar något i stället för att vara död", async () => {
    localStorage.setItem("atlas.mobile.mode", JSON.stringify("demo"));
    const el = await mount();
    await click(el, "Progress");
    expect(/Framsteg/.test(el.textContent)).toBe(true);
  });

  it("utan pass visas ett ärligt tomläge, inte nollor som ser ut som data", async () => {
    localStorage.setItem("atlas.mobile.mode", JSON.stringify("real"));
    localStorage.setItem("atlas.mobile.sessions", JSON.stringify([]));
    const el = await mount();
    await click(el, "Progress");
    expect(/Inga avslutade pass ännu/.test(el.textContent)).toBe(true);
  });
});

describe("mobilen — det ska gå att lämna ett pass", () => {
  beforeEach(() => { localStorage.setItem("atlas.mobile.mode", JSON.stringify("demo")); });

  it("utan loggade set tar tillbaka-knappen dig direkt hem", async () => {
    const el = await mount();
    await väljProgram(el);
    await click(el, "Starta");
    expect(/Aktivt pass/.test(el.textContent)).toBe(true);
    const back = el.querySelector('[aria-label="Tillbaka"]');
    expect(back).toBeTruthy();                       // knappen ska överhuvudtaget finnas
    await act(async () => { back.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    await new Promise(x => setTimeout(x, 60));
    expect(/Aktivt pass/.test(el.textContent)).toBe(false);
    expect(LS("live")).toBe(null);                   // inget att spara → kastas
  });

  it("med loggade set frågar den i stället för att kasta tyst", async () => {
    const el = await mount();
    await väljProgram(el);
    await click(el, "Starta");
    const ring = [...el.querySelectorAll("button")].find(b => b.textContent.trim() === "○");
    await act(async () => { ring.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    const back = el.querySelector('[aria-label="Tillbaka"]');
    await act(async () => { back.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    await new Promise(x => setTimeout(x, 60));
    expect(/Lämna passet\?/.test(el.textContent)).toBe(true);
    expect(/Pausa och gå till startsidan/.test(el.textContent)).toBe(true);
    expect(/Kasta passet/.test(el.textContent)).toBe(true);
  });

  it("pausat pass ligger kvar på startsidan och går att återuppta", async () => {
    const el = await mount();
    await väljProgram(el);
    await click(el, "Starta");
    const ring = [...el.querySelectorAll("button")].find(b => b.textContent.trim() === "○");
    await act(async () => { ring.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    const back = el.querySelector('[aria-label="Tillbaka"]');
    await act(async () => { back.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    await click(el, "Pausa och gå till startsidan");
    expect(/Pausat pass/.test(el.textContent)).toBe(true);
    expect(LS("live")).toBeTruthy();                 // kvar i lagringen
    await click(el, "Fortsätt passet");
    expect(/Aktivt pass/.test(el.textContent)).toBe(true);
  });

  it("'Träna' återupptar det pausade passet i stället för att skriva över det", async () => {
    const el = await mount();
    await väljProgram(el);
    await click(el, "Starta");
    const startedAt = LS("live").startedAt;
    const back = el.querySelector('[aria-label="Tillbaka"]');
    await act(async () => { back.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    await new Promise(x => setTimeout(x, 60));
    // inget loggat → passet kastades; starta ett nytt och pausa det med ett loggat set
    await click(el, "Starta");
    const ring = [...el.querySelectorAll("button")].find(b => b.textContent.trim() === "○");
    await act(async () => { ring.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    const back2 = el.querySelector('[aria-label="Tillbaka"]');
    await act(async () => { back2.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    await click(el, "Pausa och gå till startsidan");
    const paused = LS("live").startedAt;
    await click(el, "Träna");
    expect(LS("live").startedAt).toBe(paused);       // samma pass, inte ett nytt
  });
});
