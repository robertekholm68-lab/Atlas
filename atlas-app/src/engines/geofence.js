// MOTOR: "är jag på mitt gym just nu?"
//
// Platserna hittas INTE på av appen. Du står på ditt gym och sparar positionen en gång —
// då blir den exakt, och koordinaterna lämnar aldrig telefonen. Alternativet, en inbyggd
// databas över gymkedjornas adresser, skulle bygga på siffror vi inte kan verifiera.
//
// Två ärliga begränsningar som formar hela designen:
//
//  1. En webbapp kan inte geofenca i bakgrunden. Det finns ingen bakgrunds-geolocation
//     för PWA:er. Kontrollen kan alltså bara ske när appen är öppen — appen kan aldrig
//     säga "välkommen till gymmet" av sig själv. Vi lovar inte mer än så.
//
//  2. GPS inomhus är dålig, ofta 30–100 m fel. Därför vägs mätningens egen
//     osäkerhet in: är felmarginalen större än radien vet vi helt enkelt inte, och
//     då säger motorn "osäker" i stället för att gissa.

const JORDRADIE_M = 6371000;

export const DEFAULT_RADIUS_M = 150;     // generöst: gymmet är en byggnad, inte en punkt
const MAX_ANVÄNDBAR_NOGGRANNHET = 500;   // sämre än så är mätningen värdelös

/** Avstånd i meter mellan två punkter (haversine). */
export function distanceMeters(a, b) {
  if (!a || !b || !isFinite(a.lat) || !isFinite(a.lng) || !isFinite(b.lat) || !isFinite(b.lng)) return null;
  const rad = d => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * JORDRADIE_M * Math.asin(Math.min(1, Math.sqrt(s))));
}

/**
 * Är positionen inom platsens radie?
 *
 * Returnerar ett av tre svar, aldrig en gissning:
 *   { state: "inne" }    — säkert innanför
 *   { state: "ute" }     — säkert utanför
 *   { state: "osäker" }  — mätningen är för slarvig för att avgöra
 */
export function placeState(place, pos, { accuracy = null } = {}) {
  if (!place || !pos) return { state: "osäker", distance: null, reason: "saknar-position" };
  const d = distanceMeters(place, pos);
  if (d === null) return { state: "osäker", distance: null, reason: "ogiltig-position" };

  const radie = place.radius || DEFAULT_RADIUS_M;
  const acc = accuracy != null ? accuracy : (pos.accuracy != null ? pos.accuracy : null);

  if (acc != null && acc > MAX_ANVÄNDBAR_NOGGRANNHET) {
    return { state: "osäker", distance: d, accuracy: acc, reason: "grov-matning" };
  }
  // Felmarginalen får inte spänna över gränsen — då vet vi inte vilken sida vi är på.
  if (acc != null && Math.abs(d - radie) < acc) {
    return { state: "osäker", distance: d, accuracy: acc, reason: "nara-gransen" };
  }
  return { state: d <= radie ? "inne" : "ute", distance: d, accuracy: acc };
}

/** Närmaste sparade plats, med avstånd. null om inga platser finns. */
export function nearestPlace(places, pos) {
  const lista = (places || []).filter(p => p && isFinite(p.lat) && isFinite(p.lng));
  if (!lista.length || !pos) return null;
  let bäst = null;
  for (const p of lista) {
    const d = distanceMeters(p, pos);
    if (d === null) continue;
    if (!bäst || d < bäst.distance) bäst = { place: p, distance: d };
  }
  return bäst;
}

/**
 * Huvudfrågan: står jag på ett sparat gym?
 *
 * Svarar med platsen OCH med hur säkert det är, så vyn kan skilja på
 * "Du är på Gärdet" och "Du verkar vara nära Gärdet".
 */
export function detectGym(places, pos) {
  const närmast = nearestPlace(places, pos);
  if (!närmast) return { found: false, state: "ingen-plats" };
  const st = placeState(närmast.place, pos);
  return {
    found: st.state === "inne",
    maybe: st.state === "osäker",
    place: närmast.place,
    distance: st.distance,
    accuracy: st.accuracy != null ? st.accuracy : null,
    state: st.state,
    reason: st.reason || null,
  };
}

/** Skapar en sparad plats ur en position. Ren funktion. */
export function makePlace({ name, pos, clubId = null, radius = DEFAULT_RADIUS_M, now = Date.now() }) {
  if (!pos || !isFinite(pos.lat) || !isFinite(pos.lng)) return null;
  if (!name || !String(name).trim()) return null;
  return {
    id: `plats_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: String(name).trim(),
    clubId,
    lat: +(+pos.lat).toFixed(6),      // ~0,1 m upplösning; mer är meningslöst och bara spårbart
    lng: +(+pos.lng).toFixed(6),
    radius,
    accuracy: pos.accuracy != null ? Math.round(pos.accuracy) : null,
    savedAt: now,
  };
}

/**
 * Hämtar en position en gång. Medvetet inte watchPosition:
 * en enskild avläsning när appen öppnas räcker, och sparar batteri.
 */
export function getPositionOnce({ timeoutMs = 8000, maxAgeMs = 60000 } = {}) {
  return new Promise(resolve => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ ok: false, reason: "saknas", note: "Den här enheten har ingen positionstjänst." });
      return;
    }
    let klar = false;
    const svara = v => { if (!klar) { klar = true; resolve(v); } };
    navigator.geolocation.getCurrentPosition(
      p => svara({ ok: true, pos: { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy } }),
      err => svara({
        ok: false,
        reason: err && err.code === 1 ? "nekad" : err && err.code === 3 ? "timeout" : "fel",
        note: err && err.code === 1
          ? "Platsåtkomst är nekad. Tillåt plats för Askr i webbläsarens inställningar."
          : "Kunde inte få någon position just nu.",
      }),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: maxAgeMs }
    );
    setTimeout(() => svara({ ok: false, reason: "timeout", note: "Positionen tog för lång tid." }), timeoutMs + 500);
  });
}
