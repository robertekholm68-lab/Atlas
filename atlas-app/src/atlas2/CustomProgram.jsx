import { useState, useMemo } from "react";
import { C, hdr, label, btnPrimary, btnGhost, btnText, card, volt } from "./design.js";
import { EXERCISES } from "../data/exercises.js";
import { MUSCLES, GROUP_SV } from "../data/muscles.js";
import { sökordFör } from "./sokord.js";

/**
 * EGET PASS.
 *
 * Alla 31 program är mallar. Man kunde välja bland dem men inte bygga något
 * eget — och den som tränat länge har oftast ett upplägg i huvudet som ingen
 * mall matchar.
 *
 * FORMEN ÄR MALLARNAS. Ett eget program bär exakt samma fält som ett kopierat
 * (id, name, workouts, daysPerWeek, createdAt …) och varje övning samma form
 * som i en mall: { exId, sets, repMin, repMax, rir, restSec }. Avviker formen
 * går motorn sönder på ställen som inte har med programvyn att göra —
 * nextWorkout, progressionSuggestion och analyzeProgram läser alla den här
 * strukturen.
 *
 * INGA STANDARDVÄRDEN SOM LÅTSAS VARA RÅD. Set och reps förvalda till 3 × 8–12
 * eftersom något måste stå där, men appen påstår inte att det är rätt för just
 * den här övningen — den vet inte det.
 */

/** Samma default som mallarna använder för en ny övning. */
const NY_ÖVNING = { sets: 3, repMin: 8, repMax: 12, rir: 2, restSec: 90 };

/** Bygger ett program i mallarnas form. Inga extrafält, inga saknade. */
export function byggEgetProgram({ namn, pass }) {
  const nu = Date.now();
  return {
    archived: false, active: true, version: 3,
    id: `prog_egen_${nu.toString(36)}`,
    templateId: null, isTemplate: false,
    name: namn || "Mitt program",
    family: "Eget", level: null, goal: null, split: "custom",
    daysPerWeek: pass.length,
    weekdays: [], sessionDuration: null,
    equipment: [...new Set(pass.flatMap(p => p.exercises
      .map(e => (EXERCISES.find(x => x.id === e.exId) || {}).equipment).filter(Boolean)))],
    equipmentWarnings: [],
    workouts: pass.map((p, i) => ({
      id: `w_egen_${nu.toString(36)}_${i}`,
      name: p.name || `Pass ${i + 1}`,
      exercises: p.exercises,
    })),
    createdAt: nu, updatedAt: nu,
  };
}

