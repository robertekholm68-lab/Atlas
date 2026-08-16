// Askr 2.0 — mat.
//
// Tre flikar enligt skiss 3: översikt, logga, recept.
//
// Fältnamnet är `kcal`, aldrig `calories` — genomgående lag i projektet.
//
// ÄRLIGHET: utan mål visas inga procent och ingen ring som fylls. Ett mål är
// något användaren sätter, inte något appen hittar på åt hen — en påhittad
// 2000-gräns hade fått verkliga siffror att se ut som avvikelser.

import { useState, useMemo, useRef, useEffect } from "react";
import { RescueView } from "./RescueView.jsx";
import { MealPrepView } from "./MealPrepView.jsx";
import { CustomRecipe } from "./CustomRecipe.jsx";
import { SupplementsPanel } from "./SupplementsPanel.jsx";
import { filterRecipes } from "../engines/recipes.js";
import { mealSuggestions } from "../engines/mealSuggest.js";
import { searchFoods } from "../engines/index.js";
import { Streckkod } from "./Streckkod.jsx";
import { FotoMaltid } from "./FotoMaltid.jsx";
import { useLayout } from "./layout.js";
import { C, HFONT, MONO, hdr, label, btnPrimary, btnGhost, card, statRow, statCell, orDash, DASH, volt } from "./design.js";
import { FOOD_INDEX } from "../data/foods.js";
import { RECIPES } from "../data/recipes.js";
import { grupperaMåltider, måltidAvTid, MÅLTID_SV, MÅLTID_ORDNING } from "../engines/recipes.js";
import { receptBild } from "../data/recipeImages.js";
import { dagensNutrition, nyId } from "./store.js";
import { mealDecision, estimateMeal } from "../engines/index.js";
import { createDictation, voiceSupport } from "../engines/voice.js";
import { buildEstimatedEntry } from "./foodlog.js";

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
      <div style={{ height: 6, borderRadius: 3, background: C.track, overflow: "hidden" }}>
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
      <circle cx={storlek / 2} cy={storlek / 2} r={r} fill="none" stroke={C.track} strokeWidth="9" />
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

