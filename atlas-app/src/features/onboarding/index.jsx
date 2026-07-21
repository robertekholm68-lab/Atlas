// Askr onboarding — första-start-skärm + 7-stegs onboarding + legacy-migrering.
import { useState } from "react";
import { T, btn, overlay, modal } from "../../data/tokens.js";
import { ACTIVITY_LEVELS, DIETS, DIET_APPROACHES, DIET_RESTRICTIONS } from "../../engines/index.js";
import { getLegacyRecordTypes, importLegacyIntoReal, markLegacyKeptAsDemo } from "../../app/persist.js";

export function ModeSelect({ onPick }) {
  const Card = ({ title, desc, note, cta, primary, onClick }) => (
    <button onClick={onClick} style={{
      textAlign: "left", cursor: "pointer", background: T.bg.raised, border: `1px solid ${primary ? T.accent.primary : T.bg.muted}`,
      borderRadius: 16, padding: "22px 22px 20px", display: "flex", flexDirection: "column", gap: 8, width: "100%",
      boxShadow: primary ? `0 0 0 1px ${T.accent.primary}33, 0 8px 30px rgba(0,0,0,0.25)` : "0 4px 18px rgba(0,0,0,0.18)",
    }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: T.text.primary }}>{title}</div>
      <div style={{ fontSize: 13.5, color: T.text.secondary, lineHeight: 1.5 }}>{desc}</div>
      {note && <div style={{ fontSize: 11.5, color: T.text.muted, lineHeight: 1.45 }}>{note}</div>}
      <div style={{ marginTop: 8, alignSelf: "flex-start", ...(primary ? btn.primary : btn.tag), fontSize: 13.5, fontWeight: 700 }}>{cta}</div>
    </button>
  );
  return (
    <div style={{ minHeight: "100vh", background: T.bg.app, color: T.text.primary, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, boxSizing: "border-box" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: 1, color: T.text.primary }}>Askr</div>
          <div style={{ fontSize: 13.5, color: T.text.muted, marginTop: 6 }}>Din träning, din kropp, din data. Välj hur du vill börja.</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card primary title="Skapa min profil" cta="Kom igång →" onClick={() => onPick("real")}
            desc="Starta Askr för verklig användning med en helt tom historik."
            note="Ingen demodata kopieras. Readiness, trender och coachen bygger bara på det du själv loggar." />
          <Card title="Utforska demo" cta="Öppna demo" onClick={() => onPick("demo")}
            desc="Se Askr med färdig exempeldata — träningspass, mätvärden och insikter."
            note="Tydligt märkt som Demo-läge. Exempelresultat visas aldrig som dina egna." />
        </div>
        <div style={{ textAlign: "center", fontSize: 11, color: T.text.muted, marginTop: 20, lineHeight: 1.5 }}>Du kan byta läge senare. Demo och riktig profil hålls åtskilda och blandas aldrig.</div>
      </div>
    </div>
  );
}

// ── §2: Flerstegs-onboarding för Real User Mode ──
// Draften sparas per steg (usePersistentState i App) → avbruten onboarding kan återupptas efter omladdning.
// Slutförande skapar en stabil riktig profil UTAN att skapa demo-pass/måltider/mätvärden/återhämtning.
const GOALS = [["muscle", "Bygga muskler"], ["strength", "Öka styrka"], ["lose", "Gå ner i vikt"], ["cardio", "Bättre kondition"], ["health", "Allmän hälsa"]];
const LEVELS = [["beginner", "Nybörjare"], ["intermediate", "Medel"], ["advanced", "Avancerad"]];
const TRAIN_TYPES = ["Styrka", "Kroppsvikt", "Kondition", "HIIT", "Kettlebell", "Löpning", "Sport"];
const EQUIP_OPTS = ["Fullt gym", "Hemmagym", "Hantlar", "Skivstång & ställning", "Gummiband", "Maskiner", "Endast kroppsvikt", "Konditionsutrustning"];
const NUTRI_GOALS = [["maintain", "Hålla vikten"], ["cut", "Gå ner i vikt"], ["bulk", "Bygga muskler"], ["health", "Äta hälsosammare"]];
const GENDERS = [["female", "Kvinna"], ["male", "Man"], ["unspecified", "Vill ej ange"]];
const LOG_STYLES = [["quick", "Snabb"], ["detailed", "Detaljerad"], ["both", "Båda"]];
const COACH_LEVELS = [["flexible", "Flexibel"], ["balanced", "Balanserad"], ["strict", "Strikt"]];
const START_CHOICES = [["empty", "Börja helt tomt"], ["measurement", "Lägg till startvärde (vikt/mått)"]];

