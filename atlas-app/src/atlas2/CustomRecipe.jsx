import { useState, useMemo } from "react";
import { C, MONO, hdr, label, btnPrimary, btnGhost, btnText, card, volt } from "./design.js";
import { recipeMacros } from "../engines/recipes.js";
import { searchFoods } from "../engines/index.js";

/**
 * EGNA RECEPT.
 *
 * Receptbanken har 276 rätter men inget sätt att lägga till en egen. Den som
 * lagar samma sak varje vecka måste logga ingredienserna en och en, varje gång.
 *
 * NÄRINGEN RÄKNAS, DEN SKRIVS INTE IN. Ett recept är { i: [{id, g}] } och
 * recipeMacros summerar ur samma livsmedelsdatabas som matloggen använder — 2 675
 * poster från Livsmedelsverket. Att låta användaren skriva kcal för hand hade
 * gett en andra sanning om samma mat, och den skulle glida isär från databasen
 * vid första tillfället.
 *
 * SAMMA FORM SOM BANKENS RECEPT. Fälten är identiska (id, name, meal, servings,
 * time, i, steps), så ett eget recept fungerar överallt ett inbyggt fungerar:
 * veckomenyn, inköpslistan, loggningen, preferensberäkningen. Avviker formen
 * går motorn sönder på ställen som inte har med den här vyn att göra.
 */

const MÅLTIDER = [
  { id: "breakfast", namn: "Frukost" },
  { id: "lunch", namn: "Lunch" },
  { id: "dinner", namn: "Middag" },
  { id: "snack", namn: "Mellanmål" },
];

/** Bygger ett recept i bankens form. Inga extrafält, inga saknade. */
export function byggEgetRecept({ namn, meal, servings, time, ingredienser, steps }) {
  const nu = Date.now();
  return {
    id: `r_egen_${nu.toString(36)}`,
    name: (namn || "").trim() || "Eget recept",
    meal: meal || "dinner",
    servings: Math.max(1, servings || 1),
    time: time || null,
    theme: "lime", icon: "bowl",
    i: ingredienser.filter(x => x.id && x.g > 0).map(x => ({ id: x.id, g: Math.round(x.g) })),
    steps: (steps || []).map(s => s.trim()).filter(Boolean),
    egen: true, createdAt: nu,
  };
}

