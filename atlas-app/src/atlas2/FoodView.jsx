// Askr 2.0 — mat.
//
// Tre flikar enligt skiss 3: översikt, logga, recept.
//
// Fältnamnet är `kcal`, aldrig `calories` — genomgående lag i projektet.
//
// ÄRLIGHET: utan mål visas inga procent och ingen ring som fylls. Ett mål är
// något användaren sätter, inte något appen hittar på åt hen — en påhittad
// 2000-gräns hade fått verkliga siffror att se ut som avvikelser.

import { useState, useMemo } from "react";
import { C, HFONT, hdr, label, btnPrimary, btnGhost, card, statRow, statCell, orDash, DASH } from "./design.js";
import { FOOD_INDEX } from "../data/foods.js";
import { RECIPES } from "../data/recipes.js";
import { dagensNutrition } from "./store.js";

const idag = ts => {
  const d = new Date(ts), n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};

function Makro({ namn, värde, mål, färg }) {
  const andel = mål ? Math.min(1, värde / mål) : 0;
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ ...label(), color: C.text2 }}>{namn}</span>
        <span style={{ fontSize: 13, fontFamily: HFONT, fontWeight: 700 }}>
          <span style={{ color: färg }}>{Math.round(värde)}</span>
          <span style={{ color: C.muted }}> {mål ? `/ ${mål} g` : "g"}</span>
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: C.border, overflow: "hidden" }}>
        {mål ? <div style={{ width: `${andel * 100}%`, height: "100%", background: färg, borderRadius: 3 }} /> : null}
      </div>
    </div>
  );
}

function Ring({ kcal, mål }) {
  const storlek = 150, r = 66, omkrets = 2 * Math.PI * r;
  const andel = mål ? Math.min(1, kcal / mål) : 0;
  return (
    <svg width={storlek} height={storlek} aria-label={`${kcal} kcal`}>
      <circle cx={storlek / 2} cy={storlek / 2} r={r} fill="none" stroke={C.border} strokeWidth="9" />
      {mål > 0 && (
        <circle cx={storlek / 2} cy={storlek / 2} r={r} fill="none" stroke={C.lime} strokeWidth="9"
          strokeLinecap="round" strokeDasharray={omkrets} strokeDashoffset={omkrets * (1 - andel)}
          transform={`rotate(-90 ${storlek / 2} ${storlek / 2})`} />
      )}
      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle"
        style={{ fontFamily: HFONT, fontSize: 31, fontWeight: 800, fill: C.text }}>{kcal}</text>
      <text x="50%" y="62%" textAnchor="middle"
        style={{ fontFamily: HFONT, fontSize: 11, letterSpacing: 1.4, fill: C.muted }}>
        {mål ? `/ ${mål} KCAL` : "KCAL"}
      </text>
    </svg>
  );
}

/* ── ÖVERSIKT ── */

function Oversikt({ dagensLogg, totaler, mål, onLogga, onSätta }) {
  // Samma summering (dagensNutrition → computeNutrition) som coachen läser — en
  // sanning, inte två.
  const t = totaler;
  const kvar = mål && mål.kcal ? mål.kcal - t.kcal : null;

  return (
    <div>
      <div style={{ ...card, display: "flex", gap: 16, alignItems: "center" }}>
        <Ring kcal={t.kcal} mål={mål && mål.kcal} />
        <div style={{ flex: 1 }}>
          <Makro namn="Protein" värde={t.protein} mål={mål && mål.protein} färg={C.lime} />
          <Makro namn="Kolhydrater" värde={t.carbs} mål={mål && mål.carbs} färg="#4FD8C8" />
          <Makro namn="Fett" värde={t.fat} mål={mål && mål.fat} färg={C.recovering} />
        </div>
      </div>

      {kvar !== null ? (
        <div style={{ textAlign: "center", marginTop: 12, fontSize: 13 }}>
          <span style={{ color: C.muted }}>Återstående </span>
          <span style={{ color: kvar >= 0 ? C.lime : C.critical, fontWeight: 700 }}>{Math.round(kvar)} kcal</span>
          {onSätta && <button onClick={onSätta} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", marginLeft: 8, textDecoration: "underline" }}>Ändra mål</button>}
        </div>
      ) : (
        <div style={{ textAlign: "center", marginTop: 12, fontSize: 12.5, color: C.muted, lineHeight: 1.55 }}>
          Inget kalorimål satt. {onSätta
            ? <button onClick={onSätta} style={{ background: "none", border: "none", color: C.lime, fontSize: 12.5, cursor: "pointer", textDecoration: "underline", padding: 0 }}>Sätt ett mål</button>
            : "Sätt ett i profilen"} så visas hur mycket som återstår — appen hittar inte på ett åt dig.
        </div>
      )}

      <div style={{ ...label(), margin: "24px 0 4px" }}>Dagens måltider</div>
      {dagensLogg.length === 0 ? (
        <div style={{ padding: "26px 16px", textAlign: "center", border: `1px dashed ${C.border}`, borderRadius: 14, fontSize: 13, color: C.muted, lineHeight: 1.55 }}>
          Inget loggat idag.
        </div>
      ) : dagensLogg.map((e, i) => {
        const f = e.foodId ? FOOD_INDEX.find(x => x.id === e.foodId) : null;
        const k = f ? Math.round(f.kcal * e.grams / 100) : Math.round(e.kcal || 0);
        const p = f ? Math.round(f.protein * e.grams / 100) : Math.round(e.protein || 0);
        return (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 2px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name || (f && f.name) || "Måltid"}</div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                {e.grams ? `${e.grams} g · ` : ""}P {p} g
                {e.quality === "estimated" ? " · uppskattat" : ""}
              </div>
            </div>
            <div style={{ fontFamily: HFONT, fontWeight: 700, fontSize: 15, color: C.lime, flexShrink: 0, marginLeft: 12 }}>{k}<span style={{ fontSize: 11, color: C.muted }}> kcal</span></div>
          </div>
        );
      })}

      <button onClick={onLogga} style={{ ...btnPrimary, marginTop: 22 }}>Logga måltid <span style={{ fontSize: 19 }}>+</span></button>
    </div>
  );
}

