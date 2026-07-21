// Askr 2.0 — pågående pass.
//
// Den enda vyn man faktiskt STÅR i, på ett gym, med svettiga händer och
// telefonen i fickan mellan seten. Därav besluten:
//   · vilonedräkningen är det största på skärmen
//   · knapparna är stora nog att träffa utan att sikta
//   · pågående pass sparas efter VARJE ändring, inte vid avslut — dör appen
//     mitt i ett pass ska ingenting vara borta
//
// Loggar på riktigt till atlas.v3.*, via samma buildSession som nuvarande
// appen. Ett pass som loggas här är alltså en riktig session med riktig
// muskellast, inte en attrapp.

import { useState, useEffect, useRef } from "react";
import { C, HFONT, hdr, label, btnPrimary, btnGhost, card } from "./design.js";
import { save } from "./store.js";
import { workoutExercises } from "../engines/programs.js";
import { progressionSuggestion, lastPerformance } from "../engines/index.js";
import { buildSession } from "../engines/session.js";
import { EXERCISES } from "../data/exercises.js";

/** Bygger passets övningslista med förslag ur historiken. */
export function buildLive(program, workout, sessions) {
  const items = workoutExercises(workout).map(x => {
    const sug = progressionSuggestion(x.exId, sessions, x.repMax);
    const lp = lastPerformance(sessions, x.exId);
    return {
      exId: x.exId,
      namn: (x.exercise && x.exercise.name) || x.exId,
      // Kräver övningen yttre vikt? Då får den inte loggas utan en — annars
      // blir volymen noll, muskellasten noll, och appen tror att passet aldrig
      // hänt. Ett tyst nolldatum är värre än att behöva knappa in en siffra.
      yttreVikt: !!(x.exercise && x.exercise.loadMode === "external"),
      grupp: (x.exercise && x.exercise.group) || null,
      set: x.sets || 3,
      repMin: x.repMin, repMax: x.repMax,
      vila: x.restSec || 90,
      vikt: sug ? sug.weight : (lp && lp.weight ? lp.weight : null),
      reps: sug ? sug.reps : (x.repMax || 8),
      förslag: sug ? sug.note : null,
      loggade: [],
    };
  });
  return { programId: program.id, workoutId: workout.id, namn: workout.name, startad: Date.now(), idx: 0, items };
}

function Ring({ kvar, av, storlek = 168 }) {
  const r = (storlek - 14) / 2, omkrets = 2 * Math.PI * r;
  const andel = av > 0 ? Math.max(0, Math.min(1, kvar / av)) : 0;
  const mm = String(Math.floor(kvar / 60)).padStart(2, "0");
  const ss = String(kvar % 60).padStart(2, "0");
  return (
    <svg width={storlek} height={storlek} style={{ display: "block" }} aria-label={`Vila ${mm}:${ss}`}>
      <circle cx={storlek / 2} cy={storlek / 2} r={r} fill="none" stroke={C.border} strokeWidth="8" />
      <circle cx={storlek / 2} cy={storlek / 2} r={r} fill="none" stroke={C.lime} strokeWidth="8"
        strokeLinecap="round" strokeDasharray={omkrets} strokeDashoffset={omkrets * (1 - andel)}
        transform={`rotate(-90 ${storlek / 2} ${storlek / 2})`}
        style={{ transition: "stroke-dashoffset 1s linear" }} />
      <text x="50%" y="49%" textAnchor="middle" dominantBaseline="middle"
        style={{ fontFamily: HFONT, fontSize: 40, fontWeight: 800, fill: C.text }}>{mm}:{ss}</text>
      <text x="50%" y="68%" textAnchor="middle"
        style={{ fontFamily: HFONT, fontSize: 12, letterSpacing: 2, fill: C.lime }}>VILA</text>
    </svg>
  );
}

function Steg({ värde, sätt, steg, enhet, min = 0 }) {
  const knapp = {
    width: 44, height: 44, borderRadius: 999, border: `1px solid ${C.border}`,
    background: C.card2, color: C.text, fontSize: 21, cursor: "pointer", lineHeight: 1,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
      <button onClick={() => sätt(Math.max(min, +(värde - steg).toFixed(1)))} style={knapp} aria-label="Minska">−</button>
      <div style={{ minWidth: 96, textAlign: "center" }}>
        <div style={{ ...hdr(27) }}>{värde ?? "—"}</div>
        <div style={{ ...label(), marginTop: 2 }}>{enhet}</div>
      </div>
      <button onClick={() => sätt(+(( värde || 0) + steg).toFixed(1))} style={knapp} aria-label="Öka">+</button>
    </div>
  );
}

