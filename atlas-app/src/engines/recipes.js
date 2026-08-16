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
export function generateWeekMenu({ targets, diet, restrictions, dietApproach, days = 7, seed = 1, preferenser = null } = {}) {
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
  const pref = preferenser && preferenser.tillräckligt ? preferenser : null;
  // Hur många av de senast använda rätterna som spärras per måltid. Tidigare
  // spärrades bara gårdagens, och eftersom poängsättningen premierar kcal-träff
  // så hårt landade veckan på 13–15 unika rätter av 28 måltider — frukosten
  // växlade mellan två. En veckomeny som upprepar sig är inte meal prep.
  //
  // Spärren följer poolens storlek: med fyra eller fler kandidater spärras tre,
  // vilket garanterar minst fyra olika rätter per måltid över veckan. Med ett
  // smalt urval (vegansk + glutenfri kost har EN frukost) spärras inget — då är
  // upprepning oundviklig, och att vägra vore sämre än att upprepa.
  const SPÄRR_MAX = 3;
  const out = [], nyliga = {};
  for (let d = 0; d < days; d++) {
    const meals = [];
    MEALS.forEach(m => {
      const pool = byMeal[m.id];
      const spärr = Math.min(Math.max(0, pool.length - 1), SPÄRR_MAX);
      const undvik = (nyliga[m.id] || []).slice(0, spärr);
      const cands = pool.filter(r => !undvik.includes(r.id));
      const list = cands.length ? cands : pool;
      let pick;
      if (kcalTarget) {
        const want = kcalTarget * SHARE[m.id];
        const scored = list.map(r => {
          const mac = recipeMacros(r);
          let score = Math.abs(mac.kcal - want);
          if (proteinTarget) score -= Math.min(mac.protein, proteinTarget * SHARE[m.id] * 1.5) * 1.2; // premiera protein
          // PREFERENSER DÄMPAR, DE STYR INTE.
          //
          // En rätt man ätit ofta får ett avdrag, men taket är 60 poäng — mindre
          // än vad ett kcal-fel på 60 kcal kostar. Alltså kan en favorit aldrig
          // tränga undan en rätt som passar dagsmålet väsentligt bättre.
          //
          // Utan taket skulle veckan kollapsa till de fem rätter man loggat
          // flest gånger, och variationsspärren nedan vore verkningslös. En
          // meny som bara föreslår det man redan äter är ingen meny.
          if (pref && pref.tillräckligt) {
            const n = pref.gillar[r.id] || 0;
            if (n > 0) score -= Math.min(60, n * 18);
          }
          return { r, score: score + rand() * 40 };                      // lite variation
        }).sort((a, b) => a.score - b.score);
        pick = scored[0].r;
      } else pick = list[Math.floor(rand() * list.length)];
      nyliga[m.id] = [pick.id, ...(nyliga[m.id] || [])].slice(0, SPÄRR_MAX + 2);
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

/**
 * Räknar om en dag efter att en rätt bytts.
 *
 * SAMMA SKALNING SOM generateWeekMenu. Dagen skalas mot kcal-målet med samma
 * tak (±40 %) och samma avrundning till 0,05. Utan det skulle en bytt rätt ge
 * andra portioner än en genererad, och två vägar till samma tal glider isär.
 */
export function räknaOmDag(meals, kcalTarget) {
  const bas = meals.map(x => ({ ...x, macros: recipeMacros(x.recipe) }));
  const raw = bas.reduce((a, x) => ({
    kcal: a.kcal + x.macros.kcal, protein: a.protein + x.macros.protein,
    carbs: a.carbs + x.macros.carbs, fat: a.fat + x.macros.fat,
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  let scale = 1;
  if (kcalTarget && raw.kcal > 0) scale = Math.round(Math.max(0.7, Math.min(1.4, kcalTarget / raw.kcal)) * 20) / 20;
  const scaled = bas.map(x => ({
    ...x, servings: scale,
    macros: {
      kcal: Math.round(x.macros.kcal * scale), protein: Math.round(x.macros.protein * scale),
      carbs: Math.round(x.macros.carbs * scale), fat: Math.round(x.macros.fat * scale),
    },
  }));
  const totals = scaled.reduce((a, x) => ({
    kcal: a.kcal + x.macros.kcal, protein: a.protein + x.macros.protein,
    carbs: a.carbs + x.macros.carbs, fat: a.fat + x.macros.fat,
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  return { meals: scaled, totals, scale };
}

/**
 * Alternativ till en måltid, rangordnade efter hur nära de ligger måltidens
 * andel av dagsmålet. Samma SHARE och samma poängsättning som generatorn.
 *
 * Den nuvarande rätten utesluts — den står redan där, och att visa den som ett
 * "alternativ" vore att erbjuda ett byte till samma sak.
 */
export function alternativFör({ mealId, nuvarandeId, targets, diet, restrictions, dietApproach, max = 12 } = {}) {
  const pool = filterRecipes({ diet, restrictions, dietApproach }).filter(r => r.meal === mealId);
  const kcalTarget = (targets && targets.kcal) || null;
  const proteinTarget = (targets && targets.protein) || null;
  const SHARE = { breakfast: 0.25, lunch: 0.32, dinner: 0.33, snack: 0.10 };
  const want = kcalTarget ? kcalTarget * (SHARE[mealId] || 0.25) : null;

  return pool
    .filter(r => r.id !== nuvarandeId)
    .map(r => {
      const mac = recipeMacros(r);
      if (!want) return { recipe: r, macros: mac, score: 0 };
      let score = Math.abs(mac.kcal - want);
      if (proteinTarget) score -= Math.min(mac.protein, proteinTarget * (SHARE[mealId] || 0.25) * 1.5) * 1.2;
      return { recipe: r, macros: mac, score };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, max);
}

/**
 * MATPREFERENSER, HÄRLEDDA UR BETEENDE.
 *
 * Appen frågar aldrig "vilka rätter gillar du" — en enkät man fyller i en gång
 * åldras illa, och de flesta orkar inte. I stället läses två signaler som redan
 * finns:
 *
 *   LOGGAT   Ett recept man loggat har man ätit. Upprepade loggningar av samma
 *            rätt är den starkaste signalen appen har.
 *   BYTT     Ett recept man bytt BORT ur veckomenyn har man aktivt valt att
 *            inte äta. Svagare än en loggning, men entydig.
 *
 * VIKTNING. Loggat väger tyngre än bortvalt, eftersom en loggning kräver att man
 * lagat och ätit rätten medan ett byte bara kräver ett tryck. Och en rätt kan
 * bytas bort en vecka och lagas nästa — då ska loggningen vinna.
 *
 * INGEN GISSNING OM SMAK. Funktionen säger vad som hänt, inte varför. Att en
 * rätt bytts bort tre gånger betyder inte att användaren ogillar broccoli; det
 * betyder att just den rätten valts bort, och det är allt vi vet.
 */
export function matpreferenser({ foodLog = [], byten = {}, dagar = 90 } = {}) {
  const från = Date.now() - dagar * 864e5;
  const gillar = {}, ogillar = {};

  for (const p of foodLog) {
    if (!p || !p.recipeId || !(p.ts >= från)) continue;
    gillar[p.recipeId] = (gillar[p.recipeId] || 0) + 1;
  }
  // Bytena bär { "0:lunch": receptId } — alltså det man bytte TILL. Det är också
  // en positiv signal, men svagare än en loggning: man har valt rätten, inte ätit
  // den. Att räkna den som en halv loggning gör att ett byte inte kan väga över
  // en rätt man faktiskt lagat.
  for (const id of Object.values(byten)) {
    if (!id) continue;
    gillar[id] = (gillar[id] || 0) + 0.5;
  }

  return {
    gillar,
    ogillar,
    antalSignaler: Object.keys(gillar).length + Object.keys(ogillar).length,
    // Hur mycket vi faktiskt vet. Under fem signaler är underlaget för tunt för
    // att påverka en hel vecka — då ska generatorn köra som vanligt.
    tillräckligt: Object.keys(gillar).length >= 5,
  };
}

/**
 * MÅLTIDSTYP HÄRLEDS UR KLOCKSLAGET — den frågas aldrig.
 *
 * Varje loggpost bär redan en tidstämpel, så appen vet när man åt; den visade
 * det bara aldrig. Att i stället lägga till ett valsteg vid loggningen hade
 * kostat ett tryck varje gång, och matloggning är redan det som oftast hoppas
 * över. Ett extra steg där gör mer skada än grupperingen gör nytta.
 *
 * GRÄNSERNA ÄR SCHABLONER, inte sanningar. Den som jobbar natt äter middag
 * klockan fyra på morgonen, och då är etiketten fel. Därför går den att ändra
 * på posten — men man behöver aldrig sätta den.
 *
 * Samma fyra typer som recepten använder, så en loggad rätt och ett recept talar
 * samma språk.
 */
export function måltidAvTid(ts) {
  const h = new Date(ts).getHours();
  if (h < 10) return "breakfast";
  if (h < 14) return "lunch";
  if (h < 17) return "snack";
  return "dinner";
}

export const MÅLTID_SV = {
  breakfast: "Frukost", lunch: "Lunch", snack: "Mellanmål", dinner: "Middag",
};

/** Ordningen de visas i — kronologisk, inte alfabetisk. */
export const MÅLTID_ORDNING = ["breakfast", "lunch", "snack", "dinner"];

/**
 * Grupperar loggposter per måltid och summerar varje grupp.
 *
 * Postens egen `meal` vinner över klockslaget: har någon rättat en middag som
 * åts klockan fyra ska rättelsen stå kvar. Tomma grupper utelämnas — en rubrik
 * utan innehåll är brus.
 */
export function grupperaMåltider(poster, näringFör) {
  const grupper = {};
  for (const e of poster || []) {
    if (!e) continue;
    const typ = e.meal || måltidAvTid(e.ts);
    (grupper[typ] = grupper[typ] || []).push(e);
  }
  return MÅLTID_ORDNING.filter(t => grupper[t] && grupper[t].length).map(typ => {
    const rader = grupper[typ];
    const summa = rader.reduce((a, e) => {
      const n = näringFör ? näringFör(e) : e;
      return {
        kcal: a.kcal + (Number(n.kcal) || 0),
        protein: a.protein + (Number(n.protein) || 0),
      };
    }, { kcal: 0, protein: 0 });
    return { typ, namn: MÅLTID_SV[typ], rader, kcal: Math.round(summa.kcal), protein: Math.round(summa.protein) };
  });
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
