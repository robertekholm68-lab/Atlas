// Askr 2.0 — bottennavigering.
//
// Fem flikar enligt skisserna. Aktiv flik markeras med lime — inget annat i
// raden får vara lime, annars slutar det betyda "du är här".
//
// IKONERNA BOR I `ikoner.jsx`. De låg här så länge bara naven använde dem;
// puls och musik hörde aldrig till navigeringen, och en andra uppsättning i
// passvyn hade betytt två linjestilar som glider isär.

import { C, HFONT } from "./design.js";
import { MOBIL_MAX } from "./layout.js";
import { Ikon } from "./ikoner.jsx";

// Kvar som namn eftersom Shell.jsx och naven båda ritar flikikoner. Ritandet
// självt gör `Ikon`.
export function NavIcon(props) { return <Ikon {...props} />; }

// EN lista, två skal. Bottennaven (mobil) och sidopanelen (desktop) läser samma
// flikar — annars är det bara en tidsfråga innan den ena får en flik den andra
// saknar, precis som paletten en gång låg på fyra ställen.
export const FLIKAR = [
  ["hem", "Hem"], ["pass", "Pass"], ["mat", "Mat"], ["utveckling", "Utveckling"], ["coachen", "Coachen"],
];

export function BottomNav({ aktiv, onChange }) {
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40,
      maxWidth: MOBIL_MAX, margin: "0 auto",
      background: "rgba(10,10,10,0.94)", backdropFilter: "blur(12px)",
      borderTop: `1px solid ${C.border}`,
      display: "flex", paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {FLIKAR.map(([id, l]) => {
        const på = aktiv === id;
        return (
          <button key={id} onClick={() => onChange(id)} aria-current={på ? "page" : undefined} style={{
            flex: 1, background: "none", border: "none", cursor: "pointer",
            padding: "9px 0 11px", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 4, color: på ? C.lime : C.muted,
          }}>
            <NavIcon name={id} size={23} color={på ? C.lime : C.muted} />
            <span style={{ fontFamily: HFONT, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase" }}>{l}</span>
          </button>
        );
      })}
    </nav>
  );
}
