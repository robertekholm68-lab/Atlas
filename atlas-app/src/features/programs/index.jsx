// FEATURE: ATLAS Program — bibliotek, rekommendationer, guidat flöde, detalj/preview, egen byggare.
import { useState, useMemo } from "react";
import { Card, Icon } from "../../components/common/index.jsx";
import { T, btn } from "../../data/tokens.js";
import { EXERCISES, EX_GROUPS } from "../../data/exercises.js";
import {
  FAMILIES, FAMILY_NAMES, LEVEL_NAMES, LEVELS, ALL_TEMPLATES, MUSCLE_GROUPS, WEEKDAYS,
  generateProgram, copyProgram, bumpVersion, normalizeProgram, weeklyVolume, validateProgram,
  recommendPrograms, workoutExercises, groupSv, defaultWeekdays, applyChange, restoreVersion,
} from "../../engines/programs.js";
import { programMuscleLoad, alternativesFor } from "../../engines/programs.js";
import { analyzeProgram, EVIDENCE } from "../../engines/coach-programs.js";
import { SvgBody } from "../body-map/index.jsx";
import { MUSCLES, GROUP_PRIMARY } from "../../data/muscles.js";

const chip = (on) => ({ padding: "6px 12px", borderRadius: 999, border: `1px solid ${on ? T.accent.primary : T.bg.muted}`, background: on ? T.accent.primary : T.bg.raised, color: on ? "#fff" : T.text.secondary, cursor: "pointer", fontSize: 12.5, fontWeight: 600 });
const sub = { fontSize: 11, fontWeight: 700, letterSpacing: 1, color: T.text.muted, textTransform: "uppercase" };

function VolumeBars({ program }) {
  const vol = weeklyVolume(program); const max = Math.max(12, ...Object.values(vol));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "5px 14px" }}>
      {MUSCLE_GROUPS.map(g => (
        <div key={g}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.text.secondary }}><span>{groupSv(g)}</span><span style={{ color: T.text.muted }}>{vol[g] || 0}</span></div>
          <div style={{ height: 5, borderRadius: 3, background: T.bg.muted, overflow: "hidden", marginTop: 2 }}><div style={{ height: "100%", width: `${Math.min(100, (vol[g] || 0) / max * 100)}%`, background: (vol[g] || 0) === 0 ? T.accent.danger : (vol[g] > 22 ? T.accent.warning : T.accent.success), borderRadius: 3 }} /></div>
        </div>
      ))}
    </div>
  );
}
function Warnings({ program }) {
  const w = validateProgram(program);
  if (!w.length) return <div style={{ fontSize: 12.5, color: T.accent.success }}>✓ Inga varningar — balanserad plan.</div>;
  return <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{w.map((x, i) => (
    <div key={i} style={{ fontSize: 12.5, color: x.level === "warn" ? T.accent.warning : T.text.secondary, display: "flex", gap: 7 }}><span>{x.level === "warn" ? "⚠" : "ℹ"}</span><span>{x.msg}</span></div>
  ))}</div>;
}

function ProgramCard({ program, badge, onClick, active }) {
  const vol = weeklyVolume(program); const total = Object.values(vol).reduce((a, b) => a + b, 0);
  return (
    <button onClick={onClick} style={{ textAlign: "left", cursor: "pointer", border: `1px solid ${active ? T.accent.primary : T.bg.muted}`, borderRadius: 14, background: "linear-gradient(160deg, rgba(30,40,54,0.5), rgba(16,22,32,0.5))", padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: T.text.primary }}>{program.name}</div>
          <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 1 }}>{program.family} · {program.level}</div>
        </div>
        {badge && <span style={{ fontSize: 10, fontWeight: 700, color: badge.c, border: `1px solid ${badge.c}66`, borderRadius: 999, padding: "3px 8px", whiteSpace: "nowrap" }}>{badge.t}</span>}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11.5, color: T.text.secondary }}>
        <span><Icon name="calendar-days" size={13} style={{ verticalAlign: "-2px" }} /> {program.daysPerWeek} dagar</span><span><Icon name="dumbbell" size={13} style={{ verticalAlign: "-2px" }} /> {total} set/v</span><span><Icon name="target" size={13} style={{ verticalAlign: "-2px" }} /> {goalSv(program.goal)}</span>
      </div>
    </button>
  );
}
const goalSv = g => ({ Strength: "Styrka", Hypertrophy: "Muskler", General: "Allmän" }[g] || g);

