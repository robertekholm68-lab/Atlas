// Askr 2.0 — OS-bakåtknappen mot webbhistoriken.
//
// VARFÖR en egen modul: `flik` och `sheet` bor bara i React-tillstånd. I den
// INSTALLERADE PWA:n finns ingen adressrad, så ett bakåtsvep lämnar HELA appen
// även när ett ark ligger öppet mitt i ett pass. Android-skalet fångar
// OS-knappen själv; webben måste koppla samma sak till pushState/popstate.
//
// Här bor det RENA beslutet — "vad ska ett bakåttryck göra givet vyn" — så att
// det går att testa utan att montera React eller mocka history. Själva
// kopplingen (pushState, popstate-lyssnaren) bor i App2.jsx.

// Ett läge har ett internt bakåtmål när ett ark är öppet ELLER man står på en
// annan flik än hem. Då ska bakåt fångas i appen i stället för att kasta ut
// användaren.
export function harBakåtmål({ sheet, flik }) {
  return !!sheet || flik !== "hem";
}

// Vad ett bakåttryck ska göra. Prioritetsordningen är exakt kravets:
//
//   1. Öppet ark  → stäng arket, inget annat ligger ovanpå det.
//   2. Annan flik → gå till hem.
//   3. Hem, inget ark → lämna appen som vanligt.
//
// Passet är AVSIKTLIGT inget eget fall. Att gå till hem behåller live-passet —
// det sparas löpande i `atlas.v3.live` vid varje set — så "tillbaka" PAUSAR
// passet och kastar det aldrig. Det är samma skydd som mobilens avbryt-dialog
// ger (loggade set går aldrig förlorade), fast utan dialog eftersom ingenting
// faktiskt kastas när man navigerar bort.
export function backAction({ sheet, flik }) {
  if (sheet) return "stäng-ark";
  if (flik !== "hem") return "till-hem";
  return "lämna";
}
