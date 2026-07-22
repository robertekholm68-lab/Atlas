// Askr 2.0 — fråga coachen.
//
// Namnet är inte en ordvits här: appen heter Askr för att den frågar kroppen,
// och det här är stället där du frågar tillbaka.
//
// INGEN NY COACHLOGIK. `coachReply` finns sedan tidigare, är testad, känner
// igen avsikter och citerar kunskapsbanken med källa. Den här filen bygger bara
// det ctx den behöver — ur §13-fakta och v3-lagringen — och visar svaret.
// Att skriva en andra coach hade betytt två sanningar om samma kropp.

import { useState, useRef, useEffect } from "react";
import { C, HFONT, BFONT, hdr, label, card } from "./design.js";
import { coachReply } from "../features/ai-coach/index.jsx";
import { bodyState, nutritionCtx } from "./store.js";

/** Startförslag. Korta, och formulerade som man faktiskt pratar. */
const FÖRSLAG = [
  "Hur ser återhämtningen ut?",
  "Vad ska jag träna idag?",
  "Hur mycket protein behöver jag?",
  "Bröstet svarar inte",
];

export function CoachChat({ sessions, activeProgram, profile, foodLog, goal, nutritionTargets, onStart }) {
  const [rader, setRader] = useState([]);
  const [text, setText] = useState("");
  const [ämne, setÄmne] = useState(null);
  const botten = useRef(null);

  useEffect(() => {
    if (botten.current) botten.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [rader]);

  const fråga = q => {
    const f = (q || "").trim();
    if (!f) return;

    const { states, overall, covered } = bodyState(sessions);

    // Kost: näringsmål + dagens totaler ur v3, gatade på ett ställe (nutritionCtx).
    // Ger coachen underlag att skilja "inget mål satt" från "mål satt men inget
    // loggat idag" — utan mål/logg skickas null, aldrig påhittade nollor.
    const kost = nutritionCtx(foodLog, nutritionTargets);

    // Readiness gatas på samma villkor som överallt annars: utan täckning
    // skickas null vidare, och coachen svarar då att den saknar underlag i
    // stället för att resonera kring en siffra som inte betyder något.
    const svar = coachReply(f, {
      overallReadiness: covered ? Math.round(overall) : null,
      muscleStates: states,
      sessions,
      activeProgram,
      profile,
      foodLog,
      goalProfile: goal ? { type: goal.typ } : null,
      ...kost,   // nutritionTargets, nutritionTotals, nutritionDays
      measurements: [],
      cycle: null,
      supplements: [],
    }, ämne);

    setRader(r => [...r, { från: "du", text: f }, { från: "coachen", ...svar }]);
    if (svar.topic) setÄmne(svar.topic);
    setText("");
  };

  return (
    <div>
      <div style={{ ...label(C.lime), marginBottom: 10 }}>Fråga coachen</div>

      {rader.length === 0 ? (
        <div style={{ ...card }}>
          <div style={{ fontSize: 13.5, color: C.text2, lineHeight: 1.65 }}>
            Fråga om din återhämtning, ditt nästa pass, kost eller en muskel som
            inte svarar. Svaren bygger på din loggade träning — finns det inte
            underlag säger jag det i stället för att gissa.
          </div>
        </div>
      ) : (
        <div>
          {rader.map((r, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              {r.från === "du" ? (
                <div style={{
                  marginLeft: "auto", maxWidth: "85%", padding: "10px 13px", borderRadius: "14px 14px 3px 14px",
                  background: C.card2, border: `1px solid ${C.border}`, fontSize: 13.5, width: "fit-content",
                }}>{r.text}</div>
              ) : (
                <div style={{
                  maxWidth: "92%", padding: "12px 14px", borderRadius: "14px 14px 14px 3px",
                  background: "rgba(212,255,63,.045)", border: `1px solid ${C.border}`,
                  fontSize: 13.5, lineHeight: 1.65, whiteSpace: "pre-wrap",
                }}>
                  {r.text}
                  {r.action && r.action.kind === "start" && activeProgram && (
                    <button onClick={onStart} style={{
                      marginTop: 11, padding: "9px 15px", borderRadius: 999, cursor: "pointer",
                      border: "none", background: C.lime, color: "#0A0A0A",
                      fontFamily: HFONT, fontSize: 12.5, fontWeight: 700,
                    }}>{r.action.label}</button>
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={botten} />
        </div>
      )}

      {/* Följdfrågor: coachens egna chips när de finns, annars startförslagen. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, margin: "12px 0" }}>
        {((rader.length && rader[rader.length - 1].chips) || FÖRSLAG).slice(0, 4).map(c => (
          <button key={c} onClick={() => fråga(c)} style={{
            padding: "8px 13px", borderRadius: 999, cursor: "pointer",
            border: `1px solid ${C.border}`, background: C.card2, color: C.text2,
            fontFamily: BFONT, fontSize: 12.5,
          }}>{c}</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") fråga(text); }}
          placeholder="Skriv en fråga…"
          style={{
            flex: 1, padding: "13px 15px", borderRadius: 999, minWidth: 0,
            border: `1px solid ${C.border}`, background: C.card2, color: C.text,
            fontFamily: BFONT, fontSize: 14,
          }} />
        <button onClick={() => fråga(text)} disabled={!text.trim()} style={{
          padding: "13px 19px", borderRadius: 999, cursor: text.trim() ? "pointer" : "default",
          border: "none", background: text.trim() ? C.lime : C.border,
          color: text.trim() ? "#0A0A0A" : C.muted,
          fontFamily: HFONT, fontSize: 14, fontWeight: 700,
        }}>Fråga</button>
      </div>
    </div>
  );
}
