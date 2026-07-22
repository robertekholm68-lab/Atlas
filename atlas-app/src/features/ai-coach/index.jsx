// FEATURE: AI Coach
import { useState, useRef, useEffect } from "react";
import { ADAPTIVE_MIN, COACH_MODES } from "../../data/coach.js";
import { Card, CardLabel } from "../../components/common/index.jsx";
import { analyzeBodyComp, bestStrengthTrend, buildBriefing, buildPredictions, buildUserModel, computeInsights, detectAdaptive, plateauResponse, dataConfidence, metricSeries, supplementAdvice, laggingMuscleAdvice, variationAdvice } from "../../engines/index.js";
import { SUPP_BY_ID } from "../../data/supplements.js";
import { Icon } from "../../components/common/index.jsx";
import { missionCoachSummary, STATUS_LABEL, STATUS_COLOR } from "../../engines/mission.js";
import { nextWorkout } from "../../engines/programs.js";
import { analyzeProgram } from "../../engines/coach-programs.js";
import { goalReasoning, GOAL_EVIDENCE, GOAL_TYPES } from "../../engines/goal.js";
// §13: coachens gemensamma faktakälla. Nuvarande appen räknar än så länge sina
// egna svar ur ctx, men ÄRLIGHETSGRINDARNA hämtas härifrån så att båda
// apparna gör samma bedömning av när data får uttalas om.
import { buildCoachFacts, readinessFörbehåll } from "../../engines/facts.js";
import { MUSCLES } from "../../data/muscles.js";
import { citableFacts, citableTopic, hasKnowledge, hasTopic, KNOWLEDGE, TOPICS } from "../../data/knowledge.js";
import { hasLlm, getLlmConfig, callClaude, coachSystemPrompt, buildGroundingContext } from "../../app/llm.js";
import { H, T, btn, now } from "../../data/tokens.js";

// ── Samtalscoach: datadriven, deterministisk chatt som svarar ur appens riktiga data ──
// Svenska nyckelord → muskel-id (endast muskler som finns i kunskapsbanken)
const MUSCLE_KW = {
  bröst: "pectoralis_major", pec: "pectoralis_major", bänk: "pectoralis_major",
  vaden: "calves", vader: "calves", vadmuskel: "calves", gastro: "calves", tåhäv: "calves",
  biceps: "biceps_brachii", triceps: "triceps_brachii",
  underarm: "forearms", grepp: "forearms",
  lat: "latissimus_dorsi", rygg: "latissimus_dorsi", "breda rygg": "latissimus_dorsi",
  ryggres: "erector_spinae", "nedre rygg": "erector_spinae", ländrygg: "erector_spinae",
  trapez: "trapezius", kappmus: "trapezius", nacke: "neck_anterior", hals: "neck_anterior",
  axel: "deltoid_lateral", axlar: "deltoid_lateral", delt: "deltoid_lateral",
  "bakre axel": "deltoid_posterior", "främre axel": "deltoid_anterior", serratus: "serratus_anterior",
  mage: "rectus_abdominis", magmus: "rectus_abdominis", abs: "rectus_abdominis", "six-pack": "rectus_abdominis", core: "rectus_abdominis",
  sneda: "obliques", oblique: "obliques",
  säte: "gluteals", rumpa: "gluteals", glute: "gluteals",
  lår: "quadriceps", quad: "quadriceps", "framsida lår": "quadriceps",
  hamstring: "hamstrings", "baksida lår": "hamstrings", lårcurl: "hamstrings",
  adduktor: "adductors", ljumske: "adductors", "insida lår": "adductors",
  höftböj: "hip_flexors", psoas: "hip_flexors",
  skenben: "tibialis_anterior", tibialis: "tibialis_anterior", benhinn: "tibialis_anterior",
};
function findMuscle(text) {
  const t = text.toLowerCase();
  // längsta nyckelord först så "baksida lår" slår "lår", "insida lår" slår "lår" osv.
  const kws = Object.keys(MUSCLE_KW).sort((a, b) => b.length - a.length);
  for (const kw of kws) if (t.includes(kw)) return MUSCLE_KW[kw];
  return null;
}

// Svenska nyckelord → träningsprincip (TOPICS). Utelämnar protein/kost/deff/bulk med flit —
// de fångas av kost-/mål-intent som ger personliga, datadrivna svar i stället.
export const TOPIC_KW = {
  "progressiv överbelast": "progressiv_overbelastning", "progressiv belastning": "progressiv_overbelastning", överbelastning: "progressiv_overbelastning",
  "hur många set": "traningsvolym", träningsvolym: "traningsvolym", volym: "traningsvolym",
  "hur ofta": "traningsfrekvens", frekvens: "traningsfrekvens",
  "reps i reserv": "narhet_failure", failure: "narhet_failure", "nära failure": "narhet_failure", rir: "narhet_failure",
  singelprogression: "progressionsmodeller", dubbelprogression: "progressionsmodeller", progressionsmodell: "progressionsmodeller",
  avlastningsveck: "deload", avlastning: "deload", deload: "deload",
  uppvärm: "uppvarmning", "värm upp": "uppvarmning", värmer: "uppvarmning", "värma upp": "uppvarmning", stretch: "uppvarmning",
  energibalans: "energibalans", // deff/bulk/protein fångas av kost- och mål-intent; "energibalans" gör det inte, så den routas hit
  kolhydrat: "kolhydrater", glykogen: "kolhydrater",
  alkohol: "alkohol", bakfull: "alkohol", bakis: "alkohol", fylla: "alkohol",
  "efter 50": "muskler_efter_50", "över 50": "muskler_efter_50", "50+": "muskler_efter_50", "50-plus": "muskler_efter_50", äldre: "muskler_efter_50", senior: "muskler_efter_50",
  klimakteriet: "kvinnor_klimakteriet", klimakterie: "kvinnor_klimakteriet", menopaus: "kvinnor_klimakteriet", övergångsålder: "kvinnor_klimakteriet",
  menscykel: "kvinnor_menscykel", menstru: "kvinnor_menscykel",
  graviditet: "kvinnor_graviditet", gravid: "kvinnor_graviditet", förlossning: "kvinnor_graviditet", postpartum: "kvinnor_graviditet",
  "bäckenbotten": "kvinnor_backenbotten", bulkig: "kvinnor_bulkmyt",
  benskörhet: "kvinnor_benskorhet", osteoporos: "kvinnor_benskorhet", benskör: "kvinnor_benskorhet", osteopeni: "kvinnor_benskorhet",
  pcos: "kvinnor_pcos", "p-piller": "kvinnor_ppiller", preventivmedel: "kvinnor_ppiller", "p piller": "kvinnor_ppiller",
};
export function findTopic(text) {
  const t = (text || "").toLowerCase();
  const kws = Object.keys(TOPIC_KW).sort((a, b) => b.length - a.length);
  for (const kw of kws) if (t.includes(kw)) return TOPIC_KW[kw];
  return null;
}
// Förslags-kind (analyzeProgram) → den princip som motiverar ändringen.
const KIND_TO_TOPIC = {
  "add-exercise": "traningsvolym", "reduce-volume": "traningsvolym",
  "respread-days": "traningsfrekvens", "reduce-days": "traningsfrekvens",
  plateau: "progressiv_overbelastning", deload: "deload", "balance-activity": "aterhamtning",
};
// Kort principcitat att grunda ett programförslag i (fakta + källa när den finns).
function principleLine(kind) {
  const tid = KIND_TO_TOPIC[kind]; if (!tid) return "";
  const facts = citableTopic(tid);
  const f = facts.find(x => x.source) || facts[0]; if (!f) return "";
  return `\n\nPrincip: ${f.fact}${f.source ? ` (${f.source.name})` : ""}`;
}

