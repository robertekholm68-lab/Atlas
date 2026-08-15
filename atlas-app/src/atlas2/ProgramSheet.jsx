// Askr 2.0 — programväljaren.
//
// Utan den här kan Real Mode inte göra någonting: appen börjar medvetet utan
// program, och då är det första man måste kunna göra att välja ett.

import { useState } from "react";
import { C, hdr, label, btnPrimary, btnGhost, card, volt } from "./design.js";
import { ALL_TEMPLATES, copyProgram } from "../engines/programs.js";

export function ProgramSheet({ aktiv, sessions, setPrograms, setActiveProgramId, nästa, onStarta, onClose }) {
  const [alla, setAlla] = useState(false);
  const mallar = alla ? ALL_TEMPLATES : ALL_TEMPLATES.slice(0, 6);

  const välj = mall => {
    const kopia = copyProgram(mall, { name: mall.name, active: true });
    setPrograms(ps => [...ps.filter(x => x.id !== kopia.id), kopia]);
    setActiveProgramId(kopia.id);
  };

  const vecka = (() => {
    if (!aktiv) return null;
    const första = (sessions || []).filter(s => s && s.programId === aktiv.id)
      .map(s => s.completedAt).filter(Boolean).sort()[0];
    return första ? Math.floor((Date.now() - första) / 6048e5) + 1 : null;
  })();

  return (
    <div>
      <div style={hdr(19)}>Program</div>

      {aktiv ? (
        <div style={{ ...card, marginTop: 14, borderColor: C.lime, background: volt(.05) }}>
          <div style={hdr(16)}>{aktiv.name}</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 5 }}>
            {vecka ? `Vecka ${vecka} · ` : ""}{aktiv.daysPerWeek} pass i veckan · {(aktiv.workouts || []).length} olika pass
          </div>
          <button onClick={onClose} style={{ ...btnPrimary, marginTop: 14 }}>Tillbaka till hem <span style={{ fontSize: 18 }}>→</span></button>

          {/* PROGRAMMETS PASS, alla synliga och valbara.
              Förut stod bara "Nästa: Pass A" och en knapp som startade just det.
              Ett program med två pass visade alltså aldrig det andra — man kunde
              varken se vad som ingick eller köra i en annan ordning än den appen
              räknat fram. Nu står de på tur-märkta först, men alla går att välja:
              appen föreslår, användaren bestämmer. */}
          <div style={{ ...label(), margin: "16px 0 8px" }}>Passen i programmet</div>
          {(aktiv.workouts || []).map((w, i) => {
            const påTur = nästa && nästa.workout && nästa.workout.id === w.id;
            const övningar = (w.exercises || []).length;
            return (
              <button key={w.id || i} onClick={() => onStarta && onStarta(w)}
                data-pass="1" aria-label={`Starta ${w.name}, pass ${i + 1} av ${(aktiv.workouts || []).length}`}
                style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                width: "100%", textAlign: "left", padding: "13px 14px", marginBottom: 8,
                borderRadius: 14, cursor: "pointer", minHeight: 44,
                border: `1px solid ${påTur ? C.lime : C.border}`,
                background: påTur ? volt(.07) : C.card2, color: C.text,
              }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ ...hdr(14), display: "block" }}>{w.name}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: C.muted, marginTop: 3 }}>
                    {/* Passnummer, eftersom flera pass kan ha samma namn. Ett
                        Upper/Lower-program med fyra dagar har två "Överkropp"
                        och två "Underkropp", och utan numret går de inte att
                        skilja åt i listan. */}
                    Pass {i + 1} · {övningar} övning{övningar === 1 ? "" : "ar"}
                    {påTur ? " · står på tur" : ""}
                  </span>
                </span>
                <span style={{ color: påTur ? C.lime : C.muted, fontSize: 18, flexShrink: 0 }}>→</span>
              </button>
            );
          })}

          <button onClick={() => setActiveProgramId(null)} style={{ width: "100%", marginTop: 9, padding: 11, borderRadius: 999, border: "none", background: "transparent", color: C.muted, fontSize: 12.5, cursor: "pointer" }}>
            Sluta följa programmet
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "10px 0 16px" }}>
          Inget program valt. Med ett program vet Askr vad som ska komma härnäst
          — utan ett kan appen bara berätta hur kroppen mår, inte vad du ska göra.
        </div>
      )}

      <div style={{ ...label(), margin: "20px 0 9px" }}>{aktiv ? "Byt program" : "Välj program"}</div>

      {mallar.map(t => (
        <button key={t.id} onClick={() => välj(t)} style={{ width: "100%", textAlign: "left", padding: 15, marginBottom: 9, borderRadius: 15, border: `1px solid ${C.border}`, background: C.card2, color: C.text, cursor: "pointer" }}>
          <div style={hdr(14.5)}>{t.name}</div>
          {t.desc && <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, margin: "5px 0 8px" }}>{t.desc}</div>}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: t.desc ? 0 : 8 }}>
            {[t.level, `${t.daysPerWeek} pass/vecka`, t.sessionDuration ? `${t.sessionDuration} min` : null].filter(Boolean).map(x => (
              <span key={x} style={{ fontSize: 10.5, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 999, padding: "3px 9px" }}>{x}</span>
            ))}
          </div>
        </button>
      ))}

      {!alla && ALL_TEMPLATES.length > 6 && (
        <button onClick={() => setAlla(true)} style={btnGhost}>Visa alla {ALL_TEMPLATES.length} program</button>
      )}
    </div>
  );
}
