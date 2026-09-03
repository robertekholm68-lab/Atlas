import { useState, useMemo, useEffect } from "react";
import { C, hdr, label, btnText, btnPrimary, card, volt } from "./design.js";
import { EXERCISES } from "../data/exercises.js";
import { MUSCLES } from "../data/muscles.js";

/** Övningsbankens grupper på svenska. Samma nio som muskelgruppsvyn. */
const BANK_GRUPP_SV = {
  Chest: "Bröst", Back: "Rygg", Shoulders: "Axlar", Biceps: "Biceps",
  Triceps: "Triceps", Core: "Mage", Legs: "Ben", Glutes: "Säte", Calves: "Vader",
};
import { sökordFör } from "./sokord.js";
import { bildFör } from "../data/exerciseImages.js";
import { MuskelIkon } from "./muscleIcon.jsx";

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

/**
 * ÖVNINGSBANKEN, MED ELLER UTAN VAL.
 *
 * Utan onStarta är den ren uppslagning: vad tränar den här övningen, vilken
 * utrustning behövs. Med onStarta går det också att plocka övningar och köra
 * dem som ett pass.
 *
 * VARFÖR FRITT PASS BEHÖVS. Ett program är rätt när man följer en plan, men
 * ibland går man till gymmet och tar det som är ledigt — eller kör bara en enda
 * övning. Utan den vägen tvingades man skapa ett program för att logga ett pass,
 * och då loggade man inte alls.
 */
