// Askr 2.0 — coachens ENDA faktakälla.
//
// Konceptets lag: allt coachen får veta går genom den här funktionen. Nya fakta
// läggs HÄR, aldrig direkt i en vy eller i LLM-vägen — annars glider den
// deterministiska och den språkmodellsdrivna coachen isär och börjar säga olika
// saker om samma kropp.
//
// Varje block bär sin egen TILLIT. Det är ärlighetsprincipen gjord mekanisk:
// coachen får bara uttala sig så bestämt som underlaget tillåter, och
// `svagast` säger hur bestämt det är.
//
// Det här ÄR §13 buildCoachFacts. Projektfilen påstod i flera sessioner att
// funktionen fanns i engines/index.js — den har aldrig funnits, och beslut
// fattades på den felaktiga uppgiften. Nu finns den, i motorlagret, där båda
// apparna kan nå den.
//
// STATUS: Askr 2.0 läser härifrån. coachReplys kropp- och träningsgrenar gör det
// nu också, och readiness-SIFFRAN (lastviktad bas + cykel/kost) räknas här — inte
// längre i apparnas vy-lager. Apparna matar in sina egna modifierare (ctx.cycle,
// ctx.nutRec, ctx.readinessAdjust) så coachen och kartan visar samma tal ur en
// källa. Kvar att koppla om: coachReplys grenar för program, vikt, kost och målresa,
// samt App.jsx/MobileApp som fortfarande räknar sin headline parallellt (samma
// formel, samma tal — men det är två beräkningar tills de läser kropp.readiness).

import { bodyState, weekSessions, lastSessionLabel, sessionVolume } from "../atlas2/store.js";
import { MUSCLES } from "../data/muscles.js";
import { resa as byggResa, nästaDelmål } from "./journey.js";
import { readinessBreakdown } from "./index.js";

/** Tillitsnivå ur antal observationer. Trubbig med flit — hellre försiktig. */
function tillit(n, tröskel = 3) {
  if (!n) return { nivå: "ingen", underlag: 0, text: "inget underlag" };
  if (n < tröskel) return { nivå: "svag", underlag: n, text: `bara ${n} ${n === 1 ? "observation" : "observationer"}` };
  if (n < tröskel * 3) return { nivå: "ok", underlag: n, text: `${n} observationer` };
  return { nivå: "god", underlag: n, text: `${n} observationer` };
}

const ORDNING = { ingen: 0, svag: 1, ok: 2, god: 3 };

/**
 * @param ctx  { sessions, activeProgram, weights, foodLog }
 * @returns    faktablock med tillit + `datalage.svagast`
 */
