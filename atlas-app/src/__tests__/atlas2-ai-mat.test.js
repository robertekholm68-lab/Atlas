// Askr 2.0 — AI-uppskattning av mat databasen inte har.
//
// Robert: "jag försöker logga hamburgare från max och den hittar inget".
//
// Den hittade något — och det var värre. Livsmedelsverket har RÅVAROR:
// "Hamburgare blandfärs stekt" är köttbiten. En Max-burgare är bröd, dressing,
// ost och bacon. Sökningen gav alltså en träff som HETTE rätt och var fel med
// en faktor tre, utan att något avslöjade det.
//
// Kedjornas menyer finns inte i någon öppen svensk databas. Claude kan dem från
// offentliga näringsdeklarationer.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { tolkaMatsvar, behöverAI, MAT_SYSTEM } from "../engines/aiMat.js";
import { estimateMeal } from "../engines/index.js";

const SVAR = '{"namn":"Max Original","kcal":500,"protein":27,"carbs":38,"fat":26,"gram":215,"säkerhet":"hög","notering":"Publicerade värden."}';

describe("AI frågas bara när databasen inte räcker", () => {
  it("en kedja i texten frågar alltid", () => {
    // En träff på "hamburgare" ser ut att ha lyckats. Det är det farliga
    // fallet — hits > 0 räcker alltså inte som villkor.
    expect(behöverAI("hamburgare från max", estimateMeal("hamburgare från max"))).toBe(true);
  });

  it("vanlig mat frågar inte", () => {
    // En träff i FOOD_INDEX är alltid bättre: den är mätt, inte minnd.
    for (const t of ["kyckling med ris", "100 g keso", "2 knäckebröd", "havregrynsgröt"]) {
      expect(behöverAI(t, estimateMeal(t)), t).toBe(false);
    }
  });

  it("noll träffar frågar", () => {
    expect(behöverAI("big mac", estimateMeal("big mac"))).toBe(true);
  });

  it("restaurangrätter frågar även med träff", () => {
    // "pizza vesuvio" matchar databasen men den posten är en portion från en
    // annan restaurang än den man åt på.
    expect(behöverAI("pizza vesuvio", estimateMeal("pizza vesuvio"))).toBe(true);
  });
});

describe("tolkningen av svaret", () => {
  it("ren JSON", () => {
    const t = tolkaMatsvar(SVAR);
    expect(t.ok).toBe(true);
    expect(t.namn).toBe("Max Original");
    expect(t.kcal).toBe(500);
    expect(t.säkerhet).toBe("hög");
  });

  it("kodstaket städas bort", () => {
    expect(tolkaMatsvar("```json\n" + SVAR + "\n```").ok).toBe(true);
  });

  it('"vet inte" är ett giltigt svar, inte ett fel att dölja', () => {
    // En påhittad siffra som ser säker ut är värre än ingen siffra alls —
    // appen bygger träningsråd på de här talen.
    const t = tolkaMatsvar('{"vet_inte":true,"notering":"Känner inte igen rätten."}');
    expect(t.ok).toBe(false);
    expect(t.skäl).toBe("vet-inte");
    expect(t.notering).toMatch(/känner inte igen/i);
  });

  it("orimliga värden avvisas", () => {
    // Över 3000 kcal i en portion är en feltolkning, och den skulle förgifta
    // dagens summa.
    expect(tolkaMatsvar('{"namn":"X","kcal":9000}').skäl).toBe("orimligt");
  });

  it("trasig JSON ger ett skäl, inte en krasch", () => {
    expect(tolkaMatsvar('{"namn":').ok).toBe(false);
    expect(tolkaMatsvar("").ok).toBe(false);
    expect(tolkaMatsvar(null).ok).toBe(false);
  });

  it("okänd säkerhetsnivå faller till låg", () => {
    expect(tolkaMatsvar('{"namn":"X","kcal":300,"säkerhet":"jättesäker"}').säkerhet).toBe("låg");
  });
});

describe("prompten håller reglerna", () => {
  it("modellen ombeds säga när den inte vet", () => {
    expect(MAT_SYSTEM).toMatch(/SÄG NÄR DU INTE VET/i);
    expect(MAT_SYSTEM).toMatch(/värre än ingen siffra alls/i);
  });

  it("talen gäller portionen, inte per 100 g", () => {
    // Databasen räknar per 100 g. Blandas de två blir felet en faktor två till
    // fem utan att något syns.
    expect(MAT_SYSTEM).toMatch(/HELA portionen/);
  });
});

describe("vyn visar AI som alternativ, inte ersättning", () => {
  const src = readFileSync(resolve("src/atlas2/FoodView.jsx"), "utf8");

  it("databasens tal står kvar", () => {
    // Att byta ut talet tyst hade gjort appen omöjlig att lita på: man skulle
    // inte veta om siffran var mätt eller minnd.
    expect(src).toMatch(/data-ai-svar="1"/);
    expect(src).toMatch(/aiLäge === "klar" && aiSvar/);
  });

  it("posten märks med quality ai", () => {
    // dataConfidence ska skilja den från en vägd portion OCH från databasens
    // egen uppskattning.
    expect(src).toMatch(/quality: "ai"/);
  });

  it('"vet inte" visas för användaren', () => {
    expect(src).toMatch(/aiLäge === "vet-inte"/);
    // Texten är radbruten i källan — matcha en fras som inte korsar raden.
    expect(src).toMatch(/databasens råvaror och kan vara/);
  });
});


