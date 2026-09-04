// Askr 2.0 — övningsbilder.
//
// Bilderna är diptyker: startposition till vänster, slutposition till höger.
// De genereras i Higgsfield enligt skillen atlas-exercise-images.
//
// DEN DYRA LÄRDOMEN: bilder importerade ur src/assets/ RENDERAS men LADDAS
// ALDRIG i Atlas 2.0. Byggkonfigurationen håller medvetet bilder utanför
// bundeln (assetsInlineLimit), och vite-plugin-singlefile skriver då inte ut
// dem som filer heller. Mätt i webbläsare: img-taggen fanns, naturalWidth var 0.
// Därför ligger de i public/ovningar/ i stället.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve } from "path";
import { MED_BILD, bildFör, bildtäckning } from "../data/exerciseImages.js";
import { EXERCISES } from "../data/exercises.js";

describe("registret och mappen är i takt", () => {
  it("varje id i MED_BILD har en fil i public/ovningar", () => {
    // Listan är handhållen eftersom public/ inte går att globba vid bygget.
    // Priset är att den kan glida isär från mappen — det här testet är skyddet.
    for (const id of MED_BILD) {
      expect(existsSync(resolve(`public/ovningar/${id}.webp`)), `saknar fil: ${id}.webp`).toBe(true);
    }
  });

  it("varje fil i mappen står i MED_BILD", () => {
    // Andra riktningen: en bild som lagts till utan att registreras visas aldrig.
    const filer = readdirSync(resolve("public/ovningar"))
      .filter(f => f.endsWith(".webp")).map(f => f.replace(/\.webp$/, ""));
    for (const f of filer) expect(MED_BILD, `oregistrerad bild: ${f}`).toContain(f);
  });

  it("varje id finns i övningsbanken", () => {
    // En bild för ett id som inte finns visas aldrig och är tyst död vikt.
    const ids = new Set(EXERCISES.map(e => e.id));
    for (const id of MED_BILD) expect(ids.has(id), `okänt övnings-id: ${id}`).toBe(true);
  });
});

describe("saknad bild är ett giltigt tillstånd", () => {
  it("bildFör returnerar null för en övning utan bild", () => {
    // Inte en platshållare. De flesta övningar saknar fortfarande bild, och en
    // trasig-bild-ikon gånger 150 vore värre än ingenting.
    //
    // Exemplet var bench_press tills den fick ett foto. En övning som väljs
    // för att den SAKNAR något måste bytas när den får det — annars testar
    // fallet inget.
    expect(bildFör("skullcrusher")).toBe(null);
  });

  it("bildFör returnerar en sökväg för en övning med bild", () => {
    expect(bildFör("seated_cable_row")).toMatch(/ovningar\/seated_cable_row\.webp$/);
  });

  it("täckningen räknas mot banken, inte mot registret", () => {
    const t = bildtäckning(EXERCISES);
    expect(t.av).toBe(EXERCISES.length);
    expect(t.med).toBe(MED_BILD.length);
  });
});

describe("bilderna ligger där bygget når dem", () => {
  it("INTE i src/assets — därifrån laddas de aldrig i 2.0", () => {
    // Regressionsskydd för det verkliga felet. Flyttas de tillbaka renderas
    // img-taggen men bilden blir tom, och inget test utom det här märker det.
    expect(existsSync(resolve("src/assets/exercises"))).toBe(false);
  });

  it("banken använder bildFör, inte en egen sökväg", () => {
    const src = readFileSync(resolve("src/atlas2/ExerciseBank.jsx"), "utf8");
    expect(src).toMatch(/bildFör\(e\.id\)/);
  });

  it("bilden har alt-text", () => {
    // Alt-texten beskrev en DIPTYK ("startposition till vänster") — det
    // formatet gällde de tre silverfigurerna. De fotorealistiska bilderna är
    // en enda pose, så beskrivningen stämde inte längre.
    const src = readFileSync(resolve("src/atlas2/ExerciseBank.jsx"), "utf8");
    expect(src).toMatch(/alt=\{`\$\{e\.name\} — utförande`\}/);
  });

  it("teknikpunkterna ligger över bilden som riktig text", () => {
    // INTE inbränd i bilden. Robert: "den måste vara redigerbar om jag i
    // framtiden vill översätta". Inbränd text går inte att söka, översätta
    // eller rätta, och är osynlig för skärmläsare.
    const src = readFileSync(resolve("src/atlas2/ExerciseBank.jsx"), "utf8");
    expect(src).toMatch(/position: "absolute", left: 0, right: 0, bottom: 0/);
    expect(src).toMatch(/TEKNIK_CUES\[e\.id\]\.map/);
  });

  it("utan bild står punkterna som vanlig lista", () => {
    const src = readFileSync(resolve("src/atlas2/ExerciseBank.jsx"), "utf8");
    expect(src).toMatch(/TEKNIK_CUES\[e\.id\] && !bildFör\(e\.id\)/);
  });
});
