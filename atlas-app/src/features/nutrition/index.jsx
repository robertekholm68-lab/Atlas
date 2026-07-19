// FEATURE: Nutrition
import { useState, useRef, useEffect } from "react";
import { Card, CardLabel, MacroRing, Stepper, Icon } from "../../components/common/index.jsx";
import { NUTRITION_WEEK } from "../../data/demo.js";
import { buildRescue, recentIntakeSummary, nutritionProgress, interpretCrisis, computeNutrition, estimateMeal, mealDecision, dayNutritionRange, nutritionReadinessSignal, lookupBarcode, matchMemory, nutritionReadinessModifier, qualityColor, rememberMeal, searchFoods, computeMicros, microRef, MICRO_KEYS, supplementAdvice } from "../../engines/index.js";
import { FOODS, FOOD_DB, FOOD_GROUPS, FOOD_INDEX, NUTRITION_GOALS, NUTRITION_STYLES, RESCUE_SITUATIONS, foodSource, foodVerification } from "../../data/foods.js";
import { SUPPLEMENTS, SUPP_BY_ID, SUPP_EVIDENCE, SUPP_CATS, SUPP_BRANDS } from "../../data/supplements.js";
import { recommendedProtein } from "../../engines/bodyfat.js";
import { H, QUALITY, SOURCE_LABEL, T, btn, input, modal, now, overlay } from "../../data/tokens.js";

function NutritionWeekChart({ foodLog, todayKcal, goal, demo = false }) {
  const days = ["M", "T", "O", "T", "F", "L", "S"];
  // §1: demo behåller exempelveckan. Real Mode härleder ur faktiskt loggad mat per kalenderdag (odaterat räknas som idag).
  let data;
  if (demo) data = [...NUTRITION_WEEK, todayKcal];
  else {
    const today = new Date(); today.setHours(0, 0, 0, 0); const t0 = today.getTime(), DAY = 864e5;
    data = [];
    for (let i = 6; i >= 0; i--) {
      const start = t0 - i * DAY, end = start + DAY;
      const kcal = (foodLog || []).reduce((a, e) => {
        const ts = e.ts == null ? t0 : e.ts;                      // odaterat → idag
        if (ts < start || ts >= end) return a;
        if (e.foodId) { const f = FOOD_INDEX.find(x => x.id === e.foodId); return a + (f ? f.kcal * e.grams / 100 : 0); }
        return a + (e.kcal || 0);
      }, 0);
      data.push(Math.round(kcal));
    }
  }
  const hasGoal = typeof goal === "number" && goal > 0;
  const max = Math.max(hasGoal ? goal : 0, ...data, 1) * 1.1, w = 300, h = 90, bw = w / data.length;
  return (
    <Card>
      <CardLabel right={<span style={{ fontSize: 11, color: T.text.muted }}>7 dagar</span>}>Kaloritrend</CardLabel>
      <svg width="100%" viewBox={`0 0 ${w} ${h + 18}`}>
        {hasGoal && <line x1="0" y1={h - goal / max * h} x2={w} y2={h - goal / max * h} stroke={T.accent.success} strokeDasharray="4 4" strokeWidth="1" opacity="0.7" />}
        {data.map((v, i) => {
          const bh = v / max * h, today = i === data.length - 1;
          return <g key={i}>
            <rect x={i * bw + bw * 0.2} y={h - bh} width={bw * 0.6} height={bh} rx="3" fill={today ? T.accent.secondary : T.bg.muted} />
            <text x={i * bw + bw / 2} y={h + 13} fontSize="9" fill={T.text.muted} textAnchor="middle">{days[i]}</text>
          </g>;
        })}
      </svg>
      <div style={{ fontSize: 11, color: T.text.muted, marginTop: 4 }}>{hasGoal ? `Streckad linje = mål (${goal} kcal)` : "Inget kalorimål angivet ännu."}</div>
    </Card>
  );
}

function AddFoodModal({ onAdd, onClose, history, initial }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("Alla");
  const [sel, setSel] = useState(initial || null);
  const [grams, setGrams] = useState(100);
  const filtered = q.trim()
    ? (searchFoods(q, group, history, 60) || [])
    : (group !== "Alla" ? FOOD_INDEX.filter(f => f.group === group).slice(0, 60) : FOODS);
  const macro = sel ? { kcal: Math.round(sel.kcal * grams / 100), protein: Math.round(sel.protein * grams / 100), carbs: Math.round(sel.carbs * grams / 100), fat: Math.round(sel.fat * grams / 100) } : null;
  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 20, fontWeight: 800 }}>Lägg till livsmedel</span>
          <button onClick={onClose} style={btn.icon}>×</button>
        </div>
        {!sel ? (
          <>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Sök: abborre, havregryn, falukorv…" style={{ ...input, marginBottom: 8 }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
              {["Alla", ...FOOD_GROUPS].map(g => <button key={g} onClick={() => setGroup(g)} style={{ ...btn.tag, fontSize: 12, background: group === g ? T.accent.primary : T.bg.raised, color: group === g ? "#fff" : T.text.secondary }}>{g}</button>)}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 340, overflowY: "auto" }}>
              {filtered.map(f => (
                <button key={f.id} onClick={() => setSel(f)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: T.bg.raised, border: "none", borderRadius: 8, cursor: "pointer", textAlign: "left" }}>
                  <div><div style={{ fontSize: 14, color: T.text.primary }}>{f.name}</div><div style={{ fontSize: 11, color: T.text.muted }}>{f.group} · {f.kcal} kcal / 100 g</div></div>
                  <span style={{ fontSize: 11, color: T.accent.success }}>{f.protein}g P</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button onClick={() => setSel(null)} style={{ background: "none", border: "none", color: T.accent.primary, cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 10 }}>‹ Alla livsmedel</button>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{sel.name}</div>
            <div style={{ fontSize: 11, color: T.text.muted, marginBottom: 12 }}><span style={{ color: qualityColor(foodVerification(sel) === "verified" ? "exact" : "estimated") }}>●</span> {SOURCE_LABEL[foodSource(sel)] || "ATLAS"}{foodSource(sel) === "livsmedelsverket" ? ` · Livsmedelsdatabasen ${FOOD_DB.version}` : ""}</div>
            <div style={{ marginBottom: 12 }}><Stepper label="Mängd" value={grams} step={10} min={10} unit="g" onChange={setGrams} /></div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[["kcal", macro.kcal, T.accent.secondary], ["Protein", macro.protein + "g", T.accent.success], ["Kolh.", macro.carbs + "g", T.accent.warning], ["Fett", macro.fat + "g", T.accent.primary]].map(([l, v, c]) => (
                <div key={l} style={{ flex: 1, background: T.bg.raised, borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: c }}>{v}</div><div style={{ fontSize: 10, color: T.text.muted }}>{l}</div>
                </div>
              ))}
            </div>
            <button onClick={() => onAdd({ foodId: sel.id, grams, ts: Date.now() })} style={{ ...btn.primary, width: "100%" }}>Lägg till i dagens logg</button>
          </>
        )}
      </div>
    </div>
  );
}

