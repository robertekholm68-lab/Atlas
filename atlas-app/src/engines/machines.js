// ENGINE: maskindatabas — resolver, sökning/filtrering, klubb-tillgänglighet, PR/progression per modell.
// Rena funktioner. Persistens (min klubb, PR:er, community-rapporter) hanteras i feature-vyn.
import { MACHINE_TYPES, MACHINE_MODELS, MACHINE_BRANDS, RESISTANCE_TYPES } from "../data/machines.js";
import { GYM_CHAINS, GYM_CLUBS } from "../data/gyms.js";
import { EXERCISES } from "../data/exercises.js";
import { MUSCLES } from "../data/muscles.js";

const typeById = Object.fromEntries(MACHINE_TYPES.map(t => [t.id, t]));
const brandById = Object.fromEntries(MACHINE_BRANDS.map(b => [b.id, b]));
const modelById = Object.fromEntries(MACHINE_MODELS.map(m => [m.id, m]));
const chainById = Object.fromEntries(GYM_CHAINS.map(c => [c.id, c]));

export function machineType(id) { return typeById[id] || null; }
export function machineBrand(id) { return brandById[id] || null; }

// Slå ihop typens defaults med modellens överlagringar → ett komplett maskin-record.
// Varje modell "lagrar" alltså alla fält (via ärvning) enligt kravspecen.
export function resolveModel(id) {
  const m = typeof id === "string" ? modelById[id] : id;
  if (!m) return null;
  const t = typeById[m.typeId] || {};
  const brand = brandById[m.brandId] || null;
  return {
    id: m.id,
    manufacturer: m.manufacturer || (brand && brand.manufacturer) || null,
    brandId: m.brandId,
    brand: brand ? brand.name : m.brandId,
    model: m.model,
    series: m.series || null,
    typeId: m.typeId,
    typeName: t.name || m.typeId,
    typeNameEn: t.en || null,
    category: t.category || null,
    pattern: t.pattern || null,
    resistance: m.resistance || t.resistanceDefault || null,
    design: m.design || "bilateral",
    exercises: m.exercises || t.exercises || [],
    muscles: m.muscles || t.muscles || [],
    setup: m.setup || t.setup || [],
    adjustments: m.adjustments || t.adjustments || [],
    commonErrors: m.commonErrors || t.commonErrors || [],
    alternatives: m.alternatives || t.alternatives || [], // typeId[]
    media: m.media || { ref: null, rights: null },
    source: m.source || { verified: false, url: null, note: null },
  };
}

export function allResolvedModels() { return MACHINE_MODELS.map(m => resolveModel(m)); }

export function exerciseName(exId) { const e = EXERCISES.find(x => x.id === exId); return e ? e.name : exId; }
export function muscleName(muscleId) { const m = MUSCLES[muscleId]; return m ? m.name : muscleId; }
export function clubById(id) { return GYM_CLUBS.find(c => c.id === id) || null; }
export function chainName(id) { const c = chainById[id]; return c ? c.name : id; }
export function clubLabel(club) { return club ? `${chainName(club.chainId)} · ${club.name}${club.city ? ` (${club.city})` : ""}` : ""; }

// ── Klubb-inventarium: bas (seedad data) + community-rapporter (lokala, ogranskade) ──
// community: array av { clubId, machineModelId, verification:"community", lastVerified, source, photo? }
export function clubInventory(clubId, community = []) {
  const club = clubById(clubId);
  const base = club ? club.inventory.slice() : [];
  const extra = (community || []).filter(r => r.clubId === clubId).map(r => ({ machineModelId: r.machineModelId, verification: "community", lastVerified: r.lastVerified, source: r.source || "Användarrapport (ej granskad)", photo: r.photo || null }));
  // dedupe på machineModelId (bas vinner över community)
  const seen = new Set(base.map(i => i.machineModelId));
  return [...base, ...extra.filter(e => !seen.has(e.machineModelId))];
}

export function availableModelIdsAtClub(clubId, community = [], { verifiedOnly = false } = {}) {
  return clubInventory(clubId, community).filter(i => !verifiedOnly || i.verification === "verified").map(i => i.machineModelId);
}
export function availableTypeIdsAtClub(clubId, community = [], opts = {}) {
  const ids = availableModelIdsAtClub(clubId, community, opts);
  return [...new Set(ids.map(id => modelById[id] && modelById[id].typeId).filter(Boolean))];
}
// Övningar som kan utföras på klubbens maskiner (kanoniska exId) — för program-builder & coach.
export function availableExerciseIdsAtClub(clubId, community = [], opts = {}) {
  const ids = availableModelIdsAtClub(clubId, community, opts);
  const set = new Set();
  ids.forEach(id => (resolveModel(id)?.exercises || []).forEach(ex => set.add(ex)));
  return [...set];
}

