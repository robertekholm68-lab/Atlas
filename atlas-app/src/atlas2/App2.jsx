// ATLAS 2.0 — nytt gränssnitt, samma sanning.
import { useEffect, useMemo, useState } from "react";
import { C, HFONT, BFONT, hdr, label, btnPrimary, btnGhost, statRow, statCell, orDash, DASH } from "./design.js";
import { load, save, bodyState, todaysMessage, weekSessions, lastSessionLabel, legacyAvailable, nextWorkout } from "./store.js";
import { AtlasLogo, FeatureIcon } from "../components/brand.jsx";
import { BodyMap2 } from "./BodyMap2.jsx";
import { Coach2 } from "./Coach2.jsx";
import { DEMO_SESSIONS, DEMO_PROGRAMS, DEMO_PROGRAM } from "../data/demo.js";

function Start({ onNext }) {
  const [sex, setSex] = useState(null);
  const [imageOk, setImageOk] = useState({ m: true, f: true });
  const image = k => new URL(`startsida-${k === "m" ? "man" : "kvinna"}.webp`, document.baseURI).href;
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "22px 20px 0" }}><AtlasLogo size={34} hfont={HFONT} /></div>
      <div style={{ position: "relative", height: 330, marginTop: 10, display: "flex", justifyContent: "center", overflow: "hidden" }}>
        {["m", "f"].map(k => imageOk[k] && (sex === null || sex === k) ? (
          <img key={k} src={image(k)} alt="" onError={() => setImageOk(v => ({ ...v, [k]: false }))}
            style={{ width: sex ? "78%" : "50%", height: "100%", objectFit: "cover", objectPosition: k === "m" ? "70% top" : "30% top", filter: "contrast(1.12) brightness(.9)" }} />
        ) : null)}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,10,10,.25),transparent 45%,#0A0A0A 100%)" }} />
        <div style={{ position: "absolute", bottom: 20, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 14 }}>
          {[["m", "Man"], ["f", "Kvinna"]].map(([k, text]) => (
            <button key={k} onClick={() => setSex(sex === k ? null : k)} style={{ minWidth: 132, padding: "13px 8px", borderRadius: 999, cursor: "pointer", fontFamily: HFONT, fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, border: `1px solid ${sex === k ? C.lime : C.text2}`, background: "rgba(10,10,10,.45)", color: sex === k ? C.lime : C.text }}>{text}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: "24px 20px 0" }}>
        <div style={hdr(40)}>Träna.</div><div style={hdr(40, C.lime)}>Utvecklas.</div><div style={hdr(40)}>Överträffa dig själv.</div>
        <div style={{ width: 62, height: 4, background: C.lime, margin: "20px 0 18px", borderRadius: 2 }} />
        <div style={{ fontSize: 15, color: C.text2, lineHeight: 1.7 }}>Se vad kroppen tål idag och vilket nästa beslut som ger mest effekt. Byggt på det du faktiskt loggar.</div>
      </div>
      <div style={{ display: "flex", margin: "28px 16px 0" }}>
        {[["body", "Muskelkarta"], ["bars", "Veckovolym"], ["shield", "Ärliga siffror"]].map(([ic, text], i) => (
          <div key={text} style={{ flex: 1, textAlign: "center", padding: "0 10px", borderLeft: i ? `1px solid ${C.border}` : "none" }}><FeatureIcon name={ic} size={30} accent={C.lime} /><div style={{ ...hdr(12), marginTop: 10 }}>{text}</div></div>
        ))}
      </div>
      <div style={{ padding: "30px 20px 26px", marginTop: "auto" }}><button onClick={() => onNext(sex)} style={btnPrimary}>Kom igång <span>→</span></button></div>
    </div>
  );
}

