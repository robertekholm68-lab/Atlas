// Distansbaserade aktiviteter. HANDSKRIVEN — hör inte hemma i sportLibrary.js,
// som är genererad från ett externt masterbibliotek och skrivs över i sin
// helhet när det regenereras. Låg där ett tag; det hade tyst raderat både
// listan och tempoberäkningen vid nästa generering.
//
/**
 * Aktiviteter där DISTANS är ett naturligt mått, och där en logg utan den
 * saknar det man faktiskt minns av passet: "jag sprang en mil".
 *
 * Kategorin duger inte som filter — segling och curling ligger i samma grupper
 * som simning och längdskidåkning, men ingen loggar segling i kilometer.
 * Distansbaserat är en egenskap hos aktiviteten och hör därför hemma här,
 * bredvid datan, inte som ett villkor i en vy.
 *
 * Distansen påverkar INTE belastningen. cardioLoad räknas ur tid och intensitet,
 * och att låta kilometer styra hade krävt en modell för hur snabbt just den här
 * personen springer — en gissning förklädd till mätning. Distansen loggas för
 * att den är sann och för att tempot går att räkna ur den.
 */
export const DISTANS_SPORTER = new Set([
  "running", "trail-running", "power-walking", "nordic-walking",
  "cycling", "mountain-biking", "triathlon",
  "swimming", "rowing", "kayaking", "stand-up-paddleboarding",
  "cross-country-skiing", "speed-skating", "biathlon",
  "cardio-treadmill", "cardio-curved-treadmill", "cardio-elliptical",
  "cardio-upright-bike", "cardio-recumbent-bike", "cardio-spin-bike",
  "cardio-air-bike", "cardio-rowing-machine", "cardio-ski-erg",
]);

/** Har aktiviteten en meningsfull distans? */
export function harDistans(id) {
  return DISTANS_SPORTER.has(id);
}

/**
 * Tempo i minuter per kilometer, som "5:30". Returnerar null när något saknas —
 * ett tempo räknat på en gissad distans vore värre än inget tempo.
 */
export function tempoPerKm(km, minuter) {
  if (!(km > 0) || !(minuter > 0)) return null;
  const m = minuter / km;
  const hela = Math.floor(m);
  const sek = Math.round((m - hela) * 60);
  return sek === 60 ? `${hela + 1}:00` : `${hela}:${String(sek).padStart(2, "0")}`;
}
