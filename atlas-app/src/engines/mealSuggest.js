// MOTOR: måltidsförslag. Rena funktioner, deterministiska.
//
// VARFÖR: skriver man "köttbullar" är det sällan bara köttbullar man ätit. Det
// följde potatis, sås och lingon med — men uppskattaren kan bara räkna det som
// står i texten, så måltiden blir systematiskt underskattad. Den som loggar
// ärligt får fel siffra, vilket är precis fel person att straffa.
//
// Förslagen fyller BARA i textfältet. De loggar ingenting, och de gissar inte
// åt användaren — man ser meningen och kan ändra den innan något sparas. Samma
// hållning som röstloggningen: appen föreslår, användaren bekräftar.
//
// URVALET är svensk husmanskost och vardagsfrukost, inte ett fullständigt
// kokboksregister. En lista som försöker täcka allt blir en lista ingen orkar
// läsa. Varje förslag ska vara något en svensk faktiskt äter en vanlig tisdag.

/**
 * Utlösare → vanliga helheter. Utlösaren matchas mot HELA ord i det användaren
 * skrivit, så "korv" inte träffar "korvbröd" och ger fel förslag.
 */
export const MEAL_TEMPLATES = [
  { ord: ["köttbullar", "köttbull"], förslag: [
    "köttbullar med potatis, gräddsås och lingon",
    "köttbullar med potatismos och lingon",
    "köttbullar med pasta",
  ]},
  { ord: ["pannkakor", "pannkaka", "plättar"], förslag: [
    "pannkakor med sylt",
    "ärtsoppa och pannkakor",
  ]},
  { ord: ["ärtsoppa"], förslag: [
    "ärtsoppa och pannkakor",
    "ärtsoppa med brödskiva",
  ]},
  { ord: ["fralla", "frallor", "småfranska"], förslag: [
    "fralla med ost och skinka",
    "fralla med ost, gurka och tomat",
    "fralla med smörgåsfett och ost",
  ]},
  { ord: ["macka", "mackor", "smörgås"], förslag: [
    "två mackor med ost och skinka",
    "macka med ägg och tomat",
  ]},
  { ord: ["gröt", "havregrynsgröt", "havregröt"], förslag: [
    "gröt med filmjölk och banan",
    "gröt med mjölk och lingon",
  ]},
  { ord: ["filmjölk", "fil"], förslag: [
    "filmjölk med müsli",
    "filmjölk med müsli och banan",
  ]},
  { ord: ["ägg", "äggröra"], förslag: [
    "äggröra med bacon och macka",
    "två kokta ägg och en macka",
  ]},
  { ord: ["kyckling"], förslag: [
    "kyckling med ris och sallad",
    "kyckling med potatis och sås",
  ]},
  { ord: ["lax", "torsk", "fisk"], förslag: [
    "lax med potatis och sås",
    "lax med quinoa och sallad",
  ]},
  { ord: ["pasta", "spagetti", "spaghetti"], förslag: [
    "pasta med köttfärssås",
    "pasta med kyckling och sallad",
  ]},
  { ord: ["korv", "falukorv"], förslag: [
    "falukorv med potatismos och lingon",
    "korv med brödskiva",
  ]},
  { ord: ["blodpudding"], förslag: [
    "blodpudding med lingon",
  ]},
  { ord: ["raggmunk", "raggmunkar"], förslag: [
    "raggmunk med bacon och lingon",
  ]},
  { ord: ["tacos", "taco"], förslag: [
    "tacos med köttfärs, sallad och tomat",
  ]},
  { ord: ["sallad"], förslag: [
    "sallad med kyckling och avokado",
    "sallad med tonfisk och ägg",
  ]},
  { ord: ["müsli", "musli", "flingor"], förslag: [
    "müsli med filmjölk",
    "müsli med yoghurt och banan",
  ]},
];

const ord = s => (s || "").toLowerCase().split(/[^a-zà-ÿ0-9]+/i).filter(Boolean);

/**
 * Förslag på hela måltider utifrån det användaren börjat skriva.
 *
 * Ger inget när texten redan ÄR ett förslag, och inget när den redan innehåller
 * flera komponenter — då vet användaren vad hen åt och ska inte överröstas.
 *
 * @returns string[] — meningar att fylla textfältet med
 */
export function mealSuggestions(text, max = 3) {
  const skrivet = ord(text);
  if (!skrivet.length) return [];

  const ut = [];
  for (const t of MEAL_TEMPLATES) {
    // HELT ord, aldrig ordbörjan: "korvbröd" ska inte dra igång korvförslagen.
    // Böjningarna står i stället utskrivna i listan ovan (köttbullar/köttbull,
    // fralla/frallor), vilket är tydligare än en regel som råkar täcka dem.
    const träff = t.ord.some(o => skrivet.includes(o));
    if (!träff) continue;
    for (const f of t.förslag) {
      // Föreslå inte det som redan står där.
      if (f.toLowerCase() === (text || "").toLowerCase().trim()) continue;
      // Föreslå inte något som säger mindre än det användaren redan skrivit.
      const fOrd = ord(f);
      if (skrivet.every(w => fOrd.includes(w)) && fOrd.length > skrivet.length) ut.push(f);
      else if (!skrivet.every(w => fOrd.includes(w))) ut.push(f);
    }
  }
  return [...new Set(ut)].slice(0, max);
}
