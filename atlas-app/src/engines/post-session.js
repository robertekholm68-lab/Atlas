// MOTOR: sammanfattningen efter passet.
//
// Allt här räknas fram lokalt ur loggad historik. Ingen nätverkstrafik, ingen LLM.
// Det är ett krav, inte en optimering: passet ska fungera i en gymkällare utan
// täckning, och sammanfattningen är det sista som händer i passet.
//
// Bieffekten är den vi vill ha. En deterministisk sammanfattning blir tre eller fyra
// meningar, aldrig ett svall. LLM-coachen finns kvar som något man aktivt öppnar
// när det finns nät — den ska aldrig vara det som möter en efter sista setet.
//
// Tonen: positiv men saklig. Ingen beröm som inte har täckning i siffrorna, och
// hellre tystnad om ett ämne än en formulering som låtsas veta mer än underlaget bär.

import { MUSCLES, GROUP_SV, VOLUME_LANDMARKS } from "../data/muscles.js";
// Volymstatus och veckoset räknas INTE om här. De finns redan i engines/index.js och
// är den enda källan — två uppsättningar volymregler skulle glida isär.
import { volumeStatus, groupWeeklySets } from "./index.js";

const DAG_MS = 86400000;
const VECKODAG = ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"];

/* ---------- vilka grupper passet faktiskt träffade ---------- */

// Muskel -> grupp. Gruppen står på muskeln själv, och det är samma nyckel som
// VOLUME_LANDMARKS och GROUP_SV använder.
function gruppFörMuskel(muskelId) {
  const m = MUSCLES[muskelId];
  return (m && m.group) || null;
}

// Grupperna som fick meningsfull belastning i det här passet, tyngst först.
export function trainedGroups(session, minLoad = 1) {
  const perGrupp = {};
  Object.entries((session && session.muscleLoads) || {}).forEach(([mId, v]) => {
    if (!v || v < minLoad) return;
    const g = gruppFörMuskel(mId);
    if (!g) return;
    perGrupp[g] = (perGrupp[g] || 0) + v;
  });
  return Object.entries(perGrupp).sort((a, b) => b[1] - a[1]).map(([g, load]) => ({ group: g, load }));
}

/* ---------- när är nästa styrkepass rimligt ---------- */

/**
 * Tidigaste dagen då de belastade musklerna är tillbaka över tröskeln.
 *
 * Bygger på samma exponentiella avklingning som recovery-motorn: belastningen
 * halveras var `halfLife` timme. Vi letar upp den muskel som tar längst tid och
 * svarar utifrån den — det är den som sätter gränsen för nästa tunga pass.
 */
export function nextStrengthDay(session, now = Date.now(), tröskel = 65) {
  const laster = Object.entries((session && session.muscleLoads) || {}).filter(([, v]) => v > 0);
  if (laster.length === 0) return null;

  let värstTimmar = 0, värstMuskel = null;
  for (const [mId, last] of laster) {
    const hl = (MUSCLES[mId] && MUSCLES[mId].halfLife) || 36;
    // recovery = 100 - kvarvarande. Sök minsta t där kvarvarande <= 100 - tröskel.
    const kvarTillåten = 100 - tröskel;
    if (last <= kvarTillåten) continue;
    const timmar = hl * Math.log2(last / kvarTillåten);
    if (timmar > värstTimmar) { värstTimmar = timmar; värstMuskel = mId; }
  }
  if (!värstMuskel) return { days: 0, hours: 0, muscleId: null, label: "redan idag", date: new Date(now) };

  const klar = new Date(now + värstTimmar * 3600000);
  const idagStart = new Date(now); idagStart.setHours(0, 0, 0, 0);
  const klarStart = new Date(klar); klarStart.setHours(0, 0, 0, 0);
  const dagar = Math.round((klarStart - idagStart) / DAG_MS);

  const label = dagar <= 0 ? "redan idag" : dagar === 1 ? "imorgon" : dagar < 7 ? VECKODAG[klar.getDay()] : `om ${dagar} dagar`;
  return { days: dagar, hours: Math.round(värstTimmar), muscleId: värstMuskel, label, date: klar };
}

