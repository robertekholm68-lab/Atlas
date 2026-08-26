// @vitest-environment jsdom
// Askr 2.0 — talfälten i "Om dig".
//
// Robert: "det blir konstiga värden när jag försöker lägga in längd och vikt."
// Fälten klampade mot min/max på VARJE tangenttryckning, och ett tal skrivs en
// siffra i taget: "1" av 180 är under minimum 120 och blev 120, varpå nästa
// siffra gav "1208" som klampades till 230. Man kunde alltså inte skriva sin
// egen längd. Ålder hade samma fel: "42" blev 100, eftersom "4" först blev 13.
// Reproducerat mot bygget: 180 → 230, 42 → 100.
//
// Fältet äger nu sin text medan man skriver och klampar när det lämnas.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { ProfileSheet, klampa } from "../atlas2/ProfileSheet.jsx";

describe("klampa", () => {
  it("håller talet innanför gränserna", () => {
    expect(klampa(180, 120, 230)).toBe(180);
    expect(klampa(500, 120, 230)).toBe(230);
    expect(klampa(4, 13, 100)).toBe(13);
  });

  it("tomt är null, inte noll — 0 cm lång är ett sämre svar än inget svar", () => {
    expect(klampa("", 120, 230)).toBe(null);
    expect(klampa(null, 120, 230)).toBe(null);
    expect(klampa(undefined, 120, 230)).toBe(null);
  });

  it("skräp blir null, inte NaN", () => {
    expect(klampa("abc", 120, 230)).toBe(null);
  });
});

describe("talfälten går att skriva i", () => {
  let host, root;
  beforeEach(() => { host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host); });
  afterEach(() => { act(() => root.unmount()); host.remove(); });

  const rendera = (profil = {}) => {
    let sparad = null;
    act(() => root.render(createElement(ProfileSheet, {
      profile: profil, weights: [], onClose: () => {},
      setProfile: f => { sparad = typeof f === "function" ? f(profil) : f; },
    })));
    return () => sparad;
  };

  const satt = (el, v) => act(() => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });

  /** Skriver ett tecken i taget, som en människa. */
  const skriv = (el, txt) => {
    if (txt === "") return satt(el, "");
    let sa = "";
    for (const t of txt) { sa += t; satt(el, sa); }
  };

  // React lyssnar på focusout, inte blur — blur bubblar inte och når aldrig
  // delegeringen på roten.
  const lamna = el => act(() => el.dispatchEvent(new FocusEvent("focusout", { bubbles: true })));

  it("längd: 180 blir 180, inte 230", () => {
    rendera();
    const fält = host.querySelectorAll('input[type="number"]');
    const längd = fält[1];
    skriv(längd, "180");
    // Under skrivandet får fältet stå på ofärdiga tal — det är hela poängen.
    expect(längd.value).toBe("180");
  });

  it("ålder: 42 blir 42, inte 100", () => {
    rendera();
    const ålder = host.querySelectorAll('input[type="number"]')[0];
    skriv(ålder, "42");
    expect(ålder.value).toBe("42");
  });

  it("mellansteg klampas inte — '1' får stå kvar som 1", () => {
    rendera();
    const längd = host.querySelectorAll('input[type="number"]')[1];
    skriv(längd, "1");
    expect(längd.value).toBe("1");
  });

  it("gränsen slår till när fältet lämnas", () => {
    rendera();
    const längd = host.querySelectorAll('input[type="number"]')[1];
    skriv(längd, "500");
    lamna(längd);
    expect(längd.value).toBe("230");
  });

  it("tomt fält förblir tomt efter blur, inte noll", () => {
    rendera({ height: 180 });
    const längd = host.querySelectorAll('input[type="number"]')[1];
    skriv(längd, "");
    lamna(längd);
    expect(längd.value).toBe("");
  });

  it("Spara klampar även utan blur", () => {
    // Den som skriver 500 och trycker Spara direkt ska inte få 500 cm i
    // profilen bara för att fältet aldrig tappade fokus.
    const hämta = rendera();
    const längd = host.querySelectorAll('input[type="number"]')[1];
    skriv(längd, "500");
    const spara = [...host.querySelectorAll("button")].find(b => (b.textContent || "").trim() === "Spara");
    expect(spara, "hittade ingen Spara-knapp").toBeTruthy();
    act(() => spara.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(hämta().height).toBe(230);
  });

  it("ett giltigt tal sparas som skrivet", () => {
    const hämta = rendera();
    const fält = host.querySelectorAll('input[type="number"]');
    skriv(fält[0], "42");
    skriv(fält[1], "180");
    const spara = [...host.querySelectorAll("button")].find(b => (b.textContent || "").trim() === "Spara");
    act(() => spara.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(hämta().age).toBe(42);
    expect(hämta().height).toBe(180);
  });
});
