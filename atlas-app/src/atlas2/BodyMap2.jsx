// ATLAS 2.0 — muskelkartan, ren och platt.
//
// Ersätter den renderade figuren med ljuskägla och platta under fötterna.
// Här finns ingen bakgrund alls: siluetten står direkt mot appens svärta, och
// det enda som lyser är muskler med faktiskt underlag.
//
// LAG FRÅN PROJEKTDOKUMENTET: ny grafik får se ut hur som helst, men den MÅSTE
// mappa mot samma 21-muskeltaxonomi. Varje form nedan bär ett riktigt muskel-id
// ur data/muscles.js — inga hittepå-regioner, inga hopslagningar som döljer att
// två muskler har olika status.
//
// KÄNDA LUCKOR (ärvda, dokumenterade i konceptet):
//   serratus_anterior och hip_flexors saknar egen form och ritas inte ut.
//   De räknas fortfarande i motorn — de syns bara inte på kartan än.

import { useState } from "react";
import { C, HFONT, statusColor } from "./design.js";

/* Formerna är medvetet enkla: kroppen ska läsas på en halv sekund i ett gym,
   inte studeras som anatomisk plansch. Koordinatsystem 0 0 200 440. */

const FRAM = [
  ["neck_anterior", "M92 44 h16 v10 h-16 Z"],
  ["trapezius", "M78 54 L100 62 L122 54 L128 66 L100 74 L72 66 Z"],
  ["deltoid_anterior", "M66 70 q-12 4 -14 20 q10 6 18 2 q2 -14 -4 -22 Z"],
  ["deltoid_lateral", "M134 70 q12 4 14 20 q-10 6 -18 2 q-2 -14 4 -22 Z"],
  ["pectoralis_major", "M76 76 q24 -6 48 0 l4 30 q-26 8 -56 0 Z"],
  ["rectus_abdominis", "M84 110 h32 v56 h-32 Z"],
  ["obliques", "M76 112 l6 -2 v50 l-8 -6 Z M124 112 l-6 -2 v50 l8 -6 Z"],
  ["biceps_brachii", "M52 94 q-8 16 -6 34 q10 4 16 -2 q0 -18 -4 -32 Z"],
  ["forearms", "M44 130 q-6 20 -2 40 q10 2 14 -4 q0 -22 -4 -36 Z M156 130 q6 20 2 40 q-10 2 -14 -4 q0 -22 4 -36 Z"],
  ["quadriceps", "M80 176 q-8 40 -4 74 q14 6 22 0 q4 -38 0 -74 Z M120 176 q8 40 4 74 q-14 6 -22 0 q-4 -38 0 -74 Z"],
  ["adductors", "M92 178 q-4 30 0 58 h16 q4 -28 0 -58 Z"],
  ["tibialis_anterior", "M84 262 q-4 40 0 62 q8 4 12 -2 q2 -34 -2 -60 Z M116 262 q4 40 0 62 q-8 4 -12 -2 q-2 -34 2 -60 Z"],
];

const BAK = [
  ["trapezius", "M78 54 L100 60 L122 54 L132 96 L100 106 L68 96 Z"],
  ["deltoid_posterior", "M66 70 q-12 4 -14 20 q10 6 18 2 q2 -14 -4 -22 Z M134 70 q12 4 14 20 q-10 6 -18 2 q-2 -14 4 -22 Z"],
  ["latissimus_dorsi", "M70 98 q30 -8 60 0 l-6 44 q-24 8 -48 0 Z"],
  ["erector_spinae", "M92 100 h16 v66 h-16 Z"],
  ["triceps_brachii", "M52 94 q-8 16 -6 34 q10 4 16 -2 q0 -18 -4 -32 Z M148 94 q8 16 6 34 q-10 4 -16 -2 q0 -18 4 -32 Z"],
  ["forearms", "M44 130 q-6 20 -2 40 q10 2 14 -4 q0 -22 -4 -36 Z M156 130 q6 20 2 40 q-10 2 -14 -4 q0 -22 4 -36 Z"],
  ["gluteals", "M76 168 q24 -6 48 0 q4 24 -6 34 q-18 6 -36 0 q-10 -10 -6 -34 Z"],
  ["hamstrings", "M80 206 q-6 36 -2 62 q14 6 22 0 q2 -32 -2 -62 Z M120 206 q6 36 2 62 q-14 6 -22 0 q-2 -32 2 -62 Z"],
  ["calves", "M82 276 q-6 32 -2 52 q10 4 16 -2 q0 -28 -4 -50 Z M118 276 q6 32 2 52 q-10 4 -16 -2 q0 -28 4 -50 Z"],
];

