// UTVECKLING ÄR EN FLIK NU, INTE ETT ARK. Ett ark låg ovanpå navigationen;
// en flik ligger under den. Bottenmarginalen måste därför räkna med navhöjden,
// annars hamnar sista knappen — "Spara mätning" — bakom menyn. Verifieraren
// fångade det: Playwright rapporterade att nav-svg:n fångade klicket.
import { NAV_HÖJD } from "./layout.js";
import { useState, useMemo, useEffect } from "react";
import { load, save } from "./store.js";
import { C, HFONT, MONO, hdr, label, btnPrimary, btnGhost, btnText, card, volt } from "./design.js";
import {
  byggMätning, massor, trend, tolkaOmronCsv, slåIhopMätningar, förändring,
  bästa1RM, progressionskarta, ändraMätning, raderaMätning,
} from "../engines/utveckling.js";
import { EXERCISES, MAIN_LIFTS } from "../data/exercises.js";
import { KROPPSMATT, KROPPSSAMMANSATTNING, GRUPPER, mattIGrupp, ALLA_INDEX } from "../data/kroppsmatt.js";
import {
  NyMatning, MattDetalj, Historik, Nyckeltal, Asymmetri, useMättaMått, fmt, fmtDiff,
} from "./Kroppsmatt.jsx";

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
function Kurva({ punkter, fält = "kg", färg, höjd = 96, minSpann = 0 }) {
  if (!punkter || punkter.length < 2) return null;
  const v = punkter.map(p => p[fält]);
  let min = Math.min(...v), max = Math.max(...v);

  // SKALAN FÅR INTE VARA BRUS.
  //
  // Med min/max ur datan blir 82,4 och 82,6 hela höjden — 0,2 kg ritas som
  // ett berg. Vikt varierar 0,5-1 kg dag till dag av vätska och maginnehåll,
  // och den variationen är inte information. Kurvan får ett golv för
  // spännvidden: för vikt 2 kg, så en trend på 1 kg syns som lutning, inte
  // som ett sågblad.
  if (max - min < minSpann) {
    const mitt = (max + min) / 2;
    min = mitt - minSpann / 2; max = mitt + minSpann / 2;
  }
  const spann = max - min || 1;
  const t0 = punkter[0].ts, t1 = punkter[punkter.length - 1].ts;
  const bredd = t1 - t0 || 1;

  // BREDDEN I VIEWBOX MATCHAR RUTAN, inte ett fast 100.
  //
  // preserveAspectRatio="none" med viewBox 100 bred i en 364 px ruta gav
  // 3,6× horisontell utsträckning: cirklarna blev 14,6×4,0 px — ovaler — och
  // linjen fick olika tjocklek beroende på lutning. Mätt. Nu 360 bred, så
  // förhållandet blir ~1:1 och formerna behåller sin form.
  const W = 360;
  const X = p => ((p.ts - t0) / bredd) * (W - 8) + 4;
  const Y = p => höjd - ((p[fält] - min) / spann) * (höjd - 16) - 8;
  const pts = punkter.map(p => `${X(p).toFixed(1)},${Y(p).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${höjd}`} preserveAspectRatio="none"
      style={{ width: "100%", height: höjd, display: "block", overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={färg} strokeWidth="1.6"
        vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      {punkter.map((p, i) => (
        <circle key={i} cx={X(p)} cy={Y(p)} r="2.4" fill={färg} vectorEffect="non-scaling-stroke" />
      ))}
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

/**
 * KROPPSMÅTTEN, grupperade.
 *
 * VISAR BARA DET SOM MÄTTS. En lista med fjorton streck ser ut som ett
 * misslyckande; en lista med de tre man faktiskt mätt ser ut som en början.
 * Omätta mått nås via "+ Ny mätning", inte genom att stå och vara tomma.
 *
 * Grupperna och deras innehåll kommer ur registret, så ett nytt mått hamnar
 * här av sig självt.
 */
function MattFlik({ mätningar, mätta, onValj, onNy }) {
  const harNågot = mätta.length > 0;
  return (
    <div data-mattflik="1">
      {!harNågot ? (
        <div style={{ ...card, padding: 18 }}>
          <div style={{ ...hdr(15), marginBottom: 7 }}>Inga kroppsmått än</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
            Ta måttbandet en gång så finns en utgångspunkt. Du behöver inte mäta
            allt — midjan ensam säger mer över tid än vågen gör.
          </div>
          <button onClick={onNy} style={{ ...btnGhost, marginTop: 14 }}>Mät nu</button>
        </div>
      ) : (
        <>
          {GRUPPER.map(g => {
            const rader = mattIGrupp(g.id).filter(m => mätta.includes(m.id));
            if (!rader.length) return null;
            return (
              <div key={g.id} style={{ ...card, padding: 0, marginTop: 8, overflow: "hidden" }}>
                <div style={{ ...label(), padding: "15px 16px 4px" }}>{g.namn}</div>
                {rader.map((mt, i) => {
                  const f = förändring(mätningar, mt.id);
                  return (
                    <button key={mt.id} onClick={() => onValj(mt.id)} data-matt-rad={mt.id}
                      style={{
                        display: "flex", alignItems: "baseline", justifyContent: "space-between",
                        width: "100%", padding: "13px 16px", minHeight: 44, cursor: "pointer",
                        background: "none", border: "none", color: C.text, font: "inherit",
                        borderTop: i ? `1px solid ${C.hairline}` : "none", textAlign: "left",
                      }}>
                      <span style={{ fontSize: 13.5 }}>{mt.namn}</span>
                      <span style={{ display: "inline-flex", alignItems: "baseline", gap: 10 }}>
                        {f.sedanStart != null && (
                          <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>
                            {fmtDiff(f.sedanStart, "cm")}
                          </span>
                        )}
                        <span style={{ fontFamily: MONO, fontSize: 14 }}>{fmt(f.värde)} cm</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
          <Asymmetri mätningar={mätningar} onValj={onValj} />
        </>
      )}
    </div>
  );
}

// Undervyerna. "Kropp" är förvalet — vikt och sammansättning är det de flesta
// öppnar vyn för. Kroppsmåtten och historiken är egna flikar i stället för mer
// innehåll på samma skärm; femton omkretsar under fyra nyckeltal blir en vägg.
// PASS FÖRST. Framsteg och Utveckling var två vyer som svarade på samma
// fråga — "hur går det?" — men den ena var en flik och den andra en undervy.
// Det var historia, inte logik. Nu är det EN flik, Utveckling, med pass som
// första underflik eftersom det är det man oftast vill se.
const FLIKAR = [
  { id: "pass", namn: "Pass" },
  { id: "kropp", namn: "Kropp" },
  { id: "matt", namn: "Mått" },
  { id: "styrka", namn: "Styrka" },
  { id: "historik", namn: "Historik" },
];

export function UtvecklingView({ passInnehåll = null, startFlik = null, mätningar = [], setMätningar, sessions = [], profile, startDetalj = null, onClose }) {
  const [period, setPeriod] = useState(90);
  const [flik, setFlik] = useState(startFlik || "pass");
  // null = ingen, {} = ny mätning, post = redigera den posten
  const [formulär, setFormulär] = useState(null);
  // `startDetalj` gör att ett tryck på ett nyckeltal i Framsteg landar direkt i
  // rätt detaljvy. Som INITIALVÄRDE, inte som en effekt: stänger man detaljen
  // ska man hamna i översikten, inte kastas tillbaka av en synkronisering.
  const [detalj, setDetalj] = useState(startDetalj);
  const [importFel, setImportFel] = useState("");
  const [importKlart, setImportKlart] = useState(null);
  const [valdÖvning, setValdÖvning] = useState(null);

  const mätta = useMättaMått(mätningar);

  /**
   * Sparar en ny eller ändrad mätning.
   *
   * `ändraTs` skiljer fallen: vid redigering ERSÄTTS posten, så ett rensat fält
   * faktiskt försvinner. En ny post slås ihop med en befintlig inom en timme —
   * samma regel som Omron-importen, så en manuell och en importerad vägning
   * samma morgon inte blir två rader.
   */
  const sparaMätning = (post, ändraTs) => {
    setMätningar(x => (ändraTs != null
      ? ändraMätning(x, ändraTs, post)
      : slåIhopMätningar(x, [post])));
    setFormulär(null);
  };

  const taBort = ts => {
    setMätningar(x => raderaMätning(x, ts));
    setFormulär(null);
  };

  const serie = useMemo(() => {
    const från = Date.now() - period * 864e5;
    return (mätningar || []).filter(m => m && m.ts >= från).sort((a, b) => a.ts - b.ts);
  }, [mätningar, period]);

  const senaste = mätningar.length ? mätningar[mätningar.length - 1] : null;
  const m = senaste ? massor(senaste) : null;

  // Styrka eller volym — valet sparas.
  const [mått, setMått] = useState("styrka");
  useEffect(() => { load("progressionsmatt", "styrka").then(v => { if (v === "volym" || v === "styrka") setMått(v); }); }, []);
  const sättMått = v => { setMått(v); save("progressionsmatt", v); };
  const karta = useMemo(() => progressionskarta(sessions, mått, MAIN_LIFTS), [sessions, mått]);
  // Senaste mätningen — den man oftast vill rätta.
  const senasteMätning = useMemo(
    () => [...(mätningar || [])].filter(Boolean).sort((a, b) => b.ts - a.ts)[0] || null,
    [mätningar]
  );
  // Ingen förvald rad: kartan är översikten, detaljen öppnas på tryck.
  const aktivÖvning = valdÖvning;
  const rekord = aktivÖvning ? bästa1RM(sessions, aktivÖvning) : null;
  const namnFör = id => (EXERCISES.find(e => e.id === id) || {}).name || id;

  const fältStil = {
    width: "100%", padding: "11px 13px", borderRadius: 10, minHeight: 44,
    border: `1px solid ${C.border}`, background: C.card2, color: C.text,
    fontSize: 14, fontFamily: MONO,
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

  // Detaljvyn och formuläret tar hela ytan. En modal ovanpå en lista med
  // femton mått blir trång på telefon, och det här är skärmar man gör EN sak i.
  if (detalj) {
    return (
      <div style={{ padding: `4px 0 ${NAV_HÖJD + 32}px` }}>
        <MattDetalj id={detalj} mätningar={mätningar} onStäng={() => setDetalj(null)} />
      </div>
    );
  }
  if (formulär) {
    return (
      <div style={{ padding: `4px 0 ${NAV_HÖJD + 32}px` }}>
        <NyMatning
          mätningar={mätningar}
          befintlig={formulär.ts ? formulär : null}
          onSpara={sparaMätning}
          onAvbryt={() => setFormulär(null)}
          onRadera={taBort}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: `4px 0 ${NAV_HÖJD + 32}px` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={hdr(19)}>Utveckling</div>
        {onClose && <button onClick={onClose} style={btnText} aria-label="Stäng">Stäng</button>}
      </div>
      <div style={{ fontSize: 12.5, color: C.muted, marginTop: 5, lineHeight: 1.55 }}>
        Kroppen och styrkan över tid.
      </div>

      <div style={{ display: "flex", gap: 7, margin: "14px 0 12px", overflowX: "auto" }}>
        {FLIKAR.map(f => (
          <button key={f.id} onClick={() => setFlik(f.id)} data-flik={f.id}
            aria-pressed={flik === f.id}
            style={{
              padding: "8px 14px", minHeight: 40, borderRadius: 999, cursor: "pointer", fontSize: 12.5,
              flexShrink: 0,
              border: `1px solid ${flik === f.id ? C.lime : C.border}`,
              color: flik === f.id ? C.lime : C.muted,
              background: flik === f.id ? volt(.08) : C.card2,
            }}>{f.namn}</button>
        ))}
      </div>

      {flik === "pass" && passInnehåll}

      {/* EN primär CTA per vy. Den hör till kroppsflikarna — i Pass-fliken
          vore "Ny mätning" fel handling. */}
      {(flik === "kropp" || flik === "matt") && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button onClick={() => setFormulär({})} data-ny-matning="1"
            style={{ ...btnPrimary, flex: 1, marginTop: 0 }}>
            + Ny mätning
          </button>
          {/* ÄNDRA SENASTE, ett tryck bort.
              Redigering fanns bara under Historik-fliken: Utveckling → Historik
              → hitta rätt datum → Ändra. Fyra steg för att rätta en siffra man
              nyss slog in fel. Vikten är det mest loggade måttet, så den ska
              gå att rätta där man ser den.

              Knappen visas bara när det FINNS en mätning — annars vore den ett
              löfte om något som inte går att göra. */}
          {senasteMätning && (
            <button onClick={() => setFormulär(senasteMätning)} data-andra-senaste="1"
              style={{ ...btnGhost, flex: "0 0 auto", marginTop: 0, padding: "0 16px" }}>
              Ändra
            </button>
          )}
        </div>
      )}

      {flik === "matt" && (
        <MattFlik mätningar={mätningar} mätta={mätta} onValj={setDetalj}
          onNy={() => setFormulär({})} />
      )}

      {flik === "historik" && (
        <Historik mätningar={mätningar} onValj={setDetalj} onÄndra={setFormulär} />
      )}

      {flik === "kropp" && (
      <>
      <div style={{ display: "flex", gap: 7, marginBottom: 12 }}>
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
          {/* NYCKELTALEN ÄR INGÅNGAR, inte bara siffror. Ett tryck öppnar
              måttets egen detaljvy med kurva och alla mätpunkter — samma
              komponent som för midjan och biceparna. Förändringen som visas är
              sedan START, inte sedan periodvalet: "hur långt har jag kommit" är
              frågan man ställer, och den ändras inte av vilket spann grafen
              råkar visa. */}
          <div style={{ display: "flex", gap: 8 }}>
            <Nyckeltal id="kg" mätningar={mätningar} onClick={setDetalj} />
            <Nyckeltal id="fat" mätningar={mätningar} onClick={setDetalj} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Nyckeltal id="muscle" mätningar={mätningar} onClick={setDetalj} />
            {/* FETTFRI MASSA ÄR NYCKELTALET vid en deff: står den still medan
                vikten går ner har man tappat rätt saker. Den är HÄRLEDD ur vikt
                och fettprocent, inte mätt, och har därför ingen egen detaljvy —
                det finns ingen serie att rita som inte redan är de två andra. */}
            <Mätkort etikett="Fettfri massa" värde={m && m.fettfriMassa} enhet="kg"
              t={null} bra="upp" />
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
                <Kurva punkter={serie} fält="kg" färg={C.lime} minSpann={2} />
              </div>
            </>
          )}
        </>
      )}
      </>
      )}

      {/* OMRON-IMPORT. Direktkoppling kräver partneravtal med Omron; CSV-export
          finns i deras app och är den väg som faktiskt är öppen. Datan lämnar
          aldrig telefonen. */}
      {flik === "kropp" && (
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
      )}

      {/* STYRKA. Uppskattat 1RM ur Epley, med set över 12 reps bortsorterade —
          vid många reps mäter man uthållighet, inte maxstyrka. */}
      {flik === "styrka" && (
      <>
      {!karta.length ? (
        <div style={{ ...card, padding: 16, fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>
          Logga samma övning två gånger med vikt och reps, så ritas kurvan här.
        </div>
      ) : (
        <>
          {/* PROGRESSIONSKARTAN. Alla övningar på en gång, så mönstret syns:
              vad går upp, vad står still, vad går ner. Inte en kurva man
              bläddrar till — en översikt man läser på tio sekunder.

              STYRKA ELLER VOLYM, ett val som gäller hela listan. Styrka (1RM)
              svarar på "blir jag starkare?", volym på "jobbar jag mer?". Vid
              en deff kan volymen sjunka medan 1RM håller — och det är bra.
              Valet minns: den som föredrar volym ska inte trycka varje gång.

              Sorterad efter förändring, störst rörelse först oavsett
              riktning — en nedgång är något att se. */}
          <div style={{ display: "flex", gap: 7, marginBottom: 12 }}>
            {[["styrka", "Styrka"], ["volym", "Volym"]].map(([id, namn]) => (
              <button key={id} onClick={() => sättMått(id)} data-matt-val={id}
                aria-pressed={mått === id}
                style={{
                  padding: "8px 14px", minHeight: 40, borderRadius: 999, cursor: "pointer", fontSize: 12.5,
                  border: `1px solid ${mått === id ? C.lime : C.border}`,
                  color: mått === id ? C.lime : C.muted,
                  background: mått === id ? volt(.08) : C.card2,
                }}>{namn}</button>
            ))}
            <span style={{ fontSize: 10.5, color: C.muted, alignSelf: "center", marginLeft: "auto" }}>
              {mått === "styrka" ? "uppskattat 1RM" : "kg × reps per pass"} · 8 veckor
            </span>
          </div>

          {karta.map(r => {
            const t = r.trend;
            const färg = !t || t.procent === 0 ? C.muted : t.procent > 0 ? C.ready : C.critical;
            const vald = aktivÖvning === r.id;
            return (
              <button key={r.id} onClick={() => setValdÖvning(vald ? null : r.id)} data-karta-rad={r.id}
                aria-expanded={vald}
                style={{
                  ...card, width: "100%", textAlign: "left", cursor: "pointer", color: C.text,
                  padding: "11px 13px", marginBottom: 7,
                  borderColor: vald ? C.lime : C.border,
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: r.stort ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {namnFör(r.id)}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 2 }}>
                      {r.senaste}{mått === "styrka" ? " kg" : ""}
                      {t && <span style={{ color: färg }}> · {t.procent > 0 ? "+" : ""}{t.procent} %</span>}
                      {!t && <span> · {r.punkter.length} pass, för få i fönstret</span>}
                    </div>
                  </div>
                  {/* Miniatyrkurva som i tidningens aktielista: formen läses
                      utan axlar. Färgen bär riktningen. */}
                  <div style={{ width: 76, flexShrink: 0 }}>
                    <Kurva punkter={r.punkter.slice(-12)} fält={r.fält} färg={färg} höjd={30} />
                  </div>
                </div>

                {/* Tryck på raden: hela kurvan med varje pass utsatt. */}
                {vald && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                    <Kurva punkter={r.punkter} fält={r.fält} färg={C.lime} höjd={96} />
                    {mått === "styrka" && rekord && (
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 9, lineHeight: 1.45 }}>
                        Bästa set: {rekord.weight} kg × {rekord.reps} reps, {fmtDatum(rekord.ts)}.
                        Uppskattat ur Epleys formel — inte ett testat maxlyft.
                      </div>
                    )}
                    {mått === "volym" && (
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 9, lineHeight: 1.45 }}>
                        Set × reps × vikt per pass. Alla set räknas, även höga reps.
                      </div>
                    )}
                    {t && (
                      <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 6 }}>
                        {t.från} → {t.till} över {t.punkter} pass
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </>
      )}
      </>
      )}
    </div>
  );
}
