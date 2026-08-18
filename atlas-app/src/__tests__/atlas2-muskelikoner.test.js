// Askr 2.0 — miniatyr som kroppssiluett med primärmuskeln markerad.
//
// FÖRSTA FÖRSÖKET FÖRKASTADES. Piktogram per rörelsemönster (squat, curl,
// press) gick inte att skilja åt vid 20 px — squat, lunge, core och vertical
// pull blev samma streckgubbe — och svarade dessutom på fel fråga.
// Rörelsemönstret står redan i klartext på raden; det som skiljer övningar åt
// är VILKEN MUSKEL de belastar.
//
// Samma body_regions.json driver den stora kroppskartan, så en övning ser
// likadan ut var man än möter den. Kroppen är gränssnittet.

import { describe, it, expect } from "vitest";
import { primärMuskel, regionFörMuskel } from "../atlas2/muscleIcon.jsx";
import { EXERCISES } from "../data/exercises.js";
import REGIONS from "../atlas2/body_regions.json";

describe("varje övning kan ritas", () => {
  it("alla 160 har en primärmuskel med en region", () => {
    // Utan full täckning skulle vissa rader få en tom ruta, vilket är sämre
    // än ingen ruta alls.
    const utan = EXERCISES.filter(e => {
      const m = primärMuskel(e);
      return !m || !regionFörMuskel(m);
    });
    expect(utan.map(e => e.name)).toEqual([]);
  });

  it("primärmuskeln är den med högst aktivering, inte den första i listan", () => {
    // Ordningen i activation är inte garanterat sorterad.
    const fejk = { activation: [{ muscleId: "forearms", factor: 0.3 }, { muscleId: "quadriceps", factor: 1 }] };
    expect(primärMuskel(fejk)).toBe("quadriceps");
  });

  it("en övning utan aktivering ger null, inte en krasch", () => {
    expect(primärMuskel({ activation: [] })).toBe(null);
    expect(primärMuskel(null)).toBe(null);
  });
});

describe("aliasen täcker namnskillnaderna", () => {
  it("de tre deltoiderna ritas som en axelregion", () => {
    // Kartan skiljer dem inte, och vid 30 px vore skillnaden ändå osynlig.
    for (const d of ["deltoid_anterior", "deltoid_lateral", "deltoid_posterior"]) {
      expect(regionFörMuskel(d), d).toBeTruthy();
      expect(regionFörMuskel(d).id).toBe("deltoids");
    }
  });

  it("obliques hittar external_obliques", () => {
    expect(regionFörMuskel("obliques").id).toBe("external_obliques");
  });

  it("en okänd muskel ger null", () => {
    expect(regionFörMuskel("finns_inte")).toBe(null);
  });
});

describe("vyn väljs av muskeln", () => {
  it("ryggmuskler ger baksidan", () => {
    // Att alltid visa framsidan hade gjort halva banken oläslig.
    for (const m of ["latissimus_dorsi", "hamstrings", "gluteals", "triceps_brachii"]) {
      expect(regionFörMuskel(m).vy, m).toBe("back");
    }
  });

  it("framsidans muskler ger framsidan", () => {
    for (const m of ["pectoralis_major", "quadriceps", "biceps_brachii"]) {
      expect(regionFörMuskel(m).vy, m).toBe("front");
    }
  });
});

describe("beskärningen använder figurens faktiska mått", () => {
  it("kartans viewBox har tomrum som miniatyren inte ska visa", () => {
    // Figuren ligger i mitten av 500×1020. Utan beskärning blir den hälften så
    // stor som den kunde vara och musklerna reduceras till prickar.
    const box = REGIONS.front.viewBox.split(" ").map(Number);
    expect(box[2]).toBe(500);
    expect(box[3]).toBe(1020);
  });
});
