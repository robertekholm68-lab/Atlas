// MOTOR: Målintervjun — coachen diskuterar sig fram till ett mål med delmål.
//
// ROLLFÖRDELNINGEN, samma som i coach-llm:
//
//     MODELLEN INTERVJUAR OCH FÖRESLÅR. MOTORN RÄKNAR OCH VALIDERAR.
//
// Modellen ställer frågorna ("bröllop 12 juni — hur många pass i veckan hinner
// du?") och levererar till slut en PLAN som JSON. Men ingenting av det modellen
// säger blir sanning av sig självt:
//
//   1. Planen valideras deterministiskt här — schema, datum, säkra takter.
//      En viktkurva som kräver mer än säker takt underkänns med besked om
//      tidigast möjliga datum. Modellen får felen tillbaka och försöker om.
//   2. Delmålen på datum GENERERAS av motorn ur den godkända planen — linjär
//      interpolation, aritmetik. Modellen hittar aldrig på ett delmålsvärde.
//   3. Ingenting sparas förrän användaren sett hela planen och tryckt
//      "Starta resan". Människan är sista grinden, inte modellen.
//
// Varför frågorna INTE körs genom talkontrollen (påhittadeTal): en intervju
// föreslår tal av naturen — "är 12 veckor rimligt?" är en fråga, inte ett
// påstående om ett mätvärde. Kontrollen sitter i stället där den biter: på den
// slutliga planen (deterministisk validering) och på människan (förhandsvisning
// före sparande). Utgångsvärden (startvikt) måste dock spåras till mätdata
// eller användarens egna ord — modellen får inte hitta på var någon står idag.

import { MÅLTYPER, skapaMål } from "./journey.js";
import { derivedBodyFat } from "./bodyfat.js";
// OBS: styrketrenden tas som PARAMETER, inte via import från engines/index.js.
// Den filen drar in hela livsmedelsdatabasen (JSON) och skulle göra den här
// motorn tung att ladda och omöjlig att testa isolerat. Anroparen har redan
// värdet; motorn ska förbli lätt.

const DAG = 864e5;
const VECKA = 7 * DAG;

// ── Säkra takter för viktförändring ─────────────────────────────────────────
// Allmänt vedertagna gränser i träningslitteraturen: viktnedgång bortom ~1 %
// av kroppsvikten per vecka tär på muskelmassa och prestation; hållbar
// uppbyggnad går väsentligt långsammare. Rekommenderad takt är satt under
// maxgränsen med flit — planen ska vara hållbar, inte precis laglig.
export const SÄKRA_TAKTER = {
  nerMaxPct: 1.0,          // absolut tak, % av kroppsvikt per vecka
  nerRekommenderadPct: 0.6, // takten delmålen räknas på
  uppMaxPct: 0.5,          // uppbyggnad: tak
  uppRekommenderadPct: 0.3,
};

/**
 * Räknar på en viktbana: är målet nåbart till datumet i säker takt?
 * Returnerar alltid ett besked, aldrig ett löfte — är takten för hög säger den
 * det och räknar fram tidigast rimliga datum i stället.
 */
export function viktbana({ startKg, målKg, målDatum, nu = Date.now() }) {
  if (startKg == null || målKg == null || !målDatum) return null;
  const veckor = Math.max(0.1, (målDatum - nu) / VECKA);
  const delta = målKg - startKg;                       // negativ = nedgång
  const kgPerVecka = delta / veckor;
  const pctPerVecka = Math.abs(kgPerVecka) / startKg * 100;
  const ner = delta < 0;
  const maxPct = ner ? SÄKRA_TAKTER.nerMaxPct : SÄKRA_TAKTER.uppMaxPct;
  const rekPct = ner ? SÄKRA_TAKTER.nerRekommenderadPct : SÄKRA_TAKTER.uppRekommenderadPct;
  const ok = pctPerVecka <= maxPct;
  // Tidigast rimliga datum i REKOMMENDERAD takt (inte maxtakt) — förslaget ska
  // vara det hållbara, inte det nätt och jämnt tillåtna.
  const veckorBehövs = Math.abs(delta) / (startKg * rekPct / 100);
  const tidigasteDatum = nu + Math.ceil(veckorBehövs) * VECKA;
  return {
    ok, ner,
    veckor: Math.round(veckor * 10) / 10,
    kgPerVecka: Math.round(kgPerVecka * 100) / 100,
    pctPerVecka: Math.round(pctPerVecka * 100) / 100,
    maxPct, rekPct,
    tidigasteDatum,
  };
}

