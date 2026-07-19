// FEATURE: Maskindatabas (märkes- & gym-specifik) — sökbar prototyp
import { useState, useMemo } from "react";
import { Card, CardLabel } from "../../components/common/index.jsx";
import { T, btn, input } from "../../data/tokens.js";
import { usePersistentState } from "../../app/persist.js";
import { RESISTANCE_TYPES, MACHINE_MODELS } from "../../data/machines.js";
import {
  allResolvedModels, resolveModel, searchMachines, filterOptions, clubById, clubLabel,
  exerciseName, muscleName, verificationLabel, verificationColor, verificationAge,
  recordMachinePR, machineProgress, verifiedAlternativesForType, machineType,
} from "../../engines/machines.js";

const chip = on => ({ padding: "5px 11px", borderRadius: 999, border: `1px solid ${on ? T.accent.primary : T.bg.muted}`, background: on ? "rgba(77,163,255,0.14)" : T.bg.raised, color: on ? T.text.primary : T.text.secondary, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" });
const sub = { fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: T.text.muted, textTransform: "uppercase" };
const RESISTANCE_SHORT = { selectorized: "Magasin", "plate-loaded": "Viktskivor", cable: "Kabel", "bodyweight-assisted": "Assisterad", "free-weight": "Fria vikter" };

// Egna, upphovsrättsfria SVG-kategoriikoner (inga tillverkarbilder).
const CAT_COLOR = { Chest: "#4DA3FF", Back: "#9B7CFF", Shoulders: "#39D98A", Arms: "#FFD166", Legs: "#FF9F43", Glutes: "#FF5C9E", Calves: "#5AD1E3", Core: "#FF5C5C", "Full body": "#A7B0BE" };
const CAT_PATHS = {
  Chest: <><rect x="10" y="16" width="12" height="4" rx="2" /><rect x="26" y="16" width="12" height="4" rx="2" /><path d="M24 12v16" /></>,
  Back: <><path d="M24 10v18" /><path d="M14 14l10 8 10-8" /><path d="M16 26h16" /></>,
  Shoulders: <><circle cx="24" cy="26" r="6" /><path d="M24 20V10M18 14l6-5 6 5" /></>,
  Arms: <><path d="M14 30V18a4 4 0 0 1 8 0" /><path d="M22 18l6 6" /><circle cx="30" cy="26" r="3" /></>,
  Legs: <><path d="M18 10v9l-4 9M30 10v9l4 9" /><path d="M18 19h12" /></>,
  Glutes: <><path d="M14 16h20" /><path d="M16 16c0 8 4 12 8 12s8-4 8-12" /></>,
  Calves: <><path d="M20 10v12l-4 8" /><path d="M16 30h10" /></>,
  Core: <><rect x="16" y="12" width="16" height="16" rx="4" /><path d="M24 12v16M18 20h12" /></>,
  "Full body": <><rect x="14" y="10" width="20" height="24" rx="2" /><path d="M24 10v24M14 22h20" /></>,
};
function MachineGlyph({ category, size = 34 }) {
  const col = CAT_COLOR[category] || T.text.secondary;
  return (
    <span style={{ width: size, height: size, flexShrink: 0, borderRadius: 9, background: `${col}1f`, border: `1px solid ${col}44`, display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-hidden>
      <svg width={size - 12} height={size - 12} viewBox="0 0 48 40" fill="none" stroke={col} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {CAT_PATHS[category] || <circle cx="24" cy="20" r="9" />}
      </svg>
    </span>
  );
}

function VerBadge({ v, date }) {
  const age = verificationAge(date);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 700, color: verificationColor(v, T), border: `1px solid ${verificationColor(v, T)}66`, borderRadius: 999, padding: "2px 8px" }}>
      {verificationLabel(v)}{date ? ` · ${date}${age.stale ? " ⚠" : ""}` : ""}
    </span>
  );
}

function MachineCard({ m, onOpen, invMeta }) {
  return (
    <button onClick={onOpen} style={{ textAlign: "left", cursor: "pointer", border: `1px solid ${T.bg.muted}`, borderRadius: 13, background: "linear-gradient(160deg, rgba(30,40,54,0.5), rgba(16,22,32,0.5))", padding: 13, display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <MachineGlyph category={m.category} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text.primary }}>{m.brand} {m.model}</div>
            <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 1 }}>{m.typeName} · {m.category}</div>
          </div>
        </div>
        {invMeta && <VerBadge v={invMeta.verification} date={invMeta.lastVerified} />}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11, color: T.text.secondary }}>
        <span style={{ background: T.bg.surface, borderRadius: 6, padding: "2px 7px" }}>{RESISTANCE_SHORT[m.resistance] || m.resistance}</span>
        <span style={{ background: T.bg.surface, borderRadius: 6, padding: "2px 7px" }}>{m.pattern}</span>
        <span style={{ background: T.bg.surface, borderRadius: 6, padding: "2px 7px" }}>{m.design}</span>
      </div>
    </button>
  );
}

