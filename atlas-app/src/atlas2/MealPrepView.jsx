// Askr 2.0 — meal prep: kostval, veckomeny och inköpslista.
//
// VARFÖR kostvalen bor HÄR och inte i onboardingen: det är först när man ska få
// en hel vecka serverad som det spelar roll vad man äter. Frågan ställs där
// svaret används. Den sparas däremot på profilen och gäller överallt — samma
// mönster som tonläget i matakuten, samma fält, ingen migrering senare.
//
// ALLERGIER ÄR INTE EN PREFERENS. Motorn har redan rätt hållning inbyggd:
// väljer man en restriktion utesluts recept med otaggade ingredienser helt,
// eftersom vi inte kan LOVA att de är fria från nötter. Ett smalare utbud är
// rätt fel att göra. Det säger vyn också rakt ut, så att ett tunnare urval
// inte läses som att appen är trasig.
//
// Veckomenyn i sig är ren motor: generateWeekMenu väljer per måltid det recept
// som för dagen närmast kcal- och proteinmålet utan att upprepa samma rätt två
// dagar i rad, och shoppingList summerar ingredienserna med portionsskalningen.
// Fröet gör menyn reproducerbar — samma frö ger samma vecka.

import { useState, useMemo } from "react";
import { C, HFONT, MONO, hdr, label, card, btnPrimary, btnGhost, volt } from "./design.js";
import { generateWeekMenu, shoppingList, filterRecipes, recipeLogEntry } from "../engines/recipes.js";
import { receptBild } from "../data/recipeImages.js";
import { DIETS, DIET_RESTRICTIONS } from "../engines/index.js";

const DAGAR = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag", "Söndag"];

function Chip({ på, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: "9px 13px", borderRadius: 999, minHeight: 44, cursor: "pointer", fontSize: 12.5,
      border: `1px solid ${på ? C.lime : C.border}`, background: på ? volt(0.08) : C.card2,
      color: på ? C.lime : C.text2,
    }}>{children}</button>
  );
}

function Kostval({ diet, restrictions, onDiet, onRestriction }) {
  return (
    <div style={{ ...card }}>
      <div style={label(C.lime)}>Din kost</div>
      <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, margin: "8px 0 12px" }}>
        Styr både veckomenyn och receptlistan. Sparas på din profil.
      </div>

      <div style={{ ...label(), marginBottom: 7 }}>Kosthållning</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {DIETS.map(d => <Chip key={d.id} på={diet === d.id} onClick={() => onDiet(d.id)}>{d.label}</Chip>)}
      </div>

      <div style={{ ...label(), margin: "16px 0 7px" }}>Allergier och undantag</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {DIET_RESTRICTIONS.map(r => (
          <Chip key={r.id} på={restrictions.includes(r.id)} onClick={() => onRestriction(r.id)}>{r.label}</Chip>
        ))}
      </div>

      {restrictions.length > 0 && (
        <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.6, marginTop: 14, paddingLeft: 11, borderLeft: `2px solid ${C.recovering}` }}>
          Med en allergi vald plockas även recept med ofullständigt märkta
          ingredienser bort — vi kan inte lova att de är fria. Utbudet blir
          smalare med flit.
        </div>
      )}
    </div>
  );
}

/**
 * @param nutritionTargets  kcal/protein-mål; menyn siktar mot dem
 * @param profile/setProfile  bär diet, restrictions och dietApproach
 */
