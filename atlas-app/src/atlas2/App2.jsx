// Askr 2.0 — nytt gränssnitt, samma sanning.
//
// Bygger på engines/ och data/ precis som nuvarande appen. Det som är nytt är
// allt du SER; ingenting av det appen VET har skrivits om. Det är en medveten
// gräns: motorerna bär 550 tester och flera års domänbeslut, utseendet bär noll.

import { useState, useEffect, useMemo, useRef } from "react";
import { C, HFONT, BFONT, hdr, label, btnPrimary, btnGhost, btnText, statRow, statCell, statusColor, orDash, DASH } from "./design.js";
import { load, save, bodyState, todaysMessage, weekSessions, lastSessionLabel, legacyAvailable, nextWorkout, identitet, migrera, stämplaLista, stämplaPost, identitetSync } from "./store.js";
import { AskrWordmark, AskrLogo, FeatureIcon } from "../components/brand.jsx";
import { BodyMap2 } from "./BodyMap2.jsx";
import { BottomNav } from "./Nav.jsx";
import { CoachView } from "./CoachView.jsx";
import { coachFacts } from "./facts.js";
import { ProgressView } from "./ProgressView.jsx";
import { WorkoutView, DoneView, buildLive } from "./WorkoutView.jsx";
import { ProgramSheet } from "./ProgramSheet.jsx";
import { FoodView } from "./FoodView.jsx";
import { ImportSheet } from "./ImportSheet.jsx";
import { MuscleSheet } from "./MuscleSheet.jsx";
import { GoalSheet } from "./GoalSheet.jsx";
import { NutritionSheet } from "./NutritionSheet.jsx";
import { Shell } from "./Shell.jsx";
import { ReadinessSheet } from "./ReadinessSheet.jsx";
import { nutritionRecoveryModifier, logReliability } from "../engines/index.js";
import { buildNudges, activeNudges, pruneDismissed } from "../engines/nudges.js";
import { SessionSheet } from "./SessionSheet.jsx";
import { replaceSession, removeSession } from "../engines/session.js";
import { backAction } from "./backnav.js";
import { useLayout, UTAN_NAV, MOBIL_MAX, PANEL_BREDD, INNEHÅLL_MAX, FULL_HÖJD } from "./layout.js";
import { nextWorkout as nästaPass } from "../engines/programs.js";
import { DEMO_SESSIONS, DEMO_PROGRAMS, DEMO_PROGRAM } from "../data/demo.js";

/* ══════════ STARTSIDA ══════════ */