function ModeChoice({ onPick }) {
  const legacy = legacyAvailable();
  return (
    <div style={{ padding: "44px 20px", minHeight: "100vh", background: C.bg }}>
      <div style={hdr(27)}>Hur vill du börja?</div>
      <div style={{ fontSize: 13.5, color: C.muted, margin: "10px 0 26px", lineHeight: 1.6 }}>Demo och riktig historik hålls helt åtskilda.</div>
      {[["real", "Riktig profil", "Startar tomt och bygger allt på det du själv loggar."], ["demo", "Demo", "Visar exempeldata utan att blanda in den i din historik."]].map(([m, title, body]) => (
        <button key={m} onClick={() => onPick(m)} style={{ width: "100%", textAlign: "left", padding: 18, marginBottom: 12, borderRadius: 18, border: `1px solid ${C.border}`, background: C.card, color: C.text, cursor: "pointer" }}><div style={{ ...hdr(15), color: C.lime }}>{title}</div><div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55, marginTop: 6 }}>{body}</div></button>
      ))}
      {legacy && <div style={{ marginTop: 20, padding: 15, borderRadius: 14, border: `1px dashed ${C.border}`, fontSize: 12, color: C.muted }}>{legacy.sessions} gamla pass hittades. De rörs inte utan ett separat, bekräftat överföringssteg.</div>}
    </div>
  );
}

function BottomNav({ page, onChange }) {
  const items = [["home", "Hem", "body"], ["workout", "Pass", "bars"], ["food", "Mat", "body"], ["progress", "Framsteg", "bars"], ["coach", "Coachen", "shield"]];
  return (
    <nav style={{ position: "fixed", left: "50%", bottom: 0, transform: "translateX(-50%)", width: "100%", maxWidth: 480, zIndex: 40, display: "grid", gridTemplateColumns: "repeat(5,1fr)", background: "rgba(10,10,10,.96)", borderTop: `1px solid ${C.border}`, padding: "9px 6px calc(9px + env(safe-area-inset-bottom))" }}>
      {items.map(([id, text, icon]) => <button key={id} onClick={() => onChange(id)} style={{ border: 0, background: "none", color: page === id ? C.lime : C.muted, display: "grid", justifyItems: "center", gap: 5, fontSize: 10.5, cursor: "pointer" }}><FeatureIcon name={icon} size={19} color={page === id ? C.lime : C.muted} accent={page === id ? C.lime : C.muted} /><span>{text}</span></button>)}
    </nav>
  );
}

function Home({ sessions, activeProgram, onStart, onOpen }) {
  const now = Date.now();
  const { states, overall } = useMemo(() => bodyState(sessions, now), [sessions]);
  const message = todaysMessage(states, sessions.length);
  const next = activeProgram ? nextWorkout(activeProgram, sessions) : null;
  const week = weekSessions(sessions, now).length;
  const last = lastSessionLabel(sessions, now);
  const uncertain = overall != null && sessions.length < 3;
  const date = new Date(now).toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div style={{ padding: "16px 18px 110px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><AtlasLogo size={26} hfont={HFONT} tagline={null} /><button onClick={() => onOpen("menu")} style={{ border: 0, background: "none", color: C.text, fontSize: 24, cursor: "pointer" }}>•••</button></div>
      <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3, textTransform: "capitalize" }}>{date}</div>
      <div style={{ marginTop: 12 }}><BodyMap2 muscleStates={states} onSelect={() => onOpen("map")} height={300} /></div>
      <div style={{ textAlign: "center", fontSize: message.empty ? 15.5 : 18, fontWeight: 600, lineHeight: 1.45, margin: "12px 6px 0" }}>{message.text}</div>
      <button onClick={activeProgram ? onStart : () => onOpen("program")} style={{ ...btnPrimary, marginTop: 16 }}>{!activeProgram ? "Välj program" : message.empty ? "Starta första passet" : "Starta pass"}<span>→</span></button>
      <div style={{ textAlign: "center", fontSize: 12, color: C.muted, marginTop: 9 }}>{next ? `Föreslaget: ${next.workout.name}` : activeProgram ? "Inga pass kvar i veckan." : "Inget program valt än."}</div>
      <div style={{ ...statRow, marginTop: 20 }}>{[["Readiness", orDash(overall), uncertain ? "osäkert" : null], ["Veckans pass", sessions.length ? week : DASH], ["Senast", last || DASH]].map(([l, v, sub], i) => <div key={l} style={statCell(i)}><div style={label()}>{l}</div><div style={{ ...hdr(20), marginTop: 4 }}>{v}</div>{sub && <div style={{ fontSize: 10, color: C.muted }}>{sub}</div>}</div>)}</div>
    </div>
  );
}

