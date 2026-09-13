// COACHEN UNDER PASSET.
//
// Ren funktion: ett loggat set in, en mening ut — eller null. Ingen slump,
// ingen AI, inget nätverk. Kommentaren räknas ut ur det som redan finns:
// förra passets set på samma övning, uppskattat 1RM, och var man är i passet.
//
// VARFÖR REGELBASERAT OCH INTE AI: kommentaren visas under vilan, inom
// millisekunder efter att setet loggats. Ett API-anrop hade tagit två sekunder
// och krävt nät på gymmet. Och det som är värt att säga är räknebart: "2,5 kg
// mer än förra gången" är ett subtraktionsresultat, inte en insikt.
//
// REGLER FÖR VAD SOM FÅR SÄGAS:
//   1. Det ska vara SANT och räknat, aldrig gissat. "Bra jobbat" är inte en
//      kommentar; "2,5 kg mer än förra passet" är.
//   2. Det ska vara NYTT — inget som redan står på skärmen. Setantalet syns i
//      rubriken; att upprepa det är brus.
//   3. Tystnad är ett giltigt svar. Ett set som är exakt som förra gången ger
//      null, inte "samma som sist".
//
// Rangordning när flera gäller: rekord först (sällsynt, viktigt), sedan
// jämförelse med förra passet, sedan läget i passet.

import { epley1RM } from "./utveckling.js";

const fmtKg = v => String(Math.round(v * 10) / 10).replace(".", ",");

/**
 * @param {object} set        { vikt, reps } som just loggats
 * @param {object} övning     live-posten: { exId, loggade, set, senaste }
 *                            där senaste är förra passets set på samma övning
 * @param {number} bästa1RM   högsta uppskattade 1RM före det här passet, eller null
 * @returns {string|null}
 */
export function coachKommentar(set, övning, bästa1RM = null) {
  if (!set || !set.vikt || !set.reps) return null;
  const { vikt, reps } = set;
  const nu1RM = epley1RM(vikt, reps);

  // ── Rekord ────────────────────────────────────────────────────────────────
  // Bara om det finns ett tidigare värde att slå. Första passet på en övning
  // är per definition ett rekord, och att säga det vore att fira ingenting.
  if (bästa1RM && nu1RM > bästa1RM && reps <= 12) {
    return `Nytt bästa: ${fmtKg(nu1RM)} kg uppskattat 1RM, upp från ${fmtKg(bästa1RM)}.`;
  }

  // ── Mot förra passet ──────────────────────────────────────────────────────
  // senaste = förra passets set på samma övning, i ordning. Jämför med samma
  // setnummer om det finns, annars med förra passets sista.
  const förra = övning && Array.isArray(övning.senaste) ? övning.senaste : null;
  const setNr = (övning && övning.loggade ? övning.loggade.length : 1) - 1;
  const ref = förra && förra.length
    ? (förra[setNr] || förra[förra.length - 1])
    : null;

  if (ref && ref.vikt && ref.reps) {
    const dV = vikt - ref.vikt;
    const dR = reps - ref.reps;
    if (dV > 0 && dR >= 0) return `${fmtKg(dV)} kg mer än förra passet${dR > 0 ? `, och ${dR} rep${dR > 1 ? "s" : ""} till` : ""}.`;
    if (dV === 0 && dR > 0) return `${dR} rep${dR > 1 ? "s" : ""} mer än förra passet på samma vikt.`;
    if (dV > 0 && dR < 0) {
      // Tyngre men färre reps — 1RM avgör om det var framsteg.
      const ref1RM = epley1RM(ref.vikt, ref.reps);
      if (nu1RM > ref1RM) return `Tyngre än förra passet. Uppskattat 1RM upp ${fmtKg(nu1RM - ref1RM)} kg.`;
      return null;
    }
    if (dV < 0 && dR > 2) return `Lättare men ${dR} reps fler. Volymen är ${vikt * reps > ref.vikt * ref.reps ? "högre" : "lägre"} än sist.`;
    // Sämre än sist: sägs bara om skillnaden är tydlig. En rep mindre är
    // dagsform, inte en trend.
    if (dV < 0 && dR <= 0 && ref.vikt - vikt >= 5) return `${fmtKg(ref.vikt - vikt)} kg lättare än sist. Tunga dagar finns.`;
    return null;
  }

  // ── Läget i passet ────────────────────────────────────────────────────────
  // Sista setet på övningen: bara om det finns mer i passet. Sista setet i
  // hela passet är kvittots sak.
  if (övning && övning.loggade && övning.set) {
    const kvar = övning.set - övning.loggade.length;
    if (kvar === 1) return "Ett set kvar på den här.";
  }
  return null;
}
