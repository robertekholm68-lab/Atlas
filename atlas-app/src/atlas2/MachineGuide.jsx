import { useState, useMemo } from "react";
import { C, HFONT, hdr, label, btnText, card, volt } from "./design.js";
import { ersättandeÖvningar } from "../engines/machines.js";
import { EXERCISES } from "../data/exercises.js";
import { MACHINE_TYPES, MACHINE_MODELS, RESISTANCE_TYPES } from "../data/machines.js";
import { MUSCLES } from "../data/muscles.js";
import { SkannaMaskin } from "./SkannaMaskin.jsx";

/**
 * MASKINGUIDEN.
 *
 * 43 maskintyper och 67 modeller har legat i datan utan en enda referens i
 * Askr 2.0 — noll vyer använde MACHINE_TYPES. Femte fyndet i rad med samma
 * form: funktionen fanns, vägen dit saknades.
 *
 * OCH DET HÄR ÄR DEN RIKASTE DATAN I APPEN. Till skillnad från övningsbanken,
 * där ingen övning har teknikbeskrivning, bär varje maskintyp:
 *   · svenskt namn ("Latsdrag") utöver det engelska
 *   · inställningar att göra innan man sätter sig
 *   · vanliga fel
 *   · alternativa maskiner när den man ville ha är upptagen
 *
 * Alla 43 har alla tre fälten ifyllda. Det är precis vad man behöver stående
 * framför en maskin man inte kört förut — och det är sådant som normalt kräver
 * att man frågar någon.
 *
 * Muskelvektorn är samma [{muscleId, factor}] som driver kroppskartan, precis
 * som i övningsbanken. Ingen andra sanning om vad något belastar.
 */

const KATEGORI_SV = {
  Back: "Rygg", Chest: "Bröst", Shoulders: "Axlar", Arms: "Armar",
  Legs: "Ben", Glutes: "Säte", Calves: "Vader", "Full body": "Helkropp", Core: "Bål",
};