// ── Underlaget modellen intervjuar utifrån ──────────────────────────────────
// Allt appen redan VET skickas med, så att coachen aldrig frågar om sådant som
// står i loggen — och så att den kan tala om ANVÄNDAREN i stället för att låta
// som en broschyr. Ett tunt underlag ger generiska svar: det är inte modellens
// fel, det är underlagets.
//
// Varje tal härleds ur data. Saknas något står det som null, aldrig som en
// uppskattning — modellen ska kunna se skillnad på "vet inte" och "är noll".
export function byggIntervjuUnderlag({ weights = [], sessions = [], foodLog = [], nutritionTargets = null, profile = null, activeProgram = null, readiness = null, styrketrend = null, nu = Date.now() } = {}) {
  const pr = profile || {};
  const w = weights.slice().sort((a, b) => a.ts - b.ts);
  const senasteVikt = w.length ? w[w.length - 1] : null;
  const viktFärsk = senasteVikt ? (nu - senasteVikt.ts) <= 14 * DAG : false;

  // Viktriktningen de senaste åtta veckorna — vad kroppen FAKTISKT gjort, inte
  // vad någon tror. Coachen ska kunna säga "du har legat still i sex veckor".
  const åttaV = w.filter(x => nu - x.ts <= 56 * DAG);
  const viktTrendKg = åttaV.length >= 2
    ? Math.round((åttaV[åttaV.length - 1].kg - åttaV[0].kg) * 10) / 10
    : null;

  const fyraV = (sessions || []).filter(s => s && s.completedAt && nu - s.completedAt <= 28 * DAG);
  const styrkepass = fyraV.filter(s => s.source !== "sport").length;
  const cardiopass = fyraV.filter(s => s.source === "sport").length;

  const kostdagar = new Set((foodLog || []).filter(e => e && e.ts != null && nu - e.ts <= 28 * DAG)
    .map(e => new Date(e.ts).toDateString())).size;

  // Styrkeläget kommer utifrån (se importkommentaren). Normaliseras här så
  // formen är densamma oavsett vad anroparen skickar.
  const trend = styrketrend
    ? { övning: styrketrend.name || styrketrend.övning || styrketrend.exercise || null,
        förändring: styrketrend.delta != null ? styrketrend.delta : (styrketrend.förändring != null ? styrketrend.förändring : null) }
    : null;

  // Kroppsfett räknas bara när måtten finns. Ingen skattning ur vikt och längd —
  // det vore ett påhittat tal med två decimalers självförtroende.
  let kroppsfett = null;
  try {
    const bf = derivedBodyFat(pr);
    if (bf && bf.bodyFat != null) kroppsfett = Math.round(bf.bodyFat * 10) / 10;
  } catch (e) { kroppsfett = null; }

  const nt = nutritionTargets || {};

  return {
    idag: new Date(nu).toISOString().slice(0, 10),
    namn: pr.name || null,
    // PROFILEN ÄR EN KÄLLA, INTE EN FRÅGA. Allt som redan står här ska coachen
    // slippa fråga om — och FÅR inte fråga om, enligt prompten. Innan
    // profilvyn fanns frågade intervjun om ålder, längd och kost varje gång ett
    // mål sattes, trots att svaret var detsamma varje gång.
    kön: pr.gender || pr.sex || null,
    ålder: pr.age != null ? pr.age : null,
    längdCm: pr.height != null ? pr.height : null,
    träningsvana: pr.level || null,
    kosthållning: pr.diet || null,
    kostupplägg: pr.dietApproach || null,
    // Användarens egna ord om skador. Coachen ska ta hänsyn men aldrig tolka
    // dem medicinskt — det står i prompten.
    skadorOchBesvär: pr.injuryNotes || null,

    // Vikt: senaste mätningen ELLER besked om att den saknas/är gammal. En
    // vikt från i våras är inte ett utgångsläge — då ska coachen fråga.
    senasteViktKg: viktFärsk ? senasteVikt.kg : null,
    viktMätningSaknas: !viktFärsk,
    viktförändring8vKg: viktTrendKg,
    kroppsfettProcent: kroppsfett,

    // Faktisk träningsrytm senaste fyra veckorna — inte vad någon hoppas.
    styrkepassSenaste4v: styrkepass,
    cardiopassSenaste4v: cardiopass,
    passPerVeckaSnitt: Math.round((styrkepass / 4) * 10) / 10,
    aktivtProgram: activeProgram ? { namn: activeProgram.name || null, passPerVecka: activeProgram.daysPerWeek || null, inriktning: activeProgram.goal || null } : null,
    readinessIdag: readiness != null ? readiness : null,
    bästaStyrketrend: trend,

    kostloggadeDagarSenaste4v: kostdagar,
    harKostmål: !!(nt.kcal || nt.protein),
    kostmål: (nt.kcal || nt.protein) ? { kcal: nt.kcal || null, proteinG: nt.protein || null } : null,

    säkraTakter: SÄKRA_TAKTER,
    måltyper: Object.keys(MÅLTYPER),
  };
}

