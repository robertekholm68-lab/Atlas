// Askr 2.0 — skrivbordsskalet.
//
// Samma app, annan möblering. Det som INTE händer här är lika viktigt som det
// som händer: inga egna vyer, ingen egen informationsarkitektur, ingen ny
// sanning. Skalet byter bara ut bottennaven mot en sidopanel och ger
// innehållet en bredare yta att stå på.
//
// Skälet är ärrvävnad: förra gången två gränssnitt levde parallellt kostade det
// en merge-kväll att få ihop dem igen. Därför forkas aldrig vyerna — de får
// veta hur brett de har och möblerar därefter, men det är samma komponenter.
//
// Sidopanelen är medvetet stum: logotyp, fem flikar, meny. Ingen sammanfattning,
// inga nyckeltal, inget som konkurrerar med kartan. På en stor skärm är
// frestelsen att fylla ytan med paneler — men kroppen är gränssnittet, och då
// är det kroppen som ska få ytan.

import { C, HFONT, MONO, volt } from "./design.js";
import { AskrWordmark } from "../components/brand.jsx";
import { NavIcon, FLIKAR } from "./Nav.jsx";
import { PANEL_BREDD, INNEHÅLL_MAX, FULL_HÖJD } from "./layout.js";

function PanelKnapp({ id, etikett, aktiv, onClick }) {
  return (
    <button onClick={onClick} aria-current={aktiv ? "page" : undefined} style={{
      display: "flex", alignItems: "center", gap: 13, width: "100%",
      padding: "12px 14px", borderRadius: 12, minHeight: 44, cursor: "pointer",
      // Selected är det ENDA state som får volt-border (guiden). Övriga flikar
      // har ingen ram alls — en rad med fem ramar läser som fem knappar, inte
      // som en navigering.
      border: aktiv ? `1px solid ${C.lime}` : "1px solid transparent",
      background: aktiv ? volt(0.06) : "transparent",
      color: aktiv ? C.lime : C.text2,
      transition: "background 150ms ease-out, border-color 150ms ease-out",
    }}>
      <NavIcon name={id} size={21} color={aktiv ? C.lime : C.text2} />
      <span style={{ fontFamily: HFONT, fontSize: 12.5, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase" }}>{etikett}</span>
    </button>
  );
}

/**
 * @param aktiv     vilken flik som är vald
 * @param onChange  byt flik
 * @param onMeny    öppna menyn (samma ark som hamburgaren på mobil)
 * @param children  vyn
 */
export function Shell({ aktiv, onChange, onMeny, children }) {
  return (
    <div style={{ display: "flex", minHeight: FULL_HÖJD, background: C.bg }}>
      <nav style={{
        width: PANEL_BREDD, flexShrink: 0, borderRight: `1px solid ${C.hairline}`,
        padding: "22px 16px", display: "flex", flexDirection: "column", gap: 6,
        position: "sticky", top: 0, height: FULL_HÖJD, boxSizing: "border-box",
      }}>
        <div style={{ padding: "0 6px 22px" }}>
          <AskrWordmark höjd={30} />
        </div>

        {FLIKAR.map(([id, etikett]) => (
          <PanelKnapp key={id} id={id} etikett={etikett}
            aktiv={aktiv === id} onClick={() => onChange(id)} />
        ))}

        <div style={{ marginTop: "auto" }}>
          <button onClick={onMeny} aria-label="Meny" style={{
            display: "flex", alignItems: "center", gap: 13, width: "100%",
            padding: "12px 14px", borderRadius: 12, minHeight: 44, cursor: "pointer",
            border: "1px solid transparent", background: "transparent", color: C.text2,
            fontFamily: HFONT, fontSize: 12.5, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase",
          }}>
            <span aria-hidden style={{ display: "block", width: 21, flexShrink: 0 }}>
              {[0, 1, 2].map(i => <span key={i} style={{ display: "block", width: 21, height: 2, background: C.text2, marginBottom: i < 2 ? 5 : 0 }} />)}
            </span>
            Meny
          </button>
          <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: C.text3, padding: "10px 14px 0" }}>
            Fråga kroppen
          </div>
        </div>
      </nav>

      <main style={{ flex: 1, minWidth: 0, padding: "0 40px" }}>
        <div style={{ maxWidth: INNEHÅLL_MAX, margin: "0 auto" }}>{children}</div>
      </main>
    </div>
  );
}
