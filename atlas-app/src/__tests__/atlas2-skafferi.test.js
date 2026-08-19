// Askr 2.0 — eget skafferi.
//
// Robert: "jag vill att livsmedel som loggas med streckkod ska kunna sparas så
// man hittar dem med bara namnet också. jag vill också kunna spara mat som jag
// äter ofta."
//
// TVÅ PROBLEM, SAMMA LÖSNING. searchFoods sökte bara i FOOD_INDEX
// (Livsmedelsverket). En skannad vara loggades men sparades ingenstans — nästa
// gång måste man skanna om, och står burken hemma medan man är i affären fanns
// ingen väg alls.

import { describe, it, expect } from "vitest";
import { searchFoods } from "../engines/index.js";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  skafferiFrånStreckkod, skafferiFrånPost, läggISkafferi,
  redanISkafferiet, sorteratSkafferi, skafferiFrekvens,
} from "../engines/skafferi.js";

const OFF = { code: "7310865004703", name: "Proteinpudding Choklad", brand: "Lindahls",
  kcal: 88, protein: 10, carbs: 4.5, fat: 3 };

describe("skannad vara blir sökbar", () => {
  it("bygger en post i FOOD_INDEX form", () => {
    // Avviker formen går sökningen och portionsräkningen sönder på ställen som
    // inte har med skafferiet att göra.
    const p = skafferiFrånStreckkod(OFF);
    for (const f of ["id", "name", "kcal", "protein", "carbs", "fat"]) {
      expect(p[f], f).toBeDefined();
    }
    expect(p.name).toMatch(/Lindahls/);
    expect(p.barcode).toBe(OFF.code);
  });

  it("hittas på namn i sökningen", () => {
    const t = searchFoods("proteinpudding", null, [], 5, [skafferiFrånStreckkod(OFF)]) || [];
    expect(t[0] && t[0].name).toMatch(/proteinpudding/i);
  });

  it("skanning av samma vara ger ingen dubblett", () => {
    // Streckkoden följer med just för det här.
    let s = läggISkafferi([], skafferiFrånStreckkod(OFF));
    s = läggISkafferi(s, skafferiFrånStreckkod(OFF));
    expect(s.length).toBe(1);
  });

  it("men värdena uppdateras", () => {
    // Näringsvärden i Open Food Facts ändras när tillverkare ändrar recept, och
    // den nyare uppgiften är den bättre.
    let s = läggISkafferi([], skafferiFrånStreckkod(OFF));
    s = läggISkafferi(s, skafferiFrånStreckkod({ ...OFF, kcal: 95 }));
    expect(s.length).toBe(1);
    expect(s[0].kcal).toBe(95);
  });
});

describe("loggad måltid kan sparas", () => {
  it("en post med gram räknas om till per 100 g", () => {
    const p = skafferiFrånPost({ name: "Keso", grams: 200, kcal: 196, protein: 24, carbs: 6, fat: 7 });
    expect(p.kcal).toBe(98);
    expect(p.protein).toBe(12);
    expect(p.portion).toBe(200);
  });

  it("en post UTAN gram sparas som portion, inte per 100 g", () => {
    // "min vanliga frukost" är en portion, inte ett kilo gröt. Att räkna om
    // till 100 g hade gett tal som ser exakta ut men bygger på en gissad vikt.
    const p = skafferiFrånPost({ name: "Min frukostgröt", kcal: 420, protein: 18, carbs: 62, fat: 9 });
    expect(p.portionsMat).toBe(true);
    expect(p.kcal).toBe(420);
  });

  it("dubbletter på namn undviks", () => {
    const a = skafferiFrånPost({ name: "Min gröt", kcal: 400 });
    const b = skafferiFrånPost({ name: "min gröt", kcal: 400 });
    expect(redanISkafferiet([a], b)).toBeTruthy();
  });
});

