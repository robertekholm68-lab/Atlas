import { useMemo } from "react";
import { C, HFONT, MONO, hdr, label, card, btnGhost, btnText, volt } from "./design.js";
import { EXERCISES, TEKNIK_CUES } from "../data/exercises.js";
import { MUSCLES } from "../data/muscles.js";
import { bildFör } from "../data/exerciseImages.js";
import { MuskelIkon } from "./muscleIcon.jsx";
import { styrkeKurva, bästa1RM } from "../engines/utveckling.js";

/**
 * ÖVNINGSSIDAN — en utveckling av kortet, inte ett byte.
 *
 * Robert: "jag gillar våra kort så gör en utveckling av dem. informationen på
 * korten är bra, det ska bara in bild och länk där."
 *
 * Kortet låg som utfällning i listan. Det fungerade, men en utfällning i en
 * lista med 160 rader trycker ner allt under sig, och man scrollar i två
 * riktningar samtidigt. Gymlify öppnar en egen sida per övning; det gör vi
 * också nu. Backup av kortet: tagg backup/kort-fore-ovningssida.
 *
 * SAMMA INNEHÅLL SOM KORTET, i samma ordning: bild med teknikpunkter, muskler
 * med staplar, rörelsemönster. Två tillägg:
 *
 *   MUSKLERNA I TRE NIVÅER. Faktorerna 1,0 / 0,5 / 0,3 fanns redan, men
 *   Gymlifys ord — huvudmuskel, medhjälpare, stabilisator — säger vad talen
 *   BETYDER. Talen står kvar bredvid; de är motorns, inte en illustration.
 *
 *   YOUTUBE-KNAPP längst ned. Gymlify gjorde inga egna videor utan
 *   förinställde sökningen, och det är rätt: 160 videor att producera och
 *   hosta mot noll. Sökningen byggs på det ENGELSKA namnet plus "proper form"
 *   — det ger instruktionsvideor, inte tävlingsklipp. Knappen säger YouTube
 *   och öppnar externt, så man vet att man lämnar appen.
 *
 * Progressionskurvan visas om övningen har historik. Det är där Askr slår
 * Gymlify: deras kurva är en egen flik, vår ligger på sidan.
 */

const NIVÅER = [
  { min: 0.9, namn: "Huvudmuskel" },
  { min: 0.45, namn: "Medhjälpare" },
  { min: 0, namn: "Stabilisator" },
];

const muskelNamn = id => (MUSCLES[id] && MUSCLES[id].name) || id;

