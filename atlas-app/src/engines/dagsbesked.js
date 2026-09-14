// MOTOR: hemvyns dagliga besked — meningen under kartan.
//
// VARFÖR DEN SKREVS OM. Beskedet var en ren avläsning av readiness:
// "Quadriceps och bröst är redo för belastning." Sant varje dag, och därför
// samma varje dag. Den som öppnar appen på morgonen efter ett pass, på en
// vilodag och efter en vecka utan träning möttes av samma mening i alla tre
// lägena. En coach som säger samma sak oavsett vad som hänt slutar man läsa,
// och då spelar det ingen roll att den har rätt.
//
// Det som skiljer lägena åt fanns redan i loggen: när du tränade senast, vad
// passet innehöll, vilka muskler det belastade. Beskedet säger nu DET, och
// låter readiness vara det som kartan redan visar i färg.
//
// SAMMA REGLER SOM PÅMINNELSERNA (`nudges.js`):
//   · Bara räknade tal. Ingen mening påstår något som inte går att härleda.
//   · Inget som redan står på skärmen. Nästa pass i programmet står under
//     startknappen ("Föreslaget: …") och upprepas därför aldrig här.
//   · Utan underlag sägs det rakt ut, aldrig en siffra i stället.
//
// Beskedet delar plats med påminnelsen i hemvyn — finns en påminnelse är den
// mer angelägen och tar platsen. De två visas alltså aldrig samtidigt, och
// behöver inte vara överens om vem som säger vad om dagarna sedan passet.

import { startOfLocalDay, formatVolume } from "./index.js";
// OBS: `sessionVolume` finns i TVÅ moduler och betyder olika saker.
// `store.js` summerar vikt × reps och ger KILO — det som ska stå i meningen.
// `index.js` summerar `muscleLoads` och ger en LAST utan enhet. Samma namn,
// två storheter; hämtas den ur fel modul blir "3 200 kg" ett lasttal.
import { sessionVolume } from "../atlas2/store.js";
import { MUSCLES } from "../data/muscles.js";

const DAG = 864e5;

const muskelNamn = id => (MUSCLES[id] && MUSCLES[id].name) || id;

/** De två tyngst belastade musklerna i ett pass, eller null. */
function tyngstBelastade(pass) {
  // `muscleLoads` saknas i äldre importerad data. Ett pass utan fältet ska ge
  // tystnad om musklerna, inte en krasch och inte en tom uppräkning.
  const laster = Object.entries(pass.muscleLoads || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  if (!laster.length) return null;
  return laster.slice(0, 2).map(([id]) => muskelNamn(id)).join(" och ");
}

/**
 * Dagens besked. Ren funktion — samma indata ger samma mening.
 *
 * @param {object} states    bodyState().states
 * @param {array}  sessions  hela historiken
 * @returns {{ text: string, empty?: boolean }}
 *   `empty` är sant BARA när det inte finns en enda muskel med underlag. Den
 *   flaggan styr startknappens text ("Starta första passet") och får därför
 *   inte sättas av att man tagit en vilovecka.
 */
export function dagensBesked({ states = {}, sessions = [], now = Date.now() } = {}) {
  const med = Object.entries(states).filter(([, s]) => s && s.status !== "no_data" && s.readiness != null);
  if (!med.length) return { text: "Ingen historik än. Logga ett pass så börjar kartan färgas.", empty: true };

  const redo = med.filter(([, s]) => s.readiness >= 76).sort((a, b) => b[1].readiness - a[1].readiness);
  const trött = med.filter(([, s]) => s.readiness < 56).sort((a, b) => a[1].readiness - b[1].readiness);
  const lista = arr => arr.slice(0, 2).map(([id]) => muskelNamn(id)).join(" och ");

  const senaste = (sessions || [])
    .filter(s => s && s.completedAt)
    .sort((a, b) => b.completedAt - a.completedAt)[0];

  // DYGN, INTE TIMMAR. Ett pass klockan 07:00 och en app som öppnas 19:30 är
  // samma dag, inte "ett dygn sedan" — samma räkning som rekordpåminnelsens
  // `dagsord()`, och av samma skäl.
  const dygn = senaste ? Math.round((startOfLocalDay(now) - startOfLocalDay(senaste.completedAt)) / DAG) : null;

  // ── Tränat i dag ────────────────────────────────────────────────────────
  // Kvitto, inte uppmaning. Den som just tränat ska mötas av vad den gjorde.
  // Readiness utelämnas med flit: kartan ovanför visar den redan i färg, och
  // siffran är ändå i rörelse resten av dygnet.
  if (dygn === 0) {
    const antalSet = (senaste.sets || []).length;
    const jobbar = tyngstBelastade(senaste);
    // Ett sportpass har inga set. "0 set, 0 kg" vore att svara på en fråga som
    // inte ställdes — meningen kortas i stället.
    const kvitto = antalSet > 0
      ? `Passet är loggat: ${antalSet} set, ${formatVolume(sessionVolume(senaste))} kg.`
      : "Passet är loggat.";
    return { text: jobbar ? `${kvitto} ${jobbar} jobbar nu.` : kvitto };
  }

  // ── Tränat i går ────────────────────────────────────────────────────────
  if (dygn === 1) {
    const titel = senaste.title || "ett pass";
    return {
      text: redo.length
        ? `I går: ${titel}. ${lista(redo)} är redo i dag.`
        : `I går: ${titel}. Kroppen behöver återhämtning i dag.`,
    };
  }

  // ── Två dagar eller mer ─────────────────────────────────────────────────
  // Talet gör meningen ny varje dag, och det är ett konstaterande — inte en
  // tillrättavisning. Att det gått fyra dagar kan vara precis rätt; vad kroppen
  // säger om det står i andra halvan.
  if (dygn != null && dygn >= 2) {
    const läge = redo.length
      ? `${lista(redo)} är redo.`
      : trött.length ? "Kroppen behöver mer vila." : "Måttlig beredskap över hela kroppen.";
    return { text: `${dygn} dagar sedan senaste passet. ${läge}` };
  }

  // ── Underlag utan pass ──────────────────────────────────────────────────
  // Går inte att nå i dag (kartan färgas av pass), men om den vägen någonsin
  // öppnas ska svaret vara beredskapen — inte en tom sträng.
  if (redo.length && trött.length) return { text: `${lista(redo)} är redo. ${muskelNamn(trött[0][0])} behöver mer vila.` };
  if (redo.length) return { text: `${lista(redo)} är redo för belastning.` };
  if (trött.length) return { text: "Kroppen behöver återhämtning idag. Ta det lugnt eller vila." };
  return { text: "Måttlig beredskap över hela kroppen." };
}
