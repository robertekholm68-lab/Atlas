// LLM (BYOK): användarens egen Claude-nyckel, lagrad lokalt, anropas direkt från webbläsaren.
// Grundning: modellen får appens faktiska data + relevanta kunskapsbank-citat och instrueras att
// aldrig hitta på siffror. Utan nyckel/fel → appen faller tillbaka på den deterministiska coachen.
import { citableFacts, citableTopic, KNOWLEDGE, TOPICS } from "../data/knowledge.js";
import { buildCoachFacts, readinessFörbehåll } from "../engines/facts.js";

const LS_KEY = "atlas.llm";
export const CLAUDE_MODELS = [
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 — snabb & billig (rekommenderad)" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5 — starkare resonemang" },
  { id: "claude-opus-4-8", label: "Claude Opus 4.8 — mest kapabel (dyrast)" },
];

export function getLlmConfig() {
  try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function setLlmConfig(cfg) {
  try { if (cfg) localStorage.setItem(LS_KEY, JSON.stringify(cfg)); else localStorage.removeItem(LS_KEY); return true; } catch { return false; }
}
export function hasLlm() { const c = getLlmConfig(); return !!(c && c.key && c.model); }

// Rått anrop mot Anthropics Messages API, direkt från webbläsaren.
export async function callClaude({ key, model, system, messages, max_tokens = 600 }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({ model, max_tokens, system, messages }),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const e = await res.json(); if (e && e.error && e.error.message) msg = e.error.message; } catch { }
    const err = new Error(msg); err.status = res.status; throw err;
  }
  const data = await res.json();
  return (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
}

// Liten testförfrågan för att verifiera nyckel + modell.
export async function testKey(key, model) {
  try {
    const txt = await callClaude({ key, model, max_tokens: 16, messages: [{ role: "user", content: "Svara med ordet OK." }] });
    return { ok: true, sample: txt };
  } catch (e) {
    return { ok: false, error: e.message, status: e.status };
  }
}

// ── Grundning: bygg systemprompt + kompakt datakontext ur appens motorer ──
export function coachSystemPrompt() {
  return [
    "Du är Askr träningscoach. Du svarar på svenska, kort och konkret, i ett peppande men sakligt tonläge.",
    "REGLER:",
    "- Använd ENDAST siffror och fakta från datakontexten nedan. Hitta ALDRIG på siffror (readiness, vikter, kalorier, set).",
    "- Varje datablock har en 'tillit' (ingen/svag/ok/god). Vid svag eller ingen tillit — eller när blocket har 'OBS: TUNT UNDERLAG' — säg UTTRYCKLIGEN att det bygger på tunt underlag och uttala dig försiktigt. Dra aldrig en tvärsäker slutsats ur tunn data; föreslå hellre vad användaren kan logga för att göra bedömningen säkrare.",
    "- Blocken är FACTS-grundade (appens ärlighetsgrindar) UTOM 'goal_recomp_EJ_FACTS', som är ctx-resonemang. Grunda alla siffror om readiness, vikt, träning, kost och program på facts-blocken; använd 'goal_recomp_EJ_FACTS' som mjukt resonemang om målmixen, inte som exakta mätvärden.",
    "- Saknas data: säg det ärligt och föreslå vad användaren kan logga.",
    "- När du nämner muskelfakta: använd bara de fakta som finns under 'muscleFacts' och håll dig till dem.",
    "- När du hänvisar till en träningsprincip (t.ex. progressiv överbelastning, volym, deload): använd fakta under 'principle' och nämn gärna källan om den finns. Grunda programråd i principen.",
    "- Kost och skador: ge förslag, inte medicinsk rådgivning. Uppmana att kontakta vård vid osäkerhet.",
    "- Personalisera: väg in det som står under 'person' och 'menscykel' i kontexten (anta ALDRIG kön eller ålder — använd bara det som anges). Är användaren kvinna, väg in det relevanta när det passar: järn och energitillgång, kalcium/D-vitamin för benhälsa (särskilt klimakteriet), att kreatin fungerar lika bra för kvinnor, och cykelfasen om den är spårad. Är användaren ~50 eller äldre: väg in att återhämtningen tar lite längre tid, att tillräckligt protein (övre spannet, jämnt fördelat) och styrketräning blir ännu viktigare för muskel- och benhälsa. Håll det peppande och sakligt — aldrig så att någon känner sig gammal. Gör det naturligt, inte påklistrat.",
    "- Du är EN coach — samma röst överallt. Känner du till användarens tillskott (under 'tillskott'), ta hänsyn till dem och föreslå inte dubbelt.",
    "- Kostval: står det 'kost' under person (vegan/vegetarian/pescetarian), väg in det. På vegankost är B12 ett måste, och alg-omega-3 samt växtbaserat järn (tas upp sämre) är extra relevanta; protein behöver planeras från flera växtkällor. Anta aldrig kostval — använd bara det som anges.",
    "- Kosthållning: står det 'kosthållning' (LCHF/keto/medelhavskost/GI/paleo/högprotein), respektera den. På keto/LCHF är kolhydraterna låga — högintensiv träning kan kännas tyngre tills kroppen anpassat sig, och elektrolyter/magnesium blir viktigare. Föreslå inte en massa kolhydrater till någon som valt lågkolhydrat; anpassa råden inom deras upplägg.",
    "- Restriktioner/allergier: står det 'restriktioner' under person, föreslå ALDRIG livsmedel eller tillskott som bryter mot dem (t.ex. inga nötter vid nötallergi, inga mejeriprodukter/vassle vid laktosfri utan säg laktosfritt alternativ). Vid laktosfri: lyft kalcium/D från icke-mejeri. Detta väger tyngst av alla kostråd — säkerhet först.",
    "- Du kan föreslå att öppna programbiblioteket eller starta nästa pass, men du ändrar aldrig program själv — användaren godkänner i appen.",
    "- Håll svaret under ~120 ord om inte frågan kräver mer.",
  ].join("\n");
}

