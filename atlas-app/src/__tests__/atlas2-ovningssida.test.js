// Askr 2.0 — övningssidan: en utveckling av kortet.
//
// Robert: "jag gillar våra kort så gör en utveckling av dem. informationen på
// korten är bra, det ska bara in bild och länk där". Och: "ersätta, men gör
// en back-up om vi vill gå tillbaka" — taggen backup/kort-fore-ovningssida.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const sida = readFileSync(resolve("src/atlas2/OvningsSida.jsx"), "utf8");
const bank = readFileSync(resolve("src/atlas2/ExerciseBank.jsx"), "utf8");
const app = readFileSync(resolve("src/atlas2/App2.jsx"), "utf8");

describe("kortet blev en sida", () => {
  it("banken öppnar sidan i stället för att fälla ut", () => {
    // En utfällning i en lista med 160 rader trycker ner allt under sig, och
    // man scrollar i två riktningar samtidigt.
    expect(bank).toMatch(/onClick=\{\(\) => onÖppna && onÖppna\(e\.id\)\} data-övning="1"/);
    expect(bank).not.toMatch(/const \[öppen, setÖppen\]/);
  });

  it("pilen pekar höger — öppnar, fäller inte ut", () => {
    expect(bank).toMatch(/›<\/span>/);
    expect(bank).not.toMatch(/rotate\(180deg\)/);
  });

  it("Stäng går tillbaka till banken, inte till fliken", () => {
    // Man bläddrar bland flera övningar; att hamna på passfliken efter varje
    // vore att börja om.
    expect(app).toMatch(/onClose=\{\(\) => setSheet\("ovningar"\)\}/);
  });
});

describe("sidan bär kortets innehåll", () => {
  it("bild med teknikpunkter över det mörka fältet", () => {
    expect(sida).toMatch(/position: "absolute", left: 0, right: 0, bottom: 0/);
    expect(sida).toMatch(/cues\.map\(\(rad, i\)/);
  });

  it("muskelstaplarna är motorns tal", () => {
    expect(sida).toMatch(/width: `\$\{Math\.round\(Math\.min\(1, a\.factor\) \* 100\)\}%`/);
  });
});

describe("tilläggen", () => {
  it("musklerna i tre nivåer med Gymlifys ord", () => {
    // Faktorerna fanns; orden säger vad de BETYDER.
    expect(sida).toMatch(/namn: "Huvudmuskel"/);
    expect(sida).toMatch(/namn: "Medhjälpare"/);
    expect(sida).toMatch(/namn: "Stabilisator"/);
  });

  it("nivåerna överlappar inte", () => {
    // En muskel med faktor 0,5 ska stå under Medhjälpare, inte under både
    // Medhjälpare och Stabilisator.
    expect(sida).toMatch(/!NIVÅER\.some\(m => m\.min > n\.min && a\.factor >= m\.min\)/);
  });

  it("YouTube-sökning på engelskt namn plus proper form", () => {
    // Gymlify gjorde inga egna videor utan förinställde sökningen. Rätt: 160
    // videor att producera mot noll. "proper form" ger instruktionsvideor,
    // inte tävlingsklipp.
    expect(sida).toMatch(/e\.name \+ " proper form"/);
    expect(sida).toMatch(/target="_blank" rel="noopener noreferrer" data-youtube="1"/);
  });

  it("YouTube-knappen säger vart den går", () => {
    expect(sida).toMatch(/Se övningen på YouTube/);
  });

  it("progressionskurvan visas om historik finns", () => {
    // Det Gymlify lägger under en egen flik ligger på sidan.
    expect(sida).toMatch(/\{kurva\.length >= 2 && rekord && \(/);
  });
});
