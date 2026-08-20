// Askr 2.0 — pågående pass.
//
// Den enda vyn man faktiskt STÅR i, på ett gym, med svettiga händer och
// telefonen i fickan mellan seten. Därav besluten:
//   · vilonedräkningen är det största på skärmen
//   · knapparna är stora nog att träffa utan att sikta
//   · pågående pass sparas efter VARJE ändring, inte vid avslut — dör appen
//     mitt i ett pass ska ingenting vara borta
//
// Loggar på riktigt till atlas.v3.*, via samma buildSession som nuvarande
// appen. Ett pass som loggas här är alltså en riktig session med riktig
// muskellast, inte en attrapp.

import { useState, useEffect, useRef, useMemo } from "react";
import { C, HFONT, BFONT, hdr, label, btnPrimary, btnGhost, btnText, card, volt } from "./design.js";
import { save, load } from "./store.js";
import { restDoneCue, DEFAULT_CUES } from "../engines/cues.js";
import { workoutExercises, alternativesFor } from "../engines/programs.js";
import { progressionSuggestion, lastPerformance, formatWeight, formatVolume } from "../engines/index.js";
import { buildSession } from "../engines/session.js";
import { useLayout } from "./layout.js";
import { buildPostSession, attachReason, reasonSignal } from "../engines/post-session.js";
import { createSetListener, voiceSupport } from "../engines/voice.js";
import { EXERCISES } from "../data/exercises.js";
import { MUSCLES } from "../data/muscles.js";
import { tempoPerKm } from "../data/sportDistans.js";

/** Bygger passets övningslista med förslag ur historiken. */
export function buildLive(program, workout, sessions) {
  const items = workoutExercises(workout).map(x => {
    // Användarens egna svar efter tidigare pass justerar förslaget. Biasen kan
    // dämpa eller förstärka en ökning, aldrig vända en backning.
    const bias = (reasonSignal(sessions) || {}).progressionBias || 0;
    const sug = progressionSuggestion(x.exId, sessions, x.repMax, bias);
    const lp = lastPerformance(sessions, x.exId);
    return {
      exId: x.exId,
      namn: (x.exercise && x.exercise.name) || x.exId,
      // Kräver övningen yttre vikt? Då får den inte loggas utan en — annars
      // blir volymen noll, muskellasten noll, och appen tror att passet aldrig
      // hänt. Ett tyst nolldatum är värre än att behöva knappa in en siffra.
      yttreVikt: !!(x.exercise && x.exercise.loadMode === "external"),
      grupp: (x.exercise && x.exercise.group) || null,
      set: x.sets || 3,
      repMin: x.repMin, repMax: x.repMax,
      vila: x.restSec || 90,
      vikt: sug ? sug.weight : (lp && lp.weight ? lp.weight : null),
      reps: sug ? sug.reps : (x.repMax || 8),
      förslag: sug ? sug.note : null,
      loggade: [],
    };
  });
  // PROGRAM KAN VARA NULL — ett fritt pass hör inte till något program.
  // Utan den här vakten kastar program.id och passet startar aldrig; skärmen
  // blir blank utan felmeddelande, samma tysta fel som SyntheticEvent-buggen.
  return {
    programId: program ? program.id : null,
    workoutId: workout.id || null,
    namn: workout.name, startad: Date.now(), idx: 0, items,
  };
}

function Ring({ kvar, av, storlek = 168 }) {
  const r = (storlek - 14) / 2, omkrets = 2 * Math.PI * r;
  const andel = av > 0 ? Math.max(0, Math.min(1, kvar / av)) : 0;
  const mm = String(Math.floor(kvar / 60)).padStart(2, "0");
  const ss = String(kvar % 60).padStart(2, "0");
  return (
    <svg width={storlek} height={storlek} style={{ display: "block" }} aria-label={`Vila ${mm}:${ss}`}>
      <circle cx={storlek / 2} cy={storlek / 2} r={r} fill="none" stroke={C.track} strokeWidth="8" />
      <circle cx={storlek / 2} cy={storlek / 2} r={r} fill="none" stroke={C.lime} strokeWidth="8"
        strokeLinecap="round" strokeDasharray={omkrets} strokeDashoffset={omkrets * (1 - andel)}
        transform={`rotate(-90 ${storlek / 2} ${storlek / 2})`}
        style={{ transition: "stroke-dashoffset 1s linear" }} />
      <text x="50%" y="49%" textAnchor="middle" dominantBaseline="middle"
        style={{ fontFamily: HFONT, fontSize: 40, fontWeight: 800, fill: C.text }}>{mm}:{ss}</text>
      <text x="50%" y="68%" textAnchor="middle"
        style={{ fontFamily: HFONT, fontSize: 12, letterSpacing: 2, fill: C.lime }}>VILA</text>
    </svg>
  );
}

// Vikten kvantiseras till 0,25 kg, förankrat i hela kilon. Tidigare kördes
// toFixed(1) på varje knapptryck, vilket gjorde 63,75 till 63,8 — och felet
// ackumulerades: 61,25 → 63,8 → 66,3 → 68,8. Talet på skärmen var alltså inte
// den vikt som låg på stången.
const kvant = (v, raster) => Math.round(v / raster) * raster;

const STEG_KG = [2.5, 1.25, 0.25];

/**
 * Skriver en passtid begripligt. Över två timmar säger "min" ingenting —
 * "163 h" går att läsa, "9746 min" måste räknas om i huvudet. Och över ett dygn
 * är talet i sig en signal om att något är fel, vilket också ska synas.
 */
function passtid(min) {
  if (min < 120) return { tal: String(min), enhet: "min" };
  if (min < 1440) return { tal: String(Math.round(min / 60)), enhet: "tim" };
  return { tal: String(Math.round(min / 1440)), enhet: min < 2880 ? "dygn" : "dygn" };
}

