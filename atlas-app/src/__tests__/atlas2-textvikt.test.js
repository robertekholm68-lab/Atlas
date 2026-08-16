// Askr 2.0 — textvikt på mörk bakgrund.
//
// Robert: "jag tycker typsnittet i det små texterna är väldigt tunna."
//
// Grundvikten sattes ingenstans. Knapparna deklarerade 600, men de ~370
// småtexterna ärvde webbläsarens 400. Vid 11-12 px på svart blir det märkbart
// tunt: ljus text på mörk botten uppfattas alltid tunnare än tvärtom, eftersom
// ljuset "äter" in i kanterna.
//
// FÖRSTA FÖRSÖKET GJORDE INGENTING. Jag satte 450, byggde, och skärmbilderna
// före och efter var PIXELIDENTISKA — Inter laddas i fasta vikter (400, 600,
// 700) och 450 fanns inte bland dem, så webbläsaren föll tillbaka på 400.
// Det syntes bara för att bilderna jämfördes; en mätning av computed style
// hade sagt "450" och sett rätt ut.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const app2 = readFileSync(resolve("src/atlas2/App2.jsx"), "utf8");
const html = readFileSync(resolve("atlas2.html"), "utf8");

describe("grundvikten är satt", () => {
  it("rotelementet deklarerar en vikt", () => {
    const rot = app2.slice(app2.indexOf('className="askr-app"'), app2.indexOf('className="askr-app"') + 900);
    expect(rot).toMatch(/fontWeight: 500/);
  });

  it("vikten finns bland de laddade", () => {
    // En vikt som inte laddas faller tyst tillbaka på närmaste — och gör
    // ändringen verkningslös utan att något felar.
    expect(html).toMatch(/family=Inter:wght@[\d;]*\b500\b/);
  });

  it("textutjämning är satt", () => {
    // Utan den renderar Safari och Chrome ljus text på mörk botten med olika
    // fetma. antialiased ger samma tunnhet överallt, så vikten kan göra jobbet
    // konsekvent.
    expect(app2).toMatch(/WebkitFontSmoothing: "antialiased"/);
    expect(app2).toMatch(/MozOsxFontSmoothing: "grayscale"/);
  });
});

describe("hierarkin står kvar", () => {
  it("knapparna väger mer än brödtexten", () => {
    // 500 mot 600 lämnar skillnaden mellan text och handling intakt. Hade
    // brödtexten gått till 600 hade knapparna slutat sticka ut.
    const design = readFileSync(resolve("src/atlas2/design.js"), "utf8");
    expect(design).toMatch(/btnPrimary[\s\S]{0,300}fontWeight: 600/);
  });

  it("rubrikerna väger mest", () => {
    const design = readFileSync(resolve("src/atlas2/design.js"), "utf8");
    expect(design).toMatch(/fontFamily: HFONT[\s\S]{0,80}fontWeight: 800/);
  });
});