// ── Live-belastningskropp (separata TRÄNINGSbelastnings-färger, ej Recovery) ──
const lerp3 = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
function loadColor(eff) {
  if (eff <= 0.4) return null;
  const r = Math.min(1, eff / 18);
  const c = r < 0.5 ? lerp3([77, 163, 255], [155, 124, 255], r / 0.5) : lerp3([155, 124, 255], [255, 106, 213], (r - 0.5) / 0.5);
  return { color: `rgb(${c[0]},${c[1]},${c[2]})`, op: (0.4 + r * 0.45).toFixed(2) };
}
export function LoadBody({ program }) {
  const load = useMemo(() => programMuscleLoad(program), [program]);
  const [sel, setSel] = useState(null);
  const paintOverride = useMemo(() => (grp) => {
    const mid = load[grp] ? grp : (GROUP_PRIMARY[grp] && load[GROUP_PRIMARY[grp]] ? GROUP_PRIMARY[grp] : grp);
    return loadColor(load[mid] ? load[mid].effective : 0);
  }, [load]);
  const selMid = sel && (load[sel] ? sel : (GROUP_PRIMARY[sel] || sel));
  const d = selMid && load[selMid];
  const total = d ? d.exercises.reduce((a, x) => a + x.sets, 0) : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ height: 340, position: "relative" }}>
        <SvgBody muscleStates={{}} paintOverride={paintOverride} onSelectRaw={setSel} loadMode />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: T.text.muted }}>
        <span>Låg</span><div style={{ flex: 1, height: 7, borderRadius: 4, background: "linear-gradient(90deg, #4DA3FF, #9B7CFF, #FF6AD5)" }} /><span>Hög belastning</span>
      </div>
      {d ? (
        <div style={{ border: `1px solid ${T.bg.muted}`, borderRadius: 10, padding: 11, background: T.bg.raised }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{(MUSCLES[selMid] && MUSCLES[selMid].name) || selMid}</div>
          <div style={{ display: "flex", gap: 14, fontSize: 12, color: T.text.secondary, margin: "6px 0 8px", flexWrap: "wrap" }}>
            <span>Direkta set: <b style={{ color: T.text.primary }}>{d.direct}</b></span>
            <span>Effektiva set: <b style={{ color: T.accent.secondary }}>{d.effective}</b></span>
            <span>Vecka totalt: <b style={{ color: T.text.primary }}>{total}</b></span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {d.exercises.map((x, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.text.secondary, gap: 8 }}>
                <span style={{ color: T.text.primary }}>{x.name}{x.primary ? "" : " · sekundär"}</span><span style={{ color: T.text.muted, whiteSpace: "nowrap" }}>{x.sets} set · {x.effective} eff</span>
              </div>
            ))}
          </div>
        </div>
      ) : <div style={{ fontSize: 12, color: T.text.muted }}>Klicka på en muskel för bidragande övningar, direkta set, effektiva set och veckototal. Färgerna visar träningsbelastning (skilt från Recovery).</div>}
    </div>
  );
}

