// FEATURE: Goals + Askr Mission (Målresa)
// Målfliken har två sektioner: Målresor och Enskilda mål. Målresor byggs OVANPÅ det
// befintliga målsystemet — delmål bär missionId (ingen duplicering), och att ta bort en
// målresa frikopplar delmålen men raderar dem aldrig.
import { useState } from "react";
import { Card, Icon } from "../../components/common/index.jsx";
import { daysLeft, goalProgress, currentWeight, latestMetric } from "../../engines/index.js";
import {
  MISSION_TYPES, MISSION_TYPE_LABEL, MISSION_PRIORITIES, PRIO_W,
  STATUS_LABEL, STATUS_COLOR, newMission, missionGoals, standaloneGoals,
  unlinkMissionGoals, missionAnalysis, missionCoachSummary, currentPhase,
} from "../../engines/mission.js";
import { GOAL_CATS } from "../../data/foods.js";
import { T, btn, input, lbl, modal, now, overlay } from "../../data/tokens.js";

// ── Delmåls-hjälpare (rena state-uppdateringar) ──────────────────────────────
const linkGoal = (setGoals, id, missionId, priority) => setGoals(gs => gs.map(g => g.id === id ? { ...g, missionId, missionPriority: priority || g.missionPriority || "Viktigt" } : g));
const setGoalPriority = (setGoals, id, priority) => setGoals(gs => gs.map(g => g.id === id ? { ...g, missionPriority: priority } : g));
const unlinkGoal = (setGoals, id) => setGoals(gs => gs.map(g => g.id === id ? { ...g, missionId: null, missionPriority: null } : g));

// ════════════════════════════════════════════════════════════════════════════
// ENSKILDA MÅL (befintligt system — oförändrat beteende)
// ════════════════════════════════════════════════════════════════════════════
function AddGoalModal({ onAdd, onClose, defaultCat }) {
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState(defaultCat || "Styrka");
  const [current, setCurrent] = useState("");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("kg");
  const [deadline, setDeadline] = useState("");
  const valid = title && current !== "" && target !== "";
  const add = () => {
    const c = parseFloat(current), t = parseFloat(target);
    onAdd({ id: `g${Date.now()}`, title, cat, start: c, current: c, target: t, unit, higher: t >= c, deadline });
  };
  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 20, fontWeight: 800 }}>Nytt mål</span>
          <button onClick={onClose} style={btn.icon}>×</button>
        </div>
        <label style={lbl}>Titel</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="t.ex. Marklyft 1RM" style={{ ...input, marginBottom: 12 }} />
        <label style={lbl}>Kategori</label>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {Object.keys(GOAL_CATS).map(k => (
            <button key={k} onClick={() => setCat(k)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, background: cat === k ? GOAL_CATS[k] : T.bg.raised, color: cat === k ? "#fff" : T.text.secondary }}>{k}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1 }}><label style={lbl}>Nu</label><input value={current} onChange={e => setCurrent(e.target.value)} type="number" style={input} /></div>
          <div style={{ flex: 1 }}><label style={lbl}>Mål</label><input value={target} onChange={e => setTarget(e.target.value)} type="number" style={input} /></div>
          <div style={{ flex: 1 }}><label style={lbl}>Enhet</label><input value={unit} onChange={e => setUnit(e.target.value)} style={input} /></div>
        </div>
        <label style={lbl}>Deadline (valfritt)</label>
        <input value={deadline} onChange={e => setDeadline(e.target.value)} type="date" style={{ ...input, marginBottom: 16 }} />
        <button onClick={add} disabled={!valid} style={{ ...btn.primary, width: "100%", opacity: valid ? 1 : 0.4 }}>Skapa mål</button>
      </div>
    </div>
  );
}

