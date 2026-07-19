// GEMENSAMT — Card, Gauge, Stepper, hooks m.m.
import { useState, useEffect } from "react";
import { T, lbl, stepBtn } from "../../data/tokens.js";
import { SPORT_LIB, LEGACY_MAP } from "../../data/sportLibrary.js";
import { BookOpen, Dumbbell, Apple, Calendar, CalendarDays, User, Target, Camera, Heart, Gem, Cake, Flag, Sprout, Hourglass, Bell, Flame, Cog, Zap, TrendingUp, TrendingDown, Clock, AlertCircle, AlertTriangle, Scale, Minus, Beef, Compass, Trophy, Droplet, Sparkles, SlidersHorizontal } from "lucide-react";

// Central ikon-registry. Data/nav håller stabila NAMN; okända namn (geometriska
// märken som "◈", "◍", eller emoji vi medvetet behåller) faller tillbaka till råtecken.
const ICONS = { "book-open": BookOpen, dumbbell: Dumbbell, apple: Apple, calendar: Calendar, "calendar-days": CalendarDays, user: User, target: Target, camera: Camera, heart: Heart, gem: Gem, cake: Cake, flag: Flag, sprout: Sprout, hourglass: Hourglass, bell: Bell, flame: Flame, cog: Cog, zap: Zap, "trending-up": TrendingUp, "trending-down": TrendingDown, clock: Clock, "alert-circle": AlertCircle, "alert-triangle": AlertTriangle, scale: Scale, minus: Minus, beef: Beef, compass: Compass, trophy: Trophy, droplet: Droplet, sparkles: Sparkles, sliders: SlidersHorizontal };
function Icon({ name, size = 16, color, strokeWidth = 2, style }) {
  const C = ICONS[name];
  if (C) return <C size={size} color={color} strokeWidth={strokeWidth} style={{ flexShrink: 0, ...style }} />;
  return name || null; // fallback: råtecken (glyf/emoji) ärver förälderns stil
}

// Sport-/cardio-ikon: äkta relief-vektor för atletiska aktiviteter, annars emoji.
// Relief används bara i stort format (≥28 px) där den läser; småformat får emoji.
function SportIcon({ id, emoji, size = 32, style }) {
  const svg = SPORT_LIB[id] || SPORT_LIB[LEGACY_MAP[id]];
  if (svg) {
    const sized = svg.replace("<svg ", `<svg width="${size}" height="${size}" `);
    return <span aria-hidden style={{ display: "inline-flex", width: size, height: size, lineHeight: 0, ...style }} dangerouslySetInnerHTML={{ __html: sized }} />;
  }
  return <span style={{ fontSize: Math.round(size * 0.82), lineHeight: 1, display: "inline-block", ...style }}>{emoji}</span>;
}

function Gauge({ value, size = 150, stroke = 11, color, big, sub }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r, off = circ * (1 - value / 100);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.bg.muted} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off} style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: big ? 40 : 24, fontWeight: 800, color: T.text.primary, lineHeight: 1 }}>{value}{sub === "%" ? "%" : ""}</div>
        {sub && sub !== "%" && <div style={{ fontSize: 12, color: T.text.muted, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function Sparkline({ data, color, w = 58, h = 22 }) {
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return <svg width={w} height={h}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

const Card = ({ children, style, pad = 18 }) => (
  <div style={{
    background: `linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0) 40%), radial-gradient(130% 90% at 50% -12%, rgba(77,163,255,0.055), transparent 58%), ${T.bg.surface}`,
    border: "1px solid rgba(255,255,255,0.065)",
    borderRadius: 18,
    padding: pad,
    boxShadow: "0 16px 34px -16px rgba(0,0,0,0.62), 0 3px 10px -5px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.07), inset 0 0 0 1px rgba(255,255,255,0.012)",
    ...style,
  }}>{children}</div>
);

const CardLabel = ({ children, right }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
      <span style={{ width: 3, height: 13, borderRadius: 2, background: `linear-gradient(180deg, ${T.accent.primary}, ${T.accent.secondary})`, boxShadow: `0 0 8px -1px ${T.accent.primary}66`, flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.3, color: T.text.secondary, textTransform: "uppercase" }}>{children}</span>
    </span>
    {right}
  </div>
);

function MacroRing({ label, value, goal, color, unit = "g" }) {
  const hasGoal = typeof goal === "number" && goal > 0;
  const pct = hasGoal ? Math.min(100, Math.round(value / goal * 100)) : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <Gauge value={pct} size={92} stroke={9} color={color} sub={`${value}${unit}`} />
      <div style={{ fontSize: 12, color: T.text.secondary, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 11, color: T.text.muted }}>{hasGoal ? `mål ${goal}${unit}` : "inget mål"}</div>
    </div>
  );
}

function Stepper({ label, value, step, min, onChange, unit }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={lbl}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.bg.raised, borderRadius: 10, padding: 6 }}>
        <button onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))} style={stepBtn}>−</button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 20, fontWeight: 700, color: T.text.primary }}>{value}<span style={{ fontSize: 12, color: T.text.muted, fontWeight: 400 }}>{unit}</span></div>
        <button onClick={() => onChange(+(value + step).toFixed(2))} style={stepBtn}>+</button>
      </div>
    </div>
  );
}

function useIsMobile(bp = 820) {
  const [m, setM] = useState(typeof window !== "undefined" && window.innerWidth < bp);
  useEffect(() => {
    const f = () => setM(window.innerWidth < bp);
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, [bp]);
  return m;
}

function ComingSoon({ title, icon, note }) {
  return (
    <Card style={{ minHeight: 400, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 12 }}>
      <div style={{ fontSize: 40, opacity: 0.6 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.text.primary }}>{title}</div>
      <div style={{ fontSize: 14, color: T.text.muted, maxWidth: 360, lineHeight: 1.5 }}>{note}</div>
      <span style={{ fontSize: 11, color: T.accent.secondary, border: `1px solid ${T.accent.secondary}`, borderRadius: 20, padding: "4px 12px", marginTop: 4 }}>Planned for a later phase</span>
    </Card>
  );
}

function SemiGauge({ value, from = "#4da3ff", to = "#39D98A" }) {
  const w = 190, h = 108, r = 82, cx = 95, cy = 96;
  const pt = a => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  const [ax0, ay0] = pt(Math.PI), [ax1, ay1] = pt(0);
  const ang = Math.PI * (1 - value / 100), [vx, vy] = pt(ang);
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      <svg width={w} height={h}>
        <defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={from} /><stop offset="100%" stopColor={to} /></linearGradient></defs>
        <path d={`M ${ax0} ${ay0} A ${r} ${r} 0 0 1 ${ax1} ${ay1}`} fill="none" stroke={T.bg.muted} strokeWidth="11" strokeLinecap="round" />
        <path d={`M ${ax0} ${ay0} A ${r} ${r} 0 0 1 ${vx} ${vy}`} fill="none" stroke="url(#sg)" strokeWidth="11" strokeLinecap="round" style={{ transition: "all .6s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, top: 18, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: T.text.muted, marginTop: 2 }}>/ 100</div>
      </div>
    </div>
  );
}

export { Gauge, Sparkline, Card, CardLabel, MacroRing, Stepper, useIsMobile, ComingSoon, SemiGauge, Icon, SportIcon };
