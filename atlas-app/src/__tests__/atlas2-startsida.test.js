// Askr 2.0 — startsidans hjältebilder och skrivbordslayout.
//
// Robert: "kvinnan är för inzoomad. de ska vara i samma storlek både man och
// kvinna." Orsaken satt inte i CSS utan i BILDFILERNA: hjältebilderna ritas med
// `object-fit: cover` i en ruta som alltid är smalare än bilden är hög, så
// webbläsaren skalar efter BREDDEN. Mannens bild var 617 px bred och kvinnans
// 397 — alltså förstorades hon exakt 617/397 = 1,55 gånger mer, på varje
// skärmbredd. Kvinnans bild målades ut (outpaint) till samma bredd.
//
// Det här testet vaktar den kopplingen. Byter någon ut en hjältebild mot en med
// annat mått är figurerna olika stora igen, och det syns bara om man råkar titta
// på startsidan — som en befintlig användare aldrig ser.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/** Bredd och höjd ur en WebP-fil (VP8, VP8L eller VP8X) utan bildbibliotek. */
function webpMatt(sokvag) {
  const b = readFileSync(sokvag);
  expect(b.toString("ascii", 0, 4), `${sokvag}: inte en RIFF-fil`).toBe("RIFF");
  expect(b.toString("ascii", 8, 12), `${sokvag}: inte WEBP`).toBe("WEBP");
  const typ = b.toString("ascii", 12, 16);
  if (typ === "VP8 ") {
    // Lossy: 16-bitars mått efter startkoden 0x9d012a, 14 bitar var.
    return { bredd: b.readUInt16LE(26) & 0x3fff, hojd: b.readUInt16LE(28) & 0x3fff };
  }
  if (typ === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { bredd: (bits & 0x3fff) + 1, hojd: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (typ === "VP8X") {
    const l = (n) => b[n] | (b[n + 1] << 8) | (b[n + 2] << 16);
    return { bredd: l(24) + 1, hojd: l(27) + 1 };
  }
  throw new Error(`${sokvag}: okänd WebP-typ ${typ}`);
}

describe("startsidans hjältebilder", () => {
  const man = webpMatt(resolve("public/startsida-man.webp"));
  const kvinna = webpMatt(resolve("public/startsida-kvinna.webp"));

  it("har samma bredd — det är bredden som sätter figurens storlek", () => {
    expect(kvinna.bredd, `man ${man.bredd} px, kvinna ${kvinna.bredd} px`).toBe(man.bredd);
  });

  it("har samma höjd, så vertikal beskärning blir lika", () => {
    expect(kvinna.hojd).toBe(man.hojd);
  });

  it("är stående — en liggande bild beskärs sönder i den 330 px höga rutan", () => {
    for (const [namn, m] of [["man", man], ["kvinna", kvinna]]) {
      expect(m.hojd, namn).toBeGreaterThan(m.bredd);
    }
  });
});

describe("startsidans layout", () => {
  const src = readFileSync(resolve("src/atlas2/App2.jsx"), "utf8");
  // Bara Start-komponenten, fram till nästa toppnivåfunktion.
  const start = src.slice(src.indexOf("function Start("), src.indexOf("/* ══════════ LÄGESVAL"));

  it("har ett bredd-tak så skrivbordsvyn inte sträcker ut hjältebilden", () => {
    // Utan tak blev rutan 720×330 px vid 1440 — cover beskar bort allt utom
    // hjässorna, och rubriken hamnade ensam i vänsterkanten.
    const m = start.match(/maxWidth:\s*(\d+)/);
    expect(m, "hittade ingen maxWidth i Start").toBeTruthy();
    expect(Number(m[1])).toBeLessThanOrEqual(640);
    expect(start).toMatch(/margin:\s*"0 auto"/);
  });

  it("ritar båda figurerna innan man valt kön", () => {
    expect(start).toMatch(/visa\s*=\s*k\s*=>\s*sex === null \|\| sex === k/);
  });

  it("går vidare även utan val — könet är inte obligatoriskt", () => {
    expect(start).toMatch(/onNext\(sex\)/);
  });
});
