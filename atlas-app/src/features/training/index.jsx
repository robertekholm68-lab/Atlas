// FEATURE: Training
import { useState, useEffect } from "react";
import { BodyMapCard } from "../body-map/index.jsx";
import { Card, CardLabel, Stepper } from "../../components/common/index.jsx";
import { coachFor, progressionSuggestion, subExercise, lastPerformance } from "../../engines/index.js";
import { updateSet as sessionUpdateSet, deleteSet as sessionDeleteSet } from "../../engines/session.js";
import { CUES, EQUIP_ALL, EXERCISES, EX_GROUPS, WORKOUTS } from "../../data/exercises.js";
import { MUSCLES } from "../../data/muscles.js";
import { T, WORKOUT_COLOR, btn, input, lbl, modal, now, overlay } from "../../data/tokens.js";
import { ChevronLeft, X, Sparkles, Check, Circle, ArrowRight, ArrowLeftRight, Copy, Target, Dumbbell, Trophy, Flame, Repeat } from "lucide-react";

// Svenska statusetiketter för muskelstatus (post-session).
const STATUS_LABEL = { critical: "Kritisk", recovering: "Återhämtar", nearly_ready: "Nästan redo", ready: "Redo", undertrained: "Otränad", no_data: "—" };

function RestTimer() {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [remaining]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
      <span style={{ fontSize: 12, color: T.text.muted }}>Rest</span>
      {[60, 90, 120].map(s => (
        <button key={s} onClick={() => setRemaining(s)} style={{ ...btn.tag, background: T.bg.raised, color: T.text.secondary }}>{s}s</button>
      ))}
      {remaining > 0 && (
        <span style={{ marginLeft: "auto", fontSize: 20, fontWeight: 700, color: T.accent.primary, fontVariantNumeric: "tabular-nums" }}>
          {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
        </span>
      )}
    </div>
  );
}