function GoalCard({ g, onRemove }) {
  const pct = g.noSource ? 0 : goalProgress(g), col = GOAL_CATS[g.cat] || T.accent.primary, dl = daysLeft(g.deadline);
  const done = pct >= 100;
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.text.primary }}>{g.title}</span>
            {done && <span style={{ fontSize: 11, color: T.accent.success }}>✓ uppnått</span>}
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: col, textTransform: "uppercase", border: `1px solid ${col}`, borderRadius: 10, padding: "2px 8px", display: "inline-block", marginTop: 5 }}>{g.cat}</span>
        </div>
        {onRemove && <button onClick={onRemove} style={{ background: "none", border: "none", color: T.text.muted, cursor: "pointer", fontSize: 15 }}>×</button>}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: T.text.primary }}>{g.noSource ? "—" : g.current}<span style={{ fontSize: 13, color: T.text.muted, fontWeight: 400 }}> {g.unit}</span></span>
        <span style={{ fontSize: 12, color: T.text.muted }}>mål {g.target} {g.unit}</span>
      </div>
      <div style={{ height: 8, background: T.bg.muted, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${col}, ${col}bb)`, borderRadius: 4, transition: "width 0.5s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 11, color: T.text.muted }}>{g.noSource ? "Ingen datakälla ännu" : `${pct}%`}</span>
        {dl != null && <span style={{ fontSize: 11, color: dl < 0 ? T.accent.danger : T.text.muted }}>{dl < 0 ? "försenat" : `${dl} dagar kvar`}</span>}
      </div>
    </Card>
  );
}

// Liten status-pill (målresans analys-statusar)
function StatusPill({ status, small }) {
  const c = STATUS_COLOR[status] || T.text.muted;
  return <span style={{ fontSize: small ? 10 : 11, fontWeight: 700, color: c, background: `${c}22`, border: `1px solid ${c}55`, borderRadius: 999, padding: small ? "1px 7px" : "2px 9px", whiteSpace: "nowrap" }}>{STATUS_LABEL[status] || status}</span>;
}
function PriorityChip({ p, onPick }) {
  const col = { "Avgörande": T.accent.danger, "Viktigt": T.accent.warning, "Stödjande": T.accent.primary, "Extra": T.text.muted }[p] || T.text.muted;
  if (!onPick) return <span style={{ fontSize: 10.5, fontWeight: 700, color: col, letterSpacing: 0.4 }}>{p}</span>;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {MISSION_PRIORITIES.map(x => (
        <button key={x} onClick={() => onPick(x)} style={{ ...btn.tag, fontSize: 10.5, padding: "3px 8px", background: p === x ? { "Avgörande": T.accent.danger, "Viktigt": T.accent.warning, "Stödjande": T.accent.primary, "Extra": T.bg.muted }[x] : T.bg.raised, color: p === x ? "#fff" : T.text.muted }}>{x}</button>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MÅLRESA — delmålsrad i detaljvyn (prioritet, status, frikoppling)
// ════════════════════════════════════════════════════════════════════════════
function MissionGoalRow({ report, setGoals }) {
  const { goal, priority, status, actual } = report;
  const col = GOAL_CATS[goal.cat] || T.accent.primary;
  return (
    <div style={{ background: T.bg.raised, borderRadius: 11, padding: "11px 13px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text.primary }}>{goal.title}</div>
          <div style={{ fontSize: 11, color: T.text.muted, marginTop: 2 }}>{goal.cat}{goal.live ? " · mäts automatiskt" : " · manuell inmatning"}{actual != null ? ` · ${actual}%` : ""}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <StatusPill status={status} small />
          <button onClick={() => unlinkGoal(setGoals, goal.id)} title="Frikoppla (raderar inte målet)" style={{ background: "none", border: "none", color: T.text.muted, cursor: "pointer", fontSize: 11 }}>frikoppla</button>
        </div>
      </div>
      <div style={{ height: 6, background: T.bg.muted, borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
        <div style={{ width: `${actual || 0}%`, height: "100%", background: col, borderRadius: 3 }} />
      </div>
      <PriorityChip p={priority} onPick={p => setGoalPriority(setGoals, goal.id, p)} />
    </div>
  );
}

// ── Länka befintligt fristående mål ──────────────────────────────────────────
function LinkGoalPicker({ goals, missionId, setGoals, onClose }) {
  const free = standaloneGoals(goals);
  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 18, fontWeight: 800 }}>Länka befintligt mål</span>
          <button onClick={onClose} style={btn.icon}>×</button>
        </div>
        {free.length === 0 && <div style={{ fontSize: 13, color: T.text.muted, padding: "10px 0" }}>Inga fristående mål att länka. Skapa ett nytt delmål i stället.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {free.map(g => (
            <button key={g.id} onClick={() => { linkGoal(setGoals, g.id, missionId, "Viktigt"); onClose(); }} style={{ textAlign: "left", background: T.bg.raised, border: `1px solid ${T.bg.muted}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer", color: T.text.primary }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{g.title}</div>
              <div style={{ fontSize: 11, color: T.text.muted }}>{g.cat} · mål {g.target} {g.unit}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Veckoavstämning (frivillig) ──────────────────────────────────────────────
function WeeklyCheckinModal({ onSave, onClose }) {
  const [energy, setEnergy] = useState(3);
  const [motivation, setMotivation] = useState(3);
  const [obstacles, setObstacles] = useState("");
  const [note, setNote] = useState("");
  const [priorityChange, setPriorityChange] = useState("");
  const Scale = ({ label, value, set }) => (
    <div style={{ marginBottom: 12 }}>
      <label style={lbl}>{label}</label>
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3, 4, 5].map(n => <button key={n} onClick={() => set(n)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, background: value === n ? T.accent.secondary : T.bg.raised, color: value === n ? "#fff" : T.text.secondary }}>{n}</button>)}
      </div>
    </div>
  );
  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 19, fontWeight: 800 }}>Veckoavstämning</span>
          <button onClick={onClose} style={btn.icon}>×</button>
        </div>
        <div style={{ fontSize: 12.5, color: T.text.muted, marginBottom: 14 }}>Kort och frivilligt. Hjälper coachen förstå läget bortom siffrorna.</div>
        <Scale label="Energi (1–5)" value={energy} set={setEnergy} />
        <Scale label="Motivation (1–5)" value={motivation} set={setMotivation} />
        <label style={lbl}>Hinder den här veckan</label>
        <input value={obstacles} onChange={e => setObstacles(e.target.value)} placeholder="t.ex. dålig sömn, stress, resa" style={{ ...input, marginBottom: 12 }} />
        <label style={lbl}>Förändrade prioriteringar?</label>
        <input value={priorityChange} onChange={e => setPriorityChange(e.target.value)} placeholder="t.ex. vill fokusera mer på kondition" style={{ ...input, marginBottom: 12 }} />
        <label style={lbl}>Övrigt (valfritt)</label>
        <input value={note} onChange={e => setNote(e.target.value)} style={{ ...input, marginBottom: 16 }} />
        <button onClick={() => onSave({ ts: Date.now(), energy, motivation, obstacles, note, priorityChange })} style={{ ...btn.primary, width: "100%" }}>Spara avstämning</button>
      </div>
    </div>
  );
}