export function ExerciseBank({ onClose, onStarta, iPågåendePass = false, startGrupp = null }) {
  // Valda övningar i den ordning de plockades. Ordningen ÄR passets ordning —
  // den som väljer bänkpress först vill förmodligen börja där.
  const [valda, setValda] = useState([]);
  const [sök, setSök] = useState("");
  // startGrupp: kommer man från muskelgruppsvyn är gruppen redan vald.
  //
  // useState läser bara INITIALVÄRDET. Är banken redan monterad ignorerades
  // propen, så ett nytt gruppval från muskelgruppsvyn slog inte igenom.
  const [grupp, setGrupp] = useState(startGrupp);
  useEffect(() => { setGrupp(startGrupp); }, [startGrupp]);
  const [öppen, setÖppen] = useState(null);

  // ÖVNINGENS EGEN GRUPP, INTE MUSKELNS.
  //
  // Knapparna byggdes ur MUSCLES[...].group medan muskelgruppsvyn skickar
  // bankens id ("Back"). Två taxonomier i samma vy: MUSCLES har gemener och
  // slår ihop biceps/triceps till "arms", banken har nio grupper med versal.
  // Ett gruppval från muskelgruppsvyn matchade därför ingenting, och hela
  // listan visades.
  //
  // Nu är det en taxonomi: e.group, samma som muskelgruppsvyn.
  const grupper = useMemo(() => {
    const räkning = {};
    EXERCISES.forEach(e => { if (e.group) räkning[e.group] = (räkning[e.group] || 0) + 1; });
    return Object.keys(räkning).map(g => ({ id: g, namn: BANK_GRUPP_SV[g] || g, antal: räkning[g] }));
  }, []);

  const träffar = useMemo(() => {
    const q = sök.trim().toLowerCase();
    return EXERCISES.filter(e => {
      // ÖVNINGENS EGEN GRUPP, inte muskelns.
      //
      // Filtret matchade MUSCLES[...].group, som är en ANNAN taxonomi:
      // gemener och biceps/triceps ihopslagna till "arms". Muskelgruppsvyn
      // skickar bankens id ("Back"), och det gav NOLL träffar — därför visades
      // hela listan oavsett vad man valt. Mätt: "Back" via MUSCLES gav 0
      // övningar, via e.group 27.
      if (grupp && e.group !== grupp) return false;
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

      {/* STARTKNAPPEN STÅR FÖRE LISTAN.
          Efter 160 övningar hade den krävt att man scrollar tillbaka hela
          vägen upp — samma lärdom som loggknappen i matvyn. Den som valt klart
          ska kunna starta direkt. */}
      {onStarta && valda.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <button onClick={() => onStarta(valda)} data-starta-fritt="1" style={btnPrimary}>
            {iPågåendePass ? "Lägg till" : "Starta pass"} — {valda.length} {valda.length === 1 ? "övning" : "övningar"}
          </button>
          <button onClick={() => setValda([])} style={{ ...btnText, marginTop: 6, minHeight: 40 }}>
            Rensa valet
          </button>
        </div>
      )}

      {träffar.map(e => {
        const är = öppen === e.id;
        const akt = [...(e.activation || [])].sort((a, b) => b.factor - a.factor);
        return (
          <div key={e.id} style={{ ...rad, marginBottom: 8, overflow: "hidden" }}>
            {/* PLUSKNAPPEN ÄR SKILD FRÅN RADEN. Ett tryck på raden fäller ut
                fakta, ett tryck på plus lägger till i passet — två olika
                avsikter som inte får dela knapp. */}
            <div style={{ display: "flex", alignItems: "stretch" }}>
            <button onClick={() => setÖppen(är ? null : e.id)} data-övning="1"
              aria-expanded={är}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                flex: 1, minWidth: 0, textAlign: "left", padding: "13px 15px", minHeight: 44,
                background: "none", border: "none", color: C.text, cursor: "pointer",
              }}>
              {/* MINIATYR FÖRE NAMNET: kroppssiluett med primärmuskeln i volt.
                  Ersatte piktogram per rörelsemönster, som inte gick att skilja
                  åt vid 20 px och dessutom svarade på fel fråga — mönstret står
                  redan i klartext på raden, det som skiljer övningar åt är
                  vilken muskel de belastar.

                  Ersätts tyst av ett riktigt foto den dagen ett sådant finns:
                  bildFör(id) prövas först. */}
              <span aria-hidden style={{
                width: 34, height: 34, flexShrink: 0, borderRadius: 8,
                border: `1px solid ${C.hairline}`, background: C.card2,
                display: "flex", alignItems: "center", justifyContent: "center", color: C.text2,
              }}>
                {bildFör(e.id)
                  ? <img src={bildFör(e.id)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 7 }} />
                  : <MuskelIkon exercise={e} size={30} />}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ ...hdr(13.5), display: "block" }}>{e.name}</span>
                <span style={{ display: "block", fontSize: 11.5, color: C.muted, marginTop: 3 }}>
                  {[UTRUSTNING_SV[e.equipment] || e.equipment, SV[e.loadMode]].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span style={{ color: C.muted, fontSize: 15, flexShrink: 0,
                transform: är ? "rotate(180deg)" : "none", transition: "transform 150ms ease-out" }}>⌄</span>
            </button>
            {onStarta && (
              <button onClick={() => setValda(v => v.includes(e.id) ? v.filter(x => x !== e.id) : [...v, e.id])}
                data-valj="1" aria-pressed={valda.includes(e.id)}
                aria-label={valda.includes(e.id) ? `Ta bort ${e.name}` : `Lägg till ${e.name}`}
                style={{
                  width: 48, flexShrink: 0, cursor: "pointer", fontSize: 17,
                  border: "none", borderLeft: `1px solid ${C.border}`,
                  background: valda.includes(e.id) ? volt(.1) : "transparent",
                  color: valda.includes(e.id) ? C.lime : C.muted,
                }}>{valda.includes(e.id) ? "✓" : "+"}</button>
            )}
            </div>

            {är && (
              <div style={{ padding: "0 15px 14px" }}>
                {/* BILDEN FÖRST — den svarar på "hur ser rörelsen ut?" snabbare
                    än någon text. Diptyk: start till vänster, slut till höger.

                    Saknas bilden visas ingenting alls. En platshållare med ett
                    kamera-ikon ser ut som en trasig bild, och 157 av 160
                    övningar saknar bild i skrivande stund. */}
                {bildFör(e.id) && (
                  <img src={bildFör(e.id)} alt={`${e.name} — startposition till vänster, slutposition till höger`}
                    loading="lazy"
                    style={{ width: "100%", borderRadius: 10, display: "block", marginBottom: 13 }} />
                )}
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