function Steg({ värde, sätt, steg, enhet, min = 0, valbart = false, smal = false }) {
  const [i, setI] = useState(0);
  const s = valbart ? STEG_KG[i] : steg;
  const raster = enhet === "kg" ? 0.25 : 1;
  // flexShrink: 0 — träffytan är 44 px och får aldrig krympa bort.
  const knapp = {
    width: 44, height: 44, borderRadius: 999, flexShrink: 0,
    border: `1px solid ${C.border}`, background: C.card2, color: C.text,
    fontSize: 21, cursor: "pointer", lineHeight: 1,
  };
  const flytta = d => sätt(Math.max(min, kvant((värde || 0) + d * s, raster)));
  // UNDERETIKETTEN BARA NÄR DEN SÄGER NÅGOT NYTT.
  //
  // Kortet har redan en rubrik ("Vikt" / "Reps"). För vikten bär raden under
  // talet extra information — enhet och vald steglängd — men för reps stod bara
  // "REPS" en gång till. Den upprepningen var dessutom det som klipptes vid
  // 360 px: ordet behövde 27 px och hade 24.
  // SIFFERSTORLEKEN FÖLJER TALETS EGEN LÄNGD.
  //
  // Förut fick viktkortet extra bredd (flex 1.35) för att rymma "70,75". Det
  // löste bredden men gjorde korten olika stora: knapparna hamnade 88 px isär i
  // viktkortet och 43 px isär i reps, och det såg ut som två olika kontroller.
  //
  // Nu är korten lika breda och det är TALET som anpassar sig. De flesta vikter
  // är korta ("70", "72,5"); bara kvartskilon blir fem tecken, och då räcker en
  // mindre grad. Kontrollerna ser likadana ut oavsett vad som står i dem.
  const text = formatWeight(värde);
  // Femteckensvikter ("75,75") uppstår bara med kvartskilosteg och är därför
  // ovanliga — de får bära nedskalningen så att de vanliga fallen kan vara
  // stora. Mätt: vid 375 px har talet 56 px, vid 360 px har det 52.
  const grad = (text.length >= 5 ? 16 : text.length >= 4 ? 20 : 23) - (smal ? 2 : 0);
  const tal = (
    <>
      <div style={{ ...hdr(grad), whiteSpace: "nowrap" }}>{text}</div>
      {valbart && (
        <div style={{ ...label(C.lime), marginTop: 1, whiteSpace: "nowrap" }}>
          {enhet} ±{formatWeight(s)}
        </div>
      )}
    </>
  );

  // TALET KRYMPER, KNAPPARNA GÖR DET INTE.
  //
  // Talet hade minWidth 96, vilket gav varje stegare ett hårt golv på 212 px
  // (44 + 14 + 96 + 14 + 44). Två stegare bredvid varandra krävde då ~490 px
  // inklusive kort- och sidmarginal, och på en 375 px-telefon sköt reps-kortet
  // 107 px utanför skärmen — hela passvyn fick sidscroll. Felet fanns långt före
  // viktrastret och upptäcktes aldrig, eftersom layoutverifieringen bara mätte
  // HÖJD. Den mäter nu båda.
  //
  // Talet ligger kvar MELLAN knapparna i stället för ovanför dem: en variant med
  // talet på egen rad löste bredden men kostade 51 px på höjden, och passvyn
  // hade två pixlars marginal. Mätt, inte gissad.
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
      <button onClick={() => flytta(-1)} style={knapp} aria-label="Minska">−</button>
      {valbart ? (
        <button onClick={() => setI(x => (x + 1) % STEG_KG.length)}
          aria-label={`Vikt ${formatWeight(värde)} kilo. Steglängd ${formatWeight(s)} kilo — tryck för att ändra.`}
          style={{ flex: 1, minWidth: 0, textAlign: "center", background: "none",
            border: "none", padding: 0, cursor: "pointer", color: C.text, overflow: "hidden" }}>
          {tal}
        </button>
      ) : (
        <div style={{ flex: 1, minWidth: 0, textAlign: "center", overflow: "hidden" }}>{tal}</div>
      )}
      <button onClick={() => flytta(1)} style={knapp} aria-label="Öka">+</button>
    </div>
  );
}



