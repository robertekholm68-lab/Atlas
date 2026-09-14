// Askr 2.0 — ikonerna.
//
// Låg i `Nav.jsx` så länge de bara användes av navigeringen. Puls och musik
// hörde aldrig dit, och när de skulle ritas i samma stil hade alternativen
// varit att importera `NavIcon` in i passvyn eller att rita en andra
// uppsättning. Båda är fel, så ikonerna flyttade hit i stället.
//
// EN LINJESTIL, GENOMGÅENDE: 1,7 px, rundade ändar, aldrig fyllda ytor.
// Undantaget är ett TILLSTÅND — ett kopplat pulsband fyller hjärtat, precis
// som en aktiv flik blir lime. Fyllningen betyder något; den är inte dekor.
//
// VARFÖR INTE TECKEN OCH EMOJI. Passvyn ritade ♥ och ♫ som glyfer ur
// teckensnittet. De ärver inte linjevikten, de sitter på olika baslinjer, och
// de ser olika ut på varje telefon — bredvid naven, som ritas som vektor, blev
// skillnaden tydlig. Mätt i webbläsaren: ♡ återgavs hårfint mot navens 1,7 px,
// och ♫ hängde under baslinjen.

import { C } from "./design.js";

/** Linjestilen. Ändras den här ändras alla ikoner — det är hela poängen. */
export const LINJE = { fill: "none", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };

/**
 * @param {string} name   hem | pass | mat | utveckling | coachen | puls | musik
 * @param {boolean} fylld endast `puls`: kopplat band. Se undantaget ovan.
 */
export function Ikon({ name, size = 24, color = C.muted, fylld = false }) {
  const p = { ...LINJE, stroke: color };
  const v = { viewBox: "0 0 24 24", width: size, height: size, "aria-hidden": true, focusable: "false" };

  if (name === "hem") return (
    <svg {...v}><path d="M3 11 L12 3 L21 11" {...p} /><path d="M6 10 v10 h12 V10" {...p} /></svg>
  );

  // HANTEL, INTE BICEPS — OCH DET ÄR MÄTT, INTE TYCKT.
  //
  // Här låg en böjd arm, med motiveringen "styrka, inte en hantel bland andra".
  // Avsikten var rätt och resultatet gick inte att rädda: i 23 px, som är den
  // storlek naven faktiskt ritar, blev armen en cirkel med en krok i — den
  // lästes som en historik- eller ångra-symbol, inte som träning. Fem varianter
  // ritades upp och granskades i sin riktiga storlek; armen föll i alla former
  // (en arm behöver axel, armbåge, underarm och knytnäve, och det finns inte
  // plats för fyra former på 23 px i en 1,7 px-linje). Hanteln läses direkt.
  if (name === "pass") return (
    <svg {...v}>
      <path d="M8 12 h8" {...p} />
      <rect x="4.4" y="8.4" width="3.4" height="7.2" rx="1.2" {...p} />
      <rect x="16.2" y="8.4" width="3.4" height="7.2" rx="1.2" {...p} />
      <path d="M2.5 10.3 v3.4 M21.5 10.3 v3.4" {...p} />
    </svg>
  );

  if (name === "mat") return (
    <svg {...v}><path d="M12 8 q-4 -3 -6 1 q-2 5 2 10 q3 3 4 0 q1 3 4 0 q4 -5 2 -10 q-2 -4 -6 -1 Z" {...p} /><path d="M12 8 V5 q0 -2 2 -2.5" {...p} /></svg>
  );

  if (name === "utveckling") return (
    <svg {...v}><rect x="3" y="14" width="4.5" height="7" rx="1" {...p} /><rect x="9.8" y="9" width="4.5" height="12" rx="1" {...p} /><rect x="16.5" y="4" width="4.5" height="17" rx="1" {...p} /></svg>
  );

  // Pulsen. Fylld = bandet är kopplat, och då är hjärtat ett tillstånd och inte
  // en knapp som väntar. En EKG-linje inuti prövades och ströks: på 23 px blev
  // den gröt.
  if (name === "puls") {
    const d = "M12 20.3 C6.2 16.3 3 12.9 3 9.4 A4.3 4.3 0 0 1 12 7.3 A4.3 4.3 0 0 1 21 9.4 c0 3.5 -3.2 6.9 -9 10.9 Z";
    return <svg {...v}><path d={d} {...p} fill={fylld ? color : "none"} /></svg>;
  }

  // Två sammanbundna noter. Notplattorna ritas som linje, inte fyllda —
  // regeln ovan gäller, och de läses ändå i 23 px (granskat i den storleken).
  if (name === "musik") return (
    <svg {...v}>
      <path d="M9 17.5 V5.6 l10 -2.1 v11.9" {...p} />
      <ellipse cx="6.7" cy="17.6" rx="2.4" ry="2" {...p} />
      <ellipse cx="16.7" cy="15.5" rx="2.4" ry="2" {...p} />
    </svg>
  );

  return (                          // coachen: person, inte pratbubbla — det är någon
    <svg {...v}><circle cx="12" cy="8" r="4" {...p} /><path d="M4.5 21 q0 -6 7.5 -6 q7.5 0 7.5 6" {...p} /></svg>
  );
}
