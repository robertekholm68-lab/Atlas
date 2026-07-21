// ATLAS varumärkesgrafik — kantigt A-märke och startsidans tre ikoner.
//
// Ritas som vektor i stället för bild: skalar skarpt på alla skärmar, kostar
// ingenting i filstorlek, och färgen kan följa temat i stället för att vara
// inbränd i en PNG.

const LIME = "#D4FF3F";

/**
 * A-märket: ett kantigt "A" byggt av två sneda ben och en tvärslå, där högra
 * benet är avhugget upptill så formen läser som ett berg. Samma silhuett som
 * i skissen.
 */
export function AtlasMark({ size = 34, color = LIME, style }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={style} aria-hidden focusable="false">
      {/* vänstra benet */}
      <path d="M8 96 L44 4 L60 4 L24 96 Z" fill={color} />
      {/* högra benet, kortare upptill */}
      <path d="M92 96 L66 30 L50 30 L76 96 Z" fill={color} />
      {/* tvärslån */}
      <path d="M34 62 L70 62 L64 76 L28 76 Z" fill={color} />
    </svg>
  );
}

/** Hela ordmärket: A + ATLAS + undertext. */
export function AtlasLogo({ size = 34, color = "#FFFFFF", mark = LIME, tagline = "TRÄNA. FÖRSTÅ. ÅTERHÄMTA.", hfont, style }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.32, ...style }}>
      <AtlasMark size={size} color={mark} />
      <div>
        <div style={{ fontFamily: hfont, fontSize: size * 0.92, fontWeight: 800, letterSpacing: size * 0.11, color, lineHeight: 1 }}>ATLAS</div>
        {tagline && (
          <div style={{ fontFamily: hfont, fontSize: size * 0.26, letterSpacing: size * 0.055, color: "#8A8F98", marginTop: size * 0.11 }}>{tagline}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Startsidans tre ikoner. Linjer, aldrig fyllda ytor — utom där limen ska peka
 * på det ikonen faktiskt handlar om (belastade muskler, den höga stapeln,
 * stjärnan i skölden).
 */
export function FeatureIcon({ name, size = 40, color = "#FFFFFF", accent = LIME }) {
  const p = { fill: "none", stroke: color, strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };

  if (name === "body") {
    // Kroppssiluett med två markerade muskelgrupper — appens kärna i miniatyr.
    return (
      <svg viewBox="0 0 48 64" width={size} height={size * 1.33} aria-hidden focusable="false">
        <circle cx="24" cy="7" r="5" {...p} />
        <path d="M24 12 v6 M14 20 h20 M14 20 c-3 0-5 2-5 5 v10 M34 20 c3 0 5 2 5 5 v10" {...p} />
        <path d="M16 20 v14 h16 V20" {...p} />
        <path d="M18 34 l-1 16 M30 34 l1 16 M17 50 v10 M31 50 v10" {...p} />
        {/* belastade grupper i lime */}
        <path d="M14 21 c-3 0-5 2-5 5 v8" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        <path d="M34 21 c3 0 5 2 5 5 v8" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        <path d="M18 35 l-1 14" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        <path d="M30 35 l1 14" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "bars") {
    // Tre staplar där den högsta är lime: veckovolym som växer mot sitt tak.
    return (
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden focusable="false">
        <rect x="5" y="30" width="10" height="14" rx="2" {...p} />
        <rect x="19" y="21" width="10" height="23" rx="2" {...p} />
        <rect x="33" y="8" width="10" height="36" rx="2" fill="none" stroke={accent} strokeWidth="2.2" strokeLinejoin="round" />
      </svg>
    );
  }

  // sköld med stjärna: ärliga siffror
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden focusable="false">
      <path d="M24 4 L41 11 v13 c0 11-7 17-17 20 -10-3-17-9-17-20 V11 Z" {...p} />
      <path d="M24 16 l2.6 5.6 6 .8 -4.4 4.3 1.1 6.1 -5.3-2.9 -5.3 2.9 1.1-6.1 -4.4-4.3 6-.8 Z"
        fill="none" stroke={accent} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
