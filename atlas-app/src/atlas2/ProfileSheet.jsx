// Askr 2.0 — profilen.
//
// Fälten fanns utspridda: `sex` sattes på startsidan, `diet` i meal prep,
// `nutStyle` i matakuten. Resten fanns inte alls, trots att motorerna läste
// dem — och föll tillbaka på standardvärden i tysthet.
//
// Den här vyn är det ställe där man kan se och rätta allt. Poängen är inte
// fullständighet för sin egen skull: varje fält redovisar VAD DET LÅSER UPP,
// och saknas det sägs det rakt ut i stället för att appen låtsas veta.

import { useEffect, useState } from "react";
import { C, HFONT, BFONT, hdr, label, btnPrimary, btnGhost, card, volt, DASH } from "./design.js";
import { FÄLT, KOSTHÅLLNINGAR, KOSTUPPLÄGG, NIVÅER, profilLuckor, sammanfogaProfil } from "../engines/profil.js";

const KÖN = [{ id: "m", namn: "Man" }, { id: "f", namn: "Kvinna" }];

function Rad({ children, sist }) {
  return <div style={{ padding: "14px 0", borderBottom: sist ? "none" : `1px solid ${C.border}` }}>{children}</div>;
}

function Val({ etikett, hjälp, val, aktiv, onVälj, kompakt }) {
  return (
    <>
      <div style={label()}>{etikett}</div>
      {hjälp && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>{hjälp}</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 8 }}>
        {val.map(v => (
          <button key={String(v.id)} onClick={() => onVälj(v.id)} style={{
            padding: kompakt ? "9px 15px" : "10px 14px", borderRadius: 999, cursor: "pointer",
            border: `1px solid ${aktiv === v.id ? C.lime : C.border}`,
            background: aktiv === v.id ? volt(.06) : C.card2,
            color: aktiv === v.id ? C.lime : C.text2,
            fontFamily: BFONT, fontSize: 12.5,
          }}>{v.namn}</button>
        ))}
      </div>
      {/* Beskrivningen gäller det VALDA alternativet — den förklarar följden av
          valet, inte alla alternativ på en gång. */}
      {(val.find(v => v.id === aktiv) || {}).beskrivning && (
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 7, lineHeight: 1.5 }}>
          {val.find(v => v.id === aktiv).beskrivning}
        </div>
      )}
    </>
  );
}

/** Klampar bara FÄRDIGA tal — se kommentaren i Tal om varför det dröjer. */
export function klampa(v, min, max) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, n));
}

function Tal({ etikett, hjälp, värde, enhet, min, max, onÄndra }) {
  // FÄLTET ÄGER SIN EGEN TEXT MEDAN MAN SKRIVER.
  //
  // Tidigare klampades varje tangenttryckning direkt mot min/max, och ett tal
  // skrivs en siffra i taget: "1" av 180 är under minimum 120 och blev 120, så
  // nästa siffra skrev "1208" som klampades till 230. Man KUNDE inte skriva
  // sin längd. Samma sak för ålder: "42" blev 100, eftersom "4" först blev 13.
  // Reproducerat mot bygget innan fixen.
  //
  // Nu hålls råtexten lokalt och klampningen sker när fältet lämnas. Under
  // skrivandet rapporteras talet oklampat uppåt, så ett värde aldrig går
  // förlorat om man trycker Spara utan att lämna fältet — Spara klampar också.
  const [text, setText] = useState(värde != null ? String(värde) : "");
  const [rör, setRör] = useState(false);
  // Ändras värdet utifrån (återställning, ny profil) medan fältet inte är i
  // fokus ska texten följa med.
  useEffect(() => {
    if (!rör) setText(värde != null ? String(värde) : "");
  }, [värde, rör]);

  return (
    <>
      <div style={label()}>{etikett}</div>
      {hjälp && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>{hjälp}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 8 }}>
        <input
          type="number" inputMode="numeric" min={min} max={max}
          value={text}
          onFocus={() => setRör(true)}
          onChange={e => {
            const v = e.target.value;
            setText(v);
            // Tomt fält betyder "vet inte", inte noll. En nolla hade varit ett
            // påstående — och 0 cm lång är ett sämre svar än inget svar.
            onÄndra(v === "" ? null : Number(v));
          }}
          onBlur={() => {
            setRör(false);
            const n = klampa(text, min, max);
            setText(n != null ? String(n) : "");
            onÄndra(n);
          }}
          placeholder="—"
          style={{
            width: 110, padding: "11px 13px", borderRadius: 12,
            border: `1px solid ${C.border}`, background: C.card2, color: C.text,
            fontFamily: HFONT, fontSize: 16, fontWeight: 700,
          }} />
        <span style={{ fontSize: 12.5, color: C.muted }}>{enhet}</span>
      </div>
    </>
  );
}