/* ── LOGGA ── */

function Logga({ onLägg }) {
  const [sök, setSök] = useState("");
  const [vald, setVald] = useState(null);
  const [gram, setGram] = useState(100);

  const träffar = useMemo(() => {
    const q = sök.trim().toLowerCase();
    if (q.length < 2) return [];
    return FOOD_INDEX.filter(f => f.name.toLowerCase().includes(q)).slice(0, 25);
  }, [sök]);

  if (vald) {
    const k = n => Math.round(n * gram / 100);
    return (
      <div>
        <button onClick={() => setVald(null)} style={{ ...btnGhost, marginBottom: 16 }}>‹ Tillbaka till sökningen</button>
        <div style={hdr(19)}>{vald.name}</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 5 }}>Per 100 g: {vald.kcal} kcal · P {vald.protein} · K {vald.carbs} · F {vald.fat}</div>

        <div style={{ ...card, marginTop: 18 }}>
          <div style={{ ...label(), textAlign: "center", marginBottom: 10 }}>Mängd</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
            <button onClick={() => setGram(g => Math.max(5, g - 25))} style={{ width: 46, height: 46, borderRadius: 999, border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 22, cursor: "pointer" }} aria-label="Minska">−</button>
            <div style={{ minWidth: 92, textAlign: "center" }}>
              <div style={hdr(29)}>{gram}</div>
              <div style={label()}>gram</div>
            </div>
            <button onClick={() => setGram(g => g + 25)} style={{ width: 46, height: 46, borderRadius: 999, border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 22, cursor: "pointer" }} aria-label="Öka">+</button>
          </div>
        </div>

        <div style={{ ...statRow, marginTop: 16 }}>
          {[["kcal", k(vald.kcal)], ["Protein", k(vald.protein) + " g"], ["Kolh.", k(vald.carbs) + " g"], ["Fett", k(vald.fat) + " g"]].map(([l, v], i) => (
            <div key={l} style={statCell(i)}>
              <div style={label()}>{l}</div>
              <div style={{ ...hdr(17), marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>

        <button onClick={() => { onLägg({ foodId: vald.id, name: vald.name, grams: gram, ts: Date.now() }); setVald(null); setSök(""); }}
          style={{ ...btnPrimary, marginTop: 20 }}>Lägg till <span style={{ fontSize: 19 }}>+</span></button>
      </div>
    );
  }

  return (
    <div>
      <input value={sök} onChange={e => setSök(e.target.value)} placeholder="Sök livsmedel…"
        style={{ width: "100%", background: C.card2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", fontSize: 15, boxSizing: "border-box" }} />
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8 }}>
        {FOOD_INDEX.length} livsmedel, i huvudsak från Livsmedelsverkets databas.
      </div>

      {sök.trim().length >= 2 && träffar.length === 0 && (
        <div style={{ padding: "30px 12px", textAlign: "center", fontSize: 13, color: C.muted }}>Inga träffar på ”{sök.trim()}”.</div>
      )}

      {träffar.map(f => (
        <button key={f.id} onClick={() => { setVald(f); setGram(100); }}
          style={{ width: "100%", textAlign: "left", padding: "13px 4px", background: "none", border: "none", borderBottom: `1px solid ${C.border}`, color: C.text, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 14, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
          <span style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>{f.kcal} kcal · P {f.protein}</span>
        </button>
      ))}
    </div>
  );
}

/* ── RECEPT ── */

/**
 * Recepten bär ingredienser (`i: [{id, g}]`), inte färdiga näringsvärden.
 * Näringen räknas därför ur livsmedelsdatabasen, per portion. Saknas en
 * ingrediens i databasen hoppas den över och receptet markeras som ofullständigt
 * — hellre en ärlig lucka än en tyst för låg siffra.
 */
function receptNäring(r) {
  const per = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  let saknas = 0;
  (r.i || []).forEach(ing => {
    const f = FOOD_INDEX.find(x => x.id === ing.id);
    if (!f) { saknas++; return; }
    const k = (ing.g || 0) / 100;
    per.kcal += f.kcal * k; per.protein += f.protein * k;
    per.carbs += f.carbs * k; per.fat += f.fat * k;
  });
  const portioner = r.servings || 1;
  return {
    kcal: Math.round(per.kcal / portioner),
    protein: Math.round(per.protein / portioner),
    carbs: Math.round(per.carbs / portioner),
    fat: Math.round(per.fat / portioner),
    saknas,
  };
}

function Recept({ onLägg }) {
  const [sök, setSök] = useState("");
  const lista = useMemo(() => {
    const q = sök.trim().toLowerCase();
    const alla = RECIPES || [];
    return (q ? alla.filter(r => (r.name || "").toLowerCase().includes(q)) : alla).slice(0, 40);
  }, [sök]);

  return (
    <div>
      <input value={sök} onChange={e => setSök(e.target.value)} placeholder="Sök recept…"
        style={{ width: "100%", background: C.card2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", fontSize: 15, boxSizing: "border-box", marginBottom: 14 }} />
      {lista.map(r => {
        const n = receptNäring(r);
        return (
        <div key={r.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "11px 2px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14 }}>{r.name}</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
              {n.kcal} kcal · P {n.protein} g{r.time ? ` · ${r.time} min` : ""}
              {n.saknas ? " · ofullständig näring" : ""}
            </div>
          </div>
          <button onClick={() => onLägg({ name: r.name, kcal: n.kcal, protein: n.protein, carbs: n.carbs, fat: n.fat, ts: Date.now(), recipeId: r.id })}
            style={{ padding: "8px 15px", borderRadius: 999, border: `1px solid ${C.lime}`, background: "transparent", color: C.lime, fontSize: 12.5, cursor: "pointer", flexShrink: 0 }}>
            Logga
          </button>
        </div>
        );
      })}
    </div>
  );
}

/* ── VYN ── */

export function FoodView({ foodLog = [], setFoodLog, nutritionTargets, onSätta }) {
  const [flik, setFlik] = useState("oversikt");
  const dagens = foodLog.filter(e => e && e.ts && idag(e.ts));
  const totaler = dagensNutrition(foodLog);
  const lägg = post => { setFoodLog(l => [...l, post]); setFlik("oversikt"); };

  return (
    <div style={{ padding: "16px 18px 92px" }}>
      <div style={{ textAlign: "center", ...hdr(20) }}>Mat</div>

      <div style={{ display: "flex", gap: 22, justifyContent: "center", margin: "16px 0 20px", borderBottom: `1px solid ${C.border}` }}>
        {[["oversikt", "Översikt"], ["logga", "Logga mat"], ["recept", "Recept"]].map(([id, l]) => (
          <button key={id} onClick={() => setFlik(id)} style={{
            background: "none", border: "none", cursor: "pointer", padding: "0 2px 10px",
            fontFamily: HFONT, fontSize: 12.5, fontWeight: 700, letterSpacing: 1.3, textTransform: "uppercase",
            color: flik === id ? C.lime : C.muted,
            borderBottom: `2px solid ${flik === id ? C.lime : "transparent"}`, marginBottom: -1,
          }}>{l}</button>
        ))}
      </div>

      {flik === "oversikt" && <Oversikt dagensLogg={dagens} totaler={totaler} mål={nutritionTargets} onLogga={() => setFlik("logga")} onSätta={onSätta} />}
      {flik === "logga" && <Logga onLägg={lägg} />}
      {flik === "recept" && <Recept onLägg={lägg} />}
    </div>
  );
}
