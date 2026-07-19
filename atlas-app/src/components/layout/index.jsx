// LAYOUT — Sidebar, Desktop/MobileLayout
import { AICoachView } from "../../features/ai-coach/index.jsx";
import { BodyMapCard, MuscleMapView, SvgBody } from "../../features/body-map/index.jsx";
import { CalendarView } from "../../features/calendar/index.jsx";
import { Card, CardLabel, Sparkline, Icon } from "../common/index.jsx";
import { AICoachCard, ConditioningCard, CycleCard, DashCoach, DashGoal, DashLatest, DashMission, DashNutrition, DashReadiness, DashRecommendation, DashRecovery, MilestoneCard, MuscleStatusList, NutritionCard, ReadinessCard, RecentSessions, RecoveryCard, SportsCard, TodaysPlan, TrainingLoadCard, VolumeOverview } from "../../features/dashboard/index.jsx";
import { MOCK } from "../../data/demo.js";
import { EQUIP_PROFILES, EXERCISES } from "../../data/exercises.js";
import { NUTRITION_GOALS } from "../../data/foods.js";
import { GoalsView } from "../../features/goals/index.jsx";
import { NutritionView } from "../../features/nutrition/index.jsx";
import { ProfileView } from "../../features/profile/index.jsx";
import { SettingsView } from "../../features/settings/index.jsx";
import { ErrorBoundary } from "../error-boundary/index.jsx";
import { RecipesView } from "../../features/recipes/index.jsx";
import { ProgressView } from "../../features/progress/index.jsx";
import { T, btn, now } from "../../data/tokens.js";
import { ExerciseLibrary } from "../../features/training/index.jsx";
import { AnalysisChamber, Chamber, ContentChamber, NavRail } from "../../features/chamber/index.jsx";
import { ProgramsView, LoadBody } from "../../features/programs/index.jsx";
import { MachinesView } from "../../features/machines/index.jsx";
import { recommendPrograms } from "../../engines/programs.js";

function Sidebar({ active, setActive, mode, onSwitchMode }) {
  const nav = [["Dashboard", "▦"], ["Body Map", "◉"], ["Muskelfakta", "book-open"], ["Training", "dumbbell"], ["Recovery", "◍"], ["Nutrition", "apple"], ["Recept", "book-open"], ["Goals", "◈"], ["AI Coach", "✦"], ["Progress", "▤"], ["Maskiner", "cog"], ["Calendar", "calendar"], ["Profil", "user"], ["Inställningar", "sliders"]];
  return (
    <div style={{ width: 210, flexShrink: 0, background: T.bg.surface, borderRight: `1px solid ${T.bg.muted}`, display: "flex", flexDirection: "column", padding: "18px 14px", minHeight: "100vh", position: "sticky", top: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 20px" }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg, ${T.accent.primary}, ${T.accent.secondary})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#fff" }}>A</div>
        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: 0.5 }}>ATLAS</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        {nav.map(([label, icon]) => (
          <button key={label} onClick={() => setActive(label)} title={label}
            style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", borderRadius: 9, border: "none", cursor: "pointer", background: active === label ? T.bg.muted : "transparent", color: active === label ? T.text.primary : T.text.muted, fontSize: 13.5, fontWeight: active === label ? 600 : 500, textAlign: "left", transition: "background 0.15s" }}>
            <span style={{ fontSize: 14, width: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={15} /></span>{label}
          </button>
        ))}
      </div>
      {onSwitchMode && (
        <div style={{ marginTop: 10, padding: "10px 12px", background: T.bg.raised, border: `1px solid ${T.bg.muted}`, borderRadius: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: mode === "demo" ? T.accent.warning : T.accent.success }} />
            <span style={{ fontSize: 11.5, color: T.text.muted }}>Läge: <b style={{ color: T.text.secondary }}>{mode === "demo" ? "Demo" : "Riktig profil"}</b></span>
          </div>
          <button onClick={() => onSwitchMode(mode === "demo" ? "real" : "demo")} style={{ ...btn.tag, width: "100%", background: T.bg.surface, color: T.accent.primary, fontSize: 12.5, fontWeight: 600 }}>
            {mode === "demo" ? "Öppna min riktiga profil" : "Utforska demo-läget"}
          </button>
        </div>
      )}
      <div style={{ marginTop: 10, padding: "14px 16px", background: "linear-gradient(135deg, rgba(255,209,102,0.09), rgba(155,124,255,0.06))", border: "1px solid rgba(255,209,102,0.4)", borderRadius: 14, cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 0.5, color: "#FFD166" }}>ATLAS PRO</div>
            <div style={{ fontSize: 11, color: T.text.muted, marginTop: 2 }}>Peak Human Potential</div>
          </div>
          <span style={{ color: "#FFD166", fontSize: 16 }}>›</span>
        </div>
      </div>
    </div>
  );
}

