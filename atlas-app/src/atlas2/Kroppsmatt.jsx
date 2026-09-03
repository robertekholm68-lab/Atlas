// KROPPSMÅTT — registrering, detaljvy, historik och nyckeltal.
//
// EN KOMPONENT PER SORTS YTA, inte en per kroppsdel. `MattDetalj` ritar midjan,
// höger biceps och kroppsfettet med samma kod — den tar ett id ur registret och
// slår upp namn, enhet och var värdet bor. Femton specialkomponenter hade
// betytt femton ställen att ändra på när ett mått läggs till.
//
// Allt visuellt kommer ur design.js. Inga egna färger, inga egna storlekar.

import { useState, useMemo } from "react";
import { C, HFONT, MONO, hdr, label, unit, card, btnPrimary, btnGhost, btnText, volt, DASH } from "./design.js";
import {
  GRUPPER, KROPPSMATT, MATT_PAR, ALLA_INDEX, KROPPSSAMMANSATTNING, mattIGrupp, visaEnhet,
} from "../data/kroppsmatt.js";
import { byggMätning, serie, förändring, asymmetri, mätvärde, mättMått } from "../engines/utveckling.js";

/** Tal med svenskt decimalkomma. Heltal visas utan decimal. */
export function fmt(v) {
  if (v == null || Number.isNaN(Number(v))) return DASH;
  return String(+Number(v).toFixed(2)).replace(".", ",");
}

/** Förändring med tecken. `null` blir streck — aldrig "0". */
export function fmtDiff(v, enhet) {
  if (v == null) return null;
  const t = v > 0 ? "+" : v < 0 ? "−" : "±";
  return `${t}${fmt(Math.abs(v))}${enhet ? " " + enhet : ""}`;
}