// ── Systemprompten ──────────────────────────────────────────────────────────
export const INTERVJU_SYSTEMPROMPT = `Du är coachen i Askr, en svensk styrketräningsapp, och genomför en MÅLINTERVJU. Användaren vill sätta ett mål (t.ex. ett bröllop, magrutor, en träningsresa) och du ska diskutera dig fram till en komplett plan.

ARBETSSÄTT.
Ställ EN fråga i taget, kort och konkret. Underlaget innehåller det appen redan vet: vikt och viktförändring, kroppsfett, träningsrytm, aktivt program, readiness, styrketrend, kostloggning, kostmål, och profilen (kön, ålder, längd, träningsvana, kosthållning, skador). Fråga ALDRIG om sådant som står där.

ANVÄND UNDERLAGET AKTIVT. Hänvisa till användarens faktiska siffror i dina frågor — "du har legat på 2,1 pass i veckan senaste månaden, håller tre?" är en bra fråga; "hur ofta tränar du?" är slöseri med någons tid när svaret redan står i underlaget. Ett generiskt samtal är ett misslyckande. Står ett fält som null vet appen det inte; fråga bara om det är nödvändigt för just det här målet.

ANVÄND UNDERLAGET SYNLIGT. När du föreslår något ska du motivera det med KONKRETA värden ur underlaget — "du tränar redan 3 pass i veckan", "med 96 kg som utgångsläge" — inte med allmänna resonemang. Användaren ska kunna se att du känner hens data. Hitta aldrig på ett värde som inte står i underlaget; saknas något frågar du efter det.

HÄNSYN TILL SKADOR. Står det något under skadorOchBesvär är det användarens EGNA ord, inte en diagnos. Ta hänsyn till det i planens träningsdel och nämn det, men gör aldrig en medicinsk bedömning och avråd inte från vård. Det du behöver få klart:
1. Målet i klartext och vilken typ det är (typerna står i underlaget).
2. Ett måldatum. Har användaren inget: föreslå en rimlig horisont i veckor och be om bekräftelse. Planen KRÄVER ett datum.
3. Om målet rör vikt eller kroppsform: utgångsvikt (ur underlaget om den finns, annars fråga) och målvikt. Respektera säkra takter i underlaget — kräver målet högre takt, säg det rakt och föreslå senare datum eller mindre förändring.
4. Ramar: styrkepass per vecka, konditionspass per vecka, begränsningar (skador, tid, utrustning).
5. Kort om kost, vila och sömn som vanor — appen kan inte mäta sömn, så det blir riktlinjer, inte mätbara delmål. Säg det ärligt.

REGLER.
Du får inte hitta på mätvärden om användaren. Utgångsvikt kommer ur underlaget eller användarens svar — ingenting annat. Torr, saklig svenska, inga utropstecken, inga emojis, ingen markdown. Högst 50 ord per fråga.

NÄR ALLT ÄR KLART.
Svara då med ENDAST ett JSON-objekt (ingen text före eller efter, inga kodstaket) i exakt denna form:
{"klar":true,"namn":"...","typ":"muscle|strength|fatloss|conditioning|event","målDatum":"ÅÅÅÅ-MM-DD","beskrivning":"en mening om målet","viktmål":{"startKg":0,"målKg":0} eller null,"passPerVecka":0,"cardioPerVecka":0,"dimensioner":{"träning":"...","kost":"...","cardio":"...","vila":"...","sömn":"..."}}
Varje dimension är 1–2 meningar konkret vägledning för just detta mål. Tal i planen måste komma ur samtalet eller underlaget.`;

