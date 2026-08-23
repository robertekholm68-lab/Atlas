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
    // Fiber, socker, mättat fett och salt följer med från förpackningen.
    // null betyder okänt, inte noll — se lookupBarcode.
    ...(träff.fiber != null ? { fiber: träff.fiber } : {}),
    ...(träff.sugar != null ? { sugar: träff.sugar } : {}),
    ...(träff.saturated != null ? { saturated: träff.saturated } : {}),
    ...(träff.salt != null ? { salt: träff.salt } : {}),
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


/**
 * Uppdaterar en post i skafferiet.
 *
 * VÄRDENA ÄR PER 100 G, utom för portionsmat. Redigerar man en vara med
 * portionsMat gäller talen hela portionen — samma regel som när den sparades,
 * annars byter samma post betydelse mitt i.
 */
export function uppdateraSkafferi(skafferi, id, ändringar) {
  return (skafferi || []).map(p => {
    if (p.id !== id) return p;
    const ny = { ...p, ...ändringar };
    // Tal ska vara tal. Ett tomt fält blir 0, inte NaN — en post med NaN i
    // kcal förgiftar hela dagssumman tyst.
    for (const k of ["kcal", "protein", "carbs", "fat", "fiber", "sugar", "saturated", "salt", "portion"]) {
      if (k in ändringar) {
        const v = Number(String(ändringar[k]).replace(",", "."));
        ny[k] = Number.isFinite(v) && v >= 0 ? v : (k === "portion" ? null : 0);
      }
    }
    if ("name" in ändringar) ny.name = String(ändringar.name).trim().slice(0, 80) || p.name;
    return ny;
  });
}

/** Tar bort en vara ur skafferiet. Loggade poster som pekar på den behåller
    sina egna tal — computeNutrition faller tillbaka på dem. */
export function taBortUrSkafferi(skafferi, id) {
  return (skafferi || []).filter(p => p.id !== id);
}


/**
 * EGNA PORTIONER PER VARA.
 *
 * Förpackningen anger en portion; du äter en annan. En skopa proteinpulver är
 * 30 g för tillverkaren men 45 g i din shaker, och att skriva om gramtalet
 * varje gång är precis det slitage som gör att man slutar logga.
 *
 * Sparas på skafferiposten som en lista, inte som ett enda tal — man har ofta
 * flera: "liten skopa 30 g", "stor skopa 45 g".
 */
export function läggTillPortion(skafferi, id, namn, gram) {
  const g = Math.round(Number(gram) || 0);
  if (!(g > 0)) return skafferi || [];
  const rent = String(namn || "").trim().slice(0, 24) || `${g} g`;
  return (skafferi || []).map(p => {
    if (p.id !== id) return p;
    const fanns = (p.portioner || []).filter(x => x.namn.toLowerCase() !== rent.toLowerCase());
    // Högst sex — fler blir en lista att leta i, inte en genväg.
    return { ...p, portioner: [...fanns, { namn: rent, gram: g }].slice(-6) };
  });
}

/** Tar bort en sparad portion. */
export function taBortPortion(skafferi, id, namn) {
  return (skafferi || []).map(p => p.id === id
    ? { ...p, portioner: (p.portioner || []).filter(x => x.namn !== namn) }
    : p);
}

/**
 * Alla portionsval för en vara, i den ordning de bör visas.
 *
 * EGNA FÖRST. Har man sparat en egen portion är det nästan alltid den man
 * menar — förpackningens uppgift är tillverkarens gissning om hur mycket man
 * borde äta, inte hur mycket man faktiskt tar.
 */
export function portionsval(vara) {
  if (!vara) return [];
  const ut = (vara.portioner || []).map(p => ({ ...p, egen: true }));
  if (vara.portion > 0 && !ut.some(x => x.gram === vara.portion)) {
    ut.push({ namn: "Portion", gram: vara.portion, egen: false });
  }
  if (!ut.some(x => x.gram === 100)) ut.push({ namn: "100 g", gram: 100, egen: false });
  return ut;
}
