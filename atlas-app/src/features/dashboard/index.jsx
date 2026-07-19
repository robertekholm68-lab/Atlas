// FEATURE: Dashboard
import { Card, CardLabel, Gauge, SemiGauge, Sparkline, Icon, SportIcon } from "../../components/common/index.jsx";
import { MOCK } from "../../data/demo.js";
import { daysLeft, goalProgress, groupWeeklySets, volumeStatus } from "../../engines/index.js";
import { SPORTS, CARDIO, resolveActivity } from "../../data/exercises.js";
import { GOAL_CATS, NUTRITION_GOALS } from "../../data/foods.js";
import { STATUS_LABEL, STATUS_COLOR, MISSION_TYPES } from "../../engines/mission.js";
import { MUSCLES, VOLUME_LANDMARKS } from "../../data/muscles.js";
import { H, T, btn, now } from "../../data/tokens.js";

function BalanceMeter({ data }) {
  if (!data || !data.hasData) return null;
  const R = 66, C = 100;
  const AX = [{ key: "training", label: "Träning", angle: -90 }, { key: "recovery", label: "Återhämtning", angle: 0 }, { key: "nutrition", label: "Kost", angle: 90 }, { key: "rest", label: "Vila", angle: 180 }];
  const byKey = Object.fromEntries(data.pillars.map(p => [p.key, p]));
  const pt = (a, r) => [C + Math.cos(a * Math.PI / 180) * r, C + Math.sin(a * Math.PI / 180) * r];
  const ring = f => AX.map(a => pt(a.angle, R * f).join(",")).join(" ");
  const poly = AX.map(a => { const sc = byKey[a.key].score; return pt(a.angle, (sc == null ? 0 : sc) / 100 * R); });
  const scoreCol = sc => sc == null ? T.text.muted : sc >= 70 ? T.accent.success : sc >= 45 ? T.accent.warning : T.accent.danger;
  const oCol = scoreCol(data.overall);
  return (
    <Card>
      <CardLabel right={<span style={{ fontSize: 12, fontWeight: 800, color: oCol }}>{data.overall}<span style={{ fontSize: 10, color: T.text.muted }}>/100</span></span>}>Balans</CardLabel>
      <div style={{ display: "flex", justifyContent: "center", margin: "2px 0 6px" }}>
        <svg viewBox="0 0 200 200" style={{ width: 168, height: 168 }}>
          {[0.25, 0.5, 0.75, 1].map((f, i) => <polygon key={i} points={ring(f)} fill="none" stroke={T.bg.muted} strokeWidth="1" opacity={i === 3 ? 0.6 : 0.3} />)}
          {AX.map(a => { const [x, y] = pt(a.angle, R); return <line key={a.key} x1={C} y1={C} x2={x} y2={y} stroke={T.bg.muted} strokeWidth="1" opacity="0.4" />; })}
          <polygon points={poly.map(p => p.join(",")).join(" ")} fill={`${oCol}33`} stroke={oCol} strokeWidth="2" strokeLinejoin="round" />
          {AX.map((a, i) => { const sc = byKey[a.key].score; const [x, y] = pt(a.angle, (sc == null ? 0 : sc) / 100 * R); return <circle key={a.key} cx={x} cy={y} r="3.5" fill={scoreCol(sc)} />; })}
        </svg>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 12px", marginBottom: 10 }}>
        {AX.map(a => { const p = byKey[a.key]; return (
          <div key={a.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: T.text.secondary }}>{a.label}<span style={{ fontSize: 9.5, color: T.text.muted }}> ·{Math.round(p.weight * 100)}%</span></span>
            <span style={{ fontWeight: 700, color: scoreCol(p.score) }}>{p.score == null ? "—" : p.score}</span>
          </div>
        ); })}
      </div>
      {data.weakest && (
        <div style={{ fontSize: 11.5, color: T.text.secondary, lineHeight: 1.55, paddingTop: 9, borderTop: `1px solid ${T.bg.raised}` }}>
          <span style={{ color: T.text.muted }}>Svagaste länken: </span><span style={{ color: scoreCol(data.weakest.score), fontWeight: 700 }}>{data.weakest.label}</span>. {data.weakest.low}
        </div>
      )}
    </Card>
  );
}

