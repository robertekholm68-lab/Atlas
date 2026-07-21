// FEATURE: Body Map
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Card, CardLabel, Icon } from "../../components/common/index.jsx";
import { useIsMobile } from "../../components/common/index.jsx";
import { DEMO_LEVELS } from "../../data/demo.js";
import { bodyGlow, groupState, muscleWeeklySets, recoveryContributions, repActivation, repState, resolveSlug, volumeStatus } from "../../engines/index.js";
import { EQUIP_ALL, EXERCISES } from "../../data/exercises.js";
import { ACT, ACT_LABEL, AREAS, GEN, GROUP_PRIMARY, GROUP_SV, MHOT_VB, MSRC, MUSCLES, MUSCLE_ADJUST, MUSCLE_ATLAS, MUSCLE_HOTS, MUSCLE_IMAGES, MUSCLE_PATHS, NAME2MUSCLE, TRAP_CLIP_Y } from "../../data/muscles.js";
import { BASE_FILL, H, STATE_COL, T, btn, modal, now, overlay } from "../../data/tokens.js";
import ATLAS_BODY_SVGS from "../../assets/data/body_svgs.json";
import ATLAS_HITMAP_DATA from "../../assets/data/hitmap_data.json";
import { KNOWLEDGE, LEVELS as KB_LEVELS, CATEGORIES as KB_CATS, MEDICAL_DISCLAIMER, hasKnowledge, citableFacts, TOPICS, hasTopic } from "../../data/knowledge.js";

