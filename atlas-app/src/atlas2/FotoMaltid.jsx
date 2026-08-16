import { useState, useRef, useMemo } from "react";
import { C, MONO, hdr, label, btnPrimary, btnGhost, btnText, card, volt } from "./design.js";
import { FOTO_SYSTEM, tolkaFotosvar, matchaLivsmedel, fotoNäring } from "../engines/fotoMaltid.js";
import { nyId } from "./store.js";

/**
 * FOTOLOGGNING.
 *
 * Modellen identifierar, motorn räknar, användaren bekräftar. Fotot är en
 * snabbstart som sparar skrivandet — inte ett facit.
 *
 * VARFÖR GRAMTALEN ÄR JUSTERBARA. En portion ris på ett foto kan vara 100 g
 * eller 250 g beroende på tallriksstorlek och vinkel, och skillnaden är 200
 * kcal. Modellen svarar med ett tal oavsett, eftersom det är vad den gör. Att
 * logga det talet rakt av vore att bygga readiness på en gissning som ser ut
 * som en mätning.
 *
 * BILDEN SKALAS NER FÖRE SÄNDNING. 1024 px räcker gott för att känna igen mat,
 * och en oskalad telefonbild är flera megabyte — dyr att skicka och långsam på
 * mobilt nät.
 */

const PROXY = "https://askr-coach.vercel.app/api/coach";
const MAX_KANT = 1024;