function PRPanel({ model, prs, setPrs }) {
  const [exId, setExId] = useState(model.exercises[0] || "");
  const [val, setVal] = useState("");
  const prog = exId ? machineProgress(prs, model.id, exId) : null;
  const save = () => { const v = +val; if (!(v > 0) || !exId) return; setPrs(p => recordMachinePR(p, model.id, exId, v)); setVal(""); };
  return (
    <div style={{ marginTop: 12, border: `1px solid ${T.bg.muted}`, borderRadius: 10, padding: "11px 13px", background: T.bg.raised }}>
      <div style={{ ...sub, marginBottom: 7 }}>PR & progression — per denna modell</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ fontSize: 11, color: T.text.muted }}>Övning<br />
          <select value={exId} onChange={e => setExId(e.target.value)} style={{ ...input, width: 190, padding: "8px 10px" }}>
            {model.exercises.map(x => <option key={x} value={x}>{exerciseName(x)}</option>)}
          </select></label>
        <label style={{ fontSize: 11, color: T.text.muted }}>Vikt/nivå<br />
          <input type="number" value={val} placeholder="—" onChange={e => setVal(e.target.value)} style={{ ...input, width: 90, padding: "8px 10px" }} /></label>
        <button onClick={save} style={{ ...btn.primary, padding: "8px 14px", fontSize: 12.5 }}>Logga</button>
      </div>
      {prog ? (
        <div style={{ fontSize: 12, color: T.text.secondary, marginTop: 9, lineHeight: 1.5 }}>
          Bästa: <b style={{ color: T.text.primary }}>{prog.best}</b> · senast {prog.last} · baslinje {prog.baseline} · {prog.entries} loggn.
          <span style={{ color: prog.deltaFromBaseline >= 0 ? T.accent.success : T.text.muted }}> ({prog.deltaFromBaseline >= 0 ? "+" : ""}{prog.deltaFromBaseline} mot baslinje)</span>
        </div>
      ) : <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 9 }}>Ingen historik för denna modell ännu. Första loggningen blir din baslinje — byte av maskin räknas aldrig som styrkeförlust.</div>}
    </div>
  );
}

