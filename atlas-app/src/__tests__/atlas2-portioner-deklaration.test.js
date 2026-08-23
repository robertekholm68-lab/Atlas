// Askr 2.0 — egna portioner och fotad näringsdeklaration.
//
// Robert: "jag vill ha större möjlighet att spara portioner i stället för
// alltid 100 gram" och "om man skannar en streckkod som är okänd, fota
// innehållsförteckningen".

import { describe, it, expect } from "vitest";
import { läggTillPortion, taBortPortion, portionsval } from "../engines/skafferi.js";
import { tolkaDeklaration, stämmerMakron, DEKLARATION_SYSTEM } from "../engines/deklaration.js";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("egna portioner per vara", () => {
  const vara = () => [{ id: "own_1", name: "Proteinpulver", kcal: 380, portion: 30 }];

  it("sparas med namn och gram", () => {
    // En skopa är 30 g för tillverkaren men 45 g i din shaker.
    const s = läggTillPortion(vara(), "own_1", "Skopa", 45);
    expect(s[0].portioner).toEqual([{ namn: "Skopa", gram: 45 }]);
  });

  it("flera portioner per vara", () => {
    // Man har ofta både "liten skopa" och "stor skopa".
    let s = läggTillPortion(vara(), "own_1", "Liten", 30);
    s = läggTillPortion(s, "own_1", "Stor", 60);
    expect(s[0].portioner.length).toBe(2);
  });

  it("samma namn ersätter i stället för att dubbleras", () => {
    let s = läggTillPortion(vara(), "own_1", "Skopa", 30);
    s = läggTillPortion(s, "own_1", "skopa", 45);
    expect(s[0].portioner.length).toBe(1);
    expect(s[0].portioner[0].gram).toBe(45);
  });

  it("noll eller skräp sparas inte", () => {
    expect(läggTillPortion(vara(), "own_1", "X", 0)[0].portioner).toBeUndefined();
    expect(läggTillPortion(vara(), "own_1", "X", "abc")[0].portioner).toBeUndefined();
  });

  it("högst sex — fler blir en lista att leta i", () => {
    let s = vara();
    for (let i = 0; i < 9; i++) s = läggTillPortion(s, "own_1", `P${i}`, 10 + i);
    expect(s[0].portioner.length).toBe(6);
  });

  it("går att ta bort", () => {
    let s = läggTillPortion(vara(), "own_1", "Skopa", 45);
    s = taBortPortion(s, "own_1", "Skopa");
    expect(s[0].portioner).toEqual([]);
  });
});

describe("portionsval visar egna först", () => {
  it("egen portion före förpackningens", () => {
    // Har man sparat en egen är det nästan alltid den man menar —
    // förpackningens uppgift är tillverkarens gissning om hur mycket man BORDE
    // äta, inte hur mycket man faktiskt tar.
    const v = { portion: 30, portioner: [{ namn: "Skopa", gram: 45 }] };
    expect(portionsval(v)[0].namn).toBe("Skopa");
    expect(portionsval(v)[0].egen).toBe(true);
  });

  it("100 g finns alltid med", () => {
    expect(portionsval({ portion: 30 }).some(p => p.gram === 100)).toBe(true);
  });

  it("ingen dubblett när egen portion är 100 g", () => {
    const v = { portioner: [{ namn: "Standard", gram: 100 }] };
    expect(portionsval(v).filter(p => p.gram === 100).length).toBe(1);
  });
});

describe("näringsdeklarationen läses ur foto", () => {
  const SVAR = '{"namn":"Rökt skinka","märke":"Scan","kcal":262,"protein":24,"carbs":9.8,"fat":14,"fiber":1.4,"saturated":5.2,"salt":1.3,"portion":125,"enhet":"g","säkerhet":"hög"}';

  it("alla fält tolkas", () => {
    const t = tolkaDeklaration(SVAR);
    expect(t.ok).toBe(true);
    expect(t.kcal).toBe(262);
    expect(t.fiber).toBe(1.4);
    expect(t.portion).toBe(125);
    expect(t.namn).toBe("Rökt skinka");
  });

  it("saknad uppgift utelämnas, inte satt till 0", () => {
    // En vara utan fiberuppgift har OKÄND fiber, inte noll fiber, och en nolla
    // är en osanning som följer med in i dagssumman.
    const t = tolkaDeklaration('{"kcal":100,"protein":5}');
    expect("fiber" in t).toBe(false);
    expect("salt" in t).toBe(false);
  });

  it("kJ taget som kcal avvisas", () => {
    // Rent fett är 900 kcal/100 g — inget livsmedel ligger över. Ett högre tal
    // är en felläsning, oftast kJ-värdet.
    const t = tolkaDeklaration('{"kcal":1100,"protein":24}');
    expect(t.ok).toBe(false);
    expect(t.skäl).toBe("orimligt");
  });

  it("komma fungerar som decimaltecken", () => {
    // Svenska förpackningar skriver "5,2 g".
    expect(tolkaDeklaration('{"kcal":100,"fat":"5,2"}').fat).toBe(5.2);
  });

  it('"vet inte" är ett giltigt svar', () => {
    // Ett påhittat näringsvärde hamnar i matloggen och styr både kalorimål och
    // träningsråd — bättre att be om ett nytt foto.
    const t = tolkaDeklaration('{"vet_inte":true,"notering":"Suddig bild"}');
    expect(t.ok).toBe(false);
    expect(t.skäl).toBe("vet-inte");
  });

  it("saknad energi avvisas", () => {
    expect(tolkaDeklaration('{"protein":24,"fat":14}').skäl).toBe("ingen-energi");
  });

  it("trasig JSON ger ett skäl, inte en krasch", () => {
    expect(tolkaDeklaration("{").ok).toBe(false);
    expect(tolkaDeklaration(null).ok).toBe(false);
  });
});

