// Askr 2.0 — streckkodsläsare.
//
// Motorn fanns redan: lookupBarcode slår upp produkten hos Open Food Facts.
// Det som saknades i 2.0 var kameran och vyn.
//
// TVÅ SAKER SOM INTE FÅR TAPPAS BORT:
//
// 1. KÄLLAN. Open Food Facts är folkbidragen och overifierad. En produkt kan
//    ha fel näringsvärden, gammal recepttext eller helt saknas. Posten märks
//    därför som `external` och vyn säger rakt ut varifrån siffrorna kommer.
//    Att blanda ihop det med Livsmedelsverkets data vore att låna trovärdighet
//    som inte finns.
//
// 2. VÄGEN UTAN KAMERA. BarcodeDetector finns i Chrome på Android men INTE i
//    Safari på iPhone. Utan manuell inmatning vore funktionen osynlig för
//    halva världen, så sifferfältet är alltid framme — inte gömt bakom ett
//    felmeddelande.
//
// Kameran stängs av när vyn lämnas. En kamera som lever vidare i bakgrunden är
// både ett batteriläckage och en förtroendefråga.

import { useState, useEffect, useRef, useMemo } from "react";
import { C, HFONT, MONO, hdr, label, card, btnPrimary, btnGhost, volt } from "./design.js";
import { lookupBarcode, tolkaPortion } from "../engines/index.js";
import { skafferiFrånStreckkod } from "../engines/skafferi.js";
import { nyId } from "./store.js";

const stöds = () => typeof window !== "undefined" && "BarcodeDetector" in window;

