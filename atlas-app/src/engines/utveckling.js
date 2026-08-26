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
 * TOLKA ETT INMATAT TAL.
 *
 * Komma och punkt är samma decimaltecken — svenskt tangentbord ger komma, ett
 * numeriskt ger punkt, och användaren ska inte behöva veta vilket appen vill ha.
 *
 * TOMT ÄR INTE NOLL. `""`, null och undefined ger null, aldrig 0. En omätt
 * midja och en midja på 0 cm är olika påståenden, och bara det ena är möjligt.
 * Ett värde utanför gränserna ger också null: ett uppenbart feltryck ska inte
 * bli en datapunkt som förstör en kurva i flera månader.
 */
export function tolkaTal(v, min, max) {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  // Negativa mått finns inte. Gränsen fångar dem, men den skrivs ut här också
  // för att avsikten ska synas: det är ingen avrundningsfråga.
  if (n < 0) return null;
  return n >= min && n <= max ? Math.round(n * 10) / 10 : null;
}

/**
 * En kroppsmätning.
 *
 *   ts        tidpunkt
 *   kg        kroppsvikt
 *   fat       kroppsfett i procent      (Omron: "Body Fat")
 *   muscle    skelettmuskel i procent   (Omron: "Skeletal Muscle")
 *   visceral  visceralt fett, nivå 1-59 (Omron: "Visceral Fat")
 *   matt      omkretsar i cm, { midja: 91.5, biceps_hoger: 36, ... }
 *   källa     "manuell" | "omron" | "import"
 *
 * ALLA FÄLT ÄR FRIVILLIGA. En vanlig badrumsvåg ger bara kg; ett måttband ger
 * bara omkretsar; en morgon mäter man midjan och inget annat. Posten skapas så
 * länge NÅGOT värde finns — bara den helt tomma avvisas.
 *
 * Att vikten var obligatorisk var en begränsning från när det här bara var en
 * våglogg. En mätning med enbart midja hade då avvisats tyst.
 *
 * `matt` utelämnas när det är tomt, så poster utan kroppsmått ser ut precis som
 * de gjorde före den här funktionen fanns.
 */
export function byggMätning({ ts, kg, fat, muscle, visceral, matt, källa = "manuell" }) {
  const tal = tolkaTal;
  const post = {
    ts: ts || Date.now(),
    kg: tal(kg, 20, 400),
    // Gränserna avvisar uppenbart fel: under 3 % kroppsfett är dödligt, över
    // 70 % finns inte. En felskrivning ska inte bli en datapunkt.
    fat: tal(fat, 3, 70),
    muscle: tal(muscle, 10, 70),
    // Omrons visceralskala går 1-59; 1-9 är normalt, 10+ förhöjt.
    visceral: tal(visceral, 1, 59),
    källa,
  };

  // Omkretsar: 1-300 cm rymmer allt från en handled till ett bröst, och
  // avvisar ett tappat kommatecken. Tomma fält faller bort helt i stället för
  // att sparas som null — en nyckel som finns men är tom ser ut som en mätning
  // som gjordes och gav ingenting.
  const m = {};
  for (const [id, v] of Object.entries(matt || {})) {
    const n = tal(v, 1, 300);
    if (n != null) m[id] = n;
  }
  if (Object.keys(m).length) post.matt = m;

  const harNågot = post.kg != null || post.fat != null || post.muscle != null
    || post.visceral != null || post.matt != null;
  return harNågot ? post : null;
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
    if (i >= 0) {
      // NULL FÅR ALDRIG SKRIVA ÖVER ETT VÄRDE.
      //
      // En rak spread (`{...ut[i], ...n}`) tog med sig den nya postens tomma
      // fält. Slog man ihop en mätning med bara midja mot en morgonvägning
      // försvann vikten, för den nya posten bar `kg: null`. Tyst dataförlust —
      // och den blev möjlig först när mätningar utan vikt tilläts.
      //
      // Regeln är att ett ifyllt värde vinner över ett tomt, oavsett vilken
      // post det kom från. Den nya vinner bara där den faktiskt mätt något.
      const sammanslagen = { ...ut[i] };
      for (const [k, v] of Object.entries(n)) {
        if (k === "matt") continue;
        if (v != null) sammanslagen[k] = v;
      }
      // `matt` slås ihop nyckel för nyckel av samma skäl: en post med bara
      // midja ska inte radera bröstet och biceparna från samma morgon.
      const matt = { ...(ut[i].matt || {}), ...(n.matt || {}) };
      if (Object.keys(matt).length) sammanslagen.matt = matt;
      ut[i] = sammanslagen;
    } else ut.push(n);
  }
  return ut.sort((a, b) => a.ts - b.ts);
}

