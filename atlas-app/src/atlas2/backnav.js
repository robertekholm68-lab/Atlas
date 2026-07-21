// Askr 2.0 — OS-bakåtknappen mot webbhistoriken.
//
// VARFÖR en egen modul: hela navigeringen (`step`, `flik`, `sheet`) bor i
// React-tillstånd. I den INSTALLERADE PWA:n finns ingen adressrad, så ett
// bakåtsvep lämnar HELA appen — även mitt i onboarding eller med ett ark öppet.
// Android-skalet fångar OS-knappen själv; webben måste koppla samma sak till
// pushState/popstate.
//
// Här bor det RENA beslutet — "vad ska ett bakåttryck göra givet vyn" — så att
// det går att testa utan att montera React eller mocka history. Själva
// kopplingen (pushState, popstate-lyssnaren, vaktposten) bor i App2.jsx.

// Vad ett bakåttryck ska göra, givet hela navigeringstillståndet. Prioritet:
//
//   onboarding "mode"      → tillbaka till "start"      ("till-start")
//   onboarding "start"     → lämna appen               ("lämna")
//   i appen, öppet ark     → stäng arket                ("stäng-ark")
//   i appen, annan flik    → gå till hem                ("till-hem")
//   i appen, hem utan ark  → lämna appen                ("lämna")
//
// `step` defaultar till "app" så att anropare som bara bryr sig om flik/ark
// (och de gamla testerna) får appbeteendet utan att skicka step.
//
// Passet är AVSIKTLIGT inget eget fall: att gå till hem behåller live-passet
// (sparas löpande i `atlas.v3.live`), så "tillbaka" pausar passet och kastar det
// aldrig — samma skydd som mobilens avbryt-dialog, utan dialog eftersom inget
// går förlorat.
export function backAction({ step = "app", sheet, flik } = {}) {
  if (step === "mode") return "till-start";
  if (step === "start") return "lämna";
  // I appen (step "app" eller okänt):
  if (sheet) return "stäng-ark";
  if (flik !== "hem") return "till-hem";
  return "lämna";
}

// Har läget ett internt bakåtmål (dvs. ska bakåt fångas i appen i stället för
// att lämna den)? Sant för allt utom "lämna".
export function harBakåtmål(state) {
  return backAction(state) !== "lämna";
}
