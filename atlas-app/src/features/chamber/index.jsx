// FEATURE: ATLAS Analyskammare — immersivt spatialt upplägg (lager-HTML/CSS, ingen Three.js).
// Generaliserad: ChamberRoom + ChamberTopBar + Chamber (body-centrerad) + ContentChamber (innehåll i rummet).
import { useState, useEffect, useRef } from "react";
import { SvgBody } from "../body-map/index.jsx";
import { DashReadiness, DashCoach, DashMission, DashRecovery, DashNutrition , PersonalInsightCard , LaggingCard , BalanceMeter } from "../dashboard/index.jsx";
import { T, btn, STATE_COL } from "../../data/tokens.js";
import { Icon } from "../../components/common/index.jsx";

function usePrefersReducedMotion() {
  const [r, setR] = useState(() => typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const h = () => setR(m.matches);
    m.addEventListener ? m.addEventListener("change", h) : m.addListener(h);
    return () => { m.removeEventListener ? m.removeEventListener("change", h) : m.removeListener(h); };
  }, []);
  return r;
}

// ── Smal, hopfällbar navigeringsskena ──
export function NavRail({ active, setActive, mode, onSwitchMode }) {
  const [open, setOpen] = useState(false);
  const nav = [["Dashboard", "▦"], ["Kroppen", "◉"], ["Training", "dumbbell"], ["Nutrition", "apple"], ["Recept", "book-open"], ["Goals", "◈"], ["AI Coach", "✦"], ["Historik", "▤"], ["Profil", "user"], ["Inställningar", "sliders"]];
  const W = open ? 212 : 64;
  return (
    <div style={{ width: 64, flexShrink: 0, position: "relative", zIndex: 60 }}>
      <div onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
        style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: W, background: "linear-gradient(180deg, #0d1119, #0a0d13)", borderRight: `1px solid ${T.bg.muted}`, display: "flex", flexDirection: "column", padding: "16px 10px", boxSizing: "border-box", overflow: "hidden", transition: "width .22s cubic-bezier(.2,.7,.3,1)", boxShadow: open ? "18px 0 44px -20px rgba(0,0,0,0.7)" : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "4px 6px 18px", minWidth: 190 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: `linear-gradient(135deg, ${T.accent.primary}, ${T.accent.secondary})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#fff" }}>A</div>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: 0.5, opacity: open ? 1 : 0, transition: "opacity .2s" }}>ATLAS</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
          {nav.map(([label, icon]) => (
            <button key={label} onClick={() => setActive(label)} title={label}
              style={{ display: "flex", alignItems: "center", gap: 13, padding: "9px 10px", borderRadius: 10, border: "none", cursor: "pointer", minWidth: 190, background: active === label ? T.bg.muted : "transparent", color: active === label ? T.text.primary : T.text.muted, fontSize: 13.5, fontWeight: active === label ? 600 : 500, textAlign: "left", transition: "background .15s" }}>
              <span style={{ fontSize: 15, width: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={icon} size={16} /></span>
              <span style={{ opacity: open ? 1 : 0, transition: "opacity .2s", whiteSpace: "nowrap" }}>{label}</span>
            </button>
          ))}
        </div>
        {onSwitchMode && (
          <button onClick={() => onSwitchMode(mode === "demo" ? "real" : "demo")} title={mode === "demo" ? "Öppna min riktiga profil" : "Utforska demo-läget"}
            style={{ display: "flex", alignItems: "center", gap: 13, padding: "9px 10px", borderRadius: 10, border: `1px solid ${T.bg.muted}`, background: T.bg.raised, cursor: "pointer", minWidth: 190, marginTop: 6 }}>
            <span style={{ width: 22, flexShrink: 0, display: "flex", justifyContent: "center" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: mode === "demo" ? T.accent.warning : T.accent.success }} /></span>
            <span style={{ opacity: open ? 1 : 0, transition: "opacity .2s", whiteSpace: "nowrap", fontSize: 12.5, fontWeight: 600, color: T.accent.primary }}>{mode === "demo" ? "Min riktiga profil" : "Utforska demo"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Flytande analyspanel ──
function FloatingPanel({ children, side, width, depth = "near", foreground = false, reduced, panelMode = "open", label, peek }) {
  const [hov, setHov] = useState(false);
  const [clickOpen, setClickOpen] = useState(false);
  const rot = side === "left" ? 3 : side === "right" ? -3 : 0;
  const foldable = panelMode !== "open";
  const expanded = !foldable || (panelMode === "hover" ? hov : clickOpen);
  const focus = hov || (foldable && expanded);
  const base = foreground ? 1.0 : depth === "far" ? 0.94 : 0.97;
  const scale = base + (focus ? 0.03 : 0);
  const lift = focus ? " translateY(-6px)" : "";
  const glow = focus ? `, 0 0 0 1px ${T.accent.primary}77, 0 0 42px -8px ${T.accent.primary}88` : "";
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: "relative", width: "100%",
        zIndex: focus ? 45 : foreground ? 32 : depth === "far" ? 15 : 22,
        transform: `perspective(1500px) rotateY(${focus ? 0 : rot}deg) scale(${scale})${lift}`,
        transformOrigin: side === "right" ? "right center" : "left center",
        transition: reduced ? "none" : "transform .32s cubic-bezier(.2,.7,.3,1), opacity .3s, filter .3s",
        opacity: foreground || focus ? 1 : depth === "far" ? 0.9 : 0.97,
        filter: focus ? "none" : depth === "far" ? "saturate(0.9) brightness(0.93)" : "none",
      }}>
      <div style={{ position: "relative", borderRadius: 20, padding: 4, background: "linear-gradient(158deg, #313e4d 0%, #1a2330 42%, #0d131c 100%)", boxShadow: `0 2px 0 rgba(255,255,255,0.09), 0 9px 0 -3px rgba(11,15,22,0.92), 0 15px 0 -6px rgba(8,11,17,0.88), 0 ${foreground ? 34 : 24}px ${foreground ? 56 : 42}px -14px rgba(0,0,0,0.72), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -2px 4px rgba(0,0,0,0.5)${glow}`, transition: reduced ? "none" : "box-shadow .3s" }}>
        <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.45), inset 0 2px 7px rgba(0,0,0,0.4)" }}>
          {foldable && !expanded ? (
            // KOMPAKT VILA: rubrik + nyckeltal, viker ut på hover/klick
            <button onClick={() => panelMode === "click" && setClickOpen(true)} onFocus={() => panelMode === "hover" && setHov(true)}
              style={{ width: "100%", textAlign: "left", cursor: panelMode === "click" ? "pointer" : "default", background: "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0) 60%), #141922", border: "none", padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.1, textTransform: "uppercase", color: T.text.muted }}>{label || "Panel"}</span>
                {peek != null && <span style={{ fontSize: 14.5, fontWeight: 700, color: T.text.primary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{peek}</span>}
              </span>
              <span style={{ color: T.text.muted, flexShrink: 0, display: "inline-flex" }}><ChevRight /></span>
            </button>
          ) : (
            <>
              {children}
              {foldable && panelMode === "click" && (
                <button onClick={() => setClickOpen(false)} title="Fäll ihop" style={{ position: "absolute", top: 10, right: 10, zIndex: 3, width: 24, height: 24, borderRadius: 7, border: "none", cursor: "pointer", background: "rgba(20,25,34,0.7)", color: T.text.muted, display: "flex", alignItems: "center", justifyContent: "center" }}><ChevDown /></button>
              )}
            </>
          )}
          <div style={{ position: "absolute", inset: 0, borderRadius: 16, pointerEvents: "none", background: "linear-gradient(152deg, rgba(255,255,255,0.12), rgba(255,255,255,0) 30%)" }} />
        </div>
      </div>
    </div>
  );
}
// små pilar (undviker extra ikon-beroende i chamber)
const ChevRight = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>);
const ChevDown = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>);

// ── Delad parallax + rum + topprad ──
const CHAMBER_KEYFRAMES = `
  @keyframes atlasScanSweep{0%{top:14%;opacity:0}10%{opacity:.55}50%{top:92%;opacity:.5}60%{opacity:0}100%{top:14%;opacity:0}}
  @keyframes atlasRingPulse{0%{transform:translate(-50%,-50%) scale(.55);opacity:.5}100%{transform:translate(-50%,-50%) scale(1.35);opacity:0}}
  @keyframes atlasPlatform{0%,100%{opacity:.85}50%{opacity:1}}
  @keyframes atlasOrbit{to{transform:rotate(360deg)}}
  @keyframes atlasCometPulse{0%,100%{opacity:.88;filter:brightness(1)}50%{opacity:1;filter:brightness(1.32)}}
  @keyframes atlasTwinkle{0%,100%{opacity:var(--o,.75);transform:scale(1)}45%{opacity:calc(var(--o,.75) * .16);transform:scale(.5)}}
  @keyframes atlasStarHue{0%,100%{background:#eef4ff}33%{background:#c6d8ff}66%{background:#ffe2cd}}
  @media (prefers-reduced-motion: reduce){ .atlas-chamber *{ animation: none !important; } }
`;

// Stjärnhimmel: genereras en gång, stabil mellan renderingar. Olika storlek/ljus (djup), fler pulserar, några skiftar färg, de större strålar med kors.
const STARS = Array.from({ length: 150 }, () => {
  const depth = Math.pow(Math.random(), 1.6);                   // fler små/avlägsna, ett fåtal stora nära
  const r = Math.random();
  const kind = r < 0.44 ? "pulse" : r < 0.62 ? "hue" : "static";
  return {
    x: +(Math.random() * 100).toFixed(2),
    y: +(Math.random() * 64).toFixed(2),                        // övre "himlen"
    size: +(0.8 + (1 - depth) * 2.1).toFixed(2),                // ~0.8–2.9 px (mindre största)
    o: +(0.24 + (1 - depth) * 0.66).toFixed(2),                 // dimmare långt bort
    kind,
    dur: +(1.8 + Math.random() * 4).toFixed(1),
    delay: +(Math.random() * 6).toFixed(1),
  };
});

// Vintergata — tätare stjärnstoft längs ett diagonalt band.
const MILKY = Array.from({ length: 140 }, () => {
  const t = Math.random();
  const perp = (Math.random() - 0.5) * 15;
  return {
    x: +(6 + t * 90).toFixed(2),
    y: +(3 + t * 46 + perp).toFixed(2),
    size: +(0.6 + Math.random() * 1.5).toFixed(2),
    o: +(0.14 + Math.random() * 0.42).toFixed(2),
    kind: Math.random() < 0.18 ? "pulse" : "static",
    dur: +(2 + Math.random() * 4).toFixed(1),
    delay: +(Math.random() * 6).toFixed(1),
  };
});

// En enskild stjärna: kärna + glöd, och ett fyrudds-kors som får de större att stråla.
function Star({ s }) {
  const sz = s.size, big = sz > 2.1, glow = sz > 1.5;
  const contAnim = s.kind === "pulse" ? `atlasTwinkle ${s.dur}s ease-in-out ${s.delay}s infinite` : "none";
  const coreAnim = s.kind === "hue" ? `atlasStarHue ${(sz + s.dur + 3).toFixed(1)}s ease-in-out ${s.delay}s infinite` : "none";
  return (
    <div style={{ position: "absolute", left: s.x + "%", top: s.y + "%", width: sz + "px", height: sz + "px", "--o": s.o, opacity: s.o, animation: contAnim, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: s.kind === "hue" ? "#e2ecff" : "#fff", boxShadow: big ? `0 0 ${(sz * 3.2).toFixed(0)}px ${(sz * 0.7).toFixed(0)}px rgba(205,228,255,0.9)` : glow ? `0 0 ${(sz * 2).toFixed(0)}px rgba(205,228,255,0.7)` : "none", animation: coreAnim }} />
      {big && (
        <>
          <div style={{ position: "absolute", left: "50%", top: "50%", width: (sz * 5).toFixed(0) + "px", height: "1px", transform: "translate(-50%,-50%)", background: "linear-gradient(90deg, transparent, rgba(226,238,255,0.42), transparent)" }} />
          <div style={{ position: "absolute", left: "50%", top: "50%", width: "1px", height: (sz * 5).toFixed(0) + "px", transform: "translate(-50%,-50%)", background: "linear-gradient(180deg, transparent, rgba(226,238,255,0.42), transparent)" }} />
        </>
      )}
    </div>
  );
}
const ROOT_STYLE = { position: "relative", height: "100vh", overflow: "hidden", background: "radial-gradient(ellipse 90% 70% at 50% 30%, #121a26 0%, #0b0f16 46%, #06080c 100%)" };

function useParallax() {
  const reduced = usePrefersReducedMotion();
  const rootRef = useRef(null);
  // Parallax avstängd: --px/--py hålls på 0 så scenen inte förskjuts av muspekaren.
  const onMove = () => {};
  const onLeave = () => {};
  return { reduced, rootRef, onMove, onLeave };
}

function ChamberRoom() {
  const roomTf = f => ({ transform: `translate3d(calc(var(--px,0) * ${f}px), calc(var(--py,0) * ${(f * 0.6).toFixed(1)}px), 0)` });
  return (
    <>
      {/* vintergata — mjukt dis-band diagonalt över himlen */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden", ...roomTf(-2) }}>
        <div style={{ position: "absolute", left: "-15%", right: "-15%", top: "-8%", height: "66%", background: "radial-gradient(ellipse 58% 130% at 44% 50%, rgba(178,200,255,0.17), rgba(150,170,240,0.06) 42%, rgba(0,0,0,0) 70%), radial-gradient(ellipse 26% 92% at 60% 54%, rgba(255,224,198,0.11), rgba(0,0,0,0) 58%), radial-gradient(ellipse 42% 100% at 28% 46%, rgba(192,176,255,0.10), rgba(0,0,0,0) 64%)", transform: "rotate(-22deg)", filter: "blur(30px)" }} />
      </div>
      {/* vintergatans stjärnstoft (tätt band) */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", ...roomTf(-2) }}>
        {MILKY.map((s, i) => <Star key={"m" + i} s={s} />)}
      </div>
      {/* stjärnhimmel — längst bak, subtil parallax (rör sig minst = längst bort) */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", ...roomTf(-2) }}>
        {STARS.map((s, i) => <Star key={i} s={s} />)}
      </div>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "30%", pointerEvents: "none", background: "linear-gradient(180deg, rgba(30,44,66,0.55), rgba(10,14,20,0) 100%)", ...roomTf(-4) }}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: "-40%", right: "-40%", top: 0, height: "180%", background: "repeating-linear-gradient(90deg, transparent 0 92px, rgba(120,160,220,0.05) 92px 93px)", transform: "perspective(440px) rotateX(-60deg)", transformOrigin: "top center", WebkitMaskImage: "linear-gradient(to bottom, #000, transparent 78%)", maskImage: "linear-gradient(to bottom, #000, transparent 78%)" }} />
        </div>
      </div>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(90deg, rgba(6,9,14,0.85) 0%, rgba(6,9,14,0) 22%, rgba(6,9,14,0) 78%, rgba(6,9,14,0.85) 100%)", ...roomTf(-3) }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", pointerEvents: "none", background: "linear-gradient(0deg, rgba(14,22,34,0.7), rgba(8,11,17,0) 100%)", ...roomTf(-5) }}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: "-60%", right: "-60%", bottom: 0, height: "220%", background: "repeating-linear-gradient(90deg, transparent 0 90px, rgba(90,140,210,0.07) 90px 91px), repeating-linear-gradient(0deg, transparent 0 70px, rgba(90,140,210,0.06) 70px 71px)", transform: "perspective(430px) rotateX(65deg)", transformOrigin: "bottom center", WebkitMaskImage: "linear-gradient(to top, #000 10%, transparent 82%)", maskImage: "linear-gradient(to top, #000 10%, transparent 82%)" }} />
        </div>
      </div>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 4, background: "radial-gradient(ellipse 70% 66% at 50% 44%, rgba(6,9,14,0) 60%, rgba(4,6,10,0.5) 100%)" }} />
    </>
  );
}

function ChamberTopBar({ eyebrow, title, showStart, onStartTraining, mode, name, canNavBack, navBack }) {
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 26px", pointerEvents: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, pointerEvents: "auto" }}>
        {canNavBack && <button onClick={navBack} title="Tillbaka" aria-label="Tillbaka" style={{ ...btn.icon, width: 36, height: 36, fontSize: 19 }}>‹</button>}
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 2, color: T.accent.primary, textTransform: "uppercase" }}>{eyebrow}</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: T.text.primary, marginTop: 2 }}>{title}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, pointerEvents: "auto" }}>
        {showStart && <button onClick={onStartTraining} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 15px", borderRadius: 10, border: `1px solid ${T.accent.primary}`, cursor: "pointer", fontSize: 12.5, fontWeight: 800, color: "#fff", background: `linear-gradient(135deg, ${T.accent.primary}, ${T.accent.secondary})`, boxShadow: "0 8px 24px -8px rgba(77,163,255,0.7)" }}><Icon name="zap" size={14} /> Starta pass ›</button>}
        <span style={{ fontSize: 11, fontWeight: 700, color: mode === "demo" ? T.accent.warning : T.accent.success, border: `1px solid ${(mode === "demo" ? T.accent.warning : T.accent.success)}55`, borderRadius: 999, padding: "4px 11px", background: "rgba(0,0,0,0.25)" }}>{mode === "demo" ? "● Demo" : "● Riktig profil"}</span>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg, ${T.accent.primary}, ${T.accent.secondary})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{(name || "R")[0]}</div>
      </div>
    </div>
  );
}

const AUTO_TOPS = n => n <= 1 ? ["18%"] : n === 2 ? ["11%", "58%"] : ["9%", "38%", "68%"];

// ── Generisk body-centrerad kammare (kropp i mitten + konfigurerbara flytande paneler) ──
export function Chamber({ eyebrow, title, showStart, onStartTraining, mode, name, canNavBack, navBack, muscleStates, openMuscle, onResetRecovery, overallReadiness, leftPanels = [], rightPanels = [], showLegend = true, panelMode = "open" }) {
  const { reduced, rootRef, onMove, onLeave } = useParallax();
  const rec = overallReadiness == null ? 80 : overallReadiness;
  const orbColor = rec >= 76 ? T.accent.success : rec >= 56 ? T.accent.warning : T.accent.danger;
  // Panelerna ligger i två utspridda spalter (vänster/höger) — inget överlapp, ingen parallax.
  // pointerEvents none på spalten + auto på panelen: glappen släpper igenom klick till kroppen.
  const column = (arr, side) => (
    <div style={{ position: "absolute", [side]: "2.4%", top: 88, bottom: 26, width: side === "right" ? "clamp(256px, 22vw, 320px)" : "clamp(256px, 21vw, 300px)", display: "flex", flexDirection: "column", justifyContent: panelMode === "open" ? "center" : "flex-start", gap: 24, zIndex: 22, pointerEvents: "none" }}>
      {arr.map((p, i) => { const cfg = (p && p.node !== undefined) ? p : { node: p }; return <div key={i} style={{ pointerEvents: "auto" }}><FloatingPanel side={side} depth={cfg.depth || "near"} foreground={!!cfg.foreground} reduced={reduced} panelMode={panelMode} label={cfg.label} peek={cfg.peek}>{cfg.node}</FloatingPanel></div>; })}
    </div>
  );
  return (
    <div ref={rootRef} className="atlas-chamber" onMouseMove={onMove} onMouseLeave={onLeave} style={ROOT_STYLE}>
      <style>{CHAMBER_KEYFRAMES}</style>
      <ChamberRoom />

      {/* plattform */}
      <div style={{ position: "absolute", bottom: "calc(6% - 20px)", left: "50%", width: "clamp(360px, 42vw, 600px)", height: 120, pointerEvents: "none", zIndex: 6, transform: "translate3d(calc(-50% + var(--px,0) * 5px), calc(var(--py,0) * 4px), 0)" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(ellipse at center, rgba(77,163,255,0.42), rgba(77,163,255,0.10) 46%, rgba(77,163,255,0) 72%)", filter: "blur(6px)", animation: reduced ? "none" : "atlasPlatform 6s ease-in-out infinite" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "72%", height: "58%", borderRadius: "50%", border: "2px solid rgba(120,190,255,0.65)", boxShadow: "0 0 44px 6px rgba(77,163,255,0.4), inset 0 0 30px rgba(77,163,255,0.28)" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "94%", height: "76%", borderRadius: "50%", border: "1px solid rgba(120,190,255,0.22)" }} />
        {!reduced && [0, 2.6].map((d, i) => (
          <div key={i} style={{ position: "absolute", top: "50%", left: "50%", width: "72%", height: "58%", borderRadius: "50%", border: "1.5px solid rgba(120,195,255,0.5)", animation: `atlasRingPulse 5.2s ease-out ${d}s infinite` }} />
        ))}
      </div>

      {/* roterande glasdroppe runt bakre ringen — färg efter recovery-nivå (grön=träna, gul=ok, röd=vila) */}
      <div style={{ position: "absolute", top: "40%", left: "50%", width: "clamp(380px, 40vw, 560px)", height: "clamp(380px, 40vw, 560px)", zIndex: 8, pointerEvents: "none", transform: "translate3d(calc(-50% + var(--px,0) * 5px), calc(-50% + var(--py,0) * 4px), 0)" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px solid rgba(120,180,240,0.20)", boxShadow: "inset 0 0 70px rgba(77,163,255,0.07)" }} />
        <div style={{ position: "absolute", inset: 0, animation: reduced ? "none" : "atlasOrbit 8s linear infinite" }}>
          <div style={{ position: "absolute", top: -7, left: "50%", transform: "translateX(-50%)", width: 46, height: 14 }}>
            {/* avsmalnande svans */}
            <div style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", width: 34, height: 7, borderRadius: "4px 0 0 4px", background: `linear-gradient(270deg, ${orbColor}cc, ${orbColor}00)`, filter: "blur(1.3px)" }} />
            {/* glaskula-huvud */}
            <div style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, borderRadius: "50%", background: `radial-gradient(circle at 34% 30%, rgba(255,255,255,0.96), ${orbColor} 50%, ${orbColor}00 100%)`, boxShadow: `0 0 16px 4px ${orbColor}aa, 0 0 36px 11px ${orbColor}55, inset -1.5px -1.5px 3px ${orbColor}, inset 1.5px 1.5px 3px rgba(255,255,255,0.7)`, border: `1px solid ${orbColor}77`, animation: reduced ? "none" : "atlasCometPulse 3.6s ease-in-out infinite" }} />
          </div>
        </div>
      </div>

      {/* kropp */}
      <div style={{ position: "absolute", top: "5%", left: "50%", width: "clamp(420px, 42vw, 540px)", height: "90%", zIndex: 12, transform: "translate3d(calc(-50% + var(--px,0) * 5px), calc(var(--py,0) * 4px), 0)" }}>
        {!reduced && <div style={{ position: "absolute", left: "6%", right: "6%", height: 2, zIndex: 5, pointerEvents: "none", background: "linear-gradient(90deg, transparent, rgba(150,205,255,0.9), transparent)", boxShadow: "0 0 14px 2px rgba(120,195,255,0.6)", animation: "atlasScanSweep 8.5s ease-in-out infinite" }} />}
        <SvgBody onSelect={openMuscle} muscleStates={muscleStates} onReset={onResetRecovery} chamber reduced={reduced} />
      </div>

      <ChamberTopBar eyebrow={eyebrow} title={title} showStart={showStart} onStartTraining={onStartTraining} mode={mode} name={name} canNavBack={canNavBack} navBack={navBack} />

      {column(leftPanels, "left")}
      {column(rightPanels, "right")}

      {showLegend && (
        <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", zIndex: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, pointerEvents: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
            {[["Återhämtad", STATE_COL.ready], ["Återhämtar", STATE_COL.recovering], ["Överbelastad", STATE_COL.critical], ["Behöver uppmärksamhet", STATE_COL.undertrained]].map(([lab, c]) => (
              <span key={lab} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.text.secondary }}><span style={{ width: 9, height: 9, borderRadius: 3, background: c, boxShadow: `0 0 8px ${c}` }} />{lab}</span>
            ))}
          </div>
          <div style={{ fontSize: 11, color: T.text.muted }}>Dra kroppen för att vrida · klicka en muskel · hovra en panel för att fokusera</div>
        </div>
      )}
    </div>
  );
}

// ── Dashboard: kammaren med sina specifika paneler ──
export function AnalysisChamber({ muscleStates, overallReadiness, readinessInfo, recommendation, primaryMission, primaryMissionAnalysis, sessions, nutritionTotals, nutritionTargets, demo, profile, onStartTraining, openMuscle, onResetRecovery, go, mode, onAcceptNutSuggestion, panelMode = "open" , readinessWhy , personalData , laggingData , balanceData }) {
  const name = profile && profile.name ? profile.name : null;
  // nyckeltal för kompakt (utfällbart) läge — härledda, inga påhittade siffror
  const rdPeek = overallReadiness == null ? "Väntar på data" : `${Math.round(overallReadiness)} / 100`;
  const kcal = nutritionTotals ? Math.round(nutritionTotals.kcal || 0) : 0;
  const nutPeek = kcal > 0 ? `${kcal.toLocaleString("sv-SE")} kcal` : "Inget loggat än";
  const ready = muscleStates ? Object.values(muscleStates).filter(s => s && s.status === "ready").length : 0;
  const recovering = muscleStates ? Object.values(muscleStates).filter(s => s && s.status === "recovering").length : 0;
  const recPeek = ready + recovering > 0 ? `${ready} redo · ${recovering} återhämtar` : "—";
  const missionPeek = primaryMission ? (primaryMission.title || primaryMission.name || "Aktivt mål") : null;
  const coachPeek = recommendation ? (recommendation.title || "Förslag redo") : "—";
  return (
    <Chamber
      eyebrow="ATLAS · Analyskammare" title={name ? `Välkommen tillbaka, ${name}.` : "Välkommen till ATLAS."}
      onStartTraining={onStartTraining} mode={mode} name={name} panelMode={panelMode}
      muscleStates={muscleStates} openMuscle={openMuscle} onResetRecovery={onResetRecovery} overallReadiness={overallReadiness} showLegend
      leftPanels={[
        { node: <DashReadiness readiness={overallReadiness} info={readinessInfo} why={readinessWhy} />, depth: "near", label: "Readiness", peek: rdPeek },
        { node: <DashNutrition totals={nutritionTotals} targets={nutritionTargets} demo={demo} suggestion={profile && !profile.nutritionSuggestionAccepted ? (profile.nutritionSuggestion || null) : null} onAcceptSuggestion={onAcceptNutSuggestion} />, depth: "far", label: "Nutrition idag", peek: nutPeek },
      ]}
      rightPanels={[
        ...(personalData ? [{ node: <PersonalInsightCard data={personalData} />, foreground: personalData.needsConfirm, depth: "near", label: "Personligt", peek: personalData.needsConfirm ? "Stämmer loggen?" : "Dagens anpassning" }] : []),
        ...(laggingData && laggingData.length ? [{ node: <LaggingCard lagging={laggingData} />, depth: "mid", label: "Volym", peek: `${laggingData[0].groupSv} underarbetad` }] : []),
        ...(balanceData && balanceData.hasData ? [{ node: <BalanceMeter data={balanceData} />, depth: "near", label: "Balans", peek: `Balans ${balanceData.overall}/100` }] : []),
        ...(primaryMission ? [{ node: <DashMission mission={primaryMission} analysis={primaryMissionAnalysis} onOpen={() => go && go("Goals")} />, depth: "near", label: "Nästa mål", peek: missionPeek }] : []),
        { node: <DashCoach recommendation={recommendation} onStart={onStartTraining} />, foreground: true, label: "AI Coach", peek: coachPeek },
        { node: <DashRecovery sessions={sessions} demo={demo} />, depth: "far", label: "Återhämtning", peek: recPeek },
      ]}
    />
  );
}

// ── Innehållsflik: samma rum + topprad, men fliken behåller sitt innehåll centralt ──
export function ContentChamber({ eyebrow, title, showStart, onStartTraining, mode, name, canNavBack, navBack, children }) {
  const { rootRef, onMove, onLeave } = useParallax();
  return (
    <div ref={rootRef} className="atlas-chamber" onMouseMove={onMove} onMouseLeave={onLeave} style={ROOT_STYLE}>
      <style>{CHAMBER_KEYFRAMES}</style>
      <ChamberRoom />
      <ChamberTopBar eyebrow={eyebrow} title={title} showStart={showStart} onStartTraining={onStartTraining} mode={mode} name={name} canNavBack={canNavBack} navBack={navBack} />
      <div style={{ position: "relative", zIndex: 20, height: "100vh", overflowY: "auto", padding: "84px 32px 52px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>{children}</div>
      </div>
    </div>
  );
}
