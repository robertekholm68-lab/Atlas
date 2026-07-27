// @vitest-environment jsdom
// Askr 2.0 — streckkodsläsaren.
//
// Motorn fanns; vyn saknades. Det som testas här är inte kameran — den går
// inte att köra i jsdom — utan de två löften som är lätta att tappa när någon
// senare städar i filen:
//
//   1. KÄLLAN SYNS. Open Food Facts är folkbidragen och overifierad. Posten
//      märks `external` och vyn säger varifrån siffrorna kommer. Att låta dem
//      se ut som Livsmedelsverkets vore att låna trovärdighet.
//
//   2. VÄGEN UTAN KAMERA. BarcodeDetector saknas i Safari på iPhone. Fältet för
//      manuell inmatning ska alltid finnas — inte gömmas bakom ett fel.

import { describe, it, expect, afterEach, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { Streckkod } from "../atlas2/Streckkod.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const PRODUKT = {
  code: "7310865004703", source: "off", ver: "unverified",
  name: "Havredryck", brand: "Oatly", serving: "2 dl",
  kcal: 59, protein: 1, carbs: 6.6, fat: 3,
};

describe("streckkodsläsaren", () => {
  const roots = [];
  afterEach(async () => {
    await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) {} el.remove(); }); });
    vi.restoreAllMocks();
  });
  const rendera = async (props = {}) => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const r = createRoot(el); roots.push({ r, el });
    await act(async () => { r.render(createElement(Streckkod, { onLägg: () => {}, onStäng: () => {}, ...props })); });
    return el;
  };
  const knapp = (el, t) => [...el.querySelectorAll("button")].find(b => (b.textContent || "").toLowerCase().includes(t.toLowerCase()));
  const skrivKod = async (el, kod) => {
    const f = el.querySelector('input[aria-label="Streckkod"]');
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(f, kod);
      f.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };

  it("manuell inmatning finns ALLTID — iPhone saknar kameraläsning", async () => {
    const el = await rendera();
    expect(el.querySelector('input[aria-label="Streckkod"]')).not.toBe(null);
    expect(el.textContent).toMatch(/skriv in koden/i);
  });

  it("bara siffror tas emot i kodfältet", async () => {
    const el = await rendera();
    await skrivKod(el, "73a1b0");
    expect(el.querySelector('input[aria-label="Streckkod"]').value).toBe("7310");
  });

  it("en träff visar KÄLLAN först, inte som finstil", async () => {
    global.fetch = vi.fn(async () => ({
      json: async () => ({ status: 1, product: {
        product_name_sv: "Havredryck", brands: "Oatly",
        nutriments: { "energy-kcal_100g": 59, proteins_100g: 1, carbohydrates_100g: 6.6, fat_100g: 3 },
      }}),
    }));
    const el = await rendera();
    await skrivKod(el, "7310865004703");
    await act(async () => { knapp(el, "Slå upp").click(); await new Promise(r => setTimeout(r, 20)); });

    expect(el.textContent).toMatch(/open food facts/i);
    expect(el.textContent).toMatch(/overifierad/i);
    expect(el.textContent).toMatch(/inte kontrollerade av Askr/i);
    expect(el.textContent).toContain("Havredryck");
  });

  it("loggposten märks som extern, inte som registerdata", async () => {
    global.fetch = vi.fn(async () => ({
      json: async () => ({ status: 1, product: {
        product_name_sv: "Havredryck", brands: "Oatly",
        nutriments: { "energy-kcal_100g": 59, proteins_100g: 1, carbohydrates_100g: 6.6, fat_100g: 3 },
      }}),
    }));
    let loggad = null;
    const el = await rendera({ onLägg: p => { loggad = p; } });
    await skrivKod(el, "7310865004703");
    await act(async () => { knapp(el, "Slå upp").click(); await new Promise(r => setTimeout(r, 20)); });
    await act(async () => { knapp(el, "Logga").click(); });

    expect(loggad.quality).toBe("external");
    expect(loggad.source).toBe("off");
    expect(loggad.barcode).toBe("7310865004703");
    expect(loggad.grams).toBe(100);
    expect(loggad.kcal).toBe(59);
    expect(loggad.id).toMatch(/^f_/);            // samma id-stämpling som övriga poster
  });

  it("mängden skalar näringen", async () => {
    global.fetch = vi.fn(async () => ({
      json: async () => ({ status: 1, product: {
        product_name_sv: "Havredryck", nutriments: { "energy-kcal_100g": 59, proteins_100g: 1, carbohydrates_100g: 6.6, fat_100g: 3 },
      }}),
    }));
    let loggad = null;
    const el = await rendera({ onLägg: p => { loggad = p; } });
    await skrivKod(el, "7310865004703");
    await act(async () => { knapp(el, "Slå upp").click(); await new Promise(r => setTimeout(r, 20)); });
    await act(async () => { for (let i = 0; i < 10; i++) el.querySelector('[aria-label="Öka mängd"]').click(); });
    await act(async () => { knapp(el, "Logga").click(); });
    expect(loggad.grams).toBe(200);
    expect(loggad.kcal).toBe(118);
  });

  it("okänd produkt erkänns i stället för att gissa", async () => {
    global.fetch = vi.fn(async () => ({ json: async () => ({ status: 0 }) }));
    const el = await rendera();
    await skrivKod(el, "1234567890123");
    await act(async () => { knapp(el, "Slå upp").click(); await new Promise(r => setTimeout(r, 20)); });
    expect(el.textContent).toMatch(/finns inte i Open Food Facts/i);
    expect(el.textContent).toMatch(/folkbidragen/i);
  });

  it("nätverksfel behandlas som okänd produkt, inte som krasch", async () => {
    global.fetch = vi.fn(async () => { throw new Error("offline"); });
    const el = await rendera();
    await skrivKod(el, "1234567890123");
    await act(async () => { knapp(el, "Slå upp").click(); await new Promise(r => setTimeout(r, 20)); });
    expect(el.textContent).toMatch(/finns inte i Open Food Facts/i);
  });
});
