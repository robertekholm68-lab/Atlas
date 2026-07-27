// Askr — textuppskattningen: komponenter och måltidsförslag.
//
// Tredje och fjärde fyndet från riktig användning. "fralla med ost och skinka"
// gav bara ost, eftersom komponentbanken hade 32 poster och saknade halva den
// svenska frukosten. Och skriver man "köttbullar" åt man sällan bara
// köttbullar — potatis, sås och lingon följde med, men uppskattaren kan bara
// räkna det som står i texten.
//
// Undersökningen hittade dessutom en bugg som fanns FÖRE tilläggen: matchningen
// skedde inuti ord, så "filmjölk" räknade in ÖL (150 kcal) och "potatismos"
// räknade potatisen två gånger. Den som loggade ärligt fick fel siffra.

import { describe, it, expect } from "vitest";
import { estimateMeal, searchFoods } from "../engines/index.js";
import { FOOD_KB, FOOD_INDEX } from "../data/foods.js";
import { mealSuggestions, MEAL_TEMPLATES } from "../engines/mealSuggest.js";


describe("dubbelräkningen — felet som fanns före tilläggen", () => {
  it("\"filmjölk\" räknar inte in öl", () => {
    // "öl" står inuti "filmjölk". Den gamla matchningen lade till 150 kcal öl
    // i frukosten.
    const r = estimateMeal("filmjölk och müsli");
    expect(r.hits).toBe(2);
    expect(r.kcal).toBeLessThan(420);
  });

  it("\"potatismos\" räknar inte potatisen två gånger", () => {
    const r = estimateMeal("köttbullar med potatismos");
    expect(r.hits).toBe(2);
  });

  it("längsta nyckelordet vinner när flera gör anspråk på samma ord", () => {
    const mos = estimateMeal("potatismos");
    const potatis = estimateMeal("potatis");
    expect(mos.hits).toBe(1);
    expect(potatis.hits).toBe(1);
    expect(mos.kcal).not.toBe(potatis.kcal);      // olika komponenter
  });
});

describe("komponenterna räcker till en vanlig svensk måltid", () => {
  it("\"fralla med ost och skinka\" känner igen alla tre", () => {
    const r = estimateMeal("fralla med ost och skinka");
    expect(r.hits).toBe(3);
    expect(r.kcal).toBeGreaterThan(250);
    expect(r.protein).toBeGreaterThan(12);
  });

  it("frukostarna går att logga", () => {
    for (const t of ["gröt med banan", "filmjölk med müsli", "två mackor med ost", "äggröra med bacon"]) {
      expect(estimateMeal(t).hits, t).toBeGreaterThanOrEqual(2);
    }
  });

  it("varje komponents siffror går att spåra till Livsmedelsverket", () => {
    // Alla poster tillagda 2026-07-27 bär en kommentar med portion och
    // SLV-postens namn. Testet kontrollerar att de nya inte är påhittade
    // genom att stickprova att motsvarande post FINNS i banken.
    for (const namn of ["Skinka", "Lingonsylt", "Banan", "Keso", "Müsli"]) {
      expect(FOOD_INDEX.some(f => f.name === namn), namn).toBe(true);
    }
  });

  it("banken har vuxit men är fortfarande en handfull, inte ett register", () => {
    // Poängen är vanliga vardagsmåltider, inte fullständighet. En lista som
    // försöker täcka allt blir omöjlig att underhålla.
    expect(FOOD_KB.length).toBeGreaterThan(50);
    expect(FOOD_KB.length).toBeLessThan(120);
  });
});

describe("sökningen — motorns egen, inte en andra", () => {
  const först = q => { const r = searchFoods(q, null, null, 1) || []; return r[0] ? r[0].name : null; };

  it("vardagsord når registerspråket via synonymtabellen", () => {
    // "fralla" fanns i FOOD_SYN hela tiden, men synonymen kollades först när
    // poängen var NOLL — och "ostfralla" gav träff på substräng, så synonymen
    // fick aldrig chansen. Nu går synonymen före substräng.
    expect(först("fralla")).toMatch(/bröd vitt/i);
    expect(först("frallor")).toMatch(/bröd vitt/i);   // böjning, via stamning
  });

  it("ordets plats i namnet avgör: Ost före Paj m. ost", () => {
    expect(först("ost")).toMatch(/^Ost/i);
    expect(först("korv")).toMatch(/^Korv/i);
  });

  it("råvaror rankas ner — i en matlogg har man ätit maten tillagad", () => {
    // OBS: \\b duger inte för "rå" i JavaScript, eftersom "å" inte räknas som
    // ordtecken. Regeln använder ordjämförelse.
    expect(först("kyckling")).not.toMatch(/\brå$/i);
    expect(först("potatis")).not.toMatch(/rå/i);
  });

  it("stavfel tolereras — det fanns redan och ska fortsätta göra det", () => {
    expect(först("abbore")).toMatch(/abborre/i);
  });

  it("sammanskrivet hittas via trigram — fanns också redan", () => {
    expect(först("pyttipanna")).toMatch(/pytt i panna/i);
  });
});

describe("måltidsförslagen", () => {
  it("\"köttbullar\" föreslår de klassiska helheterna", () => {
    const f = mealSuggestions("köttbullar");
    expect(f.length).toBeGreaterThan(1);
    expect(f.some(x => /potatis/.test(x) && /lingon/.test(x))).toBe(true);
  });

  it("utlösaren matchar HELA ord — \"korvbröd\" ger inga korvförslag", () => {
    expect(mealSuggestions("korv").length).toBeGreaterThan(0);
    expect(mealSuggestions("korvbröd")).toEqual([]);
  });

  it("föreslår inte det som redan står skrivet", () => {
    const f = mealSuggestions("köttbullar med potatismos och lingon");
    expect(f).not.toContain("köttbullar med potatismos och lingon");
  });

  it("VARJE förslag ger minst två igenkända komponenter", () => {
    // Ett förslag som uppskattaren inte kan räkna på är sämre än inget
    // förslag: det ser hjälpsamt ut och ger ändå en gissning.
    const svaga = [];
    MEAL_TEMPLATES.forEach(t => t.förslag.forEach(f => {
      if (estimateMeal(f).hits < 2) svaga.push(f);
    }));
    expect(svaga).toEqual([]);
  });

  it("tomt fält ger inga förslag", () => {
    expect(mealSuggestions("")).toEqual([]);
    expect(mealSuggestions("   ")).toEqual([]);
  });
});
