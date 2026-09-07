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
/** Midnatt den dag `ts` infaller. Lokal tid — dygnet är användarens, inte UTC:s. */
export function dagStart(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Samma kalenderdygn? Lokal tid, av samma skäl. */
export function sammaDygn(a, b) {
  return dagStart(a) === dagStart(b);
}

/**
 * TIDSSTÄMPEL FÖR EN POST PÅ EN VALD DAG.
 *
 * KLOCKSLAGET FÖLJER MED, dygnet byts. Loggar man gårdagens middag klockan 20
 * blir posten gårdagen 20:00, inte gårdagen 00:00.
 *
 * Det är inte kosmetika: `måltidAvTid()` härleder frukost/lunch/mellanmål/
 * middag ur timmen. Med midnatt som stämpel hade allt man loggar i efterhand
 * hamnat som frukost, och grupperingen i översikten blivit obrukbar för just
 * de dagar man rättar.
 *
 * Är den valda dagen dagens datum returneras `nu` orört — då finns ingen
 * anledning att räkna om något.
 */
export function stämplaDag(valdDag, nu = Date.now()) {
  if (valdDag == null || sammaDygn(valdDag, nu)) return nu;
  const d = new Date(valdDag);
  const k = new Date(nu);
  d.setHours(k.getHours(), k.getMinutes(), k.getSeconds(), k.getMilliseconds());
  return d.getTime();
}

/**
 * Flyttar en post till ett nytt datum och klockslag.
 *
 * `datum` är "ÅÅÅÅ-MM-DD" och `tid` är "TT:MM" — formaten som <input type=
 * "date"> och <input type="time"> ger. Går något inte att tolka returneras
 * posten oförändrad: en felskriven tid ska inte kunna kasta en måltid till
 * 1970.
 */
export function flyttaPost(post, datum, tid) {
  if (!post) return post;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(datum || ""));
  if (!m) return post;
  const t = /^(\d{2}):(\d{2})$/.exec(String(tid || ""));
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]),
    t ? Number(t[1]) : 12, t ? Number(t[2]) : 0, 0, 0);
  const ts = d.getTime();
  if (!Number.isFinite(ts)) return post;
  return { ...post, ts };
}

/**
 * Dagar som har minst en loggad post, nyast först.
 *
 * Används för att kunna hoppa till "förra dagen jag loggade" i stället för att
 * stega en dag i taget genom en tom vecka.
 */
export function dagarMedLogg(foodLog) {
  const set = new Set();
  for (const e of foodLog || []) if (e && e.ts != null) set.add(dagStart(e.ts));
  return [...set].sort((a, b) => b - a);
}

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
    // HUR MÅNGA KOMPONENTER DATABASEN KÄNDE IGEN.
    //
    // Utan detta går det inte att skilja "100 g keso" — en exakt träff i
    // Livsmedelsverkets bank — från "mormors köttbullelåda", som bara fick en
    // svag delmatchning. Erbjudandet att spara i skafferiet ska bara komma för
    // det senare; för keso vore det brus, varan finns redan sökbar.
    hits: est.hits || 0,
    ts: nowMs,
  };
}