function MachineDetail({ model, prs, setPrs, myClubId, community, onClose }) {
  const alts = myClubId ? verifiedAlternativesForType(model.typeId, myClubId, community) : [];
  const Row = ({ label, items }) => items.length ? (
    <div style={{ marginTop: 10 }}>
      <div style={{ ...sub, marginBottom: 4 }}>{label}</div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: T.text.secondary, lineHeight: 1.5 }}>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  ) : null;
  return (
    <Card>
      <button onClick={onClose} style={{ background: "none", border: "none", color: T.accent.primary, cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 6 }}>‹ Tillbaka till listan</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <MachineGlyph category={model.category} size={52} />
          <div>
            <div style={{ fontSize: 19, fontWeight: 800 }}>{model.brand} {model.model}</div>
            <div style={{ fontSize: 12.5, color: T.text.muted, marginTop: 2 }}>{model.typeName} ({model.typeNameEn}) · {model.category} · {model.pattern}</div>
            <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 1 }}>Tillverkare: {model.manufacturer}{model.series ? ` · ${model.series}` : ""} · {model.design}</div>
          </div>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 700, color: verificationColor(model.source.verified ? "verified" : "unverified", T), border: `1px solid ${verificationColor(model.source.verified ? "verified" : "unverified", T)}66`, borderRadius: 999, padding: "3px 9px" }}>
          {model.source.verified ? "Verifierad källa" : "Ej verifierad källa"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
        <span style={{ background: T.bg.raised, border: `1px solid ${T.bg.muted}`, borderRadius: 7, padding: "4px 9px", fontSize: 11.5, color: T.text.secondary }}>{RESISTANCE_TYPES[model.resistance] || model.resistance}</span>
        {model.muscles.map(mu => <span key={mu.muscleId} style={{ background: T.bg.raised, border: `1px solid ${T.bg.muted}`, borderRadius: 7, padding: "4px 9px", fontSize: 11.5, color: T.text.secondary }}>{muscleName(mu.muscleId)}{mu.factor >= 0.7 ? "" : " ·"}</span>)}
      </div>

      <div style={{ marginTop: 10 }}>
        <div style={{ ...sub, marginBottom: 4 }}>Övningar på denna maskin</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{model.exercises.map(x => <span key={x} style={{ background: "rgba(77,163,255,0.12)", border: `1px solid ${T.accent.primary}55`, borderRadius: 7, padding: "4px 9px", fontSize: 12, color: T.text.primary }}>{exerciseName(x)}</span>)}</div>
      </div>

      <Row label="Inställning" items={model.setup} />
      <Row label="Justeringar" items={model.adjustments} />
      <Row label="Vanliga fel" items={model.commonErrors} />

      {model.alternatives.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ ...sub, marginBottom: 4 }}>Alternativa maskintyper</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 12, color: T.text.secondary }}>{model.alternatives.map(a => <span key={a} style={{ background: T.bg.raised, borderRadius: 7, padding: "3px 8px" }}>{(machineType(a) || {}).name || a}</span>)}</div>
          {myClubId && (alts.length
            ? <div style={{ fontSize: 12, color: T.text.secondary, marginTop: 7 }}>Finns på din klubb: {alts.map((a, i) => <span key={i} style={{ color: a.verification === "verified" ? T.accent.success : T.text.secondary }}>{a.model.brand} {a.model.model} ({verificationLabel(a.verification)}){i < alts.length - 1 ? ", " : ""}</span>)}</div>
            : <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 7 }}>Inget av alternativen är noterat på din valda klubb ännu.</div>)}
        </div>
      )}

      <div style={{ fontSize: 11, color: T.text.muted, marginTop: 10, lineHeight: 1.45 }}>
        Källa: {model.source.url ? <a href={model.source.url} target="_blank" rel="noreferrer" style={{ color: T.accent.primary }}>{model.source.url.replace(/^https?:\/\//, "")}</a> : "—"}{model.source.note ? ` · ${model.source.note}` : ""}. Ingen tillverkarbild visas utan dokumenterad användningsrätt.
      </div>

      <PRPanel model={model} prs={prs} setPrs={setPrs} />
    </Card>
  );
}

function ReportForm({ community, setCommunity, onDone }) {
  const opts = filterOptions();
  const [clubId, setClubId] = useState(opts.clubs[0]?.id || "");
  const [modelId, setModelId] = useState(MACHINE_MODELS[0]?.id || "");
  const [photo, setPhoto] = useState(null);
  const add = () => {
    if (!clubId || !modelId) return;
    setCommunity(list => [...(list || []), { clubId, machineModelId: modelId, verification: "community", lastVerified: new Date().toISOString().slice(0, 10), source: "Användarrapport (ej granskad)", photo }]);
    setPhoto(null); onDone && onDone();
  };
  const onFile = e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setPhoto(r.result); r.readAsDataURL(f); };
  return (
    <Card>
      <CardLabel>Rapportera en maskin</CardLabel>
      <div style={{ fontSize: 12, color: T.text.muted, margin: "2px 0 10px", lineHeight: 1.45 }}>Saknas en maskin i listan för din klubb? Rapportera den. Community-rapporter markeras som ogranskade tills de verifierats. Egen bild sparas bara lokalt — ladda inte upp tillverkarens produktbilder.</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ fontSize: 11, color: T.text.muted }}>Klubb<br />
          <select value={clubId} onChange={e => setClubId(e.target.value)} style={{ ...input, width: 230, padding: "8px 10px" }}>{opts.clubs.map(c => <option key={c.id} value={c.id}>{clubLabel(c)}</option>)}</select></label>
        <label style={{ fontSize: 11, color: T.text.muted }}>Maskinmodell<br />
          <select value={modelId} onChange={e => setModelId(e.target.value)} style={{ ...input, width: 260, padding: "8px 10px" }}>{MACHINE_MODELS.map(m => { const r = resolveModel(m.id); return <option key={m.id} value={m.id}>{r.brand} {r.model}</option>; })}</select></label>
        <label style={{ fontSize: 11, color: T.text.muted }}>Foto (valfritt)<br />
          <input type="file" accept="image/*" onChange={onFile} style={{ fontSize: 11, color: T.text.secondary, width: 190 }} /></label>
        <button onClick={add} style={{ ...btn.primary, padding: "8px 16px", fontSize: 12.5 }}>Skicka rapport</button>
      </div>
      {photo && <div style={{ fontSize: 11, color: T.accent.warning, marginTop: 8 }}>Bild bifogad (lokalt, ogranskad).</div>}
    </Card>
  );
}

