// MOTOR: livsmedelssökning. Rena funktioner, deterministiska.
//
// VARFÖR DEN HÄR FILEN FINNS: matloggen sökte med `name.includes(q)`, vilket
// matchar inuti ord. Det gav resultat som inte bara var oanvändbara utan
// felaktiga — "läsk" gav Fläskfilé som första träff, "fil" gav Kycklingfilé.
// Den som loggade fil fick kyckling.
//
// Två problem behövde lösas, och de är olika till sin natur:
//
//   1. RANGORDNING. Livsmedelsverkets register har långa sammansatta namn
//      ("Färskost m. filmjölk fett ca 8%") vid sidan av korta grundposter
//      ("Filmjölk fett 3% berikad"). Utan poängsättning vinner den som råkar
//      ligga först i arrayen. Ordbörjan ska slå mitt-i-ordet, och kort namn
//      ska slå långt: den korta posten ÄR grundvaran.
//
//   2. SPRÅK. Registret heter saker som "Bröd vitt vete fibrer ca 2,5% typ
//      baguette". Ingen skriver så. Folk skriver fralla, macka, fil, läsk.
//      Synonymlagret översätter vardagsord till registrets ord — och vyn ska
//      TALA OM att den gjort det, annars ser det ut som magi och användaren
//      lär sig aldrig vad banken faktiskt heter.
//
// Synonymerna är med flit få och vardagliga. Det här ska inte bli en ordlista
// som ska underhållas för evigt — varje post ska vara ett ord en svensk
// faktiskt skriver i en matlogg och som registret inte känner igen.

/**
 * Vardagsord → det registret kallar saken.
 * Testet "varje synonym pekar på något som finns" bevakar att ingen post
 * pekar ut i tomma intet när livsmedelsbanken uppdateras.
 */
export const FOOD_SYNONYMS = {
  // "bröd vitt fibrer" och inte bara "bröd vitt": registrets grundpost för
  // ljust matbröd heter "Bröd vitt fibrer 3,5%", medan "bröd vitt" ensamt
  // också träffar tortillas och scones. En fralla är det förstnämnda.
  fralla: "bröd vitt fibrer",
  småfranska: "bröd vitt fibrer",
  portionsbröd: "bröd vitt fibrer",
  macka: "bröd",
  smörgås: "bröd",
  frukostbröd: "bröd",
  fil: "filmjölk",
  långfil: "filmjölk",
  standardmjölk: "mjölk 3",
};
// Medvetet INTE med: läsk, gurka, mellanmjölk, lättmjölk. Alla finns redan i registret med sina
// vardagsnamn ("Läsk cola", "Gurka") och hittas av ordgränsregeln. En synonym
// som pekar bort från en post som finns gör aktiv skada — mitt första utkast
// hade det felet: sökningen på gurka slutade ge Gurka, och mellanmjölk pekade
// bort från "Mellanmjölk fett 1,5% berikad". Testet "synonymer finns bara för
// ord registret INTE känner igen" fångade båda.

/**
 * Ord som SMALNAR AV en vara till en variant. Har användaren inte bett om
 * varianten är den mindre trolig än grundvaran: den som skriver "bröd vitt"
 * menar sällan det glutenfria. Utan det här straffet vinner varianten ofta,
 * eftersom dess namn råkar vara kortare än grundvarans.
 */
const VARIANTORD = ["glutenfri", "glutenfritt", "laktosfri", "laktosfritt", "light",
  "sockerfri", "sockerfritt", "vegansk", "veganskt", "sojaglass", "mjölkfri"];

const norm = s => (s || "").toLowerCase().trim().replace(/\s+/g, " ");

/** Delar upp i ord och struntar i skiljetecken. */
const ord = s => norm(s).split(/[^a-zà-ÿ0-9%,.]+/i).filter(Boolean);

/**
 * Poäng för hur väl ett namn svarar mot sökorden.
 * Returnerar null när namnet inte matchar alls.
 */
function poäng(namn, sökord) {
  const n = norm(namn);
  const namnOrd = ord(namn);
  let p = 0;

  for (const q of sökord) {
    if (n === q) { p += 1000; continue; }                       // exakt hela namnet
    if (namnOrd[0] === q) { p += 400; continue; }               // namnet BÖRJAR med ordet
    if (namnOrd.some(w => w === q)) { p += 300; continue; }     // eget ord i namnet
    if (namnOrd.some(w => w.startsWith(q))) { p += 150; continue; } // ordbörjan
    // Mitt i ett ord: tillåtet, men djupt nedprioriterat. Det är den här
    // matchningen som gav "läsk" → Fläskfilé, och den ska aldrig kunna
    // konkurrera med en riktig ordträff.
    if (n.includes(q)) { p += 10; continue; }
    return null;                                                 // alla sökord måste finnas
  }

  // Kortare namn vinner. I registret är den korta posten grundvaran och den
  // långa en sammansatt rätt: "Filmjölk fett 3%" före "Färskost m. filmjölk".
  p -= Math.min(80, namnOrd.length * 8);

  // Ombedd variant är bra, obedd variant är brus.
  for (const v of VARIANTORD) {
    if (namnOrd.includes(v) && !sökord.some(q => v.startsWith(q))) p -= 130;
  }
  return p;
}

/**
 * Sök i livsmedelsbanken.
 *
 * @returns { träffar, tolkatSom } — `tolkatSom` är satt när ett vardagsord
 *          översatts, så att vyn kan visa vad den faktiskt sökte på.
 */
export function searchFoods(query, index = [], max = 25) {
  const q = norm(query);
  if (q.length < 2) return { träffar: [], tolkatSom: null };

  // Synonymen slår till bara när hela sökningen är vardagsordet — annars
  // skulle "fil" i "kycklingfilé" börja leva sitt eget liv.
  const synonym = FOOD_SYNONYMS[q] || null;
  const sökord = ord(synonym || q);

  const träffar = [];
  for (const f of index) {
    const p = poäng(f.name, sökord);
    if (p != null) träffar.push({ f, p });
  }
  träffar.sort((a, b) => b.p - a.p || a.f.name.length - b.f.name.length);
  return {
    träffar: träffar.slice(0, max).map(x => x.f),
    tolkatSom: synonym,
  };
}
