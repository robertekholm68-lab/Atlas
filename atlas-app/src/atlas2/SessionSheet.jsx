// Askr 2.0 — redigera eller ta bort ett loggat pass.
//
// VARFÖR den här vyn finns: loggen är appens enda sanning. Ett felknappat set
// (180 kg i stället för 80) förgiftar muskellast, återhämtning, readiness och
// coachens rekommendation — och utan en väg att rätta det är användarens enda
// utväg att sluta lita på siffrorna. Rättningen är alltså inte en bekvämlighet
// utan en förutsättning för ärlighetsprincipen.
//
// Motorn gör jobbet: updateSet/deleteSet räknar om muscleLoads direkt, så
// kartan och readiness följer med i samma ögonblick som ändringen sparas. Här
// finns bara inmatningen och bekräftelserna.

import { useState } from "react";
import { C, HFONT, MONO, hdr, label, card, btnPrimary, btnGhost } from "./design.js";
import { updateSet, deleteSet, sessionHasLoad } from "../engines/session.js";
import { formatVolume } from "../engines/index.js";
import { sessionVolume } from "./store.js";
import { EXERCISES } from "../data/exercises.js";

const inputStil = {
  width: 66, padding: "9px 8px", borderRadius: 12, minHeight: 44,
  border: `1px solid ${C.border}`, background: C.card2, color: C.text,
  fontFamily: MONO, fontSize: 14, textAlign: "center",
};

const datumText = ts => new Date(ts).toLocaleDateString("sv-SE", {
  weekday: "long", day: "numeric", month: "long",
});

/**
 * @param session  passet som redigeras (ur den lagrade listan)
 * @param onSpara  (nyttPass) => void — anropas först när användaren sparar
 * @param onRadera (id) => void
 */
