// MOTOR: recept & veckomenyer. Rena funktioner, deterministiska.
// Makron räknas ur ingredienserna mot livsmedelsdatabasen — aldrig handskrivna värden.
// Kost- och allergiegenskaper härleds ur ingredienserna, så märkningen aldrig kan glida
// isär från innehållet.
import { FOOD_INDEX, FOODS } from "../data/foods.js";
import { RECIPES, FOOD_TRAITS, MEALS } from "../data/recipes.js";

const byId = id => FOOD_INDEX.find(f => f.id === id) || FOODS.find(f => f.id === id) || null;

// Makron per portion, räknat ur ingredienserna.
export function recipeMacros(recipe) {
  if (!recipe || !recipe.i) return null;
  let kcal = 0, protein = 0, carbs = 0, fat = 0, known = 0;
  recipe.i.forEach(ing => {
    const f = byId(ing.id); if (!f) return;
    const k = ing.g / 100; known++;
    kcal += (f.kcal || 0) * k; protein += (f.protein || 0) * k;
    carbs += (f.carbs || 0) * k; fat += (f.fat || 0) * k;
  });
  const s = Math.max(1, recipe.servings || 1);
  return {
    kcal: Math.round(kcal / s), protein: Math.round(protein / s),
    carbs: Math.round(carbs / s), fat: Math.round(fat / s),
    complete: known === recipe.i.length,
  };
}

// Vilken kosthållning receptet passar: vegan ⊂ vegetarian ⊂ pescetarian ⊂ omnivore.
export function recipeDiet(recipe) {
  const tags = new Set();
  let unknown = false;
  (recipe.i || []).forEach(ing => {
    const tr = FOOD_TRAITS[ing.id];
    if (!tr) { unknown = true; return; }
    (tr.t || []).forEach(t => tags.add(t));
  });
  if (tags.has("meat")) return "omnivore";
  if (tags.has("fish") || tags.has("shellfish")) return "pescetarian";
  // Försiktighetsprincip: en otaggad ingrediens gör att receptet klassas som "vanligt".
  // Felriktningen är medveten — ett veganskt recept som visas för allätare är harmlöst,
  // ett laxrecept i en vegansk veckomeny är ett svek.
  if (unknown) return "omnivore";
  if (tags.has("dairy") || tags.has("egg")) return "vegetarian";
  return "vegan";
}

// Har receptet ingredienser utan taggar? Då kan allergier inte garanteras.
export function recipeHasUnknown(recipe) {
  return (recipe.i || []).some(ing => !FOOD_TRAITS[ing.id]);
}

// Restriktioner receptet krockar med (samma id:n som DIET_RESTRICTIONS).
export function recipeAllergens(recipe) {
  const out = new Set();
  (recipe.i || []).forEach(ing => {
    const t = (FOOD_TRAITS[ing.id] || {}).t || [];
    if (t.includes("lactose")) out.add("lactose");
    if (t.includes("gluten")) out.add("gluten");
    if (t.includes("nuts")) out.add("nuts");
    if (t.includes("shellfish")) out.add("shellfish");
    if (t.includes("egg")) out.add("egg");
    if (t.includes("soy")) out.add("soy");
    if (t.includes("pork")) out.add("pork");
  });
  return [...out];
}

const DIET_RANK = { vegan: 0, vegetarian: 1, pescetarian: 2, omnivore: 3 };

// Passar receptet användarens kostval, kosthållning och restriktioner?
export function recipeFits(recipe, { diet = "omnivore", restrictions = [], dietApproach = null } = {}) {
  // Med restriktioner valda: recept med otaggade ingredienser utesluts — vi kan inte
  // lova att de är fria från t.ex. nötter, och en gissning är värre än ett smalare utbud.
  if ((restrictions || []).length && recipeHasUnknown(recipe)) return false;
  if (DIET_RANK[recipeDiet(recipe)] > DIET_RANK[diet || "omnivore"]) return false;
  const bad = recipeAllergens(recipe);
  if ((restrictions || []).some(r => bad.includes(r))) return false;
  if (dietApproach === "keto" || dietApproach === "lchf") {
    const m = recipeMacros(recipe); if (!m) return false;
    if (m.carbs > (dietApproach === "keto" ? 15 : 30)) return false;   // g per portion
  }
  return true;
}

export function filterRecipes(opts = {}, list = RECIPES) {
  return list.filter(r => recipeFits(r, opts));
}

