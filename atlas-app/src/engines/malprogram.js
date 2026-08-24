// MOTOR: Målresan → programval.
//
// LUCKAN DEN STÄNGER: målintervjun kommer fram till att du ska träna tre pass i
// veckan mot ett fettmål — och sedan visade programväljaren samma lista som för
// alla andra. Planen var beskrivande, inte styrande. `recommendPrograms` fanns
// och kunde väga in mål, nivå, dagar och återhämtning, men 2.0:s programväljare
// anropade den inte alls: den listade familjerna rakt av.
//
// Här översätts planen till kriterier, och kriterierna till en rankning MED
// SKÄL. Skälen är kravet, inte pynt: ett förslag som inte kan förklaras är en
// gissning med snyggare typsnitt.
//
// VAD MOTORN INTE GÖR: den väljer aldrig åt användaren. Den föreslår, motiverar
// och lämnar hela listan kvar. Ett mål är ett skäl att lyfta fram något — inte
// att gömma resten.

import { ALL_TEMPLATES, FAMILIES, recommendPrograms } from "./programs.js";

// Journeys måltyper → programmotorns tre inriktningar. `event` har ingen egen
// inriktning: att toppa formen till ett datum säger något om TIDEN, inget om
// vad som ska tränas. Då styr planens övriga delar i stället.
const TYP_TILL_GOAL = {
  strength: "Strength",
  muscle: "Hypertrophy",
  fatloss: "General",
  conditioning: "General",
  event: null,
};

// Profilens träningsvana → programmotorns nivånamn.
const NIVÅ_TILL_LEVEL = { beginner: "Novice", intermediate: "Intermediate", advanced: "Advanced" };

/**
 * Målresans plan + profilen → kriterier för `recommendPrograms`.
 *
 * Returnerar null när underlaget inte räcker för att säga något — utan mål
 * eller utan plan finns ingen riktning att översätta, och då ska väljaren se ut
 * som den alltid gjort.
 */
export function programkriterier(mål, profile) {
  if (!mål || !mål.plan) return null;
  const p = profile || {};
  const goal = TYP_TILL_GOAL[mål.typ] || null;

  // Viktningen låter ett sammansatt mål styra bortom en enda etikett: en
  // fettresa med styrkeinslag ska inte rankas som ren kondition.
  const vikter = { muscle: 0, strength: 0, fatloss: 0, conditioning: 0 };
  if (mål.typ === "muscle") { vikter.muscle = 100; vikter.strength = 35; }
  else if (mål.typ === "strength") { vikter.strength = 100; vikter.muscle = 35; }
  else if (mål.typ === "fatloss") { vikter.fatloss = 100; vikter.conditioning = 45; vikter.muscle = 35; }
  else if (mål.typ === "conditioning") { vikter.conditioning = 100; vikter.fatloss = 30; }
  else { vikter.muscle = 45; vikter.strength = 25; vikter.fatloss = 35; vikter.conditioning = 45; }

  // Cardio i planen äter av veckans träningstid. Ett program på fem dagar plus
  // tre löppass är sju träningsdagar — och då är det programmet som spricker.
  const cardio = (mål.plan && mål.plan.cardioPerVecka) || 0;

  return {
    goal,
    level: NIVÅ_TILL_LEVEL[p.level] || null,
    days: typeof mål.passPerVecka === "number" ? mål.passPerVecka : null,
    weights: vikter,
    cardioPerVecka: cardio,
  };
}

/** Skälet till att en mall hamnar högt — formulerat ur kriterierna, aldrig fritt. */
function skäl(mall, krit, mål) {
  const ut = [];
  if (krit.days && mall.daysPerWeek === krit.days) ut.push(`${mall.daysPerWeek} pass i veckan, precis som planen`);
  else if (krit.days) {
    const d = mall.daysPerWeek - krit.days;
    const n = Math.abs(d);
    ut.push(`${mall.daysPerWeek} pass i veckan (${n} ${d > 0 ? "mer" : "färre"} än planens ${krit.days})`);
  }
  if (krit.goal && mall.goal === krit.goal) {
    const ord = { Strength: "styrka", Hypertrophy: "muskeltillväxt", General: "allmän form och fettreducering" }[mall.goal];
    ut.push(`inriktat mot ${ord} — samma som ditt mål`);
  }
  if (krit.level && mall.level === krit.level) ut.push(`nivån matchar din träningsvana`);
  const fam = FAMILIES[mall.family];
  if (fam && krit.cardioPerVecka >= 2 && mall.daysPerWeek <= 4) ut.push(`lämnar plats för dina ${krit.cardioPerVecka} konditionspass`);
  return ut;
}