export function SessionSheet({ session, onSpara, onRadera, onClose }) {
  // Arbetskopia. Ingenting skrivs till lagringen förrän Spara trycks — ångra
  // ska vara gratis ända fram till sista knappen.
  const [s, setS] = useState(session);
  const [bekräftaRadering, setBekräftaRadering] = useState(false);

  if (!s) return null;

  const sets = s.sets || [];
  // Övningarna i loggad ordning — samma ordning som passet faktiskt utfördes.
  const ordning = [];
  sets.forEach(x => { if (!ordning.includes(x.exerciseId)) ordning.push(x.exerciseId); });

  // Bodyweight skickas medvetet INTE med: recomputeSession faller då tillbaka på
  // passets egen bodyweightAtLog, alltså den kroppsvikt som gällde när passet
  // loggades. Att räkna om ett gammalt pass med dagens vikt vore att skriva om
  // historien.
  const ändraSet = (id, patch) => setS(cur => updateSet(cur, id, patch));
  const taBortSet = id => setS(cur => deleteSet(cur, id));

  const ändrat = JSON.stringify(s.sets) !== JSON.stringify(session.sets);
  const volym = sessionVolume(s);
  const last = Math.round(Object.values(s.muscleLoads || {}).reduce((a, b) => a + b, 0));
  const tomt = !sessionHasLoad(s);

  // Tal ur ett fält: tom sträng betyder "okänt", inte noll. Samma skillnad som
  // streck kontra nolla i resten av appen.
  const tal = v => (v === "" ? null : Number(v));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={hdr(18)}>Redigera pass</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 5, textTransform: "capitalize" }}>
            {s.title} · {datumText(s.completedAt)}
          </div>
        </div>
        <button onClick={onClose} aria-label="Stäng"
          style={{ background: "none", border: "none", color: C.muted, fontSize: 24, cursor: "pointer", padding: "0 4px", minHeight: 44 }}>×</button>
      </div>

      {/* Konsekvensen syns medan man skriver: volym och last räknas om vid varje
          knapptryck, så ändringen är aldrig ett mysterium förrän man sparat. */}
      <div style={{ ...card, marginTop: 14, display: "flex", padding: "13px 4px" }}>
        {[["Set", sets.length, "totalt"], ["Volym", formatVolume(volym), "kg"], ["Träningslast", last, "poäng"]].map(([l, v, e], i) => (
          <div key={l} style={{ flex: 1, textAlign: "center", borderLeft: i ? `1px solid ${C.hairline}` : "none" }}>
            <div style={label()}>{l}</div>
            <div style={{ ...hdr(20), marginTop: 3 }}>{v}</div>
            <div style={{ fontSize: 10.5, color: C.muted }}>{e}</div>
          </div>
        ))}
      </div>

      {sets.length === 0 && (
        <div style={{ marginTop: 16, padding: 15, borderRadius: 14, border: `1px dashed ${C.border}`, fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>
          {s.sport
            ? "Sportpass loggas utan enskilda set. Du kan ta bort hela passet nedan."
            : "Passet har inga set kvar. Det väger noll i belastning och återhämtning — ta bort det om det inte hände."}
        </div>
      )}

      {ordning.map(exId => {
        const ex = EXERCISES.find(e => e.id === exId);
        const tid = ex && ex.loadMode === "time";
        const kroppsvikt = ex && ex.loadMode === "bodyweight";
        const rader = sets.filter(x => x.exerciseId === exId);
        return (
          <div key={exId} style={{ marginTop: 18 }}>
            <div style={{ fontFamily: HFONT, fontWeight: 700, fontSize: 14, color: C.text }}>{ex ? ex.name : exId}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {rader.map((x, i) => (
                <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 8, background: C.card2, borderRadius: 12, padding: "8px 10px" }}>
                  <span style={{ ...label(), width: 42, flexShrink: 0 }}>Set {i + 1}</span>
                  {tid ? (
                    <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.muted }}>
                      <input type="number" inputMode="numeric" value={x.duration != null ? x.duration : ""}
                        aria-label={`Sekunder set ${i + 1}`}
                        onChange={e => ändraSet(x.id, { duration: tal(e.target.value) })} style={inputStil} />s
                    </label>
                  ) : (
                    <>
                      {!kroppsvikt && (
                        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.muted }}>
                          <input type="number" inputMode="decimal" step="0.5" value={x.weight != null ? x.weight : ""}
                            aria-label={`Vikt set ${i + 1}`}
                            onChange={e => ändraSet(x.id, { weight: tal(e.target.value) })} style={inputStil} />kg
                        </label>
                      )}
                      <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.muted }}>
                        <input type="number" inputMode="numeric" value={x.reps != null ? x.reps : ""}
                          aria-label={`Reps set ${i + 1}`}
                          onChange={e => ändraSet(x.id, { reps: tal(e.target.value) })} style={inputStil} />reps
                      </label>
                    </>
                  )}
                  <button onClick={() => taBortSet(x.id)} aria-label={`Ta bort set ${i + 1}`}
                    style={{ marginLeft: "auto", background: "none", border: "none", color: C.muted, fontSize: 19, cursor: "pointer", padding: "0 6px", minHeight: 44 }}>×</button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.6, marginTop: 18 }}>
        Ändringar räknar om muskelbelastning, återhämtning och readiness direkt.
      </div>

      <button onClick={() => onSpara(s)} disabled={!ändrat}
        style={{ ...btnPrimary, marginTop: 12, opacity: ändrat ? 1 : 0.4, cursor: ändrat ? "pointer" : "not-allowed" }}>
        Spara ändringar
      </button>

      {/* Radering i två steg. Ett pass är loggad historik — den ska inte kunna
          försvinna på ett felaktigt tumtryck i en gymkällare. */}
      {bekräftaRadering ? (
        <div style={{ marginTop: 12, padding: 15, borderRadius: 14, border: `1px solid ${C.critical}` }}>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.55 }}>
            Ta bort passet permanent? Belastningen försvinner ur kartan och
            veckovolymen. Det går inte att ångra.
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={() => onRadera(s.id)}
              style={{ ...btnGhost, borderColor: C.critical, color: C.critical }}>Ja, ta bort</button>
            <button onClick={() => setBekräftaRadering(false)} style={btnGhost}>Avbryt</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setBekräftaRadering(true)}
          style={{ ...btnGhost, marginTop: 10, color: C.critical, borderColor: C.border }}>
          Ta bort passet{tomt ? " (väger noll)" : ""}
        </button>
      )}
    </>
  );
}
