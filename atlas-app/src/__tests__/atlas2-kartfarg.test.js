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
  it("blandningsläget är multiply mot den ljusa figuren", () => {
    // screen ljusnar bara; overlay behåller fotots ljus och skugga.
    expect(src).toMatch(/mixBlendMode:\s*"multiply"/);
    expect(src).not.toMatch(/mixBlendMode:\s*"screen"/);
  });

  it("opaciteten lämnar plats åt anatomin under", () => {
    // Med overlay behövs mindre färg än med screen (0,9/0,72). Taket höjdes
    // när figuren ljusnade till 1,8 — overlay späder ut färgen mot ett ljust
    // underlag, mätt i pixelvärden: grönt tappade 31 % mättnad.
    const m = src.match(/fillOpacity=\{st \? \(aktiv \? ([\d.]+) : ([\d.]+)\)/);
    expect(m, "hittade inte fillOpacity").toBeTruthy();
    expect(Number(m[1])).toBeLessThan(0.9);
    expect(Number(m[2])).toBeLessThan(0.72);
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
    expect(src).toMatch(/: \(aktiv \? 0\.18 : 0\)/);
  });
});

describe("figuren är ljus nog att se anatomin i", () => {
  it("anatomibilden ljusas upp", () => {
    // Bilden mörkades vid genereringen för att de färgade musklerna skulle
    // bära informationen. Med overlay behövs det inte längre — färgen tar sin
    // ton ur underlaget i stället för att konkurrera med det, så ett mörkt
    // foto ger bara en mörk karta.
    expect(src).toMatch(/brightness\(1\.\d+\)/);
  });

  it("kontrasten höjs tillsammans med ljusstyrkan", () => {
    // Enbart brightness gör bilden gråare: muskeldefinitionen bleks ut, och
    // det är just den som gör att färgen inte ser påklistrad ut.
    expect(src).toMatch(/contrast\(1\.\d+\)/);
  });

  it("underlagets mättnad dras ner så statusfärgen bär kulören", () => {
    // Utan saturate konkurrerar figurens egen hudton med statusfärgen, och vid
    // hög ljusstyrka blir rött ljusrosa i stället för rött.
    expect(src).toMatch(/saturate\(0?\.\d+\)/);
  });

  it("filtret sitter på bilden, inte på färglagret", () => {
    // Ljusar man SVG:n i stället bleks statusfärgerna och rött närmar sig gult.
    const img = src.slice(src.indexOf("<img src={bildUrl"), src.indexOf("</svg>"));
    expect(img).toMatch(/brightness/);
    const paths = src.slice(src.indexOf("r.d.map"));
    expect(paths).not.toMatch(/brightness/);
  });
});