// Deterministisk pseudoslump så en genererad meny är reproducerbar från sitt frö.
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// Veckomeny som siktar mot användarens kcal/protein-mål. Väljer per måltid det recept
// som för dagen närmast målet, utan att upprepa samma rätt två dagar i rad.
export function generateWeekMenu({ targets, diet, restrictions, dietApproach, days = 7, seed = 1 } = {}) {
  const pool = filterRecipes({ diet, restrictions, dietApproach });
  const byMeal = {};
  MEALS.forEach(m => { byMeal[m.id] = pool.filter(r => r.meal === m.id); });
  const missing = MEALS.filter(m => !byMeal[m.id].length).map(m => m.label);
  if (missing.length) return { days: [], hasData: false, missing, poolSize: pool.length };

  const kcalTarget = (targets && targets.kcal) || null;
  const proteinTarget = (targets && targets.protein) || null;
  // Ungefärlig fördelning av dagens energi över måltiderna.
  const SHARE = { breakfast: 0.25, lunch: 0.32, dinner: 0.33, snack: 0.10 };
  const rand = rng(seed);
  const out = [], lastUsed = {};
  for (let d = 0; d < days; d++) {
    const meals = [];
    MEALS.forEach(m => {
      const cands = byMeal[m.id].filter(r => r.id !== lastUsed[m.id]);
      const list = cands.length ? cands : byMeal[m.id];
      let pick;
      if (kcalTarget) {
        const want = kcalTarget * SHARE[m.id];
        const scored = list.map(r => {
          const mac = recipeMacros(r);
          let score = Math.abs(mac.kcal - want);
          if (proteinTarget) score -= Math.min(mac.protein, proteinTarget * SHARE[m.id] * 1.5) * 1.2; // premiera protein
          return { r, score: score + rand() * 40 };                      // lite variation
        }).sort((a, b) => a.score - b.score);
        pick = scored[0].r;
      } else pick = list[Math.floor(rand() * list.length)];
      lastUsed[m.id] = pick.id;
      meals.push({ meal: m.id, mealLabel: m.label, recipe: pick, macros: recipeMacros(pick) });
    });
    const raw = meals.reduce((a, x) => ({
      kcal: a.kcal + x.macros.kcal, protein: a.protein + x.macros.protein,
      carbs: a.carbs + x.macros.carbs, fat: a.fat + x.macros.fat,
    }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
    // Skala portionerna så dagen faktiskt möter kcal-målet (max ±40 %, annars blir
    // portionerna orimliga — då är det bättre att vara ärlig med avvikelsen).
    let scale = 1;
    if (kcalTarget && raw.kcal > 0) scale = Math.round(Math.max(0.7, Math.min(1.4, kcalTarget / raw.kcal)) * 20) / 20;
    const scaled = meals.map(x => ({ ...x, servings: scale, macros: { kcal: Math.round(x.macros.kcal * scale), protein: Math.round(x.macros.protein * scale), carbs: Math.round(x.macros.carbs * scale), fat: Math.round(x.macros.fat * scale) } }));
    const tot = scaled.reduce((a, x) => ({
      kcal: a.kcal + x.macros.kcal, protein: a.protein + x.macros.protein,
      carbs: a.carbs + x.macros.carbs, fat: a.fat + x.macros.fat,
    }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
    out.push({ day: d, meals: scaled, totals: tot, scale });
  }
  return { days: out, hasData: true, poolSize: pool.length };
}

// Inköpslista: summerar ingredienserna över menyn, grupperat per varukategori.
export function shoppingList(menu) {
  const acc = {};
  (menu && menu.days || []).forEach(d => d.meals.forEach(m => (m.recipe.i || []).forEach(ing => {
    acc[ing.id] = acc[ing.id] || { id: ing.id, g: 0 };
    acc[ing.id].g += ing.g * (m.servings || 1);       // följer portionsskalningen
  })));
  const rows = Object.values(acc).map(x => {
    const f = byId(x.id);
    return { id: x.id, name: f ? f.name : x.id, grams: Math.round(x.g), cat: (FOOD_TRAITS[x.id] || {}).cat || "Övrigt" };
  });
  const cats = ["Protein", "Mejeri", "Kolhydrat", "Frukt & grönt", "Fett", "Snacks", "Övrigt"];
  return cats.map(cat => ({ cat, items: rows.filter(r => r.cat === cat).sort((a, b) => a.name.localeCompare(b.name, "sv")) })).filter(g => g.items.length);
}

// Loggposter för en måltid — så ett recept kan loggas direkt till matloggen.
export function recipeLogEntry(recipe, servings = 1) {
  const m = recipeMacros(recipe);
  return {
    name: recipe.name, kcal: Math.round(m.kcal * servings), protein: Math.round(m.protein * servings),
    carbs: Math.round(m.carbs * servings), fat: Math.round(m.fat * servings),
    quality: "computed", source: "recipe", recipeId: recipe.id,
  };
}