function SessionModal({ onComplete, onClose }) {
  const [sets, setSets] = useState([]);
  const [selectedEx, setSelectedEx] = useState(null);
  const [search, setSearch] = useState("");
  const [weight, setWeight] = useState(20);
  const [reps, setReps] = useState(8);
  const [duration, setDuration] = useState(30);
  const [rpe, setRpe] = useState(null);
  const [saving, setSaving] = useState(false);
  const isTime = selectedEx?.loadMode === "time";
  const isBw = selectedEx?.loadMode === "bodyweight";

  const pick = ex => {
    setSelectedEx(ex);
    const last = [...sets].reverse().find(s => s.exerciseId === ex.id);
    if (last) { setWeight(last.weight || 20); setReps(last.reps || 8); setDuration(last.duration || 30); setRpe(last.rpe); }
    else { setWeight(ex.loadMode === "bodyweight" ? 0 : 20); setReps(8); setDuration(30); setRpe(null); }
  };
  const addSet = () => {
    if (!selectedEx) return;
    setSets(s => [...s, { exerciseId: selectedEx.id, weight: isBw ? 0 : weight, reps, rpe, duration }]);
  };
  const complete = () => {
    if (!sets.length) return; setSaving(true);
    const title = sets.length ? `${[...new Set(sets.map(s => EXERCISES.find(e => e.id === s.exerciseId)?.pattern.split(" ")[0]))].slice(0, 2).join(" & ")} Session` : "Session";
    // Skickar RÅ payload med kompletta sets — App bygger den kanoniska sessionen (id/sets/muscleLoads/bodyweight).
    setTimeout(() => onComplete({ title, completedAt: Date.now(), sets: sets.slice(), source: "quicklog" }), 700);
  };

  const exSets = sets.filter(s => s.exerciseId === selectedEx?.id);
  const filtered = EXERCISES.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.pattern.toLowerCase().includes(search.toLowerCase()) || (e.aka || []).some(a => a.toLowerCase().includes(search.toLowerCase())));

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <span style={{ fontSize: 20, fontWeight: 800, color: T.text.primary }}>Log Session</span>
            {sets.length > 0 && <div style={{ fontSize: 12, color: T.text.muted }}>{new Set(sets.map(s => s.exerciseId)).size} exercises · {sets.length} sets</div>}
          </div>
          <button onClick={onClose} style={btn.icon}>×</button>
        </div>

        {!selectedEx ? (
          <>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exercises…" style={{ ...input, marginBottom: 10 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 360, overflowY: "auto" }}>
              {filtered.map(e => {
                const n = sets.filter(s => s.exerciseId === e.id).length;
                return (
                  <button key={e.id} onClick={() => pick(e)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 12px", background: T.bg.raised, border: "none", borderRadius: 9, cursor: "pointer", textAlign: "left" }}>
                    <div><div style={{ fontSize: 14, color: T.text.primary }}>{e.name}</div><div style={{ fontSize: 11, color: T.text.muted }}>{e.pattern} · {e.equipment}</div></div>
                    {n > 0 && <span style={{ fontSize: 11, color: T.accent.success, background: T.bg.muted, borderRadius: 20, padding: "3px 9px" }}>{n} set{n !== 1 ? "s" : ""}</span>}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <button onClick={() => setSelectedEx(null)} style={{ background: "none", border: "none", color: T.accent.primary, cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 10 }}>‹ All exercises</button>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.text.primary, marginBottom: 12 }}>{selectedEx.name}</div>

            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              {isTime ? <Stepper label="Duration" value={duration} step={5} min={5} unit="s" onChange={setDuration} />
                : <>
                  {!isBw && <Stepper label="Weight" value={weight} step={2.5} min={0} unit="kg" onChange={setWeight} />}
                  <Stepper label="Reps" value={reps} step={1} min={1} unit="" onChange={setReps} />
                </>}
            </div>

            <label style={lbl}>RPE (optional)</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {[6, 7, 8, 9, 10].map(v => (
                <button key={v} onClick={() => setRpe(rpe === v ? null : v)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: rpe === v ? T.accent.primary : T.bg.raised, color: rpe === v ? "#fff" : T.text.secondary }}>{v}</button>
              ))}
            </div>

            <button onClick={addSet} style={{ ...btn.primary, width: "100%" }}>
              + Add Set {isTime ? `(${duration}s)` : isBw ? `(BW × ${reps})` : `(${weight}kg × ${reps})`}
            </button>

            <RestTimer />

            {exSets.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <label style={lbl}>{selectedEx.name} — {exSets.length} set{exSets.length !== 1 ? "s" : ""}</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {sets.map((s, i) => s.exerciseId !== selectedEx.id ? null : (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 11px", background: T.bg.raised, borderRadius: 7, fontSize: 13 }}>
                      <span style={{ color: T.text.muted }}>Set {sets.slice(0, i + 1).filter(x => x.exerciseId === s.exerciseId).length}</span>
                      <span style={{ color: T.text.secondary }}>{isTime ? `${s.duration}s` : isBw ? `BW × ${s.reps}` : `${s.weight}kg × ${s.reps}`}{s.rpe ? ` @ RPE ${s.rpe}` : ""}</span>
                      <button onClick={() => setSets(ss => ss.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: T.text.muted, cursor: "pointer" }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {sets.length > 0 && (
          <button onClick={complete} disabled={saving} style={{ ...btn.primary, width: "100%", marginTop: 16, background: T.accent.success }}>
            {saving ? "Saving…" : `Complete Session · ${sets.length} set${sets.length !== 1 ? "s" : ""}`}
          </button>
        )}
      </div>
    </div>
  );
}

// Avslutningsmomentet — allt härleds ur den sparade sessionen (inga påhittade siffror).
function StatTile({ icon, value, unit, label, color }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: T.bg.raised, borderRadius: 11, padding: "12px 10px", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", color: color || T.text.muted, marginBottom: 5 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: T.text.primary, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
        {value}{unit && <span style={{ fontSize: 11, fontWeight: 600, color: T.text.muted, marginLeft: 2 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 10.5, color: T.text.muted, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

function PostSessionModal({ session, muscleStates, recommendation, onClose }) {
  const sets = session.sets || [];
  const totalSets = sets.length;
  const exCount = new Set(sets.map(s => s.exerciseId)).size;
  const volume = Math.round(sets.reduce((a, s) => a + ((s.weight || 0) * (s.reps || 0)), 0));
  const loads = session.muscleLoads || {};
  const totalLoad = Math.round(Object.values(loads).reduce((a, b) => a + b, 0));
  const trained = Object.entries(loads).filter(([, v]) => v > 5).sort(([, a], [, b]) => b - a).slice(0, 6);
  const maxLoad = trained.length ? trained[0][1] : 1;

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, maxWidth: 480, padding: 0, overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        {/* firande header-band */}
        <div style={{ padding: "22px 22px 18px", background: `linear-gradient(180deg, rgba(57,217,138,0.16), rgba(57,217,138,0.02))`, borderBottom: `1px solid ${T.bg.muted}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.accent.success, marginBottom: 6 }}>
            <Trophy size={16} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2 }}>Pass avslutat</span>
          </div>
          <div style={{ fontSize: 23, fontWeight: 800, color: T.text.primary }}>{session.title}</div>
        </div>

        <div style={{ padding: "18px 22px 22px" }}>
          {/* nyckeltal */}
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            {volume > 0 && <StatTile icon={<Dumbbell size={16} />} value={volume.toLocaleString("sv-SE")} unit="kg" label="Volym" />}
            <StatTile icon={<Repeat size={16} />} value={totalSets} label={`set · ${exCount} öv`} />
            <StatTile icon={<Flame size={16} />} value={totalLoad} label="Träningslast" color={T.accent.warning} />
          </div>

          {/* muskler + hur mycket last var, och kroppens nya status */}
          {trained.length > 0 && (
            <>
              <label style={lbl}>Muskler du tränade · kroppens status uppdaterad</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
                {trained.map(([id, load]) => {
                  const s = muscleStates[id];
                  const col = s ? T.status[s.status] : T.status.no_data;
                  const pct = Math.max(6, Math.round((load / maxLoad) * 100));
                  return (
                    <div key={id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 116, flexShrink: 0, fontSize: 12.5, color: T.text.secondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{MUSCLES[id]?.name}</div>
                      <div style={{ flex: 1, height: 8, background: T.bg.raised, borderRadius: 5, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: col, borderRadius: 5, transition: "width .5s ease" }} />
                      </div>
                      <div style={{ width: 74, flexShrink: 0, textAlign: "right", fontSize: 10.5, fontWeight: 600, color: col, textTransform: "uppercase", letterSpacing: 0.3 }}>{s ? STATUS_LABEL[s.status] : "—"}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* nästa bästa beslut */}
          <div style={{ padding: "13px 15px", background: T.bg.raised, borderRadius: 11, borderLeft: `3px solid ${T.accent.primary}`, marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.accent.primary, marginBottom: 3 }}>
              <ArrowRight size={13} />
              <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Nästa rekommendation</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text.primary, marginTop: 2 }}>{recommendation.title}</div>
            <div style={{ fontSize: 13, color: T.text.secondary, marginTop: 4, lineHeight: 1.5 }}>{recommendation.summary}</div>
          </div>

          <button onClick={onClose} style={{ ...btn.primary, width: "100%" }}>Till översikten</button>
        </div>
      </div>
    </div>
  );
}

function TrainingMode({ muscleStates, onComplete, onExit, equip, sessions, seed = null }) {
  const eq = equip || EQUIP_ALL;
  const allSessions = sessions || [];
  const [sets, setSets] = useState([]);
  const [ex, setEx] = useState(null);
  const [picking, setPicking] = useState(true);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("All");
  const [weight, setWeight] = useState(20);
  const [reps, setReps] = useState(8);
  const [duration, setDuration] = useState(30);
  const [rpe, setRpe] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [showCues, setShowCues] = useState(true);
  const [plan, setPlan] = useState(null);
  const [pickTab, setPickTab] = useState("programs");

  const isTime = ex && ex.loadMode === "time";
  const isBw = ex && ex.loadMode === "bodyweight";
  const coach = coachFor(ex, muscleStates);

  const pick = e => {
    setEx(e); setPicking(false);
    // Ladda tidigare prestation: innevarande pass först, annars ur historiken (valfri loggnings-väg).
    const last = [...sets].reverse().find(s => s.exerciseId === e.id) || lastPerformance(allSessions, e.id);
    if (last) { setWeight(last.weight || 20); setReps(last.reps || 8); setDuration(last.duration || 30); setRpe(last.rpe); }
    else { setWeight(e.loadMode === "bodyweight" ? 0 : 20); setReps(8); setDuration(30); setRpe(null); }
  };
  const pickPlan = (e, target) => {
    setEx(e); setPicking(false);
    const last = [...sets].reverse().find(s => s.exerciseId === e.id) || lastPerformance(allSessions, e.id);
    if (e.loadMode === "time") setDuration(target || 30); else setReps(target || 8);
    if (last) { setWeight(last.weight || 20); setRpe(last.rpe); }
    else { setWeight(e.loadMode === "bodyweight" ? 0 : 20); setRpe(null); }
  };
  const startProgram = w => {
    const resolved = w.plan.map(([id, s2, reps]) => {
      const orig = EXERCISES.find(x => x.id === id);
      const use = orig ? subExercise(orig, eq) : null;
      return { id: use ? use.id : id, sets: s2, reps, from: use && orig && use.id !== orig.id ? orig.name : null, missing: !use };
    });
    setPlan(resolved);
    const first = EXERCISES.find(x => x.id === resolved[0].id);
    if (first) pickPlan(first, resolved[0].reps);
  };
  useEffect(() => { if (seed && seed.items && seed.items.length) startProgram({ plan: seed.items.map(x => [x.exId, x.sets, x.repMin]) }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const addSet = () => ex && setSets(s => [...s, { exerciseId: ex.id, weight: isBw ? 0 : weight, reps, rpe, duration }]);
  const prevSets = ex ? lastSessionSets(allSessions, ex.id) : null;
  const copyLast = () => { if (!prevSets) return; setSets(s => [...s, ...prevSets.sets.map(p => ({ exerciseId: ex.id, weight: isBw ? 0 : (p.weight ?? weight), reps: p.reps ?? reps, rpe: p.rpe ?? null, duration: isTime ? duration : null }))]); };
  const complete = () => {
    if (!sets.length) return; setSaving(true);
    const title = `${[...new Set(sets.map(s => (EXERCISES.find(e => e.id === s.exerciseId) || {}).group))].slice(0, 2).join(" & ")}-pass`;
    setTimeout(() => onComplete({ title, completedAt: Date.now(), sets: sets.slice(), source: "training" }), 650);
  };

  const exSets = sets.filter(s => ex && s.exerciseId === ex.id);
  const filtered = EXERCISES.filter(e =>
    eq.includes(e.equipment) &&
    (group === "All" || e.group === group) &&
    (e.name.toLowerCase().includes(q.toLowerCase()) || e.pattern.toLowerCase().includes(q.toLowerCase()) || e.equipment.toLowerCase().includes(q.toLowerCase()) || (e.aka || []).some(a => a.toLowerCase().includes(q.toLowerCase()))));
  const totalEx = new Set(sets.map(s => s.exerciseId)).size;

  // Next-exercise suggestion: program order first, else best-recovered untrained muscle.
  const suggestion = (() => {
    if (plan) {
      const n = plan.find(p => sets.filter(s => s.exerciseId === p.id).length < p.sets && (!ex || p.id !== ex.id));
      if (n) { const e = EXERCISES.find(x => x.id === n.id); if (e) return { ex: e, reps: n.reps, why: "Nästa i programmet" }; }
    }
    const trained = new Set(sets.map(s => s.exerciseId));
    const sessLoad = {};
    sets.forEach(s => { const e = EXERCISES.find(x => x.id === s.exerciseId); if (e) e.activation.forEach(a => { sessLoad[a.muscleId] = (sessLoad[a.muscleId] || 0) + a.factor; }); });
    const cand = Object.entries(muscleStates)
      .filter(([, st]) => st.recoveryScore > 60)
      .map(([id, st]) => ({ id, r: st.recoveryScore, load: sessLoad[id] || 0 }))
      .sort((a, b) => a.load - b.load || b.r - a.r);
    for (const c of cand) {
      const e = EXERCISES.find(x => eq.includes(x.equipment) && x.id !== (ex && ex.id) && !trained.has(x.id) && ((x.activation.find(a => a.muscleId === c.id) || {}).factor || 0) >= 0.8);
      if (e) return { ex: e, reps: 8, why: `${MUSCLES[c.id].name} är redo (${c.r}%)` };
    }
    return null;
  })();

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 900, background: T.bg.app, display: "flex", flexDirection: "column", animation: "fadeIn 0.25s ease" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px", borderBottom: `1px solid ${T.bg.muted}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => sets.length ? setConfirmExit(true) : onExit()} title="Tillbaka" aria-label="Tillbaka" style={{ ...btn.icon }}><ChevronLeft size={18} /></button>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent.danger }} />
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: 0.3 }}>Träningsläge</span>
          <span style={{ fontSize: 13, color: T.text.muted }}>{totalEx} övningar · {sets.length} set</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={complete} disabled={!sets.length || saving} style={{ ...btn.primary, background: T.accent.success, opacity: sets.length ? 1 : 0.4 }}>
            {saving ? "Sparar…" : "Avsluta pass"}
          </button>
          <button onClick={() => sets.length ? setConfirmExit(true) : onExit()} style={btn.icon}><X size={18} /></button>
        </div>
      </div>

      {/* body: large map + control panel */}
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0,1.35fr) minmax(340px, 0.85fr)" }} className="tm-grid">
        <div style={{ minHeight: 0, borderRight: `1px solid ${T.bg.muted}`, padding: 10 }}>
          <BodyMapCard muscleStates={muscleStates} selectedId={null} onSelect={() => setPicking(true)} previewExercise={ex} onClearPreview={() => { setEx(null); setPicking(true); }} />
        </div>

        <div style={{ minHeight: 0, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* coach */}
          <div style={{ padding: "12px 14px", background: T.bg.surface, border: `1px solid ${T.bg.muted}`, borderLeft: `3px solid ${coach.tone}`, borderRadius: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Sparkles size={13} color={T.accent.secondary} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: T.accent.secondary, textTransform: "uppercase" }}>AI Coach</span>
            </div>
            <div style={{ fontSize: 13.5, color: T.text.secondary, lineHeight: 1.5 }}>{coach.text}</div>
          </div>

          {picking ? (
            <>
              <div style={{ display: "flex", gap: 6, background: T.bg.raised, borderRadius: 10, padding: 4 }}>
                {[["programs", "Program"], ["exercises", "Övningar"]].map(([k, lab]) => (
                  <button key={k} onClick={() => setPickTab(k)} style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: pickTab === k ? T.accent.primary : "transparent", color: pickTab === k ? "#fff" : T.text.secondary }}>{lab}</button>
                ))}
              </div>

              {pickTab === "programs" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {WORKOUTS.map(w => (
                    <button key={w.id} onClick={() => startProgram(w)}
                      style={{ textAlign: "left", padding: "13px 14px", background: T.bg.surface, border: `1px solid ${T.bg.muted}`, borderLeft: `3px solid ${WORKOUT_COLOR[w.level]}`, borderRadius: 10, cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: T.text.primary }}>{w.name}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: WORKOUT_COLOR[w.level], border: `1px solid ${WORKOUT_COLOR[w.level]}`, borderRadius: 12, padding: "2px 8px" }}>{w.level}</span>
                      </div>
                      <div style={{ fontSize: 12, color: T.text.muted, marginTop: 3 }}>{w.focus} · {w.plan.length} övningar · ~{w.mins} min</div>
                      <div style={{ fontSize: 12.5, color: T.text.secondary, marginTop: 6, lineHeight: 1.5 }}>{w.desc}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <input value={q} onChange={e => setQ(e.target.value)} placeholder="Sök övning…" style={input} />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {["All", ...EX_GROUPS].map(g => (
                      <button key={g} onClick={() => setGroup(g)} style={{ ...btn.tag, fontSize: 12, background: group === g ? T.accent.primary : T.bg.raised, color: group === g ? "#fff" : T.text.secondary }}>{g}</button>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {filtered.map(e => {
                      const n = sets.filter(s => s.exerciseId === e.id).length;
                      return (
                        <button key={e.id} onClick={() => pick(e)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 12px", background: T.bg.surface, border: `1px solid ${T.bg.muted}`, borderRadius: 9, cursor: "pointer", textAlign: "left" }}>
                          <div><div style={{ fontSize: 14, color: T.text.primary }}>{e.name}</div><div style={{ fontSize: 11, color: T.text.muted }}>{e.group} · {e.equipment}</div></div>
                          {n > 0 && <span style={{ fontSize: 11, color: T.accent.success }}>{n} set</span>}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {plan && (
                <div style={{ background: T.bg.surface, border: `1px solid ${T.bg.muted}`, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: T.text.muted, textTransform: "uppercase", marginBottom: 8 }}>Dagens program</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {plan.map((p, i) => {
                      const pe = EXERCISES.find(x => x.id === p.id); if (!pe) return null;
                      const done = sets.filter(s => s.exerciseId === p.id).length;
                      const isCur = ex && ex.id === p.id;
                      const complete2 = done >= p.sets;
                      return (
                        <button key={p.id + i} onClick={() => pickPlan(pe, p.reps)}
                          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 9px", borderRadius: 7, border: "none", cursor: "pointer", textAlign: "left",
                            background: isCur ? "rgba(77,163,255,0.15)" : "transparent" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: complete2 ? T.text.muted : T.text.primary }}>
                            {complete2 ? <Check size={14} color={T.accent.success} /> : <Circle size={13} color={T.text.muted} />}
                            <span>{pe.name}{p.from && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, color: T.accent.secondary, marginLeft: 5 }}><ArrowLeftRight size={10} /> {p.from}</span>}</span>
                          </span>
                          <span style={{ fontSize: 11, color: T.text.muted }}>{done}/{p.sets} × {pe.loadMode === "time" ? `${p.reps}s` : p.reps}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: T.text.primary }}>{ex.name}</div>
                <button onClick={() => setPicking(true)} style={{ ...btn.tag, background: T.bg.raised, color: T.accent.primary }}>Byt övning</button>
              </div>

              {(() => {
                const prog = progressionSuggestion(ex.id, allSessions, reps);
                if (!prog) return null;
                return (
                  <div style={{ padding: "11px 13px", background: "linear-gradient(180deg, rgba(57,217,138,0.12), rgba(57,217,138,0.04))", border: `1px solid ${T.accent.success}`, borderRadius: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: T.accent.success, textTransform: "uppercase" }}>Progression</div>
                        <div style={{ fontSize: 13.5, color: T.text.primary, marginTop: 3 }}>
                          Förra: {prog.prev.weight} kg × {prog.prev.reps}{prog.prev.rpe ? ` (RPE ${prog.prev.rpe})` : ""} · <span style={{ color: T.accent.success, fontWeight: 700 }}>prova {prog.weight} kg × {prog.reps}</span>
                        </div>
                        <div style={{ fontSize: 11, color: T.text.muted, marginTop: 2 }}>{prog.note}</div>
                      </div>
                      <button onClick={() => { setWeight(prog.weight); setReps(prog.reps); }} style={{ ...btn.primary, background: T.accent.success, padding: "8px 14px", flexShrink: 0 }}>Använd</button>
                    </div>
                  </div>
                );
              })()}

              {CUES[ex.id] && (
                <div style={{ background: T.bg.surface, border: `1px solid ${T.bg.muted}`, borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, letterSpacing: 1, color: T.accent.primary, textTransform: "uppercase", marginBottom: 4 }}><Target size={12} /> Teknik</div>
                  {CUES[ex.id].map((c, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 7 }}>
                      <span style={{ color: T.accent.primary, fontSize: 13, lineHeight: 1.5 }}>•</span>
                      <span style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.5 }}>{c}</span>
                    </div>
                  ))}
                  <div style={{ fontSize: 11, color: T.text.muted, marginTop: 8 }}>Källa: muscles.se</div>
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                {isTime ? <Stepper label="Tid" value={duration} step={5} min={5} unit="s" onChange={setDuration} />
                  : <>
                    {!isBw && <Stepper label="Vikt" value={weight} step={2.5} min={0} unit="kg" onChange={setWeight} />}
                    <Stepper label="Reps" value={reps} step={1} min={1} unit="" onChange={setReps} />
                  </>}
              </div>

              <div>
                <label style={lbl}>RPE (valfritt)</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {[6, 7, 8, 9, 10].map(v => (
                    <button key={v} onClick={() => setRpe(rpe === v ? null : v)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: rpe === v ? T.accent.primary : T.bg.raised, color: rpe === v ? "#fff" : T.text.secondary }}>{v}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={addSet} style={{ ...btn.primary, flex: 1, minWidth: 180 }}>
                  + Lägg till set {isTime ? `(${duration}s)` : isBw ? `(BW × ${reps})` : `(${weight}kg × ${reps})`}
                </button>
                {prevSets && (
                  <button onClick={copyLast} title={`Fyller på ${prevSets.count} set från förra passet`} style={{ ...btn.tag, display: "inline-flex", alignItems: "center", gap: 6, background: T.bg.raised, color: T.accent.primary, border: `1px solid ${T.accent.primary}`, padding: "0 16px" }}>
                    <Copy size={13} /> Kopiera förra passet ({prevSets.count} set)
                  </button>
                )}
              </div>

              <RestTimer />

              {suggestion && suggestion.ex && (!ex || suggestion.ex.id !== ex.id) && (
                <button onClick={() => pickPlan(suggestion.ex, suggestion.reps)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", background: "linear-gradient(180deg, rgba(155,124,255,0.14), rgba(155,124,255,0.05))", border: `1px solid ${T.accent.secondary}`, borderRadius: 10, cursor: "pointer", textAlign: "left" }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: T.accent.secondary, textTransform: "uppercase" }}>Nästa övning</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.text.primary, marginTop: 2 }}>{suggestion.ex.name}</div>
                    <div style={{ fontSize: 11, color: T.text.muted }}>{suggestion.why}</div>
                  </div>
                  <ArrowRight size={18} color={T.accent.secondary} />
                </button>
              )}

              {exSets.length > 0 && (
                <div>
                  <label style={lbl}>{ex.name} — {exSets.length} set</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {sets.map((s, i) => s.exerciseId !== ex.id ? null : (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 11px", background: T.bg.surface, border: `1px solid ${T.bg.muted}`, borderRadius: 7, fontSize: 13 }}>
                        <span style={{ color: T.text.muted }}>Set {sets.slice(0, i + 1).filter(x => x.exerciseId === s.exerciseId).length}</span>
                        <span style={{ color: T.text.secondary }}>{isTime ? `${s.duration}s` : isBw ? `BW × ${s.reps}` : `${s.weight}kg × ${s.reps}`}{s.rpe ? ` @ RPE ${s.rpe}` : ""}</span>
                        <button onClick={() => setSets(ss => ss.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: T.text.muted, cursor: "pointer" }}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {confirmExit && (
        <div style={overlay} onClick={() => setConfirmExit(false)}>
          <div style={{ ...modal, maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Avbryt passet?</div>
            <div style={{ fontSize: 13, color: T.text.muted, marginBottom: 16 }}>Du har {sets.length} loggade set som inte sparats.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmExit(false)} style={{ ...btn.pill, flex: 1 }}>Fortsätt passet</button>
              <button onClick={onExit} style={{ ...btn.primary, flex: 1, background: T.accent.danger }}>Avbryt</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@media (max-width: 900px){ .tm-grid{ grid-template-columns: 1fr !important; grid-template-rows: minmax(320px,45vh) 1fr; } .tm-grid > div:first-child{ border-right:none !important; border-bottom:1px solid ${T.bg.muted}; } }`}</style>
    </div>
  );
}

// Redigera/radera set i ett REDAN SPARAT pass. Recompute:ar muscleLoads → återhämtning hålls konsekvent.
function EditSessionModal({ session, bodyweight, onSave, onDelete, onClose }) {
  const [s, setS] = useState(session);
  const sets = s.sets || [];
  // Gruppera set per övning (entry) i loggad ordning.
  const order = [];
  sets.forEach(x => { if (!order.includes(x.exerciseId)) order.push(x.exerciseId); });
  const patchSet = (id, patch) => setS(cur => sessionUpdateSet(cur, id, patch, bodyweight));
  const removeSet = (id) => setS(cur => sessionDeleteSet(cur, id, bodyweight));
  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, maxWidth: 520, maxHeight: "88vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div>
            <span style={{ fontSize: 19, fontWeight: 800 }}>Redigera pass</span>
            <div style={{ fontSize: 12, color: T.text.muted }}>{s.title} · {new Date(s.completedAt).toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short" })}</div>
          </div>
          <button onClick={onClose} style={btn.icon}>×</button>
        </div>

        {sets.length === 0 && (
          <div style={{ fontSize: 13, color: T.text.muted, padding: "14px 0", lineHeight: 1.5 }}>
            {s.sport ? "Sportpass loggas utan enskilda set. Du kan ta bort hela passet nedan." : "Det här passet har inga loggade set (äldre data). Du kan ta bort det nedan."}
          </div>
        )}

        {order.map(exId => {
          const ex = EXERCISES.find(e => e.id === exId);
          const isTime = ex && ex.loadMode === "time";
          const isBw = ex && ex.loadMode === "bodyweight";
          const rows = sets.filter(x => x.exerciseId === exId);
          return (
            <div key={exId} style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text.primary, marginBottom: 6 }}>{ex ? ex.name : exId}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {rows.map((x, i) => (
                  <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 6, background: T.bg.raised, borderRadius: 8, padding: "7px 9px" }}>
                    <span style={{ fontSize: 11, color: T.text.muted, width: 34 }}>Set {i + 1}</span>
                    {isTime ? (
                      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: T.text.muted }}>
                        <input type="number" value={x.duration ?? ""} onChange={e => patchSet(x.id, { duration: e.target.value === "" ? null : +e.target.value })} style={{ ...input, width: 72, padding: "5px 7px" }} />s
                      </label>
                    ) : (
                      <>
                        {!isBw && <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: T.text.muted }}>
                          <input type="number" value={x.weight ?? ""} onChange={e => patchSet(x.id, { weight: e.target.value === "" ? null : +e.target.value })} style={{ ...input, width: 68, padding: "5px 7px" }} />kg
                        </label>}
                        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: T.text.muted }}>
                          <input type="number" value={x.reps ?? ""} onChange={e => patchSet(x.id, { reps: e.target.value === "" ? null : +e.target.value })} style={{ ...input, width: 56, padding: "5px 7px" }} />reps
                        </label>
                      </>
                    )}
                    <select value={x.rpe ?? ""} onChange={e => patchSet(x.id, { rpe: e.target.value === "" ? null : +e.target.value })} style={{ ...input, width: 82, padding: "5px 7px" }}>
                      <option value="">RPE –</option>
                      {[6, 7, 8, 9, 10].map(v => <option key={v} value={v}>RPE {v}</option>)}
                    </select>
                    <button onClick={() => removeSet(x.id)} title="Ta bort set" style={{ marginLeft: "auto", background: "none", border: "none", color: T.text.muted, cursor: "pointer", fontSize: 15 }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button onClick={() => { onDelete(s.id); }} style={{ ...btn.pill, color: T.accent.danger }}>Ta bort passet</button>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={btn.pill}>Avbryt</button>
          <button onClick={() => onSave(s)} style={btn.primary}>Spara ändringar</button>
        </div>
        <div style={{ fontSize: 11, color: T.text.muted, marginTop: 10, lineHeight: 1.5 }}>Ändringar räknar om muskelbelastning och återhämtning direkt.</div>
      </div>
    </div>
  );
}

function ExerciseLibrary({ onStart, onPreview, previewId, equip }) {
  const [group, setGroup] = useState("All");
  const [q, setQ] = useState("");
  const eq = equip || EQUIP_ALL;
  const filtered = EXERCISES.filter(e =>
    eq.includes(e.equipment) &&
    (group === "All" || e.group === group) &&
    (e.name.toLowerCase().includes(q.toLowerCase()) || e.pattern.toLowerCase().includes(q.toLowerCase()) || e.equipment.toLowerCase().includes(q.toLowerCase()) || (e.aka || []).some(a => a.toLowerCase().includes(q.toLowerCase())))
  );
  return (
    <Card>
      <CardLabel right={<button onClick={onStart} style={{ ...btn.primary, padding: "6px 12px", fontSize: 12 }}>+ Log Session</button>}>
        Exercise Library · {filtered.length}
      </CardLabel>
      <div style={{ fontSize: 12, color: T.text.muted, marginBottom: 8 }}>Tap an exercise to light up the muscles it works.</div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search exercises…" style={{ ...input, marginBottom: 8 }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
        {["All", ...EX_GROUPS].map(g => (
          <button key={g} onClick={() => setGroup(g)} style={{ ...btn.tag, fontSize: 12, background: group === g ? T.accent.primary : T.bg.raised, color: group === g ? "#fff" : T.text.secondary }}>{g}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 520, overflowY: "auto" }}>
        {filtered.map(e => {
          const sel = previewId === e.id;
          return (
            <button key={e.id} onClick={() => onPreview(sel ? null : e)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", borderRadius: 8, cursor: "pointer", textAlign: "left", width: "100%",
                background: sel ? "rgba(155,124,255,0.18)" : T.bg.raised, border: `1px solid ${sel ? T.accent.secondary : "transparent"}` }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, color: T.text.primary }}>{e.name}</div>
                <div style={{ fontSize: 11, color: T.text.muted }}>{e.group} · {e.equipment} · {e.pattern}</div>
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                {e.activation.slice(0, 3).map(a => (
                  <span key={a.muscleId} title={MUSCLES[a.muscleId]?.name} style={{ fontSize: 10, color: T.text.muted, background: T.bg.muted, borderRadius: 5, padding: "3px 6px" }}>{MUSCLES[a.muscleId]?.name.split(" ")[0]}</span>
                ))}
              </div>
            </button>
          );
        })}
        {!filtered.length && <div style={{ fontSize: 13, color: T.text.muted, padding: 12, textAlign: "center" }}>No exercises match.</div>}
      </div>
    </Card>
  );
}

export { RestTimer, SessionModal, PostSessionModal, TrainingMode, ExerciseLibrary, EditSessionModal };