// ── Kunskapsbank: läsvy för en muskel eller ett träningsämne (nivå-märkt, med källor) ──
function KnowledgeReader({ muscleId, onClose }) {
  const topic = muscleId && TOPICS[muscleId];
  const k = topic || (muscleId && KNOWLEDGE[muscleId]); if (!k) return null;
  const cats = topic ? [] : Object.keys(KB_CATS).filter(c => k.entries.some(e => e.category === c));
  const hasMedical = topic ? false : k.entries.some(e => KB_CATS[e.category].medical);
  const SectionItem = ({ e }) => {
    const lv = KB_LEVELS[e.level];
    return (
      <div style={{ borderLeft: `3px solid ${lv.c}55`, paddingLeft: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text.primary }}>{e.title}</span>
          <span title={lv.short} style={{ fontSize: 9.5, fontWeight: 700, color: lv.c, border: `1px solid ${lv.c}66`, borderRadius: 999, padding: "2px 8px" }}>{lv.label}</span>
        </div>
        <div style={{ fontSize: 13.5, color: T.text.secondary, lineHeight: 1.6 }}>{e.body}</div>
        {e.source && <a href={e.source.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: T.text.muted, display: "inline-block", marginTop: 4 }}>Källa: {e.source.name} ↗</a>}
      </div>
    );
  };
  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, maxWidth: 680, maxHeight: "88vh", overflowY: "auto", padding: 0 }} onClick={e => e.stopPropagation()}>
        <div style={{ position: "sticky", top: 0, background: T.bg.surface, borderBottom: `1px solid ${T.bg.muted}`, padding: "16px 22px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, zIndex: 2 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: T.accent.secondary, textTransform: "uppercase" }}>{topic ? (k.tag || "Träningsprincip") : "Kunskapsbank"}</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: T.text.primary, marginTop: 2 }}>{k.title}</div>
          </div>
          <button onClick={onClose} style={{ ...btn.icon }} aria-label="Stäng">×</button>
        </div>
        <div style={{ padding: "16px 22px 22px" }}>
          <div style={{ fontSize: 14.5, color: T.text.secondary, lineHeight: 1.6, marginBottom: 18 }}>{k.lead}</div>
          {topic
            ? <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{k.sections.map((e, i) => <SectionItem key={i} e={e} />)}</div>
            : cats.map(cat => (
              <div key={cat} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 15, display: "inline-flex", alignItems: "center" }}><Icon name={KB_CATS[cat].icon} size={14} /></span>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.8, color: T.text.primary, textTransform: "uppercase" }}>{KB_CATS[cat].label}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {k.entries.filter(e => e.category === cat).map((e, i) => <SectionItem key={i} e={e} />)}
                </div>
              </div>
            ))}
          {hasMedical && (
            <div style={{ marginTop: 8, padding: "11px 13px", borderRadius: 10, background: "rgba(255,92,92,0.08)", border: `1px solid ${T.accent.danger}44`, fontSize: 12.5, color: T.text.secondary, lineHeight: 1.55 }}>
              <b style={{ color: T.accent.danger }}>⚠ Viktigt:</b> {MEDICAL_DISCLAIMER}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BodyMapCard({ muscleStates, selectedId, onSelect, mode = "recovery", lastSession = null, previewExercise = null, onClearPreview }) {
  const [view, setView] = useState("anterior");
  const [transitioning, setTransitioning] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);

  const setViewAnimated = target => {
    if (target === view) return;
    setTransitioning(true);
    setTimeout(() => { setView(target); setTransitioning(false); }, 180);
  };
  const flip = () => setViewAnimated(view === "anterior" ? "posterior" : "anterior");
  const onWheel = useCallback(e => { e.preventDefault(); setScale(s => Math.max(0.8, Math.min(3, s - e.deltaY * 0.0015))); }, []);
  const onMouseDown = e => { setDragging(true); dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }; };
  const onMouseMove = e => { if (!dragging || !dragStart.current) return; setOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }); };
  const onMouseUp = () => setDragging(false);

  const viewKey = view === "anterior" ? "front" : "back";
  const paths = MUSCLE_PATHS[viewKey];

  const preview = !!previewExercise;
  const activationMap = {};
  if (preview) {
    previewExercise.activation.forEach(({ muscleId, factor }) => {
      activationMap[muscleId] = factor >= 0.8 ? "primary" : factor >= 0.4 ? "secondary" : "stabilizer";
    });
  } else if (mode === "activation" && lastSession) {
    const loads = lastSession.muscleLoads || {};
    const max = Math.max(1, ...Object.values(loads));
    Object.entries(loads).forEach(([id, v]) => {
      const r = v / max;
      activationMap[id] = r > 0.6 ? "primary" : r > 0.3 ? "secondary" : r > 0.08 ? "stabilizer" : "low";
    });
  }
  const effMode = preview || mode === "activation" ? "activation" : "recovery";

  const legend = effMode === "activation"
    ? Object.keys(ACT).filter(k => !(preview && k === "low")).map(k => [k, ACT[k], ACT_LABEL[k]])
    : ["ready", "nearly_ready", "recovering", "critical", "undertrained"].map(k => [k, T.status[k], T.statusLabel[k]]);

  return (
    <Card pad={0} style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px 6px" }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: preview ? T.accent.secondary : T.text.muted, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {preview ? `▸ ${previewExercise.name}` : mode === "activation" ? "Muscle Activation" : "Body Map"}
        </span>
        {preview
          ? <button onClick={onClearPreview} style={{ ...btn.tag, background: T.bg.raised, color: T.text.secondary, flexShrink: 0 }}>Clear ×</button>
          : <span style={{ fontSize: 12, color: T.text.secondary }}>{view === "anterior" ? "Front" : "Back"}</span>}
      </div>

      <div style={{ flex: 1, position: "relative", display: "flex" }}>
        <div onWheel={onWheel} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          style={{ flex: 1, overflow: "hidden", cursor: dragging ? "grabbing" : "grab", userSelect: "none", display: "flex", justifyContent: "center", alignItems: "center", padding: "4px 0 10px", background: "radial-gradient(ellipse 55% 65% at 50% 42%, rgba(212,255,63,0.07), rgba(10,10,10,0) 70%)" }}>
          <div style={{ transform: `translate(${offset.x}px,${offset.y}px) scale(${scale})`, transformOrigin: "center center", transition: dragging ? "none" : "transform 0.15s", height: "100%", display: "flex", alignItems: "center" }}>
            {/* soft drop shadow under the figure for depth */}
            <svg viewBox={GEN[view].vb} preserveAspectRatio="xMidYMid meet"
              style={{ height: "100%", maxHeight: 620, opacity: transitioning ? 0 : 1, transition: "opacity 0.18s" }}>
              {/* realistic body base image */}
              <defs>
                <clipPath id="trapClip" clipPathUnits="userSpaceOnUse">
                  <rect x="700" y="0" width="760" height={TRAP_CLIP_Y} />
                </clipPath>
              </defs>
              <image href={GEN[view].url} x="0" y="0" width="768" height="1376" style={{ pointerEvents: "none", filter: "drop-shadow(0 18px 26px rgba(0,0,0,0.55))" }} />
              {/* invisible vector muscle layer — colours only when active, clickable everywhere */}
              <g transform={GEN[view].tf}>
                {Object.entries(paths).sort((a, b) =>
                  (AREAS[viewKey][b[0]] || 0) - (AREAS[viewKey][a[0]] || 0)
                ).map(([slug, pr]) => {
                  const info = resolveSlug(view, slug);
                  if (!info) return null;
                  const { ids, primary } = info;
                  const sel = ids.includes(selectedId);
                  let col, active;
                  if (effMode === "activation") {
                    const lvl = repActivation(ids, activationMap);
                    active = !!lvl; col = lvl ? ACT[lvl] : BASE_FILL;
                  } else {
                    const st = repState(ids, muscleStates);
                    active = st && st.status !== "no_data"; col = active ? T.status[st.status] : BASE_FILL;
                  }
                  const adj = MUSCLE_ADJUST[view][primary];
                  const clip = view === "posterior" && primary === "trapezius" ? "url(#trapClip)" : undefined;
                  const all = [...(pr.l || []), ...(pr.r || [])];
                  const body = all.map((d, i) => (
                    <path key={slug + i} d={d}
                      fill={col} fillOpacity={active ? 0.6 : 0}
                      stroke={sel ? "#fff" : "none"} strokeWidth={sel ? 3 : 0}
                      style={{ vectorEffect: "non-scaling-stroke", cursor: "pointer", pointerEvents: "all",
                        mixBlendMode: active ? "screen" : "normal", transition: "fill-opacity 0.4s ease, fill 0.4s ease" }}
                      onClick={() => onSelect(primary)} />
                  ));
                  return <g key={slug} transform={adj || undefined} clipPath={clip}>{body}</g>;
                })}
              </g>
            </svg>
          </div>
        </div>

        <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 6 }}>
          <button onClick={() => setViewAnimated("anterior")} style={{ ...btn.viewToggle, background: view === "anterior" ? T.accent.primary : T.bg.raised, color: view === "anterior" ? "#fff" : T.text.muted }} title="Front">◇</button>
          <button onClick={() => setViewAnimated("posterior")} style={{ ...btn.viewToggle, background: view === "posterior" ? T.accent.primary : T.bg.raised, color: view === "posterior" ? "#fff" : T.text.muted }} title="Back">◆</button>
          <div style={{ height: 6 }} />
          <button onClick={() => setScale(s => Math.min(3, s + 0.2))} style={btn.viewToggle}>+</button>
          <button onClick={() => setScale(s => Math.max(0.8, s - 0.2))} style={btn.viewToggle}>−</button>
          <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} style={{ ...btn.viewToggle, fontSize: 10 }}>⌂</button>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", padding: "10px 18px", borderTop: `1px solid ${T.bg.muted}` }}>
        {legend.map(([k, col, label]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", background: col }} />
            <span style={{ fontSize: 11, color: T.text.secondary }}>{label}</span>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", padding: "8px", fontSize: 12, color: T.text.muted, borderTop: `1px solid ${T.bg.muted}` }}>
        ⊙ Click a muscle for details · scroll to zoom · drag to pan
      </div>
    </Card>
  );
}

const EQ_GROUPS = { Gym: EQUIP_ALL, Kroppsvikt: ["Bodyweight"], Kettlebells: ["Kettlebell", "Bodyweight"] };
function MuscleModal({ muscleId, state, onClose, onLog, onPreviewExercise, equip, sessions }) {
  const [eqFilter, setEqFilter] = useState("Gym");
  const [kbReader, setKbReader] = useState(false);
  if (!muscleId || !state) return null;
  const m = MUSCLES[muscleId], color = T.status[state.status];
  const last = state.lastTrainedAt ? new Date(state.lastTrainedAt).toLocaleDateString("sv-SE", { weekday: "short", month: "short", day: "numeric" }) : "Never";
  const eq = equip || EQUIP_ALL;
  const now = Date.now();
  const contrib = recoveryContributions(sessions || [], muscleId, now);
  const wk = muscleWeeklySets(sessions || [], muscleId, now);
  const vol = volumeStatus(wk, m.group);
  const daysTxt = d => d === 0 ? "idag" : d === 1 ? "igår" : `för ${d} dagar sedan`;
  const rankAll = EXERCISES
    .map(e => ({ e, factor: (e.activation.find(a => a.muscleId === muscleId) || {}).factor || 0 }))
    .filter(x => x.factor > 0)
    .sort((a, b) => b.factor - a.factor);
  const avail = rankAll.filter(x => EQ_GROUPS[eqFilter].includes(x.e.equipment));
  const related = avail.slice(0, 8);
  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, borderTop: `3px solid ${color}` }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div><div style={{ fontSize: 11, color: T.text.muted, textTransform: "uppercase", letterSpacing: 1 }}>{m.group}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.text.primary, marginTop: 2 }}>{m.name}</div></div>
          <button onClick={onClose} style={btn.icon}>×</button>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          {[["Recovery", `${state.recoveryScore}%`, color], ["Status", T.statusLabel[state.status], color], ["Readiness", `${Math.round(state.readiness)}%`, T.text.secondary], ["Last Trained", last, T.text.secondary]].map(([l, v, c]) => (
            <div key={l} style={{ flex: 1, background: T.bg.raised, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: T.text.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>{l}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: c, marginTop: 4 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, padding: "12px 14px", background: T.bg.raised, borderRadius: 10, fontSize: 13, color: T.text.secondary, lineHeight: 1.55 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: T.text.muted, textTransform: "uppercase", marginBottom: 5 }}>Varför {state.recoveryScore}%?</div>
          {contrib.length ? (
            <span>
              {state.status === "ready" && `${m.name} är återhämtad. `}
              {state.status === "nearly_ready" && `${m.name} är nästan återhämtad. `}
              {state.status === "recovering" && `${m.name} bär fortfarande trötthet. `}
              {state.status === "critical" && `${m.name} är hårt belastad. `}
              {contrib[0].sport
                ? <span>{m.name} belastades av <strong style={{ color: T.text.primary }}>{contrib[0].title}</strong> {daysTxt(contrib[0].days)}.</span>
                : <span>Du körde <strong style={{ color: T.text.primary }}>{contrib[0].sets} set</strong> som belastade {m.name.toLowerCase()} {daysTxt(contrib[0].days)}{contrib[1] ? `, och ${contrib[1].sets} set ${daysTxt(contrib[1].days)}` : ""}.</span>}
              {" "}Muskeln återhämtar sig med ~{m.halfLife}h halveringstid.
            </span>
          ) : (
            <span>{state.status === "undertrained" ? `${m.name} har inte tränats på länge — nästan otränad. Lägg in den snart.` : `Ingen träningsdata för ${m.name} än.`}</span>
          )}
        </div>

        {vol && (
          <div style={{ marginTop: 12, padding: "12px 14px", background: T.bg.raised, borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: T.text.muted, textTransform: "uppercase" }}>Veckovolym</span>
              <span style={{ fontSize: 12, color: vol.col, fontWeight: 700 }}>{wk} set · {vol.label}</span>
            </div>
            {(() => {
              const max = vol.lm.mrv * 1.25;
              const pctX = v => `${Math.min(100, v / max * 100)}%`;
              return (
                <div style={{ position: "relative", height: 10, background: T.bg.muted, borderRadius: 5 }}>
                  <div style={{ position: "absolute", left: pctX(vol.lm.mav[0]), width: `${(vol.lm.mav[1] - vol.lm.mav[0]) / max * 100}%`, top: 0, bottom: 0, background: "rgba(57,217,138,0.25)" }} />
                  <div style={{ position: "absolute", left: pctX(vol.lm.mev), top: -3, bottom: -3, width: 2, background: T.text.muted }} title="MEV" />
                  <div style={{ position: "absolute", left: pctX(vol.lm.mrv), top: -3, bottom: -3, width: 2, background: T.accent.danger }} title="MRV" />
                  <div style={{ position: "absolute", left: 0, width: pctX(wk), top: 0, bottom: 0, background: vol.col, borderRadius: 5, opacity: 0.9 }} />
                </div>
              );
            })()}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.text.muted, marginTop: 5 }}>
              <span>MEV {vol.lm.mev}</span><span style={{ color: T.accent.success }}>optimalt {vol.lm.mav[0]}–{vol.lm.mav[1]}</span><span style={{ color: T.accent.danger }}>MRV {vol.lm.mrv}</span>
            </div>
          </div>
        )}
        {hasKnowledge(muscleId) && (() => {
          const facts = citableFacts(muscleId).slice(0, 3);
          if (!facts.length) return null;
          const hasMedical = facts.some(f => f.medical);
          return (
            <div style={{ marginTop: 14, padding: "12px 14px", background: "rgba(155,124,255,0.06)", border: `1px solid ${T.accent.secondary}33`, borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: T.accent.secondary, textTransform: "uppercase" }}>✦ Coachen · ur kunskapsbanken</div>
                <button onClick={() => setKbReader(true)} style={{ background: "none", border: "none", color: T.accent.primary, cursor: "pointer", fontSize: 12, padding: 0 }}>Läs mer ›</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {facts.map((f, i) => (
                  <div key={i} style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.5, display: "flex", gap: 7, alignItems: "flex-start" }}>
                    <span style={{ color: KB_LEVELS[f.level].c, flexShrink: 0 }}>•</span>
                    <span>{f.fact}{f.source && <span style={{ color: T.text.muted, fontSize: 11 }}> ({f.source.name})</span>}</span>
                  </div>
                ))}
              </div>
              {hasMedical && <div style={{ fontSize: 11, color: T.text.muted, marginTop: 8, lineHeight: 1.45 }}>{MEDICAL_DISCLAIMER}</div>}
            </div>
          );
        })()}

        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: T.text.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>Bästa övningarna för {m.name}</div>
            <div style={{ display: "flex", gap: 3, background: T.bg.raised, borderRadius: 9, padding: 3 }}>
              {["Gym", "Kroppsvikt", "Kettlebells"].map(g => (
                <button key={g} onClick={() => setEqFilter(g)} style={{ padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 600, background: eqFilter === g ? T.accent.primary : "transparent", color: eqFilter === g ? "#fff" : T.text.secondary }}>{g}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 220, overflowY: "auto" }}>
            {related.length === 0 && <div style={{ fontSize: 12.5, color: T.text.muted, padding: "10px 2px", lineHeight: 1.5 }}>Inga {eqFilter.toLowerCase()}-övningar riktar sig tydligt mot {m.name.toLowerCase()} — prova ett annat val.</div>}
            {related.map(({ e, factor }) => {
              const lvl = factor >= 0.8 ? "Primary" : factor >= 0.4 ? "Secondary" : "Stabilizer";
              const lvlCol = factor >= 0.8 ? ACT.primary : factor >= 0.4 ? ACT.secondary : ACT.stabilizer;
              return (
                <button key={e.id} onClick={() => onPreviewExercise && onPreviewExercise(e)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 11px", background: T.bg.raised, border: "none", borderRadius: 7, cursor: "pointer", textAlign: "left", width: "100%" }}>
                  <div>
                    <div style={{ fontSize: 13, color: T.text.primary }}>{e.name}</div>
                    <div style={{ fontSize: 11, color: T.text.muted }}>{e.equipment} · {e.group}</div>
                  </div>
                  <span style={{ fontSize: 10, color: lvlCol, border: `1px solid ${lvlCol}`, borderRadius: 12, padding: "2px 8px", flexShrink: 0 }}>{lvl}</span>
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: T.text.muted, marginTop: 6 }}>Tap an exercise to see it light up on the body.</div>
        </div>
        <button onClick={onLog} style={{ ...btn.primary, width: "100%", marginTop: 16, opacity: state.status === "critical" ? 0.5 : 1 }}>
          {state.status === "critical" ? "Rest Recommended" : "Log a Session"}
        </button>
      </div>
      {kbReader && <KnowledgeReader muscleId={muscleId} onClose={() => setKbReader(false)} />}
    </div>
  );
}

function MuscleInfoModal({ region, onClose }) {
  if (!region) return null;
  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, maxWidth: 620, padding: 0, overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ position: "relative", background: "#0b0e14" }}>
          {MUSCLE_IMAGES[region.img]
            ? <img src={MUSCLE_IMAGES[region.img]} alt={region.name} style={{ width: "100%", display: "block", maxHeight: 420, objectFit: "contain" }} />
            : <div style={{ padding: 40, textAlign: "center", color: T.text.muted }}>Bild ej tillgänglig i förhandsvisning</div>}
          <button onClick={onClose} style={{ ...btn.icon, position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.5)" }}>×</button>
        </div>
        <div style={{ padding: "18px 22px" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.text.primary, marginBottom: 12 }}>{region.name}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {region.facts.map(([label, text]) => (
              <div key={label}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: T.accent.primary, textTransform: "uppercase" }}>{label}</div>
                <div style={{ fontSize: 14, color: T.text.secondary, lineHeight: 1.55, marginTop: 2 }}>{text}</div>
              </div>
            ))}
          </div>
          <a href={MSRC} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 14, fontSize: 12, color: T.text.muted }}>Källa: muscles.se ↗</a>
        </div>
      </div>
    </div>
  );
}