function Oversikt({ dagensLogg, totaler, mål, onLogga, onSätta, onÄndra, onÄndraNamn, onSättGram, onSättMåltid, onTaBort }) {
  const [redigerar, setRedigerar] = useState(null);

  const stegKnapp = {
    width: 40, height: 40, borderRadius: 999, flexShrink: 0, fontSize: 17, cursor: "pointer",
    border: `1px solid ${C.border}`, background: C.card2, color: C.text,
  };

  // Mängden ändras i femgramssteg, som i streckkoden och fotovyn — samma
  // finhet överallt man justerar mat.
  const ändraGram = (id, delta) => onÄndra && onÄndra(id, delta);
  const ändraNamn = (id, namn) => onÄndraNamn && onÄndraNamn(id, namn);
  const sättGram = (id, värde) => onSättGram && onSättGram(id, värde);
  const sättMåltid = (id, typ) => onSättMåltid && onSättMåltid(id, typ);
  const taBort = id => { setRedigerar(null); onTaBort && onTaBort(id); };

  // Samma summering (dagensNutrition → computeNutrition) som coachen läser — en
  // sanning, inte två.
  const t = totaler;
  const kvar = mål && mål.kcal ? mål.kcal - t.kcal : null;

  return (
    <div>
      <div style={{ ...card, display: "flex", gap: 16, alignItems: "center" }}>
        <Ring kcal={t.kcal} mål={mål && mål.kcal} />
        <div style={{ flex: 1 }}>
          {/* Guiden: max två accentnivåer i samma graf. Protein är hjälten
              (volt), kolhydrater sekundär datalinje (volt dim), fett neutral. */}
          <Makro namn="Protein" värde={t.protein} mål={mål && mål.protein} färg={C.lime} />
          <Makro namn="Kolhydrater" värde={t.carbs} mål={mål && mål.carbs} färg={C.voltDim} />
          <Makro namn="Fett" värde={t.fat} mål={mål && mål.fat} färg={C.text2} />
        </div>
      </div>

      {kvar !== null ? (
        <div style={{ textAlign: "center", marginTop: 12, fontSize: 13 }}>
          <span style={{ color: C.muted }}>Återstående </span>
          <span style={{ color: kvar >= 0 ? C.lime : C.critical, fontWeight: 700 }}>{Math.round(kvar)} kcal</span>
          {onSätta && <button onClick={onSätta} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", textDecoration: "underline", display: "inline-block", minHeight: 44, padding: "12px 10px", verticalAlign: "middle" }}>Ändra mål</button>}
        </div>
      ) : (
        <div style={{ textAlign: "center", marginTop: 12, fontSize: 12.5, color: C.muted, lineHeight: 1.55 }}>
          Inget kalorimål satt. {onSätta
            ? <button onClick={onSätta} style={{ background: "none", border: "none", color: C.lime, fontSize: 12.5, cursor: "pointer", textDecoration: "underline", display: "inline-block", minHeight: 44, padding: "12px 10px", verticalAlign: "middle" }}>Sätt ett mål</button>
            : "Sätt ett i profilen"} så visas hur mycket som återstår — appen hittar inte på ett åt dig.
        </div>
      )}

      {/* LOGGKNAPPEN STÅR FÖRE LISTAN, INTE EFTER.
          Efter listan vandrar den nedåt för varje loggad måltid: en dag med
          sex poster kräver att man scrollar förbi allt man redan gjort för att
          komma åt det man vill göra. Handlingen ska inte bli svårare att nå ju
          mer man använt appen.

          Listan är dessutom en historik man LÄSER; knappen är det man KOMMER
          hit för. Det som ska tryckas står överst. */}
      <button onClick={onLogga} data-logga-maltid="1"
        style={{ ...btnPrimary, marginTop: 24 }}>
        Logga måltid <span style={{ fontSize: 19 }}>+</span>
      </button>

      <div style={{ ...label(), margin: "22px 0 4px" }}>Dagens måltider</div>
      {dagensLogg.length === 0 ? (
        <div style={{ padding: "26px 16px", textAlign: "center", border: `1px dashed ${C.border}`, borderRadius: 14, fontSize: 13, color: C.muted, lineHeight: 1.55 }}>
          Inget loggat idag.
        </div>
      ) : grupperaMåltider(dagensLogg, e => {
        const f = e.foodId ? FOOD_INDEX.find(x => x.id === e.foodId) : null;
        return f
          ? { kcal: f.kcal * (Number(e.grams) || 0) / 100, protein: f.protein * (Number(e.grams) || 0) / 100 }
          : e;
      }).map(grupp => (
        <div key={grupp.typ}>
          {/* MÅLTIDSRUBRIKEN BÄR SIN EGEN SUMMA.
              En lista på sex poster säger inte var kalorierna ligger; fyra
              rubriker med summor gör det på en blick. Proteinet står med
              eftersom fördelningen över dagen är det enda här som har verkligt
              träningsvärde — 130 g på fyra måltider bygger mer än samma mängd
              på två. */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
            gap: 10, margin: "16px 0 2px", paddingTop: 10, borderTop: `1px solid ${C.hairline}`,
          }}>
            <span style={{ ...label(), color: C.muted }}>{grupp.namn}</span>
            <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>
              {grupp.kcal} kcal · P {grupp.protein} g
            </span>
          </div>
          {grupp.rader.map((e) => {
        const f = e.foodId ? FOOD_INDEX.find(x => x.id === e.foodId) : null;
        const k = f ? Math.round(f.kcal * (Number(e.grams) || 0) / 100) : Math.round(e.kcal || 0);
        const p = f ? Math.round(f.protein * (Number(e.grams) || 0) / 100) : Math.round(e.protein || 0);
        const öppen = redigerar === e.id;
        return (
          // NYCKELN ÄR POSTENS ID, INTE INDEX.
          //
          // Med key={i} återanvänder React fel rad när en post tas bort mitt i
          // listan: den utfällda redigeringen skulle följa med till nästa post.
          // Buggen var latent så länge inget gick att ta bort — nu gör det det.
          <div key={e.id} style={{ borderBottom: `1px solid ${C.border}` }}>
            <button onClick={() => setRedigerar(öppen ? null : e.id)}
              data-post="1" aria-expanded={öppen}
              aria-label={`${e.name || (f && f.name) || "Måltid"}, ${k} kcal — ändra`}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                width: "100%", textAlign: "left", padding: "13px 2px", minHeight: 44,
                background: "none", border: "none", color: C.text, cursor: "pointer",
              }}>
              {/* KOLUMNER, INTE LÖPANDE TEXT.
                  "100 g · P 12 g · uppskattat" tvingar ögat att läsa en mening
                  för att hitta ett tal. Med mängden i egen kolumn kan man skanna
                  listan lodrätt: namn, mängd, kalorier.

                  Mängden visas som den ANGAVS — "2 st" för det man räknade,
                  "100 g" för det man vägde. Gramtalet bakom styckräkningen är
                  motorns mellansteg, inte något användaren sagt. */}
              <span style={{ minWidth: 0, flex: 1, fontSize: 14, overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {e.name || (f && f.name) || "Måltid"}
              </span>
              <span style={{
                fontFamily: MONO, fontSize: 12, color: C.text2, flexShrink: 0,
                width: 58, textAlign: "right", whiteSpace: "nowrap",
              }}>
                {e.antal ? `${e.antal} st` : e.grams ? `${e.grams} g` : ""}
              </span>
              <span style={{ fontFamily: HFONT, fontWeight: 700, fontSize: 15, color: C.lime, flexShrink: 0, marginLeft: 12 }}>
                {k}<span style={{ fontSize: 11, color: C.muted }}> kcal</span>
              </span>
            </button>

            {öppen && (
              <div style={{ padding: "0 2px 14px" }}>
                {/* Protein och tillit flyttade hit från radens undertext. På
                    raden konkurrerade de med mängden och gjorde den svår att
                    skanna; här läser man dem när man faktiskt undrar. */}
                <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted, marginBottom: 10 }}>
                  P {p} g
                  {e.quality === "estimated" ? " · uppskattat" : ""}
                  {e.quality === "photo" ? " · ur foto" : ""}
                </div>
                {/* NAMNET GÅR ATT RÄTTA.
                    Man loggar "kyckl" i farten, eller får "Fotad måltid" ur
                    fotovyn. Utan ett fält står felstavningen kvar i historiken
                    för alltid — och historiken är det man bläddrar i när man
                    försöker minnas vad man åt.

                    Näringen rörs inte. Namnet är en etikett; att låta det styra
                    kalorierna vore att gissa att en omdöpt post också fick nytt
                    innehåll. */}
                <input value={e.name || ""} aria-label="Namn på måltiden"
                  onChange={ev => ändraNamn(e.id, ev.target.value)}
                  placeholder="Vad var det?"
                  data-namn="1"
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 10, minHeight: 44,
                    marginBottom: 12, fontSize: 13.5,
                    border: `1px solid ${C.border}`, background: C.card2, color: C.text,
                  }} />

                {/* MÄNGD GÅR ATT ÄNDRA BARA NÄR POSTEN BÄR ETT LIVSMEDEL.
                    En post från snabbloggen eller ett foto har en summa, inte
                    ett gramtal att skala — att erbjuda en gramknapp där hade
                    varit en kontroll som inte gör något. */}
                {f ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => ändraGram(e.id, -5)} aria-label="Minska mängd"
                      style={stegKnapp}>−</button>
                    {/* TALET ÄR ETT FÄLT, INTE EN ETIKETT.
                        Från 100 till 250 g är trettio tryck på plusknappen.
                        Knapparna är rätt för finjustering, fältet för att byta
                        storleksordning — båda behövs. */}
                    <span style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                      <input value={e.grams} inputMode="numeric" data-gram="1"
                        aria-label="Mängd i gram"
                        onChange={ev => sättGram(e.id, ev.target.value)}
                        style={{
                          fontFamily: MONO, fontSize: 14, width: 52, textAlign: "center",
                          padding: "8px 4px", borderRadius: 8, minHeight: 40,
                          border: `1px solid ${C.border}`, background: C.card2, color: C.text,
                        }} />
                      <span style={{ fontFamily: MONO, fontSize: 12, color: C.muted }}>g</span>
                    </span>
                    <button onClick={() => ändraGram(e.id, 5)} aria-label="Öka mängd"
                      style={stegKnapp}>+</button>
                    <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted, marginLeft: "auto" }}>
                      {Math.round(f.kcal * (Number(e.grams) || 0) / 100)} kcal
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.55 }}>
                    Posten har en färdig summa och ingen mängd att skala. Ta bort
                    den och logga om ifall siffran blev fel.
                  </div>
                )}

                {/* MÅLTIDEN GÅR ATT RÄTTA.
                    Klockslaget är en schablon: den som jobbar natt äter middag
                    klockan fyra på morgonen, och då är etiketten fel. Man
                    behöver aldrig sätta den, men ska kunna. */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                  {MÅLTID_ORDNING.map(t => {
                    const nu = e.meal || måltidAvTid(e.ts);
                    return (
                      <button key={t} onClick={() => sättMåltid(e.id, t)} data-maltid={t}
                        style={{
                          padding: "6px 11px", minHeight: 38, borderRadius: 999, fontSize: 11.5, cursor: "pointer",
                          border: `1px solid ${nu === t ? C.lime : C.border}`,
                          color: nu === t ? C.lime : C.muted,
                          background: nu === t ? volt(.08) : C.card2,
                        }}>{MÅLTID_SV[t]}</button>
                    );
                  })}
                </div>

                <button onClick={() => taBort(e.id)} data-tabort="1"
                  style={{
                    width: "100%", marginTop: 12, padding: "11px 0", minHeight: 44, borderRadius: 999,
                    border: `1px solid ${C.border}`, background: "transparent",
                    color: C.recovering, fontSize: 12.5, cursor: "pointer",
                  }}>
                  Ta bort
                </button>
              </div>
            )}
          </div>
        );
      })}
        </div>
      ))}


    </div>
  );
}