/* ---------- jämförelse mot förra gången ---------- */

/**
 * Per övning: hur låg vikt och reps jämfört med senaste passet där övningen fanns?
 * Returnerar bara övningar som faktiskt ändrats, den största avvikelsen först.
 */
export function compareToPrevious(session, sessions, exercises = []) {
  const tidigare = (sessions || [])
    .filter(s => s && s.id !== session.id && (s.completedAt || 0) < (session.completedAt || Date.now()))
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

  const namn = id => { const e = exercises.find(x => x.id === id); return (e && e.name) || id; };

  // topp-set per övning i ett pass: tyngsta vikten, och repsen på det setet
  const toppSet = (s, exId) => {
    const set = (s.sets || []).filter(x => x.exerciseId === exId);
    if (!set.length) return null;
    return set.reduce((b, x) => (x.weight || 0) > (b.weight || 0) ? x : b, set[0]);
  };

  const ut = [];
  const övningar = [...new Set((session.sets || []).map(x => x.exerciseId))];
  for (const exId of övningar) {
    const nu = toppSet(session, exId);
    if (!nu) continue;
    const förraPasset = tidigare.find(s => (s.sets || []).some(x => x.exerciseId === exId));
    if (!förraPasset) continue;
    const då = toppSet(förraPasset, exId);
    if (!då) continue;

    const dV = +( (nu.weight || 0) - (då.weight || 0) ).toFixed(1);
    const dR = (nu.reps || 0) - (då.reps || 0);
    if (dV === 0 && dR === 0) continue;

    // Storlek på förändringen i procent av förra vikten, för att kunna rangordna.
    const relativ = då.weight ? Math.abs(dV) / då.weight : Math.abs(dR) / Math.max(1, då.reps || 1);
    ut.push({
      exerciseId: exId, name: namn(exId),
      weight: nu.weight, prevWeight: då.weight, deltaWeight: dV,
      reps: nu.reps, prevReps: då.reps, deltaReps: dR,
      direction: (dV || dR) > 0 ? "up" : "down",
      magnitude: relativ,
      daysSince: Math.max(0, Math.round(((session.completedAt || Date.now()) - (förraPasset.completedAt || 0)) / DAG_MS)),
    });
  }
  return ut.sort((a, b) => b.magnitude - a.magnitude);
}

/* ---------- varför-frågan ---------- */

// Bara verkliga avvikelser är värda en fråga. Under de här trösklarna är
// skillnaden brus — en stång som råkade lastas annorlunda, en rep som räknades fel.
// Osymmetriskt med flit. En sänkning är nästan alltid informativ — något hände.
// En höjning är ofta bara planerad progression, och att fråga om varje normal
// ökning gör appen tjatig. Därför krävs ett större hopp uppåt för en fråga.
const FRÅGA_VIKT_NER = 0.05;   // 5 % sänkning
const FRÅGA_VIKT_UPP = 0.08;   // 8 % höjning
const FRÅGA_REPS = 2;

export const REASON_CODES = {
  down: [
    { code: "trott", label: "Kände mig trött" },
    { code: "somn", label: "Sov dåligt" },
    { code: "smarta", label: "Något gjorde ont" },
    { code: "tid", label: "Hade ont om tid" },
  ],
  up: [
    { code: "latt", label: "Kändes lätt" },
    { code: "planerat", label: "Planerad ökning" },
    { code: "form", label: "Extra bra dag" },
    { code: "teknik", label: "Bättre teknik" },
  ],
};

/**
 * Väljer ut EN fråga, eller ingen alls.
 *
 * Medvetet snålt: frågar appen efter varje pass blir den en enkät man lär sig
 * svepa bort, och då är svaren värdelösa. En fråga, fyra alternativ, alltid
 * möjligt att hoppa över.
 */
