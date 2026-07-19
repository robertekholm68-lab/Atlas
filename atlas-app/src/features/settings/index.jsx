// INSTÄLLNINGAR — appens preferenser. Panelläge + sport-väljare (vilka sporter
// du vill ha "framme" när du loggar). Byggd för att växa.
import { useState } from "react";
import { T, btn, input } from "../../data/tokens.js";
import { Card, CardLabel, Icon, SportIcon } from "../../components/common/index.jsx";
import { SPORT_CATEGORIES, SPORT_META } from "../../data/sportLibrary.js";

export const PANEL_MODES = [
  { id: "open", label: "Alltid öppna", icon: "book-open", desc: "Panelerna visas fullt utfällda hela tiden, utspridda så inget överlappar. Lugnast att överblicka." },
  { id: "hover", label: "Fäll ut på hover", icon: "sparkles", desc: "Panelerna är kompakta i vila (rubrik + nyckeltal) och viker ut sig när du för musen över dem." },
  { id: "click", label: "Fäll ut på klick", icon: "target", desc: "Kompakta i vila; klicka för att fälla ut en i taget (dragspel). Bäst på pekskärm." },
];

function OptionRow({ opt, active, onPick }) {
  return (
    <button onClick={() => onPick(opt.id)} style={{
      display: "flex", alignItems: "flex-start", gap: 12, width: "100%", textAlign: "left", cursor: "pointer",
      padding: "13px 15px", borderRadius: 12, marginBottom: 8,
      background: active ? "rgba(77,163,255,0.08)" : T.bg.raised,
      border: `1px solid ${active ? T.accent.primary : "transparent"}`,
    }}>
      <div style={{ width: 30, height: 30, flexShrink: 0, borderRadius: 8, background: active ? T.accent.primary : T.bg.muted, display: "flex", alignItems: "center", justifyContent: "center", color: active ? "#08101c" : T.text.muted }}>
        <Icon name={opt.icon} size={16} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text.primary, display: "flex", alignItems: "center", gap: 8 }}>
          {opt.label}
          {active && <span style={{ fontSize: 10, fontWeight: 700, color: T.accent.primary, letterSpacing: 0.5 }}>· VALD</span>}
        </div>
        <div style={{ fontSize: 12.5, color: T.text.secondary, lineHeight: 1.5, marginTop: 3 }}>{opt.desc}</div>
      </div>
      <div style={{ width: 18, height: 18, flexShrink: 0, borderRadius: "50%", border: `2px solid ${active ? T.accent.primary : T.bg.muted}`, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
        {active && <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent.primary }} />}
      </div>
    </button>
  );
}

