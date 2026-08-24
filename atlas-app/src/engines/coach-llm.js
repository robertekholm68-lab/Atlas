// MOTOR: Claude som formulerare, inte som faktakälla.
//
// GRUNDREGELN, som hela filen är byggd för att upprätthålla:
//
//     MOTORN RÄKNAR. MODELLEN FORMULERAR. MODELLEN LÄGGER ALDRIG TILL ETT TAL.
//
// `coachReply` (regelbaserad) står kvar och är förstahandsvalet: den är testad,
// känner igen avsikter och citerar kunskapsbanken med källa. Den här modulen är
// för det den INTE klarar — fritext som inte matchar någon avsikt. "Jag har ont
// i axeln när jag pressar" är en riktig fråga som ingen regeltabell fångar.
//
// Varför en språkmodell inte får räkna: den producerar tal som LÅTER rimliga.
// "Din bröstmuskel är ungefär 80 procent återhämtad" när motorn sagt 82 är inte
// en avrundning, det är en andra sanning om samma kropp. Därför:
//
//   1. Prompten innehåller BARA tal ur coachFacts.
//   2. Svaret granskas efteråt — varje tal jämförs mot underlaget.
//   3. Hittar modellen på ett tal förkastas svaret. Vi visar hellre den
//      regelbaserade coachens svar än ett påhittat tal.
//
// Punkt 3 är det som gör skillnad. Ett systemmeddelande är en önskan; en
// kontroll efter svaret är en garanti.

/** Tecken som skiljer tal åt, så "82,5" och "82.5" räknas som samma. */
const norm = t => String(t).replace(",", ".");

/**
 * Alla tal som förekommer i underlaget. Det här är facit som svaret prövas mot.
 * Genereras ur det faktiska objektet, inte ur en handskriven lista — annars
 * skulle en ny siffra i coachFacts tyst börja underkännas.
 */
export function tillåtnaTal(underlag) {
  const ut = new Set();
  const gå = v => {
    if (v == null) return;
    if (typeof v === "number") { ut.add(norm(v)); ut.add(norm(Math.round(v))); return; }
    if (typeof v === "string") { (v.match(/\d+([.,]\d+)?/g) || []).forEach(t => ut.add(norm(t))); return; }
    if (Array.isArray(v)) { v.forEach(gå); return; }
    if (typeof v === "object") Object.values(v).forEach(gå);
  };
  gå(underlag);
  // Små tal är ordningstal och uppräkningar ("tre pass", "2 set"), inte
  // påståenden om mätvärden. Att underkänna dem skulle göra varje naturlig
  // mening omöjlig.
  for (let n = 0; n <= 10; n++) ut.add(String(n));
  return ut;
}

/**
 * Granskar ett svar. Returnerar de tal modellen hittat på.
 * Tom lista = svaret får visas.
 */
export function påhittadeTal(svar, underlag) {
  const ok = tillåtnaTal(underlag);
  const funna = String(svar || "").match(/\d+([.,]\d+)?/g) || [];
  return [...new Set(funna.map(norm).filter(t => !ok.has(t)))];
}

/**
 * Plockar ut det ur coachFacts som är meningsfullt att formulera kring.
 * Allt som skickas hit blir också godkänt i talkontrollen — därför får inget
 * annat än motorns egna värden ingå.
 */
export function byggUnderlag(facts, extra = {}) {
  const k = facts.kropp || {};
  const t = facts.träning || {};
  const kost = facts.kost || {};
  const mål = facts.målresa || null;
  return {
    readiness: k.readiness,
    readinessFörklaring: (k.readinessWhy && k.readinessWhy.factors || [])
      .filter(f => f.delta != null && f.delta !== 0)
      .map(f => ({ vad: f.label, effekt: f.delta, skäl: f.note })),
    utvilade: (k.redo || []).slice(0, 4).map(m => ({ muskel: m.namn, värde: m.värde })),
    slitna: (k.slitna || []).slice(0, 4).map(m => ({ muskel: m.namn, värde: m.värde })),
    otränade: (k.otränade || []).slice(0, 3).map(m => m.namn),
    tillitTillUnderlaget: k.tillit && k.tillit.nivå,
    tillitSkäl: k.tillit && k.tillit.skäl,
    passSenasteVeckan: t.antalIVeckan,
    volymIVeckan: t.volymIVeckan,
    volymFörraVeckan: t.volymFörraVeckan,
    program: facts.program && facts.program.namn,
    proteinMål: kost.harMål ? kost.proteinMål : null,
    proteinIntag: kost.harMål ? kost.proteinIntag : null,
    // MÅLRESANS PLANLÄGE. Tas med bara när målet har en coachplanerad plan —
    // annars skulle nollor och null-fält bli tal modellen tror sig få använda.
    // Talen kommer ur malplan-motorn via facts, så de är redan tillåtna av
    // talkontrollen; skälet ("väg dig") följer med så modellen kan säga att
    // läget inte går att bedöma i stället för att gissa.
    ...(mål && mål.harPlan ? {
      målresa: mål.namn,
      veckorKvarTillMål: mål.veckorKvar,
      nästaDelmål: mål.nästaMätbara
        ? { vad: mål.nästaMätbara.metric, mål: mål.nästaMätbara.target, enhet: mål.nästaMätbara.unit, dagarKvar: mål.nästaMätbara.dagarKvar }
        : null,
      viktAvvikelseMotPlan: mål.viktAvvikelse,
      viktLägeGårInteAttBedöma: mål.viktSkäl,
      passAvvikelseMotPlan: mål.passAvvikelse,
      planensRiktlinjer: mål.dimensioner,
    } : {}),
    fårUttalaSigOm: facts.datalage && facts.datalage.fårUttalaSig,
    ...extra,
  };
}

