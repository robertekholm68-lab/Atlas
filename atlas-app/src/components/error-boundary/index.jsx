// KOMPONENT: felgräns. Om något kastar under rendering ska appen inte bli en vit skärm.
// Viktigast av allt: data ligger kvar i webbläsarens lagring även när gränssnittet
// kraschar — så det första reservvyn erbjuder är att RÄDDA UT den till en fil.
// Reservvyn har därför inga beroenden till appens state, tokens eller motorer som
// kan vara det som gick sönder; den bygger sin backup direkt ur localStorage.
import React from "react";

const BG = "#090B10", CARD = "#12161F", LINE = "#232A36";
const TEXT = "#E6EAF0", MUTED = "#8A94A3", BLUE = "#4DA3FF", AMBER = "#FFD166";

// Fristående backup — medvetet en egen, minimal kopia utan importer, så den fungerar
// även om felet ligger i backup-motorn.
function rescueDownload() {
  try {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("atlas.") )) data[k] = localStorage.getItem(k);
    }
    const payload = { app: "Askr", backupVersion: 1, createdAt: new Date().toISOString(), rescued: true, keys: Object.keys(data).length, data };
    const d = new Date(), p = n => String(n).padStart(2, "0");
    const name = `atlas-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return Object.keys(data).length;
  } catch (e) { return -1; }
}

const btn = (bg, fg) => ({ padding: "11px 18px", borderRadius: 10, border: bg === "transparent" ? `1px solid ${LINE}` : "none", background: bg, color: fg, fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });

export class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null, saved: null, details: false }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    try { console.error("Askr-fel:", error, info && info.componentStack); } catch (e) { }
  }
  reset = () => {
    this.setState({ error: null, saved: null, details: false });
    if (this.props.onReset) this.props.onReset();
  };
  render() {
    const { error, saved, details } = this.state;
    if (!error) return this.props.children;
    const compact = !!this.props.compact;

    return (
      <div style={{ background: compact ? "transparent" : BG, color: TEXT, minHeight: compact ? 0 : "100vh", padding: compact ? 0 : "40px 20px", fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", boxSizing: "border-box" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", background: CARD, border: `1px solid ${LINE}`, borderRadius: 16, padding: "22px 22px 20px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: 1, color: AMBER, fontWeight: 700, marginBottom: 8 }}>NÅGOT GICK FEL</div>
          <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 10 }}>
            {compact ? "Den här vyn kunde inte visas" : "Askr kunde inte visa sidan"}
          </div>
          <div style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.6, marginBottom: 16 }}>
            <b style={{ color: TEXT }}>Din data är kvar.</b> Allt du loggat ligger sparat i webbläsaren — det är visningen som slutade fungera, inte lagringen.
            {compact ? " Prova en annan flik, eller ladda om sidan." : " Ladda om sidan, så brukar det lösa sig."}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <button onClick={this.reset} style={btn(BLUE, "#08101c")}>Försök igen</button>
            {!compact && <button onClick={() => window.location.reload()} style={btn("transparent", TEXT)}>Ladda om sidan</button>}
            <button onClick={() => this.setState({ saved: rescueDownload() })} style={btn("transparent", TEXT)}>Spara backup</button>
          </div>

          {saved != null && (
            <div style={{ fontSize: 12.5, color: saved > 0 ? "#39D98A" : AMBER, marginBottom: 14, lineHeight: 1.5 }}>
              {saved > 0 ? `Backup sparad med ${saved} nycklar. Den kan läsas in igen under Profil → Datasäkerhet.` : "Kunde inte spara backup härifrån — prova att ladda om sidan först."}
            </div>
          )}

          <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 12 }}>
            <button onClick={() => this.setState({ details: !details })} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
              {details ? "Dölj teknisk information" : "Visa teknisk information"}
            </button>
            {details && (
              <pre style={{ marginTop: 9, fontSize: 11, color: MUTED, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 180, overflow: "auto", background: BG, padding: 11, borderRadius: 8 }}>
                {String((error && error.stack) || error)}
              </pre>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
