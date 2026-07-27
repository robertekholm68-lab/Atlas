// Askr 2.0 — matakuten ("Rädda måltiden").
//
// VARFÖR den finns: de flesta kostmisstag sker inte vid matbordet utan i
// stunden före — hungrig på väg hem, sliten efter ett pass, sötsugen klockan
// nio. En logg som bara tar emot i efterhand hjälper inte där. Det här är den
// enda ytan i appen som ska vara användbar EFTER att man redan bestämt sig för
// att göra något dumt.
//
// Hela beslutslogiken ligger i motorn (engines/index.js): buildRescue väger in
// de senaste dagarnas intag, dagens kvarvarande ram, viktutvecklingen och
// tonläget, och returnerar förslag med ETT rekommenderat. Här finns bara
// inmatningen och presentationen.
//
// SKYDDSRÄCKET (rescueGuard) står med flit högt och i vanlig textfärg, inte
// som grå finstil längst ner. Det säger att en sämre måltid inte är något att
// svälta eller straffträna för. Det är den meningen som gör funktionen till
// hjälp i stället för till en ångestmotor, och den ska läsas.

import { useState } from "react";
import { C, HFONT, MONO, hdr, label, card, btnPrimary, btnGhost, volt } from "./design.js";
import { RESCUE_SITUATIONS, NUTRITION_STYLES } from "../data/foods.js";
import { buildRescue, interpretCrisis, recentIntakeSummary, nutritionProgress } from "../engines/index.js";

// v3 lagrar vikt som { ts, kg }; motorn läser { date, weight }. Adaptern finns
// för att slippa en andra kopia av viktlogiken — omvandla, återanvänd.
const somMätningar = weights =>
  (weights || []).filter(w => w && typeof w.kg === "number").map(w => ({ date: w.ts, weight: w.kg }));

const SIT_SV = {
  hungry: "hungrig", nocook: "orkar inte laga", hungover: "bakis", sweet: "sötsugen",
  empty: "inget hemma", pizza: "pizzasug", fastfood: "snabbmat", custom: "allmänt läge",
};

