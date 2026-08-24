// MOTOR: Uppföljning av målresans delmål mot LOGGAD data.
//
// Delmålen skapades av intervju-motorn som ren aritmetik. Här bedöms de mot
// verkligheten — och bedömningen följer appens hårdaste lag: ärlighet framför
// påhittade siffror. Ett delmål utan mätning i närheten av datumet får status
// "ingen mätning", aldrig en gissad procent. En vikt äldre än fjorton dagar är
// inget nuläge — då är svaret "väg dig", inte en extrapolerad kurva.

const DAG = 864e5;
const VECKA = 7 * DAG;

/** Vägning närmast ett datum, inom ett fönster. null om ingen finns — ärligt. */
function viktNära(weights, datum, fönsterDgr = 5) {
  const inom = (weights || []).filter(w => w && w.ts != null && Math.abs(w.ts - datum) <= fönsterDgr * DAG);
  if (!inom.length) return null;
  return inom.sort((a, b) => Math.abs(a.ts - datum) - Math.abs(b.ts - datum))[0];
}

/** Senaste vägning, med färskhetsgrind. */
export function aktuellVikt(weights, nu = Date.now(), maxÅlderDgr = 14) {
  const w = (weights || []).slice().sort((a, b) => a.ts - b.ts);
  const sista = w.length ? w[w.length - 1] : null;
  if (!sista) return { kg: null, skäl: "ingen vägning loggad" };
  if (nu - sista.ts > maxÅlderDgr * DAG) return { kg: null, ts: sista.ts, skäl: "senaste vägningen är för gammal — väg dig" };
  return { kg: sista.kg, ts: sista.ts, skäl: null };
}

/** Ackumulerade pass sedan resans start, per sort. */
function passSedan(sessions, startDatum, tillDatum, cardio) {
  return (sessions || []).filter(s => s && s.completedAt
    && s.completedAt >= startDatum && s.completedAt <= tillDatum
    && (cardio ? s.source === "sport" : s.source !== "sport")).length;
}

/**
 * Status för ETT delmål.
 *
 * Passerade delmål: uppnått/missat mot mätning — eller "ingen mätning" när
 * underlag saknas. Kommande delmål: bara målet och datumet; ingen prognos.
 * Statusnycklar: uppnått | missat | ingen_mätning | kommande
 */
export function delmålStatus(dm, { weights = [], sessions = [], startDatum }, nu = Date.now()) {
  if (!dm) return null;
  const passerat = nu >= dm.datum;
  if (!passerat) return { ...dm, status: "kommande", uppmätt: null };

  if (dm.metric === "vikt") {
    const m = viktNära(weights, dm.datum);
    if (!m) return { ...dm, status: "ingen_mätning", uppmätt: null };
    // Riktningen avgör: på väg NER är uppnått ≤ målet, på väg UPP ≥ målet.
    // En halvkilos marginal åt fel håll räknas också — en vägning svänger mer
    // än så av vatten och klocka, och ett delmål ska inte fällas av bruset.
    const marginal = 0.5;
    const uppnått = dm.riktning === "upp"
      ? m.kg >= dm.target - marginal
      : m.kg <= dm.target + marginal;
    return { ...dm, status: uppnått ? "uppnått" : "missat", uppmätt: m.kg };
  }

  const cardio = dm.metric === "cardio";
  if (dm.metric === "pass" || cardio) {
    const antal = passSedan(sessions, startDatum, dm.datum, cardio);
    return { ...dm, status: antal >= dm.target ? "uppnått" : "missat", uppmätt: antal };
  }
  return { ...dm, status: "ingen_mätning", uppmätt: null };
}

/** Nästa kommande delmål (lägsta framtida datum), eller null. */
export function nästaDelmål(mål, nu = Date.now()) {
  const dm = (mål && mål.delmål) || [];
  return dm.filter(d => d.datum > nu).sort((a, b) => a.datum - b.datum)[0] || null;
}

/**
 * Läget mot planen JUST NU — det hemvyn och coachen ska kunna säga i en mening.
 *
 * viktAvvikelse: aktuell vikt minus planens förväntade vikt idag (linjär bana
 * start→mål). null när vägning saknas eller är gammal — med skälet utskrivet.
 * passAvvikelse: loggade styrkepass minus förväntade sedan start.
 */
export function planLäge(mål, { weights = [], sessions = [] } = {}, nu = Date.now()) {
  if (!mål || !mål.plan) return null;
  const start = mål.startDatum, slut = mål.målDatum;
  const ut = { nästa: nästaDelmål(mål, nu), viktAvvikelse: null, viktSkäl: null, förväntadVikt: null, passAvvikelse: null };

  const vm = mål.plan.viktmål;
  if (vm && typeof vm.startKg === "number" && typeof vm.målKg === "number" && slut > start) {
    const andel = Math.max(0, Math.min(1, (nu - start) / (slut - start)));
    ut.förväntadVikt = Math.round((vm.startKg + (vm.målKg - vm.startKg) * andel) * 10) / 10;
    const akt = aktuellVikt(weights, nu);
    if (akt.kg != null) ut.viktAvvikelse = Math.round((akt.kg - ut.förväntadVikt) * 10) / 10;
    else ut.viktSkäl = akt.skäl;
  }

  if (typeof mål.passPerVecka === "number" && nu > start) {
    const veckor = (nu - start) / VECKA;
    // Första veckan sägs ingenting — "du ligger 2 pass efter" dag ett är brus.
    if (veckor >= 1) {
      const förväntat = Math.round(veckor * mål.passPerVecka);
      ut.passAvvikelse = passSedan(sessions, start, nu, false) - förväntat;
    }
  }
  return ut;
}