// Siluetten: en enda kontur som allt annat vilar i. Ingen fyllning som
// konkurrerar med musklerna — bara en svag linje som ger kroppen form.
const SILUETT = `M100 26 q11 0 11 12 q0 10 -5 14 l14 4 q18 4 24 16 q8 16 10 38
  q3 22 -1 34 q-3 10 -9 12 q-3 26 -7 40 q-4 14 -3 30 q1 30 -3 56 q-3 22 -7 44
  q-3 16 -3 28 h-14 q-1 -14 -3 -28 q-3 -22 -5 -44 l-2 -28 l-2 28 q-2 22 -5 44
  q-2 14 -3 28 h-14 q0 -12 -3 -28 q-4 -22 -7 -44 q-4 -26 -3 -56 q1 -16 -3 -30
  q-4 -14 -7 -40 q-6 -2 -9 -12 q-4 -12 -1 -34 q2 -22 10 -38 q6 -12 24 -16 l14 -4
  q-5 -4 -5 -14 q0 -12 11 -12 Z`;

const NAMN = {
  neck_anterior: "Nacke", trapezius: "Kappmuskel", deltoid_anterior: "Främre axel",
  deltoid_lateral: "Sidoaxel", deltoid_posterior: "Bakre axel", pectoralis_major: "Bröst",
  rectus_abdominis: "Raka bukmuskeln", obliques: "Sneda bukmuskler", biceps_brachii: "Biceps",
  triceps_brachii: "Triceps", forearms: "Underarmar", latissimus_dorsi: "Breda ryggmuskeln",
  erector_spinae: "Ryggresare", gluteals: "Säte", quadriceps: "Framsida lår",
  hamstrings: "Baksida lår", adductors: "Insida lår", calves: "Vader",
  tibialis_anterior: "Framsida underben",
};

/**
 * @param muscleStates  { [id]: { status, readiness, ... } } ur bodyState()
 * @param onSelect      (id) => void
 */
export function BodyMap2({ muscleStates = {}, onSelect, height = 380 }) {
  const [vy, setVy] = useState("fram");
  const [rör, setRör] = useState(null);
  const former = vy === "fram" ? FRAM : BAK;

  const färg = id => {
    const s = muscleStates[id];
    // Ingen status eller inget underlag → musklen ritas inte alls. Att färga
    // den grå hade sett ut som ett värde; frånvaro ska läsa som frånvaro.
    if (!s || s.status === "no_data" || s.readiness == null) return null;
    return statusColor(s.status);
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Vyväxlaren: text, inte knappar med ram — inget ska konkurrera med kroppen */}
      <div style={{ display: "flex", justifyContent: "center", gap: 26, marginBottom: 4 }}>
        {[["fram", "Fram"], ["bak", "Bak"]].map(([v, l]) => (
          <button key={v} onClick={() => setVy(v)} style={{
            background: "none", border: "none", cursor: "pointer", padding: "6px 2px",
            fontFamily: HFONT, fontSize: 12.5, fontWeight: 700, letterSpacing: 1.6,
            textTransform: "uppercase", color: vy === v ? C.lime : C.muted,
            borderBottom: `2px solid ${vy === v ? C.lime : "transparent"}`,
          }}>{l}</button>
        ))}
      </div>

      <svg viewBox="0 0 200 440" style={{ width: "100%", height, display: "block" }} role="img" aria-label="Muskelkarta">
        <path d={SILUETT} fill="#121417" stroke="#2A2F36" strokeWidth="1.2" />
        {former.map(([id, d]) => {
          const c = färg(id);
          if (!c) return null;
          const aktiv = rör === id;
          return (
            <path key={id + vy} d={d} fill={c}
              fillOpacity={aktiv ? 0.95 : 0.72}
              stroke={aktiv ? c : "none"} strokeWidth="1.5"
              style={{ cursor: onSelect ? "pointer" : "default", transition: "fill-opacity .25s" }}
              onMouseEnter={() => setRör(id)} onMouseLeave={() => setRör(null)}
              onClick={() => onSelect && onSelect(id)}>
              <title>{NAMN[id] || id}</title>
            </path>
          );
        })}
      </svg>

      {rör && (
        <div style={{ position: "absolute", bottom: 6, left: 0, right: 0, textAlign: "center", fontFamily: HFONT, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: C.text }}>
          {NAMN[rör] || rör}
        </div>
      )}
    </div>
  );
}

export { NAMN as MUSKELNAMN };
