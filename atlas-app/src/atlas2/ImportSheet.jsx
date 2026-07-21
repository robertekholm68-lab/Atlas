// Askr 2.0 — importvyn.
//
// Visar ALLTID vad som hittats innan något skrivs. Användaren ska kunna se
// exakt vad som kommer in, och avgöra de fall appen inte kan avgöra själv.

import { useState } from "react";
import { C, hdr, label, btnPrimary, btnGhost, card } from "./design.js";
import { scanna, förbered, genomför } from "./import.js";

const dat = ts => ts ? new Date(ts).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" }) : "—";

export function ImportSheet({ sessions, setSessions, setWeights, setFoodLog, onClose }) {
  const [steg, setSteg] = useState("scan");
  const [plan, setPlan] = useState(null);
  const [taMed, setTaMed] = useState([]);
  const [klart, setKlart] = useState(null);
  const källor = scanna();

  if (steg === "scan") {
    return (
      <div>
        <div style={hdr(19)}>Hämta din historik</div>
        {källor.length === 0 ? (
          <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.6, marginTop: 14 }}>
            Ingen data hittad från nuvarande Askr i den här webbläsaren. Historiken
            ligger kvar där den loggades — öppnar du 2.0 på samma enhet och i samma
            webbläsare som du använt appen, hittas den här.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "12px 0 18px" }}>
              Askr 2.0 har egen lagring och rör aldrig originalet. Din nuvarande app
              fungerar precis som förut efteråt.
            </div>
            {källor.map(k => (
              <div key={k.prefix} style={{ ...card, marginBottom: 10 }}>
                <div style={hdr(15)}>{k.namn}</div>
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 6, lineHeight: 1.6 }}>
                  {k.pass} loggade pass{k.pass ? ` · ${dat(k.första)} – ${dat(k.sista)}` : ""}
                  {k.vikter ? <><br />{k.vikter} viktmätningar</> : null}
                  {k.måltider ? <><br />{k.måltider} loggade måltider</> : null}
                </div>
              </div>
            ))}
            <button onClick={() => { setPlan(förbered(sessions)); setSteg("granska"); }} style={{ ...btnPrimary, marginTop: 12 }}>
              Granska vad som hämtas <span style={{ fontSize: 18 }}>→</span>
            </button>
          </>
        )}
        <button onClick={onClose} style={{ ...btnGhost, marginTop: 10 }}>Stäng</button>
      </div>
    );
  }

  if (steg === "granska") {
    return (
      <div>
        <div style={hdr(19)}>Det här hämtas</div>
        <div style={{ ...card, marginTop: 14 }}>
          {[["Nya pass", plan.nya.length], ["Viktmätningar", plan.vikter.length], ["Måltider", plan.måltider.length]].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14 }}>
              <span style={{ color: C.muted }}>{l}</span><span style={{ fontWeight: 700 }}>{v}</span>
            </div>
          ))}
          {plan.dubbletter > 0 && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
              {plan.dubbletter} pass hoppas över — de finns redan här med samma id.
            </div>
          )}
        </div>

        {plan.misstänkta.length > 0 && (
          <>
            <div style={{ ...label(C.recovering), margin: "20px 0 6px" }}>Kan vara samma pass två gånger</div>
            <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>
              De här liknar pass du redan har — samma namn, nära i tid, men olika id.
              Det händer om ett pass loggats på både telefon och dator. Tar du med
              ett som är en dubblett räknas belastningen dubbelt och återhämtningen
              blir fel. Kryssa bara i det du vet är ett eget pass.
            </div>
            {plan.misstänkta.map((m, i) => {
              const i_med = taMed.includes(m.ny);
              return (
                <button key={i} onClick={() => setTaMed(t => i_med ? t.filter(x => x !== m.ny) : [...t, m.ny])}
                  style={{ width: "100%", textAlign: "left", padding: 13, marginBottom: 8, borderRadius: 13, cursor: "pointer",
                    border: `1px solid ${i_med ? C.lime : C.border}`, background: i_med ? "rgba(212,255,63,.05)" : C.card2, color: C.text }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: 13.5 }}>{m.ny.title || "Pass"}</span>
                    <span style={{ fontSize: 12, color: i_med ? C.lime : C.muted }}>{i_med ? "Tas med" : "Hoppas över"}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>
                    {new Date(m.ny.completedAt).toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" })} · från {m.ny._källa}
                  </div>
                </button>
              );
            })}
          </>
        )}

        <button onClick={() => {
          const r = genomför(plan, taMed, { sessions });
          setSessions(r.sessions); setWeights(r.weights); setFoodLog(r.foodLog);
          setKlart(r.antal); setSteg("klar");
        }} style={{ ...btnPrimary, marginTop: 20 }}>
          Hämta {plan.nya.length + taMed.length} pass <span style={{ fontSize: 18 }}>→</span>
        </button>
        <button onClick={() => setSteg("scan")} style={{ ...btnGhost, marginTop: 10 }}>Tillbaka</button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: "10px 0" }}>
      <svg width="64" height="64" viewBox="0 0 64 64" style={{ margin: "0 auto 14px", display: "block" }} aria-hidden>
        <circle cx="32" cy="32" r="28" fill="none" stroke={C.lime} strokeWidth="2.5" />
        <path d="M19 33 l9 9 l17 -19" fill="none" stroke={C.lime} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={hdr(20)}>Historiken är hämtad</div>
      <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.65, marginTop: 12 }}>
        {klart.pass} pass, {klart.vikter} viktmätningar och {klart.måltider} måltider
        finns nu i Askr 2.0. Din nuvarande app är orörd och fungerar som förut.
      </div>
      <button onClick={onClose} style={{ ...btnPrimary, marginTop: 22 }}>Till kroppskartan <span style={{ fontSize: 18 }}>→</span></button>
    </div>
  );
}
