// Askr 2.0 — sätt näringsmål.
//
// Litet ark, samma stil som GoalSheet — ingen egen vy. Ett näringsmål är något
// användaren SÄTTER, inte något appen hittar på: utan mål visar matvyn ingen
// ring och coachen säger rakt ut att den inte vet. Det här är stället där man
// ger appen ett mål att räkna mot.
//
// Fältnamnen är kcal/protein/carbs/fat — aldrig `calories`.

import { useState } from "react";
import { C, HFONT, hdr, label, btnPrimary, btnGhost, card } from "./design.js";
import { suggestNutritionTargets } from "../engines/index.js";

// Bara siffror som faktiskt fyllts i följer med — ett tomt fält är UTELÄMNAT,
// inte noll. Så att sätta bara protein aldrig råkar bli ett kalorimål på 0.
const tal = s => { const n = parseFloat(String(s).replace(",", ".")); return Number.isFinite(n) && n > 0 ? Math.round(n) : null; };

const MÅL = [["maintain", "Behålla vikt"], ["cut", "Gå ner"], ["bulk", "Gå upp"]];

function Falt({ etikett, enhet, värde, sätt }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ ...label(), marginBottom: 6 }}>{etikett}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px 13px" }}>
        <input value={värde} onChange={e => sätt(e.target.value)} inputMode="numeric" placeholder="—"
          style={{ flex: 1, minWidth: 0, background: "none", border: "none", color: C.text, fontFamily: HFONT, fontSize: 18, fontWeight: 700, outline: "none" }} />
        <span style={{ fontSize: 11.5, color: C.muted }}>{enhet}</span>
      </div>
    </div>
  );
}

export function NutritionSheet({ mål, setMål, weights = [], profile, onClose }) {
  const [kcal, setKcal] = useState(mål && mål.kcal != null ? String(mål.kcal) : "");
  const [protein, setProtein] = useState(mål && mål.protein != null ? String(mål.protein) : "");
  const [carbs, setCarbs] = useState(mål && mål.carbs != null ? String(mål.carbs) : "");
  const [fat, setFat] = useState(mål && mål.fat != null ? String(mål.fat) : "");
  const [målTyp, setMålTyp] = useState("maintain");
  const [skattning, setSkattning] = useState(null);   // basis-texten för ett gjort förslag

  // Senaste loggade kroppsvikt — förslaget bygger på den. Finns ingen vikt kan
  // vi inte skatta något, och då hittar vi INTE på en siffra.
  const sorterade = (weights || []).filter(w => w && typeof w.kg === "number").sort((a, b) => a.ts - b.ts);
  const vikt = sorterade.length ? sorterade[sorterade.length - 1].kg : null;

  const föreslå = () => {
    const kön = profile && profile.sex === "f" ? "female" : profile && profile.sex === "m" ? "male" : undefined;
    const f = suggestNutritionTargets({ goal: målTyp, weightKg: vikt, gender: kön });
    if (!f) return;
    setKcal(String(f.kcal)); setProtein(String(f.protein));
    setCarbs(String(f.carbs)); setFat(String(f.fat));
    // ÄRLIGHET: säg att det är en skattning OCH vad den bygger på (vikt + mål).
    // Metoden är viktheuristik utan längd/ålder — säg det, så siffran inte tas
    // för en mätning.
    const målText = MÅL.find(m => m[0] === målTyp)[1].toLowerCase();
    setSkattning(`Skattning utifrån ${vikt} kg och målet "${målText}" — grov, utan längd och ålder. Justera fritt innan du sparar.`);
  };

  const spara = () => {
    const t = { kcal: tal(kcal), protein: tal(protein), carbs: tal(carbs), fat: tal(fat) };
    // Inget ifyllt → inget mål. Ett tomt mål ska bli null, inte ett objekt med
    // nollor som får matvyn att rita en ring mot ingenting.
    const nagot = t.kcal != null || t.protein != null || t.carbs != null || t.fat != null;
    setMål(nagot ? t : null);
    onClose();
  };

  return (
    <div>
      <div style={hdr(19)}>Näringsmål</div>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "10px 0 18px" }}>
        Sätt ett kalori- och proteinmål så visar matvyn hur mycket som återstår och
        coachen kan väga in energibalans. Utan mål gissar appen ingenting.
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Falt etikett="Kalorier" enhet="kcal" värde={kcal} sätt={setKcal} />
        <Falt etikett="Protein" enhet="g" värde={protein} sätt={setProtein} />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <Falt etikett="Kolhydrater" enhet="g" värde={carbs} sätt={setCarbs} />
        <Falt etikett="Fett" enhet="g" värde={fat} sätt={setFat} />
      </div>
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8 }}>
        Kolhydrater och fett är valfria — kalorier och protein räcker för coachen.
      </div>

      {/* Förslag: räknar fram ett STARTvärde ur kroppsvikten. Aldrig påtvingat,
          alltid märkt som skattning. */}
      <div style={{ ...card, marginTop: 18 }}>
        <div style={label(C.lime)}>Vet du inte var du ska börja?</div>
        {vikt == null ? (
          <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55, marginTop: 8 }}>
            Logga en kroppsvikt först, så kan Askr föreslå ett startvärde. Utan vikt
            skattar vi inget — hellre tomt än påhittat.
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
              {MÅL.map(([id, l]) => (
                <button key={id} onClick={() => setMålTyp(id)} style={{
                  flex: 1, padding: "9px 4px", borderRadius: 10, cursor: "pointer",
                  border: `1px solid ${målTyp === id ? C.lime : C.border}`,
                  background: målTyp === id ? "rgba(212,255,63,.05)" : C.card2,
                  color: målTyp === id ? C.lime : C.text, fontFamily: HFONT, fontSize: 12, fontWeight: 700,
                }}>{l}</button>
              ))}
            </div>
            <button onClick={föreslå} style={{ ...btnGhost, marginTop: 10 }}>Föreslå utifrån {vikt} kg</button>
            {skattning && (
              <div style={{ fontSize: 11.5, color: C.recovering, lineHeight: 1.55, marginTop: 9 }}>{skattning}</div>
            )}
          </>
        )}
      </div>

      <button onClick={spara} style={{ ...btnPrimary, marginTop: 18 }}>Spara mål <span style={{ fontSize: 18 }}>✓</span></button>
      {mål && (
        <button onClick={() => { setMål(null); onClose(); }} style={{ width: "100%", marginTop: 9, padding: 11, borderRadius: 999, border: "none", background: "transparent", color: C.muted, fontSize: 12.5, cursor: "pointer" }}>
          Ta bort målet
        </button>
      )}
    </div>
  );
}