function coachReply(text, ctx, lastTopic = null) {
  const t = (text || "").toLowerCase().trim();
  const { overallReadiness, muscleStates, sessions, activeProgram, goalProfile, nutritionTotals, nutritionTargets, nutritionDays, measurements, profile, cycle, supplements, foodLog } = ctx;
  const gender = profile && profile.gender;
  const age = profile && profile.age;
  const senior = typeof age === "number" && age >= 50;
  const diet = profile && profile.diet;
  const approach = profile && profile.dietApproach;
  const restrictions = (profile && profile.restrictions) || [];
  // §13 en gång: kropp- och träningsgrenarna läser siffror + per-block-tillit
  // härifrån i stället för att räkna om ur ctx. Övriga grenar rör vi inte än.
  const facts = buildCoachFacts(ctx);
  const chip = arr => arr;
  const muscleAnswer = (mid, mode) => {
    const cats = mode === "training" ? ["training"] : mode === "function" ? ["function"] : null;
    let facts = citableFacts(mid, { levels: ["etablerad"], categories: cats });
    if (!facts.length) facts = citableFacts(mid, { levels: ["etablerad"] });
    const k = KNOWLEDGE[mid];
    if (!facts.length) return null;
    const lead = mode === "training" ? `Så tränar du ${k.title.split("(")[0].trim().toLowerCase()}:` : `Ur kunskapsbanken om ${k.title.split("(")[0].trim()}:`;
    return { text: `${lead}\n\n${facts.slice(0, 3).map(f => "• " + f.fact).join("\n")}${facts.some(f => f.medical) ? "\n\n(Kost/skador är förslag, inte medicinsk rådgivning — kontakta vård vid osäkerhet.)" : ""}`, muscle: mid, topic: { kind: "muscle", muscle: mid }, chips: chip(mode === "training" ? ["Dagens pass", "Hur ser återhämtningen ut?"] : ["Hur tränar jag den?", "Dagens pass", "Hur går mitt mål?"]) };
  };
  const topicAnswer = tid => {
    const top = TOPICS[tid]; if (!top) return null;
    const facts = citableTopic(tid); if (!facts.length) return null;
    const src = facts.find(f => f.source);
    return { text: `${top.title} — ur kunskapsbanken:\n\n${facts.slice(0, 3).map(f => "• " + f.fact).join("\n")}${src ? `\n\nKälla: ${src.source.name}.` : ""}`, topic: { kind: "topic", id: tid }, chips: chip(["Vad ska jag träna?", "Förslag på programändring", "Hur går mitt mål?"]) };
  };

  // 0) Uppföljning på förra ämnet ("hur tränar jag den?", "och den?", "varför?")
  if (lastTopic && lastTopic.kind === "muscle") {
    if (/hur tränar|träna den|träning|hur gör jag|den då\??$|och den\??$|^den\b/.test(t) && !findMuscle(t)) {
      const a = muscleAnswer(lastTopic.muscle, "training"); if (a) return a;
    }
    if (/vad gör|funktion|varför\??$/.test(t) && !findMuscle(t)) {
      const a = muscleAnswer(lastTopic.muscle, "function"); if (a) return a;
    }
  }

  // 1) Återhämtning / beredskap
  if (/återhämt|beredskap|redo|mår jag|hur trött|kan jag träna|vila/.test(t)) {
    const kropp = facts.kropp;
    // Siffran kommer nu från §13: lastviktad bas + cykel/kost (och ev. app-nudge),
    // beräknad i facts.js så coachen och kartan visar EXAKT samma tal ur en källa.
    // §13 ger null utan FÄRSK belastning (senaste veckan) — då visar kartan "—" och
    // coachen måste säga samma sak, inte falla tillbaka på ett platt snitt (det var
    // just motsägelsen). Fallbacken på appens headline gäller BARA när historiken
    // saknar muskellast helt (äldre importerad data / testfixtures) och §13 därför
    // inte kan räkna alls — då finns ingen viktad siffra att vara oense om.
    const harMuskellast = (sessions || []).some(s => s && s.muscleLoads && Object.keys(s.muscleLoads).length > 0);
    const rd = kropp.readiness != null ? kropp.readiness : (harMuskellast ? null : overallReadiness);
    if (rd == null) {
      // Ingen aktuell siffra (ingen färsk belastning). readinessFörbehåll bär
      // skillnaden utvilad vs otränad — nu OVANPÅ det null:ade viktade talet, i
      // stället för ovanpå en missvisande hög siffra. null-vid-8-dagar och
      // förbehållet löser olika saker och lever båda kvar, sida vid sida.
      if (!facts.träning.passTotalt) return { text: "Jag har ingen readiness ännu — logga några pass så börjar jag följa din återhämtning.", chips: chip(["Vad ska jag träna?", "Hur går mitt mål?"]) };
      const f = readinessFörbehåll(facts);
      return { text: `Jag ger dig ingen readiness-siffra just nu — den bygger på färsk belastning, och du har inte tränat den senaste veckan.${f ? `\n\n${f}` : ""}`, chips: chip(["Vad ska jag träna?", "Hur går mitt mål?"]) };
    }
    // Fräscha/trötta ur §13: det utesluter otränade muskler (status no_data), så
    // avträning inte längre listas som "fräsch och redo". Faller tillbaka på
    // muscleStates när passen saknar muskellast (t.ex. äldre importerad data).
    let fresh = kropp.redo.map(m => m.namn);
    let tired = kropp.slitna.map(m => m.namn);
    if (!fresh.length && !tired.length) {
      const st = Object.entries(muscleStates || {}).map(([id, s]) => ({ id, name: MUSCLES[id]?.name, ...s })).filter(x => x.name);
      fresh = st.filter(x => x.recoveryScore >= 75).sort((a, b) => b.recoveryScore - a.recoveryScore).slice(0, 3).map(x => x.name);
      tired = st.filter(x => x.recoveryScore < 55).sort((a, b) => a.recoveryScore - b.recoveryScore).slice(0, 3).map(x => x.name);
    } else { fresh = fresh.slice(0, 3); tired = tired.slice(0, 3); }
    const lbl = rd >= 76 ? "god" : rd >= 56 ? "måttlig" : "låg";
    let r = `Din samlade beredskap är ${rd}% (${lbl}).`;
    if (fresh.length) r += `\n\nFräscha och redo: ${fresh.join(", ")}.`;
    if (tired.length) r += `\nBehöver mer vila: ${tired.join(", ")}.`;
    if (rd < 56) r += "\n\nMed låg beredskap: håll intensiteten nere, prioritera sömn och protein, eller ta en lugnare dag.";
    if (cycle) r += `\n\nDin cykel: ${cycle.sv} (dag ${cycle.day}) — jag har redan vägt in det i beredskapen (${cycle.readiness >= 0 ? "+" : ""}${cycle.readiness}). ${cycle.phase === "menstrual" || cycle.phase === "luteal" ? "Var snäll mot dig själv med intensiteten om orken är låg." : "Bra fönster att pusha lite extra."}`;
    // Per-block-tillit ur §13: tunt underlag → reservation, aldrig en tyst dom.
    // Slår ihop kropp- och träningstilliten (datalage.svagast), så en användare
    // med få pass får siffran presenterad som fingervisning, inte som facit.
    if (facts.datalage.svagast === "svag") r += `\n\nMen det här vilar på tunt underlag (${kropp.tillit.text}) — läs siffran som en fingervisning, inte en dom. Fler loggade pass gör den säkrare.`;
    // OBS: förbehållet (utvilad vs otränad) hör hemma i null-grenen ovan — när en
    // viktad siffra VISAS finns det per definition färsk belastning (senaste pass
    // ≤ tröskeln), så readinessFörbehåll är null här och skulle bara vara brus.
    if (senior) r += "\n\nMed åren tar återhämtningen ofta lite längre tid — pressa inte varje pass till max, och prioritera sömn och protein. Samtidigt ger styrketräningen ännu mer utdelning nu: den motverkar muskel- och benförlust.";
    return { text: r, chips: chip([...(senior ? ["Träning efter 50"] : []), "Vad ska jag träna?", "Hur går mitt mål?"]) };
  }

  // 3) Dagens/nästa pass
  if (/träna idag|dagens|nästa pass|vad ska jag träna|vilket pass|vad kör jag/.test(t)) {
    if (activeProgram) {
      const nw = nextWorkout(activeProgram, sessions);
      if (nw) return { text: `Nästa pass i ${activeProgram.name}: ${nw.name}${nw.exercises ? ` (${nw.exercises.length} övningar)` : ""}. Vill du köra det?`, action: { label: "Starta passet", kind: "start", program: activeProgram }, chips: chip(["Hur ser återhämtningen ut?", "Förslag på programändring"]) };
    }
    return { text: "Du har inget aktivt program än. Vill du att jag öppnar programbiblioteket så hittar vi ett som passar ditt mål?", action: { label: "Öppna program", kind: "programs" }, chips: chip(["Hur går mitt mål?", "Hur ser återhämtningen ut?"]) };
  }

  // 4b) Vikt / viktutveckling — siffror + per-block-tillit ur §13 (facts.vikt).
  // Ligger före mål-grenen så en tydlig viktfråga får ett viktsvar; generella
  // "hur går det"-frågor faller vidare till målresonemanget.
  if (/väger|hur mycket väg|min vikt|min kroppsvikt|viktutveckling|viktkurva|viktnedgång|viktökning|gått (ner|upp) i vikt|gå (ner|upp) i vikt|lagt på mig|tappat.{0,10}(kilo|kg)/.test(t)) {
    const v = facts.vikt;
    if (v.senaste == null) return { text: "Jag har ingen loggad kroppsvikt än — logga några vägningar så följer jag utvecklingen. En enstaka mätning säger inget om en trend.", chips: chip(["Hur går mitt mål?", "Berätta om kosten"]) };
    let r = `Senaste loggade vikt: ${v.senaste} kg.`;
    if (v.förändring != null && v.förändring !== 0) r += ` Sedan din första notering har du gått ${v.förändring < 0 ? "ner" : "upp"} ${Math.abs(v.förändring)} kg.`;
    else if (v.förändring === 0) r += " Den ligger stabilt sedan första noteringen.";
    // Per-block-tillit: två punkter är ingen trend (§13-tröskel 3). Ett svagt
    // vikt-block drar ner uttalanden OM VIKTEN, inget annat.
    if (v.tillit.nivå === "svag") r += `\n\nMen det vilar på tunt underlag (${v.tillit.text}) — det räcker inte för en trend än. Logga fler vägningar så blir riktningen tillförlitlig.`;
    else r += `\n\n(${v.tillit.text} — tillräckligt för att läsa en riktning.)`;
    return { text: r, chips: chip(["Hur går mitt mål?", "Berätta om kosten", "Hur ser återhämtningen ut?"]) };
  }

  // 4c) Målresa — fas, veckor kvar, nästa delmål, följsamhet ur §13 (facts.målresa).
  // Journey-specifika frågor; generella "hur går mitt mål" faller vidare till
  // mål-grenen (goalReasoning), som handlar om en annan sak (recomp-mixen).
  if (/målresa|min resa|hur går resan|var i resan|vilken fas|nuvarande fas|vilken del av resan|delmål|veckor kvar|hur långt (har jag )?kvar|hur lång tid kvar|nästa hållpunkt/.test(t)) {
    const m = facts.målresa;
    if (!m.namn) return { text: "Du har ingen målresa satt än — sätt ett mål med ett datum så visar jag var i resan du är, vilken fas du bör ligga i och nästa delmål.", chips: chip(["Hur ser återhämtningen ut?", "Vad ska jag träna?"]) };
    let r = `Din målresa: ${m.namn}.`;
    if (m.passerat) {
      r += " Måldatumet har passerat — dags att sätta ett nytt mål eller förlänga det här.";
    } else {
      if (m.fas) r += ` Just nu i ${m.fas}-fasen — ${m.fasFokus}`;
      if (m.veckorKvar != null) r += `\n\n${m.veckorKvar} ${m.veckorKvar === 1 ? "vecka" : "veckor"} kvar till måldatumet.`;
      if (m.nästaDelmål) r += ` Nästa delmål: ${m.nästaDelmål.namn} (${new Date(m.nästaDelmål.datum).toLocaleDateString("sv-SE")}).`;
    }
    if (m.följsamhet != null) r += `\n\nFöljsamhet hittills: ${m.följsamhet}% av planerade pass.`;
    // Per-block-tillit: få loggade pass sedan start → osäkert att uttala sig om
    // hur resan går. Ett svagt block drar bara ner uttalanden OM RESAN.
    if (m.tillit.nivå === "svag" || m.tillit.nivå === "ingen") r += `\n\nMen det vilar på tunt underlag (${m.tillit.text}) — för få loggade pass sedan start för att säga något säkert om hur resan går än. Logga fler pass.`;
    return { text: r, chips: chip(["Hur ser återhämtningen ut?", "Vad ska jag träna?", "Hur går mitt mål?"]) };
  }

  // 4) Mål / resultat / recomp
  if (/mål|recomp|framsteg|hur går det|resultat|fett|kondition|bygga muskel|deffa|bulk/.test(t)) {
    const gr = goalProfile ? goalReasoning({ goalProfile, sessions, nutritionTotals, nutritionTargets, nutritionDays, readiness: overallReadiness, measurements }) : null;
    if (!gr) return { text: "Sätt ett mål i din profil (t.ex. Body recomp) så kan jag resonera kring hur träning, kost och återhämtning spelar ihop för dig.", chips: chip(["Vad ska jag träna?", "Hur ser återhämtningen ut?"]) };
    const top = gr.components.slice().sort((a, b) => b.weight - a.weight)[0];
    let r = gr.synthesis;
    if (top) r += `\n\nStörst vikt just nu: ${top.label}. ${top.text}`;
    if (gr.tradeoffs && gr.tradeoffs.length) r += `\n\nTips: ${gr.tradeoffs[0]}`;
    return { text: r, chips: chip(["Berätta mer om kosten", "Vad ska jag träna?", "Förslag på programändring"]) };
  }

  // 5-pre) Kosttillskott — datadrivet, könsmedvetet, EN coach (samma logik som kostfliken)
  if (/tillskott|kreatin|kosttillskott|vitamin|omega|fiskolja|magnesium|\bzink\b|\bb12\b|supplement|kalciumtillskott|järntillskott/.test(t)) {
    let lead = "";
    if (/kreatin/.test(t)) lead = "Kreatin monohydrat (3\u20135 g/dag) är ett av de mest välbeforskade tillskotten för styrka och högintensiv träning \u2014 ingen uppladdning behövs" + (gender === "female" ? ", och det fungerar lika bra för kvinnor. Den lilla tidiga viktökningen är vatten, inte fett." : ".") + (senior ? " Det är dessutom extra värdefullt med åren för att bevara muskel och ben." : "");
    const advice = supplementAdvice({ profile, foodLog, sessions, nutritionTotals, nutritionTargets, existing: (supplements || []).map(s => s.id) });
    if (advice.length) {
      const lines = advice.map(a => { const c = SUPP_BY_ID[a.id]; return c ? `\u2022 ${c.name}: ${a.why}` : null; }).filter(Boolean);
      return { text: (lead ? lead + "\n\n" : "") + "Utifrån din träning och de senaste dagarnas intag är det här värt att överväga:\n\n" + lines.join("\n\n") + "\n\n(Evidensnära förslag, inte medicinsk rådgivning. Du hanterar dina tillskott under Kost.)", chips: chip(["Berätta om kosten", "Hur går mitt mål?"]) };
    }
    return { text: (lead || "Tillskott ersätter inte varierad mat och tillräckligt med energi.") + "\n\nUtifrån din data ser jag inget uppenbart tillskott du saknar just nu. Logga mer kost via sök så väger jag in mikronäring (järn, D-vitamin, kalcium m.m.).", chips: chip(["Berätta om kosten", "Vad ska jag träna?"]) };
  }

  // 5) Kost / protein
  if (/protein|kost|kalori|äta|mat|deff|underskott|överskott/.test(t)) {
    const pT = nutritionTargets && nutritionTargets.protein, pN = nutritionTotals && nutritionTotals.protein;
    const kT = nutritionTargets && nutritionTargets.kcal, kN = nutritionTotals && nutritionTotals.kcal;   // standardiserat till kcal (var .calories → coachen såg aldrig kalorimålet)
    if (!pT && !kT) return { text: "Jag har inga kostmål inställda ännu. Logga kost eller sätt mål i kostfliken så kan jag väga in energibalans och protein i råden.", chips: chip(["Hur går mitt mål?", "Vad ska jag träna?"]) };
    let r = "";
    if (pT) r += `Proteinmål: ${pT} g${pN != null ? ` — idag ${Math.round(pN)} g (${pN >= pT * 0.9 ? "på god väg" : "under målet"})` : ""}.`;
    if (kT && kN != null) { const bal = kN < kT * 0.94 ? "underskott" : kN > kT * 1.06 ? "överskott" : "runt underhåll"; r += `\nEnergi: ${Math.round(kN)}/${kT} kcal idag — ${bal}.`; }
    const pf = citableTopic("protein_kost").find(f => /1,6/.test(f.fact));
    r += `\n\n${pf ? pf.fact : "Protein runt 1,6–2,2 g/kg kroppsvikt stödjer muskeluppbyggnad."}${pf && pf.source ? ` (${pf.source.name})` : ""} (Allmänna riktlinjer, inte medicinsk rådgivning.)`;
    if (gender === "female") r += "\n\nSom kvinna: håll extra koll på järn (menstruation ökar behovet) och kalcium/D-vitamin för benhälsan.";
    if (senior) r += "\n\nMed åldern hjälper det att ligga i övre delen av proteinspannet och fördela proteinet jämnt över dagens måltider \u2014 kroppen svarar lite trögare på protein med åren.";
    if (diet === "vegan") r += "\n\nP\u00e5 vegankost: kombinera flera proteink\u00e4llor (baljv\u00e4xter, sojaprodukter, seitan) f\u00f6r fullst\u00e4ndigt aminosyram\u00f6nster, och h\u00e5ll koll p\u00e5 B12, j\u00e4rn och omega-3 (alg).";
    else if (diet === "vegetarian") r += "\n\nP\u00e5 vegetarisk kost: \u00e4gg och mejeri g\u00f6r proteinet enklare, men h\u00e5ll koll p\u00e5 B12 och j\u00e4rn.";
    if (approach === "keto" || approach === "lchf") r += "\n\nP\u00e5 " + (approach === "keto" ? "keto" : "LCHF") + ": kolhydraterna \u00e4r l\u00e5ga, s\u00e5 fett f\u00e5r fylla energin. R\u00e4kna med att h\u00f6gintensiva pass kan k\u00e4nnas tyngre tills kroppen anpassat sig, och h\u00e5ll koll p\u00e5 elektrolyter och magnesium.";
    else if (approach === "mediterranean") r += "\n\nMedelhavskost \u00e4r en av de mest v\u00e4lbeforskade h\u00e4lsosamma uppl\u00e4ggen \u2014 fisk, olivolja, baljv\u00e4xter och gr\u00f6nt ger bra n\u00e4ring f\u00f6r b\u00e5de tr\u00e4ning och \u00e5terh\u00e4mtning.";
    if (restrictions.includes("lactose")) r += "\n\nLaktosfritt: v\u00e4lj laktosfri mj\u00f6lk/kvarg eller v\u00e4xtbaserade alternativ, och h\u00e5ll koll p\u00e5 kalcium och D-vitamin fr\u00e5n andra k\u00e4llor \u00e4n mejeri.";
    return { text: r, topic: { kind: "topic", id: "protein_kost" }, chips: chip(["Berätta om energibalans", "Hur går mitt mål?", "Hur ser återhämtningen ut?"]) };
  }

  // 6) Programförslag / ändring
  if (/förslag|ändra|förbättra|justera|program|platå|plateau|byt|coach/.test(t)) {
    if (!activeProgram) return { text: "Du har inget aktivt program. Öppna programbiblioteket så föreslår jag ett utifrån ditt mål, sedan kan jag ge löpande förbättringsförslag.", action: { label: "Öppna program", kind: "programs" }, chips: chip(["Hur går mitt mål?", "Vad ska jag träna?"]) };
    const an = analyzeProgram({ program: activeProgram, sessions, readiness: overallReadiness });
    const props = (an && an.proposals) || [];
    if (!props.length) return { text: `Jag ser inget som behöver ändras i ${activeProgram.name} just nu — det ser balanserat ut. Fortsätt logga pass så flaggar jag om något dyker upp (platå, trötthet, obalans).`, chips: chip(["Hur går mitt mål?", "Vad ska jag träna?"]) };
    const p = props[0];
    return { text: `Ett förslag för ${activeProgram.name}:\n\n${p.title}\n${p.why || p.detail || ""}${principleLine(p.kind)}\n\nJag ändrar aldrig något själv — du granskar och godkänner i Program.`, action: { label: "Granska i Program", kind: "programs" }, topic: KIND_TO_TOPIC[p.kind] ? { kind: "topic", id: KIND_TO_TOPIC[p.kind] } : null, chips: chip(["Hur går mitt mål?", "Hur ser återhämtningen ut?"]) };
  }

  // 6a0) Variation — "varierad träning / samma övningar / variation"
  if (/variation|variera|varierad|samma övning|samma pass|enformig|tråkig|byta övning|byt övning|omväxling|nytt program/.test(t)) {
    const va = variationAdvice(sessions);
    if (!va.hasData) return { text: "Jag har för lite loggad träning för att bedöma din variation ännu — logga några pass så tittar jag på vilka övningar, vinklar och repsintervall du faktiskt kör.", chips: chip(["Vad ska jag träna?", "Hur ser återhämtningen ut?"]) };
    return { text: "Så här ser variationen ut i din loggade träning:\n\n" + va.tips.map(x => "• " + x).join("\n\n"), chips: chip(["Vad ska jag träna?", "Bröstet svarar inte"]) };
  }

  // 6a) Släpande muskel — "svarar inte / växer inte / släpar / fastnat"
  if (/svarar inte|växer inte|väx(er|a) dåligt|släpar|ligger efter|halkar efter|fastnat|inget händer|ökar inte|vill inte växa|responderar inte|reagerar inte|hänger inte med|kommer inte igång/.test(t)) {
    const lm = findMuscle(t);
    if (lm) return { text: laggingMuscleAdvice(sessions, lm), chips: chip(["Vad ska jag träna?", "Hur ser återhämtningen ut?"]) };
    return { text: "Vilken muskel eller muskelgrupp känns det på? Säg t.ex. \"bröstet svarar inte\" eller \"vaderna växer inte\", så tittar jag på din volym och frekvens för just den och ger konkreta tips.", chips: chip(["Bröstet svarar inte", "Ryggen släpar", "Vaderna växer inte", "Armarna ligger efter"]) };
  }

  // 6b) Träningsprincip → citera TOPICS (progressiv överbelastning, volym, frekvens, deload, uppvärmning …)
  const tid = findTopic(t);
  if (tid) { const a = topicAnswer(tid); if (a) return a; }

  // 7) Specifik muskel → citera kunskapsbanken (efter explicita intent, så "vad ska jag träna" inte fastnar på "vad")
  const mid = findMuscle(t);
  if (mid) {
    const mode = /hur tränar|träna|träning|övning/.test(t) ? "training" : /vad gör|funktion/.test(t) ? "function" : null;
    const a = muscleAnswer(mid, mode); if (a) return a;
  }

  // 8) Hjälp / fallback
  return { text: "Jag svarar utifrån din faktiska data — återhämtning, program, mål, kost och muskelfakta. Fråga t.ex. något av det här:", chips: chip(["Hur ser återhämtningen ut?", "Vad ska jag träna?", "Hur går mitt mål?", "Förslag på programändring", "Berätta om bröst"]) };
}