// Kompakt kontext (JSON-likt) GRUNDAD I §13 (buildCoachFacts). Siffror OCH
// per-block-tillit följer med, så språkmodellen ärver samma ärlighetsgrindar som
// den deterministiska coachen: där tilliten är svag/ingen skrivs det UT ("tunt
// underlag"), inte bara talet. Undantag: goalReasonings recomp-mix är fortfarande
// ctx-grundad och flaggas EXPLICIT som EJ facts, så gränsen är tydlig för modellen.
export function buildGroundingContext(userText, ctx, extra = {}) {
  const { overallReadiness, goalReasoning: gr, profile, cycle, supplements } = ctx;
  const facts = buildCoachFacts(ctx);
  const c = {};

  // ── person / cykel / tillskott (ur profil, oförändrat) ──
  const age = profile && profile.age;
  const diet = profile && profile.diet;
  const kostLbl = { pescetarian: "pescetarian", vegetarian: "vegetarian", vegan: "vegan" }[diet];
  const apprLbl = { mediterranean: "medelhavskost", highprotein: "högprotein", lchf: "LCHF", keto: "keto", gi: "GI-metoden", paleo: "paleo" }[profile && profile.dietApproach];
  const RESTR_LBL = { lactose: "laktosfri", gluten: "glutenfri", nuts: "nötallergi", shellfish: "skaldjursallergi", egg: "äggallergi", soy: "sojaallergi", pork: "fläskfritt", alcohol: "alkoholfritt" };
  const restr = ((profile && profile.restrictions) || []).map(r => RESTR_LBL[r]).filter(Boolean);
  if ((profile && profile.gender && profile.gender !== "unspecified") || (typeof age === "number" && age > 0) || kostLbl || apprLbl || restr.length)
    c.person = { ...(profile && profile.gender && profile.gender !== "unspecified" ? { kön: profile.gender === "female" ? "kvinna" : "man" } : {}), ...(typeof age === "number" && age > 0 ? { ålder: age } : {}), ...(kostLbl ? { kost: kostLbl } : {}), ...(apprLbl ? { kosthållning: apprLbl } : {}), ...(restr.length ? { restriktioner: restr } : {}) };
  if (cycle) c.menscykel = { fas: cycle.sv, dag: cycle.day, readinessJustering: cycle.readiness };
  if (Array.isArray(supplements) && supplements.length) c.tillskott = supplements.map(s => s.name);

  // ── FACTS-GRUNDAT (§13) — varje block bär sin tillit; tunt underlag skrivs ut ──
  const medTillit = (obj, tillit) => {
    const svag = tillit && (tillit.nivå === "svag" || tillit.nivå === "ingen");
    return { ...obj, tillit: tillit ? tillit.nivå : "ingen", underlag: tillit ? tillit.text : "inget underlag", ...(svag ? { OBS: "TUNT UNDERLAG — säg uttryckligen att det bygger på lite data och uttala dig försiktigt" } : {}) };
  };
  const kropp = facts.kropp;
  const rd = kropp.readiness != null ? kropp.readiness : overallReadiness;   // fallback bara när §13 saknar muskellast
  if (rd != null) c.readiness = medTillit({ overall: rd, redo: kropp.redo.map(m => m.namn).slice(0, 4), slitna: kropp.slitna.map(m => m.namn).slice(0, 4), förbehåll: readinessFörbehåll(facts) || undefined }, kropp.tillit);
  else { const f = readinessFörbehåll(facts); if (f) c.readiness = { overall: null, förbehåll: f, tillit: kropp.tillit.nivå }; }
  if (facts.träning.passTotalt) c.träning = medTillit({ passSenasteVeckan: facts.träning.passIVeckan, volymSenasteVeckan: facts.träning.volymIVeckan, dagarSedanPass: facts.träning.dagarSedanPass }, facts.träning.tillit);
  if (facts.vikt.senaste != null) c.vikt = medTillit({ senasteKg: facts.vikt.senaste, förändringKg: facts.vikt.förändring }, facts.vikt.tillit);
  if (facts.kost.harMål) c.kost = medTillit({ proteinMål: facts.kost.proteinMål, proteinIdag: facts.kost.proteinIntag, kaloriMål: facts.kost.kcalMål, kaloriIdag: facts.kost.kcalIntag, energibalansIdag: facts.kost.energibalans }, facts.kost.tillit);
  if (facts.program.namn) c.program = medTillit({ namn: facts.program.namn, följsamhetProcent: facts.program.följsamhet, toppförslag: facts.program.förslag ? facts.program.förslag.title : null, nextWorkout: extra.nextWorkoutName || null }, facts.program.tillit);
  else c.program = null;
  if (facts.målresa.namn) c.målresa = medTillit({ namn: facts.målresa.namn, fas: facts.målresa.fas, veckorKvar: facts.målresa.veckorKvar, nästaDelmål: facts.målresa.nästaDelmål ? facts.målresa.nästaDelmål.namn : null, följsamhetProcent: facts.målresa.följsamhet }, facts.målresa.tillit);

  // ── EJ FACTS-GRUNDAT — goalReasonings recomp-mix (ctx-resonemang), flaggat ──
  if (gr) c.goal_recomp_EJ_FACTS = { OBS: "Detta block kommer ur ctx-resonemang (goalReasoning), INTE ur facts/§13. Siffrorna (t.ex. veckans set, vikt-/fettrend, mål-vikter) är uppskattningar — behandla som resonemang, inte exakta mätvärden. Grunda readiness/vikt/kost på facts-blocken ovan.", type: gr.type, synthesis: gr.synthesis, components: gr.components.map(x => ({ del: x.label, vikt: x.weight, läge: x.text })), tradeoffs: gr.tradeoffs };

  // ── kunskapsbanken (ur SL()/citableTopic, oförändrat) ──
  if (extra.muscleId && KNOWLEDGE[extra.muscleId]) c.muscleFacts = { muscle: KNOWLEDGE[extra.muscleId].title, facts: citableFacts(extra.muscleId).map(f => f.fact) };
  if (extra.topicId && TOPICS[extra.topicId]) {
    const tf = citableTopic(extra.topicId);
    c.principle = { titel: TOPICS[extra.topicId].title, facts: tf.map(f => f.fact), källa: (tf.find(f => f.source) || {}).source ? tf.find(f => f.source).source.name : null };
  }
  return "DATAKONTEXT — alla block är FACTS-grundade (§13, med per-block-tillit) UTOM 'goal_recomp_EJ_FACTS'. 'tillit' = hur säkert blocket är; 'OBS: TUNT UNDERLAG' betyder att du ska uttala dig försiktigt:\n" + JSON.stringify(c, null, 1);
}
