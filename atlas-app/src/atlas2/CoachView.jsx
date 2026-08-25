// Askr 2.0 — coachen.
//
// Enligt konceptet är coachen ingen chattruta man besöker utan en närvarande
// röst med tre roller: sammanfatta, peppa, förklara. Den här vyn är dess hem,
// men samma fakta matar korta inpass på andra ytor.
//
// ALLT här kommer ur coachFacts(). Inget skrivs ihop lokalt, ingen text hittar
// på en siffra. Kan coachen inte belägga något säger den det i stället.

import { useState, useEffect } from "react";
import { C, HFONT, hdr, label, btnPrimary, card, volt } from "./design.js";
import { coachFacts, recommendation, målfokus } from "./facts.js";
import { CoachChat } from "./CoachChat.jsx";
import { load } from "./store.js";
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

export function CoachView({ sessions, activeProgram, weights, profile, foodLog, goal, nutritionTargets, onStart, onOpenGoal, nutRec, setMål, autoIntervju = false, onAutoIntervjuKvitterad }) {
  // Svaren på varför-frågan ska få konsekvenser — annars är de datainsamling på
  // låtsas. Motorn kräver minst tre svar inom tre veckor: två är ingen tendens.
  // Signalen räknas FÖRE facts eftersom den sänker tilliten till readiness inuti
  // coachFacts — ordningen är alltså inte kosmetisk.
  const signal = reasonSignal(sessions);
  const facts = coachFacts({ sessions, activeProgram, weights, goal, nutRec, reasonSignal: signal });
  const rek = recommendation(facts);
  // Målresans läge mot planen. null när målet saknas eller saknar plan — då
  // visas fasvyn som förut, aldrig ett påhittat läge.
  const fokus = målfokus(facts);
  const namn = (profile && profile.name) || null;
  // Skälen är det man läser EN gång och sedan hoppar över. De fälls därför ihop
  // som standard: rekommendationen ska mötas först, inte motiveringen till den.
  const [visaSkäl, setVisaSkäl] = useState(false);
  // Chatten är en egen syssla, inte något man läser förbi på väg till svaret.
  // Den låg sist i vyn och tog 372 px av 979 — nu ligger den bakom ett tryck.
  const [visaChatt, setVisaChatt] = useState(false);

  // Kom man hit via målradens "Sätt ett mål" ska chatten stå öppen direkt.
  // Att landa på en coachvy där ingången är hopfälld vore att skicka någon
  // halvvägs och sedan gömma resten.
  useEffect(() => { if (autoIntervju) setVisaChatt(true); }, [autoIntervju]);

  // EN PÅGÅENDE INTERVJU ÖPPNAR SIG SJÄLV. Kortet fälls ihop vid varje
  // flikbyte, och ett samtal man är mitt uppe i får inte ligga dolt bakom en
  // knapp — då ser det ut som att coachen glömt bort det, vilket var precis
  // det rapporterade felet. Lagringen läses direkt här: CoachChat monteras
  // ju inte förrän kortet är öppet, så den kan inte svara på om den behövs.
  useEffect(() => {
    let levande = true;
    (async () => {
      const i = await load("intervju", null);
      if (levande && i && i.transkript && i.transkript.length) setVisaChatt(true);
    })();
    return () => { levande = false; };
  }, []);

  // Naven är 62 px. 68 ger den luft som behövs utan att äta skärm.
  return (
    <div style={{ padding: "16px 18px 68px" }}>
      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <div style={hdr(20)}>Coachen</div>
        <div style={{ ...label(C.lime), marginTop: 3 }}>Nästa bästa beslut</div>
      </div>

      {/* Hälsningen låg i ett eget kort på 111 px; ramen togs bort i
          layoutpaketet. Nu står den bara kvar när den SÄGER något: vid tunt
          eller obefintligt underlag är den ett förbehåll användaren behöver.
          Vid gott underlag löd den "Här är min analys och mitt förslag" — en
          upprepning av rubriken "Nästa bästa beslut" och av kortet direkt
          under. 36 px som inte bar någon information. */}
      {facts.datalage.svagast !== "ok" && facts.datalage.svagast !== "god" && (
      <div style={{ fontSize: 13.5, color: C.text2, lineHeight: 1.6, margin: "14px 2px 0" }}>
        <span style={{ color: C.text, fontWeight: 600 }}>{namn ? `Hej ${namn}!` : "Hej!"}</span>{" "}
        {facts.datalage.svagast === "ingen"
          ? "Jag vet ingenting om din kropp än. Logga ett pass så börjar jag kunna säga något som betyder något."
          : "Jag har lite att gå på än, så ta det jag säger med en nypa salt tills det finns fler pass."}
      </div>
      )}

      {/* REKOMMENDATIONEN — appens kärna. Störst på skärmen med flit. */}
      <div style={{ ...card, marginTop: 12, borderColor: rek.knapp ? C.lime : C.border, background: rek.knapp ? volt(0.045) : C.card }}>
        <div style={label(C.lime)}>Min rekommendation</div>
        <div style={{ fontSize: 17.5, fontWeight: 700, lineHeight: 1.4, margin: "9px 0 8px" }}>{rek.rubrik}</div>
        <div style={{ fontSize: 13.5, color: C.text2, lineHeight: 1.6 }}>{rek.brödtext}</div>
        {(rek.reservation || facts.kropp.tillit.sänkt) && (
          <div style={{ fontSize: 11.5, color: C.recovering, marginTop: 9 }}>
            Osäkert underlag — {facts.kropp.tillit.text}.
            {/* Sänkt tillit har ett eget skäl: användarens svar efter passen
                säger något readiness inte mäter. Utan raden skulle siffran
                tappa vikt utan att någon fick veta varför. */}
            {facts.kropp.tillit.skäl && ` ${facts.kropp.tillit.skäl}`}
          </div>
        )}
        {/* MÅLRESAN VÄGS IN I DAGENS BESLUT. Raden står INNE i
            rekommendationskortet med flit: ett eget kort hade gjort målet till
            ännu en sak att läsa förbi, och poängen är att beslutet idag och
            målet är samma fråga. Talen kommer ur malplan-motorn. */}
        {fokus && (
          <div style={{ marginTop: 12, paddingTop: 11, borderTop: `1px solid ${C.border}` }}>
            <div style={label(fokus.status === "efter" ? C.recovering : C.lime)}>{fokus.namn}</div>
            <div style={{ fontSize: 13.5, color: C.text2, lineHeight: 1.6, marginTop: 5 }}>{fokus.besked}</div>
            {fokus.rader.map((r, i) => (
              <div key={i} style={{ fontSize: 12, color: C.muted, lineHeight: 1.55, marginTop: 3 }}>{r}</div>
            ))}
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
                {/* Med en coachplanerad plan är nästa DATERADE delmål mer
                    användbart än fasnamnet — det är det man styr efter. */}
                {facts.målresa.nästaMätbara && !facts.målresa.passerat && (
                  <div style={{ fontSize: 12, color: C.lime, marginTop: 3 }}>
                    Nästa delmål om {facts.målresa.nästaMätbara.dagarKvar} dgr
                  </div>
                )}
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

      {/* En hopfälld rad är EN rad. 18 px topp och botten kring ett 44 px
          träffområde var mer ram än innehåll; 10 px räcker och träffytan är
          oförändrad. */}
      {rek.skäl.length > 0 && (
        <div style={{ ...card, marginTop: 12, paddingTop: 10, paddingBottom: 10 }}>
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
      {/* 39 px luft kring en 1 px-linje var mer avstånd än gränsen behövde. */}
      <div style={{ height: 1, background: C.hairline, margin: "16px 0 12px" }} />

      {/* Rubriken ligger KVAR när chatten är utfälld, så den går att fälla in
          igen. Förut byttes knappen ut mot chatten och vägen tillbaka fanns
          inte — man kunde öppna men aldrig stänga.

          Samma mönster som "Varför denna rekommendation?" ovan: aria-expanded
          och en pil som vänder. Två sätt att fälla ut saker i samma vy är ett
          sätt för mycket. */}
      <div style={{ ...card, paddingTop: 12, paddingBottom: visaChatt ? 16 : 12 }}>
        <button onClick={() => setVisaChatt(v => !v)} aria-expanded={visaChatt} style={{
          width: "100%", textAlign: "left", cursor: "pointer", color: C.text,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          background: "none", border: "none", padding: 0, minHeight: 44,
        }}>
          <span style={{ minWidth: 0 }}>
            <span style={{ ...label(C.lime), display: "block" }}>Fråga coachen</span>
            {!visaChatt && (
              <span style={{ display: "block", fontSize: 12.5, color: C.muted, marginTop: 5, lineHeight: 1.5 }}>
                Om din återhämtning, ditt program eller din kost.
              </span>
            )}
          </span>
          <span style={{ color: C.muted, fontSize: 15, flexShrink: 0,
            transform: visaChatt ? "rotate(180deg)" : "none", transition: "transform 150ms ease-out" }}>⌄</span>
        </button>

        {visaChatt && (
          <div style={{ marginTop: 12 }}>
            <CoachChat sessions={sessions} activeProgram={activeProgram} profile={profile}
              foodLog={foodLog} goal={goal} nutritionTargets={nutritionTargets} weights={weights} onStart={onStart}
              setMål={setMål} onOpenGoal={onOpenGoal}
              autoStart={autoIntervju} onAutoStartKvitterad={onAutoIntervjuKvitterad} />
          </div>
        )}
      </div>

      {/* Ärlighetsraden. Står kvar även när underlaget är gott — den är en
          egenskap hos produkten, inte en ursäkt när det går dåligt. */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 16, fontSize: 11.5, color: C.muted, textAlign: "center" }}>
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
          <path d="M12 3 L20 6.5 v6 c0 5.5 -3.5 8.5 -8 10 -4.5 -1.5 -8 -4.5 -8 -10 v-6 Z" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        Coachen bygger på din data. För lite data ger försiktiga svar.
      </div>
    </div>
  );
}