export function ÖvningsSida({ exId, sessions = [], onClose, onStarta, iPågåendePass = false }) {
  const e = EXERCISES.find(x => x.id === exId);
  const bild = e ? bildFör(e.id) : null;
  const cues = e ? TEKNIK_CUES[e.id] : null;

  const nivåer = useMemo(() => {
    if (!e) return [];
    const akt = [...(e.activation || [])].sort((a, b) => b.factor - a.factor);
    return NIVÅER.map(n => ({
      ...n,
      muskler: akt.filter(a => a.factor >= n.min && !NIVÅER.some(m => m.min > n.min && a.factor >= m.min)),
    })).filter(n => n.muskler.length);
  }, [e]);

  const kurva = useMemo(() => (e ? styrkeKurva(sessions, e.id) : []), [sessions, e]);
  const rekord = e ? bästa1RM(sessions, e.id) : null;

  if (!e) return null;

  const youtube = `https://www.youtube.com/results?search_query=${encodeURIComponent(e.name + " proper form")}`;

  return (
    <div style={{ padding: "4px 0 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span aria-hidden style={{
          width: 44, height: 44, flexShrink: 0, borderRadius: 10, overflow: "hidden",
          border: `1px solid ${C.hairline}`, background: C.card2,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {bild
            ? <img src={bild} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <MuskelIkon exercise={e} size={44} />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...hdr(17), lineHeight: 1.15 }}>{e.name}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
            {e.equipment}{e.pattern ? ` · ${e.pattern}` : ""}
          </div>
        </div>
        {onClose && <button onClick={onClose} style={btnText} aria-label="Stäng">Stäng</button>}
      </div>

      {/* BILDEN MED TEKNIKPUNKTERNA ÖVER DET MÖRKA FÄLTET — som på kortet.
          Texten är riktig HTML, inte inbränd: sökbar, översättningsbar. */}
      {bild ? (
        <div style={{ position: "relative", marginBottom: 14, borderRadius: 12, overflow: "hidden" }}>
          <img src={bild} alt={`${e.name} — utförande`} style={{ width: "100%", display: "block" }} />
          {cues && (
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "0 14px 14px" }}>
              <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {cues.map((rad, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, marginBottom: 7, fontSize: 12, color: C.text2, lineHeight: 1.4 }}>
                    <span style={{
                      flexShrink: 0, width: 17, height: 17, borderRadius: 999,
                      background: C.lime, color: "#0A0A0A", fontSize: 10, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1,
                    }}>{i + 1}</span>
                    <span>{rad}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      ) : cues ? (
        <div style={{ ...card, padding: 14, marginBottom: 14 }}>
          <div style={{ ...label(), marginBottom: 8 }}>Utförande</div>
          <ol style={{ margin: 0, padding: "0 0 0 18px" }}>
            {cues.map((rad, i) => (
              <li key={i} style={{ fontSize: 12.5, color: C.text2, lineHeight: 1.55, marginBottom: 6 }}>{rad}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {/* MUSKLERNA I TRE NIVÅER. Staplarna är motorns tal; orden säger vad de
          betyder. */}
      <div style={{ ...card, padding: 14, marginBottom: 14 }}>
        <div style={{ ...label(), marginBottom: 10 }}>Belastar</div>
        {nivåer.map(n => (
          <div key={n.namn} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10.5, color: C.muted, letterSpacing: .6, textTransform: "uppercase", marginBottom: 5 }}>
              {n.namn}
            </div>
            {n.muskler.map(a => (
              <div key={a.muscleId} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: C.text, flex: 1, minWidth: 0 }}>{muskelNamn(a.muscleId)}</span>
                <span style={{ width: 74, height: 5, borderRadius: 3, background: C.border, flexShrink: 0 }}>
                  <span style={{
                    display: "block", height: "100%", borderRadius: 3,
                    width: `${Math.round(Math.min(1, a.factor) * 100)}%`,
                    background: a.factor >= 1 ? C.lime : volt(.45),
                  }} />
                </span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted, width: 26, textAlign: "right", flexShrink: 0 }}>
                  {String(a.factor).replace(".", ",")}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* PROGRESSIONEN, om övningen har historik. Det Gymlify lägger under en
          egen flik ligger här på sidan. */}
      {kurva.length >= 2 && rekord && (
        <div style={{ ...card, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={label()}>Din utveckling</span>
            <span style={hdr(17)}>{rekord.oneRM}<span style={{ fontSize: 12, color: C.muted }}> kg</span></span>
          </div>
          <Kurva punkter={kurva} fält="oneRM" färg={C.lime} />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.45 }}>
            Uppskattat 1RM över {kurva.length} pass. Bästa set: {rekord.weight} kg × {rekord.reps} reps.
          </div>
        </div>
      )}

      {/* YOUTUBE. Extern länk, tydligt märkt. */}
      <a href={youtube} target="_blank" rel="noopener noreferrer" data-youtube="1"
        style={{
          ...btnGhost, display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
          textDecoration: "none", marginBottom: onStarta ? 10 : 0,
        }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#FF0000" aria-hidden>
          <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />
        </svg>
        Se övningen på YouTube
      </a>

      {onStarta && (
        <button onClick={() => onStarta(e.id)} data-starta-ovning="1"
          style={{ ...btnGhost, borderColor: C.lime, color: C.lime }}>
          {iPågåendePass ? "Lägg till i passet" : "Starta pass med den här"}
        </button>
      )}
    </div>
  );
}

/** Samma kurvkomponent som utvecklingsvyn — kopierad hit tills den blir delad. */
function Kurva({ punkter, fält, färg, höjd = 72 }) {
  if (!punkter || punkter.length < 2) return null;
  const v = punkter.map(p => p[fält]);
  const min = Math.min(...v), max = Math.max(...v);
  const spann = max - min || 1;
  const t0 = punkter[0].ts, t1 = punkter[punkter.length - 1].ts;
  const bredd = t1 - t0 || 1;
  const W = 360;
  const X = p => ((p.ts - t0) / bredd) * (W - 8) + 4;
  const Y = p => höjd - ((p[fält] - min) / spann) * (höjd - 16) - 8;
  const pts = punkter.map(p => `${X(p).toFixed(1)},${Y(p).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${höjd}`} preserveAspectRatio="none"
      style={{ width: "100%", height: höjd, display: "block", overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={färg} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      {punkter.map((p, i) => <circle key={i} cx={X(p)} cy={Y(p)} r="2.4" fill={färg} vectorEffect="non-scaling-stroke" />)}
    </svg>
  );
}