/**
 * Rankade programförslag för målresan.
 *
 * Returnerar { krit, förslag: [{ mall, poäng, skäl }], varning } eller null.
 * `varning` är ärlighetsventilen: hittar motorn ingen mall som matchar planens
 * dagar sägs det, i stället för att den bästa dåliga passeras av som ett svar.
 */
export function programförslag({ mål, profile, sessions = [], readiness = null, antal = 3 }) {
  const krit = programkriterier(mål, profile);
  if (!krit) return null;

  const rankade = recommendPrograms({
    goal: krit.goal,
    level: krit.level,
    days: krit.days,
    recovery: readiness,
    history: sessions,
    weights: krit.weights,
  });
  if (!rankade || !rankade.length) return null;

  const förslag = rankade.slice(0, antal).map(r => ({
    mall: r.template,
    poäng: Math.round(r.score * 10) / 10,
    skäl: skäl(r.template, krit, mål),
  }));

  // Ärlighet: matchar toppförslaget inte planens dagar är det en kompromiss,
  // och det ska stå — annars ser användaren ett förslag som inte går ihop med
  // sin egen plan och tror att appen räknat fel.
  let varning = null;
  const topp = förslag[0];
  if (krit.days && topp.mall.daysPerWeek !== krit.days) {
    varning = `Ingen mall ligger på exakt ${krit.days} pass i veckan. Närmast är ${topp.mall.daysPerWeek} — antingen justerar du planen, eller så lägger du till respektive hoppar över ett pass.`;
  } else if (krit.cardioPerVecka && (topp.mall.daysPerWeek + krit.cardioPerVecka) > 6) {
    varning = `${topp.mall.daysPerWeek} styrkepass plus ${krit.cardioPerVecka} konditionspass blir ${topp.mall.daysPerWeek + krit.cardioPerVecka} träningsdagar i veckan. Det är mycket att återhämta sig från — överväg att lägga cardiot samma dag som ett styrkepass.`;
  }

  return { krit, förslag, varning };
}

/**
 * Passar ett REDAN AKTIVT program målresan? Svarar bara när det finns underlag
 * för en bedömning; annars null, aldrig ett svävande "kanske".
 */
export function passarAktivtProgram(aktivt, mål, profile) {
  const krit = programkriterier(mål, profile);
  if (!krit || !aktivt) return null;
  const avvikelser = [];
  if (krit.days && aktivt.daysPerWeek !== krit.days) {
    const d = aktivt.daysPerWeek - krit.days;
    avvikelser.push(`Programmet har ${aktivt.daysPerWeek} pass i veckan, planen ${krit.days} (${d > 0 ? "+" : ""}${d}).`);
  }
  if (krit.goal && aktivt.goal && aktivt.goal !== krit.goal) {
    const ord = { Strength: "styrka", Hypertrophy: "muskeltillväxt", General: "allmän form" };
    avvikelser.push(`Programmet är inriktat mot ${ord[aktivt.goal] || aktivt.goal}, målet mot ${ord[krit.goal] || krit.goal}.`);
  }
  return {
    passar: avvikelser.length === 0,
    avvikelser,
    // Ett program som avviker är inte fel — det kan vara ett medvetet val.
    // Formuleringen ska inte låta som en tillsägelse.
    text: avvikelser.length === 0
      ? "Ditt program ligger i linje med målresan."
      : "Ditt program skiljer sig från planen. Det kan vara medvetet — men det är värt att veta.",
  };
}

export const _TYP_TILL_GOAL = TYP_TILL_GOAL;
export const _ALLA_MALLAR = ALL_TEMPLATES;