export function WorkoutView({ live, setLive, sessions, setSessions, onDone, onAbort, avslutaDirekt = false, onLäggTillÖvning }) {
  // Hooks före villkorade returer (projektlag). Bredden avgör sifferstorleken i
  // stegarna: träffytorna är låsta vid 44 px, så det är talet som får ge vika
  // när skärmen är smal.
  const layout = useLayout();
  const it = live.items[live.idx];
  const [vikt, setVikt] = useState(it ? it.vikt : null);
  const [reps, setReps] = useState(it ? it.reps : 8);
  const [vila, setVila] = useState(0);
  // KLOCKSLAGET NÄR VILAN TAR SLUT, inte en nedräknare.
  //
  // setTimeout fryser när skärmen släcks eller man byter app — webbläsaren
  // pausar timers i bakgrunden. Timern stod alltså still i fickan: efter 90 s
  // visade den fortfarande 90 s kvar, och signalen kom aldrig.
  //
  // Med ett måltidsklockslag räknas återstoden ur Date.now() varje tick, och
  // stämmer oavsett hur länge appen varit borta. Samma princip som passtiden,
  // som räknas ur `startad` i stället för att tickas upp.
  const slutTid = useRef(0);
  const [byter, setByter] = useState(false);
  const [musik, setMusik] = useState(false);
  // Ljud och vibration på som standard, röst och notis av — samma DEFAULT_CUES
  // som 1.0. Röst kräver att man vill höra appen tala i ett gym, notiser kräver
  // ett tillstånd man inte ska behöva ge för att träna.
  const [signaler, setSignaler] = useState(DEFAULT_CUES);
  const [musikUrl, setMusikUrl] = useState("");

  // HYDRERAS I EN EFFEKT, inte som initialvärde i useState. load() är
  // ASYNKRON — som initialvärde blir tillståndet ett Promise i stället för
  // data, och fältet står tomt fast en länk är sparad. Samma fälla som
  // veckomenyns byten gick i.
  useEffect(() => {
    let lever = true;
    load("spotify", "").then(u => { if (lever && typeof u === "string") setMusikUrl(u); });
    load("cues", DEFAULT_CUES).then(c => {
      // Bara kända nycklar tas emot — en trasig eller gammal post ska inte
      // kunna slå av allt tyst.
      if (lever && c && typeof c === "object") setSignaler({ ...DEFAULT_CUES, ...c });
    });
    return () => { lever = false; };
  }, []);

  const växlaSignal = nyckel => setSignaler(s => {
    const ny = { ...s, [nyckel]: !s[nyckel] };
    save("cues", ny);
    // Ett ljud som slås PÅ ska höras direkt — annars vet man inte om det
    // fungerar förrän nästa vila, och då är det för sent att justera.
    if (ny[nyckel]) restDoneCue({ ...DEFAULT_CUES, sound: false, voice: false, vibrate: false, notify: false, [nyckel]: true });
    return ny;
  });

  const öppnaMusik = () => {
    const u = musikUrl.trim();
    save("spotify", u);
    // Utan länk öppnas Spotify-appen ändå: "spotify:" är appens egen
    // URI-schema. Bättre än att inte göra något alls när man tryckt.
    window.open(u || "spotify:", "_blank", "noopener");
  };
  const timer = useRef(null);
  // Röstinmatning: samma motor och samma grundregel som mobilen — rösten
  // FÖRESLÅR, den sparar aldrig själv. En felhörd åtta som blir åttio skulle
  // annars förgifta last, recovery och readiness.
  const [röst, setRöst] = useState(null); // null | {läge:"lyssnar"} | {läge:"förslag",...} | {läge:"fel", note}
  const stoppaRöst = useRef(null);
  const röstStöd = useMemo(() => voiceSupport(), []);
  useEffect(() => () => { if (stoppaRöst.current) stoppaRöst.current(); }, []);

  // Byt övning → hämta det nya förslaget.
  useEffect(() => {
    const n = live.items[live.idx];
    if (n) { setVikt(n.vikt); setReps(n.reps); }
  }, [live.idx]);

  // Nedräkning ur klockslaget. Rensas alltid vid avmontering — annars tickar
  // den vidare osynligt och startar om nästa gång vyn öppnas.
  useEffect(() => {
    if (vila <= 0) return;
    timer.current = setTimeout(() => {
      const kvar = Math.max(0, Math.round((slutTid.current - Date.now()) / 1000));
      setVila(kvar);
    }, 1000);
    return () => clearTimeout(timer.current);
  }, [vila]);

  // NÄR APPEN VAKNAR räknas återstoden om direkt, utan att vänta på nästa tick.
  // Utan detta visar vyn det frusna värdet i upp till en sekund efter att man
  // väckt skärmen — och har vilan tagit slut under tiden ska den sluta NU, inte
  // efter ett tick till.
  // ÅTERSTÄLL VID MONTERING. Passet kan ha legat stängt över vilan; då ska
  // återstoden räknas ur det sparade klockslaget, inte börja om på noll.
  useEffect(() => {
    if (!live.vilaSlut) return;
    slutTid.current = live.vilaSlut;
    setVila(Math.max(0, Math.round((live.vilaSlut - Date.now()) / 1000)));
  }, []);

  useEffect(() => {
    const vakna = () => {
      if (document.visibilityState !== "visible" || !slutTid.current) return;
      setVila(Math.max(0, Math.round((slutTid.current - Date.now()) / 1000)));
    };
    document.addEventListener("visibilitychange", vakna);
    window.addEventListener("focus", vakna);
    return () => {
      document.removeEventListener("visibilitychange", vakna);
      window.removeEventListener("focus", vakna);
    };
  }, []);

  /**
   * SIGNAL NÄR VILAN ÄR SLUT.
   *
   * Motorn engines/cues.js har funnits sedan 1.0 med tre kanaler — ljud, röst,
   * vibration, notis — och aldrig anropats från 2.0. Timern räknade ner i
   * tystnad, vilket är det sämsta läget: man tittar inte på telefonen mellan
   * set, så vilan blir antingen för kort eller för lång.
   *
   * TVÅ VAKTER, BÅDA NÖDVÄNDIGA:
   *
   * 1. vila går 0 -> 90 när ett set loggas. Utan förraVila.current hade
   *    övergången till 0 tolkats som "vilan är slut" redan innan den börjat.
   *
   * 2. "Hoppa över vilan" sätter också vila till 0 — men då har man aktivt
   *    avbrutit den, och signalen skulle säga "du tryckte på en knapp" i
   *    stället för "vilan är slut". Mätt i webbläsaren: utan avbröt.current
   *    ljöd den vid varje överhoppning.
   */
  const förraVila = useRef(0);
  const avbröt = useRef(false);
  useEffect(() => {
    if (förraVila.current > 0 && vila === 0 && !avbröt.current) restDoneCue(signaler);
    if (vila === 0) avbröt.current = false;
    förraVila.current = vila;
  }, [vila, signaler]);

  // Kontinuerlig persistens: varje ändring skrivs direkt.
  useEffect(() => { save("live", live); }, [live]);


  // TÅL ETT TOMT PASS. Vyn för noll övningar renderas längre ner — men de här
  // raderna körs vid VARJE render, alltså även innan dess. Utan skyddet kastar
  // it.loggade och hela vyn blir blank, vilket är precis det felet tomvyn
  // skulle lösa.
  const klara = it ? it.loggade.length : 0;
  const totaltSet = live.items.reduce((a, x) => a + x.set, 0);
  const klaraSet = live.items.reduce((a, x) => a + x.loggade.length, 0);
  const förra = it && klara > 0 ? it.loggade[klara - 1] : null;

  const saknarVikt = !!it && it.yttreVikt && !(vikt > 0);

  const lyssnaSet = () => {
    if (röst && röst.läge === "lyssnar") { if (stoppaRöst.current) stoppaRöst.current(); setRöst(null); return; }
    if (!röstStöd.ok) { setRöst({ läge: "fel", note: röstStöd.note }); return; }
    setRöst({ läge: "lyssnar" });
    stoppaRöst.current = createSetListener({
      onResult: t => {
        if (!t.ok) {
          setRöst({ läge: "fel", note: t.reason === "ett-tal"
            ? "Hörde bara ett tal — säg både vikt och reps, till exempel \"åttio åtta\"."
            : "Kunde inte tolka det som vikt och reps. Prova \"åttio kilo åtta reps\"." });
          return;
        }
        if (t.repeat) {
          const f = it.loggade.length ? it.loggade[it.loggade.length - 1] : null;
          if (f) setRöst({ läge: "förslag", vikt: f.vikt, reps: f.reps, källa: "samma som förra setet" });
          else setRöst({ läge: "fel", note: "Inget tidigare set att upprepa i den här övningen." });
          return;
        }
        setRöst({ läge: "förslag", vikt: t.weight, reps: t.reps, källa: `hörde ”${t.raw}”` });
      },
      onError: (kod, note) => setRöst({ läge: "fel", note }),
      onEnd: () => setRöst(r => (r && r.läge === "lyssnar" ? null : r)),
    });
  };

  const avslutaSet = () => {
    if (saknarVikt) return;
    const nya = live.items.map((x, i) => i === live.idx
      // ts på varje loggat set. Utan den går det inte att veta NÄR passet
      // faktiskt pågick, bara när det startades — och ett pass som startats och
      // glömts ser då ut att ha tagit flera dygn.
      ? { ...x, loggade: [...x.loggade, { vikt, reps, ts: Date.now() }] } : x);
    const sista = klara + 1 >= it.set;
    const nästaIdx = sista ? Math.min(live.idx + 1, live.items.length - 1) : live.idx;
    // Klockslaget läggs på LIVE-passet, som redan sparas vid varje ändring.
    // Utan det överlever vilan inte att appen stängs helt — bara att den läggs
    // i bakgrunden. Ett pass man återvänder till efter en minut ska visa rätt
    // återstod, inte börja om.
    const slut = Date.now() + it.vila * 1000;
    slutTid.current = slut;
    setLive({ ...live, items: nya, idx: nästaIdx, vilaSlut: slut });
    setVila(it.vila);
  };

  /**
   * AVSLUTA ÖVNINGEN, INTE HELA PASSET.
   *
   * "Avsluta i förtid" avslutade allt — hela passet, alla kvarvarande
   * övningar. Men skälet att hoppa över en övning är ofta lokalt: bänken är
   * upptagen, axeln säger ifrån på just den rörelsen, eller man hann helt
   * enkelt inte med alla set. Resten av passet ska köras.
   *
   * Loggade set sparas — övningen kastas inte, den bara markeras klar med det
   * den hann bli. Ett pass med tre av fem set på en övning är fortfarande ett
   * pass, inte ett misslyckande.
   *
   * Hoppar till NÄSTA OAVSLUTADE övning, inte bara idx+1. Ett program där
   * övning 3 redan avslutats (via ett tidigare hopp) ska inte visa den igen.
   */
  const avslutaÖvning = () => {
    const härIdx = live.idx;
    const nästa = live.items.findIndex((x, i) => i > härIdx && x.loggade.length < x.set);
    setLive({ ...live, idx: nästa >= 0 ? nästa : live.items.length - 1 });
  };

  // Sant när alla ÖVRIGA övningar redan är fullständigt loggade — då finns
  // ingen "nästa" att hoppa till, och knappen ska inte visas som ett alternativ
  // till "Avsluta passet".
  const finnsFlerÖvningar = live.items.some((x, i) => i !== live.idx && x.loggade.length < x.set);

  // Alternativ ur samma muskelgrupp. alternativesFor har funnits i motorn sedan
  // programbygget men aldrig anropats från 2.0 — logiken fanns, vägen dit inte.
  const alternativ = useMemo(
    () => (it ? alternativesFor(it.exId, null, 8) : []),
    [it && it.exId]
  );

  /**
   * Byter övning i det PÅGÅENDE passet.
   *
   * Set och reps följer med: den som skulle köra 3x8 sittande rodd ska köra
   * 3x8 hantelrodd, inte plötsligt något annat. Vikten nollställs däremot —
   * 70 kg i en maskin är inte 70 kg med hantlar, och att behålla talet vore
   * att föreslå en belastning appen inte har underlag för.
   *
   * Bytet gäller bara det här passet. Programmet är en mall man återkommer
   * till, och att ändra den för att maskinen var upptagen en gång vore fel.
   */
  const bytTill = ex => {
    setLive(l => ({
      ...l,
      items: l.items.map((x, i) => i !== l.idx ? x : {
        ...x, exId: ex.id, namn: ex.name,
        // Loggade set är tomma här — knappen visas bara innan första setet.
        loggade: [], senaste: null, förslag: null,
      }),
    }));
    setByter(false);
  };

  const avsluta = () => {
    const sets = [];
    live.items.forEach(x => x.loggade.forEach(l => sets.push({ exerciseId: x.exId, weight: l.vikt, reps: l.reps, ts: l.ts })));
    if (!sets.length) { onAbort(); return; }
    const session = buildSession({
      sets, source: "training", title: live.namn,
      programId: live.programId, workoutId: live.workoutId, completedAt: Date.now(),
    });
    setSessions(s => [...s, session]);
    save("live", null);
    onDone({ session, minuter: Math.max(1, passMin) });
  };

  // PASSTIDEN RÄKNAS TILL SISTA LOGGADE SET, INTE TILL NU.
  //
  // Ett pass som startats och lämnats utan att avslutas ligger kvar i
  // lagringen, och klockan fortsatte tidigare att räkna. Robert såg
  // "PASSTID 9746 min" — nästan sju dygn — och den siffran gick vidare till
  // kvittot när passet väl avslutades.
  //
  // Tiden till sista set är den enda ärliga uppgiften: det är då vi vet att han
  // fortfarande tränade. Att i stället räkna till "nu" antar att passet pågått
  // hela tiden det legat öppet, vilket är ett påstående appen inte kan belägga.
  const sistaSetTs = live.items.reduce((max, x) =>
    x.loggade.reduce((m, l) => (l.ts && l.ts > m ? l.ts : m), max), 0);
  const passMs = Math.max(0, (sistaSetTs || Date.now()) - live.startad);
  const passMin = Math.round(passMs / 60000);

  // Kom vi hit från "Spara det som loggades" avslutas passet direkt. Effekten
  // ligger efter alla hooks (projektlag) och kör bara en gång.
  const avslutat = useRef(false);
  useEffect(() => {
    if (avslutaDirekt && !avslutat.current) { avslutat.current = true; avsluta(); }
  }, [avslutaDirekt]);

  /**
   * TOMT PASS — övningar läggs till efterhand.
   *
   * Ett program och ett fritt pass kräver båda att man bestämmer allt i förväg.
   * På gymmet vet man ofta inte: man tar det som är ledigt och bestämmer nästa
   * övning när den förra är klar.
   *
   * `return null` gav BLANK SKÄRM för ett pass utan övningar — passet fanns i
   * storage men vyn ritade ingenting alls. Nu blir det en inbjudan i stället.
   */
  if (!it) return (
    <div style={{ padding: "4px 0 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <button onClick={onAbort} style={{ background: "none", border: "none", color: C.text, fontSize: 22, cursor: "pointer", padding: 6 }} aria-label="Tillbaka">‹</button>
        <div style={hdr(15)}>Pågående pass</div>
        <span style={{ width: 34 }} />
      </div>

      <div style={{ ...card, padding: 20, marginTop: 18, textAlign: "center" }}>
        <div style={{ ...hdr(16), marginBottom: 8 }}>Passet är igång</div>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
          Lägg till första övningen när du står vid den. Du kan fylla på
          efterhand — passet behöver ingen plan i förväg.
        </div>
        {onLäggTillÖvning && (
          <button onClick={onLäggTillÖvning} data-lagg-till-forsta="1"
            style={{ ...btnPrimary, marginTop: 18 }}>
            Lägg till övning
          </button>
        )}
      </div>

      {/* Avsluta finns även här: startar man ett tomt pass av misstag ska man
          inte behöva lägga till en övning för att komma ur det. */}
      <button onClick={onAbort} style={{ ...btnGhost, marginTop: 12 }}>
        Avsluta passet
      </button>
    </div>
  );

  const allaKlara = klaraSet >= totaltSet;

  return (
    <div style={{ padding: "14px 18px 72px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onAbort} style={{ background: "none", border: "none", color: C.text, fontSize: 22, cursor: "pointer", padding: 6 }} aria-label="Tillbaka">‹</button>
        <div style={hdr(15)}>Pågående pass</div>
        {/* MUSIKKNAPPEN SATT HÄR I 1.0 och följde aldrig med till 2.0.
            Platshållaren på 34 px fanns kvar — den balanserade tillbakapilen —
            så knappen tar ingen extra höjd. Det spelar roll: passvyn är den
            enda vy som måste rymmas utan scroll. */}
        <button onClick={() => setMusik(true)} data-musik="1" aria-label="Träningsmusik"
          style={{ background: "none", border: "none", color: C.text2, fontSize: 19,
            cursor: "pointer", padding: 6, width: 34 }}>♫</button>
      </div>

      {/* Setprogression: en stapel per set i hela passet */}
      <div style={{ display: "flex", gap: 3, marginTop: 12 }}>
        {live.items.map((x, i) => (
          <div key={i} style={{ flex: x.set, display: "flex", gap: 2 }}>
            {Array.from({ length: x.set }).map((_, j) => (
              <div key={j} style={{ flex: 1, height: 4, borderRadius: 2,
                background: j < x.loggade.length ? C.lime : (i === live.idx && j === klara ? C.text2 : C.track) }} />
            ))}
          </div>
        ))}
      </div>

      <div style={{ ...card, marginTop: 8, display: "flex", padding: "13px 4px" }}>
        {[["Passtid", passtid(passMin).tal, passtid(passMin).enhet],
          ["Set klara", `${klaraSet}`, `av ${totaltSet}`],
          ["Övning", `${live.idx + 1}`, `av ${live.items.length}`]].map(([l, v, e], i) => (
          <div key={l} style={{ flex: 1, textAlign: "center", borderLeft: i ? `1px solid ${C.border}` : "none" }}>
            <div style={label()}>{l}</div>
            <div style={{ ...hdr(20), marginTop: 3 }}>{v}</div>
            <div style={{ fontSize: 10.5, color: C.muted }}>{e}</div>
          </div>
        ))}
      </div>

      {/* MARGINALERNA BANTADES för att rymma bytesknappen utan scroll.
          22 -> 12 här, 14 -> 8 på statkortet ovan. Luft är billigare än scroll
          i den enda vy man använder med en skivstång i händerna — layoutvakten
          mäter iPhone SE (568 px), och där räknas varje pixel. */}
      <div style={{ textAlign: "center", marginTop: 12 }}>
        <div style={hdr(29)}>{it.namn}</div>
        {/* KNAPPEN DELAR RAD MED SETRÄKNAREN.
            En egen rad kostade 56 px och layoutvakten mätte scroll på SE
            (568 px). Passvyn är den enda vy som MÅSTE rymmas utan scroll — man
            håller i en skivstång och kan inte leta. Setraden har redan sin
            höjd, så knappen blir gratis där. */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: C.muted }}>
            Set {Math.min(klara + 1, it.set)} av {it.set}
            {it.repMin && it.repMax ? ` · ${it.repMin}–${it.repMax} reps` : ""}
          </span>
          {!klara && (
            <button onClick={() => setByter(b => !b)} data-byt-ovning="1"
              aria-expanded={byter}
              style={{
                background: "none", border: `1px solid ${C.border}`, borderRadius: 999,
                color: C.muted, fontSize: 11, padding: "4px 10px", cursor: "pointer", minHeight: 32,
              }}>Byt</button>
          )}
          {/* AVSLUTA ÖVNINGEN, INTE PASSET.
              Samma rad som "Byt", av samma skäl: en egen rad kostade 59 px och
              gav scroll på iPhone SE — layoutvakten mätte det. Passvyn är den
              enda vy som måste rymmas utan scroll. Bara synlig när det finns en
              oavslutad övning kvar; annars är den samma val som "Avsluta i
              förtid" fast med ett annat namn. */}
          {!klara && !allaKlara && finnsFlerÖvningar && (
            <button onClick={avslutaÖvning} data-avsluta-ovning="1"
              style={{
                background: "none", border: `1px solid ${C.border}`, borderRadius: 999,
                color: C.muted, fontSize: 11, padding: "4px 10px", cursor: "pointer", minHeight: 32,
              }}>Nästa övning</button>
          )}
          {/* LÄGG TILL FLER UNDER PASSETS GÅNG — i setraden, inte på egen rad.
              Layoutvakten mätte +59 px scroll på iPhone SE med en fristående
              knapp, exakt som för "Nästa övning" tidigare. Passvyn är den enda
              vy som måste rymmas utan scroll. */}
          {onLäggTillÖvning && (
            <button onClick={onLäggTillÖvning} data-lagg-till-ovning="1"
              aria-label="Lägg till övning i passet"
              style={{
                background: "none", border: `1px solid ${C.border}`, borderRadius: 999,
                color: C.muted, fontSize: 11, padding: "4px 10px", cursor: "pointer", minHeight: 32,
              }}>+</button>
          )}
        </div>
        {it.förslag && <div style={{ fontSize: 12, color: C.lime, marginTop: 5 }}>{it.förslag}</div>}

        {/* BYT ÖVNING. Maskinen är upptagen, eller axeln gör ont på just den
            rörelsen. Utan ett byte är valet att hoppa över övningen helt —
            och ett överhoppat pass är sämre än ett justerat.

            Knappen göms när set redan loggats: byter man då försvinner det
            man gjort, eller så blandas två övningars set i samma post. Att
            avsluta övningen och lägga till en ny är rätt väg där. */}
      </div>

      {/* TRÄNINGSMUSIK. Ingen OAuth, ingen integration — en sparad länk och
          window.open. Spotify-appen tar över om den är installerad, annars
          webbspelaren. Samma lösning som i 1.0, och den räcker: det enda man
          vill göra mitt i ett pass är att starta musiken.

          EGEN NYCKEL FÖR 2.0 (atlas.v3.spotify via store). 1.0 hade separata
          nycklar för desktop och mobil eftersom olika spellistor per kontext
          kan vara önskvärt — samma skäl gäller här. */}
      {musik && (
        <div style={{ ...card, padding: 16, marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ ...label(), color: C.muted }}>Träningsmusik</div>
            <button onClick={() => setMusik(false)} style={btnText} aria-label="Stäng">Stäng</button>
          </div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 8, lineHeight: 1.55 }}>
            Klistra in en Spotify-länk till din spellista, så öppnar knappen den
            direkt i appen.
          </div>
          <input value={musikUrl} onChange={e => setMusikUrl(e.target.value)}
            placeholder="https://open.spotify.com/playlist/…"
            aria-label="Spotify-länk" inputMode="url"
            style={{
              width: "100%", marginTop: 11, padding: "12px 14px", borderRadius: 12, minHeight: 44,
              border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 13,
            }} />
          <button onClick={öppnaMusik} data-oppna-musik="1"
            style={{ ...btnPrimary, marginTop: 11 }}>
            ♫ Öppna i Spotify
          </button>

          {/* SIGNALERNA HÖR HEMMA HÄR. Panelen handlar redan om ljud under
              passet, och en egen inställningsvy för fyra växlar hade varit ett
              steg för mycket — man justerar dem i gymmet, inte i förväg. */}
          <div style={{ ...label(), color: C.muted, margin: "18px 0 8px" }}>
            När vilan är slut
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {[["sound", "Ljud"], ["vibrate", "Vibration"], ["voice", "Röst"], ["notify", "Notis"]].map(([nyckel, namn]) => (
              <button key={nyckel} onClick={() => växlaSignal(nyckel)}
                data-signal={nyckel} aria-pressed={!!signaler[nyckel]}
                style={{
                  padding: "8px 13px", minHeight: 40, borderRadius: 999, cursor: "pointer", fontSize: 12.5,
                  border: `1px solid ${signaler[nyckel] ? C.lime : C.border}`,
                  color: signaler[nyckel] ? C.lime : C.muted,
                  background: signaler[nyckel] ? volt(.08) : C.card2,
                }}>{namn}</button>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
            Notiser når fram även när appen ligger i bakgrunden, men kräver
            tillstånd av telefonen.
          </div>
        </div>
      )}

      {byter && (
        <div style={{ ...card, padding: 14, marginTop: 4 }}>
          <div style={{ ...label(), color: C.muted, marginBottom: 8 }}>
            Samma muskelgrupp
          </div>
          {alternativ.length === 0 ? (
            <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55 }}>
              Inga alternativ för den här övningen i banken.
            </div>
          ) : alternativ.map(a => (
            <button key={a.id} onClick={() => bytTill(a)} data-alternativ="1"
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                width: "100%", textAlign: "left", padding: "11px 13px", marginBottom: 7,
                borderRadius: 12, minHeight: 44, cursor: "pointer",
                border: `1px solid ${C.border}`, background: C.card2, color: C.text,
              }}>
              <span style={{ fontSize: 13, minWidth: 0 }}>{a.name}</span>
              <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{a.equipment}</span>
            </button>
          ))}
        </div>
      )}

      {vila > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 20 }}>
          <Ring kvar={vila} av={it.vila} />
          <button onClick={() => {
            avbröt.current = true; slutTid.current = 0;
            setLive(l => ({ ...l, vilaSlut: 0 }));
            setVila(0);
          }}
            style={{ ...btnGhost, marginTop: 16, maxWidth: 220 }}>Hoppa över vilan</button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: layout.staplaStegare ? "column" : "row", gap: 12, marginTop: 22 }}>
            <div style={{ ...card, flex: 1, minWidth: 0, padding: "14px 3px" }}>
              <div style={{ ...label(), textAlign: "center", marginBottom: 8 }}>Vikt</div>
              <Steg värde={vikt} sätt={setVikt} steg={2.5} enhet="kg" valbart smal={layout.smalSkärm} />
            </div>
            <div style={{ ...card, flex: 1, minWidth: 0, padding: "14px 3px" }}>
              <div style={{ ...label(), textAlign: "center", marginBottom: 8 }}>Reps</div>
              <Steg värde={reps} sätt={setReps} steg={1} enhet="reps" min={1} smal={layout.smalSkärm} />
            </div>
          </div>

          {förra && (
            <div style={{ textAlign: "center", fontSize: 12, color: C.muted, marginTop: 10 }}>
              Förra setet: {formatWeight(förra.vikt)} kg × {förra.reps}
            </div>
          )}

          {/* Rösten fyller bara stegarna — "Avsluta set" är fortfarande enda
              vägen in i loggen. */}
          <button onClick={lyssnaSet} style={{
            ...btnGhost, marginTop: 12,
            borderColor: röst && röst.läge === "lyssnar" ? C.lime : C.border,
            color: röst && röst.läge === "lyssnar" ? C.lime : C.text2,
          }}>
            {röst && röst.läge === "lyssnar" ? "◼ Lyssnar — tryck för att avbryta" : "🎤 Säg set — ”åttio åtta”"}
          </button>

          {röst && röst.läge === "fel" && (
            <div style={{ textAlign: "center", fontSize: 12, color: C.recovering, lineHeight: 1.55, marginTop: 9 }}>{röst.note}</div>
          )}

          {röst && röst.läge === "förslag" && (
            <div style={{ ...card, marginTop: 11, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: HFONT, fontWeight: 800, fontSize: 17 }}>
                  {röst.vikt > 0 ? `${formatWeight(röst.vikt)} kg` : "kroppsvikt"} × {röst.reps}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{röst.källa}</div>
              </div>
              <button onClick={() => { setVikt(röst.vikt); setReps(röst.reps); setRöst(null); }} style={{
                padding: "10px 16px", borderRadius: 999, border: "none", cursor: "pointer", minHeight: 44,
                background: C.lime, color: "#0A0A0A", fontFamily: HFONT, fontSize: 12.5, fontWeight: 700,
              }}>Använd</button>
              <button onClick={() => setRöst(null)} style={{
                padding: "10px 13px", borderRadius: 999, border: `1px solid ${C.border}`, cursor: "pointer", minHeight: 44,
                background: "transparent", color: C.muted, fontSize: 12.5,
              }}>Nej</button>
            </div>
          )}

          <button onClick={avslutaSet} disabled={saknarVikt}
            style={{ ...btnPrimary, marginTop: 18, opacity: saknarVikt ? 0.4 : 1, cursor: saknarVikt ? "not-allowed" : "pointer" }}>
            Avsluta set <span style={{ fontSize: 19 }}>✓</span>
          </button>
          {saknarVikt && (
            <div style={{ textAlign: "center", fontSize: 12, color: C.recovering, marginTop: 9 }}>
              Ange vikten först — annars kan passet inte räknas in i belastningen.
            </div>
          )}
        </>
      )}

      <button onClick={avsluta} style={{ ...btnGhost, marginTop: 10, borderColor: allaKlara ? C.lime : C.border, color: allaKlara ? C.lime : C.text }}>
        {allaKlara ? "Avsluta passet" : "Avsluta i förtid"}
      </button>
      {!allaKlara && klaraSet > 0 && (
        <div style={{ textAlign: "center", fontSize: 11.5, color: C.muted, marginTop: 8 }}>
          {klaraSet} loggade set sparas — inget kastas.
        </div>
      )}
    </div>
  );
}