function DesktopLayout({ mode, demo, onSwitchMode, trainingMetrics, nutritionTargets, nutritionDays, milestone, healthMetrics, muscleStates, overallReadiness, readinessInfo, recommendation, sessions, setSessions, userBodyweight, nav, setNav, navigate, navBack, canNavBack, openMuscle, setModal, previewExercise, setPreviewExercise, onStartTraining, foodLog, setFoodLog, nutritionTotals, goals, setGoals, missions, setMissions, primaryMission, primaryMissionAnalysis, equipProfile, setEquipProfile, equip, profile, setProfile, onLogSport, systemicRecovery, onResetRecovery, measurements, setMeasurements, mealMemory, setMealMemory, nutStyle, setNutStyle, panelMode, setPanelMode, activeSports, setActiveSports, supplements, setSupplements, personalData, laggingData, balanceData, onLogPeriod, cycle, readinessWhy, programs, setPrograms, activeProgramId, setActiveProgramId, activeProgram, profileGoal, goalProfile, onStartProgram }) {
  const go = navigate || setNav;
  const subtitles = {
    Dashboard: "Here's your body's status and today's plan.",
    "Body Map": "Tap any muscle to inspect its recovery state.",
    Muskelfakta: "Klicka direkt på en muskel för zoombild och fakta.",
    Training: "Log a session and browse your exercise library.",
    "Inställningar": "Anpassa appen efter dig.",
    Kroppen: "Kroppen är gränssnittet — återhämtning och muskelfakta på ett ställe.",
    Recovery: "How recovered each muscle group is right now.",
    Nutrition: "Logga dagens mat och följ makros mot dina mål.",
    Goals: "Följ dina mål — styrka, kropp, vanor och kondition.",
    "AI Coach": "Förklaringar och svar baserat på kroppens läge.",
    Historik: "Framsteg och träningskalender på ett ställe.",
    Progress: "Trender för volym, pass och muskelgrupper.",
    Maskiner: "Märkes- och gymspecifik maskindatabas — filtrera på din klubb.",
    Calendar: "Din träningskalender och genomförda pass.",
    Profil: "Dina mått, bilder och personliga data.",
  };

  let content;
  if (nav === "Muskelfakta") content = <MuscleMapView muscleStates={muscleStates} />;
  else if (nav === "Progress") content = <ProgressView sessions={sessions} overallReadiness={overallReadiness} profile={profile} measurements={measurements} setMeasurements={setMeasurements} setProfile={setProfile} />;
  else if (nav === "Maskiner") content = <MachinesView mode={mode} />;
  else if (nav === "AI Coach") content = <AICoachView muscleStates={muscleStates} foodLog={foodLog} recommendation={recommendation} sessions={sessions} nutritionTotals={nutritionTotals} nutritionTargets={nutritionTargets} nutritionDays={nutritionDays} mode={mode} goals={goals} overallReadiness={overallReadiness} profile={profile} measurements={measurements} missionAnalysis={primaryMissionAnalysis} goalProfile={goalProfile} activeProgram={activeProgram} cycle={cycle} supplements={supplements} programRec={activeProgram ? null : (recommendPrograms({ goal: profileGoal, weights: goalProfile && goalProfile.weights, equip, recovery: overallReadiness, history: sessions })[0] || {}).template} onStartProgram={onStartProgram} onOpenPrograms={() => navigate("Programs")} />;
  else if (nav === "Calendar") content = <CalendarView sessions={sessions} setSessions={setSessions} bodyweight={userBodyweight} activeProgram={activeProgram} />;
  else if (nav === "Nutrition") content = <NutritionView foodLog={foodLog} setFoodLog={setFoodLog} mealMemory={mealMemory} setMealMemory={setMealMemory} nutStyle={nutStyle} setNutStyle={setNutStyle} nutritionTargets={nutritionTargets} profile={profile} measurements={measurements} demo={demo} supplements={supplements} setSupplements={setSupplements} sessions={sessions} nutritionTotals={nutritionTotals} onOpenRecipes={() => navigate("Recept")} />;
  else if (nav === "Recept") content = <RecipesView profile={profile} nutritionTargets={nutritionTargets} foodLog={foodLog} setFoodLog={setFoodLog} />;
  else if (nav === "Goals") content = <GoalsView goals={goals} setGoals={setGoals} missions={missions} setMissions={setMissions} sessions={sessions} profile={profile} measurements={measurements} />;
  else if (nav === "Inställningar") content = <SettingsView panelMode={panelMode} setPanelMode={setPanelMode} activeSports={activeSports} setActiveSports={setActiveSports} profile={profile} setProfile={setProfile} />;
  else if (nav === "Profil") content = <ProfileView profile={profile} setProfile={setProfile} sessions={sessions} setSessions={setSessions} measurements={measurements} setMeasurements={setMeasurements} mode={mode} onSwitchMode={onSwitchMode} trainingMetrics={trainingMetrics} foodLog={foodLog} setFoodLog={setFoodLog} />;

  const cap = (node, h = "66vh") => <div style={{ maxHeight: h, overflowY: "auto", borderRadius: 16 }}>{node}</div>;
  const eyebrow = "ATLAS · Analyskammare";
  const nm = profile && profile.name;
  const equipCard = (
    <Card pad={12}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: T.text.muted, textTransform: "uppercase" }}>Utrustning</span>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {Object.keys(EQUIP_PROFILES).map(p => (
            <button key={p} onClick={() => setEquipProfile(p)} style={{ ...btn.tag, fontSize: 12.5, background: equipProfile === p ? T.accent.primary : T.bg.raised, color: equipProfile === p ? "#fff" : T.text.secondary }}>{p}</button>
          ))}
        </div>
        <span style={{ fontSize: 11.5, color: T.text.muted }}>{EXERCISES.filter(e => equip.includes(e.equipment)).length} av {EXERCISES.length} övningar tillgängliga</span>
      </div>
    </Card>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <NavRail active={nav === "Programs" ? "Training" : (nav === "Recovery" || nav === "Muskelfakta") ? "Kroppen" : (nav === "Progress" || nav === "Calendar") ? "Historik" : nav === "Recept" ? "Nutrition" : nav} setActive={go} mode={mode} onSwitchMode={onSwitchMode} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {nav === "Dashboard" ? (
          <AnalysisChamber muscleStates={muscleStates} overallReadiness={overallReadiness} readinessInfo={readinessInfo} readinessWhy={readinessWhy} personalData={personalData} laggingData={laggingData} balanceData={balanceData} recommendation={recommendation} primaryMission={primaryMission} primaryMissionAnalysis={primaryMissionAnalysis} sessions={sessions} nutritionTotals={nutritionTotals} nutritionTargets={nutritionTargets} demo={demo} profile={profile} onStartTraining={onStartTraining} openMuscle={openMuscle} onResetRecovery={onResetRecovery} go={go} mode={mode} onAcceptNutSuggestion={() => setProfile(p => ({ ...p, nutritionSuggestionAccepted: true }))} panelMode={panelMode} />
        ) : (nav === "Kroppen" || nav === "Recovery" || nav === "Muskelfakta") ? (
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 70, display: "flex", gap: 4, background: "rgba(15,18,25,0.9)", border: `1px solid ${T.bg.muted}`, borderRadius: 999, padding: 4, backdropFilter: "blur(6px)" }}>
              {[["Kroppen", "Återhämtning"], ["Muskelfakta", "Fakta"]].map(([tgt, label]) => {
                const on = tgt === "Muskelfakta" ? nav === "Muskelfakta" : nav !== "Muskelfakta";
                return <button key={tgt} onClick={() => go(tgt)} style={{ border: "none", cursor: "pointer", borderRadius: 999, padding: "6px 18px", fontSize: 12.5, fontWeight: 600, background: on ? T.accent.primary : "transparent", color: on ? "#08101c" : T.text.secondary, transition: "background .15s" }}>{label}</button>;
              })}
            </div>
            {nav === "Muskelfakta" ? (
              <ContentChamber eyebrow="ATLAS · Kroppen" title="Muskelfakta" showStart={false} mode={mode} name={nm} canNavBack={canNavBack} navBack={navBack}>
                <MuscleMapView muscleStates={muscleStates} />
              </ContentChamber>
            ) : (
              <Chamber eyebrow="ATLAS · Kroppen" title="Kroppen" panelMode={panelMode} onStartTraining={onStartTraining} mode={mode} name={nm} canNavBack={canNavBack} navBack={navBack} overallReadiness={overallReadiness}
                muscleStates={muscleStates} openMuscle={openMuscle} onResetRecovery={onResetRecovery}
                leftPanels={[{ node: <RecoveryCard sessions={sessions} demo={demo} />, label: "Återhämtning" }, { node: <ConditioningCard sessions={sessions} systemicRecovery={systemicRecovery} />, label: "Kondition" }, ...(cycle ? [{ node: <CycleCard cycle={cycle} onLogPeriod={onLogPeriod} />, label: "Menscykel", peek: cycle.short }] : [])]}
                rightPanels={[{ node: cap(<MuscleStatusList muscleStates={muscleStates} onSelect={openMuscle} title="Recovery by Muscle" />), label: "Muskelstatus" }, { node: <VolumeOverview sessions={sessions} />, depth: "far", label: "Volym" }]} />
            )}
          </div>
        ) : (nav === "Training" || nav === "Programs") ? (
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 70, display: "flex", gap: 4, background: "rgba(15,18,25,0.9)", border: `1px solid ${T.bg.muted}`, borderRadius: 999, padding: 4, backdropFilter: "blur(6px)" }}>
              {[["Training", "Pass"], ["Programs", "Program"]].map(([tgt, label]) => (
                <button key={tgt} onClick={() => go(tgt)} style={{ border: "none", cursor: "pointer", borderRadius: 999, padding: "6px 18px", fontSize: 12.5, fontWeight: 600, background: nav === tgt ? T.accent.primary : "transparent", color: nav === tgt ? "#08101c" : T.text.secondary, transition: "background .15s" }}>{label}</button>
              ))}
            </div>
            {nav === "Training" ? (
              <Chamber eyebrow={eyebrow} title="Training" panelMode={panelMode} showStart onStartTraining={onStartTraining} mode={mode} name={nm} canNavBack={canNavBack} navBack={navBack} overallReadiness={overallReadiness}
                muscleStates={muscleStates} openMuscle={openMuscle} onResetRecovery={onResetRecovery} showLegend={false}
                leftPanels={[{ node: equipCard, label: "Utrustning" }, { node: <TodaysPlan recommendation={recommendation} onStart={onStartTraining} />, label: "Dagens plan" }, { node: <SportsCard onLog={onLogSport} activeSports={activeSports} />, label: "Sport & aktivitet" }]}
                rightPanels={activeProgram
                  ? [{ node: <RecentSessions sessions={sessions} onSelect={openMuscle} />, label: "Senaste passen" }, { node: cap(<div><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: T.text.muted, textTransform: "uppercase", marginBottom: 8 }}>Programmets muskelbelastning</div><LoadBody program={activeProgram} /></div>, "60vh"), foreground: true, label: "Programbelastning" }]
                  : [{ node: <RecentSessions sessions={sessions} onSelect={openMuscle} />, label: "Senaste passen" }, { node: cap(<ExerciseLibrary onStart={() => setModal("session")} onPreview={setPreviewExercise} previewId={previewExercise?.id} equip={equip} />), foreground: true, label: "Övningsbank" }]} />
            ) : (
              <ContentChamber eyebrow="ATLAS · Träning" title="Program" showStart={false} mode={mode} name={nm} canNavBack={canNavBack} navBack={navBack}>
                <ProgramsView programs={programs} setPrograms={setPrograms} activeProgramId={activeProgramId} setActiveProgramId={setActiveProgramId} equip={equip} overallReadiness={overallReadiness} sessions={sessions} profileGoal={profileGoal} goalProfile={goalProfile} onStartProgram={onStartProgram} />
              </ContentChamber>
            )}
          </div>
        ) : (nav === "Historik" || nav === "Progress" || nav === "Calendar") ? (
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 70, display: "flex", gap: 4, background: "rgba(15,18,25,0.9)", border: `1px solid ${T.bg.muted}`, borderRadius: 999, padding: 4, backdropFilter: "blur(6px)" }}>
              {[["Historik", "Framsteg"], ["Calendar", "Kalender"]].map(([tgt, label]) => {
                const on = tgt === "Calendar" ? nav === "Calendar" : nav !== "Calendar";
                return <button key={tgt} onClick={() => go(tgt)} style={{ border: "none", cursor: "pointer", borderRadius: 999, padding: "6px 18px", fontSize: 12.5, fontWeight: 600, background: on ? T.accent.primary : "transparent", color: on ? "#08101c" : T.text.secondary, transition: "background .15s" }}>{label}</button>;
              })}
            </div>
            <ContentChamber eyebrow="ATLAS · Historik" title={nav === "Calendar" ? "Kalender" : "Framsteg"} showStart={false} mode={mode} name={nm} canNavBack={canNavBack} navBack={navBack}>
              {nav === "Calendar"
                ? <CalendarView sessions={sessions} setSessions={setSessions} bodyweight={userBodyweight} activeProgram={activeProgram} />
                : <ProgressView sessions={sessions} overallReadiness={overallReadiness} profile={profile} measurements={measurements} setMeasurements={setMeasurements} setProfile={setProfile} />}
            </ContentChamber>
          </div>
        ) : (
          <ContentChamber eyebrow={eyebrow} title={nav} showStart={false} mode={mode} name={nm} canNavBack={canNavBack} navBack={navBack}>
            <ErrorBoundary key={nav} compact>{content}</ErrorBoundary>
          </ContentChamber>
        )}
      </div>
    </div>
  );
}