export const SYSTEMPROMPT = `Du är coachen i Askr, en svensk styrketräningsapp. Tesen är "kroppen är gränssnittet": en muskelkarta visar återhämtning per muskel, räknad ur användarens loggade pass.

ABSOLUT REGEL — DU FÅR INTE RÄKNA.
Du får ENDAST använda tal som står i faktaunderlaget. Du får aldrig hitta på, uppskatta, räkna om eller avrunda fram ett nytt tal. Saknas en siffra: nämn den inte. Att skriva "ungefär 80 procent" när underlaget säger 82 är ett fel, inte en avrundning.

NÄR UNDERLAGET INTE RÄCKER.
Står det att tilliten är "ingen" eller "svag", eller att ett värde saknas: säg det rakt ut. "Jag har för lite loggat för att säga något om det." Det svaret är alltid bättre än en gissning.

TON.
Torr, saklig svenska. Du talar till någon som står i ett gym. Inga utropstecken, ingen peppning, inga emojis, inga metaforer om resor eller berg. Skriv som en kunnig person som svarar kort.

LÄNGD.
Högst 60 ord. Är svaret enkelt: en mening. Utförlighet är en signal om att du har något att invända mot — spara den.

HÄLSOGRÄNS.
Du talar om träning och kost utifrån användarens data. Du är inte läkare. Gäller frågan smärta, skada eller symtom: säg kort att du inte kan bedöma det och hänvisa vidare, utan att låtsas veta.

INGEN MARKDOWN. Skriv aldrig **stjärnor** kring ord, inga rubriker, inga punktlistor. Appen visar din text rakt av, så stjärnor syns som stjärnor.

INGA UPPMANINGAR OM ATT BOKA VÅRD I BRÅDSKANDE TON. Gäller frågan smärta: säg att du inte kan bedöma det och att en läkare eller fysioterapeut kan. Skriv det lugnt och utan utropstecken — du vet inte hur allvarligt det är, och ska inte låtsas veta det heller.

ALDRIG "vi" eller "tillsammans". Du är ett verktyg, inte en träningskompis.`;

/**
 * Frågar Claude. Anropet går genom `hämtaSvar`, som injiceras — motorn ska inte
 * känna till vare sig fetch, nycklar eller proxy-adresser.
 *
 * @returns { ok, text, skäl, påhittade }
 */
export async function frågaCoachen({ fråga, facts, extra, hämtaSvar }) {
  if (typeof hämtaSvar !== "function") return { ok: false, skäl: "ingen-koppling" };
  const underlag = byggUnderlag(facts, extra);

  let text;
  try {
    text = await hämtaSvar({
      system: SYSTEMPROMPT,
      meddelande: `FAKTAUNDERLAG (allt du får använda):\n${JSON.stringify(underlag, null, 1)}\n\nAnvändarens fråga: "${fråga}"`,
    });
  } catch (e) {
    return { ok: false, skäl: "nät", detalj: String(e && e.message || e) };
  }
  if (!text || !String(text).trim()) return { ok: false, skäl: "tomt" };

  // Efterkontrollen. Ett systemmeddelande är en önskan; det här är garantin.
  const påhittade = påhittadeTal(text, underlag);
  if (påhittade.length) return { ok: false, skäl: "påhittade-tal", påhittade, text };

  // Markdown städas i stället för att förkasta svaret. Stjärnor är fult, inte
  // farligt — och att kasta ett i övrigt korrekt svar för formateringens skull
  // vore att låta det perfekta stå i vägen. Första provet mot den skarpa proxyn
  // gav "Du tränar **Push A** idag", trots att prompten bad om ren text.
  const städat = String(text).trim()
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|\s)\*(\S.*?)\*(?=\s|$)/g, "$1$2")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-•]\s+/gm, "");

  return { ok: true, text: städat };
}
