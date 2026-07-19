// FEATURE: Profile
import React, { useState } from "react";
import { Card, CardLabel, Stepper, SportIcon } from "../../components/common/index.jsx";
import { pendingFromBridge, clearBridge, onBridgeChange } from "../../engines/bridge.js";
import { buildBackup, backupFilename, inspectBackup, restoreBackup, persistentStorageStatus, requestPersistentStorage } from "../../engines/backup.js";
import { best1RM, computeCardioLoad, computeSportLoad, readImage, metricSeries, latestMetric, workoutStreak, ACTIVITY_LEVELS, DIETS, DIET_APPROACHES, DIET_RESTRICTIONS } from "../../engines/index.js";
import { clearModeData, clearAllAtlasData, exportRealData, getMode } from "../../app/persist.js";
import { SPORTS, CARDIO, SPORT_INTENSITY, STRENGTH_STD, resolveActivity, DEFAULT_ACTIVE_SPORTS } from "../../data/exercises.js";
import { MUSCLES } from "../../data/muscles.js";
import { T, btn, input, lbl, modal, now, overlay } from "../../data/tokens.js";
import { bodyComposition, derivedBodyFat } from "../../engines/bodyfat.js";
import { GOAL_TYPES, GOAL_AXES, defaultGoalProfile } from "../../engines/goal.js";
import { getLlmConfig, setLlmConfig, testKey, CLAUDE_MODELS } from "../../app/llm.js";
import { buildSession } from "../../engines/session.js";

// ── Importera pass loggade i mobil-appen (klistra in exportkoden) ──

function BackupCard() {
  const [status, setStatus] = React.useState(null);
  const [pending, setPending] = React.useState(null);   // granskad fil som väntar på bekräftelse
  const [msg, setMsg] = React.useState(null);
  React.useEffect(() => { persistentStorageStatus().then(setStatus); }, []);

  const save = () => {
    const b = buildBackup();
    const blob = new Blob([JSON.stringify(b, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = backupFilename(); a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setMsg({ kind: "ok", text: `Backup sparad · ${b.summary.sessions} pass och ${b.summary.foodLog} matposter.` });
  };
  const pick = e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => { const res = inspectBackup(String(ev.target.result)); if (!res.ok) { setMsg({ kind: "error", text: res.error }); setPending(null); } else { setPending(res); setMsg(null); } };
    r.readAsText(f); e.target.value = "";
  };
  const confirm = () => {
    const res = restoreBackup(pending.obj, { replace: true });
    if (!res.ok) { setMsg({ kind: "error", text: res.error }); return; }
    setPending(null);
    setMsg({ kind: "ok", text: "Backupen är inläst. Sidan laddas om…" });
    setTimeout(() => window.location.reload(), 900);
  };
  const ask = async () => { const ok = await requestPersistentStorage(); setStatus(await persistentStorageStatus()); setMsg({ kind: ok ? "ok" : "error", text: ok ? "Beständig lagring beviljad — data rensas inte automatiskt." : "Webbläsaren beviljade inte beständig lagring. Ta en backup då och då i stället." }); };
  const mb = n => n == null ? null : (n / 1048576).toFixed(1);

  return (
    <Card>
      <CardLabel>Datasäkerhet</CardLabel>
      <div style={{ fontSize: 12.5, color: T.text.secondary, lineHeight: 1.6, marginBottom: 12 }}>
        All din data ligger i den här webbläsaren. Rensar du webbläsardata — eller låter appen ligga oanvänd länge på en iPhone — kan den försvinna. Ta en backup med jämna mellanrum.
      </div>
      {status && status.supported && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "9px 11px", background: T.bg.raised, borderRadius: 10, marginBottom: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12 }}>
            <span style={{ color: status.persisted ? T.accent.success : T.accent.warning, fontWeight: 700 }}>{status.persisted ? "Beständig lagring på" : "Beständig lagring av"}</span>
            {status.usage != null && <span style={{ color: T.text.muted }}> · {mb(status.usage)} MB använt{status.quota ? ` av ${mb(status.quota)} MB` : ""}</span>}
          </div>
          {!status.persisted && <button onClick={ask} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${T.accent.primary}`, background: "transparent", color: T.accent.primary, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Slå på</button>}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={save} style={{ flex: 1, minWidth: 140, padding: "10px", borderRadius: 10, border: "none", background: T.accent.primary, color: "#08101c", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Spara backup</button>
        <label style={{ flex: 1, minWidth: 140, padding: "10px", borderRadius: 10, border: `1px solid ${T.bg.muted}`, background: "transparent", color: T.text.secondary, fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "center" }}>
          Läs in backup
          <input type="file" accept="application/json,.json" onChange={pick} style={{ display: "none" }} />
        </label>
      </div>
      {pending && (
        <div style={{ marginTop: 11, padding: "11px 12px", background: "rgba(255,209,102,0.10)", borderRadius: 10 }}>
          <div style={{ fontSize: 12.5, color: T.text.primary, lineHeight: 1.55 }}>
            Backupen innehåller <b>{pending.summary.sessions} pass</b> och <b>{pending.summary.foodLog} matposter</b>{pending.createdAt ? `, sparad ${new Date(pending.createdAt).toLocaleDateString("sv-SE")}` : ""}. Att läsa in den <b>ersätter all nuvarande data</b> i appen.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={confirm} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: T.accent.warning, color: "#08101c", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Ja, ersätt min data</button>
            <button onClick={() => setPending(null)} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${T.bg.muted}`, background: "transparent", color: T.text.secondary, fontSize: 12.5, cursor: "pointer" }}>Avbryt</button>
          </div>
        </div>
      )}
      {msg && <div style={{ marginTop: 10, fontSize: 12, color: msg.kind === "ok" ? T.accent.success : T.accent.danger, lineHeight: 1.5 }}>{msg.text}</div>}
    </Card>
  );
}

