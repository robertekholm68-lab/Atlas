// Askr 2.0 — snabbloggens rena hjälpare.
//
// INGEN NY NÄRINGSLOGIK. Uppskattningen görs av mealDecision/estimateMeal i
// engines/ (samma motor som nuvarande appens Quick Log). Här byggs bara
// loggposten av motorns svar — testbart utan webbläsare. Coachens kost-
// kontext bor i store.js (nutritionCtx) — en sanning, inte två.
//
// Fältnamnet är `kcal`, aldrig `calories`. Lag i projektet.

/**
 * Bygger en loggpost av en uppskattad måltid.
 *
 * `quality: "estimated"` är inte metadata-prydnad: computeNutrition räknar de
 * posterna som osäkra, dayNutritionRange breddar intervallet, och översikten
 * märker posten "uppskattat" för användaren. En uppskattning som ser exakt ut
 * är precis den sortens påhittade siffra Askr inte visar.
 *
 * `id` sätts av anroparen (store.nyId) — samma id-stämpling som övriga poster.
 */
export function buildEstimatedEntry(text, est, nowMs = Date.now()) {
  if (!est) return null;
  return {
    name: String(text || "").trim() || "Måltid",
    kcal: est.kcal,
    protein: est.protein,
    carbs: est.carbs,
    fat: est.fat,
    estimateLow: est.estimateLow,
    estimateHigh: est.estimateHigh,
    assumptions: est.assumptions || null,
    quality: "estimated",
    ts: nowMs,
  };
}
