import { useState, useMemo } from "react";
import { C, hdr, label, btnText, card, volt } from "./design.js";
import { MUSCLES, GROUP_SV } from "../data/muscles.js";
import { EXERCISES } from "../data/exercises.js";

/**
 * MUSKELFÖRDELNING — vad träningen faktiskt lagt tid på.
 *
 * `muscleLoads` har funnits på varje session sedan schemaV 2: volym i kilo per
 * muskel, summerad ur övningarnas aktiveringsvektorer av `computeSessionLoad`.
 * Ingen vy har visat den. Sjätte gången i rad med samma mönster — funktionen
 * fanns, vägen dit saknades.
 *
 * VARFÖR DEN ÄR VÄRD EN VY. Volym per övning säger vad man gjort; volym per
 * muskel säger vad kroppen fått. Det är skillnaden mellan "jag körde fem
 * ryggövningar" och "latsen fick 4 080 kg medan trapezius fick 1 560".
 * Obalanser syns bara i den andra vyn.
 *
 * TALEN ÄR MOTORNS, INTE VYNS. Ingen omräkning, ingen normalisering till
 * procent som döljer storleksordningen. Stapeln är relativ mot den tyngst
 * belastade muskeln i perioden — talet bredvid är det faktiska kilotalet.
 */

/** Perioder att välja mellan. 7 dagar är en träningsvecka, 30 en cykel. */
const PERIODER = [
  { id: 7, namn: "7 dagar" },
  { id: 30, namn: "30 dagar" },
  { id: 90, namn: "90 dagar" },
];

export function MuscleSplit({ sessions = [], onClose }) {
  const [dagar, setDagar] = useState(30);

  const { rader, totalt, antalPass, störst } = useMemo(() => {
    const från = Date.now() - dagar * 864e5;
    const iPerioden = (sessions || []).filter(s => s && s.completedAt >= från);

    const per = {};
    const setPer = {};
    for (const s of iPerioden) {
      for (const [id, kg] of Object.entries(s.muscleLoads || {})) {
        per[id] = (per[id] || 0) + kg;
      }
    }
    // Andra svepet: set räknas först när vi vet vilka muskler som fått last.
    for (const s of iPerioden) {
      // Antal set som rörde muskeln — säger något annat än volymen. Tio lätta
      // set och tre tunga kan ge samma kilotal.
      //
      // BARA SET MED FAKTISK BELASTNING. Kroppsviktsövningar och tidsbaserade
      // moment bidrar inte till muscleLoads, så utan filtret visades "0 kg ·
      // 27 set" för bålmusklerna — ett tal utan det andra ser ut som ett fel,
      // och raden svarar inte på vad den utger sig för att svara på.
      for (const st of s.sets || []) {
        const ex = EXERCISES.find(e => e.id === st.exerciseId);
        if (!ex) continue;
        for (const a of ex.activation || []) {
          if (!(per[a.muscleId] > 0)) continue;
          setPer[a.muscleId] = (setPer[a.muscleId] || 0) + 1;
        }
      }
    }

    const lista = Object.entries(per)
      // NOLL KILO ÄR INTE EN RAD. Kroppsviktsövningar registrerar muskeln i
      // muscleLoads men bidrar med 0 kg — bålen fick "0 kg · 0 set", en rad som
      // säger att något hänt och samtidigt att inget hänt. Muskeln hör hemma i
      // "inte tränat"-listan i stället, som fångar den automatiskt.
      .filter(([, kg]) => kg > 0)
      .map(([id, kg]) => ({
        id,
        namn: (MUSCLES[id] || {}).name || id,
        grupp: GROUP_SV[(MUSCLES[id] || {}).group] || null,
        kg: Math.round(kg),
        set: setPer[id] || 0,
      }))
      .sort((a, b) => b.kg - a.kg);

    return {
      rader: lista,
      totalt: Math.round(Object.values(per).reduce((a, b) => a + b, 0)),
      antalPass: iPerioden.length,
      störst: lista.length ? lista[0].kg : 0,
    };
  }, [sessions, dagar]);

  // Muskler som INTE fått något alls i perioden. Det är ofta det mest
  // användbara i hela vyn — man ser vad man gjort, sällan vad man missat.
  const orörda = useMemo(() => {
    const träffade = new Set(rader.map(r => r.id));
    return Object.entries(MUSCLES)
      .filter(([id]) => !träffade.has(id))
      .map(([id, m]) => m.name || id);
  }, [rader]);

  const flik = (aktiv) => ({
    padding: "7px 13px", minHeight: 36, cursor: "pointer", fontSize: 12.5, borderRadius: 14,
    border: `1px solid ${aktiv ? C.lime : C.border}`,
    color: aktiv ? C.lime : C.muted,
    background: aktiv ? volt(.08) : C.card2,
  });

  return (
    <div style={{ padding: "4px 0 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={hdr(19)}>Muskelfördelning</div>
        {onClose && <button onClick={onClose} style={btnText} aria-label="Stäng">Stäng</button>}
      </div>
      <div style={{ fontSize: 12.5, color: C.muted, marginTop: 5, lineHeight: 1.55 }}>
        Volym per muskel, summerad ur övningarnas belastning. Visar vad kroppen
        fått — inte bara vad du gjort.
      </div>

      <div style={{ display: "flex", gap: 7, margin: "14px 0 4px" }}>
        {PERIODER.map(p => (
          <button key={p.id} onClick={() => setDagar(p.id)} data-period={p.id} style={flik(dagar === p.id)}>
            {p.namn}
          </button>
        ))}
      </div>

      {antalPass === 0 ? (
        <div style={{ ...card, padding: 16, marginTop: 14, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
          Inga loggade pass de senaste {dagar} dagarna. Fördelningen räknas ur
          det du loggat — utan pass finns inget att fördela.
        </div>
      ) : (
        <>
          <div style={{ ...label(), margin: "16px 0 10px" }}>
            {antalPass} pass · {totalt.toLocaleString("sv-SE")} kg totalt
          </div>

          {rader.map(r => (
            <div key={r.id} style={{ marginBottom: 13 }} data-muskel="1">
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 13, color: C.text, minWidth: 0 }}>
                  {r.namn}
                  {r.grupp && <span style={{ color: C.muted, fontSize: 11 }}> · {r.grupp}</span>}
                </span>
                <span style={{ fontSize: 12.5, color: C.text2, flexShrink: 0, whiteSpace: "nowrap" }}>
                  {r.kg.toLocaleString("sv-SE")} kg
                </span>
              </div>
              {/* Stapeln är relativ mot periodens tyngsta muskel. Ingen
                  normalisering till procent — den skulle dölja att 4 080 kg och
                  400 kg är olika storleksordningar. */}
              <div style={{ height: 6, borderRadius: 3, background: C.card2, marginTop: 6, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 3,
                  width: `${störst ? Math.max(2, Math.round((r.kg / störst) * 100)) : 0}%`,
                  background: C.lime, transition: "width .4s",
                }} />
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                {r.set} set
              </div>
            </div>
          ))}

          {orörda.length > 0 && (
            <>
              {/* DET SOM SAKNAS ÄR OFTA MER ANVÄNDBART ÄN DET SOM FINNS.
                  En lista över vad man tränat säger inte vad man missat, och
                  obalanser syns bara när det osynliga får en rad. */}
              <div style={{ ...label(C.recovering), margin: "22px 0 8px" }}>
                Inte tränat på {dagar} dagar
              </div>
              <div style={{ fontSize: 12.5, color: C.text2, lineHeight: 1.7 }}>
                {orörda.join(" · ")}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
