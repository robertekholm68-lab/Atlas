import { useState, useMemo } from "react";
import { C, HFONT, MONO, hdr, label, btnPrimary, btnGhost, btnText, card, volt } from "./design.js";
import {
  byggMätning, massor, trend, tolkaOmronCsv, slåIhopMätningar,
  styrkeKurva, övningarMedKurva, bästa1RM,
} from "../engines/utveckling.js";
import { EXERCISES } from "../data/exercises.js";

/**
 * UTVECKLING — kropp och styrka över tid.
 *
 * Framstegsvyn visade volym och pass; den svarar på "har jag tränat?". Den här
 * svarar på "har det gett något?" — vilket är en annan fråga.
 *
 * VIKTEN ENSAM LJUGER. Går den ner kan det vara fett eller muskel, och det är
 * skillnaden som avgör om en deff går bra eller illa. Därför står fettfri massa
 * bredvid kroppsvikten när underlaget finns.
 *
 * INGET GISSAS. En vanlig badrumsvåg ger bara kg — då visas bara kg, inte
 * uppskattad kroppssammansättning. Ett tomt fält är ärligare än ett härlett tal
 * som ser mätt ut.
 */

const DAGAR = [
  { id: 30, namn: "30 d" },
  { id: 90, namn: "3 mån" },
  { id: 365, namn: "1 år" },
];