function BarcodeScanner({ onAdd, onClose }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [grams, setGrams] = useState(100);
  const [camState, setCamState] = useState("idle"); // idle|on|unsupported|denied
  const [uf, setUf] = useState({ name: "", kcal: "", protein: "", carbs: "", fat: "", code: "" });
  const videoRef = useRef(null);

  const doLookup = async c => {
    const bc = (c || "").trim(); if (!bc) return;
    setLoading(true); setNotFound(false); setResult(null);
    try { const p = await lookupBarcode(bc); if (p && (p.kcal || p.protein || p.carbs || p.fat)) setResult(p); else { setNotFound(true); setUf(u => ({ ...u, code: bc })); } }
    catch (e) { setNotFound(true); setUf(u => ({ ...u, code: bc })); }
    setLoading(false);
  };

  useEffect(() => {
    if (camState !== "on") return;
    let stream, raf, det, stop = false;
    (async () => {
      try {
        if (!("BarcodeDetector" in window)) { setCamState("unsupported"); return; }
        det = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        const tick = async () => {
          if (stop) return;
          try { const codes = await det.detect(videoRef.current); if (codes && codes.length) { setCamState("idle"); doLookup(codes[0].rawValue); return; } } catch (e) { }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch (e) { setCamState("denied"); }
    })();
    return () => { stop = true; if (raf) cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, [camState]);

  const logIt = (name, macros) => { const k = grams / 100; onAdd({ name, kcal: Math.round(macros.kcal * k), protein: Math.round(macros.protein * k), carbs: Math.round(macros.carbs * k), fat: Math.round(macros.fat * k), quality: macros.q || "external", source: macros.source, barcode: macros.code, ts: Date.now() }); };

  return (<div style={overlay} onClick={onClose}><div style={modal} onClick={e => e.stopPropagation()}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <span style={{ fontSize: 20, fontWeight: 800 }}>Skanna streckkod</span>
      <button onClick={onClose} style={btn.icon}>×</button>
    </div>

    {!result && !notFound && <>
      <div style={{ background: "#000", borderRadius: 12, aspectRatio: "4/3", overflow: "hidden", position: "relative", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: camState === "on" ? "block" : "none" }} />
        {camState !== "on" && <div style={{ textAlign: "center", padding: 20 }}>
          <div style={{ fontSize: 34, marginBottom: 8, display: "flex", justifyContent: "center", color: "#bbb" }}><Icon name="camera" size={34} /></div>
          {camState === "unsupported" ? <div style={{ fontSize: 12.5, color: "#bbb" }}>Kameraskanning stöds inte i denna webbläsare. Skriv in streckkoden nedan.</div>
            : camState === "denied" ? <div style={{ fontSize: 12.5, color: "#bbb" }}>Ingen kameraåtkomst. Kräver hostad HTTPS-sida. Skriv in streckkoden nedan.</div>
              : <button onClick={() => setCamState("on")} style={{ ...btn.primary }}>Starta kamera</button>}
        </div>}
        {camState === "on" && <div style={{ position: "absolute", left: "12%", right: "12%", top: "42%", height: 2, background: T.accent.danger, boxShadow: `0 0 8px ${T.accent.danger}` }} />}
      </div>
      <div style={{ fontSize: 12, color: T.text.muted, marginBottom: 6 }}>…eller skriv in streckkoden (EAN/UPC):</div>
      <div style={{ display: "flex", gap: 6 }}>
        <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} onKeyDown={e => e.key === "Enter" && doLookup(code)} placeholder="7310865004703" inputMode="numeric" style={{ ...input, marginBottom: 0 }} />
        <button onClick={() => doLookup(code)} disabled={loading} style={{ ...btn.primary, whiteSpace: "nowrap" }}>{loading ? "Söker…" : "Slå upp"}</button>
      </div>
    </>}

    {result && <>
      <div style={{ padding: "14px 15px", background: T.bg.raised, borderRadius: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: T.text.muted, marginBottom: 3 }}><span style={{ color: qualityColor("external") }}>◐</span> Extern produktdata (Open Food Facts) · streckkod {result.code}</div>
        <div style={{ fontSize: 17, fontWeight: 700 }}>{result.name}</div>
        {result.brand && <div style={{ fontSize: 12.5, color: T.text.secondary }}>{result.brand}</div>}
        <div style={{ fontSize: 12.5, color: T.text.secondary, marginTop: 8 }}>Per 100 g: {result.kcal} kcal · {result.protein} g P · {result.carbs} g K · {result.fat} g F</div>
        <div style={{ fontSize: 11, color: T.text.muted, marginTop: 6 }}>Källa: Open Food Facts · Status: Extern produktdata — ej verifierad av ATLAS.</div>
      </div>
      <div style={{ marginBottom: 12 }}><Stepper label="Mängd" value={grams} step={10} min={10} unit="g" onChange={setGrams} /></div>
      <button onClick={() => logIt(result.brand ? `${result.name} (${result.brand})` : result.name, { ...result, q: "external" })} style={{ ...btn.primary, width: "100%" }}>Logga ({Math.round(result.kcal * grams / 100)} kcal)</button>
      <button onClick={() => logIt(result.brand ? `${result.name} (${result.brand})` : result.name, { ...result, q: "user_confirmed" })} style={{ background: "none", border: `1px solid ${T.accent.success}55`, color: T.accent.success, borderRadius: 8, padding: "8px 12px", fontSize: 12.5, cursor: "pointer", width: "100%", marginTop: 8 }}>Jag har kollat värdena mot förpackningen</button>
      <div style={{ fontSize: 10.5, color: T.text.muted, marginTop: 8 }}>Produktdata från Open Food Facts — community-tillhandahållen data, ej verifierad av ATLAS (ODbL).</div>
      <button onClick={() => { setResult(null); setCode(""); }} style={{ background: "none", border: "none", color: T.accent.primary, cursor: "pointer", fontSize: 13, marginTop: 8 }}>‹ Skanna en till</button>
    </>}

    {notFound && <>
      <div style={{ padding: "12px 14px", background: "rgba(255,169,46,0.1)", borderRadius: 10, marginBottom: 12, fontSize: 13, color: T.text.secondary }}>Produkten hittades inte för streckkod {uf.code}. Fotoigenkänning av näringsdeklarationen läggs till senare. Skriv tills vidare in värdena från förpackningen — jag sparar den som din egen produkt kopplad till streckkoden.</div>
      <input value={uf.name} onChange={e => setUf({ ...uf, name: e.target.value })} placeholder="Produktnamn" style={{ ...input, marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {[["kcal", "kcal"], ["protein", "protein g"], ["carbs", "kolh g"], ["fat", "fett g"]].map(([k, ph]) => (
          <input key={k} value={uf[k]} onChange={e => setUf({ ...uf, [k]: e.target.value.replace(/[^\d.]/g, "") })} placeholder={ph} inputMode="decimal" style={{ ...input, marginBottom: 0, textAlign: "center", padding: "9px 6px" }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: T.text.muted, marginBottom: 8 }}>Värden per 100 g. Sparas som ○ ej verifierad tills du bekräftat.</div>
      <div style={{ marginBottom: 12 }}><Stepper label="Mängd" value={grams} step={10} min={10} unit="g" onChange={setGrams} /></div>
      <button onClick={() => logIt(uf.name || "Egen produkt", { kcal: +uf.kcal || 0, protein: +uf.protein || 0, carbs: +uf.carbs || 0, fat: +uf.fat || 0, q: "estimated", source: "user", code: uf.code })} style={{ ...btn.primary, width: "100%" }}>Spara & logga</button>
      <button onClick={() => { setNotFound(false); setCode(""); }} style={{ background: "none", border: "none", color: T.accent.primary, cursor: "pointer", fontSize: 13, marginTop: 8 }}>‹ Tillbaka</button>
    </>}
  </div></div>);
}

function SupplementsCard({ supplements = [], setSupplements, advice = [] }) {
  const [pick, setPick] = useState("");
  const [cName, setCName] = useState("");
  const [cDose, setCDose] = useState("");
  const [brand, setBrand] = useState("");
  const have = new Set(supplements.map(s => s.id));
  const addCat = id => { const c = SUPP_BY_ID[id]; if (!c || have.has(id)) return; setSupplements([...supplements, { id, name: c.name, dose: c.dose, ...(brand ? { brand } : {}) }]); setPick(""); };
  const addCustom = () => { const n = cName.trim(); if (!n) return; setSupplements([...supplements, { id: "custom_" + Date.now(), name: n, dose: cDose.trim(), ...(brand ? { brand } : {}) }]); setCName(""); setCDose(""); };
  const remove = i => setSupplements(supplements.filter((_, j) => j !== i));
  const ev = e => SUPP_EVIDENCE[e] || SUPP_EVIDENCE.medel;
  return (
    <Card>
      <CardLabel>Kosttillskott</CardLabel>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: T.text.muted, textTransform: "uppercase", margin: "2px 0 8px" }}>Mina tillskott</div>
      {supplements.length === 0 && <div style={{ fontSize: 12.5, color: T.text.muted, marginBottom: 8 }}>Inga tillskott inlagda än — lägg till nedan eller från förslagen.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
        {supplements.map((s, i) => (
          <div key={s.id + i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 11px", background: T.bg.raised, borderRadius: 8 }}>
            <div><span style={{ fontSize: 13.5, color: T.text.primary }}>{s.name}</span>{s.brand ? <span style={{ fontSize: 11.5, color: T.accent.primary }}> · {s.brand}</span> : null}{s.dose ? <span style={{ fontSize: 11.5, color: T.text.muted }}> · {s.dose}</span> : null}</div>
            <button onClick={() => remove(i)} style={{ background: "none", border: "none", color: T.text.muted, cursor: "pointer", fontSize: 15 }}>×</button>
          </div>
        ))}
      </div>
      <input value={brand} onChange={e => setBrand(e.target.value)} list="supp-brands" placeholder="Märke (valfritt) — gäller nästa tillägg" style={{ ...input, marginBottom: 6 }} />
      <datalist id="supp-brands">{SUPP_BRANDS.map(b => <option key={b} value={b} />)}</datalist>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <select value={pick} onChange={e => addCat(e.target.value)} style={{ ...input, flex: 1 }}>
          <option value="">Lägg till från listan…</option>
          {SUPP_CATS.map(cat => {
            const items = SUPPLEMENTS.filter(c => c.cat === cat && !have.has(c.id));
            if (!items.length) return null;
            return <optgroup key={cat} label={cat}>{items.map(c => <option key={c.id} value={c.id}>{c.name} ({c.dose})</option>)}</optgroup>;
          })}
        </select>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
        <input value={cName} onChange={e => setCName(e.target.value)} placeholder="Eget tillskott" style={{ ...input, flex: 1.4 }} />
        <input value={cDose} onChange={e => setCDose(e.target.value)} placeholder="dos" style={{ ...input, flex: 1 }} />
        <button onClick={addCustom} style={{ ...btn.pill, flexShrink: 0 }}>Lägg till</button>
      </div>
      {advice.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.bg.raised}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: T.text.muted, textTransform: "uppercase", marginBottom: 3 }}>Värt att överväga</div>
          <div style={{ fontSize: 11, color: T.text.muted, marginBottom: 10 }}>Utifrån din träning och de senaste dagarnas intag — inte en diagnos.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {advice.map(a => {
              const c = SUPP_BY_ID[a.id]; if (!c) return null; const e = ev(c.evidence);
              return (
                <div key={a.id} style={{ padding: "11px 12px", background: T.bg.raised, borderRadius: 10, borderLeft: `3px solid ${e.c}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: T.text.primary }}>{c.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: e.c, background: `${e.c}22`, padding: "2px 7px", borderRadius: 5 }}>{e.label}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: T.text.secondary, lineHeight: 1.5 }}>{a.why}</div>
                  <div style={{ fontSize: 11.5, color: T.text.muted, lineHeight: 1.5, marginTop: 4 }}>{c.note}</div>
                  {a.medical && <div style={{ fontSize: 11, color: T.accent.warning, marginTop: 5 }}>⚕ Rådgör med vården innan du börjar.</div>}
                  <button onClick={() => setSupplements([...supplements, { id: a.id, name: c.name, dose: c.dose }])} style={{ ...btn.tag, marginTop: 8, background: `${T.accent.primary}22`, color: T.accent.primary, fontWeight: 600 }}>+ Lägg till i mina</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ fontSize: 10.5, color: T.text.muted, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.bg.raised}`, lineHeight: 1.5 }}>Tillskott ersätter inte varierad mat och tillräckligt med energi. Detta är allmän, evidensnära information — inte medicinsk rådgivning.</div>
    </Card>
  );
}

function NutritionView({ foodLog, setFoodLog, mealMemory, setMealMemory, nutStyle, setNutStyle, nutritionTargets, profile = null, measurements = [], demo = false, supplements = [], setSupplements, sessions = [], nutritionTotals = null , onOpenRecipes = null }) {
  const [adding, setAdding] = useState(false);
  const [preFood, setPreFood] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [quickText, setQuickText] = useState("");
  const [est, setEst] = useState(null);        // pending estimate
  const [decision, setDecision] = useState(null); // pending fråga (generisk/vag/okänd)
  const [estText, setEstText] = useState("");  // text som estimatet bygger på
  const [portion, setPortion] = useState("normal");
  const [rescueSit, setRescueSit] = useState(null);
  const [crisisText, setCrisisText] = useState("");
  const [crisisEcho, setCrisisEcho] = useState("");
  // Dagens intag = bara dagens poster. foodLog är fler-dags (för trender/recent),
  // så filtrera hit — annars summeras hela historiken som "idag". todayIdx bevarar
  // originalindex så radering träffar rätt post i hela loggen.
  const t0ms = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
  const todayIdx = [], todayLog = [];
  (foodLog || []).forEach((e, idx) => { if ((e.ts == null ? t0ms : e.ts) >= t0ms) { todayLog.push(e); todayIdx.push(idx); } });
  const totals = computeNutrition(todayLog);
  const dayRange = dayNutritionRange(todayLog);
  // §4: EN upplöst målkälla. Real Mode utan mål → tomt-tillstånd, aldrig demo-standarden 2200/148.
  const g = nutritionTargets || NUTRITION_GOALS;
  const hasKcal = g.hasKcal !== undefined ? g.hasKcal : g.kcal != null;
  const hasProtein = g.hasProtein !== undefined ? g.hasProtein : g.protein != null;
  const noTarget = !demo && !hasKcal && !hasProtein;
  const nrm = nutritionReadinessModifier(totals, { kcal: hasKcal ? g.kcal : 0, protein: hasProtein ? g.protein : 0 });
  const memory = mealMemory || [];
  const recent = recentIntakeSummary(foodLog, { kcal: hasKcal ? g.kcal : null, protein: hasProtein ? g.protein : null });
  const progress = nutritionProgress(profile, measurements);
  const topMeals = [...memory].sort((a, b) => b.count - a.count).slice(0, 4);
  const remembered = (est || decision) ? null : matchMemory(memory, quickText);
  const dbHits = (!est && !decision && quickText.trim().length >= 2) ? (searchFoods(quickText, "Alla", foodLog, 5) || []) : [];
  const logMeal = (m) => { setFoodLog(l => [...l, { name: m.name, kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat, quality: m.quality || "ai_estimated", ts: Date.now() }]); if (setMealMemory) setMealMemory(mem => rememberMeal(mem, m)); };
  // Beslutslager ovanpå den regelbaserade estimatorn: fråga vid generisk/vag/okänd beskrivning.
  const runEstimate = () => {
    if (!quickText.trim()) return;
    const d = mealDecision(quickText);
    if (d.kind === "described") { setEstText(quickText); setEst(estimateMeal(quickText, portion)); setDecision(null); }
    else setDecision(d);
  };
  const pickChoice = (val) => {
    const text = /^__/.test(val) ? val : quickText + " " + val;
    setEstText(text); setEst(estimateMeal(text, portion)); setDecision(null);
  };
  const saveEstimate = () => {
    const e = estimateMeal(estText || quickText, portion);
    const entry = { name: quickText.trim() || "Uppskattad måltid", kcal: e.kcal, protein: e.protein, carbs: e.carbs, fat: e.fat, quality: "ai_estimated", portion, estimateLow: e.estimateLow, estimateHigh: e.estimateHigh, confidence: e.confidence, assumptions: e.assumptions, estimationMethod: e.estimationMethod, ts: Date.now() };
    setFoodLog(l => [...l, entry]); if (setMealMemory) setMealMemory(mem => rememberMeal(mem, entry));
    setQuickText(""); setEst(null); setDecision(null); setEstText(""); setPortion("normal");
  };
  const entryView = (e, origIdx) => {
    const food = e.foodId ? FOOD_INDEX.find(x => x.id === e.foodId) : null;
    const q = e.quality || (food ? foodVerification(food) : "verified");
    const name = food ? food.name : e.name;
    if (!name) return null;
    const kcal = e.foodId ? Math.round((FOOD_INDEX.find(x => x.id === e.foodId).kcal) * e.grams / 100) : e.kcal;
    const prot = e.foodId ? Math.round((FOOD_INDEX.find(x => x.id === e.foodId).protein) * e.grams / 100) : e.protein;
    const sub = e.foodId ? `${e.grams} g · ${kcal} kcal · ${prot} g P` : `${e.portion ? ({ small: "litet", normal: "normalt", large: "stort" }[e.portion] + " · ") : ""}${kcal} kcal · ${prot} g P`;
    return (
      <div key={origIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 11px", background: T.bg.raised, borderRadius: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, color: T.text.primary, display: "flex", alignItems: "center", gap: 6 }}>
            <span title={(QUALITY[q]||QUALITY.unverified).label} style={{ fontSize: 10, color: qualityColor(q) }}>{(QUALITY[q]||QUALITY.unverified).dot}</span>{name}
          </div>
          <div style={{ fontSize: 11, color: T.text.muted }}>{sub}</div>
        </div>
        <button onClick={() => setFoodLog(l => l.filter((_, j) => j !== origIdx))} style={{ background: "none", border: "none", color: T.text.muted, cursor: "pointer", fontSize: 15 }}>×</button>
      </div>
    );
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, alignItems: "start" }} className="nut-grid">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {onOpenRecipes && (
          <button onClick={onOpenRecipes} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: T.bg.surface, border: `1px solid ${T.bg.muted}`, borderRadius: 12, padding: "12px 14px", cursor: "pointer", textAlign: "left" }}>
            <span><span style={{ fontSize: 13.5, fontWeight: 700, color: T.text.primary }}>Recept & veckomeny</span><span style={{ fontSize: 11.5, color: T.text.muted, display: "block", marginTop: 2 }}>Makron räknade ur ingredienserna, anpassat efter dina kostval</span></span>
            <span style={{ color: T.accent.primary, fontSize: 17 }}>›</span>
          </button>
        )}
        <Card>
          <CardLabel right={<span style={{ fontSize: 12, color: T.text.secondary }}>{totals.estimated > 0 ? "≈ " : ""}{totals.kcal}{hasKcal ? ` / ${g.kcal}` : ""} kcal</span>}>Dagens intag</CardLabel>
          {noTarget && <div style={{ fontSize: 12.5, color: T.text.secondary, background: T.bg.raised, borderRadius: 10, padding: "9px 11px", marginBottom: 12, lineHeight: 1.5 }}>Inget personligt mål angivet ännu. Ange kalori-/proteinmål i onboarding eller din profil så visas måluppfyllnad och makroringar mot mål.</div>}
          <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 12 }}>
            <MacroRing label="Protein" value={totals.protein} goal={hasProtein ? g.protein : null} color={T.accent.success} />
            <MacroRing label="Kolhydrater" value={totals.carbs} goal={g.carbs} color={T.accent.warning} />
            <MacroRing label="Fett" value={totals.fat} goal={g.fat} color={T.accent.primary} />
          </div>
          {dayRange && dayRange.estimatedCount > 0 && <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 10, textAlign: "center" }}>Registrerat intag ≈ {totals.kcal} kcal. Rimligt intervall {dayRange.low}–{dayRange.high} kcal ({dayRange.estimatedCount} av {totals.total} måltider uppskattade). Praktisk uppskattning, inte ett statistiskt konfidensintervall.</div>}
          <div style={{ marginTop: 14, padding: "10px 12px", background: T.bg.raised, borderRadius: 10, borderLeft: `3px solid ${T.accent.secondary}`, fontSize: 13, color: T.text.secondary, lineHeight: 1.5 }}>
            <span style={{ color: T.accent.secondary }}>✦</span>{" "}
            {!hasProtein
              ? `Du har fått i dig ${totals.protein} g protein idag. Ange ett proteinmål så kan jag följa hur nära du är.`
              : nrm.proteinPct >= 0.9 ? `Bra proteinintag så här långt (${totals.protein} g).` : `Du ligger under dagens proteinmål så här långt — ett proteinrikt nästa mål kan hjälpa dig nå det (≈${nrm.remainingProtein} g kvar).`}
            {hasKcal && nrm.remainingKcal > 0 && ` Ungefär ${nrm.remainingKcal} kcal kvar till målet idag.`}
            {(() => {
              const rp = recommendedProtein(profile, measurements);
              if (!rp) return null;
              return <div style={{ marginTop: 8, fontSize: 12, color: T.text.secondary }}>Rekommenderat protein: <b style={{ color: T.text.primary }}>~{rp.grams} g/dag</b> ({rp.low}–{rp.high} g) — {rp.basis === "lean" ? `baserat på din fettfria massa (${rp.leanMass} kg)` : `baserat på din kroppsvikt (${rp.weight} kg)`}.{rp.basis === "weight" ? " Räkna ut kroppsfettet i profilen för ett mer träffsäkert mål per fettfri massa." : ""}</div>;
            })()}
            <div style={{ marginTop: 6, fontSize: 11.5, color: T.text.muted }}>{nutritionReadinessSignal(null).message}</div>
          </div>
        </Card>
        {(() => {
          const micros = computeMicros(todayLog);
          const keys = MICRO_KEYS.filter(k => micros[k] != null);
          if (!keys.length) return null;
          const gender = profile && profile.gender;
          return (
            <Card>
              <CardLabel right={<span style={{ fontSize: 10.5, color: T.text.muted }}>Livsmedelsverket</span>}>Mikronäring idag</CardLabel>
              <div style={{ fontSize: 11.5, color: T.text.muted, marginBottom: 11, lineHeight: 1.5 }}>Ur dagens källförda livsmedel. Andel av referensvärde ({gender === "female" ? "kvinna" : gender === "male" ? "man" : "generellt"}) — en fingervisning, inte ett exakt facit.</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
                {keys.map(k => {
                  const r = microRef(k, gender), val = micros[k];
                  const pct = Math.min(100, Math.round((val / r.ri) * 100));
                  const over = r.kind === "max" && val > r.ri;
                  const col = r.kind === "max" ? (over ? T.accent.danger : T.accent.success) : pct >= 100 ? T.accent.success : pct >= 50 ? T.accent.primary : T.accent.warning;
                  return (
                    <div key={k}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                        <span style={{ color: T.text.secondary }}>{r.label}</span>
                        <span style={{ color: T.text.primary, fontWeight: 600 }}>{val < 10 ? Math.round(val * 10) / 10 : Math.round(val)} {r.unit}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: T.bg.raised, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.max(3, pct)}%`, background: col, borderRadius: 3 }} />
                      </div>
                      <div style={{ fontSize: 10, color: T.text.muted, marginTop: 2 }}>{r.kind === "max" ? (over ? "över rekommenderat max" : `${pct}% av max ${r.ri} ${r.unit}`) : `${pct}% av ${r.ri} ${r.unit}`}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })()}
        {setSupplements && (() => {
          const advice = supplementAdvice({ profile, foodLog, sessions, nutritionTotals, nutritionTargets, existing: supplements.map(s => s.id) });
          return <SupplementsCard supplements={supplements} setSupplements={setSupplements} advice={advice} />;
        })()}
        <Card style={{ background: `linear-gradient(135deg, ${T.bg.surface}, rgba(235,104,62,0.05))` }}>
          <CardLabel right={<span style={{ fontSize: 10, fontWeight: 700, color: T.accent.warning, background: "rgba(255,209,102,0.14)", padding: "2px 7px", borderRadius: 5 }}>RESCUE</span>}>Rädda måltiden</CardLabel>
          <div style={{ fontSize: 12.5, color: T.text.secondary, marginBottom: 10 }}>Hungrig, sliten eller sugen och på väg att göra ett dåligt val? Välj läget — eller skriv ditt eget — så väger jag in de senaste dagarnas intag, ditt mål och din utveckling och ger dig det bästa realistiska beslutet just nu.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {RESCUE_SITUATIONS.map(s => {
              const on = rescueSit === s.id && !crisisEcho;
              return <button key={s.id} onClick={() => { setRescueSit(on ? null : s.id); setCrisisText(""); setCrisisEcho(""); }} style={{ ...btn.tag, fontSize: 12.5, background: on ? T.accent.warning : T.bg.raised, color: on ? "#1a1420" : T.text.secondary, fontWeight: 600 }}>{s.label}</button>;
            })}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={crisisText} onChange={e => setCrisisText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && crisisText.trim()) { setRescueSit(interpretCrisis(crisisText)); setCrisisEcho(crisisText.trim()); } }}
              placeholder="…eller beskriv ditt läge: t.ex. sug på tacos, sen kväll" style={{ ...input, fontSize: 12.5 }} />
            <button onClick={() => { if (crisisText.trim()) { setRescueSit(interpretCrisis(crisisText)); setCrisisEcho(crisisText.trim()); } }} style={{ ...btn.tag, background: T.accent.secondary, color: "#fff", fontWeight: 600, whiteSpace: "nowrap" }}>Fråga coachen</button>
          </div>
          {rescueSit && (() => {
            const remaining = { kcal: hasKcal ? Math.max(0, g.kcal - totals.kcal) : 0, protein: hasProtein ? Math.max(0, g.protein - totals.protein) : 0 };
            const r = buildRescue(rescueSit, remaining, nutStyle, memory, recent, progress);
            const sitSv = { hungry: "hungrig", nocook: "orkar inte laga", hungover: "bakis", sweet: "sötsugen", empty: "inget hemma", pizza: "pizzasug", fastfood: "snabbmat", custom: "allmänt läge" };
            return (
              <div style={{ marginTop: 12 }}>
                {crisisEcho && <div style={{ fontSize: 11.5, color: T.text.muted, marginBottom: 8 }}>Uppfattat: "{crisisEcho}" → <b style={{ color: T.text.secondary }}>{sitSv[rescueSit] || rescueSit}</b></div>}
                <div style={{ fontSize: 12.5, color: T.text.secondary, lineHeight: 1.55, padding: "10px 12px", background: "rgba(77,163,255,0.06)", borderRadius: 10, borderLeft: `3px solid ${T.accent.primary}`, marginBottom: 10 }}>{r.context}</div>
                {recent.enough && (
                  <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                    {recent.days.slice().reverse().map((d, i) => (
                      <div key={i} style={{ fontSize: 11, color: T.text.muted, background: T.bg.raised, borderRadius: 6, padding: "3px 8px" }}>
                        {new Date(d.date).toLocaleDateString("sv-SE", { weekday: "short" })} <b style={{ color: T.text.secondary }}>{d.kcal}</b> kcal
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 12, color: T.text.muted, marginBottom: 8 }}>Kvar idag: ~{remaining.kcal} kcal · {remaining.protein} g protein. Mina förslag:</div>
                {r.opts.map((o, i) => (
                  <div key={i} style={{ padding: "10px 12px", background: T.bg.raised, borderRadius: 10, marginBottom: 7, borderLeft: `3px solid ${r.rec.pick === i + 1 ? T.accent.success : "transparent"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: T.text.primary }}>{i + 1}. {o.title} {r.rec.pick === i + 1 && <span style={{ fontSize: 10, color: T.accent.success, fontWeight: 700 }}>· REKOMMENDERAS</span>}</div>
                      <div style={{ fontSize: 11.5, color: T.text.muted, whiteSpace: "nowrap", marginLeft: 8 }}>{o.kcal}{o.tag ? ` · ${o.tag}` : ""}</div>
                    </div>
                    <div style={{ fontSize: 12.5, color: T.text.secondary, lineHeight: 1.5, marginTop: 3 }}>{o.detail}</div>
                  </div>
                ))}
                <div style={{ fontSize: 12.5, color: T.text.secondary, marginTop: 8, lineHeight: 1.6, padding: "11px 13px", background: T.bg.surface, border: `1px solid ${T.bg.muted}`, borderRadius: 10, borderLeft: `3px solid ${T.accent.secondary}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}><Icon name="sparkles" size={12} color={T.accent.secondary} /><span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: T.accent.secondary, textTransform: "uppercase" }}>Coach · {(NUTRITION_STYLES.find(s => s.id === nutStyle) || {}).label || "Balanserad"}</span></div>
                  {r.coach}
                </div>
                <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 8, padding: "8px 10px", background: "rgba(57,217,138,0.06)", borderRadius: 8 }}><Icon name="heart" size={13} color={T.accent.success} style={{ verticalAlign: "-2px" }} /> {r.guard}</div>
              </div>
            );
          })()}
        </Card>
        <Card>
          <CardLabel>Coaching-stil · kost</CardLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {NUTRITION_STYLES.map(s => (
              <button key={s.id} onClick={() => setNutStyle && setNutStyle(s.id)} style={{ textAlign: "left", padding: "10px 12px", borderRadius: 10, border: `1px solid ${nutStyle === s.id ? T.accent.secondary : "transparent"}`, cursor: "pointer", background: nutStyle === s.id ? "rgba(155,124,255,0.10)" : T.bg.raised }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ fontSize: 12, color: nutStyle === s.id ? T.accent.secondary : T.text.muted }}>{nutStyle === s.id ? "●" : "○"}</span><span style={{ fontSize: 13.5, fontWeight: 700, color: T.text.primary }}>{s.label}</span></div>
                <div style={{ fontSize: 12, color: T.text.secondary, marginTop: 2 }}>{s.tag}</div>
                {nutStyle === s.id && <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 5, fontStyle: "italic" }}>{s.ex}</div>}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 10, padding: "8px 10px", background: "rgba(77,163,255,0.05)", borderRadius: 8 }}>Atlas lär sig över tid vilken stil som faktiskt håller dig loggande — och kan föreslå en mjukare linje om strikta svar oftare får dig att sluta registrera. Aktiveras med mer historik.</div>
        </Card>
        <NutritionWeekChart foodLog={foodLog} todayKcal={totals.kcal} goal={hasKcal ? g.kcal : null} demo={demo} />
      </div>

      <Card>
        <CardLabel right={<span style={{ display: "flex", gap: 6 }}><button onClick={() => setScanning(true)} style={{ ...btn.tag, fontSize: 12 }}><Icon name="camera" size={13} style={{ verticalAlign: "-2px" }} /> Skanna</button><button onClick={() => setAdding(true)} style={{ ...btn.tag, fontSize: 12 }}>Exakt +</button></span>}>Snabblogg</CardLabel>
        <div style={{ fontSize: 12, color: T.text.muted, marginBottom: 8 }}>Skriv fritt, t.ex. "köttbullar potatis gräddsås på restaurang" eller "fika på stan".</div>
        <div style={{ display: "flex", gap: 6, marginBottom: est ? 10 : 0 }}>
          <input value={quickText} onChange={e => { setQuickText(e.target.value); setEst(null); setDecision(null); }} onKeyDown={e => { if (e.key === "Enter") runEstimate(); }} placeholder="Beskriv din måltid…" style={{ flex: 1, background: T.bg.raised, border: `1px solid ${T.bg.muted}`, borderRadius: 8, padding: "9px 11px", color: T.text.primary, fontSize: 13.5, boxSizing: "border-box" }} />
          <button onClick={runEstimate} style={{ ...btn.primary, whiteSpace: "nowrap" }}>Uppskatta</button>
        </div>
        {dbHits.length > 0 && (
          <div style={{ marginBottom: 12, background: T.bg.raised, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ fontSize: 10.5, color: T.text.muted, padding: "7px 11px 3px" }}>Träffar i databasen — välj för exakt loggning:</div>
            {dbHits.map(f => (
              <button key={f.id} onClick={() => { setPreFood(f); setAdding(true); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "8px 11px", background: "none", border: "none", borderTop: `1px solid ${T.bg.muted}`, cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 13, color: T.text.primary, display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 9, color: qualityColor(foodVerification(f) === "verified" ? "exact" : "estimated") }}>●</span>{f.name}</span>
                <span style={{ fontSize: 11, color: T.text.muted, whiteSpace: "nowrap", marginLeft: 8 }}>{f.kcal} kcal/100g</span>
              </button>
            ))}
          </div>
        )}
        {remembered && quickText.trim().length >= 3 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "9px 11px", background: "rgba(77,163,255,0.08)", borderRadius: 9, marginBottom: 10 }}>
            <div style={{ fontSize: 12.5, color: T.text.secondary }}>Samma som <b style={{ color: T.text.primary }}>{remembered.name}</b> (~{remembered.kcal} kcal) som förra gången?</div>
            <button onClick={() => { logMeal(remembered); setQuickText(""); }} style={{ ...btn.primary, whiteSpace: "nowrap", padding: "5px 12px", fontSize: 12 }}>Ja, logga</button>
          </div>
        )}
        {topMeals.length > 0 && !est && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: T.text.muted, textTransform: "uppercase", marginBottom: 6 }}>Dina vanliga</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {topMeals.map((m, i) => (
                <button key={i} onClick={() => logMeal(m)} title={`~${m.kcal} kcal · ${m.protein} g protein · loggad ${m.count}×`} style={{ ...btn.tag, fontSize: 12, background: T.bg.raised, color: T.text.secondary, display: "flex", alignItems: "center", gap: 5 }}><span style={{ fontSize: 9, color: qualityColor(m.quality) }}>{(QUALITY[m.quality]||QUALITY.ai_estimated).dot}</span>{m.name.length > 22 ? m.name.slice(0, 21) + "…" : m.name}</button>
              ))}
            </div>
          </div>
        )}
        {decision && (
          <div style={{ padding: "12px 13px", background: T.bg.raised, borderRadius: 10, borderLeft: `3px solid ${T.accent.secondary}`, marginBottom: 12 }}>
            <div style={{ fontSize: 13.5, color: T.text.primary, fontWeight: 600, marginBottom: 8 }}>{decision.q}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {decision.opts.map(([val, lab]) => (
                <button key={lab} onClick={() => pickChoice(val)} style={{ ...btn.tag, fontSize: 12.5, background: T.bg.muted, color: T.text.secondary }}>{lab}</button>
              ))}
            </div>
            <button onClick={() => setDecision(null)} style={{ ...btn.tag, marginTop: 8, fontSize: 12 }}>Avbryt</button>
          </div>
        )}
        {est && (
          <div style={{ padding: "12px 13px", background: T.bg.raised, borderRadius: 10, borderLeft: `3px solid ${T.text.muted}`, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: T.text.muted, marginBottom: 6 }}>Uppskattad måltid <span style={{ color: qualityColor("ai_estimated") }}>· ○ Uppskattad</span> · {est.confidence === "low" ? "låg" : "medel"} konfidens</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.text.primary }}>≈ {est.kcal} kcal</div>
            <div style={{ fontSize: 12, color: T.text.muted, marginTop: 1 }}>rimligt intervall {est.estimateLow}–{est.estimateHigh} kcal</div>
            <div style={{ fontSize: 12.5, color: T.text.secondary, marginTop: 2 }}>{est.protein} g protein · {est.carbs} g kolh · {est.fat} g fett</div>
            <details style={{ marginTop: 6 }}>
              <summary style={{ fontSize: 11.5, color: T.accent.primary, cursor: "pointer" }}>Visa detaljer</summary>
              <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 4, lineHeight: 1.5 }}>Antaganden: {est.assumptions} Metod: regelbaserad uppskattning (ingen AI-modell). Aldrig verifierat värde.</div>
            </details>
            <div style={{ fontSize: 11.5, color: T.text.muted, margin: "10px 0 5px" }}>Var det ungefär ett…</div>
            <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
              {[["small", "Litet"], ["normal", "Normalt"], ["large", "Stort"]].map(([k, lab]) => (
                <button key={k} onClick={() => { setPortion(k); setEst(estimateMeal(estText || quickText, k)); }} style={{ ...btn.tag, flex: 1, fontSize: 12, background: portion === k ? T.accent.primary : T.bg.muted, color: portion === k ? "#fff" : T.text.secondary }}>{lab}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={saveEstimate} style={{ ...btn.primary, flex: 1 }}>Spara estimat</button>
              <button onClick={() => { setEst(null); setEstText(""); }} style={{ ...btn.tag }}>Avbryt</button>
            </div>
          </div>
        )}
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: T.text.muted, textTransform: "uppercase", margin: "4px 0 8px" }}>Dagens logg</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 340, overflowY: "auto" }}>
          {todayLog.length === 0 && <div style={{ fontSize: 13, color: T.text.muted, padding: 12, textAlign: "center" }}>Inga måltider loggade idag.</div>}
          {todayLog.map((e, i) => entryView(e, todayIdx[i]))}
        </div>
        <div style={{ fontSize: 10.5, color: T.text.muted, marginTop: 10, paddingTop: 8, borderTop: `1px solid ${T.bg.raised}` }}>Näringsdata: {FOOD_DB.sourceName}, version {FOOD_DB.sourceVersion} · {FOOD_DB.licenceOrReuseTerms}. ● verifierad källa · ◑ beräknad · ◐ extern (OFF) · ✓ bekräftad · ○ uppskattad.</div>
      </Card>
      {adding && <AddFoodModal history={foodLog} initial={preFood} onAdd={entry => { setFoodLog(l => [...l, entry]); setAdding(false); setPreFood(null); setQuickText(""); }} onClose={() => { setAdding(false); setPreFood(null); }} />}
      {scanning && <BarcodeScanner onAdd={entry => { setFoodLog(l => [...l, entry]); if (setMealMemory) setMealMemory(m => rememberMeal(m, entry)); setScanning(false); }} onClose={() => setScanning(false)} />}
      <style>{`@media (max-width: 820px){ .nut-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

export { NutritionWeekChart, AddFoodModal, BarcodeScanner, NutritionView };
