// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { getLlmConfig, setLlmConfig, hasLlm, coachSystemPrompt, buildGroundingContext, CLAUDE_MODELS } from "../app/llm.js";

beforeEach(() => { try { localStorage.clear(); } catch { } });

describe("llm: nyckelhantering", () => {
  it("saknar config från början", () => {
    expect(getLlmConfig()).toBeNull();
    expect(hasLlm()).toBe(false);
  });
  it("sparar och läser config", () => {
    setLlmConfig({ provider: "claude", model: CLAUDE_MODELS[0].id, key: "sk-ant-test123" });
    const c = getLlmConfig();
    expect(c.key).toBe("sk-ant-test123");
    expect(hasLlm()).toBe(true);
  });
  it("tar bort config", () => {
    setLlmConfig({ provider: "claude", model: "x", key: "y" });
    setLlmConfig(null);
    expect(getLlmConfig()).toBeNull();
    expect(hasLlm()).toBe(false);
  });
  it("hasLlm kräver både nyckel och modell", () => {
    setLlmConfig({ provider: "claude", key: "sk-ant-x" });
    expect(hasLlm()).toBe(false);
  });
  it("erbjuder Claude-modeller med rätt api-id", () => {
    const ids = CLAUDE_MODELS.map(m => m.id);
    expect(ids).toContain("claude-haiku-4-5-20251001");
    expect(ids).toContain("claude-opus-4-8");
  });
});

describe("llm: grundning (systemprompt + kontext)", () => {
  it("systemprompten förbjuder påhittade siffror", () => {
    const s = coachSystemPrompt();
    expect(s.toLowerCase()).toMatch(/aldrig.*siffror|hitta aldrig/);
    expect(s.toLowerCase()).toMatch(/medicinsk/);
  });
  it("kontexten innehåller readiness, mål och kost ur datan", () => {
    const ctx = {
      overallReadiness: 72,
      muscleStates: { pectoralis_major: { recoveryScore: 82 }, quadriceps: { recoveryScore: 40 } },
      activeProgram: { name: "Min PPL" },
      goalReasoning: { type: "recomp", synthesis: "recomp-syntes", components: [{ label: "Muskler", weight: 70, text: "bra volym" }], tradeoffs: ["håll underskott måttligt"] },
      nutritionTotals: { protein: 150, kcal: 2000 },
      nutritionTargets: { protein: 165, kcal: 2200 },
    };
    const c = buildGroundingContext("hur går mitt mål?", ctx, { nextWorkoutName: "Push", muscleId: "pectoralis_major" });
    expect(c).toMatch(/DATAKONTEXT/);
    expect(c).toMatch(/72/);          // readiness
    expect(c).toMatch(/Min PPL/);     // program
    expect(c).toMatch(/recomp-syntes/); // mål
    expect(c).toMatch(/165/);         // proteinmål
    expect(c).toMatch(/Pectoralis/);  // muskelfakta
  });
  it("hanterar tom data utan att krascha", () => {
    const c = buildGroundingContext("hej", { muscleStates: {}, activeProgram: null }, {});
    expect(typeof c).toBe("string");
    expect(c).toMatch(/DATAKONTEXT/);
  });
});