function MachinesView({ mode }) {
  const [myClubId, setMyClubId] = usePersistentState("machines.myClub", mode === "demo" ? "club_nw_gardet" : null, mode);
  const [prs, setPrs] = usePersistentState("machines.prs", {}, mode);
  const [community, setCommunity] = usePersistentState("machines.community", [], mode);
  const [open, setOpen] = useState(null); // modelId
  const [report, setReport] = useState(false);
  const [f, setF] = useState({ query: "", chainId: "", clubId: "", brandId: "", typeId: "", muscleId: "", pattern: "", resistance: "", category: "" });
  const [myGymOnly, setMyGymOnly] = useState(false);
  const opts = useMemo(() => filterOptions(), []);

  const effClub = myGymOnly && myClubId ? myClubId : f.clubId;
  const results = useMemo(() => searchMachines({ ...f, clubId: effClub, community }), [f, effClub, community]);

  // inventariemeta för korten (när en klubb är vald)
  const invByModel = useMemo(() => {
    if (!effClub) return {};
    const club = clubById(effClub); const map = {};
    (club ? club.inventory : []).forEach(i => { map[i.machineModelId] = i; });
    community.filter(r => r.clubId === effClub).forEach(r => { if (!map[r.machineModelId]) map[r.machineModelId] = { verification: "community", lastVerified: r.lastVerified }; });
    return map;
  }, [effClub, community]);

  if (open) { const model = resolveModel(open); if (model) return <MachineDetail model={model} prs={prs} setPrs={setPrs} myClubId={myClubId} community={community} onClose={() => setOpen(null)} />; }

  const set = (k, v) => setF(s => ({ ...s, [k]: s[k] === v ? "" : v }));
  const clubsForChain = f.chainId ? opts.clubs.filter(c => c.chainId === f.chainId) : opts.clubs;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div>
            <CardLabel>Min klubb</CardLabel>
            <div style={{ fontSize: 12, color: T.text.muted, marginTop: 2 }}>Väljs för att filtrera på tillgänglig utrustning — coachen och programbyggaren kan då föreslå det som faktiskt finns där.</div>
          </div>
          <button onClick={() => setReport(r => !r)} style={{ ...btn.pill, padding: "8px 14px" }}>{report ? "Stäng rapport" : "+ Rapportera maskin"}</button>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginTop: 10 }}>
          <select value={myClubId || ""} onChange={e => setMyClubId(e.target.value || null)} style={{ ...input, width: 280, padding: "9px 11px" }}>
            <option value="">— Välj din vanliga klubb —</option>
            {opts.chains.map(ch => <optgroup key={ch.id} label={ch.name}>{opts.clubs.filter(c => c.chainId === ch.id).map(c => <option key={c.id} value={c.id}>{c.name}{c.city ? ` (${c.city})` : ""}</option>)}</optgroup>)}
          </select>
          {myClubId && <button onClick={() => setMyGymOnly(v => !v)} style={chip(myGymOnly)}>Visa bara min klubb</button>}
        </div>
      </Card>

      {report && <ReportForm community={community} setCommunity={setCommunity} onDone={() => setReport(false)} />}

      <Card>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <input value={f.query} onChange={e => setF(s => ({ ...s, query: e.target.value }))} placeholder="Sök märke, modell, maskintyp eller övning…" style={{ ...input, flex: 1, padding: "9px 12px" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <FilterRow label="Kedja" items={[["", "Alla"], ...opts.chains.map(c => [c.id, c.name])]} value={f.chainId} onPick={v => setF(s => ({ ...s, chainId: v, clubId: "" }))} />
          <FilterRow label="Klubb" items={[["", "Alla"], ...clubsForChain.map(c => [c.id, `${c.name}${c.city ? ` (${c.city})` : ""}`])]} value={f.clubId} onPick={v => setF(s => ({ ...s, clubId: v }))} />
          <FilterRow label="Märke" items={[["", "Alla"], ...opts.brands.map(b => [b.id, b.name])]} value={f.brandId} onPick={v => set("brandId", v)} />
          <FilterRow label="Maskintyp" items={[["", "Alla"], ...opts.types.map(t => [t.id, t.name])]} value={f.typeId} onPick={v => set("typeId", v)} />
          <FilterRow label="Muskel" items={[["", "Alla"], ...opts.muscles.map(m => [m.id, m.name])]} value={f.muscleId} onPick={v => set("muscleId", v)} />
          <FilterRow label="Rörelsemönster" items={[["", "Alla"], ...opts.patterns.map(p => [p, p])]} value={f.pattern} onPick={v => set("pattern", v)} />
          <FilterRow label="Motstånd" items={[["", "Alla"], ...opts.resistances.map(r => [r, RESISTANCE_SHORT[r] || r])]} value={f.resistance} onPick={v => set("resistance", v)} />
        </div>
      </Card>

      <div style={{ fontSize: 12.5, color: T.text.secondary }}>{results.length} maskinmodell{results.length === 1 ? "" : "er"}{effClub ? ` på ${clubLabel(clubById(effClub))}` : ""}.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12 }}>
        {results.map(m => <MachineCard key={m.id} m={m} invMeta={invByModel[m.id]} onOpen={() => setOpen(m.id)} />)}
      </div>
      {results.length === 0 && <div style={{ fontSize: 13, color: T.text.muted }}>Inga maskiner matchar filtren. Nollställ ett filter eller rapportera en saknad maskin.</div>}
    </div>
  );
}

function FilterRow({ label, items, value, onPick }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
      <div style={{ ...sub, width: 110, flexShrink: 0 }}>{label}</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{items.map(([v, lab]) => <button key={v || "all"} onClick={() => onPick(v)} style={chip(value === v || (v === "" && !value))}>{lab}</button>)}</div>
    </div>
  );
}

export { MachinesView };