export function WorkoutView({ live, setLive, sessions, setSessions, onDone, onAbort }) {
  const it = live.items[live.idx];
  const [vikt, setVikt] = useState(it ? it.vikt : null);
  const [reps, setReps] = useState(it ? it.reps : 8);
  const [vila, setVila] = useState(0);
  const timer = useRef(null);

  // Byt övning → hämta det nya förslaget.
  useEffect(() => {
    const n = live.items[live.idx];
    if (n) { setVikt(n.vikt); setReps(n.reps); }
  }, [live.idx]);

  // Nedräkning. Rensas alltid vid avmontering — annars tickar den vidare
  // osynligt och startar om nästa gång vyn öppnas.
  useEffect(() => {
    if (vila <= 0) return;
    timer.current = setTimeout(() => setVila(v => v - 1), 1000);
    return () => clearTimeout(timer.current);
  }, [vila]);

  // Kontinuerlig persistens: varje ändring skrivs direkt.
  useEffect(() => { save("live", live); }, [live]);

  if (!it) return null;

  const klara = it.loggade.length;
  const totaltSet = live.items.reduce((a, x) => a + x.set, 0);
  const klaraSet = live.items.reduce((a, x) => a + x.loggade.length, 0);
  const förra = klara > 0 ? it.loggade[klara - 1] : null;

  const saknarVikt = it.yttreVikt && !(vikt > 0);

  const avslutaSet = () => {
    if (saknarVikt) return;
    const nya = live.items.map((x, i) => i === live.idx
      ? { ...x, loggade: [...x.loggade, { vikt, reps }] } : x);
    const sista = klara + 1 >= it.set;
    const nästaIdx = sista ? Math.min(live.idx + 1, live.items.length - 1) : live.idx;
    setLive({ ...live, items: nya, idx: nästaIdx });
    setVila(it.vila);
  };

  const avsluta = () => {
    const sets = [];
    live.items.forEach(x => x.loggade.forEach(l => sets.push({ exerciseId: x.exId, weight: l.vikt, reps: l.reps })));
    if (!sets.length) { onAbort(); return; }
    const session = buildSession({
      sets, source: "training", title: live.namn,
      programId: live.programId, workoutId: live.workoutId, completedAt: Date.now(),
    });
    setSessions(s => [...s, session]);
    save("live", null);
    onDone({ session, minuter: Math.max(1, Math.round((Date.now() - live.startad) / 60000)) });
  };

  const allaKlara = klaraSet >= totaltSet;

  return (
    <div style={{ padding: "14px 18px 92px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onAbort} style={{ background: "none", border: "none", color: C.text, fontSize: 22, cursor: "pointer", padding: 6 }} aria-label="Tillbaka">‹</button>
        <div style={hdr(15)}>Pågående pass</div>
        <span style={{ width: 34 }} />
      </div>

      {/* Setprogression: en stapel per set i hela passet */}
      <div style={{ display: "flex", gap: 3, marginTop: 12 }}>
        {live.items.map((x, i) => (
          <div key={i} style={{ flex: x.set, display: "flex", gap: 2 }}>
            {Array.from({ length: x.set }).map((_, j) => (
              <div key={j} style={{ flex: 1, height: 4, borderRadius: 2,
                background: j < x.loggade.length ? C.lime : (i === live.idx && j === klara ? C.muted : C.border) }} />
            ))}
          </div>
        ))}
      </div>

      <div style={{ ...card, marginTop: 14, display: "flex", padding: "13px 4px" }}>
        {[["Passtid", `${Math.max(0, Math.round((Date.now() - live.startad) / 60000))}`, "min"],
          ["Set klara", `${klaraSet}`, `av ${totaltSet}`],
          ["Övning", `${live.idx + 1}`, `av ${live.items.length}`]].map(([l, v, e], i) => (
          <div key={l} style={{ flex: 1, textAlign: "center", borderLeft: i ? `1px solid ${C.border}` : "none" }}>
            <div style={label()}>{l}</div>
            <div style={{ ...hdr(20), marginTop: 3 }}>{v}</div>
            <div style={{ fontSize: 10.5, color: C.muted }}>{e}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 22 }}>
        <div style={hdr(29)}>{it.namn}</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
          Set {Math.min(klara + 1, it.set)} av {it.set}
          {it.repMin && it.repMax ? ` · ${it.repMin}–${it.repMax} reps` : ""}
        </div>
        {it.förslag && <div style={{ fontSize: 12, color: C.lime, marginTop: 5 }}>{it.förslag}</div>}
      </div>

      {vila > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 20 }}>
          <Ring kvar={vila} av={it.vila} />
          <button onClick={() => setVila(0)} style={{ ...btnGhost, marginTop: 16, maxWidth: 220 }}>Hoppa över vilan</button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
            <div style={{ ...card, flex: 1, padding: "14px 6px" }}>
              <div style={{ ...label(), textAlign: "center", marginBottom: 8 }}>Vikt</div>
              <Steg värde={vikt} sätt={setVikt} steg={2.5} enhet="kg" />
            </div>
            <div style={{ ...card, flex: 1, padding: "14px 6px" }}>
              <div style={{ ...label(), textAlign: "center", marginBottom: 8 }}>Reps</div>
              <Steg värde={reps} sätt={setReps} steg={1} enhet="reps" min={1} />
            </div>
          </div>

          {förra && (
            <div style={{ textAlign: "center", fontSize: 12, color: C.muted, marginTop: 10 }}>
              Förra setet: {förra.vikt ?? "—"} kg × {förra.reps}
            </div>
          )}

          <button onClick={avslutaSet} disabled={saknarVikt}
            style={{ ...btnPrimary, marginTop: 18, opacity: saknarVikt ? 0.4 : 1, cursor: saknarVikt ? "not-allowed" : "pointer" }}>
            Avsluta set <span style={{ fontSize: 19 }}>✓</span>
          </button>
          {saknarVikt && (
            <div style={{ textAlign: "center", fontSize: 12, color: C.recovering, marginTop: 9 }}>
              Ange vikten först — annars kan passet inte räknas in i belastningen.
            </div>
          )}
        </>
      )}

      <button onClick={avsluta} style={{ ...btnGhost, marginTop: 12, borderColor: allaKlara ? C.lime : C.border, color: allaKlara ? C.lime : C.text }}>
        {allaKlara ? "Avsluta passet" : "Avsluta i förtid"}
      </button>
      {!allaKlara && klaraSet > 0 && (
        <div style={{ textAlign: "center", fontSize: 11.5, color: C.muted, marginTop: 8 }}>
          {klaraSet} loggade set sparas — inget kastas.
        </div>
      )}
    </div>
  );
}