describe("måltidstyper går aldrig till modellen", () => {
  it('"lunch" och "middag" ger storleksfrågan', () => {
    // De beskriver NÄR man åt, inte VAD. Modellen kan omöjligt veta vad någon
    // annans lunch bestod av och skulle bara hitta på en genomsnittsmåltid —
    // det gör storleksfrågan bättre och ärligare.
    for (const t of ["lunch", "middag", "en frukost", "fika"]) {
      expect(behöverAI(t, null), t).toBe(false);
    }
  });

  it("men en okänd RÄTT frågar", () => {
    // Skillnaden mot "dubbel orginalmål på max", som ÄR en rätt — bara en som
    // databasen inte känner.
    expect(behöverAI("dubbel orginalmål på max", null)).toBe(true);
  });

  it("en måltidstyp MED innehåll frågar ändå", () => {
    // "lunch på max" säger både när och var.
    expect(behöverAI("lunch på max", null)).toBe(true);
  });
});

describe("tvetydiga fraser ger en meny, inte en gissning", () => {
  it("flera alternativ tolkas", () => {
    // "max hamburgare" kan vara Original på 449 kcal eller Dubbel Classic på
    // 840 — nästan dubbelt. Att låta modellen välja åt användaren vore att
    // logga en gissning som ser ut som ett svar.
    const t = tolkaMatsvar('{"alternativ":[{"namn":"Max Original","kcal":449,"protein":22,"carbs":39,"fat":22,"gram":200},{"namn":"Max Dubbel","kcal":760,"protein":46,"carbs":44,"fat":44}],"fråga":"Vilken burgare?","säkerhet":"hög"}');
    expect(t.ok).toBe(true);
    expect(t.flera).toBe(true);
    expect(t.alternativ.length).toBe(2);
    expect(t.fråga).toMatch(/vilken/i);
  });

  it("ett enskilt svar har inte flera-flaggan", () => {
    expect(tolkaMatsvar(SVAR).flera).toBeFalsy();
  });

  it("orimliga alternativ filtreras bort ur listan", () => {
    const t = tolkaMatsvar('{"alternativ":[{"namn":"Rimlig","kcal":500},{"namn":"Orimlig","kcal":9000}]}');
    expect(t.alternativ.length).toBe(1);
    expect(t.alternativ[0].namn).toBe("Rimlig");
  });

  it("högst sex alternativ — annars är det en katalog", () => {
    const många = Array.from({ length: 12 }, (_, i) => ({ namn: `R${i}`, kcal: 400 + i }));
    expect(tolkaMatsvar(JSON.stringify({ alternativ: många })).alternativ.length).toBeLessThanOrEqual(6);
  });

  it("en lista utan giltiga poster faller till fel-form", () => {
    expect(tolkaMatsvar('{"alternativ":[{"namn":"X"}]}').ok).toBe(false);
  });

  it("prompten säger vad som är tvetydigt", () => {
    expect(MAT_SYSTEM).toMatch(/max hamburgare.*TVETYDIGT/is);
    expect(MAT_SYSTEM).toMatch(/Gissa inte; lista dem/i);
  });
});

describe("ingen klickar fram AI:n", () => {
  const src = readFileSync(resolve("src/atlas2/FoodView.jsx"), "utf8");

  it("storleksrutorna är borta", () => {
    // liten/normal/stor var det bästa som fanns innan AI:n. Nu är de ett
    // gissningssteg som kostar ett tryck och ger ett sämre svar: "ungefär hur
    // stor måltid?" om något appen inte vet vad det är ger ett tal ur tomma
    // luften — och det talet hamnar i dagens summa som om det vore mätt.
    expect(src).not.toMatch(/\["small", "Liten"\]/);
    expect(src).not.toMatch(/storleksfråga/);
  });

  it("okänd mat frågar modellen direkt", () => {
    // Fönstret rymmer nu även skafferikollen, som prövas före uppskattningen.
    const fn = src.slice(src.indexOf("const uppskatta"), src.indexOf("const uppskatta") + 3000);
    expect(fn).toMatch(/frågaAI\(text\)/);
  });

  it("även måltidsord går till modellen", () => {
    // Den får svara att den inte vet, och det är ärligare än att skala en
    // gissad genomsnittsmåltid.
    const fn = src.slice(src.indexOf("const uppskatta"), src.indexOf("const uppskatta") + 1400);
    expect(fn).not.toMatch(/if \(!behöverAI\(text, null\)\)/);
  });

  it("när modellen inte vet sägs vad man kan göra", () => {
    // Ett konstaterande utan väg vidare är en återvändsgränd.
    expect(src).toMatch(/skriv mängden/i);
    expect(src).toMatch(/aiLäge === "vet-inte" \|\| aiLäge === "fel"/);
  });
});
