// Askr 2.0 — designsystemet, samlat.
//
// Här bor ALLA visuella beslut. Ingen komponent hittar på egna färger eller
// storlekar; hittar du en hårdkodad hex utanför den här filen är det en bugg.
// Skälet är erfarenhet: förra gången låg paletten på fyra ställen (mobilens C,
// data/tokens.js, styles/global.css och två gradienter i App.jsx) och en
// omfärgning missade två av dem tyst.

export const C = {
  bg: "#0A0A0A",          // grundytan allt ritas på
  card: "#141414",
  card2: "#181818",
  border: "#232323",
  text: "#FFFFFF",
  text2: "#C8CCD2",       // brödtext på mörkt
  muted: "#8A8F98",       // sekundärt, etiketter
  lime: "#D4FF3F",        // ENDA accenten

  // Statusfärger. Dessa är DATA, inte dekoration — de betyder något och får
  // aldrig bytas mot accenten för att det blir snyggare.
  ready: "#39D98A",
  nearly: "#9BE85C",
  recovering: "#FFD166",
  critical: "#FF5C5C",
  undertrained: "#5B9DD9",
  nodata: "#5E6673",
};

/** Statusfärg för ett återhämtningsvärde. null = inget underlag. */
export function statusColor(status) {
  return ({ ready: C.ready, nearly_ready: C.nearly, recovering: C.recovering,
    critical: C.critical, undertrained: C.undertrained, no_data: C.nodata })[status] || C.nodata;
}

// Kondenserad grotesk för rubriker, neutral grotesk för brödtext.
export const HFONT = "'Roboto Condensed','Arial Narrow',sans-serif-condensed,sans-serif";
export const BFONT = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";

/** Rubrikstil. En sak ska vara störst på varje skärm — använd steget medvetet. */
export const hdr = (size = 22, color = C.text) => ({
  fontFamily: HFONT, fontSize: size, fontWeight: 800,
  textTransform: "uppercase", letterSpacing: size > 30 ? 0.4 : 1,
  lineHeight: 1.1, color,
});

/** Liten versaletikett över ett värde. */
export const label = (color = C.muted) => ({
  fontFamily: HFONT, fontSize: 10.5, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: 1.4, color,
});

// Knappar. Pillerform genomgående; primär är lime med SVART text.
export const btnPrimary = {
  width: "100%", padding: "18px 16px", borderRadius: 999, border: "none",
  background: C.lime, color: "#0A0A0A", cursor: "pointer",
  fontFamily: HFONT, fontSize: 16, fontWeight: 800,
  textTransform: "uppercase", letterSpacing: 1.3,
  display: "flex", alignItems: "center", justifyContent: "center", gap: 14,
};

export const btnGhost = {
  width: "100%", padding: "15px 16px", borderRadius: 999,
  border: `1px solid ${C.border}`, background: "transparent", color: C.text,
  cursor: "pointer", fontFamily: HFONT, fontSize: 14, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: 1.2,
};

export const btnText = {
  background: "none", border: "none", color: C.muted,
  fontSize: 13, cursor: "pointer", padding: 10,
};

export const card = {
  background: C.card, border: `1px solid ${C.border}`,
  borderRadius: 16, padding: 16,
};

/** Kolumnrad med tunna avdelare — nyckeltal, som i skisserna. */
export const statRow = {
  display: "flex",
  borderTop: `1px solid ${C.border}`,
  borderBottom: `1px solid ${C.border}`,
};
export const statCell = (i) => ({
  flex: 1, textAlign: "center", padding: "14px 4px",
  borderLeft: i ? `1px solid ${C.border}` : "none",
});

/**
 * Streck i stället för noll.
 *
 * Genomgående regel i Askr: en nolla påstår att något är mätt och blev noll.
 * Ett streck säger att vi inte vet. Skillnaden är hela produktens själ.
 */
export const DASH = "—";
export const orDash = v => (v === null || v === undefined || Number.isNaN(v)) ? DASH : v;
