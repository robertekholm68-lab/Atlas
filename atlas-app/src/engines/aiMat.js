// AI-UPPSKATTNING AV MAT SOM INTE FINNS I DATABASEN.
//
// Livsmedelsverkets databas har RÅVAROR: "Hamburgare blandfärs stekt" är
// köttbiten, 200 kcal. En burgare från Max är bröd, dressing, ost, bacon och
// ofta pommes bredvid — 600-900 kcal. Sökningen hittade alltså något som hette
// rätt och var fel med en faktor tre, utan att något avslöjade det.
//
// Kedjornas menyer finns inte i någon öppen svensk databas. Claude kan dem
// däremot, från näringsdeklarationer som är offentliga.
//
// TRE REGLER SOM SKILJER DET HÄR FRÅN ATT GISSA:
//
//   1. Modellen anropas BARA när databasen inte räcker. En träff i FOOD_INDEX
//      är alltid bättre — den är mätt, inte minnd.
//   2. Svaret märks som AI-uppskattat hela vägen till loggen, så
//      dataConfidence kan skilja det från en vägd portion.
//   3. Modellen ska säga när den inte vet. En påhittad siffra som ser säker ut
//      är värre än ingen siffra alls.

export const MAT_SYSTEM = `Du uppskattar näringsinnehåll åt en svensk träningsapp.

Användaren beskriver något du inte hittar i Livsmedelsverkets databas — oftast restaurangmat, snabbmatskedjor eller färdigrätter.

SVARA ENDAST MED JSON, inget annat — ingen inledning, inga kodstaket:
{"namn":"Max Original Cheeseburgare","kcal":540,"protein":28,"carbs":40,"fat":28,"gram":230,"säkerhet":"hög","notering":"kort mening"}

REGLER:

Namnet ska vara det användaren skulle känna igen på menyn, inte en beskrivning.

Talen gäller HELA portionen som beskrivs, inte per 100 g. Ange ungefärlig vikt i gram också.

Sätt säkerhet till "hög" när kedjan publicerar näringsvärden du minns tydligt, "medel" när du känner rätten men inte den exakta varianten, "låg" när du resonerar dig fram från liknande rätter.

SÄG NÄR DU INTE VET. Går det inte att uppskatta rimligt: svara {"vet_inte":true,"notering":"varför"}. En påhittad siffra som ser säker ut är värre än ingen siffra alls — appen bygger träningsråd på de här talen.

Nämns ingen mängd, utgå från en normalportion av rätten och skriv det i noteringen.

Noteringen är EN kort mening om vad som är osäkert. Skriv inga kalorital där — de står redan i fälten.`;

/** Tolkar modellens JSON. Kodstaket och inledande text städas bort. */
export function tolkaMatsvar(text) {
  if (!text || typeof text !== "string") return { ok: false, skäl: "tomt" };
  const rensad = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = rensad.indexOf("{");
  const slut = rensad.lastIndexOf("}");
  if (start < 0 || slut <= start) return { ok: false, skäl: "inte-json" };
  let d;
  try { d = JSON.parse(rensad.slice(start, slut + 1)); }
  catch (e) { return { ok: false, skäl: "trasig-json" }; }

  // Modellen fick uttryckligen säga att den inte vet, och det är ett giltigt
  // svar — inte ett fel att dölja.
  if (d && d.vet_inte) {
    return { ok: false, skäl: "vet-inte", notering: String(d.notering || "").trim() };
  }

  const tal = k => {
    const n = Number(d[k]);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  };
  const kcal = tal("kcal");
  if (!d || !d.namn || kcal == null) return { ok: false, skäl: "fel-form" };

  // ORIMLIGA VÄRDEN AVVISAS. Över 3000 kcal i en portion är inte en måltid,
  // det är en feltolkning — och den skulle förgifta dagens summa.
  if (kcal > 3000) return { ok: false, skäl: "orimligt" };

  return {
    ok: true,
    namn: String(d.namn).trim().slice(0, 80),
    kcal,
    protein: tal("protein") || 0,
    carbs: tal("carbs") || 0,
    fat: tal("fat") || 0,
    gram: tal("gram"),
    säkerhet: ["hög", "medel", "låg"].includes(d.säkerhet) ? d.säkerhet : "låg",
    notering: String(d.notering || "").trim(),
  };
}

/**
 * Avgör om databasen räckte.
 *
 * hits === 0 betyder att ingen komponent känts igen alls. Men det farligare
 * fallet är en SVAG träff: "hamburgare från max" hittar köttbiten och ser ut
 * att ha lyckats. Därför frågas modellen också när texten nämner en kedja eller
 * en restaurangrätt som databasen bara har som råvara.
 */
const KEDJOR = [
  "max", "mcdonalds", "mcdonald's", "burger king", "sibylla", "frasses",
  "subway", "o'learys", "olearys", "pizza hut", "domino", "espresso house",
  "waynes", "pressbyrån", "seven eleven", "7-eleven", "taco bar", "bastard",
  "vapiano", "picadeli", "coop", "ica", "hemköp", "willys", "lidl",
];

const RESTAURANGORD = [
  "burgare", "hamburgare", "cheeseburgare", "big mac", "whopper",
  "kebab", "falafelrulle", "pizza", "sushi", "poké", "poke bowl",
  "wrap", "sub", "meny", "combo", "milkshake", "nuggets", "pommes",
];

export function behöverAI(text, estimat) {
  const t = (text || "").toLowerCase();
  if (KEDJOR.some(k => t.includes(k))) return true;
  if (!estimat) return true;
  if (!estimat.hits) return true;
  // En restaurangrätt som matchat databasen har nästan säkert matchat råvaran.
  if (RESTAURANGORD.some(o => t.includes(o))) return true;
  return false;
}
