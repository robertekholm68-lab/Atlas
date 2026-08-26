// @vitest-environment jsdom
// Askr 2.0 — könet styr figuren, och det får bara finnas på ETT ställe.
//
// Robert, efter att ha skannat QR-koden på telefonen: "har jag kvinna i min
// bild." Profilarket (Meny → Om dig) har en könsväljare som skriver
// `profile.sex`, men appen bar dessutom ett EGET `sex`-state som bara sattes
// vid hydrering och i onboardingen. Den som bytte kön där fick alltså rätt
// värde sparat och FEL figur på kartan — ända tills appen laddades om.
// Reproducerat mot bygget: karta MAN / profil.sex "f" efter bytet.
//
// Fixen är inte att synka de två, utan att ta bort det ena: `sex` härleds nu ur
// profilen. Testet vaktar att ingen lägger tillbaka en andra kopia.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const src = readFileSync(resolve("src/atlas2/App2.jsx"), "utf8");
// Start-komponenten har ett eget, kortlivat val innan profilen finns — det är
// legitimt. Allt nedan gäller Atlas2, alltså appen efter onboardingen.
const app = src.slice(src.indexOf("export function Atlas2()"));

describe("könet finns på ett ställe", () => {
  it("Atlas2 härleder sex ur profilen", () => {
    expect(app).toMatch(/const sex = profile\.sex \|\| null;/);
  });

  it("Atlas2 har inget eget sex-state", () => {
    expect(app).not.toMatch(/\[sex, setSex\]/);
    expect(app).not.toMatch(/setSex\(/);
  });

  it("kartan får könet i båda layouterna", () => {
    // BodyMap2 renderas i Home, som ligger före Atlas2 i filen — sök i hela.
    const rader = src.split("\n").filter(r => r.includes("<BodyMap2 "));
    expect(rader.length).toBeGreaterThanOrEqual(2);
    for (const r of rader) expect(r).toMatch(/sex=\{sex\}/);
  });

  it("profilarket skriver samma nyckel och samma värden som startsidan", () => {
    // Glider de isär färgas kartan efter ett värde som figurtabellen inte har,
    // och då faller den tyst tillbaka på mannen.
    const profil = readFileSync(resolve("src/atlas2/ProfileSheet.jsx"), "utf8");
    expect(profil).toMatch(/\{ id: "m", namn: "Man" \}/);
    expect(profil).toMatch(/\{ id: "f", namn: "Kvinna" \}/);
    expect(profil).toMatch(/sätt\("sex", v\)/);
    expect(src).toMatch(/\[\["m", "Man"\], \["f", "Kvinna"\]\]/);
  });
});

describe("testarsidan leder vidare till appen", () => {
  const test = readFileSync(resolve("landing/test.html"), "utf8");

  it("har en länk till appen", () => {
    // Sidan bad testaren "öppna länken" utan att ge den. Den som skannat
    // QR-koden hit läste hela instruktionen och stod sedan utan väg vidare.
    expect(test).toMatch(/href="\.\/atlas2\.html"/);
  });

  it("skriver ut adressen i klartext också", () => {
    // Skannad kod på papper, delad skärmbild, kopierad text — länken finns inte
    // alltid som länk.
    expect(test).toMatch(/robertekholm68-lab\.github\.io\/Atlas\/atlas2\.html/);
  });
});
