// ATLAS 2.0 — import av befintlig historik.
//
// LÄSER från atlas.v2.* (webben) och atlas.mobile.* (telefonen). SKRIVER bara
// till atlas.v3.*. Originalen rörs aldrig — går något fel finns de kvar orörda,
// och importen kan göras om.
//
// Varför dubbletter är farliga just här: två kopior av samma pass dubblar
// muskellasten, vilket sänker readiness och färgar kartan fel. En dubblett gör
// alltså inte gränssnittet rörigt — den får appen att ljuga om kroppen. Därför:
//   · exakt ID-match hoppas över tyst (säkert, ingen gissning)
//   · liknande pass utan gemensamt ID FLAGGAS för användaren att avgöra
//   · ingenting skrivs förrän användaren bekräftat

const KÄLLOR = [
  { prefix: "atlas.v2.", namn: "Webbversionen" },
  { prefix: "atlas.mobile.", namn: "Mobilappen" },
];

const NYCKLAR = ["sessions", "weights", "foodLog", "measurements", "notes", "programs", "activeProgramId", "profile"];

function läs(prefix, nyckel) {
  try { const r = localStorage.getItem(prefix + nyckel); return r ? JSON.parse(r) : null; }
  catch (e) { return null; }
}

/** Vad finns att hämta? Rör ingenting — bara tittar. */
export function scanna() {
  return KÄLLOR.map(k => {
    const sessions = läs(k.prefix, "sessions") || [];
    const pass = sessions.filter(s => s && s.completedAt);
    const tider = pass.map(s => s.completedAt).sort((a, b) => a - b);
    return {
      ...k,
      finns: pass.length > 0 || (läs(k.prefix, "weights") || []).length > 0,
      pass: pass.length,
      första: tider[0] || null,
      sista: tider[tider.length - 1] || null,
      vikter: (läs(k.prefix, "weights") || []).length,
      måltider: (läs(k.prefix, "foodLog") || []).length,
      program: (läs(k.prefix, "programs") || []).length,
    };
  }).filter(k => k.finns);
}

/** Samma pass? Bara när ID är identiskt — ingen gissning. */
const sammaId = (a, b) => a.id && b.id && a.id === b.id;

/**
 * Misstänkt dubblett: samma dag, samma titel, inom två timmar, men olika ID.
 * Uppstår om samma pass loggats manuellt på både telefon och dator.
 * AVGÖRS INTE automatiskt — användaren får se dem och välja.
 */
function liknar(a, b) {
  if (sammaId(a, b)) return false;
  if ((a.title || "") !== (b.title || "")) return false;
  return Math.abs((a.completedAt || 0) - (b.completedAt || 0)) < 2 * 3600e3;
}

/**
 * Förbereder importen utan att skriva något.
 * @returns { nya, dubbletter, misstänkta, vikter, måltider }
 */
export function förbered(befintligaSessions = []) {
  const alla = [];
  KÄLLOR.forEach(k => {
    (läs(k.prefix, "sessions") || []).forEach(s => {
      if (s && s.completedAt) alla.push({ ...s, _källa: k.namn });
    });
  });
  alla.sort((a, b) => a.completedAt - b.completedAt);

  const nya = [], dubbletter = [], misstänkta = [];
  const sedda = [...befintligaSessions];

  alla.forEach(s => {
    if (sedda.some(x => sammaId(x, s))) { dubbletter.push(s); return; }
    const likt = sedda.find(x => liknar(x, s));
    if (likt) { misstänkta.push({ ny: s, liknar: likt }); return; }
    sedda.push(s);
    nya.push(s);
  });

  // Vikter och måltider slås ihop på tidsstämpel — de saknar ofta ID.
  const slåIhop = (nyckel, tsFält = "ts") => {
    const ut = [], set = new Set();
    KÄLLOR.forEach(k => (läs(k.prefix, nyckel) || []).forEach(x => {
      const t = x && x[tsFält];
      if (!t || set.has(t)) return;
      set.add(t); ut.push(x);
    }));
    return ut.sort((a, b) => a[tsFält] - b[tsFält]);
  };

  return {
    nya,
    dubbletter: dubbletter.length,
    misstänkta,
    vikter: slåIhop("weights"),
    måltider: slåIhop("foodLog"),
  };
}

/**
 * Genomför importen. Skriver ENBART till atlas.v3.*.
 * @param valdaMisstänkta  array av de misstänkta som ändå ska tas med
 */
export function genomför(plan, valdaMisstänkta = [], nuvarande = {}) {
  const sessions = [
    ...(nuvarande.sessions || []),
    ...plan.nya,
    ...valdaMisstänkta,
  ].sort((a, b) => a.completedAt - b.completedAt)
    .map(({ _källa, ...s }) => s);   // städa bort spårfältet före sparning

  return {
    sessions,
    weights: plan.vikter,
    foodLog: plan.måltider,
    antal: { pass: plan.nya.length + valdaMisstänkta.length, vikter: plan.vikter.length, måltider: plan.måltider.length },
  };
}

export const _test = { liknar, sammaId };
