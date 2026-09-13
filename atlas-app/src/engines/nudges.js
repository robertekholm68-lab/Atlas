// MOTOR: händelsedrivna påminnelser. Rena funktioner, deterministiska.
//
// VARFÖR händelsedrivna och inte klockstyrda: en webbapp kan inte väcka sig
// själv. `new Notification()` fungerar bara medan appen är igång, och riktiga
// alarm kräver antingen en push-server eller ett Android-skal. Men det är inte
// huvudskälet.
//
// Huvudskälet är att klockan oftast påminner om FEL sak. Appens egen
// kunskapsbank säger att kreatin är 3–5 g/dag där det dagliga intaget över tid
// fyller depåerna — ingen uppladdning, ingen timing. En påminnelse 08:00 för
// kreatin påminner alltså om något som inte spelar roll. Det som spelar roll är
// om det blev taget alls, och det är en kryssruta, inte ett alarm.
//
// Det som DÄREMOT är tidskänsligt är sådant som hänger ihop med en händelse
// appen faktiskt känner till. Askr vet när du tränade. "Du loggade ett pass för
// 40 minuter sedan" är både mer träffsäkert än en klocka och byggbart utan
// infrastruktur.
//
// REGLER FÖR VAD SOM FÅR BLI EN PÅMINNELSE:
//   1. Den ska hänga på en händelse appen KÄNNER TILL, inte på en tidpunkt.
//   2. Den ska ha stöd i kunskapsbanken, inte i magkänsla.
//   3. Den ska gå att åtgärda direkt — annars är den bara skuld.
//   4. Den ska försvinna av sig själv när den inte längre gäller.
// En påminnelse som inte klarar alla fyra hör inte hemma här. Att lägga till
// "du har inte loggat mat idag" vore att bygga en tjatmaskin, inte en coach.

import { styrkeKurva } from "./utveckling.js";
import { EXERCISES, MAIN_LIFTS } from "../data/exercises.js";
import { MUSCLES } from "../data/muscles.js";

const MIN = 60000;
const DAG = 864e5;

const namnFör = id => (EXERCISES.find(e => e.id === id) || {}).name || id;
// MAIN_LIFTS är en lista av [id, svenskt namn]-par, inte av id:n. Loopar man
// över paren matchar ingenting — rekord och stagnation var tysta i testet
// tills det upptäcktes. Samma bugg fanns i progressionskartan.
const STORA_LYFT = MAIN_LIFTS.map(x => Array.isArray(x) ? x[0] : x);
const muskelNamn = id => (MUSCLES[id] && MUSCLES[id].name) || id;

/** Loggades det någon mat efter tidpunkten ts? */
function matEfter(foodLog, ts) {
  return (foodLog || []).some(e => e && e.ts && e.ts >= ts);
}

/**
 * Påminnelser som gäller just nu. Ren funktion — samma indata ger samma svar.
 *
 * @returns [{ id, kind, text, cta, until }]
 *   `id` är stabilt PER HÄNDELSE (innehåller passets id), så att ett avfärdande
 *   gäller just den händelsen och inte tystar påminnelsen för all framtid.
 */
