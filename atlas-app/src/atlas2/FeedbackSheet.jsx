import { useState } from "react";
import { C, HFONT, MONO, hdr, label, card, btnPrimary, btnText } from "./design.js";

/**
 * SKICKA FEEDBACK — utan att lämna appen.
 *
 * En mailto-länk hade varit enklare att bygga, men den öppnar Gmail eller
 * Outlook, och där tappar de flesta tråden: mailklienten är inte inloggad, man
 * hamnar i en annan app, och synpunkten blir aldrig skickad. Testare rapporterar
 * det de kan rapportera på tio sekunder.
 *
 * Texten går till coach-proxyns /api/feedback, som mailar vidare. Nyckeln ligger
 * i Vercels miljövariabler — aldrig i klienten, samma regel som för coachen.
 *
 * KONTEXTEN FÖLJER MED AUTOMATISKT: version, läge och enhet. Det är precis det
 * man annars måste fråga om i efterhand, och det testare oftast glömmer.
 */

const URL = "https://askr-coach.vercel.app/api/feedback";

export function FeedbackSheet({ profile, läge, onClose }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState(null);   // skickar | klart | fel
  const [fel, setFel] = useState("");

  const version = typeof __ATLAS_BUILD__ !== "undefined" ? __ATLAS_BUILD__ : "okänd";
  const enhet = typeof navigator !== "undefined" ? navigator.userAgent : "";

  const skicka = async () => {
    if (text.trim().length < 3 || status === "skickar") return;
    setStatus("skickar"); setFel("");
    try {
      const r = await fetch(URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text, version, läge,
          enhet: enhet.slice(0, 200),
          namn: (profile && profile.name) || null,
        }),
      });
      const d = await r.json().catch(() => ({}));
      // KVITTOT KOMMER FRÅN SERVERN, inte från att anropet gjordes. Ett
      // "Skickat!" för ett mail som aldrig lämnade servern är värre än ett
      // felmeddelande — då tror testaren att synpunkten är framme.
      if (!r.ok || !d.ok) { setFel(d.fel || "Kunde inte skicka."); setStatus("fel"); return; }
      setStatus("klart");
    } catch (e) {
      setFel("Ingen kontakt med servern. Har du nät?");
      setStatus("fel");
    }
  };

  if (status === "klart") {
    return (
      <div style={{ padding: "4px 0 24px", textAlign: "center" }}>
        <div style={{ fontSize: 34, marginBottom: 12 }} aria-hidden>✓</div>
        <div style={{ ...hdr(17), marginBottom: 8 }}>Tack — skickat</div>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 22 }}>
          Din synpunkt är framme. Version och enhet följde med, så du behöver
          inte beskriva var i appen du var.
        </div>
        <button onClick={onClose} style={btnPrimary}>Tillbaka</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "4px 0 24px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div style={hdr(19)}>Skicka feedback</div>
        {onClose && <button onClick={onClose} style={btnText}>Stäng</button>}
      </div>
      <div style={{ fontSize: 12.5, color: C.muted, marginTop: 5, lineHeight: 1.55 }}>
        Vad krånglade, vad saknas, vad var otydligt? Allt hjälper — även korta
        rader.
      </div>

      <textarea value={text} onChange={e => setText(e.target.value)}
        data-feedback-text="1" aria-label="Din feedback" rows={7}
        placeholder="Skriv här…"
        style={{
          width: "100%", marginTop: 14, padding: "12px 13px", borderRadius: 12,
          border: `1px solid ${C.border}`, background: C.card2, color: C.text,
          fontSize: 14, lineHeight: 1.55, fontFamily: "inherit", resize: "vertical",
        }} />

      {fel && (
        <div style={{ fontSize: 12.5, color: C.recovering, marginTop: 10, lineHeight: 1.5 }}>
          {fel}
        </div>
      )}

      <button onClick={skicka} data-feedback-skicka="1"
        disabled={text.trim().length < 3 || status === "skickar"}
        style={{
          ...btnPrimary, marginTop: 12,
          opacity: text.trim().length < 3 || status === "skickar" ? 0.45 : 1,
        }}>
        {status === "skickar" ? "Skickar…" : "Skicka"}
      </button>

      {/* VAD SOM FÖLJER MED, ÖPPET REDOVISAT. En app som skickar data om
          enheten utan att säga det är en app man slutar lita på. */}
      <div style={{ ...card, padding: 13, marginTop: 16 }}>
        <div style={{ ...label(), color: C.muted, marginBottom: 7 }}>Följer med</div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, lineHeight: 1.7 }}>
          version {version}<br />
          läge {läge === "demo" ? "demo" : "riktig profil"}<br />
          {enhet.slice(0, 60)}{enhet.length > 60 ? "…" : ""}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
          Ingen träningsdata, ingen matlogg och inga mätvärden skickas.
        </div>
      </div>
    </div>
  );
}
