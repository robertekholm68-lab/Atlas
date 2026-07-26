// Askr 2.0 — dagens tillskott.
//
// Kryssrutor, inte alarm. Kunskapsbanken säger att kreatin fylls av det dagliga
// intaget över tid, inte av när på dygnet det tas — så det appen kan hjälpa med
// är följsamhet, inte klockslag.
//
// Vad som INTE finns här, med flit: inga poäng, inga nivåer, inga märken.
// Guiden säger uttryckligen nej till gamification, och en följsamhetssiffra som
// börjar firas blir snabbt något att jaga i stället för något att läsa. Streaken
// visas som ren information och kommenteras inte.

import { useState } from "react";
import { C, HFONT, MONO, hdr, label, card, btnGhost, volt } from "./design.js";
import { SUPPLEMENTS } from "../data/supplements.js";
import { takenToday, toggleToday, streak, adherence } from "../engines/supplements.js";

const KATEGORIER = ["Prestation", "Hälsa", "Återhämtning", "Övrigt"];

function Bock({ på }) {
  return (
    <span aria-hidden style={{
      width: 22, height: 22, borderRadius: 7, flexShrink: 0, display: "grid", placeItems: "center",
      border: `1px solid ${på ? C.lime : C.border}`, background: på ? C.lime : "transparent",
      color: C.bg, fontSize: 14, fontWeight: 700, lineHeight: 1,
    }}>{på ? "✓" : ""}</span>
  );
}

/**
 * @param mina    profile.supplements — id:n användaren tar
 * @param logg    dagliga bockar [{ id, ts }]
 * @param onBocka (id) => void
 * @param onÄndra (id) => void — lägg till/ta bort ur "mina"
 */
export function SupplementsPanel({ mina = [], logg = [], onBocka, onÄndra, kompakt = false }) {
  const [väljer, setVäljer] = useState(false);
  const valda = SUPPLEMENTS.filter(s => mina.includes(s.id));

  if (!valda.length && !väljer) {
    return (
      <div style={{ ...card }}>
        <div style={label(C.lime)}>Dagens tillskott</div>
        <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, marginTop: 8 }}>
          Lägg till det du faktiskt tar, så håller jag räkningen. Det handlar om
          att det blir taget — inte när på dagen.
        </div>
        <button onClick={() => setVäljer(true)} style={{ ...btnGhost, marginTop: 12 }}>Välj tillskott</button>
      </div>
    );
  }

  if (väljer) {
    return (
      <div style={{ ...card }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={label(C.lime)}>Välj tillskott</div>
          <button onClick={() => setVäljer(false)} style={{
            background: "none", border: "none", cursor: "pointer", minHeight: 44, padding: "0 2px",
            fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted,
          }}>Klar</button>
        </div>
        {KATEGORIER.map(kat => {
          const rader = SUPPLEMENTS.filter(s => s.cat === kat);
          if (!rader.length) return null;
          return (
            <div key={kat} style={{ marginTop: 14 }}>
              <div style={{ ...label(), color: C.muted }}>{kat}</div>
              {rader.map(s => {
                const på = mina.includes(s.id);
                return (
                  <button key={s.id} onClick={() => onÄndra(s.id)} style={{
                    display: "flex", alignItems: "flex-start", gap: 11, width: "100%", textAlign: "left",
                    padding: "10px 2px", minHeight: 44, cursor: "pointer", background: "none",
                    border: "none", borderBottom: `1px solid ${C.hairline}`, color: C.text,
                  }}>
                    <Bock på={på} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13.5 }}>{s.name}</span>
                      <span style={{ display: "block", fontFamily: MONO, fontSize: 10.5, color: C.muted, marginTop: 2 }}>
                        {s.dose} · evidens {s.evidence}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  const kvar = valda.filter(s => !takenToday(logg, s.id)).length;

  return (
    <div style={{ ...card }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={label(C.lime)}>Dagens tillskott</div>
        <button onClick={() => setVäljer(true)} style={{
          background: "none", border: "none", cursor: "pointer", minHeight: 44, padding: "0 2px",
          fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted,
        }}>Ändra</button>
      </div>

      <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
        {kvar === 0 ? "Allt taget idag." : `${kvar} kvar idag.`}
      </div>

      <div style={{ marginTop: 10 }}>
        {valda.map(s => {
          const på = takenToday(logg, s.id);
          const r = streak(logg, s.id);
          const f = adherence(logg, s.id, 7);
          return (
            <button key={s.id} onClick={() => onBocka(s.id)}
              aria-label={`${s.name} — ${på ? "taget idag" : "inte taget idag"}`}
              style={{
                display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: "left",
                padding: "11px 2px", minHeight: 44, cursor: "pointer", background: "none",
                border: "none", borderBottom: `1px solid ${C.hairline}`, color: C.text,
              }}>
              <Bock på={på} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13.5, color: på ? C.text2 : C.text }}>{s.name}</span>
                {!kompakt && (
                  <span style={{ display: "block", fontFamily: MONO, fontSize: 10.5, color: C.muted, marginTop: 2 }}>
                    {s.dose}
                  </span>
                )}
              </span>
              {/* Ren information, ingen belöning. Visas först när det finns ett
                  mönster att läsa — en etta är ingen vana. */}
              {f.taken >= 2 && (
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.muted, whiteSpace: "nowrap" }}>
                  {r >= 2 ? `${r} dgr i rad` : `${f.taken}/${f.days} dgr`}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
