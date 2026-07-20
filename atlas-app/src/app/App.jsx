// ATLAS ROOT — state-hub + routing
import { useState, useEffect } from "react";
import { usePersistentState, clearModeData, getMode, setModeStored, runMigrations, mergeProfileFromOnboarding, hasLegacyV1, getMigrationStatus, maybeReseedDemo, resetDemoSeed } from "./persist.js";
import { ModeSelect, OnboardingFlow } from "../features/onboarding/index.jsx";
import { MuscleModal } from "../features/body-map/index.jsx";
import { useIsMobile } from "../components/common/index.jsx";
import { INITIAL_FOOD_LOG, INITIAL_GOALS, INITIAL_MEAL_MEMORY, INITIAL_MEASUREMENTS, INITIAL_MISSIONS, INITIAL_PROFILE, INITIAL_SESSIONS, MOCK, DEMO_PROGRAM, DEMO_PROGRAMS } from "../data/demo.js";
import { computeNutrition, computeReadiness, computeRecommendation, computeRecovery, computeSystemicFatigue, dataConfidence, deriveTrainingMetrics, resolveNutritionTargets, suggestNutritionTargets, deriveMilestone, distinctNutritionDays, metricSeries, currentWeight, latestMetric, cyclePhase, cycleReadinessModifier, nutritionRecoveryModifier, readinessBreakdown, logReliability, personalInsight, startOfLocalDay, laggingGroups, laggingMuscleAdvice, balanceScore } from "../engines/index.js";
import { primaryMission as pickPrimaryMission, missionAnalysis } from "../engines/mission.js";
import { buildSession, migrateSessions } from "../engines/session.js";
import { nextWorkout, workoutExercises } from "../engines/programs.js";
import { derivedProgramGoal, defaultGoalProfile, goalProfileFromOnboarding } from "../engines/goal.js";
import { EQUIP_PROFILES, SPORTS, DEFAULT_ACTIVE_SPORTS } from "../data/exercises.js";
import { NUTRITION_GOALS } from "../data/foods.js";
import { DesktopLayout, MobileLayout } from "../components/layout/index.jsx";
import { LegacyMigrationModal } from "../features/onboarding/index.jsx";
import { MUSCLES } from "../data/muscles.js";
import { SportModal } from "../features/profile/index.jsx";
import { T, btn, input, modal, now } from "../data/tokens.js";
import { PostSessionModal, SessionModal, TrainingMode } from "../features/training/index.jsx";

// Tom profil för Real Mode — ingen demodata, ingen historik.
const EMPTY_PROFILE = { name: "", age: null, height: null, weight: null, bodyFat: null, memberSince: null, avatar: null, photos: [], measurements: {}, weightHistory: [] };

