// MOTOR: dagliga tillskott. Rena funktioner, deterministiska.
//
// VARFÖR en kryssruta och inte ett alarm: appens kunskapsbank säger att kreatin
// är 3–5 g/dag där det DAGLIGA INTAGET ÖVER TID fyller depåerna — ingen
// uppladdning, ingen timing. Klockslaget spelar alltså ingen roll. Det som
// spelar roll är om det blev taget alls, och över hur många dagar i rad.
//
// Därför mäter den här motorn följsamhet, inte tidpunkter. Ett tillskott som
// tas 07:00 eller 21:00 är samma sak; ett tillskott som missas var tredje dag
// är det inte.
//
// EN VIKTIG BEGRÄNSNING, medvetet inbyggd: streaken räknar bakåt från idag och
// bryts av en missad dag, men den firas inte och belönas inte. Guiden säger nej
// till gamification — XP, nivåer och märken är ett produktbeslut som redan är
// fattat åt andra hållet. Siffran finns för att den är information om en vana,
// inte för att den ska jagas.

const DAG = 864e5;

export function startOfDay(ts) {
  const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime();
}

/** Är tillskottet taget idag? */
export function takenToday(log, id, now = Date.now()) {
  const d0 = startOfDay(now);
  return (log || []).some(e => e && e.id === id && e.ts >= d0 && e.ts < d0 + DAG);
}

/** Alla tillskott som är tagna idag. */
export function takenTodayIds(log, now = Date.now()) {
  const d0 = startOfDay(now);
  return [...new Set((log || []).filter(e => e && e.ts >= d0 && e.ts < d0 + DAG).map(e => e.id))];
}

/**
 * Kryssa i eller ur för idag. Idempotent: att kryssa i två gånger ger en post,
 * att kryssa ur tar bort dagens post och lämnar historiken orörd.
 */
export function toggleToday(log, id, now = Date.now()) {
  const arr = log || [];
  const d0 = startOfDay(now);
  const finns = arr.some(e => e && e.id === id && e.ts >= d0 && e.ts < d0 + DAG);
  if (finns) return arr.filter(e => !(e && e.id === id && e.ts >= d0 && e.ts < d0 + DAG));
  return [...arr, { id, ts: now }];
}

/**
 * Antal dagar i rad bakåt från idag som tillskottet tagits.
 * Idag räknas bara om det faktiskt är taget — annars börjar räkningen igår, så
 * att en obockad förmiddag inte ser ut som en bruten vana.
 */
export function streak(log, id, now = Date.now()) {
  const dagar = new Set((log || []).filter(e => e && e.id === id).map(e => startOfDay(e.ts)));
  if (!dagar.size) return 0;
  let d = startOfDay(now);
  if (!dagar.has(d)) d -= DAG;                 // ingen bock idag ≠ bruten vana
  let n = 0;
  while (dagar.has(d)) { n++; d -= DAG; }
  return n;
}

/**
 * Följsamhet de senaste `days` dagarna: hur många av dem tillskottet togs.
 * Returnerar även `days`, så en vy kan visa "5 av 7" i stället för en procent
 * som döljer hur tunt underlaget är.
 */
export function adherence(log, id, days = 7, now = Date.now()) {
  const dagar = new Set((log || []).filter(e => e && e.id === id).map(e => startOfDay(e.ts)));
  const d0 = startOfDay(now);
  let n = 0;
  for (let i = 0; i < days; i++) if (dagar.has(d0 - i * DAG)) n++;
  return { taken: n, days };
}

/** Städar poster äldre än `keepDays` — historiken behöver inte vara evig. */
export function pruneLog(log, keepDays = 120, now = Date.now()) {
  const gräns = startOfDay(now) - keepDays * DAG;
  return (log || []).filter(e => e && e.ts >= gräns);
}