/** Läser filen, skalar ner och returnerar base64 utan data-URL-prefix. */
async function tillBase64(fil) {
  const url = URL.createObjectURL(fil);
  try {
    const img = await new Promise((ok, fel) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => fel(new Error("kunde inte läsa bilden"));
      i.src = url;
    });
    const skala = Math.min(1, MAX_KANT / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * skala);
    c.height = Math.round(img.height * skala);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.82).split(",")[1];
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function FotoMaltid({ onLägg, onClose }) {
  const [läge, setLäge] = useState("start");   // start | analyserar | resultat | fel
  const [förhandsvisning, setFörhandsvisning] = useState(null);
  const [poster, setPoster] = useState([]);
  const [notering, setNotering] = useState("");
  const [felText, setFelText] = useState("");
  const filväljare = useRef(null);

  const näring = useMemo(() => fotoNäring(poster), [poster]);

  const analysera = async fil => {
    if (!fil) return;
    setLäge("analyserar");
    setFörhandsvisning(URL.createObjectURL(fil));
    try {
      const bild = await tillBase64(fil);
      const r = await fetch(PROXY, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          system: FOTO_SYSTEM,
          meddelande: "Vilka livsmedel ser du och ungefär hur mycket? Svara med JSON enligt formatet.",
          bild, bildTyp: "image/jpeg",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.fel || "kunde inte analysera");

      const t = tolkaFotosvar(d.text);
      if (!t.ok) {
        setFelText("Svaret gick inte att tolka. Försök igen, eller logga för hand.");
        setLäge("fel"); return;
      }
      if (!t.livsmedel.length) {
        // Modellen såg ingen mat. Att visa en tom lista utan förklaring vore
        // att låta användaren undra om appen är trasig.
        setFelText(t.notering || "Ingen mat syns på bilden. Prova ett foto rakt uppifrån med bättre ljus.");
        setLäge("fel"); return;
      }
      setPoster(matchaLivsmedel(t.livsmedel));
      setNotering(t.notering || "");
      setLäge("resultat");
    } catch (e) {
      setFelText(String((e && e.message) || e));
      setLäge("fel");
    }
  };

  const logga = () => {
    const n = fotoNäring(poster);
    onLägg({
      id: nyId("f_"),
      name: poster.filter(p => p.matchad).map(p => p.namn).join(", ") || "Fotad måltid",
      kcal: n.kcal, protein: n.protein, carbs: n.carbs, fat: n.fat,
      ts: Date.now(),
      // Tilliten märks på posten. En fotad måltid är inte en vägd, och
      // dataConfidence ska kunna se skillnaden.
      quality: "photo",
      source: "foto",
    });
    onClose && onClose();
  };

  const rad = { border: `1px solid ${C.border}`, background: C.card2, borderRadius: 14 };

  return (
    <div style={{ padding: "4px 0 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={hdr(19)}>Fota måltiden</div>
        {onClose && <button onClick={onClose} style={btnText} aria-label="Stäng">Stäng</button>}
      </div>

      {läge === "start" && (
        <>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 5, lineHeight: 1.6 }}>
            Claude känner igen vad som ligger på tallriken. Mängderna är
            uppskattningar som du justerar innan de loggas — näringen räknas
            sedan ur Livsmedelsverkets data.
          </div>
          <input ref={filväljare} type="file" accept="image/*" capture="environment"
            onChange={e => analysera(e.target.files && e.target.files[0])}
            style={{ display: "none" }} aria-hidden />
          <button onClick={() => filväljare.current && filväljare.current.click()}
            data-fota="1" style={{ ...btnPrimary, marginTop: 18 }}>
            Ta foto
          </button>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 10, lineHeight: 1.5, textAlign: "center" }}>
            Rakt uppifrån och med bra ljus ger den bästa bedömningen.
          </div>
        </>
      )}

      {läge === "analyserar" && (
        <>
          {förhandsvisning && (
            <img src={förhandsvisning} alt="" style={{ width: "100%", borderRadius: 14, marginTop: 14, display: "block" }} />
          )}
          <div style={{ ...label(C.lime), marginTop: 16, textAlign: "center" }}>Tittar på bilden…</div>
        </>
      )}

      {läge === "fel" && (
        <>
          {förhandsvisning && (
            <img src={förhandsvisning} alt="" style={{ width: "100%", borderRadius: 14, marginTop: 14, display: "block", opacity: .5 }} />
          )}
          <div style={{ ...card, padding: 15, marginTop: 14, fontSize: 13, color: C.text2, lineHeight: 1.6 }}>
            {felText}
          </div>
          <button onClick={() => { setLäge("start"); setFörhandsvisning(null); }}
            style={{ ...btnGhost, marginTop: 12 }}>Försök igen</button>
        </>
      )}

      {läge === "resultat" && (
        <>
          {förhandsvisning && (
            <img src={förhandsvisning} alt="" style={{ width: "100%", borderRadius: 14, marginTop: 14, display: "block" }} />
          )}

          <div style={{ ...label(), margin: "16px 0 8px" }}>
            Justera mängderna
          </div>

          {poster.map((p, i) => (
            <div key={i} style={{ ...rad, padding: "12px 14px", marginBottom: 8 }} data-post="1">
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 13.5, display: "block" }}>
                    {p.matchad ? p.food.name : p.namn}
                  </span>
                  <span style={{ fontSize: 11, color: p.matchad ? C.muted : C.recovering, display: "block", marginTop: 3 }}>
                    {p.matchad
                      ? `Såg "${p.namn}" · säkerhet ${p.säkerhet}`
                      : `Hittade inget livsmedel som matchar "${p.namn}"`}
                  </span>
                </span>
                <button onClick={() => setPoster(xs => xs.filter((_, n) => n !== i))}
                  aria-label={`Ta bort ${p.namn}`}
                  style={{ background: "none", border: "none", color: C.muted, fontSize: 17,
                    cursor: "pointer", padding: "2px 4px", minHeight: 34, flexShrink: 0 }}>×</button>
              </div>

              {p.matchad && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9 }}>
                  <button onClick={() => setPoster(xs => xs.map((y, n) => n === i ? { ...y, gram: Math.max(5, y.gram - 5) } : y))}
                    aria-label={`Minska ${p.namn}`}
                    style={{ ...rad, width: 38, height: 38, cursor: "pointer", color: C.text, fontSize: 16, flexShrink: 0 }}>−</button>
                  <span style={{ fontFamily: MONO, fontSize: 14, minWidth: 52, textAlign: "center" }}>{p.gram} g</span>
                  <button onClick={() => setPoster(xs => xs.map((y, n) => n === i ? { ...y, gram: y.gram + 5 } : y))}
                    aria-label={`Öka ${p.namn}`}
                    style={{ ...rad, width: 38, height: 38, cursor: "pointer", color: C.text, fontSize: 16, flexShrink: 0 }}>+</button>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginLeft: "auto" }}>
                    {Math.round((p.food.kcal || 0) * p.gram / 100)} kcal
                  </span>
                </div>
              )}
            </div>
          ))}

          {notering && (
            <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.55, marginTop: 4 }}>
              {notering}
            </div>
          )}

          {/* SUMMAN ÄR MOTORNS. Modellen har sagt vad den ser och ungefär hur
              mycket; kalorierna kommer ur Livsmedelsverkets data via samma väg
              som all annan matloggning. */}
          <div style={{ ...card, padding: 14, marginTop: 14 }}>
            <div style={{ ...label(C.lime), marginBottom: 8 }}>Summa</div>
            <div style={{ fontFamily: MONO, fontSize: 13.5, color: C.text }}>
              {näring.kcal} kcal · P {näring.protein} g · K {näring.carbs} g · F {näring.fat} g
            </div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
              Uppskattat ur bilden. Väg maten om siffran ska vara exakt.
            </div>
            {näring.matchade < näring.totalt && (
              <div style={{ fontSize: 11.5, color: C.recovering, marginTop: 6, lineHeight: 1.5 }}>
                {näring.totalt - näring.matchade} av {näring.totalt} livsmedel saknar
                träff och räknas inte in.
              </div>
            )}
          </div>

          <button onClick={logga} disabled={!näring.matchade} data-logga="1"
            style={{ ...btnPrimary, marginTop: 14, opacity: näring.matchade ? 1 : 0.4,
              cursor: näring.matchade ? "pointer" : "default" }}>
            Logga {näring.kcal} kcal
          </button>
          <button onClick={() => { setLäge("start"); setFörhandsvisning(null); setPoster([]); }}
            style={{ ...btnGhost, marginTop: 8 }}>Ta ett nytt foto</button>
        </>
      )}
    </div>
  );
}
