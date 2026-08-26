// KROPPSMÅTT — registret över vad som går att mäta.
//
// EN LISTA, INTE FEMTON STÄLLEN. Måtten ska kunna växa utan att någon vy,
// motor eller lagring skrivs om: lägg till en post här och den dyker upp i
// formuläret, i historiken, i detaljvyn och i asymmetrijämförelsen. Det var
// hela poängen med att bygga registret först.
//
// Att lägga till handled, fotled, säte eller överarm spänd är alltså en rad
// var. Inget annat behöver röras.
//
// ID:NA ÄR LAGRINGSNYCKLAR och får aldrig bytas — de står i användarens
// sparade mätningar. Etiketten är fri att skriva om; id:t är inte det.

/** Grupper i den ordning de visas. */
export const GRUPPER = [
  { id: "overkropp", namn: "Överkropp" },
  { id: "armar", namn: "Armar" },
  { id: "ben", namn: "Ben" },
];

/**
 * Ett mått.
 *
 *   id      lagringsnyckel, oföränderlig
 *   namn    etikett i gränssnittet
 *   grupp   id ur GRUPPER
 *   enhet   "cm" — se ENHETER nedan för varför det står per mått
 *   sida    "vanster" | "hoger" | null  — null = enkelt mått
 *   par     id på motsvarande mått på andra sidan, för asymmetrijämförelsen
 *   kort    kort etikett där utrymmet är trångt (historiklistan)
 */
export const KROPPSMATT = [
  // ── Överkropp ──────────────────────────────────────────────────────────────
  { id: "hals", namn: "Hals", grupp: "overkropp", enhet: "cm" },
  { id: "axlar", namn: "Axlar", grupp: "overkropp", enhet: "cm" },
  { id: "brost", namn: "Bröst", grupp: "overkropp", enhet: "cm" },
  { id: "midja", namn: "Midja", grupp: "overkropp", enhet: "cm" },
  { id: "mage", namn: "Mage", grupp: "overkropp", enhet: "cm" },
  { id: "hoft", namn: "Höft", grupp: "overkropp", enhet: "cm" },

  // ── Armar ──────────────────────────────────────────────────────────────────
  { id: "biceps_vanster", namn: "Vänster biceps", kort: "Biceps V", grupp: "armar", enhet: "cm", sida: "vanster", par: "biceps_hoger" },
  { id: "biceps_hoger", namn: "Höger biceps", kort: "Biceps H", grupp: "armar", enhet: "cm", sida: "hoger", par: "biceps_vanster" },
  { id: "underarm_vanster", namn: "Vänster underarm", kort: "Underarm V", grupp: "armar", enhet: "cm", sida: "vanster", par: "underarm_hoger" },
  { id: "underarm_hoger", namn: "Höger underarm", kort: "Underarm H", grupp: "armar", enhet: "cm", sida: "hoger", par: "underarm_vanster" },

  // ── Ben ────────────────────────────────────────────────────────────────────
  { id: "lar_vanster", namn: "Vänster lår", kort: "Lår V", grupp: "ben", enhet: "cm", sida: "vanster", par: "lar_hoger" },
  { id: "lar_hoger", namn: "Höger lår", kort: "Lår H", grupp: "ben", enhet: "cm", sida: "hoger", par: "lar_vanster" },
  { id: "vad_vanster", namn: "Vänster vad", kort: "Vad V", grupp: "ben", enhet: "cm", sida: "vanster", par: "vad_hoger" },
  { id: "vad_hoger", namn: "Höger vad", kort: "Vad H", grupp: "ben", enhet: "cm", sida: "hoger", par: "vad_vanster" },
];

/** Uppslag på id. */
export const MATT_INDEX = Object.fromEntries(KROPPSMATT.map(m => [m.id, m]));

/** Måtten i en grupp, i registrets ordning. */
export const mattIGrupp = gruppId => KROPPSMATT.filter(m => m.grupp === gruppId);

/**
 * Par av vänster/höger, ett per muskelgrupp.
 *
 * Härlett ur registret i stället för listat separat — en ny sida behöver bara
 * `sida` och `par`, och paret dyker upp här av sig självt.
 */