export function fmtDatum(ts, långt = false) {
  return new Date(ts).toLocaleDateString("sv-SE",
    långt ? { day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" });
}

export function fmtDatumTid(ts) {
  const d = new Date(ts);
  return `${d.toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })} ${d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}`;
}

/**
 * Färg på en förändring.
 *
 * `bra` säger vilken riktning som är önskad för just det måttet — ner för vikt
 * och fett, upp för muskel. För omkretsar är den null: en midja som växer kan
 * vara muskel eller fett, och appen vet inte vilket. Då är talet neutralt
 * grått, för en färg hade varit en bedömning vi inte har underlag för.
 */
function diffFärg(v, bra) {
  if (v == null || v === 0 || !bra) return C.muted;
  return (v < 0) === (bra === "ner") ? C.ready : C.recovering;
}

// ── Linjegraf ────────────────────────────────────────────────────────────────
/**
 * Utvecklingen över tid.
 *
 * FUNGERAR MED EN ENDA PUNKT, till skillnad från kurvan i Utveckling som
 * returnerar null under två. Kravet är uttryckligt: grafen ska fungera även vid
 * 1–2 mätningar. En ensam punkt ritas som en punkt — det är sant, och ärligare
 * än en tom ruta.
 *
 * Y-axeln spänner mätvärdenas eget intervall med lite luft, inte 0–100. En
 * midja som går från 99 till 91,5 syns inte alls på en skala som börjar på noll.
 */
export function Graf({ punkter, enhet, höjd = 120, färg = C.lime }) {
  if (!punkter || !punkter.length) return null;
  const v = punkter.map(p => p.v);
  const min = Math.min(...v), max = Math.max(...v);
  const spann = max - min || Math.max(1, Math.abs(max) * 0.02);
  const marg = spann * 0.15;
  const lo = min - marg, hi = max + marg;
  const t0 = punkter[0].ts, t1 = punkter[punkter.length - 1].ts;
  const bredd = t1 - t0 || 1;
  const xy = p => [
    punkter.length === 1 ? 50 : ((p.ts - t0) / bredd) * 100,
    höjd - ((p.v - lo) / (hi - lo)) * (höjd - 20) - 10,
  ];
  const pts = punkter.map(p => xy(p).map((n, i) => (i ? n.toFixed(1) : n.toFixed(2))).join(",")).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 100 ${höjd}`} preserveAspectRatio="none" role="img"
        aria-label={`Utveckling, ${punkter.length} mätningar`}
        style={{ width: "100%", height: höjd, display: "block", overflow: "visible" }}>
        {punkter.length > 1 && (
          <polyline points={pts} fill="none" stroke={färg} strokeWidth="1.8"
            vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        )}
        {punkter.map((p, i) => {
          const [x, y] = xy(p);
          return <circle key={i} cx={x} cy={y} r={punkter.length === 1 ? 3.5 : 2.4}
            fill={färg} vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      {/* Ändpunkterna skrivs ut. Utan dem är kurvan en form utan skala. */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, ...unit(C.text3, 10) }}>
        <span>{fmt(punkter.length > 1 ? min : punkter[0].v)}{enhet && ` ${enhet}`}</span>
        <span>{punkter.length > 1 ? `${fmtDatum(t0)} – ${fmtDatum(t1)}` : fmtDatum(t0)}</span>
        <span>{fmt(punkter.length > 1 ? max : punkter[0].v)}{enhet && ` ${enhet}`}</span>
      </div>
    </div>
  );
}

// ── Nyckeltal ────────────────────────────────────────────────────────────────
/** Ett stort tal med sin förändring sedan start. Klickbart när det finns data. */
export function Nyckeltal({ id, mätningar, onClick }) {
  const def = ALLA_INDEX[id];
  const f = förändring(mätningar, id);
  if (!def) return null;
  const enhet = visaEnhet(def.enhet);
  const klickbar = !!f && !!onClick;
  return (
    <button
      onClick={klickbar ? () => onClick(id) : undefined}
      disabled={!klickbar}
      data-nyckeltal={id}
      style={{
        ...card, padding: "14px 14px 13px", flex: 1, minWidth: 0, textAlign: "left",
        cursor: klickbar ? "pointer" : "default", background: C.card,
        opacity: f ? 1 : 0.55, font: "inherit", color: C.text,
      }}>
      <div style={label()}>{def.namn}</div>
      <div style={{ ...hdr(24), marginTop: 6, whiteSpace: "nowrap" }}>
        {f ? fmt(f.värde) : DASH}
        {f && enhet ? <span style={unit(C.text2, 12)}> {enhet}</span> : null}
      </div>
      <div style={{ ...unit(diffFärg(f && f.sedanStart, def.bra), 11), marginTop: 5 }}>
        {f && f.sedanStart != null
          ? fmtDiff(f.sedanStart, visaEnhet(def.enhetDiff))
          : f ? "första mätningen" : "ej mätt"}
      </div>
    </button>
  );
}

// ── Detaljvy ─────────────────────────────────────────────────────────────────
/**
 * ETT MÅTT ÖVER TID. Samma komponent för midja, biceps och kroppsfett.
 *
 * Skillnaden mellan procentenheter och procent lever i registret
 * (`enhetDiff`), inte här — så den kan inte glida isär mellan vyer.
 */
export function MattDetalj({ id, mätningar, onStäng }) {
  const def = ALLA_INDEX[id];
  const s = useMemo(() => serie(mätningar, id), [mätningar, id]);
  const f = förändring(mätningar, id);
  if (!def) return null;
  const enhet = visaEnhet(def.enhet);
  const diffEnhet = visaEnhet(def.enhetDiff);

  return (
    <div data-detalj={id}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={hdr(19)}>{def.namn}</div>
        {onStäng && <button onClick={onStäng} style={btnText} aria-label="Tillbaka">Tillbaka</button>}
      </div>

      {!f ? (
        <div style={{ ...card, padding: 18, marginTop: 14 }}>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
            {def.namn} är inte mätt än. Lägg in ett värde i en ny mätning så
            börjar kurvan här.
          </div>
        </div>
      ) : (
        <>
          <div style={{ ...hdr(40), marginTop: 14 }}>
            {fmt(f.värde)}{enhet ? <span style={unit(C.text2, 15)}> {enhet}</span> : null}
          </div>
          <div style={{ ...unit(C.text3, 11), marginTop: 4 }}>{fmtDatum(f.ts, true)}</div>

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <div style={{ ...card, padding: 13, flex: 1 }}>
              <div style={label()}>Sedan start</div>
              <div style={{ ...hdr(19), marginTop: 5, color: diffFärg(f.sedanStart, def.bra) }}>
                {f.sedanStart != null ? fmtDiff(f.sedanStart, diffEnhet) : DASH}
              </div>
              {f.startTs && <div style={{ ...unit(C.text3, 10), marginTop: 4 }}>från {fmtDatum(f.startTs)}</div>}
            </div>
            <div style={{ ...card, padding: 13, flex: 1 }}>
              <div style={label()}>Senaste förändring</div>
              <div style={{ ...hdr(19), marginTop: 5, color: diffFärg(f.sedanSenaste, def.bra) }}>
                {f.sedanSenaste != null ? fmtDiff(f.sedanSenaste, diffEnhet) : DASH}
              </div>
              {f.föregåendeTs && <div style={{ ...unit(C.text3, 10), marginTop: 4 }}>från {fmtDatum(f.föregåendeTs)}</div>}
            </div>
          </div>

          <div style={{ ...card, padding: "16px 14px 12px", marginTop: 8 }}>
            <Graf punkter={s} enhet={enhet} />
          </div>

          {/* Alla mätpunkter, senast först. */}
          <div style={{ ...card, padding: 0, marginTop: 8, overflow: "hidden" }}>
            {[...s].reverse().map((p, i) => (
              <div key={p.ts} style={{
                display: "flex", justifyContent: "space-between", alignItems: "baseline",
                padding: "13px 16px", borderTop: i ? `1px solid ${C.hairline}` : "none",
              }}>
                <span style={{ fontSize: 13, color: C.text2 }}>{fmtDatum(p.ts, true)}</span>
                <span style={{ fontFamily: MONO, fontSize: 13.5, color: C.text }}>
                  {fmt(p.v)}{enhet && ` ${enhet}`}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Asymmetri ────────────────────────────────────────────────────────────────
/**
 * Vänster mot höger, neutralt redovisat.
 *
 * Ingen bedömning och ingen varning: skillnader mellan sidor är normala, och
 * appen har inget underlag för att säga något annat. Talet står där, och
 * användaren gör vad hen vill med det.
 */
export function Asymmetri({ mätningar, onValj }) {
  const rader = MATT_PAR
    .map(p => ({ ...p, a: asymmetri(mätningar, p.vanster, p.hoger) }))
    .filter(p => p.a);
  if (!rader.length) return null;
  return (
    <div style={{ ...card, padding: 16, marginTop: 8 }}>
      <div style={{ ...label(), marginBottom: 4 }}>Vänster och höger</div>
      {rader.map(r => (
        <div key={r.vanster} style={{ marginTop: 12 }}>
          <div style={{ ...hdr(13), color: C.text2 }}>{r.namn}</div>
          <div style={{ display: "flex", marginTop: 7, gap: 8 }}>
            {[
              { etikett: "Vänster", v: r.a.vänster, id: r.vanster },
              { etikett: "Höger", v: r.a.höger, id: r.hoger },
              { etikett: "Skillnad", v: r.a.diff, diff: true },
            ].map((c, i) => (
              <button key={i}
                onClick={c.id && onValj ? () => onValj(c.id) : undefined}
                disabled={!c.id || !onValj}
                style={{
                  flex: 1, textAlign: "left", padding: "9px 11px", borderRadius: 10,
                  background: C.card2, border: `1px solid ${C.hairline}`,
                  cursor: c.id && onValj ? "pointer" : "default", font: "inherit", color: C.text,
                }}>
                <div style={unit(C.text3, 9.5)}>{c.etikett.toUpperCase()}</div>
                <div style={{ fontFamily: MONO, fontSize: 14, marginTop: 3, color: c.diff ? C.text2 : C.text }}>
                  {fmt(c.v)} cm
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Registrering ─────────────────────────────────────────────────────────────
/**
 * NY MÄTNING.
 *
 * Kroppssammansättningen ligger öppen — det är den de flesta registrerar. Måtten
 * ligger i hopfällbara grupper, stängda som förval, så formuläret inte möter
 * användaren som ett kalkylblad med sjutton rader.
 *
 * INGET FÄLT ÄR OBLIGATORISKT. Fyll i det du mätt, lämna resten. Tomma fält
 * sparas inte alls — inte som noll.
 *
 * Grupperna byggs ur registret, så ett nytt mått dyker upp här utan att den här
 * filen rörs.
 */
const fältStil = {
  width: "100%", padding: "11px 12px", borderRadius: 10, minHeight: 44,
  border: `1px solid ${C.border}`, background: C.card2, color: C.text,
  fontSize: 15, fontFamily: MONO,
};

/**
 * Ett mätfält.
 *
 * LIGGER PÅ MODULNIVÅ, INTE INUTI NyMatning.
 *
 * Definierad inuti komponenten skapades funktionen på nytt vid varje
 * tangenttryck. React jämför komponenttyper med identitet, såg en ny typ, och
 * rev fältet för att bygga ett nytt i stället för att uppdatera det. Fokus
 * försvann med det gamla elementet — och på mobil åker tangentbordet ner när
 * fokus försvinner.
 *
 * Robert: "nu när jag registrerar vikt så åker tangentbordet ner efter varje
 * siffra. 8 ner jag får ta upp det 9 ner jag får ta upp det osv".
 *
 * inputMode="decimal" ger numeriskt tangentbord på mobil MED decimaltecken.
 * type="number" hade gett det också, men avvisar komma i flera webbläsare och
 * gör en svensk användares "91,5" till ingenting.
 */
function Falt({ id, namn, enhet, steg, värde, onÄndra }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <label htmlFor={`matt-${id}`} style={{ ...label(), display: "block", marginBottom: 5 }}>
        {namn}{enhet ? ` (${enhet})` : ""}
      </label>
      <input id={`matt-${id}`} data-matt={id}
        value={värde} onChange={e => onÄndra(id, e.target.value)}
        inputMode="decimal" enterKeyHint="next" autoComplete="off"
        placeholder={steg || "—"} style={fältStil} />
    </div>
  );
}

export function NyMatning({ mätningar = [], befintlig = null, onSpara, onAvbryt, onRadera }) {
  const [öppen, setÖppen] = useState(() => new Set());
  const [fel, setFel] = useState("");

  // Dagens datum förvalt. Redigerar man en post är det postens egen tidpunkt.
  const start = befintlig ? new Date(befintlig.ts) : new Date();
  const [datum, setDatum] = useState(
    `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`
  );
  const [tid, setTid] = useState(
    `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`
  );

  const [värden, setVärden] = useState(() => {
    const v = {};
    for (const k of KROPPSSAMMANSATTNING) v[k.id] = befintlig && befintlig[k.falt] != null ? String(befintlig[k.falt]).replace(".", ",") : "";
    for (const m of KROPPSMATT) v[m.id] = befintlig && befintlig.matt && befintlig.matt[m.id] != null ? String(befintlig.matt[m.id]).replace(".", ",") : "";
    return v;
  });

  const sätt = (id, v) => setVärden(x => ({ ...x, [id]: v }));
  const växla = g => setÖppen(s => { const n = new Set(s); n.has(g) ? n.delete(g) : n.add(g); return n; });

  // Antal ifyllda mått per grupp — så en stängd sektion ändå visar att den bär
  // något. Utan det ser en hopfälld grupp tom ut även när den inte är det.
  const ifyllda = g => mattIGrupp(g).filter(m => String(värden[m.id] || "").trim() !== "").length;

  const spara = () => {
    const [år, mån, dag] = datum.split("-").map(Number);
    const [tim, min] = (tid || "12:00").split(":").map(Number);
    const ts = new Date(år, (mån || 1) - 1, dag || 1, tim || 0, min || 0).getTime();
    if (!Number.isFinite(ts)) { setFel("Datumet går inte att läsa."); return; }

    const matt = {};
    for (const m of KROPPSMATT) matt[m.id] = värden[m.id];
    const post = byggMätning({
      ts, kg: värden.kg, fat: värden.fat, muscle: värden.muscle, visceral: värden.visceral,
      matt, källa: "manuell",
    });
    if (!post) { setFel("Fyll i minst ett värde."); return; }
    setFel("");
    onSpara(post, befintlig ? befintlig.ts : null);
  };

  return (
    <div data-nymatning="1">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={hdr(18)}>{befintlig ? "Ändra mätning" : "Ny mätning"}</div>
        {onAvbryt && <button onClick={onAvbryt} style={btnText}>Avbryt</button>}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <div style={{ flex: 2, minWidth: 0 }}>
          <label htmlFor="matt-datum" style={{ ...label(), display: "block", marginBottom: 5 }}>Datum</label>
          <input id="matt-datum" type="date" value={datum} onChange={e => setDatum(e.target.value)} style={fältStil} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <label htmlFor="matt-tid" style={{ ...label(), display: "block", marginBottom: 5 }}>Tid</label>
          <input id="matt-tid" type="time" value={tid} onChange={e => setTid(e.target.value)} style={fältStil} />
        </div>
      </div>

      {/* Kroppssammansättning — öppen, det är den som registreras oftast. */}
      <div style={{ ...card, padding: 16, marginTop: 12 }}>
        <div style={{ ...label(), marginBottom: 11 }}>Kroppssammansättning</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Falt id="kg" namn="Vikt" enhet="kg" steg="82,4"  värde={värden["kg"]} onÄndra={sätt} />
          <Falt id="fat" namn="Kroppsfett" enhet="%" steg="22,1"  värde={värden["fat"]} onÄndra={sätt} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Falt id="muscle" namn="Muskelmassa" enhet="%" steg="37,4"  värde={värden["muscle"]} onÄndra={sätt} />
          <Falt id="visceral" namn="Visceralt" enhet="" steg="8"  värde={värden["visceral"]} onÄndra={sätt} />
        </div>
      </div>

      {/* Kroppsmått — hopfällda grupper ur registret. */}
      {GRUPPER.map(g => {
        const är = öppen.has(g.id);
        const n = ifyllda(g.id);
        return (
          <div key={g.id} style={{ ...card, padding: 0, marginTop: 8, overflow: "hidden" }}>
            <button onClick={() => växla(g.id)} aria-expanded={är} data-grupp={g.id}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "15px 16px", minHeight: 44, cursor: "pointer",
                background: "none", border: "none", color: C.text, font: "inherit", textAlign: "left",
              }}>
              <span style={label(C.text)}>{g.namn}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
                {n > 0 && <span style={unit(C.lime, 11)}>{n} ifyllda</span>}
                <span style={{ color: C.muted, fontSize: 15, transition: "transform 150ms ease-out", transform: är ? "rotate(180deg)" : "none" }}>⌄</span>
              </span>
            </button>
            {är && (
              <div style={{ padding: "0 16px 16px" }}>
                {mattIGrupp(g.id).reduce((rader, m, i, arr) => {
                  if (i % 2 === 0) rader.push(arr.slice(i, i + 2));
                  return rader;
                }, []).map((par, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginTop: i ? 10 : 0 }}>
                    {par.map(m => <Falt key={m.id} id={m.id} namn={m.namn} enhet="cm" värde={värden[m.id]} onÄndra={sätt} />)}
                    {par.length === 1 && <div style={{ flex: 1 }} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {fel && <div style={{ color: C.critical, fontSize: 13, marginTop: 12 }} role="alert">{fel}</div>}

      <button onClick={spara} style={{ ...btnPrimary, marginTop: 14 }} data-spara="1">
        {befintlig ? "Spara ändring" : "Spara mätning"}
      </button>
      {befintlig && onRadera && (
        <button onClick={() => onRadera(befintlig.ts)} data-radera="1"
          style={{ ...btnGhost, marginTop: 8, color: C.critical, borderColor: C.hairline }}>
          Radera mätningen
        </button>
      )}
    </div>
  );
}

// ── Historik ─────────────────────────────────────────────────────────────────
/**
 * Alla mättillfällen, senast först.
 *
 * Ett tillfälle listar BARA det som mättes. En post med enbart vikt och midja
 * visar två rader, inte sjutton med streck — den som mätte två saker har mätt
 * två saker, och tomma rader hade fått det att se ut som ett misslyckande.
 */
export function Historik({ mätningar = [], onValj, onÄndra }) {
  const poster = useMemo(
    () => [...(mätningar || [])].filter(Boolean).sort((a, b) => b.ts - a.ts),
    [mätningar]
  );
  if (!poster.length) {
    return (
      <div style={{ ...card, padding: 18 }}>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
          Ingen mätning registrerad än.
        </div>
      </div>
    );
  }
  return (
    <div data-historik="1">
      {poster.map(p => {
        const rader = [
          ...KROPPSSAMMANSATTNING
            .filter(k => p[k.falt] != null)
            .map(k => ({ id: k.id, namn: k.namn, v: p[k.falt], enhet: visaEnhet(k.enhet) })),
          ...KROPPSMATT
            .filter(m => p.matt && p.matt[m.id] != null)
            .map(m => ({ id: m.id, namn: m.kort || m.namn, v: p.matt[m.id], enhet: "cm" })),
        ];
        return (
          <div key={p.ts} style={{ ...card, padding: 16, marginTop: 8 }} data-tillfalle={p.ts}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={label(C.text)}>{fmtDatum(p.ts, true)}</span>
              {onÄndra && (
                <button onClick={() => onÄndra(p)} data-andra={p.ts}
                  style={{ ...btnText, padding: "6px 2px", minHeight: 32, color: C.lime, fontSize: 12.5 }}>
                  Ändra
                </button>
              )}
            </div>
            <div style={{ marginTop: 9 }}>
              {rader.map(r => (
                <button key={r.id}
                  onClick={onValj ? () => onValj(r.id) : undefined}
                  disabled={!onValj}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "baseline",
                    width: "100%", padding: "7px 0", background: "none", border: "none",
                    color: C.text, font: "inherit", cursor: onValj ? "pointer" : "default", textAlign: "left",
                  }}>
                  <span style={{ fontSize: 13, color: C.text2 }}>{r.namn}</span>
                  <span style={{ fontFamily: MONO, fontSize: 13.5 }}>
                    {fmt(r.v)}{r.enhet && ` ${r.enhet}`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Måtten som faktiskt mätts, för listor som inte ska visa tomma rader. */
export function useMättaMått(mätningar) {
  return useMemo(() => mättMått(mätningar, KROPPSMATT.map(m => m.id)), [mätningar]);
}