/**
 * Efter passet: kvitto på vad som faktiskt loggades — plus sammanfattningen och
 * EN fråga, om passet gav anledning till en.
 *
 * Sammanfattningen kommer ur samma motor som nuvarande appen (buildPostSession):
 * deterministisk, lokalt räknad, tre–fyra meningar. Ingen LLM möter en efter
 * sista setet.
 *
 * Frågan följer husregeln: appen FRÅGAR, användaren svarar, ingenting antas.
 * Den ställs bara när passet faktiskt avvek från förra gången, den går alltid
 * att hoppa över, och svaret sparas på passet (attachReason) så att
 * reasonSignal kan dra en slutsats när det finns ett mönster — inte efter ett
 * enstaka svar.
 */
export function DoneView({ resultat, sessions = [], onReason, onHome }) {
  const { session, minuter } = resultat;
  // Passet självt jämförs mot HISTORIKEN, inte mot sig självt. Motorn lägger
  // tillbaka det där volymen räknas (medPasset), så filtret här är rätt.
  const post = useMemo(
    () => buildPostSession({
      session,
      sessions: (sessions || []).filter(x => x && x.id !== session.id),
      exercises: EXERCISES,
      now: Date.now(),
    }),
    [session.id]
  );
  const [svarat, setSvarat] = useState(null);
  const svara = code => {
    setSvarat(code);
    if (code !== "skip" && onReason) onReason(attachReason(session, code, post.question));
  };

  const sets = session.sets || [];
  const volym = sets.reduce((a, s) => a + (s.weight || 0) * (s.reps || 0), 0);
  const perÖvning = {};
  sets.forEach(s => {
    const o = perÖvning[s.exerciseId] || (perÖvning[s.exerciseId] = { set: 0, max: 0 });
    o.set++; if (s.weight > o.max) o.max = s.weight;
  });

  return (
    <div style={{ padding: "16px 18px 72px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <svg width="42" height="42" viewBox="0 0 76 76" style={{ display: "block", flexShrink: 0 }} aria-hidden>
          <circle cx="38" cy="38" r="34" fill="none" stroke={C.lime} strokeWidth="3" />
          <path d="M23 39 l10 10 l20 -22" fill="none" stroke={C.lime} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={{ minWidth: 0 }}>
          <div style={hdr(20)}>Passet är loggat</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>{session.title}</div>
        </div>
      </div>

      <div style={{ ...card, marginTop: 16, display: "flex", padding: "12px 4px" }}>
        {/* Ett sportpass har inga sets. Att visa "0 set · 0 kg" vore att svara
            på en fråga som inte ställdes — kortet byter innehåll i stället. */}
        {/* Angavs en distans är DEN det man minns av passet — den byter plats
            med muskelräkningen i stället för att lägga till en fjärde cell:
            fyra celler blir för trånga på en iPhone SE. Tempot står som enhet
            när det går att räkna, och påstås inte annars. */}
        {(session.sport
          ? [["Tid", minuter, "min"],
             ["Kondition", Math.round(session.cardioLoad || 0), "last"],
             session.distanceKm
               ? ["Distans", String(session.distanceKm).replace(".", ","),
                  tempoPerKm(session.distanceKm, minuter) ? `km · ${tempoPerKm(session.distanceKm, minuter)}/km` : "km"]
               : ["Muskler", Object.keys(session.muscleLoads || {}).length, "belastade"]]
          : [["Tid", minuter, "min"], ["Set", sets.length, "totalt"], ["Volym", formatVolume(volym), "kg"]]
        ).map(([l, v, e], i) => (
          <div key={l} style={{ flex: 1, textAlign: "center", borderLeft: i ? `1px solid ${C.border}` : "none" }}>
            <div style={label()}>{l}</div>
            <div style={{ ...hdr(23), marginTop: 3 }}>{v}</div>
            <div style={{ fontSize: 10.5, color: C.muted }}>{e}</div>
          </div>
        ))}
      </div>

      {post.lines.length > 0 && (
        <>
          <div style={{ ...label(), marginTop: 18, marginBottom: 4 }}>Sammanfattning</div>
          {post.lines.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 0" }}>
              <span style={{ marginTop: 7, width: 6, height: 6, borderRadius: 3, flexShrink: 0,
                background: l.tone === "warn" ? C.critical : l.tone === "good" ? C.ready : l.tone === "low" ? C.muted : C.lime }} />
              <span style={{ fontSize: 13.5, color: C.text2, lineHeight: 1.55 }}>{l.text}</span>
            </div>
          ))}
        </>
      )}

      {post.question && (
        <div style={{ ...card, marginTop: 18 }}>
          {svarat ? (
            <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.55 }}>
              {svarat === "skip"
                ? "Inget svar sparat."
                : "Tack — svaret vägs in när det finns fler av samma slag."}
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.55 }}>{post.question.prompt}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                {post.question.options.map(o => (
                  <button key={o.code} onClick={() => svara(o.code)} style={{
                    padding: "11px 12px", borderRadius: 12, minHeight: 44, cursor: "pointer",
                    border: `1px solid ${C.border}`, background: C.card2, color: C.text,
                    fontFamily: BFONT, fontSize: 13, textAlign: "left", lineHeight: 1.3,
                  }}>{o.label}</button>
                ))}
              </div>
              <button onClick={() => svara("skip")} style={{ ...btnText, marginTop: 6 }}>Hoppa över</button>
            </>
          )}
        </div>
      )}

      <div style={{ ...label(), marginTop: 18, marginBottom: 6 }}>Övningar</div>
      {Object.entries(perÖvning).map(([id, o]) => (
        <div key={id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 2px", borderBottom: `1px solid ${C.border}`, fontSize: 13.5 }}>
          <span>{(EXERCISES.find(e => e.id === id) || {}).name || id}</span>
          <span style={{ color: C.muted }}>{o.set} set · {formatWeight(o.max)} kg</span>
        </div>
      ))}

      {/* Sportpasset har ingen övningslista — visa vad det faktiskt belastade,
          samma siffror som förhandsvisningen lovade innan det sparades. */}
      {session.sport && Object.entries(session.muscleLoads || {})
        .sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([id, v]) => (
          <div key={id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 2px", borderBottom: `1px solid ${C.border}`, fontSize: 13.5 }}>
            <span>{(MUSCLES[id] && MUSCLES[id].name) || id}</span>
            <span style={{ color: C.muted }}>{Math.round(v)} last</span>
          </div>
        ))}

      <button onClick={onHome} style={{ ...btnPrimary, marginTop: 20 }}>Tillbaka till hem <span style={{ fontSize: 19 }}>→</span></button>
    </div>
  );
}
