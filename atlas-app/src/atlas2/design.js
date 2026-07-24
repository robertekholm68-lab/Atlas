// Askr 2.0 — designsystemet, samlat.
//
// Här bor ALLA visuella beslut. Ingen komponent hittar på egna färger eller
// storlekar; hittar du en hårdkodad hex utanför den här filen är det en bugg.
// Skälet är erfarenhet: förra gången låg paletten på fyra ställen (mobilens C,
// data/tokens.js, styles/global.css och två gradienter i App.jsx) och en
// omfärgning missade två av dem tyst.
//
// KÄLLA: ASKR Brand & UI Style Guide v1.0 (juli 2026). Avvikelser från guiden
// är buggar, inte tolkningar — MED TVÅ MEDVETNA UNDANTAG för tillgänglighet
// (WCAG vinner över guiden när de krockar):
//   · `border` är ljusare än guidens #2A2A2A: kontrollramar (inputs, knappar,
//     klickbara kort) behöver 3:1 mot ytan (WCAG 1.4.11). Guidens mörka linje
//     finns som `hairline` för dekorativa ytor — kortkanter, avdelare — där
//     kontrastkravet inte gäller.
//   · `nodata` är upplyst till AA: ärlighetsprincipen kräver att "för lite
//     data" SYNS, inte göms i svärtan.
//
// Kärnregler ur guiden:
//   · 90/10-regeln — Volt är aldrig mer än ~10 % av en yta. Data, progress och
//     EN primär CTA per vy. Aldrig volt som brödtextfärg.
//   · Siffror är hjältar — nyckeltal i Display (Archivo Expanded), enheten i
//     Mono, liten och grå. Volt för det viktigaste talet per vy — max ett.
//   · 1 px-border på alla kort. Skuggor används inte — djup skapas med yta.
//   · Aldrig gradienter, aldrig fler än två accentnivåer i samma graf.
//   · Alla övergångar: 150 ms ease-out. Hover ljusnar ytan ett steg. Selected
//     är det enda state som får volt-border. Disabled sänker opacitet (40 %),
//     byter aldrig färgton.

export const C = {
  bg: "#0A0A0A",          // Ink — appens och varumärkets bakgrund
  card: "#141414",        // Surface 1 — kortyta, paneler
  card2: "#1B1B1B",       // Surface 2 — upphöjda element, inputs
  border: "#66666E",      // kontrollramar — upplyst till WCAG 1.4.11 (3:1), se ovan
  hairline: "#2A2A2A",    // guidens border — dekorativa kortkanter och avdelare
  track: "#232323",       // spår under progress (volt PÅ #232323, enligt guiden)
  text: "#F5F5F5",        // Bone — primär text och ikoner
  text2: "#9A9A9A",       // Text 2 — sekundär text, brödtext, labels
  muted: "#9A9A9A",       // = Text 2. Behålls som alias: halva appen pekar hit.
  text3: "#5C5C5C",       // Text 3 — disabled, metadata
  lime: "#D4FF00",        // Volt — primär accent. Data, progress, CTA, aktiva states.
  voltDim: "#9BBF00",     // Volt Dim — sekundär datalinje, hover på volt
  voltDeep: "#4A5A10",    // Volt Deep — fyllnad i grafer, selected-glow

  // Statusfärger. Dessa är DATA, inte dekoration — de betyder något och får
  // aldrig bytas mot accenten för att det blir snyggare. Guiden reglerar
  // varumärkesytan; kartans återhämtningssemantik ligger utanför den.
  ready: "#39D98A",
  nearly: "#9BE85C",
  recovering: "#FFD166",
  critical: "#FF5C5C",
  undertrained: "#5B9DD9",
  nodata: "#818997",      // upplyst till AA (4.5:1) — ärlighetsprincipen: "för
                          // lite data" ska SYNAS, inte gömmas i svärtan
};

/**
 * Volt med alfa — selected-tints och glow. ENDA tillåtna genomskinliga volt;
 * en rgba-sträng i en komponent är samma bugg som en hårdkodad hex.
 */
export const volt = a => `rgba(212,255,0,${a})`;