// ── Färdighets-check-in (självrapporterat / tränarrapporterat) ───────────────
function SkillCheckinModal({ onSave, onClose }) {
  const [f, setF] = useState({ area: "", technique: "", quality: "", better: "", improve: "", coach: "", pain: "", note: "" });
  const set = (k, v) => setF(o => ({ ...o, [k]: v }));
  const Field = ({ k, label, ph }) => (<><label style={lbl}>{label}</label><input value={f[k]} onChange={e => set(k, e.target.value)} placeholder={ph} style={{ ...input, marginBottom: 11 }} /></>);
  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, maxHeight: "86vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 19, fontWeight: 800 }}>Färdighets-check-in</span>
          <button onClick={onClose} style={btn.icon}>×</button>
        </div>
        <div style={{ fontSize: 12.5, color: T.text.muted, marginBottom: 14 }}>Sparas som självrapporterat/tränarrapporterat — inte som objektiv mätning.</div>
        <Field k="area" label="Färdighet / sport" ph="t.ex. Thaiboxning" />
        <Field k="technique" label="Hur kändes tekniken?" ph="fritext" />
        <Field k="quality" label="Ronder med bra kvalitet" ph="t.ex. 3 av 5" />
        <Field k="better" label="Vad fungerade bättre?" ph="fritext" />
        <Field k="improve" label="Vad behöver förbättras?" ph="fritext" />
        <Field k="coach" label="Tränarens kommentar" ph="fritext" />
        <Field k="pain" label="Smärta eller begränsning?" ph="valfritt" />
        <button onClick={() => onSave({ ts: Date.now(), ...f })} disabled={!f.area} style={{ ...btn.primary, width: "100%", opacity: f.area ? 1 : 0.4, marginTop: 4 }}>Spara check-in</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SKAPA MÅLRESA — enkelt guidat flöde (9 steg, personligt inte administrativt)
// ════════════════════════════════════════════════════════════════════════════
function CreateMissionWizard({ goals, onCreate, onClose }) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState(() => ({
    name: "", type: "training", startDate: new Date().toISOString().slice(0, 10),
    readyDate: "", ongoing: false, endDate: "", why: "", successDefinition: "",
    description: "", weeklyTime: "", constraints: "",
    linkIds: [], newGoals: [], priorities: {},
  }));
  const set = (k, v) => setD(o => ({ ...o, [k]: v }));
  const free = standaloneGoals(goals);
  const [addingGoal, setAddingGoal] = useState(false);

  const steps = [
    { q: "Vad förbereder du dig för?", body: (
      <>
        <label style={lbl}>Namn på din målresa</label>
        <input value={d.name} onChange={e => set("name", e.target.value)} placeholder="t.ex. Thailand — thaiboxning" style={{ ...input, marginBottom: 14 }} />
        <label style={lbl}>Typ av målresa</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {MISSION_TYPES.map(t => (
            <button key={t.id} onClick={() => set("type", t.id)} style={{ textAlign: "left", padding: "11px 12px", borderRadius: 10, cursor: "pointer", background: d.type === t.id ? "rgba(155,124,255,0.12)" : T.bg.raised, border: `1px solid ${d.type === t.id ? T.accent.secondary : "transparent"}`, color: T.text.primary }}>
              <span style={{ fontSize: 18, display: "inline-flex", alignItems: "center" }}><Icon name={t.icon} size={18} /></span> <span style={{ fontSize: 13, fontWeight: 600 }}>{t.label}</span>
            </button>
          ))}
        </div>
      </>
    ), valid: () => d.name.trim().length > 0 },
    { q: "När behöver du vara redo?", body: (
      <>
        <label style={lbl}>Startdatum</label>
        <input type="date" value={d.startDate} onChange={e => set("startDate", e.target.value)} style={{ ...input, marginBottom: 14 }} />
        <label style={lbl}>Datum då du ska vara redo</label>
        <input type="date" value={d.readyDate} onChange={e => set("readyDate", e.target.value)} style={input} />
        <div style={{ fontSize: 12, color: T.text.muted, marginTop: 8 }}>T.ex. avresedagen — då förberedelsen ska vara klar.</div>
      </>
    ), valid: () => !!d.readyDate },
    { q: "Pågår målet även efter detta datum?", body: (
      <>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {[["Nej, det tar slut då", false], ["Ja, det fortsätter", true]].map(([label, v]) => (
            <button key={label} onClick={() => set("ongoing", v)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, background: d.ongoing === v ? T.accent.secondary : T.bg.raised, color: d.ongoing === v ? "#fff" : T.text.secondary }}>{label}</button>
          ))}
        </div>
        {d.ongoing && (<><label style={lbl}>Slutdatum för genomförandet</label><input type="date" value={d.endDate} onChange={e => set("endDate", e.target.value)} style={input} /><div style={{ fontSize: 12, color: T.text.muted, marginTop: 8 }}>T.ex. sista dagen på lägret i Thailand.</div></>)}
      </>
    ), valid: () => true },
    { q: "Hur vill du må och vad vill du kunna göra?", body: (
      <>
        <label style={lbl}>Personlig anledning — varför är detta viktigt?</label>
        <textarea value={d.why} onChange={e => set("why", e.target.value)} placeholder="Skriv fritt. Det här hjälper coachen väga in vad som betyder något för dig." style={{ ...input, minHeight: 70, marginBottom: 14, resize: "vertical" }} />
        <label style={lbl}>Vad skulle göra resan lyckad?</label>
        <textarea value={d.successDefinition} onChange={e => set("successDefinition", e.target.value)} placeholder="Din egen definition av framgång." style={{ ...input, minHeight: 60, resize: "vertical" }} />
      </>
    ), valid: () => true },
    { q: "Vilka resultat är viktigast?", body: (
      <>
        <label style={lbl}>Kort beskrivning</label>
        <textarea value={d.description} onChange={e => set("description", e.target.value)} placeholder="t.ex. hålla vikten, orka två pass om dagen, teknik och kondition." style={{ ...input, minHeight: 80, resize: "vertical" }} />
      </>
    ), valid: () => true },
    { q: "Hur mycket tid kan du lägga varje vecka?", body: (
      <>
        <label style={lbl}>Timmar per vecka (valfritt)</label>
        <input type="number" value={d.weeklyTime} onChange={e => set("weeklyTime", e.target.value)} placeholder="t.ex. 6" style={input} />
        <div style={{ fontSize: 12, color: T.text.muted, marginTop: 8 }}>Hjälper coachen bedöma om antalet mål är rimligt.</div>
      </>
    ), valid: () => true },
    { q: "Finns begränsningar eller problemområden?", body: (
      <>
        <label style={lbl}>Begränsningar (valfritt)</label>
        <textarea value={d.constraints} onChange={e => set("constraints", e.target.value)} placeholder="t.ex. återkommande vadbesvär, ont om tid vissa veckor." style={{ ...input, minHeight: 70, resize: "vertical" }} />
        <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 8 }}>Detta är din egen notering. Askr ger träningsvägledning, inte medicinsk bedömning.</div>
      </>
    ), valid: () => true },
    { q: "Vilka delmål ska kopplas?", body: (
      <>
        <div style={{ fontSize: 12.5, color: T.text.muted, marginBottom: 10 }}>Välj befintliga mål eller lägg till nya. Befintliga mål länkas — de kopieras inte.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 10 }}>
          {free.map(g => {
            const on = d.linkIds.includes(g.id);
            return (
              <button key={g.id} onClick={() => set("linkIds", on ? d.linkIds.filter(x => x !== g.id) : [...d.linkIds, g.id])} style={{ textAlign: "left", padding: "9px 11px", borderRadius: 9, cursor: "pointer", background: on ? "rgba(77,163,255,0.12)" : T.bg.raised, border: `1px solid ${on ? T.accent.primary : "transparent"}`, color: T.text.primary }}>
                {on ? "☑ " : "☐ "}<span style={{ fontSize: 13, fontWeight: 600 }}>{g.title}</span> <span style={{ fontSize: 11, color: T.text.muted }}>· {g.cat}</span>
              </button>
            );
          })}
          {d.newGoals.map((g, i) => (
            <div key={"n" + i} style={{ padding: "9px 11px", borderRadius: 9, background: "rgba(57,217,138,0.10)", border: `1px solid ${T.accent.success}55`, color: T.text.primary, fontSize: 13 }}>+ {g.title} <span style={{ fontSize: 11, color: T.text.muted }}>· {g.cat} · mål {g.target} {g.unit}</span></div>
          ))}
        </div>
        <button onClick={() => setAddingGoal(true)} style={{ ...btn.tag, background: T.bg.raised, color: T.accent.primary }}>+ Nytt delmål</button>
        {addingGoal && <AddGoalModal onClose={() => setAddingGoal(false)} onAdd={g => { setD(o => ({ ...o, newGoals: [...o.newGoals, g] })); setAddingGoal(false); }} />}
      </>
    ), valid: () => true },
    { q: "Vilka delmål är viktigast?", body: (
      <>
        <div style={{ fontSize: 12.5, color: T.text.muted, marginBottom: 12 }}>Sätt prioritet per delmål. Avgörande väger tyngst i coachens bedömning.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...free.filter(g => d.linkIds.includes(g.id)), ...d.newGoals].map((g, i) => {
            const key = g.id || ("new_" + i);
            const p = d.priorities[key] || "Viktigt";
            return (
              <div key={key} style={{ background: T.bg.raised, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>{g.title}</div>
                <PriorityChip p={p} onPick={x => setD(o => ({ ...o, priorities: { ...o.priorities, [key]: x } }))} />
              </div>
            );
          })}
          {(free.filter(g => d.linkIds.includes(g.id)).length + d.newGoals.length) === 0 && <div style={{ fontSize: 13, color: T.text.muted }}>Inga delmål valda ännu — du kan lägga till dem senare i detaljvyn.</div>}
        </div>
      </>
    ), valid: () => true },
  ];

  const cur = steps[step];
  const last = step === steps.length - 1;
  const finish = () => {
    const linkIds = free.filter(g => d.linkIds.includes(g.id)).map(g => g.id);
    // skapa ev. nya delmål med stabilt id + prioritet
    const created = d.newGoals.map((g, i) => ({ ...g, id: `g_${Date.now()}_${i}`, missionPriority: d.priorities["new_" + i] || "Viktigt" }));
    const priorities = {};
    linkIds.forEach(id => { priorities[id] = d.priorities[id] || "Viktigt"; });
    const m = newMission({
      name: d.name.trim(), type: d.type, description: d.description, why: d.why,
      startDate: d.startDate || null, readyDate: d.readyDate || null,
      endDate: d.ongoing && d.endDate ? d.endDate : null,
      weeklyTime: d.weeklyTime !== "" ? +d.weeklyTime : null,
      constraints: d.constraints, successDefinition: d.successDefinition,
      priority: "Viktigt", phaseId: "p_now",
    });
    onCreate({ mission: m, linkIds, priorities, newGoals: created });
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, maxWidth: 520, maxHeight: "88vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: T.accent.secondary, textTransform: "uppercase" }}>Steg {step + 1} av {steps.length}</span>
          <button onClick={onClose} style={btn.icon}>×</button>
        </div>
        <div style={{ height: 4, background: T.bg.muted, borderRadius: 2, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ width: `${(step + 1) / steps.length * 100}%`, height: "100%", background: `linear-gradient(90deg, ${T.accent.secondary}, ${T.accent.primary})`, transition: "width 0.3s" }} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, lineHeight: 1.3 }}>{cur.q}</div>
        <div style={{ marginBottom: 20 }}>{cur.body}</div>
        <div style={{ display: "flex", gap: 10 }}>
          {step > 0 && <button onClick={() => setStep(step - 1)} style={{ ...btn.pill, flex: "0 0 auto" }}>Tillbaka</button>}
          {!last
            ? <button onClick={() => cur.valid() && setStep(step + 1)} disabled={!cur.valid()} style={{ ...btn.primary, flex: 1, opacity: cur.valid() ? 1 : 0.4 }}>Nästa</button>
            : <button onClick={finish} style={{ ...btn.primary, flex: 1 }}>Skapa målresa</button>}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MÅLRESA-KORT (kompakt) + DETALJVY