function CoachChat({ ctx, onStartProgram, onOpenPrograms }) {
  const [messages, setMessages] = useState([{ role: "coach", text: "Hej! Jag är din coach. Jag svarar utifrån din faktiska träningsdata — fråga om din återhämtning, dagens pass, hur ditt mål går, kosten eller en specifik muskel.", chips: ["Hur ser återhämtningen ut?", "Vad ska jag träna?", "Hur går mitt mål?", "Förslag på programändring"] }]);
  const [input, setInput] = useState("");
  const [lastTopic, setLastTopic] = useState(null);
  const endRef = useRef(null);
  useEffect(() => { if (endRef.current && endRef.current.scrollIntoView) endRef.current.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages]);

  const send = async raw => {
    const text = (raw ?? input).trim(); if (!text) return;
    setInput("");
    if (hasLlm()) {
      const cfg = getLlmConfig();
      const priorHist = messages.filter(m => !m.pending).slice(1).map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })).slice(-8);
      setMessages(m => [...m, { role: "user", text }, { role: "coach", text: "…", pending: true }]);
      try {
        const gr = ctx.goalProfile ? goalReasoning({ goalProfile: ctx.goalProfile, sessions: ctx.sessions, nutritionTotals: ctx.nutritionTotals, nutritionTargets: ctx.nutritionTargets, nutritionDays: ctx.nutritionDays, readiness: ctx.overallReadiness, measurements: ctx.measurements }) : null;
        const nw = ctx.activeProgram ? nextWorkout(ctx.activeProgram, ctx.sessions) : null;
        const mid = findMuscle(text);
        const tid = findTopic(text);
        const sys = coachSystemPrompt() + "\n\n" + buildGroundingContext(text, { ...ctx, goalReasoning: gr }, { nextWorkoutName: nw && nw.name, muscleId: mid, topicId: tid });
        const reply = await callClaude({ key: cfg.key, model: cfg.model, system: sys, messages: [...priorHist, { role: "user", content: text }], max_tokens: 600 });
        setLastTopic(mid ? { kind: "muscle", muscle: mid } : null);
        setMessages(cur => cur.map((mm, i) => (i === cur.length - 1 && mm.pending) ? { role: "coach", text: reply || "(tomt svar)" } : mm));
      } catch (e) {
        const reply = coachReply(text, ctx, lastTopic);
        setLastTopic(reply.topic || null);
        setMessages(cur => cur.map((mm, i) => (i === cur.length - 1 && mm.pending) ? { role: "coach", ...reply, text: reply.text + "\n\n⚠ Kunde inte nå AI-nyckeln just nu — gav ett inbyggt svar i stället." } : mm));
      }
      return;
    }
    const reply = coachReply(text, ctx, lastTopic);
    setLastTopic(reply.topic || null);
    setMessages(m => [...m, { role: "user", text }, { role: "coach", ...reply }]);
  };
  const doAction = a => {
    if (a.kind === "start" && onStartProgram) onStartProgram(a.program);
    else if ((a.kind === "programs") && onOpenPrograms) onOpenPrograms();
  };

  return (
    <Card>
      <CardLabel>Diskutera med coachen</CardLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 360, overflowY: "auto", padding: "4px 2px 2px" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 6 }}>
            <div style={{ maxWidth: "86%", padding: "9px 12px", borderRadius: 12, fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap", background: m.role === "user" ? T.accent.primary : T.bg.raised, color: m.role === "user" ? "#fff" : T.text.secondary, borderTopRightRadius: m.role === "user" ? 3 : 12, borderTopLeftRadius: m.role === "user" ? 12 : 3 }}>{m.text}</div>
            {m.action && <button onClick={() => doAction(m.action)} style={{ ...btn.primary, padding: "7px 14px", fontSize: 12.5 }}>{m.action.label}</button>}
            {m.role === "coach" && m.chips && i === messages.length - 1 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                {m.chips.map((c, j) => <button key={j} onClick={() => send(c)} style={{ padding: "6px 11px", borderRadius: 999, border: `1px solid ${T.accent.primary}55`, background: "transparent", color: T.accent.primary, cursor: "pointer", fontSize: 12 }}>{c}</button>)}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }} placeholder="Skriv en fråga till coachen…" style={{ flex: 1, background: T.bg.raised, border: `1px solid ${T.bg.muted}`, borderRadius: 10, padding: "10px 12px", color: T.text.primary, fontSize: 13.5, outline: "none" }} />
        <button onClick={() => send()} style={{ ...btn.primary, padding: "10px 16px", fontSize: 13 }}>Skicka</button>
      </div>
      <div style={{ fontSize: 10.5, color: T.text.muted, marginTop: 8, lineHeight: 1.4 }}>{hasLlm() ? "Din egen Claude-nyckel svarar i fri text, grundad i din data och kunskapsbanken." : "Coachen svarar utifrån din data och kunskapsbanken — grundade svar, inga påhitt. Koppla en egen nyckel i profilen för fri text."}</div>
    </Card>
  );
}

