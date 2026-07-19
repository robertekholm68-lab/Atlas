// FEATURE: Progress
import { useState } from "react";
import { Card, CardLabel } from "../../components/common/index.jsx";
import { best1RM, sessionVolume, strengthLevel, currentWeight, workoutStreak, metricSeries, epley1RM, roundInc, milestones } from "../../engines/index.js";
import { BodyFatCalculator } from "../profile/index.jsx";
import { BODYWEIGHT } from "../../data/exercises.js";
import { MUSCLES } from "../../data/muscles.js";
import { T, input, now } from "../../data/tokens.js";

function StatTile({ label, value, sub, color }) {
  return (
    <Card pad={14}>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || T.text.primary }}>{value}</div>
      <div style={{ fontSize: 12.5, color: T.text.secondary, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: T.text.muted, marginTop: 1 }}>{sub}</div>}
    </Card>
  );
}

// ── 1RM-kalkylator (Epleys formel) — uppskatta max från ett vanligt set, utan att maxa ──
function OneRepMaxCalculator() {
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const r = Math.round(+reps), w = +weight;
  const valid = reps !== "" && weight !== "" && r >= 1 && r <= 30 && w > 0;
  const rm = valid ? epley1RM(w, r) : null;
  const targets = [1, 3, 5, 8, 10, 12];
  const numIn = { ...input, width: 96, padding: "8px 10px" };
  return (
    <Card>
      <CardLabel right={<span style={{ fontSize: 11, color: T.text.muted }}>Epleys formel</span>}>1RM-kalkylator</CardLabel>
      <div style={{ fontSize: 12, color: T.text.muted, margin: "2px 0 10px", lineHeight: 1.45 }}>Uppskatta din maxstyrka från ett set du redan gjort — så kan du följa framsteg utan att behöva maxa.</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ fontSize: 11, color: T.text.muted }}>Reps<br />
          <input type="number" inputMode="numeric" min="1" max="30" value={reps} placeholder="5" onChange={e => setReps(e.target.value)} style={numIn} /></label>
        <label style={{ fontSize: 11, color: T.text.muted }}>Vikt (kg)<br />
          <input type="number" inputMode="decimal" min="0" value={weight} placeholder="80" onChange={e => setWeight(e.target.value)} style={numIn} /></label>
      </div>
      {rm ? (
        <div style={{ marginTop: 12, border: `1px solid ${T.bg.muted}`, borderRadius: 10, padding: "11px 13px", background: T.bg.raised }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: T.accent.primary }}>{rm} kg</span>
            <span style={{ fontSize: 12, color: T.text.muted }}>uppskattat 1RM · {r} × {w} kg</span>
          </div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, color: T.text.muted, textTransform: "uppercase", margin: "12px 0 7px" }}>Arbetsvikter (uppskattat)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {targets.map(t => (
              <div key={t} style={{ background: T.bg.surface, border: `1px solid ${T.bg.muted}`, borderRadius: 8, padding: "6px 10px", textAlign: "center", minWidth: 56 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text.primary }}>{roundInc(rm / (1 + t / 30))}</div>
                <div style={{ fontSize: 10.5, color: T.text.muted }}>{t} rep</div>
              </div>
            ))}
          </div>
        </div>
      ) : <div style={{ marginTop: 12, fontSize: 12.5, color: T.text.muted }}>Fyll i reps och vikt så uppskattas ditt 1RM direkt.</div>}
      <div style={{ fontSize: 11, color: T.text.muted, marginTop: 10, lineHeight: 1.45 }}>Ett riktvärde, inte en sanning. Träffar bäst på tunga baslyft (knäböj, bänk, mark, press) upp till ~10–15 reps. Mindre exakt på isolationsövningar, högrepsträning och greppberoende lyft — och varierar mellan individer. Använd den helst för att följa samma övning över tid.</div>
    </Card>
  );
}

