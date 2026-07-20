import { useState, useEffect, useRef, useMemo } from "react";
import { T } from "../data/tokens.js";
import { MUSCLES } from "../data/muscles.js";
import { EXERCISES } from "../data/exercises.js";
import { CARDIO, SPORT_INTENSITY } from "../data/exercises.js";
import { restDoneCue, DEFAULT_CUES, notificationState, requestNotifications, playBeep, speak } from "../engines/cues.js";
import { createSetListener, createDictation, voiceSupport, shortSpoken, voiceCrashedLastTime } from "../engines/voice.js";
import { buildPostSession, attachReason, reasonSignal } from "../engines/post-session.js";
import { detectGym, makePlace, getPositionOnce, DEFAULT_RADIUS_M } from "../engines/geofence.js";
import { GYM_CLUBS } from "../data/gyms.js";
import { bluetoothSupported, connectHeartRate, hrSummary } from "../engines/hr.js";
import { nfcSupported, scanTags, writeTag, encodeTag } from "../engines/nfc.js";
import { installAdvice, capabilities, isStandalone, platformKind } from "../engines/platform.js";
import { writeBridge } from "../engines/bridge.js";
import { MACHINE_TYPES } from "../data/machines.js";
import { computeRecovery, computeReadiness, computeSystemicFatigue, computeSessionLoad, progressionSuggestion, computeCardioLoad, computeSportLoad, lastPerformance, lastSessionSets, lookupBarcode, estimateMeal, startOfLocalDay } from "../engines/index.js";
import { buildSession } from "../engines/session.js";
import { ALL_TEMPLATES, copyProgram, nextWorkout, workoutExercises } from "../engines/programs.js";
import { Icon } from "../components/common/index.jsx";
import { coachReply } from "../features/ai-coach/index.jsx";
import { SvgBody } from "../features/body-map/index.jsx";
import { DEMO_SESSIONS } from "../data/demo.js";

// ── Lokal lagring (egen namnrymd, krockar inte med webben) ──
const LS = k => `atlas.mobile.${k}`;
function load(k, fb) { try { const r = localStorage.getItem(LS(k)); return r ? JSON.parse(r) : fb; } catch { return fb; } }
function save(k, v) { try { localStorage.setItem(LS(k), JSON.stringify(v)); } catch { } }

// Demoprogram (samma motor som webben) så gym-flödet är körbart direkt.
const PPL = ALL_TEMPLATES.find(t => t.family === "ppl" && t.level === "Intermediate") || ALL_TEMPLATES[0];
const DEMO_PROGRAM = copyProgram(PPL, { name: "Min PPL", active: true });

const C = { bg: "#090b10", card: "#11151d", card2: "#171c26", border: "#29313e", muted: "#8994a5", text: "#f4f7fa", blue: "#4DA3FF", purple: "#9B7CFF", green: "#39D98A", yellow: "#FFD166", red: "#FF5C5C" };
const fmtTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const sv = id => (MUSCLES[id] && MUSCLES[id].name) || id;