export const MATT_PAR = KROPPSMATT
  .filter(m => m.sida === "vanster" && m.par && MATT_INDEX[m.par])
  .map(m => ({
    vanster: m.id,
    hoger: m.par,
    // "Vänster biceps" → "Biceps". Namnet på det som mäts, utan sidan.
    namn: m.namn.replace(/^(Vänster|Höger)\s+/i, "").replace(/^./, c => c.toUpperCase()),
  }));

/**
 * KROPPSSAMMANSÄTTNING — vikt, kroppsfett, muskel.
 *
 * De ligger som EGNA FÄLT på mätningen (`kg`, `fat`, `muscle`) och inte i
 * `matt`, eftersom de fanns före kroppsmåtten och läses av profilen, coachen,
 * målplanen, framstegsvyn och Omron-importen. Att flytta in dem i `matt` hade
 * varit prydligare och brutit fem läsare för ingenting.
 *
 * Registret här beskriver dem ändå, så vyerna kan behandla alla mätvärden lika
 * — samma detaljvy, samma graf, samma förändringsberäkning.
 *
 *   falt        fältnamnet på mätningen
 *   enhet       "kg" eller "%"
 *   enhetDiff   enheten för en FÖRÄNDRING. För procenttal är det inte "%" utan
 *               "pp" — procentenheter. Från 24,3 % till 22,5 % är −1,8 pp, inte
 *               −1,8 %. (Procentuellt är det −7,4 %.) Att blanda ihop dem gör
 *               siffran fel med en faktor som varierar med utgångsvärdet.
 *   min/max     rimlighetsgränser, se validering i engines/utveckling.js
 */
export const KROPPSSAMMANSATTNING = [
  { id: "kg", falt: "kg", namn: "Vikt", enhet: "kg", enhetDiff: "kg", min: 20, max: 400, bra: "ner" },
  { id: "fat", falt: "fat", namn: "Kroppsfett", enhet: "%", enhetDiff: "pp", min: 3, max: 70, bra: "ner" },
  { id: "muscle", falt: "muscle", namn: "Muskelmassa", enhet: "%", enhetDiff: "pp", min: 10, max: 70, bra: "upp" },
  { id: "visceral", falt: "visceral", namn: "Visceralt fett", enhet: "", enhetDiff: "", min: 1, max: 59, bra: "ner" },
];

export const SAMMANSATTNING_INDEX = Object.fromEntries(KROPPSSAMMANSATTNING.map(m => [m.id, m]));

/**
 * ALLA MÄTBARA STORHETER under ett gemensamt id-rum.
 *
 * Detaljvyn, grafen och förändringsberäkningen tar ETT id och behöver inte veta
 * om det är en kroppssammansättning eller en omkrets. Det är det som gör att
 * det finns en detaljvy i stället för femton.
 *
 * `källa` säger var värdet bor på posten: "falt" = direkt på mätningen,
 * "matt" = i matt-objektet.
 */
export const ALLA_MATT = [
  ...KROPPSSAMMANSATTNING.map(m => ({ ...m, källa: "falt" })),
  ...KROPPSMATT.map(m => ({ ...m, källa: "matt", enhetDiff: m.enhet, bra: null, min: 1, max: 300 })),
];

export const ALLA_INDEX = Object.fromEntries(ALLA_MATT.map(m => [m.id, m]));

/**
 * ENHETER — kg/cm i dag, lb/inch senare.
 *
 * Lagringen är ALLTID metrisk. En enhetsinställning ska bara byta hur talet
 * visas och tolkas vid inmatning, aldrig vad som ligger i localStorage — annars
 * blir en användare som byter enhet av med sin historik, eller får den
 * omräknad två gånger.
 *
 * Ingen inställning byggs nu. Det som byggs är att omräkningen har EN plats att
 * hamna på när den behövs.
 */
export const ENHETER = {
  kg: { metrisk: "kg", imperiell: "lb", faktor: 2.20462 },
  cm: { metrisk: "cm", imperiell: "in", faktor: 0.393701 },
  "%": { metrisk: "%", imperiell: "%", faktor: 1 },
  pp: { metrisk: "pp", imperiell: "pp", faktor: 1 },
  "": { metrisk: "", imperiell: "", faktor: 1 },
};

/** Visningsenhet för en lagrad enhet. `system` är "metrisk" (förval). */
export const visaEnhet = (enhet, system = "metrisk") =>
  (ENHETER[enhet] || { metrisk: enhet, imperiell: enhet })[system] ?? enhet;