function MobileImport({ sessions, setSessions, foodLog, setFoodLog, measurements, setMeasurements }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState(null);
  // Automatisk brygga: mobilen på samma domän lämnar material i en delad brevlåda.
  const [pending, setPending] = useState(() => pendingFromBridge({ sessions, foodLog, measurements }));
  React.useEffect(() => setPending(pendingFromBridge({ sessions, foodLog, measurements })), [sessions, foodLog, measurements]);
  React.useEffect(() => onBridgeChange(() => setPending(pendingFromBridge({ sessions, foodLog, measurements }))), [sessions, foodLog, measurements]);
  const takePending = () => {
    const fresh = pending.sessions.map(x => buildSession({ ...x, bodyweight: x.bodyweightAtLog }));
    if (fresh.length) setSessions(list => [...(list || []), ...fresh].sort((a, b) => a.completedAt - b.completedAt));
    if (pending.food.length && setFoodLog) setFoodLog(list => [...(list || []), ...pending.food].sort((a, b) => a.ts - b.ts));
    // Mobilens vikter blir mätpunkter här — samma form som när du väger dig i webbappen.
    if (pending.weights.length && setMeasurements) {
      setMeasurements(list => [...(list || []), ...pending.weights.map(w => ({ date: w.ts, weight: w.kg }))].sort((a, b) => a.date - b.date));
    }
    const parts = [];
    if (fresh.length) parts.push(`${fresh.length} pass`);
    if (pending.food.length) parts.push(`${pending.food.length} matposter`);
    if (pending.weights.length) parts.push(`${pending.weights.length} vikter`);
    clearBridge();
    setPending({ sessions: [], food: [], ts: null });
    setStatus({ kind: "ok", msg: `\u2713 H\u00e4mtade ${parts.join(" och ")} fr\u00e5n mobilen.` });
  };
  const doImport = () => {
    if (!code.trim()) { setStatus({ kind: "error", msg: "Klistra in en kod först." }); return; }
    try {
      const payload = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      const incoming = (payload && payload.sessions) || [];
      const incomingFood = (payload && payload.food) || [];
      if (!incoming.length && !incomingFood.length) { setStatus({ kind: "error", msg: "Koden innehöll inga pass eller matposter." }); return; }
      const have = new Set((sessions || []).map(s => s.id));
      const fresh = incoming.filter(s => s && s.id && !have.has(s.id)).map(s => buildSession({ ...s, bodyweight: s.bodyweightAtLog }));
      const haveFood = new Set((foodLog || []).map(f => f.id));
      const freshFood = incomingFood.filter(f => f && f.id && !haveFood.has(f.id));
      if (!fresh.length && !freshFood.length) { setStatus({ kind: "ok", msg: "Allt i koden fanns redan — inget nytt importerades." }); return; }
      if (fresh.length) setSessions(list => [...(list || []), ...fresh].sort((a, b) => a.completedAt - b.completedAt));
      if (freshFood.length && setFoodLog) setFoodLog(list => [...(list || []), ...freshFood].sort((a, b) => a.ts - b.ts));
      const parts = [];
      if (fresh.length) parts.push(`${fresh.length} pass`);
      if (freshFood.length) parts.push(`${freshFood.length} matposter`);
      setStatus({ kind: "ok", msg: `✓ Importerade ${parts.join(" och ")} från mobilen.` });
      setCode("");
    } catch (e) {
      setStatus({ kind: "error", msg: "Kunde inte läsa koden — kontrollera att hela koden kopierades." });
    }
  };
  return (
    <Card>
      <CardLabel>Importera från mobil</CardLabel>
      {(pending.sessions.length > 0 || pending.food.length > 0 || pending.weights.length > 0) && (
        <div style={{ padding: "12px 13px", background: "rgba(57,217,138,0.10)", border: `1px solid ${T.accent.success}44`, borderRadius: 10, margin: "2px 0 12px" }}>
          <div style={{ fontSize: 13, color: T.text.primary, fontWeight: 700 }}>
            {[pending.sessions.length ? `${pending.sessions.length} pass` : null, pending.food.length ? `${pending.food.length} matposter` : null, pending.weights.length ? `${pending.weights.length} vikter` : null].filter(Boolean).join(", ")} väntar från mobilen
          </div>
          <div style={{ fontSize: 11.5, color: T.text.muted, lineHeight: 1.5, marginTop: 3 }}>
            Hittade automatiskt — mobilappen och webbappen delar lagring på den här enheten. Ingen kod behövs.
          </div>
          <button onClick={takePending} style={{ ...btn.primary, padding: "8px 16px", fontSize: 12.5, marginTop: 10 }}>Hämta hit</button>
        </div>
      )}
      <div style={{ fontSize: 12.5, color: T.text.muted, margin: "2px 0 10px", lineHeight: 1.5 }}>Tränar du på en annan enhet? Öppna "föra över till webben" i mobilen, kopiera koden och klistra in den här — passen fylls i automatiskt med rätt data.</div>
      <textarea value={code} onChange={e => setCode(e.target.value)} placeholder="Klistra in exportkoden från mobilen…" style={{ width: "100%", height: 70, background: T.bg.raised, color: T.text.primary, border: `1px solid ${T.bg.muted}`, borderRadius: 10, padding: 10, fontSize: 11, fontFamily: "monospace", resize: "none" }} />
      <button onClick={doImport} style={{ ...btn.primary, padding: "8px 16px", fontSize: 12.5, marginTop: 8 }}>Importera pass</button>
      {status && <div style={{ marginTop: 8, fontSize: 12.5, color: status.kind === "error" ? T.accent.danger : T.accent.success }}>{status.kind === "error" ? `⚠ ${status.msg}` : status.msg}</div>}
    </Card>
  );
}
const gchip = on => ({ padding: "6px 12px", borderRadius: 999, border: `1px solid ${on ? T.accent.primary : T.bg.muted}`, background: on ? T.accent.primary : T.bg.raised, color: on ? "#fff" : T.text.secondary, cursor: "pointer", fontSize: 12.5, fontWeight: 600 });

