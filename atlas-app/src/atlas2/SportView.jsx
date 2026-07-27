// Askr 2.0 — logga sport och cardio.
//
// VARFÖR DEN BEHÖVS: 2.0 kunde bara logga gympass. Springer man en mil visste
// appen ingenting, och readiness låg kvar för högt. Mottagarsidan var redan
// byggd — `bodyState` kör `computeSystemicFatigue` och drar av upp till 18
// readiness-poäng, och `muscleLoads` färgar kartan. Det som saknades var
// vägen in.
//
// INGEN NY MOTORLOGIK. Belastningen räknas av `computeSportLoad` och
// `computeCardioLoad`, precis som i den gamla appen. Passformen är också
// densamma, så historiken förblir en sak och inte två.

import { useEffect, useMemo, useState } from "react";
import { C, HFONT, MONO, hdr, label, card, btnPrimary, btnGhost, volt } from "./design.js";
import { SPORT_CATEGORIES, SPORT_META, LEGACY_MAP } from "../data/sportLibrary.js";
import { harDistans, tempoPerKm } from "../data/sportDistans.js";
import { resolveActivity, SPORT_INTENSITY } from "../data/exercises.js";
import { computeSportLoad, computeCardioLoad } from "../engines/index.js";
import { buildSession } from "../engines/session.js";
import { MUSCLES } from "../data/muscles.js";
import { sportIcons, ensureSportIcons, onSportIcons } from "../data/sport-icons.js";

/**
 * Ikonen hämtas i efterhand ur `public/sport-icons.json` — samma delade modul
 * som gamla appen använder, så biblioteket bara finns på ett ställe. Tills den
 * är inne renderas en emoji: ingen tom ruta och inget hopp i layouten.
 *
 * Renderingen skrivs här i stället för att återanvända `components/common`,
 * som drar in gamla appens tokens och lucide-react. Delad LOGIK, egen yta.
 */
function SportIkon({ id, emoji = "🏅", size = 30 }) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (sportIcons()) return;
    const av = onSportIcons(() => tick(n => n + 1));
    ensureSportIcons();
    return av;
  }, []);
  const lib = sportIcons();
  const svg = lib ? (lib[id] || lib[LEGACY_MAP[id]]) : null;
  if (!svg) return <span style={{ fontSize: Math.round(size * 0.8), lineHeight: 1 }}>{emoji}</span>;
  return (
    <span aria-hidden style={{ display: "inline-flex", width: size, height: size, lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: svg.replace("<svg ", `<svg width="${size}" height="${size}" `) }} />
  );
}

/** Alla biblioteksposter grupperade på kategori, i guidens ordning. */
export function aktiviteterPerKategori() {
  const per = {};
  Object.keys(SPORT_META).forEach(id => {
    const meta = SPORT_META[id];
    (per[meta.cat] || (per[meta.cat] = [])).push({ id, namn: meta.sv, typ: meta.type });
  });
  Object.values(per).forEach(l => l.sort((a, b) => a.namn.localeCompare(b.namn, "sv")));
  return SPORT_CATEGORIES.slice().sort((a, b) => a.order - b.order)
    .filter(k => (per[k.id] || []).length)
    .map(k => ({ ...k, poster: per[k.id] }));
}

/**
 * Bygger passet. Samma form som gamla appen skriver (features/profile) —
 * INGA sets, `sport: true`, `source: "sport"`.
 *
 * Går genom `buildSession` precis som gympassen: den bevarar extra fält med
 * flit (dess egen kommentar nämner sport, hiit och cardioLoad), sätter `id`,
 * `schemaV` och `createdAt`, och respekterar `muscleLoads` när de skickas in.
 * Utan id tappar v3-backupen posten och synken kan inte se den.
 */
export function byggSportpass(aktivitet, minuter, intensitet, hiit, nu = Date.now(), km = null) {
  if (!aktivitet || !(minuter > 0)) return null;
  const im = SPORT_INTENSITY[intensitet];
  if (!im) return null;
  return buildSession({
    title: `${aktivitet.name}${hiit ? " (HIIT)" : ""}`,
    completedAt: nu,
    sport: true,
    hiit,
    // AVSTEG från gamla appens form, med flit: den sparar inte tiden, och då
    // går den inte att visa någonstans efteråt. Att räkna baklänges ur
    // cardioLoad kräver intensitet och cardio-faktor som inte heller sparas —
    // det hade blivit en gissning. Fältet är additivt; gamla appen läser det
    // inte och bryr sig inte om att det finns.
    minutes: minuter,
    // Distansen påverkar INTE belastningen — cardioLoad räknas ur tid och
    // intensitet. Att låta kilometer styra hade krävt en modell för hur snabbt
    // just den här personen springer, alltså en gissning förklädd till mätning.
    // Den sparas för att den är sann, och för att tempot går att räkna ur den.
    ...(km > 0 ? { distanceKm: km } : {}),
    cardioLoad: computeCardioLoad(aktivitet, minuter, im, hiit),
    muscleLoads: computeSportLoad(aktivitet, minuter, im, hiit),
    source: "sport",
  });
}

