import { useMemo, useState } from "react";
import { C, HFONT, hdr, btnPrimary } from "./design.js";
import { bodyState, todaysMessage, weekSessions, lastSessionLabel } from "./store.js";
import { BodyMap2 } from "./BodyMap2.jsx";

const card = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 22,
  padding: 18,
};

function Metric({ label, value, note }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10.5, color: C.muted, textTransform: "uppercase", letterSpacing: 1.2 }}>{label}</div>
      <div style={{ ...hdr(20), marginTop: 5 }}>{value}</div>
      {note && <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{note}</div>}
    </div>
  );
}

function Confidence({ sessions }) {
  const enough = sessions.length >= 3;
  return (
    <div style={{ display: "flex", gap: 9, alignItems: "flex-start", marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
      <div style={{ width: 20, height: 20, border: `1px solid ${enough ? C.lime : C.muted}`, borderRadius: 999, color: enough ? C.lime : C.muted, display: "grid", placeItems: "center", fontSize: 11, flex: "0 0 auto" }}>i</div>
      <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.55 }}>
        {enough
          ? "Rekommendationen bygger på din loggade historik. Coachen uttrycker sig bara så säkert som underlaget tillåter."
          : "För lite data för ett säkert råd. Logga fler pass så blir rekommendationen mer precis."}
      </div>
    </div>
  );
}

export function Coach2({ sessions = [], profile = {}, onStart, onBack }) {
  const [question, setQuestion] = useState("");
  const now = Date.now();
  const { states, overall } = useMemo(() => bodyState(sessions, now), [sessions, now]);
  const message = todaysMessage(states, sessions.length);
  const week = weekSessions(sessions, now).length;
  const last = lastSessionLabel(sessions, now) || "—";
  const name = profile?.name || "Robert";
  const hasData = sessions.length > 0;

  const reasons = hasData
    ? [
        overall == null ? "Readiness saknar tillräckligt underlag" : `Total readiness: ${overall}`,
        `${week} pass loggade den här veckan`,
        `Senaste pass: ${last}`,
        message.empty ? "Ingen muskelgrupp har ännu ett säkert recovery-värde" : "Rekommendationen följer den muskelgrupp som är mest redo",
      ]
    : [
        "Ingen träningshistorik är loggad ännu",
        "Coachen hittar inte på readiness eller återhämtning",
        "Första rekommendationen skapas efter att du loggat ditt första pass",
      ];

  return (
    <div style={{ minHeight: "100vh", padding: "18px 18px 110px", background: C.bg, color: C.text }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onBack} style={{ border: 0, background: "none", color: C.text, fontSize: 24, padding: "4px 8px 4px 0", cursor: "pointer" }}>←</button>
        <div style={{ ...hdr(16), letterSpacing: 1.4 }}>COACHEN</div>
        <div style={{ width: 28 }} />
      </div>

      <section style={{ marginTop: 22 }}>
        <div style={{ fontSize: 12, color: C.lime, fontFamily: HFONT, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2 }}>ATLAS ser detta</div>
        <div style={{ ...hdr(31), marginTop: 8 }}>Hej {name}.</div>
        <div style={{ fontSize: 15, color: C.text2, lineHeight: 1.65, marginTop: 9, maxWidth: 380 }}>
          {hasData ? "Här är mitt bästa beslut för din kropp idag." : "Jag börjar tomt och bygger råden på det du faktiskt loggar."}
        </div>
      </section>

      <section style={{ ...card, marginTop: 22, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "relative", zIndex: 2, maxWidth: 260 }}>
          <div style={{ fontSize: 11, color: C.lime, fontFamily: HFONT, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2 }}>Nästa bästa beslut</div>
          <div style={{ ...hdr(24), marginTop: 10, lineHeight: 1.18 }}>{message.text}</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginTop: 10 }}>
            {hasData ? "Rådet är härlett ur samma recovery-data som färgar kroppen." : "Inga siffror visas förrän appen har underlag."}
          </div>
        </div>
        <div style={{ margin: "6px -12px -8px", opacity: hasData ? 1 : .55 }}>
          <BodyMap2 muscleStates={states} height={210} />
        </div>
        <button onClick={onStart} style={{ ...btnPrimary, marginTop: 10 }}>{hasData ? "Starta rekommenderat pass" : "Logga första passet"}<span>→</span></button>
      </section>

      <section style={{ ...card, marginTop: 14 }}>
        <div style={{ fontSize: 11, color: C.lime, fontFamily: HFONT, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2 }}>Varför?</div>
        <div style={{ marginTop: 12, display: "grid", gap: 11 }}>
          {reasons.map((reason, i) => (
            <div key={reason} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 18, height: 18, border: `1px solid ${C.lime}`, borderRadius: 999, display: "grid", placeItems: "center", color: C.lime, fontSize: 10, flex: "0 0 auto", marginTop: 1 }}>✓</div>
              <div style={{ fontSize: 13, color: i === 0 ? C.text : C.text2, lineHeight: 1.5 }}>{reason}</div>
            </div>
          ))}
        </div>
        <Confidence sessions={sessions} />
      </section>

      <section style={{ ...card, marginTop: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          <Metric label="Readiness" value={overall == null ? "—" : overall} note={sessions.length < 3 ? "osäkert" : "idag"} />
          <Metric label="Veckan" value={sessions.length ? week : "—"} note="pass" />
          <Metric label="Senast" value={last} />
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <div style={{ fontSize: 11, color: C.lime, fontFamily: HFONT, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2 }}>Fråga coachen</div>
        <div style={{ ...card, marginTop: 10, padding: 10, display: "flex", gap: 8, alignItems: "center" }}>
          <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Vad vill du ha hjälp med?" style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: "transparent", color: C.text, padding: "10px 8px", fontSize: 14 }} />
          <button aria-label="Skicka" disabled={!question.trim()} style={{ width: 42, height: 42, borderRadius: 999, border: 0, background: question.trim() ? C.lime : C.border, color: C.bg, fontSize: 20, cursor: question.trim() ? "pointer" : "default" }}>↑</button>
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 10, paddingBottom: 3 }}>
          {["Ska jag träna i morgon?", "Hur ligger jag till?", "Förklara återhämtningen"].map(q => (
            <button key={q} onClick={() => setQuestion(q)} style={{ whiteSpace: "nowrap", border: `1px solid ${C.border}`, background: C.card, color: C.text2, borderRadius: 999, padding: "10px 13px", fontSize: 11.5, cursor: "pointer" }}>{q}</button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Coach2;