export function coachFacts(ctx = {}, now = Date.now()) {
  const sessions = (ctx.sessions || []).filter(s => s && s.completedAt);
  const { states } = bodyState(sessions, now);
  const vecka = weekSessions(sessions, now);

  // ── kroppen ────────────────────────────────────────────────────────────
  const namn = id => (MUSCLES[id] && MUSCLES[id].name) || id;
  const med = Object.entries(states).filter(([, s]) => s.status !== "no_data" && s.readiness != null);
  const sorterad = med.slice().sort((a, b) => b[1].readiness - a[1].readiness);

  // Readiness-siffran räknas HÄR nu, inte i apparnas vy-lager — coachen och
  // kartan ska visa exakt samma tal. Basen är ett LASTVIKTAT snitt: muskler du
  // belastar mer väger tyngre (samma bas som nuvarande appen alltid räknat).
  // Utan färsk belastning (totalvikt ≤ 1) finns ingen siffra — null, aldrig ett
  // påhittat medelvärde. Det är hela skillnaden mot en vanlig träningsapp.
  //
  // Cykel- och kostmodifierarna bor nu i den här kedjan, via readinessBreakdown,
  // med de ingredienser appen matar in: ctx.cycle och ctx.nutRec. ctx.readinessAdjust
  // bär appspecifika nudge:ar som inte hör hemma i motorn (t.ex. mobilens check-in).
  const totalWeight = Object.values(states).reduce((a, s) => a + (s.weeklyLoad || 0), 0);
  const trainingBase = totalWeight > 1
    ? Object.values(states).reduce((sum, s) => (s.status !== "no_data" && s.readiness != null) ? sum + s.readiness * ((s.weeklyLoad || 0) / totalWeight) : sum, 0)
    : null;
  const readinessWhy = trainingBase != null ? readinessBreakdown(trainingBase, ctx.cycle || null, ctx.nutRec || null) : null;

  const kropp = {
    // Justerad total (bas + cykel + kost + ev. app-nudge), gatad till null.
    readiness: readinessWhy ? Math.max(0, Math.min(100, readinessWhy.total + (ctx.readinessAdjust || 0))) : null,
    // Rå träningsbas utan modifierare, och hela förklaringen — så en vy kan visa
    // VARFÖR siffran är som den är utan att räkna om något själv.
    readinessRaw: trainingBase != null ? Math.round(trainingBase) : null,
    readinessWhy,
    redo: sorterad.filter(([, s]) => s.readiness >= 76).map(([id, s]) => ({ id, namn: namn(id), värde: Math.round(s.readiness) })),
    slitna: sorterad.filter(([, s]) => s.readiness < 56).reverse().map(([id, s]) => ({ id, namn: namn(id), värde: Math.round(s.readiness) })),
    otränade: Object.entries(states).filter(([, s]) => s.status === "no_data").map(([id]) => ({ id, namn: namn(id) })),
    tillit: tillit(sessions.length),
  };

  // ── träningen ──────────────────────────────────────────────────────────
  const volym = list => Math.round(list.reduce((a, s) => a + sessionVolume(s), 0));
  const förraVeckan = sessions.filter(s => {
    const v = weekSessions(sessions, now - 7 * 864e5);
    return v.some(x => x.completedAt === s.completedAt);
  });

  const träning = {
    passTotalt: sessions.length,
    passIVeckan: vecka.length,
    volymIVeckan: volym(vecka),
    volymFörraVeckan: volym(förraVeckan),
    senast: lastSessionLabel(sessions, now),
    // Dagar sedan senaste passet. Avgörande för att skilja "utvilad" från
    // "har inte tränat" — se `förbehåll` nedan.
    dagarSedanPass: sessions.length
      ? Math.floor((now - Math.max(...sessions.map(x => x.completedAt))) / 864e5)
      : null,
    tillit: tillit(sessions.length),
  };

  // ── programmet ─────────────────────────────────────────────────────────
  const program = ctx.activeProgram ? {
    namn: ctx.activeProgram.name,
    passPerVecka: ctx.activeProgram.daysPerWeek,
    följerPlanen: vecka.length >= (ctx.activeProgram.daysPerWeek || 0),
    tillit: tillit(sessions.length),
  } : { namn: null, tillit: tillit(0) };

  // ── vikten ─────────────────────────────────────────────────────────────
  const vikter = (ctx.weights || []).slice().sort((a, b) => a.ts - b.ts);
  const vikt = {
    senaste: vikter.length ? vikter[vikter.length - 1].kg : null,
    förändring: vikter.length >= 2 ? +(vikter[vikter.length - 1].kg - vikter[0].kg).toFixed(1) : null,
    // Två mätningar är ingen trend. Tröskeln är medvetet 3.
    tillit: tillit(vikter.length),
  };

  // ── målresan ───────────────────────────────────────────────────────────
  // Det enda blocket som handlar om FRAMTIDEN. Utan mål är det tomt — coachen
  // ska inte låtsas att det finns en riktning när användaren inte satt någon.
  const r = ctx.goal ? byggResa(ctx.goal, sessions, now) : null;
  const målresa = r ? {
    namn: r.mål.namn,
    fas: r.aktivFas ? r.aktivFas.namn : null,
    fasFokus: r.aktivFas ? r.aktivFas.fokus : null,
    veckorKvar: r.veckorKvar,
    passerat: r.passerat,
    följsamhet: r.följsamhet,
    nästaDelmål: nästaDelmål(r.mål, now),
    tillit: tillit(r.passLoggade),
  } : { namn: null, tillit: tillit(0) };

  const block = { kropp, träning, program, vikt, målresa };

  // Tilliten är PER PÅSTÅENDE, inte ett globalt minimum över allt.
  //
  // Första versionen tog svagaste nivån över samtliga block — då tystnade
  // coachen helt så fort vikthistoriken var tom, trots 42 loggade pass. Fel:
  // att jag inte vet vad du väger säger ingenting om dina muskler. Ett svagt
  // block ska dra ner uttalanden OM DET BLOCKET, inte om kroppen.
  const minAv = (...nivåer) => nivåer.reduce((a, b) => (ORDNING[b] < ORDNING[a] ? b : a), "god");
  const svagast = minAv(kropp.tillit.nivå, träning.tillit.nivå);

  return {
    ...block,
    datalage: {
      // Gäller uttalanden om kropp och träning — det coachen mest pratar om.
      svagast,
      perBlock: { kropp: kropp.tillit.nivå, träning: träning.tillit.nivå, program: program.tillit.nivå, vikt: vikt.tillit.nivå },
      // Hur bestämt coachen får uttala sig. Läses av varje coach-yta.
      fårUttalaSig: svagast === "ingen" ? "inte alls"
        : svagast === "svag" ? "med reservation"
        : "normalt",
    },
  };
}