function MusclesView() {
  const [view, setView] = useState("front");
  const [region, setRegion] = useState(null);
  const [hover, setHover] = useState(null);
  const byId = {}; MUSCLE_ATLAS.forEach(r => byId[r.id] = r);
  const bodyImg = view === "front" ? MUSCLE_IMAGES.body_front : MUSCLE_IMAGES.body_back;
  const hots = MUSCLE_HOTS[view] || {};
  // smaller shapes drawn last (on top) so they win clicks inside larger ones
  const ordered = Object.keys(hots).sort((a, b) => (hots[b].area || 0) - (hots[a].area || 0));

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <Card pad={14}>
        <div style={{ display: "flex", gap: 6, background: T.bg.raised, borderRadius: 10, padding: 4, marginBottom: 12 }}>
          {[["front", "Framsida"], ["back", "Baksida"]].map(([k, lab]) => (
            <button key={k} onClick={() => setView(k)} style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: view === k ? T.accent.primary : "transparent", color: view === k ? "#fff" : T.text.secondary }}>{lab}</button>
          ))}
        </div>
        <div style={{ position: "relative", width: "100%", lineHeight: 0 }}>
          {bodyImg
            ? <img src={bodyImg} alt={`Kropp ${view}`} draggable={false} style={{ width: "100%", display: "block", borderRadius: 10 }} />
            : <div style={{ padding: 60, textAlign: "center", color: T.text.muted, lineHeight: 1.5 }}>Kroppsbild visas i den byggda HTML-filen.</div>}
          {bodyImg && (
            <svg viewBox={MHOT_VB} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              {ordered.map(id => byId[id] && hots[id].d.map((dstr, i) => (
                <path key={id + i} d={dstr}
                  fill={hover === id ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0)"}
                  stroke={hover === id ? "#fff" : "rgba(0,0,0,0)"} strokeWidth="2.5"
                  style={{ cursor: "pointer", pointerEvents: "all", vectorEffect: "non-scaling-stroke", transition: "fill 0.15s" }}
                  onClick={() => setRegion(byId[id])}
                  onMouseEnter={() => setHover(id)} onMouseLeave={() => setHover(cur => cur === id ? null : cur)} />
              )))}
            </svg>
          )}
        </div>
        <div style={{ fontSize: 12, color: T.text.muted, textAlign: "center", marginTop: 8, minHeight: 16 }}>
          {hover && byId[hover] ? byId[hover].name : "Klicka direkt på en muskel för zoombild och fakta."}
        </div>
      </Card>
      {region && <MuscleInfoModal region={region} onClose={() => setRegion(null)} />}
    </div>
  );
}

