// Normalportioner per livsmedelsgrupp.
//
// VARFÖR DEN HÄR FILEN FINNS: textloggen kunde bara räkna på en handkurerad
// lista med ett sextiotal komponenter. Varje ord som saknades var ett eget
// litet ärende — "fralla" en dag, "pyttipanna" nästa. Det skalar inte, och det
// gör appen beroende av att någon hela tiden fyller på en ordlista.
//
// Livsmedelsverkets 2 600+ poster har redan en gruppindelning. Ger man varje
// grupp en normalportion går VARJE post att räkna på i fritext, och den
// handkurerade listan behöver bara finnas kvar för de fall där en specifik
// portion är bättre än gruppens medel.
//
// SIFFRORNA ÄR NORMALPORTIONER, INTE SANNINGAR. En portion kött är 130 g för
// att det är en vanlig portion, inte för att din portion är det. Uppskattningen
// redovisas därför alltid som en uppskattning med intervall — precis som förut.
// Det som ändras är räckvidden, inte anspråken.

/** Gram per normalportion. Grupperna kommer ur FOOD_INDEX. */
export const PORTION_PER_GROUP = {
  // Måltider och baslivsmedel
  "Rätter": 350,              // en tallrik lagad mat
  "Pasta": 250,               // kokt
  "Potatis": 200,
  "Kolhydrat": 200,
  "Kolhydrater": 200,
  "Mjöl": 60,

  // Proteinkällor — en portion, inte ett kilo
  "Kött": 130,
  "Kyckling": 150,
  "Fisk": 130,
  "Quorn": 120,
  "Protein": 120,
  "Ägg": 60,                  // ett ägg
  "Lever": 100,
  "Korv": 100,
  "Pålägg": 25,               // ett par skivor

  // Mejeri och dryck
  "Mejeri": 200,
  "Dryck": 250,

  // Bröd och frukost
  "Bröd": 35,                 // en skiva
  "Bullar": 60,
  "Flingor": 60,

  // Tillbehör
  "Grönsaker": 80,
  "Frukt": 130,
  "Frukt & grönt": 100,
  "Nötter": 30,
  "Sylt": 30,
  "Fett": 10,                 // smör på en macka
  "Smaksättare": 15,

  // Sådant man sällan mäter
  "Godis": 40,
  "Glass": 100,
  "Snacks": 40,
  "Måltidsersättning": 60,
  "Övrigt": 100,
};

/**
 * Tak för hur mycket energi en enskild komponent rimligen bidrar med, när
 * portionen räknas ur gruppens medel. 450 kcal är en rejäl men trolig portion.
 */
const ENERGITAK = 450;

/**
 * Normalportion i gram för en post.
 *
 * Gruppens medel räcker för det mesta, men inte för allt: gruppen "Rätter"
 * rymmer både en tallrik pytt och en klick hummus, och 350 g av det senare är
 * inte en portion utan ett halvt kilo kikärtsröra. Couscous ligger dessutom i
 * banken TORR (361 kcal/100 g), och 250 g torr couscous är tre portioner.
 *
 * Energitätheten skiljer fallen åt utan att någon behöver lista undantag: en
 * tallriksrätt ligger på 100–180 kcal/100 g, och allt däröver är torrt, fett
 * eller en röra. För dem skalas portionen ner så att den landar under taket.
 */
export function portionFor(food) {
  if (!food) return 100;
  let g = PORTION_PER_GROUP[food.group] || 100;
  const täthet = food.kcal || 0;
  if (g >= 200 && täthet > 200) g = Math.max(60, Math.round((ENERGITAK * 100) / täthet));
  return g;
}

/**
 * Näring för en normalportion av en post.
 * FOOD_INDEX anger per 100 g; här skalas det till portionen.
 */
export function portionNutrition(food, gram) {
  const g = gram != null ? gram : portionFor(food);
  const k = v => Math.round(((v || 0) * g) / 100);
  return { grams: g, kcal: k(food.kcal), p: k(food.protein), c: k(food.carbs), f: k(food.fat) };
}