/* ── SNABBLOGG: beskriv eller säg ── */

/**
 * Samma Quick Log-motor som nuvarande appen (mealDecision/estimateMeal) — en
 * regelbaserad estimator, ingen AI-modell. Den frågar vidare när beskrivningen
 * är vag och redovisar antaganden och intervall i stället för att låta en
 * gissning se exakt ut. Rösten FYLLER bara textfältet; ingenting loggas utan
 * att användaren tryckt Lägg till.
 */
function SnabbLogg({ onLägg }) {
  const [text, setText] = useState("");
  const [fråga, setFråga] = useState(null);
  const [est, setEst] = useState(null);
  const [estText, setEstText] = useState("");
  const [portion, setPortion] = useState("normal");
  const [lyssnar, setLyssnar] = useState(false);
  const [nivå, setNivå] = useState(0);
  const [röstNote, setRöstNote] = useState(null);
  const [valdProdukt, setValdProdukt] = useState(null);
  const förslag = useMemo(() => mealSuggestions(text), [text]);
  const stoppa = useRef(null);
  const stöd = useMemo(() => voiceSupport(), []);

  // Lyssningen får aldrig överleva vyn — en mikrofon som står på i bakgrunden
  // är värre än ingen mikrofon.
  useEffect(() => () => { if (stoppa.current) stoppa.current(); }, []);

  const nollställ = () => { setText(""); setEst(null); setFråga(null); setEstText(""); setPortion("normal"); setValdProdukt(null); };

  const uppskatta = () => {
    if (!text.trim()) return;
    const d = mealDecision(text);
    if (d.kind === "described") { setEstText(text); setEst(estimateMeal(text, portion)); setFråga(null); }
    else setFråga({ q: d.q, opts: d.opts });
  };
  const välj = val => {
    const t = /^__/.test(val) ? val : text + " " + val;
    setEstText(t); setEst(estimateMeal(t, portion)); setFråga(null);
  };
  const byting = p => { setPortion(p); setEst(estimateMeal(estText || text, p)); };

  // Valt produkt: texten skrivs om med produktens fulla namn, så uppskattningen
  // görs om mot rätt vara. Ordet ersätts i stället för att läggas till —
  // "lätta lättmargarin 39%" hade matchat två gånger.
  const väljProdukt = a => {
    setValdProdukt(a);
    const bas = estText || text;
    const ny = bas.replace(new RegExp(est.produktval.ord, "i"), a.name);
    setEstText(ny);
    setEst(estimateMeal(ny, portion));
  };
  const lägg = () => {
    const e = estimateMeal(estText || text, portion);
    const post = buildEstimatedEntry(text, e);
    if (post) onLägg({
      id: nyId("f_"), ...post,
      // MÄNGDEN SPARAS SOM DEN ANGAVS.
      //
      // "2 knäckebröd" räknades om till 22 g för näringen, men listan visade
      // sedan "22 g" — ett tal användaren aldrig sagt och inte känner igen.
      // Antalet är det man minns; gramtalet är motorns mellansteg.
      ...(e.angivetAntal ? { antal: e.angivetAntal.antal, antalOrd: e.angivetAntal.ord } : {}),
      ...(e.angivenMängd && !e.angivetAntal ? { grams: e.angivenMängd } : {}),
    });
    nollställ();
  };

  const lyssna = () => {
    if (lyssnar) { if (stoppa.current) stoppa.current(); setLyssnar(false); return; }
    if (!stöd.ok) { setRöstNote(stöd.note); return; }
    setRöstNote(null); setLyssnar(true); setNivå(0);
    stoppa.current = createDictation({
      onResult: t => setText(t),
      onError: (kod, note) => setRöstNote(note),
      onLevel: n => setNivå(n),
      onEnd: () => { setLyssnar(false); setNivå(0); },
    });
  };

  return (
    <div style={{ ...card, marginBottom: 18 }}>
      <div style={{ ...label(), marginBottom: 9 }}>Beskriv eller säg vad du åt</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={text} onChange={e => { setText(e.target.value); setEst(null); setFråga(null); }}
          onKeyDown={e => { if (e.key === "Enter") uppskatta(); }}
          placeholder={lyssnar ? "Lyssnar…" : "t.ex. kyckling med ris och broccoli"}
          style={{ flex: 1, minWidth: 0, background: C.card2, color: C.text, border: `1px solid ${lyssnar ? C.lime : C.border}`, borderRadius: 12, padding: "12px 14px", fontSize: 14, boxSizing: "border-box" }} />
        <button onClick={lyssna} aria-label={lyssnar ? "Sluta lyssna" : "Säg måltiden"} style={{
          width: 46, minHeight: 44, flexShrink: 0, borderRadius: 12, cursor: "pointer",
          border: `1px solid ${lyssnar ? C.lime : C.border}`,
          background: lyssnar ? volt(.12) : C.card2,
          color: stöd.ok ? (lyssnar ? C.lime : C.text) : C.muted, fontSize: 19,
          // Ringen växer med ljudnivån. Det är den enda återkopplingen som
          // fungerar på håll: man ser att mikrofonen hör en utan att läsa text.
          boxShadow: lyssnar && nivå > 0.05
            ? `0 0 0 ${Math.round(2 + nivå * 7)}px ${volt(0.16)}` : "none",
          transition: "box-shadow 90ms linear",
        }}>{lyssnar ? "◼" : "🎤"}</button>
      </div>
      {röstNote && <div style={{ fontSize: 11.5, color: C.recovering, lineHeight: 1.5, marginTop: 8 }}>{röstNote}</div>}

      {/* Vanliga helheter. Skriver man "köttbullar" åt man sällan bara
          köttbullar — potatis, sås och lingon följde med, och utan dem blir
          måltiden systematiskt underskattad. Förslagen FYLLER bara fältet;
          ingenting loggas och ingenting antas. Man ser meningen och kan ändra
          den innan något sparas. */}
      {!est && !fråga && förslag.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
          {förslag.map(f => (
            <button key={f} onClick={() => { setText(f); setEst(null); setFråga(null); }} style={{
              padding: "8px 12px", borderRadius: 999, minHeight: 44, cursor: "pointer", fontSize: 12.5,
              border: `1px solid ${C.border}`, background: C.card2, color: C.text2, textAlign: "left",
            }}>{f}</button>
          ))}
        </div>
      )}

      {!est && !fråga && (
        <button onClick={uppskatta} disabled={!text.trim()}
          style={{ ...btnGhost, marginTop: 12, opacity: text.trim() ? 1 : 0.4 }}>Uppskatta måltiden</button>
      )}

      {fråga && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, marginBottom: 9 }}>{fråga.q}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {fråga.opts.map(([val, l]) => (
              <button key={val} onClick={() => välj(val)} style={{
                padding: "10px 14px", minHeight: 44, borderRadius: 999, cursor: "pointer",
                border: `1px solid ${C.border}`, background: C.card2, color: C.text2, fontSize: 12.5,
              }}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {est && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ ...hdr(24) }}>{est.kcal}</span>
            <span style={{ fontSize: 12, color: C.muted }}>kcal · troligen {est.estimateLow}–{est.estimateHigh}</span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            P {est.protein} g · K {est.carbs} g · F {est.fat} g
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.55, marginTop: 7 }}>{est.assumptions}</div>
          {/* PORTIONSFRÅGAN GÖMS NÄR MÄNGDEN STÅR I TEXTEN.
              Skriver man "100 g keso" har man mätt. Att då fråga om
              liten/normal/stor är att erbjuda sig att skala om ett tal
              användaren redan vet — och knapparna såg ut som ett obligatoriskt
              steg innan man fick logga. */}
          {/* PRODUKTVALET KOMMER FÖRE PORTIONSFRÅGAN.
              Skriver man "2 knäckebröd med lätta" är storleken inte det osäkra
              — sorten är det. Lätta 39 % och Mini Lätta 30 % ligger 17 % isär i
              energi, och det är en större skillnad än liten/normal/stor gör.

              Frågan ställs bara när alternativen faktiskt skiljer sig, och
              aldrig om råvaror: den som skriver "kyckling" menar kyckling och
              vill inte gå igenom en produktkatalog. */}
          {est.produktval ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ ...label(), color: C.muted, marginBottom: 7 }}>
                Vilken {est.produktval.ord}?
              </div>
              {est.produktval.alternativ.map(a => (
                <button key={a.id} onClick={() => väljProdukt(a)} data-produkt="1"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                    width: "100%", textAlign: "left", padding: "10px 12px", marginBottom: 6,
                    borderRadius: 12, minHeight: 44, cursor: "pointer",
                    border: `1px solid ${valdProdukt && valdProdukt.id === a.id ? C.lime : C.border}`,
                    background: valdProdukt && valdProdukt.id === a.id ? volt(.08) : C.card2,
                    color: C.text,
                  }}>
                  <span style={{ fontSize: 12.5, minWidth: 0 }}>{a.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted, flexShrink: 0 }}>
                    {a.kcal} kcal/100 g
                  </span>
                </button>
              ))}
            </div>
          ) : est.angivenMängd ? (
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 10 }}>
              {est.angivetAntal
                ? `Räknat på ${est.angivetAntal.antal} ${est.angivetAntal.ord} (${est.angivenMängd} g).`
                : `Räknat på ${est.angivenMängd} g som du angav.`}
            </div>
          ) : (
          <div style={{ display: "flex", gap: 7, marginTop: 11 }}>
            {[["small", "Liten"], ["normal", "Normal"], ["large", "Stor"]].map(([p, l]) => (
              <button key={p} onClick={() => byting(p)} style={{
                flex: 1, padding: "10px 0", minHeight: 44, borderRadius: 999, cursor: "pointer", fontSize: 12.5,
                border: `1px solid ${portion === p ? C.lime : C.border}`,
                background: "transparent", color: portion === p ? C.lime : C.muted,
              }}>{l}</button>
            ))}
          </div>
          )}
          <button onClick={lägg} style={{ ...btnPrimary, marginTop: 13 }}>Lägg till — uppskattat <span style={{ fontSize: 18 }}>+</span></button>
        </div>
      )}
    </div>
  );
}

