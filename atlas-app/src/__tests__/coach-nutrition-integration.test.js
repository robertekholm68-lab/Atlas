import { describe, it, expect } from "vitest";
import { suggestNutritionTargets, resolveNutritionTargets } from "../engines/index.js";
import { coachReply } from "../features/ai-coach/index.jsx";

// Robert-review: den viktigaste buggen var att ett accepterat kalorimål syntes i UI men
// coachen läste ett annat fältnamn (.calories) och betedde sig som om målet saknades.
// Detta test täcker hela kedjan: förslag → acceptera → resolve → coach ser BÅDE kcal och protein.
describe("integration: accepterat kostförslag når hela vägen till coachen", () => {
  const baseCtx = { overallReadiness: null, muscleStates: [], sessions: [], activeProgram: null, goalProfile: null, nutritionDays: 0, measurements: [] };

  it("coachen ser både kalorimål och proteinmål efter accepterat förslag", () => {
    const sug = suggestNutritionTargets({ goal: "cut", weightKg: 82 });
    const profile = { weight: 82, nutritionGoal: "cut", nutritionTargets: {}, nutritionSuggestion: sug, nutritionSuggestionAccepted: true };

    const targets = resolveNutritionTargets(profile, "real");
    expect(targets.source).toBe("atlas_suggestion");
    expect(targets.kcal).toBe(sug.kcal);
    expect(targets.protein).toBe(sug.protein);

    const reply = coachReply("hur ser min kost ut?", { ...baseCtx, nutritionTargets: targets, nutritionTotals: { kcal: 0, protein: 0, carbs: 0, fat: 0 } });
    // Får INTE vara "inga kostmål"-fallbacken
    expect(reply.text).not.toMatch(/inga kostmål/i);
    // Ska nämna både protein- och kalorimålet konkret
    expect(reply.text).toContain(`${targets.protein} g`);
    expect(reply.text).toContain(`${targets.kcal} kcal`);
  });

  it("utan accepterat mål faller coachen tillbaka på 'inga kostmål'", () => {
    const targets = resolveNutritionTargets({ nutritionTargets: {} }, "real");
    const reply = coachReply("hur ser min kost ut?", { ...baseCtx, nutritionTargets: targets, nutritionTotals: { kcal: 0, protein: 0 } });
    expect(reply.text).toMatch(/inga kostmål/i);
  });

  it("omräkning: ändrad vikt ger coachen uppdaterade siffror (inga inaktuella makron)", () => {
    const sug = suggestNutritionTargets({ goal: "cut", weightKg: 82 });
    // profil accepterade vid 82 kg men väger nu 78 kg
    const profile = { weight: 78, nutritionGoal: "cut", nutritionTargets: {}, nutritionSuggestion: sug, nutritionSuggestionAccepted: true };
    const targets = resolveNutritionTargets(profile, "real");
    const fresh = suggestNutritionTargets({ goal: "cut", weightKg: 78 });
    expect(targets.kcal).toBe(fresh.kcal);       // omräknat till 78 kg, inte kvar på 82
    expect(targets.kcal).not.toBe(sug.kcal);
  });
});
