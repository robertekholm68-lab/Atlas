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
import { EXERCISES, TEKNIK_CUES } from "../data/exercises.js";

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
    const src = readFileSync(resolve("src/atlas2/OvningsSida.jsx"), "utf8");
    expect(src).toMatch(/bildFör\(e\.id\)/);
  });

  it("bilden har alt-text", () => {
    // Alt-texten beskrev en DIPTYK ("startposition till vänster") — det
    // formatet gällde de tre silverfigurerna. De fotorealistiska bilderna är
    // en enda pose, så beskrivningen stämde inte längre.
    const src = readFileSync(resolve("src/atlas2/OvningsSida.jsx"), "utf8");
    expect(src).toMatch(/alt=\{`\$\{e\.name\} — utförande`\}/);
  });

  it("teknikpunkterna ligger över bilden som riktig text", () => {
    // INTE inbränd i bilden. Robert: "den måste vara redigerbar om jag i
    // framtiden vill översätta". Inbränd text går inte att söka, översätta
    // eller rätta, och är osynlig för skärmläsare.
    const src = readFileSync(resolve("src/atlas2/OvningsSida.jsx"), "utf8");
    expect(src).toMatch(/position: "absolute", left: 0, right: 0, bottom: 0/);
    expect(src).toMatch(/cues\.map\(\(rad, i\)/);
  });

  it("utan bild står punkterna som vanlig lista", () => {
    const src = readFileSync(resolve("src/atlas2/OvningsSida.jsx"), "utf8");
    expect(src).toMatch(/\) : cues \? \(/);
  });
});

describe("bröstövningarna har bild och teknikpunkter", () => {
  const ids = ["bench_press", "incline_bench_bb", "incline_db_press",
    "db_bench_press", "decline_bench_bb", "decline_db_press"];

  it("alla sex har en registrerad bild", () => {
    for (const id of ids) expect(bildFör(id), id).toBeTruthy();
  });

  it("alla sex har fyra teknikpunkter", () => {
    // Tre av dem saknade cues när bilderna lades in — bilden hade visats med
    // ett tomt mörkt fält där texten skulle stå.
    for (const id of ids) {
      expect(TEKNIK_CUES[id], id).toBeDefined();
      expect(TEKNIK_CUES[id].length, id).toBe(4);
    }
  });

  it("lutningen står i punkterna, inte bara i namnet", () => {
    // Källorna (styrkelabbet, gymgrossisten, ourfitness) är eniga: 30-45
    // grader. Över det tar främre deltoideus över och det blir en axelpress.
    expect(TEKNIK_CUES.incline_db_press.join(" ")).toMatch(/30-45 grader/);
  });

  it("varje registrerad bild har en fil", () => {
    // En registrering utan fil ger en trasig bild-ikon; en fil utan
    // registrering visas aldrig.
    const reg = readFileSync(resolve("src/data/exerciseImages.js"), "utf8");
    const idn = [...reg.matchAll(/"([a-z_0-9]+)"/g)].map(m => m[1]);
    for (const id of idn) {
      expect(existsSync(resolve(`public/ovningar/${id}.webp`)), id).toBe(true);
    }
  });
});

describe("miniatyren i listan", () => {
  const bank = readFileSync(resolve("src/atlas2/ExerciseBank.jsx"), "utf8");

  it("56 px, inte 34", () => {
    // Robert: "Miniatyrbilderna i övningarna skulle nästan få plats i dubbel
    // storlek". Mätt: raden var 71 px hög och bilden 34 — drygt halva
    // utrymmet oanvänt, och fotot blev en fläck där rörelsen inte syntes.
    expect(bank).toMatch(/width: 56, height: 56, flexShrink: 0/);
  });

  it("muskelikonen följer med upp", () => {
    // En 30 px ikon i en 56 px ruta hade lämnat en ram av tomrum.
    expect(bank).toMatch(/<MuskelIkon exercise=\{e\} size=\{48\} \/>/);
  });

  it("bilden beskärs, sträcks inte", () => {
    // objectFit cover: bilden är stående, rutan kvadratisk.
    expect(bank).toMatch(/objectFit: "cover"/);
  });
});
