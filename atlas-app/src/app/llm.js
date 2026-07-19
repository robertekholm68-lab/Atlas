// LLM (BYOK): användarens egen Claude-nyckel, lagrad lokalt, anropas direkt från webbläsaren.
// Grundning: modellen får appens faktiska data + relevanta kunskapsbank-citat och instrueras att
// aldrig hitta på siffror. Utan nyckel/fel → appen faller tillbaka på den deterministiska coachen.
import { citableFacts, citableTopic, KNOWLEDGE, TOPICS } from "../data/knowledge.js";

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
    "Du är ATLAS träningscoach. Du svarar på svenska, kort och konkret, i ett peppande men sakligt tonläge.",
    "REGLER:",
    "- Använd ENDAST siffror och fakta från datakontexten nedan. Hitta ALDRIG på siffror (readiness, vikter, kalorier, set).",
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

// Kompakt kontext (JSON-likt) ur den data coachen redan har.
export function buildGroundingContext(userText, ctx, extra = {}) {
  const { overallReadiness, muscleStates, activeProgram, goalReasoning: gr, nutritionTotals, nutritionTargets, profile, cycle, supplements } = ctx;
  const c = {};
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
  if (overallReadiness != null) {
    const st = Object.entries(muscleStates || {}).map(([id, s]) => ({ id, ...s }));
    c.readiness = { overall: overallReadiness, fresh: st.filter(x => x.recoveryScore >= 75).slice(0, 4).map(x => x.id), tired: st.filter(x => x.recoveryScore < 55).slice(0, 4).map(x => x.id) };
  }
  if (activeProgram) c.activeProgram = { name: activeProgram.name, nextWorkout: extra.nextWorkoutName || null };
  else c.activeProgram = null;
  if (gr) c.goal = { type: gr.type, synthesis: gr.synthesis, components: gr.components.map(x => ({ del: x.label, vikt: x.weight, läge: x.text })), tradeoffs: gr.tradeoffs };
  if (nutritionTargets) c.nutrition = { proteinMål: nutritionTargets.protein, kaloriMål: nutritionTargets.kcal, proteinIdag: nutritionTotals && nutritionTotals.protein, kaloriIdag: nutritionTotals && nutritionTotals.kcal };
  // muskelfakta för ev. muskel i frågan (endast etablerade)
  if (extra.muscleId && KNOWLEDGE[extra.muscleId]) {
    c.muscleFacts = { muscle: KNOWLEDGE[extra.muscleId].title, facts: citableFacts(extra.muscleId).map(f => f.fact) };
  }
  // träningsprincip för ev. princip i frågan (t.ex. progressiv överbelastning, deload, uppvärmning)
  if (extra.topicId && TOPICS[extra.topicId]) {
    const tf = citableTopic(extra.topicId);
    c.principle = { titel: TOPICS[extra.topicId].title, facts: tf.map(f => f.fact), källa: (tf.find(f => f.source) || {}).source ? tf.find(f => f.source).source.name : null };
  }
  return "DATAKONTEXT (fakta om användaren just nu):\n" + JSON.stringify(c, null, 1);
}
