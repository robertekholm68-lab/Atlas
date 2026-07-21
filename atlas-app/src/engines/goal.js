// ENGINE: Sammansatt träningsmål ("målresa") + coach-resonemang.
// Ett mål kan väga samman flera delar — muskeltillväxt, styrka, fettreducering, kondition —
// t.ex. en body recomp. Coachen resonerar per del och väger in TRÄNING, KOST och RECOVERY olika.
import { EXERCISES } from "../data/exercises.js";

const DAY = 86400000;
export const GOAL_EVIDENCE = { measured: { label: "Mätdata", c: "#4DA3FF" }, estimate: { label: "Askr-estimat", c: "#687385" }, missing: { label: "Data saknas", c: "#687385" } };

// Fördefinierade mål (viktning 0–100 per del). "custom" låter användaren finjustera själv.
export const GOAL_TYPES = {
  muscle:       { label: "Muskeltillväxt",  weights: { muscle: 100, strength: 35, fatloss: 0,   conditioning: 10 } },
  strength:     { label: "Styrka",          weights: { muscle: 35,  strength: 100, fatloss: 0,   conditioning: 5 } },
  fatloss:      { label: "Fettreducering",  weights: { muscle: 35,  strength: 10, fatloss: 100, conditioning: 45 } },
  conditioning: { label: "Kondition",       weights: { muscle: 15,  strength: 10, fatloss: 30,  conditioning: 100 } },
  recomp:       { label: "Body recomp",     weights: { muscle: 70,  strength: 35, fatloss: 65,  conditioning: 30 } },
  general:      { label: "Allmän form",     weights: { muscle: 45,  strength: 25, fatloss: 35,  conditioning: 45 } },
};
export const GOAL_AXES = [["muscle", "Muskler"], ["strength", "Styrka"], ["fatloss", "Fettreducering"], ["conditioning", "Kondition"]];

export function defaultGoalProfile() { return { type: "recomp", weights: { ...GOAL_TYPES.recomp.weights } }; }

// Onboarding-flödets målnycklar → motorns axlar. "health" hanteras separat (bred allmän-profil).
const ONBOARD_GOAL_AXIS = { muscle: "muscle", strength: "strength", lose: "fatloss", cardio: "conditioning" };

// ── Cold-start: seed:a en goalProfile ur onboardingens valda mål ──
// Så att målresan och coach-resonemanget har signal från första stund (märks som estimat
// tills pass/kost loggas). Returnerar null vid inget primärt mål — anroparen låter då
// profilen sakna goalProfile hellre än att hitta på ett.
export function goalProfileFromOnboarding(primaryGoal, secondaryGoals = []) {
  if (!primaryGoal) return null;
  // Allmän hälsa → bred, jämnt viktad allmän-form-profil.
  if (primaryGoal === "health") return { type: "general", weights: { ...GOAL_TYPES.general.weights } };
  const primaryAxis = ONBOARD_GOAL_AXIS[primaryGoal];
  if (!primaryAxis) return { type: "general", weights: { ...GOAL_TYPES.general.weights } };
  const axes = [primaryGoal, ...(secondaryGoals || [])].map(g => ONBOARD_GOAL_AXIS[g]).filter(Boolean);
  // Muskel + fett samtidigt = kanonisk body recomp (använd recomp-profilens balanserade viktning).
  if (axes.includes("muscle") && axes.includes("fatloss")) return { type: "recomp", weights: { ...GOAL_TYPES.recomp.weights } };
  // Annars: basviktning från primära målet; sekundära mål lyfts till aktiv nivå (≥25 → med i resonemanget).
  const base = GOAL_TYPES[primaryAxis] ? { ...GOAL_TYPES[primaryAxis].weights } : { muscle: 0, strength: 0, fatloss: 0, conditioning: 0 };
  (secondaryGoals || []).forEach(g => { const ax = ONBOARD_GOAL_AXIS[g]; if (ax) base[ax] = Math.max(base[ax] || 0, 50); });
  return { type: primaryAxis, weights: base };
}

// Härleder programmotorns mål (Strength/Hypertrophy/General) ur den dominerande delen.
export function derivedProgramGoal(gp) {
  if (!gp || !gp.weights) return null;
  const w = gp.weights;
  const rank = [["Strength", w.strength || 0], ["Hypertrophy", w.muscle || 0], ["General", Math.max(w.fatloss || 0, w.conditioning || 0)]].sort((a, b) => b[1] - a[1]);
  return rank[0][1] > 0 ? rank[0][0] : "General";
}

