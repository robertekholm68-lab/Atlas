// LIVSMEDELSSÖKNING MOT OPEN FOOD FACTS
//
// Livsmedelsverket har 2 679 poster — råvaror och husmanskost — men NOLL
// märkesvaror. Mätt: "lindahls kvarg", "oatly", "barebells", "nocco" ger
// alla 0 träffar. Open Food Facts har 27 164 svenska produkter, och av de
// hundra populäraste har 96 kompletta näringsvärden.
//
// VARFÖR GENOM PROXYN OCH INTE DIREKT FRÅN APPEN:
//
// OFF svarar oregelbundet. Under mätningen gav samma sökning "Page temporarily
// unavailable" ena gången och 66 träffar nästa. De rate-limitar globalt,
// oberoende av IP. En proxy kan cacha, sätta User-Agent (som OFF kräver), och
// ge appen ett rent svar — tomt eller träffar — i stället för HTML-fel.
//
// SAMMA REGEL SOM ÖVERALLT: proxyn är dum. Ingen databas, inget minne utöver
// en kort cache. Den söker, tvättar och skickar vidare.

const TILLÅTNA_URSPRUNG = [
  "https://robertekholm68-lab.github.io",
  "http://localhost:5173",
];

// KORT CACHE PER SÖKORD. OFF:s data ändras sällan, och samma ord söks ofta
// (man skriver "oat", "oatl", "oatly" — tre anrop för ett ord). Fem minuter
// räcker för en session och belastar inte OFF med dubbletter.
const cache = new Map();
const CACHE_MS = 300_000;

// Rate limit per instans: OFF vill inte ha mer än ett anrop i sekunden från
// samma källa, och en sökning per tangenttryck vore långt över.
let senasteAnrop = 0;
const MIN_MELLANRUM_MS = 600;

/** Tvättar en OFF-produkt till appens livsmedelsform. null om oanvändbar. */
function tvätta(p) {
  const n = p.nutriments || {};
  const kcal = n["energy-kcal_100g"];
  const protein = n.proteins_100g;
  // Utan kcal OCH protein är posten värdelös för Askr. Fett och kolhydrater
  // kan saknas — de visas som null, inte som 0.
  if (kcal == null || protein == null) return null;
  const namn = (p.product_name_sv || p.product_name || "").trim();
  if (namn.length < 2) return null;
  const tal = (v, d = 1) => (v == null ? null : Math.round(Number(v) * 10 ** d) / 10 ** d);
  return {
    id: `off_${p.code}`,
    name: namn.slice(0, 80),
    brand: (p.brands || "").split(",")[0].trim().slice(0, 40) || null,
    kcal: Math.round(kcal),
    protein: tal(protein),
    carbs: tal(n.carbohydrates_100g),
    fat: tal(n.fat_100g),
    fiber: tal(n.fiber_100g),
    sugar: tal(n.sugars_100g),
    saturated: tal(n["saturated-fat_100g"]),
    salt: tal(n.salt_100g, 2),
    barcode: p.code || null,
    källa: "off",
  };
}

export default async function handler(req, res) {
  const ursprung = req.headers.origin || "";
  const tillåtet = TILLÅTNA_URSPRUNG.includes(ursprung);
  if (tillåtet) {
    res.setHeader("Access-Control-Allow-Origin", ursprung);
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!tillåtet) return res.status(403).json({ fel: "Otillåtet ursprung." });

  const q = String((req.query && req.query.q) || "").trim().toLowerCase().slice(0, 60);
  if (q.length < 3) return res.status(200).json({ träffar: [], källa: "off" });

  const c = cache.get(q);
  if (c && Date.now() - c.ts < CACHE_MS) {
    return res.status(200).json({ träffar: c.träffar, källa: "off", cachad: true });
  }

  // TOMT SVAR VID RATE LIMIT, INTE FEL. Appen har alltid Livsmedelsverket
  // först; OFF är ett tillägg. Ett tomt tillägg är inte ett fel för
  // användaren — det är bara färre träffar.
  const nu = Date.now();
  if (nu - senasteAnrop < MIN_MELLANRUM_MS) {
    return res.status(200).json({ träffar: [], källa: "off", väntar: true });
  }
  senasteAnrop = nu;

  try {
    const url = "https://se.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=12"
      + "&fields=code,product_name,product_name_sv,brands,nutriments"
      + "&search_terms=" + encodeURIComponent(q);
    const r = await fetch(url, {
      headers: { "User-Agent": "Askr/2.0 (fitness app; contact via github robertekholm68-lab/Atlas)" },
      signal: AbortSignal.timeout(8000),
    });
    // OFF returnerar HTML vid överlast — inte JSON med felkod.
    const text = await r.text();
    let d;
    try { d = JSON.parse(text); } catch (e) { d = null; }
    if (!r.ok || !d || !Array.isArray(d.products)) {
      return res.status(200).json({ träffar: [], källa: "off", otillgänglig: true });
    }
    const träffar = d.products.map(tvätta).filter(Boolean);
    cache.set(q, { ts: nu, träffar });
    // Cachen ska inte växa obegränsat i en långlivad instans.
    if (cache.size > 500) {
      const äldst = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
      if (äldst) cache.delete(äldst[0]);
    }
    return res.status(200).json({ träffar, källa: "off" });
  } catch (e) {
    return res.status(200).json({ träffar: [], källa: "off", otillgänglig: true });
  }
}
