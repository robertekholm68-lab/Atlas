// Askr 2.0 — passflikens genvägar som knappar, inte textrader.
//
// Robert: "under pass. pågående pass vill jag ha som det är, men raderna under
// vill jag ha som knappar i stället".
//
// Fem rader med "Något — förklaring →" tog 220 px och lästes som en lista att
// skanna, inte som val att trycka på. Ett rutnät på två rader tar 146 px och
// varje ruta är en tydlig knapp. Mätt i verklig storlek.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const src = readFileSync(resolve("src/atlas2/App2.jsx"), "utf8");

describe("genvägarna är ett ikonrutnät", () => {
  it("tre knappar med data-ikon", () => {
    const ids = [...src.matchAll(/data: "([a-z-]+)", gör:/g)].map(m => m[1]);
    // Sport tillkom: låg förut under en rubrik som såg ut som text, inte
    // som ett val — Robert trodde den var oklickbar. Sex rutor på två rader
    // är dessutom jämnare än fem.
    // NER TILL TRE. Passfliken hade blivit en meny: Kunskap, Maskiner och
    // Feedback hade inget med pass att göra och flyttade till Mer-menyn.
    // Övningar och Muskelgrupper var samma bank med olika första steg —
    // muskelgruppsvyn är nu enda ingången, med "Alla" som första kort.
    expect(ids).toEqual(["starta-tomt", "muskelgrupper", "sport"]);
  });

  it("tre kolumner", () => {
    const rutnät = src.slice(src.indexOf("IKONRUTNÄT I STÄLLET FÖR TEXTRADER"), src.indexOf("IKONRUTNÄT I STÄLLET FÖR TEXTRADER") + 900);
    expect(rutnät).toMatch(/gridTemplateColumns: "repeat\(3, 1fr\)"/);
  });

  it("de gamla textraderna är borta", () => {
    expect(src).not.toMatch(/Bläddra bland alla övningar →/);
    expect(src).not.toMatch(/Muskelgrupper — välj utifrån kroppen →/);
    expect(src).not.toMatch(/Maskiner — inställningar och vanliga fel →/);
    expect(src).not.toMatch(/Kunskap — träningsprinciper och muskelfakta →/);
  });

  it("varje knapp har etikett — en ikon utan ord är en gissning", () => {
    const namn = [...src.matchAll(/namn: "([^"]+)", data:/g)].map(m => m[1]);
    expect(namn.length).toBe(3);
    for (const n of namn) expect(n.length).toBeGreaterThan(2);
  });

  it("SVG-ikoner, inte emoji", () => {
    // Emoji renderas olika per telefon och ser ut som chatt, inte gränssnitt.
    const rutnät = src.slice(src.indexOf("IKONRUTNÄT I STÄLLET FÖR TEXTRADER"), src.indexOf("IKONRUTNÄT I STÄLLET FÖR TEXTRADER") + 3500);
    expect(rutnät).toMatch(/<svg viewBox="0 0 24 24"/);
    expect(rutnät).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  it("aria-label på varje knapp", () => {
    expect(src).toMatch(/aria-label=\{k\.namn\}/);
  });
});

describe("Byt program är en lång knapp som skiljer sig från passen", () => {
  it("streckad kant — passen ovanför har heldragen volt", () => {
    // Passkorten hör till det aktiva programmet; den här lämnar det. Kanten
    // säger "annan sorts handling" utan att gömma knappen.
    const byt = src.slice(src.indexOf('data-byt="1"'), src.indexOf('data-byt="1"') + 700);
    expect(byt).toMatch(/border: `1px dashed/);
  });

  it("visar nuvarande program", () => {
    expect(src).toMatch(/nu: \{activeProgram\.name\}/);
  });

  it("den gamla textraden och sportrubriken är borta", () => {
    expect(src).not.toMatch(/Byt program — \{activeProgram\.name\} →/);
    // Frasen finns kvar i en kommentar som förklarar varför den togs bort —
    // testet matchar JSX-raden, inte kommentaren.
    expect(src).not.toMatch(/>\s*Tränat något annat\?\s*</);
  });
});

describe("de gamla data-attributen finns kvar", () => {
  it("data-starta-tomt och data-muskelgrupper — andra tester och verifierare läser dem", () => {
    expect(src).toMatch(/"data-starta-tomt": "1"/);
    expect(src).toMatch(/"data-muskelgrupper": "1"/);
  });
});
