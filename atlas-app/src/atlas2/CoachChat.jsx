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
import { C, HFONT, BFONT, hdr, label, card, volt, btnPrimary, btnGhost } from "./design.js";
import { coachReply } from "../features/ai-coach/index.jsx";
import { frågaCoachen } from "../engines/coach-llm.js";
import { bestStrengthTrend } from "../engines/index.js";
import { coachFacts } from "../engines/facts.js";
import { bodyState, nutritionCtx, load, save } from "./store.js";
import {
  INTERVJU_SYSTEMPROMPT, byggIntervjuUnderlag, intervjuMeddelande,
  tolkaIntervjuSvar, valideraPlan, byggMålFrånPlan, viktbana, KORTA_PLANEN_INSTRUKTION,
  intervjuÖppning,
} from "../engines/intervju.js";

/**
 * Proxyn som håller API-nyckeln. Appen anropar aldrig Claude direkt — en nyckel
 * i klienten kan läsas av vem som helst med telefonen i handen.
 */
const COACH_PROXY = "https://askr-coach.vercel.app/api/coach";

// FEL SKA GÅ ATT LÄSA AV SKÄRMEN.
//
// Tidigare blev varje fel samma mening i chatten: "Kopplingen till coachen gick
// inte fram." Proxyn skickar med den verkliga orsaken, men den kastades bort —
// och då är felet omöjligt att diagnosticera från telefonen. Robert fick
// beskriva symtom och vi fick gissa oss fram i tre omgångar; orsaken visade sig
// vara ett gammalt tokentak i en proxy som inte deployats om.
//
// Nu bär felet både statuskod och proxyns text. Ful information slår vacker
// tystnad när något är sönder.
async function hämtaSvar({ system, meddelande, maxTokens }) {
  let r;
  try {
    r = await fetch(COACH_PROXY, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ system, meddelande, maxTokens }),
    });
  } catch (e) {
    // Nätverksfel når aldrig servern — säg det, i stället för något om coachen.
    const fel = new Error("nätverket svarade inte (" + (e.message || "okänt fel") + ")");
    fel.nätverk = true;
    throw fel;
  }
  let d = null;
  try { d = await r.json(); } catch (e) { d = null; }
  if (!r.ok) {
    const fel = new Error((d && d.fel) || `proxyn svarade ${r.status}`);
    fel.status = r.status;
    throw fel;
  }
  return (d && d.text) || "";
}

/** Startförslag. Korta, och formulerade som man faktiskt pratar. */
const FÖRSLAG = [
  "Hur ser återhämtningen ut?",
  "Vad ska jag träna idag?",
  "Hur mycket protein behöver jag?",
  "Bröstet svarar inte",
];

