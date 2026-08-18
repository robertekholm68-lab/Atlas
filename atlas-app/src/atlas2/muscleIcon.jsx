// MINIATYR: KROPPSSILUETT MED PRIMÄRMUSKELN MARKERAD.
//
// Första försöket var piktogram per RÖRELSEMÖNSTER — squat, curl, press. De
// förkastades av Robert, och han hade rätt: vid 20 px gick de flesta inte att
// skilja åt (squat, lunge, core och vertical pull blev samma streckgubbe), och
// de svarade dessutom på fel fråga. Rörelsemönstret står redan i klartext på
// raden; det som skiljer övningar åt är VILKEN MUSKEL de belastar.
//
// Det här är också appens egen logik: kroppen är gränssnittet. Samma
// body_regions.json som driver den stora kroppskartan driver miniatyren, så en
// övning ser likadan ut var man än möter den.
//
// FRAM ELLER BAK VÄLJS AV MUSKELN. Latsdrag visar ryggen, bänkpress bröstet.
// Att alltid visa framsidan hade gjort halva banken oläslig.

import REGIONS from "./body_regions.json";

/**
 * Muskel-id i övningsbanken som inte har en egen region i kartan.
 *
 * De tre deltoiderna ritas som EN axelregion — kartan skiljer dem inte, och vid
 * 20 px vore skillnaden ändå osynlig. `obliques` heter `external_obliques` i
 * kartan; ren namnskillnad.
 */
const ALIAS = {
  deltoid_anterior: "deltoids",
  deltoid_lateral: "deltoids",
  deltoid_posterior: "deltoids",
  obliques: "external_obliques",
};

/**
 * BESKÄRNING TILL FIGUREN.
 *
 * Kartans viewBox är 500×1020 men figuren ligger bara i mitten (x 80–420,
 * y 130–885) — resten är tomrum som den stora vyn behöver för layouten. I en
 * 30 px-miniatyr betyder det att figuren blir hälften så stor som den kunde
 * vara och musklerna reduceras till prickar.
 *
 * Räknas ur de faktiska koordinaterna i stället för att hårdkodas, så en
 * uppdatering av body_regions.json inte tyst ger fel ram.
 */
function beskärning(vy) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of REGIONS[vy].regions) {
    for (const d of r.d) {
      const tal = d.match(/-?\d+\.?\d*/g) || [];
      for (let i = 0; i + 1 < tal.length; i += 2) {
        const x = parseFloat(tal[i]), y = parseFloat(tal[i + 1]);
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  const marginal = 12;
  return `${x0 - marginal} ${y0 - marginal} ${x1 - x0 + marginal * 2} ${y1 - y0 + marginal * 2}`;
}

const BOX = { front: beskärning("front"), back: beskärning("back") };

const idx = {};
for (const vy of ["front", "back"]) {
  for (const r of REGIONS[vy].regions) {
    // Finns muskeln i BÅDA vyerna (trapezius, deltoids, forearms) vinner den
    // första — front. Godtyckligt men konsekvent, och de musklerna syns ändå.
    if (!idx[r.id]) idx[r.id] = { vy, id: r.id };
  }
}

/** Regionen för ett muskel-id, eller null. */
export function regionFörMuskel(muscleId) {
  const id = ALIAS[muscleId] || muscleId;
  return idx[id] || null;
}

/** Övningens primärmuskel — den med högst aktiveringsfaktor. */
export function primärMuskel(exercise) {
  const akt = (exercise && exercise.activation) || [];
  if (!akt.length) return null;
  return akt.reduce((a, b) => (b.factor > a.factor ? b : a)).muscleId;
}

/**
 * Miniatyren. Grå kroppskontur, primärmuskeln i volt.
 *
 * Konturen ritas ur ALLA regioner i den valda vyn — det ger en igenkännbar
 * kroppsform utan att behöva ett separat siluettlager. Utan konturen skulle en
 * ensam markerad muskel sväva i tomma intet och vara omöjlig att placera.
 */
export function MuskelIkon({ exercise, size = 34, färg = "#D4FF00", kontur = "#3A3A3A" }) {
  const muskel = primärMuskel(exercise);
  const region = muskel ? regionFörMuskel(muskel) : null;
  const vy = region ? region.vy : "front";
  const markerad = region ? region.id : null;
  const box = BOX[vy];
  const alla = REGIONS[vy].regions;

  return (
    <svg width={size} height={size} viewBox={box} aria-hidden="true"
      style={{ display: "block" }} preserveAspectRatio="xMidYMid meet">
      {alla.map(r => (
        <g key={r.id}>
          {r.d.map((d, i) => (
            <path key={i} d={d} fill={r.id === markerad ? färg : kontur} />
          ))}
        </g>
      ))}
    </svg>
  );
}