function Placeholder({ title, onBack }) {
  return <div style={{ padding: "22px 18px 110px" }}><button onClick={onBack} style={{ border: 0, background: "none", color: C.text, fontSize: 24 }}>←</button><div style={{ ...hdr(28), marginTop: 24 }}>{title}</div><div style={{ marginTop: 12, color: C.muted, lineHeight: 1.6 }}>Den här kärnvyn byggs i nästa sprint med samma nya designsystem och samma datalager.</div></div>;
}

export function Atlas2() {
  const [step, setStep] = useState(() => load("mode", null) ? "app" : "start");
  const [mode, setMode] = useState(() => load("mode", null));
  const [profile, setProfile] = useState(() => load("profile", {}) || {});
  const [sessions, setSessions] = useState(() => load("sessions", []));
  const [programs, setPrograms] = useState(() => load("programs", []));
  const [activeProgramId, setActiveProgramId] = useState(() => load("activeProgramId", null));
  const [page, setPage] = useState("home");
  const [sheet, setSheet] = useState(null);

  useEffect(() => save("sessions", sessions), [sessions]);
  useEffect(() => save("programs", programs), [programs]);
  useEffect(() => save("activeProgramId", activeProgramId), [activeProgramId]);
  const activeProgram = programs.find(p => p.id === activeProgramId && !p.archived) || null;

  const pickMode = m => {
    setMode(m); save("mode", m);
    setSessions(m === "demo" ? DEMO_SESSIONS.slice() : []);
    setPrograms(m === "demo" ? DEMO_PROGRAMS.slice() : []);
    setActiveProgramId(m === "demo" ? DEMO_PROGRAM.id : null);
    setStep("app");
  };

  if (step === "start") return <Start onNext={sex => { const nextProfile = { ...profile, sex }; setProfile(nextProfile); save("profile", nextProfile); setStep("mode"); }} />;
  if (step === "mode") return <ModeChoice onPick={pickMode} />;

  const go = target => {
    if (["home", "coach"].includes(target)) setPage(target);
    else if (target === "workout") setSheet("workout");
    else setPage(target);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: BFONT, maxWidth: 480, margin: "0 auto" }}>
      {page === "home" && <Home sessions={sessions} activeProgram={activeProgram} onStart={() => setSheet("workout")} onOpen={go} />}
      {page === "coach" && <Coach2 sessions={sessions} profile={profile} onStart={() => setSheet("workout")} onBack={() => setPage("home")} />}
      {page === "food" && <Placeholder title="Mat" onBack={() => setPage("home")} />}
      {page === "progress" && <Placeholder title="Framsteg" onBack={() => setPage("home")} />}
      <BottomNav page={page} onChange={go} />
      {sheet && <div onClick={() => setSheet(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 60, display: "flex", alignItems: "flex-end" }}><div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: "18px 18px 28px" }}><div style={{ width: 42, height: 4, borderRadius: 2, background: C.border, margin: "0 auto 18px" }} /><div style={hdr(20)}>{sheet === "workout" ? "Pass" : sheet}</div><div style={{ fontSize: 13, color: C.muted, marginTop: 10, lineHeight: 1.6 }}>Passflödet kopplas in i nästa sprint. Ingen demodata eller ny beräkningslogik har lagts här.</div><button onClick={() => setSheet(null)} style={{ ...btnGhost, marginTop: 18 }}>Stäng</button></div></div>}
    </div>
  );
}

export default Atlas2;