// ── AI-coach med egen nyckel (BYOK): leverantör Claude, nyckel lagras lokalt ──
function LlmSettings() {
  const cfg = getLlmConfig();
  const [key, setKey] = useState(cfg?.key || "");
  const [model, setModel] = useState(cfg?.model || CLAUDE_MODELS[0].id);
  const [status, setStatus] = useState(cfg ? { kind: "saved" } : null);
  const [testing, setTesting] = useState(false);
  const masked = k => k && k.length > 12 ? k.slice(0, 8) + "…" + k.slice(-4) : k;

  const save = () => { setLlmConfig({ provider: "claude", model, key: key.trim() }); setStatus({ kind: "saved" }); };
  const clear = () => { setLlmConfig(null); setKey(""); setStatus(null); };
  const test = async () => {
    if (!key.trim()) { setStatus({ kind: "error", msg: "Klistra in en nyckel först." }); return; }
    setTesting(true); setStatus({ kind: "testing" });
    const r = await testKey(key.trim(), model);
    setTesting(false);
    if (r.ok) { setLlmConfig({ provider: "claude", model, key: key.trim() }); setStatus({ kind: "ok" }); }
    else setStatus({ kind: "error", msg: r.status === 401 ? "Nyckeln avvisades (401) — kontrollera att den är rätt och att fakturering är aktiverad i konsolen." : r.error || "Anropet misslyckades." });
  };

  return (
    <Card>
      <CardLabel>AI-coach · egen API-nyckel</CardLabel>
      <div style={{ fontSize: 12.5, color: T.text.muted, margin: "2px 0 12px", lineHeight: 1.5 }}>Koppla din egen Claude-nyckel så kan coach-chatten svara i fri text — grundad i din data. Utan nyckel använder coachen sina inbyggda, datadrivna svar.</div>

      <label style={{ fontSize: 11, color: T.text.muted }}>Modell</label>
      <select value={model} onChange={e => setModel(e.target.value)} style={{ ...input, marginTop: 4, marginBottom: 12 }}>
        {CLAUDE_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
      </select>

      <label style={{ fontSize: 11, color: T.text.muted }}>API-nyckel (sk-ant-…)</label>
      <input type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="sk-ant-…" autoComplete="off" spellCheck={false} style={{ ...input, marginTop: 4, marginBottom: 10, fontFamily: "monospace" }} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={test} disabled={testing} style={{ ...btn.primary, padding: "8px 16px", fontSize: 12.5, opacity: testing ? 0.6 : 1 }}>{testing ? "Testar…" : "Testa & spara"}</button>
        <button onClick={save} style={{ ...btn.pill, padding: "8px 16px", fontSize: 12.5 }}>Spara utan test</button>
        {cfg && <button onClick={clear} style={{ ...btn.pill, padding: "8px 16px", fontSize: 12.5, color: T.accent.danger }}>Ta bort nyckel</button>}
      </div>

      {status && (
        <div style={{ marginTop: 10, fontSize: 12.5, color: status.kind === "error" ? T.accent.danger : status.kind === "ok" ? T.accent.success : T.text.secondary }}>
          {status.kind === "testing" && "Testar nyckeln…"}
          {status.kind === "ok" && "✓ Nyckeln fungerar och är sparad. Coach-chatten använder den nu."}
          {status.kind === "saved" && `Sparad${cfg?.key ? ` (${masked(cfg.key)})` : ""}. Tips: tryck "Testa & spara" för att verifiera.`}
          {status.kind === "error" && `⚠ ${status.msg}`}
        </div>
      )}

      <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,209,102,0.08)", border: `1px solid ${T.accent.warning}44`, borderRadius: 10, fontSize: 11.5, color: T.text.secondary, lineHeight: 1.5 }}>
        <b style={{ color: T.accent.warning }}>Om din nyckel:</b> den lagras bara lokalt i din webbläsare och skickas enbart till Anthropics API — aldrig någon annanstans. Sätt gärna en utgiftsgräns i console.anthropic.com så en bortglömd eller läckt nyckel inte kan överraska. Din Claude-prenumeration ger ingen API-nyckel — den skapas separat under Billing → API keys i konsolen.
      </div>
    </Card>
  );
}