function MobileTab({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 0", color: active ? T.accent.primary : T.text.muted }}>
      <span style={{ fontSize: 17 }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: active ? 600 : 500 }}>{label}</span>
    </button>
  );
}

function MobileLayout({ mode, demo, onSwitchMode, trainingMetrics, nutritionTargets, nutritionDays, milestone, healthMetrics, muscleStates, overallReadiness, readinessInfo, readinessWhy, recommendation, sessions, setSessions, mobileTab, setMobileTab, navigateMobile, mobileBack, canMobileBack, openMuscle, setModal, previewExercise, setPreviewExercise, onStartTraining, foodLog, setFoodLog, nutritionTotals, goals, setGoals, missions, setMissions, primaryMission, primaryMissionAnalysis, equipProfile, setEquipProfile, equip, profile, setProfile, measurements, setMeasurements, onLogSport, systemicRecovery, mealMemory, setMealMemory, onResetRecovery }) {
  const goM = navigateMobile || setMobileTab;
  const readyColor = overallReadiness == null ? T.text.muted : overallReadiness >= 76 ? T.accent.success : overallReadiness >= 56 ? T.accent.warning : T.accent.danger;

  const Dashboard = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {sessions.length === 0 && <div style={{ background: "linear-gradient(135deg, rgba(77,163,255,0.10), rgba(155,124,255,0.06))", border: `1px solid ${T.bg.muted}`, borderRadius: 14, padding: "16px 16px", fontSize: 13.5, color: T.text.secondary, lineHeight: 1.55 }}><b style={{ color: T.text.primary }}>Välkommen till ATLAS.</b> Logga ditt första pass eller mätvärde för att börja bygga din personliga översikt.</div>}
        <ReadinessCard readiness={overallReadiness} info={readinessInfo} why={readinessWhy} />
      <DashMission mission={primaryMission} analysis={primaryMissionAnalysis} />
      <TodaysPlan recommendation={recommendation} onStart={onStartTraining} />
      <div style={{ height: 560 }}><SvgBody onSelect={openMuscle} muscleStates={muscleStates} onReset={onResetRecovery} /></div>
      <AICoachCard recommendation={recommendation} onAsk={() => setModal("session")} />
      <RecoveryCard sessions={sessions} demo={demo} />
      <NutritionCard totals={nutritionTotals} targets={nutritionTargets} demo={demo} suggestion={profile && !profile.nutritionSuggestionAccepted ? (profile.nutritionSuggestion || null) : null} onAcceptSuggestion={() => setProfile(p => ({ ...p, nutritionSuggestionAccepted: true }))} />
      {/* §1/§3: Key Metrics är exempel-hälsodata — bara i demo. Real Mode har ingen hälsokälla. */}
      {demo ? (
        <Card>
          <CardLabel right={<span style={{ fontSize: 10, fontWeight: 700, color: T.text.muted, background: T.bg.raised, padding: "2px 7px", borderRadius: 5 }}>EXEMPEL · ingen datakälla</span>}>Key Metrics</CardLabel>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {MOCK.metrics.map(m => (
              <div key={m.label} style={{ flex: "0 0 128px", background: T.bg.raised, borderRadius: 12, padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><span style={{ fontSize: 13 }}>{m.icon}</span><span style={{ fontSize: 12, color: T.text.muted }}>{m.label}</span></div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}><span style={{ fontSize: 19, fontWeight: 800, color: T.text.primary }}>{m.value}</span><span style={{ fontSize: 11, color: T.text.muted }}>{m.unit}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 6 }}><span style={{ fontSize: 10, color: m.color }}>● {m.state}</span><Sparkline data={m.spark} color={m.sparkColor} w={44} /></div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card><CardLabel>Hälsa & mätvärden</CardLabel>
          <div style={{ fontSize: 13.5, color: T.text.secondary, lineHeight: 1.55 }}>Ingen hälsodata ansluten ännu.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {["Sömn", "HRV", "Vilopuls", "Steg"].map(k => <span key={k} style={{ fontSize: 11.5, color: T.text.muted, background: T.bg.raised, borderRadius: 999, padding: "4px 10px" }}>{k} —</span>)}
          </div>
        </Card>
      )}
      <MilestoneCard milestone={milestone} demo={demo} />
    </div>
  );

  const Body = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ height: 460 }}><BodyMapCard muscleStates={muscleStates} selectedId={null} onSelect={openMuscle} previewExercise={previewExercise} onClearPreview={() => setPreviewExercise(null)} /></div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: T.text.muted, textTransform: "uppercase" }}>Muskelkarta</div>
      <MuscleMapView muscleStates={muscleStates} />
    </div>
  );

  const Progress = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <TrainingLoadCard demo={demo} metrics={trainingMetrics} />
      <RecoveryCard sessions={sessions} demo={demo} />
      <MilestoneCard milestone={milestone} demo={demo} />
    </div>
  );

  const Profile = <ProfileView profile={profile} setProfile={setProfile} sessions={sessions} setSessions={setSessions} measurements={measurements} setMeasurements={setMeasurements} mode={mode} onSwitchMode={onSwitchMode} trainingMetrics={trainingMetrics} foodLog={foodLog} setFoodLog={setFoodLog} />;

  const content = mobileTab === "Dashboard" ? Dashboard : mobileTab === "Body" ? Body : mobileTab === "Progress" ? Progress : Profile;

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 70 }}>
      {/* Top bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: T.bg.app, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px 10px", borderBottom: `1px solid ${T.bg.muted}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          {canMobileBack && <button onClick={mobileBack} title="Tillbaka" aria-label="Tillbaka" style={{ ...btn.icon, width: 32, height: 32, fontSize: 18 }}>‹</button>}
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent.primary}, ${T.accent.secondary})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff" }}>A</div>
          <div><div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1 }}>{(profile && profile.name) ? `Hej, ${profile.name}` : "ATLAS"}</div><div style={{ fontSize: 11, color: T.text.muted }}>{overallReadiness == null ? <span>Logga ditt första pass</span> : <>Readiness <b style={{ color: readyColor }}>{overallReadiness}</b>/100</>}</div></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {onSwitchMode && <button onClick={() => onSwitchMode(mode === "demo" ? "real" : "demo")} style={{ background: T.bg.raised, border: `1px solid ${mode === "demo" ? T.accent.warning + "66" : T.bg.muted}`, color: mode === "demo" ? T.accent.warning : T.accent.primary, borderRadius: 999, padding: "5px 11px", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>{mode === "demo" ? "◑ Min profil" : "◑ Demo"}</button>}
          <button style={btn.icon}><Icon name="bell" size={16} /></button>
        </div>
      </div>

      <div style={{ padding: "14px 16px", animation: "fadeIn 0.3s ease" }}><ErrorBoundary key={mobileTab} compact>{content}</ErrorBoundary></div>

      {/* Bottom tab bar with center Log FAB */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 60, background: T.bg.surface, borderTop: `1px solid ${T.bg.muted}`, display: "flex", alignItems: "center", padding: "4px 6px 6px", height: 62 }}>
        <MobileTab icon="▦" label="Home" active={mobileTab === "Dashboard"} onClick={() => goM("Dashboard")} />
        <MobileTab icon="◉" label="Body" active={mobileTab === "Body"} onClick={() => goM("Body")} />
        <button onClick={onStartTraining} style={{ flex: "0 0 56px", height: 56, marginTop: -18, borderRadius: "50%", border: `3px solid ${T.bg.app}`, background: `linear-gradient(135deg, ${T.accent.primary}, ${T.accent.secondary})`, color: "#fff", fontSize: 26, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(77,163,255,0.4)" }}>+</button>
        <MobileTab icon="▤" label="Progress" active={mobileTab === "Progress"} onClick={() => goM("Progress")} />
        <MobileTab icon="○" label="Profile" active={mobileTab === "Profile"} onClick={() => goM("Profile")} />
      </div>
    </div>
  );
}

export { Sidebar, DesktopLayout, MobileTab, MobileLayout };