function Field({ label, hint, children }) {
  return <div style={{ marginBottom: 14 }}><div style={{ fontSize: 12.5, fontWeight: 700, color: T.text.secondary, marginBottom: 5 }}>{label}{hint && <span style={{ color: T.text.muted, fontWeight: 400 }}> · {hint}</span>}</div>{children}</div>;
}
function TextInput({ value, onChange, ...p }) {
  return <input value={value ?? ""} onChange={e => onChange(e.target.value)} {...p} style={{ width: "100%", background: T.bg.raised, border: `1px solid ${T.bg.muted}`, borderRadius: 8, padding: "9px 11px", color: T.text.primary, fontSize: 14, boxSizing: "border-box" }} />;
}
function NumInput({ value, onChange, ...p }) {
  return <input type="number" inputMode="decimal" value={value ?? ""} onChange={e => onChange(e.target.value === "" ? null : +e.target.value)} {...p} style={{ width: "100%", background: T.bg.raised, border: `1px solid ${T.bg.muted}`, borderRadius: 8, padding: "9px 11px", color: T.text.primary, fontSize: 14, boxSizing: "border-box" }} />;
}
function Chips({ options, value, onToggle, multi }) {
  const arr = multi ? (value || []) : value;
  const on = v => multi ? (arr.includes(v)) : arr === v;
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{options.map(o => { const [v, lab] = Array.isArray(o) ? o : [o, o]; return (
    <button key={v} onClick={() => onToggle(v)} style={{ padding: "8px 13px", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${on(v) ? T.accent.primary : T.bg.muted}`, background: on(v) ? "rgba(77,163,255,0.14)" : T.bg.raised, color: on(v) ? T.text.primary : T.text.secondary }}>{lab}</button>
  ); })}</div>;
}

export function OnboardingFlow({ draft, setDraft, onComplete, onExit }) {
  const d = draft || { step: 0 };
  const step = d.step || 0;
  const set = (patch) => setDraft({ ...d, ...patch });
  const setStep = (s) => setDraft({ ...d, step: Math.max(0, Math.min(6, s)) });
  const toggleMulti = (key, v) => { const cur = d[key] || []; set({ [key]: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] }); };
  // Tillbaka: steg 0 → ut till läges-valet (draften sparas och kan återupptas), annars ett steg bakåt.
  const back = () => step === 0 ? (onExit && onExit()) : setStep(step - 1);

  const steps = [
    { title: "Om dig", body: (
      <>
        <Field label="Namn eller visningsnamn"><TextInput value={d.name} onChange={v => set({ name: v })} placeholder="Ditt namn" /></Field>
        <Field label="Kön" hint="för kroppsfett- och energiberäkning"><Chips options={GENDERS} value={d.gender || "unspecified"} onToggle={v => set({ gender: v })} /></Field>
        <Field label="Kostval" hint="för närings- och tillskottsråd"><Chips options={DIETS.map(x => [x.id, x.label])} value={d.diet || "omnivore"} onToggle={v => set({ diet: v })} /></Field>
        <Field label="Kosthållning" hint="valfritt — metod/upplägg"><Chips options={DIET_APPROACHES.map(x => [x.id, x.label])} value={d.dietApproach || "none"} onToggle={v => set({ dietApproach: v })} /></Field>
        <Field label="Kostrestriktioner" hint="valfritt — flera går bra"><Chips options={DIET_RESTRICTIONS.map(x => [x.id, x.label])} value={d.restrictions} onToggle={v => toggleMulti("restrictions", v)} multi /></Field>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}><Field label="Ålder" hint="valfritt"><NumInput value={d.age} onChange={v => set({ age: v })} placeholder="år" /></Field></div>
          <div style={{ flex: 1 }}><Field label="Längd (cm)"><NumInput value={d.height} onChange={v => set({ height: v })} placeholder="cm" /></Field></div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}><Field label="Vikt (kg)"><NumInput value={d.weight} onChange={v => set({ weight: v })} placeholder="kg" /></Field></div>
          <div style={{ flex: 1 }}><Field label="Kroppsfett %" hint="valfritt"><NumInput value={d.bodyFat} onChange={v => set({ bodyFat: v })} placeholder="%" /></Field></div>
        </div>
        <div style={{ fontSize: 11, color: T.text.muted }}>Enheter: metriskt (cm/kg). Imperial kan läggas till senare.</div>
      </>
    ) },
    { title: "Ditt mål", body: (
      <>
        <Field label="Primärt mål"><Chips options={GOALS} value={d.primaryGoal} onToggle={v => set({ primaryGoal: v })} /></Field>
        <Field label="Sekundära mål" hint="valfritt, flera"><Chips options={GOALS.filter(g => g[0] !== d.primaryGoal)} value={d.secondaryGoals} onToggle={v => toggleMulti("secondaryGoals", v)} multi /></Field>
      </>
    ) },
    { title: "Din träning", body: (
      <>
        <Field label="Nivå"><Chips options={LEVELS} value={d.level} onToggle={v => set({ level: v })} /></Field>
        <Field label="Pass per vecka" hint="ungefär"><NumInput value={d.workoutsPerWeek} onChange={v => set({ workoutsPerWeek: v })} placeholder="t.ex. 3" /></Field>
        <Field label="Aktivitetsnivå på jobbet/vardagen" hint="utöver träning — påverkar energibehovet"><Chips options={ACTIVITY_LEVELS.map(l => [l.id, l.label])} value={d.activityLevel} onToggle={v => set({ activityLevel: v })} /></Field>
        <Field label="Träningstyper" hint="flera"><Chips options={TRAIN_TYPES} value={d.trainingTypes} onToggle={v => toggleMulti("trainingTypes", v)} multi /></Field>
        <Field label="Följer du ett program?" hint="valfritt"><Chips options={[["yes", "Ja"], ["no", "Nej"]]} value={d.followsProgram} onToggle={v => set({ followsProgram: v })} /></Field>
      </>
    ) },
    { title: "Utrustning", body: (
      <Field label="Vad har du tillgång till?" hint="flera"><Chips options={EQUIP_OPTS} value={d.equipment} onToggle={v => toggleMulti("equipment", v)} multi /></Field>
    ) },
    { title: "Kost & coach", body: (
      <>
        <Field label="Kostmål"><Chips options={NUTRI_GOALS} value={d.nutritionGoal} onToggle={v => set({ nutritionGoal: v })} /></Field>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}><Field label="Kalorimål" hint="valfritt"><NumInput value={d.calorieTarget} onChange={v => set({ calorieTarget: v })} placeholder="kcal" /></Field></div>
          <div style={{ flex: 1 }}><Field label="Proteinmål" hint="valfritt"><NumInput value={d.proteinTarget} onChange={v => set({ proteinTarget: v })} placeholder="g" /></Field></div>
        </div>
        <div style={{ fontSize: 11, color: T.text.muted, marginTop: -6, marginBottom: 12 }}>Vet du inte dina siffror? Hoppa över — Askr kan föreslå senare.</div>
        <Field label="Loggningsstil"><Chips options={LOG_STYLES} value={d.loggingStyle} onToggle={v => set({ loggingStyle: v })} /></Field>
        <Field label="Coach-nivå"><Chips options={COACH_LEVELS} value={d.coachLevel} onToggle={v => set({ coachLevel: v })} /></Field>
      </>
    ) },
    { title: "Skador & känsliga områden", body: (
      <>
        <Field label="Rörelser/övningar att undvika" hint="valfritt"><TextInput value={d.avoidMovements} onChange={v => set({ avoidMovements: v })} placeholder="t.ex. knäböj djupt, marklyft" /></Field>
        <Field label="Fritext" hint="valfritt"><TextInput value={d.injuryNotes} onChange={v => set({ injuryNotes: v })} placeholder="Skador, smärta, annat att ta hänsyn till" /></Field>
        <div style={{ fontSize: 11, color: T.text.muted, lineHeight: 1.5 }}>Askr ställer inga diagnoser och ersätter inte professionell medicinsk rådgivning.</div>
      </>
    ) },
    { title: "Hur vill du börja?", body: (
      <>
        <Field label="Starthistorik"><Chips options={START_CHOICES} value={d.startChoice || "empty"} onToggle={v => set({ startChoice: v })} /></Field>
        {d.startChoice === "measurement" && <div style={{ fontSize: 12, color: T.text.muted, lineHeight: 1.5 }}>Din angivna vikt{d.bodyFat != null ? "/kroppsfett" : ""} sparas som startvärde så att Progress har en utgångspunkt. Pass och styrkenivåer lägger du till genom att logga som vanligt.</div>}
        {(!d.startChoice || d.startChoice === "empty") && <div style={{ fontSize: 12, color: T.text.muted, lineHeight: 1.5 }}>Du börjar helt tomt. Ingen historik hittas på — allt bygger på det du loggar framåt.</div>}
      </>
    ) },
  ];

  const canContinue = step === 0 ? !!(d.name && d.name.trim()) : step === 1 ? !!d.primaryGoal : true;
  const cur = steps[step];
  const last = step === steps.length - 1;

  return (
    <div style={{ minHeight: "100vh", background: T.bg.app, color: T.text.primary, display: "flex", justifyContent: "center", padding: "24px 18px", boxSizing: "border-box", fontFamily: "'Inter', -apple-system, system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <button onClick={back} aria-label={step === 0 ? "Till läges-valet" : "Tillbaka"} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.text.muted, cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 14 }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>‹</span> {step === 0 ? "Läges-val" : "Tillbaka"}
        </button>
        <div style={{ display: "flex", gap: 5, marginBottom: 18 }}>
          {steps.map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? T.accent.primary : T.bg.muted }} />)}
        </div>
        <div style={{ fontSize: 12, color: T.text.muted, marginBottom: 3 }}>Steg {step + 1} av {steps.length}</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>{cur.title}</div>
        <div style={{ animation: "fadeIn .25s ease" }}>{cur.body}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 22, alignItems: "center" }}>
          <div style={{ flex: 1 }} />
          {!last && step >= 2 && <button onClick={() => setStep(step + 1)} style={{ background: "none", border: "none", color: T.text.muted, cursor: "pointer", fontSize: 13 }}>Hoppa över</button>}
          {!last
            ? <button onClick={() => canContinue && setStep(step + 1)} disabled={!canContinue} style={{ ...btn.primary, opacity: canContinue ? 1 : 0.45, cursor: canContinue ? "pointer" : "not-allowed" }}>Fortsätt →</button>
            : <button onClick={() => onComplete({ ...d, completed: true })} style={{ ...btn.primary }}>Slutför & skapa profil</button>}
        </div>
        {step === 0 && !canContinue && <div style={{ fontSize: 11.5, color: T.text.muted, marginTop: 8 }}>Ange ett namn för att fortsätta.</div>}
      </div>
    </div>
  );
}

// ── §7: Synligt migreringsbeslut när legacy v1-data upptäcks ──
// Aldrig tyst import, aldrig automatisk radering. Visar en sammanfattning av upptäckta posttyper.
// Val: Behåll som demodata · Importera till min riktiga profil · Ignorera tills vidare.
export function LegacyMigrationModal({ onDone }) {
  const [types] = useState(() => getLegacyRecordTypes());
  const [busy, setBusy] = useState(false);
  const doImport = () => { setBusy(true); try { importLegacyIntoReal(); } catch (e) {} window.location.reload(); };
  const keepDemo = () => { try { markLegacyKeptAsDemo(); } catch (e) {} onDone && onDone(); };
  const ignore = () => { onDone && onDone(); };
  return (
    <div style={overlay}>
      <div style={{ ...modal, maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Äldre Askr-data upptäckt</div>
        <div style={{ fontSize: 13, color: T.text.secondary, lineHeight: 1.55, marginBottom: 12 }}>
          Jag hittade data från en tidigare version (v1) i den här webbläsaren. Ingenting importeras eller raderas automatiskt — du bestämmer. Originaldatan lämnas orörd tills en import lyckats.
        </div>
        <div style={{ background: T.bg.raised, borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: T.text.muted, textTransform: "uppercase", marginBottom: 6 }}>Upptäckta posttyper</div>
          {types.length === 0 && <div style={{ fontSize: 12.5, color: T.text.muted }}>Inga läsbara poster.</div>}
          {types.map(t => (
            <div key={t.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: T.text.secondary, padding: "3px 0" }}>
              <span>{t.name}</span><span style={{ color: T.text.muted }}>{t.type}{t.count != null ? ` · ${t.count}` : ""}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={doImport} disabled={busy} style={{ ...btn.primary, width: "100%" }}>Importera till min riktiga profil</button>
          <button onClick={keepDemo} style={{ ...btn.pill, width: "100%" }}>Behåll som demodata</button>
          <button onClick={ignore} style={{ background: "none", border: "none", color: T.text.muted, cursor: "pointer", fontSize: 12.5, padding: "6px 0" }}>Ignorera tills vidare</button>
        </div>
        <div style={{ fontSize: 11, color: T.text.muted, marginTop: 10, lineHeight: 1.5 }}>Importen är idempotent: samma poster importeras aldrig två gånger. Din befintliga riktiga historik skrivs aldrig över.</div>
      </div>
    </div>
  );
}
