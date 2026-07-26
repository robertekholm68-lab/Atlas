// Askr 2.0 — coachen.
//
// Enligt konceptet är coachen ingen chattruta man besöker utan en närvarande
// röst med tre roller: sammanfatta, peppa, förklara. Den här vyn är dess hem,
// men samma fakta matar korta inpass på andra ytor.
//
// ALLT här kommer ur coachFacts(). Inget skrivs ihop lokalt, ingen text hittar
// på en siffra. Kan coachen inte belägga något säger den det i stället.

import { useState } from "react";
import { C, HFONT, hdr, label, btnPrimary, card, volt } from "./design.js";
import { coachFacts, recommendation } from "./facts.js";
import { CoachChat } from "./CoachChat.jsx";
import { reasonSignal } from "../engines/post-session.js";

function Rad({ text }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 0" }}>
      <svg viewBox="0 0 24 24" width="17" height="17" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden>
        <circle cx="12" cy="12" r="10" fill="none" stroke={C.lime} strokeWidth="1.6" />
        <path d="M7.5 12.5 l3 3 l6 -6.5" fill="none" stroke={C.lime} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ fontSize: 13.5, color: C.text2, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

export function CoachView({ sessions, activeProgram, weights, profile, foodLog, goal, nutritionTargets, onStart, onOpenGoal }) {
  const facts = coachFacts({ sessions, activeProgram, weights, goal });
  const rek = recommendation(facts);
  const namn = (profile && profile.name) || null;
  // Skälen är det man läser EN gång och sedan hoppar över. De fälls därför ihop
  // som standard: rekommendationen ska mötas först, inte motiveringen till den.
  const [visaSkäl, setVisaSkäl] = useState(false);
  // Chatten är en egen syssla, inte något man läser förbi på väg till svaret.
  // Den låg sist i vyn och tog 372 px av 979 — nu ligger den bakom ett tryck.
  const [visaChatt, setVisaChatt] = useState(false);
  // Svaren på varför-frågan ska få konsekvenser — annars är de datainsamling på
  // låtsas. Motorn kräver minst tre svar inom tre veckor innan den säger något:
  // två svar är ingen tendens. Utan mönster returneras null och kortet uteblir.
  const signal = reasonSignal(sessions);

  return (
    <div style={{ padding: "16px 18px 72px" }}>
      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <div style={hdr(20)}>Coachen</div>
        <div style={{ ...label(C.lime), marginTop: 3 }}>Nästa bästa beslut</div>
      </div>

      {/* Hälsningen låg i ett eget kort på 111 px. Ordalydelsen är oförändrad —
          det är ramen som togs bort, inte det coachen säger om underlaget.
          Namnet används bara om det finns; ingen "Hej !". */}
      <div style={{ fontSize: 13.5, color: C.text2, lineHeight: 1.6, margin: "14px 2px 0" }}>
        <span style={{ color: C.text, fontWeight: 600 }}>{namn ? `Hej ${namn}!` : "Hej!"}</span>{" "}
        {facts.datalage.svagast === "ingen"
          ? "Jag vet ingenting om din kropp än. Logga ett pass så börjar jag kunna säga något som betyder något."
          : facts.datalage.svagast === "svag"
            ? "Jag har lite att gå på än, så ta det jag säger med en nypa salt tills det finns fler pass."
            : "Här är min analys och mitt förslag på nästa steg."}
      </div>

      {/* REKOMMENDATIONEN — appens kärna. Störst på skärmen med flit. */}
      <div style={{ ...card, marginTop: 12, borderColor: rek.knapp ? C.lime : C.border, background: rek.knapp ? volt(0.045) : C.card }}>
        <div style={label(C.lime)}>Min rekommendation</div>
        <div style={{ fontSize: 17.5, fontWeight: 700, lineHeight: 1.4, margin: "9px 0 8px" }}>{rek.rubrik}</div>
        <div style={{ fontSize: 13.5, color: C.text2, lineHeight: 1.6 }}>{rek.brödtext}</div>
        {rek.reservation && (
          <div style={{ fontSize: 11.5, color: C.recovering, marginTop: 9 }}>
            Osäkert underlag — {facts.kropp.tillit.text}.
          </div>
        )}
        {rek.knapp && activeProgram && (
          <button onClick={onStart} style={{ ...btnPrimary, marginTop: 15 }}>{rek.knapp} <span style={{ fontSize: 19 }}>→</span></button>
        )}
      </div>

      {/* Målresan: det enda som handlar om framtiden. Utan mål visas en
          inbjudan, inte en fejkad tidsaxel. */}
      <button onClick={onOpenGoal} style={{ ...card, marginTop: 12, width: "100%", textAlign: "left", cursor: "pointer", color: C.text, display: "block" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={label(C.lime)}>Målresa</div>
            {facts.målresa.namn ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 600, marginTop: 6 }}>{facts.målresa.namn}</div>
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
                  {facts.målresa.passerat
                    ? "Måldatumet har passerat"
                    : `${facts.målresa.fas ? facts.målresa.fas + " · " : ""}${facts.målresa.veckorKvar} veckor kvar`}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.55, maxWidth: 270 }}>
                Inget mål satt. Med ett måldatum kan jag säga var i resan du står,
                inte bara vad kroppen tål idag.
              </div>
            )}
          </div>
          <span style={{ color: C.muted, fontSize: 20, flexShrink: 0 }}>›</span>
        </div>
      </button>

      {rek.skäl.length > 0 && (
        <div style={{ ...card, marginTop: 12 }}>
          <button onClick={() => setVisaSkäl(v => !v)} aria-expanded={visaSkäl} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", minHeight: 44,
          }}>
            <span style={label(C.lime)}>Varför denna rekommendation?</span>
            <span style={{ color: C.muted, fontSize: 15, transform: visaSkäl ? "rotate(180deg)" : "none", transition: "transform 150ms ease-out" }}>⌄</span>
          </button>
          {visaSkäl && <div style={{ marginTop: 8 }}>{rek.skäl.map(s => <Rad key={s} text={s} />)}</div>}
        </div>
      )}

      {signal && (
        <div style={{ ...card, marginTop: 12, borderColor: signal.kind === "recovery" ? C.recovering : C.hairline }}>
          <div style={label(signal.kind === "recovery" ? C.recovering : C.lime)}>Vad dina svar säger</div>
          <div style={{ fontSize: 13.5, color: C.text2, lineHeight: 1.6, marginTop: 8 }}>{signal.text}</div>
        </div>
      )}

      {/* HÄR LÅG EN ANDRA MUSKELKARTA (210 px) och en nyckeltalsrad som visade
          samma readiness och samma veckopass som hemskärmen just visat.
          Tillsammans ~430 px upprepning i en vy som var 257 % av skärmen på en
          liten telefon. Borttaget med flit: en skärm, ett jobb. Hem äger kartan
          och nuläget, coachen äger rekommendationen och skälen. Kartan är ett
          tryck bort i bottennaven — den behöver inte ritas två gånger.

          Readiness-siffran finns kvar i texten ovan där den betyder något för
          rekommendationen; det som togs bort var siffran utan sammanhang. */}
      <div style={{ height: 1, background: C.hairline, margin: "22px 0 16px" }} />

      {visaChatt ? (
        <CoachChat sessions={sessions} activeProgram={activeProgram} profile={profile}
          foodLog={foodLog} goal={goal} nutritionTargets={nutritionTargets} weights={weights} onStart={onStart} />
      ) : (
        <button onClick={() => setVisaChatt(true)} style={{
          ...card, width: "100%", textAlign: "left", cursor: "pointer", color: C.text,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <span style={{ minWidth: 0 }}>
            <span style={{ ...label(C.lime), display: "block" }}>Fråga coachen</span>
            <span style={{ display: "block", fontSize: 12.5, color: C.muted, marginTop: 5, lineHeight: 1.5 }}>
              Om din återhämtning, ditt program eller din kost.
            </span>
          </span>
          <span style={{ color: C.muted, fontSize: 20, flexShrink: 0 }}>›</span>
        </button>
      )}

      {/* Ärlighetsraden. Står kvar även när underlaget är gott — den är en
          egenskap hos produkten, inte en ursäkt när det går dåligt. */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 20, fontSize: 11.5, color: C.muted, textAlign: "center" }}>
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
          <path d="M12 3 L20 6.5 v6 c0 5.5 -3.5 8.5 -8 10 -4.5 -1.5 -8 -4.5 -8 -10 v-6 Z" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        Coachen bygger på din data. För lite data ger försiktiga svar.
      </div>
    </div>
  );
}
