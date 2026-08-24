// Askr 2.0 — programväljaren.
//
// Utan den här kan Real Mode inte göra någonting: appen börjar medvetet utan
// program, och då är det första man måste kunna göra att välja ett.

import { useState, useMemo } from "react";
import { C, hdr, btnText, label, btnPrimary, btnGhost, card, volt } from "./design.js";
import { ALL_TEMPLATES, copyProgram } from "../engines/programs.js";
import { CustomProgram } from "./CustomProgram.jsx";
import { programförslag, passarAktivtProgram } from "../engines/malprogram.js";

export function ProgramSheet({ aktiv, sessions, setPrograms, setActiveProgramId, nästa, onStarta, onClose, mål, profile, readiness = null }) {
  const [vald, setVald] = useState(null);
  const [bygger, setBygger] = useState(false);   // vald familj, null = visa familjelistan
  // Familjerna i den ordning de står i ALL_TEMPLATES — Full Body, Upper/Lower
  // och Push/Pull/Legs först, alltså de vanligaste uppläggen.
  const familjer = [...new Set(ALL_TEMPLATES.map(t => t.family || t.name))];

  const välj = mall => {
    const kopia = copyProgram(mall, { name: mall.name, active: true });
    setPrograms(ps => [...ps.filter(x => x.id !== kopia.id), kopia]);
    setActiveProgramId(kopia.id);
  };

  // MÅLRESAN STYR FÖRSLAGET. Utan mål eller utan plan är detta null och
  // väljaren ser ut precis som den alltid gjort — ett mål är ett skäl att lyfta
  // fram något, aldrig att gömma resten.
  const rek = useMemo(() => programförslag({ mål, profile, sessions, readiness }), [mål, profile, sessions, readiness]);
  const passar = useMemo(() => passarAktivtProgram(aktiv, mål, profile), [aktiv, mål, profile]);

  const vecka = (() => {
    if (!aktiv) return null;
    const första = (sessions || []).filter(s => s && s.programId === aktiv.id)
      .map(s => s.completedAt).filter(Boolean).sort()[0];
    return första ? Math.floor((Date.now() - första) / 6048e5) + 1 : null;
  })();

  if (bygger) {
    return (
      <CustomProgram
        onClose={() => setBygger(false)}
        onKlar={prog => {
          // Sparas som vilket program som helst — samma form som en mall-kopia,
          // så nextWorkout, progression och programanalys fungerar direkt.
          setPrograms(ps => [...ps.filter(x => x.id !== prog.id), prog]);
          setActiveProgramId(prog.id);
          setBygger(false);
        }} />
    );
  }

  return (
    <div>
      <div style={hdr(19)}>Program</div>

      {aktiv ? (
        <div style={{ ...card, marginTop: 14, borderColor: C.lime, background: volt(.05) }}>
          <div style={hdr(16)}>{aktiv.name}</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 5 }}>
            {vecka ? `Vecka ${vecka} · ` : ""}{aktiv.daysPerWeek} pass i veckan · {(aktiv.workouts || []).length} olika pass
          </div>
          <button onClick={onClose} style={{ ...btnPrimary, marginTop: 14 }}>Tillbaka till hem <span style={{ fontSize: 18 }}>→</span></button>

          {/* PASSLISTAN LIGGER I PASSVYN, INTE HÄR.
              Den byggdes ursprungligen i det här arket, men arket stängs så
              fort man går därifrån — så i praktiken fanns valet ingenstans.
              När listan flyttades till passvyn blev den här kvar, och samma
              pass renderades två gånger: en gång med förhandsvisning, en gång
              utan. Den utan startade dessutom passet direkt.

              Ett val ska finnas på ETT ställe. */}

          {/* Avviker programmet från målresan sägs det — men som upplysning,
              inte tillsägelse. Att köra ett annat upplägg kan vara medvetet. */}
          {passar && !passar.passar && (
            <div style={{ marginTop: 12, paddingTop: 11, borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12.5, color: C.recovering, lineHeight: 1.55 }}>{passar.text}</div>
              {passar.avvikelser.map((a, i) => (
                <div key={i} style={{ fontSize: 11.5, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>{a}</div>
              ))}
            </div>
          )}

          <button onClick={() => setActiveProgramId(null)} style={{ width: "100%", marginTop: 9, padding: 11, borderRadius: 999, border: "none", background: "transparent", color: C.muted, fontSize: 12.5, cursor: "pointer" }}>
            Sluta följa programmet
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "10px 0 16px" }}>
          Inget program valt. Med ett program vet Askr vad som ska komma härnäst
          — utan ett kan appen bara berätta hur kroppen mår, inte vad du ska göra.
        </div>
      )}

      {/* FÖRSLAG UR MÅLRESAN. Planen sa tre pass i veckan mot ett fettmål, och
          väljaren visade ändå samma lista som för alla andra — planen var
          beskrivande, inte styrande. Skälen står utskrivna: ett förslag som
          inte kan förklaras är en gissning med snyggare typsnitt.
          Hela listan står kvar nedanför. */}
      {rek && !vald && (
        <div style={{ marginTop: 20 }}>
          <div style={{ ...label(C.lime), marginBottom: 9 }}>Passar din målresa</div>
          {rek.varning && (
            <div style={{ fontSize: 12, color: C.recovering, lineHeight: 1.55, marginBottom: 10 }}>{rek.varning}</div>
          )}
          {rek.förslag.map(f => (
            <button key={f.mall.id} onClick={() => välj(f.mall)} style={{
              ...card, width: "100%", textAlign: "left", cursor: "pointer", color: C.text,
              display: "block", marginBottom: 8,
              borderColor: aktiv && aktiv.name === f.mall.name ? C.lime : C.border,
            }}>
              <div style={hdr(15)}>{f.mall.name}</div>
              {f.skäl.length > 0 && (
                <div style={{ fontSize: 12, color: C.text2, marginTop: 5, lineHeight: 1.55 }}>
                  {f.skäl.join(" · ")}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* FAMILJ FÖRST, NIVÅ SEDAN.
          Förut låg alla 31 mallar i en enda rad med sex synliga och resten
          bakom "Visa alla". Upper/Lower och Push/Pull/Legs hamnade på plats
          5-10, alltså precis utanför — Robert hade dem hela tiden men såg dem
          aldrig. Nivån stod dessutom bara som text i namnet.

          Nu är det tio familjer i stället för trettioen rader, och nivån blir
          ett eget steg. Man ser direkt att Upper/Lower finns i tre varianter
          i stället för att leta efter dem i en lista. */}
      <div style={{ ...label(), margin: "20px 0 9px" }}>
        {vald ? "Välj nivå" : aktiv ? "Byt program" : "Välj program"}
      </div>

      {vald ? (
        <>
          <button onClick={() => setVald(null)}
            style={{ ...btnText, marginBottom: 12, padding: "8px 0", minHeight: 44 }}>
            ‹ Alla upplägg
          </button>
          <div style={{ ...hdr(17), marginBottom: 4 }}>{vald}</div>
          {(() => {
            const iFamiljen = ALL_TEMPLATES.filter(t => (t.family || t.name) === vald);
            const ex = iFamiljen[0];
            return (
              <>
                {ex && ex.desc && (
                  <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55, marginBottom: 14 }}>{ex.desc}</div>
                )}
                {iFamiljen.map(t => (
                  <button key={t.id} onClick={() => välj(t)} data-mall="1"
                    style={{ width: "100%", textAlign: "left", padding: 15, marginBottom: 9, borderRadius: 15,
                      border: `1px solid ${C.border}`, background: C.card2, color: C.text, cursor: "pointer", minHeight: 44 }}>
                    <div style={hdr(14.5)}>{t.level || t.name}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      {[`${(t.workouts || []).length} olika pass`, `${t.daysPerWeek} pass/vecka`,
                        t.sessionDuration ? `${t.sessionDuration} min` : null].filter(Boolean).map(x => (
                        <span key={x} style={{ fontSize: 10.5, color: C.muted, border: `1px solid ${C.border}`,
                          borderRadius: 999, padding: "3px 9px" }}>{x}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </>
            );
          })()}
        </>
      ) : (
        familjer.map(f => {
          const iFamiljen = ALL_TEMPLATES.filter(t => (t.family || t.name) === f);
          const nivåer = iFamiljen.map(t => t.level).filter(Boolean);
          const ex = iFamiljen[0];
          // En familj med bara en variant behöver inget nivåsteg — välj direkt.
          const direkt = iFamiljen.length === 1;
          return (
            <button key={f} data-familj="1"
              onClick={() => direkt ? välj(iFamiljen[0]) : setVald(f)}
              style={{ width: "100%", textAlign: "left", padding: 15, marginBottom: 9, borderRadius: 15,
                border: `1px solid ${C.border}`, background: C.card2, color: C.text, cursor: "pointer", minHeight: 44 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={hdr(14.5)}>{f}</div>
                  {ex && ex.desc && (
                    <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, margin: "5px 0 0" }}>{ex.desc}</div>
                  )}
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 7 }}>
                    {direkt
                      ? `${(iFamiljen[0].workouts || []).length} olika pass · ${iFamiljen[0].daysPerWeek} pass/vecka`
                      : `${nivåer.join(" · ")}`}
                  </div>
                </div>
                <span style={{ color: C.muted, fontSize: 18, flexShrink: 0 }}>→</span>
              </div>
            </button>
          );
        })
      )}

      {/* BYGG EGET, sist i listan. Den som tränat länge har oftast ett upplägg
          i huvudet som ingen mall matchar — men mallarna står först, eftersom de
          är rätt svar för de flesta och alltid rätt svar för en nybörjare. */}
      {!vald && (
        <button onClick={() => setBygger(true)} data-bygg="1"
          style={{ width: "100%", textAlign: "left", padding: 15, marginTop: 4, borderRadius: 15,
            border: `1px dashed ${C.border}`, background: "transparent", color: C.text,
            cursor: "pointer", minHeight: 44 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={hdr(14.5)}>Bygg eget</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginTop: 5 }}>
                Välj övningar själv och sätt set och reps.
              </div>
            </div>
            <span style={{ color: C.muted, fontSize: 18, flexShrink: 0 }}>+</span>
          </div>
        </button>
      )}

    </div>
  );
}