/** Efter passet: kvitto på vad som faktiskt loggades. */
export function DoneView({ resultat, onHome }) {
  const { session, minuter } = resultat;
  const sets = session.sets || [];
  const volym = sets.reduce((a, s) => a + (s.weight || 0) * (s.reps || 0), 0);
  const perÖvning = {};
  sets.forEach(s => {
    const o = perÖvning[s.exerciseId] || (perÖvning[s.exerciseId] = { set: 0, max: 0 });
    o.set++; if (s.weight > o.max) o.max = s.weight;
  });

  return (
    <div style={{ padding: "22px 18px 92px" }}>
      <div style={{ textAlign: "center" }}>
        <svg width="76" height="76" viewBox="0 0 76 76" style={{ display: "block", margin: "6px auto 14px" }} aria-hidden>
          <circle cx="38" cy="38" r="34" fill="none" stroke={C.lime} strokeWidth="2.5" />
          <path d="M23 39 l10 10 l20 -22" fill="none" stroke={C.lime} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={hdr(26)}>Passet är loggat</div>
        <div style={{ fontSize: 13.5, color: C.muted, marginTop: 7 }}>{session.title}</div>
      </div>

      <div style={{ ...card, marginTop: 22, display: "flex", padding: "15px 4px" }}>
        {[["Tid", minuter, "min"], ["Set", sets.length, "totalt"], ["Volym", Math.round(volym), "kg"]].map(([l, v, e], i) => (
          <div key={l} style={{ flex: 1, textAlign: "center", borderLeft: i ? `1px solid ${C.border}` : "none" }}>
            <div style={label()}>{l}</div>
            <div style={{ ...hdr(23), marginTop: 3 }}>{v}</div>
            <div style={{ fontSize: 10.5, color: C.muted }}>{e}</div>
          </div>
        ))}
      </div>

      <div style={{ ...label(), marginTop: 24, marginBottom: 6 }}>Övningar</div>
      {Object.entries(perÖvning).map(([id, o]) => (
        <div key={id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 2px", borderBottom: `1px solid ${C.border}`, fontSize: 13.5 }}>
          <span>{(EXERCISES.find(e => e.id === id) || {}).name || id}</span>
          <span style={{ color: C.muted }}>{o.set} set · {o.max} kg</span>
        </div>
      ))}

      <button onClick={onHome} style={{ ...btnPrimary, marginTop: 26 }}>Tillbaka till hem <span style={{ fontSize: 19 }}>→</span></button>
    </div>
  );
}