// Bläddringsbar kunskapsbank (fyller Muskelfakta-vyn i stället för tomrum)
function KnowledgeBrowser({ onOpen, selectedId }) {
  const groups = {};
  Object.keys(KNOWLEDGE).forEach(id => { const g = (MUSCLES[id] && MUSCLES[id].group) || "ovrigt"; (groups[g] = groups[g] || []).push(id); });
  const order = ["chest", "back", "shoulders", "arms", "core", "legs", "glutes", "calves", "neck"];
  const sorted = Object.keys(groups).sort((a, b) => ((order.indexOf(a) + 1) || 99) - ((order.indexOf(b) + 1) || 99));
  return (
    <Card pad={16}>
      <CardLabel>Kunskapsbank</CardLabel>
      <div style={{ fontSize: 12, color: T.text.muted, marginBottom: 12, lineHeight: 1.45 }}>Alla {Object.keys(KNOWLEDGE).length} muskler — funktion, träning, återhämtning, kost och skador.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 13, maxHeight: 560, overflowY: "auto", paddingRight: 2 }}>
        {(() => {
          const tGroups = {};
          Object.keys(TOPICS).forEach(id => { const t = TOPICS[id].tag || "Träningsprincip"; (tGroups[t] = tGroups[t] || []).push(id); });
          const tOrder = ["Träningsprincip", "Uppvärmning", "Återhämtning", "Kost", "Ålder & träning", "Hälsa"];
          const tHeading = { "Träningsprincip": "Träningsprinciper" };
          const tSorted = Object.keys(tGroups).sort((a, b) => ((tOrder.indexOf(a) + 1) || 99) - ((tOrder.indexOf(b) + 1) || 99));
          return tSorted.map(t => (
            <div key={t}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.9, color: T.accent.secondary, textTransform: "uppercase", marginBottom: 6 }}>{tHeading[t] || t}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {tGroups[t].map(id => {
                  const on = selectedId === id;
                  return (
                    <button key={id} onClick={() => onOpen(id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 11px", borderRadius: 9, border: `1px solid ${on ? T.accent.secondary : T.bg.muted}`, background: on ? "rgba(155,124,255,0.12)" : T.bg.raised, color: T.text.primary, cursor: "pointer", fontSize: 13, textAlign: "left" }}>
                      <span>{TOPICS[id].title}</span>
                      <span style={{ color: T.accent.secondary, fontSize: 13 }}>›</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ));
        })()}
        {sorted.map(g => (
          <div key={g}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.9, color: T.text.muted, textTransform: "uppercase", marginBottom: 6 }}>{GROUP_SV[g] || g}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {groups[g].map(id => {
                const on = selectedId === id;
                return (
                  <button key={id} onClick={() => onOpen(id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 11px", borderRadius: 9, border: `1px solid ${on ? T.accent.primary : T.bg.muted}`, background: on ? "rgba(77,163,255,0.12)" : T.bg.raised, color: T.text.primary, cursor: "pointer", fontSize: 13, textAlign: "left", transition: "border-color .15s, background .15s" }}>
                    <span>{MUSCLES[id].name}</span>
                    <span style={{ color: T.accent.primary, fontSize: 13 }}>›</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function FeaturedFacts({ onOpen }) {
  const ids = Object.keys(KNOWLEDGE).filter(id => citableFacts(id).length);
  const pick = useMemo(() => { const a = ids.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, 3); }, []);
  return (
    <Card pad={16}>
      <CardLabel>Visste du?</CardLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        {pick.map(id => {
          const f = citableFacts(id)[0]; if (!f) return null;
          return (
            <div key={id} style={{ borderLeft: `3px solid ${T.accent.secondary}66`, paddingLeft: 11 }}>
              <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.5 }}>{f.fact}</div>
              <button onClick={() => onOpen(id)} style={{ background: "none", border: "none", color: T.accent.primary, cursor: "pointer", fontSize: 12, padding: 0, marginTop: 5, fontWeight: 600 }}>{MUSCLES[id].name} ›</button>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 13, lineHeight: 1.45, paddingTop: 12, borderTop: `1px solid ${T.bg.muted}` }}>Klicka en muskel på kroppen för dess aktuella läge — eller bläddra i kunskapsbanken till vänster.</div>
    </Card>
  );
}

function MuscleMapView({ muscleStates }) {
  const isMobile = useIsMobile();
  const [view, setView] = useState("front");
  const [sel, setSel] = useState(0);
  const [card, setCard] = useState(null);
  const [tip, setTip] = useState(null);
  const [showRec, setShowRec] = useState(false);
  const [reader, setReader] = useState(null);
  const bodyRef = useRef(null), hiRef = useRef(null), statusRef = useRef(null);
  const idsRef = useRef(null), regRef = useRef({}), nameIdsRef = useRef({}), natRef = useRef(null), selRef = useRef(0), readyRef = useRef(false);
  const D = (typeof window !== "undefined" && ATLAS_HITMAP_DATA) ? ATLAS_HITMAP_DATA : null;
  const dims = D ? D[view] : { W: 760, H: 1140 };
  const W = dims.W, H = dims.H;
  // warm-only fatigue tint: fresh muscles stay natural, tired ones get a warm hint
  const REC_TINT = { critical: [255, 70, 70, 120], recovering: [255, 130, 60, 90] };

  const paintStatus = () => {
    const sc = statusRef.current, ids = idsRef.current; if (!sc || !ids) return;
    sc.width = W; sc.height = H; const ctx = sc.getContext("2d"); ctx.clearRect(0, 0, W, H);
    if (!muscleStates) return;
    const idcol = {};
    Object.values(regRef.current).forEach(r => {
      const mid = NAME2MUSCLE[r.name]; if (!mid) return;
      const st = muscleStates[mid]; if (!st) return;
      const c = REC_TINT[st.status]; if (c) idcol[r.id] = c;
    });
    const img = ctx.createImageData(W, H), d = img.data;
    for (let p = 0, q = 0; p < ids.length; p++, q += 4) { const c = idcol[ids[p]]; if (c) { d[q] = c[0]; d[q + 1] = c[1]; d[q + 2] = c[2]; d[q + 3] = c[3]; } }
    ctx.putImageData(img, 0, 0);
  };

  useEffect(() => {
    if (!D) return;
    const V = D[view]; readyRef.current = false;
    const reg = {}, nameIds = {};
    V.regions.forEach(r => { reg[r.id] = r; (nameIds[r.name] = nameIds[r.name] || []).push(r.id); });
    regRef.current = reg; nameIdsRef.current = nameIds;
    setSel(0); selRef.current = 0; setCard(null); setTip(null); idsRef.current = null;
    const nat = new Image(); nat.onload = () => { natRef.current = nat; if (bodyRef.current) bodyRef.current.src = nat.src; }; nat.src = "data:image/jpeg;base64," + V.nat;
    const idi = new Image();
    idi.onload = () => {
      const c = document.createElement("canvas"); c.width = V.W; c.height = V.H;
      const ctx = c.getContext("2d", { willReadFrequently: true }); ctx.drawImage(idi, 0, 0);
      const d = ctx.getImageData(0, 0, V.W, V.H).data; const ids = new Int32Array(V.W * V.H);
      for (let i = 0, j = 0; i < ids.length; i++, j += 4) ids[i] = d[j] + d[j + 1] * 256;
      idsRef.current = ids; readyRef.current = true;
      if (hiRef.current) { hiRef.current.width = V.W; hiRef.current.height = V.H; }
      paintStatus();
    };
    idi.src = "data:image/png;base64," + V.idm;
  }, [view]);

  useEffect(() => { if (readyRef.current) paintStatus(); }, [muscleStates, view]);

  const groupOf = id => { const r = regRef.current[id]; return r ? (nameIdsRef.current[r.name] || [id]) : []; };
  const pxAt = e => {
    const body = bodyRef.current, ids = idsRef.current; if (!body || !ids) return 0;
    const r = body.getBoundingClientRect(); if (!r.width || !r.height) return 0;
    const x = Math.floor((e.clientX - r.left) / r.width * W), y = Math.floor((e.clientY - r.top) / r.height * H);
    if (x < 0 || y < 0 || x >= W || y >= H) return 0; return ids[y * W + x];
  };
  const clearHi = () => { const hi = hiRef.current; if (hi) { hi.getContext("2d").clearRect(0, 0, W, H); hi.style.transform = "none"; hi.style.filter = `drop-shadow(0 0 9px ${T.accent.warning})`; } };
  const groupBox = grp => {
    const regs = grp.map(i => regRef.current[i]).filter(Boolean);
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    regs.forEach(r => { x0 = Math.min(x0, r.bx); y0 = Math.min(y0, r.by); x1 = Math.max(x1, r.bx + r.bw); y1 = Math.max(y1, r.by + r.bh); });
    return { x0, y0, bw: x1 - x0, bh: y1 - y0, cx: (x0 + (x1 - x0) / 2) / W * 100, cy: (y0 + (y1 - y0) / 2) / H * 100 };
  };
  const drawHi = (grp, lift) => {
    const hi = hiRef.current, ids = idsRef.current, nat = natRef.current; if (!hi || !ids || !grp.length || !nat || !nat.complete) return;
    const g = hi.getContext("2d"); g.clearRect(0, 0, W, H);
    const set = new Set(grp); const b = groupBox(grp); if (b.bw <= 0 || b.bh <= 0) return;
    const t = document.createElement("canvas"); t.width = b.bw; t.height = b.bh; const tc = t.getContext("2d");
    const md = tc.createImageData(b.bw, b.bh);
    for (let j = 0; j < b.bh; j++) for (let i = 0; i < b.bw; i++) { if (set.has(ids[(b.y0 + j) * W + (b.x0 + i)])) md.data[(j * b.bw + i) * 4 + 3] = 255; }
    tc.putImageData(md, 0, 0);
    g.save(); g.filter = lift ? "brightness(1.28) saturate(1.35)" : "brightness(1.16) saturate(1.18)";
    g.drawImage(nat, b.x0, b.y0, b.bw, b.bh, b.x0, b.y0, b.bw, b.bh);
    g.filter = "none"; g.globalCompositeOperation = "destination-in"; g.drawImage(t, b.x0, b.y0); g.restore();
    hi.style.transformOrigin = `${b.cx}% ${b.cy}%`;
    hi.style.transform = lift ? "translateY(-1.6%) scale(1.11)" : "none";
    hi.style.filter = lift
      ? `drop-shadow(0 18px 22px rgba(0,0,0,0.7)) drop-shadow(0 6px 8px rgba(0,0,0,0.5)) drop-shadow(0 0 16px ${T.accent.warning})`
      : `drop-shadow(0 0 9px ${T.accent.warning})`;
  };

  const onMove = e => {
    const id = pxAt(e), reg = regRef.current;
    if (id && reg[id]) { setTip({ name: reg[id].name, x: e.clientX, y: e.clientY }); if (!selRef.current) drawHi(groupOf(id), false); }
    else { setTip(null); if (!selRef.current) clearHi(); }
  };
  const onLeave = () => { setTip(null); if (!selRef.current) clearHi(); };
  const onClick = e => {
    const id = pxAt(e), reg = regRef.current;
    if (id && reg[id]) {
      const grp = groupOf(id); setSel(id); selRef.current = id; drawHi(grp, true);
      const b = groupBox(grp), r = reg[id];
      // Inforutan hamnar på den sida av kartan som är NÄRMAST muskeln.
      const side = b.cx < 50 ? "left" : "right";
      setCard({ name: r.name, fn: r.fn, cy: b.cy, side });
    } else { setSel(0); selRef.current = 0; setCard(null); clearHi(); }
  };

  if (!D) return <Card><div style={{ padding: 30, textAlign: "center", color: T.text.muted }}>Muskelkartan visas i den byggda HTML-filen.</div></Card>;

  const legend = ["recovering", "critical"].map(k => [T.status[k], T.statusLabel[k]]);

  // ── Inforuta bredvid kartan, med riktig muskelinfo (grupp, återhämtning, funktion, storlek) ──
  const SIZE_SV = { small: "Liten muskel", medium: "Medelstor muskel", large: "Stor muskel" };
  const STATUS_SV = { ready: "Redo", nearly_ready: "Nästan redo", recovering: "Återhämtar sig", critical: "Behöver vila", undertrained: "Otränad", no_data: "Ingen data" };
  const InfoPanel = ({ caretSide }) => {
    if (!card) return null;
    const id = NAME2MUSCLE[card.name];
    const M = id ? MUSCLES[id] : null;
    const st = id && muscleStates ? muscleStates[id] : null;
    const hasRec = st && st.status && st.status !== "no_data";
    const groupSv = M ? (GROUP_SV[M.group] || M.group) : null;
    const caretTop = Math.max(12, Math.min(82, card.cy));
    const recCol = st ? (T.status[st.status] || T.text.muted) : T.text.muted;
    return (
      <div style={{ position: "relative", background: `linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0) 42%), ${T.bg.surface}`, border: `1px solid ${T.accent.warning}66`, borderRadius: 14, padding: "16px 17px", boxShadow: "0 14px 40px rgba(0,0,0,0.5)", animation: "fadeIn 0.2s ease" }}>
        {caretSide !== "none" && (
          <div style={{ position: "absolute", top: `${caretTop}%`, [caretSide]: -8, width: 0, height: 0, borderTop: "8px solid transparent", borderBottom: "8px solid transparent", [caretSide === "left" ? "borderRight" : "borderLeft"]: `8px solid ${T.accent.warning}88`, transform: "translateY(-50%)" }} />
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: T.text.primary, lineHeight: 1.2 }}>{card.name}</div>
          <button onClick={() => { setSel(0); selRef.current = 0; setCard(null); clearHi(); }} style={{ ...btn.icon, width: 26, height: 26, fontSize: 13, flexShrink: 0 }} aria-label="Stäng">×</button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {groupSv && <span style={{ fontSize: 11, fontWeight: 700, color: T.accent.primary, border: `1px solid ${T.accent.primary}66`, borderRadius: 20, padding: "2px 9px" }}>{groupSv}</span>}
          {M && <span style={{ fontSize: 11, color: T.text.muted, border: `1px solid ${T.bg.muted}`, borderRadius: 20, padding: "2px 9px" }}>{SIZE_SV[M.size] || M.size}</span>}
        </div>

        {/* Aktuell återhämtning ur din data */}
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, color: T.text.muted, textTransform: "uppercase", marginBottom: 4 }}>Aktuellt läge</div>
        {hasRec ? (
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: recCol }} />
            <span style={{ fontSize: 13.5, color: T.text.primary, fontWeight: 600 }}>{st.recoveryScore}% återhämtad</span>
            <span style={{ fontSize: 12.5, color: recCol }}>· {STATUS_SV[st.status] || st.status}</span>
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: T.text.muted, marginBottom: 12, lineHeight: 1.5 }}>Ingen träningsdata ännu — logga ett pass som belastar {card.name.toLowerCase()} så visas läget här.</div>
        )}

        {/* Funktion & träning (ur muscles.se) */}
        {card.fn && <>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, color: T.text.muted, textTransform: "uppercase", marginBottom: 4 }}>Funktion & träning</div>
          <div style={{ fontSize: 13.5, color: T.text.secondary, lineHeight: 1.55, marginBottom: 12 }}>{card.fn}</div>
        </>}

        {/* Återhämtningstid ur taxonomin */}
        {M && <>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, color: T.text.muted, textTransform: "uppercase", marginBottom: 4 }}>Återhämtning</div>
          <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.5 }}>Belastningen halveras ungefär var <b style={{ color: T.text.primary }}>{M.halfLife}:e timme</b> — större muskler behöver längre vila mellan tunga pass.</div>
        </>}

        {id && hasKnowledge(id) && (
          <button onClick={() => setReader(id)} style={{ ...btn.primary, width: "100%", marginTop: 12, padding: "9px 14px", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Icon name="book-open" size={15} /> Läs i kunskapsbanken ›</button>
        )}
        <a href={MSRC} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 12, fontSize: 11.5, color: T.text.muted }}>Källa: muscles.se ↗</a>
      </div>
    );
  };

  const mapCard = (
    <Card pad={14}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, background: T.bg.raised, borderRadius: 10, padding: 4, flex: 1 }}>
          {[["front", "Framsida"], ["back", "Baksida"]].map(([k, lab]) => (
            <button key={k} onClick={() => setView(k)} style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: view === k ? T.accent.primary : "transparent", color: view === k ? "#fff" : T.text.secondary }}>{lab}</button>
          ))}
        </div>
        <button onClick={() => setShowRec(v => !v)} style={{ ...btn.tag, fontSize: 12, background: showRec ? T.accent.primary : T.bg.raised, color: showRec ? "#fff" : T.text.secondary, whiteSpace: "nowrap" }}>Återhämtning</button>
      </div>
      <div style={{ position: "relative", width: "100%", lineHeight: 0 }} onMouseMove={onMove} onMouseLeave={onLeave} onClick={onClick}>
        <img ref={bodyRef} alt={`Muskler ${view}`} draggable={false} style={{ width: "100%", display: "block", borderRadius: 10, cursor: "pointer" }} />
        <canvas ref={statusRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "auto", pointerEvents: "none", borderRadius: 10, opacity: showRec ? (sel ? 0.4 : 1) : 0, transition: "opacity 0.2s" }} />
        <div style={{ position: "absolute", inset: 0, background: "#090b10", opacity: sel ? 0.55 : 0, transition: "opacity 0.2s", pointerEvents: "none", borderRadius: 10 }} />
        <canvas ref={hiRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "auto", pointerEvents: "none", filter: `drop-shadow(0 0 9px ${T.accent.warning})`, transition: "transform 0.2s, filter 0.2s" }} />
      </div>
      {showRec
        ? <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
            {legend.map(([c, lab]) => <span key={lab} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: T.text.muted }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />{lab}</span>)}
            <span style={{ fontSize: 11, color: T.text.muted }}>· fräscha muskler visas naturliga</span>
          </div>
        : <div style={{ fontSize: 12, color: T.text.muted, textAlign: "center", marginTop: 12 }}>Hovra för namn · klicka för fakta</div>}
    </Card>
  );

  if (isMobile) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
        {mapCard}
        {card ? <InfoPanel caretSide="none" /> : <FeaturedFacts onOpen={setReader} />}
        <KnowledgeBrowser onOpen={setReader} selectedId={reader} />
        {tip && <div style={{ position: "fixed", left: tip.x + 14, top: tip.y - 6, background: "rgba(0,0,0,0.85)", border: "1px solid #333", borderRadius: 7, padding: "4px 9px", fontSize: 13, pointerEvents: "none", zIndex: 40, color: "#fff" }}>{tip.name}</div>}
        {reader && <KnowledgeReader muscleId={reader} onClose={() => setReader(null)} />}
      </div>
    );
  }

  // Desktop: kunskapsbank till vänster (alltid), karta i mitten, muskel-info eller "Visste du?" till höger.
  const slot = { width: 268, flexShrink: 0, alignSelf: "flex-start" };
  return (
    <div style={{ display: "flex", gap: 16, justifyContent: "center", alignItems: "flex-start", maxWidth: 1140, margin: "0 auto" }}>
      <div style={slot}><KnowledgeBrowser onOpen={setReader} selectedId={reader} /></div>
      <div style={{ width: 420, flexShrink: 0 }}>{mapCard}</div>
      <div style={slot}>{card ? <InfoPanel caretSide="left" /> : <FeaturedFacts onOpen={setReader} />}</div>
      {tip && <div style={{ position: "fixed", left: tip.x + 14, top: tip.y - 6, background: "rgba(0,0,0,0.85)", border: "1px solid #333", borderRadius: 7, padding: "4px 9px", fontSize: 13, pointerEvents: "none", zIndex: 40, color: "#fff" }}>{tip.name}</div>}
      {reader && <KnowledgeReader muscleId={reader} onClose={() => setReader(null)} />}
    </div>
  );
}