// Verifierade alternativ när en maskin/typ saknas: alternativa typer som finns på klubben,
// verifierade först. Coach kan använda detta för att föreslå ersättare.
export function verifiedAlternativesForType(typeId, clubId, community = []) {
  const t = typeById[typeId];
  if (!t) return [];
  const inv = clubInventory(clubId, community);
  const rank = { verified: 0, unverified: 1, community: 2 };
  const altTypeIds = t.alternatives || [];
  const out = [];
  altTypeIds.forEach(altId => {
    inv.filter(i => modelById[i.machineModelId] && modelById[i.machineModelId].typeId === altId)
      .forEach(i => out.push({ typeId: altId, typeName: (typeById[altId] || {}).name || altId, model: resolveModel(i.machineModelId), verification: i.verification }));
  });
  return out.sort((a, b) => (rank[a.verification] ?? 9) - (rank[b.verification] ?? 9));
}

// ── Sökning & filtrering ──
export function searchMachines(filters = {}) {
  const { query, chainId, clubId, brandId, typeId, muscleId, pattern, resistance, category, community = [] } = filters;
  let clubModelIds = null;
  if (clubId) clubModelIds = new Set(availableModelIdsAtClub(clubId, community));
  const q = (query || "").trim().toLowerCase();
  return allResolvedModels().filter(m => {
    if (clubModelIds && !clubModelIds.has(m.id)) return false;
    if (chainId && !clubId) {
      // alla modeller som finns på någon klubb i kedjan
      const inChain = GYM_CLUBS.filter(c => c.chainId === chainId).some(c => clubInventory(c.id, community).some(i => i.machineModelId === m.id));
      if (!inChain) return false;
    }
    if (brandId && m.brandId !== brandId) return false;
    if (typeId && m.typeId !== typeId) return false;
    if (pattern && m.pattern !== pattern) return false;
    if (resistance && m.resistance !== resistance) return false;
    if (category && m.category !== category) return false;
    if (muscleId && !m.muscles.some(x => x.muscleId === muscleId)) return false;
    if (q) {
      const hay = [m.brand, m.model, m.series, m.typeName, m.typeNameEn, m.manufacturer, ...(m.exercises.map(exerciseName))].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

// Distinkta filtervärden för UI (endast de som finns i datan).
export function filterOptions() {
  const models = allResolvedModels();
  return {
    brands: MACHINE_BRANDS.filter(b => models.some(m => m.brandId === b.id)),
    types: MACHINE_TYPES.filter(t => models.some(m => m.typeId === t.id)),
    patterns: [...new Set(models.map(m => m.pattern).filter(Boolean))].sort(),
    resistances: Object.keys(RESISTANCE_TYPES).filter(r => models.some(m => m.resistance === r)),
    categories: [...new Set(models.map(m => m.category).filter(Boolean))].sort(),
    muscles: [...new Set(models.flatMap(m => m.muscles.map(x => x.muscleId)))].map(id => ({ id, name: muscleName(id) })).sort((a, b) => a.name.localeCompare(b.name)),
    chains: GYM_CHAINS,
    clubs: GYM_CLUBS,
  };
}

// ── PR & progression per machineModelId ──
// Maskinvikter är inte jämförbara mellan modeller. PR:er lagras per (modelId, exId).
// När en användare byter modell finns ingen tidigare baslinje för den nya modellen →
// första loggningen blir en ny baslinje, ALDRIG en rapporterad styrkeförlust.
export function machinePRKey(modelId, exId) { return `${modelId}::${exId}`; }

export function recordMachinePR(prs, modelId, exId, value, at = Date.now()) {
  const key = machinePRKey(modelId, exId);
  const cur = prs[key];
  const isBaseline = !cur;                        // ny modell/övning → baslinje
  const best = cur ? Math.max(cur.best, value) : value;
  return { ...prs, [key]: { modelId, exId, best, last: value, lastAt: at, baseline: cur ? cur.baseline : value, baselineAt: cur ? cur.baselineAt : at, entries: (cur ? cur.entries : 0) + 1, isBaselineJustSet: isBaseline } };
}

export function machinePR(prs, modelId, exId) { return prs[machinePRKey(modelId, exId)] || null; }

// Progression för en modell/övning: skillnad mot modellens EGEN baslinje (aldrig mot en annan modell).
export function machineProgress(prs, modelId, exId) {
  const p = machinePR(prs, modelId, exId);
  if (!p) return null;
  return { best: p.best, last: p.last, baseline: p.baseline, deltaFromBaseline: +(p.best - p.baseline).toFixed(1), entries: p.entries };
}

export function verificationLabel(v) {
  return { verified: "Verifierad", unverified: "Ej verifierad", community: "Community (ogranskad)" }[v] || v;
}
export function verificationColor(v, T) {
  return { verified: T.accent.success, unverified: T.text.muted, community: T.accent.warning }[v] || T.text.muted;
}

// Åldra ett senast-verifierat-datum → varning om det är gammalt.
export function verificationAge(lastVerified) {
  if (!lastVerified) return { days: null, stale: true };
  const days = Math.floor((Date.now() - new Date(lastVerified).getTime()) / 86400000);
  return { days, stale: days > 180 };
}