function Start({ onNext }) {
  const [sex, setSex] = useState(null);
  const [bildOk, setBildOk] = useState({ m: true, f: true });
  const bild = k => new URL(`startsida-${k === "m" ? "man" : "kvinna"}.webp`, document.baseURI).href;
  const visa = k => sex === null || sex === k;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "center" }}><AskrLogo höjd={104} /></div>

      <div style={{ position: "relative", height: 330, marginTop: 10, display: "flex", justifyContent: "center", overflow: "hidden" }}>
        {["m", "f"].map(k => (bildOk[k] && visa(k)) ? (
          <img key={k} src={bild(k)} alt="" onError={() => setBildOk(b => ({ ...b, [k]: false }))}
            style={{
              width: sex ? "78%" : "50%", height: "100%", objectFit: "cover",
              // RYGG MOT RYGG. Båda originalbilderna är vända åt vänster, så
              // kvinnan speglas för att vändas utåt åt höger. Då möts ryggarna
              // i mitten i stället för att figurerna tittar mot varandra.
              transform: k === "f" ? "scaleX(-1)" : "none",
              // Bilderna är beskurna till figuren, så högerkanten ÄR ryggen.
              // Den läggs mot mitten; för kvinnan hamnar den till vänster i
              // och med speglingen, vilket är samma sömn.
              objectPosition: "right top",
              transition: "width .35s ease", filter: "contrast(1.12) brightness(0.9)",
            }} />
        ) : null)}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,#0A0A0A 0%,transparent 18%,transparent 82%,#0A0A0A 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,10,10,.45) 0%,transparent 22%,transparent 55%,rgba(10,10,10,.85) 88%,#0A0A0A 100%)" }} />
        <div style={{ position: "absolute", bottom: 20, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 14 }}>
          {[["m", "Man"], ["f", "Kvinna"]].map(([k, l]) => (
            <button key={k} onClick={() => setSex(sex === k ? null : k)} style={{
              minWidth: 132, padding: "13px 8px", borderRadius: 999, cursor: "pointer",
              fontFamily: HFONT, fontSize: 14.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.6,
              border: `1.5px solid ${sex === k ? C.lime : "rgba(255,255,255,.75)"}`,
              background: "rgba(10,10,10,.35)", color: sex === k ? C.lime : C.text,
            }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ textAlign: "center", fontSize: 12.5, color: C.muted, marginTop: 12 }}>Styr kroppskartan och beräkningarna i appen.</div>

      <div style={{ padding: "26px 20px 0" }}>
        <div style={hdr(40)}>Träna.</div>
        <div style={hdr(40, C.lime)}>Utvecklas.</div>
        <div style={hdr(40)}>Överträffa dig själv.</div>
        <div style={{ width: 62, height: 4, background: C.lime, margin: "20px 0 18px", borderRadius: 2 }} />
        <div style={{ fontSize: 15, color: C.text2, lineHeight: 1.75, maxWidth: 330 }}>
          Se vilka muskler som är återhämtade, vad de tål idag, och när nästa pass
          gör nytta. Byggt på vad du faktiskt loggar — inte på gissningar.
        </div>
      </div>

      <div style={{ display: "flex", margin: "30px 16px 0" }}>
        {[["body", "Muskelkarta", "Se återhämtning per muskelgrupp, inte bara en totalsiffra."],
          ["bars", "Veckovolym", "Vet när en muskel fått tillräckligt — och när det blir för mycket."],
          ["shield", "Ärliga siffror", "Saknas underlag säger appen det, i stället för att gissa."]].map(([ic, t, b], i) => (
          <div key={t} style={{ flex: 1, padding: "0 11px", borderLeft: i ? `1px solid ${C.border}` : "none", textAlign: "center" }}>
            <div style={{ height: 54, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FeatureIcon name={ic} size={ic === "body" ? 30 : 38} accent={C.lime} />
            </div>
            <div style={{ ...hdr(13), letterSpacing: .9, margin: "9px 0 7px" }}>{t}</div>
            <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.65 }}>{b}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "30px 20px 26px", marginTop: "auto" }}>
        <button onClick={() => onNext(sex)} style={btnPrimary}>Kom igång <span style={{ fontSize: 20 }}>→</span></button>
      </div>
    </div>
  );
}

/* ══════════ LÄGESVAL ══════════ */
// Får aldrig designas bort. Demo och verklig historik hålls åtskilda, och valet
// ska göras medvetet — inte glidas förbi.

function ModeChoice({ onPick }) {
  const legacy = legacyAvailable();
  return (
    <div style={{ padding: "44px 20px", minHeight: "100vh", background: C.bg }}>
      <div style={hdr(26)}>Hur vill du börja?</div>
      <div style={{ fontSize: 13.5, color: C.muted, margin: "10px 0 26px", lineHeight: 1.6 }}>
        Valet går att ändra senare, men lägena hålls helt åtskilda — exempeldata
        kan aldrig blandas in i din egen historik.
      </div>

      {[["real", "Riktig profil", "Appen startar tom och bygger allt på det du själv loggar."],
        ["demo", "Demo", "Fylld med exempeldata så du kan se hur appen fungerar. Inget av det är dina siffror."]].map(([m, t, b]) => (
        <button key={m} onClick={() => onPick(m)} style={{
          width: "100%", textAlign: "left", padding: 17, marginBottom: 11, borderRadius: 16,
          border: `1px solid ${C.border}`, background: C.card, color: C.text, cursor: "pointer",
        }}>
          <div style={{ ...hdr(15), color: C.lime }}>{t}</div>
          <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55, marginTop: 5 }}>{b}</div>
        </button>
      ))}

      {legacy && (
        <div style={{ marginTop: 20, padding: 15, borderRadius: 14, border: `1px dashed ${C.border}` }}>
          <div style={{ fontSize: 13, color: C.text, marginBottom: 5 }}>Data hittad från tidigare version</div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.55 }}>
            {legacy.sessions} loggade pass ligger kvar i den gamla appen. Askr
            rör dem inte — överföringen byggs som ett eget, bekräftat steg.
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════ HEM ══════════ */

function Home({ sessions, activeProgram, onStart, onOpen, layout, nutRec, nudge, onAvfärda, onNudgeCta }) {
  const now = Date.now();
  const { states } = useMemo(() => bodyState(sessions, now), [sessions.length]);
  // Readiness-siffran hämtas ur §13 (samma källa som coachen och progress-vyn),
  // så hela appen visar EN readiness — lastviktad, inte ett platt snitt.
  // EN readiness i hela appen, och nu med kosten inräknad. `nutRec` kommer
  // uppifrån så att hem, coach och framsteg matas med exakt samma ingredienser
  // — räknades den lokalt skulle vyerna kunna glida isär.
  const kropp = useMemo(
    () => coachFacts({ sessions, activeProgram, nutRec }, now).kropp,
    [sessions.length, nutRec]
  );
  const rd = kropp.readiness;
  const besked = todaysMessage(states, sessions.length);
  const nw = activeProgram ? nextWorkout(activeProgram, sessions) : null;
  const vecka = weekSessions(sessions, now).length;
  const senast = lastSessionLabel(sessions, now);
  const osäkert = rd != null && sessions.length < 3;

  const datum = new Date(now).toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" });

  const mobil = layout.mobil;

  // Nyckeltalen och beskedet är samma innehåll i båda lägena — bara möblerat
  // olika. De ligger som funktioner för att slippa två kopior av samma JSX;
  // två kopior är hur en vy börjar glida isär.
  // EN plats, det mest angelägna vinner. En påminnelse som hänger på en
  // händelse just nu är mer relevant än dagens allmänna besked — och att lägga
  // den som ett EXTRA kort hade brutit hemskärmens scrollfrihet, som ligger på
  // marginalen redan. Samma slot, inget tillägg i höjd.
  const Besked = () => (nudge ? (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10, flexShrink: 0,
      margin: mobil ? "8px 0 0" : "0 0 18px", padding: "11px 13px",
      borderRadius: 14, border: `1px solid ${C.recovering}`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.5, textAlign: "left" }}>{nudge.text}</div>
        {nudge.cta && onNudgeCta && (
          <button onClick={onNudgeCta} style={{
            marginTop: 8, padding: "8px 13px", borderRadius: 999, minHeight: 44, cursor: "pointer",
            border: `1px solid ${C.lime}`, background: "transparent", color: C.lime, fontSize: 12.5,
          }}>{nudge.cta}</button>
        )}
      </div>
      <button onClick={() => onAvfärda(nudge.id)} aria-label="Avfärda påminnelsen" style={{
        background: "none", border: "none", color: C.muted, fontSize: 19, cursor: "pointer",
        padding: "0 2px", minHeight: 44, flexShrink: 0,
      }}>×</button>
    </div>
  ) : (
    <div style={{ textAlign: "center", fontSize: besked.empty ? 15.5 : 17.5, fontWeight: 600, lineHeight: 1.4, margin: mobil ? "8px 4px 0" : "0 0 18px", color: C.text, flexShrink: 0 }}>
      {besked.text}
    </div>
  ));

  const Nyckeltal = () => (
    <div style={{ ...statRow, marginTop: mobil ? 12 : 20, flexShrink: 0 }}>
      {[["Readiness", orDash(rd), osäkert ? "osäkert underlag" : null,
          rd == null ? C.muted : rd >= 76 ? C.ready : rd >= 56 ? C.recovering : C.critical, true],
        ["Veckans pass", sessions.length ? vecka : DASH, null, C.text, false],
        ["Senast", senast || DASH, null, C.text, false]].map(([l, v, sub, col, tryckbar], i) => {
        const innehåll = (
          <>
            <div style={label()}>{l}</div>
            <div style={{ ...hdr(mobil ? 19 : 21, col), marginTop: 3 }}>{v}</div>
            {sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>}
          </>
        );
        const stil = { ...statCell(i), padding: mobil ? "10px 4px" : "14px 4px" };
        // Readiness är det enda talet som går att fråga varför. De andra två är
        // räknade fakta utan uppdelning — en knapp där hade lovat något som
        // inte finns.
        return tryckbar ? (
          <button key={l} onClick={() => onOpen("readiness")} aria-label="Varför den här readiness-siffran?"
            style={{ ...stil, background: "none", cursor: "pointer", minHeight: 44, color: C.text }}>
            {innehåll}
            <div style={{ ...label(C.lime), marginTop: 3, fontSize: 8 }}>Varför?</div>
          </button>
        ) : <div key={l} style={stil}>{innehåll}</div>;
      })}
    </div>
  );

  const Start = () => (
    <>
      <button onClick={activeProgram ? onStart : () => onOpen("program")} style={{ ...btnPrimary, marginTop: mobil ? 10 : 0, flexShrink: 0 }}>
        {!activeProgram ? "Välj program" : besked.empty ? "Starta första passet" : "Starta pass"}
        <span style={{ fontSize: 20 }}>→</span>
      </button>
      <div style={{ textAlign: "center", fontSize: 12, color: C.muted, marginTop: 7, flexShrink: 0 }}>
        {nw ? `Föreslaget: ${nw.workout.name}` : activeProgram ? "Inga pass kvar i veckan." : "Inget program valt än."}
      </div>
    </>
  );

  // ── MOBIL: en skärm, ingen scroll ────────────────────────────────────────
  // Höjden låses till skärmen minus bottennaven, och kartan är `flex: 1`.
  // Webbläsaren räknar då ut kartans höjd åt oss vid varje skärmstorlek —
  // säkrare än en pixelbudget som blir fel på nästa telefon.
  if (mobil) return (
    <div style={{
      padding: "12px 18px 8px", boxSizing: "border-box",
      height: UTAN_NAV,
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ minWidth: 0 }}>
          <AskrWordmark höjd={26} />
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2, textTransform: "capitalize" }}>{datum}</div>
        </div>
        <button aria-label="Meny" onClick={() => onOpen("import")} style={{ background: "none", border: "none", padding: 10, cursor: "pointer", flexShrink: 0 }}>
          {[0, 1, 2].map(i => <div key={i} style={{ width: 21, height: 2, background: C.text, marginBottom: i < 2 ? 5 : 0 }} />)}
        </button>
      </div>

      {/* Ingen bakgrund, ingen ljuskägla, ingen platta. Kroppen står mot
          svärtan och det enda som lyser är muskler med faktiskt underlag. */}
      <BodyMap2 muscleStates={states} onSelect={id => onOpen("muskel:" + id)}
        fyll kompakt={layout.kompaktNyckel} />

      <Besked />
      <Start />
      <Nyckeltal />
    </div>
  );

  // ── DESKTOP: kartan får ytan, besluten står bredvid ───────────────────────
  return (
    <div style={{ padding: "8px 0 40px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.05fr) minmax(0,.95fr)", gap: 48, alignItems: "center", minHeight: "72vh" }}>
        <div style={{ display: "flex", flexDirection: "column", height: "76vh", minHeight: 460 }}>
          <BodyMap2 muscleStates={states} onSelect={id => onOpen("muskel:" + id)} fyll />
        </div>
        <div>
          <div style={{ ...label(C.lime), marginBottom: 10 }}>Idag</div>
          <div style={{ ...hdr(30), marginBottom: 16, textTransform: "capitalize" }}>{datum}</div>
          <Besked />
          <Start />
          <Nyckeltal />
        </div>
      </div>
    </div>
  );
}