// ════════════════════════════════════════════════════════════════════════════
function MissionCard({ mission, analysis, onOpen }) {
  const a = analysis;
  const tl = a.timeline, ph = a.phase && a.phase.phase;
  const topAreas = [...a.reports].sort((x, y) => PRIO_W[y.priority] - PRIO_W[x.priority]).slice(0, 3);
  const conflict = a.conflicts[0];
  const t = MISSION_TYPES.find(x => x.id === mission.type);
  return (
    <Card style={{ cursor: onOpen ? "pointer" : "default" }}>
      <div onClick={onOpen}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18, display: "inline-flex", alignItems: "center" }}><Icon name={t ? t.icon : "target"} size={18} /></span>
              <span style={{ fontSize: 16, fontWeight: 800, color: T.text.primary }}>{mission.name}</span>
            </div>
            {mission.why && <div style={{ fontSize: 12, color: T.text.muted, marginTop: 4, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{mission.why}</div>}
          </div>
          <StatusPill status={a.status} />
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: T.text.secondary, margin: "10px 0" }}>
          {tl.weeksToReady != null && <span><Icon name="hourglass" size={12} style={{ verticalAlign: "-2px" }} /> <b style={{ color: T.text.primary }}>{tl.weeksToReady}</b> v kvar</span>}
          {ph && <span>◔ {ph.name}</span>}
          {a.criticalOnTrack && <span><Icon name="target" size={12} style={{ verticalAlign: "-2px" }} /> {a.criticalOnTrack.onTrack}/{a.criticalOnTrack.total} avgörande i fas</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          {topAreas.map(r => (
            <div key={r.goal.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12.5, color: T.text.secondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.goal.title}</span>
              <StatusPill status={r.status} small />
            </div>
          ))}
        </div>
        {a.focus && <div style={{ fontSize: 12, color: T.accent.secondary, background: "rgba(155,124,255,0.08)", borderRadius: 8, padding: "8px 10px", lineHeight: 1.45 }}><b>Veckans fokus:</b> {a.focus.reason}</div>}
        {conflict && <div style={{ fontSize: 11.5, color: T.accent.warning, marginTop: 8, lineHeight: 1.45 }}>⚠️ Möjlig konflikt: {conflict.hypothesis}</div>}
      </div>
    </Card>
  );
}