export function MachineGuide({ onClose }) {
  const [sök, setSök] = useState("");
  const [kategori, setKategori] = useState(null);
  const [öppen, setÖppen] = useState(null);
  const [skannar, setSkannar] = useState(false);

  const kategorier = useMemo(() => {
    const räkning = {};
    MACHINE_TYPES.forEach(m => { räkning[m.category] = (räkning[m.category] || 0) + 1; });
    return Object.keys(KATEGORI_SV).filter(k => räkning[k])
      .map(k => ({ id: k, namn: KATEGORI_SV[k], antal: räkning[k] }));
  }, []);

  // Modeller per typ — "vilken heter den på mitt gym?"
  const modellerFör = id => MACHINE_MODELS.filter(m => m.typeId === id);

  const träffar = useMemo(() => {
    const q = sök.trim().toLowerCase();
    return MACHINE_TYPES.filter(m => {
      if (kategori && m.category !== kategori) return false;
      if (!q) return true;
      // Sök på båda språken, på muskel och på tillverkare — man vet ofta bara
      // vad det står på maskinen.
      const musklerna = (m.muscles || []).map(a => (MUSCLES[a.muscleId] || {}).name || "").join(" ");
      const märken = modellerFör(m.id).map(x => `${x.manufacturer} ${x.model}`).join(" ");
      return `${m.name} ${m.en} ${KATEGORI_SV[m.category] || ""} ${musklerna} ${märken}`
        .toLowerCase().includes(q);
    });
  }, [sök, kategori]);

  // Skanningen ersätter guidevyn medan den pågår, som streckkodsläsaren och
  // fotovyn för mat — kameran ska aldrig kunna bli kvar bakom något annat.
  if (skannar) return (
    <SkannaMaskin
      onClose={() => setSkannar(false)}
      onTräff={typIdEllerModell => {
        // QR-vägen kan ge en full modell (med typeId) eller bara ett typ-id
        // från fotovägen — båda leder till samma typ, öppnad direkt.
        const typeId = typIdEllerModell && typIdEllerModell.typeId
          ? typIdEllerModell.typeId : typIdEllerModell;
        setSkannar(false);
        setSök(""); setKategori(null);
        setÖppen(typeId);
      }} />
  );

  const rad = { border: `1px solid ${C.border}`, background: C.card2, borderRadius: 14 };
  const punkt = { fontSize: 12.5, color: C.text2, lineHeight: 1.55, marginBottom: 5, paddingLeft: 14, position: "relative" };
  const prick = { position: "absolute", left: 2, top: 7, width: 4, height: 4, borderRadius: 2, background: C.muted };

  return (
    <div style={{ padding: "4px 0 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={hdr(19)}>Maskiner</div>
        {onClose && <button onClick={onClose} style={btnText} aria-label="Stäng">Stäng</button>}
      </div>
      <div style={{ fontSize: 12.5, color: C.muted, marginTop: 5, lineHeight: 1.55 }}>
        {MACHINE_TYPES.length} maskiner med inställningar och vanliga fel — för när du
        står framför en du inte kört förut.
      </div>

      <button onClick={() => setSkannar(true)} data-skanna-maskin="1" style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
        width: "100%", marginTop: 12, marginBottom: 10, padding: "12px 14px",
        borderRadius: 12, minHeight: 44, cursor: "pointer",
        border: `1px solid ${C.border}`, background: C.card2, color: C.text,
        fontFamily: HFONT, fontSize: 12, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase",
      }}>
        <span aria-hidden style={{ fontSize: 15 }}>▥</span> Skanna maskin
      </button>

      <input value={sök} onChange={e => setSök(e.target.value)}
        placeholder="Sök maskin, muskel eller märke…"
        aria-label="Sök bland maskiner"
        style={{
          width: "100%", marginTop: 14, padding: "12px 14px", borderRadius: 12, minHeight: 44,
          border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 14,
        }} />

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "12px 0 4px" }}>
        <button onClick={() => setKategori(null)} data-kat="alla" style={{
          ...rad, padding: "7px 13px", minHeight: 36, cursor: "pointer", fontSize: 12.5,
          borderColor: kategori ? C.border : C.lime, color: kategori ? C.muted : C.lime,
          background: kategori ? C.card2 : volt(.08),
        }}>Alla</button>
        {kategorier.map(k => (
          <button key={k.id} onClick={() => setKategori(kategori === k.id ? null : k.id)} data-kat={k.id}
            style={{
              ...rad, padding: "7px 13px", minHeight: 36, cursor: "pointer", fontSize: 12.5,
              borderColor: kategori === k.id ? C.lime : C.border,
              color: kategori === k.id ? C.lime : C.muted,
              background: kategori === k.id ? volt(.08) : C.card2,
            }}>{k.namn} <span style={{ opacity: .6 }}>{k.antal}</span></button>
        ))}
      </div>

      <div style={{ ...label(), margin: "16px 0 8px" }}>
        {träffar.length} {träffar.length === 1 ? "maskin" : "maskiner"}
      </div>

      {träffar.length === 0 && (
        <div style={{ ...card, padding: 16, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
          Ingen maskin matchar ”{sök}”. Prova en muskel (lats, säte) eller ett
          märke (Technogym, Hammer).
        </div>
      )}

      {träffar.map(m => {
        const är = öppen === m.id;
        const musk = [...(m.muscles || [])].sort((a, b) => b.factor - a.factor);
        const modeller = modellerFör(m.id);
        return (
          <div key={m.id} style={{ ...rad, marginBottom: 8, overflow: "hidden" }}>
            <button onClick={() => setÖppen(är ? null : m.id)} data-maskin="1" aria-expanded={är}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                width: "100%", textAlign: "left", padding: "13px 15px", minHeight: 44,
                background: "none", border: "none", color: C.text, cursor: "pointer",
              }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ ...hdr(13.5), display: "block" }}>{m.name}</span>
                <span style={{ display: "block", fontSize: 11.5, color: C.muted, marginTop: 3 }}>
                  {[m.en, RESISTANCE_TYPES[m.resistanceDefault]].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span style={{ color: C.muted, fontSize: 15, flexShrink: 0,
                transform: är ? "rotate(180deg)" : "none", transition: "transform 150ms ease-out" }}>⌄</span>
            </button>

            {är && (
              <div style={{ padding: "0 15px 14px" }}>
                {musk.length > 0 && (
                  <>
                    <div style={{ ...label(), marginBottom: 8 }}>Belastar</div>
                    {musk.map(a => (
                      <div key={a.muscleId} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                        <span style={{ fontSize: 12.5, color: C.text2, flex: 1, minWidth: 0 }}>
                          {(MUSCLES[a.muscleId] || {}).name || a.muscleId}
                        </span>
                        <span style={{ width: 74, height: 5, borderRadius: 3, background: C.border, flexShrink: 0 }}>
                          <span style={{ display: "block", height: "100%", borderRadius: 3,
                            width: `${Math.round(Math.min(1, a.factor) * 100)}%`,
                            background: a.factor >= 1 ? C.lime : volt(.45) }} />
                        </span>
                        <span style={{ fontSize: 11, color: C.muted, width: 26, textAlign: "right", flexShrink: 0 }}>
                          {String(a.factor).replace(".", ",")}
                        </span>
                      </div>
                    ))}
                  </>
                )}

                {(m.setup || []).length > 0 && (
                  <>
                    <div style={{ ...label(), margin: "14px 0 7px" }}>Ställ in först</div>
                    {m.setup.map((s, i) => (
                      <div key={i} style={punkt}><span style={prick} />{s}</div>
                    ))}
                  </>
                )}

                {(m.adjustments || []).length > 0 && (
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
                    Justerbart: {m.adjustments.join(" · ")}
                  </div>
                )}

                {(m.commonErrors || []).length > 0 && (
                  <>
                    {/* Vanliga fel i varningsfärg, inte i lime. Det här är det
                        enda i vyn som är en avrådan, och det ska synas. */}
                    <div style={{ ...label(C.recovering), margin: "14px 0 7px" }}>Vanliga fel</div>
                    {m.commonErrors.map((s, i) => (
                      <div key={i} style={punkt}><span style={{ ...prick, background: C.recovering }} />{s}</div>
                    ))}
                  </>
                )}

                {(m.alternatives || []).length > 0 && (
                  <>
                    <div style={{ ...label(), margin: "14px 0 7px" }}>Om den är upptagen</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {m.alternatives.map(id => {
                        const alt = MACHINE_TYPES.find(x => x.id === id);
                        // VILKEN ÖVNING PÅ MASKINEN SOM FAKTISKT ERSÄTTER.
                        //
                        // Latsdraget listade "Assisterad dip / chin". Maskinen
                        // är rätt — samma stativ gör båda — men namnet säger
                        // dips, och dips tränar bröst och triceps, inte rygg.
                        // Utan preciseringen får man gissa, och gissar man fel
                        // tränar man fel muskel.
                        const ers = alt ? ersättandeÖvningar(m.id, id, EXERCISES) : null;
                        const övningsnamn = (ers || []).slice(0, 2)
                          .map(x => (EXERCISES.find(e => e.id === x) || {}).name)
                          .filter(Boolean);
                        return (
                          <button key={id} onClick={() => alt && setÖppen(id)} data-alt="1"
                            disabled={!alt}
                            style={{
                              fontSize: 11.5, color: alt ? C.text2 : C.muted, minHeight: 36,
                              textAlign: "left", lineHeight: 1.35,
                              border: `1px solid ${C.border}`, background: C.card2,
                              borderRadius: 14, padding: "7px 12px", cursor: alt ? "pointer" : "default",
                            }}>
                            {alt ? alt.name : id}
                            {övningsnamn.length > 0 && (
                              <span style={{ display: "block", fontSize: 10.5, color: C.muted, marginTop: 2 }}>
                                {övningsnamn.join(" eller ")}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {modeller.length > 0 && (
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 12, lineHeight: 1.5 }}>
                    Vanliga modeller: {modeller.slice(0, 4).map(x => `${x.manufacturer} ${x.model}`).join(", ")}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
