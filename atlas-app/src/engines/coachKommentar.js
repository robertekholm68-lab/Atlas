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
// övningens summa när sista setet är loggat, sedan jämförelse med förra passets
// samma setnummer, sedan läget i passet.

import { epley1RM } from "./utveckling.js";
import { formatVolume } from "./index.js";

const fmtKg = v => String(Math.round(v * 10) / 10).replace(".", ",");

/** Volymen i kg för en rad set. Kroppsviktsövningar ger 0 — och ska göra det. */
const volym = set => (set || []).reduce((a, s) => a + (s.vikt || 0) * (s.reps || 0), 0);

/**
 * FÖRRA PASSETS SET PÅ ÖVNINGEN, som en rad.
 *
 * VARFÖR. Siffrorna fanns redan i `live`-posten — coachen jämförde mot dem vid
 * varje loggat set — men de VISADES aldrig. Den som stod vid bänken och skulle
 * välja vikt fick ett förslag utan att se vad förslaget byggde på. "Sist: 80 kg
 * × 8, 8, 7" är det man annars bläddrar i historiken efter.
 *
 * Raden tar INGEN ny plats: den delar rad med "Förra setet: …", som redan finns
 * men bara har något att säga efter det första setet. Före det stod platsen tom.
 *
 * FORMEN FÖLJER DATAN. Nästan alla set körs på samma vikt, och då är
 * "80 kg × 8, 8, 7" både kortare och lättare att läsa än tre upprepningar av
 * vikten. Skiljer vikterna sig skrivs de ut par för par. Passvyn är den enda vy
 * som måste rymmas utan scroll, så en rad som wrappar kostar riktigt.
 *
 * @returns {string|null} null när det inte finns något förra pass att visa.
 */
export function förraPassetRad(senaste) {
  const set = (senaste || []).filter(s => s && s.reps);
  if (!set.length) return null;
  // Sex set räcker för att se mönstret; fler skulle wrappa till två rader.
  const visa = set.slice(0, 6);
  const svans = set.length > visa.length ? ` +${set.length - visa.length}` : "";
  const sammaVikt = visa.every(s => s.vikt === visa[0].vikt);

  if (sammaVikt && visa[0].vikt > 0) return `Sist: ${fmtKg(visa[0].vikt)} kg × ${visa.map(s => s.reps).join(", ")}${svans}`;
  // Kroppsvikt: en vikt på noll är inte en saknad vikt, och "0 kg × 12" vore
  // en nolla som ser ut som en mätning.
  if (sammaVikt) return `Sist: ${visa.map(s => s.reps).join(", ")} reps${svans}`;
  return `Sist: ${visa.map(s => `${fmtKg(s.vikt)}×${s.reps}`).join(" · ")}${svans}`;
}

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

  const förra = övning && Array.isArray(övning.senaste) ? övning.senaste : null;

  // ── Övningen klar: summan, inte setet ─────────────────────────────────────
  // PÅ SISTA SETET BYTER COACHEN NIVÅ. Ett enskilt set som är exakt som förra
  // gången är ingen nyhet och ger tystnad (regel 3) — men när övningen är klar
  // är TOTALEN ny information. Den står ingenstans på skärmen, och "lika mycket
  // som förra passet" är ett svar på frågan man faktiskt bär med sig: gick det
  // framåt?
  //
  // Därför är tystnadsregeln oförändrad där den gäller. Den handlar om ett set,
  // och det här är ett annat påstående om en annan sak.
  if (övning && övning.set && övning.loggade && övning.loggade.length >= övning.set) {
    const nu = volym(övning.loggade);
    // Kroppsviktsövningar ger noll volym. Då finns ingen summa att jämföra, och
    // en nolla i kg vore ett påhittat tal — övningen faller igenom till
    // jämförelsen nedan i stället.
    if (nu > 0) {
      const förrVolym = volym(förra);
      if (!förrVolym) return `Övningen klar: ${formatVolume(nu)} kg totalt.`;
      const d = nu - förrVolym;
      if (d === 0) return `Övningen klar: ${formatVolume(nu)} kg — exakt som förra passet.`;
      return `Övningen klar: ${formatVolume(nu)} kg, ${formatVolume(Math.abs(d))} kg ${d > 0 ? "mer" : "mindre"} än förra passet.`;
    }
  }

  // ── Mot förra passet ──────────────────────────────────────────────────────
  // senaste = förra passets set på samma övning, i ordning. Jämför med samma
  // setnummer om det finns, annars med förra passets sista.
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
