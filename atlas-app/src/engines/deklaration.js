// LÄSER NÄRINGSDEKLARATIONEN UR ETT FOTO.
//
// När streckkoden inte finns i Open Food Facts var enda vägen att skriva in
// allt för hand, eller gissa. Men uppgiften står ju på förpackningen — den är
// tryckt, standardiserad och obligatorisk enligt EU-förordning.
//
// SAMMA REGEL SOM ÖVERALLT: modellen LÄSER, den räknar aldrig. Här finns inte
// ens något att räkna — talen står i tabellen, och modellens enda uppgift är
// att överföra dem korrekt.
//
// Det gör det här till den mest tillförlitliga AI-användningen i appen: en
// avläsning går att kontrollera mot förpackningen med blotta ögat, till
// skillnad från en uppskattning av en tallrik mat.

export const DEKLARATION_SYSTEM = `Du läser näringsdeklarationer på svenska livsmedelsförpackningar.

Användaren fotar tabellen "Näringsvärde per 100 g" (eller per 100 ml).

SVARA ENDAST MED JSON, inget annat — ingen inledning, inga kodstaket:
{"namn":"Kvarg Vanilj","märke":"Lindahls","kcal":65,"protein":11,"carbs":4,"fat":0.2,"fiber":0.5,"sugar":3.8,"saturated":0.1,"salt":0.1,"portion":150,"enhet":"g","säkerhet":"hög"}

REGLER:

ALLA TAL GÄLLER PER 100 G eller per 100 ml — det är vad tabellen anger. Står värdena bara per portion: räkna om till 100 g och sätt säkerhet till "medel".

Energi anges ofta som "1300 kJ / 310 kcal". Ta KCAL-talet. Står bara kJ: dela med 4,184.

Läs de fält du faktiskt ser. Utelämna fält som inte står i tabellen — sätt dem INTE till 0. En vara utan fiberuppgift har okänd fiber, inte noll fiber, och en nolla är en osanning som följer med in i användarens dagssumma.

portion = portionsstorleken i gram om förpackningen anger en ("1 portion = 150 g" eller "Rekommenderad portion 30 g"). Utelämna om den inte står.

enhet = "g" eller "ml" beroende på vad tabellen anger.

namn och märke om de syns på bilden. Utelämna annars.

säkerhet: "hög" när tabellen är skarp och fullständigt läsbar, "medel" när något är suddigt eller du räknat om, "låg" när du är osäker på flera värden.

GISSA ALDRIG ETT TAL DU INTE SER. Går tabellen inte att läsa: svara {"vet_inte":true,"notering":"vad som gör den oläslig"}. Ett påhittat näringsvärde hamnar i användarens matlogg och styr både kalorimål och träningsråd — bättre att be om ett nytt foto.`;

/** Tolkar modellens svar. Kodstaket och inledande text städas bort. */
export function tolkaDeklaration(text) {
  if (!text || typeof text !== "string") return { ok: false, skäl: "tomt" };
  const rensad = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = rensad.indexOf("{");
  const slut = rensad.lastIndexOf("}");
  if (start < 0 || slut <= start) return { ok: false, skäl: "inte-json" };
  let d;
  try { d = JSON.parse(rensad.slice(start, slut + 1)); }
  catch (e) { return { ok: false, skäl: "trasig-json" }; }
  if (!d) return { ok: false, skäl: "fel-form" };

  if (d.vet_inte) {
    return { ok: false, skäl: "vet-inte", notering: String(d.notering || "").trim() };
  }

  const tal = (k, decimaler = 1) => {
    if (d[k] == null) return null;
    const n = Number(String(d[k]).replace(",", "."));
    if (!Number.isFinite(n) || n < 0) return null;
    const f = Math.pow(10, decimaler);
    return Math.round(n * f) / f;
  };

  const kcal = tal("kcal", 0);
  if (kcal == null) return { ok: false, skäl: "ingen-energi" };

  // ORIMLIGA VÄRDEN AVVISAS. Rent fett är 900 kcal/100 g — inget livsmedel
  // ligger över. Ett högre tal är en felläsning (ofta kJ taget som kcal), och
  // den skulle förgifta dagssumman.
  if (kcal > 900) return { ok: false, skäl: "orimligt", notering: "Över 900 kcal per 100 g — kanske kJ-värdet?" };

  const ut = {
    ok: true,
    kcal,
    protein: tal("protein") ?? 0,
    carbs: tal("carbs") ?? 0,
    fat: tal("fat") ?? 0,
    enhet: d.enhet === "ml" ? "ml" : "g",
    säkerhet: ["hög", "medel", "låg"].includes(d.säkerhet) ? d.säkerhet : "medel",
  };
  // Frivilliga fält utelämnas när de saknas — aldrig satta till 0.
  for (const k of ["fiber", "sugar", "saturated", "salt"]) {
    const v = tal(k, 2);
    if (v != null) ut[k] = v;
  }
  const portion = tal("portion", 0);
  if (portion != null && portion > 0) ut.portion = portion;
  if (d.namn) ut.namn = String(d.namn).trim().slice(0, 60);
  if (d.märke) ut.märke = String(d.märke).trim().slice(0, 40);
  return ut;
}

/**
 * Rimlighetskoll mot makrona.
 *
 * Protein och kolhydrater ger 4 kcal/g, fett 9. Summerar de till något helt
 * annat än det avlästa energivärdet har någon siffra lästs fel — och det är
 * bättre att flagga det än att låta en tyst felaktighet gå in i loggen.
 *
 * Toleransen är vid: fiber, sockeralkoholer och avrundningar på förpackningen
 * gör att summan sällan stämmer exakt ens på en korrekt läsning.
 */
export function stämmerMakron(d) {
  if (!d || !d.ok) return true;
  const summa = (d.protein || 0) * 4 + (d.carbs || 0) * 4 + (d.fat || 0) * 9;
  if (d.kcal < 20) return true;           // nästan energifritt, förhållandet blir brus
  const avvikelse = Math.abs(summa - d.kcal) / d.kcal;
  return avvikelse <= 0.35;
}
