import { useState, useEffect, useRef } from "react";
import { C, MONO, hdr, label, btnPrimary, btnGhost, btnText, card } from "./design.js";
import { matchaMaskinkod } from "../engines/machines.js";
import { MASKIN_SYSTEM, tolkaMaskinsvar } from "../engines/fotoMaskin.js";

/**
 * SKANNA MASKIN — två vägar in, samma mål.
 *
 * QR-koden som redan sitter på maskinen är den exakta vägen: den pekar på en
 * specifik modell, inte bara en typ. Många moderna gymmaskiner (Technogym,
 * Eleiko) har redan en sådan etikett för instruktionsvideor eller
 * produktinformation — Askr behöver bara läsa den.
 *
 * FOTOT ÄR RESERVEN. Koden kan vara sliten, borttagen, eller maskinen har
 * ingen alls. Samma regel som fotologgningen av mat: modellen identifierar,
 * den räknar aldrig något. Här finns inga tal att räkna fel på — risken är att
 * peka ut fel maskintyp med skenbar säkerhet, så svaret valideras alltid mot
 * de 43 kända typerna.
 *
 * KAMERAN STÄNGS AV NÄR VYN LÄMNAS, som i streckkodsläsaren. En kamera som
 * lever vidare i bakgrunden är både ett batteriläckage och en förtroendefråga.
 */

const PROXY = "https://askr-coach.vercel.app/api/coach";
const MAX_KANT = 1024;
const qrStöds = () => typeof window !== "undefined" && "BarcodeDetector" in window;

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

export function SkannaMaskin({ onTräff, onClose }) {
  const [läge, setLäge] = useState("val");   // val | qr-kamera | foto-analys | ingen-träff
  const [kameraStatus, setKameraStatus] = useState("på");   // på | nekad | stöds-ej
  const [felText, setFelText] = useState("");
  const [förhandsvisning, setFörhandsvisning] = useState(null);
  const video = useRef(null);
  const filväljare = useRef(null);

  useEffect(() => {
    if (läge !== "qr-kamera") return;
    let ström, raf, det, stopp = false;
    (async () => {
      try {
        if (!qrStöds()) { setKameraStatus("stöds-ej"); return; }
        det = new window.BarcodeDetector({ formats: ["qr_code", "ean_13", "ean_8"] });
        ström = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (video.current) { video.current.srcObject = ström; await video.current.play(); }
        const tick = async () => {
          if (stopp) return;
          try {
            const koder = await det.detect(video.current);
            if (koder && koder.length) {
              const m = matchaMaskinkod(koder[0].rawValue);
              if (m) { onTräff(m); return; }
              setLäge("ingen-träff");
              setFelText("Koden kändes inte igen. Prova att fota maskinen i stället.");
              return;
            }
          } catch (e) { /* enskild bildruta kan misslyckas — fortsätt */ }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch (e) { setKameraStatus("nekad"); }
    })();
    return () => {
      stopp = true;
      if (raf) cancelAnimationFrame(raf);
      if (ström) ström.getTracks().forEach(t => t.stop());
    };
  }, [läge]);

  const analyseraFoto = async fil => {
    if (!fil) return;
    setLäge("foto-analys");
    setFörhandsvisning(URL.createObjectURL(fil));
    try {
      const bild = await tillBase64(fil);
      const r = await fetch(PROXY, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          system: MASKIN_SYSTEM,
          meddelande: "Vilken maskintyp visar bilden? Svara med JSON enligt formatet.",
          bild, bildTyp: "image/jpeg",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.fel || "kunde inte analysera");
      const t = tolkaMaskinsvar(d.text);
      if (!t.ok) {
        setLäge("ingen-träff");
        setFelText(t.skäl === "vet-inte" && t.notering
          ? t.notering
          : "Kunde inte känna igen maskinen på bilden. Prova ett foto rakt framifrån med bättre ljus, eller sök manuellt nedan.");
        return;
      }
      onTräff(t.typeId);
    } catch (e) {
      setLäge("ingen-träff");
      setFelText("Något gick fel: " + String((e && e.message) || e));
    }
  };

  const rad = { border: `1px solid ${C.border}`, background: C.card2, borderRadius: 14 };

  return (
    <div style={{ padding: "4px 0 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={hdr(19)}>Skanna maskin</div>
        {onClose && <button onClick={onClose} style={btnText} aria-label="Stäng">Stäng</button>}
      </div>

      {läge === "val" && (
        <>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 5, lineHeight: 1.6 }}>
            Många maskiner har redan en QR-kod från tillverkaren. Finns ingen,
            eller är den sliten, går det lika bra med ett foto.
          </div>
          <button onClick={() => setLäge("qr-kamera")} data-skanna-qr="1"
            style={{ ...btnPrimary, marginTop: 16 }}>
            Skanna QR-kod
          </button>
          <input ref={filväljare} type="file" accept="image/*" capture="environment"
            onChange={e => analyseraFoto(e.target.files && e.target.files[0])}
            style={{ display: "none" }} aria-hidden />
          <button onClick={() => filväljare.current && filväljare.current.click()}
            data-fota-maskin="1" style={{ ...btnGhost, marginTop: 10 }}>
            Fota maskinen i stället
          </button>
        </>
      )}

      {läge === "qr-kamera" && (
        <>
          {kameraStatus === "på" && (
            <div style={{ position: "relative", marginTop: 16, borderRadius: 16, overflow: "hidden",
              aspectRatio: "3/4", background: "#000" }}>
              <video ref={video} playsInline muted
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, border: `2px solid ${C.lime}`,
                borderRadius: 16, margin: 28, pointerEvents: "none" }} />
            </div>
          )}
          {kameraStatus === "nekad" && (
            <div style={{ ...card, padding: 14, marginTop: 16, fontSize: 12.5, color: C.text2, lineHeight: 1.6 }}>
              Kameran nekades. Kontrollera behörigheten i telefonens inställningar,
              eller fota maskinen med telefonens egen kameraapp och välj bilden här.
            </div>
          )}
          {kameraStatus === "stöds-ej" && (
            <div style={{ ...card, padding: 14, marginTop: 16, fontSize: 12.5, color: C.text2, lineHeight: 1.6 }}>
              QR-läsning stöds inte i den här webbläsaren (vanligt i Safari på
              iPhone). Fota maskinen i stället, eller sök manuellt.
            </div>
          )}
          <button onClick={() => { setLäge("val"); setKameraStatus("på"); }}
            style={{ ...btnGhost, marginTop: 12 }}>Avbryt</button>
        </>
      )}

      {läge === "foto-analys" && (
        <>
          {förhandsvisning && (
            <img src={förhandsvisning} alt="" style={{ width: "100%", borderRadius: 14, marginTop: 14, display: "block" }} />
          )}
          <div style={{ ...label(C.lime), marginTop: 16, textAlign: "center" }}>Tittar på bilden…</div>
        </>
      )}

      {läge === "ingen-träff" && (
        <>
          {förhandsvisning && (
            <img src={förhandsvisning} alt="" style={{ width: "100%", borderRadius: 14, marginTop: 14, display: "block", opacity: .5 }} />
          )}
          <div style={{ ...card, padding: 14, marginTop: 14, fontSize: 12.5, color: C.text2, lineHeight: 1.6 }}>
            {felText}
          </div>
          <button onClick={() => { setLäge("val"); setFörhandsvisning(null); setFelText(""); }}
            style={{ ...btnGhost, marginTop: 12 }}>Försök igen</button>
        </>
      )}
    </div>
  );
}
