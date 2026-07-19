// DATA: livsmedel, FOOD_INDEX, näringsmål, kost-hjälpvärden
import { H } from "./tokens.js";
import ATLAS_FOOD_DB from "../assets/data/slv_food_db.json";

const FOOD_DB = {
  sourceName: "Livsmedelsverkets Livsmedelsdatabas",
  sourceVersion: "2026-07-01",
  importedAt: "2026-07",
  sourceUrl: "https://www.livsmedelsverket.se/livsmedelsdatabasen",
  licenceOrReuseTerms: "CC BY 4.0",
  verificationStatus: "verified",
  // bakåtkompatibelt
  source: "Livsmedelsverkets Livsmedelsdatabas", version: "2026-07-01", license: "CC BY 4.0", url: "https://www.livsmedelsverket.se/livsmedelsdatabasen",
};

const foodSource = f => f.source || "livsmedelsverket";

const foodVerification = f => f.ver || (foodSource(f) === "user" ? "unverified" : foodSource(f) === "livsmedelsverket" ? "verified" : foodSource(f) === "off" ? "external" : "calculated");

const FOODS = [
  { id: "chicken", name: "Kycklingfilé", group: "Protein", kcal: 120, protein: 23, carbs: 0, fat: 2.6 },
  { id: "beef", name: "Nötfärs 10%", group: "Protein", kcal: 176, protein: 20, carbs: 0, fat: 10 },
  { id: "ryggbiff", name: "Ryggbiff", group: "Protein", kcal: 217, protein: 26, carbs: 0, fat: 13 },
  { id: "flaskfile", name: "Fläskfilé", group: "Protein", kcal: 143, protein: 21, carbs: 0, fat: 6 },
  { id: "salmon", name: "Lax", group: "Protein", kcal: 208, protein: 20, carbs: 0, fat: 13 },
  { id: "cod", name: "Torsk", group: "Protein", kcal: 82, protein: 18, carbs: 0, fat: 0.7 },
  { id: "mackerel", name: "Makrill", group: "Protein", kcal: 205, protein: 19, carbs: 0, fat: 14 },
  { id: "tuna", name: "Tonfisk (konserv)", group: "Protein", kcal: 116, protein: 26, carbs: 0, fat: 1 },
  { id: "shrimp", name: "Räkor", group: "Protein", kcal: 99, protein: 24, carbs: 0.2, fat: 0.3 },
  { id: "egg", name: "Ägg", group: "Protein", kcal: 155, protein: 13, carbs: 1.1, fat: 11 },
  { id: "ham", name: "Skinka", group: "Protein", kcal: 145, protein: 18, carbs: 1.5, fat: 7 },
  { id: "tofu", name: "Tofu", group: "Protein", kcal: 76, protein: 8, carbs: 1.9, fat: 4.8 },
  { id: "whey", name: "Proteinpulver (vassle)", group: "Protein", kcal: 400, protein: 80, carbs: 8, fat: 6 },
  { id: "quark", name: "Kvarg 0,2%", group: "Mejeri", kcal: 60, protein: 11, carbs: 4, fat: 0.2 },
  { id: "keso", name: "Keso", group: "Mejeri", kcal: 98, protein: 12, carbs: 3, fat: 3.5 },
  { id: "greek_yog", name: "Grekisk yoghurt", group: "Mejeri", kcal: 97, protein: 9, carbs: 4, fat: 4 },
  { id: "milk", name: "Mjölk 1,5%", group: "Mejeri", kcal: 47, protein: 3.4, carbs: 4.9, fat: 1.5 },
  { id: "cheddar", name: "Cheddarost", group: "Mejeri", kcal: 402, protein: 25, carbs: 1.3, fat: 33 },
  { id: "feta", name: "Fetaost", group: "Mejeri", kcal: 264, protein: 14, carbs: 4, fat: 21 },
  { id: "oats", name: "Havregryn", group: "Kolhydrat", kcal: 370, protein: 13, carbs: 58, fat: 7 },
  { id: "rice", name: "Ris (kokt)", group: "Kolhydrat", kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { id: "pasta", name: "Pasta (kokt)", group: "Kolhydrat", kcal: 158, protein: 6, carbs: 31, fat: 0.9 },
  { id: "potato", name: "Potatis (kokt)", group: "Kolhydrat", kcal: 87, protein: 2, carbs: 20, fat: 0.1 },
  { id: "sweet_potato", name: "Sötpotatis", group: "Kolhydrat", kcal: 90, protein: 2, carbs: 21, fat: 0.1 },
  { id: "bread", name: "Fullkornsbröd", group: "Kolhydrat", kcal: 250, protein: 9, carbs: 42, fat: 4 },
  { id: "quinoa", name: "Quinoa (kokt)", group: "Kolhydrat", kcal: 120, protein: 4.4, carbs: 21, fat: 1.9 },
  { id: "musli", name: "Müsli", group: "Kolhydrat", kcal: 375, protein: 10, carbs: 60, fat: 10 },
  { id: "cornflakes", name: "Cornflakes", group: "Kolhydrat", kcal: 357, protein: 7, carbs: 84, fat: 0.9 },
  { id: "lentils", name: "Linser (kokta)", group: "Kolhydrat", kcal: 116, protein: 9, carbs: 20, fat: 0.4 },
  { id: "chickpeas", name: "Kikärtor", group: "Kolhydrat", kcal: 164, protein: 9, carbs: 27, fat: 2.6 },
  { id: "black_beans", name: "Svarta bönor", group: "Kolhydrat", kcal: 132, protein: 9, carbs: 24, fat: 0.5 },
  { id: "banana", name: "Banan", group: "Frukt & grönt", kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  { id: "apple", name: "Äpple", group: "Frukt & grönt", kcal: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  { id: "orange", name: "Apelsin", group: "Frukt & grönt", kcal: 47, protein: 0.9, carbs: 12, fat: 0.1 },
  { id: "blueberry", name: "Blåbär", group: "Frukt & grönt", kcal: 57, protein: 0.7, carbs: 14, fat: 0.3 },
  { id: "broccoli", name: "Broccoli", group: "Frukt & grönt", kcal: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  { id: "spinach", name: "Spenat", group: "Frukt & grönt", kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  { id: "carrot", name: "Morötter", group: "Frukt & grönt", kcal: 41, protein: 0.9, carbs: 10, fat: 0.2 },
  { id: "tomato", name: "Tomat", group: "Frukt & grönt", kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  { id: "avocado", name: "Avokado", group: "Fett", kcal: 160, protein: 2, carbs: 9, fat: 15 },
  { id: "almonds", name: "Mandlar", group: "Fett", kcal: 579, protein: 21, carbs: 22, fat: 49 },
  { id: "cashews", name: "Cashewnötter", group: "Fett", kcal: 553, protein: 18, carbs: 30, fat: 44 },
  { id: "peanut_butter", name: "Jordnötssmör", group: "Fett", kcal: 588, protein: 25, carbs: 20, fat: 50 },
  { id: "olive_oil", name: "Olivolja", group: "Fett", kcal: 884, protein: 0, carbs: 0, fat: 100 },
  { id: "butter", name: "Smör", group: "Fett", kcal: 717, protein: 0.9, carbs: 0.1, fat: 81 },
  { id: "choc", name: "Mjölkchoklad", group: "Snacks", kcal: 535, protein: 7, carbs: 59, fat: 30 },
  // ── Livsmedelsverket-baslivsmedel (per 100 g, CC BY 4.0) ──
  { id: "slv_potatis", name: "Potatis, kokt", group: "Kolhydrater", kcal: 82, protein: 2, carbs: 17, fat: 0.1, source: "livsmedelsverket", ver: "verified" },
  { id: "slv_potatismos", name: "Potatismos", group: "Kolhydrater", kcal: 88, protein: 2, carbs: 14, fat: 3, source: "livsmedelsverket", ver: "verified" },
  { id: "slv_ris_kokt", name: "Ris, kokt", group: "Kolhydrater", kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, source: "livsmedelsverket", ver: "verified" },
  { id: "slv_pasta_kokt", name: "Pasta, kokt", group: "Kolhydrater", kcal: 158, protein: 6, carbs: 31, fat: 0.9, source: "livsmedelsverket", ver: "verified" },
  { id: "slv_havregryn", name: "Havregryn", group: "Kolhydrater", kcal: 370, protein: 13, carbs: 59, fat: 7, source: "livsmedelsverket", ver: "verified" },
  { id: "slv_knacke", name: "Knäckebröd", group: "Kolhydrater", kcal: 340, protein: 10, carbs: 62, fat: 3, source: "livsmedelsverket", ver: "verified" },
  { id: "slv_brod_grovt", name: "Grovt bröd", group: "Kolhydrater", kcal: 250, protein: 9, carbs: 42, fat: 4, source: "livsmedelsverket", ver: "verified" },
  { id: "slv_banan", name: "Banan", group: "Frukt", kcal: 95, protein: 1.1, carbs: 21, fat: 0.3, source: "livsmedelsverket", ver: "verified" },
  { id: "slv_apple", name: "Äpple", group: "Frukt", kcal: 52, protein: 0.3, carbs: 12, fat: 0.2, source: "livsmedelsverket", ver: "verified" },
  { id: "slv_apelsin", name: "Apelsin", group: "Frukt", kcal: 47, protein: 0.9, carbs: 9, fat: 0.1, source: "livsmedelsverket", ver: "verified" },
  { id: "slv_blabar", name: "Blåbär", group: "Frukt", kcal: 57, protein: 0.7, carbs: 12, fat: 0.3, source: "livsmedelsverket", ver: "verified" },
  { id: "slv_broccoli", name: "Broccoli", group: "Grönsaker", kcal: 34, protein: 2.8, carbs: 4, fat: 0.4, source: "livsmedelsverket", ver: "verified" },
  { id: "slv_morot", name: "Morot", group: "Grönsaker", kcal: 41, protein: 0.9, carbs: 8, fat: 0.2, source: "livsmedelsverket", ver: "verified" },
  { id: "slv_tomat", name: "Tomat", group: "Grönsaker", kcal: 18, protein: 0.9, carbs: 3.5, fat: 0.2, source: "livsmedelsverket", ver: "verified" },
  { id: "slv_spenat", name: "Spenat", group: "Grönsaker", kcal: 23, protein: 2.9, carbs: 1.4, fat: 0.4, source: "livsmedelsverket", ver: "verified" },
  { id: "slv_lok", name: "Gul lök", group: "Grönsaker", kcal: 40, protein: 1.1, carbs: 9, fat: 0.1, source: "livsmedelsverket", ver: "verified" },
  { id: "slv_avokado", name: "Avokado", group: "Fett", kcal: 160, protein: 2, carbs: 9, fat: 15, source: "livsmedelsverket", ver: "verified" },
  { id: "slv_linser", name: "Linser, kokta", group: "Protein", kcal: 116, protein: 9, carbs: 20, fat: 0.4, source: "livsmedelsverket", ver: "verified" },
  { id: "slv_kikartor", name: "Kikärtor, kokta", group: "Protein", kcal: 164, protein: 9, carbs: 27, fat: 2.6, source: "livsmedelsverket", ver: "verified" },
  { id: "slv_svarta_bonor", name: "Svarta bönor, kokta", group: "Protein", kcal: 132, protein: 9, carbs: 24, fat: 0.5, source: "livsmedelsverket", ver: "verified" },
  { id: "slv_majs", name: "Majs", group: "Grönsaker", kcal: 86, protein: 3.2, carbs: 19, fat: 1.2, source: "livsmedelsverket", ver: "verified" },
  { id: "slv_arter", name: "Gröna ärtor", group: "Grönsaker", kcal: 81, protein: 5, carbs: 14, fat: 0.4, source: "livsmedelsverket", ver: "verified" },
  { id: "slv_honung", name: "Honung", group: "Snacks", kcal: 304, protein: 0.3, carbs: 82, fat: 0, source: "livsmedelsverket", ver: "verified" },
];

const FOOD_SYN = {
  "lask": ["laskedryck", "cola", "sockerdricka"], "fil": ["filmjolk"], "mackor": ["brod", "smorgas"], "macka": ["brod", "smorgas"],
  "godis": ["godis", "choklad", "karamell"], "chips": ["chips", "potatischips"], "bulle": ["bulle", "kanelbulle"],
  "pasta": ["pasta", "spaghetti", "makaroner"], "notfars": ["kottfars", "notfars"], "kottbullar": ["kottbulle"],
  "fisk": ["lax", "torsk", "sej", "sill", "fisk"], "yoghurt": ["yoghurt", "yogurt"], "glass": ["glass", "gladje"],
  "bira": ["ol", "lageröl"], "fralla": ["brod", "smorgas"], "pommes": ["pommes", "franska"], "korv": ["korv", "falukorv", "varmkorv"],
};

// Kurerad mikronäring för snabb-livsmedlen — handplockade, verifierade SLV-bas-poster
// (rätt Livsmedelsnummer per livsmedel, inte fuzzy-matchning). Per 100 g.
const CURATED_MICRO = {
  "chicken": { iron: 0.7, calcium: 11.0, magnesium: 28.0, potassium: 255.0, zinc: 0.8, salt: 0.2, vitD: 0.4, b12: 0.26, folate: 23.0, vitC: 0.0 },
  "beef": { iron: 2.0, calcium: 8.0, magnesium: 20.0, potassium: 278.0, zinc: 5.0, salt: 0.2, vitD: 0.09, b12: 1.52, folate: 3.0, vitC: 0.0 },
  "salmon": { iron: 0.3, calcium: 11.0, magnesium: 30.0, potassium: 365.0, zinc: 0.4, salt: 0.1, vitD: 8.23, b12: 2.27, folate: 26.0, vitC: 0.0, omega3: 0.3 },
  "tuna": { iron: 1.3, calcium: 15.0, magnesium: 28.0, potassium: 220.0, zinc: 0.9, salt: 1.0, vitD: 4.2, b12: 2.53, folate: 5.0, vitC: 0.0, omega3: 0.2 },
  "egg": { iron: 1.7, calcium: 52.0, magnesium: 12.0, potassium: 132.0, zinc: 1.3, salt: 0.4, vitD: 3.33, b12: 1.18, folate: 82.0, vitC: 0.0, omega3: 0.1 },
  "milk": { iron: 0.0, calcium: 120.0, magnesium: 11.0, potassium: 161.0, zinc: 0.4, salt: 0.1, vitD: 1.0, b12: 0.58, folate: 14.0, vitC: 0.6 },
  "almonds": { iron: 3.2, calcium: 296.0, magnesium: 273.0, potassium: 1010.0, zinc: 3.2, salt: 0.0, vitD: 0.0, b12: 0.0, folate: 47.0, vitC: 0.0 },
  "lentils": { iron: 2.7, calcium: 10.0, magnesium: 32.0, potassium: 349.0, zinc: 1.8, salt: 0.6, vitD: 0.0, b12: 0.0, folate: 73.0, vitC: 0.0 },
  "chickpeas": { iron: 1.7, calcium: 47.0, magnesium: 39.0, potassium: 149.0, zinc: 1.3, salt: 0.6, vitD: 0.0, b12: 0.0, folate: 94.0, vitC: 0.0 },
  "quinoa": { iron: 1.6, calcium: 14.0, magnesium: 83.0, potassium: 209.0, zinc: 1.1, salt: 0.7, vitD: 0.0, b12: 0.0, folate: 86.0, vitC: 0.0 },
  "butter": { iron: 0.0, calcium: 0.0, magnesium: 0.0, potassium: 0.0, zinc: 0.0, salt: 1.2, vitD: 0.51, b12: 0.0, folate: 0.0, vitC: 0.0 },
  "peanut_butter": { iron: 1.8, calcium: 33.0, magnesium: 175.0, potassium: 680.0, zinc: 2.9, salt: 1.2, vitD: 0.0, b12: 0.0, folate: 82.0, vitC: 0.0 },
  "oats": { iron: 3.4, calcium: 43.0, magnesium: 110.0, potassium: 340.0, zinc: 2.6, salt: 0.0, vitD: 0.0, b12: 0.0, folate: 30.0, vitC: 0.0 },
  "spinach": { iron: 2.1, calcium: 83.0, magnesium: 95.0, potassium: 730.0, zinc: 0.9, salt: 0.2, vitD: 0.0, b12: 0.0, folate: 202.0, vitC: 36.7 },
  "cod": { iron: 0.1, calcium: 12.0, magnesium: 27.0, potassium: 402.0, zinc: 0.6, salt: 0.2, vitD: 1.84, b12: 1.41, folate: 14.0, vitC: 0.0, omega3: 0.2 },
  "shrimp": { iron: 0.2, calcium: 21.0, magnesium: 37.0, potassium: 88.0, zinc: 1.1, salt: 1.6, vitD: 0.0, b12: 3.52, folate: 14.0, vitC: 0.0, omega3: 0.2 },
  "tofu": { iron: 0.9, calcium: 86.0, magnesium: 130.0, potassium: 140.0, zinc: 0.6, salt: 0.2, vitD: 0.0, b12: 0.0, folate: 12.0, vitC: 0.0 },
  "quark": { iron: 0.0, calcium: 108.0, magnesium: 11.0, potassium: 112.0, zinc: 0.5, salt: 0.1, vitD: 0.0, b12: 0.53, folate: 26.0, vitC: 0.0 },
  "keso": { iron: 0.0, calcium: 50.0, magnesium: 5.0, potassium: 54.0, zinc: 0.3, salt: 0.7, vitD: 0.0, b12: 0.6, folate: 30.0, vitC: 0.0 },
  "greek_yog": { iron: 0.0, calcium: 122.0, magnesium: 12.0, potassium: 157.0, zinc: 1.2, salt: 0.1, vitD: 0.0, b12: 0.2, folate: 13.0, vitC: 0.0 },
  "pasta": { iron: 0.5, calcium: 10.0, magnesium: 13.0, potassium: 70.0, zinc: 0.4, salt: 0.0, vitD: 0.0, b12: 0.0, folate: 3.0, vitC: 0.0 },
  "potato": { iron: 0.4, calcium: 4.0, magnesium: 19.0, potassium: 322.0, zinc: 0.2, salt: 0.0, vitD: 0.0, b12: 0.0, folate: 20.0, vitC: 17.4 },
  "ham": { iron: 1.4, calcium: 6.0, magnesium: 27.0, potassium: 373.0, zinc: 1.7, salt: 0.2, vitD: 0.57, b12: 0.76, folate: 3.0, vitC: 0.0 },
  "apple": { iron: 0.1, calcium: 2.0, magnesium: 3.0, potassium: 57.0, zinc: 0.0, salt: 0.0, vitD: 0.0, b12: 0.0, folate: 2.0, vitC: 14.1 },
  "orange": { iron: 0.1, calcium: 24.0, magnesium: 8.0, potassium: 122.0, zinc: 0.0, salt: 0.0, vitD: 0.0, b12: 0.0, folate: 33.0, vitC: 52.0 },
  "blueberry": { iron: 0.6, calcium: 23.0, magnesium: 9.0, potassium: 86.0, zinc: 0.2, salt: 0.0, vitD: 0.0, b12: 0.0, folate: 10.0, vitC: 8.1 },
  "broccoli": { iron: 1.1, calcium: 48.0, magnesium: 22.0, potassium: 397.0, zinc: 0.7, salt: 0.0, vitD: 0.0, b12: 0.0, folate: 95.0, vitC: 79.0 },
  "carrot": { iron: 0.2, calcium: 26.0, magnesium: 8.0, potassium: 210.0, zinc: 0.2, salt: 0.1, vitD: 0.0, b12: 0.0, folate: 22.0, vitC: 4.9 },
  "tomato": { iron: 0.2, calcium: 12.0, magnesium: 9.0, potassium: 240.0, zinc: 0.1, salt: 0.0, vitD: 0.0, b12: 0.0, folate: 17.0, vitC: 14.8 },
  "avocado": { iron: 0.3, calcium: 14.0, magnesium: 32.0, potassium: 600.0, zinc: 0.4, salt: 0.0, vitD: 0.0, b12: 0.0, folate: 116.0, vitC: 3.3 },
  "cashews": { iron: 5.0, calcium: 42.0, magnesium: 257.0, potassium: 580.0, zinc: 4.7, salt: 0.0, vitD: 0.0, b12: 0.0, folate: 47.0, vitC: 0.1 },
  "olive_oil": { iron: 0.0, calcium: 0.0, magnesium: 0.0, potassium: 0.0, zinc: 0.0, salt: 0.0, vitD: 0.0, b12: 0.0, folate: 0.0, vitC: 0.0 },
  "banana": { iron: 0.0, calcium: 6.0, magnesium: 27.0, potassium: 330.0, zinc: 0.2, salt: 0.0, vitD: 0.0, b12: 0.0, folate: 14.0, vitC: 9.0 },
  "sweet_potato": { iron: 0.9, calcium: 45.0, magnesium: 15.0, potassium: 408.0, zinc: 0.2, salt: 0.1, vitD: 0.0, b12: 0.0, folate: 11.0, vitC: 2.4 },
  "black_beans": { iron: 2.1, calcium: 75.0, magnesium: 31.0, potassium: 218.0, zinc: 0.7, salt: 0.6, vitD: 0.0, b12: 0.0, folate: 19.0, vitC: 0.0 },
  "slv_banan": { iron: 0.0, calcium: 6.0, magnesium: 27.0, potassium: 330.0, zinc: 0.2, salt: 0.0, vitD: 0.0, b12: 0.0, folate: 14.0, vitC: 9.0 },
  "slv_apple": { iron: 0.1, calcium: 2.0, magnesium: 3.0, potassium: 57.0, zinc: 0.0, salt: 0.0, vitD: 0.0, b12: 0.0, folate: 2.0, vitC: 14.1 },
  "slv_apelsin": { iron: 0.1, calcium: 24.0, magnesium: 8.0, potassium: 122.0, zinc: 0.0, salt: 0.0, vitD: 0.0, b12: 0.0, folate: 33.0, vitC: 52.0 },
  "slv_blabar": { iron: 0.6, calcium: 23.0, magnesium: 9.0, potassium: 86.0, zinc: 0.2, salt: 0.0, vitD: 0.0, b12: 0.0, folate: 10.0, vitC: 8.1 },
  "slv_broccoli": { iron: 1.1, calcium: 48.0, magnesium: 22.0, potassium: 397.0, zinc: 0.7, salt: 0.0, vitD: 0.0, b12: 0.0, folate: 95.0, vitC: 79.0 },
  "slv_morot": { iron: 0.2, calcium: 26.0, magnesium: 8.0, potassium: 210.0, zinc: 0.2, salt: 0.1, vitD: 0.0, b12: 0.0, folate: 22.0, vitC: 4.9 },
  "slv_tomat": { iron: 0.2, calcium: 12.0, magnesium: 9.0, potassium: 240.0, zinc: 0.1, salt: 0.0, vitD: 0.0, b12: 0.0, folate: 17.0, vitC: 14.8 },
  "slv_spenat": { iron: 2.1, calcium: 83.0, magnesium: 95.0, potassium: 730.0, zinc: 0.9, salt: 0.2, vitD: 0.0, b12: 0.0, folate: 202.0, vitC: 36.7 },
  "slv_avokado": { iron: 0.3, calcium: 14.0, magnesium: 32.0, potassium: 600.0, zinc: 0.4, salt: 0.0, vitD: 0.0, b12: 0.0, folate: 116.0, vitC: 3.3 },
  "slv_linser": { iron: 2.7, calcium: 10.0, magnesium: 32.0, potassium: 349.0, zinc: 1.8, salt: 0.6, vitD: 0.0, b12: 0.0, folate: 73.0, vitC: 0.0 },
  "slv_kikartor": { iron: 1.7, calcium: 47.0, magnesium: 39.0, potassium: 149.0, zinc: 1.3, salt: 0.6, vitD: 0.0, b12: 0.0, folate: 94.0, vitC: 0.0 },
  "slv_svarta_bonor": { iron: 2.1, calcium: 75.0, magnesium: 31.0, potassium: 218.0, zinc: 0.7, salt: 0.6, vitD: 0.0, b12: 0.0, folate: 19.0, vitC: 0.0 },
  "slv_potatis": { iron: 0.4, calcium: 4.0, magnesium: 19.0, potassium: 322.0, zinc: 0.2, salt: 0.0, vitD: 0.0, b12: 0.0, folate: 20.0, vitC: 17.4 },
  "slv_havregryn": { iron: 3.4, calcium: 43.0, magnesium: 110.0, potassium: 340.0, zinc: 2.6, salt: 0.0, vitD: 0.0, b12: 0.0, folate: 30.0, vitC: 0.0 },
};
const FOOD_INDEX = FOODS.map(f => CURATED_MICRO[f.id] ? { ...f, micro: CURATED_MICRO[f.id] } : f).concat(
  (typeof window !== "undefined" && Array.isArray(ATLAS_FOOD_DB))
    ? ATLAS_FOOD_DB.map(f => ({ id: f.id, name: f.name, group: f.group, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, fiber: f.fiber, micro: f.micro, source: "livsmedelsverket", ver: "verified" }))
    : []
);

const FOOD_GROUPS = ["Protein", "Mejeri", "Kolhydrat", "Frukt & grönt", "Fett", "Snacks"];

const NUTRITION_GOALS = { kcal: 2200, protein: 148, carbs: 235, fat: 74 };

const GOAL_CATS = { Styrka: "#FF5C5C", Kropp: "#4DA3FF", Vana: "#39D98A", Kondition: "#9B7CFF" };

const FOOD_KB = [
  { k: ["köttbull", "meatball"], kcal: 520, p: 28, c: 32, f: 30 }, { k: ["gräddsås", "gräddsas", "sås", "sauce", "gravy"], kcal: 150, p: 2, c: 8, f: 12 },
  { k: ["potatismos", "mos"], kcal: 220, p: 4, c: 34, f: 7 }, { k: ["potatis", "potato"], kcal: 180, p: 4, c: 38, f: 1 },
  { k: ["pommes", "fries", "frites"], kcal: 340, p: 5, c: 44, f: 16 }, { k: ["kyckling", "chicken"], kcal: 280, p: 42, c: 2, f: 11 },
  { k: ["ris", "rice"], kcal: 260, p: 6, c: 52, f: 2 }, { k: ["pasta", "spagetti", "spaghetti"], kcal: 340, p: 12, c: 64, f: 5 },
  { k: ["hamburgare", "burger", "hamburgermål", "cheeseburgare"], kcal: 620, p: 30, c: 45, f: 34 }, { k: ["pizza"], kcal: 850, p: 34, c: 90, f: 38 },
  { k: ["läsk", "soda", "cola", "läskedryck"], kcal: 140, p: 0, c: 35, f: 0 }, { k: ["kanelbulle", "bulle", "cinnamon"], kcal: 340, p: 6, c: 48, f: 14 },
  { k: ["latte", "cappuccino"], kcal: 120, p: 6, c: 12, f: 5 }, { k: ["kaffe", "coffee", "tea"], kcal: 10, p: 0, c: 1, f: 0 },
  { k: ["macka", "smörgås", "sandwich", "mack", "knäckebröd"], kcal: 170, p: 7, c: 22, f: 6 }, { k: ["ägg", "egg", "äggröra"], kcal: 90, p: 8, c: 1, f: 6 },
  { k: ["ost", "cheese"], kcal: 110, p: 7, c: 1, f: 9 }, { k: ["yoghurt", "kvarg", "quark", "kesella"], kcal: 150, p: 18, c: 10, f: 4 },
  { k: ["sallad", "salad"], kcal: 120, p: 6, c: 12, f: 6 }, { k: ["kebab"], kcal: 600, p: 35, c: 40, f: 32 }, { k: ["taco", "tacos"], kcal: 600, p: 28, c: 55, f: 28 },
  { k: ["lax", "salmon", "fisk", "fish", "torsk"], kcal: 320, p: 34, c: 0, f: 20 }, { k: ["gratäng", "gratin"], kcal: 330, p: 9, c: 30, f: 19 },
  { k: ["korv", "sausage", "varmkorv", "falukorv"], kcal: 300, p: 12, c: 20, f: 19 }, { k: ["fika", "bakelse", "kaka", "cake", "cookie", "kladdkaka"], kcal: 400, p: 6, c: 52, f: 18 },
  { k: ["glass", "ice cream"], kcal: 280, p: 5, c: 34, f: 14 }, { k: ["proteinbar", "protein bar"], kcal: 220, p: 20, c: 22, f: 7 },
  { k: ["whey", "protein shake", "shake", "proteinshake"], kcal: 120, p: 24, c: 4, f: 2 }, { k: ["öl", "beer", "bira"], kcal: 150, p: 1, c: 13, f: 0 },
  { k: ["vin", "wine"], kcal: 125, p: 0, c: 4, f: 0 }, { k: ["chips"], kcal: 300, p: 4, c: 30, f: 19 }, { k: ["godis", "candy", "choklad", "chocolate"], kcal: 250, p: 2, c: 34, f: 12 },
];

const PORTIONS = { small: 0.7, normal: 1, large: 1.35 };

const RESCUE_SITUATIONS = [
  { id: "hungry", label: "Jag är hungrig" }, { id: "nocook", label: "Orkar inte laga" }, { id: "hungover", label: "Jag är bakis" },
  { id: "sweet", label: "Sötsugen" }, { id: "empty", label: "Inget hemma" }, { id: "pizza", label: "Sugen på pizza" }, { id: "fastfood", label: "På väg till snabbmat" },
];

const NUTRITION_STYLES = [
  { id: "focused", label: "Fokuserad", tag: "Nå målet snabbt — håll planen strikt", ex: "\"Pizza passar dåligt med dagens kalorier. Jag rekommenderar ett annat val.\"" },
  { id: "balanced", label: "Balanserad", tag: "Nå målet men leva normalt", ex: "\"Pizza är okej idag. Vi hanterar bara portionen och resten av dagen.\"" },
  { id: "flexible", label: "Flexibel", tag: "Hållbara vanor, undvik dåligt samvete", ex: "\"Köp pizzan och njut. Registrera den — vi återgår till normalen vid nästa måltid.\"" },
];

export { FOOD_DB, foodSource, foodVerification, FOODS, FOOD_SYN, FOOD_INDEX, FOOD_GROUPS, NUTRITION_GOALS, GOAL_CATS, FOOD_KB, PORTIONS, RESCUE_SITUATIONS, NUTRITION_STYLES };
