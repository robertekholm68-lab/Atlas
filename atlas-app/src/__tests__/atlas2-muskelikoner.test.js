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
import { readFileSync } from "fs";
import { resolve } from "path";

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

describe("ikonen zoomar in på muskeln", () => {
  it("ramen är kvadratisk", () => {
    // En helkroppsfigur (364×744) i en kvadratisk 30 px-ruta gav 15 px bredd —
    // höjden styr skalan och bredden halveras. Mätt i den skarpa filen:
    // bröstmuskeln renderades 7×3 PIXLAR.
    const src = readFileSync(resolve("src/atlas2/muscleIcon.jsx"), "utf8");
    expect(src).toMatch(/\$\{s\} \$\{s\}`/);
  });

  it("ramen centreras på muskeln", () => {
    const src = readFileSync(resolve("src/atlas2/muscleIcon.jsx"), "utf8");
    expect(src).toMatch(/cx - s \/ 2/);
    expect(src).toMatch(/cy - s \/ 2/);
  });

  it("tillräckligt av kroppen syns runt omkring", () => {
    // Utan sammanhang vore en tänd fläck omöjlig att placera på kroppen.
    const src = readFileSync(resolve("src/atlas2/muscleIcon.jsx"), "utf8");
    expect(src).toMatch(/\* 2\.6/);
  });

  it("ramen hålls innanför figuren", () => {
    // Annars hamnar den halvt utanför för muskler vid kanten (vader,
    // underarmar) och halva rutan blir tom.
    const src = readFileSync(resolve("src/atlas2/muscleIcon.jsx"), "utf8");
    expect(src).toMatch(/Math\.max\(fx0, Math\.min/);
    expect(src).toMatch(/Math\.max\(fy0, Math\.min/);
  });

  it("varje region har mätta mått", () => {
    for (const m of ["pectoralis_major", "quadriceps", "biceps_brachii", "calves"]) {
      const r = regionFörMuskel(m);
      expect(r && r.box, m).toBeTruthy();
      const [x0, y0, x1, y1] = r.box;
      expect(x1, m).toBeGreaterThan(x0);
      expect(y1, m).toBeGreaterThan(y0);
    }
  });
});