/**
 * Värdet för ETT mått ur en post, oavsett var det bor.
 *
 * Kroppssammansättningen ligger som egna fält (`kg`, `fat`, `muscle`) sedan
 * innan; omkretsarna ligger i `matt`. Den skillnaden är historisk och ska inte
 * spilla ut i vyerna — de frågar efter ett id och får ett tal eller null.
 */
export function mätvärde(post, id) {
  if (!post) return null;
  if (id in post && post[id] != null) return post[id];
  return (post.matt && post.matt[id] != null) ? post.matt[id] : null;
}

/** Tidsserie för ett mått: alla poster som HAR värdet, äldst först. */
export function serie(mätningar, id) {
  return (mätningar || [])
    .filter(m => m && mätvärde(m, id) != null)
    .sort((a, b) => a.ts - b.ts)
    .map(m => ({ ts: m.ts, v: mätvärde(m, id), id: m.id }));
}

/**
 * Förändring för ett mått: sedan start och sedan förra mätningen.
 *
 * `null` när underlaget saknas, aldrig 0. Med en enda mätning HAR ingenting
 * förändrats — men det är inte samma sak som att förändringen är noll, och en
 * nolla på skärmen påstår att vi vet något vi inte vet.
 *
 * Enheten för diffen kommer från registret, inte härifrån: för procenttal är
 * den `pp`, inte `%`. Se KROPPSSAMMANSATTNING.
 */
export function förändring(mätningar, id) {
  const s = serie(mätningar, id);
  if (!s.length) return null;
  const nu = s[s.length - 1];
  const rund = v => Math.round(v * 10) / 10;
  return {
    värde: nu.v,
    ts: nu.ts,
    punkter: s.length,
    sedanStart: s.length >= 2 ? rund(nu.v - s[0].v) : null,
    startTs: s.length >= 2 ? s[0].ts : null,
    sedanSenaste: s.length >= 2 ? rund(nu.v - s[s.length - 2].v) : null,
    föregåendeTs: s.length >= 2 ? s[s.length - 2].ts : null,
  };
}

/**
 * PROCENTUELL förändring — medvetet skild från `sedanStart`.
 *
 * Finns som egen funktion för att skillnaden ska vara omöjlig att slarva bort:
 * 24,3 % kroppsfett som blir 22,5 % är −1,8 PROCENTENHETER och −7,4 PROCENT.
 * Gränssnittet visar procentenheter för fett och muskel; den här funktionen är
 * till för den som medvetet vill ha det andra talet.
 */
export function procentuellFörändring(mätningar, id) {
  const s = serie(mätningar, id);
  if (s.length < 2 || !s[0].v) return null;
  return Math.round(((s[s.length - 1].v - s[0].v) / s[0].v) * 1000) / 10;
}

/**
 * Skillnad mellan vänster och höger, ur den senaste posten som har BÅDA.
 *
 * Kräver båda i SAMMA mätning. Att jämföra en vänsterarm från juli med en
 * högerarm från augusti vore att kalla två månaders utveckling för asymmetri.
 *
 * Redovisas neutralt: ett tal och vilken sida som är större. Ingen bedömning,
 * ingen varning — skillnader mellan sidor är normala.
 */
export function asymmetri(mätningar, vänsterId, högerId) {
  const post = (mätningar || [])
    .filter(m => m && mätvärde(m, vänsterId) != null && mätvärde(m, högerId) != null)
    .sort((a, b) => a.ts - b.ts)
    .pop();
  if (!post) return null;
  const v = mätvärde(post, vänsterId), h = mätvärde(post, högerId);
  const diff = Math.round(Math.abs(h - v) * 10) / 10;
  return { vänster: v, höger: h, diff, större: diff === 0 ? null : (h > v ? "höger" : "vänster"), ts: post.ts };
}

/** Mått som har minst ett värde i historiken — de enda värda att visa. */
export function mättMått(mätningar, ids) {
  return (ids || []).filter(id => (mätningar || []).some(m => mätvärde(m, id) != null));
}