// ── Mål & inriktning: sammansatt målresa (styr programförslag + coach-resonemang) ──
function GoalCard({ profile, setProfile }) {
  const gp = profile.goalProfile || defaultGoalProfile();
  const setType = type => setProfile(o => ({ ...o, goalProfile: { type, weights: { ...GOAL_TYPES[type].weights } } }));
  const setWeight = (axis, val) => setProfile(o => { const base = o.goalProfile || defaultGoalProfile(); return { ...o, goalProfile: { type: "custom", weights: { ...base.weights, [axis]: val } } }; });
  const tune = gp.type === "recomp" || gp.type === "custom" || gp.type === "general";
  return (
    <Card>
      <CardLabel>Mål & inriktning</CardLabel>
      <div style={{ fontSize: 12, color: T.text.muted, margin: "2px 0 10px", lineHeight: 1.45 }}>Styr programförslag och hur AI-coachen resonerar. Ett mål kan väga samman flera delar — t.ex. en body recomp med både muskeltillväxt och fettreducering.</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: tune ? 14 : 0 }}>
        {Object.entries(GOAL_TYPES).map(([k, o]) => <button key={k} onClick={() => setType(k)} style={gchip(gp.type === k)}>{o.label}</button>)}
        <button onClick={() => setProfile(o => ({ ...o, goalProfile: { type: "custom", weights: { ...(o.goalProfile || defaultGoalProfile()).weights } } }))} style={gchip(gp.type === "custom")}>Egen mix</button>
      </div>
      {tune && (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ fontSize: 11, color: T.text.muted }}>Finjustera vikten på varje del:</div>
          {GOAL_AXES.map(([k, lab]) => (
            <div key={k}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.text.secondary }}><span>{lab}</span><span style={{ color: T.text.muted }}>{gp.weights[k] || 0}</span></div>
              <input type="range" min="0" max="100" value={gp.weights[k] || 0} onChange={e => setWeight(k, +e.target.value)} style={{ width: "100%", accentColor: T.accent.primary }} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Kroppsfett-kalkylator (US Navy-omkretsmetoden) — används i Profil och Progress ──
function BodyFatCalculator({ profile, setProfile, measurements, setMeasurements }) {
  const latest = k => latestMetric(measurements, k);
  const [gender, setGender] = useState(profile?.gender || "male");
  const [height, setHeight] = useState(profile?.height || "");
  const [weight, setWeight] = useState(latest("weight") || profile?.weight || "");
  const [neck, setNeck] = useState(latest("neck") || (profile?.measurements && profile.measurements["Hals"]) || "");
  const [waist, setWaist] = useState(latest("waist") || (profile?.measurements && profile.measurements["Midja"]) || "");
  const [hip, setHip] = useState(latest("hip") || (profile?.measurements && profile.measurements["Höft"]) || "");
  const [saved, setSaved] = useState(false);
  const res = bodyComposition({ gender, height: +height, neck: +neck, waist: +waist, hip: +hip, weight: +weight || null });
  const bfSeries = metricSeries(measurements, "bodyFat");
  const prev = bfSeries.length ? bfSeries[bfSeries.length - 1] : null;
  const save = () => {
    if (!res) return;
    setMeasurements(list => [...(list || []), { date: Date.now(), bodyFat: res.bodyFat, ...(weight ? { weight: +weight } : {}), ...(neck ? { neck: +neck } : {}), ...(waist ? { waist: +waist } : {}), ...(gender === "female" && hip ? { hip: +hip } : {}) }]);
    if (setProfile) setProfile(p => ({ ...p, bodyFat: res.bodyFat, gender }));
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  };
  const numIn = { ...input, width: 86, padding: "8px 10px" };
  const fld = (lab, val, set, ph) => (
    <label style={{ fontSize: 11, color: T.text.muted }}>{lab}<br />
      <input type="number" value={val} placeholder={ph} onChange={e => set(e.target.value)} style={numIn} />
    </label>
  );
  return (
    <Card>
      <CardLabel>Kroppsfett-kalkylator</CardLabel>
      <div style={{ fontSize: 12, color: T.text.muted, margin: "2px 0 10px", lineHeight: 1.45 }}>Amerikanska flottans måttbandsmetod — mät hals (smalaste stället), midja ({gender === "female" ? "smalaste stället" : "vid naveln"}, avslappnat){gender === "female" ? " och höft (där rumpan är störst)" : ""}.</div>
      <div style={{ display: "flex", gap: 3, background: T.bg.raised, borderRadius: 9, padding: 3, width: "fit-content", marginBottom: 10 }}>
        {[["male", "Man"], ["female", "Kvinna"]].map(([k, lab]) => (
          <button key={k} onClick={() => setGender(k)} style={{ padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: gender === k ? T.accent.primary : "transparent", color: gender === k ? "#fff" : T.text.secondary }}>{lab}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        {fld("Längd (cm)", height, setHeight, "180")}
        {fld("Vikt (kg)", weight, setWeight, "80")}
        {fld("Hals (cm)", neck, setNeck, "38")}
        {fld("Midja (cm)", waist, setWaist, "85")}
        {gender === "female" && fld("Höft (cm)", hip, setHip, "98")}
      </div>
      {res ? (
        <div style={{ marginTop: 12, border: `1px solid ${T.bg.muted}`, borderRadius: 10, padding: "11px 13px", background: T.bg.raised }}>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "baseline" }}>
            <div><span style={{ fontSize: 24, fontWeight: 800, color: T.accent.primary }}>{res.bodyFat}%</span> <span style={{ fontSize: 12, color: T.text.muted }}>kroppsfett · {res.category}</span></div>
            {res.leanMass != null && <div style={{ fontSize: 13, color: T.text.secondary }}>Fettfri massa: <b style={{ color: T.text.primary }}>{res.leanMass} kg</b></div>}
            {res.fatMass != null && <div style={{ fontSize: 13, color: T.text.secondary }}>Fettmassa: <b style={{ color: T.text.primary }}>{res.fatMass} kg</b></div>}
          </div>
          {prev && <div style={{ fontSize: 12, color: T.text.secondary, marginTop: 6 }}>Senast sparat: {prev.value}% ({new Date(prev.date).toLocaleDateString("sv-SE")}) → {res.bodyFat > prev.value ? "+" : ""}{(res.bodyFat - prev.value).toFixed(1)} %-enheter</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            <button onClick={save} style={{ ...btn.primary, padding: "8px 16px", fontSize: 12.5 }}>{saved ? "✓ Sparat" : "Spara mätning"}</button>
            <span style={{ fontSize: 11, color: T.text.muted }}>Sparas i måtthistoriken + profilens kroppsfett.</span>
          </div>
        </div>
      ) : <div style={{ marginTop: 12, fontSize: 12.5, color: T.text.muted }}>Fyll i måtten ovan så räknas kroppsfettet ut direkt.</div>}
      <div style={{ fontSize: 11, color: T.text.muted, marginTop: 10, lineHeight: 1.45 }}>Standardavvikelse ~3 % kroppsfett — se det som en uppskattning och följ förändringen över tid snarare än absoluttalet.</div>
    </Card>
  );
}

function EditProfileModal({ profile, onSave, onClose }) {
  const [p, setP] = useState({ ...profile, measurements: { ...profile.measurements } });
  const setField = (k, v) => setP(o => ({ ...o, [k]: v }));
  const setM = (k, v) => setP(o => ({ ...o, measurements: { ...o.measurements, [k]: v } }));
  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, maxHeight: "86vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 20, fontWeight: 800 }}>Redigera profil</span>
          <button onClick={onClose} style={btn.icon}>×</button>
        </div>
        <label style={lbl}>Namn</label>
        <input value={p.name} onChange={e => setField("name", e.target.value)} style={{ ...input, marginBottom: 12 }} />
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1 }}><label style={lbl}>Ålder</label><input type="number" value={p.age} onChange={e => setField("age", +e.target.value)} style={input} /></div>
          <div style={{ flex: 1 }}><label style={lbl}>Längd (cm)</label><input type="number" value={p.height} onChange={e => setField("height", +e.target.value)} style={input} /></div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <div style={{ flex: 1 }}><label style={lbl}>Vikt (kg)</label><input type="number" value={p.weight} onChange={e => setField("weight", +e.target.value)} style={input} /></div>
          <div style={{ flex: 1 }}><label style={lbl}>Kroppsfett (%)</label><input type="number" value={p.bodyFat} onChange={e => setField("bodyFat", +e.target.value)} style={input} /></div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Kön (för kroppsfettberäkning)</label>
          <div style={{ display: "flex", gap: 3, background: T.bg.raised, borderRadius: 9, padding: 3, width: "fit-content", marginTop: 4 }}>
            {[["male", "Man"], ["female", "Kvinna"]].map(([k, lab]) => (
              <button key={k} onClick={() => setField("gender", k)} style={{ padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, background: (p.gender || "male") === k ? T.accent.primary : "transparent", color: (p.gender || "male") === k ? "#fff" : T.text.secondary }}>{lab}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Aktivitetsnivå på jobbet/vardagen <span style={{ fontWeight: 400, color: T.text.muted }}>· utöver träning</span></label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 5 }}>
            {ACTIVITY_LEVELS.map(l => (
              <button key={l.id} onClick={() => setField("activityLevel", l.id)} title={l.hint} style={{ padding: "7px 13px", borderRadius: 8, border: `1px solid ${p.activityLevel === l.id ? T.accent.primary : T.bg.muted}`, cursor: "pointer", fontSize: 12.5, fontWeight: 600, background: p.activityLevel === l.id ? T.accent.primary : "transparent", color: p.activityLevel === l.id ? "#08101c" : T.text.secondary }}>{l.label}</button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: T.text.muted, marginTop: 6, lineHeight: 1.5 }}>Påverkar det uppskattade energibehovet. {ACTIVITY_LEVELS.find(l => l.id === p.activityLevel)?.hint ? `Vald: ${ACTIVITY_LEVELS.find(l => l.id === p.activityLevel).hint}.` : "Sätts även i onboarding."}</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Kostval <span style={{ fontWeight: 400, color: T.text.muted }}>· för närings- och tillskottsråd</span></label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 5 }}>
            {DIETS.map(dz => (
              <button key={dz.id} onClick={() => setField("diet", dz.id)} style={{ padding: "7px 13px", borderRadius: 8, border: `1px solid ${(p.diet || "omnivore") === dz.id ? T.accent.primary : T.bg.muted}`, cursor: "pointer", fontSize: 12.5, fontWeight: 600, background: (p.diet || "omnivore") === dz.id ? T.accent.primary : "transparent", color: (p.diet || "omnivore") === dz.id ? "#08101c" : T.text.secondary }}>{dz.label}</button>
            ))}
          </div>
          {(p.diet === "vegan" || p.diet === "vegetarian") && <div style={{ fontSize: 11, color: T.text.muted, marginTop: 6, lineHeight: 1.5 }}>Coachen och tillskottsrådgivaren väger in det — t.ex. B12{p.diet === "vegan" ? ", alg-omega-3 och växtbaserat järn" : ""}.</div>}
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Kosthållning <span style={{ fontWeight: 400, color: T.text.muted }}>· valfritt, metod/upplägg</span></label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 5 }}>
            {DIET_APPROACHES.map(dz => (
              <button key={dz.id} onClick={() => setField("dietApproach", dz.id)} style={{ padding: "7px 13px", borderRadius: 8, border: `1px solid ${(p.dietApproach || "none") === dz.id ? T.accent.primary : T.bg.muted}`, cursor: "pointer", fontSize: 12.5, fontWeight: 600, background: (p.dietApproach || "none") === dz.id ? T.accent.primary : "transparent", color: (p.dietApproach || "none") === dz.id ? "#08101c" : T.text.secondary }}>{dz.label}</button>
            ))}
          </div>
          {(p.dietApproach === "keto" || p.dietApproach === "lchf") && <div style={{ fontSize: 11, color: T.text.muted, marginTop: 6, lineHeight: 1.5 }}>Makrofördelningen anpassas: kolhydraterna kapas och fettet fyller resten. Elektrolyter och magnesium lyfts i tillskottsråden.</div>}
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Kostrestriktioner <span style={{ fontWeight: 400, color: T.text.muted }}>· valfritt, flera går bra</span></label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 5 }}>
            {DIET_RESTRICTIONS.map(rz => {
              const on = (p.restrictions || []).includes(rz.id);
              return (
                <button key={rz.id} onClick={() => setField("restrictions", on ? (p.restrictions || []).filter(x => x !== rz.id) : [...(p.restrictions || []), rz.id])} style={{ padding: "7px 13px", borderRadius: 8, border: `1px solid ${on ? T.accent.primary : T.bg.muted}`, cursor: "pointer", fontSize: 12.5, fontWeight: 600, background: on ? T.accent.primary : "transparent", color: on ? "#08101c" : T.text.secondary }}>{rz.label}</button>
              );
            })}
          </div>
          {(p.restrictions || []).length > 0 && <div style={{ fontSize: 11, color: T.text.muted, marginTop: 6, lineHeight: 1.5 }}>Coachen undviker att föreslå sådant du inte kan äta{(p.restrictions || []).includes("lactose") ? ", och lyfter kalcium/D från icke-mejeri" : ""}.</div>}
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={{ ...lbl, marginBottom: 0 }}>Menscykel <span style={{ fontWeight: 400, color: T.text.muted }}>· valfritt</span></label>
            <button onClick={() => setField("cycleTracking", !p.cycleTracking)} style={{ padding: "5px 14px", borderRadius: 999, border: `1px solid ${p.cycleTracking ? T.accent.primary : T.bg.muted}`, cursor: "pointer", fontSize: 12, fontWeight: 700, background: p.cycleTracking ? T.accent.primary : "transparent", color: p.cycleTracking ? "#08101c" : T.text.secondary }}>{p.cycleTracking ? "På" : "Av"}</button>
          </div>
          {p.cycleTracking && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11.5, color: T.text.muted, marginBottom: 9, lineHeight: 1.5 }}>Anpassar readiness och näringstips efter din cykelfas. Allt stannar lokalt på din enhet.</div>
              <label style={lbl}>Senaste mens — första dagen</label>
              <input type="date" value={p.lastPeriodStart ? new Date(p.lastPeriodStart).toISOString().slice(0, 10) : ""} onChange={e => setField("lastPeriodStart", e.target.value ? new Date(e.target.value + "T00:00").getTime() : null)} style={input} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <div style={{ flex: 1 }}><label style={lbl}>Cykellängd (dagar)</label><input type="number" value={p.cycleLength || 28} onChange={e => setField("cycleLength", +e.target.value)} style={input} /></div>
                <div style={{ flex: 1 }}><label style={lbl}>Menslängd (dagar)</label><input type="number" value={p.periodLength || 5} onChange={e => setField("periodLength", +e.target.value)} style={input} /></div>
              </div>
            </div>
          )}
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={{ ...lbl, marginBottom: 0 }}>Personlig anpassning <span style={{ fontWeight: 400, color: T.text.muted }}>· valfritt</span></label>
            <button onClick={() => setField("personalizedInsights", !p.personalizedInsights)} style={{ padding: "5px 14px", borderRadius: 999, border: `1px solid ${p.personalizedInsights ? T.accent.primary : T.bg.muted}`, cursor: "pointer", fontSize: 12, fontWeight: 700, background: p.personalizedInsights ? T.accent.primary : "transparent", color: p.personalizedInsights ? "#08101c" : T.text.secondary }}>{p.personalizedInsights ? "På" : "Av"}</button>
          </div>
          <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 9, lineHeight: 1.5 }}>Låter coachen väga in kost, mikronäring och cykel i dagens beredskap och rekommendation. Kräver att du loggar kosten ganska komplett — annars kan signalerna bli fel, så coachen stämmer av med dig innan den väger in en tunn logg. Av som standard.</div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: T.text.muted, textTransform: "uppercase", marginBottom: 8 }}>Kroppsmått (cm)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
          {Object.keys(p.measurements).map(k => (
            <div key={k}><label style={lbl}>{k}</label><input type="number" value={p.measurements[k]} onChange={e => setM(k, +e.target.value)} style={input} /></div>
          ))}
        </div>
        <button onClick={() => { const wh = p.weight !== profile.weight ? [...profile.weightHistory.slice(-5), p.weight] : profile.weightHistory; onSave({ ...p, weightHistory: wh }); }} style={{ ...btn.primary, width: "100%" }}>Spara</button>
      </div>
    </div>
  );
}

