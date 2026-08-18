// MINIATYRIKONER PER RÖRELSEMÖNSTER.
//
// 157 av 160 övningar saknar foto — riktiga bilder kräver generering övning
// för övning, ett separat och betydligt större jobb. Men listan ska gå att
// känna igen på en blick redan i dag, och det finns bara 20 rörelsemönster.
// En ikon per MÖNSTER, inte per övning, täcker alla 160 direkt.
//
// FOTONA ÄR STEGET UPP, INTE EN KONKURRENT. bildIkon nedan används bara när
// bildFör(id) inte hittar en riktig bild — samma fallback-ordning som gäller
// överallt i appen. Den dagen en övning får sitt eget foto ersätts ikonen
// automatiskt, utan att något här behöver ändras.
//
// STILEN ÄR LINJETECKNING, INTE ILLUSTRATION. Samma vikt och radie som resten
// av gränssnittets ikoner (strokeWidth 1.6, rundade ändar) — en ikon ska kännas
// som en del av appen, inte som en importerad clipart.

const STRECK = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };

/** En liggande streckgubbe/redskap per mönster. viewBox 0 0 32 32 genomgående. */
const IKONER = {
  Squat: "M16 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M16 8v7 M11 15h10 M11 15l-2 9 M21 15l2 9 M9 27h4 M19 27h4",
  Hinge: "M14 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M14 6l-3 8 M11 14l2 12 M11 14l7 3 M18 17l3 9 M4 20h8",
  Lunge: "M14 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M14 6v6 M14 12l-6 4 M8 16l-1 7 M14 12l5 3 M19 15l2 8 M6 27h4 M17 27h5",
  Extension: "M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M8 10v6l8 2 M16 18h9 M8 16l2 10 M10 26h4 M25 16l1-4 M25 12h4",
  "Horizontal Push": "M6 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M6 9v6 M6 12h10 M6 12l-2 9 M6 21h3 M16 12l3-3 M16 12l3 3 M19 9v6",
  "Horizontal Pull": "M8 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M8 9v6 M8 12h10 M8 12l-2 9 M8 21h3 M22 6l-4 6 M22 6h-5 M22 6v5",
  "Vertical Push": "M16 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M16 6v8 M12 14h8 M12 14l-2 9 M18 14l2 9 M10 27h4 M20 27h4 M12 4v6 M20 4v6",
  "Vertical Pull": "M16 22a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z M16 22v-8 M12 14h8 M12 14l2-9 M18 14l-2-9 M10 3h4 M20 3h4",
  Curl: "M6 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M6 9v7 M6 16l3 8 M6 16l6 1 M12 17l4-8 M12 17l4 4 M9 27h4",
  Fly: "M16 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M16 6v8 M16 14l-9 -3 M16 14l9 -3 M12 14l-3 9 M20 14l3 9 M10 26h4 M20 26h4",
  Raise: "M16 22a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z M16 22v-8 M12 14h8 M12 14l-4 -8 M20 14l4 -8",
  Shrug: "M16 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M16 6v6 M10 12h12 M10 12l-2 8 M22 12l2 8 M9 27h4 M19 27h4 M7 8l3 3 M25 8l-3 3",
  Core: "M16 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M16 8v6 M13 14h6 M13 20l3-6 3 6 M13 20l-3 6 M19 20l3 6",
  Bridge: "M6 22a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z M6 22l4-6 M10 16l8 0 M18 16l6 6 M18 16l-2 6",
  Calves: "M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M12 8v9 M12 17h4 M16 17v6 M12 26h8 M9 26h1",
  "Incline Push": "M6 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M6 12v6 M6 15h9 M6 18l-2 9 M6 27h3 M15 15l4-5 M15 15l4 4 M19 8v6",
  Carry: "M16 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M16 6v9 M13 15h6 M13 15l-2 12 M19 15l2 12 M11 27h4 M21 27h4 M9 12h4 M23 12h-4",
  Rotation: "M16 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M16 8v6 M16 14l-6 3 M16 14l6-3 M12 21l4-4 M20 21l-4-4 M10 27h4 M18 27h4",
  Push: "M8 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M8 9v6 M8 12h9 M8 12l-2 9 M8 21h3 M17 12l4-4",
  Pull: "M8 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M8 9v6 M8 12h9 M8 12l-2 9 M8 21h3 M21 8l-4 4",
};

/** Vilket mönster som helst utan egen ikon får en neutral hantel — hellre en
    generisk symbol än ingen bild alls. */
const FALLBACK = "M9 16h14 M9 12v8 M23 12v8 M6 14v4 M26 14v4";

/**
 * Ikonen för en övning, som ett `<path d="…">`-attribut. Alltid en sträng —
 * fallbacken garanterar det, så anropande kod aldrig behöver kontrollera null.
 */
export function ikonFörMönster(pattern) {
  return IKONER[pattern] || FALLBACK;
}

/** Piktogram-komponenten. viewBox 0 0 32 32, färgen ärvs via currentColor så
    den följer texten den står bredvid utan egen färgprop. */
export function ÖvningsIkon({ pattern, size = 32, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <path d={ikonFörMönster(pattern)} {...STRECK} />
    </svg>
  );
}