export function buildNudges({ sessions = [], foodLog = [], nutritionTargets, muscleStates = null, now = Date.now() } = {}) {
  const ut = [];
  const passen = (sessions || []).filter(s => s && s.completedAt).sort((a, b) => b.completedAt - a.completedAt);

  // ── Protein efter passet ──────────────────────────────────────────────────
  // Kunskapsbanken: protein driver muskelproteinsyntesen efter träning, och
  // kolhydrater tillför inget för den delen. Fönstret är medvetet brett (20 min
  // till 3 h): det finns inget magiskt "anabolt fönster" på trettio minuter,
  // men har det gått ett halvt dygn är påminnelsen meningslös.
  const pass = passen[0];

  if (pass) {
    const sedan = now - pass.completedAt;
    const inomFönster = sedan >= 20 * MIN && sedan <= 180 * MIN;
    if (inomFönster && !matEfter(foodLog, pass.completedAt)) {
      const minuter = Math.round(sedan / MIN);
      const mål = nutritionTargets && nutritionTargets.protein;
      // Dagens protein hittills, för att kunna säga hur mycket som är kvar.
      const idag = new Date(now); idag.setHours(0, 0, 0, 0);
      const ätit = (foodLog || [])
        .filter(e => e && e.ts && e.ts >= idag.getTime())
        .reduce((a, e) => a + (e.protein || 0), 0);
      const kvar = mål ? Math.max(0, Math.round(mål - ätit)) : null;

      ut.push({
        id: `protein:${pass.id}`,
        kind: "protein",
        text: kvar != null
          ? `Du loggade ett pass för ${minuter} min sedan och har inte ätit sedan dess. ${kvar} g protein kvar på dagens mål.`
          : `Du loggade ett pass för ${minuter} min sedan och har inte ätit sedan dess. Protein är det som bygger upp musklerna mellan passen.`,
        cta: "Logga mat",
        until: pass.completedAt + 180 * MIN,
      });
    }
  }

  // ── Rekord dagen efter ────────────────────────────────────────────────────
  // Händelsen är passet; tidpunkten är dagen efter, när man är mottaglig och
  // inte längre trött. Ett rekord i stunden syns redan på kvittot — det här
  // är för den som inte tittade. Bara de stora lyften: ett rekord i sidolyft
  // med 0,5 kg är sant men inte värt en rad.
  //
  // Klarar regel 3 genom CTA till utvecklingsvyn, där kurvan visar det.
  if (pass && now - pass.completedAt >= 12 * 60 * MIN && now - pass.completedAt <= 36 * 60 * MIN) {
    for (const exId of STORA_LYFT) {
      const kurva = styrkeKurva(sessions, exId);
      if (kurva.length < 2) continue;
      const senaste = kurva[kurva.length - 1];
      if (senaste.ts < pass.completedAt - MIN) continue;   // inte i det här passet
      const tidigare = Math.max(...kurva.slice(0, -1).map(p => p.oneRM));
      if (senaste.oneRM > tidigare) {
        ut.push({
          id: `rekord:${pass.id}:${exId}`,
          kind: "rekord",
          text: `Du slog ditt bästa i ${namnFör(exId)} i går: ${senaste.oneRM} kg uppskattat 1RM, upp från ${tidigare}.`,
          // Inte "Se kurvan" — substrängen matchade en ordagrann sökning på
          // "Van" (träningsvana) i en annan verifierare och tystade ett annat
          // test i tur och ordning. Levde bara som en krock mellan två knappars
          // text, inget den här knappen gjorde fel i sig.
          cta: "Öppna utveckling",
          ctaMål: "utveckling",
          until: pass.completedAt + 36 * 60 * MIN,
        });
        break;   // ett rekord räcker; det största lyftet står först i MAIN_LIFTS
      }
    }
  }

  // ── Frånvaro med återhämtade muskler ──────────────────────────────────────
  // Händelsen är att readiness passerat tröskeln, inte att dagar gått. En
  // påminnelse efter fyra dagar oavsett läge vore regel 1-brott — den som
  // vilar för att kroppen behöver det ska inte skuldbeläggas. Men när kartan
  // säger att allt är grönt och det gått fyra dagar, då är det ett beslut man
  // kan ta.
  if (pass && muscleStates && now - pass.completedAt >= 4 * DAG) {
    // DE STORA MUSKLERNA FÖRST. Utan sortering nämndes "Anterior Neck och
    // Trapezius" — de som råkade stå först i objektet. Mätt. En nudge som
    // säger att nacken är redo lockar ingen till gymmet; quadriceps och
    // bröst gör det.
    const STORA = ["quadriceps", "pectoralis_major", "latissimus_dorsi", "gluteals", "hamstrings", "deltoid_anterior", "triceps_brachii", "biceps_brachii"];
    const redo = Object.entries(muscleStates)
      .filter(([, st]) => st && st.readiness != null && st.readiness >= 85)
      .map(([id]) => id)
      .sort((a, b) => {
        const ia = STORA.indexOf(a), ib = STORA.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });
    if (redo.length >= 3) {
      const dagar = Math.floor((now - pass.completedAt) / DAG);
      const topp = redo.slice(0, 2).map(muskelNamn).join(" och ");
      ut.push({
        id: `franvaro:${pass.id}:${dagar >= 7 ? 7 : 4}`,
        kind: "franvaro",
        text: `${dagar} dagar sedan senaste passet. ${topp}${redo.length > 2 ? ` och ${redo.length - 2} till` : ""} är helt återhämtade.`,
        // "Till passen", inte "Starta pass": knappen byter flik, den startar
        // inget. En knapp som lovar mer än den gör är en knapp man slutar
        // lita på. (Den fångades av en verifierare som sökte "Starta" och
        // träffade nudgen i stället för hemvyns riktiga startknapp.)
        cta: "Till passen",
        ctaMål: "pass",
        until: pass.completedAt + 14 * DAG,
      });
    }
  }

  // ── Stagnation i ett stort lyft ───────────────────────────────────────────
  // Händelsen är det tredje passet i rad utan framsteg. Två pass kan vara en
  // dålig dag; tre är ett mönster. Bara de stora lyften, bara om det finns
  // minst fyra pass att jämföra — färre är för lite att kalla stagnation.
  //
  // CTA till programmet: det är där man ändrar set, reps eller övning.
  if (pass) {
    for (const exId of STORA_LYFT) {
      const kurva = styrkeKurva(sessions, exId);
      if (kurva.length < 4) continue;
      const tre = kurva.slice(-3);
      const före = kurva[kurva.length - 4].oneRM;
      if (tre.every(p => p.oneRM <= före) && tre[2].ts >= pass.completedAt - MIN) {
        ut.push({
          id: `stagnation:${exId}:${tre[0].ts}`,
          kind: "stagnation",
          text: `${namnFör(exId)} har stått still i tre pass. Ibland hjälper färre reps med mer vikt, ibland en vecka med lägre belastning.`,
          cta: "Se programmet",
          ctaMål: "program",
          until: pass.completedAt + 7 * DAG,
        });
        break;
      }
    }
  }

  // ── Obalans mellan muskelgrupper ──────────────────────────────────────────
  // Händelsen är att en grupp tränats minst tre gånger oftare än sin
  // motpart de senaste två veckorna. Bröst mot rygg, framsida lår mot
  // baksida — de par där obalans ger hållningsproblem enligt kunskapsbanken.
  // Kartan visar det redan i färg, men säger det inte.
  if (pass) {
    const från = now - 14 * DAG;
    const senaste = passen.filter(s => s.completedAt >= från);
    const räkna = ids => senaste.filter(s => (s.sets || []).some(x => {
      const e = EXERCISES.find(ex => ex.id === x.exerciseId);
      return e && (e.activation || []).some(a => a.factor >= 0.7 && ids.includes(a.muscleId));
    })).length;
    const par = [
      [["pectoralis_major"], ["latissimus_dorsi", "trapezius", "rhomboids"], "bröst", "rygg"],
      [["quadriceps"], ["hamstrings", "gluteals"], "framsida lår", "baksida lår och säte"],
    ];
    for (const [a, b, namnA, namnB] of par) {
      const nA = räkna(a), nB = räkna(b);
      if (nA >= 3 && nA >= 3 * Math.max(1, nB)) {
        ut.push({
          id: `obalans:${namnA}:${Math.floor(now / (7 * DAG))}`,
          kind: "obalans",
          text: `${nA} pass ${namnA} på två veckor, ${nB} ${namnB}. Musklerna runt en led behöver hålla jämn styrka.`,
          cta: "Se övningar",
          ctaMål: "ovningar",
          until: now + 7 * DAG,
        });
        break;
      }
    }
  }

  // MAX EN ÅT GÅNGEN. Två samtidigt är brus, och den viktigaste ska vinna.
  // Ordningen: det tidskänsliga först (protein har ett fönster), sedan det
  // som kräver beslut (frånvaro), sedan det som är information.
  const rang = { protein: 0, franvaro: 1, stagnation: 2, obalans: 3, rekord: 4 };
  ut.sort((x, y) => (rang[x.kind] ?? 9) - (rang[y.kind] ?? 9));
  return ut.slice(0, 1);
}

/**
 * Filtrerar bort avfärdade och utgångna påminnelser.
 * Avfärdanden lagras som { id: tidpunkt } och städas när `until` passerats —
 * annars växer listan för evigt med id:n som aldrig kan återkomma.
 */
export function activeNudges(nudges, dismissed = {}, now = Date.now()) {
  return (nudges || []).filter(n => n && !dismissed[n.id] && (n.until == null || n.until > now));
}

/** Rensar avfärdanden som inte längre kan gälla. */
export function pruneDismissed(dismissed = {}, now = Date.now(), maxAlder = 7 * 864e5) {
  const ut = {};
  Object.entries(dismissed).forEach(([id, ts]) => { if (now - ts < maxAlder) ut[id] = ts; });
  return ut;
}
