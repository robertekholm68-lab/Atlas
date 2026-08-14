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
import { C, HFONT, BFONT, hdr, label, card, volt } from "./design.js";
import { coachReply } from "../features/ai-coach/index.jsx";
import { frågaCoachen } from "../engines/coach-llm.js";
import { coachFacts } from "../engines/facts.js";
import { bodyState, nutritionCtx } from "./store.js";

/**
 * Proxyn som håller API-nyckeln. Appen anropar aldrig Claude direkt — en nyckel
 * i klienten kan läsas av vem som helst med telefonen i handen.
 */
const COACH_PROXY = "https://askr-coach.vercel.app/api/coach";

async function hämtaSvar({ system, meddelande }) {
  const r = await fetch(COACH_PROXY, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ system, meddelande }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.fel || "proxyfel");
  return d.text;
}

/** Startförslag. Korta, och formulerade som man faktiskt pratar. */
const FÖRSLAG = [
  "Hur ser återhämtningen ut?",
  "Vad ska jag träna idag?",
  "Hur mycket protein behöver jag?",
  "Bröstet svarar inte",
];

export function CoachChat({ sessions, activeProgram, profile, foodLog, goal, nutritionTargets, weights = [], onStart }) {
  const [rader, setRader] = useState([]);
  const [text, setText] = useState("");
  const [ämne, setÄmne] = useState(null);
  const [tänker, setTänker] = useState(false);
  const botten = useRef(null);

  // ROLLA TILL SVARETS ÖVERKANT, INTE TILL SIDANS BOTTEN.
  //
  // Regelsvaret visas direkt; Claudes svar läggs till flera sekunder senare och
  // hamnar då utanför skärmen. Symtomet blir "AI:n funkar inte", trots att
  // svaret ligger där — och det var precis vad Robert rapporterade.
  //
  // block:"end" var fel: under chatten finns inputfält och bottennav, så sidans
  // botten hamnar långt förbi svaret och texten sköts 195 px OVANFÖR kanten
  // (mätt, inte gissat). Ankaret sitter nu på sista raden och rullas med
  // block:"start" — svarets början hamnar överst i vyn, där man vill läsa.
  useEffect(() => {
    const el = botten.current;
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [rader, tänker]);

  const fråga = async q => {
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
      weights,   // [{ts,kg}] → §13 facts.vikt, så coachen kan svara om vikt
      goal,      // journey-målet → §13 facts.målresa (fas, veckor kvar, delmål)
      measurements: [],
      cycle: null,
      supplements: [],
    }, ämne);

    setRader(r => [...r, { från: "du", text: f }, { från: "coachen", ...svar }]);
    if (svar.topic) setÄmne(svar.topic);
    setText("");

    // CLAUDE KLIVER IN DÄR REGLERNA INTE RÄCKER.
    //
    // coachReply är förstahandsvalet: testad, känner igen avsikter, citerar
    // kunskapsbanken med källa. Men den svarar generellt när frågan inte
    // matchar något — och "jag har ont i axeln när jag pressar" är en riktig
    // fråga som ingen regeltabell fångar.
    //
    // Modellen får BARA formulera kring coachFacts. Hittar den på ett tal
    // förkastas svaret av coach-llm, och då står det regelbaserade svaret kvar.
    // Det är därför den här körs EFTER: användaren har redan fått ett svar, och
    // det här kan bara förbättra det.
    // Fallback-grenen i coachReply känns igen på att den saknar topic och i
    // stället erbjuder chips — den har alltså inte förstått frågan, bara
    // föreslagit vad man KAN fråga. Det är där Claude tillför något.
    const förstodInte = !svar.topic && Array.isArray(svar.chips) && svar.chips.length > 0;
    if (förstodInte) {
      setTänker(true);
      const facts = coachFacts({ sessions, activeProgram, weights, goal });
      const r = await frågaCoachen({
        fråga: f, facts,
        extra: { frågaGällde: ämne || null },
        hämtaSvar,
      });
      setTänker(false);
      if (r.ok) setRader(rad => [...rad, { från: "coachen", text: r.text, källa: "claude" }]);
    }
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
          {tänker && (
            <div style={{ fontSize: 12.5, color: C.muted, padding: "8px 2px" }}>Tänker…</div>
          )}
          {rader.map((r, i) => (
            <div key={i} ref={i === rader.length - 1 ? botten : null} style={{ marginBottom: 12 }}>
              {r.från === "du" ? (
                <div style={{
                  marginLeft: "auto", maxWidth: "85%", padding: "10px 13px", borderRadius: "14px 14px 3px 14px",
                  background: C.card2, border: `1px solid ${C.border}`, fontSize: 13.5, width: "fit-content",
                }}>{r.text}</div>
              ) : (
                <div style={{
                  maxWidth: "92%", padding: "12px 14px", borderRadius: "14px 14px 14px 3px",
                  background: volt(.045), border: `1px solid ${C.border}`,
                  fontSize: 13.5, lineHeight: 1.65, whiteSpace: "pre-wrap",
                }}>
                  {/* Claudes svar kommer sekunder efter regelsvaret. Utan en
                      markering ser det ut som att coachen sagt emot sig själv. */}
                  {r.källa === "claude" && (
                    <div style={{ ...label(C.lime), marginBottom: 6 }}>Coachen tänkte vidare</div>
                  )}
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
