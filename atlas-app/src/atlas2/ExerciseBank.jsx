import { useState, useMemo } from "react";
import { C, hdr, label, btnText, card, volt } from "./design.js";
import { EXERCISES } from "../data/exercises.js";
import { MUSCLES, GROUP_SV } from "../data/muscles.js";
import { sökordFör } from "./sokord.js";

/**
 * ÖVNINGSBANKEN.
 *
 * 160 övningar har funnits i datan hela tiden, men utan någon väg in: EXERCISES
 * användes bara för att slå upp NAMN i andra vyer. Man kunde inte bläddra, söka,
 * eller se vilka muskler en övning faktiskt tränar.
 *
 * Det är samma mönster som passlistan och programvalet — funktionen fanns,
 * vägen dit saknades.
 *
 * VAD SOM VISAS. Aktiveringsvektorn är det banken har som ingen annan
 * träningsapp visar: varje övning bär [{muscleId, factor}] där factor 1 är
 * primär och 0,5 sekundär. Det är samma tal som driver muskelkartan och
 * recovery — inte en separat "det här tränar bröst"-text som kan glida isär
 * från motorn.
 *
 * VAD SOM INTE VISAS. Ingen övning har instruktionstext i datan, och den ska
 * inte hittas på här. En påhittad teknikbeskrivning i en träningsapp är värre
 * än ingen alls.
 */

const SV = { external: "Vikt", bodyweight: "Kroppsvikt", time: "Tid" };

/**
 * Svenska sökord för engelska övningsnamn.
 *
 * Övningsbanken är engelsk ("Barbell Bench Press") medan resten av appen är
 * svensk. Utan den här bryggan ger "bänk" noll träffar, vilket är det första
 * en svensk användare skriver. Orden matchas mot övningens NAMN, inte mot en
 * lista per övning — det skalar till 160 utan att någon måste underhålla en
 * översättning per rad.
 */


const UTRUSTNING_SV = {
  Barbell: "Skivstång", Dumbbell: "Hantlar", Machine: "Maskin", Cable: "Kabel",
  Bodyweight: "Kroppsvikt", "T-bar": "T-stång", "Trap bar": "Trap bar",
  "EZ Bar": "EZ-stång", Kettlebell: "Kettlebell", Landmine: "Landmine",
  "Ab Wheel": "Träningshjul", Sled: "Släde",
};

/** Muskelns svenska grupp, eller dess engelska namn om gruppen saknas. */
function muskelNamn(id) {
  const m = MUSCLES[id];
  if (!m) return id;
  return m.name;
}