function SportChip({ id, sv, on, onToggle }) {
  return (
    <button onClick={onToggle} title={sv} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer",
      padding: "10px 6px 8px", borderRadius: 11, position: "relative",
      background: on ? "rgba(77,163,255,0.10)" : T.bg.raised,
      border: `1px solid ${on ? T.accent.primary : "transparent"}`, opacity: on ? 1 : 0.72,
    }}>
      <div style={{ height: 40, display: "flex", alignItems: "center" }}><SportIcon id={id} emoji="🏅" size={38} /></div>
      <span style={{ fontSize: 11, fontWeight: 600, color: on ? T.text.primary : T.text.secondary, textAlign: "center", lineHeight: 1.2 }}>{sv}</span>
      <div style={{ position: "absolute", top: 6, right: 6, width: 15, height: 15, borderRadius: "50%", background: on ? T.accent.primary : "transparent", border: `1.5px solid ${on ? T.accent.primary : T.bg.muted}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {on && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#08101c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
      </div>
    </button>
  );
}

function SportPicker({ activeSports = [], setActiveSports }) {
  const [q, setQ] = useState("");
  const [openCat, setOpenCat] = useState(SPORT_CATEGORIES[0] ? SPORT_CATEGORIES[0].id : null);
  const active = new Set(activeSports);
  const toggle = id => { const has = active.has(id); setActiveSports(has ? activeSports.filter(x => x !== id) : [...activeSports, id]); };
  const all = Object.entries(SPORT_META).map(([id, m]) => ({ id, ...m }));
  const ql = q.trim().toLowerCase();
  const hit = m => !ql || m.sv.toLowerCase().includes(ql) || (m.aliases || []).some(a => a.toLowerCase().includes(ql));
  const grid = list => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 8, marginTop: 10 }}>
      {list.map(m => <SportChip key={m.id} id={m.id} sv={m.sv} on={active.has(m.id)} onToggle={() => toggle(m.id)} />)}
    </div>
  );
  return (
    <Card>
      <CardLabel right={<span style={{ fontSize: 12, color: T.accent.primary, fontWeight: 700 }}>{activeSports.length} framme</span>}>Sporter & aktiviteter</CardLabel>
      <div style={{ fontSize: 12.5, color: T.text.muted, marginBottom: 12, lineHeight: 1.5 }}>
        Välj vilka sporter och aktiviteter du vill ha framme när du loggar. Resten ligger kvar i biblioteket men skräpar inte i listorna — 94 att välja bland i 10 kategorier.
      </div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Sök: padel, boxning, skidor…" style={{ ...input, marginBottom: 8 }} />
      {ql ? (
        (() => { const res = all.filter(hit); return res.length ? grid(res) : <div style={{ fontSize: 12.5, color: T.text.muted, padding: 12, textAlign: "center" }}>Inga träffar för "{q}".</div>; })()
      ) : (
        SPORT_CATEGORIES.map(cat => {
          const sports = all.filter(m => m.cat === cat.id);
          const nOn = sports.filter(m => active.has(m.id)).length;
          const open = openCat === cat.id;
          return (
            <div key={cat.id} style={{ borderTop: `1px solid ${T.bg.raised}`, paddingTop: 4 }}>
              <button onClick={() => setOpenCat(open ? null : cat.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", padding: "11px 2px", textAlign: "left" }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: T.text.primary }}>{cat.sv}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11.5, color: nOn ? T.accent.primary : T.text.muted, fontWeight: 600 }}>{nOn}/{sports.length}</span>
                  <span style={{ color: T.text.muted, transform: open ? "rotate(90deg)" : "none", transition: "transform .2s", display: "inline-flex" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                  </span>
                </span>
              </button>
              {open && grid(sports)}
            </div>
          );
        })
      )}
      <div style={{ fontSize: 11, color: T.text.muted, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.bg.raised}` }}>
        Valda sporter dyker upp i aktivitetsloggen och på Cardio-kortet. Sporter utan egen belastningsmodell får ett ärligt estimat utifrån sin kategori.
      </div>
    </Card>
  );
}

export function SettingsView({ panelMode = "open", setPanelMode, activeSports = [], setActiveSports, profile = null, setProfile = null }) {
  const balanceOn = !!(profile && profile.balanceMeter);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 640 }}>
      <Card>
        <CardLabel>Analyskammaren · paneler</CardLabel>
        <div style={{ fontSize: 12.5, color: T.text.muted, marginBottom: 14, lineHeight: 1.5 }}>
          Styr hur analyspanelerna i dashboarden, Kroppen och Training beter sig. Inget överlappar i något läge — skillnaden är om de står öppna eller fäller ut sig först på fokus.
        </div>
        {PANEL_MODES.map(opt => (
          <OptionRow key={opt.id} opt={opt} active={panelMode === opt.id} onPick={setPanelMode} />
        ))}
      </Card>
      {setProfile && (
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <CardLabel>Balansmätare</CardLabel>
            <button onClick={() => setProfile(p => ({ ...p, balanceMeter: !balanceOn }))} style={{ padding: "5px 14px", borderRadius: 999, border: `1px solid ${balanceOn ? T.accent.primary : T.bg.muted}`, cursor: "pointer", fontSize: 12, fontWeight: 700, background: balanceOn ? T.accent.primary : "transparent", color: balanceOn ? "#08101c" : T.text.secondary }}>{balanceOn ? "På" : "Av"}</button>
          </div>
          <div style={{ fontSize: 12.5, color: T.text.muted, marginTop: 9, lineHeight: 1.55 }}>Visar en radar över dina fyra pelare — träning, återhämtning, kost och vila — på dashboarden. Systemet belönar jämnhet: det samlade värdet dras ned av obalans och lyfter din svagaste länk. Pelare utan underlag visas som "—" i stället för en påhittad siffra. Av som standard.</div>
        </Card>
      )}
      {setActiveSports && <SportPicker activeSports={activeSports} setActiveSports={setActiveSports} />}
    </div>
  );
}
