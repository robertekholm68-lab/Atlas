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

/**
 * STYCKVIKTER — vad en av något väger.
 *
 * "2 knäckebröd" är en mängd, men appen kunde bara läsa gram och gav därför
 * samma svar som "knäckebröd". Antalet ignorerades helt.
 *
 * Vikterna är vardagliga schabloner, inte exakta: ett knäckebröd väger 10-14 g
 * beroende på sort. Det är tillräckligt nära för en logg och betydligt närmare
 * än att räkna på en portion.
 *
 * BARA SAKER MAN RÄKNAR I STYCK. "2 ris" betyder inget, så ris står inte här.
 * Listan ska växa när någon rapporterar att en vara saknas — inte fyllas med
 * gissningar i förväg.
 */
export const STYCKVIKT = {
  knäckebröd: 11, skorpa: 10, brödskiva: 35, skiva: 35, limpskiva: 40,
  rostat: 30, frukostmacka: 35, macka: 70, smörgås: 70,
  ägg: 58, äggula: 18, äggvita: 33,
  banan: 120, äpple: 130, päron: 140, apelsin: 150, clementin: 70,
  kiwi: 75, persika: 150, plommon: 55, aprikos: 35,
  tomat: 90, "körsbärstomat": 15, gurka: 300, morot: 70, paprika: 150,
  potatis: 90, lök: 110, vitlöksklyfta: 4, avokado: 170,
  kavring: 30, tortilla: 45, pitabröd: 60, hamburgerbröd: 70,
  korv: 50, falukorvskiva: 25, köttbulle: 15, kycklingfilé: 150,
  ostskiva: 15, skinkskiva: 12, salamiskiva: 5,
  näve: 30, kaka: 15, kex: 8, rice: 9,
};

/** Vad ett stycke väger, eller null när varan inte räknas i styck. */
export function styckvikt(namn) {
  if (!namn) return null;
  const n = String(namn).toLowerCase().trim();
  if (STYCKVIKT[n]) return STYCKVIKT[n];
  // Sammansatta ord: "rågknäckebröd" ska hitta "knäckebröd".
  for (const [k, v] of Object.entries(STYCKVIKT)) {
    if (n.endsWith(k) || n.startsWith(k)) return v;
  }
  return null;
}