// ── Signaler ur faktisk data ──
function weeklyHardSets(sessions) {
  const since = Date.now() - 7 * DAY;
  return (sessions || []).filter(s => s.source !== "sport" && (s.completedAt || 0) >= since).reduce((a, s) => a + (s.sets ? s.sets.length : 0), 0);
}
function cardioCount(sessions, days = 14) {
  const since = Date.now() - days * DAY;
  return (sessions || []).filter(s => s.source === "sport" && (s.completedAt || 0) >= since).length;
}
function trend(measurements, key) {
  const s = (measurements || []).filter(m => m && typeof m[key] === "number").sort((a, b) => a.date - b.date).map(m => ({ date: m.date, value: m[key] }));
  if (s.length < 2) return null;
  return { first: s[0].value, last: s[s.length - 1].value, delta: +(s[s.length - 1].value - s[0].value).toFixed(1) };
}

// ── Huvudresonemang ──
export function goalReasoning({ goalProfile, sessions = [], nutritionTotals = null, nutritionTargets = null, nutritionDays = 0, readiness = null, measurements = [], leanMass = null }) {
  if (!goalProfile || !goalProfile.weights) return null;
  const w = goalProfile.weights;
  const active = GOAL_AXES.filter(([k]) => (w[k] || 0) >= 25);
  if (!active.length) return null;

  // signaler
  const hardSets = weeklyHardSets(sessions);
  const cardio = cardioCount(sessions);
  const kcalTarget = nutritionTargets && nutritionTargets.kcal;   // standardiserat till kcal (var tidigare .calories → alltid undefined)
  const kcalNow = nutritionTotals && nutritionTotals.kcal;
  const balance = (kcalTarget && kcalNow != null) ? (kcalNow < kcalTarget * 0.94 ? "deficit" : kcalNow > kcalTarget * 1.06 ? "surplus" : "maintenance") : null;
  const protTarget = nutritionTargets && nutritionTargets.protein;
  const protNow = nutritionTotals && nutritionTotals.protein;
  const protRatio = (protTarget && protNow != null) ? protNow / protTarget : null;
  const bfTrend = trend(measurements, "bodyFat");
  const wTrend = trend(measurements, "weight");
  const hasNutrition = nutritionDays > 0 && (balance || protRatio != null);

  const comp = ([k, label]) => {
    const parts = [];
    let ev = "estimate";
    if (k === "muscle") {
      if (hardSets >= 10) parts.push(`Träningen håller volym (${hardSets} arbetsset senaste veckan) — bra drivkraft för tillväxt.`);
      else if (hardSets > 0) parts.push(`Volymen är låg just nu (${hardSets} set senaste veckan) — mer volym/progression driver tillväxt.`);
      else parts.push("Logga programpass så kan jag bedöma din träningsvolym.");
      if (hardSets > 0) ev = "measured";
      if (protRatio != null) parts.push(protRatio >= 0.9 ? "Proteinintaget räcker för att bygga muskel." : "Proteinet ligger under målet — höj det för att skydda och bygga muskel.");
      if (balance === "deficit") parts.push("I kaloriunderskott går tillväxten långsammare, men är möjlig — särskilt tidigt eller vid högre fettprocent.");
      else if (balance === "surplus") parts.push("Kaloriöverskottet gynnar muskeltillväxt (men adderar även lite fett).");
    } else if (k === "strength") {
      parts.push(hardSets > 0 ? "Håll tunga baslyft med progression (låg RIR) för styrkeutveckling." : "Styrka byggs av tunga baslyft — logga pass så följer jag din utveckling.");
      if (readiness != null) parts.push(readiness >= 70 ? "Din beredskap tillåter tung, kvalitativ träning." : "Sänkt beredskap → styr intensiteten så tekniken håller.");
      if (readiness != null) ev = "measured";
    } else if (k === "fatloss") {
      if (balance) { parts.push(balance === "deficit" ? "Du ligger i kaloriunderskott — grunden för fettförlust finns." : balance === "surplus" ? "Du ligger i överskott just nu — svårt att tappa fett samtidigt." : "Du ligger runt underhåll — för fettförlust behövs ett måttligt underskott."); ev = nutritionDays >= 3 ? "measured" : "estimate"; }
      else parts.push("Logga kost några dagar så kan jag bedöma din energibalans.");
      if (bfTrend) { parts.push(`Fettprocenten går ${bfTrend.delta < 0 ? "åt rätt håll" : bfTrend.delta > 0 ? "uppåt" : "sidledes"} (${bfTrend.first}% → ${bfTrend.last}%).`); ev = "measured"; }
      else if (wTrend) { parts.push(`Vikten ${wTrend.delta < 0 ? "sjunker" : wTrend.delta > 0 ? "stiger" : "är stabil"} (${wTrend.delta > 0 ? "+" : ""}${wTrend.delta} kg).`); ev = "measured"; }
      if (cardio >= 2) parts.push(`${cardio} konditionspass senaste 2 veckorna ökar energiförbrukningen.`);
    } else if (k === "conditioning") {
      if (cardio >= 2) { parts.push(`${cardio} konditions-/sportpass senaste 2 veckorna — bygger uthållighet.`); ev = "measured"; }
      else if (cardio === 1) { parts.push("Ett konditionspass loggat — lägg gärna till 1–2/vecka för tydlig effekt."); ev = "measured"; }
      else parts.push("Inga konditionspass loggade — 2–3 pass/vecka lyfter din kondition.");
      parts.push("Lägg konditionen så den inte krockar med tunga benpass.");
    }
    return { key: k, label, weight: w[k], evidence: ev, text: parts.join(" ") };
  };

  const components = active.map(comp);

  // synthesis + avvägningar
  const muscleOn = (w.muscle || 0) >= 25, fatOn = (w.fatloss || 0) >= 25, condOn = (w.conditioning || 0) >= 25;
  let synthesis, tradeoffs = [];
  if (muscleOn && fatOn) {
    synthesis = "Det här är en body recomp — bygga muskel och tappa fett samtidigt. Fullt möjligt, men båda går långsammare än om du fokuserar på en sak i taget.";
    tradeoffs.push("Håll ett måttligt underskott (inte aggressivt) så muskeln skyddas.");
    tradeoffs.push("Protein är viktigast av allt: sikta högt och jämnt över dagen.");
    tradeoffs.push("Behåll tung, progressiv styrketräning — det är signalen att behålla/bygga muskel i underskott.");
    if (condOn) tradeoffs.push("Kondition hjälper underskottet, men för mycket kan tära på återhämtning och benpass — sprid ut den.");
  } else if (fatOn && condOn) {
    synthesis = "Fokus på fettförlust och kondition. Kombinationen fungerar bra ihop — kondition stödjer energibalansen.";
    tradeoffs.push("Behåll lite styrketräning + högt protein så du tappar fett, inte muskel.");
  } else if (muscleOn && (w.strength || 0) >= 25) {
    synthesis = "Fokus på muskel och styrka — de samverkar väl. Ät i underhåll till lätt överskott.";
    tradeoffs.push("Prioritera progression på baslyften och tillräcklig återhämtning mellan tunga pass.");
  } else {
    synthesis = "Ett fokuserat mål — det ger snabbast framsteg. Håll planen konsekvent.";
  }

  // recovery-avvägning (gäller hela målresan)
  const stressors = [muscleOn || (w.strength || 0) >= 25, fatOn, condOn].filter(Boolean).length;
  let recovery = null;
  if (readiness != null) {
    if (readiness < 55 && stressors >= 2) recovery = { evidence: "estimate", text: `Din beredskap är ${readiness} och du driver flera mål samtidigt — det ställer höga krav. Sömn, protein och en lugnare vecka vid behov gör att alla delar går framåt i stället för att bromsa varandra.` };
    else if (readiness >= 76) recovery = { evidence: "measured", text: `Beredskap ${readiness} — du återhämtar väl och har utrymme att driva målresan på.` };
    else recovery = { evidence: "measured", text: `Beredskap ${readiness} — okej. Håll koll på sömn och kost när du kombinerar flera mål.` };
  }

  return { type: goalProfile.type, components, synthesis, tradeoffs, recovery, signals: { hardSets, cardio, balance, protRatio: protRatio != null ? +protRatio.toFixed(2) : null, hasNutrition } };
}