function LaggingCard({ lagging = [] }) {
  if (!lagging.length) return null;
  return (
    <Card>
      <CardLabel right={<span style={{ fontSize: 10, fontWeight: 700, color: T.accent.warning, background: "rgba(255,209,102,0.14)", padding: "2px 7px", borderRadius: 5 }}>VOLYM</span>}>Underarbetad muskelgrupp</CardLabel>
      <div style={{ fontSize: 11.5, color: T.text.muted, marginBottom: 11, lineHeight: 1.5 }}>Har legat under rekommenderad veckovolym de senaste veckorna — värt att prioritera om du vill se den växa.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {lagging.map(l => (
          <div key={l.group} style={{ padding: "10px 12px", background: T.bg.raised, borderRadius: 10, borderLeft: `3px solid ${T.accent.warning}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, alignItems: "baseline" }}>
              <span style={{ color: T.text.primary, fontWeight: 700 }}>{l.groupSv}</span>
              <span style={{ fontSize: 12, color: T.accent.warning }}>~{l.avgWeekly} set/v · under ~{l.mev}</span>
            </div>
            {l.advice && (
              <details style={{ marginTop: 6 }}>
                <summary style={{ fontSize: 11.5, color: T.accent.primary, cursor: "pointer", listStyle: "none" }}>Se tips ▾</summary>
                <div style={{ fontSize: 12, color: T.text.secondary, lineHeight: 1.6, marginTop: 7, whiteSpace: "pre-line" }}>{l.advice}</div>
              </details>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function PersonalInsightCard({ data }) {
  if (!data) return null;
  if (data.needsConfirm) return (
    <Card>
      <CardLabel>Personlig anpassning</CardLabel>
      <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.6, marginBottom: 12 }}>Innan jag väger in kosten i dagens beredskap vill jag stämma av: du har bara loggat {data.days} {data.days === 1 ? "dag" : "dagar"} den senaste tiden. Stämmer det — eller har du bara inte hunnit logga allt?</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={data.onConfirm} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, background: T.accent.primary, color: "#08101c" }}>Loggen stämmer</button>
        <button onClick={data.onSkip} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${T.bg.muted}`, cursor: "pointer", fontSize: 13, fontWeight: 600, background: "transparent", color: T.text.secondary }}>Jag loggar inte allt</button>
      </div>
      <div style={{ fontSize: 10.5, color: T.text.muted, marginTop: 10, lineHeight: 1.5 }}>Säger du att loggen inte är komplett väger jag bara in träningen idag — inga gissningar från halv data.</div>
    </Card>
  );
  return (
    <Card>
      <CardLabel right={data.skipped ? <span style={{ fontSize: 10.5, color: T.text.muted }}>kost ej invägd idag</span> : null}>Personlig anpassning</CardLabel>
      <div style={{ fontSize: 13.5, color: T.text.secondary, lineHeight: 1.6 }}>{data.text}</div>
    </Card>
  );
}

function ReadinessWhy({ why, color }) {
  if (!why || !why.factors || !why.factors.length) return null;
  const onlyBase = why.factors.length === 1;
  return (
    <details style={{ width: "100%", marginTop: 2 }}>
      <summary style={{ fontSize: 11.5, color: T.accent.primary, cursor: "pointer", textAlign: "center", listStyle: "none" }}>Varför den här siffran?</summary>
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 7 }}>
        {why.factors.map((f, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11.5, alignItems: "flex-start" }}>
            <div><span style={{ color: T.text.secondary }}>{f.label}</span>{f.note && <div style={{ fontSize: 10.5, color: T.text.muted, lineHeight: 1.45, marginTop: 1 }}>{f.note}</div>}</div>
            <span style={{ fontWeight: 700, whiteSpace: "nowrap", color: f.delta == null ? T.text.primary : f.delta < 0 ? T.accent.danger : T.accent.success }}>{f.delta == null ? f.base : `${f.delta > 0 ? "+" : ""}${f.delta}`}</span>
          </div>
        ))}
        {onlyBase && <div style={{ fontSize: 10.5, color: T.text.muted, lineHeight: 1.45 }}>Inget i kost eller menscykel drar ner beredskapen just nu.</div>}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${T.bg.raised}`, paddingTop: 6, fontSize: 12 }}><span style={{ color: T.text.secondary, fontWeight: 700 }}>Samlad beredskap</span><span style={{ fontWeight: 800, color }}>{why.total}</span></div>
      </div>
    </details>
  );
}
function ReadinessCard({ readiness, info, why }) {
  const missing = info && info.missingInputs && info.missingInputs.length ? `Saknas: ${info.missingInputs.join(", ")}.` : "";
  if (readiness == null) return (
    <Card>
      <CardLabel>Readiness</CardLabel>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "14px 6px", textAlign: "center" }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: T.text.muted }}>—</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text.secondary }}>Jag behöver mer data innan jag kan bedöma din readiness.</div>
        <div style={{ fontSize: 12, color: T.text.muted, lineHeight: 1.5 }}>Logga ditt första pass så beräknas readiness utifrån din träningsbelastning. {missing}</div>
      </div>
    </Card>
  );
  const preliminary = info && info.level === "limited_data";
  const color = readiness >= 76 ? T.accent.success : readiness >= 56 ? T.accent.warning : T.accent.danger;
  const label = readiness >= 76 ? "High readiness" : readiness >= 56 ? "Moderate readiness" : "Low readiness";
  const sub = readiness >= 76 ? "Your body is ready to perform." : readiness >= 56 ? "Train, but manage intensity." : "Prioritize recovery today.";
  return (
    <Card>
      <CardLabel>Readiness</CardLabel>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <Gauge value={readiness} color={color} big sub="/100" />
        <div style={{ fontSize: 16, fontWeight: 700, color }}>{label}</div>
        <div style={{ fontSize: 13, color: T.text.muted, textAlign: "center" }}>{sub}</div>
        {preliminary && <div style={{ fontSize: 11.5, color: T.accent.warning, textAlign: "center" }}>Preliminär bedömning baserad på begränsad data.</div>}
        <ReadinessWhy why={why} color={color} />
        <div style={{ fontSize: 10.5, color: T.text.muted, textAlign: "center", lineHeight: 1.5 }}>Baseras på träningsbelastning, och väger in kost och (om spårad) menscykel. Sömn/HRV/vilopuls ingår inte.</div>
      </div>
    </Card>
  );
}

function TodaysPlan({ recommendation, onStart }) {
  return (
    <Card>
      <CardLabel right={<span style={{ fontSize: 13, display: "inline-flex" }}><Icon name="calendar" size={14} /></span>}>Today's Plan</CardLabel>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: T.bg.raised, borderRadius: 12, marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: T.bg.muted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}><Icon name="dumbbell" size={20} /></div>
        <div><div style={{ fontSize: 15, fontWeight: 700, color: T.text.primary }}>{recommendation.title}</div><div style={{ fontSize: 12, color: T.text.muted }}>~60 min</div></div>
      </div>
      {[["Warm-up", "10 min"], ["Strength Session", "40 min"], ["Cooldown", "10 min"]].map(([n, t]) => (
        <div key={n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", fontSize: 13 }}>
          <span style={{ color: T.text.secondary, display: "flex", alignItems: "center", gap: 8 }}><span style={{ color: T.text.muted }}>◷</span>{n}</span>
          <span style={{ color: T.text.muted }}>{t}</span>
        </div>
      ))}
      <button onClick={onStart} style={{ ...btn.primary, width: "100%", marginTop: 12 }}>{recommendation.actionLabel}</button>
    </Card>
  );
}

function TrainingLoadCard({ demo = false, metrics = null }) {
  // §2: I Real Mode kommer serien ur den AKTIVA historiken. Demo behåller exempelkurvan.
  const days = demo ? MOCK.trainingLoadDays : (metrics ? metrics.load7.map(d => d.label) : []);
  const data = demo ? MOCK.trainingLoad : (metrics ? metrics.load7.map(d => d.value) : []);
  const current = demo ? 678 : (metrics ? metrics.currentLoad : 0);
  const hasSignal = demo || (metrics && metrics.load7.some(d => d.value > 0));
  const WeeklyTarget = ({ compact = false }) => {
    if (!metrics || !metrics.weeklyTarget) return null;
    const done = metrics.weekDone || 0, target = metrics.weeklyTarget, pct = Math.round((metrics.weeklyProgress || 0) * 100);
    const met = done >= target;
    return (
      <div style={{ marginTop: compact ? 10 : 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
          <span style={{ fontSize: 12, color: T.text.secondary, fontWeight: 600 }}>Veckomål <span style={{ fontSize: 10.5, color: T.text.muted, fontWeight: 500 }}>· mån–sön</span></span>
          <span style={{ fontSize: 12, color: met ? T.accent.success : T.text.muted, fontWeight: 700 }}>{done} / {target} pass</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: T.bg.muted, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: met ? T.accent.success : T.accent.primary, transition: "width .3s ease" }} />
        </div>
      </div>
    );
  };
  if (!hasSignal) return (
    <Card>
      <CardLabel right={<span style={{ fontSize: 11, color: T.text.muted }}>7-dagarstrend</span>}>Träningsbelastning</CardLabel>
      <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.55, padding: "6px 2px" }}>
        {metrics && metrics.weeklyTarget
          ? `Ditt mål är ${metrics.weeklyTarget} pass/vecka. Logga ditt första så börjar din 7-dagarskurva byggas här.`
          : "Ingen träningsbelastning ännu. Logga ett pass så börjar din 7-dagarskurva byggas här."}
      </div>
      <WeeklyTarget />
    </Card>
  );
  const max = Math.max(1, ...data) * 1.15, w = 260, h = 90;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <Card>
      <CardLabel right={<span style={{ fontSize: 11, color: T.text.muted }}>7-dagarstrend</span>}>Träningsbelastning</CardLabel>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: T.text.primary }}>{current}</span>
        <span style={{ fontSize: 12, color: T.text.muted, fontWeight: 600 }}>idag</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
        <defs><linearGradient id="tl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent.secondary} stopOpacity="0.35" /><stop offset="100%" stopColor={T.accent.secondary} stopOpacity="0" /></linearGradient></defs>
        <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#tl)" />
        <polyline points={pts} fill="none" stroke={T.accent.secondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={w} cy={h - (data[data.length - 1] / max) * h} r="3.5" fill={T.accent.secondary} stroke={T.bg.surface} strokeWidth="1.5" />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        {days.map((d, i) => <span key={i} style={{ fontSize: 10, color: T.text.muted }}>{d}</span>)}
      </div>
      {!demo && <WeeklyTarget compact />}
    </Card>
  );
}

function NutritionCard({ totals, targets = null, goals = null, demo = false, suggestion = null, onAcceptSuggestion = null }) {
  const t = totals || { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const g = targets || goals || NUTRITION_GOALS;           // targets = resolved (§4)
  const hasKcal = g.hasKcal !== undefined ? g.hasKcal : g.kcal != null;
  const hasProtein = g.hasProtein !== undefined ? g.hasProtein : g.protein != null;
  if (!demo && !hasKcal && !hasProtein) return (
    <Card>
      <CardLabel right={<span style={{ fontSize: 11, color: T.text.muted }}>idag</span>}>Kost</CardLabel>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: T.text.primary }}>{t.kcal.toLocaleString("sv-SE")}</span>
        <span style={{ fontSize: 12, color: T.text.muted }}>kcal idag</span>
      </div>
      {suggestion ? (
        <>
          <div style={{ fontSize: 12.5, color: T.text.secondary, lineHeight: 1.55 }}>ATLAS föreslår ett startmål utifrån ditt mål och din vikt: <b style={{ color: T.text.primary }}>~{suggestion.kcal.toLocaleString("sv-SE")} kcal</b> och <b style={{ color: T.text.primary }}>{suggestion.protein} g protein</b>. En grov startpunkt — justera fritt i profilen.</div>
          {onAcceptSuggestion && <button onClick={onAcceptSuggestion} style={{ ...btn.primary, marginTop: 10, fontSize: 13 }}>Använd förslaget</button>}
        </>
      ) : (
        <div style={{ fontSize: 12.5, color: T.text.secondary, lineHeight: 1.5 }}>Inget personligt mål angivet ännu. Ange kalori-/proteinmål i onboarding eller profil så visas din måluppfyllnad här.</div>
      )}
    </Card>
  );
  const cal = hasKcal ? Math.min(100, Math.round(t.kcal / g.kcal * 100)) : 0;
  const rows = [["Protein", t.protein, hasProtein ? g.protein : null, "g", T.accent.success], ["Kolhydrater", t.carbs, g.carbs, "g", T.accent.warning], ["Fett", t.fat, g.fat, "g", T.accent.primary]];
  const suggested = g.source === "atlas_suggestion";
  return (
    <Card>
      <CardLabel right={<span style={{ fontSize: 11, color: T.text.muted }}>{suggested ? "ATLAS-förslag · idag" : "idag"}</span>}>Kost</CardLabel>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
        <Gauge value={cal} size={84} stroke={8} color={T.accent.secondary} sub="kcal" />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: T.text.primary }}>{t.kcal.toLocaleString("sv-SE")}</span>
            <span style={{ fontSize: 12, color: T.text.muted }}>{hasKcal ? `/ ${g.kcal.toLocaleString("sv-SE")} kcal` : "kcal"}</span>
          </div>
          <div style={{ fontSize: 12, color: T.text.muted, marginTop: 2 }}>{hasKcal ? `${Math.max(0, g.kcal - t.kcal)} kcal kvar` : "Inget kalorimål angivet"}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {rows.map(([label, now, goal, unit, col]) => (
          <div key={label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
              <span style={{ color: T.text.secondary }}>{label}</span>
              <span style={{ color: T.text.primary, fontWeight: 600 }}>{now} {goal != null ? `/ ${goal} ${unit}` : unit}</span>
            </div>
            <div style={{ height: 5, background: T.bg.muted, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${goal != null ? Math.min(100, now / goal * 100) : 0}%`, height: "100%", background: col, borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function HealthUnavailable() {
  // §3: Real Mode har ingen hälsokälla (sömn/HRV/vilopuls/steg). Inga påhittade exempelvärden.
  return (
    <>
      <div style={{ fontSize: 13.5, color: T.text.secondary, lineHeight: 1.55, padding: "4px 2px" }}>Ingen hälsodata ansluten ännu.</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        {["Sömn", "HRV", "Vilopuls", "Steg"].map(k => (
          <span key={k} style={{ fontSize: 11.5, color: T.text.muted, background: T.bg.raised, borderRadius: 999, padding: "4px 10px" }}>{k} —</span>
        ))}
      </div>
      <div style={{ fontSize: 11, color: T.text.muted, marginTop: 8, lineHeight: 1.5 }}>Muskelåterhämtning bygger på din träningsbelastning och visas på kroppskartan. Sömn/HRV/vilopuls kräver en ansluten källa.</div>
    </>
  );
}

function RecoveryCard({ sessions, demo = false }) {
  if (!sessions || sessions.length === 0) return (
    <Card>
      <CardLabel>Recovery</CardLabel>
      <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.55, padding: "6px 2px" }}>Jag behöver fler loggade pass innan jag kan bedöma din återhämtning.</div>
      <div style={{ fontSize: 11, color: T.text.muted, marginTop: 6 }}>Sömn/HRV skulle förbättra bedömningen men samlas inte in ännu.</div>
    </Card>
  );
  if (!demo) return (<Card><CardLabel>Hälsa & återhämtning</CardLabel><HealthUnavailable /></Card>);
  return (
    <Card>
      <CardLabel right={<span style={{ fontSize: 10, fontWeight: 700, color: T.text.muted, background: T.bg.raised, padding: "2px 7px", borderRadius: 5 }}>EXEMPEL · ingen datakälla</span>}>Recovery</CardLabel>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Gauge value={MOCK.recovery} size={84} stroke={8} color={T.accent.success} sub="%" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          {[["Sleep", MOCK.sleep], ["HRV", MOCK.hrv], ["Resting HR", MOCK.restingHr]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: T.text.secondary }}>{k}</span><span style={{ color: T.text.primary, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function AICoachCard({ recommendation, onAsk }) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <span style={{ color: T.accent.secondary }}>✦</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: T.accent.secondary, textTransform: "uppercase" }}>AI Coach</span>
      </div>
      <div style={{ fontSize: 14, color: T.text.secondary, lineHeight: 1.6, marginBottom: 12 }}>{recommendation.summary}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
        {recommendation.explanation?.map((f, i) => (
          <div key={i} style={{ fontSize: 12, color: T.text.muted, display: "flex", gap: 6 }}>
            <span style={{ color: f.direction === "increase" ? T.accent.success : T.accent.warning }}>{f.direction === "increase" ? "▲" : "▼"}</span>
            <span><b style={{ color: T.text.secondary, fontWeight: 600 }}>{f.label}:</b> {f.description}</span>
          </div>
        ))}
      </div>
      <button onClick={onAsk} style={{ ...btn.primary, width: "100%" }}>Fråga coachen</button>
    </Card>
  );
}