export function CustomRecipe({ onSpara, onClose }) {
  const [namn, setNamn] = useState("");
  const [meal, setMeal] = useState("dinner");
  const [portioner, setPortioner] = useState(1);
  const [tid, setTid] = useState("");
  const [ingredienser, setIngredienser] = useState([]);
  const [steg, setSteg] = useState([""]);
  const [sök, setSök] = useState("");

  const träffar = useMemo(() => {
    const q = sök.trim();
    if (q.length < 2) return [];
    return (searchFoods(q, null, [], 12) || []).slice(0, 12);
  }, [sök]);

  // Näringen räknas live ur samma funktion som bankens recept använder.
  const näring = useMemo(() => {
    if (!ingredienser.length) return null;
    return recipeMacros({ i: ingredienser.map(x => ({ id: x.id, g: x.g })), servings: Math.max(1, portioner) });
  }, [ingredienser, portioner]);

  const rad = { border: `1px solid ${C.border}`, background: C.card2, borderRadius: 14 };
  const fält = {
    width: "100%", padding: "12px 14px", borderRadius: 12, minHeight: 44,
    border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 14,
  };

  const läggTill = f => {
    setIngredienser(xs => [...xs, { id: f.id, namn: f.name || f.namn || f.id, g: 100 }]);
    setSök("");
  };

  const kanSpara = namn.trim() && ingredienser.length > 0;

  return (
    <div style={{ padding: "4px 0 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={hdr(19)}>Eget recept</div>
        {onClose && <button onClick={onClose} style={btnText} aria-label="Stäng">Stäng</button>}
      </div>
      <div style={{ fontSize: 12.5, color: C.muted, marginTop: 5, lineHeight: 1.55 }}>
        Lägg till ingredienser så räknar Askr näringen. Receptet blir sökbart och
        kan hamna i veckomenyn.
      </div>

      <input value={namn} onChange={e => setNamn(e.target.value)}
        placeholder="Vad heter rätten?" aria-label="Receptets namn"
        style={{ ...fält, marginTop: 14 }} />

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "12px 0 4px" }}>
        {MÅLTIDER.map(m => (
          <button key={m.id} onClick={() => setMeal(m.id)} data-maltid={m.id}
            style={{
              ...rad, padding: "7px 13px", minHeight: 36, cursor: "pointer", fontSize: 12.5,
              borderColor: meal === m.id ? C.lime : C.border,
              color: meal === m.id ? C.lime : C.muted,
              background: meal === m.id ? volt(.08) : C.card2,
            }}>{m.namn}</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...label(), marginBottom: 5 }}>Portioner</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setPortioner(p => Math.max(1, p - 1))} aria-label="Färre portioner"
              style={{ ...rad, width: 40, height: 40, cursor: "pointer", color: C.text, fontSize: 17, flexShrink: 0 }}>−</button>
            <span style={{ ...hdr(16), minWidth: 22, textAlign: "center" }}>{portioner}</span>
            <button onClick={() => setPortioner(p => Math.min(12, p + 1))} aria-label="Fler portioner"
              style={{ ...rad, width: 40, height: 40, cursor: "pointer", color: C.text, fontSize: 17, flexShrink: 0 }}>+</button>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...label(), marginBottom: 5 }}>Tid (min)</div>
          <input value={tid} onChange={e => setTid(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric" placeholder="valfritt" aria-label="Tillagningstid i minuter"
            style={{ ...fält, padding: "10px 12px" }} />
        </div>
      </div>

      <div style={{ ...label(), margin: "18px 0 8px" }}>Ingredienser</div>

      {ingredienser.map((x, i) => (
        <div key={i} style={{ ...rad, padding: "10px 13px", marginBottom: 7 }} data-ingrediens="1">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span style={{ fontSize: 13, minWidth: 0, flex: 1 }}>{x.namn}</span>
            <button onClick={() => setIngredienser(xs => xs.filter((_, n) => n !== i))}
              aria-label={`Ta bort ${x.namn}`}
              style={{ background: "none", border: "none", color: C.muted, fontSize: 17,
                cursor: "pointer", padding: "2px 4px", minHeight: 34, flexShrink: 0 }}>×</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
            <input value={x.g} inputMode="numeric" aria-label={`Gram ${x.namn}`}
              onChange={e => {
                const g = Number(e.target.value.replace(/\D/g, "")) || 0;
                setIngredienser(xs => xs.map((y, n) => n === i ? { ...y, g } : y));
              }}
              style={{ ...fält, width: 84, flex: "none", padding: "8px 10px", fontFamily: MONO, fontSize: 13 }} />
            <span style={{ fontSize: 12, color: C.muted }}>gram</span>
          </div>
        </div>
      ))}

      <input value={sök} onChange={e => setSök(e.target.value)}
        placeholder="Sök livsmedel att lägga till…" aria-label="Sök livsmedel"
        style={{ ...fält, marginTop: 4 }} />

      {träffar.map(f => (
        <button key={f.id} onClick={() => läggTill(f)} data-livsmedel="1"
          style={{ ...rad, width: "100%", textAlign: "left", padding: "10px 13px", marginTop: 6,
            minHeight: 44, cursor: "pointer", color: C.text, fontSize: 13 }}>
          {f.name || f.namn || f.id}
          <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.muted, display: "block", marginTop: 2 }}>
            {Math.round(f.kcal || 0)} kcal · P {Math.round(f.protein || 0)} g / 100 g
          </span>
        </button>
      ))}

      {/* NÄRINGEN RÄKNAS LIVE. Den är inte något användaren fyller i — den
          summeras ur Livsmedelsverkets data via samma funktion som bankens
          recept. Ett handskrivet kcal-tal hade blivit en andra sanning. */}
      {näring && (
        <div style={{ ...card, padding: 14, marginTop: 14 }}>
          <div style={{ ...label(C.lime), marginBottom: 8 }}>Per portion</div>
          <div style={{ fontFamily: MONO, fontSize: 13, color: C.text }}>
            {näring.kcal} kcal · P {näring.protein} g · K {näring.carbs} g · F {näring.fat} g
          </div>
          {!näring.complete && (
            <div style={{ fontSize: 11.5, color: C.recovering, marginTop: 7, lineHeight: 1.5 }}>
              Något livsmedel saknar fullständiga näringsvärden — summan är lägre
              än den verkliga.
            </div>
          )}
        </div>
      )}

      <div style={{ ...label(), margin: "18px 0 8px" }}>Gör så här <span style={{ color: C.muted }}>(valfritt)</span></div>
      {steg.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7 }}>
          <span style={{ ...hdr(13), color: C.muted, width: 18, paddingTop: 12 }}>{i + 1}</span>
          <input value={s} onChange={e => setSteg(xs => xs.map((y, n) => n === i ? e.target.value : y))}
            placeholder="Beskriv steget" aria-label={`Steg ${i + 1}`} style={{ ...fält, flex: 1 }} />
        </div>
      ))}
      <button onClick={() => setSteg(xs => [...xs, ""])} style={{ ...btnText, minHeight: 44 }}>
        + Lägg till steg
      </button>

      <button onClick={() => onSpara(byggEgetRecept({
        namn, meal, servings: portioner, time: tid ? Number(tid) : null,
        ingredienser, steps: steg,
      }))} disabled={!kanSpara} data-spara="1"
        style={{ ...btnPrimary, marginTop: 18, opacity: kanSpara ? 1 : 0.4,
          cursor: kanSpara ? "pointer" : "default" }}>
        Spara receptet
      </button>
      {!kanSpara && (
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, textAlign: "center" }}>
          {!namn.trim() ? "Ge rätten ett namn." : "Lägg till minst en ingrediens."}
        </div>
      )}
    </div>
  );
}
