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
    expect(src).toMatch(/kan vara låg för restaurangmat/);
  });
});

describe("okänd mat går till AI, inte till storleksfrågan", () => {
  const src = readFileSync(resolve("src/atlas2/FoodView.jsx"), "utf8");

  it("kind=unknown frågar modellen", () => {
    // "dubbel orginalmål på max" gav kind=unknown — ingen komponent kändes
    // igen — och appen svarade "Ungefär hur stor måltid?". Men storleken är
    // inte det okända där; RÄTTEN är det. Att fråga liten/normal/stor om något
    // appen inte vet vad det är ger ett tal ur tomma luften.
    const fn = src.slice(src.indexOf("const uppskatta"), src.indexOf("const uppskatta") + 1400);
    expect(fn).toMatch(/frågaAI\(text, \{ q: d\.q/);
  });

  it("storleksfrågan står kvar som fallback", () => {
    // Vet inte AI:n heller är portionsskalningen det bästa som återstår.
    expect(src).toMatch(/setStorleksfråga/);
    expect(src).toMatch(/if \(fallback\) \{ setFråga\(fallback\)/);
  });

  it("fallbacken skickas som argument, inte läses ur state", () => {
    // frågaAI startas i samma render som setStorleksfråga anropas, så
    // stängningen ser fortfarande det GAMLA värdet (null) — och fallbacken
    // tystnade. Ett stängningsfel som inte syns i koden men fångades av
    // webbläsarkontrollen.
    const fn = src.slice(src.indexOf("const frågaAI"), src.indexOf("const frågaAI") + 1600);
    expect(fn).toMatch(/async \(fråga, fallback\)/);
    expect(fn).not.toMatch(/if \(storleksfråga\)/);
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