export function MobileApp() {
  // Läge väljs vid första start och styr om appen har exempeldata eller startar tom.
  // Samma princip som webbappen: demodata får aldrig blandas in i en riktig profil.
  const [mode, setMode] = useState(() => load("mode", null));          // null | "demo" | "real"
  const [profile, setProfile] = useState(() => load("profile", { name: "", weight: null }));
  const [sessions, setSessions] = useState(() => load("sessions", null) || (load("mode", null) === "demo" ? DEMO_SESSIONS.slice() : []));
  const [queue, setQueue] = useState(() => load("queue", []));        // oöverförda pass-id:n
  const [checkin, setCheckin] = useState(() => load("checkin", null)); // "low"|"normal"|"high"
  const [foodLog, setFoodLog] = useState(() => load("foodLog", []));
  const [cues, setCues] = useState(() => load("cues", DEFAULT_CUES));
  const [places, setPlaces] = useState(() => load("places", []));
  // Dog appen förra gången mikrofonen användes? Stäng då av röstinmatningen själv.
  // En processkrasch går inte att fånga, men spåret den lämnade går att läsa.
  const [röstKrasch, setRöstKrasch] = useState(false);
  useEffect(() => {
    if (voiceCrashedLastTime()) {
      setRöstKrasch(true);
      setCues(c => ({ ...c, voiceInput: false }));
    }
  }, []);
  const [atGym, setAtGym] = useState(null);      // { place, distance } när vi står på ett sparat gym
  const [installHidden, setInstallHidden] = useState(() => load("installHidden", false));
  const [weights, setWeights] = useState(() => load("weights", []));   // [{id, ts, kg}]
  const [notes, setNotes] = useState(() => load("notes", []));         // [{id, ts, text}]
  const [checkins, setCheckins] = useState(() => load("checkins", [])); // [{id, ts, level}]
  const [updateReady, setUpdateReady] = useState(false);
  useEffect(() => {
    const on = () => setUpdateReady(true);
    window.addEventListener("atlas:update-ready", on);
    return () => window.removeEventListener("atlas:update-ready", on);
  }, []);
  const [screen, setScreen] = useState("home");
  const [sheet, setSheet] = useState(null);
  // Pågående pass sparas löpande — stänger telefonen skärmen mitt i passet ska inget gå förlorat.
  const [live, setLive] = useState(() => load("live", null));
  const [done, setDone] = useState(null);    // slutfört pass för efter-vyn

  useEffect(() => save("sessions", sessions), [sessions]);
  useEffect(() => save("queue", queue), [queue]);
  useEffect(() => save("checkin", checkin), [checkin]);
  useEffect(() => save("foodLog", foodLog), [foodLog]);
  useEffect(() => save("cues", cues), [cues]);
  useEffect(() => save("places", places), [places]);

  // Positionskoll när appen öppnas, en enda avläsning. En webbapp kan inte geofenca
  // i bakgrunden, så det här är det enda tillfälle vi faktiskt har.
  useEffect(() => {
    if (!places.length) { setAtGym(null); return; }
    let avbruten = false;
    getPositionOnce().then(r => {
      if (avbruten || !r.ok) return;
      const träff = detectGym(places, r.pos);
      setAtGym(träff.found ? träff : null);
    });
    return () => { avbruten = true; };
  }, [places.length]);
  useEffect(() => save("installHidden", installHidden), [installHidden]);
  useEffect(() => save("mode", mode), [mode]);
  useEffect(() => save("profile", profile), [profile]);
  useEffect(() => save("weights", weights), [weights]);
  useEffect(() => save("notes", notes), [notes]);
  useEffect(() => save("checkins", checkins), [checkins]);
  useEffect(() => save("live", live), [live]);
  // Lämna av nytt material i den delade brevlådan — webbappen på samma domän hittar det
  // själv, utan att någon kod behöver kopieras.
  useEffect(() => {
    writeBridge({ sessions: sessions.filter(x => queue.includes(x.id)), food: foodLog, weights, notes, checkins });
  }, [sessions, queue, foodLog, weights, notes, checkins]);

  // ── readiness/recovery via samma motorer som webben ──
  const nowMs = Date.now();
  // Kroppsvikt: senast vägda värdet, annars profilens, annars okänd (då utelämnas den).
  const bodyweight = (weights.length ? weights[weights.length - 1].kg : null) ?? profile.weight ?? null;
  const sysFat = computeSystemicFatigue(sessions, nowMs);
  const cardioPenalty = Math.min(18, Math.round(sysFat));
  const muscleStates = {};
  Object.keys(MUSCLES).forEach(id => {
    const rec = computeRecovery(sessions, id, nowMs);
    const weeklyLoad = sessions.filter(s => nowMs - s.completedAt < 7 * 864e5).reduce((a, s) => a + ((s.muscleLoads && s.muscleLoads[id]) || 0), 0);
    const base = computeReadiness(rec.recoveryScore, weeklyLoad, rec.daysSince);
    const readiness = rec.status === "no_data" ? base : Math.max(0, Math.min(100, base - cardioPenalty));
    muscleStates[id] = { ...rec, weeklyLoad, readiness };
  });
  const totalW = Object.values(muscleStates).reduce((a, s) => a + s.weeklyLoad, 0) || 1;
  let overall = totalW > 1 ? Math.round(Object.values(muscleStates).reduce((a, s) => a + s.readiness * (s.weeklyLoad / totalW), 0)) : null;
  // subjektiv daglig check-in nudgar readiness (±6)
  if (overall != null && checkin) overall = Math.max(0, Math.min(100, overall + (checkin === "high" ? 6 : checkin === "low" ? -6 : 0)));

  const nw = nextWorkout(DEMO_PROGRAM, sessions);

  const startWorkout = () => {
    // Finns ett pågående pass: gå tillbaka in i det i stället för att tyst kasta bort det.
    if (live) { setScreen("workout"); return; }
    if (!nw) return;
    const items = workoutExercises(nw.workout).map(x => {
      const sug = progressionSuggestion(x.exId, sessions, x.repMax);
      const last = lastWeight(sessions, x.exId);
      const lp = lastPerformance(sessions, x.exId);
      const prev = lastSessionSets(sessions, x.exId);
      return {
        exId: x.exId, name: x.exercise.name, group: x.exercise.group, activation: x.exercise.activation || [],
        sets: x.sets, repMin: x.repMin, repMax: x.repMax, restSec: x.restSec || 90,
        weight: sug ? sug.weight : (last || defaultWeight(x.exId)),
        reps: sug ? sug.reps : (lp && lp.reps ? lp.reps : (x.repMax || 8)),
        prevSets: prev ? prev.sets : null,
        suggestion: sug ? { note: sug.note, prev: sug.prev } : (last ? { note: `Förra passet: ${last} kg`, prev: { weight: last } } : null),
        logged: [],
      };
    });
    setLive({ programId: DEMO_PROGRAM.id, workoutId: nw.workout.id, name: nw.workout.name, startedAt: Date.now(), idx: 0, items });
    setScreen("workout");
  };

  const finishWorkout = () => {
    const sets = [];
    live.items.forEach(it => (it.logged || []).forEach(l => sets.push({ exerciseId: it.exId, weight: l.weight, reps: l.reps, rpe: l.rpe != null ? l.rpe : null })));
    const session = buildSession({ sets, source: "training", title: live.name, programId: live.programId, workoutId: live.workoutId, completedAt: Date.now(), ...(bodyweight ? { bodyweight } : {}) });
    setSessions(s => [...s, session]);
    setQueue(q => [...q, session.id]);
    setDone({ session, durationMin: Math.max(1, Math.round((Date.now() - live.startedAt) / 60000)) });
    setLive(null);
    setScreen("complete");
  };

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", maxWidth: 480, margin: "0 auto", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", paddingBottom: screen === "home" ? 78 : 0, position: "relative" }}>
      {updateReady && (
        <div style={{ position: "sticky", top: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 14px", background: C.blue, color: "#08101c" }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Ny version av ATLAS finns</span>
          <button onClick={() => window.location.reload()} style={{ padding: "6px 14px", borderRadius: 999, border: "none", background: "#08101c", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Ladda om</button>
        </div>
      )}
      {!mode && <ModePicker onPick={(m, prof) => {
        setMode(m);
        setProfile({ name: prof.name || "", weight: prof.weight ?? null });
        setSessions(m === "demo" ? DEMO_SESSIONS.slice() : []);
        if (prof.weight) setWeights([{ id: `w_${Date.now()}`, ts: Date.now(), kg: prof.weight }]);
      }} />}
      {mode && screen === "home" && <Home {...{ overall, muscleStates, nw, checkin, startWorkout, queue, setSheet, installHidden, setInstallHidden, places, setPlaces, profile, live, atGym, röstKrasch}}
        onResume={() => setScreen("workout")}
        onDiscard={() => setLive(null)} />}
      {mode && screen === "workout" && live && <Workout {...{ live, setLive, finishWorkout, setSheet, cues, bodyweight }}
        onPause={() => setScreen("home")}
        onAbort={() => { setLive(null); setScreen("home"); }} />}
      {mode && screen === "complete" && done && <Complete {...{ done, muscleStates, setScreen, setSheet, sessions, setSessions }} />}

      {mode && screen === "home" && <TabBar setSheet={setSheet} startWorkout={startWorkout} />}

      {sheet && <Sheet name={sheet} onClose={() => setSheet(null)} ctx={{ sessions, setSessions, queue, setQueue, checkin, setCheckin, checkins, setCheckins, foodLog, setFoodLog, cues, setCues, installHidden, setInstallHidden, weights, setWeights, notes, setNotes, profile, setProfile, mode, muscleStates, overall, nw, DEMO_PROGRAM }} />}
    </div>
  );
}

// ════════ HEM ════════
// Första start: samma val som webbappen. Utan det här hamnar en ny användare rakt in i
// någon annans exempeldata utan att förstå att den inte är hens egen.
function ModePicker({ onPick }) {
  const [step, setStep] = useState("mode");
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");

  const Choice = ({ title, body, tone, onClick }) => (
    <button onClick={onClick} style={{ width: "100%", textAlign: "left", padding: 16, marginBottom: 10, borderRadius: 14, border: `1px solid ${tone}55`, background: C.card, color: C.text, cursor: "pointer" }}>
      <div style={{ fontSize: 15.5, fontWeight: 800, color: tone, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55 }}>{body}</div>
    </button>
  );

  if (step === "mode") {
    return (
      <div style={{ padding: "40px 18px" }}>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>ATLAS</div>
        <div style={{ fontSize: 13, color: C.muted, margin: "6px 0 26px", lineHeight: 1.55 }}>
          Välj hur du vill börja. Valet går att ändra senare, men lägena hålls helt åtskilda — exempeldata kan aldrig blandas in i din egen historik.
        </div>
        <Choice tone={C.blue} title="Riktig profil" body="Appen startar tom och bygger allt på det du själv loggar. Välj den här om du ska träna med appen." onClick={() => setStep("profile")} />
        <Choice tone={C.purple} title="Demo" body="Fylld med exempeldata så du kan se hur appen fungerar utan att logga något. Inget av det är dina siffror." onClick={() => onPick("demo", {})} />
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 18px" }}>
      <div style={{ fontSize: 22, fontWeight: 800 }}>Kort om dig</div>
      <div style={{ fontSize: 12.5, color: C.muted, margin: "6px 0 20px", lineHeight: 1.55 }}>
        Båda fälten är frivilliga. Vikten används för att räkna belastning i övningar med kroppsvikt — utan den utelämnas de beräkningarna hellre än gissas.
      </div>
      <label style={{ fontSize: 12, color: C.muted }}>Namn</label>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Vad ska appen kalla dig?" style={{ width: "100%", background: C.card2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, fontSize: 14, margin: "6px 0 14px" }} />
      <label style={{ fontSize: 12, color: C.muted }}>Kroppsvikt (kg)</label>
      <input value={weight} onChange={e => setWeight(e.target.value)} inputMode="decimal" placeholder="t.ex. 78" style={{ width: "100%", background: C.card2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, fontSize: 14, margin: "6px 0 18px" }} />
      <button onClick={() => {
        const kg = parseFloat(String(weight).replace(",", "."));
        onPick("real", { name: name.trim(), weight: isFinite(kg) && kg >= 25 && kg <= 300 ? kg : null });
      }} style={bigBtn}>Kom igång</button>
      <button onClick={() => setStep("mode")} style={{ width: "100%", marginTop: 10, padding: 12, borderRadius: 12, border: "none", background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Tillbaka</button>
    </div>
  );
}

function Home({ overall, muscleStates, nw, checkin, startWorkout, queue, setSheet, installHidden, setInstallHidden, profile = {}, live = null, onResume, onDiscard, atGym = null, röstKrasch = false }) {
  const rd = overall == null ? C.muted : overall >= 76 ? C.green : overall >= 56 ? C.yellow : C.red;
  const lbl = overall == null ? "För lite data" : overall >= 76 ? "Bra beredskap" : overall >= 56 ? "Måttlig beredskap" : "Låg beredskap";
  const top = Object.entries(muscleStates).filter(([, s]) => s.status !== "no_data").sort((a, b) => a[1].readiness - b[1].readiness).slice(0, 2);
  return (
    <div style={{ padding: "18px 16px 8px" }}>
      <Header title={profile.name ? `Hej, ${profile.name}` : "Hej"} sub="ATLAS · Idag" right={queue.length > 0 ? <Badge onClick={() => setSheet("export")}>{queue.length} att föra över</Badge> : null} />

      {live && (
        <Card style={{ marginTop: 14, borderColor: C.blue + "66", background: "rgba(77,163,255,0.08)" }}>
          <div style={{ fontSize: 11, letterSpacing: 1, color: C.blue, textTransform: "uppercase" }}>Pausat pass</div>
          <div style={{ fontSize: 17, fontWeight: 800, margin: "3px 0 2px" }}>{live.name}</div>
          <div style={{ fontSize: 12, color: C.muted }}>
            Startat {new Date(live.startedAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })} · {(live.items || []).reduce((a, x) => a + (x.logged || []).filter(Boolean).length, 0)} set loggade
          </div>
          <button onClick={onResume} style={{ ...bigBtn, marginTop: 12 }}>Fortsätt passet</button>
          <button onClick={onDiscard} style={{ width: "100%", marginTop: 8, padding: 11, borderRadius: 12, border: "none", background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Kasta passet</button>
        </Card>
      )}

      <Card style={{ marginTop: 14, display: "flex", gap: 16, alignItems: "center" }}>
        <Ring value={overall} color={rd} />
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1, color: C.muted, textTransform: "uppercase" }}>{lbl}</div>
          <div style={{ fontSize: 19, fontWeight: 800, marginTop: 2 }}>{nw ? `Grönt ljus för ${nw.workout.name}` : "Inget planerat pass"}</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>{overall == null ? "Logga pass så bygger ATLAS din beredskap." : "Håll första pressövningen kring RPE 7–8."}</div>
        </div>
      </Card>

      <div style={{ marginTop: 14, borderRadius: 16, border: `1px solid ${C.border}`, background: "radial-gradient(circle at 50% 22%, rgba(77,163,255,0.07), transparent 62%)", padding: "8px 8px 14px", position: "relative" }}>
        <div style={{ height: 360 }}><SvgBody muscleStates={muscleStates} onSelect={() => { }} reduced /></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4, paddingLeft: 4 }}>
          {top.map(([id, s]) => <Pill key={id} color={s.readiness >= 76 ? C.green : s.readiness >= 56 ? C.yellow : C.red}>{sv(id)} {s.readiness}%</Pill>)}
        </div>
      </div>

      <Card style={{ marginTop: 14 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <span style={{ color: C.purple, fontSize: 18 }}>✦</span>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1, color: C.muted, textTransform: "uppercase" }}>Coachens nästa steg</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>Träna enligt planen</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>Din utveckling ligger i rätt riktning. Prioritera teknik före extra volym idag.</div>
          </div>
        </div>
      </Card>

      {röstKrasch && (
        <div style={{ marginTop: 12, padding: "13px 14px", borderRadius: 13, border: `1px solid ${C.red}66`, background: "rgba(255,92,92,0.08)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 5 }}>Röstinmatningen är avstängd</div>
          <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
            Appen avslutades förra gången mikrofonen användes, så ATLAS stängde av funktionen åt dig.
            Allt annat fungerar som vanligt. Du kan slå på den igen under Signaler → Inmatning.
          </div>
        </div>
      )}

      {atGym && !live && (
        <div style={{ marginTop: 12, padding: "14px 15px", borderRadius: 14, border: `1px solid ${C.green}66`, background: "rgba(57,217,138,0.09)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 15 }}>📍</span>
            <span style={{ fontSize: 14.5, fontWeight: 700 }}>Du är på {atGym.place.name}</span>
          </div>
          <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, marginBottom: 11 }}>
            {atGym.distance != null ? `${atGym.distance} m från sparad position. ` : ""}Vill du börja träna?
          </div>
          <button onClick={startWorkout} style={{ width: "100%", padding: 12, borderRadius: 11, border: "none", background: C.green, color: "#04120a", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Starta pass</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <QuickBtn onClick={() => setSheet("food")}><Icon name="apple" size={15} style={{ verticalAlign: "-2px" }} /> Mat</QuickBtn>
        <QuickBtn onClick={() => setSheet("checkin")}>◎ Check-in</QuickBtn>
        <QuickBtn onClick={() => setSheet("weight")}>↗ Vikt</QuickBtn>
        <QuickBtn onClick={() => setSheet("cues")}>🔔 Signaler</QuickBtn>
        <QuickBtn onClick={() => setSheet("places")}>📍 Mina gym</QuickBtn>
        {nfcSupported() && <QuickBtn onClick={() => setSheet("nfc")}>📶 NFC</QuickBtn>}
        <QuickBtn onClick={() => setSheet("caps")}>📱 Telefon</QuickBtn>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={() => setSheet("gps")} style={{ flex: 1, padding: "14px 6px", borderRadius: 12, border: `1px solid ${C.blue}`, background: "rgba(77,163,255,0.14)", color: C.text, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>📍 Utepass (GPS)</button>
        <button onClick={() => setSheet("cardio")} style={{ flex: 1, padding: "14px 6px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>🏃 Logga cardio</button>
      </div>
      {!installHidden && <InstallCard onDismiss={() => setInstallHidden(true)} />}

      {nw && <button onClick={startWorkout} style={{ ...bigBtn, marginTop: 12 }}>Starta dagens pass · {nw.workout.name} →</button>}
      {nw && <div style={{ textAlign: "center", fontSize: 12, color: C.muted, marginTop: 8 }}>{workoutExercises(nw.workout).length} övningar · cirka 55 min · Gym</div>}
    </div>
  );
}

// ════════ AKTIVT PASS ════════
function Workout({ live, setLive, finishWorkout, setSheet, cues = DEFAULT_CUES, bodyweight = null, onPause, onAbort }) {
  const it = live.items[live.idx];
  const [confirmExit, setConfirmExit] = useState(false);
  const loggedCount = (live.items || []).reduce((a, x) => a + (x.logged || []).filter(Boolean).length, 0);
  const tryExit = () => { if (loggedCount === 0) onAbort(); else setConfirmExit(true); };
  const [rest, setRest] = useState(0);
  const cuesRef = useRef(cues);
  useEffect(() => { cuesRef.current = cues; }, [cues]);
  const [exact, setExact] = useState(false);
  // Röstinmatning: lyssnar -> förslag -> bekräftelse. Sparar aldrig av sig själv.
  const [hör, setHör] = useState(false);
  const [förslag, setFörslag] = useState(null);      // { weight, reps } eller { repeat:true }
  const [röstFel, setRöstFel] = useState(null);
  const stoppa = useRef(null);
  const timer = useRef(null);
  useEffect(() => {
    if (rest > 0) {
      timer.current = setInterval(() => setRest(r => {
        if (r <= 1) {
          clearInterval(timer.current);
          // Signal när vilan är slut: ljud + ev. röst/vibration/notis enligt inställning.
          restDoneCue(cuesRef.current);
          return 0;
        }
        return r - 1;
      }), 1000);
      return () => clearInterval(timer.current);
    }
  }, [rest > 0]);
  // Håll skärmen tänd under passet — släpps när vyn lämnas.
  useEffect(() => {
    let lock = null, alive = true;
    const acquire = async () => { try { if ("wakeLock" in navigator && document.visibilityState === "visible") lock = await navigator.wakeLock.request("screen"); } catch (e) { } };
    acquire();
    const onVis = () => { if (document.visibilityState === "visible" && alive && !lock) acquire(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { alive = false; document.removeEventListener("visibilitychange", onVis); document.removeEventListener("visibilitychange", onVis); if (lock) { try { lock.release(); } catch (e) { } } };
  }, []);

  const setLogged = (n) => setLive(L => { const items = L.items.slice(); items[L.idx] = { ...it, logged: n }; return { ...L, items }; });
  const psv = (i, field) => (it.planSets && it.planSets[i] && it.planSets[i][field] != null) ? it.planSets[i][field] : it[field];
  const copyPrev = () => setLive(L => { const items = L.items.slice(); items[L.idx] = { ...it, planSets: it.prevSets, weight: it.prevSets[0]?.weight ?? it.weight, reps: it.prevSets[0]?.reps ?? it.reps }; return { ...L, items }; });
  const toggleSet = (i) => {
    const logged = (it.logged || []).slice();
    if (logged[i]) logged[i] = null;
    else { logged[i] = { weight: psv(i, "weight"), reps: psv(i, "reps"), rpe: null }; setRest(it.restSec); }
    setLogged(logged.filter((x, idx) => idx < it.sets).map((x, idx) => logged[idx] || null));
    setLogged(logged);
  };
  const patchSet = (i, patch) => { const logged = (it.logged || []).slice(); logged[i] = { ...(logged[i] || { weight: psv(i, "weight"), reps: psv(i, "reps"), rpe: null }), ...patch }; setLogged(logged); };
  const bump = (field, delta) => setLive(L => { const items = L.items.slice(); const cur = items[L.idx]; const v = field === "weight" ? Math.max(0, +(cur.weight + delta).toFixed(1)) : Math.max(1, cur.reps + delta); items[L.idx] = { ...cur, [field]: v }; return { ...L, items }; });
  const doneCount = (it.logged || []).filter(Boolean).length;
  const röstStöd = voiceSupport();
  const röstPå = !!cues.voiceInput && röstStöd.ok;

  const lyssna = () => {
    if (hör) { stoppa.current && stoppa.current(); return; }
    setRöstFel(null); setFörslag(null); setHör(true);
    stoppa.current = createSetListener({
      onResult: (r) => {
        if (r.ok && r.repeat) {
          const f = (it.logged || []).filter(Boolean).slice(-1)[0];
          if (f) setFörslag({ weight: f.weight, reps: f.reps });
          else setRöstFel("Det finns inget tidigare set att upprepa.");
        } else if (r.ok) {
          setFörslag({ weight: r.weight, reps: r.reps });
        } else {
          setRöstFel(
            r.reason === "ett-tal" ? `Hörde bara ett tal${r.hint != null ? ` (${r.hint})` : ""}. Säg både vikt och reps.`
            : r.reason === "vikt-orimlig" || r.reason === "reps-orimliga" ? "Det lät orimligt — säg om."
            : "Uppfattade inte. Säg till exempel \u201dåttio åtta\u201d."
          );
        }
      },
      onError: (kod, text) => setRöstFel(text),
      onEnd: () => { setHör(false); stoppa.current = null; },
    });
  };

  // Bekräftat förslag: sätt vikt/reps OCH bocka av nästa ologgade set.
  const godkänn = () => {
    if (!förslag) return;
    // nästa ologgade set, annars det sista
    const antal = it.sets || 1;
    const loggade = it.logged || [];
    let idx = -1;
    for (let n = 0; n < antal; n++) if (!loggade[n]) { idx = n; break; }
    if (idx === -1) idx = antal - 1;
    setLive(L => {
      const items = L.items.slice(); const cur = items[L.idx];
      const logged = (cur.logged || []).slice();
      logged[idx] = { weight: förslag.weight, reps: förslag.reps, rpe: null };
      items[L.idx] = { ...cur, weight: förslag.weight, reps: förslag.reps, logged };
      return { ...L, items };
    });
    setRest(it.restSec);
    setFörslag(null);
  };

  useEffect(() => () => { stoppa.current && stoppa.current(); }, []);

  const load = computeSessionLoad([].concat(...live.items.map(x => (x.logged || []).filter(Boolean).map(l => ({ exerciseId: x.exId, weight: l.weight, reps: l.reps })))), EXERCISES, bodyweight || 75);
  const loadTop = Object.entries(load).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const loadMax = loadTop.length ? loadTop[0][1] : 1;

  return (
    <div style={{ padding: "18px 16px 96px" }}>
      <Header title={live.name} sub={`Aktivt pass · ${new Date(live.startedAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}`}
        onBack={tryExit}
        right={<button onClick={() => setSheet("music")} style={ghostBtn}>♫ Musik</button>} />

      {confirmExit && (
        <Card style={{ marginTop: 14, borderColor: C.yellow + "66" }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Lämna passet?</div>
          <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55, marginBottom: 12 }}>
            Du har loggat {loggedCount} {loggedCount === 1 ? "set" : "set"}. Pausar du ligger passet kvar och du kan fortsätta senare — även om du stänger appen.
          </div>
          <button onClick={onPause} style={{ ...bigBtn, marginBottom: 8 }}>Pausa och gå till startsidan</button>
          <button onClick={() => setConfirmExit(false)} style={{ width: "100%", padding: 13, borderRadius: 12, border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>Fortsätt träna</button>
          <button onClick={onAbort} style={{ width: "100%", padding: 13, borderRadius: 12, border: "none", background: "transparent", color: C.red, fontSize: 13.5, cursor: "pointer" }}>Kasta passet</button>
        </Card>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, fontSize: 12, color: C.muted }}>
        <span style={{ letterSpacing: 0.5 }}>ÖVNING {live.idx + 1} AV {live.items.length}</span>
      </div>
      <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
        {live.items.map((x, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < live.idx ? C.blue : i === live.idx ? C.purple : C.border }} />)}
      </div>

      <Card style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1, color: C.muted, textTransform: "uppercase" }}>Huvudövning</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{it.name}</div>
          </div>
          <button onClick={() => setExact(e => !e)} style={{ ...ghostBtn, borderColor: exact ? C.blue : C.border, color: exact ? C.blue : C.muted }}>{exact ? "Exact ✓" : "Exact Mode"}</button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {it.activation.slice(0, 3).map((a, i) => <Pill key={i}>{sv(a.muscleId)}{i === 0 ? " · primär" : ""}</Pill>)}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <StepBox label="Arbetsvikt" value={`${it.weight} kg`} onMinus={() => bump("weight", -2.5)} onPlus={() => bump("weight", 2.5)} />
          <StepBox label="Reps" value={it.reps} onMinus={() => bump("reps", -1)} onPlus={() => bump("reps", 1)} />
        </div>
        {röstPå && (
          <div style={{ marginTop: 10 }}>
            <button onClick={lyssna} aria-label={hör ? "Sluta lyssna" : "Säg vikt och reps"} style={{
              width: "100%", padding: "12px 14px", borderRadius: 12, cursor: "pointer",
              border: `1px solid ${hör ? C.purple : C.border}`,
              background: hör ? "rgba(155,124,255,0.16)" : C.card2,
              color: hör ? C.purple : C.muted, fontSize: 14, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <span style={{ fontSize: 17 }}>{hör ? "\u25CF" : "\u{1F3A4}"}</span>
              {hör ? "Lyssnar \u2014 säg vikt och reps" : "Säg vikt och reps"}
            </button>

            {förslag && (
              <div style={{ marginTop: 8, padding: "12px 14px", borderRadius: 12, background: "rgba(155,124,255,0.10)", border: `1px solid ${C.purple}66` }}>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Uppfattade \u2014 stämmer det?</div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>{förslag.weight} kg \u00D7 {förslag.reps} reps</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={godkänn} style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: C.green, color: "#04120a", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Spara setet</button>
                  <button onClick={() => setFörslag(null)} style={{ padding: "12px 16px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 14, cursor: "pointer" }}>Ångra</button>
                </div>
              </div>
            )}

            {röstFel && !förslag && (
              <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, fontSize: 12.5, color: C.muted, lineHeight: 1.45 }}>{röstFel}</div>
            )}
          </div>
        )}
        {it.suggestion && (
          <div style={{ marginTop: 10, padding: "9px 12px", borderRadius: 10, background: "rgba(155,124,255,0.09)", border: `1px solid ${C.purple}44`, fontSize: 12.5, color: C.text, lineHeight: 1.45 }}>
            <span style={{ color: C.purple }}>✦</span> {it.suggestion.note}{it.suggestion.prev && it.suggestion.prev.weight ? ` (förra: ${it.suggestion.prev.weight} kg${it.suggestion.prev.reps ? ` × ${it.suggestion.prev.reps}` : ""})` : ""}
          </div>
        )}
        {it.prevSets && it.prevSets.length > 0 && (
          <button onClick={copyPrev} style={{ ...ghostBtn, marginTop: 10, width: "100%", borderColor: it.planSets ? C.green : C.blue, color: it.planSets ? C.green : C.blue }}>
            {it.planSets ? `✓ Förra passet ifyllt (${it.prevSets.length} set)` : `⧉ Kopiera förra passet (${it.prevSets.length} set)`}
          </button>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr auto", gap: 8, marginTop: 14, fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, padding: "0 4px" }}>
          <span>Set</span><span>Vikt</span><span>Reps</span><span style={{ textAlign: "right" }}>Klar</span>
        </div>
        {Array.from({ length: it.sets }).map((_, i) => {
          const l = (it.logged || [])[i];
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr auto", gap: 8, alignItems: "center", padding: "12px 10px", marginTop: 8, borderRadius: 12, border: `1px solid ${l ? C.green + "88" : C.border}`, background: l ? "rgba(57,217,138,0.06)" : C.card2 }}>
              <span style={{ fontWeight: 700, width: 18 }}>{i + 1}</span>
              {exact
                ? <input type="number" value={l ? l.weight : psv(i, "weight")} onChange={e => patchSet(i, { weight: +e.target.value })} style={miniIn} />
                : <span style={{ fontSize: 16, fontWeight: 600 }}>{(l ? l.weight : psv(i, "weight"))} kg</span>}
              {exact
                ? <input type="number" value={l ? l.reps : psv(i, "reps")} onChange={e => patchSet(i, { reps: +e.target.value })} style={miniIn} />
                : <span style={{ fontSize: 16, fontWeight: 600 }}>{l ? l.reps : psv(i, "reps")}</span>}
              <button onClick={() => toggleSet(i)} style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${l ? C.green : C.border}`, background: l ? C.green : "transparent", color: l ? "#04120a" : C.muted, fontSize: 18, cursor: "pointer" }}>{l ? "✓" : "○"}</button>
            </div>
          );
        })}
        {exact && <div style={{ marginTop: 8, fontSize: 12, color: C.muted }}>Exact Mode: justera vikt/reps per set innan du bockar av. RPE loggas automatiskt som planerat.</div>}

        {rest > 0 && (
          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 12, background: "rgba(155,124,255,0.10)", border: `1px solid ${C.purple}55` }}>
            <div><div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase" }}>Vila</div><div style={{ fontSize: 22, fontWeight: 800, color: C.purple }}>{fmtTime(rest)}</div></div>
            <button onClick={() => setRest(0)} style={ghostBtn}>Hoppa över</button>
          </div>
        )}
      </Card>

      <Card style={{ marginTop: 12 }}>
        <div style={{ fontSize: 11, letterSpacing: 1, color: C.muted, textTransform: "uppercase" }}>Ackumulerad belastning</div>
        {loadTop.length === 0 ? <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Bocka av set så byggs belastningen upp.</div>
          : loadTop.map(([id, v]) => (
            <div key={id} style={{ marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>{sv(id)}</span><span style={{ color: C.muted }}>{Math.round(v / loadMax * 100)}%</span></div>
              <div style={{ height: 7, borderRadius: 4, background: C.border, marginTop: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.round(v / loadMax * 100)}%`, background: `linear-gradient(90deg,${C.blue},${C.purple})` }} /></div>
            </div>
          ))}
      </Card>

      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, maxWidth: 480, margin: "0 auto", padding: 12, background: `linear-gradient(transparent, ${C.bg} 30%)`, display: "flex", gap: 10 }}>
        {live.idx < live.items.length - 1
          ? <button onClick={() => setLive(L => ({ ...L, idx: L.idx + 1 }))} style={ghostBtnLg}>Nästa övning</button>
          : <button onClick={() => setLive(L => ({ ...L, idx: Math.max(0, L.idx - 1) }))} style={ghostBtnLg}>Föregående</button>}
        <button onClick={finishWorkout} style={{ ...bigBtn, flex: 1, marginTop: 0 }}>Avsluta pass →</button>
      </div>
    </div>
  );
}

// ════════ EFTER PASS ════════
function Complete({ done, muscleStates, setScreen, setSheet, sessions = [], setSessions }) {
  const s = done.session;
  // Sammanfattningen räknas fram lokalt ur loggen — inga nätanrop, fungerar utan täckning.
  const historik = sessions.filter(x => x && x.id !== s.id);
  const post = useMemo(() => buildPostSession({ session: s, sessions: historik, exercises: EXERCISES, now: Date.now() }), [s.id]);
  const signal = useMemo(() => reasonSignal(sessions, Date.now()), [sessions.length]);
  const [svarat, setSvarat] = useState(null);
  const svara = (code) => {
    setSvarat(code);
    if (setSessions) setSessions(list => list.map(x => x.id === s.id ? attachReason(x, code, post.question) : x));
  };
  const sets = s.sets || [];
  const volume = sets.reduce((a, x) => a + (x.weight || 0) * (x.reps || 0), 0);
  const trained = Object.entries(s.muscleLoads || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 4);
  return (
    <div style={{ padding: "18px 16px 96px" }}>
      <Header title={s.title} sub="ATLAS · Återkoppling" right={<button onClick={() => setScreen("home")} style={ghostBtn}>✕</button>} />
      <div style={{ textAlign: "center", marginTop: 18 }}>
        <div style={{ width: 64, height: 64, borderRadius: 40, background: "rgba(57,217,138,0.15)", border: `1px solid ${C.green}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", fontSize: 30, color: C.green }}>✓</div>
        <div style={{ fontSize: 24, fontWeight: 800, marginTop: 12 }}>Passet är registrerat</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>ATLAS har uppdaterat belastning och recovery.</div>
      </div>

      {post.lines.length > 0 && (
        <Card style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: 1, color: C.muted, textTransform: "uppercase", marginBottom: 8 }}>Sammanfattning</div>
          {post.lines.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", marginTop: i ? 8 : 0 }}>
              <span style={{ marginTop: 6, width: 6, height: 6, borderRadius: 3, flexShrink: 0,
                background: l.tone === "warn" ? C.red : l.tone === "good" ? C.green : l.tone === "low" ? C.muted : C.blue }} />
              <span style={{ fontSize: 13.5, lineHeight: 1.5 }}>{l.text}</span>
            </div>
          ))}
          {signal && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}`, fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>{signal.text}</div>
          )}
        </Card>
      )}

      {post.question && (
        <Card style={{ marginTop: 12 }}>
          {svarat ? (
            <div style={{ fontSize: 13, color: C.muted }}>Tack \u2014 det tas med i kommande rekommendationer.</div>
          ) : (
            <>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 10 }}>{post.question.prompt}</div>
              <div style={{ display: "grid", gap: 7 }}>
                {post.question.options.map(o => (
                  <button key={o.code} onClick={() => svara(o.code)} style={{ padding: "11px 13px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 13.5, textAlign: "left", cursor: "pointer" }}>{o.label}</button>
                ))}
              </div>
              <button onClick={() => setSvarat("skip")} style={{ marginTop: 8, width: "100%", padding: 9, borderRadius: 10, border: "none", background: "transparent", color: C.muted, fontSize: 12.5, cursor: "pointer" }}>Hoppa över</button>
            </>
          )}
        </Card>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Stat v={`${done.durationMin} min`} l="Tid" />
        <Stat v={sets.length} l="Arbetsset" />
        <Stat v={`${(volume / 1000).toFixed(1)} t`} l="Volym" />
      </div>

      <div style={{ marginTop: 14, borderRadius: 16, border: `1px solid ${C.border}`, background: "radial-gradient(circle at 50% 22%, rgba(255,92,92,0.06), transparent 62%)", padding: "8px" }}>
        <div style={{ height: 320 }}><SvgBody muscleStates={muscleStates} onSelect={() => { }} reduced /></div>
      </div>

      <Card style={{ marginTop: 14 }}>
        <div style={{ fontSize: 11, letterSpacing: 1, color: C.muted, textTransform: "uppercase" }}>Beräknad recovery</div>
        {trained.length === 0 ? <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Inga set loggade.</div>
          : trained.map(([id]) => {
            const h = MUSCLES[id] ? MUSCLES[id].halfLife : 36;
            return (
              <div key={id} style={{ marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>{sv(id)}</span><span style={{ color: C.muted }}>{h} h</span></div>
                <div style={{ height: 7, borderRadius: 4, background: C.border, marginTop: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.min(100, h / 48 * 100)}%`, background: `linear-gradient(90deg,${C.blue},${C.purple})` }} /></div>
              </div>
            );
          })}
      </Card>

      <Card style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <span style={{ color: C.purple, fontSize: 18 }}>✦</span>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1, color: C.muted, textTransform: "uppercase" }}>Coachens bedömning</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>Behåll nästa pass enligt planen</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>Prestation och RPE låg inom målområdet. Utvärdera axlarna i morgondagens check-in.</div>
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={() => setSheet("note")} style={ghostBtnLg}>Lägg till notering</button>
        <button onClick={() => setScreen("home")} style={{ ...bigBtn, flex: 1, marginTop: 0 }}>Spara och gå hem</button>
      </div>
      <div style={{ textAlign: "center", fontSize: 12, color: C.muted, marginTop: 10 }}>Passet ligger nu i kön för överföring till webben.</div>
    </div>
  );
}

// ════════ BOTTENARK ════════
function Sheet({ name, onClose, ctx }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: C.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, border: `1px solid ${C.border}`, padding: "10px 18px 26px", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border, margin: "6px auto 14px" }} />
        {name === "export" && <ExportSheet ctx={ctx} />}
        {name === "checkin" && <CheckinSheet ctx={ctx} onClose={onClose} />}
        {name === "cardio" && <CardioSheet ctx={ctx} onClose={onClose} />}
        {name === "gps" && <GPSSheet ctx={ctx} onClose={onClose} />}
        {name === "cues" && <CuesSheet ctx={ctx} onClose={onClose} />}
        {name === "nfc" && <NFCSheet ctx={ctx} onClose={onClose} />}
        {name === "caps" && <CapsSheet onClose={onClose} />}
        {name === "places" && <PlacesSheet ctx={ctx} onClose={onClose} />}
        {name === "progress" && <ProgressSheet ctx={ctx} />}
        {name === "weight" && <SimpleSheet title="Registrera vikt" label="Vikt i kilogram" placeholder="t.ex. 82,4" kind="weight" ctx={ctx} />}
        {name === "food" && <FoodSheet ctx={ctx} onClose={onClose} />}
        {name === "music" && <MusicSheet />}
        {name === "coach" && <CoachSheet ctx={ctx} />}
        {name === "note" && <SimpleSheet title="Passnotering" label="Notering" placeholder="Hur kändes passet?" kind="note" ctx={ctx} multiline />}
        <button onClick={onClose} style={{ ...ghostBtnLg, width: "100%", marginTop: 16 }}>Stäng</button>
      </div>
    </div>
  );
}

function ExportSheet({ ctx }) {
  const items = ctx.sessions.filter(s => ctx.queue.includes(s.id));
  const food = ctx.foodLog || [];
  const code = btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, sessions: items, food }))));
  const [copied, setCopied] = useState(false);
  const copy = () => { try { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { } };
  return (
    <div>
      <SheetTitle>Föra över till webben</SheetTitle>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, marginBottom: 12 }}>{items.length} pass{food.length ? ` och ${food.length} matposter` : ""} väntar. Kopiera koden och klistra in den i webbversionen under "Importera från mobil".</div>
      {items.length === 0 && food.length === 0 ? <div style={{ fontSize: 13, color: C.muted }}>Inget att föra över just nu.</div> : <>
        <textarea readOnly value={code} style={{ width: "100%", height: 90, background: C.card2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, padding: 10, fontSize: 11, fontFamily: "monospace", resize: "none" }} />
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={copy} style={{ ...bigBtn, marginTop: 0, flex: 1 }}>{copied ? "✓ Kopierad" : "Kopiera kod"}</button>
          <button onClick={() => ctx.setQueue([])} style={ghostBtnLg}>Markera som överförda</button>
        </div>
      </>}
    </div>
  );
}

function CardioSheet({ ctx, onClose }) {
  const [id, setId] = useState(CARDIO[0].id);
  const [minutes, setMinutes] = useState(30);
  const [intensity, setIntensity] = useState("Medel");
  const act = CARDIO.find(c => c.id === id);
  const im = SPORT_INTENSITY[intensity];
  const hiit = id === "hiit";
  const load = computeCardioLoad(act, minutes, im, hiit);
  const preview = computeSportLoad(act, minutes, im, hiit);
  const topM = Object.entries(preview).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m]) => sv(m));
  const log = () => {
    const session = { id: "c_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: act.name, completedAt: Date.now(), sport: true, hiit, cardioLoad: load, muscleLoads: preview, source: "sport", sets: [] };
    ctx.setSessions(s => [...s, session]);
    ctx.setQueue(q => [...q, session.id]);
    onClose();
  };
  return (
    <div>
      <SheetTitle>Logga cardio</SheetTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        {CARDIO.map(c => (
          <button key={c.id} onClick={() => setId(c.id)} style={{ padding: "12px 4px", borderRadius: 12, border: `1px solid ${id === c.id ? c.color : C.border}`, background: id === c.id ? c.color + "22" : C.card2, color: C.text, cursor: "pointer", fontSize: 11.5, fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 20 }}>{c.icon}</span>{c.name}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 12 }}>
        <StepBox label="Minuter" value={minutes} onMinus={() => setMinutes(m => Math.max(5, m - 5))} onPlus={() => setMinutes(m => m + 5)} />
      </div>
      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>Intensitet</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {["Lätt", "Medel", "Hård"].map(k => (
          <button key={k} onClick={() => setIntensity(k)} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: `1px solid ${intensity === k ? C.blue : C.border}`, background: intensity === k ? "rgba(77,163,255,0.15)" : C.card2, color: intensity === k ? C.blue : C.text, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{k}</button>
        ))}
      </div>
      <div style={{ padding: "10px 12px", borderRadius: 10, background: C.card2, fontSize: 12.5, color: C.muted, marginBottom: 12 }}>
        Belastning ~{load} · mest: {topM.join(", ")}. Detta sänker din beredskap enligt intensitet och tid.
      </div>
      <button onClick={log} style={{ ...bigBtn, background: act.color, color: "#04120a" }}>Logga {act.name}</button>
    </div>
  );
}
function CheckinSheet({ ctx, onClose }) {
  return (
    <div>
      <SheetTitle>Daglig check-in</SheetTitle>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>Hur känns energi och återhämtning just nu? Din skattning justerar dagens beredskap.</div>
      <div style={{ display: "flex", gap: 8 }}>
        {[["low", "Låg", C.red], ["normal", "Normal", C.yellow], ["high", "Hög", C.green]].map(([k, l, c]) => (
          <button key={k} onClick={() => { ctx.setCheckin(k); ctx.setCheckins(l => [...(l || []), { id: `c_${Date.now()}`, ts: Date.now(), level: k }]); onClose(); }} style={{ flex: 1, padding: "16px 0", borderRadius: 12, border: `1px solid ${ctx.checkin === k ? c : C.border}`, background: ctx.checkin === k ? c + "22" : C.card2, color: ctx.checkin === k ? c : C.text, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>{l}</button>
        ))}
      </div>
    </div>
  );
}

function MusicSheet() {
  const [url, setUrl] = useState(() => load("spotify", ""));
  const openSpotify = () => { save("spotify", url); window.open(url || "spotify:", "_blank"); };
  return (
    <div>
      <SheetTitle>Träningsmusik</SheetTitle>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Klistra in en Spotify-länk till din spellista, så öppnar knappen den direkt i Spotify-appen.</div>
      <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://open.spotify.com/playlist/…" style={{ width: "100%", background: C.card2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, fontSize: 13 }} />
      <button onClick={openSpotify} style={{ ...bigBtn, marginTop: 12, background: C.green, color: "#04120a" }}>♫ Öppna i Spotify</button>
    </div>
  );
}

function CoachSheet({ ctx }) {
  const [q, setQ] = useState("");
  const [a, setA] = useState(null);
  const [hör, setHör] = useState(false);
  const [fel, setFel] = useState(null);
  const [taladeFråga, setTaladeFråga] = useState(false);
  const stoppa = useRef(null);
  const röstPå = !!(ctx.cues || {}).voiceInput && voiceSupport().ok;

  const lyssna = () => {
    if (hör) { stoppa.current && stoppa.current(); return; }
    setFel(null); setHör(true); setTaladeFråga(true);
    stoppa.current = createDictation({
      onResult: (text) => setQ(text),
      onError: (_k, t) => setFel(t),
      onEnd: () => { setHör(false); stoppa.current = null; },
    });
  };
  useEffect(() => () => { stoppa.current && stoppa.current(); }, []);
  const ask = () => { if (!q.trim()) return; const r = coachReply(q, { overallReadiness: ctx.overall, muscleStates: ctx.muscleStates, sessions: ctx.sessions, activeProgram: ctx.DEMO_PROGRAM, goalProfile: null, nutritionTotals: null, nutritionTargets: null, nutritionDays: 0, measurements: [] }); setA(r.text); if (taladeFråga) { speak(shortSpoken(r.text)); setTaladeFråga(false); } };
  return (
    <div>
      <SheetTitle>Fråga coachen</SheetTitle>
      <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && ask()} placeholder="Din fråga…" style={{ width: "100%", background: C.card2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, fontSize: 14 }} />
      {röstPå && (
        <button onClick={lyssna} style={{
          width: "100%", marginTop: 8, padding: "11px 13px", borderRadius: 11, cursor: "pointer",
          border: `1px solid ${hör ? C.purple : C.border}`, background: hör ? "rgba(155,124,255,0.16)" : C.card2,
          color: hör ? C.purple : C.muted, fontSize: 13.5, fontWeight: 600,
        }}>{hör ? "\u25CF Lyssnar \u2014 ställ din fråga" : "\u{1F3A4} Fråga med rösten"}</button>
      )}
      {fel && <div style={{ marginTop: 8, fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>{fel}</div>}
      <button onClick={ask} style={{ ...bigBtn, marginTop: 10 }}>Fråga</button>
      {a && <div style={{ marginTop: 14, padding: "12px 14px", background: C.card2, borderRadius: 12, fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{a}</div>}
    </div>
  );
}

// Sparar på riktigt. Tidigare visade den "Sparat" utan att lagra något — värre än att
// sakna funktionen, eftersom användaren tror att uppgiften finns kvar.
function ProgressSheet({ ctx }) {
  const { sessions = [], weights = [], notes = [] } = ctx;
  const now = Date.now(), WEEK = 6048e5;
  const done = sessions.filter(x => x && x.completedAt);
  const wk = done.filter(x => now - x.completedAt < WEEK);
  const prevWk = done.filter(x => now - x.completedAt >= WEEK && now - x.completedAt < WEEK * 2);
  const vol = list => Math.round(list.reduce((a, x) => a + (x.totalVolume || 0), 0));
  const fmt = ts => new Date(ts).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });

  if (!done.length) {
    return (
      <div>
        <SheetTitle>Framsteg</SheetTitle>
        <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.6 }}>
          Inga avslutade pass ännu. När du loggat ditt första pass visas volym, veckotrend och vikthistorik här.
        </div>
      </div>
    );
  }

  const thisVol = vol(wk), prevVol = vol(prevWk);
  const diff = prevVol > 0 ? Math.round((thisVol - prevVol) / prevVol * 100) : null;
  const firstW = weights[0], lastW = weights[weights.length - 1];
  const wDiff = weights.length >= 2 ? Math.round((lastW.kg - firstW.kg) * 10) / 10 : null;

  return (
    <div>
      <SheetTitle>Framsteg</SheetTitle>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <Stat v={done.length} l="pass totalt" />
        <Stat v={wk.length} l="senaste veckan" />
        <Stat v={thisVol >= 1000 ? `${(thisVol / 1000).toFixed(1)}t` : thisVol} l="volym 7 dgr" />
      </div>

      {diff !== null && (
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>MOT FÖRRA VECKAN</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: diff > 0 ? C.green : diff < 0 ? C.yellow : C.text }}>
            {diff > 0 ? "+" : ""}{diff}% volym
          </div>
        </Card>
      )}

      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>VIKT</div>
        {weights.length === 0
          ? <div style={{ fontSize: 13, color: C.muted }}>Ingen vikt registrerad ännu. Logga via ⚖ på startsidan.</div>
          : <>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{lastW.kg} kg</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                {wDiff === null ? `Registrerad ${fmt(lastW.ts)}` : `${wDiff > 0 ? "+" : ""}${wDiff} kg sedan ${fmt(firstW.ts)}`}
              </div>
            </>}
      </Card>

      <div style={{ fontSize: 12, color: C.muted, margin: "4px 0 8px" }}>SENASTE PASSEN</div>
      {done.slice(-5).reverse().map(x => (
        <div key={x.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
          <span>{x.title || "Pass"}</span>
          <span style={{ color: C.muted }}>{fmt(x.completedAt)}</span>
        </div>
      ))}

      {notes.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>SENASTE ANTECKNING</div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{notes[notes.length - 1].text}</div>
        </div>
      )}
    </div>
  );
}

function SimpleSheet({ title, label, placeholder, kind, ctx, multiline }) {
  const [v, setV] = useState("");
  const [saved, setSaved] = useState(null);
  const list = kind === "weight" ? ctx.weights : ctx.notes;

  const doSave = () => {
    const raw = v.trim();
    if (!raw) { setSaved({ ok: false, msg: "Skriv något först." }); return; }
    if (kind === "weight") {
      const kg = parseFloat(raw.replace(",", "."));
      if (!isFinite(kg) || kg < 25 || kg > 300) { setSaved({ ok: false, msg: "Ange en vikt mellan 25 och 300 kg." }); return; }
      ctx.setWeights(l => [...(l || []), { id: `w_${Date.now()}`, ts: Date.now(), kg: Math.round(kg * 10) / 10 }]);
      setSaved({ ok: true, msg: `✓ ${kg} kg sparat` });
    } else {
      ctx.setNotes(l => [...(l || []), { id: `n_${Date.now()}`, ts: Date.now(), text: raw }]);
      setSaved({ ok: true, msg: "✓ Anteckning sparad" });
    }
    setV("");
  };

  const fmt = ts => new Date(ts).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
  const recent = (list || []).slice(-3).reverse();

  return (
    <div>
      <SheetTitle>{title}</SheetTitle>
      <label style={{ fontSize: 12, color: C.muted }}>{label}</label>
      {multiline
        ? <textarea value={v} onChange={e => setV(e.target.value)} placeholder={placeholder} rows={3} style={{ width: "100%", background: C.card2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, fontSize: 14, marginTop: 6, resize: "none", fontFamily: "inherit" }} />
        : <input value={v} onChange={e => setV(e.target.value)} inputMode="decimal" placeholder={placeholder} style={{ width: "100%", background: C.card2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, fontSize: 14, marginTop: 6 }} />}
      <button onClick={doSave} style={{ ...bigBtn, marginTop: 12 }}>Spara</button>
      {saved && <div style={{ marginTop: 10, fontSize: 13, color: saved.ok ? C.green : C.yellow }}>{saved.msg}</div>}
      {recent.length > 0 && (
        <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>SENAST</div>
          {recent.map(x => (
            <div key={x.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, padding: "5px 0", color: C.text }}>
              <span style={{ color: C.muted }}>{fmt(x.ts)}</span>
              <span style={{ textAlign: "right" }}>{kind === "weight" ? `${x.kg} kg` : x.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FoodSheet({ ctx, onClose }) {
  const [mode, setMode] = useState("log");
  const [text, setText] = useState("");
  const t0 = startOfLocalDay(Date.now());
  const today = (ctx.foodLog || []).filter(e => e.ts >= t0);
  const kcalToday = today.reduce((s, e) => s + (e.kcal || 0), 0);
  const proteinToday = Math.round(today.reduce((s, e) => s + (e.protein || 0), 0));
  const addEntry = entry => ctx.setFoodLog(l => [...l, { id: "mf_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), ts: Date.now(), ...entry }]);
  const removeEntry = id => ctx.setFoodLog(l => l.filter(e => e.id !== id));
  const quickLog = () => {
    const t = text.trim(); if (!t) return;
    const est = estimateMeal(t);
    addEntry({ name: t, kcal: est.kcal, protein: est.protein, carbs: est.carbs, fat: est.fat, estimateLow: est.estimateLow, estimateHigh: est.estimateHigh, quality: "estimated", source: "estimate" });
    setText("");
  };
  if (mode === "scan") return <BarcodeSheet onLog={addEntry} onBack={() => setMode("log")} />;
  return (
    <div>
      <SheetTitle>Logga mat</SheetTitle>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && quickLog()} placeholder="t.ex. kyckling & ris" style={{ flex: 1, background: C.card2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, fontSize: 14 }} />
        <button onClick={quickLog} style={{ ...bigBtn, width: "auto", padding: "0 18px", marginTop: 0 }}>Logga</button>
      </div>
      <button onClick={() => setMode("scan")} style={{ ...ghostBtnLg, width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: 7 }}><Icon name="camera" size={16} /> Skanna streckkod</button>
      {today.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: C.muted, marginBottom: 8, letterSpacing: 0.5 }}><span>IDAG</span><span>{kcalToday} kcal · {proteinToday} g protein</span></div>
          {today.slice().reverse().map(e => (
            <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 11px", background: C.card2, borderRadius: 10, marginBottom: 5 }}>
              <div><span style={{ fontSize: 13.5, color: C.text }}>{e.name}</span><span style={{ fontSize: 11.5, color: C.muted }}> · {e.kcal} kcal</span></div>
              <button onClick={() => removeEntry(e.id)} style={{ background: "none", border: "none", color: C.muted, fontSize: 17, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BarcodeSheet({ onLog, onBack }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [grams, setGrams] = useState(100);
  const [camState, setCamState] = useState("idle"); // idle|on|unsupported|denied
  const [uf, setUf] = useState({ name: "", kcal: "", protein: "", carbs: "", fat: "", code: "" });
  const videoRef = useRef(null);

  const doLookup = async c => {
    const bc = (c || "").trim(); if (!bc) return;
    setLoading(true); setNotFound(false); setResult(null);
    try { const p = await lookupBarcode(bc); if (p && (p.kcal || p.protein || p.carbs || p.fat)) setResult(p); else { setNotFound(true); setUf(u => ({ ...u, code: bc })); } }
    catch (e) { setNotFound(true); setUf(u => ({ ...u, code: bc })); }
    setLoading(false);
  };

  useEffect(() => {
    if (camState !== "on") return;
    let stream, raf, det, stop = false;
    (async () => {
      try {
        if (!("BarcodeDetector" in window)) { setCamState("unsupported"); return; }
        det = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        const tick = async () => {
          if (stop) return;
          try { const codes = await det.detect(videoRef.current); if (codes && codes.length) { setCamState("idle"); doLookup(codes[0].rawValue); return; } } catch (e) { }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch (e) { setCamState("denied"); }
    })();
    return () => { stop = true; if (raf) cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, [camState]);

  const logIt = (name, m) => { const k = grams / 100; onLog({ name, kcal: Math.round(m.kcal * k), protein: Math.round((m.protein || 0) * k), carbs: Math.round((m.carbs || 0) * k), fat: Math.round((m.fat || 0) * k), quality: m.q || "external", source: m.source || "off", barcode: m.code }); onBack(); };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.blue, fontSize: 15, cursor: "pointer", padding: 0 }}>‹ Tillbaka</button>
        <SheetTitle>Skanna streckkod</SheetTitle>
      </div>

      {!result && !notFound && (
        <>
          <div style={{ background: "#000", borderRadius: 12, aspectRatio: "4/3", overflow: "hidden", position: "relative", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: camState === "on" ? "block" : "none" }} />
            {camState !== "on" && (
              <div style={{ textAlign: "center", padding: 20 }}>
                <div style={{ fontSize: 32, marginBottom: 8, color: "#bbb", display: "flex", justifyContent: "center" }}><Icon name="camera" size={32} /></div>
                {camState === "unsupported" ? <div style={{ fontSize: 12.5, color: "#bbb", lineHeight: 1.5 }}>Kameraskanning stöds inte i den här webbläsaren (t.ex. iPhone). Skriv in streckkoden nedan.</div>
                  : camState === "denied" ? <div style={{ fontSize: 12.5, color: "#bbb", lineHeight: 1.5 }}>Ingen kameraåtkomst. Kräver en hostad HTTPS-sida. Skriv in streckkoden nedan.</div>
                    : <button onClick={() => setCamState("on")} style={{ ...bigBtn, width: "auto", padding: "12px 20px", marginTop: 0 }}>Starta kamera</button>}
              </div>
            )}
            {camState === "on" && <div style={{ position: "absolute", left: "12%", right: "12%", top: "45%", height: 2, background: C.red, boxShadow: `0 0 8px ${C.red}` }} />}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>…eller skriv in streckkoden (EAN/UPC):</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} onKeyDown={e => e.key === "Enter" && doLookup(code)} placeholder="7310865004703" inputMode="numeric" style={{ flex: 1, background: C.card2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, fontSize: 14 }} />
            <button onClick={() => doLookup(code)} disabled={loading} style={{ ...bigBtn, width: "auto", padding: "0 18px", marginTop: 0 }}>{loading ? "Söker…" : "Slå upp"}</button>
          </div>
        </>
      )}

      {result && (
        <>
          <div style={{ padding: "14px 15px", background: C.card2, borderRadius: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>◐ Open Food Facts · streckkod {result.code}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{result.name}</div>
            {result.brand && <div style={{ fontSize: 12.5, color: C.muted }}>{result.brand}</div>}
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 8 }}>Per 100 g: {result.kcal} kcal · {result.protein} g P · {result.carbs} g K · {result.fat} g F</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>Extern produktdata — ej verifierad av ATLAS (ODbL).</div>
          </div>
          <div style={{ marginBottom: 12 }}><StepBox label="Mängd (g)" value={grams} onMinus={() => setGrams(g => Math.max(10, g - 10))} onPlus={() => setGrams(g => g + 10)} /></div>
          <button onClick={() => logIt(result.brand ? `${result.name} (${result.brand})` : result.name, { ...result, q: "external" })} style={bigBtn}>Logga ({Math.round(result.kcal * grams / 100)} kcal)</button>
          <button onClick={() => { setResult(null); setCode(""); }} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", fontSize: 13, marginTop: 10 }}>‹ Skanna en till</button>
        </>
      )}

      {notFound && (
        <>
          <div style={{ padding: "12px 14px", background: "rgba(255,209,102,0.1)", borderRadius: 10, marginBottom: 12, fontSize: 12.5, color: C.text, lineHeight: 1.5 }}>Produkten hittades inte för streckkod {uf.code}. Skriv in värdena från förpackningen (per 100 g) — jag sparar den som din egen produkt.</div>
          <input value={uf.name} onChange={e => setUf({ ...uf, name: e.target.value })} placeholder="Produktnamn" style={{ width: "100%", background: C.card2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, padding: 11, fontSize: 14, marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {[["kcal", "kcal"], ["protein", "P"], ["carbs", "K"], ["fat", "F"]].map(([k, l]) => (
              <input key={k} value={uf[k]} onChange={e => setUf({ ...uf, [k]: e.target.value.replace(/[^\d.]/g, "") })} placeholder={l} inputMode="decimal" style={{ width: "25%", background: C.card2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, fontSize: 13, textAlign: "center" }} />
            ))}
          </div>
          <div style={{ marginBottom: 12 }}><StepBox label="Mängd (g)" value={grams} onMinus={() => setGrams(g => Math.max(10, g - 10))} onPlus={() => setGrams(g => g + 10)} /></div>
          <button onClick={() => { if (!uf.name.trim()) return; logIt(uf.name.trim(), { kcal: +uf.kcal || 0, protein: +uf.protein || 0, carbs: +uf.carbs || 0, fat: +uf.fat || 0, code: uf.code, q: "user_confirmed", source: "user" }); }} style={bigBtn}>Logga produkten</button>
          <button onClick={() => { setNotFound(false); setCode(""); }} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", fontSize: 13, marginTop: 10 }}>‹ Tillbaka</button>
        </>
      )}
    </div>
  );
}

// GPS-spårat utepass. Använder telefonens riktiga sensorer:
// Geolocation (sträcka/tempo), Wake Lock (skärmen tänd) och accelerometern (stegskattning).
// Ärligt: stegen räknas bara medan passet är igång — en webbapp kan inte läsa telefonens
// dagliga stegräknare (Hälsa/Google Fit), den är stängd för webben.
const GPS_ACTS = ["lopning", "gang", "cykling"];
function haversine(a, b) {
  const R = 6371000, t = x => x * Math.PI / 180;
  const dLat = t(b.lat - a.lat), dLon = t(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(t(a.lat)) * Math.cos(t(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function GPSSheet({ ctx, onClose }) {
  const [actId, setActId] = useState("lopning");
  const [state, setState] = useState("idle");        // idle|running|done|denied|unsupported
  const [dist, setDist] = useState(0);               // meter
  const [secs, setSecs] = useState(0);
  const [steps, setSteps] = useState(0);
  const [acc, setAcc] = useState(null);
  const [stepsOn, setStepsOn] = useState(false);
  const [bpm, setBpm] = useState(null);
  const [hrName, setHrName] = useState(null);
  const [hrErr, setHrErr] = useState(null);
  const watchRef = useRef(null), lastRef = useRef(null), wakeRef = useRef(null), t0Ref = useRef(null), hrRef = useRef(null), hrSamples = useRef([]);
  const act = CARDIO.find(c => c.id === actId) || CARDIO[0];

  // Klocka
  useEffect(() => {
    if (state !== "running") return;
    const iv = setInterval(() => setSecs(Math.round((Date.now() - t0Ref.current) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [state]);

  // Stegskattning via accelerometern — bara medan passet är igång.
  useEffect(() => {
    if (state !== "running" || !stepsOn) return;
    let last = 0, lastPeak = 0, filtered = 0;
    const onMotion = e => {
      const a = e.accelerationIncludingGravity; if (!a) return;
      const mag = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
      filtered = filtered * 0.8 + mag * 0.2;                     // lågpassfilter mot brus
      const now = Date.now();
      if (filtered > 11.5 && last <= 11.5 && now - lastPeak > 260) { lastPeak = now; setSteps(s => s + 1); }
      last = filtered;
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [state, stepsOn]);

  const connectHR = async () => {
    setHrErr(null);
    if (!bluetoothSupported()) { setHrErr("Pulsband kräver Web Bluetooth, som finns i Chrome på Android men inte på iPhone."); return; }
    try {
      const h = await connectHeartRate({
        onBpm: b => { setBpm(b); hrSamples.current.push(b); },
        onDisconnect: () => { setHrName(null); setBpm(null); },
      });
      hrRef.current = h; setHrName(h.name);
    } catch (e) { setHrErr(String(e && e.message) === "unsupported" ? "Web Bluetooth saknas i den här webbläsaren." : "Ingen anslutning — kontrollera att bandet är på och inte redan kopplat till en annan app."); }
  };

  const keepAwake = async () => {
    try { if ("wakeLock" in navigator) wakeRef.current = await navigator.wakeLock.request("screen"); } catch (e) { /* skärmen får slockna */ }
  };

  const start = async () => {
    if (!navigator.geolocation) { setState("unsupported"); return; }
    // iOS kräver uttrycklig tillåtelse för rörelsesensorn, och bara från en knapptryckning.
    try {
      if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
        const p = await DeviceMotionEvent.requestPermission(); setStepsOn(p === "granted");
      } else if (typeof DeviceMotionEvent !== "undefined") setStepsOn(true);
    } catch (e) { setStepsOn(false); }
    t0Ref.current = Date.now(); setDist(0); setSecs(0); setSteps(0); lastRef.current = null;
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lon, accuracy } = pos.coords;
        setAcc(Math.round(accuracy));
        if (accuracy > 35) return;                                // för osäker punkt — hoppa över
        const p = { lat, lon };
        if (lastRef.current) { const d = haversine(lastRef.current, p); if (d >= 4) { setDist(x => x + d); lastRef.current = p; } }
        else lastRef.current = p;
      },
      err => setState(err.code === 1 ? "denied" : "unsupported"),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );
    keepAwake();
    setState("running");
  };

  const stop = () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    if (hrRef.current) { try { hrRef.current.disconnect(); } catch (e) { } hrRef.current = null; }
    if (wakeRef.current) { try { wakeRef.current.release(); } catch (e) { } wakeRef.current = null; }
    setState("done");
  };

  const save = () => {
    const minutes = Math.max(1, Math.round(secs / 60));
    const km = dist / 1000;
    const paceMin = km > 0 ? (secs / 60) / km : null;
    // Intensitet skattas ur tempot när det finns — annars medel.
    let intensity = "Medel";
    if (paceMin && actId === "lopning") intensity = paceMin < 5 ? "Hård" : paceMin > 7 ? "Lätt" : "Medel";
    if (paceMin && actId === "gang") intensity = paceMin < 10 ? "Hård" : paceMin > 14 ? "Lätt" : "Medel";
    const im = SPORT_INTENSITY[intensity];
    const load = computeCardioLoad(act, minutes, im, false);
    const session = {
      id: "g_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: act.name + (km >= 0.1 ? ` ${km.toFixed(2)} km` : ""), completedAt: Date.now(), sport: true, hiit: false,
      cardioLoad: load, muscleLoads: computeSportLoad(act, minutes, im, false), source: "gps", sets: [],
      distanceKm: Math.round(km * 100) / 100, durationMin: minutes, steps: steps || null, intensity,
      ...(hrSamples.current.length ? { avgHr: hrSummary(hrSamples.current).avg, maxHr: hrSummary(hrSamples.current).max } : {}),
    };
    ctx.setSessions(s => [...s, session]);
    ctx.setQueue(q => [...q, session.id]);
    onClose();
  };

  const km = dist / 1000, mm = Math.floor(secs / 60), ss = String(secs % 60).padStart(2, "0");
  const pace = km > 0.05 ? (secs / 60) / km : null;
  const Stat = ({ label, value, sub }) => (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ fontSize: 25, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: C.muted, marginTop: 3, letterSpacing: 0.4 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <div>
      <SheetTitle>Utepass med GPS</SheetTitle>
      {state === "idle" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
            {CARDIO.filter(c => GPS_ACTS.includes(c.id)).map(c => (
              <button key={c.id} onClick={() => setActId(c.id)} style={{ padding: "13px 4px", borderRadius: 12, border: `1px solid ${actId === c.id ? c.color : C.border}`, background: actId === c.id ? c.color + "22" : C.card2, color: C.text, cursor: "pointer", fontSize: 11.5, fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 20 }}>{c.icon}</span>{c.name}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.55, marginBottom: 14 }}>
            Telefonens GPS mäter sträcka och tempo, och skärmen hålls tänd under passet. Stegen skattas med rörelsesensorn medan passet är igång — appen kan inte läsa telefonens dagliga stegräknare.
          </div>
          {bluetoothSupported() && <button onClick={connectHR} style={{ ...ghostBtnLg, width: "100%", marginBottom: 8 }}>{hrName ? `❤ ${hrName} anslutet` : "❤ Anslut pulsband"}</button>}
          {hrErr && <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginBottom: 10 }}>{hrErr}</div>}
          <button onClick={start} style={bigBtn}>Starta passet</button>
        </>
      )}

      {(state === "running" || state === "done") && (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            <Stat label="KM" value={km.toFixed(2)} />
            <Stat label="TID" value={`${mm}:${ss}`} />
            <Stat label={actId === "cykling" ? "KM/H" : "MIN/KM"} value={actId === "cykling" ? (secs > 0 ? (km / (secs / 3600)).toFixed(1) : "—") : (pace ? `${Math.floor(pace)}:${String(Math.round((pace % 1) * 60)).padStart(2, "0")}` : "—")} />
            {stepsOn && <Stat label="STEG" value={steps} sub="ungefärligt" />}
            {bpm != null && <Stat label="PULS" value={bpm} sub="slag/min" />}
          </div>
          {state === "running" ? (
            <>
              <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 12, textAlign: "center" }}>
                {acc == null ? "Söker GPS-signal…" : `GPS-noggrannhet ±${acc} m`}{acc != null && acc > 35 ? " — väntar på bättre signal" : ""}
              </div>
              <button onClick={stop} style={{ ...bigBtn, background: C.red }}>Avsluta</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55, marginBottom: 12 }}>Passet sparas som {act.name.toLowerCase()} och räknas in i din belastning och återhämtning.</div>
              <button onClick={save} style={bigBtn}>Spara passet</button>
              <button onClick={onClose} style={{ ...ghostBtnLg, width: "100%", marginTop: 8 }}>Släng</button>
            </>
          )}
        </>
      )}

      {(state === "denied" || state === "unsupported") && (
        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
          {state === "denied"
            ? "Ingen åtkomst till platsinformation. Tillåt platsdelning för sidan i webbläsarens inställningar och försök igen."
            : "GPS finns inte tillgängligt här. Det kräver att appen körs över HTTPS på en telefon — logga passet manuellt under Cardio så länge."}
        </div>
      )}
    </div>
  );
}


function CuesSheet({ ctx, onClose }) {
  const cues = ctx.cues || DEFAULT_CUES;
  const set = (k, v) => ctx.setCues({ ...cues, [k]: v });
  const röst = voiceSupport();
  const [notifState, setNotifState] = useState(notificationState());
  const askNotif = async () => { const p = await requestNotifications(); setNotifState(p); set("notify", p === "granted"); };
  const Row = ({ k, label, desc, on, onToggle }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2, lineHeight: 1.45 }}>{desc}</div>
      </div>
      <button onClick={onToggle} style={{ padding: "6px 14px", borderRadius: 999, border: `1px solid ${on ? C.blue : C.border}`, background: on ? C.blue : "transparent", color: on ? "#08101c" : C.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{on ? "På" : "Av"}</button>
    </div>
  );
  return (
    <div>
      <SheetTitle>Signaler i passet</SheetTitle>
      <Row label="Ljudsignal" desc="Pip när vilan är slut. Fungerar på alla telefoner." on={cues.sound !== false} onToggle={() => set("sound", cues.sound === false)} />
      <Row label="Talad cue" desc={'Säger "vilan är slut" — bra när telefonen ligger på golvet.'} on={!!cues.voice} onToggle={() => { const nv = !cues.voice; set("voice", nv); if (nv) speak("Så här låter det"); }} />
      <Row label="Vibration" desc="Fungerar på Android; iPhone saknar stöd för vibration i webbappar." on={cues.vibrate !== false} onToggle={() => set("vibrate", cues.vibrate === false)} />
      <Row label="Notis" desc={notifState === "unsupported" ? "Stöds inte i den här webbläsaren." : notifState === "denied" ? "Nekad — tillåt notiser för sidan i webbläsarens inställningar." : "Når fram även när appen inte är i förgrunden. På iPhone krävs att appen lagts till på hemskärmen."} on={!!cues.notify && notifState === "granted"} onToggle={() => { if (notifState === "granted") set("notify", !cues.notify); else askNotif(); }} />
      <button onClick={() => { playBeep({ times: 2 }); if (cues.voice) speak("Vilan är slut"); }} style={{ ...ghostBtnLg, width: "100%", marginTop: 14 }}>Testa signalen</button>

      <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", color: C.muted, marginBottom: 10 }}>Inmatning</div>
        <Row
          label="Röstinmatning"
          desc={röst.ok
            ? 'Säg vikt och reps under passet, t.ex. "åttio åtta". Rösten föreslår — du bekräftar innan setet sparas.'
            : röst.note}
          on={!!cues.voiceInput && röst.ok}
          onToggle={() => { if (röst.ok) set("voiceInput", !cues.voiceInput); }}
        />
        {röst.ok && cues.voiceInput && (
          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
            Fungerar bäst nära munnen och i lugn miljö — musik och skrammel drar ner träffsäkerheten.
            Säg <span style={{ color: C.text }}>"åttio åtta"</span>, <span style={{ color: C.text }}>"82,5 kilo 6 reps"</span> eller <span style={{ color: C.text }}>"samma igen"</span>.
            Igenkänningen kan behöva nät på vissa telefoner.
          </div>
        )}
      </div>
      <button onClick={onClose} style={{ ...bigBtn, marginTop: 8 }}>Klart</button>
    </div>
  );
}


function NFCSheet({ ctx, onClose }) {
  const [mode, setMode] = useState("scan");     // scan | write
  const [state, setState] = useState(nfcSupported() ? "idle" : "unsupported");
  const [found, setFound] = useState(null);
  const [err, setErr] = useState(null);
  const [pick, setPick] = useState(MACHINE_TYPES[0] ? MACHINE_TYPES[0].id : "");
  const stopRef = useRef(null);

  useEffect(() => () => { if (stopRef.current) stopRef.current(); }, []);

  const startScan = async () => {
    setErr(null); setFound(null);
    try {
      stopRef.current = await scanTags({
        onTag: t => { const m = MACHINE_TYPES.find(x => x.id === t.id); setFound(m || { id: t.id, name: t.id }); setState("found"); },
        onError: msg => setErr(msg),
      });
      setState("scanning");
    } catch (e) { setState("unsupported"); }
  };

  const program = async () => {
    setErr(null);
    try { await writeTag("machine", pick); setState("written"); }
    catch (e) { setErr("Kunde inte skriva till taggen. Håll telefonen mot en tom NFC-tagg och försök igen."); }
  };

  const logIt = () => {
    if (!found) return;
    const t = MACHINE_TYPES.find(x => x.id === found.id);
    const session = {
      id: "n_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: (t && t.name) || found.name, completedAt: Date.now(), source: "nfc", sets: [],
      muscleLoads: {}, machineTypeId: found.id,
    };
    ctx.setSessions(s => [...s, session]);
    ctx.setQueue(q => [...q, session.id]);
    onClose();
  };

  if (state === "unsupported") return (
    <div>
      <SheetTitle>NFC-taggar</SheetTitle>
      <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
        NFC fungerar i Chrome på Android men inte på iPhone — Apple har inte lagt in stödet i webbläsaren. Välj maskin manuellt i webbappen så länge.
      </div>
      <button onClick={onClose} style={{ ...bigBtn, marginTop: 14 }}>Stäng</button>
    </div>
  );

  return (
    <div>
      <SheetTitle>NFC-taggar</SheetTitle>
      <div style={{ display: "flex", gap: 4, background: C.card2, borderRadius: 10, padding: 4, marginBottom: 14 }}>
        {[["scan", "Skanna"], ["write", "Programmera"]].map(([k, lab]) => (
          <button key={k} onClick={() => { setMode(k); setState("idle"); setFound(null); setErr(null); }} style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: mode === k ? C.blue : "transparent", color: mode === k ? "#08101c" : C.muted }}>{lab}</button>
        ))}
      </div>

      {mode === "scan" ? (
        <>
          {state === "found" ? (
            <>
              <div style={{ padding: "14px", background: C.card2, borderRadius: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>MASKIN</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{found.name}</div>
              </div>
              <button onClick={logIt} style={bigBtn}>Logga passet här</button>
              <button onClick={() => { setFound(null); setState("scanning"); }} style={{ ...ghostBtnLg, width: "100%", marginTop: 8 }}>Skanna en till</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55, marginBottom: 14 }}>
                {state === "scanning" ? "Håll telefonens baksida mot maskinens tagg…" : "Sätt en NFC-tagg på maskinen en gång, så känner appen igen den för alltid."}
              </div>
              {state !== "scanning" && <button onClick={startScan} style={bigBtn}>Börja skanna</button>}
              {state === "scanning" && <div style={{ textAlign: "center", fontSize: 34, padding: "18px 0" }}>📶</div>}
            </>
          )}
        </>
      ) : (
        <>
          {state === "written" ? (
            <>
              <div style={{ fontSize: 13.5, color: C.green, lineHeight: 1.6, marginBottom: 14 }}>✓ Taggen är programmerad. Fäst den på maskinen — nästa gång räcker det att hålla telefonen mot den.</div>
              <button onClick={() => setState("idle")} style={bigBtn}>Programmera en till</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Vilken maskin är taggen till?</div>
              <select value={pick} onChange={e => setPick(e.target.value)} style={{ width: "100%", background: C.card2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 12 }}>
                {MACHINE_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginBottom: 14 }}>Håll telefonen mot en tom NFC-tagg när du trycker. Taggar av typen NTAG213 fungerar bra och kostar några kronor styck.</div>
              <button onClick={program} style={bigBtn}>Skriv till tagg</button>
            </>
          )}
        </>
      )}
      {err && <div style={{ fontSize: 12, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>{err}</div>}
    </div>
  );
}


// Installationsråd — visas bara när det faktiskt behövs, och kan avfärdas.
function InstallCard({ onDismiss }) {
  const [open, setOpen] = useState(false);
  const adv = installAdvice();
  if (!adv.needed) return null;
  return (
    <div style={{ marginTop: 12, padding: "13px 14px", background: "rgba(77,163,255,0.10)", border: `1px solid ${C.blue}44`, borderRadius: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>Lägg ATLAS på hemskärmen</div>
          <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginTop: 4 }}>{adv.why}</div>
        </div>
        <button onClick={onDismiss} aria-label="Stäng" style={{ background: "none", border: "none", color: C.muted, fontSize: 17, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
      </div>
      {open ? (
        <ol style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 12, color: C.text, lineHeight: 1.7 }}>
          {adv.steps.map((st, i) => <li key={i}>{st}</li>)}
        </ol>
      ) : (
        <button onClick={() => setOpen(true)} style={{ marginTop: 9, background: "none", border: "none", color: C.blue, fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: 0 }}>Visa hur ›</button>
      )}
    </div>
  );
}

// Ärlig översikt: vad just den här telefonen klarar.
function CapsSheet({ onClose }) {
  const caps = capabilities();
  const ok = caps.filter(c => c.ok).length;
  // Byggstämpeln syns här så man kan avgöra OM en uppdatering faktiskt landat.
  // Utan den är "det gick väldigt fort" omöjligt att skilja från "ingenting hände".
  const bygge = typeof __ATLAS_BUILD__ !== "undefined" ? __ATLAS_BUILD__ : "okänt";
  const läsligt = /^\d{12}$/.test(bygge)
    ? `${bygge.slice(0,4)}-${bygge.slice(4,6)}-${bygge.slice(6,8)} ${bygge.slice(8,10)}:${bygge.slice(10,12)}`
    : bygge;
  return (
    <div>
      <SheetTitle>Vad din telefon klarar</SheetTitle>
      <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: C.card2, border: `1px solid ${C.border}`, fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
        Byggd <span style={{ color: C.text, fontWeight: 600 }}>{läsligt}</span> · {isStandalone() ? "körs som installerad app" : "körs i webbläsaren"}
        <div style={{ marginTop: 4 }}>Ändras inte tiden efter en omstart har uppdateringen inte landat.</div>
      </div>
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.55, marginBottom: 12 }}>
        {ok} av {caps.length} funktioner är tillgängliga här. ATLAS är ett och samma bygge — det som saknas beror på webbläsaren, inte på appen.
      </div>
      {caps.map(c => (
        <div key={c.id} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 14, color: c.ok ? C.green : C.muted, width: 16, flexShrink: 0 }}>{c.ok ? "✓" : "—"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, color: c.ok ? C.text : C.muted, fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.45, marginTop: 2 }}>{c.note}</div>
          </div>
        </div>
      ))}
      <button onClick={onClose} style={{ ...bigBtn, marginTop: 14 }}>Klart</button>
    </div>
  );
}

// ════════ delade byggstenar ════════
function Header({ title, sub, right, onBack }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {onBack
          ? <button onClick={onBack} aria-label="Tillbaka" title="Tillbaka" style={{ width: 42, height: 42, borderRadius: 12, border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          : <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg,${C.blue},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18 }}>A</div>}
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1, color: C.muted, textTransform: "uppercase" }}>{sub}</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{title}</div>
        </div>
      </div>
      {right}
    </div>
  );
}
function Card({ children, style }) { return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, ...style }}>{children}</div>; }
function Ring({ value, color }) {
  const r = 30, circ = 2 * Math.PI * r, pct = value == null ? 0 : value / 100;
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" style={{ flexShrink: 0 }}>
      <circle cx="38" cy="38" r={r} fill="none" stroke={C.border} strokeWidth="7" />
      <circle cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} transform="rotate(-90 38 38)" />
      <text x="38" y="38" textAnchor="middle" dominantBaseline="central" fill={C.text} fontSize="20" fontWeight="800">{value == null ? "—" : value}</text>
      <text x="38" y="52" textAnchor="middle" fill={C.muted} fontSize="8">/100</text>
    </svg>
  );
}
function BodyMini({ muscleStates }) {
  // enkel silhuett med glödmarkörer (undviker den tunga chamber-SvgBody i mobilen)
  return (
    <div style={{ position: "relative", height: 250, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <svg viewBox="0 0 120 250" height="240">
        <defs><radialGradient id="glowG"><stop offset="0%" stopColor={C.green} stopOpacity="0.5" /><stop offset="100%" stopColor={C.green} stopOpacity="0" /></radialGradient>
          <radialGradient id="glowB"><stop offset="0%" stopColor={C.blue} stopOpacity="0.4" /><stop offset="100%" stopColor={C.blue} stopOpacity="0" /></radialGradient></defs>
        <ellipse cx="60" cy="120" rx="55" ry="115" fill="none" stroke={C.blue} strokeWidth="0.5" opacity="0.25" />
        <circle cx="60" cy="26" r="13" fill={C.card2} stroke={C.border} />
        <rect x="42" y="40" width="36" height="60" rx="14" fill={C.card2} stroke={C.border} />
        <rect x="47" y="98" width="26" height="80" rx="10" fill={C.card2} stroke={C.border} />
        <rect x="30" y="44" width="14" height="55" rx="7" fill={C.card2} stroke={C.border} />
        <rect x="76" y="44" width="14" height="55" rx="7" fill={C.card2} stroke={C.border} />
        <ellipse cx="60" cy="58" rx="26" ry="12" fill="url(#glowG)" />
        <ellipse cx="60" cy="150" rx="24" ry="30" fill="url(#glowB)" />
      </svg>
    </div>
  );
}
function TabBar({ setSheet, startWorkout }) {
  const tabs = [["Hem", "⌂", true], ["Mat", "apple", false, "food"], ["Träna", "dumbbell", false, "train"], ["Progress", "↗", false, "progress"], ["Coach", "✦", false, "coach"]];
  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, maxWidth: 480, margin: "0 auto", display: "flex", gap: 6, padding: "8px 10px 12px", background: C.card, borderTop: `1px solid ${C.border}` }}>
      {tabs.map(([l, ic, active, act]) => (
        <button key={l} onClick={() => act === "train" ? startWorkout() : act ? setSheet(act) : null} style={{ flex: 1, padding: "8px 0", borderRadius: 12, border: "none", background: active ? "rgba(77,163,255,0.18)" : "transparent", color: active ? C.blue : C.muted, fontSize: 11, cursor: "pointer" }}>
          <div style={{ fontSize: 16, display: "flex", justifyContent: "center" }}><Icon name={ic} size={18} /></div>{l}
        </button>
      ))}
    </div>
  );
}
function Stat({ v, l }) { return <div style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 8px", textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800 }}>{v}</div><div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{l}</div></div>; }
function Pill({ children, color }) { return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 999, background: C.card2, border: `1px solid ${C.border}`, fontSize: 12.5 }}>{color && <span style={{ width: 7, height: 7, borderRadius: 4, background: color }} />}{children}</span>; }
function Badge({ children, onClick }) { return <button onClick={onClick} style={{ padding: "6px 12px", borderRadius: 999, border: `1px solid ${C.blue}55`, background: "rgba(77,163,255,0.12)", color: C.blue, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{children}</button>; }
function QuickBtn({ children, onClick }) { return <button onClick={onClick} style={{ flex: 1, padding: "14px 0", borderRadius: 12, border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{children}</button>; }

function PlacesSheet({ ctx, onClose }) {
  const places = ctx.places || [];
  const [läge, setLäge] = useState("idle");      // idle | hämtar | namnge | fel
  const [pos, setPos] = useState(null);
  const [namn, setNamn] = useState("");
  const [klubb, setKlubb] = useState("");
  const [fel, setFel] = useState(null);

  const hämta = async () => {
    setLäge("hämtar"); setFel(null);
    const r = await getPositionOnce();
    if (!r.ok) { setFel(r.note); setLäge("fel"); return; }
    setPos(r.pos); setLäge("namnge");
  };

  const spara = () => {
    const p = makePlace({ name: namn || "Mitt gym", pos, clubId: klubb || null });
    if (!p) { setFel("Kunde inte spara platsen."); setLäge("fel"); return; }
    ctx.setPlaces([...(places), p]);
    setLäge("idle"); setPos(null); setNamn(""); setKlubb("");
  };

  const taBort = id => ctx.setPlaces(places.filter(p => p.id !== id));

  return (
    <>
      <SheetTitle>Mina gym</SheetTitle>
      <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55, marginBottom: 14 }}>
        Stå på gymmet och spara platsen en gång. Nästa gång du öppnar ATLAS där känner den igen stället.
        Koordinaterna stannar i telefonen och skickas ingenstans.
      </div>

      {places.length > 0 && places.map(p => (
        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 13px", marginBottom: 8, borderRadius: 12, border: `1px solid ${C.border}`, background: C.card2 }}>
          <span style={{ fontSize: 17 }}>📍</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>{p.name}</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
              Radie {p.radius} m{p.accuracy != null ? ` · sparad med ±${p.accuracy} m noggrannhet` : ""}
            </div>
          </div>
          <button onClick={() => taBort(p.id)} style={{ background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer", padding: 6 }}>Ta bort</button>
        </div>
      ))}

      {läge === "namnge" ? (
        <div style={{ marginTop: 10, padding: 14, borderRadius: 12, border: `1px solid ${C.purple}66`, background: "rgba(155,124,255,0.08)" }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
            Position hittad{pos && pos.accuracy != null ? ` (±${Math.round(pos.accuracy)} m)` : ""}. Vad heter stället?
          </div>
          <input value={namn} onChange={e => setNamn(e.target.value)} placeholder="t.ex. Fitness24Seven Kista"
            style={{ width: "100%", padding: "11px 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 14, marginBottom: 8, boxSizing: "border-box" }} />
          <select value={klubb} onChange={e => setKlubb(e.target.value)}
            style={{ width: "100%", padding: "11px 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 14, marginBottom: 10, boxSizing: "border-box" }}>
            <option value="">Koppla till klubb (valfritt) — ger rätt maskinlista</option>
            {GYM_CLUBS.map(c => <option key={c.id} value={c.id}>{c.name} · {c.city}</option>)}
          </select>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={spara} style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: C.green, color: "#04120a", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Spara platsen</button>
            <button onClick={() => { setLäge("idle"); setPos(null); }} style={{ padding: "12px 16px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 14, cursor: "pointer" }}>Avbryt</button>
          </div>
        </div>
      ) : (
        <button onClick={hämta} disabled={läge === "hämtar"} style={{ ...ghostBtnLg, width: "100%", marginTop: places.length ? 6 : 0, opacity: läge === "hämtar" ? 0.6 : 1 }}>
          {läge === "hämtar" ? "Hämtar position…" : "+ Spara platsen jag står på"}
        </button>
      )}

      {fel && <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>{fel}</div>}

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.muted, lineHeight: 1.55 }}>
        ATLAS kan bara kolla positionen när appen är öppen — webbappar får inte köra positionsbevakning
        i bakgrunden. Den kan alltså inte säga till av sig själv när du kommer fram.
      </div>
    </>
  );
}

function SheetTitle({ children }) { return <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 8 }}>{children}</div>; }
function StepBox({ label, value, onMinus, onPlus }) {
  const step = { width: 48, height: 48, borderRadius: 12, border: `1px solid ${C.border}`, background: C.card2, color: C.blue, fontSize: 26, fontWeight: 700, cursor: "pointer", lineHeight: "1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, userSelect: "none" };
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={onMinus} style={step}>−</button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 19, fontWeight: 800 }}>{value}</div>
        <button onClick={onPlus} style={step}>+</button>
      </div>
    </div>
  );
}

const bigBtn = { width: "100%", padding: "16px", borderRadius: 14, border: "none", background: C.blue, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" };
const ghostBtn = { padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 13, cursor: "pointer" };
const ghostBtnLg = { padding: "16px 18px", borderRadius: 14, border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 15, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" };
const miniIn = { width: "100%", background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px", fontSize: 15, fontWeight: 600 };

// ── hjälpare ──
function lastWeight(sessions, exId) {
  for (let i = sessions.length - 1; i >= 0; i--) { const st = (sessions[i].sets || []).filter(s => s.exerciseId === exId && s.weight); if (st.length) return st[st.length - 1].weight; }
  return null;
}
function defaultWeight(exId) { const e = EXERCISES.find(x => x.id === exId); if (!e) return 20; if (e.loadMode === "bodyweight") return 0; return { Barbell: 60, Dumbbell: 20, Machine: 40, Cable: 25, "EZ Bar": 25, Kettlebell: 16, Bodyweight: 0 }[e.equipment] || 30; }
