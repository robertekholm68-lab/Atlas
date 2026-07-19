import { describe, it, expect } from "vitest";
import { navyBodyFat, bodyComposition, bfCategory, derivedBodyFat, recommendedProtein } from "../engines/bodyfat.js";

describe("bodyfat: US Navy-metoden", () => {
  it("räknar rimligt kroppsfett för man", () => {
    const bf = navyBodyFat({ gender: "male", height: 180, neck: 38, waist: 88 });
    expect(bf).toBeGreaterThan(10);
    expect(bf).toBeLessThan(25);
  });

  it("räknar rimligt kroppsfett för kvinna (kräver höft)", () => {
    const bf = navyBodyFat({ gender: "female", height: 165, neck: 32, waist: 72, hip: 98 });
    expect(bf).toBeGreaterThan(18);
    expect(bf).toBeLessThan(38);
  });

  it("kräver höftmått för kvinna", () => {
    expect(navyBodyFat({ gender: "female", height: 165, neck: 32, waist: 72 })).toBeNull();
  });

  it("returnerar null vid ogiltiga mått (midja ≤ hals)", () => {
    expect(navyBodyFat({ gender: "male", height: 180, neck: 90, waist: 88 })).toBeNull();
  });

  it("returnerar null vid saknade mått", () => {
    expect(navyBodyFat({ gender: "male", height: 180, neck: 38 })).toBeNull();
    expect(navyBodyFat({})).toBeNull();
  });

  it("filtrerar orimliga värden (utanför 1–75 %)", () => {
    // extrem midja relativt hals kan ge orimligt värde → null
    const bf = navyBodyFat({ gender: "male", height: 300, neck: 30, waist: 31 });
    expect(bf === null || (bf >= 1 && bf <= 75)).toBe(true);
  });

  it("bodyComposition ger fettmassa + fettfri massa som summerar till vikten", () => {
    const c = bodyComposition({ gender: "male", height: 180, neck: 38, waist: 88, weight: 82.4 });
    expect(c).not.toBeNull();
    expect(c.fatMass + c.leanMass).toBeCloseTo(82.4, 0);
    expect(c.leanMass).toBeGreaterThan(c.fatMass);
    expect(typeof c.category).toBe("string");
  });

  it("bodyComposition utan vikt ger null massor men behåller procent", () => {
    const c = bodyComposition({ gender: "male", height: 180, neck: 38, waist: 88 });
    expect(c.bodyFat).toBeGreaterThan(0);
    expect(c.fatMass).toBeNull();
    expect(c.leanMass).toBeNull();
  });

  it("bfCategory klassificerar i stigande ordning", () => {
    expect(bfCategory("male", 4)).toBe("Essentiellt fett");
    expect(bfCategory("male", 12)).toBe("Atletisk");
    expect(bfCategory("male", 40)).toBe("Över genomsnitt");
    expect(bfCategory("female", 12)).toBe("Essentiellt fett");
    expect(bfCategory("female", 40)).toBe("Över genomsnitt");
  });

  it("derivedBodyFat härleder ur profil + måtthistorik", () => {
    const profile = { height: 180, weight: 82.4, gender: "male", measurements: { Hals: 38, Midja: 88 } };
    const d = derivedBodyFat(profile, [{ date: 1, waist: 84, weight: 82.4 }]);
    expect(d).not.toBeNull();
    expect(d.bodyFat).toBeGreaterThan(0);
    expect(d.inputs.waist).toBe(84); // senaste mätningen slår profilens
  });

  it("derivedBodyFat returnerar null utan längd", () => {
    expect(derivedBodyFat({ gender: "male" }, [])).toBeNull();
    expect(derivedBodyFat(null, [])).toBeNull();
  });

  it("recommendedProtein använder fettfri massa när kroppsfett kan härledas", () => {
    const profile = { height: 180, weight: 82.4, gender: "male", measurements: { Hals: 38, Midja: 88 } };
    const rp = recommendedProtein(profile, [{ date: 1, waist: 84, weight: 82.4 }]);
    expect(rp.basis).toBe("lean");
    expect(rp.leanMass).toBeGreaterThan(0);
    expect(rp.grams).toBeGreaterThan(rp.low);
    expect(rp.grams).toBeLessThan(rp.high);
  });

  it("recommendedProtein faller tillbaka på kroppsvikt utan kroppsfettmått", () => {
    const rp = recommendedProtein({ weight: 80 }, []);
    expect(rp.basis).toBe("weight");
    expect(rp.grams).toBe(Math.round(80 * 1.8));
  });

  it("recommendedProtein null utan profil", () => {
    expect(recommendedProtein(null, [])).toBeNull();
  });
});