const INTENSITETER = Object.keys(SPORT_INTENSITY);

export function SportView({ onLogg, onClose }) {
  const kategorier = useMemo(aktiviteterPerKategori, []);
  const [öppen, setÖppen] = useState(kategorier[0] ? kategorier[0].id : null);
  const [valdId, setValdId] = useState(null);
  const [minuter, setMinuter] = useState(45);
  const [intensitet, setIntensitet] = useState(INTENSITETER[1] || INTENSITETER[0]);
  const [hiit, setHiit] = useState(false);
  const [km, setKm] = useState("");

  const aktivitet = useMemo(() => (valdId ? resolveActivity(valdId) : null), [valdId]);
  const förhands = useMemo(
    () => (aktivitet ? byggSportpass(aktivitet, minuter, intensitet, hiit, Date.now(), parseFloat(String(km).replace(",", ".")) || null) : null),
    [aktivitet, minuter, intensitet, hiit, km]
  );
  const tempo = useMemo(
    () => tempoPerKm(parseFloat(String(km).replace(",", ".")), minuter),
    [km, minuter]
  );
  const toppmuskler = useMemo(() => {
    if (!förhands) return [];
    return Object.entries(förhands.muscleLoads || {})
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      // Samma namnkälla som MuscleSheet och store använder — en sanning.
      .map(([id, v]) => ({ id, namn: (MUSCLES[id] && MUSCLES[id].name) || id, värde: Math.round(v) }));
  }, [förhands]);

  const spara = () => { if (förhands && onLogg) onLogg(förhands); };

  return (
    <div>
      <div style={hdr(20)}>Logga aktivitet</div>
      <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, margin: "8px 0 16px" }}>
        Sport och kondition belastar kroppen precis som gympass. Loggar du dem
        vet kartan och beredskapen om dem.
      </div>

      {/* ── VÄLJ AKTIVITET ── */}
      <div style={label()}>Aktivitet</div>
      <div style={{ marginTop: 8 }}>
        {kategorier.map(k => {
          const expanderad = öppen === k.id;
          return (
            <div key={k.id} style={{ marginBottom: 6 }}>
              <button
                onClick={() => setÖppen(expanderad ? null : k.id)}
                aria-expanded={expanderad}
                style={{
                  ...card, width: "100%", display: "flex", alignItems: "center",
                  justifyContent: "space-between", padding: "11px 13px", minHeight: 44,
                  cursor: "pointer", background: expanderad ? volt(0.045) : C.card,
                  borderColor: expanderad ? C.lime : C.border, color: C.text,
                  fontFamily: HFONT, fontSize: 13.5, textAlign: "left",
                }}>
                <span>{k.sv}</span>
                <span style={{ color: C.muted, fontSize: 12 }}>{k.poster.length}</span>
              </button>
              {expanderad && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(96px,1fr))", gap: 6, marginTop: 6 }}>
                  {k.poster.map(p => {
                    const vald = valdId === p.id;
                    return (
                      <button key={p.id} onClick={() => setValdId(p.id)}
                        aria-label={p.namn}
                        style={{
                          ...card, padding: "10px 4px", minHeight: 44, cursor: "pointer",
                          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                          background: vald ? volt(0.06) : C.card2,
                          borderColor: vald ? C.lime : C.border, color: C.text,
                        }}>
                        <SportIkon id={p.id} emoji={p.typ === "machine" ? "⚙️" : "🏅"} size={28} />
                        <span style={{ fontSize: 11, lineHeight: 1.25, textAlign: "center" }}>{p.namn}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {aktivitet && (
        <>
          {/* ÄRLIGHET: en kategoriuppskattning ska inte se ut som en mätning. */}
          {aktivitet.fromLibrary && (
            <div style={{
              ...card, marginTop: 14, padding: "11px 13px", background: C.card2,
              fontSize: 12, color: C.text2, lineHeight: 1.55,
            }}>
              Belastningen för {aktivitet.name} är ett <strong style={{ color: C.text }}>kategoriestimat</strong> —
              Askr har ingen detaljmodell för just den här aktiviteten. Muskelfördelningen
              nedan är alltså ungefärlig, inte uppmätt.
            </div>
          )}

          {/* ── TID ── */}
          <div style={{ ...label(), marginTop: 16 }}>Tid</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
            <button onClick={() => setMinuter(m => Math.max(5, m - 5))} aria-label="Minska tiden"
              style={{ ...btnGhost, minWidth: 44, minHeight: 44, padding: 0 }}>−</button>
            <div style={{ flex: 1, textAlign: "center" }}>
              <span style={{ ...hdr(26), fontFamily: MONO }}>{minuter}</span>
              <span style={{ fontSize: 12, color: C.muted, marginLeft: 6 }}>min</span>
            </div>
            <button onClick={() => setMinuter(m => m + 5)} aria-label="Öka tiden"
              style={{ ...btnGhost, minWidth: 44, minHeight: 44, padding: 0 }}>+</button>
          </div>

          {/* ── DISTANS ──
              Bara för aktiviteter där kilometer är ett naturligt mått. Vilka
              det är står i datan (DISTANS_SPORTER), inte som ett villkor här —
              kategorin duger inte, eftersom segling och curling ligger i samma
              grupper som simning och längdskidåkning. */}
          {aktivitet && harDistans(aktivitet.libId || aktivitet.id) && (
            <>
              <div style={{ ...label(), marginTop: 16 }}>Distans</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                <input value={km} inputMode="decimal" aria-label="Distans i kilometer"
                  onChange={e => setKm(e.target.value.replace(/[^\d.,]/g, ""))}
                  placeholder="valfritt"
                  style={{
                    flex: 1, minWidth: 0, padding: "12px 14px", borderRadius: 12, minHeight: 44,
                    border: `1px solid ${C.border}`, background: C.card2, color: C.text,
                    fontFamily: MONO, fontSize: 16, textAlign: "center",
                  }} />
                <span style={{ fontSize: 13, color: C.muted, width: 30 }}>km</span>
              </div>
              {tempo && (
                <div style={{ fontFamily: MONO, fontSize: 12, color: C.lime, marginTop: 8, textAlign: "center" }}>
                  {tempo} min/km
                </div>
              )}
            </>
          )}

          {/* ── INTENSITET ── */}
          <div style={{ ...label(), marginTop: 16 }}>Intensitet</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {INTENSITETER.map(k => (
              <button key={k} onClick={() => setIntensitet(k)}
                style={{
                  ...card, flex: 1, padding: "11px 4px", minHeight: 44, cursor: "pointer",
                  background: intensitet === k ? volt(0.06) : C.card2,
                  borderColor: intensitet === k ? C.lime : C.border,
                  color: C.text, fontSize: 12.5, fontFamily: HFONT,
                }}>{k}</button>
            ))}
          </div>

          {/* ── UPPLÄGG ── */}
          <div style={{ ...label(), marginTop: 16 }}>Upplägg</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {[["Jämnt", false], ["Intervaller (HIIT)", true]].map(([txt, v]) => (
              <button key={txt} onClick={() => setHiit(v)}
                style={{
                  ...card, flex: 1, padding: "11px 4px", minHeight: 44, cursor: "pointer",
                  background: hiit === v ? volt(0.06) : C.card2,
                  borderColor: hiit === v ? C.lime : C.border,
                  color: C.text, fontSize: 12.5, fontFamily: HFONT,
                }}>{txt}</button>
            ))}
          </div>

          {/* ── FÖRHANDSVISNING: vad passet gör med kroppen, INNAN det sparas ── */}
          <div style={{ ...card, marginTop: 18, padding: "13px 14px" }}>
            <div style={label()}>Så här belastas du</div>
            <div style={{ display: "flex", gap: 18, margin: "10px 0 12px" }}>
              <div>
                <div style={{ ...hdr(22), fontFamily: MONO }}>{förhands.cardioLoad}</div>
                <div style={{ fontSize: 10.5, color: C.muted }}>konditionslast</div>
              </div>
              <div>
                <div style={{ ...hdr(22), fontFamily: MONO }}>{toppmuskler.length}</div>
                <div style={{ fontSize: 10.5, color: C.muted }}>muskler i topp</div>
              </div>
            </div>
            {toppmuskler.length === 0 ? (
              <div style={{ fontSize: 12, color: C.muted }}>
                Ingen muskelbelastning räknas för den här aktiviteten — bara kondition.
              </div>
            ) : (
              toppmuskler.map(m => {
                const max = toppmuskler[0].värde || 1;
                return (
                  <div key={m.id} style={{ marginBottom: 7 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.text2 }}>
                      <span>{m.namn}</span>
                      <span style={{ fontFamily: MONO, color: C.muted }}>{m.värde}</span>
                    </div>
                    <div style={{ height: 4, background: C.card2, borderRadius: 2, marginTop: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.round((m.värde / max) * 100)}%`, background: C.lime }} />
                    </div>
                  </div>
                );
              })
            )}
            {/* Ingen kaloriuppskattning: appen har ingen energimodell för
                aktivitet, och en gissad siffra vore värre än ingen. */}
          </div>

          <button onClick={spara} style={{ ...btnPrimary, marginTop: 16, width: "100%" }}>
            Logga {aktivitet.name.toLowerCase()}
          </button>
        </>
      )}

      {!aktivitet && (
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 16, lineHeight: 1.6 }}>
          Välj en aktivitet ovan, så visar Askr vad passet gör med kroppen innan
          du sparar.
        </div>
      )}

      <button onClick={onClose} style={{ ...btnGhost, marginTop: 12, width: "100%" }}>Stäng</button>
    </div>
  );
}