/**
 * ÖPPNINGEN: vad appen faktiskt vet om dig, i klartext.
 *
 * Robert satte ett mål och upplevde att coachen inte såg hans värden — trots
 * att de fanns i underlaget. Den slutsatsen var rimlig: ingenting i samtalet
 * visade vad som kommit fram. Ett underlag användaren inte kan se går inte att
 * lita på, och i en app som aldrig fejkar datasäkerhet duger det inte.
 *
 * Funktionen är REN och deterministisk — inga tal från modellen, bara ur
 * underlaget. Saknas något sägs det med sin följd, aldrig med tystnad.
 * Returnerar { ser: [...], saknar: [...], text }.
 */
export function intervjuÖppning(u) {
  const ser = [];
  const saknar = [];
  if (!u) return { ser, saknar, text: "" };

  if (u.senasteViktKg != null) {
    const trend = u.viktförändring8vKg;
    const t = trend == null ? ""
      : Math.abs(trend) < 0.5 ? ", i stort sett oförändrad på åtta veckor"
      : `, ${trend < 0 ? "ner" : "upp"} ${Math.abs(trend)} kg på åtta veckor`;
    ser.push(`du väger ${u.senasteViktKg} kg${t}`);
  } else if (u.viktMätningSaknas) {
    saknar.push("en färsk vägning — utan den kan jag inte sätta delmål på vikt");
  }

  if (u.kroppsfettProcent != null) ser.push(`kroppsfett ${u.kroppsfettProcent} %`);
  if (u.längdCm != null && u.ålder != null) ser.push(`${u.ålder} år, ${u.längdCm} cm`);
  else saknar.push("ålder eller längd — de behövs för kaloribehov (fyll i under Om dig)");

  if (u.styrkepassSenaste4v != null) {
    const c = u.cardiopassSenaste4v ? ` och ${u.cardiopassSenaste4v} konditionspass` : "";
    ser.push(`${u.styrkepassSenaste4v} styrkepass${c} senaste fyra veckorna`);
  }
  if (u.aktivtProgram && u.aktivtProgram.namn) ser.push(`programmet ${u.aktivtProgram.namn}`);
  else saknar.push("ett aktivt program — jag kan föreslå ett som passar målet sedan");

  if (u.readinessIdag != null) ser.push(`readiness ${u.readinessIdag} idag`);
  if (u.bästaStyrketrend && u.bästaStyrketrend.övning) {
    const d = u.bästaStyrketrend.förändring;
    if (d != null && Math.abs(d) >= 1) ser.push(`${u.bästaStyrketrend.övning} ${d > 0 ? "+" : ""}${d} kg`);
  }
  if (u.harKostmål) ser.push("dina näringsmål");
  if (u.träningsvana) {
    const n = { beginner: "nybörjare", intermediate: "van", advanced: "erfaren" }[u.träningsvana];
    if (n) ser.push(`träningsvana: ${n}`);
  }
  if (u.skadorOchBesvär) ser.push("det du skrivit om skador");

  const rader = [];
  if (ser.length) rader.push(`Det här ser jag: ${ser.join(", ")}.`);
  else rader.push("Jag har nästan ingen data om dig ännu, så jag kommer behöva fråga om det mesta.");
  if (saknar.length) rader.push(`Jag saknar ${saknar.join("; ")}.`);

  return { ser, saknar, text: rader.join(" ") };
}
export function intervjuMeddelande({ underlag, transkript = [] }) {
  const rader = transkript.map(r => `${r.från === "du" ? "Användaren" : "Coachen"}: ${r.text}`).join("\n");
  return `UNDERLAG (det appen vet — fråga inte om detta):\n${JSON.stringify(underlag, null, 1)}\n\nSAMTALET HITTILLS:\n${rader}\n\nFortsätt intervjun enligt reglerna. Är allt klart: svara med enbart JSON-objektet.`;
}

/**
 * Tolkar ett modellsvar: en fråga att visa, eller en färdig plan.
 * Kodstaket städas bort om modellen ändå använder dem — fult, inte farligt.
 */
