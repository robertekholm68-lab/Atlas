// Askr 2.0 — muskelkartans färgning.
//
// Robert, om den tidigare figuren: "färgerna hamnade utanför och kändes
// påklistrade". Det var inte ett smakproblem utan tre tekniska:
//
//   1. mixBlendMode "screen" ljusnar bara och tar ingen hänsyn till vad som
//      finns under. Ett mörkt veck och en ljus höjdpunkt fick samma pålägg.
//   2. Opacitet 0,72–0,9 dränkte fotots muskeldefinition just där färgen var
//      som mest intressant.
//   3. En SVG-path slutar tvärt på en pixel. Muskler gör det inte.
//
// Jämförda skärmbilder före och efter: med "overlay" syns muskelfibrerna rakt
// igenom färgen, och latissimus behåller sin struktur i stället för att bli ett
// platt block.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const src = readFileSync(resolve("src/atlas2/BodyMap2.jsx"), "utf8");

describe("färgen ligger i anatomin, inte ovanpå den", () => {
  it("blandningsläget är overlay, inte screen", () => {
    // screen ljusnar bara; overlay behåller fotots ljus och skugga.
    expect(src).toMatch(/mixBlendMode:\s*"overlay"/);
    expect(src).not.toMatch(/mixBlendMode:\s*"screen"/);
  });

  it("opaciteten lämnar plats åt anatomin under", () => {
    // Med overlay behövs mindre färg för samma läsbarhet.
    const m = src.match(/fillOpacity=\{st \? \(aktiv \? ([\d.]+) : ([\d.]+)\)/);
    expect(m, "hittade inte fillOpacity").toBeTruthy();
    expect(Number(m[1])).toBeLessThanOrEqual(0.75);
    expect(Number(m[2])).toBeLessThanOrEqual(0.55);
  });

  it("kanten är mjuk — en path slutar annars tvärt på en pixel", () => {
    expect(src).toMatch(/feGaussianBlur/);
    expect(src).toMatch(/filter=\{`url\(#mjuk-/);
  });

  it("fram och bak har SKILDA filter-id", () => {
    // Två figurer i samma dokument med samma id gör att båda pekar på den
    // första defs — en klassisk och tyst SVG-fälla.
    expect(src).toMatch(/id=\{`mjuk-\$\{vy\}`\}/);
  });
});

describe("otränade muskler lyser fortfarande inte", () => {
  it("utan underlag ritas ingen färg alls", () => {
    // Ärlighetsregeln: det som lyser är det som har underlag. Anatomibilden
    // under räcker för att visa att muskeln finns.
    expect(src).toMatch(/: \(aktiv \? 0\.22 : 0\)/);
  });
});