export function CoachChat({ sessions, activeProgram, profile, foodLog, goal, nutritionTargets, weights = [], onStart, setMål, onOpenGoal, readiness = null, autoStart = false, onAutoStartKvitterad }) {
  const [rader, setRader] = useState([]);
  const [text, setText] = useState("");
  const [ämne, setÄmne] = useState(null);
  const [tänker, setTänker] = useState(false);
  // MÅLINTERVJUN. null = vanlig chatt. Aktiv intervju bär hela transkriptet —
  // modellen är tillståndslös, så samtalet skickas med varje anrop. `plan` sätts
  // först när modellen levererat en plan som klarat den deterministiska
  // valideringen; sparandet sker ändå aldrig förrän användaren tryckt på
  // knappen i förhandsvisningen. Människan är sista grinden.
  //
  // TILLSTÅNDET MÅSTE ÖVERLEVA AVMONTERING. CoachChat renderas bara när
  // chattkortet är utfällt — fäller man ihop det, byter flik eller låser
  // telefonen avmonteras komponenten, och en intervju som bara låg i useState
  // RADERADES. För användaren såg det ut som att coachen glömde vad som sagts
  // mitt i samtalet. En intervju är flera minuters arbete och får inte kunna
  // försvinna för att man tittade på något annat.
  const [intervju, setIntervju] = useState(null);
  const [hydrerad, setHydrerad] = useState(false);
  const botten = useRef(null);

  // Hydrering EN gång vid montering. Utan `hydrerad`-flaggan skulle den tomma
  // starten hinna skrivas tillbaka och radera det sparade.
  useEffect(() => {
    let levande = true;
    (async () => {
      const sparad = await load("intervju", null);
      if (!levande) return;
      if (sparad && sparad.transkript && sparad.transkript.length) {
        setIntervju(sparad);
        // Transkriptet visas igen så man ser var man var — chattraderna är
        // härledda ur samtalet, inte en egen sanning.
        setRader(sparad.transkript.map(r => ({ från: r.från === "du" ? "du" : "coachen", text: r.text, källa: "intervju" })));
      }
      setHydrerad(true);
    })();
    return () => { levande = false; };
  }, []);

  useEffect(() => {
    if (!hydrerad) return;
    save("intervju", intervju);
  }, [intervju, hydrerad]);


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

  // ── Målintervjun ──────────────────────────────────────────────────────────
  // Modellen intervjuar och föreslår; intervju-motorn validerar; delmålen
  // genereras deterministiskt; användaren godkänner. Fyra led, inget hoppas över.
  const startaIntervju = () => {
    // ÖPPNINGEN REDOVISAR UNDERLAGET. Robert satte ett mål och upplevde att
    // coachen inte såg hans värden — trots att de fanns med. Slutsatsen var
    // rimlig: ingenting i samtalet visade vad som kommit fram. Ett underlag
    // användaren inte kan se går inte att lita på.
    //
    // Raden byggs deterministiskt av motorn, inte av modellen: den ska vara
    // sann även om modellen skulle vilja säga något annat.
    let styrketrend = null;
    try { styrketrend = bestStrengthTrend(sessions) || null; } catch (e) { styrketrend = null; }
    const underlag = byggIntervjuUnderlag({
      weights, sessions, foodLog, nutritionTargets, profile,
      activeProgram, readiness, styrketrend,
    });
    const vad = intervjuÖppning(underlag);

    const fråga = goal
      ? "Du har redan en målresa igång — en ny ersätter den. Berätta vad du siktar på, så planerar vi om."
      : "Berätta vad du siktar på — ett bröllop, magrutor, en träningsresa, vad som helst. Så diskuterar vi oss fram till en plan med delmål.";
    const öppning = vad.text ? `${vad.text}\n\n${fråga}` : fråga;

    setIntervju({ transkript: [{ från: "coachen", text: öppning }], plan: null });
    setRader(r => [...r, { från: "coachen", text: öppning, källa: "intervju" }]);
  };

// Startsignal från målraden på hemvyn. Väntar på hydreringen: fanns en
  // pågående intervju sparad ska den ÅTERUPPTAS, inte skrivas över — annars
  // hade knappen raderat ett samtal man var mitt uppe i.
  useEffect(() => {
    if (!autoStart || !hydrerad) return;
    if (!intervju) startaIntervju();
    if (onAutoStartKvitterad) onAutoStartKvitterad();
  }, [autoStart, hydrerad]);

  const intervjuTur = async f => {

    const transkript = [...intervju.transkript, { från: "du", text: f }];
    setIntervju({ ...intervju, transkript });
    setRader(r => [...r, { från: "du", text: f }]);
    setText("");
    setTänker(true);

    // Styrketrenden hämtas HÄR, inte i motorn: engines/index.js drar in
    // livsmedelsdatabasen och skulle göra intervju.js tung att ladda.
    let styrketrend = null;
    try { styrketrend = bestStrengthTrend(sessions) || null; } catch (e) { styrketrend = null; }
    const underlag = byggIntervjuUnderlag({
      weights, sessions, foodLog, nutritionTargets, profile,
      activeProgram, readiness, styrketrend,
    });
    const körTur = async trans => {
      const svar = await hämtaSvar({
        system: INTERVJU_SYSTEMPROMPT,
        meddelande: intervjuMeddelande({ underlag, transkript: trans }),
        // Planens JSON med fem dimensioner ligger nära standardtaket på 400.
        // Ett kapat svar blir oparsbart och ser ut som ett fel i appen.
        maxTokens: 1200,
      });
      return tolkaIntervjuSvar(svar);
    };

    try {
      let r = await körTur(transkript);
      let trans = transkript;

      // En plan som inte klarar valideringen skickas tillbaka EN gång med
      // felen som instruktion. Klarar modellen det inte heller då sägs det
      // rakt ut — hellre ett ärligt "det gick inte" än en trasig plan.
      if (r.typ === "plan") {
        let v = valideraPlan(r.plan, { underlag, transkript: trans });
        if (!v.ok) {
          trans = [...trans, { från: "coachen", text: `[Valideringsfel — rätta och fortsätt intervjun eller leverera ny JSON: ${v.fel.join("; ")}]` }];
          r = await körTur(trans);
          if (r.typ === "plan") v = valideraPlan(r.plan, { underlag, transkript: trans });
        }
        if (r.typ === "plan" && v.ok) {
          setIntervju({ transkript: trans, plan: r.plan, bana: v.bana });
          setTänker(false);
          return;
        }
        if (r.typ === "plan") {
          setTänker(false);
          setRader(x => [...x, { från: "coachen", källa: "intervju", text: "Planen höll inte måttet: " + v.fel.join(". ") + ". Vi tar det därifrån — svara på det som saknas." }]);
          setIntervju({ transkript: trans, plan: null });
          return;
        }
      }

      // KAPAD PLAN — be om den igen, kortare. Planen är inte FEL, den är
      // avhuggen, och att skicka användaren tillbaka till "formulera om" är
      // att skylla på hen för något hen inte gjort. Ett försök; håller det
      // inte heller sägs orsaken rakt ut.
      if (r.typ === "kapad") {
        const kortare = [...trans, { från: "coachen", text: KORTA_PLANEN_INSTRUKTION }];
        r = await körTur(kortare);
        if (r.typ === "plan") {
          const v = valideraPlan(r.plan, { underlag, transkript: trans });
          if (v.ok) {
            setIntervju({ transkript: trans, plan: r.plan, bana: v.bana });
            setTänker(false);
            return;
          }
        }
        setTänker(false);
        setRader(x => [...x, { från: "coachen", källa: "intervju", text: "Planen blev för lång för att komma fram hel, två gånger. Ditt svar var inget fel. Säg till så försöker vi igen — eller be mig hålla planen kortare." }]);
        setIntervju({ transkript: trans, plan: null });
        return;
      }

      setTänker(false);
      if (r.typ === "fråga") {
        setIntervju({ transkript: [...trans, { från: "coachen", text: r.text }], plan: null });
        setRader(x => [...x, { från: "coachen", text: r.text, källa: "intervju" }]);
      } else {
        // Orsaken följer med. "Formulera om" utan förklaring lägger skulden på
        // användaren för ett fel som nästan alltid ligger någon annanstans.
        const orsak = r.fel ? ` (${r.fel})` : "";
        setRader(x => [...x, { från: "coachen", källa: "intervju", text: `Jag fick inget användbart svar från modellen${orsak}. Prova att formulera om, eller avbryt intervjun.` }]);
      }
    } catch (e) {
      setTänker(false);
      const orsak = e && e.message ? e.message : "okänd orsak";
      setRader(x => [...x, { från: "coachen", källa: "intervju", text: `Det gick inte att nå coachen: ${orsak}. Samtalet finns kvar — försök igen om en stund.` }]);
    }
  };

  const sparaPlan = () => {
    const mål = byggMålFrånPlan(intervju.plan);
    if (setMål) setMål(mål);
    setIntervju(null);
    setRader(r => [...r, { från: "coachen", källa: "intervju", text: `Målresan "${mål.namn}" är igång — ${mål.delmål.length} delmål fram till måldatumet. Du hittar hela planen under Målresa.`, action: onOpenGoal ? { kind: "mål", label: "Öppna målresan" } : null }]);
  };

  const fråga = async q => {
    const f = (q || "").trim();
    if (!f) return;
    // Pågår en intervju går allt man skriver dit — man är i ett samtal, inte i
    // en frågelåda. Vanliga chatten kommer tillbaka när intervjun är klar.
    if (intervju) { intervjuTur(f); return; }

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
      else {
        // TYST MISSLYCKANDE VAR DET SOM FANNS HÄR FÖRUT: gick anropet inte
        // igenom visades ingenting alls — chatten slutade bara tänka. För
        // användaren såg det ut som att appen hängde sig, och orsaken gick inte
        // att se någonstans. Nu sägs det, med skälet.
        //
        // "påhittade-tal" är INTE ett fel utan talkontrollen som gjort sitt
        // jobb: modellen hittade på en siffra och svaret stoppades. Det ska
        // formuleras som ett medvetet val, inte som ett krångel.
        const text = r.skäl === "påhittade-tal"
          ? "Jag stoppade svaret — modellen tog med siffror som inte finns i din data. Hellre inget svar än ett påhittat."
          : r.skäl === "ingen-koppling"
            ? "Ingen koppling till coachen är konfigurerad i den här versionen."
            : r.skäl === "tomt"
              ? "Modellen svarade tomt. Prova igen om en stund."
              : `Det gick inte att nå coachen: ${r.detalj || r.skäl || "okänd orsak"}.`;
        setRader(rad => [...rad, { från: "coachen", text, källa: "fel" }]);
      }
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
                  {r.action && r.action.kind === "mål" && onOpenGoal && (
                    <button onClick={onOpenGoal} style={{
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

      {/* FÖRHANDSVISNINGEN — hela planen i klartext innan något sparas.
          Talen kommer ur den VALIDERADE planen och den deterministiska
          viktbanan; ingenting här är modellens formuleringar. */}
      {intervju && intervju.plan && (() => {
        const p = intervju.plan;
        const bana = intervju.bana || (p.viktmål ? viktbana({ startKg: p.viktmål.startKg, målKg: p.viktmål.målKg, målDatum: new Date(p.målDatum + "T12:00:00").getTime() }) : null);
        return (
          <div style={{ ...card, marginTop: 12, borderColor: C.lime, background: volt(.045) }}>
            <div style={label(C.lime)}>Förslag till målresa</div>
            <div style={{ ...hdr(17), marginTop: 6 }}>{p.namn}</div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>
              Måldatum {p.målDatum} · {p.passPerVecka} styrkepass/v{p.cardioPerVecka ? ` · ${p.cardioPerVecka} cardio/v` : ""}
            </div>
            {p.viktmål && bana && (
              <div style={{ fontSize: 13, color: C.text2, marginTop: 8, lineHeight: 1.55 }}>
                Vikt {p.viktmål.startKg} → {p.viktmål.målKg} kg, ~{Math.abs(bana.kgPerVecka)} kg/vecka — inom säker takt.
              </div>
            )}
            {["träning", "kost", "cardio", "vila", "sömn"].map(k => (p.dimensioner && p.dimensioner[k]) ? (
              <div key={k} style={{ marginTop: 9 }}>
                <div style={label()}>{k.charAt(0).toUpperCase() + k.slice(1)}</div>
                <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.55, marginTop: 2 }}>{p.dimensioner[k]}</div>
              </div>
            ) : null)}
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
              Sömn och vila kan appen inte mäta — de följer med som riktlinjer,
              inte som delmål. Delmålen sätts på vikt och loggade pass.
            </div>
            <button onClick={sparaPlan} style={{ ...btnPrimary, marginTop: 12 }}>Starta resan</button>
            <button onClick={() => setIntervju({ ...intervju, plan: null })} style={{ ...btnGhost, marginTop: 8 }}>Justera — fortsätt samtalet</button>
          </div>
        );
      })()}

      {/* Följdfrågor: coachens egna chips när de finns, annars startförslagen.
          Under en intervju visas bara en väg ut — allt annat man skriver hör
          till samtalet. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, margin: "12px 0" }}>
        {intervju ? (
          <button onClick={() => { setIntervju(null); setRader(r => [...r, { från: "coachen", text: "Intervjun avbruten. Fråga på som vanligt.", källa: "intervju" }]); }} style={{
            padding: "8px 13px", borderRadius: 999, cursor: "pointer",
            border: `1px solid ${C.border}`, background: C.card2, color: C.muted,
            fontFamily: BFONT, fontSize: 12.5,
          }}>Avbryt intervjun</button>
        ) : (
          <>
            {setMål && (
              <button onClick={startaIntervju} style={{
                padding: "8px 13px", borderRadius: 999, cursor: "pointer",
                border: `1px solid ${C.lime}`, background: volt(.05), color: C.lime,
                fontFamily: BFONT, fontSize: 12.5,
              }}>{goal ? "Planera om målet" : "Sätt ett mål med coachen"}</button>
            )}
            {((rader.length && rader[rader.length - 1].chips) || FÖRSLAG).slice(0, 4).map(c => (
              <button key={c} onClick={() => fråga(c)} style={{
                padding: "8px 13px", borderRadius: 999, cursor: "pointer",
                border: `1px solid ${C.border}`, background: C.card2, color: C.text2,
                fontFamily: BFONT, fontSize: 12.5,
              }}>{c}</button>
            ))}
          </>
        )}
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
