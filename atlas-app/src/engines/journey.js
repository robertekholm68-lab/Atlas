// ATLAS 2.0 — målresan (konceptets §7).
//
// Skillnaden mot resten av appen: allt annat svarar på "vad tål kroppen idag?".
// Det här svarar på "vart är jag på väg, och var i resan står jag?". Utan den
// är coachen en dagsrapport, inte en coach.
//
// HELT DETERMINISTISK. Ingen språkmodell behövs för att veta vilken fas man är
// i eller hur många veckor som återstår — det är aritmetik. Språkmodellen kan
// senare formulera sig kring dessa fakta, men får aldrig hitta på dem.
//
// Fasindelningen följer klassisk periodisering (ackumulering → intensifiering →
// toppning/nedtrappning) och anges i ANDELAR av blockets längd, inte i fasta
// veckor — annars går modellen sönder för ett mål som ligger 5 veckor bort
// respektive 40.

const DAG = 864e5;
const VECKA = 7 * DAG;

export const MÅLTYPER = {
  strength: { namn: "Styrka", beskrivning: "Maximal kraft i basövningarna" },
  muscle: { namn: "Muskelmassa", beskrivning: "Bygga vävnad över tid" },
  fatloss: { namn: "Fettreducering", beskrivning: "Sänka kroppsfett, behålla styrka" },
  conditioning: { namn: "Kondition", beskrivning: "Uthållighet och återhämtningsförmåga" },
  event: { namn: "Tävling eller test", beskrivning: "Toppa formen till ett datum" },
};

/**
 * Faser som andel av blocket. Summan är 1.
 * Nedtrappningen är kort med flit: den ska räcka för att bli utvilad, inte så
 * lång att formen hinner falla.
 */
const FASER = [
  { id: "bas", namn: "Bas", andel: 0.30, fokus: "Bygg volym och teknik. Vikterna ska kännas hanterbara.", volym: "hög", intensitet: "låg" },
  { id: "uppbyggnad", namn: "Uppbyggnad", andel: 0.35, fokus: "Öka belastningen stegvis. Här sker mest av utvecklingen.", volym: "hög", intensitet: "medel" },
  { id: "intensifiering", namn: "Intensifiering", andel: 0.25, fokus: "Tyngre vikter, färre reps. Volymen backar för att intensiteten ska kunna stiga.", volym: "medel", intensitet: "hög" },
  { id: "nedtrappning", namn: "Nedtrappning", andel: 0.10, fokus: "Sänk volymen kraftigt. Tröttheten faller snabbare än formen.", volym: "låg", intensitet: "hög" },
];

/** Skapar ett mål. Datum lagras som millisekunder. */
export function skapaMål({ typ, målDatum, namn, startDatum, passPerVecka }) {
  // `|| Date.now()` hade behandlat 0 som saknat värde. Orealistiskt datum, men
  // samma slarv bakom flera buggar i projektet: ett falskt värde är inte samma
  // sak som ett utelämnat.
  const start = startDatum != null ? startDatum : Date.now();
  return {
    id: "goal_" + Math.random().toString(36).slice(2, 9),
    typ: typ && MÅLTYPER[typ] ? typ : "muscle",
    namn: namn || (MÅLTYPER[typ] && MÅLTYPER[typ].namn) || "Mitt mål",
    startDatum: start,
    målDatum,
    passPerVecka: passPerVecka || 3,
    skapad: Date.now(),
  };
}

/** Blockets faser med faktiska datum. Tom lista om målet saknar giltig tidsaxel. */
export function faser(mål) {
  if (!mål || !mål.målDatum || mål.målDatum <= mål.startDatum) return [];
  const total = mål.målDatum - mål.startDatum;
  let cursor = mål.startDatum;
  return FASER.map(f => {
    const längd = total * f.andel;
    const från = cursor;
    cursor += längd;
    return { ...f, från, till: cursor, veckor: Math.max(1, Math.round(längd / VECKA)) };
  });
}

/**
 * Var i resan står man?
 *
 * Returnerar null när målet saknas — anropande vy ska då visa ett tomt
 * tillstånd, inte en påhittad resa.
 */
export function resa(mål, sessions = [], nu = Date.now()) {
  if (!mål || !mål.målDatum) return null;

  const fs = faser(mål);
  const total = mål.målDatum - mål.startDatum;
  const gått = nu - mål.startDatum;
  const passerat = nu > mål.målDatum;

  const andel = total > 0 ? Math.max(0, Math.min(1, gått / total)) : 0;
  const aktiv = passerat ? null : fs.find(f => nu >= f.från && nu < f.till) || fs[0];
  const nästa = aktiv ? fs[fs.indexOf(aktiv) + 1] || null : null;

  // Följsamhet: loggade pass sedan start mot förväntat antal. Ett trubbigt
  // men ärligt mått — det säger inget om kvalitet, bara om närvaro.
  const sedan = sessions.filter(s => s && s.completedAt >= mål.startDatum && s.completedAt <= nu);
  const veckorGångna = Math.max(0, gått / VECKA);
  const förväntat = Math.round(veckorGångna * (mål.passPerVecka || 3));
  const följsamhet = förväntat > 0 ? Math.round((sedan.length / förväntat) * 100) : null;

  return {
    mål,
    faser: fs,
    aktivFas: aktiv,
    nästaFas: nästa,
    veckorKvar: passerat ? 0 : Math.max(0, Math.ceil((mål.målDatum - nu) / VECKA)),
    veckorTotalt: Math.max(1, Math.round(total / VECKA)),
    andelKlar: passerat ? 1 : andel,
    passerat,
    passLoggade: sedan.length,
    passFörväntade: förväntat,
    // null när det ännu inte gått tillräckligt länge för att siffran ska betyda
    // något — en följsamhet på "0 %" dag ett vore missvisande.
    följsamhet: veckorGångna >= 1 ? följsamhet : null,
  };
}

/**
 * Delmål: konkreta hållpunkter i resan, härledda ur faserna.
 * Inte önsketänkande om siffror vi inte kan mäta — bara tidsmässiga
 * hållpunkter appen faktiskt kan avgöra om de passerats.
 */
export function delmål(mål, nu = Date.now()) {
  const fs = faser(mål);
  if (!fs.length) return [];
  return fs.map(f => ({
    id: f.id,
    namn: `${f.namn} klar`,
    datum: f.till,
    passerat: nu >= f.till,
    beskrivning: f.fokus,
  }));
}

/** Nästa delmål som ännu inte passerats. */
export function nästaDelmål(mål, nu = Date.now()) {
  return delmål(mål, nu).find(d => !d.passerat) || null;
}

/** Läsbar text om var man står. Formulerad ur fakta, aldrig påhittad. */
export function resansText(r) {
  if (!r) return null;
  if (r.passerat) return `Måldatumet har passerat. Sätt ett nytt mål så börjar en ny resa.`;
  const v = r.veckorKvar;
  const fas = r.aktivFas;
  const tid = v === 0 ? "Måldatumet är idag" : v === 1 ? "En vecka kvar" : `${v} veckor kvar`;
  return fas ? `${tid} · fas ${r.faser.indexOf(fas) + 1} av ${r.faser.length}: ${fas.namn}` : tid;
}