export function MealPrepView({ nutritionTargets, profile = {}, setProfile, onLägg, bred = false }) {
  const [frö, setFrö] = useState(1);
  const [öppen, setÖppen] = useState(0);
  const [visaKost, setVisaKost] = useState(false);
  const [visaInköp, setVisaInköp] = useState(false);

  const diet = profile.diet || "omnivore";
  const restrictions = profile.restrictions || [];
  const dietApproach = profile.dietApproach || null;

  const sättDiet = id => setProfile(p => ({ ...p, diet: id }));
  const växlaRestriktion = id => setProfile(p => {
    const nu = p.restrictions || [];
    return { ...p, restrictions: nu.includes(id) ? nu.filter(x => x !== id) : [...nu, id] };
  });

  const meny = useMemo(
    () => generateWeekMenu({ targets: nutritionTargets, diet, restrictions, dietApproach, seed: frö }),
    [nutritionTargets, diet, restrictions.join(","), dietApproach, frö]
  );
  const inköp = useMemo(() => (meny.hasData === false ? [] : shoppingList(meny)), [meny]);
  const antalRecept = useMemo(() => filterRecipes({ diet, restrictions, dietApproach }).length, [diet, restrictions.join(","), dietApproach]);


  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ ...label(), color: C.muted }}>{antalRecept} recept passar din kost</div>
        <button onClick={() => setVisaKost(v => !v)} aria-expanded={visaKost} style={{
          background: "none", border: "none", cursor: "pointer", padding: "6px 2px", minHeight: 44,
          fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted,
        }}>Ändra kost <span style={{ display: "inline-block",
          transform: visaKost ? "rotate(180deg)" : "none", transition: "transform 150ms ease-out" }}>⌄</span></button>
      </div>

      {visaKost && (
        <div style={{ marginTop: 8 }}>
          <Kostval diet={diet} restrictions={restrictions} onDiet={sättDiet} onRestriction={växlaRestriktion} />
        </div>
      )}

      {/* Ärligt tomtillstånd: motorn säger själv när en måltid inte kan fyllas. */}
      {meny.hasData === false ? (
        <div style={{ ...card, marginTop: 14, borderColor: C.recovering }}>
          <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.6 }}>
            Det går inte att sätta ihop en hel vecka med de här valen —
            {meny.missing && meny.missing.length ? ` det saknas recept för ${meny.missing.join(", ").toLowerCase()}.` : " underlaget räcker inte."}
          </div>
          <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, marginTop: 8 }}>
            Ta bort en restriktion eller vidga kosthållningen, så räcker underlaget.
            Hellre ingen vecka än en vecka som bryter mot det du sagt.
          </div>
          <button onClick={() => setVisaKost(true)} style={{ ...btnGhost, marginTop: 14 }}>Ändra kost</button>
        </div>
      ) : (
        <>
          <div style={{ display: bred ? "grid" : "block", gridTemplateColumns: bred ? "1fr 1fr" : undefined, gap: 12, marginTop: 14 }}>
            {meny.days.map((d, i) => {
              const öppna = bred || öppen === i;
              const kcal = Math.round(d.totals.kcal);
              const prot = Math.round(d.totals.protein);
              return (
                <div key={i} style={{ ...card, padding: "13px 15px", marginBottom: bred ? 0 : 8 }}>
                  <button onClick={() => setÖppen(öppen === i ? -1 : i)} disabled={bred} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, width: "100%",
                    background: "none", border: "none", padding: 0, cursor: bred ? "default" : "pointer",
                    minHeight: bred ? 0 : 44, color: C.text, textAlign: "left",
                  }}>
                    <span style={{ fontFamily: HFONT, fontSize: 13, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase" }}>{DAGAR[i] || `Dag ${i + 1}`}</span>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>
                      {kcal} kcal · {prot} g P
                      {/* Portionsskalningen har tak på ±40 %. Slår dagen i taket
                          möter den inte målet, och det ska stå — inte döljas. */}
                      {(d.scale <= 0.7 || d.scale >= 1.4) && <span style={{ color: C.recovering }}> · når inte målet</span>}
                    </span>
                  </button>

                  {öppna && d.meals.map((m, j) => (
                    <div key={j} style={{ display: "flex", gap: 10, alignItems: "center", paddingTop: 10, borderTop: j || !bred ? `1px solid ${C.hairline}` : "none", marginTop: j ? 8 : 10 }}>
                      {/* Samma miniatyr som i receptlistan. I veckomenyn gör
                          den mest nytta: man skummar sju dagar och känner igen
                          rätterna snabbare på bild än på namn. */}
                      {receptBild(m.recipe) && (
                        <img src={receptBild(m.recipe)} alt="" loading="lazy"
                          style={{ width: 44, height: 44, borderRadius: 9, objectFit: "cover", flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...label(), color: C.muted }}>{m.mealLabel}</div>
                        <div style={{ fontSize: 13.5, color: C.text, marginTop: 3 }}>{m.recipe.name}</div>
                        <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.muted, marginTop: 3 }}>
                          {m.macros.kcal} kcal · P {m.macros.protein} g
                          {m.servings && m.servings !== 1 ? ` · ${m.servings}× portion` : ""}
                        </div>
                      </div>
                      {onLägg && (
                        <button onClick={() => onLägg(recipeLogEntry(m.recipe, m.servings || 1))} aria-label={`Logga ${m.recipe.name}`} style={{
                          padding: "0 14px", minHeight: 44, borderRadius: 999, flexShrink: 0,
                          border: `1px solid ${C.lime}`, background: "transparent", color: C.lime, fontSize: 12, cursor: "pointer",
                        }}>Logga</button>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={() => setFrö(f => f + 1)} style={btnGhost}>Ny vecka</button>
            <button onClick={() => setVisaInköp(v => !v)} aria-expanded={visaInköp} style={btnPrimary}>
              {visaInköp ? "Dölj inköpslista" : "Inköpslista"}
            </button>
          </div>

          {visaInköp && (
            <div style={{ ...card, marginTop: 12 }}>
              <div style={label(C.lime)}>Inköpslista · hela veckan</div>
              {inköp.map(grupp => (
                <div key={grupp.cat} style={{ marginTop: 14 }}>
                  <div style={{ ...label(), color: C.muted }}>{grupp.cat}</div>
                  {grupp.items.map(r => (
                    <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0", borderBottom: `1px solid ${C.hairline}` }}>
                      <span style={{ fontSize: 13, color: C.text2, minWidth: 0 }}>{r.name}</span>
                      <span style={{ fontFamily: MONO, fontSize: 12, color: C.text, whiteSpace: "nowrap" }}>{r.grams} g</span>
                    </div>
                  ))}
                </div>
              ))}
              <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.6, marginTop: 14 }}>
                Mängderna är summerade råvaror för veckans portioner — inte
                förpackningsstorlekar. Runda upp i butiken.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