function RotatingBody({ onSelect, overallReadiness, muscleStates }) {
  const frames = (typeof window !== "undefined" && window.ATLAS_BODY_FRAMES) ? window.ATLAS_BODY_FRAMES : null;
  const masksMeta = (typeof window !== "undefined" && window.ATLAS_BODY_MASKS) ? window.ATLAS_BODY_MASKS : null;
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [masksReady, setMasksReady] = useState(false);
  const drag = useRef(null), masksRef = useRef([]), tintRef = useRef(null);
  const idxRef = useRef(0), msRef = useRef(muscleStates), rafRef = useRef(0);
  const labels = ["Framifrån", "Sida", "Bakifrån", "Sida"];
  useEffect(() => { idxRef.current = idx; }, [idx]);
  useEffect(() => { msRef.current = muscleStates; }, [muscleStates]);

  useEffect(() => {
    if (!masksMeta) return; let done = 0; const arr = [];
    masksMeta.masks.forEach((src, i) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
        const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, img.width, img.height).data; const n = img.width * img.height; const u = new Uint8Array(n), wt = new Uint8Array(n);
        for (let p = 0, q = 0; p < n; p++, q += 4) { u[p] = d[q]; wt[p] = d[q + 1]; }
        arr[i] = { w: img.width, h: img.height, arr: u, wt: wt }; done++;
        if (done === masksMeta.masks.length) { masksRef.current = arr; setMasksReady(true); }
      };
      img.src = src;
    });
  }, []);

  const paintGlow = now => {
    const m = masksRef.current[idxRef.current], t = tintRef.current; if (!m || !t) return;
    if (t.width !== m.w) { t.width = m.w; t.height = m.h; }
    const g = t.getContext("2d"); const img = g.createImageData(m.w, m.h); const d = img.data;
    const ids = masksMeta.ids, ms = msRef.current;
    const micro = now / 7000 * 2 * Math.PI;    // ±5% barely-there life
    const breathe = now / 7000 * 2 * Math.PI;  // RECOVERING gentle breathing
    const shim = now / 4200 * 2 * Math.PI;      // NEEDS ATTENTION shimmer
    const lut = {};
    for (let p = 0, q = 0; p < m.arr.length; p++, q += 4) {
      const id = m.arr[p]; if (!id) continue;
      let L = lut[id];
      if (L === undefined) {
        const st = ms && ms[ids[id]], glow = bodyGlow(st);
        if (!glow) { lut[id] = null; L = null; }
        else {
          const ph = (id * 1.7) % (2 * Math.PI); const s = st.status;
          let mod = 0.95 + 0.05 * Math.sin(micro + ph), sh = 0;    // global ±5%
          if (s === "recovering" || s === "nearly_ready") mod = 0.93 + 0.07 * Math.sin(breathe + ph); // gentle breathing
          else if (s === "critical") mod = 0.97 + 0.03 * Math.sin(micro + ph);                        // dense, stable
          else if (s === "undertrained") sh = 1;
          L = lut[id] = { c: glow.c, a: glow.a, mod, sh, ph };
        }
      }
      if (!L) continue;
      let a = L.a * L.mod * (m.wt[p] / 255);                       // core→edge depth, contained in muscle
      if (L.sh) { const py = (p / m.w) | 0; a *= 0.85 + 0.15 * (0.5 + 0.5 * Math.sin(shim + py * 0.05 + L.ph)); }
      if (a <= 0) continue;
      d[q] = L.c[0]; d[q + 1] = L.c[1]; d[q + 2] = L.c[2]; d[q + 3] = Math.round(Math.min(1, a) * 200);
    }
    g.putImageData(img, 0, 0);
  };
  useEffect(() => { if (masksReady) { /* masks kept for click hit-testing only */ } }, [masksReady]);

  const onDown = e => { drag.current = { x: e.clientX, startIdx: idx, moved: 0 }; setPlaying(false); };
  const onMove = e => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x; drag.current.moved = Math.max(drag.current.moved, Math.abs(dx));
    const step = Math.round(dx / 55);
    setIdx(((drag.current.startIdx + step) % frames.length + frames.length) % frames.length);
  };
  const onUp = e => {
    const d = drag.current; drag.current = null;
    if (d && d.moved < 6 && onSelect) {
      const m = masksRef.current[idx], t = tintRef.current;
      if (m && t) {
        const box = t.getBoundingClientRect(); const nx = (e.clientX - box.left) / box.width, ny = (e.clientY - box.top) / box.height;
        if (nx >= 0 && ny >= 0 && nx < 1 && ny < 1) { const id = m.arr[Math.floor(ny * m.h) * m.w + Math.floor(nx * m.w)]; if (id) onSelect(masksMeta.ids[id]); }
      }
    }
  };
  const onWheel = e => { e.preventDefault(); setZoom(z => Math.max(1, Math.min(2.6, z - e.deltaY * 0.0016))); };

  if (!frames) return <Card style={{ height: "100%" }}><div style={{ padding: 40, textAlign: "center", color: T.text.muted }}>3D-kroppen visas i den byggda HTML-filen.</div></Card>;
  const imgStyle = { position: "absolute", height: "94%", maxWidth: "92%", objectFit: "contain", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" };

  return (
    <Card pad={0} style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", background: "radial-gradient(ellipse 56% 50% at 50% 40%, rgba(80,140,220,0.20), rgba(9,12,18,0) 72%), linear-gradient(180deg, #10151d, #0a0d13)" }}>
      <style>{`
        @keyframes atlasBreathe{0%,100%{transform:scale(1) translateY(0) rotate(0deg)}50%{transform:scale(1.015) translateY(-0.5%) rotate(0.25deg)}}
        @keyframes atlasSway{0%,100%{transform:translateX(-0.35%)}50%{transform:translateX(0.35%)}}
        @keyframes atlasSheen{0%{transform:translateX(-40%) rotate(8deg);opacity:0}25%{opacity:0.5}50%{transform:translateX(40%) rotate(8deg);opacity:0.5}75%{opacity:0}100%{transform:translateX(-40%) rotate(8deg);opacity:0}}
      `}</style>
      <div style={{ position: "absolute", left: "50%", top: "44%", width: "56%", height: "62%", transform: "translate(-50%,-50%)", background: "radial-gradient(ellipse at center, rgba(90,150,225,0.22), rgba(90,150,225,0) 70%)", filter: "blur(30px)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px 4px", zIndex: 2 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.6, color: T.text.muted, textTransform: "uppercase" }}>Din kropp idag</span>
        <span style={{ fontSize: 12, color: T.text.secondary }}>{labels[idx]}</span>
      </div>
      <div onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={() => { drag.current = null; }} onWheel={onWheel}
        style={{ flex: 1, position: "relative", cursor: drag.current ? "grabbing" : "grab", userSelect: "none", overflow: "hidden", zIndex: 1 }}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transition: "transform 0.35s cubic-bezier(.22,.61,.36,1)" }}>
          <div style={{ position: "absolute", inset: 0, animation: !drag.current ? "atlasBreathe 6.5s ease-in-out infinite, atlasSway 15s ease-in-out infinite" : "none" }}>
            {frames.map((src, i) => (
              <img key={i} src={src} alt={labels[i]} draggable={false} style={{ ...imgStyle, opacity: i === idx ? 1 : 0, transition: "opacity 4.6s ease-in-out", filter: "drop-shadow(0 36px 50px rgba(0,0,0,0.6))" }} />
            ))}
            <div style={{ ...imgStyle, background: "linear-gradient(105deg, rgba(255,255,255,0) 38%, rgba(255,255,255,0.42) 50%, rgba(255,255,255,0) 62%)", mixBlendMode: "soft-light", animation: "atlasSheen 13s ease-in-out infinite", pointerEvents: "none" }} />
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 7, zIndex: 3 }}>
          {frames.map((_, i) => (
            <span key={i} onClick={e => { e.stopPropagation(); setIdx(i); setPlaying(false); }}
              style={{ width: i === idx ? 18 : 7, height: 7, borderRadius: 4, background: i === idx ? T.accent.primary : "rgba(255,255,255,0.25)", transition: "all 0.3s", cursor: "pointer" }} />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 14px", zIndex: 2 }}>
        <span style={{ fontSize: 11, color: T.text.muted }}>dra för att vrida · scrolla för att zooma · klicka en muskel</span>
        <button onClick={() => setZoom(1)} style={{ ...btn.tag, background: T.bg.raised, color: T.text.secondary, opacity: zoom > 1 ? 1 : 0.4 }}>Återställ</button>
      </div>
    </Card>
  );
}

function SvgBody({ onSelect, muscleStates, onReset, chamber = false, reduced = false, paintOverride = null, onSelectRaw = null, loadMode = false }) {
  const overrideRef = useRef(paintOverride);
  useEffect(() => { overrideRef.current = paintOverride; }, [paintOverride]);
  const svgs = (typeof window !== "undefined" && ATLAS_BODY_SVGS) ? ATLAS_BODY_SVGS : null;
  const [view, setView] = useState("front");
  const [demo, setDemo] = useState(false);
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);
  const demoRef = useRef(false), msRef = useRef(muscleStates);
  useEffect(() => { demoRef.current = demo; }, [demo]);
  useEffect(() => { msRef.current = muscleStates; }, [muscleStates]);
  const views = [["front", "Fram"], ["back", "Bak"], ["side_right", "Sida"]];

  const stateFor = grp => demoRef.current ? (DEMO_LEVELS[grp] || null) : groupState(grp, msRef.current);
  const paint = () => {
    const w = wrapRef.current; if (!w) return;
    const ov = overrideRef.current;                      // belastningsläge (separata färger) om satt
    w.querySelectorAll("[data-muscle]").forEach(gp => {
      const grp = gp.getAttribute("data-muscle"), paths = gp.querySelectorAll("path");
      gp.style.filter = "none"; gp.style.transition = "fill-opacity .6s ease";
      let col, op;
      if (ov) {
        const r = ov(grp);
        if (!r) { paths.forEach(p => { p.style.fillOpacity = "0"; }); return; }
        col = r.color; op = r.op;
      } else {
        const st = stateFor(grp);
        if (!st || st.status === "no_data" || st.recoveryScore == null) { paths.forEach(p => { p.style.fillOpacity = "0"; }); return; }
        const f = Math.max(0, Math.min(1, 1 - st.recoveryScore / 100)); col = STATE_COL[st.status] || "#8894a4"; op = (0.4 + f * 0.42).toFixed(2);
      }
      paths.forEach(p => { const g = p.dataset.grad && w.querySelector("#" + p.dataset.grad); if (g) g.querySelectorAll("stop").forEach(s => s.setAttribute("stop-color", col)); p.style.fillOpacity = op; });
    });
  };
  useEffect(() => {
    const w = wrapRef.current; if (!w || !svgs) return;
    const NS = "http://www.w3.org/2000/svg";
    w.innerHTML = svgs[view] || "";
    const svg = w.querySelector("svg");
    if (svg) { svg.removeAttribute("width"); svg.removeAttribute("height"); svg.style.width = "100%"; svg.style.height = "100%"; svg.setAttribute("preserveAspectRatio", "xMidYMid meet"); }
    const layer = w.querySelector("#muscle-layer"); if (layer) { layer.style.mixBlendMode = "overlay"; layer.style.filter = "saturate(1.2) brightness(1.04)"; }
    let defs = svg && svg.querySelector("defs");
    if (svg && !defs) { defs = document.createElementNS(NS, "defs"); svg.insertBefore(defs, svg.firstChild); }
    w.querySelectorAll("[data-muscle]").forEach(gp => {
      const grp = gp.getAttribute("data-muscle");
      gp.style.cursor = "pointer";
      gp.querySelectorAll("path").forEach((p, i) => {                 // one true-circle gradient per anatomical region → belly-centred, no distortion
        const gid = "actg_" + grp + "_" + i;
        if (svg && !svg.querySelector("#" + gid)) {
          const rg = document.createElementNS(NS, "radialGradient"); rg.setAttribute("id", gid);
          let bb = null; try { bb = p.getBBox(); } catch (e) {}
          if (bb && bb.width > 1 && bb.height > 1) {
            rg.setAttribute("gradientUnits", "userSpaceOnUse");
            rg.setAttribute("cx", (bb.x + bb.width * 0.5).toFixed(1));
            rg.setAttribute("cy", (bb.y + bb.height * 0.46).toFixed(1));
            rg.setAttribute("r", (Math.max(bb.width, bb.height) * 0.62).toFixed(1));
          } else { rg.setAttribute("gradientUnits", "objectBoundingBox"); rg.setAttribute("cx", "50%"); rg.setAttribute("cy", "46%"); rg.setAttribute("r", "60%"); }
          [["0%", "1"], ["50%", "0.8"], ["100%", "0.4"]].forEach(([off, op]) => { const s = document.createElementNS(NS, "stop"); s.setAttribute("offset", off); s.setAttribute("stop-color", "#8894a4"); s.setAttribute("stop-opacity", op); rg.appendChild(s); });
          defs.appendChild(rg);
        }
        p.style.stroke = "none"; p.style.fill = "url(#" + gid + ")"; p.dataset.grad = gid;
      });
      gp.addEventListener("click", () => { if (onSelectRaw) onSelectRaw(grp); if (onSelect) onSelect(GROUP_PRIMARY[grp] || grp); });
      const _mid = GROUP_PRIMARY[grp] || grp;
      const _nm = (MUSCLES[_mid] && MUSCLES[_mid].name) || GROUP_SV[grp] || grp;
      gp.addEventListener("mousemove", e => { const w = wrapRef.current; if (!w) return; const r = w.getBoundingClientRect(); setHover({ name: _nm, x: e.clientX - r.left, y: e.clientY - r.top }); });
      gp.addEventListener("mouseleave", () => setHover(null));
    });
  }, [view]);
  useEffect(() => { paint(); }, [muscleStates, view, demo]);
  useEffect(() => { paint(); }, [muscleStates]);
  useEffect(() => { paint(); }, [paintOverride]);   // live-uppdatera belastningsfärger

  if (!svgs) return <Card style={{ height: "100%" }}><div style={{ padding: 40, textAlign: "center", color: T.text.muted }}>SVG-kroppen visas i den byggda HTML-filen.</div></Card>;

  return (
    <Card pad={0} style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", background: chamber ? "radial-gradient(ellipse 60% 74% at 50% 44%, #0f1622 0%, #0d1420 44%, rgba(10,13,19,0) 78%)" : "linear-gradient(180deg,#0e1420,#080b11)", border: chamber ? "none" : undefined, boxShadow: chamber ? "none" : undefined, isolation: chamber ? "isolate" : undefined }}>
      <style>{`@keyframes atlasBreathe2{0%,100%{transform:scale(1)}50%{transform:scale(1.013)}}@keyframes atlasSheen2{0%{transform:translateX(-65%);opacity:0}30%{opacity:.5}50%{transform:translateX(65%);opacity:.5}70%{opacity:0}100%{transform:translateX(-65%);opacity:0}}`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px 2px", position: "relative", zIndex: 4 }}>
        <div style={{ display: "flex", gap: 4, background: T.bg.raised, borderRadius: 9, padding: 3 }}>
          {views.map(([k, lab]) => (
            <button key={k} onClick={() => setView(k)} style={{ padding: "5px 13px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: view === k ? T.accent.primary : "transparent", color: view === k ? "#fff" : T.text.secondary }}>{lab}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {onReset && !loadMode && <button onClick={() => { setDemo(false); onReset(); }} title="Rensa träningsdata så kroppen blir grå — logga sedan ett pass för att se reaktionen" style={{ ...btn.tag, fontWeight: 600, background: T.bg.raised, color: T.text.secondary }}>↺ Nollställ</button>}
          {!loadMode && <button onClick={() => setDemo(d => !d)} style={{ ...btn.tag, fontWeight: 600, background: demo ? T.accent.secondary : T.bg.raised, color: demo ? "#fff" : T.text.secondary }}>{demo ? "● Demo-nivåer" : "Demo-nivåer"}</button>}
          {loadMode && <span style={{ ...btn.tag, fontWeight: 600, background: T.bg.raised, color: T.accent.secondary, cursor: "default" }}>Träningsbelastning</span>}
        </div>
      </div>
      {/* deep backlight — separates body from background (3D) */}
      <div style={{ position: "absolute", left: "50%", top: "40%", width: "76%", height: "82%", transform: "translate(-50%,-50%)", background: "radial-gradient(ellipse at center, rgba(95,155,240,0.42), rgba(70,120,210,0.16) 45%, rgba(0,0,0,0) 72%)", filter: "blur(28px)", zIndex: 0, pointerEvents: "none" }} />
      <div style={{ position: "absolute", left: "50%", top: "32%", width: "36%", height: "44%", transform: "translate(-50%,-50%)", background: "radial-gradient(ellipse at center, rgba(155,200,255,0.46), rgba(155,200,255,0) 70%)", filter: "blur(32px)", zIndex: 0, pointerEvents: "none" }} />
      <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.5, zIndex: 0, pointerEvents: "none" }}>
        {[68, 108, 148, 184].map((r, i) => <circle key={i} cx="200" cy="176" r={r} fill="none" stroke="#4a6a90" strokeOpacity="0.2" strokeWidth="0.6" strokeDasharray={i % 2 ? "2 5" : ""} />)}
      </svg>
      <div style={{ flex: 1, position: "relative", minHeight: 0, zIndex: 1 }}>
        <div ref={wrapRef} style={{ position: "absolute", inset: "6px 0 0", animation: reduced ? "none" : "atlasBreathe2 6.5s ease-in-out infinite", display: "flex", alignItems: "center", justifyContent: "center", filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.75)) contrast(1.12) brightness(1.02) saturate(1.06)" }} />
        {hover && <div style={{ position: "absolute", left: Math.max(6, hover.x + 14), top: Math.max(2, hover.y - 6), pointerEvents: "none", zIndex: 6, fontSize: 12.5, fontWeight: 300, letterSpacing: 0.4, color: T.text.secondary, background: "rgba(8,12,18,0.74)", border: `1px solid ${T.bg.muted}66`, padding: "3px 9px", borderRadius: 7, whiteSpace: "nowrap" }}>{hover.name}</div>}
        {!chamber && <div style={{ position: "absolute", inset: "6px 0 0", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ width: "30%", height: "88%", background: "linear-gradient(105deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.42) 50%, rgba(255,255,255,0) 60%)", mixBlendMode: "soft-light", animation: reduced ? "none" : "atlasSheen2 9s ease-in-out infinite" }} />
        </div>}
        <div style={{ position: "absolute", bottom: chamber ? "2%" : "4.5%", left: "50%", transform: "translateX(-50%)", width: chamber ? "30%" : "34%", height: chamber ? 18 : 22, borderRadius: "50%", background: chamber ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.55)", filter: "blur(9px)", pointerEvents: "none" }} />
        {!chamber && <div style={{ position: "absolute", bottom: "4%", left: "50%", transform: "translateX(-50%)", width: "52%", height: 54, borderRadius: "50%", background: "radial-gradient(ellipse at center, rgba(77,163,255,0.35), rgba(77,163,255,0) 70%)", filter: "blur(8px)", pointerEvents: "none" }} />}
        {!chamber && <div style={{ position: "absolute", bottom: "5.5%", left: "50%", transform: "translateX(-50%)", width: "42%", height: 26, borderRadius: "50%", border: "2px solid rgba(120,190,255,0.6)", boxShadow: "0 0 34px 5px rgba(77,163,255,0.35), inset 0 0 20px rgba(77,163,255,0.25)", pointerEvents: "none" }} />}
      </div>
      {/* vignette — very subtle, only the far corners, never over the body */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 86% at 50% 44%, rgba(0,0,0,0) 74%, rgba(0,0,0,0.22) 100%)", zIndex: 2, pointerEvents: "none" }} />
      {!chamber && <div style={{ zIndex: 3, padding: "10px 18px 15px", borderTop: `1px solid ${T.bg.muted}55` }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: T.text.muted, textTransform: "uppercase", marginBottom: 8 }}>Recovery-legend</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          {[["Återhämtad", STATE_COL.ready], ["Återhämtar", STATE_COL.recovering], ["Överbelastad", STATE_COL.critical], ["Behöver uppmärksamhet", STATE_COL.undertrained]].map(([lab, c]) => (
            <span key={lab} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: T.text.secondary }}><span style={{ width: 10, height: 10, borderRadius: 3, background: c, boxShadow: `0 0 8px ${c}` }} />{lab}</span>
          ))}
        </div>
      </div>}
    </Card>
  );
}

export { BodyMapCard, MuscleModal, MuscleInfoModal, MusclesView, MuscleMapView, RotatingBody, SvgBody };
