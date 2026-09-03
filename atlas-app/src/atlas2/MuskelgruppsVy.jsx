import { useMemo } from "react";
import { C, HFONT, MONO, hdr, label, card } from "./design.js";
import REGIONS from "./body_regions.json";
import figurFram from "../assets/brand/figur-fram.webp";
import figurBak from "../assets/brand/figur-bak.webp";
import { EXERCISES } from "../data/exercises.js";
import { regionState as regionStateDefault } from "./BodyMap2.jsx";

/**
 * MUSKELGRUPPER — ingången till övningsbanken, med kroppen som gränssnitt.
 *
 * Gymlify har en sådan här vy: tolv kort, en figur per kort med muskelgruppen
 * markerad. Den ser bra ut men är STATISK — samma röda bröst oavsett om du
 * bänkade i går eller för en månad sedan.
 *
 * Här färgas varje kort ur DIN återhämtning, med samma regioner, samma figur
 * och samma färgskala som kroppskartan på hemvyn. Bröstet är rött dagen efter
 * bänkpress och grönt tre dagar senare. Det är vad Askr kan som Gymlify inte
 * kan, och vad "kroppen är gränssnittet" betyder i praktiken.
 *
 * GRUPPERNA ÄR ÖVNINGSBANKENS, inte Gymlifys. "Legs and hips" finns inte i
 * Askr; banken har Legs, Glutes och Calves som egna grupper, och kortet ska
 * leda till rätt lista.
 */

/**
 * Grupp → regioner i body_regions.json → vy.
 *
 * Varje grupp har en eller två vyer beroende på var musklerna syns. Rygg visas
 * bakifrån, bröst framifrån, ben från båda hållen eftersom quadriceps och
 * hamstrings sitter på var sin sida.
 */
export const GRUPPER = [
  { id: "Chest", namn: "Bröst", regioner: { front: ["pectoralis_major"] } },
  { id: "Back", namn: "Rygg", regioner: { back: ["latissimus_dorsi", "trapezius", "erector_spinae", "teres_major"] } },
  { id: "Shoulders", namn: "Axlar", regioner: { front: ["deltoids"], back: ["deltoids"] } },
  { id: "Biceps", namn: "Biceps", regioner: { front: ["biceps_brachii"] } },
  { id: "Triceps", namn: "Triceps", regioner: { back: ["triceps_brachii"] } },
  { id: "Core", namn: "Mage", regioner: { front: ["rectus_abdominis", "obliques", "serratus_anterior"] } },
  { id: "Legs", namn: "Ben", regioner: { front: ["quadriceps", "adductors"], back: ["hamstrings"] } },
  { id: "Glutes", namn: "Säte", regioner: { back: ["gluteals"] } },
  { id: "Calves", namn: "Vader", regioner: { front: ["tibialis_anterior"], back: ["calves"] } },
];


/**
 * En figur med gruppens regioner färgade. Samma SVG-teknik som BodyMap2, men
 * bara de regioner som hör till gruppen ritas — resten är figurens egen
 * teckning.
 *
 * INGEN INTERAKTION PÅ REGIONNIVÅ här; hela kortet är knappen. Vid 100 px hög
 * figur går enskilda muskler inte att träffa med ett finger ändå.
 */
function Figur({ vy, regionIds, höjd }) {
  const data = REGIONS[vy];
  return (
    <div style={{ position: "relative", height: höjd, aspectRatio: "415 / 1035" }}>
      <img src={vy === "front" ? figurFram : figurBak} alt="" draggable={false}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain",
          filter: "contrast(1.12)" }} />
      <svg viewBox={data.viewBox} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {/* FÄRGEN SYMBOLISERAR GRUPPEN, INTE DAGSLÄGET.
            Korten färgades först ur användarens återhämtning, som kartan. Men
            den här vyn är en INNEHÅLLSFÖRTECKNING — man letar efter
            ryggövningar, inte efter hur ryggen mår. Med dagsläget blev
            otränade grupper ofärgade och alltså osynliga som val, och färgen
            skiftade från dag till dag utan att gruppen ändrats. */}
        {data.regions.filter(r => regionIds.includes(r.id)).map(r =>
          r.d.map((d, i) => (
            <path key={r.id + i} d={d} fill={C.lime} fillOpacity={0.72}
              style={{ mixBlendMode: "multiply" }} />
          ))
        )}
      </svg>
    </div>
  );
}

export function MuskelgruppsVy({ muscleStates = {}, regionState = regionStateDefault, onVälj, onClose }) {
  const antal = useMemo(() => {
    const per = {};
    EXERCISES.forEach(e => { per[e.group] = (per[e.group] || 0) + 1; });
    return per;
  }, []);

  return (
    <div style={{ padding: "4px 0 24px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div style={hdr(19)}>Muskelgrupper</div>
        {onClose && (
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer", minHeight: 44 }}>
            Stäng
          </button>
        )}
      </div>
      <div style={{ fontSize: 12.5, color: C.muted, marginTop: 5, lineHeight: 1.55 }}>
        Tryck på en grupp för att se dess övningar.
      </div>

      <div style={{
        // TVÅ KOLUMNER, INTE TRE. Gymlify har tre, men deras figurer är
        // beskurna till överkroppen. Askrs är helfigurer — vid tre kolumner
        // blir muskeln en fläck på 20 px. Två ger 150 px höga figurer där
        // formen läses.
        display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 16,
      }}>
        {GRUPPER.map(g => {
          const vyer = Object.keys(g.regioner);
          return (
            <button key={g.id} onClick={() => onVälj && onVälj(g.id)} data-grupp={g.id}
              aria-label={`${g.namn}, ${antal[g.id] || 0} övningar`}
              style={{
                ...card, padding: "10px 6px 9px", cursor: "pointer", textAlign: "center",
                border: `1px solid ${C.border}`, background: C.card, minHeight: 44,
              }}>
              <div style={{ display: "flex", justifyContent: "center", gap: 4, height: 150 }}>
                {vyer.map(vy => (
                  <Figur key={vy} vy={vy} regionIds={g.regioner[vy]} höjd={150} />
                ))}
              </div>
              <div style={{ ...label(), color: C.text, marginTop: 9, fontSize: 12 }}>{g.namn}</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 3 }}>
                {antal[g.id] || 0} övningar
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