function MissionDetail({ mission, analysis, goals, setGoals, setMissions, onBack, ctx }) {
  const [linking, setLinking] = useState(false);
  const [weekly, setWeekly] = useState(false);
  const [skill, setSkill] = useState(false);
  const a = analysis;
  const tl = a.timeline;
  const cs = missionCoachSummary(a);
  const patch = (p) => setMissions(ms => ms.map(m => m.id === mission.id ? { ...m, ...p, updatedAt: new Date().toISOString() } : m));
  const removeMission = () => { setGoals(gs => unlinkMissionGoals(gs, mission.id)); setMissions(ms => ms.filter(m => m.id !== mission.id)); onBack(); };
  const t = MISSION_TYPES.find(x => x.id === mission.type);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 940 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button onClick={onBack} style={btn.pill}>‹ Målresor</button>
        <div style={{ flex: 1 }} />
        <button onClick={() => setWeekly(true)} style={btn.pill}>+ Veckoavstämning</button>
        <button onClick={() => setSkill(true)} style={btn.pill}>+ Färdighets-check-in</button>
        <select value={mission.status} onChange={e => patch({ status: e.target.value })} style={{ ...input, width: "auto", padding: "8px 10px" }}>
          <option value="active">Aktiv</option><option value="paused">Pausad</option><option value="done">Slutförd</option>
        </select>
      </div>

      {/* Rubrik */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24, display: "inline-flex", alignItems: "center" }}><Icon name={t ? t.icon : "target"} size={22} /></span>
              <span style={{ fontSize: 22, fontWeight: 800 }}>{mission.name}</span>
              <StatusPill status={a.status} />
            </div>
            <div style={{ fontSize: 12, color: T.text.muted, marginTop: 4 }}>{MISSION_TYPE_LABEL[mission.type] || "Målresa"}</div>
            {mission.why && <div style={{ fontSize: 13.5, color: T.text.secondary, marginTop: 10, lineHeight: 1.55, fontStyle: "italic" }}>”{mission.why}”</div>}
            {mission.description && <div style={{ fontSize: 13, color: T.text.secondary, marginTop: 8, lineHeight: 1.55 }}>{mission.description}</div>}
            {mission.successDefinition && <div style={{ fontSize: 12.5, color: T.text.muted, marginTop: 10, lineHeight: 1.5 }}><b style={{ color: T.text.secondary }}>Lyckad resa:</b> {mission.successDefinition}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            {tl.weeksToReady != null && <div><div style={{ fontSize: 30, fontWeight: 800, color: T.accent.secondary }}>{tl.weeksToReady}</div><div style={{ fontSize: 11, color: T.text.muted }}>veckor till redo</div></div>}
            {tl.daysToEnd != null && <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 8 }}>genomförande i {tl.daysToEnd} dagar</div>}
            {mission.weeklyTime != null && <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 4 }}>~{mission.weeklyTime} h/vecka</div>}
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }} className="mission-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Faser / tidslinje */}
          <Card>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: T.text.muted, textTransform: "uppercase", marginBottom: 12 }}>Faser</div>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
              {mission.phases.map(p => {
                const active = a.phase && a.phase.phase.id === p.id;
                return (
                  <button key={p.id} onClick={() => patch({ phaseId: p.id })} style={{ flex: "0 0 auto", padding: "8px 12px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: 600, border: `1px solid ${active ? T.accent.secondary : T.bg.muted}`, background: active ? "rgba(155,124,255,0.14)" : T.bg.raised, color: active ? T.text.primary : T.text.muted }} title={p.note || ""}>{p.name}</button>
                );
              })}
            </div>
            {tl.pctElapsed != null && (
              <div style={{ marginTop: 12 }}>
                <div style={{ height: 6, background: T.bg.muted, borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${tl.pctElapsed}%`, height: "100%", background: `linear-gradient(90deg, ${T.accent.secondary}, ${T.accent.primary})` }} /></div>
                <div style={{ fontSize: 11, color: T.text.muted, marginTop: 5 }}>{tl.pctElapsed}% av förberedelsetiden gått · {tl.daysToReady} dagar kvar</div>
              </div>
            )}
          </Card>

          {/* Delmål */}
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: T.text.muted, textTransform: "uppercase" }}>Kopplade delmål</span>
              <button onClick={() => setLinking(true)} style={{ ...btn.tag, background: T.bg.raised, color: T.accent.primary }}>+ Länka mål</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {a.reports.length === 0 && <div style={{ fontSize: 13, color: T.text.muted }}>Inga delmål kopplade ännu. Länka ett befintligt mål för att börja följa resan.</div>}
              {[...a.reports].sort((x, y) => PRIO_W[y.priority] - PRIO_W[x.priority]).map(r => <MissionGoalRow key={r.goal.id} report={r} setGoals={setGoals} />)}
            </div>
            {a.dataQuality && a.reports.length > 0 && (
              <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 10 }}>Datakvalitet: <b style={{ color: STATUS_COLOR[a.dataQuality] || T.text.secondary }}>{STATUS_LABEL[a.dataQuality]}</b>. Automatiskt mätta mål uppdateras ur din loggade data; övriga bygger på din egen bedömning.</div>
            )}
          </Card>

          {/* Check-ins */}
          {(mission.checkins.length > 0 || mission.skillCheckins.length > 0) && (
            <Card>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: T.text.muted, textTransform: "uppercase", marginBottom: 12 }}>Avstämningar</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[...mission.skillCheckins].reverse().map((c, i) => (
                  <div key={"s" + i} style={{ background: T.bg.raised, borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.text.muted, marginBottom: 4 }}><span>Färdighet · {c.area}</span><span>{new Date(c.ts).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })} · självrapporterat</span></div>
                    {c.technique && <div style={{ fontSize: 12.5, color: T.text.secondary }}>Teknik: {c.technique}</div>}
                    {c.quality && <div style={{ fontSize: 12.5, color: T.text.secondary }}>Kvalitet: {c.quality}</div>}
                    {c.coach && <div style={{ fontSize: 12.5, color: T.accent.secondary }}>Tränare: {c.coach}</div>}
                    {c.improve && <div style={{ fontSize: 12, color: T.text.muted }}>Att förbättra: {c.improve}</div>}
                  </div>
                ))}
                {[...mission.checkins].reverse().map((c, i) => (
                  <div key={"w" + i} style={{ background: T.bg.raised, borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.text.muted, marginBottom: 4 }}><span>Veckoavstämning</span><span>{new Date(c.ts).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}</span></div>
                    <div style={{ fontSize: 12.5, color: T.text.secondary }}>Energi {c.energy}/5 · Motivation {c.motivation}/5</div>
                    {c.obstacles && <div style={{ fontSize: 12, color: T.text.muted }}>Hinder: {c.obstacles}</div>}
                    {c.priorityChange && <div style={{ fontSize: 12, color: T.accent.warning }}>Prioritering: {c.priorityChange}</div>}
                    {c.note && <div style={{ fontSize: 12, color: T.text.muted }}>{c.note}</div>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <button onClick={removeMission} style={{ ...btn.pill, color: T.accent.danger, alignSelf: "flex-start" }}>Ta bort målresa</button>
          <div style={{ fontSize: 11, color: T.text.muted, marginTop: -8 }}>Delmålen raderas inte — de blir fristående igen.</div>
        </div>

        {/* AI-coach: målresa-kontext */}
        <Card style={{ background: `linear-gradient(135deg, ${T.bg.surface}, rgba(155,124,255,0.06))` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ color: T.accent.secondary, fontSize: 16 }}>✦</span><span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: T.accent.secondary, textTransform: "uppercase" }}>Coachens läge</span></div>
          {cs && (
            <>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: T.text.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Observation</div>
              <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.55, marginBottom: 12 }}>{cs.observation.join(" ")}</div>
              {cs.plan && (
                <div style={{ marginBottom: 12, padding: "11px 12px", background: "rgba(77,163,255,0.06)", border: `1px solid ${T.accent.primary}33`, borderRadius: 10 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: T.accent.primary, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Föreslaget upplägg</div>
                  <div style={{ fontSize: 12.5, color: T.text.secondary, lineHeight: 1.5, marginBottom: 8 }}>
                    {cs.plan.sessions != null
                      ? <>~<b style={{ color: T.text.primary }}>{cs.plan.sessions} pass/vecka</b> {cs.plan.sessionsFrom === "time" ? "(utifrån din veckotid)" : "(utifrån ditt frekvensmål)"}.</>
                      : <>Ange veckotid så skräddarsyr jag fördelningen. Så länge — prioritetsordning nedan.</>}
                    {cs.plan.emphasis ? ` ${cs.plan.emphasis}` : ""}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {cs.plan.blocks.map((b, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                        <span style={{ color: T.text.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</span>
                        <span style={{ color: T.text.muted, flexShrink: 0 }}>{b.sessions != null ? (b.sessions >= 1 ? `≈${b.sessions} pass/v` : "underhåll") : b.priority}</span>
                      </div>
                    ))}
                  </div>
                  {cs.plan.cautions.map((c, i) => <div key={i} style={{ fontSize: 11.5, color: T.accent.warning, marginTop: 7, lineHeight: 1.4 }}>⚠ {c}</div>)}
                  {cs.plan.nextPhase && <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 7, lineHeight: 1.4 }}>Nästa fas — <b style={{ color: T.text.secondary }}>{cs.plan.nextPhase.name}</b>{cs.plan.nextPhase.note ? `: ${cs.plan.nextPhase.note}` : ""}</div>}
                  <div style={{ fontSize: 12, color: T.accent.secondary, marginTop: 8 }}>Vill du utgå från det här upplägget?</div>
                </div>
              )}
              {cs.hypotheses.length > 0 && (<>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: T.accent.warning, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Hypotes</div>
                {cs.hypotheses.map((h, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12.5, color: T.text.secondary, lineHeight: 1.5 }}>{h.text}</div>
                    <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 3, lineHeight: 1.45 }}>{h.explain}</div>
                    <div style={{ fontSize: 12, color: T.accent.secondary, marginTop: 4 }}>{h.question}</div>
                  </div>
                ))}
              </>)}
              {cs.recommendation && (<>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: T.accent.success, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6, marginTop: 4 }}>Rekommendation</div>
                <div style={{ fontSize: 13, color: T.text.primary, lineHeight: 1.55 }}>{cs.recommendation}</div>
                {cs.question && <div style={{ fontSize: 12.5, color: T.accent.secondary, marginTop: 6 }}>{cs.question}</div>}
              </>)}
              <div style={{ fontSize: 10.5, color: T.text.muted, marginTop: 12, lineHeight: 1.5 }}>Coachen frågar innan större förändringar och skiljer observation, hypotes och rekommendation. Ingen medicinsk rådgivning.</div>
            </>
          )}
        </Card>
      </div>

      {linking && <LinkGoalPicker goals={goals} missionId={mission.id} setGoals={setGoals} onClose={() => setLinking(false)} />}
      {weekly && <WeeklyCheckinModal onClose={() => setWeekly(false)} onSave={c => { patch({ checkins: [...mission.checkins, c] }); setWeekly(false); }} />}
      {skill && <SkillCheckinModal onClose={() => setSkill(false)} onSave={c => { patch({ skillCheckins: [...mission.skillCheckins, c] }); setSkill(false); }} />}
      <style>{`@media (max-width: 820px){ .mission-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MÅLFLIKEN — Målresor + Enskilda mål
// ════════════════════════════════════════════════════════════════════════════
function GoalsView({ goals, setGoals, missions = [], setMissions = () => {}, sessions, profile, measurements }) {
  const [adding, setAdding] = useState(false);
  const [wizard, setWizard] = useState(false);
  const [openId, setOpenId] = useState(null);

  const weekly = sessions.filter(s => Date.now() - s.completedAt < 7 * 24 * 3600000).length;
  const bw = currentWeight(profile, measurements);
  const bf = latestMetric(measurements, "bodyFat");
  const ctx = { weekly, bodyweight: bw, bodyfat: bf };
  const analysisOf = m => missionAnalysis(m, goals, ctx);

  const openMission = openId ? missions.find(m => m.id === openId) : null;

  const applyCreate = ({ mission, linkIds, priorities, newGoals }) => {
    setMissions(ms => [...ms, mission]);
    setGoals(gs => {
      const linked = gs.map(g => linkIds.includes(g.id) ? { ...g, missionId: mission.id, missionPriority: priorities[g.id] || "Viktigt" } : g);
      const created = newGoals.map(g => ({ ...g, missionId: mission.id }));
      return [...linked, ...created];
    });
    setWizard(false);
    setOpenId(mission.id);
  };

  if (openMission) return <MissionDetail mission={openMission} analysis={analysisOf(openMission)} goals={goals} setGoals={setGoals} setMissions={setMissions} onBack={() => setOpenId(null)} ctx={ctx} />;

  // Enskilda mål = fristående (delmål visas under sin målresa, ingen duplicering)
  const free = standaloneGoals(goals).map(g => g.live === "weekly" ? { ...g, current: weekly } : g.live === "weight" ? { ...g, current: bw } : (g.live === "bodyfat" && bf != null) ? { ...g, current: bf } : g);
  const onTrack = free.filter(g => goalProgress(g) >= 100).length;

  return (
    <div>
      {/* MÅLRESOR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 2 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text.primary }}>Målresor</div>
          <div style={{ fontSize: 12.5, color: T.text.muted }}>Samla delmål kring något personligt och betydelsefullt.</div>
        </div>
        <button onClick={() => setWizard(true)} style={btn.primary}>+ Ny målresa</button>
      </div>
      {missions.length === 0 ? (
        <Card style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text.secondary, marginBottom: 4 }}>Ingen målresa ännu.</div>
              <div style={{ fontSize: 12.5, color: T.text.muted, lineHeight: 1.5 }}>En målresa knyter ihop flera delmål mot ett datum — t.ex. ett läger, ett lopp eller ett bröllop. Dina enskilda mål fungerar precis som förut vid sidan av.</div>
            </div>
            <div style={{ fontSize: 26, display: "flex" }}><Icon name="compass" size={26} /></div>
          </div>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14, marginBottom: 24 }}>
          {missions.map(m => <MissionCard key={m.id} mission={m} analysis={analysisOf(m)} onOpen={() => setOpenId(m.id)} />)}
        </div>
      )}

      {/* ENSKILDA MÅL */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text.primary }}>Enskilda mål</div>
          <span style={{ fontSize: 12.5, color: T.text.muted }}>{onTrack} av {free.length} uppnådda · fristående mål</span>
        </div>
        <button onClick={() => setAdding(true)} style={btn.primary}>+ Nytt mål</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {free.length === 0 && <div style={{ fontSize: 13, color: T.text.muted }}>Inga fristående mål. Lägg till ett, eller skapa en målresa ovan.</div>}
        {free.map(g => <GoalCard key={g.id} g={g} onRemove={() => setGoals(gs => gs.filter(x => x.id !== g.id))} />)}
      </div>

      {adding && <AddGoalModal onAdd={goal => { setGoals(gs => [...gs, goal]); setAdding(false); }} onClose={() => setAdding(false)} />}
      {wizard && <CreateMissionWizard goals={goals} onCreate={applyCreate} onClose={() => setWizard(false)} />}
    </div>
  );
}

export { AddGoalModal, GoalCard, GoalsView, MissionCard, MissionDetail, CreateMissionWizard };