function AICoachView({ muscleStates, foodLog = [], recommendation, sessions, nutritionTotals, nutritionTargets, nutritionDays, goals, overallReadiness, profile, measurements, missionAnalysis = null, activeProgram = null, programRec = null, onStartProgram, onOpenPrograms, goalProfile = null, cycle = null, nutRec = null, supplements = [] }) {
  const [q, setQ] = useState(null);
  const [mode, setMode] = useState("performance");
  const [answers, setAnswers] = useState({});
  const [dietAns, setDietAns] = useState(null);
  const now = Date.now();
  if (!sessions || sessions.length === 0) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 760 }}>
      <CoachChat ctx={{ overallReadiness, muscleStates, sessions, activeProgram, goalProfile, nutritionTotals, nutritionTargets, nutritionDays, measurements, profile, cycle, nutRec, supplements, foodLog }} onStartProgram={onStartProgram} onOpenPrograms={onOpenPrograms} />
      <div style={{ background: T.bg.surface, border: `1px solid ${T.bg.muted}`, borderRadius: 16, padding: "22px 20px" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.text.primary, marginBottom: 8 }}>Jag håller fortfarande på att lära känna dig.</div>
        <div style={{ fontSize: 13.5, color: T.text.secondary, lineHeight: 1.6, marginBottom: 14 }}>Börja med att logga ett pass, en måltid eller ett mätvärde — eller berätta om ditt mål. Ju mer du loggar, desto mer personlig blir coachningen. Jag drar inga slutsatser om trender eller platåer förrän det finns tillräckligt med din egen historik.</div>
        <div style={{ fontSize: 11.5, color: T.text.muted }}>Personliga långtidsanalyser kräver flera loggade pass. Demopass räknas aldrig in i din historik.</div>
      </div>
    </div>
  );
  const entries = Object.entries(muscleStates);
  const ready = entries.filter(([, s]) => s.status === "ready").sort((a, b) => b[1].recoveryScore - a[1].recoveryScore);
  const fatigued = entries.filter(([, s]) => s.status === "critical" || s.status === "recovering").sort((a, b) => a[1].recoveryScore - b[1].recoveryScore);
  const under = entries.filter(([, s]) => s.status === "undertrained" || s.status === "no_data");
  const nm = id => MUSCLES[id] ? MUSCLES[id].name : id;
  const list = arr => arr.slice(0, 3).map(([id, s]) => `${nm(id)} (${s.recoveryScore}%)`).join(", ") || "—";
  const insights = computeInsights(sessions, muscleStates, goals, nutritionTotals, mode, now, (nutritionTargets && nutritionTargets.hasProtein) ? nutritionTargets.protein : null);
  const rdColor = overallReadiness == null ? T.text.muted : overallReadiness >= 76 ? T.accent.success : overallReadiness >= 56 ? T.accent.warning : T.accent.danger;
  const rdLabel = overallReadiness == null ? "för lite data" : overallReadiness >= 76 ? "Bra" : overallReadiness >= 56 ? "Måttlig" : "Låg";
  const toneCol = t => ({ danger: T.accent.danger, warning: T.accent.warning, success: T.accent.success, primary: T.accent.primary }[t] || T.accent.primary);
  const proteinTarget = (nutritionTargets && nutritionTargets.hasProtein) ? nutritionTargets.protein : null;   // §4: inget påhittat 148 g-mål
  const proteinGap = proteinTarget != null ? proteinTarget - (nutritionTotals ? nutritionTotals.protein : 0) : null;
  const trend = bestStrengthTrend(sessions);
  const briefing = buildBriefing(profile && profile.name, overallReadiness, ready, fatigued, recommendation, trend);
  const userModel = buildUserModel(sessions, now);
  const predictions = buildPredictions(sessions);
  const findings = detectAdaptive(sessions, muscleStates, now);
  const bodyComp = analyzeBodyComp(measurements, goals);
  const missionSummary = missionAnalysis ? missionCoachSummary(missionAnalysis) : null;
  const QA = [
    ["Vad ska jag träna idag?", recommendation ? `${recommendation.title}. ${recommendation.summary}` : "Vila och återhämta dig idag."],
    ["Vilka muskler är utvilade?", ready.length ? `Redo att köra hårt: ${list(ready)}.` : "Inga muskelgrupper är fullt utvilade just nu."],
    ["Vad behöver vila?", fatigued.length ? `Dessa bär fortfarande trötthet: ${list(fatigued)}. Låt dem återhämta sig.` : "Inget sticker ut som rejält trött — bra läge att träna."],
    ["Vad tränar jag för lite?", under.length ? `Nästan otränat den senaste tiden: ${under.slice(0, 3).map(([id]) => nm(id)).join(", ")}. Lägg in dem snart.` : "Din träning täcker kroppen bra."],
    ["Får jag i mig nog protein?", proteinTarget == null ? `Du har inte satt något proteinmål ännu. Du har fått i dig ${nutritionTotals ? nutritionTotals.protein : 0} g idag — ange ett mål så följer jag det.` : proteinGap > 5 ? `Du ligger ${proteinGap} g under proteinmålet (${proteinTarget} g).` : `Bra proteinintag idag (${nutritionTotals ? nutritionTotals.protein : 0} g).`],
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }} className="coach-grid">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <CoachChat ctx={{ overallReadiness, muscleStates, sessions, activeProgram, goalProfile, nutritionTotals, nutritionTargets, nutritionDays, measurements, profile, cycle, nutRec, supplements, foodLog }} onStartProgram={onStartProgram} onOpenPrograms={onOpenPrograms} />
        {goalProfile && (() => {
          const gr = goalReasoning({ goalProfile, sessions, nutritionTotals, nutritionTargets, nutritionDays, readiness: overallReadiness, measurements });
          if (!gr) return null;
          const Ev = ({ e }) => { const x = GOAL_EVIDENCE[e] || GOAL_EVIDENCE.estimate; return <span style={{ fontSize: 9.5, fontWeight: 700, color: x.c, border: `1px solid ${x.c}66`, borderRadius: 999, padding: "2px 7px", whiteSpace: "nowrap" }}>{x.label}</span>; };
          return (
            <Card>
              <CardLabel>Din målresa · {GOAL_TYPES[gr.type]?.label || "Egen mix"}</CardLabel>
              <div style={{ fontSize: 13, color: T.text.primary, lineHeight: 1.5, margin: "4px 0 12px" }}>{gr.synthesis}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {gr.components.map(c => (
                  <div key={c.key} style={{ borderLeft: `3px solid ${T.accent.primary}55`, paddingLeft: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{c.label}</span>
                      <span style={{ fontSize: 10.5, color: T.text.muted }}>vikt {c.weight}</span>
                      <Ev e={c.evidence} />
                    </div>
                    <div style={{ fontSize: 12.5, color: T.text.secondary, lineHeight: 1.5 }}>{c.text}</div>
                  </div>
                ))}
              </div>
              {gr.recovery && <div style={{ marginTop: 12, padding: "9px 11px", background: T.bg.raised, borderRadius: 10, fontSize: 12.5, color: T.text.secondary, lineHeight: 1.5 }}><b style={{ color: T.text.primary }}>Återhämtning:</b> {gr.recovery.text}</div>}
              {gr.tradeoffs.length > 0 && <div style={{ marginTop: 10 }}><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: T.text.muted, textTransform: "uppercase", marginBottom: 5 }}>Så får du delarna att samspela</div><div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{gr.tradeoffs.map((t, i) => <div key={i} style={{ fontSize: 12.5, color: T.text.secondary, display: "flex", gap: 7 }}><span style={{ color: T.accent.success }}>›</span><span>{t}</span></div>)}</div></div>}
            </Card>
          );
        })()}
        {(activeProgram || programRec) && (
          <Card>
            <CardLabel>Ditt program</CardLabel>
            {activeProgram ? (() => {
              const nw = nextWorkout(activeProgram, sessions);
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{activeProgram.name}</div>
                  <div style={{ fontSize: 12.5, color: T.text.muted }}>{activeProgram.family} · {activeProgram.level} · {activeProgram.daysPerWeek} dagar/vecka</div>
                  {nw && <div style={{ fontSize: 13, color: T.text.secondary }}>Nästa pass: <b style={{ color: T.text.primary }}>{nw.workout.name}</b> · {nw.workout.exercises.length} övningar</div>}
                  {(() => { const n = analyzeProgram({ program: activeProgram, sessions, readiness: overallReadiness }).proposals.length; return n > 0 ? <div style={{ fontSize: 12.5, color: T.accent.warning }}>✦ Jag har {n} förslag för ditt program — öppna för att granska och godkänna.</div> : null; })()}
                  <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                    {onStartProgram && <button onClick={() => onStartProgram(activeProgram)} style={{ ...btn.primary, padding: "8px 14px" }}>Starta nästa pass ›</button>}
                    {onOpenPrograms && <button onClick={onOpenPrograms} style={{ ...btn.pill, padding: "8px 14px" }}>Öppna program</button>}
                  </div>
                </div>
              );
            })() : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                <div style={{ fontSize: 13, color: T.text.secondary }}>Utifrån din nivå, återhämtning ({overallReadiness || "–"}) och historik ({sessions.length} pass) föreslår jag:</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{programRec.name}</div>
                <div style={{ fontSize: 12.5, color: T.text.muted }}>{programRec.family} · {programRec.level} · {programRec.daysPerWeek} dagar/vecka</div>
                {onOpenPrograms && <button onClick={onOpenPrograms} style={{ ...btn.primary, padding: "8px 14px", alignSelf: "flex-start", marginTop: 4 }}>Se program ›</button>}
              </div>
            )}
          </Card>
        )}
        {(() => {
          const LV = { no_data: ["ingen data", T.text.muted], limited_data: ["begränsad", T.accent.warning], sufficient_data: ["tillräcklig", T.accent.primary], personal_model: ["personlig modell", T.accent.success] };
          const doms = [["Träning", dataConfidence("training", { sessions })], ["Vikt", dataConfidence("weight_trend", { weightPoints: metricSeries(measurements, "weight").length })], ["Kost", dataConfidence("nutrition", { nutritionDays: nutritionDays || 0 })]];
          return (
            <Card>
              <CardLabel>Vad jag kan bedöma just nu</CardLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
                {doms.map(([lab, c]) => (
                  <div key={lab} style={{ display: "flex", alignItems: "center", gap: 6, background: T.bg.raised, borderRadius: 999, padding: "5px 11px" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: LV[c.level][1] }} />
                    <span style={{ fontSize: 12, color: T.text.secondary }}>{lab}: <b style={{ color: LV[c.level][1] }}>{LV[c.level][0]}</b></span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: T.text.muted, lineHeight: 1.5 }}>Jag bedömer varje område separat och drar inga långtidsslutsatser (t.ex. platåer) förrän det finns tillräckligt av din egen historik. Demopass räknas aldrig in.</div>
            </Card>
          );
        })()}
        {/* Daily briefing */}
        <Card style={{ background: `linear-gradient(135deg, ${T.bg.surface}, rgba(155,124,255,0.06))` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: T.accent.secondary, fontSize: 18 }}>✦</span><span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: T.accent.secondary, textTransform: "uppercase" }}>Daglig briefing</span></div>
            <span style={{ fontSize: 12, color: rdColor, fontWeight: 700 }}>Beredskap {overallReadiness == null ? "—" : overallReadiness} · {rdLabel}</span>
          </div>
          <div style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.6, color: T.text.primary }}>
            {briefing.map((line, i) => <span key={i} style={{ color: i === 0 ? T.text.primary : T.text.secondary }}>{line} </span>)}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
            {COACH_MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)} title={m.tag} style={{ ...btn.tag, fontSize: 12, background: mode === m.id ? T.accent.secondary : T.bg.raised, color: mode === m.id ? "#fff" : T.text.secondary }}>{m.label}</button>
            ))}
          </div>
        </Card>

        {/* Målresa-kontext (Askr Mission): observation / hypotes / rekommendation, frågar innan förändring */}
        {missionSummary && (
          <Card style={{ background: `linear-gradient(135deg, ${T.bg.surface}, rgba(155,124,255,0.06))` }}>
            <CardLabel right={<span style={{ fontSize: 10.5, fontWeight: 700, color: STATUS_COLOR[missionSummary.status] || T.text.muted, background: `${STATUS_COLOR[missionSummary.status] || T.text.muted}22`, border: `1px solid ${STATUS_COLOR[missionSummary.status] || T.text.muted}55`, borderRadius: 999, padding: "1px 8px" }}>{STATUS_LABEL[missionSummary.status] || ""}</span>}>Målresa · {missionSummary.title}</CardLabel>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: T.text.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 5 }}>Observation</div>
            <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.55, marginBottom: missionSummary.hypotheses.length ? 12 : 8 }}>{missionSummary.observation.join(" ")}</div>
            {missionSummary.plan && (() => {
              const p = missionSummary.plan;
              return (
                <div style={{ marginBottom: 12, padding: "11px 12px", background: "rgba(77,163,255,0.06)", border: `1px solid ${T.accent.primary}33`, borderRadius: 10 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: T.accent.primary, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Föreslaget upplägg</div>
                  <div style={{ fontSize: 12.5, color: T.text.secondary, lineHeight: 1.5, marginBottom: 8 }}>
                    {p.sessions != null
                      ? <>~<b style={{ color: T.text.primary }}>{p.sessions} pass/vecka</b> {p.sessionsFrom === "time" ? "(utifrån din veckotid, ~1,25 h/pass)" : "(utifrån ditt frekvensmål)"}{p.phaseName ? ` · fas: ${p.phaseName}` : ""}.</>
                      : <>Ange veckotid så skräddarsyr jag passfördelningen. Så länge — prioritetsordning nedan{p.phaseName ? ` (fas: ${p.phaseName})` : ""}.</>}
                    {p.emphasis ? ` ${p.emphasis}` : ""}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {p.blocks.map((b, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                        <span style={{ color: T.text.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</span>
                        <span style={{ color: T.text.muted, flexShrink: 0 }}>
                          {b.sessions != null ? (b.sessions >= 1 ? `≈${b.sessions} pass/v` : "underhåll") : b.priority} · <span style={{ color: { "Avgörande": T.accent.danger, "Viktigt": T.accent.warning, "Stödjande": T.accent.primary, "Extra": T.text.muted }[b.priority] || T.text.muted }}>{b.priority.toLowerCase()}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  {p.cautions.map((c, i) => <div key={i} style={{ fontSize: 11.5, color: T.accent.warning, marginTop: 7, lineHeight: 1.4 }}>⚠ {c}</div>)}
                  {p.nextPhase && <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 7, lineHeight: 1.4 }}>Nästa fas — <b style={{ color: T.text.secondary }}>{p.nextPhase.name}</b>{p.nextPhase.note ? `: ${p.nextPhase.note}` : ""}</div>}
                  <div style={{ fontSize: 12, color: T.accent.secondary, marginTop: 8 }}>Vill du utgå från det här upplägget, eller justera något?</div>
                </div>
              );
            })()}
            {missionSummary.hypotheses.map((h, i) => (
              <div key={i} style={{ marginBottom: 10, borderLeft: `3px solid ${T.accent.warning}`, paddingLeft: 10 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: T.accent.warning, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 }}>Hypotes</div>
                <div style={{ fontSize: 12.5, color: T.text.secondary, lineHeight: 1.5 }}>{h.text}</div>
                <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 3, lineHeight: 1.45 }}>{h.explain}</div>
                <div style={{ fontSize: 12, color: T.accent.secondary, marginTop: 4 }}>{h.question}</div>
              </div>
            ))}
            {missionSummary.recommendation && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: T.accent.success, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>Rekommendation</div>
                <div style={{ fontSize: 13, color: T.text.primary, lineHeight: 1.55 }}>{missionSummary.recommendation}</div>
                {missionSummary.question && <div style={{ fontSize: 12.5, color: T.accent.secondary, marginTop: 5 }}>{missionSummary.question}</div>}
              </div>
            )}
            <div style={{ fontSize: 10.5, color: T.text.muted, marginTop: 12, lineHeight: 1.5 }}>Coachen skiljer observation, hypotes och rekommendation och frågar innan större förändringar. En konflikt är en hypotes — inte ett bevis.</div>
          </Card>
        )}

        {/* Proactive insights */}
        <Card>
          <CardLabel right={<span style={{ fontSize: 11, color: T.text.muted }}>{insights.length} observationer</span>}>Proaktiva insikter</CardLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {insights.length === 0 && <div style={{ fontSize: 13, color: T.text.muted, padding: "8px 0" }}>Inga varningar just nu — allt ser balanserat ut. Fortsätt så.</div>}
            {insights.slice(0, 7).map((it, i) => (
              <div key={i} style={{ display: "flex", gap: 11, padding: "11px 13px", background: T.bg.raised, borderRadius: 10, borderLeft: `3px solid ${toneCol(it.tone)}` }}>
                <span style={{ fontSize: 16, lineHeight: 1.3, display: "inline-flex", alignItems: "center", color: toneCol(it.tone) }}><Icon name={it.icon} size={16} /></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text.primary, marginBottom: 2 }}>{it.title}</div>
                  <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.5 }}>{it.body}</div>
                  {it.action && <div style={{ fontSize: 12.5, color: toneCol(it.tone), marginTop: 4, fontWeight: 600 }}>→ {it.action}</div>}
                  {it.why && <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 3 }}>Varför: {it.why}</div>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Adaptive Coach (Garmin-caddie): plateau detection + dialogue */}
        <Card style={{ background: `linear-gradient(135deg, ${T.bg.surface}, rgba(77,163,255,0.05))` }}>
          <CardLabel right={<span style={{ fontSize: 10, fontWeight: 700, color: T.accent.primary, background: "rgba(77,163,255,0.14)", padding: "2px 7px", borderRadius: 5 }}>ADAPTIV</span>}>Adaptiv coach</CardLabel>
          {sessions.length < ADAPTIVE_MIN ? (
            <div>
              <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.55, marginBottom: 8 }}>Jag bygger en individuell modell av dig. När du loggat fler pass börjar jag analysera vad som faktiskt fungerar för just dig och upptäcka platåer.</div>
              <div style={{ height: 6, background: T.bg.raised, borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${Math.min(100, sessions.length / 30 * 100)}%`, height: "100%", background: T.accent.primary }} /></div>
              <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 5 }}>{sessions.length} av ~30 pass loggade</div>
            </div>
          ) : findings.length === 0 ? (
            <div style={{ fontSize: 13.5, color: T.text.secondary, lineHeight: 1.6 }}>Inga platåer upptäckta — din utveckling ser sund ut. Jag hör av mig när jag ser ett mönster värt att diskutera.</div>
          ) : findings.map((f, i) => {
            const ans = answers[i]; const resp = ans != null ? plateauResponse(f, ans) : null;
            return (
              <div key={i} style={{ padding: "12px 14px", background: T.bg.raised, borderRadius: 11, marginBottom: 10, borderLeft: `3px solid ${T.accent.primary}` }}>
                <div style={{ fontSize: 13.5, color: T.text.primary, lineHeight: 1.55, fontWeight: 600, marginBottom: 6 }}>Jag ser något intressant.</div>
                <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.55 }}>{f.observation}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0" }}>
                  <div style={{ flex: 1, height: 5, background: T.bg.muted, borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${f.obsConf}%`, height: "100%", background: f.obsConf >= 75 ? T.accent.success : T.accent.warning }} /></div>
                  <span style={{ fontSize: 11, color: T.text.muted }}>Säkerhet i mönstret {f.obsConf}%</span>
                </div>
                <div style={{ fontSize: 13, color: T.text.primary, fontWeight: 600, marginTop: 6, marginBottom: 6 }}>Innan jag föreslår något: {f.question}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {f.options.map((o, oi) => (
                    <button key={oi} onClick={() => setAnswers({ ...answers, [i]: oi })} style={{ textAlign: "left", padding: "7px 11px", borderRadius: 8, border: `1px solid ${ans === oi ? T.accent.primary : "transparent"}`, cursor: "pointer", fontSize: 12.5, background: ans === oi ? "rgba(77,163,255,0.12)" : T.bg.muted, color: ans === oi ? T.text.primary : T.text.secondary }}>{ans === oi ? "● " : "○ "}{o}</button>
                  ))}
                </div>
                {resp && (
                  <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(155,124,255,0.08)", borderRadius: 9 }}>
                    <div style={{ fontSize: 13, color: T.text.primary, lineHeight: 1.55 }}>{resp.pick === "?" ? resp.text : <><b>Jag lutar åt alternativ {resp.pick}.</b> {resp.text}</>}</div>
                    <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 4 }}>Varför: {resp.why}</div>
                    {resp.pick !== "?" && <div style={{ fontSize: 11.5, color: T.text.secondary, marginTop: 6 }}>Alternativ {resp.pick === "A" ? "B" : "A"}: {resp.pick === "A" ? f.B : f.A}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </Card>

        {/* Body composition & diet dialogue (ch: adaptive) */}
        {sessions.length >= ADAPTIVE_MIN && bodyComp && (
          <Card style={{ background: `linear-gradient(135deg, ${T.bg.surface}, rgba(57,217,138,0.05))` }}>
            <CardLabel right={<span style={{ fontSize: 10, fontWeight: 700, color: T.accent.success, background: "rgba(57,217,138,0.14)", padding: "2px 7px", borderRadius: 5 }}>KROPP & KOST</span>}>Kroppssammansättning</CardLabel>
            <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.55 }}>{bodyComp.observation}</div>
            <div style={{ fontSize: 13, color: T.text.primary, fontWeight: 600, marginTop: 8, marginBottom: 6 }}>{bodyComp.question}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {bodyComp.options.map((o, oi) => (
                <button key={oi} onClick={() => setDietAns(oi)} style={{ textAlign: "left", padding: "7px 11px", borderRadius: 8, border: `1px solid ${dietAns === oi ? T.accent.success : "transparent"}`, cursor: "pointer", fontSize: 12.5, background: dietAns === oi ? "rgba(57,217,138,0.12)" : T.bg.muted, color: dietAns === oi ? T.text.primary : T.text.secondary }}>{dietAns === oi ? "● " : "○ "}{o}</button>
              ))}
            </div>
            {dietAns != null && (
              <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(155,124,255,0.08)", borderRadius: 9 }}>
                <div style={{ fontSize: 13, color: T.text.primary, lineHeight: 1.55 }}>{bodyComp.responses[dietAns].text}</div>
                <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 4 }}>Varför: {bodyComp.responses[dietAns].why}</div>
              </div>
            )}
          </Card>
        )}

        {/* Predictions (ch.14) */}
        {predictions.length > 0 && (
          <Card>
            <CardLabel right={<span style={{ fontSize: 11, color: T.text.muted }}>med osäkerhet</span>}>Prognoser</CardLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {predictions.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 13px", background: T.bg.raised, borderRadius: 10 }}>
                  <div><div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.lab} → {p.target} kg</div><div style={{ fontSize: 12, color: T.text.muted }}>Nu ~{p.cur} kg (est. 1RM)</div></div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.accent.secondary }}>{p.range}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 8 }}>Bygger på din 1RM-trend. Intervall, inte exakt datum — mer data ger säkrare prognos.</div>
          </Card>
        )}

        {/* Digital Twin (ch.12) */}
        {userModel && (
          <Card>
            <CardLabel right={<span style={{ fontSize: 11, color: T.text.muted }}>lärt av {userModel.count} pass</span>}>Din digitala tvilling</CardLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {userModel.topDays.length > 0 && <div style={{ fontSize: 13, color: T.text.secondary }}><span style={{ color: T.text.primary, fontWeight: 600 }}>Tränar oftast:</span> {userModel.topDays.join(", ")} · ~{userModel.freq} pass/vecka</div>}
              {userModel.fav.length > 0 && <div style={{ fontSize: 13, color: T.text.secondary }}><span style={{ color: T.text.primary, fontWeight: 600 }}>Favoritövningar:</span> {userModel.fav.join(", ")}</div>}
              <div style={{ fontSize: 11.5, color: T.text.muted }}>Härlett från din historik — inget du behövt fylla i. Blir mer träffsäkert över tid.</div>
            </div>
          </Card>
        )}

        {/* Ask the coach */}
        <Card>
          <CardLabel>Fråga coachen</CardLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: q != null ? 14 : 0 }}>
            {QA.map(([question], i) => (
              <button key={i} onClick={() => setQ(i)} style={{ ...btn.tag, fontSize: 12.5, background: q === i ? T.accent.primary : T.bg.raised, color: q === i ? "#fff" : T.text.secondary }}>{question}</button>
            ))}
          </div>
          {q != null && (
            <div style={{ padding: "12px 14px", background: T.bg.raised, borderRadius: 10, borderLeft: `3px solid ${T.accent.secondary}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text.primary, marginBottom: 4 }}>{QA[q][0]}</div>
              <div style={{ fontSize: 13.5, color: T.text.secondary, lineHeight: 1.55 }}>{QA[q][1]}</div>
            </div>
          )}
        </Card>
        <div style={{ fontSize: 10.5, color: T.text.muted, marginTop: 4, lineHeight: 1.5 }}>Askr ger träningsvägledning utifrån din loggade data — inte medicinsk rådgivning. Lyssna på kroppen och sök vård vid smärta eller besvär.</div>
      </div>

      <Card>
        <CardLabel>Kroppens läge</CardLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[["Redo att köra hårt", ready, T.accent.success], ["Bär trötthet", fatigued, T.accent.warning], ["Tränas för lite", under, T.accent.primary]].map(([label, arr, col]) => (
            <div key={label}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: col, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.5 }}>
                {arr.length ? arr.slice(0, 4).map(([id, s]) => `${nm(id)}${s.recoveryScore != null && label !== "Tränas för lite" ? ` ${s.recoveryScore}%` : ""}`).join(" · ") : "—"}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <style>{`@media (max-width: 820px){ .coach-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

export { AICoachView, coachReply, findMuscle };