function MilestoneCard({ milestone = null, demo = false, onCreateGoal = null }) {
  // §12: I Real Mode kommer milstolpen ur användarens mål. Inget mål → tydligt tomt-tillstånd, ingen demo-milstolpe.
  const m = demo ? MOCK.milestone : milestone;
  if (!m) return (
    <Card>
      <CardLabel>Nästa milstolpe</CardLabel>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text.secondary, marginBottom: 4 }}>Inget aktivt mål ännu.</div>
          <div style={{ fontSize: 12, color: T.text.muted, lineHeight: 1.5 }}>Sätt ett mål (styrka, kropp eller vana) så visas din närmaste milstolpe här.</div>
          {onCreateGoal && <button onClick={onCreateGoal} style={{ ...btn.tag, marginTop: 10, fontSize: 12.5, background: T.bg.raised, color: T.accent.primary }}>+ Skapa ett mål</button>}
        </div>
        <div style={{ fontSize: 24, display: "flex" }}><Icon name="target" size={24} /></div>
      </div>
    </Card>
  );
  const { title, pct, daysLeft } = m;
  return (
    <Card>
      <CardLabel>Nästa milstolpe</CardLabel>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text.primary, marginBottom: 8 }}>{title}</div>
          <div style={{ height: 6, background: T.bg.muted, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${T.accent.success}, ${T.accent.primary})`, borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 11, color: T.text.muted, marginTop: 6 }}>{daysLeft != null ? `${daysLeft} dagar kvar · ` : ""}{pct}%</div>
        </div>
        <div style={{ fontSize: 24, display: "flex" }}><Icon name="trophy" size={24} /></div>
      </div>
    </Card>
  );
}

function KeyMetrics({ demo = false }) {
  if (!demo) return (<Card><CardLabel>Hälsa & mätvärden</CardLabel><HealthUnavailable /></Card>);
  return (
    <Card>
      <CardLabel right={<span style={{ fontSize: 10, fontWeight: 700, color: T.text.muted, background: T.bg.raised, padding: "2px 7px", borderRadius: 5 }}>EXEMPEL · ingen datakälla</span>}>Key Metrics</CardLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {MOCK.metrics.map(m => (
          <div key={m.label} style={{ background: T.bg.raised, borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 13 }}>{m.icon}</span><span style={{ fontSize: 12, color: T.text.muted }}>{m.label}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: T.text.primary }}>{m.value}</span><span style={{ fontSize: 11, color: T.text.muted }}>{m.unit}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 6 }}>
              <span style={{ fontSize: 11, color: m.color }}>● {m.state}</span><Sparkline data={m.spark} color={m.sparkColor} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MuscleStatusList({ muscleStates, onSelect, title = "Muscle Status" }) {
  const rows = Object.keys(MUSCLES)
    .map(id => ({ id, ...muscleStates[id] }))
    .sort((a, b) => a.recoveryScore - b.recoveryScore);
  return (
    <Card>
      <CardLabel>{title}</CardLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {rows.map(r => (
          <button key={r.id} onClick={() => onSelect(r.id)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: T.bg.raised, border: "none", borderRadius: 8, cursor: "pointer", textAlign: "left", width: "100%" }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", flexShrink: 0, background: T.status[r.status] }} />
            <span style={{ flex: 1, fontSize: 13, color: T.text.secondary }}>{MUSCLES[r.id].name}</span>
            <span style={{ fontSize: 11, color: T.text.muted, textTransform: "capitalize" }}>{T.statusLabel[r.status]}</span>
            <span style={{ fontSize: 12, color: T.text.primary, fontWeight: 600, width: 38, textAlign: "right" }}>{r.recoveryScore}%</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function RecentSessions({ sessions, onSelect }) {
  const rows = [...sessions].sort((a, b) => b.completedAt - a.completedAt).slice(0, 6);
  return (
    <Card>
      <CardLabel>Recent Sessions</CardLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map(s => {
          const top = Object.entries(s.muscleLoads).filter(([, v]) => v > 5).sort(([, a], [, b]) => b - a).slice(0, 3).map(([id]) => MUSCLES[id]?.name).join(", ");
          return (
            <div key={s.id} style={{ padding: "10px 12px", background: T.bg.raised, borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.text.primary }}>{s.title}</span>
                <span style={{ fontSize: 12, color: T.text.muted }}>{new Date(s.completedAt).toLocaleDateString("sv-SE", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              {top && <div style={{ fontSize: 12, color: T.text.muted, marginTop: 2 }}>{top}</div>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function VolumeOverview({ sessions }) {
  const now = Date.now();
  const groups = Object.keys(VOLUME_LANDMARKS).map(g => ({ g, sets: groupWeeklySets(sessions, g, now), vol: volumeStatus(groupWeeklySets(sessions, g, now), g) }));
  const GNAME = { chest: "Bröst", back: "Rygg", shoulders: "Axlar", arms: "Armar", core: "Bål", legs: "Ben", glutes: "Säte", calves: "Vader", neck: "Nacke" };
  return (
    <Card>
      <CardLabel right={<span style={{ fontSize: 11, color: T.text.muted }}>set / vecka</span>}>Träningsvolym per grupp</CardLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {groups.map(({ g, sets, vol }) => {
          const max = vol.lm.mrv * 1.25, pctX = v => Math.min(100, v / max * 100);
          return (
            <div key={g}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: T.text.secondary }}>{GNAME[g]}</span>
                <span style={{ color: vol.col, fontWeight: 600 }}>{sets} set · {vol.label}</span>
              </div>
              <div style={{ position: "relative", height: 8, background: T.bg.muted, borderRadius: 4 }}>
                <div style={{ position: "absolute", left: `${pctX(vol.lm.mav[0])}%`, width: `${(vol.lm.mav[1] - vol.lm.mav[0]) / max * 100}%`, top: 0, bottom: 0, background: "rgba(57,217,138,0.22)" }} />
                <div style={{ position: "absolute", left: `${pctX(vol.lm.mev)}%`, top: -2, bottom: -2, width: 2, background: T.text.muted }} />
                <div style={{ position: "absolute", left: `${pctX(vol.lm.mrv)}%`, top: -2, bottom: -2, width: 2, background: T.accent.danger }} />
                <div style={{ position: "absolute", left: 0, width: `${pctX(sets)}%`, top: 0, bottom: 0, background: vol.col, borderRadius: 4, opacity: 0.9 }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: T.text.muted, marginTop: 10, lineHeight: 1.5 }}>Grön zon = optimal veckovolym (MAV). Streck vänster = MEV (minimum), rött = MRV (max). Baserat på muscles.se.</div>
    </Card>
  );
}

function SportsCard({ onLog, activeSports }) {
  const ids = (activeSports && activeSports.length ? activeSports : ["running", "cycling", "muay-thai", "floorball"]).slice(0, 6);
  const quick = ids.map(id => resolveActivity(id)).filter(Boolean);
  return (
    <Card>
      <CardLabel>Cardio & aktivitet</CardLabel>
      <div style={{ fontSize: 12, color: T.text.muted, marginBottom: 10 }}>Logga löpning, cykel och annan kondition — det belastar kroppen och matar återhämtningen.</div>
      <button onClick={() => onLog((quick[0] && (quick[0].libId || quick[0].id)) || "running")} style={{ ...btn.primary, width: "100%", padding: "11px", fontSize: 13.5, marginBottom: 10 }}>🏃 Logga cardio / aktivitet</button>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {quick.map(s => (
          <button key={s.libId || s.id} onClick={() => onLog(s.libId || s.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, cursor: "pointer", background: T.bg.raised, border: `1px solid ${T.bg.muted}`, borderLeft: `3px solid ${s.color}` }}>
            <SportIcon id={s.libId || s.id} emoji={s.icon} size={30} />
            <span style={{ fontSize: 13, fontWeight: 600, color: T.text.primary }}>{s.name}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function ConditioningCard({ sessions, systemicRecovery }) {
  const now = Date.now();
  const weekCardio = sessions.filter(s => s.cardioLoad && now - s.completedAt < 7 * 864e5).reduce((a, s) => a + s.cardioLoad, 0);
  const recent = sessions.filter(s => s.sport).sort((a, b) => b.completedAt - a.completedAt).slice(0, 4);
  const col = systemicRecovery >= 70 ? T.accent.success : systemicRecovery >= 45 ? T.accent.warning : T.accent.danger;
  return (
    <Card>
      <CardLabel right={<span style={{ fontSize: 11, color: T.text.muted }}>{weekCardio} belastning/vecka</span>}>Kondition</CardLabel>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: recent.length ? 14 : 0 }}>
        <Gauge value={systemicRecovery} size={84} stroke={8} color={col} sub="system" />
        <div style={{ flex: 1, fontSize: 13, color: T.text.secondary, lineHeight: 1.5 }}>
          Systemisk återhämtning efter kondition/HIIT. Hög konditionsbelastning ger trötthet i hela kroppen och sänker din readiness tillfälligt.
        </div>
      </div>
      {recent.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {recent.map(s => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 11px", background: T.bg.raised, borderRadius: 8 }}>
              <div><div style={{ fontSize: 13, color: T.text.primary }}>{s.title}</div>
                <div style={{ fontSize: 11, color: T.text.muted }}>{new Date(s.completedAt).toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short" })}</div></div>
              <span style={{ fontSize: 12, color: T.accent.warning }}>{s.cardioLoad || 0}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function GoalsMiniCard({ goals, sessions }) {
  const weekly = sessions.filter(s => Date.now() - s.completedAt < 7 * 864e5).length;
  const view = (goals || []).map(g => g.live === "weekly" ? { ...g, current: weekly } : g).slice(0, 3);
  return (
    <Card>
      <CardLabel>Mål</CardLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {view.length === 0 && <div style={{ fontSize: 13, color: T.text.muted }}>Inga mål än.</div>}
        {view.map(g => {
          const pct = goalProgress(g), col = GOAL_CATS[g.cat];
          return (
            <div key={g.id}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                <span style={{ color: T.text.secondary }}>{g.title}</span>
                <span style={{ color: T.text.muted }}>{g.current}/{g.target} {g.unit}</span>
              </div>
              <div style={{ height: 6, background: T.bg.muted, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: col, borderRadius: 3 }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function DashReadiness({ readiness, info, why }) {
  const missing = info && info.missingInputs && info.missingInputs.length ? `Saknas: ${info.missingInputs.join(", ")}.` : "";
  if (readiness == null) return (
    <Card><CardLabel right={<span style={{ color: T.text.muted, fontSize: 12 }}>ⓘ</span>}>Övergripande beredskap</CardLabel>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "14px 6px", textAlign: "center" }}>
        <div style={{ fontSize: 34, fontWeight: 800, color: T.text.muted }}>—</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text.secondary }}>Jag behöver mer data innan jag kan bedöma din readiness.</div>
        <div style={{ fontSize: 12, color: T.text.muted, lineHeight: 1.5 }}>Logga ditt första pass så beräknas beredskapen utifrån din träningsbelastning. {missing}</div>
      </div>
    </Card>
  );
  const preliminary = info && info.level === "limited_data";
  const color = readiness >= 76 ? T.accent.success : readiness >= 56 ? T.accent.warning : T.accent.danger;
  const label = readiness >= 76 ? "Bra" : readiness >= 56 ? "Måttlig" : "Låg";
  const sub = readiness >= 76 ? "Din kropp är redo. Fokusera på kvalitet och intensitet." : readiness >= 56 ? "Träna, men styr intensiteten." : "Prioritera återhämtning idag.";
  return (
    <Card><CardLabel right={<span style={{ color: T.text.muted, fontSize: 12 }}>ⓘ</span>}>Övergripande beredskap</CardLabel>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "2px 0" }}>
        <SemiGauge value={readiness} />
        <div style={{ fontSize: 18, fontWeight: 700, color }}>{label}</div>
        <div style={{ fontSize: 12.5, color: T.text.muted, textAlign: "center", lineHeight: 1.5 }}>{sub}</div>
        {preliminary && <div style={{ fontSize: 11.5, color: T.accent.warning, textAlign: "center" }}>Preliminär bedömning baserad på begränsad data.</div>}
        <ReadinessWhy why={why} color={color} />
        <div style={{ fontSize: 10.5, color: T.text.muted, textAlign: "center", lineHeight: 1.5 }}>Baseras på träningsbelastning, och väger in kost och (om spårad) menscykel. Sömn/HRV/vilopuls ingår inte.</div>
      </div>
    </Card>
  );
}

function DashCoach({ recommendation, onStart }) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ color: T.accent.secondary }}>✦</span><span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: T.accent.secondary, textTransform: "uppercase" }}>AI-coach</span></div>
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1, color: T.accent.secondary, background: "rgba(155,124,255,0.14)", border: `1px solid ${T.accent.secondary}55`, borderRadius: 5, padding: "2px 6px" }}>BETA</span>
      </div>
      <div style={{ fontSize: 13.5, color: T.text.secondary, lineHeight: 1.6, marginBottom: 14 }}>{recommendation.summary}</div>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: T.text.muted, textTransform: "uppercase", marginBottom: 7 }}>Nästa bästa åtgärd</div>
      <button onClick={onStart} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: T.bg.raised, border: `1px solid ${T.accent.primary}44`, borderRadius: 11, cursor: "pointer", textAlign: "left" }}>
        <span style={{ color: T.accent.primary, display: "inline-flex" }}><Icon name="dumbbell" size={16} /></span>
        <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: T.text.primary }}>{recommendation.title}</div><div style={{ fontSize: 11.5, color: T.text.muted }}>60–75 min · Hög prioritet</div></div>
        <span style={{ color: T.text.muted }}>›</span>
      </button>
    </Card>
  );
}

function DashRecommendation({ recommendation, onStart }) {
  const chips = (recommendation.targetMuscles || []).slice(0, 3).map(id => MUSCLES[id] ? MUSCLES[id].name : id);
  const show = chips.length ? chips : ["Bröst", "Rygg", "Axlar"];
  return (
    <Card><CardLabel right={<span style={{ fontSize: 13, display: "inline-flex" }}><Icon name="calendar" size={14} /></span>}>Dagens rekommendation</CardLabel>
      <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 3 }}>{recommendation.title}</div>
      <div style={{ fontSize: 12.5, color: T.text.muted, marginBottom: 13 }}>Bygg styrka där du är redo.</div>
      <div style={{ display: "flex", gap: 7, marginBottom: 15, flexWrap: "wrap" }}>
        {show.map(c => <span key={c} style={{ fontSize: 12.5, fontWeight: 600, color: T.accent.primary, background: "rgba(77,163,255,0.12)", border: `1px solid ${T.accent.primary}33`, borderRadius: 8, padding: "6px 12px" }}>{c}</span>)}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
        <div><div style={{ fontSize: 10, color: T.text.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Beräknad tid</div><div style={{ fontSize: 15, fontWeight: 700 }}>60–75 min</div></div>
        <div><div style={{ fontSize: 10, color: T.text.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Intensitet</div><div style={{ fontSize: 15, fontWeight: 700, color: T.accent.warning }}>Hög</div></div>
        <button onClick={onStart} style={{ ...btn.pill, display: "flex", alignItems: "center", gap: 6 }}>Visa plan ›</button>
      </div>
    </Card>
  );
}

function DashRecovery({ sessions, demo = false }) {
  if (!sessions || sessions.length === 0) return (
    <Card><CardLabel>Återhämtningsöversikt</CardLabel>
      <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.55, padding: "6px 2px" }}>Jag behöver fler loggade pass innan jag kan bedöma din återhämtning.</div>
      <div style={{ fontSize: 11, color: T.text.muted, marginTop: 6 }}>Sömn, HRV och vilopuls samlas inte in ännu — de skulle göra bedömningen mer komplett.</div>
    </Card>
  );
  if (!demo) return (<Card><CardLabel>Hälsa & återhämtning</CardLabel><HealthUnavailable /></Card>);
  const items = [["🌙", "8h 12m", "Sömn", "Bra", T.accent.primary], ["♥", "56", "HRV", "Balanserad", T.accent.danger], ["🍃", "87%", "Återhämtning", "Bra", T.accent.success]];
  return (
    <Card><CardLabel right={<span style={{ fontSize: 10, fontWeight: 700, color: T.text.muted, background: T.bg.raised, padding: "2px 7px", borderRadius: 5 }}>EXEMPEL · ingen datakälla</span>}>Återhämtningsöversikt</CardLabel>
      <div style={{ display: "flex", justifyContent: "space-around", gap: 8, marginBottom: 12 }}>
        {items.map(([ic, val, lab, st, col]) => (
          <div key={lab} style={{ textAlign: "center" }}>
            <div style={{ width: 54, height: 54, borderRadius: "50%", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, background: `radial-gradient(circle, ${col}22, transparent 68%)`, border: `2px solid ${col}66`, boxShadow: `0 0 14px -4px ${col}` }}>{ic}</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{val}</div>
            <div style={{ fontSize: 11, color: T.text.muted }}>{lab}</div>
            <div style={{ fontSize: 11, color: col, fontWeight: 600 }}>{st}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "9px 12px", background: T.bg.raised, borderRadius: 9, textAlign: "center", fontSize: 12.5, color: T.text.secondary }}>Kroppen anpassar sig. Fortsätt.</div>
    </Card>
  );
}

function DashLatest({ sessions }) {
  const s = [...(sessions || [])].sort((a, b) => b.completedAt - a.completedAt)[0];
  const days = s ? Math.max(0, Math.round((Date.now() - s.completedAt) / 864e5)) : 0;
  const vol = s ? Math.round((s.sets || []).reduce((a, x) => a + (x.weight || 0) * (x.reps || 0), 0)) : 0;
  const dur = s && s.duration ? s.duration : null;
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 11 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ color: T.accent.warning }}>★</span><span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: T.text.muted, textTransform: "uppercase" }}>Senaste träningspass</span></div>
        <span style={{ fontSize: 11, color: T.text.muted }}>{days} dagar sedan</span>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ width: 96, height: 64, borderRadius: 9, background: `linear-gradient(135deg,${T.bg.muted},${T.bg.raised})`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}><Icon name="dumbbell" size={26} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{s ? s.title : "Inget pass än"}</div>
          <div style={{ fontSize: 12, color: T.text.muted, marginTop: 3 }}>{dur != null ? `${dur} min · ` : ""}{vol.toLocaleString("sv-SE")} kg volym</div>
          <button style={{ background: "none", border: "none", padding: 0, color: T.accent.primary, marginTop: 8, fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>Prestanda ›</button>
        </div>
      </div>
    </Card>
  );
}

function DashMission({ mission = null, analysis = null, onOpen = null }) {
  // §Målresa: kompakt primär-målresa-kort. Inget → null (belamrar inte tom dashboard, ingen demo-fiktion).
  if (!mission || !analysis) return null;
  const a = analysis, tl = a.timeline, ph = a.phase && a.phase.phase;
  const t = MISSION_TYPES.find(x => x.id === mission.type);
  const col = STATUS_COLOR[a.status] || T.text.muted;
  return (
    <Card style={{ cursor: onOpen ? "pointer" : "default", background: `linear-gradient(135deg, ${T.bg.surface}, rgba(155,124,255,0.05))` }}>
      <div onClick={onOpen || undefined}>
        <CardLabel right={<span style={{ fontSize: 10.5, fontWeight: 700, color: col, background: `${col}22`, border: `1px solid ${col}55`, borderRadius: 999, padding: "1px 8px" }}>{STATUS_LABEL[a.status]}</span>}>Målresa</CardLabel>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 17, display: "inline-flex", alignItems: "center" }}><Icon name={t ? t.icon : "target"} size={17} /></span>
          <span style={{ fontSize: 15.5, fontWeight: 800, color: T.text.primary }}>{mission.name}</span>
        </div>
        {mission.why && <div style={{ fontSize: 12, color: T.text.muted, lineHeight: 1.45, marginBottom: 10, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{mission.why}</div>}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: T.text.secondary, marginBottom: 10 }}>
          {tl.weeksToReady != null && <span>⏳ <b style={{ color: T.text.primary }}>{tl.weeksToReady}</b> v kvar</span>}
          {ph && <span>◔ {ph.name}</span>}
          {a.criticalOnTrack && <span>{a.criticalOnTrack.onTrack}/{a.criticalOnTrack.total} avgörande i fas</span>}
        </div>
        {a.focus && <div style={{ fontSize: 12, color: T.accent.secondary, background: "rgba(155,124,255,0.08)", borderRadius: 8, padding: "7px 10px", lineHeight: 1.4 }}><b>Veckans fokus:</b> {a.focus.reason}</div>}
        {a.conflicts[0] && <div style={{ fontSize: 11.5, color: T.accent.warning, marginTop: 7, lineHeight: 1.4 }}>⚠️ {a.conflicts[0].hypothesis}</div>}
      </div>
    </Card>
  );
}

function DashGoal({ goals }) {
  const g = (goals || [])[0]; const pct = g ? goalProgress(g) : 0;
  const days = g && g.deadline ? Math.max(0, Math.round((g.deadline - Date.now()) / 864e5)) : null;
  return (
    <Card><CardLabel right={<span style={{ fontSize: 12, color: T.text.muted }}>◎</span>}>Målutveckling</CardLabel>
      {g ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{g.title}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.accent.secondary }}>{pct}%</div>
          </div>
          <div style={{ height: 7, background: T.bg.muted, borderRadius: 4, overflow: "hidden", margin: "11px 0 7px" }}><div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg,${T.accent.secondary},${T.accent.primary})`, borderRadius: 4 }} /></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: T.text.muted }}><span>{g.current} / {g.target} {g.unit}</span>{days != null && <span>{days} dagar kvar</span>}</div>
        </>
      ) : <div style={{ fontSize: 13, color: T.text.muted }}>Inga mål än.</div>}
    </Card>
  );
}