describe("skafferiet rankas före databasen — men inte blint", () => {
  it("egen vara vinner vid likvärdig träff", () => {
    // Skriver man "kvarg" och har en sparad favoritsort ska den stå före
    // Livsmedelsverkets fjorton generiska kvargposter.
    const egen = { id: "own_1", name: "Lindahls Kvarg Vanilj", kcal: 65, protein: 11, carbs: 4, fat: 0.2 };
    const t = searchFoods("kvarg", null, [], 3, [egen]) || [];
    expect(t[0].name).toBe("Lindahls Kvarg Vanilj");
  });

  it("exakt databasträff vinner ändå", () => {
    // Påslaget är 120 poäng — nog för likvärdig matchning, inte nog att låta en
    // svag träff i skafferiet slå en exakt träff i databasen.
    const egen = { id: "own_1", name: "Lindahls Kvarg Vanilj", kcal: 65, protein: 11, carbs: 4, fat: 0.2 };
    const t = searchFoods("keso", null, [], 2, [egen]) || [];
    expect(t[0].name).toMatch(/^Keso/);
  });

  it("utan skafferi fungerar sökningen som förut", () => {
    const t = searchFoods("kvarg", null, [], 3) || [];
    expect(t.length).toBeGreaterThan(0);
  });
});

describe("det man äter ofta står först", () => {
  it("sorteras på användning, inte på när det sparades", () => {
    // Räknas ur beteende, inte ur en favoritmarkering man måste komma ihåg att
    // sätta.
    const a = { id: "own_a", name: "Sällan", tillagd: 2000 };
    const b = { id: "own_b", name: "Ofta", tillagd: 1000 };
    const logg = [
      { name: "Ofta", ts: Date.now() }, { name: "Ofta", ts: Date.now() },
      { name: "Sällan", ts: Date.now() },
    ];
    expect(sorteratSkafferi([a, b], logg)[0].name).toBe("Ofta");
  });

  it("gamla loggningar räknas inte", () => {
    const p = { id: "own_a", name: "Gammal", tillagd: 1 };
    const f = skafferiFrekvens([p], [{ name: "Gammal", ts: Date.now() - 200 * 864e5 }]);
    expect(f.own_a).toBeUndefined();
  });
});

describe("appen erbjuder att spara — man slipper komma ihåg", () => {
  const src = readFileSync(resolve("src/atlas2/FoodView.jsx"), "utf8");

  it("erbjudandet ligger i FoodView, inte i Logga-fliken", () => {
    // Loggning byter flik till Idag, så en ruta i Logga-vyn hade aldrig synts.
    // Första försöket gjorde precis det felet; webbläsarkontrollen visade att
    // erbjudandet aldrig nådde skärmen.
    const idx = src.indexOf('flik === "oversikt" && erbjudande');
    expect(idx).toBeGreaterThan(0);
  });

  it("kommer efter loggningen, inte före", () => {
    // Maten är redan registrerad när erbjudandet dyker upp — annars vore det
    // ett hinder mellan användaren och det hen kom för att göra.
    const fn = src.slice(src.indexOf("const läggAI"), src.indexOf("const läggAI") + 700);
    expect(fn.indexOf("onLägg(post)")).toBeLessThan(fn.indexOf("onLoggad(post)"));
  });

  it("villkoret bygger på sökbarhet, inte på hits", () => {
    // "mormors köttbullelåda" får hits 1 eftersom "köttbulle" matchar som
    // DELORD — precis som "hamburgare från max" matchade råvaran. Träffen finns
    // men rätten går ändå inte att söka fram nästa gång.
    expect(src).toMatch(/träff\.name\.toLowerCase\(\)\.startsWith/);
    expect(src).not.toMatch(/post\.hits \|\| 0\) > 0\) return/);
  });

  it("en post som redan finns i skafferiet erbjuds inte igen", () => {
    expect(src).toMatch(/redanISkafferiet\(skafferi, \{ name: post\.name \}\)/);
  });

  it("mängdord rensas innan sökbarheten prövas", () => {
    // "100 g keso" ska jämföras som "keso", annars matchar ingenting.
    expect(src).toMatch(/gram\|g\|kg\|dl\|cl\|ml\|st/);
  });
});
