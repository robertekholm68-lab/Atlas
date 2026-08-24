// Askr 2.0 — importvyn.
//
// Visar ALLTID vad som hittats innan något skrivs. Användaren ska kunna se
// exakt vad som kommer in, och avgöra de fall appen inte kan avgöra själv.

import { useState, useRef } from "react";
import { C, MONO, hdr, label, btnPrimary, btnGhost, card, volt } from "./design.js";
import { scanna, förbered, genomför } from "./import.js";
import { buildV3Backup, v3BackupFilename, inspectV3Backup, restoreV3Backup } from "./backup2.js";
import { formatBuildTime } from "../engines/index.js";
import { ProfilLucka } from "./ProfileSheet.jsx";

const dat = ts => ts ? new Date(ts).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" }) : "—";

/**
 * Byggstämpeln som läsbar tid. Stämpeln är UTC — konverteringen ligger i
 * motorns formatBuildTime, delad med mobilen. En egen slice av siffrorna hade
 * visat 06:53 när klockan är 08:53, och då ser en FÄRSK version gammal ut.
 */
const byggeLäsbart = () =>
  formatBuildTime(typeof __ATLAS_BUILD__ !== "undefined" ? __ATLAS_BUILD__ : "");

export function ImportSheet({ sessions, setSessions, setWeights, setFoodLog, profile, onOpenProfil, onClose }) {
  const [steg, setSteg] = useState("scan");
  const [plan, setPlan] = useState(null);
  const [taMed, setTaMed] = useState([]);
  const [klart, setKlart] = useState(null);
  const [fil, setFil] = useState(null);          // granskad backup-fil
  const [filFel, setFilFel] = useState(null);
  const filVäljare = useRef(null);
  const källor = scanna();

  // Export: bygger filen ur lagringen och laddar ner den. Läser bara.
  const sparaBackup = () => {
    const b = buildV3Backup();
    const blob = new Blob([JSON.stringify(b)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = v3BackupFilename();
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  // Import: granska ALLTID innan något skrivs — visa vad filen innehåller.
  const läsFil = e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    const läsare = new FileReader();
    läsare.onload = () => {
      const insp = inspectV3Backup(String(läsare.result || ""));
      if (!insp.ok) { setFilFel(insp.error); return; }
      setFilFel(null); setFil(insp); setSteg("backup-granska");
    };
    läsare.onerror = () => setFilFel("Filen gick inte att läsa.");
    läsare.readAsText(f);
  };

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
        {/* ── OM DIG: profilen styr vad allt annat kan räkna ut ──
            Luckkortet står bara när något faktiskt saknas; en permanent
            uppmaning hade blivit tapet man slutar se. */}
        <div style={{ ...label(), margin: "22px 0 8px" }}>Om dig</div>
        {onOpenProfil && (
          <>
            <ProfilLucka profile={profile} onOpen={onOpenProfil} />
            <button onClick={onOpenProfil} style={{ ...btnGhost, marginTop: 8 }}>
              Kön, ålder, längd, kost och skador
            </button>
          </>
        )}

        {/* ── DATASÄKERHET: v3-datans egen väg ut och in ── */}
        <div style={{ ...label(), margin: "22px 0 8px" }}>Datasäkerhet</div>
        <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>
          Allt du loggar i Askr 2.0 bor i den här webbläsaren. Rensas webbläsar-
          datan försvinner det — spara en backup-fil då och då, särskilt före
          telefonbyte.
        </div>
        <button onClick={sparaBackup} style={btnGhost}>Spara backup-fil</button>
        <button onClick={() => filVäljare.current && filVäljare.current.click()} style={{ ...btnGhost, marginTop: 8 }}>
          Läs in backup-fil
        </button>
        <input ref={filVäljare} type="file" accept="application/json,.json" onChange={läsFil} style={{ display: "none" }} aria-hidden />
        {filFel && (
          <div style={{ fontSize: 12, color: C.recovering, lineHeight: 1.55, marginTop: 8 }}>{filFel}</div>
        )}

        {/* VERSIONEN, EFTER backup-knapparna. Spara och Läs in hör ihop och ska
            inte skiljas åt av ett annat ämne. Här hör den däremot hemma: man är
            i datasäkerhet när man undrar vad appen egentligen har i sig.

            Utan den går det inte att avgöra om appen hämtat ny kod eller kör på
            cache — frågan uppstod när rösten ändrades flera gånger om dagen.
            Ett stämpelnummer som ingen kan se är ingen versionsmärkning. */}
        <div style={{ ...label(), margin: "26px 0 8px" }}>Version</div>
        <div style={{ fontFamily: MONO, fontSize: 12, color: C.text2 }}>{byggeLäsbart()}</div>
        <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.6, marginTop: 6 }}>
          Appen hämtar senaste versionen varje gång du öppnar den med nät.
          Stämmer inte tiden: stäng appen helt och öppna igen.
        </div>

        <button onClick={onClose} style={{ ...btnGhost, marginTop: 18 }}>Stäng</button>
      </div>
    );
  }

  if (steg === "backup-granska") {
    const s = fil.summary || {};
    return (
      <div>
        <div style={hdr(19)}>Läs in backup</div>
        <div style={{ ...card, marginTop: 14 }}>
          {[["Pass", s.sessions], ["Måltider", s.foodLog], ["Viktmätningar", s.weights]].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 14 }}>
              <span style={{ color: C.muted }}>{l}</span><span style={{ fontWeight: 700 }}>{v ?? "—"}</span>
            </div>
          ))}
          <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
            {fil.keys} lagringsnycklar{fil.createdAt ? ` · sparad ${new Date(fil.createdAt).toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" })}` : ""}
            {fil.ignorerade > 0 ? ` · ${fil.ignorerade} nycklar utanför 2.0 ignoreras` : ""}
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: C.recovering, lineHeight: 1.6, margin: "14px 0 4px" }}>
          Det här ERSÄTTER all Askr 2.0-data i den här webbläsaren med filens
          innehåll. Nuvarande appens och mobilens data rörs aldrig.
        </div>
        <button onClick={() => {
          const r = restoreV3Backup(fil.obj);
          if (r.ok) window.location.reload();   // hydrera om hela appen ur den nya lagringen
        }} style={{ ...btnPrimary, marginTop: 14 }}>
          Ersätt och läs in <span style={{ fontSize: 18 }}>→</span>
        </button>
        <button onClick={() => { setFil(null); setSteg("scan"); }} style={{ ...btnGhost, marginTop: 10 }}>Avbryt</button>
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
                    border: `1px solid ${i_med ? C.lime : C.border}`, background: i_med ? volt(.05) : C.card2, color: C.text }}>
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