function OutdoorCard({ sessions }) {
  const now = Date.now();
  const gps = (sessions || []).filter(s => s.distanceKm > 0 && now - s.completedAt < 30 * 864e5);
  if (!gps.length) return null;                       // inga utepass → inget kort, inga nollor
  const km = gps.reduce((a, s) => a + s.distanceKm, 0);
  const min = gps.reduce((a, s) => a + (s.durationMin || 0), 0);
  const longest = gps.slice().sort((a, b) => b.distanceKm - a.distanceKm)[0];
  const steps = gps.reduce((a, s) => a + (s.steps || 0), 0);
  const pace = km > 0 && min > 0 ? min / km : null;
  const hrSessions = gps.filter(s => s.avgHr > 0);
  const Tile = ({ label, value, color }) => (
    <div style={{ flex: 1, minWidth: 84 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: color || T.text.primary }}>{value}</div>
      <div style={{ fontSize: 10.5, color: T.text.muted, marginTop: 2 }}>{label}</div>
    </div>
  );
  return (
    <Card>
      <CardLabel right={<span style={{ fontSize: 11, color: T.text.muted }}>senaste 30 dagarna</span>}>Utepass · GPS</CardLabel>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
        <Tile label="Distans" value={`${km.toFixed(1)} km`} color={T.accent.primary} />
        <Tile label="Tid" value={`${Math.round(min)} min`} />
        <Tile label="Snittempo" value={pace ? `${Math.floor(pace)}:${String(Math.round((pace % 1) * 60)).padStart(2, "0")}` : "—"} color={T.accent.success} />
        <Tile label="Pass" value={gps.length} />
        {hrSessions.length > 0 && <Tile label="Snittpuls" value={`${Math.round(hrSessions.reduce((a, s) => a + s.avgHr, 0) / hrSessions.length)}`} color={T.accent.danger} />}
      </div>
      <div style={{ fontSize: 11.5, color: T.text.secondary, lineHeight: 1.55, paddingTop: 9, borderTop: `1px solid ${T.bg.raised}` }}>
        Längst: {longest.title} · {longest.distanceKm.toFixed(2)} km{longest.durationMin ? ` på ${longest.durationMin} min` : ""}.
        {steps > 0 ? ` Cirka ${steps.toLocaleString("sv-SE")} steg räknade under passen.` : ""}
      </div>
    </Card>
  );
}