function DashNutrition({ totals, targets = null, demo = false, suggestion = null, onAcceptSuggestion = null }) {
  const t = totals || { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const g = targets || NUTRITION_GOALS;
  const hasKcal = g.hasKcal !== undefined ? g.hasKcal : g.kcal != null;
  const hasProtein = g.hasProtein !== undefined ? g.hasProtein : g.protein != null;
  if (!demo && !hasKcal && !hasProtein) return (
    <Card><CardLabel right={<span style={{ fontSize: 11, color: T.text.muted }}>Idag</span>}>Kostöversikt</CardLabel>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: T.accent.primary }}>{t.kcal.toLocaleString("sv-SE")}</span>
        <span style={{ fontSize: 12, color: T.text.muted }}>kcal idag</span>
      </div>
      {suggestion ? (
        <>
          <div style={{ fontSize: 12.5, color: T.text.secondary, lineHeight: 1.55 }}>ATLAS föreslår ett startmål utifrån ditt mål och din vikt: <b style={{ color: T.text.primary }}>~{suggestion.kcal.toLocaleString("sv-SE")} kcal</b> och <b style={{ color: T.text.primary }}>{suggestion.protein} g protein</b>. En grov startpunkt — justera fritt.</div>
          {onAcceptSuggestion && <button onClick={onAcceptSuggestion} style={{ ...btn.primary, marginTop: 10, fontSize: 13 }}>Använd förslaget</button>}
        </>
      ) : (
        <div style={{ fontSize: 12.5, color: T.text.secondary, lineHeight: 1.5 }}>Inget personligt mål angivet ännu. Ange kalori-/proteinmål så visas måluppfyllnad och makroringar här.</div>
      )}
    </Card>
  );
  const cal = hasKcal ? Math.min(100, Math.round(t.kcal / g.kcal * 100)) : 0;
  const R = 42, C = 2 * Math.PI * R, off = C * (1 - cal / 100);
  const rows = [["Protein", t.protein, hasProtein ? g.protein : null, T.accent.success], ["Kolhydrater", t.carbs, g.carbs, T.accent.primary], ["Fett", t.fat, g.fat, T.accent.warning]];
  const suggested = g.source === "atlas_suggestion";
  return (
    <Card><CardLabel right={<span style={{ fontSize: 11, color: T.text.muted }}>{suggested ? "ATLAS-förslag · idag" : "Idag"}</span>}>Kostöversikt</CardLabel>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ position: "relative", width: 100, height: 100, flexShrink: 0 }}>
          <svg width="100" height="100" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="50" cy="50" r={R} fill="none" stroke={T.bg.muted} strokeWidth="8" />
            <circle cx="50" cy="50" r={R} fill="none" stroke={T.accent.success} strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off} style={{ transition: "stroke-dashoffset .6s ease" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.accent.primary }}>{t.kcal.toLocaleString("sv-SE")}</div>
            <div style={{ fontSize: 9.5, color: T.text.muted }}>{hasKcal ? `/ ${g.kcal.toLocaleString("sv-SE")} kcal` : "kcal"}</div>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
          {rows.map(([lab, now, goal, col]) => (
            <div key={lab}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}><span style={{ color: T.text.secondary }}>{lab}</span><span style={{ color: T.text.primary, fontWeight: 600 }}>{now} g{goal != null ? ` / ${goal} g` : ""}</span></div>
              <div style={{ height: 5, background: T.bg.muted, borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${goal != null ? Math.min(100, now / goal * 100) : 0}%`, height: "100%", background: col, borderRadius: 3 }} /></div>
            </div>
          ))}
        </div>
      </div>
      {demo && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}><span style={{ color: T.text.secondary }}><Icon name="droplet" size={12} style={{ verticalAlign: "-2px" }} /> Vätska</span><span style={{ color: T.text.primary, fontWeight: 600 }}>2,4 L / 3,0 L</span></div>
          <div style={{ height: 5, background: T.bg.muted, borderRadius: 3, overflow: "hidden" }}><div style={{ width: "80%", height: "100%", background: T.accent.primary, borderRadius: 3 }} /></div>
        </div>
      )}
    </Card>
  );
}

function CycleCard({ cycle, onLogPeriod }) {
  if (!cycle) return null;
  const color = cycle.phase === "menstrual" ? "#E5679B" : cycle.phase === "ovulation" ? T.accent.success : cycle.phase === "luteal" ? "#C9A227" : T.accent.primary;
  const order = ["menstrual", "follicular", "ovulation", "luteal"];
  return (
    <Card>
      <CardLabel>Menscykel</CardLabel>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color }}>{cycle.sv}</div>
        <div style={{ fontSize: 12, color: T.text.muted }}>dag {cycle.day} · ~{cycle.daysToNext} d till nästa</div>
      </div>
      <div style={{ display: "flex", gap: 3, margin: "11px 0" }}>
        {order.map(ph => <div key={ph} style={{ flex: ph === "ovulation" ? 0.4 : 1, height: 6, borderRadius: 3, background: ph === cycle.phase ? color : T.bg.muted, transition: "background .3s" }} />)}
      </div>
      <div style={{ fontSize: 12.5, color: T.text.secondary, lineHeight: 1.55 }}>{cycle.note}</div>
      {cycle.phase === "luteal" && <div style={{ fontSize: 11.5, color: T.text.muted, lineHeight: 1.5, marginTop: 6 }}>Lutealfasen kan öka aptit och energibehov något — det är normalt att vara lite hungrigare nu. Lyssna på kroppen snarare än att jaga en exakt kalorisiffra.</div>}
      <div style={{ fontSize: 10.5, color: T.text.muted, marginTop: 9 }}>Readiness justeras {cycle.readiness >= 0 ? "+" : ""}{cycle.readiness} idag utifrån fasen. Ett generellt mönster — din kropp kan skilja sig, så lita på hur du faktiskt känner dig.</div>
      {onLogPeriod && <button onClick={onLogPeriod} style={{ marginTop: 12, width: "100%", padding: "9px", borderRadius: 10, border: `1px solid ${T.bg.muted}`, background: "transparent", color: "#E5679B", cursor: "pointer", fontSize: 12.5, fontWeight: 700 }}>Mens började idag</button>}
    </Card>
  );
}

export { ReadinessCard, TodaysPlan, TrainingLoadCard, NutritionCard, RecoveryCard, AICoachCard, MilestoneCard, KeyMetrics, MuscleStatusList, RecentSessions, VolumeOverview, SportsCard, ConditioningCard, GoalsMiniCard, DashReadiness, DashCoach, PersonalInsightCard, LaggingCard, BalanceMeter, DashRecommendation, DashRecovery, DashLatest, DashGoal, DashNutrition, DashMission, CycleCard };
