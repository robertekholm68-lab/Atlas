// MOTOR: Profilen — en sanning om vem användaren är.
//
// BAKGRUNDEN, som är hela skälet att filen finns:
//
// v3 satte bara `sex` (på startsidan) plus några fält som råkade skrivas där de
// användes — `diet` i meal prep, `nutStyle` i matakuten, `supplements` i
// tillskottspanelen. Samtidigt LÄSTE motorerna en betydligt större uppsättning:
// `gender`, `height`, `weight`, `age`, `nutritionGoal`, `dietApproach`,
// `injuryNotes`. De fälten fanns aldrig, så motorerna föll tillbaka på
// standardvärden utan att någon fick veta det.
//
// EN TYST BUGG FÖLL UT AV DETTA: `bodyfat.js` och mikronäringsreferenserna
// läser `profile.gender`, men v3 skriver `sex`. Raden `profile.gender ||
// "male"` gjorde alltså att EN KVINNA FICK MANLIGA REFERENSVÄRDEN — i
// kroppsfettsformeln (som har olika konstanter per kön) och i järnreferensen
// (där kvinnors RI är nästan dubbelt så hög). Ingen felmeddelande, bara ett
// tyst felaktigt tal. Det är precis den sortens fel appens ärlighetslag finns
// för att förhindra, och det kunde bara upptäckas genom att läsa båda sidor av
// gränssnittet samtidigt.
//
// Lösningen är inte att jaga fältnamn i tjugo filer utan att ha ETT ställe som
// definierar profilen och normaliserar den. Motorerna får sin form, vyerna sin,
// och ingen behöver gissa.

/** Kön: v3 lagrar `sex` ("m"/"f"), motorerna vill ha `gender` ("male"/"female"). */
const KÖN_TILL_GENDER = { m: "male", man: "male", male: "male", f: "female", kvinna: "female", female: "female" };

export const KOSTHÅLLNINGAR = [
  { id: "omnivore", namn: "Blandkost" },
  { id: "pescetarian", namn: "Pescetarian" },
  { id: "vegetarian", namn: "Vegetarian" },
  { id: "vegan", namn: "Vegan" },
];
export const KOSTUPPLÄGG = [
  { id: null, namn: "Inget särskilt", beskrivning: "Vanlig fördelning av kolhydrater och fett." },
  { id: "highprotein", namn: "Högprotein", beskrivning: "Proteinet höjs; övrigt fördelas som vanligt." },
  { id: "lchf", namn: "LCHF", beskrivning: "Kolhydraterna kapas, fettet fyller resten." },
  { id: "keto", namn: "Keto", beskrivning: "Kolhydraterna kapas hårt." },
];
export const NIVÅER = [
  { id: "beginner", namn: "Nybörjare", beskrivning: "Under ett år av regelbunden styrketräning." },
  { id: "intermediate", namn: "Van", beskrivning: "Ett till tre år, teknik sitter." },
  { id: "advanced", namn: "Erfaren", beskrivning: "Flera år, vet vad kroppen tål." },
];

/**
 * Vad varje fält FAKTISKT låser upp. Listan är kravet: ett fält som inte
 * påverkar något ska inte efterfrågas. Att fråga om saker man inte använder är
 * ett sätt att slösa med någons tid och tålamod.
 */
export const FÄLT = [
  { id: "sex", namn: "Kön", krävsFör: ["Kroppsfettsberäkning", "Näringsreferenser (bl.a. järn)"], typ: "val" },
  { id: "age", namn: "Ålder", krävsFör: ["Kaloribehov"], typ: "tal", enhet: "år", min: 13, max: 100 },
  { id: "height", namn: "Längd", krävsFör: ["Kroppsfettsberäkning", "Kaloribehov"], typ: "tal", enhet: "cm", min: 120, max: 230 },
  { id: "level", namn: "Träningsvana", krävsFör: ["Programval", "Progressionstakt"], typ: "val" },
  { id: "diet", namn: "Kosthållning", krävsFör: ["Receptförslag", "Veckomeny"], typ: "val" },
  { id: "dietApproach", namn: "Kostupplägg", krävsFör: ["Näringsmål (makrofördelning)"], typ: "val", frivilligt: true },
  { id: "injuryNotes", namn: "Skador och besvär", krävsFör: ["Övningsval", "Coachens hänsyn"], typ: "text", frivilligt: true },
];

