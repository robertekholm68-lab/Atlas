// Askr 2.0 — varför readiness är vad den är.
//
// VARFÖR den här vyn finns: en readiness på 62 är inte ett besked, det är en
// gåta. Talet byggs av flera ingredienser — träningsåterhämtning som bas, sedan
// kost och menscykel som modifierare — och utan uppdelningen kan användaren
// varken lita på siffran eller påverka den. "Kroppen är gränssnittet" betyder
// att kroppen ska gå att LÄSA, inte bara betraktas.
//
// Ingenting räknas här. `coachFacts().kropp.readinessWhy` bär redan hela
// uppdelningen från motorn (readinessBreakdown) — vyn presenterar den.
//
// Den viktigaste raden är den som säger när kosten INTE räknas med. Att tyst
// utelämna en faktor och visa samma siffra vore att ljuga med utelämnande.

import { C, HFONT, MONO, hdr, label, card, orDash, DASH } from "./design.js";

const tecken = n => (n > 0 ? `+${n}` : `${n}`);

/**
 * @param why       facts.kropp.readinessWhy — { total, base, factors }
 * @param readiness den justerade siffran som visas i appen
 * @param logg      logReliability(foodLog) — { days, reliable, loggedToday }
 */
export function ReadinessSheet({ why, readiness, logg, onClose, onKost }) {
  const faktorer = (why && why.factors) || [];
  const modifierare = faktorer.filter(f => f.delta != null && f.delta !== 0);
  const kostRäknas = logg && logg.reliable;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={hdr(18)}>Din readiness</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 5 }}>Hur talet är uppbyggt</div>
        </div>
        <button onClick={onClose} aria-label="Stäng"
          style={{ background: "none", border: "none", color: C.muted, fontSize: 24, cursor: "pointer", padding: "0 4px", minHeight: 44 }}>×</button>
      </div>

      {why == null ? (
        // Ingen bas betyder inget underlag. Då finns ingen siffra att förklara,
        // och att visa en vore precis det appen lovat att aldrig göra.
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.6 }}>
            Det finns inte tillräckligt loggat för att räkna en readiness än.
            Logga ett pass, så börjar kartan och det här talet betyda något.
          </div>
        </div>
      ) : (
        <>
          <div style={{ ...card, marginTop: 16, textAlign: "center", padding: "18px 16px" }}>
            <div style={{ ...hdr(44, readiness >= 76 ? C.ready : readiness >= 56 ? C.recovering : C.critical) }}>
              {orDash(readiness)}
            </div>
            <div style={{ ...label(), marginTop: 4 }}>av 100</div>
          </div>

          <div style={{ ...label(), marginTop: 22, marginBottom: 4 }}>Så räknas det</div>

          {/* Basen först, sedan varje modifierare med sitt tecken. Ordningen är
              motorns, inte vyns — den speglar hur talet faktiskt byggs. */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "12px 2px", borderBottom: `1px solid ${C.hairline}` }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, color: C.text }}>Träningsåterhämtning</div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
                Viktat snitt av hur utvilade dina muskelgrupper är.
              </div>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 15, color: C.text, whiteSpace: "nowrap" }}>{why.base}</div>
          </div>

          {modifierare.map((f, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "12px 2px", borderBottom: `1px solid ${C.hairline}` }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: C.text }}>{f.label}</div>
                {f.note && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>{f.note}</div>}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 15, whiteSpace: "nowrap", color: f.delta < 0 ? C.critical : C.ready }}>
                {tecken(f.delta)}
              </div>
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "14px 2px 0" }}>
            <div style={{ ...label(C.lime) }}>Summa</div>
            <div style={{ fontFamily: MONO, fontSize: 16, color: C.text }}>{orDash(readiness)}</div>
          </div>

          {modifierare.length === 0 && (
            <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, marginTop: 14 }}>
              Inga modifierare påverkar talet just nu — det är rå
              träningsåterhämtning.
            </div>
          )}

          {/* Den ärliga raden: säg när kosten inte räknas, och varför. */}
          <div style={{ ...card, marginTop: 20, borderColor: kostRäknas ? C.hairline : C.recovering }}>
            <div style={label(kostRäknas ? undefined : C.recovering)}>Kosten</div>
            {kostRäknas ? (
              <div style={{ fontSize: 12.5, color: C.text2, lineHeight: 1.6, marginTop: 8 }}>
                Räknas in. Du har loggat mat {logg.days} av de senaste fem
                dagarna, vilket räcker för att säga något om hur du äter.
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12.5, color: C.text2, lineHeight: 1.6, marginTop: 8 }}>
                  Räknas <b style={{ color: C.text }}>inte</b> in än. Du har loggat mat{" "}
                  {logg ? logg.days : 0} av de senaste fem dagarna — för lite för att
                  veta om ett lågt proteinintag är en vana eller en tillfällighet.
                  Hellre lämna faktorn utanför än gissa åt något håll.
                </div>
                {onKost && (
                  <button onClick={onKost} style={{
                    marginTop: 12, padding: "11px 15px", borderRadius: 12, minHeight: 44, cursor: "pointer",
                    border: `1px solid ${C.border}`, background: C.card2, color: C.text,
                    fontFamily: HFONT, fontSize: 12, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase",
                  }}>Logga mat</button>
                )}
              </>
            )}
          </div>

          <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.6, marginTop: 16 }}>
            Readiness är en vägledning, inte en diagnos. Den vet bara det du
            loggat — den känner inte din sömn, din stress eller din vardag.
          </div>
        </>
      )}
    </>
  );
}
