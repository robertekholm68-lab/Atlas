// ATLAS 2.0 — bottennavigering.
//
// Fem flikar enligt skisserna. Ikonerna ritas som vektor i samma linjestil
// genomgående: 1,7 px linje, rundade ändar, aldrig fyllda ytor. Aktiv flik
// markeras med lime — inget annat i raden får vara lime, annars slutar det
// betyda "du är här".

import { C, HFONT } from "./design.js";

export function NavIcon({ name, size = 24, color = C.muted }) {
  const p = { fill: "none", stroke: color, strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };
  const v = { viewBox: "0 0 24 24", width: size, height: size, "aria-hidden": true, focusable: "false" };

  if (name === "hem") return (
    <svg {...v}><path d="M3 11 L12 3 L21 11" {...p} /><path d="M6 10 v10 h12 V10" {...p} /></svg>
  );
  if (name === "pass") return (   // biceps: styrka, inte en hantel bland andra
    <svg {...v}><path d="M5 9 q4 -4 9 -3 q4 1 5 5 q1 5 -3 8 q-5 3 -9 -1" {...p} /><path d="M8 11 q3 2 3 6" {...p} /></svg>
  );
  if (name === "mat") return (
    <svg {...v}><path d="M12 8 q-4 -3 -6 1 q-2 5 2 10 q3 3 4 0 q1 3 4 0 q4 -5 2 -10 q-2 -4 -6 -1 Z" {...p} /><path d="M12 8 V5 q0 -2 2 -2.5" {...p} /></svg>
  );
  if (name === "framsteg") return (
    <svg {...v}><rect x="3" y="14" width="4.5" height="7" rx="1" {...p} /><rect x="9.8" y="9" width="4.5" height="12" rx="1" {...p} /><rect x="16.5" y="4" width="4.5" height="17" rx="1" {...p} /></svg>
  );
  return (                          // coachen: person, inte pratbubbla — det är någon
    <svg {...v}><circle cx="12" cy="8" r="4" {...p} /><path d="M4.5 21 q0 -6 7.5 -6 q7.5 0 7.5 6" {...p} /></svg>
  );
}

const FLIKAR = [
  ["hem", "Hem"], ["pass", "Pass"], ["mat", "Mat"], ["framsteg", "Framsteg"], ["coachen", "Coachen"],
];

export function BottomNav({ aktiv, onChange }) {
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40,
      maxWidth: 480, margin: "0 auto",
      background: "rgba(10,10,10,0.94)", backdropFilter: "blur(12px)",
      borderTop: `1px solid ${C.border}`,
      display: "flex", paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {FLIKAR.map(([id, l]) => {
        const på = aktiv === id;
        return (
          <button key={id} onClick={() => onChange(id)} aria-current={på ? "page" : undefined} style={{
            flex: 1, background: "none", border: "none", cursor: "pointer",
            padding: "10px 0 12px", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 5, color: på ? C.lime : C.muted,
          }}>
            <NavIcon name={id} size={23} color={på ? C.lime : C.muted} />
            <span style={{ fontFamily: HFONT, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase" }}>{l}</span>
          </button>
        );
      })}
    </nav>
  );
}