export function tolkaIntervjuSvar(text) {
  const t = String(text || "").trim();
  if (!t) return { typ: "tomt" };
  const utanStaket = t.replace(/```json/gi, "").replace(/```/g, "").trim();
  const i = utanStaket.indexOf("{");
  if (i >= 0 && /"klar"\s*:\s*true/.test(utanStaket)) {
    // Klipp ut från första { till sista } — modeller lägger ibland en artighet runt.
    const j = utanStaket.lastIndexOf("}");
    if (j > i) {
      try {
        const plan = JSON.parse(utanStaket.slice(i, j + 1));
        if (plan && plan.klar === true) return { typ: "plan", plan };
      } catch (e) { /* faller igenom nedan */ }
    }
    // KAPAT ELLER TRASIGT? Skillnaden avgör vad anroparen kan göra åt saken.
    //
    // Ett kapat svar slutar mitt i — klamrarna går inte ihop, eller det finns
    // ingen avslutande } alls. Då är planen inte fel, den är AVHUGGEN, och rätt
    // åtgärd är att be om den igen kortare. Ett trasigt svar (balanserade
    // klamrar men ogiltig JSON) hjälper inget omförsök mot.
    //
    // Robert råkade ut för exakt det här: proxyn körde ett gammalt tokentak,
    // planens JSON kapades mitt i, och han fick "formulera om" — trots att
    // ingenting var fel med det han skrivit.
    const svans = utanStaket.slice(i);
    const öppna = (svans.match(/\{/g) || []).length;
    const stängda = (svans.match(/\}/g) || []).length;
    if (j < i || öppna > stängda) {
      return { typ: "kapad", fel: "svaret kapades innan planen var färdig" };
    }
    return { typ: "ogiltig", fel: "planen gick inte att tolka som JSON" };
  }
  return { typ: "fråga", text: t };
}

/**
 * Instruktion till modellen när planen kapats: leverera samma plan igen, men
 * kort nog att den ryms. Skickas som en tur i samtalet, inte som en ny prompt —
 * modellen behöver se vad den redan kommit fram till.
 */
export const KORTA_PLANEN_INSTRUKTION =
  "[Ditt förra svar kapades innan JSON-objektet var färdigt. Leverera planen igen, "
  + "identisk i sak men kortare: högst en mening per dimension. Enbart JSON-objektet, "
  + "ingen text runt.]";

// ── Validering — den deterministiska grinden ────────────────────────────────
const datumMs = s => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return null;
  const ms = new Date(s + "T12:00:00").getTime();
  return Number.isFinite(ms) ? ms : null;
};

/** Alla tal som förekommer i användarens egna repliker. */
function användarensTal(transkript) {
  const ut = new Set();
  (transkript || []).filter(r => r.från === "du").forEach(r =>
    (String(r.text).match(/\d+([.,]\d+)?/g) || []).forEach(t => ut.add(String(t).replace(",", "."))));
  return ut;
}

/**
 * Validerar en plan mot schema, datum, säkra takter och spårbarhet.
 * Returnerar { ok, fel: [...], bana } — felen är formulerade så de kan skickas
 * tillbaka till modellen som instruktion för nästa försök.
 */
export function valideraPlan(plan, { underlag = {}, transkript = [], nu = Date.now() } = {}) {
  const fel = [];
  if (!plan || typeof plan !== "object") return { ok: false, fel: ["ingen plan"] };

  if (!plan.namn || !String(plan.namn).trim()) fel.push("namn saknas");
  if (!plan.typ || !MÅLTYPER[plan.typ]) fel.push(`typ måste vara en av: ${Object.keys(MÅLTYPER).join(", ")}`);

  const mål = datumMs(plan.målDatum);
  if (mål == null) fel.push("målDatum saknas eller har fel format (ÅÅÅÅ-MM-DD)");
  else if (mål <= nu + 6 * DAG) fel.push("målDatum måste ligga minst en vecka fram");
  else if (mål > nu + 730 * DAG) fel.push("målDatum ligger mer än två år bort — dela upp i ett närmare mål");

  const ppv = plan.passPerVecka;
  if (!(typeof ppv === "number" && ppv >= 1 && ppv <= 7)) fel.push("passPerVecka måste vara 1–7");
  const cpv = plan.cardioPerVecka;
  if (cpv != null && !(typeof cpv === "number" && cpv >= 0 && cpv <= 7)) fel.push("cardioPerVecka måste vara 0–7");

  const dim = plan.dimensioner || {};
  ["träning", "kost", "cardio", "vila", "sömn"].forEach(k => {
    if (!dim[k] || !String(dim[k]).trim()) fel.push(`dimensionen "${k}" saknas`);
  });

  let bana = null;
  if (plan.viktmål) {
    const { startKg, målKg } = plan.viktmål;
    if (typeof startKg !== "number" || typeof målKg !== "number") {
      fel.push("viktmål kräver startKg och målKg som tal");
    } else {
      // SPÅRBARHET: utgångsvikten måste komma ur mätdata eller användarens egna
      // ord. En modell som "vet" att någon väger 95 har hittat på det.
      const uppmätt = underlag.senasteViktKg;
      const sagda = användarensTal(transkript);
      const startOk = (uppmätt != null && Math.abs(startKg - uppmätt) <= 0.5)
        || sagda.has(String(startKg).replace(",", "."))
        || sagda.has(String(Math.round(startKg)));
      if (!startOk) fel.push(`startKg (${startKg}) finns varken i mätdata eller i användarens svar — fråga efter utgångsvikten`);
      if (mål != null && startOk) {
        bana = viktbana({ startKg, målKg, målDatum: mål, nu });
        if (bana && !bana.ok) {
          const tidigast = new Date(bana.tidigasteDatum).toISOString().slice(0, 10);
          fel.push(`viktbanan kräver ${bana.pctPerVecka} % av kroppsvikten per vecka — över säker gräns (${bana.maxPct} %). Föreslå datum omkring ${tidigast} eller mindre förändring, och fråga användaren`);
        }
      }
    }
  }

  return { ok: fel.length === 0, fel, bana };
}

