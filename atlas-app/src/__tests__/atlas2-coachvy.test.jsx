// @vitest-environment jsdom
// Askr 2.0 — coachvyns hopfällbara delar.
//
// Fynd från riktig användning: chatten gick att fälla ut men inte in igen.
// Knappen BYTTES UT mot chatten, så vägen tillbaka fanns helt enkelt inte.
//
// Det värsta var att skälfliken bredvid gjorde rätt hela tiden — två olika sätt
// att fälla ut saker i samma vy, varav det ena var trasigt. Testerna nedan
// prövar därför båda med samma krav, så att de inte kan glida isär igen.

import { describe, it, expect, afterEach } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { resolve } from "path";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { CoachView } from "../atlas2/CoachView.jsx";
import { buildSession } from "../engines/session.js";
import { EXERCISES } from "../data/exercises.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const DAG = 864e5;
const ÖVN = (EXERCISES.find(e => e.loadMode === "external") || {}).id;
const pass = d => buildSession({
  title: "Pass", source: "training", completedAt: Date.now() - d * DAG,
  sets: [{ exerciseId: ÖVN, weight: 80, reps: 8 }],
});

describe("coachvyn går att fälla in igen", () => {
  const roots = [];
  afterEach(async () => {
    await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) {} el.remove(); }); });
  });
  const rendera = async () => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const r = createRoot(el); roots.push({ r, el });
    await act(async () => {
      r.render(createElement(CoachView, { sessions: [pass(1), pass(3), pass(5)], weights: [], foodLog: [] }));
    });
    return el;
  };
  const knapp = (el, t) => [...el.querySelectorAll("button")].find(b => (b.textContent || "").toLowerCase().includes(t.toLowerCase()));

  it("chattrubriken finns kvar när chatten är utfälld", async () => {
    const el = await rendera();
    const rubrik = knapp(el, "Fråga coachen");
    expect(rubrik.getAttribute("aria-expanded")).toBe("false");

    await act(async () => { rubrik.click(); });
    // Rubriken MÅSTE finnas kvar — förut byttes den ut mot chatten, och då
    // fanns ingen väg tillbaka.
    const efter = knapp(el, "Fråga coachen");
    expect(efter, "rubriken försvann när chatten öppnades").toBeTruthy();
    expect(efter.getAttribute("aria-expanded")).toBe("true");

    await act(async () => { efter.click(); });
    expect(knapp(el, "Fråga coachen").getAttribute("aria-expanded")).toBe("false");
  });

  it("skälfliken beter sig likadant", async () => {
    const el = await rendera();
    const r = knapp(el, "Varför denna rekommendation");
    if (!r) return;                                  // saknas utan skäl att visa
    expect(r.getAttribute("aria-expanded")).toBe("false");
    await act(async () => { r.click(); });
    expect(knapp(el, "Varför denna rekommendation").getAttribute("aria-expanded")).toBe("true");
    await act(async () => { knapp(el, "Varför denna rekommendation").click(); });
    expect(knapp(el, "Varför denna rekommendation").getAttribute("aria-expanded")).toBe("false");
  });

  it("allt hopfällbart i vyn redovisar sitt läge för skärmläsare", async () => {
    // Ett hopfällbart avsnitt utan aria-expanded är osynligt för den som inte
    // ser pilen vända.
    const el = await rendera();
    const fällbara = [...el.querySelectorAll("button")]
      .filter(b => /fråga coachen|varför denna/i.test(b.textContent || ""));
    expect(fällbara.length).toBeGreaterThan(0);
    fällbara.forEach(b => expect(b.getAttribute("aria-expanded"), b.textContent.slice(0, 30)).not.toBe(null));
  });
});

describe("regeln gäller HELA 2.0, inte bara coachvyn", () => {
  // Buggen ovan uppstod inte för att någon glömde ett fall, utan för att det
  // fanns två mönster för samma sak i samma vy. Ett test som bara prövar
  // CoachView låter alltså exakt samma glidning uppstå i nästa vy.
  //
  // Kontrollen är statisk med flit: den ser knappar som ingen testfixtur råkar
  // rendera. Vid skrivandet fångade den tre — "Ändra kost" och "Inköpslista" i
  // MealPrepView, "Ton:" i RescueView. Ingen av dem var trasig, men alla tre
  // var stumma för en skärmläsare.
  const KATALOG = resolve("src/atlas2");

  /**
   * Öppningstaggarna för `<button …>` i en JSX-källa.
   *
   * Kan INTE göras med `<button[^>]*>`: en pilfunktion innehåller `=>`, så den
   * varianten stannar på första bästa `>` och matchar i praktiken ingenting.
   * Den regexen såg ut att fungera — den var grön av tomhet, vilket är sämre än
   * att inte finnas. Här räknas klammer- och parentesdjup i stället, och taggen
   * slutar vid det `>` som står på djup noll utanför en sträng.
   */
  function knapptaggar(src) {
    const ut = [];
    for (let i = src.indexOf("<button"); i !== -1; i = src.indexOf("<button", i + 1)) {
      let djup = 0, sträng = null;
      for (let j = i + 7; j < src.length; j++) {
        const c = src[j];
        if (sträng) { if (c === sträng && src[j - 1] !== "\\") sträng = null; continue; }
        if (c === '"' || c === "'" || c === "`") { sträng = c; continue; }
        if (c === "{" || c === "(") djup++;
        else if (c === "}" || c === ")") djup--;
        else if (c === ">" && djup === 0) { ut.push(src.slice(i, j + 1)); break; }
      }
    }
    return ut;
  }

  it("taggavgränsningen fungerar (annars är kontrollen nedan tom)", () => {
    // Skyddet för skyddet. En kontroll som slutar hitta något ser likadan ut
    // som en kodbas utan fel.
    const t = knapptaggar(`<button onClick={() => setX(v => !v)} aria-expanded={x}>Text</button>`);
    expect(t.length).toBe(1);
    expect(t[0]).toContain("aria-expanded");
    expect(knapptaggar(`<button onClick={() => setX(v => !v)}>Text</button>`)[0])
      .not.toContain("aria-expanded");
  });

  it("varje knapp som växlar ett visa-tillstånd har aria-expanded", () => {
    const VÄXLAR = /set[A-ZÅÄÖ][\wÅÄÖåäö]*\(\s*\w+\s*=>\s*!\s*\w+\s*\)/;
    const stumma = [];
    let sedda = 0;
    for (const f of readdirSync(KATALOG).filter(n => n.endsWith(".jsx"))) {
      knapptaggar(readFileSync(resolve(KATALOG, f), "utf8")).forEach(t => {
        if (!VÄXLAR.test(t)) return;
        sedda++;
        if (!/aria-expanded/.test(t)) stumma.push(`${f}: ${t.replace(/\s+/g, " ").slice(0, 90)}`);
      });
    }
    // Hittar kontrollen inga växlande knappar alls har den slutat fungera.
    expect(sedda, "inga växlande knappar hittades — kontrollen är trasig")
      .toBeGreaterThanOrEqual(5);
    expect(stumma, "hopfällbara avsnitt utan aria-expanded").toEqual([]);
  });
});
