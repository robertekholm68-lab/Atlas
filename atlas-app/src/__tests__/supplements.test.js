import { describe, it, expect } from "vitest";
import { supplementAdvice } from "../engines/index.js";
import { SUPPLEMENTS, SUPP_BY_ID, SUPP_CATS, SUPP_BRANDS } from "../data/supplements.js";
describe("kosttillskott — katalog", () => {
  it("varje tillskott har namn, dos, evidensnivå, not och giltig kategori", () => {
    expect(SUPPLEMENTS.length).toBeGreaterThanOrEqual(20);
    expect(SUPPLEMENTS.every(s => s.name && s.dose && s.evidence && s.note)).toBe(true);
    expect(SUPPLEMENTS.every(s => SUPP_CATS.includes(s.cat))).toBe(true);
  });
  it("id:n är unika", () => {
    expect(new Set(SUPPLEMENTS.map(s => s.id)).size).toBe(SUPPLEMENTS.length);
  });
  it("svenska tillskottsmärken finns och utesluter rena livsmedelsmärken", () => {
    expect(SUPP_BRANDS.length).toBe(10);
    expect(SUPP_BRANDS).toContain("Star Nutrition");
    ["NOCCO", "Barebells", "Vitamin Well", "ProPud", "Maurten"].forEach(b => expect(SUPP_BRANDS).not.toContain(b));
  });
});
describe("behovs-rådgivare", () => {
  it("föreslår kreatin när man tränar regelbundet", () => {
    const a = supplementAdvice({ sessions: [{}, {}, {}], foodLog: [] });
    expect(a.some(x => x.id === "creatine")).toBe(true);
  });
  it("föreslår protein när man ligger under målet", () => {
    const a = supplementAdvice({ nutritionTotals: { protein: 90 }, nutritionTargets: { protein: 160 }, foodLog: [] });
    expect(a.some(x => x.id === "protein")).toBe(true);
  });
  it("föreslår inte det man redan loggat", () => {
    const a = supplementAdvice({ sessions: [{}, {}], existing: ["creatine"], foodLog: [] });
    expect(a.some(x => x.id === "creatine")).toBe(false);
  });
  it("järn/B12-förslag är medicinskt flaggade", () => {
    const a = supplementAdvice({ sessions: [{}, {}], foodLog: [] });
    a.filter(x => ["iron", "b12"].includes(x.id)).forEach(x => expect(x.medical).toBe(true));
  });
  it("vegan → B12 (måste), alg-omega-3 och vegansk D föreslås", () => {
    const a = supplementAdvice({ profile: { diet: "vegan" }, foodLog: [] });
    const ids = a.map(x => x.id);
    expect(ids).toContain("b12");
    expect(ids).toContain("omega3");
    expect(ids).toContain("vitd");
    expect(a.find(x => x.id === "b12").medical).toBe(true);
  });
  it("vegetarian → B12 lyfts", () => {
    const a = supplementAdvice({ profile: { diet: "vegetarian" }, foodLog: [] });
    expect(a.some(x => x.id === "b12")).toBe(true);
  });
  it("ingen dubblett av B12 även när både kost och lågt intag triggar", () => {
    const now = Date.now();
    const log = [{ ts: now, foodId: "x", grams: 100 }, { ts: now - 864e5, foodId: "y", grams: 100 }];
    const a = supplementAdvice({ profile: { diet: "vegan" }, foodLog: log });
    expect(a.filter(x => x.id === "b12").length).toBe(1);
  });
  it("allätare får inga kost-kategoriska förslag utan data", () => {
    const a = supplementAdvice({ profile: { diet: "omnivore" }, foodLog: [] });
    expect(a.some(x => x.id === "b12")).toBe(false);
  });
  it("keto/LCHF → elektrolyter och magnesium föreslås", () => {
    const a = supplementAdvice({ profile: { dietApproach: "keto" }, foodLog: [] });
    const ids = a.map(x => x.id);
    expect(ids).toContain("electrolytes");
    expect(ids).toContain("magnesium");
  });
});
