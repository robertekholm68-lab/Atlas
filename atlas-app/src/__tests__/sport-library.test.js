import { describe, it, expect } from "vitest";
import { SPORT_META, SPORT_CATEGORIES, LEGACY_MAP, CAT_LOAD } from "../data/sportLibrary.js";
import { readFileSync } from "fs";

// Ikonerna ligger utanför bygget (public/sport-icons.json) sedan de gjorde webbygget
// så tungt att mobilwebbläsare dog. Testet läser dem därifrån i stället.
const SPORT_LIB = JSON.parse(readFileSync(new URL("../../public/sport-icons.json", import.meta.url), "utf8"));
import { resolveActivity, DEFAULT_ACTIVE_SPORTS } from "../data/exercises.js";

describe("sportbibliotek — integritet", () => {
  it("94 ikoner, 94 metadata, 10 kategorier, alla ikoner är riktig vektor-SVG", () => {
    expect(Object.keys(SPORT_LIB).length).toBe(94);
    // Varje metadata-id måste ha en ikon, annars visas emoji där en vektor väntas.
    expect(Object.keys(SPORT_META).every(id => SPORT_LIB[id])).toBe(true);
    expect(Object.keys(SPORT_META).length).toBe(94);
    expect(SPORT_CATEGORIES.length).toBe(10);
    expect(Object.values(SPORT_LIB).every(s => s.startsWith("<svg") && !s.includes("base64"))).toBe(true);
  });
  it("varje sport har en giltig kategori", () => {
    const cats = new Set(SPORT_CATEGORIES.map(c => c.id));
    expect(Object.values(SPORT_META).every(m => cats.has(m.cat))).toBe(true);
  });
  it("varje kategori har en belastningsmodell", () => {
    expect(SPORT_CATEGORIES.every(c => CAT_LOAD[c.id])).toBe(true);
  });
});

describe("resolveActivity — appens id:n och biblioteks-id:n", () => {
  it("legacy-id (innebandy) och biblioteks-id (floorball) ger samma detaljmodell", () => {
    const a = resolveActivity("innebandy"), b = resolveActivity("floorball");
    expect(a.name).toBe("Innebandy");
    expect(b.name).toBe("Innebandy");            // floorball → detaljmodellen innebandy
    expect(b.libId).toBe("floorball");           // pekar ut relief-ikonen
    expect(a.activation.length).toBeGreaterThan(3);
  });
  it("biblioteks-sport utan detaljmodell får kategori-estimat", () => {
    const r = resolveActivity("basketball");
    expect(r.name).toBe("Basket");
    expect(r.fromLibrary).toBe(true);
    expect(r.cardio).toBe(CAT_LOAD["team-ball"].cardio);
    expect(r.activation.every(a => a.muscleId && typeof a.factor === "number")).toBe(true);
  });
  it("okänt id ger null", () => {
    expect(resolveActivity("finns-inte")).toBe(null);
    expect(resolveActivity(null)).toBe(null);
  });
  it("standard-setet är biblioteks-id:n som alla resolvar", () => {
    expect(DEFAULT_ACTIVE_SPORTS.length).toBeGreaterThanOrEqual(10);
    expect(DEFAULT_ACTIVE_SPORTS.every(id => resolveActivity(id) != null)).toBe(true);
  });
});