/* ══════════ APP ══════════ */

export function Atlas2() {
  // ── LAGRING: async hydrering ──────────────────────────────────────────────
  // store.load/save är asynkrona (förberedelse för enhetssynk). Tillståndet kan
  // därför inte längre initieras synkront ur load() — det hydreras EN gång efter
  // montering. Alla hooks MÅSTE ligga före de villkorade returerna nedan (React
  // räknar hooks per render; en useState efter en return ger error #310).
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState("start");
  const [sex, setSex] = useState(null);
  const [mode, setMode] = useState(null);
  const [profile, setProfile] = useState({});
  const [sessions, setSessions] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [activeProgramId, setActiveProgramId] = useState(null);
  const [weights, setWeights] = useState([]);
  const [live, setLive] = useState(null);   // pågående pass; persisteras av WorkoutView
  const [foodLog, setFoodLog] = useState([]);
  const [mål, setMål] = useState(null);
  const [nutritionTargets, setNutritionTargets] = useState(null);
  // Rena UI-tillstånd (lagras inte).
  const [sheet, setSheet] = useState(null);
  const [flik, setFlik] = useState("hem");
  const [klart, setKlart] = useState(null);
  // Layoutläget är en hook och MÅSTE ligga före de villkorade returerna nedan.
  const layout = useLayout();

  // Kostens påverkan på readiness. Grindad på loggens tillförlitlighet — med
  // för få loggade dagar går det inte att skilja en vana från en tillfällighet,
  // och då lämnas faktorn utanför i stället för att gissa. Samma hållning som
  // gamla appen: opt-in och logg-bekräftad.
  // Händelsedrivna påminnelser. Avfärdanden lagras per HÄNDELSE (id:t bär
  // passets id), så ett "nej tack" gäller det passet — inte påminnelsen för
  // all framtid.
  const [avfärdade, setAvfärdade] = useState({});
  const nudge = useMemo(() => {
    const alla = buildNudges({ sessions, foodLog, nutritionTargets });
    return activeNudges(alla, avfärdade)[0] || null;
  }, [sessions, foodLog, nutritionTargets, avfärdade]);
  const avfärda = id => setAvfärdade(d => {
    const ny = pruneDismissed({ ...d, [id]: Date.now() });
    save("nudgesDismissed", ny);
    return ny;
  });

  const loggTillit = useMemo(() => logReliability(foodLog), [foodLog]);
  const nutRec = useMemo(
    () => (loggTillit.reliable
      ? nutritionRecoveryModifier({ foodLog, nutritionTargets, profile })
      : { mod: 0, factors: [] }),
    [foodLog, nutritionTargets, profile, loggTillit.reliable]
  );
  // Profiländringar från vyerna (t.ex. tonläget i matakuten) skrivs igenom till
  // lagringen med en gång; annars överlever de inte en omladdning.
  const uppdatera = uppd => setProfile(p => {
    const ny = typeof uppd === "function" ? uppd(p) : uppd;
    save("profile", ny);
    return ny;
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      const [m, prof, sess, progs, apid, w, lv, fl, g, nt, nd] = await Promise.all([
        load("mode", null), load("profile", {}), load("sessions", []), load("programs", []),
        load("activeProgramId", null), load("weights", []), load("live", null),
        load("foodLog", []), load("goal", null), load("nutritionTargets", null),
        load("nudgesDismissed", {}),
      ]);
      if (!alive) return;
      const p = prof || {};
      // Synk-form: hämta identitet och migrera in id/userId/deviceId/updatedAt på
      // befintlig data. Idempotent — körs vid varje boot utan att ändra något
      // andra gången. Skrivvägens save-effekter stämplar sedan nya poster.
      const idn = await identitet();
      if (!alive) return;
      const migr = migrera({ sessions: sess, weights: w, foodLog: fl, goal: g }, idn);
      setMode(m); setProfile(p); setSex(p.sex || null);
      setSessions(migr.sessions); setPrograms(progs); setActiveProgramId(apid);
      setWeights(migr.weights); setLive(lv); setFoodLog(migr.foodLog); setMål(migr.goal); setNutritionTargets(nt);
      // Städa avfärdanden vid boot — annars växer listan med id:n som aldrig
      // kan återkomma, eftersom de bär passets id.
      setAvfärdade(pruneDismissed(nd || {}));
      // step sätts EFTER laddningen så en befintlig användare aldrig blinkar
      // förbi onboarding innan lagringen hunnit läsas.
      setStep(m ? "app" : "start");
      setHydrated(true);
    })();
    return () => { alive = false; };
  }, []);

  // Persistens — gatad på `hydrated` så att de tomma start-defaulterna ALDRIG
  // skriver över lagrad data innan den hunnit läsas in. Poster (pass, vikt,
  // matlogg, mål) stämplas på vägen ut så att NYA poster får synkfälten; redan
  // stämplade rörs inte (stämplingen är idempotent).
  const idn = identitetSync();
  useEffect(() => { if (hydrated) save("sessions", stämplaLista(sessions, "session", idn)); }, [hydrated, sessions]);
  useEffect(() => { if (hydrated) save("programs", programs); }, [hydrated, programs]);
  useEffect(() => { if (hydrated) save("activeProgramId", activeProgramId); }, [hydrated, activeProgramId]);
  useEffect(() => { if (hydrated) save("weights", stämplaLista(weights, "weight", idn)); }, [hydrated, weights]);
  useEffect(() => { if (hydrated) save("goal", mål ? stämplaPost(mål, "goal", idn) : mål); }, [hydrated, mål]);
  useEffect(() => { if (hydrated) save("foodLog", stämplaLista(foodLog, "food", idn)); }, [hydrated, foodLog]);
  useEffect(() => { if (hydrated) save("nutritionTargets", nutritionTargets); }, [hydrated, nutritionTargets]);

  // ── OS-bakåtknappen mot webbhistoriken ────────────────────────────────────
  // popstate-lyssnaren läser HELA navigeringen (step/flik/sheet) ur en ref så att
  // den alltid ser aktuellt tillstånd utan att bindas om vid varje byte.
  const navRef = useRef({ step, sheet, flik });
  useEffect(() => { navRef.current = { step, sheet, flik }; }, [step, sheet, flik]);

  // EN enda vaktpost i historiken hålls så länge vi är i ett "guardat" steg
  // (onboarding "mode" eller appen). `guardRef` speglar om vaktposten ligger
  // uppe. Fram-och-tillbaka mellan flikar bygger ALDRIG upp historik — bakåt
  // behöver aldrig tryckas tio gånger för att komma ut.
  const guardRef = useRef(false);
  const tryckVakt = () => { window.history.pushState({ askr: true }, ""); guardRef.current = true; };

  // Lägg vaktposten när vi kliver in i ett guardat steg (mode/app) och den inte
  // redan finns. "start" är oguardat — där ska bakåt lämna appen direkt.
  useEffect(() => {
    if ((step === "mode" || step === "app") && !guardRef.current) tryckVakt();
  }, [step]);

  // Lyssnaren registreras EN gång för hela livscykeln (onboarding → app).
  useEffect(() => {
    const onPop = () => {
      guardRef.current = false;   // webbläsaren har just poppat vår vaktpost
      const åtgärd = backAction(navRef.current);
      if (åtgärd === "stäng-ark") { setSheet(null); tryckVakt(); }
      else if (åtgärd === "till-hem") {
        // Behåller live-passet (ligger kvar i state och atlas.v3.live) — detta
        // pausar ett pågående pass i stället för att kasta det.
        setFlik("hem"); tryckVakt();
      } else if (åtgärd === "till-start") {
        // Backa ett onboarding-steg. "start" är oguardat → ingen ny vaktpost;
        // nästa bakåt lämnar appen.
        setStep("start");
      } else {
        // Lämna appen. Vaktposten är redan borttagen av webbläsaren, så ett extra
        // steg bakåt tar oss ut.
        window.history.back();
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Global a11y-CSS, injiceras en gång i head:
  //  · Synlig tangentbordsfokus GENOMGÅENDE (även onboarding-skärmarna, som
  //    ligger utanför app-roten). :focus-visible → bara vid tangentbord, inte
  //    musklick, så accenten inte blinkar vid varje tap.
  //  · prefers-reduced-motion: nollar transitions/animationer för den som bett
  //    om mindre rörelse. `!important` krävs för att slå inline-transitions
  //    (t.ex. vilo-ringen och startbildens bredd).
  useEffect(() => {
    const ID = "askr-a11y";
    if (document.getElementById(ID)) return;
    const st = document.createElement("style");
    st.id = ID;
    st.textContent =
      `:focus-visible{outline:2px solid ${C.lime};outline-offset:2px;border-radius:6px}` +
      `@media (prefers-reduced-motion:reduce){*{animation-duration:.001ms !important;animation-iteration-count:1 !important;transition-duration:.001ms !important;scroll-behavior:auto !important}}`;
    document.head.appendChild(st);
  }, []);

  // ── Ark som dialog: fokus in vid öppning + Escape stänger ─────────────────
  // Tillgänglighet: ett öppet ark ska ta emot fokus (skärmläsare/tangentbord)
  // och gå att stänga med Escape, inte bara med bakgrundsklick (som kräver mus).
  const arkRef = useRef(null);
  useEffect(() => {
    if (!sheet) return;
    if (arkRef.current) { try { arkRef.current.focus(); } catch (e) {} }
    const onKey = e => { if (e.key === "Escape") setSheet(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);

  const activeProgram = programs.find(p => p.id === activeProgramId && !p.archived) || null;
  // Läsbar etikett för arket (aria-label på dialogen).
  const arkEtikett = s =>
    s === "readiness" ? "Din readiness"
    : s === "mal" ? "Målresa" : s === "kost" ? "Näringsmål" : s === "import" ? "Historik"
    : s === "program" ? "Program" : (typeof s === "string" && s.startsWith("muskel:")) ? "Muskeldetalj"
    : (typeof s === "string" && s.startsWith("pass:")) ? "Redigera pass" : "Ark";

  const pickMode = m => {
    setMode(m); save("mode", m);
    // Demo seedar allt; verklig profil startar TOM. Ingen fixtur läcker in.
    setSessions(m === "demo" ? DEMO_SESSIONS.slice() : []);
    setPrograms(m === "demo" ? DEMO_PROGRAMS.slice() : []);
    setActiveProgramId(m === "demo" ? DEMO_PROGRAM.id : null);
    setStep("app");
  };

  // Kort laddskärm tills lagringen hydrerats — annars skulle en befintlig
  // användare se onboarding blinka förbi innan datan lästs in.
  if (!hydrated) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <AskrWordmark höjd={30} />
    </div>
  );
  if (step === "start") return <Start onNext={(s) => { const p = { ...profile, sex: s }; setSex(s); setProfile(p); save("profile", p); setStep("mode"); }} />;
  if (step === "mode") return <ModeChoice onPick={pickMode} />;

  const startaPass = () => {
    if (live) { setFlik("pass"); return; }        // återuppta i stället för att kasta
    if (!activeProgram) { setSheet("program"); return; }
    const nw = nästaPass(activeProgram, sessions);
    if (!nw) return;
    setLive(buildLive(activeProgram, nw.workout, sessions));
    setFlik("pass");
  };

  const vy = () => {
    if (klart) return (
      <DoneView resultat={klart} sessions={sessions}
        // Svaret på varför-frågan sparas på passet självt. replaceSession bumpar
        // updatedAt men behåller id — synken ska se en ÄNDRING, inte en ny post.
        onReason={uppdaterat => setSessions(s => replaceSession(s, uppdaterat))}
        onHome={() => { setKlart(null); setFlik("hem"); }} />
    );
    if (flik === "pass") {
      if (live) return (
        <WorkoutView live={live} setLive={setLive} sessions={sessions} setSessions={setSessions}
          onDone={r => { setLive(null); setKlart(r); }}
          onAbort={() => setFlik("hem")} />
      );
      return (
        <div style={{ padding: "70px 24px", textAlign: "center" }}>
          <div style={hdr(20)}>Inget pågående pass</div>
          <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.6, margin: "12px 0 22px" }}>
            {activeProgram ? `Nästa pass i ${activeProgram.name} väntar.` : "Välj ett program först, så vet Askr vad som kommer härnäst."}
          </div>
          <button onClick={startaPass} style={btnPrimary}>
            {activeProgram ? "Starta pass" : "Välj program"} <span style={{ fontSize: 19 }}>→</span>
          </button>
        </div>
      );
    }
    if (flik === "hem") return (
      <Home sessions={sessions} activeProgram={activeProgram}
        onStart={startaPass} onOpen={setSheet} layout={layout} nutRec={nutRec}
        nudge={nudge} onAvfärda={avfärda} onNudgeCta={() => setFlik("mat")} />
    );
    if (flik === "coachen") return (
      <CoachView sessions={sessions} activeProgram={activeProgram} weights={weights} nutRec={nutRec}
        profile={profile} foodLog={foodLog} goal={mål} nutritionTargets={nutritionTargets}
        onStart={startaPass} onOpenGoal={() => setSheet("mal")} />
    );
    if (flik === "framsteg") return (
      <ProgressView sessions={sessions} weights={weights} activeProgram={activeProgram} nutRec={nutRec}
        onOpenSession={id => setSheet("pass:" + id)} />
    );
    return (
      <FoodView foodLog={foodLog} setFoodLog={setFoodLog}
        nutritionTargets={nutritionTargets} onSätta={() => setSheet("kost")}
        profile={profile} setProfile={uppdatera} weights={weights} />
    );
  };

  const desktop = layout.desktop;

  return (
    <div className="askr-app" style={{
      minHeight: FULL_HÖJD, background: C.bg, color: C.text, fontFamily: BFONT,
      // Telefonkolumnen gäller bara i mobilläget. På desktop bär Shell ytan.
      maxWidth: desktop ? "none" : MOBIL_MAX, margin: "0 auto",
    }}>
      {desktop
        ? <Shell aktiv={flik} onChange={setFlik} onMeny={() => setSheet("import")}>{vy()}</Shell>
        : <>{vy()}<BottomNav aktiv={flik} onChange={setFlik} /></>}
      {sheet && (
        <div onClick={() => setSheet(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 60,
          display: "flex", alignItems: desktop ? "center" : "flex-end", justifyContent: "center", padding: desktop ? 24 : 0,
        }}>
          <div ref={arkRef} role="dialog" aria-modal="true" aria-label={arkEtikett(sheet)} tabIndex={-1}
            onClick={e => e.stopPropagation()} style={{
              width: "100%", maxWidth: desktop ? 560 : MOBIL_MAX, margin: "0 auto", background: C.card,
              // Modaler har radie 28 i guiden; bottenarket behåller sin rundade
              // överkant och sitter kvar mot skärmkanten.
              borderRadius: desktop ? 28 : "22px 22px 0 0",
              border: desktop ? `1px solid ${C.hairline}` : "none",
              padding: "18px 18px 26px", maxHeight: "86vh", overflowY: "auto",
            }}>
            {!desktop && <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border, margin: "0 auto 16px" }} />}
            {sheet === "mal" ? (
              <GoalSheet mål={mål} setMål={setMål} sessions={sessions} onClose={() => setSheet(null)} />
            ) : sheet === "kost" ? (
              <NutritionSheet mål={nutritionTargets} setMål={setNutritionTargets}
                weights={weights} profile={profile} onClose={() => setSheet(null)} />
            ) : typeof sheet === "string" && sheet.startsWith("muskel:") ? (
              <MuscleSheet regionId={sheet.slice(7)} sessions={sessions} onClose={() => setSheet(null)} />
            ) : typeof sheet === "string" && sheet.startsWith("pass:") ? (
              <SessionSheet
                session={sessions.find(s => s && s.id === sheet.slice(5)) || null}
                onSpara={p => { setSessions(s => replaceSession(s, p)); setSheet(null); }}
                onRadera={id => { setSessions(s => removeSession(s, id)); setSheet(null); }}
                onClose={() => setSheet(null)} />
            ) : sheet === "readiness" ? (
              <ReadinessSheet
                why={coachFacts({ sessions, activeProgram, nutRec }).kropp.readinessWhy}
                readiness={coachFacts({ sessions, activeProgram, nutRec }).kropp.readiness}
                logg={loggTillit}
                onKost={() => { setSheet(null); setFlik("mat"); }}
                onClose={() => setSheet(null)} />
            ) : sheet === "import" ? (
              <ImportSheet sessions={sessions} setSessions={setSessions}
                setWeights={setWeights} setFoodLog={setFoodLog}
                onClose={() => setSheet(null)} />
            ) : sheet === "program" ? (
              <ProgramSheet aktiv={activeProgram} sessions={sessions}
                setPrograms={setPrograms} setActiveProgramId={setActiveProgramId}
                nästa={activeProgram ? nästaPass(activeProgram, sessions) : null}
                onClose={() => setSheet(null)} />
            ) : (
              <>
                <div style={hdr(18)}>{sheet}</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 10, lineHeight: 1.6 }}>
                  Den här vyn är inte byggd än.
                </div>
                <button onClick={() => setSheet(null)} style={{ ...btnGhost, marginTop: 18 }}>Stäng</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Atlas2;
