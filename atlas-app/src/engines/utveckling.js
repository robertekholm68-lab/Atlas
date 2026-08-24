// UTVECKLING ÖVER TID — kropp och styrka.
//
// Vikten fanns redan som { ts, kg }. Omrons vågar mäter mer än så: kroppsfett,
// muskelprocent och visceralt fett. Den datan fanns ingenstans att lägga, och
// utan den går det inte att svara på den fråga som faktiskt betyder något —
// gick vikten ner för att fettet försvann, eller för att muskeln gjorde det?
//
// FÄLTEN ÄR FRIVILLIGA. En vanlig badrumsvåg ger bara kg, och en post utan
// fettprocent ska inte se ut som en post med 0 % fett. null betyder okänt.

/**
 * En kroppsmätning.
 *
 *   ts        tidpunkt
 *   kg        kroppsvikt
 *   fat       kroppsfett i procent      (Omron: "Body Fat")
 *   muscle    skelettmuskel i procent   (Omron: "Skeletal Muscle")
 *   visceral  visceralt fett, nivå 1-59 (Omron: "Visceral Fat")
 *   källa     "manuell" | "omron" | "import"
 */
export function byggMätning({ ts, kg, fat, muscle, visceral, källa = "manuell" }) {
  const tal = (v, min, max) => {
    if (v == null || v === "") return null;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 10) / 10 : null;
  };
  const vikt = tal(kg, 20, 400);
  if (vikt == null) return null;
  return {
    ts: ts || Date.now(),
    kg: vikt,
    // Gränserna avvisar uppenbart fel: under 3 % kroppsfett är dödligt, över
    // 70 % finns inte. En felskrivning ska inte bli en datapunkt.
    fat: tal(fat, 3, 70),
    muscle: tal(muscle, 10, 70),
    // Omrons visceralskala går 1-59; 1-9 är normalt, 10+ förhöjt.
    visceral: tal(visceral, 1, 59),
    källa,
  };
}

/**
 * Härledda massor ur vikt och fettprocent.
 *
 * FETTFRI MASSA ÄR DET SOM BETYDER NÅGOT vid en deff: går vikten ner medan den
 * fettfria massan står stilla har man tappat rätt saker. Går båda ner samtidigt
 * har man tappat muskel också, och det syns inte på vågens huvudsiffra.
 */
export function massor(m) {
  if (!m || m.kg == null) return null;
  const ut = { kg: m.kg, fettMassa: null, fettfriMassa: null, muskelMassa: null };
  if (m.fat != null) {
    ut.fettMassa = Math.round(m.kg * m.fat / 10) / 10;
    ut.fettfriMassa = Math.round((m.kg - ut.fettMassa) * 10) / 10;
  }
  if (m.muscle != null) ut.muskelMassa = Math.round(m.kg * m.muscle / 10) / 10;
  return ut;
}

/**
 * Trend för ett fält över en period.
 *
 * KRÄVER MINST TVÅ MÄTNINGAR MED FÄLTET IFYLLT. En enda punkt är ingen trend,
 * och att visa "0 kg" för att det bara finns ett värde vore att påstå att inget
 * hänt när sanningen är att vi inte vet.
 */
export function trend(mätningar, fält, dagar = 90) {
  const från = Date.now() - dagar * 864e5;
  const p = (mätningar || [])
    .filter(m => m && m.ts >= från && m[fält] != null)
    .sort((a, b) => a.ts - b.ts);
  if (p.length < 2) return null;
  const första = p[0], sista = p[p.length - 1];
  const diff = Math.round((sista[fält] - första[fält]) * 10) / 10;
  const veckor = Math.max(1, (sista.ts - första.ts) / 6048e5);
  return {
    från: första[fält], till: sista[fält], diff,
    perVecka: Math.round(diff / veckor * 100) / 100,
    punkter: p.length,
    frånTs: första.ts, tillTs: sista.ts,
  };
}

/**
 * Tolkar en Omron-CSV.
 *
 * DIREKTKOPPLING GÅR INTE. Omrons API kräver partneravtal, men appen kan
 * exportera CSV ("･･･" i grafvyn → "Export measurement data"). Det är den väg
 * som faktiskt är öppen — och datan lämnar aldrig telefonen.
 *
 * Kolumnnamnen varierar mellan regioner och appversioner, så rubrikerna matchas
 * på nyckelord i stället för exakt sträng.
 */