function fmtDatum(ts) {
  return new Date(ts).toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

/** Enkel linjegraf. Returnerar null utan minst två punkter — en punkt är ingen kurva. */
function Kurva({ punkter, fält = "kg", färg, höjd = 96 }) {
  if (!punkter || punkter.length < 2) return null;
  const v = punkter.map(p => p[fält]);
  const min = Math.min(...v), max = Math.max(...v);
  const spann = max - min || 1;
  const t0 = punkter[0].ts, t1 = punkter[punkter.length - 1].ts;
  const bredd = t1 - t0 || 1;
  const pts = punkter.map(p => {
    const x = ((p.ts - t0) / bredd) * 100;
    const y = höjd - ((p[fält] - min) / spann) * (höjd - 16) - 8;
    return `${x.toFixed(2)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 100 ${höjd}`} preserveAspectRatio="none"
      style={{ width: "100%", height: höjd, display: "block", overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={färg} strokeWidth="1.6"
        vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      {punkter.map((p, i) => {
        const x = ((p.ts - t0) / bredd) * 100;
        const y = höjd - ((p[fält] - min) / spann) * (höjd - 16) - 8;
        return <circle key={i} cx={x} cy={y} r="2" fill={färg} vectorEffect="non-scaling-stroke" />;
      })}
    </svg>
  );
}

/** Ett mätvärde med trend. Saknas underlag står det varför, inte en nolla. */
function Mätkort({ etikett, värde, enhet, t, bra = "ner", färg }) {
  const riktning = t ? (t.diff === 0 ? "still" : t.diff < 0 ? "ner" : "upp") : null;
  const positiv = riktning === "still" ? null : riktning === bra;
  return (
    <div style={{ ...card, padding: 14, flex: 1, minWidth: 0 }}>
      <div style={{ ...label(), color: C.muted }}>{etikett}</div>
      <div style={{ ...hdr(22), marginTop: 5 }}>
        {värde != null ? värde : "—"}
        {värde != null && <span style={{ fontSize: 13, color: C.muted }}> {enhet}</span>}
      </div>
      {t ? (
        <div style={{
          fontFamily: MONO, fontSize: 11, marginTop: 5,
          color: positiv === null ? C.muted : positiv ? C.ready : C.recovering,
        }}>
          {t.diff > 0 ? "+" : ""}{t.diff} {enhet} · {t.punkter} mätningar
        </div>
      ) : (
        <div style={{ fontSize: 10.5, color: C.muted, marginTop: 5, lineHeight: 1.4 }}>
          Två mätningar krävs
        </div>
      )}
    </div>
  );
}

export function UtvecklingView({ mätningar = [], setMätningar, sessions = [], profile, onClose }) {
  const [period, setPeriod] = useState(90);
  const [läggTill, setLäggTill] = useState(false);
  const [ny, setNy] = useState({ kg: "", fat: "", muscle: "", visceral: "" });
  const [importFel, setImportFel] = useState("");
  const [importKlart, setImportKlart] = useState(null);
  const [valdÖvning, setValdÖvning] = useState(null);

  const serie = useMemo(() => {
    const från = Date.now() - period * 864e5;
    return (mätningar || []).filter(m => m && m.ts >= från).sort((a, b) => a.ts - b.ts);
  }, [mätningar, period]);

  const senaste = mätningar.length ? mätningar[mätningar.length - 1] : null;
  const m = senaste ? massor(senaste) : null;

  const övningar = useMemo(() => övningarMedKurva(sessions), [sessions]);
  const aktivÖvning = valdÖvning || övningar[0] || null;
  const kurva = useMemo(
    () => (aktivÖvning ? styrkeKurva(sessions, aktivÖvning) : []),
    [sessions, aktivÖvning]
  );
  const rekord = aktivÖvning ? bästa1RM(sessions, aktivÖvning) : null;
  const namnFör = id => (EXERCISES.find(e => e.id === id) || {}).name || id;

  const fältStil = {
    width: "100%", padding: "11px 13px", borderRadius: 10, minHeight: 44,
    border: `1px solid ${C.border}`, background: C.card2, color: C.text,
    fontSize: 14, fontFamily: MONO,
  };

  const spara = () => {
    const post = byggMätning({ ...ny, källa: "manuell" });
    if (!post) { setImportFel("Vikten måste fyllas i."); return; }
    setMätningar(x => slåIhopMätningar(x, [post]));
    setNy({ kg: "", fat: "", muscle: "", visceral: "" });
    setLäggTill(false); setImportFel("");
  };

  const läsCsv = async fil => {
    if (!fil) return;
    setImportFel(""); setImportKlart(null);
    try {
      const text = await fil.text();
      const r = tolkaOmronCsv(text);
      if (r.fel) { setImportFel(r.fel); return; }
      setMätningar(x => slåIhopMätningar(x, r.poster));
      setImportKlart({ antal: r.poster.length, fält: r.fält });
    } catch (e) {
      setImportFel("Kunde inte läsa filen.");
    }
  };

  return (
    <div style={{ padding: "4px 0 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={hdr(19)}>Utveckling</div>
        {onClose && <button onClick={onClose} style={btnText} aria-label="Stäng">Stäng</button>}
      </div>
      <div style={{ fontSize: 12.5, color: C.muted, marginTop: 5, lineHeight: 1.55 }}>
        Kroppen och styrkan över tid. Vikten ensam säger inte om du tappat fett
        eller muskel — det gör fettfri massa.
      </div>

      <div style={{ display: "flex", gap: 7, margin: "14px 0 12px" }}>
        {DAGAR.map(d => (
          <button key={d.id} onClick={() => setPeriod(d.id)} data-period={d.id}
            style={{
              padding: "8px 14px", minHeight: 40, borderRadius: 999, cursor: "pointer", fontSize: 12.5,
              border: `1px solid ${period === d.id ? C.lime : C.border}`,
              color: period === d.id ? C.lime : C.muted,
              background: period === d.id ? volt(.08) : C.card2,
            }}>{d.namn}</button>
        ))}
      </div>

      {/* KROPPEN. Tomt läge säger vad som saknas i stället för att visa nollor. */}
      {!mätningar.length ? (
        <div style={{ ...card, padding: 18 }}>
          <div style={{ ...hdr(15), marginBottom: 7 }}>Ingen mätning än</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
            Väg dig och lägg in vikten. Har du en Omron-våg kan du importera hela
            historiken på en gång — vikt, kroppsfett, muskelprocent och visceralt
            fett följer med.
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8 }}>
            <Mätkort etikett="Vikt" värde={senaste.kg} enhet="kg"
              t={trend(mätningar, "kg", period)} bra="ner" />
            <Mätkort etikett="Kroppsfett" värde={senaste.fat} enhet="%"
              t={trend(mätningar, "fat", period)} bra="ner" />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {/* FETTFRI MASSA ÄR NYCKELTALET vid en deff: står den still medan
                vikten går ner har man tappat rätt saker. */}
            <Mätkort etikett="Fettfri massa" värde={m && m.fettfriMassa} enhet="kg"
              t={null} bra="upp" />
            <Mätkort etikett="Muskel" värde={senaste.muscle} enhet="%"
              t={trend(mätningar, "muscle", period)} bra="upp" />
          </div>
          {senaste.visceral != null && (
            <div style={{ ...card, padding: 13, marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <span style={{ ...label(), color: C.muted }}>Visceralt fett</span>
                <span style={{ ...hdr(17), color: senaste.visceral >= 10 ? C.recovering : C.text }}>
                  {senaste.visceral}
                </span>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 5, lineHeight: 1.45 }}>
                {senaste.visceral >= 10
                  ? "Över 9 räknas som förhöjt. Bukfett runt organen svarar bra på minskat kaloriintag."
                  : "1–9 räknas som normalt."}
              </div>
            </div>
          )}

          {serie.length >= 2 && (
            <>
              <div style={{ ...label(), color: C.muted, margin: "18px 0 6px" }}>
                Vikt · {fmtDatum(serie[0].ts)}–{fmtDatum(serie[serie.length - 1].ts)}
              </div>
              <div style={{ ...card, padding: "14px 12px" }}>
                <Kurva punkter={serie} fält="kg" färg={C.lime} />
              </div>
            </>
          )}
        </>
      )}

      <button onClick={() => setLäggTill(v => !v)} data-lagg-till-matning="1"
        aria-expanded={läggTill} style={{ ...btnGhost, marginTop: 12 }}>
        {läggTill ? "Avbryt" : "Lägg till mätning"}
      </button>

      {läggTill && (
        <div style={{ ...card, padding: 15, marginTop: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[["kg", "Vikt (kg)"], ["fat", "Kroppsfett (%)"],
              ["muscle", "Muskel (%)"], ["visceral", "Visceralt fett"]].map(([k, etikett]) => (
              <label key={k} style={{ fontSize: 11, color: C.muted }}>
                {etikett}
                <input value={ny[k]} inputMode="decimal" data-matning={k} aria-label={etikett}
                  onChange={e => setNy(n => ({ ...n, [k]: e.target.value }))}
                  style={{ ...fältStil, marginTop: 3 }} />
              </label>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 9, lineHeight: 1.45 }}>
            Bara vikten krävs. Lämna resten tomt om vågen inte mäter dem — ett
            tomt fält är ärligare än en nolla.
          </div>
          <button onClick={spara} data-spara-matning="1" style={{ ...btnPrimary, marginTop: 12 }}>
            Spara mätning
          </button>
        </div>
      )}

      {/* OMRON-IMPORT. Direktkoppling kräver partneravtal med Omron; CSV-export
          finns i deras app och är den väg som faktiskt är öppen. Datan lämnar
          aldrig telefonen. */}
      <div style={{ ...card, padding: 14, marginTop: 10 }}>
        <div style={{ ...label(), color: C.muted, marginBottom: 6 }}>Importera från vågen</div>
        <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.55 }}>
          I OMRON connect: tryck <strong>･･･</strong> i grafvyn och välj
          <strong> Export measurement data</strong>. Välj filen här.
        </div>
        <input type="file" accept=".csv,text/csv,text/plain" data-omron-csv="1"
          onChange={e => läsCsv(e.target.files && e.target.files[0])}
          style={{ ...fältStil, marginTop: 10, fontFamily: "inherit", fontSize: 12.5, padding: 9 }} />
        {importFel && (
          <div style={{ fontSize: 12, color: C.recovering, marginTop: 8, lineHeight: 1.5 }}>
            {importFel}
          </div>
        )}
        {importKlart && (
          <div style={{ fontSize: 12, color: C.ready, marginTop: 8, lineHeight: 1.5 }}>
            {importKlart.antal} mätningar inlästa
            {importKlart.fält.fett ? " med kroppsfett" : ""}
            {importKlart.fält.muskel ? ", muskelprocent" : ""}
            {importKlart.fält.visceral ? " och visceralt fett" : ""}.
          </div>
        )}
      </div>

      {/* STYRKA. Uppskattat 1RM ur Epley, med set över 12 reps bortsorterade —
          vid många reps mäter man uthållighet, inte maxstyrka. */}
      <div style={{ ...label(), color: C.muted, margin: "22px 0 8px" }}>Styrka</div>
      {!övningar.length ? (
        <div style={{ ...card, padding: 16, fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>
          Logga samma övning två gånger med vikt och reps, så ritas kurvan här.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {övningar.slice(0, 6).map(id => (
              <button key={id} onClick={() => setValdÖvning(id)} data-styrka-ovning={id}
                style={{
                  padding: "7px 12px", minHeight: 38, borderRadius: 999, cursor: "pointer", fontSize: 12,
                  border: `1px solid ${aktivÖvning === id ? C.lime : C.border}`,
                  color: aktivÖvning === id ? C.lime : C.muted,
                  background: aktivÖvning === id ? volt(.08) : C.card2,
                }}>{namnFör(id)}</button>
            ))}
          </div>
          <div style={{ ...card, padding: "14px 12px" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ ...label(), color: C.muted }}>Uppskattat 1RM</span>
              {rekord && (
                <span style={{ ...hdr(19) }}>
                  {rekord.oneRM}<span style={{ fontSize: 12, color: C.muted }}> kg</span>
                </span>
              )}
            </div>
            {kurva.length >= 2
              ? <Kurva punkter={kurva} fält="oneRM" färg={C.lime} />
              : <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                  En punkt än — logga övningen igen så ritas kurvan.
                </div>}
            {rekord && (
              <div style={{ fontSize: 11, color: C.muted, marginTop: 9, lineHeight: 1.45 }}>
                Bästa set: {rekord.weight} kg × {rekord.reps} reps, {fmtDatum(rekord.ts)}.
                Uppskattat ur Epleys formel — inte ett testat maxlyft.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
