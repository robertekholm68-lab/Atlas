// SKAFFERIET — livsmedel du själv lagt till.
//
// Två problem med samma lösning:
//
//   1. EN SKANNAD VARA GÅR INTE ATT HITTA IGEN. Streckkodsläsaren hämtar från
//      Open Food Facts och loggar direkt, men varan sparas ingenstans. Nästa
//      gång måste man skanna om — och står burken hemma medan man är i affären
//      finns ingen väg alls.
//
//   2. MAT MAN ÄTER OFTA måste sökas fram varje gång, även när det är samma
//      fem saker vecka ut och vecka in.
//
// searchFoods söker bara i FOOD_INDEX (Livsmedelsverket). Skafferiet läggs
// bredvid: samma form, samma sökning, men poster användaren äger.
//
// FORMEN ÄR FOOD_INDEX FORM. { id, name, kcal, protein, carbs, fat } per 100 g.
// Avviker den går sökningen och portionsräkningen sönder på ställen som inte
// har med skafferiet att göra.

/** Nyckel i store. Egen från övriga listor så den kan rensas separat. */
export const SKAFFERI_NYCKEL = "skafferi";

/**
 * Bygger en skafferipost ur en skannad OFF-vara.
 *
 * Streckkoden följer med: skannar man samma vara igen ska den kännas igen som
 * en redan sparad, inte skapa en dubblett.
 */
export function skafferiFrånStreckkod(träff) {
  if (!träff || !träff.name) return null;
  return {
    id: `own_${träff.code || Date.now().toString(36)}`,
    name: träff.brand ? `${träff.name} (${träff.brand})` : träff.name,
    kcal: Math.round(träff.kcal || 0),
    protein: Math.round((träff.protein || 0) * 10) / 10,
    carbs: Math.round((träff.carbs || 0) * 10) / 10,
    fat: Math.round((träff.fat || 0) * 10) / 10,
    group: "Eget",
    barcode: träff.code || null,
    // Portionen från förpackningen är värd att spara — den är varans egen
    // uppgift, inte en gissning, och sparar ett steg vid varje loggning.
    portion: träff.portion || null,
    källa: "off",
    tillagd: Date.now(),
  };
}

/**
 * Bygger en skafferipost ur en redan loggad måltid.
 *
 * Poster utan gramtal (fritext, foto, AI) bär en färdig summa. Den sparas som
 * en PORTION, inte som per-100-g-värden: "min vanliga frukost" är en portion,
 * inte ett kilo gröt. Att räkna om till 100 g hade gett tal som ser exakta ut
 * men bygger på en gissad vikt.
 */
export function skafferiFrånPost(post) {
  if (!post || !post.name) return null;
  const g = Number(post.grams) || 0;
  if (g > 0) {
    const k = 100 / g;
    return {
      id: `own_${Date.now().toString(36)}`,
      name: post.name,
      kcal: Math.round((post.kcal || 0) * k),
      protein: Math.round((post.protein || 0) * k * 10) / 10,
      carbs: Math.round((post.carbs || 0) * k * 10) / 10,
      fat: Math.round((post.fat || 0) * k * 10) / 10,
      group: "Eget",
      portion: g,
      källa: post.source || "logg",
      tillagd: Date.now(),
    };
  }
  // Ingen vikt: spara som en portion med de tal posten har.
  return {
    id: `own_${Date.now().toString(36)}`,
    name: post.name,
    portionsMat: true,
    kcal: Math.round(post.kcal || 0),
    protein: Math.round(post.protein || 0),
    carbs: Math.round(post.carbs || 0),
    fat: Math.round(post.fat || 0),
    group: "Eget",
    källa: post.source || "logg",
    tillagd: Date.now(),
  };
}

/** Finns varan redan? Streckkod först, annars namn. */
export function redanISkafferiet(skafferi, ny) {
  if (!ny) return null;
  const lista = skafferi || [];
  if (ny.barcode) {
    const p = lista.find(x => x.barcode && x.barcode === ny.barcode);
    if (p) return p;
  }
  const n = String(ny.name || "").trim().toLowerCase();
  return lista.find(x => String(x.name || "").trim().toLowerCase() === n) || null;
}

/**
 * Lägger till utan att skapa dubbletter.
 *
 * Finns varan redan uppdateras den i stället — näringsvärden i Open Food Facts
 * ändras när tillverkare ändrar recept, och den nyare uppgiften är den bättre.
 */
export function läggISkafferi(skafferi, ny) {
  if (!ny) return skafferi || [];
  const lista = skafferi || [];
  const fanns = redanISkafferiet(lista, ny);
  if (!fanns) return [...lista, ny];
  return lista.map(x => (x.id === fanns.id ? { ...ny, id: fanns.id, tillagd: fanns.tillagd } : x));
}

/**
 * Hur ofta varje skafferipost använts, ur matloggen.
 *
 * Används för att sortera skafferiet: det man äter ofta ska stå först, inte det
 * man råkade spara senast. Räknas ur beteende, inte ur en favoritmarkering man
 * måste komma ihåg att sätta.
 */
export function skafferiFrekvens(skafferi, foodLog, dagar = 60) {
  const från = Date.now() - dagar * 864e5;
  const antal = {};
  const namn = {};
  for (const p of skafferi || []) namn[String(p.name || "").toLowerCase()] = p.id;
  for (const e of foodLog || []) {
    if (!e || !(e.ts >= från)) continue;
    const id = e.ownId || namn[String(e.name || "").toLowerCase()];
    if (id) antal[id] = (antal[id] || 0) + 1;
  }
  return antal;
}

/** Skafferiet sorterat: oftast använt först, sedan senast tillagt. */
export function sorteratSkafferi(skafferi, foodLog) {
  const f = skafferiFrekvens(skafferi, foodLog);
  return [...(skafferi || [])].sort((a, b) => {
    const d = (f[b.id] || 0) - (f[a.id] || 0);
    return d !== 0 ? d : (b.tillagd || 0) - (a.tillagd || 0);
  });
}
