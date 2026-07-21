// Askr 2.0 — målresan som vy.
//
// Två lägen: sätt ett mål, eller se var i resan du står. Utan mål visas ingen
// fejkad tidsaxel — bara en inbjudan att sätta ett.

import { useState } from "react";
import { C, HFONT, hdr, label, btnPrimary, btnGhost, card, statRow, statCell } from "./design.js";
import { MÅLTYPER, skapaMål, resa, delmål, resansText } from "./journey.js";

const dat = ts => new Date(ts).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" });
const VECKA = 6048e5;

function Ny({ onSpara, onAvbryt }) {
  const [typ, setTyp] = useState("muscle");
  const [veckor, setVeckor] = useState(12);
  const [pass, setPass] = useState(3);

  return (
    <div>
      <div style={hdr(19)}>Sätt ett mål</div>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "10px 0 20px" }}>
        Med ett måldatum kan Askr dela in tiden i faser och säga var i resan du
        står — inte bara vad kroppen tål idag.
      </div>

      <div style={{ ...label(), marginBottom: 8 }}>Vad siktar du på?</div>
      {Object.entries(MÅLTYPER).map(([id, t]) => (
        <button key={id} onClick={() => setTyp(id)} style={{
          width: "100%", textAlign: "left", padding: 13, marginBottom: 8, borderRadius: 13, cursor: "pointer",
          border: `1px solid ${typ === id ? C.lime : C.border}`,
          background: typ === id ? "rgba(212,255,63,.05)" : C.card2, color: C.text,
        }}>
          <div style={{ ...hdr(14), color: typ === id ? C.lime : C.text }}>{t.namn}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{t.beskrivning}</div>
        </button>
      ))}

      <div style={{ ...label(), margin: "20px 0 8px" }}>Hur lång är resan?</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[8, 12, 16, 20, 26].map(v => (
          <button key={v} onClick={() => setVeckor(v)} style={{
            flex: "1 1 60px", padding: "12px 4px", borderRadius: 12, cursor: "pointer",
            border: `1px solid ${veckor === v ? C.lime : C.border}`,
            background: veckor === v ? "rgba(212,255,63,.05)" : C.card2,
            color: veckor === v ? C.lime : C.text, fontFamily: HFONT, fontSize: 13.5, fontWeight: 700,
          }}>{v} v</button>
        ))}
      </div>

      <div style={{ ...label(), margin: "20px 0 8px" }}>Pass per vecka</div>
      <div style={{ display: "flex", gap: 8 }}>
        {[2, 3, 4, 5, 6].map(p => (
          <button key={p} onClick={() => setPass(p)} style={{
            flex: 1, padding: "12px 0", borderRadius: 12, cursor: "pointer",
            border: `1px solid ${pass === p ? C.lime : C.border}`,
            background: pass === p ? "rgba(212,255,63,.05)" : C.card2,
            color: pass === p ? C.lime : C.text, fontFamily: HFONT, fontSize: 14, fontWeight: 700,
          }}>{p}</button>
        ))}
      </div>

      <div style={{ fontSize: 12.5, color: C.muted, marginTop: 16 }}>
        Måldatum: {dat(Date.now() + veckor * VECKA)}
      </div>

      <button onClick={() => onSpara(skapaMål({
        typ, namn: MÅLTYPER[typ].namn, passPerVecka: pass,
        startDatum: Date.now(), målDatum: Date.now() + veckor * VECKA,
      }))} style={{ ...btnPrimary, marginTop: 18 }}>Starta resan <span style={{ fontSize: 18 }}>→</span></button>
      <button onClick={onAvbryt} style={{ ...btnGhost, marginTop: 10 }}>Avbryt</button>
    </div>
  );
}

export function GoalSheet({ mål, setMål, sessions, onClose }) {
  const [nytt, setNytt] = useState(false);
  const r = resa(mål, sessions);

  if (!mål || nytt) {
    return <Ny onSpara={m => { setMål(m); setNytt(false); }} onAvbryt={() => (mål ? setNytt(false) : onClose())} />;
  }

  const dm = delmål(mål);

  return (
    <div>
      <div style={hdr(19)}>{mål.namn}</div>
      <div style={{ fontSize: 13, color: C.lime, marginTop: 6 }}>{resansText(r)}</div>

      {/* Tidslinjen. Faserna är olika breda eftersom de är olika långa — det är
          poängen, inte ett fel. */}
      <div style={{ display: "flex", gap: 3, marginTop: 18, height: 8 }}>
        {r.faser.map(f => {
          const aktiv = r.aktivFas && r.aktivFas.id === f.id;
          const klar = Date.now() >= f.till;
          return (
            <div key={f.id} style={{
              flex: f.andel, borderRadius: 4,
              background: klar ? C.lime : aktiv ? C.recovering : C.border,
              opacity: klar ? 0.5 : 1,
            }} title={`${f.namn} · ${f.veckor} v`} />
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: C.muted, marginTop: 6 }}>
        <span>{dat(mål.startDatum)}</span><span>{dat(mål.målDatum)}</span>
      </div>

      {r.aktivFas && (
        <div style={{ ...card, marginTop: 16, borderColor: C.lime, background: "rgba(212,255,63,.045)" }}>
          <div style={label(C.lime)}>Just nu</div>
          <div style={{ ...hdr(17), marginTop: 6 }}>{r.aktivFas.namn}</div>
          <div style={{ fontSize: 13.5, color: C.text2, lineHeight: 1.6, marginTop: 7 }}>{r.aktivFas.fokus}</div>
          <div style={{ display: "flex", gap: 16, marginTop: 11, fontSize: 12, color: C.muted }}>
            <span>Volym: {r.aktivFas.volym}</span><span>Intensitet: {r.aktivFas.intensitet}</span>
          </div>
        </div>
      )}

      <div style={{ ...statRow, marginTop: 16 }}>
        {[["Veckor kvar", r.veckorKvar],
          ["Pass loggade", r.passLoggade],
          ["Följsamhet", r.följsamhet === null ? "—" : `${r.följsamhet}%`]].map(([l, v], i) => (
          <div key={l} style={statCell(i)}>
            <div style={label()}>{l}</div>
            <div style={{ ...hdr(20), marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>
      {r.följsamhet === null && (
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
          Följsamhet visas när resan pågått minst en vecka — innan dess säger
          siffran ingenting.
        </div>
      )}

      <div style={{ ...label(), margin: "22px 0 4px" }}>Faser</div>
      {dm.map(d => (
        <div key={d.id} style={{ display: "flex", gap: 11, padding: "12px 2px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0,
            background: d.passerat ? C.lime : C.border }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, color: d.passerat ? C.muted : C.text }}>{d.namn}</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{dat(d.datum)}</div>
          </div>
        </div>
      ))}

      <button onClick={() => setNytt(true)} style={{ ...btnGhost, marginTop: 20 }}>Sätt ett nytt mål</button>
      <button onClick={() => setMål(null)} style={{ width: "100%", marginTop: 9, padding: 11, borderRadius: 999, border: "none", background: "transparent", color: C.muted, fontSize: 12.5, cursor: "pointer" }}>
        Ta bort målet
      </button>
    </div>
  );
}