function ProfileView({ profile, setProfile, sessions, setSessions = null, measurements, setMeasurements, mode, onSwitchMode, trainingMetrics, foodLog = [], setFoodLog = null }) {
  const [editing, setEditing] = useState(false);
  const [mw, setMw] = useState(""); const [mwaist, setMwaist] = useState(""); const [mbf, setMbf] = useState("");
  const p = profile;
  const streak = trainingMetrics ? trainingMetrics.streak : workoutStreak(sessions || []);   // §2: riktig streak ur pass-datum, aldrig 42
  const wsr = metricSeries(measurements, "weight").map(x => x.value); const wh = wsr.length >= 2 ? wsr : p.weightHistory; const maxW = Math.max(...wh) + 1, minW = Math.min(...wh) - 1;
  const strongLift = (() => {
    const lifts = [["squat", "Knäböj"], ["bench_press", "Bänk"], ["deadlift", "Mark"], ["ohp", "Press"]];
    return lifts.map(([id, name]) => {
      const rm = best1RM(sessions, id); const std = STRENGTH_STD[id];
      const ratio = rm / p.weight;
      const level = !rm ? "–" : ratio >= std[2] ? "Avancerad" : ratio >= std[1] ? "Medel" : ratio >= std[0] ? "Nybörjare" : "Otränad";
      const col = { Avancerad: "#FF5C5C", Medel: "#4DA3FF", Nybörjare: "#39D98A", Otränad: "#687385", "–": "#687385" }[level];
      return { name, rm, level, col };
    });
  })();
  const weekly = sessions.filter(s => Date.now() - s.completedAt < 7 * 864e5).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 900 }}>
      {/* header */}
      <Card>
        <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ cursor: "pointer", position: "relative" }}>
            <input type="file" accept="image/*" onChange={readImage(url => setProfile(o => ({ ...o, avatar: url })))} style={{ display: "none" }} />
            <div style={{ width: 92, height: 92, borderRadius: "50%", background: p.avatar ? `center/cover url(${p.avatar})` : `linear-gradient(135deg, ${T.accent.primary}, ${T.accent.secondary})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800, color: "#fff", border: `2px solid ${T.bg.muted}` }}>
              {!p.avatar && p.name.charAt(0)}
            </div>
            <div style={{ position: "absolute", bottom: 0, right: 0, background: T.accent.primary, borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", border: `2px solid ${T.bg.surface}` }}>✎</div>
          </label>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: T.text.primary }}>{p.name}</div>
            {p.memberSince && <div style={{ fontSize: 13, color: T.text.muted, marginTop: 2 }}>Medlem sedan {p.memberSince}</div>}
            <div style={{ display: "flex", gap: 18, marginTop: 12, flexWrap: "wrap" }}>
              {(() => {
                const derived = derivedBodyFat(p, measurements);
                const useCalc = p.bodyFatSource === "calculated" && derived;
                const bfVal = useCalc ? `${derived.bodyFat}%` : (p.bodyFat != null ? `${p.bodyFat}%` : "—");
                const bfNum = useCalc ? derived.bodyFat : p.bodyFat;
                const wNow = (measurements || []).filter(m => m && typeof m.weight === "number").sort((a, b) => a.date - b.date).slice(-1)[0]?.weight || p.weight;
                const lean = (useCalc && derived.leanMass != null) ? derived.leanMass : (bfNum != null && wNow ? +(wNow * (1 - bfNum / 100)).toFixed(1) : null);
                return [["Ålder", p.age != null ? p.age : "—"], ["Längd", p.height != null ? `${p.height} cm` : "—"], ["Vikt", p.weight != null ? `${p.weight} kg` : "—"], ["Kroppsfett", bfVal, useCalc ? "beräknad" : null, derived], ["Fettfri massa", lean != null ? `${lean} kg` : "—"]].map(([l, v, tag, drv]) => (
                  <div key={l}>
                    <div style={{ fontSize: 11, color: T.text.muted, textTransform: "uppercase", letterSpacing: 0.6 }}>{l}{tag && <span style={{ color: T.accent.secondary, textTransform: "none", letterSpacing: 0 }}> · {tag}</span>}</div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: T.text.primary }}>{v}</div>
                    {l === "Kroppsfett" && drv && (
                      <div style={{ display: "flex", gap: 3, background: T.bg.raised, borderRadius: 7, padding: 2, marginTop: 5, width: "fit-content" }} title={`Beräknad ur längd ${p.height} cm, hals ${drv.inputs.neck} cm, midja ${drv.inputs.waist} cm (US Navy-metoden, ±3 %)`}>
                        {[["manual", "Manuell"], ["calculated", `Beräknad ${drv.bodyFat}%`]].map(([k, lab]) => (
                          <button key={k} onClick={() => setProfile(o => ({ ...o, bodyFatSource: k }))} style={{ padding: "3px 9px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 10.5, fontWeight: 600, background: (p.bodyFatSource === k || (!p.bodyFatSource && k === "manual")) ? T.accent.primary : "transparent", color: (p.bodyFatSource === k || (!p.bodyFatSource && k === "manual")) ? "#fff" : T.text.secondary }}>{lab}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
          <button onClick={() => setEditing(true)} style={{ ...btn.pill }}>Redigera profil</button>
        </div>
      </Card>

      <GoalCard profile={p} setProfile={setProfile} />

      <LlmSettings />

      {setSessions && <MobileImport sessions={sessions} setSessions={setSessions} foodLog={foodLog} setFoodLog={setFoodLog} measurements={measurements} setMeasurements={setMeasurements} />}
      <BackupCard />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="prof-grid">
        {/* weight & measurement log */}
        <Card>
          <CardLabel right={<span style={{ fontSize: 11, color: T.text.muted }}>{(measurements || []).length} mätningar</span>}>Vikt & mått-logg</CardLabel>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 12 }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: T.text.muted, marginBottom: 3 }}>Vikt (kg)</div><input type="number" value={mw} onChange={e => setMw(e.target.value)} placeholder={profile.weight != null ? String(profile.weight) : "kg"} style={{ width: "100%", background: T.bg.raised, border: `1px solid ${T.bg.muted}`, borderRadius: 8, padding: "8px 10px", color: T.text.primary, fontSize: 14, boxSizing: "border-box" }} /></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: T.text.muted, marginBottom: 3 }}>Midja (cm)</div><input type="number" value={mwaist} onChange={e => setMwaist(e.target.value)} placeholder="84.5" style={{ width: "100%", background: T.bg.raised, border: `1px solid ${T.bg.muted}`, borderRadius: 8, padding: "8px 10px", color: T.text.primary, fontSize: 14, boxSizing: "border-box" }} /></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: T.text.muted, marginBottom: 3 }}>Fett (%)</div><input type="number" value={mbf} onChange={e => setMbf(e.target.value)} placeholder="18" style={{ width: "100%", background: T.bg.raised, border: `1px solid ${T.bg.muted}`, borderRadius: 8, padding: "8px 10px", color: T.text.primary, fontSize: 14, boxSizing: "border-box" }} /></div>
            <button onClick={() => { if (!mw && !mwaist && !mbf) return; setMeasurements([...(measurements || []), { date: Date.now(), weight: +mw || latestMetric(measurements, "weight") || profile.weight, waist: +mwaist || null, bodyFat: +mbf || null }]); setMw(""); setMwaist(""); setMbf(""); }} style={{ ...btn.primary, whiteSpace: "nowrap" }}>Logga</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {[...(measurements || [])].sort((a, b) => b.date - a.date).slice(0, 6).map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: T.text.secondary, padding: "5px 0", borderBottom: `1px solid ${T.bg.raised}` }}>
                <span>{new Date(m.date).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}</span>
                <span>{m.weight} kg{m.waist ? ` · ${m.waist} cm` : ""}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: T.text.muted, marginTop: 8 }}>Loggade mått driver kropps­sammansättnings-analysen i AI Coach.</div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.bg.raised}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: T.text.muted, textTransform: "uppercase", marginBottom: 8 }}>Applikationsläge</div>
            <div style={{ fontSize: 11.5, color: T.text.muted, marginBottom: 10 }}>Aktivt läge: <b style={{ color: T.text.secondary }}>{(mode || getMode()) === "real" ? "Min riktiga profil" : "Demo"}</b>. Byte av läge byter bara vy — demo och riktig profil hålls åtskilda, ingen data kopieras, raderas eller nollställs.</div>
            {onSwitchMode && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button onClick={() => onSwitchMode("demo")} disabled={(mode || getMode()) === "demo"} style={{ ...btn.tag, fontSize: 12, background: (mode || getMode()) === "demo" ? T.bg.muted : T.bg.raised, color: (mode || getMode()) === "demo" ? T.text.muted : T.text.secondary, cursor: (mode || getMode()) === "demo" ? "default" : "pointer" }}>Öppna Demo-läge</button>
                <button onClick={() => onSwitchMode("real")} disabled={(mode || getMode()) === "real"} style={{ ...btn.tag, fontSize: 12, background: (mode || getMode()) === "real" ? T.bg.muted : T.bg.raised, color: (mode || getMode()) === "real" ? T.text.muted : T.accent.primary, cursor: (mode || getMode()) === "real" ? "default" : "pointer" }}>Öppna min riktiga profil</button>
              </div>
            )}
          </div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.bg.raised}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: T.text.muted, textTransform: "uppercase", marginBottom: 8 }}>Data & integritet</div>
            <div style={{ fontSize: 11.5, color: T.text.muted, marginBottom: 10 }}>Aktivt läge: <b style={{ color: T.text.secondary }}>{getMode() === "real" ? "Riktig profil" : "Demo"}</b>. Din data sparas lokalt i webbläsaren (localStorage). Ingen server.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {getMode() === "real" && <button onClick={() => { const data = exportRealData(); const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `atlas-export-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url); }} style={{ ...btn.tag, fontSize: 12 }}>Exportera min data (JSON)</button>}
              {getMode() === "real" && <button onClick={() => { if (window.confirm("Starta om onboarding? Dina inställningar samlas in igen men din loggade historik (pass, kost, mått) raderas INTE.")) { try { window.localStorage.setItem("atlas.v2.real.onboarding", JSON.stringify({ step: 0, completed: false })); } catch (e) {} window.location.reload(); } }} style={{ ...btn.tag, fontSize: 12 }}>Starta om onboarding</button>}
              <button onClick={() => { const m = getMode() || "demo"; const msg = m === "real" ? "Radera din riktiga profil och all din loggade historik (pass, kost, mått, mål)? Demo-läget påverkas inte. Detta går inte att ångra." : "Rensa demo-lägets data och återställ exempelinnehållet? Din riktiga profil påverkas inte."; if (window.confirm(msg)) { clearModeData(m); window.location.reload(); } }} style={{ background: "none", border: `1px solid ${T.accent.danger}55`, color: T.accent.danger, borderRadius: 8, padding: "7px 12px", fontSize: 12, cursor: "pointer" }}>{getMode() === "real" ? "Radera min profil" : "Rensa demo-data"}</button>
            </div>
            <button onClick={() => { if (window.confirm("Radera ALL ATLAS-data (både demo OCH riktig profil) och återgå till startvalet? Detta går inte att ångra.")) { clearAllAtlasData(); window.location.reload(); } }} style={{ background: "none", border: "none", color: T.text.muted, fontSize: 11, cursor: "pointer", marginTop: 10, textDecoration: "underline" }}>Radera all ATLAS-data (full nollställning)</button>
          </div>
        </Card>

        {/* measurements + weight trend */}
        <Card>
          <CardLabel>Kroppsmått</CardLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            {Object.entries(p.measurements).map(([k, v]) => (
              <div key={k} style={{ background: T.bg.raised, borderRadius: 8, padding: "9px 11px" }}>
                <div style={{ fontSize: 11, color: T.text.muted }}>{k}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: T.text.primary }}>{v} <span style={{ fontSize: 11, color: T.text.muted, fontWeight: 400 }}>cm</span></div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: T.text.muted, textTransform: "uppercase", marginBottom: 6 }}>Vikttrend</div>
          {wh.length >= 2 ? (<>
          <svg width="100%" viewBox="0 0 300 70" style={{ overflow: "visible" }}>
            <polyline fill="none" stroke={T.accent.primary} strokeWidth="2" points={wh.map((w, i) => `${i / (wh.length - 1) * 300},${70 - (w - minW) / (maxW - minW) * 70}`).join(" ")} />
            {wh.map((w, i) => <circle key={i} cx={i / (wh.length - 1) * 300} cy={70 - (w - minW) / (maxW - minW) * 70} r="3" fill={T.accent.primary} />)}
          </svg>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.text.muted, marginTop: 4 }}><span>{wh[0]} kg</span><span>{wh[wh.length - 1]} kg nu</span></div>
          </>) : <div style={{ fontSize: 12.5, color: T.text.muted, padding: "6px 0" }}>Logga din vikt minst två gånger för att se en trend.</div>}
        </Card>

        <BodyFatCalculator profile={profile} setProfile={setProfile} measurements={measurements} setMeasurements={setMeasurements} />

        {/* summary */}
        <Card>
          <CardLabel>Sammanfattning</CardLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[["Streak", `${streak} d`, streak > 0 ? T.accent.success : T.text.muted], ["Pass totalt", sessions.length, T.text.primary], ["Denna vecka", weekly, T.accent.primary], ["Progressbilder", p.photos.length, T.text.primary]].map(([l, v, c]) => (
              <div key={l} style={{ background: T.bg.raised, borderRadius: 8, padding: "9px 11px" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: c }}>{v}</div><div style={{ fontSize: 11, color: T.text.muted }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: T.text.muted, textTransform: "uppercase", marginBottom: 6 }}>Styrkenivå (1RM)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {strongLift.map(l => (
              <div key={l.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                <span style={{ color: T.text.secondary }}>{l.name}</span>
                <span><span style={{ color: T.text.primary, fontWeight: 700 }}>{l.rm ? `${l.rm} kg` : "–"}</span> <span style={{ fontSize: 11, color: l.col, marginLeft: 6 }}>{l.level}</span></span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* progress photos */}
      <Card>
        <CardLabel right={
          <label style={{ ...btn.primary, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>
            + Ladda upp
            <input type="file" accept="image/*" onChange={readImage(url => setProfile(o => ({ ...o, photos: [{ url, date: new Date().toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" }) }, ...o.photos] })))} style={{ display: "none" }} />
          </label>
        }>Progressbilder</CardLabel>
        {p.photos.length === 0
          ? <div style={{ fontSize: 13, color: T.text.muted, padding: "18px 0", textAlign: "center" }}>Ladda upp foton (fram/sida/bak) för att följa din utveckling över tid.</div>
          : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
            {p.photos.map((ph, i) => (
              <div key={i} style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: T.bg.raised }}>
                <img src={ph.url} alt={ph.date} style={{ width: "100%", height: 170, objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.75))", padding: "16px 8px 6px", fontSize: 11, color: "#fff" }}>{ph.date}</div>
                <button onClick={() => setProfile(o => ({ ...o, photos: o.photos.filter((_, j) => j !== i) }))} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", borderRadius: "50%", width: 24, height: 24, cursor: "pointer" }}>×</button>
              </div>
            ))}
          </div>}
      </Card>

      {editing && <EditProfileModal profile={p} onSave={np => { setProfile(np); setEditing(false); }} onClose={() => setEditing(false)} />}
      <style>{`@media (max-width: 820px){ .prof-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function SportModal({ onComplete, onClose, initialId, activeSports }) {
  const ALL_ACT = ((activeSports && activeSports.length ? activeSports : DEFAULT_ACTIVE_SPORTS).map(resolveActivity).filter(Boolean));
  const key = a => a && (a.libId || a.id);
  const [sportId, setSportId] = useState(initialId || (ALL_ACT[0] && key(ALL_ACT[0])));
  const [minutes, setMinutes] = useState(60);
  const [intensity, setIntensity] = useState("Medel");
  const [hiit, setHiit] = useState(false);
  const sport = ALL_ACT.find(s => key(s) === sportId) || ALL_ACT[0];
  const im = SPORT_INTENSITY[intensity];
  const preview = computeSportLoad(sport, minutes, im, hiit);
  const cardio = computeCardioLoad(sport, minutes, im, hiit);
  const top = Object.entries(preview).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const log = () => onComplete({ title: `${sport.name}${hiit ? " (HIIT)" : ""}`, completedAt: Date.now(), sport: true, hiit, cardioLoad: cardio, muscleLoads: preview, source: "sport" });
  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 20, fontWeight: 800 }}>Logga aktivitet</span>
          <button onClick={onClose} style={btn.icon}>×</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
          {ALL_ACT.map(s => (
            <button key={key(s)} onClick={() => setSportId(key(s))} style={{ textAlign: "center", padding: "12px 6px", borderRadius: 10, cursor: "pointer",
              background: sportId === key(s) ? "rgba(77,163,255,0.12)" : T.bg.raised, border: `1px solid ${sportId === key(s) ? s.color : "transparent"}` }}>
              <div style={{ display: "flex", justifyContent: "center", height: 34, alignItems: "center" }}><SportIcon id={s.libId || s.id} emoji={s.icon} size={32} /></div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text.primary, marginTop: 4 }}>{s.name}</div>
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: T.text.muted, marginBottom: 14, lineHeight: 1.5 }}>{sport.desc}</div>
        <div style={{ marginBottom: 14 }}><Stepper label="Tid" value={minutes} step={5} min={5} unit="min" onChange={setMinutes} /></div>
        <label style={lbl}>Intensitet</label>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {Object.keys(SPORT_INTENSITY).map(k => (
            <button key={k} onClick={() => setIntensity(k)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: intensity === k ? T.accent.primary : T.bg.raised, color: intensity === k ? "#fff" : T.text.secondary }}>{k}</button>
          ))}
        </div>
        <label style={lbl}>Upplägg</label>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {[["Jämnt", false], ["Intervaller (HIIT)", true]].map(([label, v]) => (
            <button key={label} onClick={() => setHiit(v)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: hiit === v ? T.accent.secondary : T.bg.raised, color: hiit === v ? "#fff" : T.text.secondary }}>{label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, background: T.bg.raised, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.accent.warning }}>{cardio}</div>
            <div style={{ fontSize: 11, color: T.text.muted }}>konditionsbelastning</div>
          </div>
          <div style={{ flex: 2 }}>
            <label style={lbl}>Mest belastade muskler</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {top.map(([id, v]) => <span key={id} style={{ fontSize: 11.5, color: T.text.secondary, background: T.bg.raised, borderRadius: 7, padding: "4px 8px" }}>{MUSCLES[id] ? MUSCLES[id].name : id}</span>)}
            </div>
          </div>
        </div>
        <button onClick={log} style={{ ...btn.primary, width: "100%" }}>Logga {sport.name}{hiit ? " (HIIT)" : ""}</button>
      </div>
    </div>
  );
}

export { EditProfileModal, ProfileView, SportModal, BodyFatCalculator };
