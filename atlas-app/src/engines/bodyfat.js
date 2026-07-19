// ENGINE: Kroppsfett via amerikanska flottans omkretsmetod (Hodgdon/NHRC, cm-varianten).
// Män:    495 / (1.0324 − 0.19077·log10(midja − hals) + 0.15456·log10(längd)) − 450
// Kvinnor: 495 / (1.29579 − 0.35004·log10(midja + höft − hals) + 0.22100·log10(längd)) − 450
// Standardavvikelse ~3 % kroppsfett — bäst för att följa FÖRÄNDRING, inte som absolut facit.

export function navyBodyFat({ gender, height, neck, waist, hip }) {
  if (!height || !neck || !waist || (gender === "female" && !hip)) return null;
  const L = Math.log10;
  let bf;
  if (gender === "female") {
    if (waist + hip - neck <= 0) return null;
    bf = 495 / (1.29579 - 0.35004 * L(waist + hip - neck) + 0.22100 * L(height)) - 450;
  } else {
    if (waist - neck <= 0) return null;
    bf = 495 / (1.0324 - 0.19077 * L(waist - neck) + 0.15456 * L(height)) - 450;
  }
  if (!isFinite(bf) || bf < 1 || bf > 75) return null;   // orimligt → mätfel
  return +bf.toFixed(1);
}

export function bodyComposition({ gender, height, neck, waist, hip, weight }) {
  const bodyFat = navyBodyFat({ gender, height, neck, waist, hip });
  if (bodyFat == null) return null;
  const fatMass = weight ? +(weight * bodyFat / 100).toFixed(1) : null;
  const leanMass = weight ? +(weight - fatMass).toFixed(1) : null;
  return { bodyFat, fatMass, leanMass, category: bfCategory(gender, bodyFat) };
}

// ── Härlett kroppsfett direkt ur profilens värden + måtthistoriken (ingen inmatning behövs) ──
// Hals/midja/höft hämtas ur profilens Kroppsmått eller senaste sparade mätning; vikt ur senaste mätning/profilen.
export function derivedBodyFat(profile, measurements = []) {
  if (!profile || !profile.height) return null;
  const latest = k => { const s = (measurements || []).filter(m => m && typeof m[k] === "number").sort((a, b) => a.date - b.date); return s.length ? s[s.length - 1][k] : null; };
  const pm = profile.measurements || {};
  const gender = profile.gender || "male";
  const neck = pm["Hals"] || latest("neck");
  const waist = latest("waist") || pm["Midja"];
  const hip = pm["Höft"] || latest("hip");
  const weight = latest("weight") || profile.weight || null;
  const comp = bodyComposition({ gender, height: profile.height, neck, waist, hip, weight });
  return comp ? { ...comp, inputs: { gender, neck, waist, hip, weight } } : null;
}

// Rekommenderat proteinintag: per kg FETTFRI MASSA när kroppsfett är känt, annars per kg kroppsvikt.
export function recommendedProtein(profile, measurements = []) {
  if (!profile) return null;
  const latestW = (measurements || []).filter(m => m && typeof m.weight === "number").sort((a, b) => a.date - b.date).slice(-1)[0];
  const weight = (latestW && latestW.weight) || profile.weight || null;
  const d = derivedBodyFat(profile, measurements);
  if (d && d.leanMass) return { grams: Math.round(d.leanMass * 2.2), low: Math.round(d.leanMass * 1.9), high: Math.round(d.leanMass * 2.5), basis: "lean", leanMass: d.leanMass };
  if (weight) return { grams: Math.round(weight * 1.8), low: Math.round(weight * 1.6), high: Math.round(weight * 2.0), basis: "weight", weight };
  return null;
}

// ACE-klassificering (samma tabell som artikeln refererar)
export function bfCategory(gender, bf) {
  const t = gender === "female"
    ? [[13, "Essentiellt fett"], [20, "Atletisk"], [24, "Vältränad"], [31, "Genomsnitt"], [Infinity, "Över genomsnitt"]]
    : [[5, "Essentiellt fett"], [13, "Atletisk"], [17, "Vältränad"], [24, "Genomsnitt"], [Infinity, "Över genomsnitt"]];
  for (const [max, label] of t) if (bf <= max) return label;
  return "";
}
