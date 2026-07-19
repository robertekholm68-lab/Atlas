// FEATURE: Calendar
import { useState } from "react";
import { Card, CardLabel } from "../../components/common/index.jsx";
import { sessionVolume } from "../../engines/index.js";
import { EditSessionModal } from "../training/index.jsx";
import { T, btn } from "../../data/tokens.js";

// Rad för GPS-spårade utepass: sträcka, tid och tempo räknat ur passets egna siffror.
function gpsLine(s) {
  if (!s || !s.distanceKm || !s.durationMin) return "";
  const pace = s.durationMin / s.distanceKm;
  const paceStr = `${Math.floor(pace)}:${String(Math.round((pace % 1) * 60)).padStart(2, "0")} min/km`;
  return ` · ${s.durationMin} min · ${paceStr}${s.avgHr ? ` · ${s.avgHr} bpm snitt` : ""}${s.steps ? ` · ~${s.steps} steg` : ""}`;
}

function CalendarView({ sessions, setSessions = null, bodyweight, activeProgram = null }) {
  const [offset, setOffset] = useState(0);
  const [selDay, setSelDay] = useState(null);
  const [editing, setEditing] = useState(null);
  const canEdit = typeof setSessions === "function";
  const base = new Date();
  const month = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const y = month.getFullYear(), m = month.getMonth();
  const daysIn = new Date(y, m + 1, 0).getDate();
  const firstW = (new Date(y, m, 1).getDay() + 6) % 7; // Monday-first
  const key = (yy, mm, dd) => `${yy}-${mm}-${dd}`;
  const byDay = {};
  sessions.forEach(s => { const d = new Date(s.completedAt); byDay[key(d.getFullYear(), d.getMonth(), d.getDate())] = (byDay[key(d.getFullYear(), d.getMonth(), d.getDate())] || []).concat(s); });
  const today = new Date();
  const cells = [];
  for (let i = 0; i < firstW; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);
  const monthName = month.toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
  const selKey = selDay ? key(y, m, selDay) : null;
  const selSessions = selKey ? (byDay[selKey] || []) : [];
  const monthSessions = sessions.filter(s => { const d = new Date(s.completedAt); return d.getFullYear() === y && d.getMonth() === m; }).sort((a, b) => b.completedAt - a.completedAt);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }} className="cal-grid">
      <Card>
        {activeProgram && (
          <div style={{ marginBottom: 12, padding: "9px 12px", borderRadius: 10, background: "rgba(77,163,255,0.08)", border: `1px solid ${T.accent.primary}33`, fontSize: 12.5, color: T.text.secondary }}>
            <b style={{ color: T.text.primary }}>{activeProgram.name}</b> · planerade dagar: {(activeProgram.weekdays || []).join(", ") || "—"} · {activeProgram.daysPerWeek} pass/vecka
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <button onClick={() => { setOffset(o => o - 1); setSelDay(null); }} style={btn.icon}>‹</button>
          <span style={{ fontSize: 16, fontWeight: 700, textTransform: "capitalize" }}>{monthName}</span>
          <button onClick={() => { setOffset(o => o + 1); setSelDay(null); }} style={btn.icon}>›</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
          {["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"].map(d => (
            <div key={d} style={{ fontSize: 10, color: T.text.muted, textAlign: "center", padding: "2px 0" }}>{d}</div>
          ))}
          {cells.map((d, i) => {
            if (d == null) return <div key={i} />;
            const has = byDay[key(y, m, d)];
            const isToday = today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
            const sel = selDay === d;
            return (
              <button key={i} onClick={() => setSelDay(sel ? null : d)}
                style={{ aspectRatio: "1", borderRadius: 9, border: isToday ? `1.5px solid ${T.accent.primary}` : "1px solid transparent",
                  background: sel ? T.accent.primary : has ? "rgba(57,217,138,0.14)" : T.bg.raised, cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: 0 }}>
                <span style={{ fontSize: 13, color: sel ? "#fff" : T.text.primary }}>{d}</span>
                {has && <span style={{ width: 5, height: 5, borderRadius: "50%", background: sel ? "#fff" : T.accent.success }} />}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 14, fontSize: 11, color: T.text.muted }}>
          <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: T.accent.success, marginRight: 5 }} />Genomfört pass</span>
          <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 3, border: `1.5px solid ${T.accent.primary}`, marginRight: 5 }} />Idag</span>
        </div>
      </Card>

      <Card>
        <CardLabel>{selDay ? `${selDay} ${month.toLocaleDateString("sv-SE", { month: "long" })}` : `Pass i ${monthName}`}</CardLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {(selDay ? selSessions : monthSessions).length === 0 &&
            <div style={{ fontSize: 13, color: T.text.muted, padding: 10, textAlign: "center" }}>{selDay ? "Inget pass denna dag." : "Inga pass denna månad."}</div>}
          {(selDay ? selSessions : monthSessions).map(s => (
            <div key={s.id} onClick={canEdit ? () => setEditing(s) : undefined} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 11px", background: T.bg.raised, borderRadius: 8, cursor: canEdit ? "pointer" : "default" }}>
              <div><div style={{ fontSize: 13.5, color: T.text.primary }}>{s.title}</div>
                <div style={{ fontSize: 11, color: T.text.muted }}>{new Date(s.completedAt).toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short" })}{s.sets && s.sets.length ? ` · ${s.sets.length} set` : ""}{gpsLine(s)}{canEdit ? " · redigera" : ""}</div></div>
              <span style={{ fontSize: 12, color: T.accent.primary }}>{s.distanceKm ? `${s.distanceKm.toFixed(2)} km` : Math.round(sessionVolume(s))}</span>
            </div>
          ))}
        </div>
      </Card>
      <style>{`@media (max-width: 820px){ .cal-grid{ grid-template-columns: 1fr !important; } }`}</style>
      {editing && canEdit && (
        <EditSessionModal
          session={editing}
          bodyweight={bodyweight}
          onSave={updated => { setSessions(ss => ss.map(x => x.id === updated.id ? updated : x)); setEditing(null); }}
          onDelete={id => { setSessions(ss => ss.filter(x => x.id !== id)); setEditing(null); }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

export { CalendarView };
