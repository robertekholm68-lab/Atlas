// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { laggingMuscleAdvice, laggingGroups } from "../engines/index.js";
import { coachReply } from "../features/ai-coach/index.jsx";
describe("släpande muskel — motor", () => {
  it("ger tips och nämner gruppen + progression", () => {
    const t = laggingMuscleAdvice([], "chest");
    expect(/Bröst/i.test(t)).toBe(true);
    expect(/progressiv överbelastning/i.test(t)).toBe(true);
    expect(/protein|sömn/i.test(t)).toBe(true);
  });
  it("låg volym → föreslår att lägga till set (under MEV)", () => {
    const t = laggingMuscleAdvice([], "chest");   // inga pass → 0 set
    expect(/under minsta effektiva volym|Lägg till/i.test(t)).toBe(true);
  });
  it("accepterar muskel-id och mappar till grupp", () => {
    const t = laggingMuscleAdvice([], "biceps_brachii");
    expect(t.length).toBeGreaterThan(50);
  });
});
describe("underarbetade grupper — detektor", () => {
  it("för lite data → inga flaggor", () => {
    expect(laggingGroups([])).toEqual([]);
    expect(laggingGroups([{ completedAt: Date.now(), sets: [] }, { completedAt: Date.now(), sets: [] }])).toEqual([]);
  });
  it("returnerar högst 2 grupper", () => {
    const res = laggingGroups([]);
    expect(res.length).toBeLessThanOrEqual(2);
  });
});
describe("släpande muskel — coach", () => {
  it("'bröstet svarar inte' → rådgivning", () => {
    const r = coachReply("bröstet svarar inte", { sessions: [] });
    expect(/Bröst/i.test(r.text)).toBe(true);
    expect(/set\/vecka|volym/i.test(r.text)).toBe(true);
  });
  it("utan angiven muskel → frågar vilken", () => {
    const r = coachReply("en muskel växer inte", { sessions: [] });
    expect(/[Vv]ilken muskel/.test(r.text)).toBe(true);
  });
});
