// Askr 2.0 — inmatningsfältet tappade fokus vid varje tangenttryck.
//
// Robert: "nu när jag registrerar vikt så åker tangentbordet ner efter varje
// siffra. 8 ner jag får ta upp det 9 ner jag får ta upp det osv".
//
// ORSAKEN: komponenten Falt definierades INUTI NyMatning. Vid varje
// tangenttryck kördes NyMatning om och skapade funktionen på nytt. React
// jämför komponenttyper med IDENTITET, såg en ny typ, och rev fältet för att
// bygga ett nytt i stället för att uppdatera det befintliga.
//
// Fokus försvinner med det gamla elementet — och på mobil åker tangentbordet
// ner när fokus försvinner. Ett fält man bara kan skriva en siffra i taget i är
// obrukbart.
//
// Mätt i webbläsare: före fixen tappades fokus 4 av 5 tecken och värdet blev
// "8" i stället för "82,4". Efter: 0 av 5.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const src = readFileSync(resolve("src/atlas2/Kroppsmatt.jsx"), "utf8");

describe("Falt ligger på modulnivå", () => {
  it("definieras utanför NyMatning", () => {
    const falt = src.indexOf("function Falt(");
    const ny = src.indexOf("export function NyMatning(");
    expect(falt).toBeGreaterThan(0);
    expect(falt).toBeLessThan(ny);
  });

  it("är inte längre en pilfunktion inuti komponenten", () => {
    // `const Falt = ({...}) => (` inuti NyMatning var själva felet.
    expect(src).not.toMatch(/ {2}const Falt = \(/);
  });

  it("tar värde och callback som props", () => {
    // En modulnivåkomponent kan inte läsa `värden` ur stängningen.
    expect(src).toMatch(/function Falt\(\{ id, namn, enhet, steg, värde, onÄndra \}\)/);
  });

  it("varje anrop skickar med dem", () => {
    const anrop = src.match(/<Falt[^/>]*\/>/g) || [];
    expect(anrop.length).toBeGreaterThan(0);
    for (const a of anrop) {
      expect(a, a).toMatch(/värde=/);
      expect(a, a).toMatch(/onÄndra=/);
    }
  });
});

describe("fältet behåller svensk inmatning", () => {
  it("inputMode decimal, inte type number", () => {
    // type="number" avvisar komma i flera webbläsare och gör "91,5" till
    // ingenting för en svensk användare.
    expect(src).toMatch(/inputMode="decimal"/);
    const falt = src.slice(src.indexOf("function Falt("), src.indexOf("function Falt(") + 700);
    expect(falt).not.toMatch(/type="number"/);
  });

  it("fältStil ligger också på modulnivå", () => {
    // Ett nytt stilobjekt vid varje render är inte ett fokusfel, men det
    // skapar onödiga omritningar av samma anledning.
    const stil = src.indexOf("const fältStil = {");
    expect(stil).toBeLessThan(src.indexOf("export function NyMatning("));
  });
});
