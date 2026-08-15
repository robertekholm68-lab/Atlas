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
import figurFram from "../assets/brand/figur-fram.webp";
import figurBak from "../assets/brand/figur-bak.webp";

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
// Anatomibilden bäddas IN i bygget (se assetsInlineLimit). Som systerfil hann
// den aldrig laddas innan kartan ritades, och i en fristående HTML-fil fanns
// den inte alls — kartan visade då bara färgformerna, utan kroppen under.
const bildUrl = vy => (vy === "front" ? figurFram : figurBak);

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
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain",
            // LJUSARE FIGUR.
            //
            // Bilden mörkades vid genereringen för att de färgade musklerna
            // skulle bära informationen. Med overlay-blandningen behövs det
            // inte längre: färgen tar sin ton ur underlaget i stället för att
            // konkurrera med det, så ett mörkare foto ger bara en mörkare karta.
            //
            // Kontrasten höjs en aning tillsammans med ljusstyrkan. Enbart
            // brightness gör bilden gråare — muskeldefinitionen bleks ut, och
            // det är just den som gör att färgen inte ser påklistrad ut.
            filter: "brightness(1.45) contrast(1.12)",
          }} />
      )}
      <svg viewBox={data.viewBox} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        role="img" aria-label={vy === "front" ? "Muskelkarta framifrån" : "Muskelkarta bakifrån"}>
        {/* MJUK KANT.
            En SVG-path slutar tvärt på en pixel. Muskler gör det inte — de går
            in i varandra, och en knivskarp gräns ovanpå ett foto läses av ögat
            som en dekal. Suddningen låter färgen tona ut mot grannmuskeln.

            Radien är angiven i viewBox-enheter, inte pixlar, så den skalar med
            figuren i stället för att bli grov på en liten skärm. */}
        <defs>
          <filter id={`mjuk-${vy}`} x="-6%" y="-6%" width="112%" height="112%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
        </defs>
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
                filter={`url(#mjuk-${vy})`}
                // FÄRGEN SKA LIGGA I ANATOMIN, INTE OVANPÅ DEN.
                //
                // Tidigare: mixBlendMode "screen" med opacitet 0,72–0,9.
                // "screen" ljusnar bara och tar ingen hänsyn till vad som finns
                // under — ett mörkt veck och en ljus höjdpunkt fick samma
                // färgpålägg. Tillsammans med den höga opaciteten dränktes
                // fotots muskeldefinition just där färgen var som mest
                // intressant, och resultatet såg påklistrat ut.
                //
                // "overlay" behåller fotots ljus och skugga och lägger färgen
                // som en ton ovanpå. Muskeln behåller sin volym. Då behövs
                // dessutom mindre färg för samma läsbarhet, därav den lägre
                // opaciteten.
                //
                // Otränade muskler ritas nästan inte alls — anatomibilden under
                // räcker för att visa att de finns. Det som lyser är det som
                // faktiskt har underlag.
                fillOpacity={st ? (aktiv ? 0.72 : 0.5) : (aktiv ? 0.22 : 0)}
                stroke={aktiv && st ? färg : "none"} strokeWidth={1.5}
                style={{ transition: "fill .5s, fill-opacity .25s", mixBlendMode: "overlay" }} />
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
export function BodyMap2({ muscleStates = {}, onSelect, height = 300, legend = true, kompakt = false, fyll = false }) {
  const [rör, setRör] = useState(null);
  const st = rör ? regionState(rör, muscleStates) : null;

  // `fyll` betyder: ta den höjd som finns kvar i föräldern i stället för ett
  // bestämt antal pixlar. Föräldern är då en flex-kolumn, och kartan är den som
  // får resten — kroppen är gränssnittet, alltså är det kartan som ska växa när
  // det finns plats och krympa när det inte gör det. `minHeight: 0` krävs för
  // att en flex-child ska FÅ krympa; utan den växer den ur skärmen i stället.
  const yttre = fyll
    ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }
    : {};
  const figurer = fyll
    ? { display: "flex", gap: 10, justifyContent: "center", flex: 1, minHeight: 0 }
    : { display: "flex", gap: 10, height, justifyContent: "center" };

  return (
    <div style={yttre}>
      <div style={figurer}>
        {["front", "back"].map(v => (
          <div key={v} style={{ flex: 1, maxWidth: "48%", height: "100%" }}>
            <Figur vy={v} states={muscleStates} onSelect={onSelect} rör={rör} setRör={setRör} />
          </div>
        ))}
      </div>

      {/* Namnet på muskeln man rör vid, med dess faktiska siffra. Utan underlag
          sägs det rakt ut i stället för att visa en nolla. */}
      <div style={{ textAlign: "center", minHeight: kompakt ? 16 : 20, marginTop: kompakt ? 5 : 8, flexShrink: 0, fontFamily: HFONT, fontSize: kompakt ? 11.5 : 12.5, letterSpacing: 1.2, textTransform: "uppercase", color: rör ? C.text : "transparent" }}>
        {rör ? `${NAMN[rör] || rör}${st ? ` · ${Math.round(st.readiness)}%` : " · ingen data"}` : "·"}
      </div>

      {/* Färgnyckeln får ALDRIG tas bort för att spara höjd: färgerna är
          avläsningen, och en karta man inte kan läsa är dekoration. Däremot får
          den bli kortare — samma fem betydelser, färre tecken. */}
      {legend && (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: kompakt ? "3px 10px" : "6px 14px", marginTop: kompakt ? 4 : 6, flexShrink: 0 }}>
          {(kompakt
            ? [["Redo", C.ready], ["Återhämtar", C.recovering], ["Överbelastad", C.critical], ["Otränad", C.undertrained], ["Ingen data", GRUNDTON]]
            : [["Redo att träna", C.ready], ["Återhämtar sig", C.recovering], ["Överbelastad", C.critical], ["Behöver träning", C.undertrained], ["Ej tränad", GRUNDTON]]
          ).map(([l, c]) => (
            <span key={l} style={{ display: "flex", alignItems: "center", gap: kompakt ? 4 : 6, fontSize: kompakt ? 10 : 11, color: C.muted }}>
              <span style={{ width: kompakt ? 7 : 8, height: kompakt ? 7 : 8, borderRadius: 4, background: c }} />{l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export { NAMN as REGIONNAMN, MAP as REGION_MAP, regionState };
