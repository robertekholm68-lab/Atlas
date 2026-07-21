// Askr 2.0 — muskeldetalj.
//
// Klick på kartan → vad vet appen om just den här muskeln?
//
// Allt härlett ur loggade pass. Saknas underlag säger vyn det rakt ut i stället
// för att visa nollor som ser ut som mätvärden.

import { C, HFONT, hdr, label, card, statRow, statCell, statusColor, orDash, DASH } from "./design.js";
import { REGION_MAP, REGIONNAMN } from "./BodyMap2.jsx";
import { bodyState, sessionVolume } from "./store.js";
import { MUSCLES } from "../data/muscles.js";
import { EXERCISES } from "../data/exercises.js";

const STATUSTEXT = {
  ready: "Redo att träna",
  nearly_ready: "Nästan redo",
  recovering: "Återhämtar sig",
  critical: "Överbelastad",
  undertrained: "Behöver träning",
  no_data: "Ingen data",
};

const DAG = 864e5;

/**
 * Motorn räknar dagar som decimaltal (1.0000484… dygn). Att skriva ut det rått
 * är obegripligt för en människa — här avrundas det till hur man faktiskt
 * pratar.
 */
function sedanText(dagar) {
  const d = Math.floor(dagar);
  if (d <= 0) return "belastad idag";
  if (d === 1) return "belastad igår";
  return `belastad för ${d} dagar sedan`;
}

export function MuscleSheet({ regionId, sessions = [], onClose }) {
  const ids = REGION_MAP[regionId] || [regionId];
  const { states } = bodyState(sessions);
  const nu = Date.now();

  // Pass som faktiskt belastat någon av regionens muskler.
  const relevanta = sessions
    .filter(s => s && s.completedAt && s.muscleLoads &&
      ids.some(id => ((s.muscleLoads || {})[id] || 0) > 0))
    .sort((a, b) => b.completedAt - a.completedAt);

  const delar = ids.map(id => ({
    id,
    namn: (MUSCLES[id] && MUSCLES[id].name) || id,
    st: states[id],
  }));

  const medData = delar.filter(d => d.st && d.st.status !== "no_data" && d.st.readiness != null);

  // Vanligaste övningarna för regionen, ur historiken.
  const räkning = {};
  relevanta.forEach(s => (s.sets || []).forEach(st => {
    if (!st.exerciseId) return;
    räkning[st.exerciseId] = (räkning[st.exerciseId] || 0) + 1;
  }));
  const övningar = Object.entries(räkning).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id, n]) => ({ namn: (EXERCISES.find(e => e.id === id) || {}).name || id, set: n }));

  // Veckans belastning per muskel, senaste fyra veckorna.
  const veckor = [];
  for (let v = 3; v >= 0; v--) {
    const till = nu - v * 7 * DAG, från = till - 7 * DAG;
    const last = sessions
      .filter(s => s && s.completedAt >= från && s.completedAt < till && s.muscleLoads)
      .reduce((a, s) => a + ids.reduce((b, id) => b + ((s.muscleLoads || {})[id] || 0), 0), 0);
    veckor.push(Math.round(last));
  }
  const maxLast = Math.max(...veckor, 1);

  const senaste = relevanta[0];
  const dagarSen = senaste ? Math.floor((nu - senaste.completedAt) / DAG) : null;

  return (
    <div>
      <div style={hdr(20)}>{REGIONNAMN[regionId] || regionId}</div>
      {ids.length > 1 && (
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 5, lineHeight: 1.5 }}>
          {ids.length} muskler i taxonomin delar den här formen på kartan.
        </div>
      )}

      {medData.length === 0 ? (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ fontSize: 13.5, color: C.text2, lineHeight: 1.65 }}>
            Inget loggat pass har belastat den här muskeln. Appen kan därför inte
            säga något om dess återhämtning — och gissar inte.
          </div>
        </div>
      ) : (
        <>
          {/* Varje delmuskel för sig. Ett medelvärde hade dolt att en av dem
              kan vara sliten medan de andra är utvilade. */}
          {delar.map(d => {
            const s = d.st;
            const harData = s && s.status !== "no_data" && s.readiness != null;
            const färg = harData ? statusColor(s.status) : C.nodata;
            return (
              <div key={d.id} style={{ ...card, marginTop: 11, borderLeft: `3px solid ${färg}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>{d.namn}</span>
                  <span style={{ ...hdr(19, färg) }}>{harData ? `${Math.round(s.readiness)}%` : DASH}</span>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  {harData ? STATUSTEXT[s.status] : "Inget underlag"}
                  {harData && s.daysSince != null ? ` · ${sedanText(s.daysSince)}` : ""}
                </div>
                {harData && (
                  <div style={{ height: 5, borderRadius: 3, background: C.border, marginTop: 9, overflow: "hidden" }}>
                    <div style={{ width: `${Math.max(2, Math.min(100, s.readiness))}%`, height: "100%", background: färg }} />
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ ...statRow, marginTop: 18 }}>
            {[["Pass totalt", relevanta.length],
              ["Senast", dagarSen === null ? DASH : dagarSen === 0 ? "Idag" : dagarSen === 1 ? "Igår" : `${dagarSen} dgr`],
              ["Denna vecka", veckor[veckor.length - 1] || 0]].map(([l, v], i) => (
              <div key={l} style={statCell(i)}>
                <div style={label()}>{l}</div>
                <div style={{ ...hdr(19), marginTop: 4 }}>{v}</div>
              </div>
            ))}
          </div>

          {relevanta.length >= 2 && (
            <>
              <div style={{ ...label(), margin: "22px 0 8px" }}>Belastning per vecka</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 74 }}>
                {veckor.map((v, i) => (
                  <div key={i} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ height: Math.max(3, (v / maxLast) * 58), background: i === veckor.length - 1 ? C.lime : C.border, borderRadius: 3 }} />
                    <div style={{ fontSize: 9.5, color: C.muted, marginTop: 5 }}>{i === veckor.length - 1 ? "Nu" : `-${veckor.length - 1 - i}v`}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {övningar.length > 0 && (
            <>
              <div style={{ ...label(), margin: "22px 0 4px" }}>Vanligaste övningarna</div>
              {övningar.map(ö => (
                <div key={ö.namn} style={{ display: "flex", justifyContent: "space-between", padding: "11px 2px", borderBottom: `1px solid ${C.border}`, fontSize: 13.5 }}>
                  <span>{ö.namn}</span>
                  <span style={{ color: C.muted, fontSize: 12.5 }}>{ö.set} set</span>
                </div>
              ))}
            </>
          )}

          {senaste && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 18, lineHeight: 1.55 }}>
              Senaste passet som belastade muskeln: {senaste.title || "Pass"},{" "}
              {new Date(senaste.completedAt).toLocaleDateString("sv-SE", { day: "numeric", month: "long" })}
              {sessionVolume(senaste) > 0 ? ` · ${Math.round(sessionVolume(senaste))} kg total volym` : ""}.
            </div>
          )}
        </>
      )}
    </div>
  );
}