// ── AI-coach för program: observationer + godkännande-gatade förslag + versionshistorik ──
function EvidenceBadge({ evidence }) {
  const e = EVIDENCE[evidence] || EVIDENCE.estimate;
  return <span style={{ fontSize: 9.5, fontWeight: 700, color: e.c, border: `1px solid ${e.c}66`, borderRadius: 999, padding: "2px 7px", whiteSpace: "nowrap" }}>{e.label}</span>;
}
function ProposalCard({ p, onApply }) {
  const [answer, setAnswer] = useState(null);
  const [show, setShow] = useState(!p.followUp);
  const [applied, setApplied] = useState(false);
  return (
    <div style={{ border: `1px solid ${T.bg.muted}`, borderRadius: 12, padding: 13, background: T.bg.raised }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{p.title}</div>
        <EvidenceBadge evidence={p.evidence} />
      </div>
      <div style={{ fontSize: 12.5, color: T.text.secondary, marginTop: 5, lineHeight: 1.45 }}>{p.why}</div>
      {p.followUp && !show && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12.5, color: T.text.primary, marginBottom: 6 }}>{p.followUp.question}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{p.followUp.options.map(o => <button key={o} onClick={() => { setAnswer(o); setShow(true); }} style={chip(answer === o)}>{o}</button>)}</div>
        </div>
      )}
      {show && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12.5, color: T.text.secondary, background: "rgba(0,0,0,0.22)", borderRadius: 8, padding: "8px 10px", lineHeight: 1.5 }}>
            <b style={{ color: T.text.primary }}>Ändring:</b> {p.diffText()}<br /><span style={{ color: T.accent.success }}>Förväntad effekt:</span> {p.expectedEffect}
          </div>
          {applied ? <div style={{ fontSize: 12.5, color: T.accent.success, marginTop: 8 }}>✓ Tillämpat — föregående version sparad (ångra/jämför nedan).</div> : (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => { onApply(p); setApplied(true); }} style={{ ...btn.primary, padding: "7px 14px", fontSize: 12.5 }}>Godkänn ändring</button>
              <button onClick={() => setShow(!p.followUp)} style={{ ...btn.pill, padding: "7px 14px", fontSize: 12.5 }}>Inte nu</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function ProgramCoach({ program, sessions, readiness, onApply, onRestore }) {
  const a = useMemo(() => analyzeProgram({ program, sessions, readiness }), [program, sessions, readiness]);
  return (
    <Card pad={14}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><span style={{ color: T.accent.secondary }}>✦</span><div style={sub}>ATLAS-coach</div></div>
      {a.adherence && <div style={{ fontSize: 12.5, color: T.text.secondary, marginBottom: 10, lineHeight: 1.5 }}>Följsamhet: {a.adherence.done}/{a.adherence.expected} pass (2 v){a.activities.length ? ` · kombinerar med ${a.activities.map(x => x.name).join(", ")}` : ""}. Jag ändrar aldrig ditt program utan att du godkänner först.</div>}
      {a.observations.length === 0 && a.proposals.length === 0 && <div style={{ fontSize: 12.5, color: T.accent.success }}>✓ Programmet ser balanserat ut och matchar din historik. Fortsätt så!</div>}
      {a.observations.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 12 }}>{a.observations.map(o => (
        <div key={o.id} style={{ fontSize: 12.5, color: T.text.secondary, display: "flex", gap: 7, alignItems: "flex-start", lineHeight: 1.45 }}><EvidenceBadge evidence={o.evidence} /><span><b style={{ color: T.text.primary }}>{o.title}.</b> {o.detail}</span></div>
      ))}</div>}
      {a.proposals.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{a.proposals.map(p => <ProposalCard key={p.id} p={p} onApply={onApply} />)}</div>}
      {program.history && program.history.length > 0 && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${T.bg.muted}`, paddingTop: 10 }}>
          <div style={{ ...sub, marginBottom: 6 }}>Versionshistorik · nu v{program.version}</div>
          {program.history.slice(0, 5).map((h, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: T.text.muted, padding: "3px 0" }}>
              <span>v{h.version} · {h.note}</span>
              <button onClick={() => onRestore(i)} style={{ ...btn.pill, padding: "4px 10px", fontSize: 11.5 }}>Återställ</button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Detalj/preview ──
function ProgramDetail({ program, active, onActivate, onEdit, onDuplicate, onArchive, onStart, onClose, isTemplate, sessions, readiness, onApplyProposal, onRestoreVersion }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.accent.primary, cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 6 }}>‹ Tillbaka</button>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{program.name}</div>
          <div style={{ fontSize: 13, color: T.text.muted, marginTop: 2 }}>{program.family} · {program.level} · {goalSv(program.goal)} · {program.daysPerWeek} dagar/vecka{isTemplate ? " · mall" : ` · v${program.version}`}</div>
          {FAMILIES[program.family] ? <div style={{ fontSize: 12.5, color: T.text.secondary, marginTop: 6, maxWidth: 640 }}>{FAMILIES[program.family].desc}</div>
            : program.desc && <div style={{ fontSize: 12.5, color: T.text.secondary, marginTop: 6, maxWidth: 640, lineHeight: 1.5 }}>{program.desc}</div>}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!active && <button onClick={onActivate} style={{ ...btn.primary, padding: "9px 16px" }}>Aktivera</button>}
          {active && <span style={{ ...btn.tag, background: T.accent.success, color: "#fff", padding: "9px 14px" }}>● Aktivt</span>}
          {active && onStart && <button onClick={onStart} style={{ ...btn.primary, padding: "9px 16px" }}>Starta pass ›</button>}
          <button onClick={onEdit} style={{ ...btn.pill, padding: "9px 14px" }}>{isTemplate ? "Anpassa" : "Redigera"}</button>
          <button onClick={onDuplicate} style={{ ...btn.pill, padding: "9px 14px" }}>Duplicera</button>
          {!isTemplate && <button onClick={onArchive} style={{ ...btn.pill, padding: "9px 14px", color: T.accent.danger }}>{program.archived ? "Återställ" : "Arkivera"}</button>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {program.workouts.map((w, i) => (
            <Card key={w.id} pad={14}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{program.weekdays[i] ? `${program.weekdays[i]} · ` : ""}{w.name}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {workoutExercises(w).map((x, j) => (
                  <div key={j} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: T.text.secondary, gap: 8 }}>
                    <span style={{ color: T.text.primary }}>{x.exercise.name}</span>
                    <span style={{ whiteSpace: "nowrap", color: T.text.muted }}>{x.sets}×{x.repMin}–{x.repMax} · RIR {x.rir} · {x.restSec}s</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 8 }}>Progression: {w.exercises[0]?.progression}</div>
            </Card>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card pad={14}><div style={{ ...sub, marginBottom: 10 }}>Var programmet belastar</div><LoadBody program={program} /></Card>
          <Card pad={14}><div style={{ ...sub, marginBottom: 10 }}>Veckovolym per muskel</div><VolumeBars program={program} /></Card>
          <Card pad={14}><div style={{ ...sub, marginBottom: 10 }}>Kvalitetskontroll</div><Warnings program={program} /></Card>
          {!isTemplate && onApplyProposal && <ProgramCoach program={program} sessions={sessions} readiness={readiness} onApply={onApplyProposal} onRestore={onRestoreVersion} />}
        </div>
      </div>
    </div>
  );
}

// ── Egen byggare / redigering ──
function Builder({ initial, onSave, onCancel }) {
  const [p, setP] = useState(() => normalizeProgram(initial));
  const [picker, setPicker] = useState(null);   // { wi } när man lägger till övning
  const [q, setQ] = useState(""); const [grp, setGrp] = useState("All");
  const [confirm, setConfirm] = useState(null);   // { msg, onYes } — varna innan omgenerering
  const upd = fn => setP(prev => { const n = JSON.parse(JSON.stringify(prev)); fn(n); return n; });
  // Dag-ändring: ICKE-destruktiv — behåll befintliga (redigerade) pass, lägg till/ta bort i slutet.
  const setDays = d => upd(n => {
    d = Math.max(1, Math.min(6, d));
    if (d > n.workouts.length) {
      const F = FAMILIES[n.family];
      const fresh = F ? generateProgram(n.family, n.level, { days: d, equip: n.equipment, goal: n.goal }).workouts : null;
      while (n.workouts.length < d) { const i = n.workouts.length; n.workouts.push(fresh && fresh[i] ? JSON.parse(JSON.stringify(fresh[i])) : { id: "wo_" + Math.random().toString(36).slice(2, 8), name: "Pass " + (i + 1), exercises: [] }); }
    } else if (d < n.workouts.length) n.workouts = n.workouts.slice(0, d);
    n.daysPerWeek = d; n.weekdays = defaultWeekdays(d);
  });
  const doRegen = (family, level) => upd(n => { const f = generateProgram(family, level, { days: n.daysPerWeek, equip: n.equipment, goal: FAMILIES[family].goal }); n.family = family; n.level = level; n.goal = f.goal; n.split = family; n.workouts = f.workouts; n.equipmentWarnings = f.equipmentWarnings; });
  // Split/nivå-byte skriver över manuella ändringar → varna först.
  const askRegen = (family, level) => setConfirm({ msg: "Byte av split eller nivå genererar om alla pass och skriver över dina manuella ändringar. Fortsätt?", onYes: () => doRegen(family, level) });
  // Utrustnings-byte: migrera — byt bara ut övningar vars utrustning inte längre tillåts, behåll set/reps.
  const changeEquip = (equip, presetName) => {
    const swaps = p.workouts.reduce((a, w) => a + w.exercises.filter(x => { const e = EXERCISES.find(z => z.id === x.exId); return e && !equip.includes(e.equipment); }).length, 0);
    const migrate = () => upd(n => {
      n.equipment = equip; n.equipPreset = presetName;
      n.workouts.forEach(w => w.exercises.forEach(x => { const e = EXERCISES.find(z => z.id === x.exId); if (e && !equip.includes(e.equipment)) { const alt = alternativesFor(x.exId, equip, 1)[0]; if (alt) x.exId = alt.id; } }));
    });
    if (swaps > 0) setConfirm({ msg: `Utrustningsbytet ersätter ${swaps} övning(ar) som inte längre är tillgängliga med kompatibla alternativ (set/reps behålls). Fortsätt?`, onYes: migrate });
    else migrate();
  };
  const move = (wi, ei, dir) => upd(n => { const ex = n.workouts[wi].exercises; const t = ei + dir; if (t < 0 || t >= ex.length) return; [ex[ei], ex[t]] = [ex[t], ex[ei]]; });
  const exList = useMemo(() => EXERCISES.filter(e => (grp === "All" || e.group === grp) && (!q || e.name.toLowerCase().includes(q.toLowerCase()) || (e.aka || []).some(a => a.toLowerCase().includes(q.toLowerCase())))), [q, grp]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <button onClick={onCancel} style={{ background: "none", border: "none", color: T.accent.primary, cursor: "pointer", fontSize: 13, padding: 0 }}>‹ Avbryt</button>
          <input value={p.name} onChange={e => setP({ ...p, name: e.target.value })} style={{ display: "block", marginTop: 6, fontSize: 20, fontWeight: 800, background: "transparent", border: "none", borderBottom: `1px solid ${T.bg.muted}`, color: T.text.primary, outline: "none", padding: "2px 0", width: 320 }} />
        </div>
        <button onClick={() => onSave(bumpVersion(p))} style={{ ...btn.primary, padding: "10px 20px" }}>Spara program</button>
      </div>

      <Card pad={14}>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ fontSize: 12.5, color: T.text.secondary }}>Split
            <select value={FAMILY_NAMES.includes(p.family) ? p.family : "Custom"} onChange={e => e.target.value === "Custom" ? upd(n => { n.family = "Egen split"; }) : askRegen(e.target.value, p.level)} style={selStyle}>
              {FAMILY_NAMES.map(f => <option key={f}>{f}</option>)}<option value="Custom">Egen split</option>
            </select>
          </label>
          <label style={{ fontSize: 12.5, color: T.text.secondary }}>Nivå
            <select value={p.level} onChange={e => FAMILY_NAMES.includes(p.family) ? askRegen(p.family, e.target.value) : setP({ ...p, level: e.target.value })} style={selStyle}>{LEVEL_NAMES.map(l => <option key={l}>{l}</option>)}</select>
          </label>
          <label style={{ fontSize: 12.5, color: T.text.secondary }}>Dagar/vecka
            <select value={p.daysPerWeek} onChange={e => setDays(+e.target.value)} style={selStyle}>{[1, 2, 3, 4, 5, 6].map(d => <option key={d} value={d}>{d}</option>)}</select>
          </label>
          <label style={{ fontSize: 12.5, color: T.text.secondary }}>Utrustning
            <select value={p.equipPreset || matchPreset(p.equipment)} onChange={e => { const pr = EQUIP_PRESETS.find(x => x.key === e.target.value); if (pr) changeEquip(pr.equip, pr.key); }} style={selStyle}>{EQUIP_PRESETS.map(o => <option key={o.key}>{o.key}</option>)}</select>
          </label>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ ...sub, marginBottom: 6 }}>Veckodagar</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{WEEKDAYS.map(d => {
            const on = p.weekdays.includes(d);
            return <button key={d} onClick={() => setP({ ...p, weekdays: on ? p.weekdays.filter(x => x !== d) : [...p.weekdays, d].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b)) })} style={chip(on)}>{d}</button>;
          })}</div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {p.workouts.map((w, wi) => (
            <Card key={w.id} pad={14}>
              <input value={w.name} onChange={e => upd(n => { n.workouts[wi].name = e.target.value; })} style={{ fontWeight: 700, background: "transparent", border: "none", color: T.text.primary, outline: "none", fontSize: 14.5, marginBottom: 8, width: "100%" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {w.exercises.map((x, ei) => { const e = EXERCISES.find(z => z.id === x.exId); return (
                  <div key={ei} style={{ border: `1px solid ${T.bg.muted}`, borderRadius: 10, padding: "8px 10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{e ? e.name : x.exId}</span>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button title="Upp" onClick={() => move(wi, ei, -1)} style={miniBtn}>↑</button>
                        <button title="Ner" onClick={() => move(wi, ei, 1)} style={miniBtn}>↓</button>
                        <button title="Byt ut" onClick={() => setPicker({ wi, ei })} style={miniBtn}>⇄</button>
                        <button title="Ta bort" onClick={() => upd(n => { n.workouts[wi].exercises.splice(ei, 1); })} style={{ ...miniBtn, color: T.accent.danger }}>✕</button>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                      {[["Set", "sets", 1, 8], ["Rep min", "repMin", 1, 30], ["Rep max", "repMax", 1, 40], ["RIR", "rir", 0, 6], ["Vila s", "restSec", 15, 300]].map(([lab, key, mn, mx]) => (
                        <label key={key} style={{ fontSize: 10.5, color: T.text.muted }}>{lab}<br /><input type="number" min={mn} max={mx} value={x[key]} onChange={ev => upd(n => { n.workouts[wi].exercises[ei][key] = Math.max(mn, Math.min(mx, +ev.target.value || 0)); })} style={numInput} /></label>
                      ))}
                      <label style={{ fontSize: 10.5, color: T.text.muted, flex: 1, minWidth: 150 }}>Progression<br /><select value={x.progression} onChange={ev => upd(n => { n.workouts[wi].exercises[ei].progression = ev.target.value; })} style={{ ...numInput, width: "100%" }}>{["Linjär (öka vikt varje pass)", "Dubbel progression (reps → vikt)", "Dubbel progression + periodisering", "RPE-styrd"].map(o => <option key={o}>{o}</option>)}</select></label>
                    </div>
                  </div>
                ); })}
              </div>
              <button onClick={() => setPicker({ wi, ei: null })} style={{ ...btn.pill, padding: "7px 12px", marginTop: 8, fontSize: 12.5 }}>+ Lägg till övning</button>
            </Card>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 0 }}>
          <Card pad={14}><div style={{ ...sub, marginBottom: 10 }}>Live-belastning per muskel</div><LoadBody program={p} /></Card>
          <Card pad={14}><div style={{ ...sub, marginBottom: 10 }}>Veckovolym (live)</div><VolumeBars program={p} /></Card>
          <Card pad={14}><div style={{ ...sub, marginBottom: 10 }}>Kvalitetskontroll</div><Warnings program={p} /></Card>
        </div>
      </div>

      {picker && (
        <div onClick={() => setPicker(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.bg.surface, border: `1px solid ${T.bg.muted}`, borderRadius: 16, width: 520, maxHeight: "80vh", display: "flex", flexDirection: "column", padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>{picker.ei == null ? "Lägg till övning" : "Byt ut övning"}</div>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Sök övning…" style={{ ...inputStyle, marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>{["All", ...EX_GROUPS].map(g => <button key={g} onClick={() => setGrp(g)} style={chip(grp === g)}>{g}</button>)}</div>
            <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              {exList.map(e => (
                <button key={e.id} onClick={() => { upd(n => { const item = { exId: e.id, sets: 3, repMin: 8, repMax: 12, rir: 2, restSec: 90, progression: "Dubbel progression (reps → vikt)" }; if (picker.ei == null) n.workouts[picker.wi].exercises.push(item); else n.workouts[picker.wi].exercises[picker.ei] = { ...n.workouts[picker.wi].exercises[picker.ei], exId: e.id }; }); setPicker(null); setQ(""); }} style={{ textAlign: "left", padding: "8px 10px", borderRadius: 8, border: "none", background: T.bg.raised, cursor: "pointer", color: T.text.primary, fontSize: 13, display: "flex", justifyContent: "space-between" }}>
                  <span>{e.name}</span><span style={{ color: T.text.muted, fontSize: 11.5 }}>{e.group} · {e.equipment}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div onClick={() => setConfirm(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 210, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.bg.surface, border: `1px solid ${T.bg.muted}`, borderRadius: 16, width: 420, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><span style={{ color: T.accent.warning }}>⚠</span><div style={{ fontWeight: 700 }}>Bekräfta ändring</div></div>
            <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.5 }}>{confirm.msg}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
              <button onClick={() => setConfirm(null)} style={{ ...btn.pill, padding: "8px 14px" }}>Avbryt</button>
              <button onClick={() => { confirm.onYes(); setConfirm(null); }} style={{ ...btn.primary, padding: "8px 16px" }}>Fortsätt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
const selStyle = { marginLeft: 6, background: T.bg.raised, color: T.text.primary, border: `1px solid ${T.bg.muted}`, borderRadius: 8, padding: "6px 8px", fontSize: 12.5 };
const numInput = { width: 58, background: T.bg.raised, color: T.text.primary, border: `1px solid ${T.bg.muted}`, borderRadius: 6, padding: "4px 6px", fontSize: 12 };
const inputStyle = { width: "100%", boxSizing: "border-box", background: T.bg.raised, color: T.text.primary, border: `1px solid ${T.bg.muted}`, borderRadius: 8, padding: "9px 11px", fontSize: 13 };
const miniBtn = { width: 26, height: 26, borderRadius: 7, border: `1px solid ${T.bg.muted}`, background: T.bg.raised, color: T.text.secondary, cursor: "pointer", fontSize: 13 };

// ── Guidat flöde (mål → split → nivå → dagar → veckodagar → utrustning → tid → preview) ──
const EQUIP_PRESETS = [
  { key: "Fullt gym", equip: ["Barbell", "Dumbbell", "Machine", "Cable", "Bodyweight", "EZ Bar", "Kettlebell"], d: "Skivstänger, hantlar, maskiner, kabel — allt tillgängligt." },
  { key: "Hemmagym", equip: ["Dumbbell", "Kettlebell", "Bodyweight"], d: "Hantlar, kettlebell och kroppsvikt." },
  { key: "Bodyweight", equip: ["Bodyweight"], d: "Bara kroppsvikt — träna var som helst." },
  { key: "Kettlebell", equip: ["Kettlebell", "Bodyweight"], d: "Kettlebell + kroppsvikt." },
];
const matchPreset = (equip) => { const e = EQUIP_PRESETS.find(x => x.equip.length === (equip || []).length && x.equip.every(q => (equip || []).includes(q))); return e ? e.key : "Fullt gym"; };
const STEPS = ["Mål", "Split", "Nivå", "Dagar", "Veckodagar", "Utrustning", "Tid", "Förhandsvisning"];
function Flow({ equip, onDone, onCancel }) {
  const [i, setI] = useState(0);
  const [s, setS] = useState({ goal: "Hypertrophy", family: null, level: "Intermediate", days: null, weekdays: null, equip: equip || [], duration: 45 });
  const recFamilies = FAMILY_NAMES.filter(f => FAMILIES[f].goal === s.goal);
  const preview = useMemo(() => s.family ? generateProgram(s.family, s.level, { days: s.days || FAMILIES[s.family].rec[0], equip: s.equip, goal: s.goal, weekdays: s.weekdays, sessionDuration: s.duration }) : null, [s]);
  const next = () => setI(x => Math.min(STEPS.length - 1, x + 1));
  const back = () => i === 0 ? onCancel() : setI(x => x - 1);
  const goalOpt = ["Strength", "Hypertrophy", "General"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={back} style={{ ...btn.icon, width: 34, height: 34 }}>‹</button>
        <div style={{ flex: 1 }}>
          <div style={{ ...sub }}>Steg {i + 1} / {STEPS.length} · {STEPS[i]}</div>
          <div style={{ height: 4, borderRadius: 3, background: T.bg.muted, marginTop: 6, overflow: "hidden" }}><div style={{ height: "100%", width: `${(i + 1) / STEPS.length * 100}%`, background: T.accent.primary }} /></div>
        </div>
      </div>

      {i === 0 && <StepCards title="Vad är ditt mål?" options={goalOpt.map(g => ({ v: g, t: goalSv(g), d: g === "Strength" ? "Bli starkare — låga reps, tunga lyft." : g === "Hypertrophy" ? "Bygg muskler — högre volym." : "Allmän hälsa och form." }))} value={s.goal} onPick={v => { setS({ ...s, goal: v, family: null }); next(); }} />}
      {i === 1 && <StepCards title="Träningsstil / split" options={FAMILY_NAMES.map(f => ({ v: f, t: f, d: FAMILIES[f].desc, rec: FAMILIES[f].goal === s.goal }))} value={s.family} onPick={v => { setS({ ...s, family: v, days: FAMILIES[v].rec[0] }); next(); }} />}
      {i === 2 && <StepCards title="Nivå" options={LEVEL_NAMES.map(l => ({ v: l, t: l, d: `${LEVELS[l].defaultDays} dagar rek. · RIR ${LEVELS[l].rir} · ${LEVELS[l].progression}` }))} value={s.level} onPick={v => { setS({ ...s, level: v }); next(); }} />}
      {i === 3 && <div><H t="Dagar per vecka" /><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{[2, 3, 4, 5, 6].map(d => { const rec = FAMILIES[s.family].rec.includes(d); return <button key={d} onClick={() => { setS({ ...s, days: d, weekdays: defaultWeekdays(d) }); next(); }} style={{ ...chip(s.days === d), padding: "12px 20px", fontSize: 14, position: "relative" }}>{d} dagar {rec && <span style={{ fontSize: 9, color: T.accent.success, display: "block" }}>rekommenderat</span>}</button>; })}</div></div>}
      {i === 4 && <div><H t="Vilka veckodagar?" /><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{WEEKDAYS.map(d => { const on = (s.weekdays || []).includes(d); return <button key={d} onClick={() => setS({ ...s, weekdays: on ? s.weekdays.filter(x => x !== d) : [...(s.weekdays || []), d] })} style={chip(on)}>{d}</button>; })}</div><button onClick={next} style={{ ...btn.primary, marginTop: 14, padding: "9px 18px" }}>Fortsätt ›</button></div>}
      {i === 5 && <div><H t="Vilken utrustning har du?" /><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))", gap: 10 }}>{EQUIP_PRESETS.map(o => (
        <button key={o.key} onClick={() => { setS({ ...s, equip: o.equip, equipPreset: o.key }); next(); }} style={{ textAlign: "left", cursor: "pointer", border: `1px solid ${s.equipPreset === o.key ? T.accent.primary : T.bg.muted}`, borderRadius: 12, background: s.equipPreset === o.key ? "rgba(77,163,255,0.10)" : T.bg.raised, padding: 13 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{o.key}</div>
          <div style={{ fontSize: 12, color: T.text.muted, marginTop: 4, lineHeight: 1.4 }}>{o.d}</div>
        </button>
      ))}</div></div>}
      {i === 6 && <div><H t="Passlängd" /><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{[30, 45, 60, 75, 90].map(m => <button key={m} onClick={() => { setS({ ...s, duration: m }); next(); }} style={{ ...chip(s.duration === m), padding: "12px 18px", fontSize: 14 }}>{m} min</button>)}</div></div>}
      {i === 7 && preview && <div><H t="Förhandsvisning" /><ProgramDetail program={preview} isTemplate onClose={onCancel} onActivate={() => onDone(preview, "activate")} onEdit={() => onDone(preview, "edit")} onDuplicate={() => onDone(preview, "duplicate")} onArchive={() => { }} /></div>}
    </div>
  );
}
const H = ({ t }) => <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>{t}</div>;
function StepCards({ title, options, value, onPick }) {
  return <div><H t={title} /><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 10 }}>{options.map(o => (
    <button key={o.v} onClick={() => onPick(o.v)} style={{ textAlign: "left", cursor: "pointer", border: `1px solid ${value === o.v ? T.accent.primary : T.bg.muted}`, borderRadius: 12, background: value === o.v ? "rgba(77,163,255,0.10)" : T.bg.raised, padding: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 14, fontWeight: 700 }}>{o.t}</span>{o.rec && <span style={{ fontSize: 9, fontWeight: 700, color: T.accent.success }}>REK.</span>}</div>
      <div style={{ fontSize: 12, color: T.text.muted, marginTop: 4, lineHeight: 1.4 }}>{o.d}</div>
    </button>
  ))}</div></div>;
}

// ── Huvudvy ──
export function ProgramsView({ programs = [], setPrograms, activeProgramId, setActiveProgramId, equip, overallReadiness, sessions = [], profileGoal, goalProfile = null, onStartProgram }) {
  const [screen, setScreen] = useState("browse");   // browse | flow | detail | builder
  const [selected, setSelected] = useState(null);   // program to view/edit
  const [tab, setTab] = useState("rek");             // rek | bibliotek | mina
  const [fFamily, setFFamily] = useState("Alla"); const [fLevel, setFLevel] = useState("Alla");

  const mine = programs.filter(p => !p.archived);
  const archived = programs.filter(p => p.archived);
  const recs = useMemo(() => recommendPrograms({ goal: profileGoal, weights: goalProfile && goalProfile.weights, days: null, equip, recovery: overallReadiness, history: sessions }), [equip, overallReadiness, sessions, profileGoal, goalProfile]);

  const saveProgram = (prog, activate) => { setPrograms(list => { const i = list.findIndex(x => x.id === prog.id); return i >= 0 ? list.map(x => x.id === prog.id ? prog : x) : [...list, prog]; }); if (activate) setActiveProgramId(prog.id); };
  const activate = (prog) => { const copy = prog.isTemplate ? copyProgram(prog, { active: true }) : prog; saveProgram(copy, true); setActiveProgramId(copy.id); setSelected(copy); setScreen("detail"); };
  const editProgram = (prog) => { const target = prog.isTemplate ? copyProgram(prog) : prog; setSelected(target); setScreen("builder"); };
  const duplicate = (prog) => { const copy = copyProgram(prog, { name: prog.name + " (kopia)" }); saveProgram(copy, false); setSelected(copy); setScreen("detail"); };
  const archive = (prog) => { saveProgram({ ...prog, archived: !prog.archived }, false); if (activeProgramId === prog.id) setActiveProgramId(null); setScreen("browse"); };
  const applyProposal = (proposal) => { const updated = applyChange(selected, proposal.mutate, proposal.note); saveProgram(updated, activeProgramId === updated.id); setSelected(updated); };
  const restoreVer = (idx) => { const updated = restoreVersion(selected, idx); saveProgram(updated, activeProgramId === updated.id); setSelected(updated); };

  if (screen === "flow") return <Flow equip={equip} onCancel={() => setScreen("browse")} onDone={(prog, action) => { if (action === "activate") activate(prog); else if (action === "edit") editProgram(prog); else duplicate(prog); }} />;
  if (screen === "builder" && selected) return <Builder initial={selected} onCancel={() => setScreen("browse")} onSave={prog => { saveProgram(prog, activeProgramId === prog.id); setSelected(prog); setScreen("detail"); }} />;
  if (screen === "detail" && selected) {
    const isTpl = !!selected.isTemplate; const active = activeProgramId === selected.id;
    return <ProgramDetail program={selected} active={active} isTemplate={isTpl}
      onActivate={() => activate(selected)} onEdit={() => editProgram(selected)} onDuplicate={() => duplicate(selected)} onArchive={() => archive(selected)}
      onStart={onStartProgram ? () => onStartProgram(selected) : null} onClose={() => setScreen("browse")}
      sessions={sessions} readiness={overallReadiness} onApplyProposal={applyProposal} onRestoreVersion={restoreVer} />;
  }

  const view = (prog) => { setSelected(prog); setScreen("detail"); };
  const filteredLib = ALL_TEMPLATES.filter(t => (fFamily === "Alla" || t.family === fFamily) && (fLevel === "Alla" || t.level === fLevel));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[["rek", "Rekommenderat"], ["bibliotek", "Bibliotek"], ["mina", `Mina program${mine.length ? ` (${mine.length})` : ""}`]].map(([k, t]) => (
            <button key={k} onClick={() => setTab(k)} style={{ ...chip(tab === k), padding: "8px 14px" }}>{t}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setScreen("flow")} style={{ ...btn.primary, padding: "9px 16px" }}>✨ Guidat val</button>
          <button onClick={() => { setSelected(normalizeProgram({ id: "prog_" + Math.random().toString(36).slice(2, 9), name: "Nytt program", family: "Egen split", level: "Intermediate", goal: "Hypertrophy", split: "Egen split", daysPerWeek: 3, weekdays: defaultWeekdays(3), equipment: equip || [], sessionDuration: 45, workouts: [{ id: "wo1", name: "Pass A", exercises: [] }, { id: "wo2", name: "Pass B", exercises: [] }, { id: "wo3", name: "Pass C", exercises: [] }], isTemplate: false })); setScreen("builder"); }} style={{ ...btn.pill, padding: "9px 16px" }}>+ Bygg eget</button>
        </div>
      </div>

      {tab === "rek" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, color: T.text.secondary }}>ATLAS-coachen föreslår utifrån {profileGoal ? `mål (${goalSv(profileGoal)}), ` : ""}nivå, återhämtning ({overallReadiness || "–"}) och din historik ({sessions.length} pass). Alla alternativ går att välja — det här är bara de mest lämpliga.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {recs.slice(0, 6).map((r, i) => <ProgramCard key={r.template.id} program={r.template} badge={i === 0 ? { t: "Bäst för dig", c: T.accent.success } : r.recommended ? { t: "Rekommenderad", c: T.accent.primary } : null} onClick={() => view(r.template)} />)}
          </div>
        </div>
      )}

      {tab === "bibliotek" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <div><div style={{ ...sub, marginBottom: 5 }}>Familj</div><div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{["Alla", ...FAMILY_NAMES].map(f => <button key={f} onClick={() => setFFamily(f)} style={chip(fFamily === f)}>{f}</button>)}</div></div>
            <div><div style={{ ...sub, marginBottom: 5 }}>Nivå</div><div style={{ display: "flex", gap: 5 }}>{["Alla", ...LEVEL_NAMES].map(l => <button key={l} onClick={() => setFLevel(l)} style={chip(fLevel === l)}>{l}</button>)}</div></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {filteredLib.map(t => <ProgramCard key={t.id} program={t} onClick={() => view(t)} />)}
          </div>
        </div>
      )}

      {tab === "mina" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mine.length === 0 && <Card pad={18}><div style={{ fontSize: 13.5, color: T.text.secondary }}>Du har inga egna program än. Använd <b>Guidat val</b>, aktivera en mall från biblioteket, eller <b>Bygg eget</b> — mallar bevaras alltid, redigering skapar en personlig kopia.</div></Card>}
          {mine.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {mine.map(p => <ProgramCard key={p.id} program={p} active={p.id === activeProgramId} badge={p.id === activeProgramId ? { t: "● Aktivt", c: T.accent.success } : null} onClick={() => view(p)} />)}
          </div>}
          {archived.length > 0 && <div><div style={{ ...sub, margin: "6px 0" }}>Arkiverade</div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>{archived.map(p => <ProgramCard key={p.id} program={p} onClick={() => view(p)} />)}</div></div>}
        </div>
      )}
    </div>
  );
}
