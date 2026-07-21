// DATA: design-tokens, hjälpvärden


// Designspråk 2026-07-21: mörk neutral kropp mot nära svart bakgrund, så att
// muskelfärgerna — det enda som bär information — får lysa utan konkurrens.
const BASE_FILL = "#252A31", BASE_STROKE = "#161A1F", OUTLINE_STROKE = "#454E5A";

const T = {
  bg: { app: "#090B10", surface: "#11151D", raised: "#171C26", muted: "#202632" },
  text: { primary: "#F4F7FA", secondary: "#A7B0BE", muted: "#687385" },
  accent: { primary: "#4DA3FF", secondary: "#9B7CFF", success: "#39D98A", warning: "#FFD166", danger: "#FF5C5C" },
  status: { critical: "#FF4D4D", recovering: "#FF9F43", nearly_ready: "#FFD166", ready: "#39D98A", undertrained: "#4DA3FF", no_data: "#5E6673" },
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

export { BASE_FILL, T, WORKOUT_COLOR, SOURCE_LABEL, QUALITY, now, H, STATE_COL, btn, overlay, modal, lbl, input, stepBtn };