/**
 * Normaliserar profilen till den form MOTORERNA förväntar sig.
 *
 * Ren funktion: rör aldrig det lagrade objektet, härleder bara. Vyerna sparar
 * fortsatt v3-formen (`sex`), och det här översätter vid varje läsning — så att
 * en framtida vy inte kan glömma det.
 *
 * Vikten kommer INTE härifrån utan ur vikthistoriken, som är den loggade
 * sanningen. `profile.weight` från v2 respekteras bara som fallback.
 */
export function normaliseraProfil(profile, { weights = [] } = {}) {
  const p = profile || {};
  const senasteVikt = (weights || []).length
    ? weights.slice().sort((a, b) => a.ts - b.ts)[weights.length - 1].kg
    : null;
  return {
    ...p,
    // Bron som saknades. `gender` härleds ur `sex` — aldrig tvärtom, eftersom
    // `sex` är det v3 lagrar och det som onboardingen skriver.
    gender: p.gender || KÖN_TILL_GENDER[String(p.sex || "").toLowerCase()] || null,
    weight: senasteVikt != null ? senasteVikt : (p.weight != null ? p.weight : null),
  };
}

/**
 * Vad saknas, och vad blockerar det?
 *
 * Ärlighet framför tysta standardvärden: i stället för att låta motorerna falla
 * tillbaka på "male" och 175 cm redovisas luckan, med vad den kostar. Frivilliga
 * fält räknas inte som luckor — de är val, inte brist.
 *
 * Returnerar { saknas: [...], harAllt, blockerat: [...] } där `blockerat` är de
 * unika funktioner som inte fungerar fullt ut.
 */
export function profilLuckor(profile) {
  const p = profile || {};
  const saknas = FÄLT.filter(f => !f.frivilligt).filter(f => {
    const v = p[f.id];
    return v == null || v === "" || (Array.isArray(v) && !v.length);
  });
  const blockerat = [...new Set(saknas.flatMap(f => f.krävsFör))];
  return { saknas, harAllt: saknas.length === 0, blockerat };
}

/**
 * Sammanfogar profiländringar UTAN att röra något som inte redigerats.
 *
 * Samma lag som `mergeProfileFromOnboarding` i v2, och av samma skäl: profilen
 * bär mer än formulärets fält — supplements, id:n, tidsstämplar — och en
 * omstart av onboardingen får aldrig radera dem. Bara nycklar som finns i
 * `ändringar` skrivs; ett fält man rensat sätts till null, inte bort.
 */
export function sammanfogaProfil(befintlig, ändringar) {
  const b = befintlig || {};
  const ä = ändringar || {};
  const ut = { ...b };
  Object.keys(ä).forEach(k => { ut[k] = ä[k]; });
  return ut;
}

/** Läsbar sammanfattning för en profilvy. Streck där data saknas, aldrig nollor. */
export function profilSammanfattning(profile, { weights = [] } = {}) {
  const n = normaliseraProfil(profile, { weights });
  const namn = id => {
    if (id === "diet") return (KOSTHÅLLNINGAR.find(k => k.id === n.diet) || {}).namn || null;
    if (id === "dietApproach") return (KOSTUPPLÄGG.find(k => k.id === n.dietApproach) || {}).namn || null;
    if (id === "level") return (NIVÅER.find(k => k.id === n.level) || {}).namn || null;
    if (id === "sex") return n.gender === "female" ? "Kvinna" : n.gender === "male" ? "Man" : null;
    return n[id] != null && n[id] !== "" ? String(n[id]) : null;
  };
  return FÄLT.map(f => ({ ...f, värde: namn(f.id), saknas: namn(f.id) == null && !f.frivilligt }));
}
