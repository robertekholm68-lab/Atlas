import { useState, useMemo } from "react";
import { C, HFONT, MONO, hdr, label, btnText, card, volt } from "./design.js";
import { TOPICS, KNOWLEDGE, LEVELS, CATEGORIES, MEDICAL_DISCLAIMER } from "../data/knowledge.js";
import { MUSCLES } from "../data/muscles.js";

/**
 * KUNSKAPSBASEN.
 *
 * 23 träningsartiklar (TOPICS) och 21 muskelbeskrivningar (KNOWLEDGE) har
 * funnits i datalagret sedan 1.0 och aldrig nått Askr 2.0 — samma mönster som
 * musikknappen, passlistan och maskinguiden. Innehållet fanns, vägen dit
 * saknades.
 *
 * TVÅ SAMLINGAR, EN VY. De svarar på olika frågor — "hur fungerar progressiv
 * överbelastning" mot "vad gör bröstmuskeln" — men båda är samma sorts
 * uppslagsverk, och två separata vyer hade gjort det svårare att hitta något.
 *
 * EVIDENSNIVÅN SYNS PÅ VARJE STYCKE. Det är hela poängen med hur datan är
 * skriven: "etablerad" är väldokumenterad fysiologi, "tumregel" en rimlig
 * riktlinje, "omdiskuterat" något forskningen inte är enig om. Att visa dem
 * likadant vore att påstå mer än vi vet — samma ärlighetsprincip som
 * dataConfidence i resten av appen.
 */

const FLIKAR = [
  { id: "traning", namn: "Träning" },
  { id: "muskler", namn: "Muskler" },
];

/** En färgad prick + etikett för evidensnivån. */
function Nivå({ level }) {
  const l = LEVELS[level];
  if (!l) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em",
      textTransform: "uppercase", color: l.c,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: l.c, flexShrink: 0 }} />
      {l.label}
    </span>
  );
}

/** Ett utfällbart stycke: rubrik, nivå, brödtext. */
function Stycke({ s }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <span style={{ ...hdr(13), minWidth: 0 }}>{s.title}</span>
        <Nivå level={s.level} />
      </div>
      <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.65, marginTop: 6 }}>
        {s.body}
      </div>
      {/* KÄLLAN ÄR ETT OBJEKT { name, url }, inte en sträng.
          Att rendera den rakt av gav React error #31 och en helt tom artikel —
          hela utfällningen försvann, utan synligt felmeddelande. Länken görs
          klickbar när url finns; annars visas bara namnet.

          Källhänvisningen står kvar som den skrevs: den är en del av
          innehållets trovärdighet, inte en fotnot att gömma. */}
      {s.source && (
        <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
          Källa:{" "}
          {s.source.url
            ? <a href={s.source.url} target="_blank" rel="noopener noreferrer"
                style={{ color: C.muted }}>{s.source.name || s.source.url}</a>
            : (s.source.name || String(s.source))}
        </div>
      )}
    </div>
  );
}

export function KnowledgeView({ onClose }) {
  const [flik, setFlik] = useState("traning");
  const [sök, setSök] = useState("");
  const [öppen, setÖppen] = useState(null);

  const poster = useMemo(() => {
    const q = sök.trim().toLowerCase();
    const källa = flik === "traning" ? TOPICS : KNOWLEDGE;
    const lista = Object.entries(källa).map(([id, a]) => ({
      id, title: a.title, lead: a.lead,
      tag: a.tag || (MUSCLES[id] ? "Muskel" : null),
      // TOPICS kallar dem sections, KNOWLEDGE kallar dem entries. Samma sak.
      stycken: a.sections || a.entries || [],
    }));
    if (!q) return lista;
    return lista.filter(a =>
      `${a.title} ${a.lead} ${a.tag || ""} ${a.stycken.map(s => s.title + " " + s.body).join(" ")}`
        .toLowerCase().includes(q)
    );
  }, [flik, sök]);

  const fältStil = {
    width: "100%", padding: "12px 14px", borderRadius: 12, minHeight: 44,
    border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 14,
  };

  return (
    <div style={{ padding: "4px 0 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={hdr(19)}>Kunskap</div>
        {onClose && <button onClick={onClose} style={btnText} aria-label="Stäng">Stäng</button>}
      </div>
      <div style={{ fontSize: 12.5, color: C.muted, marginTop: 5, lineHeight: 1.55 }}>
        Träningsprinciper och muskelfakta. Varje stycke visar hur säkert
        underlaget är.
      </div>

      <div style={{ display: "flex", gap: 7, margin: "14px 0 12px" }}>
        {FLIKAR.map(f => (
          <button key={f.id} onClick={() => { setFlik(f.id); setÖppen(null); }} data-kflik={f.id}
            style={{
              padding: "8px 14px", minHeight: 40, borderRadius: 999, cursor: "pointer", fontSize: 12.5,
              border: `1px solid ${flik === f.id ? C.lime : C.border}`,
              color: flik === f.id ? C.lime : C.muted,
              background: flik === f.id ? volt(.08) : C.card2,
            }}>{f.namn}</button>
        ))}
      </div>

      <input value={sök} onChange={e => setSök(e.target.value)}
        placeholder="Sök i texterna…" aria-label="Sök i kunskapsbasen"
        style={fältStil} />

      <div style={{ ...label(), margin: "16px 0 8px" }}>
        {poster.length} {poster.length === 1 ? "artikel" : "artiklar"}
      </div>

      {poster.length === 0 && (
        <div style={{ ...card, padding: 16, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
          Inget matchar ”{sök}”. Sökningen går igenom hela texterna, inte bara
          rubrikerna — prova ett annat ord.
        </div>
      )}

      {poster.map(a => {
        const är = öppen === a.id;
        return (
          <div key={a.id} style={{
            border: `1px solid ${C.border}`, background: C.card2, borderRadius: 14,
            marginBottom: 8, overflow: "hidden",
          }}>
            <button onClick={() => setÖppen(är ? null : a.id)} data-artikel="1"
              aria-expanded={är}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                width: "100%", textAlign: "left", padding: "13px 15px", minHeight: 44,
                background: "none", border: "none", color: C.text, cursor: "pointer",
              }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ ...hdr(13.5), display: "block" }}>{a.title}</span>
                {a.tag && (
                  <span style={{ display: "block", fontSize: 11.5, color: C.muted, marginTop: 3 }}>
                    {a.tag}
                  </span>
                )}
              </span>
              <span style={{ color: C.muted, fontSize: 15, flexShrink: 0,
                transform: är ? "rotate(180deg)" : "none", transition: "transform 150ms ease-out" }}>⌄</span>
            </button>

            {är && (
              <div style={{ padding: "0 15px 15px" }}>
                {a.lead && (
                  <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.6 }}>{a.lead}</div>
                )}
                {a.stycken.map((s, i) => <Stycke key={i} s={s} />)}

                {/* Kategorier som rör hälsa bär en medicinsk brasklapp i datan.
                    Den ska följa med texten, inte bara stå i en inställning. */}
                {a.stycken.some(s => (CATEGORIES[s.category] || {}).medical) && MEDICAL_DISCLAIMER && (
                  <div style={{
                    fontSize: 11.5, color: C.muted, lineHeight: 1.55, marginTop: 16,
                    paddingTop: 12, borderTop: `1px solid ${C.hairline}`,
                  }}>
                    {MEDICAL_DISCLAIMER}
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
