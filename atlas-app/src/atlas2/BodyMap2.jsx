// Askr 2.0 — muskelkartan, anatomisk och ren.
//
// Vad som ändrades mot nuvarande appen: den renderade figuren låg som en
// RASTERBILD med blå rymdgradient, gloria och en platta under fötterna
// inbakade i själva bilden — det gick alltså inte att färga bort. Här används
// i stället de anatomiska VEKTORFORMERNA som låg ovanpå den bilden, utan
// bilden. Resultatet: riktig muskelanatomi mot appens svärta, inget annat.
// 7 kB i stället för 750 kB base64.
//
// LAG: formerna bär samma muskel-id som förut och mappar mot 21-taxonomin.
//
// KÄND BEGRÄNSNING: figurens regioner är grövre än taxonomin på tre ställen —
// "deltoids" är EN form medan motorn skiljer på främre, sidre och bakre axel,
// och external_obliques/teres_major motsvarar obliques respektive del av ryggen.
// En region färgas efter den av sina muskler som är MINST återhämtad, så en
// trött delmuskel aldrig göms bakom en utvilad. Riktig uppdelning kräver
// per-muskel-SVG som vi inte har.

import { useState } from "react";
import { C, HFONT, statusColor } from "./design.js";
import REGIONS from "./body_regions.json";

// Figurens region → muskel-id:n i 21-taxonomin.
const MAP = {
  pectoralis_major: ["pectoralis_major"],
  deltoids: ["deltoid_anterior", "deltoid_lateral", "deltoid_posterior"],
  biceps_brachii: ["biceps_brachii"],
  triceps_brachii: ["triceps_brachii"],
  forearms: ["forearms"],
  rectus_abdominis: ["rectus_abdominis"],
  external_obliques: ["obliques"],
  trapezius: ["trapezius"],
  quadriceps: ["quadriceps"],
  adductors: ["adductors"],
  tibialis_anterior: ["tibialis_anterior"],
  serratus_anterior: ["serratus_anterior"],
  latissimus_dorsi: ["latissimus_dorsi"],
  teres_major: ["latissimus_dorsi"],
  erector_spinae: ["erector_spinae"],
  gluteals: ["gluteals"],
  hamstrings: ["hamstrings"],
  calves: ["calves"],
};

const NAMN = {
  pectoralis_major: "Bröst", deltoids: "Axlar", biceps_brachii: "Biceps",
  triceps_brachii: "Triceps", forearms: "Underarmar", rectus_abdominis: "Mage",
  external_obliques: "Sneda bukmuskler", trapezius: "Kappmuskel", quadriceps: "Framsida lår",
  adductors: "Insida lår", tibialis_anterior: "Framsida underben", serratus_anterior: "Sågmuskel",
  latissimus_dorsi: "Breda ryggmuskeln", teres_major: "Ryggen", erector_spinae: "Ryggresare",
  gluteals: "Säte", hamstrings: "Baksida lår", calves: "Vader",
};

// Otränad muskel: syns som anatomi men läser inte som ett värde.
const GRUNDTON = "#2E333B";

// Den detaljerade anatomibilden ligger UNDER muskelformerna. Den låg tidigare
// som 750 kB base64 inne i SVG:n tillsammans med en blå bakgrund — men den
// bakgrunden kom aldrig från bilden, den kom från CSS i gamla vyn. Bilden
// själv är 73 % genomskinlig: bara kroppen, ingen platta, ingen gloria.
// Här ligger den som extern webp (39 kB), avmättad och mörkad så att de
// färgade musklerna får bära informationen.
const bildUrl = vy => new URL(`figur-${vy === "front" ? "fram" : "bak"}.webp`, document.baseURI).href;

/** Regionens tillstånd = den av dess muskler som är MINST återhämtad. */
function regionState(regionId, states) {
  const ids = MAP[regionId] || [regionId];
  let vald = null;
  ids.forEach(id => {
    const s = states[id];
    if (!s || s.status === "no_data" || s.readiness == null) return;
    if (!vald || s.readiness < vald.readiness) vald = s;
  });
  return vald;
}

function Figur({ vy, states, onSelect, rör, setRör }) {
  const data = REGIONS[vy];
  const [bildOk, setBildOk] = useState(true);
  if (!data) return null;
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Anatomin. Saknas filen faller vyn tillbaka på enbart muskelformerna —
          färre detaljer, men fortfarande läsbar och fortfarande sann. */}
      {bildOk && (
        <img src={bildUrl(vy)} alt="" onError={() => setBildOk(false)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
      )}
      <svg viewBox={data.viewBox} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        role="img" aria-label={vy === "front" ? "Muskelkarta framifrån" : "Muskelkarta bakifrån"}>
      {data.regions.map(r => {
        const st = regionState(r.id, states);
        const färg = st ? statusColor(st.status) : GRUNDTON;
        const aktiv = rör === r.id;
        return (
          <g key={r.id} data-region={r.id}
            style={{ cursor: onSelect ? "pointer" : "default" }}
            onMouseEnter={() => setRör(r.id)} onMouseLeave={() => setRör(null)}
            onClick={() => onSelect && onSelect(r.id)}>
            <title>{NAMN[r.id] || r.id}{st ? ` — ${Math.round(st.readiness)}%` : " — ingen data"}</title>
            {r.d.map((d, i) => (
              <path key={i} d={d} fill={färg}
                // Otränade muskler ritas nästan inte alls — anatomibilden under
                // räcker för att visa att de finns. Det som lyser är det som
                // faktiskt har underlag.
                fillOpacity={st ? (aktiv ? 0.9 : 0.72) : (aktiv ? 0.28 : 0)}
                stroke={aktiv && st ? färg : "none"} strokeWidth={1.5}
                style={{ transition: "fill .5s, fill-opacity .25s", mixBlendMode: "screen" }} />
            ))}
          </g>
        );
      })}
      </svg>
    </div>
  );
}

/**
 * Fram och bak sida vid sida, som i skisserna. Ingen bakgrund, ingen gloria,
 * ingen platta — figurerna står mot appens svärta.
 */
export function BodyMap2({ muscleStates = {}, onSelect, height = 300, legend = true }) {
  const [rör, setRör] = useState(null);
  const st = rör ? regionState(rör, muscleStates) : null;

  return (
    <div>
      <div style={{ display: "flex", gap: 10, height, justifyContent: "center" }}>
        {["front", "back"].map(v => (
          <div key={v} style={{ flex: 1, maxWidth: "48%", height: "100%" }}>
            <Figur vy={v} states={muscleStates} onSelect={onSelect} rör={rör} setRör={setRör} />
          </div>
        ))}
      </div>

      {/* Namnet på muskeln man rör vid, med dess faktiska siffra. Utan underlag
          sägs det rakt ut i stället för att visa en nolla. */}
      <div style={{ textAlign: "center", minHeight: 20, marginTop: 8, fontFamily: HFONT, fontSize: 12.5, letterSpacing: 1.2, textTransform: "uppercase", color: rör ? C.text : "transparent" }}>
        {rör ? `${NAMN[rör] || rör}${st ? ` · ${Math.round(st.readiness)}%` : " · ingen data"}` : "·"}
      </div>

      {legend && (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px 14px", marginTop: 6 }}>
          {[["Redo att träna", C.ready], ["Återhämtar sig", C.recovering],
            ["Överbelastad", C.critical], ["Behöver träning", C.undertrained], ["Ej tränad", GRUNDTON]].map(([l, c]) => (
            <span key={l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.muted }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: c }} />{l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export { NAMN as REGIONNAMN, MAP as REGION_MAP, regionState };
