// ATLAS 2.0 — coachen.
//
// Enligt konceptet är coachen ingen chattruta man besöker utan en närvarande
// röst med tre roller: sammanfatta, peppa, förklara. Den här vyn är dess hem,
// men samma fakta matar korta inpass på andra ytor.
//
// ALLT här kommer ur coachFacts(). Inget skrivs ihop lokalt, ingen text hittar
// på en siffra. Kan coachen inte belägga något säger den det i stället.

import { C, HFONT, hdr, label, btnPrimary, card, statRow, statCell, orDash } from "./design.js";
import { coachFacts, recommendation } from "./facts.js";
import { BodyMap2 } from "./BodyMap2.jsx";
import { bodyState } from "./store.js";

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

export function CoachView({ sessions, activeProgram, weights, profile, onStart }) {
  const facts = coachFacts({ sessions, activeProgram, weights });
  const rek = recommendation(facts);
  const { states } = bodyState(sessions);
  const namn = (profile && profile.name) || null;

  return (
    <div style={{ padding: "16px 18px 92px" }}>
      <div style={{ textAlign: "center", marginBottom: 4 }}>
        <div style={hdr(20)}>Coachen</div>
        <div style={{ ...label(C.lime), marginTop: 3 }}>Nästa bästa beslut</div>
      </div>

      {/* Hälsning. Namnet används bara om det finns — ingen "Hej !" */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ fontSize: 19, fontWeight: 700 }}>{namn ? `Hej ${namn}!` : "Hej!"}</div>
        <div style={{ fontSize: 13.5, color: C.text2, lineHeight: 1.6, marginTop: 7 }}>
          {facts.datalage.svagast === "ingen"
            ? "Jag vet ingenting om din kropp än. Logga ett pass så börjar jag kunna säga något som betyder något."
            : facts.datalage.svagast === "svag"
              ? "Jag har lite att gå på än, så ta det jag säger med en nypa salt tills det finns fler pass."
              : "Här är min analys och mitt förslag på nästa steg."}
        </div>
      </div>

      {/* REKOMMENDATIONEN — appens kärna. Störst på skärmen med flit. */}
      <div style={{ ...card, marginTop: 12, borderColor: rek.knapp ? C.lime : C.border, background: rek.knapp ? "rgba(212,255,63,0.045)" : C.card }}>
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

      {rek.skäl.length > 0 && (
        <div style={{ ...card, marginTop: 12 }}>
          <div style={label(C.lime)}>Varför denna rekommendation?</div>
          <div style={{ marginTop: 8 }}>{rek.skäl.map(s => <Rad key={s} text={s} />)}</div>
        </div>
      )}

      <div style={{ ...card, marginTop: 12, padding: "16px 12px" }}>
        <div style={{ ...label(), textAlign: "center", marginBottom: 10 }}>Kroppens status</div>
        <BodyMap2 muscleStates={states} height={210} legend={false} />
      </div>

      <div style={{ ...statRow, marginTop: 16 }}>
        {[["Readiness", orDash(facts.kropp.readiness)],
          ["Veckans pass", facts.träning.passIVeckan],
          ["Pass totalt", facts.träning.passTotalt]].map(([l, v], i) => (
          <div key={l} style={statCell(i)}>
            <div style={label()}>{l}</div>
            <div style={{ ...hdr(20), marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>

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