export function Streckkod({ onLägg, onStäng, onSpara }) {
  const [kamera, setKamera] = useState("av");     // av | på | nekad | stöds-ej
  const [kod, setKod] = useState("");
  const [laddar, setLaddar] = useState(false);
  const [träff, setTräff] = useState(null);
  const [hittades, setHittades] = useState(true);
  const [gram, setGram] = useState(100);
  const video = useRef(null);

  const slåUpp = async c => {
    const bc = (c || "").trim();
    if (!bc) return;
    setLaddar(true); setHittades(true); setTräff(null);
    try {
      const p = await lookupBarcode(bc);
      if (p && (p.kcal || p.protein || p.carbs || p.fat)) setTräff(p);
      else { setHittades(false); setKod(bc); }
    } catch (e) { setHittades(false); setKod(bc); }
    setLaddar(false);
  };

  useEffect(() => {
    if (kamera !== "på") return;
    let ström, raf, det, stopp = false;
    (async () => {
      try {
        if (!stöds()) { setKamera("stöds-ej"); return; }
        det = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
        ström = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (video.current) { video.current.srcObject = ström; await video.current.play(); }
        const tick = async () => {
          if (stopp) return;
          try {
            const koder = await det.detect(video.current);
            if (koder && koder.length) { setKamera("av"); slåUpp(koder[0].rawValue); return; }
          } catch (e) { /* enskild bildruta kan misslyckas — fortsätt */ }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch (e) { setKamera("nekad"); }
    })();
    // Städningen är inte valfri: utan den fortsätter kameran att vara på när
    // man byter flik.
    return () => {
      stopp = true;
      if (raf) cancelAnimationFrame(raf);
      if (ström) ström.getTracks().forEach(t => t.stop());
    };
  }, [kamera]);

  // Portionsstorlek ur varans egen uppgift, inte ur en gissning.
  const portionsGram = useMemo(() => (träff ? tolkaPortion(träff.serving) : null), [träff]);
  const paketGram = useMemo(() => (träff ? tolkaPortion(träff.quantity) : null), [träff]);

  const snabbval = aktiv => ({
    padding: "8px 13px", minHeight: 40, borderRadius: 999, cursor: "pointer", fontSize: 12.5,
    border: `1px solid ${aktiv ? C.lime : C.border}`,
    color: aktiv ? C.lime : C.muted,
    background: aktiv ? volt(.08) : C.card2,
  });

  const logga = () => {
    const k = gram / 100;
    onLägg({
      id: nyId("f_"),
      name: träff.brand ? `${träff.name} (${träff.brand})` : träff.name,
      grams: gram,
      kcal: Math.round(träff.kcal * k),
      protein: Math.round(träff.protein * k),
      carbs: Math.round(träff.carbs * k),
      fat: Math.round(träff.fat * k),
      quality: "external",
      source: "off",
      barcode: träff.code,
      ts: Date.now(),
    });
    // ERBJUD ATT SPARA — fråga, spara inte tyst.
    //
    // Första versionen sparade automatiskt, med motiveringen att man ändå vill
    // ha varan. Men då fylls skafferiet med allt man någonsin skannat, även det
    // man provade en gång och inte tänker köpa igen. Robert bad om frågan.
    //
    // Erbjudandet kommer EFTER loggningen: maten är redan registrerad, så
    // frågan är ett tillval och inte ett hinder.
    if (onSpara) onSpara(skafferiFrånStreckkod({ ...träff, portion: portionsGram }));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={hdr(17)}>Skanna streckkod</div>
        <button onClick={onStäng} style={{ ...btnGhost, width: "auto", padding: "0 14px" }}>Tillbaka</button>
      </div>

      {!träff && (
        <>
          <div style={{
            background: C.card2, borderRadius: 16, aspectRatio: "4/3", overflow: "hidden",
            position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px solid ${C.hairline}`,
          }}>
            <video ref={video} playsInline muted
              style={{ width: "100%", height: "100%", objectFit: "cover", display: kamera === "på" ? "block" : "none" }} />
            {kamera !== "på" && (
              <div style={{ textAlign: "center", padding: 22 }}>
                {kamera === "stöds-ej" ? (
                  <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>
                    Den här webbläsaren kan inte läsa streckkoder — det gäller
                    bland annat Safari på iPhone. Skriv in siffrorna nedan i stället.
                  </div>
                ) : kamera === "nekad" ? (
                  <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>
                    Ingen kameraåtkomst. Kräver https och att du tillåter kameran.
                    Skriv in siffrorna nedan i stället.
                  </div>
                ) : (
                  <button onClick={() => setKamera("på")} style={btnPrimary}>Starta kameran</button>
                )}
              </div>
            )}
            {kamera === "på" && (
              <div aria-hidden style={{
                position: "absolute", left: "12%", right: "12%", top: "50%", height: 2,
                background: C.critical,
              }} />
            )}
          </div>

          {/* Alltid framme, aldrig gömd bakom ett felmeddelande. */}
          <div style={{ ...label(), marginTop: 16, marginBottom: 7 }}>…eller skriv in koden</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={kod} inputMode="numeric" aria-label="Streckkod"
              onChange={e => setKod(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => { if (e.key === "Enter") slåUpp(kod); }}
              placeholder="7310865004703"
              style={{
                flex: 1, minWidth: 0, padding: "13px 14px", borderRadius: 12, minHeight: 44,
                border: `1px solid ${C.border}`, background: C.card2, color: C.text,
                fontFamily: MONO, fontSize: 15,
              }} />
            <button onClick={() => slåUpp(kod)} disabled={laddar || !kod}
              style={{ ...btnGhost, width: "auto", padding: "0 16px", whiteSpace: "nowrap", opacity: kod ? 1 : 0.4 }}>
              {laddar ? "Söker…" : "Slå upp"}
            </button>
          </div>

          {!hittades && (
            <div style={{ ...card, marginTop: 14, borderColor: C.recovering }}>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
                Produkten finns inte i Open Food Facts.
              </div>
              <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, marginTop: 8 }}>
                Databasen är folkbidragen och långt ifrån komplett. Logga
                måltiden med text eller sök i livsmedelsregistret i stället.
              </div>
            </div>
          )}
        </>
      )}

      {träff && (
        <>
          <div style={{ ...card }}>
            {/* Källan står FÖRST, inte som finstil längst ner. Siffrorna nedan
                är någon annans, inte Livsmedelsverkets. */}
            <div style={label(C.recovering)}>Open Food Facts · overifierad</div>
            <div style={{ fontSize: 16.5, fontWeight: 600, color: C.text, marginTop: 8 }}>{träff.name}</div>
            {träff.brand && <div style={{ fontSize: 12.5, color: C.text2, marginTop: 3 }}>{träff.brand}</div>}
            <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted, marginTop: 10 }}>
              Per 100 g: {träff.kcal} kcal · P {träff.protein} · K {träff.carbs} · F {träff.fat}
            </div>
            <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.6, marginTop: 10 }}>
              Uppgifterna kommer från produktdatabasen Open Food Facts och är
              inte kontrollerade av Askr. Livsmedelsregistret är mer tillförlitligt
              när varan finns där.
            </div>
          </div>

          <div style={{ ...label(), marginTop: 18, marginBottom: 7 }}>Mängd</div>

          {/* SNABBVAL: PORTION, FÖRPACKNING, 100 G.
              100 g är sällan det man äter — det är bara den enhet näringen
              anges i. Portionsstorleken finns i Open Food Facts serving_size
              men användes aldrig; utan den fick man knappa sig fram från 100
              till 30 i tiogramssteg för en yoghurt.

              Knapparna visas bara när varan faktiskt bär uppgiften. En
              påhittad portion ger fel kalorital i loggen, vilket är sämre än
              ingen knapp alls. */}
          {(portionsGram || paketGram) && (
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
              {portionsGram && (
                <button onClick={() => setGram(portionsGram)} data-snabb="portion"
                  style={snabbval(gram === portionsGram)}>
                  Portion <span style={{ opacity: .7 }}>{portionsGram} g</span>
                </button>
              )}
              {paketGram && paketGram !== portionsGram && (
                <button onClick={() => setGram(paketGram)} data-snabb="paket"
                  style={snabbval(gram === paketGram)}>
                  Hela förpackningen <span style={{ opacity: .7 }}>{paketGram} g</span>
                </button>
              )}
              <button onClick={() => setGram(100)} data-snabb="hundra"
                style={snabbval(gram === 100)}>100 g</button>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* 5-GRAMSSTEG. Tio gram är för trubbigt för en portion på 25 g —
                man kan bara träffa 20 eller 30. Fem gram gör varje rimlig
                portionsstorlek nåbar utan att fördubbla antalet tryck för de
                stora mängderna, där man ändå använder snabbvalen. */}
            <button onClick={() => setGram(g => Math.max(5, (Number(g) || 0) - 5))} aria-label="Minska mängd"
              style={{ ...btnGhost, width: 52, padding: 0 }}>−</button>
            {/* Talet är skrivbart. Från 100 till 250 g är trettio tryck på
                plusknappen; knapparna är rätt för finjustering, fältet för att
                byta storleksordning. */}
            <div style={{ flex: 1, display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4 }}>
              <input value={gram} inputMode="numeric" data-gram="1" aria-label="Mängd i gram"
                onChange={e => {
                  const r = e.target.value.replace(/\D/g, "").slice(0, 4);
                  // Tomt tillåts under skrivandet: raderar man 100 för att
                  // skriva 250 passerar fältet genom tomt, och att tvinga
                  // tillbaka en etta gör det omöjligt att skriva.
                  setGram(r === "" ? "" : Math.min(5000, Number(r)));
                }}
                style={{
                  ...hdr(24), width: 92, textAlign: "center", padding: "6px 4px",
                  borderRadius: 10, minHeight: 44,
                  border: `1px solid ${C.border}`, background: C.card2, color: C.text,
                }} />
              <span style={{ fontFamily: MONO, fontSize: 12, color: C.muted }}>g</span>
            </div>
            <button onClick={() => setGram(g => (Number(g) || 0) + 5)} aria-label="Öka mängd"
              style={{ ...btnGhost, width: 52, padding: 0 }}>+</button>
          </div>

          <button onClick={logga} style={{ ...btnPrimary, marginTop: 18 }}>
            Logga {Math.round(träff.kcal * gram / 100)} kcal
          </button>
          <button onClick={() => { setTräff(null); setKod(""); }} style={{ ...btnGhost, marginTop: 10 }}>
            Skanna en annan
          </button>
        </>
      )}
    </div>
  );
}