export function pickQuestion(diffar) {
    const kandidat = (diffar || []).find(d => {
    const gräns = d.direction === "down" ? FRÅGA_VIKT_NER : FRÅGA_VIKT_UPP;
    const viktNog = d.prevWeight ? Math.abs(d.deltaWeight) / d.prevWeight >= gräns : false;
    const repsNog = Math.abs(d.deltaReps) >= FRÅGA_REPS;
    return viktNog || repsNog;
  });
  if (!kandidat) return null;

  const ner = kandidat.direction === "down";
  const vad = kandidat.deltaWeight !== 0
    ? `${ner ? "sänkte" : "höjde"} vikten ${Math.abs(kandidat.deltaWeight)} kg`
    : `${ner ? "tog färre" : "tog fler"} reps (${Math.abs(kandidat.deltaReps)})`;

  return {
    exerciseId: kandidat.exerciseId,
    direction: kandidat.direction,
    prompt: `Du ${vad} på ${kandidat.name} jämfört med förra passet. Vad berodde det på?`,
    options: REASON_CODES[ner ? "down" : "up"],
  };
}

/* ---------- själva sammanfattningen ---------- */

/**
 * Bygger raderna som visas efter passet. Varje rad är en påstådd FAKTA med
 * täckning i loggen — inget beröm utan underlag.
 *
 * Returnerar { lines, question, next } där lines är korta meningar i den ordning
 * de ska läsas.
 */
export function buildPostSession({ session, sessions = [], exercises = [], now = Date.now() }) {
  const lines = [];
  const grupper = trainedGroups(session);

  // 1. Vad passet faktiskt belastade.
  if (grupper.length) {
    const namn = grupper.slice(0, 3).map(g => (GROUP_SV && GROUP_SV[g.group]) || g.group);
    const lista = namn.length === 1 ? namn[0] : `${namn.slice(0, -1).join(", ")} och ${namn[namn.length - 1]}`;
    lines.push({ kind: "trained", text: `${lista.charAt(0).toUpperCase()}${lista.slice(1)} fick belastning.` });
  }

  // 2. Veckovolym per grupp — bara där det finns en gräns att mäta mot.
  const volymrader = [];
  for (const { group } of grupper.slice(0, 4)) {
    const lm = VOLUME_LANDMARKS[group];
    if (!lm) continue;
    const set = groupWeeklySets(medPasset(sessions, session), group, now);
    const vs = volumeStatus(set, group);
    if (!vs) continue;
    const gn = stor(GROUP_SV[group] || group);
    if (set > lm.mrv) volymrader.push({ kind: "volume", tone: "warn", group, sets: set, text: `${gn} ligger över MRV den här veckan (${set} set) — dra ner nästa pass.` });
    else if (set >= lm.mav[0]) volymrader.push({ kind: "volume", tone: "good", group, sets: set, text: `${gn} har nu tillräcklig veckovolym (${set} set, ${vs.label}).` });
    else if (set >= lm.mev) volymrader.push({ kind: "volume", tone: "ok", group, sets: set, text: `${gn} är över minsta veckovolym (${set} set, ${lm.mav[0]} ger full effekt).` });
    else volymrader.push({ kind: "volume", tone: "low", group, sets: set, text: `${gn} ligger under minsta veckovolym (${set} av ${lm.mev} set).` });
  }
  // Håll det kort: högst två rader, de mest åtgärdbara först.
  const rang = { warn: 0, low: 1, good: 2, ok: 3 };
  volymrader.sort((a, b) => rang[a.tone] - rang[b.tone]);
  lines.push(...volymrader.slice(0, 2));

  // 3. Förändringar mot förra gången.
  const diffar = compareToPrevious(session, sessions, exercises);
  const störst = diffar[0];
  if (störst) {
    const riktning = störst.direction === "up" ? "upp" : "ner";
    const del = störst.deltaWeight !== 0
      ? `${Math.abs(störst.deltaWeight)} kg ${riktning}`
      : `${Math.abs(störst.deltaReps)} reps ${riktning}`;
    lines.push({ kind: "delta", tone: störst.direction === "up" ? "good" : "neutral", text: `${störst.name}: ${del} mot förra passet (${störst.prevWeight} kg × ${störst.prevReps}).` });
  }

  // 4. När nästa styrkepass är rimligt.
  const next = nextStrengthDay(session, now);
  if (next && next.days > 0) {
    lines.push({ kind: "next", text: `Nästa tunga styrkepass rekommenderas tidigast ${next.label}.` });
  } else if (next) {
    lines.push({ kind: "next", text: "Belastningen var låg — du kan träna igen redan imorgon." });
  }

  return { lines, question: pickQuestion(diffar), next, diffs: diffar };
}