export function CustomProgram({ onKlar, onClose }) {
  const [namn, setNamn] = useState("");
  const [pass, setPass] = useState([{ name: "Pass 1", exercises: [] }]);
  const [aktivt, setAktivt] = useState(0);
  const [sök, setSök] = useState("");
  const [väljer, setVäljer] = useState(false);

  const p = pass[aktivt] || pass[0];

  const träffar = useMemo(() => {
    const q = sök.trim().toLowerCase();
    if (!q) return EXERCISES.slice(0, 30);
    return EXERCISES.filter(e => {
      const musklerna = (e.activation || []).map(a => (MUSCLES[a.muscleId] || {}).name || "").join(" ");
      return `${e.name} ${e.equipment || ""} ${musklerna} ${sökordFör(e.name)}`.toLowerCase().includes(q);
    }).slice(0, 40);
  }, [sök]);

  const ändraPass = (i, f) => setPass(ps => ps.map((x, n) => n === i ? f(x) : x));

  const läggTill = ex => {
    ändraPass(aktivt, x => ({ ...x, exercises: [...x.exercises, { exId: ex.id, ...NY_ÖVNING }] }));
    setVäljer(false); setSök("");
  };

  const totalt = pass.reduce((a, x) => a + x.exercises.length, 0);

  // Vilka muskelgrupper täcker passet? Räknas ur samma aktiveringsvektor som
  // driver kroppskartan — inte ur en egen tabell.
  const täckning = useMemo(() => {
    const g = {};
    (p ? p.exercises : []).forEach(e => {
      const ex = EXERCISES.find(x => x.id === e.exId);
      (ex ? ex.activation : []).forEach(a => {
        const grupp = (MUSCLES[a.muscleId] || {}).group;
        if (grupp) g[grupp] = Math.max(g[grupp] || 0, a.factor);
      });
    });
    return Object.entries(g).sort((a, b) => b[1] - a[1]).map(([k]) => GROUP_SV[k] || k);
  }, [p]);

  const rad = { border: `1px solid ${C.border}`, background: C.card2, borderRadius: 14 };

  if (väljer) {
    return (
      <div style={{ padding: "4px 0 16px" }}>
        <button onClick={() => { setVäljer(false); setSök(""); }} style={{ ...btnText, minHeight: 44 }}>
          ‹ Tillbaka
        </button>
        <div style={{ ...hdr(17), margin: "8px 0 2px" }}>Lägg till övning</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>till {p.name}</div>
        <input value={sök} onChange={e => setSök(e.target.value)} autoFocus
          placeholder="Sök övning, muskel eller redskap…"
          aria-label="Sök övning att lägga till"
          style={{
            width: "100%", padding: "12px 14px", borderRadius: 12, minHeight: 44,
            border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 14,
          }} />
        <div style={{ ...label(), margin: "14px 0 8px" }}>
          {sök ? `${träffar.length} träffar` : "Vanliga övningar"}
        </div>
        {träffar.map(e => (
          <button key={e.id} onClick={() => läggTill(e)} data-lagg="1"
            style={{ ...rad, width: "100%", textAlign: "left", padding: "12px 15px", marginBottom: 7,
              minHeight: 44, cursor: "pointer", color: C.text }}>
            <span style={{ ...hdr(13.5), display: "block" }}>{e.name}</span>
            <span style={{ display: "block", fontSize: 11.5, color: C.muted, marginTop: 3 }}>
              {[(MUSCLES[(e.activation || [])[0]?.muscleId] || {}).name, e.equipment].filter(Boolean).join(" · ")}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: "4px 0 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={hdr(19)}>Bygg eget</div>
        {onClose && <button onClick={onClose} style={btnText} aria-label="Stäng">Stäng</button>}
      </div>

      <input value={namn} onChange={e => setNamn(e.target.value)}
        placeholder="Namn på programmet" aria-label="Namn på programmet"
        style={{
          width: "100%", marginTop: 14, padding: "12px 14px", borderRadius: 12, minHeight: 44,
          border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 14,
        }} />

      {/* Passflikar. Ett program kan ha flera pass, precis som mallarna. */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "14px 0 4px" }}>
        {pass.map((x, i) => (
          <button key={i} onClick={() => setAktivt(i)} data-passflik="1"
            style={{
              ...rad, padding: "7px 13px", minHeight: 36, cursor: "pointer", fontSize: 12.5,
              borderColor: i === aktivt ? C.lime : C.border,
              color: i === aktivt ? C.lime : C.muted,
              background: i === aktivt ? volt(.08) : C.card2,
            }}>{x.name} <span style={{ opacity: .6 }}>{x.exercises.length}</span></button>
        ))}
        <button onClick={() => { setPass(ps => [...ps, { name: `Pass ${ps.length + 1}`, exercises: [] }]); setAktivt(pass.length); }}
          data-nyttpass="1"
          style={{ ...rad, padding: "7px 13px", minHeight: 36, cursor: "pointer", fontSize: 12.5, color: C.muted }}>
          + Pass
        </button>
      </div>

      <input value={p.name} onChange={e => ändraPass(aktivt, x => ({ ...x, name: e.target.value }))}
        aria-label="Namn på passet"
        style={{
          width: "100%", marginTop: 12, padding: "10px 13px", borderRadius: 12, minHeight: 44,
          border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 13.5,
        }} />

      {p.exercises.length === 0 && (
        <div style={{ ...card, padding: 16, marginTop: 12, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
          Inga övningar än. Lägg till den första så räknar Askr ut vad passet belastar.
        </div>
      )}

      {p.exercises.map((e, i) => {
        const info = EXERCISES.find(x => x.id === e.exId) || {};
        const sätt = f => ändraPass(aktivt, x => ({ ...x, exercises: x.exercises.map((y, n) => n === i ? f(y) : y) }));
        const knapp = {
          width: 34, height: 34, borderRadius: 999, flexShrink: 0, fontSize: 16,
          border: `1px solid ${C.border}`, background: C.card2, color: C.text, cursor: "pointer",
        };
        return (
          <div key={i} style={{ ...rad, padding: "12px 14px", marginTop: 8 }} data-ovning="1">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <span style={{ ...hdr(13), minWidth: 0 }}>{info.name || e.exId}</span>
              <button onClick={() => ändraPass(aktivt, x => ({ ...x, exercises: x.exercises.filter((_, n) => n !== i) }))}
                aria-label={`Ta bort ${info.name || e.exId}`}
                style={{ background: "none", border: "none", color: C.muted, fontSize: 17,
                  cursor: "pointer", padding: "2px 4px", minHeight: 34, flexShrink: 0 }}>×</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, color: C.muted, width: 30 }}>Set</span>
              <button onClick={() => sätt(y => ({ ...y, sets: Math.max(1, y.sets - 1) }))} style={knapp} aria-label="Färre set">−</button>
              <span style={{ ...hdr(14), minWidth: 20, textAlign: "center" }}>{e.sets}</span>
              <button onClick={() => sätt(y => ({ ...y, sets: Math.min(10, y.sets + 1) }))} style={knapp} aria-label="Fler set">+</button>
              <span style={{ fontSize: 11.5, color: C.muted, marginLeft: 8 }}>
                {e.repMin}–{e.repMax} reps
              </span>
              <button onClick={() => sätt(y => {
                // Fyra vanliga intervall i stället för fritt tal: mitt i ett
                // bygge vill man välja, inte skriva.
                const steg = [[5, 8], [6, 10], [8, 12], [10, 15], [12, 20]];
                const n = steg.findIndex(([a, b]) => a === y.repMin && b === y.repMax);
                const [repMin, repMax] = steg[(n + 1) % steg.length];
                return { ...y, repMin, repMax };
              })} style={{ ...btnText, fontSize: 11.5, minHeight: 34, padding: "0 6px" }}>ändra</button>
            </div>
          </div>
        );
      })}

      <button onClick={() => setVäljer(true)} data-lagg-till="1"
        style={{ ...btnGhost, marginTop: 12 }}>+ Lägg till övning</button>

      {täckning.length > 0 && (
        <div style={{ fontSize: 12, color: C.muted, marginTop: 12, lineHeight: 1.55 }}>
          {p.name} belastar: {täckning.join(", ")}
        </div>
      )}

      {/* Spara kräver att något faktiskt loggats. Ett tomt program skulle se ut
          som ett fungerande val i listan och sedan ge ett pass utan övningar. */}
      <button onClick={() => onKlar(byggEgetProgram({ namn, pass: pass.filter(x => x.exercises.length) }))}
        disabled={totalt === 0} data-spara="1"
        style={{ ...btnPrimary, marginTop: 16, opacity: totalt === 0 ? 0.4 : 1,
          cursor: totalt === 0 ? "default" : "pointer" }}>
        Spara programmet
      </button>
      {totalt === 0 && (
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, textAlign: "center" }}>
          Lägg till minst en övning först.
        </div>
      )}
    </div>
  );
}