describe("makrona kontrolleras mot energivärdet", () => {
  it("en korrekt läsning godkänns", () => {
    // 24×4 + 9,8×4 + 14×9 = 261,2 mot avlästa 262.
    expect(stämmerMakron(tolkaDeklaration('{"kcal":262,"protein":24,"carbs":9.8,"fat":14}'))).toBe(true);
  });

  it("en grov felläsning flaggas", () => {
    expect(stämmerMakron(tolkaDeklaration('{"kcal":100,"protein":40,"carbs":40,"fat":30}'))).toBe(false);
  });

  it("nästan energifria varor godkänns alltid", () => {
    // Förhållandet blir brus när energin är nära noll.
    expect(stämmerMakron(tolkaDeklaration('{"kcal":5,"protein":0,"carbs":1,"fat":0}'))).toBe(true);
  });

  it("toleransen är vid — fiber och avrundningar stör", () => {
    // Summan stämmer sällan exakt ens på en korrekt läsning.
    expect(stämmerMakron(tolkaDeklaration('{"kcal":100,"protein":5,"carbs":12,"fat":3}'))).toBe(true);
  });
});

describe("prompten håller reglerna", () => {
  it("modellen ombeds aldrig gissa", () => {
    expect(DEKLARATION_SYSTEM).toMatch(/GISSA ALDRIG ETT TAL DU INTE SER/);
  });

  it("saknade fält ska utelämnas, inte nollas", () => {
    expect(DEKLARATION_SYSTEM).toMatch(/sätt dem INTE till 0/);
  });

  it("kJ-fällan nämns", () => {
    expect(DEKLARATION_SYSTEM).toMatch(/Ta KCAL-talet/);
  });
});

describe("gramtalet går att skriva i alla vyer", () => {
  const vyer = ["FoodView", "Streckkod", "FotoMaltid"];

  it("varje vy med gramväljare har ett skrivbart fält", () => {
    // Livsmedelssökningen hade bara +/− med 25 g steg: vill man ha 165 g krävs
    // sju tryck från 100, och träffar man fel får man börja om.
    for (const vy of vyer) {
      const src = readFileSync(resolve(`src/atlas2/${vy}.jsx`), "utf8");
      expect(src, vy).toMatch(/data-gram="1"/);
    }
  });

  it("stegknapparna finns kvar för finjustering", () => {
    const src = readFileSync(resolve("src/atlas2/FoodView.jsx"), "utf8");
    expect(src).toMatch(/aria-label="Minska"/);
    expect(src).toMatch(/aria-label="Öka"/);
  });

  it("tomt fält tillåts under redigering", () => {
    // Annars hoppar det tillbaka till 0 så fort man raderar för att skriva om.
    const src = readFileSync(resolve("src/atlas2/FoodView.jsx"), "utf8");
    expect(src).toMatch(/setGram\(r === "" \? "" :/);
  });

  it("men faller tillbaka på 100 när fältet lämnas", () => {
    const src = readFileSync(resolve("src/atlas2/FoodView.jsx"), "utf8");
    expect(src).toMatch(/onBlur=\{\(\) => \{ if \(gram === "" \|\| Number\(gram\) < 1\) setGram\(100\)/);
  });

  it("loggningen skyddas mot NaN", () => {
    // En post med grams: "" ger NaN i näringsräkningen och förgiftar
    // dagssumman tyst.
    const src = readFileSync(resolve("src/atlas2/FoodView.jsx"), "utf8");
    expect(src).toMatch(/const g = Number\(gram\) \|\| 100;/);
  });

  it("förhandsvisningen tål tomt fält", () => {
    const src = readFileSync(resolve("src/atlas2/FoodView.jsx"), "utf8");
    expect(src).toMatch(/Math\.round\(n \* \(Number\(gram\) \|\| 0\) \/ 100\)/);
  });
});
