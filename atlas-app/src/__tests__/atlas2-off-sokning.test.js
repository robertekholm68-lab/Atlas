// Askr 2.0 — Open Food Facts som tillägg till Livsmedelsverket.
//
// Robert: "Jag skulle vilja ha fler livsmedel. Det måste finnas fler källor".
//
// MÄTT: Livsmedelsverket har 2 679 poster men NOLL märkesvaror. "lindahls",
// "oatly", "barebells" och "nocco" ger alla 0. OFF har 27 164 svenska
// produkter — Barebells 66, Nocco 59, Oatly 41 — och av de hundra populäraste
// har 96 kompletta näringsvärden.

import { describe, it, expect } from "vitest";
import { computeNutrition } from "../engines/index.js";
import { readFileSync } from "fs";
import { resolve } from "path";

const vy = readFileSync(resolve("src/atlas2/FoodView.jsx"), "utf8");
const proxy = readFileSync(resolve("coach-proxy/api/foods.js"), "utf8");

describe("OFF söks live, aldrig inbakat", () => {
  it("appen anropar proxyn, inte OFF direkt", () => {
    // OFF kräver User-Agent och rate-limitar globalt. Proxyn cachar och ger
    // rent svar i stället för HTML-fel vid överlast.
    expect(vy).toMatch(/askr-coach\.vercel\.app\/api\/foods/);
    expect(vy).not.toMatch(/openfoodfacts\.org\/cgi\/search/);
  });

  it("väntar 400 ms innan sökning", () => {
    // En sökning per tangenttryck vore fem anrop för ordet "oatly".
    expect(vy).toMatch(/\}, 400\);/);
  });

  it("kräver minst tre tecken", () => {
    expect(vy).toMatch(/if \(q\.length < 3\) \{ setOffTräffar\(\[\]\)/);
  });
});

describe("OFF-träffar visas efter Livsmedelsverkets", () => {
  it("under egen rubrik med källa", () => {
    // Datan är folkbidragen; Livsmedelsverkets är analyserad. Skillnaden ska
    // synas, precis som vid streckkod.
    expect(vy).toMatch(/Open Food Facts · overifierad/);
    expect(vy).toMatch(/data-off-traff="1"/);
  });

  it("dubbletter mot skafferiet filtreras", () => {
    expect(vy).toMatch(/kända\.has\(f\.barcode\)/);
  });

  it("offline sägs rakt ut", () => {
    // Livsmedelsverket fungerar offline; OFF gör det inte. En tom lista utan
    // förklaring ser ut som "finns inte".
    expect(vy).toMatch(/Märkesvaror kräver nät/);
  });
});

describe("en loggad OFF-vara räknas", () => {
  it("posten bär egna tal — foodId finns inte i något index", () => {
    // Samma fel som skafferiet hade: en post vars foodId inte hittas räknades
    // som noll. OFF-varor får kcal och makron direkt på posten.
    const post = { id: "a", name: "Barebells", grams: 55, source: "off", kcal: 200, protein: 20, carbs: 18, fat: 8, ts: Date.now() };
    const t = computeNutrition([post], []);
    expect(t.kcal).toBe(200);
    expect(t.protein).toBe(20);
  });

  it("skalas till gram vid loggning", () => {
    expect(vy).toMatch(/kcal: Math\.round\(vald\.kcal \* g \/ 100\)/);
  });

  it("saknade makron blir null, inte 0", () => {
    expect(vy).toMatch(/carbs: vald\.carbs != null \? Math\.round/);
  });
});

describe("proxyn är dum och ärlig", () => {
  it("utan kcal och protein är posten värdelös", () => {
    expect(proxy).toMatch(/if \(kcal == null \|\| protein == null\) return null;/);
  });

  it("tomt svar vid rate limit, inte fel", () => {
    // OFF är ett TILLÄGG. Ett tomt tillägg är inte ett fel för användaren.
    expect(proxy).toMatch(/väntar: true/);
    expect(proxy).toMatch(/otillgänglig: true/);
  });

  it("cachar per sökord", () => {
    expect(proxy).toMatch(/CACHE_MS = 300_000/);
  });

  it("skickar User-Agent — OFF kräver det", () => {
    expect(proxy).toMatch(/"User-Agent": "Askr\/2\.0/);
  });

  it("tål HTML-svar vid överlast", () => {
    // OFF returnerar en HTML-sida, inte JSON med felkod.
    expect(proxy).toMatch(/try \{ d = JSON\.parse\(text\); \} catch/);
  });
});
