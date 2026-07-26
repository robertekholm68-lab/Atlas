// Askr 2.0 — framsteg.
//
// Veckovolym, nyckeltal, starkaste lyft, vikt. Allt härlett ur loggade pass.
//
// REGEL SOM GÅR IGEN: en kurva ritas först vid tre mätpunkter. Två punkter är
// brus, inte utveckling, och en linje mellan dem påstår en riktning som inte
// finns. Under tröskeln visas en tom ram som säger hur mycket som saknas.

import { useState } from "react";
import { C, HFONT, hdr, label, card, statRow, statCell, orDash, DASH } from "./design.js";
import { coachFacts } from "./facts.js";
import { weekSessions, sessionVolume } from "./store.js";
import { EXERCISES } from "../data/exercises.js";

const VECKA = 6048e5;
const TRÖSKEL = 3;

// Hur många pass som listas innan "visa fler". Historiken ska gå att bläddra,
// men vyn ska inte bli en oändlig logg — de senaste veckorna är det man rättar.
const LISTA_STEG = 8;

export function ProgressView({ sessions = [], weights = [], activeProgram, onOpenSession }) {
  const now = Date.now();
  const done = sessions.filter(s => s && s.completedAt);
  const facts = coachFacts({ sessions, activeProgram, weights }, now);

  // Åtta veckor bakåt, äldst först.
  const veckor = [];
  for (let v = 7; v >= 0; v--) {
    const till = now - v * VECKA, från = till - VECKA;
    const pass = done.filter(s => s.completedAt >= från && s.completedAt < till);
    veckor.push({ ton: pass.reduce((a, s) => a + sessionVolume(s), 0) / 1000, pass: pass.length });
  }
  const maxTon = Math.max(...veckor.map(v => v.ton), 0.1);
  const nog = done.length >= TRÖSKEL;

  // Starkaste lyft: bästa vikt per övning + förändring mot första noteringen.
  const per = {};
  done.forEach(s => (s.sets || []).forEach(st => {
    if (!st.exerciseId || !st.weight) return;
    const o = per[st.exerciseId] || (per[st.exerciseId] = { max: 0, först: null, ts: Infinity });
    if (st.weight > o.max) o.max = st.weight;
    if (s.completedAt < o.ts) { o.ts = s.completedAt; o.först = st.weight; }
  }));
  const lyft = Object.entries(per)
    .map(([id, o]) => ({ namn: (EXERCISES.find(e => e.id === id) || {}).name || id, max: o.max, diff: o.max - (o.först || o.max) }))
    .sort((a, b) => b.max - a.max).slice(0, 5);

  const vikt = weights.slice().sort((a, b) => a.ts - b.ts);
  const fmt = ts => new Date(ts).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });

  // Loggade pass, senaste först. Vägen in till att rätta eller ta bort ett pass
  // — utan den vore en felknappad vikt permanent, och hela readiness-kedjan
  // ovanför skulle bygga på en siffra användaren vet är fel.
  const [antalVisade, setAntalVisade] = useState(LISTA_STEG);
  const historik = done.slice().sort((a, b) => b.completedAt - a.completedAt);
  const visade = historik.slice(0, antalVisade);

  return (
    <div style={{ padding: "16px 18px 72px" }}>
      <div style={{ textAlign: "center", ...hdr(20) }}>Framsteg</div>

      <div style={{ ...statRow, marginTop: 18 }}>
        {[["Pass totalt", done.length || DASH],
          ["Denna vecka", done.length ? weekSessions(done, now).length : DASH],
          ["Readiness", orDash(facts.kropp.readiness)]].map(([l, v], i) => (
          <div key={l} style={statCell(i)}>
            <div style={label()}>{l}</div>
            <div style={{ ...hdr(21), marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ ...label(), marginTop: 22, marginBottom: 9 }}>Volym per vecka</div>
      {nog ? (
        <>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 118, borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>
            {veckor.map((v, i) => (
              <div key={i} style={{ flex: 1, height: Math.max(2, (v.ton / maxTon) * 100),
                background: i === veckor.length - 1 ? C.lime : C.border, borderRadius: 3,
                opacity: v.ton ? 1 : 0.35 }} title={`${v.ton.toFixed(1)} ton · ${v.pass} pass`} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: C.muted, marginTop: 6 }}>
            <span>8 veckor sedan</span><span>Denna vecka</span>
          </div>
        </>
      ) : (
        <div style={{ height: 118, border: `1px dashed ${C.border}`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 18 }}>
          <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55 }}>
            En utveckling behöver minst {TRÖSKEL} loggade pass.<br />
            Du har {done.length}. {TRÖSKEL - done.length} kvar.
          </div>
        </div>
      )}

      {lyft.length > 0 && (
        <>
          <div style={{ ...label(), marginTop: 24, marginBottom: 4 }}>Starkaste lyft</div>
          {lyft.map(l => (
            <div key={l.namn} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "12px 2px", borderBottom: `1px solid ${C.border}`, fontSize: 13.5 }}>
              <span>{l.namn}</span>
              <span style={{ display: "flex", gap: 11, alignItems: "baseline" }}>
                <span style={{ fontWeight: 700 }}>{l.max} kg</span>
                {l.diff > 0 && <span style={{ fontSize: 12, color: C.ready }}>+{l.diff}</span>}
              </span>
            </div>
          ))}
        </>
      )}

      {visade.length > 0 && (
        <>
          <div style={{ ...label(), marginTop: 24, marginBottom: 4 }}>Loggade pass</div>
          {visade.map(s => {
            const volym = Math.round(sessionVolume(s));
            const antalSet = (s.sets || []).length;
            const rad = (
              <>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title || "Pass"}</div>
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3 }}>
                    {fmt(s.completedAt)} · {antalSet} set{volym > 0 ? ` · ${volym} kg` : ""}
                  </div>
                </div>
                {onOpenSession && <span style={{ color: C.muted, fontSize: 19, flexShrink: 0 }}>›</span>}
              </>
            );
            const stil = {
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
              width: "100%", textAlign: "left", padding: "12px 2px",
              borderBottom: `1px solid ${C.hairline}`, background: "none", border: "none",
              borderBottomStyle: "solid", color: C.text,
            };
            return onOpenSession ? (
              <button key={s.id} onClick={() => onOpenSession(s.id)}
                style={{ ...stil, cursor: "pointer", borderBottom: `1px solid ${C.hairline}` }}>{rad}</button>
            ) : (
              <div key={s.id} style={stil}>{rad}</div>
            );
          })}
          {historik.length > antalVisade && (
            <button onClick={() => setAntalVisade(n => n + LISTA_STEG)}
              style={{ background: "none", border: "none", color: C.text2, fontFamily: HFONT, fontSize: 12,
                textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer", padding: "14px 2px", minHeight: 44 }}>
              Visa fler ({historik.length - antalVisade} kvar)
            </button>
          )}
        </>
      )}

      {vikt.length > 0 && (
        <div style={{ ...card, marginTop: 22 }}>
          <div style={label()}>Kroppsvikt</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 6 }}>
            <span style={hdr(26)}>{vikt[vikt.length - 1].kg} kg</span>
            {facts.vikt.förändring !== null && facts.vikt.förändring !== 0 && (
              <span style={{ fontSize: 13, color: facts.vikt.förändring < 0 ? C.ready : C.muted }}>
                {facts.vikt.förändring > 0 ? "+" : ""}{facts.vikt.förändring} kg sedan {fmt(vikt[0].ts)}
              </span>
            )}
          </div>
          {vikt.length < 3 && (
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>
              {vikt.length === 1 ? "En mätning — ingen trend än." : "Två mätningar är för lite för en trend."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