function Tonval({ vald, onVälj }) {
  return (
    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
      {NUTRITION_STYLES.map(s => {
        const på = vald === s.id;
        return (
          <button key={s.id} onClick={() => onVälj(s.id)} style={{
            textAlign: "left", padding: "12px 14px", borderRadius: 12, minHeight: 44, cursor: "pointer",
            border: `1px solid ${på ? C.lime : C.border}`, background: på ? volt(0.06) : C.card2,
            color: C.text, boxShadow: "none",
          }}>
            <div style={{ fontFamily: HFONT, fontSize: 12.5, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase", color: på ? C.lime : C.text }}>{s.label}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{s.tag}</div>
          </button>
        );
      })}
    </div>
  );
}

/**
 * @param foodLog          hela matloggen (motorn plockar ut dygnen själv)
 * @param nutritionTargets dagens ram, eller null om inget mål satts
 * @param profile/setProfile  bär tonläget (profile.nutStyle)
 * @param weights          viktposter för utvecklingskontexten
 * @param onLogga          gå till loggen — skyddsräcket säger "registrera valet"
 */
export function RescueView({ foodLog = [], nutritionTargets, profile = {}, setProfile, weights = [], onLogga }) {
  const [läge, setLäge] = useState(null);
  const [text, setText] = useState("");
  const [eko, setEko] = useState("");
  const [visaTon, setVisaTon] = useState(false);

  const ton = profile.nutStyle || "balanced";
  const sättTon = id => { setVisaTon(false); if (setProfile) setProfile(p => ({ ...p, nutStyle: id })); };

  const tolka = () => {
    const t = text.trim();
    if (!t) return;
    setLäge(interpretCrisis(t));
    setEko(t);
  };

  const mål = nutritionTargets || {};
  const idag = (foodLog || []).filter(e => e && e.ts && new Date(e.ts).toDateString() === new Date().toDateString());
  const ätit = idag.reduce((a, e) => ({ kcal: a.kcal + (e.kcal || 0), protein: a.protein + (e.protein || 0) }), { kcal: 0, protein: 0 });
  const kvar = {
    kcal: mål.kcal ? Math.max(0, Math.round(mål.kcal - ätit.kcal)) : 0,
    protein: mål.protein ? Math.max(0, Math.round(mål.protein - ätit.protein)) : 0,
  };

  const recent = recentIntakeSummary(foodLog, nutritionTargets);
  const progress = nutritionProgress(profile, somMätningar(weights));
  // Måltidsminnet finns ännu inte i v3. Motorn tar en tom lista och klarar sig
  // utan — den slutar bara föreslå "det du brukar äta". Ärligt sämre, inte trasigt.
  const r = läge ? buildRescue(läge, kvar, ton, [], recent, progress) : null;

  return (
    <div>
      <div style={{ ...card }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={label(C.recovering)}>Rädda måltiden</div>
          <button onClick={() => setVisaTon(v => !v)} aria-expanded={visaTon} style={{
            background: "none", border: "none", cursor: "pointer", padding: "6px 2px", minHeight: 44,
            fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted,
          }}>
            Ton: {(NUTRITION_STYLES.find(s => s.id === ton) || {}).label}{" "}
            <span style={{ display: "inline-block",
              transform: visaTon ? "rotate(180deg)" : "none", transition: "transform 150ms ease-out" }}>⌄</span>
          </button>
        </div>

        {visaTon ? (
          <>
            <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, marginTop: 8 }}>
              Hur rakt ska jag säga ifrån? Valet sparas och gäller överallt där jag kommenterar mat.
            </div>
            <Tonval vald={ton} onVälj={sättTon} />
          </>
        ) : (
          <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.6, marginTop: 8 }}>
            Hungrig, sliten eller sugen och på väg att göra ett val du inte planerat?
            Välj läget — eller skriv ditt eget — så väger jag in de senaste dagarna,
            dagens ram och din utveckling och ger dig det bästa realistiska beslutet just nu.
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 14 }}>
        {RESCUE_SITUATIONS.map(s => {
          const på = läge === s.id && !eko;
          return (
            <button key={s.id} onClick={() => { setLäge(på ? null : s.id); setText(""); setEko(""); }} style={{
              padding: "9px 13px", borderRadius: 999, minHeight: 44, cursor: "pointer", fontSize: 13,
              border: `1px solid ${på ? C.lime : C.border}`, background: på ? volt(0.08) : C.card2,
              color: på ? C.lime : C.text2,
            }}>{s.label}</button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") tolka(); }}
          aria-label="Beskriv ditt läge"
          placeholder="…eller beskriv läget: sug på tacos, sen kväll"
          style={{
            flex: 1, minWidth: 0, padding: "12px 13px", borderRadius: 12, minHeight: 44,
            border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 13,
          }} />
        <button onClick={tolka} style={{ ...btnGhost, width: "auto", padding: "0 16px", whiteSpace: "nowrap" }}>Fråga</button>
      </div>

      {r && (
        <>
          {eko && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 14 }}>
              Uppfattat: ”{eko}” → <span style={{ color: C.text2 }}>{SIT_SV[läge] || läge}</span>
            </div>
          )}

          <div style={{ ...card, marginTop: 14, borderLeft: `3px solid ${C.lime}` }}>
            <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.6 }}>{r.context}</div>
          </div>

          {recent.enough && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              {recent.days.slice().reverse().map((d, i) => (
                <span key={i} style={{
                  fontSize: 11, color: C.muted, background: C.card2, borderRadius: 999, padding: "4px 10px",
                  fontFamily: MONO, letterSpacing: "0.04em",
                }}>
                  {new Date(d.date).toLocaleDateString("sv-SE", { weekday: "short" })} <span style={{ color: C.text2 }}>{d.kcal}</span>
                </span>
              ))}
            </div>
          )}

          <div style={{ ...label(), marginTop: 18, marginBottom: 8 }}>
            {mål.kcal ? `Kvar idag: ~${kvar.kcal} kcal · ${kvar.protein} g protein` : "Inget dagsmål satt — förslagen utgår från läget"}
          </div>

          {r.opts.map((o, i) => {
            const rek = r.rec.pick === i + 1;
            return (
              <div key={i} style={{
                ...card, marginBottom: 8, padding: "13px 15px",
                borderColor: rek ? C.lime : C.hairline,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, minWidth: 0 }}>{o.title}</div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>
                    {o.kcal}{o.tag ? ` · ${o.tag}` : ""}
                  </div>
                </div>
                {rek && <div style={{ ...label(C.lime), marginTop: 6 }}>Rekommenderas · {r.rec.why}</div>}
                {o.detail && <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55, marginTop: 6 }}>{o.detail}</div>}
              </div>
            );
          })}

          <div style={{ ...card, marginTop: 6 }}>
            <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.6 }}>{r.coach}</div>
          </div>

          {/* Skyddsräcket. Vanlig textfärg, ovanför knappen, aldrig grå finstil. */}
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, margin: "16px 2px 0" }}>{r.guard}</div>

          {onLogga && (
            <button onClick={onLogga} style={{ ...btnPrimary, marginTop: 12 }}>
              Logga det jag valde <span style={{ fontSize: 18 }}>→</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