function MilestonesCard({ sessions }) {
  const ms = milestones(sessions);
  return (
    <Card>
      <CardLabel right={<span style={{ fontSize: 11, color: T.text.muted }}>{ms.earned}/{ms.total}</span>}>Milstolpar</CardLabel>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
        {ms.list.map(m => (
          <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, width: 68 }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, background: m.reached ? `linear-gradient(135deg, ${T.accent.primary}, ${T.accent.secondary})` : "transparent", border: m.reached ? "none" : `1.5px dashed ${T.bg.muted}`, color: m.reached ? "#fff" : T.text.muted, boxShadow: m.reached ? `0 3px 10px -3px ${T.accent.primary}88` : "none" }}>{m.reached ? "★" : m.target}</div>
            <div style={{ fontSize: 10.5, color: m.reached ? T.text.secondary : T.text.muted, textAlign: "center", lineHeight: 1.3 }}>{m.label}</div>
          </div>
        ))}
      </div>
      {ms.next ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: T.text.muted, marginBottom: 4 }}><span>Nästa: {ms.next.label}</span><span>{ms.next.current}/{ms.next.target} pass</span></div>
          <div style={{ height: 6, borderRadius: 3, background: T.bg.raised, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.round(ms.next.current / ms.next.target * 100)}%`, background: T.accent.primary, borderRadius: 3 }} /></div>
        </div>
      ) : (
        <div style={{ marginTop: 12, fontSize: 11.5, color: T.accent.success }}>Alla milstolpar upplåsta — starkt jobbat.</div>
      )}
    </Card>
  );
}

function ProgressView({ sessions, overallReadiness, profile, measurements, setMeasurements = null, setProfile = null }) {
  const bodyW = currentWeight(profile, measurements);
  const now = Date.now();
  const weekly = sessions.filter(s => now - s.completedAt < 7 * 864e5).length;
  // last 6 weeks volume
  const weeks = [];
  for (let w = 5; w >= 0; w--) {
    const start = now - (w + 1) * 7 * 864e5, end = now - w * 7 * 864e5;
    const vol = sessions.filter(s => s.completedAt >= start && s.completedAt < end).reduce((a, s) => a + sessionVolume(s), 0);
    weeks.push(Math.round(vol));
  }
  const maxW = Math.max(1, ...weeks) * 1.1, cw = 340, ch = 110, bw = cw / weeks.length;
  // group distribution
  const byGroup = {};
  sessions.forEach(s => Object.entries(s.muscleLoads || {}).forEach(([id, v]) => {
    const grp = MUSCLES[id] ? MUSCLES[id].group : "övrigt"; byGroup[grp] = (byGroup[grp] || 0) + v;
  }));
  const groups = Object.entries(byGroup).sort((a, b) => b[1] - a[1]);
  const maxG = Math.max(1, ...groups.map(g => g[1]));
  const recent = [...sessions].sort((a, b) => b.completedAt - a.completedAt).slice(0, 6);

  if (sessions.length === 0 && (!measurements || measurements.length === 0)) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 760 }}>
      <div style={{ background: T.bg.surface, border: `1px solid ${T.bg.muted}`, borderRadius: 16, padding: "22px 20px" }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: T.text.primary, marginBottom: 8 }}>Inga mätvärden ännu</div>
        <div style={{ fontSize: 13.5, color: T.text.secondary, lineHeight: 1.6 }}>Lägg till ett startvärde för att börja följa din utveckling. När du loggat pass och mätvärden visas dina trender här — inga påhittade datapunkter innan dess.</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <StatTile label="Pass totalt" value={sessions.length} />
        <StatTile label="Denna vecka" value={weekly} color={T.accent.primary} />
        <StatTile label="Streak" value={sessions.length ? `${workoutStreak(sessions, now)} d` : "—"} color={sessions.length ? T.accent.success : T.text.muted} />
        <StatTile label="Readiness (nu)" value={overallReadiness == null ? "—" : `${overallReadiness}%`} color={overallReadiness == null ? T.text.muted : overallReadiness >= 70 ? T.accent.success : T.accent.warning} />
      </div>

      <OutdoorCard sessions={sessions} />
      {sessions.length > 0 && <MilestonesCard sessions={sessions} />}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="prog-grid">
        <Card>
          <CardLabel right={<span style={{ fontSize: 11, color: T.text.muted }}>6 veckor</span>}>Träningsvolym</CardLabel>
          <svg width="100%" viewBox={`0 0 ${cw} ${ch + 20}`}>
            {weeks.map((v, i) => {
              const bh = v / maxW * ch, cur = i === weeks.length - 1;
              return <g key={i}>
                <rect x={i * bw + bw * 0.22} y={ch - bh} width={bw * 0.56} height={bh} rx="3" fill={cur ? T.accent.primary : T.bg.muted} />
                <text x={i * bw + bw / 2} y={ch + 14} fontSize="9" fill={T.text.muted} textAnchor="middle">{i === weeks.length - 1 ? "nu" : `-${weeks.length - 1 - i}v`}</text>
              </g>;
            })}
          </svg>
        </Card>

        <Card>
          <CardLabel>Volym per muskelgrupp</CardLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {groups.length === 0 && <div style={{ fontSize: 13, color: T.text.muted }}>Ingen data än.</div>}
            {groups.map(([grp, v]) => (
              <div key={grp}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: T.text.secondary, textTransform: "capitalize" }}>{grp}</span>
                  <span style={{ color: T.text.muted }}>{Math.round(v)}</span>
                </div>
                <div style={{ height: 6, background: T.bg.muted, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${v / maxG * 100}%`, height: "100%", background: T.accent.secondary, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardLabel right={<span style={{ fontSize: 11, color: T.text.muted }}>skattat 1RM</span>}>Styrka</CardLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {[["squat", "Knäböj"], ["bench_press", "Bänkpress"], ["deadlift", "Marklyft"], ["ohp", "Axelpress"]].map(([id, name]) => {
            const rm = best1RM(sessions, id), lvl = strengthLevel(id, rm, bodyW);
            return (
              <div key={id} style={{ background: T.bg.raised, borderRadius: 10, padding: "11px 12px" }}>
                <div style={{ fontSize: 12, color: T.text.secondary }}>{name}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: T.text.primary, marginTop: 2 }}>{rm ? `${rm}` : "–"}<span style={{ fontSize: 12, color: T.text.muted, fontWeight: 400 }}>{rm ? " kg" : ""}</span></div>
                {lvl && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: lvl.col, border: `1px solid ${lvl.col}`, borderRadius: 10, padding: "2px 8px", display: "inline-block", marginTop: 5 }}>{lvl.level} · {lvl.ratio.toFixed(2)}× kv</span>}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: T.text.muted, marginTop: 8 }}>Skattat via Epley (vikt × reps) från dina loggade set. Nivå relativt kroppsvikt ({BODYWEIGHT} kg).</div>
      </Card>

      <OneRepMaxCalculator />

      <Card>
        <CardLabel>Senaste pass</CardLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {recent.map(s => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 11px", background: T.bg.raised, borderRadius: 8 }}>
              <div><div style={{ fontSize: 13.5, color: T.text.primary }}>{s.title}</div>
                <div style={{ fontSize: 11, color: T.text.muted }}>{new Date(s.completedAt).toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short" })}</div></div>
              <span style={{ fontSize: 12, color: T.accent.primary }}>{Math.round(sessionVolume(s))} belastning</span>
            </div>
          ))}
        </div>
      </Card>

      {/* kroppssammansättning: kalkylator + fettprocent-trend */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="prog-grid">
        {setMeasurements && <BodyFatCalculator profile={profile} setProfile={setProfile} measurements={measurements} setMeasurements={setMeasurements} />}
        <Card>
          <CardLabel>Kroppsfett-trend</CardLabel>
          {(() => {
            const bf = metricSeries(measurements, "bodyFat");
            if (bf.length < 2) return <div style={{ fontSize: 12.5, color: T.text.muted, padding: "6px 0" }}>Spara minst två mätningar i kalkylatorn för att se din trend — förändringen över tid är metodens styrka.</div>;
            const vals = bf.map(x => x.value); const mx = Math.max(...vals) + 1, mn = Math.min(...vals) - 1;
            return (<>
              <svg width="100%" viewBox="0 0 300 80" style={{ overflow: "visible" }}>
                <polyline fill="none" stroke={T.accent.secondary} strokeWidth="2" points={vals.map((v, i) => `${i / (vals.length - 1) * 300},${78 - (v - mn) / (mx - mn) * 70}`).join(" ")} />
                {vals.map((v, i) => <circle key={i} cx={i / (vals.length - 1) * 300} cy={78 - (v - mn) / (mx - mn) * 70} r="3" fill={T.accent.secondary} />)}
              </svg>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.text.muted, marginTop: 4 }}>
                <span>{vals[0]}% ({new Date(bf[0].date).toLocaleDateString("sv-SE", { month: "short", year: "2-digit" })})</span>
                <span style={{ color: T.text.primary, fontWeight: 600 }}>{vals[vals.length - 1]}% nu</span>
              </div>
            </>);
          })()}
        </Card>
      </div>
      <style>{`@media (max-width: 820px){ .prog-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

export { StatTile, ProgressView, OneRepMaxCalculator };