// ── Delmålsgenerering — ren aritmetik ur en godkänd plan ────────────────────
/**
 * Daterade, MÄTBARA delmål. Bara sådant appen faktiskt kan avgöra:
 *   vikt  — mot loggade vägningar (källa: mätdata)
 *   pass  — ackumulerade styrkepass mot förväntat (källa: loggade pass)
 *   cardio — samma för sport-/konditionspass
 * Sömn och vila blir MEDVETET inga delmål: appen saknar datakälla, och ett
 * delmål ingen kan mäta är önsketänkande med datumstämpel. De lever som
 * riktlinjer i plan.dimensioner.
 */
export function genereraDelmål(plan, { nu = Date.now() } = {}) {
  const mål = datumMs(plan.målDatum);
  if (mål == null || mål <= nu) return [];
  const totalVeckor = (mål - nu) / VECKA;
  // Kontrollpunkter var ~3:e vecka, minst 2, högst 8 — täta nog att styra efter,
  // glesa nog att en missad vägning inte fäller hela resan.
  const antal = Math.max(2, Math.min(8, Math.round(totalVeckor / 3)));
  const ut = [];
  for (let k = 1; k <= antal; k++) {
    const andel = k / antal;
    const datum = Math.round(nu + (mål - nu) * andel);
    const veckorDit = (datum - nu) / VECKA;
    if (plan.viktmål && typeof plan.viktmål.startKg === "number" && typeof plan.viktmål.målKg === "number") {
      const v = plan.viktmål.startKg + (plan.viktmål.målKg - plan.viktmål.startKg) * andel;
      // Riktningen följer med: "uppnått" betyder olika saker på väg ner och upp.
      const riktning = plan.viktmål.målKg < plan.viktmål.startKg ? "ner" : "upp";
      ut.push({ id: `dm_v_${k}`, datum, metric: "vikt", target: Math.round(v * 10) / 10, unit: "kg", källa: "mätdata", riktning });
    }
    if (typeof plan.passPerVecka === "number") {
      ut.push({ id: `dm_p_${k}`, datum, metric: "pass", target: Math.round(veckorDit * plan.passPerVecka), unit: "pass", källa: "loggade pass" });
    }
    if (typeof plan.cardioPerVecka === "number" && plan.cardioPerVecka > 0) {
      ut.push({ id: `dm_c_${k}`, datum, metric: "cardio", target: Math.round(veckorDit * plan.cardioPerVecka), unit: "pass", källa: "loggade pass" });
    }
  }
  return ut.sort((a, b) => a.datum - b.datum);
}

/**
 * Bygger v3-målet ur en GODKÄND plan. Journey-fälten (typ, datum, passPerVecka)
 * fylls så att faser/resa fortsätter fungera oförändrat; planen och delmålen
 * läggs bredvid. Ett mål i taget — det här ERSÄTTER ett eventuellt gammalt, och
 * det valet gör användaren i förhandsvisningen, inte koden.
 */
export function byggMålFrånPlan(plan, { nu = Date.now() } = {}) {
  const mål = skapaMål({
    typ: plan.typ,
    namn: plan.namn,
    passPerVecka: plan.passPerVecka,
    startDatum: nu,
    målDatum: datumMs(plan.målDatum),
  });
  return {
    ...mål,
    beskrivning: plan.beskrivning || "",
    plan: {
      dimensioner: plan.dimensioner || {},
      viktmål: plan.viktmål || null,
      cardioPerVecka: plan.cardioPerVecka != null ? plan.cardioPerVecka : null,
    },
    delmål: genereraDelmål(plan, { nu }),
  };
}