export function tolkaOmronCsv(text) {
  const rader = String(text || "").split(/\r?\n/).filter(r => r.trim());
  if (rader.length < 2) return { poster: [], fel: "Filen ser tom ut." };

  const dela = r => r.split(/[,;\t]/).map(c => c.trim().replace(/^"|"$/g, ""));
  const rubrik = dela(rader[0]).map(c => c.toLowerCase());

  const hitta = (...ord) => rubrik.findIndex(c => ord.some(o => c.includes(o)));
  const iDatum = hitta("date", "datum", "time", "mät");
  const iVikt = hitta("weight", "vikt");
  // "body fat" före "fat" så visceralt inte fångas av misstag.
  const iFett = rubrik.findIndex(c => /body\s*fat|kroppsfett|fettprocent/.test(c));
  const iMuskel = rubrik.findIndex(c => /skeletal|muscle|muskel/.test(c));
  const iVisc = rubrik.findIndex(c => /visceral/.test(c));

  if (iDatum < 0 || iVikt < 0) {
    return { poster: [], fel: "Hittar ingen datum- eller viktkolumn. Är det en Omron-export?" };
  }

  const poster = [];
  for (const rad of rader.slice(1)) {
    const c = dela(rad);
    const d = new Date(c[iDatum]);
    if (Number.isNaN(d.getTime())) continue;
    const m = byggMätning({
      ts: d.getTime(), kg: c[iVikt],
      fat: iFett >= 0 ? c[iFett] : null,
      muscle: iMuskel >= 0 ? c[iMuskel] : null,
      visceral: iVisc >= 0 ? c[iVisc] : null,
      källa: "omron",
    });
    if (m) poster.push(m);
  }
  return {
    poster,
    fält: {
      fett: iFett >= 0, muskel: iMuskel >= 0, visceral: iVisc >= 0,
    },
    fel: poster.length ? null : "Inga läsbara mätningar i filen.",
  };
}

/**
 * Slår ihop nya mätningar med befintliga.
 *
 * SAMMA MÄTNING TVÅ GÅNGER SKA INTE BLI TVÅ POSTER. Importerar man samma export
 * igen — vilket man gör, för man minns inte var man slutade — matchas poster
 * inom en timme och den nya vinner, eftersom den kan ha fler fält ifyllda.
 */
export function slåIhopMätningar(befintliga, nya) {
  const ut = [...(befintliga || [])];
  for (const n of nya || []) {
    const i = ut.findIndex(m => m && Math.abs(m.ts - n.ts) < 36e5);
    if (i >= 0) ut[i] = { ...ut[i], ...n };
    else ut.push(n);
  }
  return ut.sort((a, b) => a.ts - b.ts);
}

/**
 * Bästa uppskattade 1RM per övning, med tidpunkt.
 *
 * Epley: vikt × (1 + reps/30). Uppskattningen blir sämre ju fler reps — vid 15
 * reps mäter man uthållighet snarare än maxstyrka — så set över 12 reps räknas
 * inte in. Bättre att sakna en punkt än att rita en falsk topp.
 */
export function bästa1RM(sessions, exId) {
  let bäst = null;
  for (const s of sessions || []) {
    for (const x of s.sets || []) {
      if (x.exerciseId !== exId || !x.weight || !x.reps || x.reps > 12) continue;
      const e = Math.round(x.weight * (1 + x.reps / 30));
      if (!bäst || e > bäst.oneRM) bäst = { oneRM: e, ts: s.completedAt, weight: x.weight, reps: x.reps };
    }
  }
  return bäst;
}

/** 1RM-utveckling över tid för en övning: en punkt per pass. */
export function styrkeKurva(sessions, exId) {
  const punkter = [];
  for (const s of (sessions || []).slice().sort((a, b) => a.completedAt - b.completedAt)) {
    let bäst = 0;
    for (const x of s.sets || []) {
      if (x.exerciseId !== exId || !x.weight || !x.reps || x.reps > 12) continue;
      bäst = Math.max(bäst, Math.round(x.weight * (1 + x.reps / 30)));
    }
    if (bäst > 0) punkter.push({ ts: s.completedAt, oneRM: bäst });
  }
  return punkter;
}

/** Övningar med minst två 1RM-punkter — de enda där en kurva säger något. */
export function övningarMedKurva(sessions, minPunkter = 2) {
  const per = {};
  for (const s of sessions || []) {
    for (const x of s.sets || []) {
      if (!x.exerciseId || !x.weight || !x.reps || x.reps > 12) continue;
      per[x.exerciseId] = (per[x.exerciseId] || 0) + 1;
    }
  }
  return Object.entries(per)
    .filter(([, n]) => n >= minPunkter)
    .map(([id]) => id);
}