/**
 * Rekommendationen: nästa bästa beslut, med sina skäl.
 * Skälen är inte pynt — de är kravet. Coachen ska kunna visa VARFÖR.
 */
export function recommendation(facts) {
  if (facts.datalage.svagast === "ingen" || facts.kropp.readiness == null) {
    return {
      rubrik: "Logga ett pass så kan jag börja räkna.",
      brödtext: "Jag har ingen historik att gå på än. Efter ditt första pass kan jag säga något om återhämtning — innan dess vore allt jag sa en gissning.",
      skäl: [],
      knapp: null,
    };
  }

  const redo = facts.kropp.redo;
  const slitna = facts.kropp.slitna;
  const reservation = facts.datalage.svagast === "svag";

  if (!redo.length && slitna.length) {
    return {
      rubrik: "Vila är rätt beslut idag.",
      brödtext: "Ingen muskelgrupp ligger på en nivå där hård belastning gör nytta just nu.",
      skäl: slitna.slice(0, 3).map(m => `${m.namn}: ${m.värde}% återhämtad`),
      knapp: null,
      reservation,
    };
  }

  const mål = redo[0];
  return {
    rubrik: mål ? `${mål.namn} är redo. Där ger ett pass mest effekt idag.` : "Kroppen tål ett pass idag.",
    brödtext: slitna.length
      ? `${slitna[0].namn} behöver mer återhämtning, så lägg tyngdpunkten någon annanstans.`
      : "Ingen muskelgrupp ligger efter i återhämtning.",
    skäl: [
      ...redo.slice(0, 2).map(m => `${m.namn}: ${m.värde}% återhämtad och redo`),
      ...slitna.slice(0, 1).map(m => `${m.namn}: ${m.värde}% — behöver mer vila`),
      facts.träning.senast ? `Senaste pass: ${facts.träning.senast.toLowerCase()}` : null,
    ].filter(Boolean),
    knapp: mål ? `Starta pass – ${mål.namn}` : "Starta pass",
    reservation,
  };
}

/**
 * Konceptets namn på funktionen. Samma sak som coachFacts — alias så att kod
 * och dokument kan tala samma språk.
 */
export const buildCoachFacts = coachFacts;

/**
 * Förbehåll som MÅSTE följa med varje uttalande om återhämtning.
 *
 * Hög readiness betyder två helt olika saker beroende på historiken: att
 * kroppen hunnit återhämta sig, eller att den inte belastats alls. Utan det
 * här förbehållet säger coachen "beredskap 98 %, fräscha och redo" till någon
 * som inte tränat på en månad — avträning presenterad som form.
 *
 * Returnerar null när readiness kan tas för vad den ser ut att vara.
 */
export function readinessFörbehåll(facts, tröskel = 10) {
  const d = facts && facts.träning && facts.träning.dagarSedanPass;
  if (d == null) return "Du har inga loggade pass, så siffran beskriver en kropp som inte belastats — inte en återhämtad kropp.";
  if (d < tröskel) return null;
  const tid = d >= 60 ? `${Math.floor(d / 30)} månader` : `${d} dagar`;
  return `Observera: ditt senaste pass var för ${tid} sedan. Den höga siffran betyder att kroppen inte belastats, inte att den är i form. Börja lugnt.`;
}
