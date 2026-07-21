// DATA: design-tokens, hjälpvärden


// Designspråk 2026-07-21: mörk neutral kropp mot nära svart bakgrund, så att
// muskelfärgerna — det enda som bär information — får lysa utan konkurrens.
// Kroppens grundfärg. Mörkare sedan designspråket 2026-07-21: en mörk kropp gör att
// de färgade musklerna lyser i stället för att smälta ihop med grundtonen.
const BASE_FILL = "#1A1D22", BASE_STROKE = "#0E1013", OUTLINE_STROKE = "#3A424D";

// Kondenserad grotesk i versaler för rubriker — samma stack som mobilen.
const HFONT = "'Roboto Condensed','Arial Narrow',sans-serif-condensed,sans-serif";
const hdr = (size = 22) => ({ fontFamily: HFONT, fontSize: size, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6, lineHeight: 1.05 });

const T = {
  bg: { app: "#0A0A0A", surface: "#141414", raised: "#181818", muted: "#232323" },
  text: { primary: "#FFFFFF", secondary: "#8A8F98", muted: "#5E6673" },
  // EN accent: lime. secondary pekar på samma färg så att gamla anropsställen blir
  // rätt i stället för att lysa i en avvikande ton. Statusfärgerna nedan är DATA
  // och får aldrig bytas mot accenten — de betyder något.
  accent: { primary: "#D4FF3F", secondary: "#D4FF3F", success: "#39D98A", warning: "#FFD166", danger: "#FF5C5C" },
  status: { critical: "#FF5C5C", recovering: "#FFD166", nearly_ready: "#9BE85C", ready: "#39D98A", undertrained: "#5B9DD9", no_data: "#5E6673" },
  statusLabel: { critical: "Critical", recovering: "Recovering", nearly_ready: "Nearly Ready", ready: "Ready", undertrained: "Undertrained", no_data: "No Data" },
};

const WORKOUT_COLOR = { Novice: "#39D98A", Intermediate: "#4DA3FF", Advanced: "#FF5C5C", Helkropp: "#9B7CFF", Kettlebell: "#FFD166" };

const SOURCE_LABEL = { livsmedelsverket: "Livsmedelsverket", off: "Open Food Facts", gs1: "GS1/Validoo", user: "Egen produkt", atlas: "ATLAS" };

const QUALITY = {
  verified: { dot: "●", label: "Verifierad källa", desc: "Direkt från auktoritativ källa (Livsmedelsverket), oförändrat värde." },
  calculated: { dot: "◑", label: "Beräknad", desc: "Uträknad av ATLAS från verifierade källvärden (t.ex. portion ur värde per 100 g)." },
  external: { dot: "◐", label: "Extern produktdata", desc: "Produktdata från extern källa (Open Food Facts), ej verifierad av ATLAS." },
  user_confirmed: { dot: "✓", label: "Användarbekräftad", desc: "Du har jämfört värdena mot förpackningen och bekräftat dem." },
  ai_estimated: { dot: "○", label: "Uppskattad", desc: "ATLAS uppskattade näringen från en ofullständig måltidsbeskrivning (regelbaserat, ej verifierat)." },
  unverified: { dot: "○", label: "Ej verifierad", desc: "Uppgiften är inte tillräckligt kontrollerad." },
  // bakåtkompatibla alias
  exact: { dot: "●", label: "Verifierad källa", desc: "Direkt från auktoritativ källa." },
  estimated: { dot: "○", label: "Uppskattad", desc: "Regelbaserad uppskattning, ej verifierad." },
};

const now = Date.now();

const H = h => h * 3600000;

const STATE_COL = { ready: "#39D98A", nearly_ready: "#9BE85C", recovering: "#FFD166", critical: "#FF5C5C", undertrained: "#5B9DD9", no_data: "#5E6673" };

const btn = {
  primary: { background: `linear-gradient(180deg, #62b0ff, ${T.accent.primary})`, color: "#fff", border: "none", borderRadius: 10, padding: "11px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", boxShadow: "0 6px 16px -6px rgba(77,163,255,0.6), inset 0 1px 0 rgba(255,255,255,0.25)" },
  pill: { background: T.bg.surface, color: T.text.secondary, border: `1px solid ${T.bg.muted}`, borderRadius: 10, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontWeight: 500 },
  icon: { background: T.bg.raised, color: T.text.secondary, border: `1px solid ${T.bg.muted}`, borderRadius: 9, width: 34, height: 34, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  viewToggle: { background: T.bg.raised, color: T.text.muted, border: `1px solid ${T.bg.muted}`, borderRadius: 8, width: 34, height: 34, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  tag: { border: "none", borderRadius: 7, padding: "6px 11px", fontSize: 12.5, cursor: "pointer" },
};

const overlay = { position: "fixed", inset: 0, background: "rgba(4,6,10,0.7)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 };

const modal = { background: T.bg.surface, border: `1px solid ${T.bg.muted}`, borderRadius: 16, padding: "20px 22px", width: "100%", maxWidth: 460, maxHeight: "88vh", overflowY: "auto", animation: "fadeIn 0.2s ease" };

const lbl = { fontSize: 11, color: T.text.muted, textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 6 };

const input = { background: T.bg.raised, border: `1px solid ${T.bg.muted}`, borderRadius: 7, padding: "8px 10px", color: T.text.primary, fontSize: 14, width: "100%" };

const stepBtn = { width: 40, height: 40, borderRadius: 8, border: "none", background: T.bg.muted, color: T.text.primary, fontSize: 22, fontWeight: 700, cursor: "pointer", flexShrink: 0 };

export { BASE_FILL, HFONT, hdr, T, WORKOUT_COLOR, SOURCE_LABEL, QUALITY, now, H, STATE_COL, btn, overlay, modal, lbl, input, stepBtn };
