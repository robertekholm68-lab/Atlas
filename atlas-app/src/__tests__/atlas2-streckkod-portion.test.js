// Askr 2.0 — portionsval vid streckkodsskanning.
//
// 100 g är sällan det man äter — det är bara den enhet näringen anges i. Utan
// portionsknappen fick man knappa sig från 100 till 30 i tiogramssteg för en
// yoghurt, och tio gram kan inte ens träffa 25.
//
// Open Food Facts bär både serving_size och quantity. Båda hämtades redan från
// API:et; serving_size returnerades men användes aldrig, quantity kastades bort.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { tolkaPortion } from "../engines/index.js";

describe("tolkar Open Food Facts fritext", () => {
  it("rena gramangivelser", () => {
    expect(tolkaPortion("30 g")).toBe(30);
    expect(tolkaPortion("25g")).toBe(25);
  });

  it("sista talet vinner — '1 portion (25 g)' är 25, inte 1", () => {
    // Fältet är fritext skriven av den som lagt in varan. Första talet är ofta
    // antalet portioner, inte vikten.
    expect(tolkaPortion("1 portion (25g)")).toBe(25);
    expect(tolkaPortion("1 burk (330 ml)")).toBe(330);
  });

  it("ml räknas som gram", () => {
    // För dryck ligger densiteten nära 1, och OFF anger näringen per 100 g även
    // för flytande varor. Att avstå hade gjort knappen oanvändbar för allt
    // drickbart.
    expect(tolkaPortion("2 dl (200 ml)")).toBe(200);
  });

  it("otolkbara former ger null — ingen gissning", () => {
    // En påhittad portion ger fel kalorital i loggen, vilket är sämre än ingen
    // knapp alls.
    expect(tolkaPortion("1 skiva")).toBe(null);
    expect(tolkaPortion("0,5 dl")).toBe(null);
    expect(tolkaPortion("")).toBe(null);
    expect(tolkaPortion(null)).toBe(null);
  });

  it("orimliga värden avvisas", () => {
    // Över två kilo tyder på feltolkning, inte på en stor portion.
    expect(tolkaPortion("5000 g")).toBe(null);
  });
});

describe("vyn", () => {
  const src = readFileSync(resolve("src/atlas2/Streckkod.jsx"), "utf8");

  it("steglängden är 5 gram, inte 10", () => {
    // Tio gram kan inte träffa en portion på 25 g — bara 20 eller 30.
    // Number() runt g sedan fältet blev skrivbart: "" + 5 ger strängen "5".
    expect(src).toMatch(/setGram\(g => Math\.max\(5, \(Number\(g\) \|\| 0\) - 5\)\)/);
    expect(src).toMatch(/setGram\(g => \(Number\(g\) \|\| 0\) \+ 5\)/);
  });

  it("snabbval finns för portion, förpackning och 100 g", () => {
    for (const v of ["portion", "paket", "hundra"]) {
      expect(src, v).toMatch(new RegExp(`data-snabb="${v}"`));
    }
  });

  it("knapparna visas bara när varan bär uppgiften", () => {
    expect(src).toMatch(/\{\(portionsGram \|\| paketGram\) &&/);
  });

  it("förpackningen göms när den är samma som portionen", () => {
    // En vara där portionen ÄR förpackningen ska inte ge två identiska knappar.
    expect(src).toMatch(/paketGram !== portionsGram/);
  });
});

describe("motorn returnerar det vyn behöver", () => {
  it("lookupBarcode bär både serving och quantity", () => {
    const src = readFileSync(resolve("src/engines/index.js"), "utf8");
    const fn = src.slice(src.indexOf("async function lookupBarcode"), src.indexOf("function goalProgress"));
    expect(fn).toMatch(/serving: p\.serving_size/);
    expect(fn).toMatch(/quantity: p\.quantity/);
  });
});