function AtlasApp({ mode, onSwitchMode }) {
  const demo = mode === "demo";
  // Säkerställ färsk demodata FÖRE att usePersistentState-initierarna läser localStorage.
  // Lazy useState → körs synkront en gång vid första render, före hooks-raderna nedan.
  useState(() => { if (demo) maybeReseedDemo(); return 0; });
  const [sessions, setSessions] = usePersistentState("sessions", demo ? INITIAL_SESSIONS : [], mode);
  const [measurements, setMeasurements] = usePersistentState("measurements", demo ? INITIAL_MEASUREMENTS : [], mode);
  const [nav, setNav] = useState("Dashboard");
  const [mobileTab, setMobileTab] = useState("Dashboard");
  const [selectedMuscle, setSelectedMuscle] = useState(null);
  const [modal, setModal] = useState(null);
  const [completedSession, setCompletedSession] = useState(null);
  const [previewExercise, setPreviewExercise] = useState(null);
  const [training, setTraining] = useState(false);
  const [foodLog, setFoodLog] = usePersistentState("foodLog", demo ? INITIAL_FOOD_LOG : [], mode);
  const [mealMemory, setMealMemory] = usePersistentState("mealMemory", demo ? INITIAL_MEAL_MEMORY : [], mode);
  const [nutStyle, setNutStyle] = usePersistentState("nutStyle", "balanced", mode);
  const [panelMode, setPanelMode] = usePersistentState("panelMode", "open", mode);
  const [activeSports, setActiveSports] = usePersistentState("activeSports", DEFAULT_ACTIVE_SPORTS, mode);
  const [supplements, setSupplements] = usePersistentState("supplements", [], mode);
  const [logConfirmDate, setLogConfirmDate] = usePersistentState("logConfirmDate", null, mode);
  const [goals, setGoals] = usePersistentState("goals", demo ? INITIAL_GOALS : [], mode);
  const [missions, setMissions] = usePersistentState("missions", demo ? INITIAL_MISSIONS : [], mode);
  const [programs, setPrograms] = usePersistentState("programs", demo ? DEMO_PROGRAMS : [], mode);
  const [activeProgramId, setActiveProgramId] = usePersistentState("activeProgramId", demo ? DEMO_PROGRAM.id : null, mode);
  const [programPlan, setProgramPlan] = useState(null);
  const [equipProfile, setEquipProfile] = usePersistentState("equipProfile", "Gym", mode);
  const [profile, setProfile] = usePersistentState("profile", demo ? INITIAL_PROFILE : EMPTY_PROFILE, mode);
  const [onboarding, setOnboarding] = usePersistentState("onboarding", { step: 0, completed: demo }, mode);
  const [sportPreset, setSportPreset] = useState(SPORTS[0].id);
  const equip = EQUIP_PROFILES[equipProfile];
  const [legacyDismissed, setLegacyDismissed] = useState(false);
  useEffect(() => { runMigrations(mode); }, [mode]);
  // Säker engångsmigrering av äldre lagrade pass: backfill:ar id/tidsstämplar/entryId/schemaV, bevarar muscleLoads.
  useEffect(() => { setSessions(prev => { const r = migrateSessions(prev); return r.changed ? r.sessions : prev; }); }, []);
  const userBodyweight = currentWeight(profile, measurements);   // faktisk vikt för kroppsvikt-last
  const _t0day = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); })();
  const nutritionTotals = computeNutrition((foodLog || []).filter(e => (e.ts == null ? _t0day : e.ts) >= _t0day)); // dagens intag, inte hela historiken
  const isMobile = useIsMobile();

  // ── Härledda vs. demo-värden (aldrig demo-fixtures i Real Mode) ──
  const trainingMetrics = deriveTrainingMetrics(sessions, Date.now(), profile && profile.weeklyTarget);   // §2: streak/volym/7-dagarsbelastning ur AKTIV historik (+ ev. veckomål ur onboarding)
  const nutritionTargets = resolveNutritionTargets(profile, mode);        // §4: användarmål → accepterat förslag → inget
  const nutritionDays = distinctNutritionDays(foodLog);                   // §9: distinkta loggade dagar (foodLog är redan aktivt läges namespace)
  const milestone = demo ? MOCK.milestone : deriveMilestone(goals);       // §12: riktig milstolpe ur mål, annars null
  // §Målresa: primär målresa + deterministisk analys (samma rena motor som målfliken använder).
  const missionCtx = { weekly: sessions.filter(s => Date.now() - s.completedAt < 7 * 24 * 3600000).length, bodyweight: currentWeight(profile, measurements), bodyfat: latestMetric(measurements, "bodyFat") };
  const primaryMission = pickPrimaryMission(missions);
  const primaryMissionAnalysis = primaryMission ? missionAnalysis(primaryMission, goals, missionCtx) : null;
  const healthMetrics = demo ? MOCK : null;                               // §3: ingen hälsokälla i Real Mode
  // Legacy-migrering (§7): visa beslut bara när v1-data finns och inget permanent beslut är taget.
  const migStatus = getMigrationStatus();
  const showLegacy = mode === "real" && hasLegacyV1() && !migStatus && !legacyDismissed;

  const nowMs = Date.now();
  const systemicFatigue = computeSystemicFatigue(sessions, nowMs);
  const cardioPenalty = Math.min(18, Math.round(systemicFatigue));
  const systemicRecovery = Math.max(0, Math.min(100, Math.round(100 - systemicFatigue)));
  const muscleStates = {};
  Object.keys(MUSCLES).forEach(id => {
    const rec = computeRecovery(sessions, id, nowMs);
    const weeklyLoad = sessions.filter(s => nowMs - s.completedAt < 7 * 24 * 3600000).reduce((sum, s) => sum + (s.muscleLoads[id] || 0), 0);
    const baseReadiness = computeReadiness(rec.recoveryScore, weeklyLoad, rec.daysSince);
    // nutrition + systemic conditioning fatigue adjust readiness (not per-muscle fatigue)
    const readiness = rec.status === "no_data" ? baseReadiness : Math.max(0, Math.min(100, baseReadiness - cardioPenalty));
    muscleStates[id] = { ...rec, weeklyLoad, readiness, recentlyTrained: rec.daysSince < 2 };
  });
  const totalWeight = Object.values(muscleStates).reduce((a, s) => a + s.weeklyLoad, 0) || 1;
  // Ärlighet: visa bara en readiness-siffra när det finns FÄRSK träningsbelastning att bygga den på.
  // Utan underlag (t.ex. ny riktig profil) → null, och gränssnittet visar ett "för lite data"-tillstånd i stället för en påhittad siffra.
  const hasRecentTraining = totalWeight > 1;
  const cycle = cyclePhase(profile);                                 // menscykel-fas (opt-in) eller null
  const personalizedInsights = !!(profile && profile.personalizedInsights);   // opt-in via Profil
  const _logRel = logReliability(foodLog);
  const _todayKey = startOfLocalDay(Date.now());
  const _logConfirmedToday = logConfirmDate === "ok:" + _todayKey;
  const _logSkippedToday = logConfirmDate === "skip:" + _todayKey;
  const _useNutrition = personalizedInsights && !_logSkippedToday && (_logRel.reliable || _logConfirmedToday);
  const nutRec = _useNutrition ? nutritionRecoveryModifier({ foodLog, nutritionTargets, profile }) : { mod: 0, factors: [] }; // opt-in + logg-bekräftad
  const trainingBase = hasRecentTraining ? Object.values(muscleStates).reduce((sum, s) => sum + s.readiness * (s.weeklyLoad / totalWeight), 0) : null;
  const readinessWhy = hasRecentTraining ? readinessBreakdown(trainingBase, cycle, nutRec) : null;
  const overallReadiness = readinessWhy ? readinessWhy.total : null;
  const laggingData = laggingGroups(sessions).map(l => ({ ...l, advice: laggingMuscleAdvice(sessions, l.group) }));
  const balanceData = (profile && profile.balanceMeter) ? balanceScore({ overallReadiness, sessions, foodLog, nutritionTargets, systemicRecovery }) : null;
  const personalData = personalizedInsights ? {
    needsConfirm: !_logRel.reliable && !_logConfirmedToday && !_logSkippedToday,
    skipped: _logSkippedToday,
    days: _logRel.days,
    text: personalInsight({ readiness: overallReadiness, cycle, nutRec, includeNutrition: _useNutrition }),
    onConfirm: () => setLogConfirmDate("ok:" + _todayKey),
    onSkip: () => setLogConfirmDate("skip:" + _todayKey),
  } : null;
  const recommendation = hasRecentTraining
    ? computeRecommendation(muscleStates)
    : { title: "Logga ditt första pass", group: "start", summary: "Logga ett träningspass så börjar ATLAS bygga din readiness och dina rekommendationer utifrån just din träning.", targetMuscles: [], actionLabel: "Starta pass", explanation: [] };
  const readinessInfo = dataConfidence("readiness", { sessions, recentLoad: totalWeight });

  const openMuscle = id => { setSelectedMuscle(id); setModal("muscle"); };
  // ── Navigations-historik → konsekventa tillbakapilar i alla vyer ──
  // Att gå "hem" (Dashboard) nollställer historiken, så hemvyn aldrig visar en tillbakapil.
  const [navHistory, setNavHistory] = useState([]);
  const [mobileHistory, setMobileHistory] = useState([]);
  const navigate = next => { if (next === nav) return; if (next === "Dashboard") { setNavHistory([]); } else { setNavHistory(h => [...h, nav]); } setNav(next); };
  const navBack = () => setNavHistory(h => { if (!h.length) { setNav("Dashboard"); return h; } setNav(h[h.length - 1]); return h.slice(0, -1); });
  const navigateMobile = next => { if (next === mobileTab) return; if (next === "Dashboard") { setMobileHistory([]); } else { setMobileHistory(h => [...h, mobileTab]); } setMobileTab(next); };
  const mobileBack = () => setMobileHistory(h => { if (!h.length) { setMobileTab("Dashboard"); return h; } setMobileTab(h[h.length - 1]); return h.slice(0, -1); });
  // Alla loggnings-vägar → EN kanonisk session (kompletta sets, stabila id:n, muscleLoads ur faktisk bodyweight).
  const activeProgram = programs.find(p => p.id === activeProgramId && !p.archived) || null;
  const goalProfile = (profile && profile.goalProfile) || (demo ? defaultGoalProfile() : null);
  const profileGoal = goalProfile ? derivedProgramGoal(goalProfile) : null;
  const startProgramWorkout = prog => { const p = prog || activeProgram; if (!p) { setTraining(true); return; } const nw = nextWorkout(p, sessions); if (nw) setProgramPlan({ programId: p.id, workoutId: nw.workout.id, name: nw.workout.name, items: workoutExercises(nw.workout).map(x => ({ exId: x.exId, name: x.exercise.name, sets: x.sets, repMin: x.repMin, repMax: x.repMax, restSec: x.restSec })) }); setTraining(true); };
  const handleComplete = raw => { const s0 = buildSession({ ...raw, bodyweight: userBodyweight }); const session = raw.programId ? { ...s0, programId: raw.programId, workoutId: raw.workoutId || null } : s0; setSessions(s => [...s, session]); setCompletedSession(session); setModal("post"); };

  const mapEquip = (list = []) => { const s = list.join(" ").toLowerCase(); if (s.includes("fullt gym") || s.includes("maskiner")) return "Gym"; if (list.length === 1 && s.includes("endast kroppsvikt")) return "Kroppsvikt"; if (s.includes("kettlebell") && !s.includes("skivstång") && !s.includes("hantlar")) return "Kettlebell"; return "Hemma"; };
  const finishOnboarding = (dr) => {
    const memberSince = new Date().toLocaleDateString("sv-SE", { year: "numeric", month: "short" });
    // §5: SÄKER SAMMANFOGNING — bevarar id, avatar, bilder, mått, vikthistorik, medlemsdatum m.m.
    setProfile(p => {
      const merged = mergeProfileFromOnboarding(p, dr, memberSince);
      // Cold-start: seed:a goalProfile ur valt mål så coach/målresa har signal från start.
      // Skriv ALDRIG över en befintlig (ev. finjusterad) goalProfile vid omstartad onboarding.
      if (!merged.goalProfile) { const gp = goalProfileFromOnboarding(dr.primaryGoal, dr.secondaryGoals); if (gp) merged.goalProfile = gp; }
      // Cold-start: föreslå ett kostmål ur kostmål + vikt om användaren INTE angett egna siffror.
      // Sparas som VÄNTANDE förslag (accepteras aldrig automatiskt) — kalorimål ska vara ett aktivt val.
      const nt = merged.nutritionTargets || {};
      const userSetKcal = typeof nt.kcal === "number" || typeof nt.protein === "number";
      if (!merged.nutritionSuggestion && !userSetKcal && merged.nutritionGoal && merged.weight != null) {
        const sug = suggestNutritionTargets({ goal: merged.nutritionGoal, weightKg: merged.weight, gender: merged.gender, age: merged.age, heightCm: merged.height, workoutsPerWeek: merged.workoutsPerWeek, activityLevel: merged.activityLevel, dietApproach: merged.dietApproach });
        if (sug) merged.nutritionSuggestion = sug;
      }
      return merged;
    });
    if (dr.coachLevel) setNutStyle(dr.coachLevel === "strict" ? "focused" : dr.coachLevel === "flexible" ? "flexible" : "balanced");
    if (dr.equipment && dr.equipment.length) setEquipProfile(mapEquip(dr.equipment));
    // Endast om användaren valt startvärde OCH ingen mät-historik finns — seedas ETT eget mätvärde. Aldrig demo-data, aldrig radering av befintlig historik.
    if (dr.startChoice === "measurement" && dr.weight != null) setMeasurements(m => (m && m.length ? m : [{ date: Date.now(), weight: dr.weight, bodyFat: dr.bodyFat ?? null, source: "user_entered" }]));
    setOnboarding({ ...dr, completed: true });
  };
  // §1: I real-läge utan slutförd onboarding visas onboarding — inte den populerade dashboarden.
  if (mode === "real" && !(onboarding && onboarding.completed)) return <OnboardingFlow draft={onboarding} setDraft={setOnboarding} onComplete={finishOnboarding} onExit={() => onSwitchMode(null)} />;

  return (
    <div style={{ background: `radial-gradient(1200px 800px at 78% -5%, rgba(77,163,255,0.06), rgba(9,11,16,0) 60%), radial-gradient(900px 700px at 0% 100%, rgba(155,124,255,0.05), rgba(9,11,16,0) 55%), ${T.bg.app}`, color: T.text.primary, fontFamily: "'Inter', -apple-system, system-ui, sans-serif", minHeight: "100vh" }}>
      <style>{`
        * { box-sizing: border-box; }
        button:focus-visible { outline: 2px solid ${T.accent.primary}; outline-offset: 2px; }
        input:focus { outline: 1px solid ${T.accent.primary}; }
        ::-webkit-scrollbar { width: 5px; height: 5px; } ::-webkit-scrollbar-track { background: ${T.bg.app}; } ::-webkit-scrollbar-thumb { background: ${T.bg.muted}; border-radius: 3px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
      `}</style>

      {mode === "demo" && (
        <div style={{ position: "fixed", left: isMobile ? "50%" : 84, transform: isMobile ? "translateX(-50%)" : "none", bottom: isMobile ? 74 : 14, zIndex: 9999, display: "flex", alignItems: "center", gap: 10, background: "rgba(20,23,31,0.92)", border: `1px solid ${T.accent.warning}55`, borderRadius: 999, padding: "7px 8px 7px 14px", boxShadow: "0 6px 22px rgba(0,0,0,0.35)", backdropFilter: "blur(6px)" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.accent.warning, letterSpacing: 0.3 }}>● Demo-läge</span>
          <span style={{ fontSize: 11.5, color: T.text.muted }}>exempeldata</span>
          <button onClick={() => onSwitchMode("real")} style={{ ...btn.primary, fontSize: 11.5, padding: "5px 11px" }}>Skapa din riktiga profil</button>
        </div>
      )}

      {isMobile
        ? <MobileLayout mode={mode} demo={demo} onSwitchMode={onSwitchMode} trainingMetrics={trainingMetrics} nutritionTargets={nutritionTargets} nutritionDays={nutritionDays} milestone={milestone} healthMetrics={healthMetrics} muscleStates={muscleStates} overallReadiness={overallReadiness} readinessInfo={readinessInfo} recommendation={recommendation} sessions={sessions} setSessions={setSessions} mobileTab={mobileTab} setMobileTab={setMobileTab} navigateMobile={navigateMobile} mobileBack={mobileBack} canMobileBack={mobileHistory.length > 0} openMuscle={openMuscle} setModal={setModal} previewExercise={previewExercise} setPreviewExercise={setPreviewExercise} onStartTraining={() => setTraining(true)} foodLog={foodLog} setFoodLog={setFoodLog} nutritionTotals={nutritionTotals} goals={goals} setGoals={setGoals} missions={missions} setMissions={setMissions} primaryMission={primaryMission} primaryMissionAnalysis={primaryMissionAnalysis} equipProfile={equipProfile} setEquipProfile={setEquipProfile} equip={equip} profile={profile} setProfile={setProfile} measurements={measurements} setMeasurements={setMeasurements} onLogSport={id => { setSportPreset(id); setModal('sport'); }} systemicRecovery={systemicRecovery} mealMemory={mealMemory} setMealMemory={setMealMemory} activeSports={activeSports} cycle={cycle} readinessWhy={readinessWhy} onResetRecovery={() => setSessions([])} />
        : <DesktopLayout mode={mode} demo={demo} onSwitchMode={onSwitchMode} trainingMetrics={trainingMetrics} nutritionTargets={nutritionTargets} nutritionDays={nutritionDays} milestone={milestone} healthMetrics={healthMetrics} muscleStates={muscleStates} overallReadiness={overallReadiness} readinessInfo={readinessInfo} recommendation={recommendation} sessions={sessions} setSessions={setSessions} userBodyweight={userBodyweight} nav={nav} setNav={setNav} navigate={navigate} navBack={navBack} canNavBack={navHistory.length > 0} openMuscle={openMuscle} setModal={setModal} previewExercise={previewExercise} setPreviewExercise={setPreviewExercise} onStartTraining={() => setTraining(true)} foodLog={foodLog} setFoodLog={setFoodLog} nutritionTotals={nutritionTotals} goals={goals} setGoals={setGoals} missions={missions} setMissions={setMissions} primaryMission={primaryMission} primaryMissionAnalysis={primaryMissionAnalysis} equipProfile={equipProfile} setEquipProfile={setEquipProfile} equip={equip} profile={profile} setProfile={setProfile} onLogSport={id => { setSportPreset(id); setModal('sport'); }} systemicRecovery={systemicRecovery} onResetRecovery={() => setSessions([])} measurements={measurements} setMeasurements={setMeasurements} mealMemory={mealMemory} setMealMemory={setMealMemory} nutStyle={nutStyle} setNutStyle={setNutStyle} panelMode={panelMode} setPanelMode={setPanelMode} activeSports={activeSports} setActiveSports={setActiveSports} supplements={supplements} setSupplements={setSupplements} personalData={personalData} laggingData={laggingData} balanceData={balanceData} onLogPeriod={() => setProfile(pr => ({ ...pr, cycleTracking: true, lastPeriodStart: startOfLocalDay(Date.now()) }))} cycle={cycle} readinessWhy={readinessWhy} programs={programs} setPrograms={setPrograms} activeProgramId={activeProgramId} setActiveProgramId={setActiveProgramId} activeProgram={activeProgram} profileGoal={profileGoal} goalProfile={goalProfile} onStartProgram={startProgramWorkout} />}

      {modal === "muscle" && <MuscleModal muscleId={selectedMuscle} state={muscleStates[selectedMuscle]} onClose={() => setModal(null)} onLog={() => setModal("session")} onPreviewExercise={ex => { setPreviewExercise(ex); setModal(null); }} equip={equip} sessions={sessions} />}
      {training && <TrainingMode equip={equip} sessions={sessions} muscleStates={muscleStates} seed={programPlan} onComplete={session => { handleComplete({ ...session, programId: programPlan && programPlan.programId, workoutId: programPlan && programPlan.workoutId }); setTraining(false); setProgramPlan(null); }} onExit={() => { setTraining(false); setProgramPlan(null); }} />}
      {modal === "session" && <SessionModal onComplete={handleComplete} onClose={() => setModal(null)} />}
      {modal === "sport" && <SportModal initialId={sportPreset} activeSports={activeSports} onComplete={handleComplete} onClose={() => setModal(null)} />}
      {modal === "post" && completedSession && <PostSessionModal session={completedSession} muscleStates={muscleStates} recommendation={recommendation} sessions={sessions} onReason={upd => setSessions(list => list.map(x => x.id === upd.id ? upd : x))} onClose={() => { setCompletedSession(null); setModal(null); }} />}
      {showLegacy && <LegacyMigrationModal onDone={() => setLegacyDismissed(true)} />}
    </div>
  );
}

// Yttre wrapper: hanterar aktivt läge. Byte av läge monterar om AtlasApp (key={mode})
// så varje läge läser sin egen storage-namespace — demo och real blandas aldrig.
export default function Atlas() {
  const [mode, setMode] = useState(() => getMode());
  // Klick på demoknappen laddar alltid ett färskt demoscenario (full mat/träning/coach).
  // Vanlig omladdning i demo behåller ev. egna ändringar (versionsstyrd seed i AtlasApp).
  const pick = (m) => { if (m === "demo") resetDemoSeed(); setModeStored(m); setMode(m); };
  if (!mode) return <ModeSelect onPick={pick} />;
  return <AtlasApp key={mode} mode={mode} onSwitchMode={pick} />;
}