/** Statusfärg för ett återhämtningsvärde. null = inget underlag. */
export function statusColor(status) {
  return ({ ready: C.ready, nearly_ready: C.nearly, recovering: C.recovering,
    critical: C.critical, undertrained: C.undertrained, no_data: C.nodata })[status] || C.nodata;
}

// Typografi enligt guiden:
//   Display — Archivo Expanded Bold. Versaler, tracking +2 %. Rubriker, siffror.
//   UI & brödtext — Inter. Semibold för kortrubriker/knappar, Regular för
//   brödtext. Radavstånd 1.45. Aldrig under 12 px i appen.
//   Data & labels — JetBrains Mono. Versaler, tracking +8 %. Tabelldata,
//   timers, mikrolabels, enheter.
export const HFONT = "'Archivo','Archivo Expanded','Arial Narrow',sans-serif";
export const BFONT = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";
export const MONO = "'JetBrains Mono','SFMono-Regular',Consolas,'Liberation Mono',monospace";

/** Rubrik/nyckeltal i Display. En sak ska vara störst på varje skärm. */
export const hdr = (size = 22, color = C.text) => ({
  fontFamily: HFONT, fontSize: size, fontWeight: 800, fontStretch: "125%",
  textTransform: "uppercase", letterSpacing: "0.02em",
  lineHeight: 1.1, color,
});

/** Mikroetikett i Mono över ett värde — versaler, tracking +8 %. */
export const label = (color = C.text2) => ({
  fontFamily: MONO, fontSize: 10, fontWeight: 500,
  textTransform: "uppercase", letterSpacing: "0.08em", color,
});

/** Enhet/metadata i Mono intill ett nyckeltal ("kg", "kcal", "02:30"). */
export const unit = (color = C.text2, size = 11) => ({
  fontFamily: MONO, fontSize: size, letterSpacing: "0.04em", color,
});

// Knappar enligt guiden: radie 12, Inter Semibold, inga versaler.
// Primär CTA är volt-fylld med ink-text — EN per vy. btnGhost behåller den
// ljusa kontrollramen (border), inte hairline: kanten ÄR knappens avgränsning.
export const btnPrimary = {
  width: "100%", padding: "16px 16px", borderRadius: 12, border: "none",
  background: C.lime, color: "#0A0A0A", cursor: "pointer",
  fontFamily: BFONT, fontSize: 15.5, fontWeight: 600, letterSpacing: 0,
  display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
  minHeight: 44,
  transition: "background 150ms ease-out, opacity 150ms ease-out",
};

export const btnGhost = {
  width: "100%", padding: "14px 16px", borderRadius: 12,
  border: `1px solid ${C.border}`, background: "transparent", color: C.text,
  cursor: "pointer", fontFamily: BFONT, fontSize: 14, fontWeight: 600,
  minHeight: 44,
  transition: "background 150ms ease-out, border-color 150ms ease-out",
};

export const btnText = {
  background: "none", border: "none", color: C.text2,
  fontSize: 13, cursor: "pointer", padding: 10, minHeight: 44,
};

// Kortanatomi: padding 18, radie 20, 1 px-border. Aldrig skugga.
// Kortkanten är dekorativ (hairline); klickbara kort som behöver synlig ram
// sätter borderColor själva (t.ex. selected = volt).
export const card = {
  background: C.card, border: `1px solid ${C.hairline}`,
  borderRadius: 20, padding: 18,
};

/** Kolumnrad med tunna avdelare — nyckeltal, som i skisserna. */
export const statRow = {
  display: "flex",
  borderTop: `1px solid ${C.hairline}`,
  borderBottom: `1px solid ${C.hairline}`,
};
export const statCell = (i) => ({
  flex: 1, textAlign: "center", padding: "14px 4px",
  borderLeft: i ? `1px solid ${C.hairline}` : "none",
});

/**
 * Streck i stället för noll.
 *
 * Genomgående regel i Askr: en nolla påstår att något är mätt och blev noll.
 * Ett streck säger att vi inte vet. Skillnaden är hela produktens själ.
 */
export const DASH = "—";
export const orDash = v => (v === null || v === undefined || Number.isNaN(v)) ? DASH : v;