/* ── LOGGA ── */

function Logga({ onLägg, foodLog }) {
  const [skannar, setSkannar] = useState(false);
  const [fotar, setFotar] = useState(false);
  const [sök, setSök] = useState("");
  const [vald, setVald] = useState(null);
  const [gram, setGram] = useState(100);

  // MOTORNS sökning, inte en egen. Matvyn hade en egen name.includes(), som
  // matchade inuti ord och gav "läsk" → Fläskfilé. Motorns searchFoods har
  // funnits hela tiden med stavfelstolerans, trigram-likhet, synonymer och
  // historikvikt — 2.0 anropade den bara aldrig. En andra sökning hade blivit
  // en andra sanning om vad maten heter.
  const träffar = useMemo(() => {
    const q = sök.trim();
    return q.length < 2 ? [] : (searchFoods(q, null, foodLog, 25) || []);
  }, [sök, foodLog]);

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

        <button onClick={() => { onLägg({ id: nyId("f_"), foodId: vald.id, name: vald.name, grams: gram, ts: Date.now() }); setVald(null); setSök(""); }}
          style={{ ...btnPrimary, marginTop: 20 }}>Lägg till <span style={{ fontSize: 19 }}>+</span></button>
      </div>
    );
  }

  // Skanningen ersätter loggvyn medan den pågår i stället för att ligga i ett
  // ark ovanpå — kameran ska inte kunna bli kvar bakom något annat.
  if (skannar) return <Streckkod onLägg={p => { onLägg(p); setSkannar(false); }} onStäng={() => setSkannar(false)} />;

  // Samma skäl som för skanningen: fotovyn ersätter loggvyn i stället för att
  // ligga i ett ark, så kameran aldrig blir kvar bakom något annat.
  if (fotar) return <FotoMaltid onLägg={p => { onLägg(p); setFotar(false); }} onClose={() => setFotar(false)} />;

  return (
    <div>
      <SnabbLogg onLägg={onLägg} />

      <button onClick={() => setSkannar(true)} style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
        width: "100%", marginBottom: 12, padding: "12px 14px", borderRadius: 12, minHeight: 44,
        border: `1px solid ${C.border}`, background: C.card2, color: C.text, cursor: "pointer",
        fontFamily: HFONT, fontSize: 12, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase",
      }}>
        <span aria-hidden style={{ fontSize: 15 }}>▥</span> Skanna streckkod
      </button>

      <button onClick={() => setFotar(true)} data-fotoknapp="1" style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
        width: "100%", marginBottom: 12, padding: "12px 14px", borderRadius: 12, minHeight: 44,
        border: `1px solid ${C.border}`, background: C.card2, color: C.text, cursor: "pointer",
        fontFamily: HFONT, fontSize: 12, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase",
      }}>
        <span aria-hidden style={{ fontSize: 15 }}>◉</span> Fota måltiden
      </button>

      <input value={sök} onChange={e => setSök(e.target.value)} placeholder="Sök livsmedel…"
        style={{ width: "100%", background: C.card2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", fontSize: 15, boxSizing: "border-box" }} />
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8 }}>
        {FOOD_INDEX.length} livsmedel, i huvudsak från Livsmedelsverkets databas.
      </div>

      {sök.trim().length >= 2 && träffar.length === 0 && (
        <div style={{ padding: "22px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.6 }}>
            Inget i Livsmedelsverkets register heter ”{sök.trim()}”.
          </div>
          <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, marginTop: 8 }}>
            Registret namnger som ett register, inte som folk pratar. Beskriv
            måltiden med fältet överst i stället — då uppskattas den, och
            uppskattningen redovisas som en uppskattning.
          </div>
        </div>
      )}

      {träffar.map(f => (
        <button key={f.id} onClick={() => { setVald(f); setGram(100); }}
          style={{ width: "100%", textAlign: "left", padding: "14px 4px", minHeight: 44, boxSizing: "border-box", background: "none", border: "none", borderBottom: `1px solid ${C.border}`, color: C.text, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
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

const lägesknapp = på => ({
  flex: 1, padding: "11px 10px", borderRadius: 12, minHeight: 44, cursor: "pointer",
  border: `1px solid ${på ? C.lime : C.border}`, background: på ? volt(0.06) : C.card2,
  color: på ? C.lime : C.text2, fontFamily: HFONT, fontSize: 12,
  fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase",
});

function Recept({ onLägg, nutritionTargets, profile = {}, setProfile, bred, foodLog = [], egnaRecept = [], setEgnaRecept }) {
  const [sök, setSök] = useState("");
  const [läge, setLäge] = useState("lista");
  // Receptlistan respekterar samma kostval som veckomenyn. Utan det skulle en
  // vegan få en vegansk vecka men en allätande sökträfflista — samma app som
  // säger två olika saker om vad hen äter.
  // EGNA RECEPT FILTRERAS INTE PÅ KOST.
  //
  // filterRecipes bedömer bankens recept utifrån taggade ingredienser. Ett eget
  // recept har inga sådana taggar och skulle falla bort ur varje filtrerad lista
  // — vilket vore fel: den som lagt in rätten vet själv vad den innehåller, och
  // att gömma användarens egen mat bakom en gissning om kost är övertramp.
  //
  const passande = useMemo(
    () => [
      // Egna recept först — man letar efter det man själv lagt in.
      ...(egnaRecept || []),
      ...filterRecipes({ diet: profile.diet || "omnivore", restrictions: profile.restrictions || [], dietApproach: profile.dietApproach || null }),
    ],
    [egnaRecept, profile.diet, (profile.restrictions || []).join(","), profile.dietApproach]
  );
  const lista = useMemo(() => {
    const q = sök.trim().toLowerCase();
    return (q ? passande.filter(r => (r.name || "").toLowerCase().includes(q)) : passande).slice(0, 40);
  }, [sök, passande]);

  if (läge === "eget") return (
    <CustomRecipe
      onClose={() => setLäge("lista")}
      onSpara={r => {
        // Sparas som vilket recept som helst — samma form som bankens, så det
        // fungerar i veckomenyn, inköpslistan och preferensberäkningen.
        setEgnaRecept(xs => [...(xs || []).filter(x => x.id !== r.id), r]);
        setLäge("lista");
      }} />
  );

  if (läge === "vecka") return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button onClick={() => setLäge("lista")} style={{ ...lägesknapp(false) }}>Alla recept</button>
        <button style={{ ...lägesknapp(true) }}>Veckomeny</button>
      </div>
      <MealPrepView nutritionTargets={nutritionTargets} profile={profile}
        setProfile={setProfile} onLägg={onLägg} bred={bred} foodLog={foodLog} />
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button style={{ ...lägesknapp(true) }}>Alla recept</button>
        <button onClick={() => setLäge("vecka")} style={{ ...lägesknapp(false) }}>Veckomeny</button>
        {setEgnaRecept && (
          <button onClick={() => setLäge("eget")} data-nyttrecept="1"
            style={{ ...lägesknapp(false), marginLeft: "auto" }}>+ Eget</button>
        )}
      </div>
      <input value={sök} onChange={e => setSök(e.target.value)} placeholder="Sök recept…"
        style={{ width: "100%", background: C.card2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", fontSize: 15, boxSizing: "border-box", marginBottom: 14 }} />
      {lista.length === 0 && (
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, padding: "18px 2px" }}>
          Inga recept matchar sökningen inom din kost. Ändra kosten under
          Veckomeny, eller sök på något annat.
        </div>
      )}
      {lista.map(r => {
        const n = receptNäring(r);
        return (
        <div key={r.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "11px 2px", borderBottom: `1px solid ${C.border}` }}>
          {/* MINIATYR, INTE STORT KORT. Listan är till för att hitta en rätt
              man redan tänkt på; bilden hjälper igenkänningen utan att göra
              varje rad tre gånger så hög. Saknas bilden lämnas ingen ruta —
              en tom platshållare drar mer uppmärksamhet än den förtjänar. */}
          {receptBild(r) && (
            <img src={receptBild(r)} alt="" loading="lazy"
              style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14 }}>{r.name}</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
              {n.kcal} kcal · P {n.protein} g{r.time ? ` · ${r.time} min` : ""}
              {n.saknas ? " · ofullständig näring" : ""}
            </div>
          </div>
          <button onClick={() => onLägg({ id: nyId("f_"), name: r.name, kcal: n.kcal, protein: n.protein, carbs: n.carbs, fat: n.fat, ts: Date.now(), recipeId: r.id })}
            style={{ padding: "0 18px", minHeight: 44, borderRadius: 999, border: `1px solid ${C.lime}`, background: "transparent", color: C.lime, fontSize: 12.5, cursor: "pointer", flexShrink: 0 }}>
            Logga
          </button>
        </div>
        );
      })}
    </div>
  );
}

/* ── VYN ── */

export function FoodView({ foodLog = [], setFoodLog, nutritionTargets, onSätta, profile, setProfile, weights = [], supplements, egnaRecept = [], setEgnaRecept }) {
  const [flik, setFlik] = useState("oversikt");
  const layout = useLayout();
  const dagens = foodLog.filter(e => e && e.ts && idag(e.ts));
  const totaler = dagensNutrition(foodLog);
  const lägg = post => { setFoodLog(l => [...l, post]); setFlik("oversikt"); };

  // ÄNDRING OCH BORTTAGNING AV LOGGAD MAT.
  //
  // Man skriver fel mängd eller loggar fel sak, och utan de här två fanns
  // ingen väg tillbaka — dagens summa var fel resten av dygnet, och allt som
  // läser den (coachen, readiness-modifieraren, näringsmålen) räknade på det.
  const ändraPost = (id, delta) => setFoodLog(l => l.map(e => {
    // Poster utan gramtal (fotade, uppskattade) har inget att stega. Ett TOMT
    // fält är däremot en post mitt i en inskrivning — den ska gå att stega från,
    // och utan Number() ger "" + 5 strängen "5" i stället för talet 5.
    if (e.id !== id || e.grams == null || e.foodId == null) return e;
    const grams = Math.max(5, (Number(e.grams) || 0) + delta);
    // Näringen räknas om ur livsmedlet, inte skalas ur den gamla summan.
    // Skalning av ett redan avrundat tal driver iväg efter några ändringar.
    const f = e.foodId ? FOOD_INDEX.find(x => x.id === e.foodId) : null;
    if (!f) return { ...e, grams };
    const k = grams / 100;
    return { ...e, grams,
      kcal: Math.round((f.kcal || 0) * k), protein: Math.round((f.protein || 0) * k),
      carbs: Math.round((f.carbs || 0) * k), fat: Math.round((f.fat || 0) * k) };
  }));

  const taBortPost = id => setFoodLog(l => l.filter(e => e.id !== id));

  // Namnet är en etikett och rör inte näringen. Att låta en omdöpning räkna om
  // kalorierna vore att gissa att posten också fick nytt innehåll — och den som
  // rättar "kyckl" till "kyckling" har inte ätit något annat.
  const ändraNamnPost = (id, namn) => setFoodLog(l => l.map(e => e.id === id ? { ...e, name: namn } : e));

  // Sätter måltid uttryckligen. Postens egen meal vinner sedan över klockslaget
  // — en rättelse ska stå kvar.
  const sättMåltidPost = (id, typ) => setFoodLog(l => l.map(e => e.id === id ? { ...e, meal: typ } : e));

  /**
   * Sätter mängden till ett skrivet tal i stället för att stega.
   *
   * TOMT FÄLT TILLÅTS UNDER SKRIVANDET. Raderar man 100 för att skriva 250
   * passerar fältet genom tomt, och att då tvinga tillbaka en etta gör det
   * omöjligt att skriva. Näringen räknas på 0 så länge, och första siffran
   * rättar summan.
   */
  const sättGramPost = (id, värde) => setFoodLog(l => l.map(e => {
    if (e.id !== id) return e;
    const rensat = String(värde).replace(/\D/g, "").slice(0, 4);
    const grams = rensat === "" ? "" : Math.min(5000, Number(rensat));
    const f = e.foodId ? FOOD_INDEX.find(x => x.id === e.foodId) : null;
    if (!f) return { ...e, grams };
    const k = (Number(grams) || 0) / 100;
    return { ...e, grams,
      kcal: Math.round((f.kcal || 0) * k), protein: Math.round((f.protein || 0) * k),
      carbs: Math.round((f.carbs || 0) * k), fat: Math.round((f.fat || 0) * k) };
  }));

  return (
    <div style={{ padding: "16px 18px 72px" }}>
      <div style={{ textAlign: "center", ...hdr(20) }}>Mat</div>

      <div style={{ display: "flex", gap: 7, justifyContent: "center", margin: "16px 0 20px", borderBottom: `1px solid ${C.border}`, overflowX: "auto" }}>
        {[["oversikt", "Idag"], ["logga", "Logga"], ["recept", "Recept"], ["akut", "Akut"], ["tillskott", "Tillskott"]].map(([id, l]) => (
          <button key={id} onClick={() => setFlik(id)} style={{
            background: "none", border: "none", cursor: "pointer", padding: "15px 4px 12px", minHeight: 44,
            fontFamily: HFONT, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap",
            color: flik === id ? C.lime : C.muted,
            borderBottom: `2px solid ${flik === id ? C.lime : "transparent"}`, marginBottom: -1,
          }}>{l}</button>
        ))}
      </div>

      {flik === "oversikt" && <Oversikt dagensLogg={dagens} totaler={totaler} mål={nutritionTargets}
        onLogga={() => setFlik("logga")} onSätta={onSätta}
        onÄndra={ändraPost} onÄndraNamn={ändraNamnPost} onSättGram={sättGramPost}
        onSättMåltid={sättMåltidPost} onTaBort={taBortPost} />}
      {flik === "logga" && <Logga onLägg={lägg} foodLog={foodLog} />}
      {flik === "recept" && (
        <Recept onLägg={lägg} nutritionTargets={nutritionTargets}
          profile={profile} setProfile={setProfile} bred={layout.desktop} foodLog={foodLog}
          egnaRecept={egnaRecept} setEgnaRecept={setEgnaRecept} />
      )}
      {/* Matakuten ligger som flik och inte som ark: skyddsräcket ber en
          registrera valet direkt, och då ska loggen vara ett tryck bort. */}
      {flik === "tillskott" && supplements && <SupplementsPanel {...supplements} />}
      {flik === "akut" && (
        <RescueView foodLog={foodLog} nutritionTargets={nutritionTargets}
          profile={profile} setProfile={setProfile} weights={weights}
          onLogga={() => setFlik("logga")} />
      )}
    </div>
  );
}