export function ProfileSheet({ profile = {}, setProfile, weights = [], onClose }) {
  const [utkast, setUtkast] = useState(profile);
  const sätt = (k, v) => setUtkast(p => ({ ...p, [k]: v }));
  const luckor = profilLuckor(utkast);

  // Vikten redigeras INTE här. Den loggas och har en historik — att kunna
  // skriva över den i en profilruta hade skapat två sanningar om samma tal.
  const senasteVikt = (weights || []).length
    ? weights.slice().sort((a, b) => a.ts - b.ts)[weights.length - 1].kg
    : null;

  // GRÄNSERNA GÄLLER ÄVEN OM MAN ALDRIG LÄMNAR FÄLTET.
  //
  // Talfälten klampar när de tappar fokus, men Spara kan tryckas direkt från
  // ett fält som står på 500. Samma gränser som fälten bär, på ett ställe.
  const GRÄNSER = { age: [13, 100], height: [120, 230] };
  const spara = () => {
    const rent = { ...utkast };
    for (const [fält, [min, max]] of Object.entries(GRÄNSER)) {
      if (rent[fält] != null) rent[fält] = klampa(rent[fält], min, max);
    }
    setProfile(p => sammanfogaProfil(p, rent));
    onClose();
  };

  return (
    <div>
      <div style={hdr(19)}>Om dig</div>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "10px 0 4px" }}>
        Det här styr vad appen kan räkna ut. Saknas något säger jag det hellre
        än gissar — men då blir vissa siffror otillgängliga.
      </div>

      {/* LUCKRAPPORTEN. Inte en tillsägelse utan ett besked om följden: det här
          fungerar inte förrän fältet finns. Utan luckor står den inte alls. */}
      {!luckor.harAllt && (
        <div style={{ ...card, marginTop: 12, borderColor: C.recovering, background: "transparent" }}>
          <div style={label(C.recovering)}>Detta räknar jag inte ut än</div>
          <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.6, marginTop: 6 }}>
            {luckor.blockerat.join(" · ")}
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
            Saknas: {luckor.saknas.map(f => f.namn.toLowerCase()).join(", ")}.
          </div>
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <Rad>
          <Val etikett="Kön" hjälp="Kroppsfettsformeln och flera näringsreferenser skiljer sig åt — järnbehovet är nästan dubbelt så högt för kvinnor."
            val={KÖN} aktiv={utkast.sex || null} onVälj={v => sätt("sex", v)} kompakt />
        </Rad>
        <Rad>
          <Tal etikett="Ålder" hjälp="Ingår i beräkningen av kaloribehov."
            värde={utkast.age != null ? utkast.age : null} enhet="år" min={13} max={100}
            onÄndra={v => sätt("age", v)} />
        </Rad>
        <Rad>
          <Tal etikett="Längd" hjälp="Behövs för kroppsfett och kaloribehov."
            värde={utkast.height != null ? utkast.height : null} enhet="cm" min={120} max={230}
            onÄndra={v => sätt("height", v)} />
        </Rad>

        {/* Vikten är loggad data, inte en profilinställning. Den visas för att
            bilden ska vara hel, men redigeras där den hör hemma. */}
        <Rad>
          <div style={label()}>Vikt</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
            <div style={{ ...hdr(20) }}>{senasteVikt != null ? senasteVikt : DASH}</div>
            <span style={{ fontSize: 12.5, color: C.muted }}>kg</span>
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 5, lineHeight: 1.5 }}>
            Vikten kommer ur dina vägningar och redigeras under Framsteg — den
            har en historik, och den ska inte kunna skrivas över här.
          </div>
        </Rad>

        <Rad>
          <Val etikett="Träningsvana" hjälp="Styr programval och hur snabbt belastningen får öka."
            val={NIVÅER} aktiv={utkast.level || null} onVälj={v => sätt("level", v)} />
        </Rad>
        <Rad>
          <Val etikett="Kosthållning" hjälp="Avgör vilka recept och veckomenyer du får."
            val={KOSTHÅLLNINGAR} aktiv={utkast.diet || null} onVälj={v => sätt("diet", v)} />
        </Rad>
        <Rad>
          {/* dietApproach LÄSTES av näringsmotorn men hade ingen väljare —
              fältet fanns, ytan saknades. Det här är ytan. */}
          <Val etikett="Kostupplägg (frivilligt)" hjälp="Påverkar hur näringsmålets makron fördelas."
            val={KOSTUPPLÄGG} aktiv={utkast.dietApproach || null} onVälj={v => sätt("dietApproach", v)} />
        </Rad>
        <Rad sist>
          <div style={label()}>Skador och besvär (frivilligt)</div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
            Dina egna ord. Coachen tar hänsyn till dem men gör ingen medicinsk
            bedömning.
          </div>
          <textarea
            value={utkast.injuryNotes || ""}
            onChange={e => sätt("injuryNotes", e.target.value)}
            rows={3}
            placeholder="T.ex. ont i vänster axel vid press ovanför huvudet"
            style={{
              width: "100%", boxSizing: "border-box", marginTop: 8, padding: "11px 13px",
              borderRadius: 12, border: `1px solid ${C.border}`, background: C.card2,
              color: C.text, fontFamily: BFONT, fontSize: 13.5, lineHeight: 1.5, resize: "vertical",
            }} />
        </Rad>
      </div>

      <button onClick={spara} style={{ ...btnPrimary, marginTop: 18 }}>Spara</button>
      <button onClick={onClose} style={{ ...btnGhost, marginTop: 9 }}>Avbryt</button>
    </div>
  );
}

/** Kompakt kort som visar luckorna där de spelar roll (t.ex. i menyn). */
export function ProfilLucka({ profile, onOpen }) {
  const luckor = profilLuckor(profile);
  if (luckor.harAllt) return null;
  return (
    <button onClick={onOpen} style={{
      ...card, width: "100%", textAlign: "left", cursor: "pointer", color: C.text,
      display: "block", borderColor: C.recovering, background: "transparent",
    }}>
      <div style={label(C.recovering)}>Om dig</div>
      <div style={{ fontSize: 13.5, color: C.text2, lineHeight: 1.6, marginTop: 6 }}>
        {luckor.saknas.length === 1
          ? `Jag saknar din ${luckor.saknas[0].namn.toLowerCase()}.`
          : `Jag saknar ${luckor.saknas.length} uppgifter om dig.`}
        {" "}Utan dem kan jag inte räkna ut {luckor.blockerat.slice(0, 2).join(" eller ").toLowerCase()}.
      </div>
    </button>
  );
}
