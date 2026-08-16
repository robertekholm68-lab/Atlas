// FOTOLOGGNING — modellen identifierar, motorn räknar.
//
// Claude kan se ett foto och säga "kyckling, ris, broccoli". Det fungerar bra.
// Vad den INTE kan är att veta hur mycket: en portion ris kan vara 100 g eller
// 250 g beroende på tallriksstorlek och vinkel, och skillnaden är 200 kcal.
// Modellen svarar ändå med ett tal, eftersom det är vad den gör.
//
// DÄRFÖR: modellen får bara IDENTIFIERA och UPPSKATTA. Varje livsmedel slås upp
// i Livsmedelsverkets databas, näringen räknas av motorn, och användaren
// bekräftar gramtalen innan något loggas. Fotot är en snabbstart, inte ett
// facit.
//
// Alternativet — låta modellen sätta kalorierna rakt av — hade känts magiskt och
// varit fel med tjugo procent utan att någon märkte det, tills readiness byggde
// på skräp. Det bryter mot samma regel som gäller överallt annars i appen:
// motorn räknar, modellen formulerar, modellen lägger aldrig till ett tal som
// blir en sanning.

import { searchFoods } from "./index.js";

export const FOTO_SYSTEM = `Du analyserar ett foto av en måltid åt en svensk träningsapp.

DIN UPPGIFT är att lista vilka livsmedel du ser och uppskatta mängden i gram.

SVARA ENDAST MED JSON, inget annat — ingen inledning, inga kodstaket, ingen förklaring:
{"livsmedel":[{"namn":"kokt ris","gram":150,"säkerhet":"hög"}],"notering":"kort mening"}

REGLER:

Namnen ska vara svenska vardagsord som går att slå upp i en livsmedelsdatabas: "kycklingfilé", "kokt ris", "broccoli", "olivolja". Inte varumärken, inte rätter — "spagetti bolognese" ska bli "spagetti", "köttfärs", "tomatsås".

Ange mängden i gram som du bäst kan bedöma den. Sätt säkerhet till "hög" när mängden är tydlig (en hel frukt, en skiva bröd), "medel" när du kan jämföra mot något känt i bilden, "låg" när du gissar.

SÄG NÄR DU INTE KAN SE. Är bilden suddig, mörk eller visar något annat än mat: svara {"livsmedel":[],"notering":"vad du faktiskt ser"}. Ett tomt svar är alltid bättre än en påhittad måltid.

Inkludera synlig matlagningsfett bara om du faktiskt ser det (blank yta, stekyta). Gissa aldrig på osynliga ingredienser — salt, kryddor, dolda såser.

Noteringen är EN kort mening om vad som är osäkert. Inga kalorital — appen räknar dem själv.`;

/**
 * Tolkar modellens JSON-svar. Modellen ombeds svara med ren JSON men lägger
 * ibland till kodstaket eller en inledande mening — det städas bort i stället
 * för att kasta ett i övrigt korrekt svar.
 */
export function tolkaFotosvar(text) {
  if (!text || typeof text !== "string") return { ok: false, skäl: "tomt" };
  const rensad = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = rensad.indexOf("{");
  const slut = rensad.lastIndexOf("}");
  if (start < 0 || slut <= start) return { ok: false, skäl: "inte-json", rå: text };
  let d;
  try { d = JSON.parse(rensad.slice(start, slut + 1)); }
  catch (e) { return { ok: false, skäl: "trasig-json", rå: text }; }
  if (!d || !Array.isArray(d.livsmedel)) return { ok: false, skäl: "fel-form", rå: text };

  const livsmedel = d.livsmedel
    .filter(x => x && typeof x.namn === "string" && x.namn.trim())
    .map(x => ({
      namn: x.namn.trim(),
      // Orimliga gramtal tyder på feltolkning. Över två kilo på en tallrik är
      // inte en portion, det är ett fel.
      gram: Math.max(1, Math.min(2000, Math.round(Number(x.gram) || 100))),
      säkerhet: ["hög", "medel", "låg"].includes(x.säkerhet) ? x.säkerhet : "låg",
    }));

  return { ok: true, livsmedel, notering: typeof d.notering === "string" ? d.notering.trim() : "" };
}

/**
 * Slår upp varje identifierat livsmedel i databasen.
 *
 * MODELLENS NAMN ÄR EN SÖKFRÅGA, INTE ETT FACIT. Hittas ingen träff lämnas
 * posten som omatchad i stället för att tvingas mot närmaste ord — en felaktig
 * matchning ger fel näring utan att någon märker det, medan en tom rad syns.
 */
export function matchaLivsmedel(livsmedel) {
  return (livsmedel || []).map(x => {
    const träffar = searchFoods(x.namn, null, [], 5) || [];
    const bästa = träffar[0] || null;
    return {
      ...x,
      food: bästa,
      alternativ: träffar.slice(0, 5),
      matchad: !!bästa,
    };
  });
}

/**
 * Näring för de matchade posterna. Räknas av motorn ur FOOD_INDEX — modellen
 * bidrar med vilka livsmedel och ungefär hur mycket, aldrig med kalorierna.
 */
export function fotoNäring(poster) {
  const med = (poster || []).filter(p => p.matchad && p.food);
  const summa = med.reduce((a, p) => {
    const k = p.gram / 100;
    return {
      kcal: a.kcal + (p.food.kcal || 0) * k,
      protein: a.protein + (p.food.protein || 0) * k,
      carbs: a.carbs + (p.food.carbs || 0) * k,
      fat: a.fat + (p.food.fat || 0) * k,
    };
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  return {
    kcal: Math.round(summa.kcal),
    protein: Math.round(summa.protein),
    carbs: Math.round(summa.carbs),
    fat: Math.round(summa.fat),
    matchade: med.length,
    totalt: (poster || []).length,
    // Lägsta säkerheten bland posterna styr helhetens. En måltid är inte säkrare
    // än sin osäkraste del.
    säkerhet: med.some(p => p.säkerhet === "låg") ? "låg"
      : med.some(p => p.säkerhet === "medel") ? "medel" : "hög",
  };
}