function stor(s) { return String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1); }

// Passet kan hinna sparas efter att sammanfattningen byggs. Se till att det räknas med.
function medPasset(sessions, session) {
  const alla = [...(sessions || [])];
  if (!alla.some(s => s && s.id === session.id)) alla.push(session);
  return alla;
}


/* ---------- svaren ska få konsekvenser ---------- */

// Ett svar som bara lagras är datainsamling på låtsas. Det här är slingan tillbaka:
// vad appen ska göra annorlunda nästa gång, härlett ur de senaste svaren.
const ÅTERHÄMTNINGSSKÄL = ["trott", "somn", "smarta"];

/**
 * Läser de senaste veckornas svar och returnerar en handfast slutsats, eller null.
 *
 *  - Upprepade återhämtningsskäl -> underlaget för readiness är svagare än siffran
 *    antyder, och coachen ska uttala sig försiktigare.
 *  - Upprepat "kändes lätt" -> progressionsförslaget ligger för lågt.
 *
 * Returnerar null när underlaget är för tunt. Två svar är inget mönster.
 */
export function reasonSignal(sessions = [], now = Date.now(), dagar = 21) {
  const gräns = now - dagar * DAG_MS;
  const svar = (sessions || [])
    .filter(s => s && s.reason && s.reason.code && (s.completedAt || 0) >= gräns)
    .map(s => s.reason);
  if (svar.length < 3) return null;

  const antal = c => svar.filter(x => x.code === c).length;
  const återhämtning = ÅTERHÄMTNINGSSKÄL.reduce((a, c) => a + antal(c), 0);
  const lätt = antal("latt");

  if (återhämtning >= 3 && återhämtning >= svar.length / 2) {
    const dominant = ÅTERHÄMTNINGSSKÄL.map(c => ({ c, n: antal(c) })).sort((a, b) => b.n - a.n)[0];
    return {
      kind: "recovery",
      confidencePenalty: 10,          // dra ner tilliten till readiness, inte siffran självt
      progressionBias: -1,
      text: dominant.c === "somn" ? "Du har angett dålig sömn som skäl flera gånger den senaste tiden — readiness bygger på belastning, inte sömn, så ta siffran med en nypa salt."
        : dominant.c === "smarta" ? "Du har angett smärta som skäl flera gånger. Det är värt att ta på allvar innan volymen höjs."
        : "Trötthet har varit skälet flera pass i rad — det talar för att lägga in en lättare vecka.",
    };
  }

  if (lätt >= 3) return {
    kind: "progression",
    confidencePenalty: 0,
    progressionBias: 1,
    text: "Du har svarat att det kändes lätt flera gånger — förslagen på nästa vikt ligger antagligen för lågt.",
  };

  return null;
}

/** Sparar ett svar på passet. Ren funktion: returnerar ett nytt pass. */
export function attachReason(session, code, question = null) {
  if (!session || !code) return session;
  return {
    ...session,
    reason: { code, exerciseId: question ? question.exerciseId : null, direction: question ? question.direction : null, at: Date.now() },
  };
}
