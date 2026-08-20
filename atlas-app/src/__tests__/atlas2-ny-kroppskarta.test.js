// Askr 2.0 — kroppskartan byggd ur maskbilder.
//
// Den handritade kartan hade 21 regioner ritade för hand mot en fotofigur.
// Den nya är genererad ur MASKBILDER: samma anatomiillustration, en bild per
// muskel med muskeln ifylld i magenta. Konverteringen följer maskens kant, så
// regionen ÄR muskelns form i stället för en approximation.
//
// FÄRGEN ÄR STEGLÖS. Motorn räknar redan ett kontinuerligt readiness-värde ur
// exponentiellt avtagande last med muskelspecifik halveringstid. Kartan
// rundade det till fyra hinkar; nu ärver nyansen kurvan rakt av.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import REGIONS from "../atlas2/body_regions.json";
import { recoveryColor } from "../atlas2/design.js";
import { MUSCLES } from "../data/muscles.js";

describe("regionerna täcker båda vyerna", () => {
  it("elva regioner per vy", () => {
    expect(REGIONS.front.regions.length).toBe(11);
    expect(REGIONS.back.regions.length).toBe(11);
  });

  it("vyerna delar koordinatsystem", () => {
    // Bakvyn genererades separat och var 16 % större. Utan skalning skulle
    // figuren byta storlek när man bläddrar mellan vyerna.
    expect(REGIONS.front.viewBox).toBe(REGIONS.back.viewBox);
  });

  it("varje region-id finns i motorns MUSCLES", () => {
    // Stämmer de inte får regionen aldrig någon färg — den skulle rendera grå
    // för alltid utan att något syntes vara fel.
    // Regioner utan eget id i MUSCLES. De ritas men färgas aldrig — motorn har
    // ingen last för dem. Medvetet: rotatorkuffen och teres major belastas av
    // samma dragövningar som lats och trapezius, och att ge dem egna
    // halveringstider skulle antyda en precision motorn inte har.
    const undantag = new Set(["rotator_cuff", "deltoids", "teres_major"]);
    for (const vy of ["front", "back"]) {
      for (const r of REGIONS[vy].regions) {
        if (undantag.has(r.id)) continue;
        expect(MUSCLES[r.id], `${vy}/${r.id}`).toBeTruthy();
      }
    }
  });

  it("inga tomma former", () => {
    for (const vy of ["front", "back"]) {
      for (const r of REGIONS[vy].regions) {
        expect(r.d.length, `${vy}/${r.id}`).toBeGreaterThan(0);
        for (const d of r.d) expect(d.startsWith("M "), `${vy}/${r.id}`).toBe(true);
      }
    }
  });
});

describe("färgen följer återhämtningen steglöst", () => {
  it("0 är röd, 100 är grön", () => {
    expect(recoveryColor(0).toLowerCase()).toMatch(/^#d0/);
    expect(recoveryColor(100).toLowerCase()).toMatch(/^#54/);
  });

  it("mellanvärden ger egna nyanser", () => {
    // En muskel på 55 % och en på 68 % såg identiska ut med fyra hinkar.
    const a = recoveryColor(55), b = recoveryColor(68);
    expect(a).not.toBe(b);
  });

  it("nyansen vandrar mot grönt", () => {
    // Mäts som nyansvinkel, inte som grönkanal: mot det gröna hållet sjunker
    // grönkanalen någon enhet när ljusheten stiger, fast färgen ändå blir
    // grönare. Vinkeln är det som faktiskt beskriver skalan.
    const rgb = s => [1, 3, 5].map(i => parseInt(recoveryColor(s).slice(i, i + 2), 16));
    for (const [lägre, högre] of [[0, 25], [25, 50], [50, 75], [75, 100]]) {
      const [r1, g1] = rgb(lägre), [r2, g2] = rgb(högre);
      // Grönt relativt rött ska öka hela vägen.
      expect(g2 / r2, `${lägre} → ${högre}`).toBeGreaterThan(g1 / r1);
    }
  });

  it("null ger null, inte en grå färg", () => {
    // Ofärgat är signalen för "ingen data". En grå fyllning hade sett ut som
    // ett tillstånd i skalan.
    expect(recoveryColor(null)).toBe(null);
    expect(recoveryColor(undefined)).toBe(null);
  });

  it("värden utanför skalan klipps", () => {
    expect(recoveryColor(-20)).toBe(recoveryColor(0));
    expect(recoveryColor(150)).toBe(recoveryColor(100));
  });
});

describe("kartan använder readiness, inte status", () => {
  const src = readFileSync(resolve("src/atlas2/BodyMap2.jsx"), "utf8");

  it("färgen härleds ur talet", () => {
    expect(src).toMatch(/recoveryColor\(st\.readiness\)/);
    expect(src).not.toMatch(/statusColor\(st\.status\)/);
  });
});