/**
 * Ersätter en mätning. Matchar på `ts`, som är postens identitet.
 *
 * Redigering är en ERSÄTTNING, inte en sammanslagning: rensar man ett fält i
 * formuläret ska värdet försvinna. Med `slåIhopMätningar` hade det gamla
 * värdet legat kvar, och fältet gått att ändra men inte att tömma.
 */
export function ändraMätning(mätningar, ts, ny) {
  const ut = (mätningar || []).map(m => (m && m.ts === ts ? ny : m)).filter(Boolean);
  return ut.sort((a, b) => a.ts - b.ts);
}

/** Tar bort en mätning. */
export function raderaMätning(mätningar, ts) {
  return (mätningar || []).filter(m => m && m.ts !== ts);
}

/**
 * KROPPSDATA FÖR COACHEN.
 *
 * Ett samlat, färdigräknat underlag så att coachen slipper känna till
 * lagringsformen. Byggs INTE in i något coachsvar här — det här steget lägger
 * bara datan inom räckhåll, som `coachFacts` redan gör för träningen.
 *
 * Allt kan vara null. En coach som får null ska säga att den inte vet, inte
 * gissa — samma ärlighetsregel som gäller readiness.
 */
export function kroppsdata(mätningar, { dagar = 30, mattIds = [] } = {}, nu = Date.now()) {
  const sedan = (id, d) => {
    const s = serie(mätningar, id);
    if (s.length < 2) return null;
    const gräns = nu - d * 864e5;
    // Närmaste punkt FÖRE fönstret, annars den äldsta inom det. Utan
    // fallbacken ger en historik som börjar inom fönstret alltid null, trots
    // att förändringen går att räkna.
    const före = s.filter(p => p.ts <= gräns).pop() || s[0];
    const nuP = s[s.length - 1];
    if (före.ts === nuP.ts) return null;
    return Math.round((nuP.v - före.v) * 10) / 10;
  };
  const f = id => förändring(mätningar, id);
  const kropp = {};
  for (const id of mattIds) {
    const ä = f(id);
    if (ä) kropp[id] = { värde: ä.värde, ts: ä.ts, sedanStart: ä.sedanStart, sedanSenaste: ä.sedanSenaste };
  }
  return {
    vikt: f("kg"),
    viktFörändringPeriod: sedan("kg", dagar),
    kroppsfett: f("fat"),
    kroppsfettFörändringPeriod: sedan("fat", dagar),
    muskel: f("muscle"),
    muskelFörändringPeriod: sedan("muscle", dagar),
    mått: kropp,
    dagar,
    antalMätningar: (mätningar || []).length,
  };
}

/**
 * Vikthistoriken (`weights`) uppdaterad med kg ur kroppsmätningarna.
 *
 * DE VAR TVÅ LISTOR SOM ALDRIG MÖTTES. `mätningar` fylls när man väger sig i
 * Utveckling och bär kg, fett, muskel och visceralt. `weights` är den enklare
 * formen `{ts, kg}` som profilen, coachen, framstegsvyn, målplanen och backupen
 * läser — och den fylldes BARA av historikimporten. Den som vägde sig i appen
 * fick alltså sin vikt sparad utan att något annat i appen kunde se den:
 * "Om dig" visade streck, kroppsfett och kaloribehov gick inte att räkna, och
 * målresan bedömdes mot en tom vikthistorik. Reproducerat mot bygget —
 * matningar fick posten, weights förblev [].
 *
 * Riktningen är enkelriktad med flit: mätningarna är den rikare källan och
 * vikten härleds ur dem. Att skriva åt andra hållet hade gett två ställen att
 * ändra samma tal på, vilket är just det profilvyn varnar för.
 *
 * Samma tidsfönster som `slåIhopMätningar` (en timme) avgör vad som är samma
 * vägning, så en importerad och en manuell post om samma morgon inte blir två.
 */
export function vikterUrMätningar(weights, mätningar) {
  const ut = [...(weights || [])];
  for (const m of mätningar || []) {
    if (!m || m.kg == null || !Number.isFinite(Number(m.kg))) continue;
    const post = { ts: m.ts, kg: Number(m.kg) };
    const i = ut.findIndex(w => w && Math.abs(w.ts - post.ts) < 36e5);
    if (i >= 0) ut[i] = { ...ut[i], ...post };
    else ut.push(post);
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