export function ExerciseBank({ onClose }) {
  const [sök, setSök] = useState("");
  const [grupp, setGrupp] = useState(null);
  const [öppen, setÖppen] = useState(null);

  // Grupperna i den ordning de står i taxonomin, med antal.
  const grupper = useMemo(() => {
    const räkning = {};
    EXERCISES.forEach(e => {
      const g = (MUSCLES[(e.activation || [])[0]?.muscleId] || {}).group;
      if (g) räkning[g] = (räkning[g] || 0) + 1;
    });
    return Object.keys(GROUP_SV).filter(g => räkning[g]).map(g => ({ id: g, namn: GROUP_SV[g], antal: räkning[g] }));
  }, []);

  const träffar = useMemo(() => {
    const q = sök.trim().toLowerCase();
    return EXERCISES.filter(e => {
      if (grupp) {
        const g = (MUSCLES[(e.activation || [])[0]?.muscleId] || {}).group;
        if (g !== grupp) return false;
      }
      if (!q) return true;
      // Sök på namn, utrustning och muskel — man letar lika ofta efter
      // "hantlar" eller "biceps" som efter ett övningsnamn.
      const musklerna = (e.activation || []).map(a => muskelNamn(a.muscleId)).join(" ");
      return `${e.name} ${e.equipment || ""} ${UTRUSTNING_SV[e.equipment] || ""} ${musklerna} ${sökordFör(e.name)}`
        .toLowerCase().includes(q);
    });
  }, [sök, grupp]);

  const rad = { border: `1px solid ${C.border}`, background: C.card2, borderRadius: 14 };

  return (
    <div style={{ padding: "4px 0 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={hdr(19)}>Övningar</div>
        {onClose && <button onClick={onClose} style={btnText} aria-label="Stäng">Stäng</button>}
      </div>
      <div style={{ fontSize: 12.5, color: C.muted, marginTop: 5 }}>
        {EXERCISES.length} övningar. Siffrorna visar hur mycket varje muskel belastas —
        samma tal som driver kroppskartan.
      </div>

      <input value={sök} onChange={e => setSök(e.target.value)}
        placeholder="Sök övning, muskel eller redskap…"
        aria-label="Sök bland övningar"
        style={{
          width: "100%", marginTop: 14, padding: "12px 14px", borderRadius: 12, minHeight: 44,
          border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 14,
        }} />

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "12px 0 4px" }}>
        <button onClick={() => setGrupp(null)} data-grupp="alla" style={{
          ...rad, padding: "7px 13px", minHeight: 36, cursor: "pointer", fontSize: 12.5,
          borderColor: grupp ? C.border : C.lime, color: grupp ? C.muted : C.lime,
          background: grupp ? C.card2 : volt(.08),
        }}>Alla</button>
        {grupper.map(g => (
          <button key={g.id} onClick={() => setGrupp(grupp === g.id ? null : g.id)} data-grupp={g.id}
            style={{
              ...rad, padding: "7px 13px", minHeight: 36, cursor: "pointer", fontSize: 12.5,
              borderColor: grupp === g.id ? C.lime : C.border,
              color: grupp === g.id ? C.lime : C.muted,
              background: grupp === g.id ? volt(.08) : C.card2,
            }}>{g.namn} <span style={{ opacity: .6 }}>{g.antal}</span></button>
        ))}
      </div>

      <div style={{ ...label(), margin: "16px 0 8px" }}>
        {träffar.length} {träffar.length === 1 ? "övning" : "övningar"}
      </div>

      {/* Tomt resultat ska säga vad man kan göra, inte bara att det är tomt. */}
      {träffar.length === 0 && (
        <div style={{ ...card, padding: 16, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
          Ingen övning matchar ”{sök}”. Prova ett redskap (hantlar, kabel) eller
          en muskel (biceps, säte).
        </div>
      )}

      {träffar.map(e => {
        const är = öppen === e.id;
        const akt = [...(e.activation || [])].sort((a, b) => b.factor - a.factor);
        return (
          <div key={e.id} style={{ ...rad, marginBottom: 8, overflow: "hidden" }}>
            <button onClick={() => setÖppen(är ? null : e.id)} data-övning="1"
              aria-expanded={är}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                width: "100%", textAlign: "left", padding: "13px 15px", minHeight: 44,
                background: "none", border: "none", color: C.text, cursor: "pointer",
              }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ ...hdr(13.5), display: "block" }}>{e.name}</span>
                <span style={{ display: "block", fontSize: 11.5, color: C.muted, marginTop: 3 }}>
                  {[UTRUSTNING_SV[e.equipment] || e.equipment, SV[e.loadMode]].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span style={{ color: C.muted, fontSize: 15, flexShrink: 0,
                transform: är ? "rotate(180deg)" : "none", transition: "transform 150ms ease-out" }}>⌄</span>
            </button>

            {är && (
              <div style={{ padding: "0 15px 14px" }}>
                <div style={{ ...label(), marginBottom: 8 }}>Belastar</div>
                {akt.map(a => (
                  <div key={a.muscleId} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                    <span style={{ fontSize: 12.5, color: C.text2, flex: 1, minWidth: 0 }}>
                      {muskelNamn(a.muscleId)}
                    </span>
                    {/* Stapeln är samma tal som motorn räknar med, inte en
                        illustration. 1,0 = primär, 0,5 = sekundär. */}
                    <span style={{ width: 74, height: 5, borderRadius: 3, background: C.border, flexShrink: 0 }}>
                      <span style={{
                        display: "block", height: "100%", borderRadius: 3,
                        width: `${Math.round(Math.min(1, a.factor) * 100)}%`,
                        background: a.factor >= 1 ? C.lime : volt(.45),
                      }} />
                    </span>
                    <span style={{ fontSize: 11, color: C.muted, width: 26, textAlign: "right", flexShrink: 0 }}>
                      {String(a.factor).replace(".", ",")}
                    </span>
                  </div>
                ))}
                {e.pattern && (
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 10 }}>
                    Rörelsemönster: {e.pattern}
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
