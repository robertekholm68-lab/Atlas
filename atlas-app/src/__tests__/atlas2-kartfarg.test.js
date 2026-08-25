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
import { FIGURER } from "../atlas2/BodyMap2.jsx";

const src = readFileSync(resolve("src/atlas2/BodyMap2.jsx"), "utf8");

// Blandningsläge och opacitet ligger sedan kvinnofiguren kom i FIGURER, per
// figur — mansfiguren bär fortfarande exakt de uppmätta värdena.
const [blend, op, opAktiv] = FIGURER.m.lager[0];

describe("färgen ligger i anatomin, inte ovanpå den", () => {
  it("blandningsläget är multiply mot den ljusa figuren", () => {
    // screen ljusnar bara; overlay behåller fotots ljus och skugga.
    expect(FIGURER.m.lager.length).toBe(1);
    expect(blend).toBe("multiply");
    expect(src).not.toMatch(/mixBlendMode:\s*"screen"/);
  });

  it("opaciteten lämnar plats åt anatomin under", () => {
    // Med overlay behövs mindre färg än med screen (0,9/0,72). Taket höjdes
    // när figuren ljusnade till 1,8 — overlay späder ut färgen mot ett ljust
    // underlag, mätt i pixelvärden: grönt tappade 31 % mättnad.
    expect(src).toMatch(/fillOpacity=\{st \? \(aktiv \? opAktiv : op\)/);
    expect(opAktiv).toBeLessThan(0.9);
    expect(op).toBeLessThan(0.72);
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
    // Bara det första lagret får en svag hover-ton; alla övriga lager är noll.
    expect(src).toMatch(/: \(aktiv && li === 0 \? 0\.18 : 0\)/);
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

  it("figuren ljusas INTE upp", () => {
    // brightness(1.8) fanns för det gamla MÖRKA fotot. Den nya anatomiska
    // illustrationen är redan ljus (medelvärde 156 i källan), och 1,8 blåste ut
    // den till 252,250,249 — nästan rent vitt. Muskelteckningen försvann helt.
    //
    // Mätt på skärmbild: standardavvikelsen i huden gick från 14,9 (utblåst)
    // till 42,3 (teckning synlig) när uppljusningen togs bort.
    //
    // saturate behövdes av samma skäl: utan uppljusning konkurrerar figurens
    // hudton inte längre med statusfärgen.
    // Matchar filter-RADEN, inte kommentaren som förklarar varför den ser ut
    // som den gör — en regex mot hela filen träffar båda.
    const rad = src.match(/filter: "[^"]+"/)[0];
    expect(rad).not.toMatch(/brightness/);
    expect(rad).toMatch(/contrast\(1\.\d+\)/);
  });

  it("filtret sitter på bilden, inte på färglagret", () => {
    // Ljusar man SVG:n i stället bleks statusfärgerna och rött närmar sig gult.
    const img = src.slice(src.indexOf("<img src={bildUrl"), src.indexOf("</svg>"));
    expect(img).toMatch(/brightness/);
    const paths = src.slice(src.indexOf("r.d.map"));
    expect(paths).not.toMatch(/brightness/);
  });
});
