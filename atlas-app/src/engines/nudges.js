// MOTOR: händelsedrivna påminnelser. Rena funktioner, deterministiska.
//
// VARFÖR händelsedrivna och inte klockstyrda: en webbapp kan inte väcka sig
// själv. `new Notification()` fungerar bara medan appen är igång, och riktiga
// alarm kräver antingen en push-server eller ett Android-skal. Men det är inte
// huvudskälet.
//
// Huvudskälet är att klockan oftast påminner om FEL sak. Appens egen
// kunskapsbank säger att kreatin är 3–5 g/dag där det dagliga intaget över tid
// fyller depåerna — ingen uppladdning, ingen timing. En påminnelse 08:00 för
// kreatin påminner alltså om något som inte spelar roll. Det som spelar roll är
// om det blev taget alls, och det är en kryssruta, inte ett alarm.
//
// Det som DÄREMOT är tidskänsligt är sådant som hänger ihop med en händelse
// appen faktiskt känner till. Askr vet när du tränade. "Du loggade ett pass för
// 40 minuter sedan" är både mer träffsäkert än en klocka och byggbart utan
// infrastruktur.
//
// REGLER FÖR VAD SOM FÅR BLI EN PÅMINNELSE:
//   1. Den ska hänga på en händelse appen KÄNNER TILL, inte på en tidpunkt.
//   2. Den ska ha stöd i kunskapsbanken, inte i magkänsla.
//   3. Den ska gå att åtgärda direkt — annars är den bara skuld.
//   4. Den ska försvinna av sig själv när den inte längre gäller.
// En påminnelse som inte klarar alla fyra hör inte hemma här. Att lägga till
// "du har inte loggat mat idag" vore att bygga en tjatmaskin, inte en coach.

const MIN = 60000;

/** Loggades det någon mat efter tidpunkten ts? */
function matEfter(foodLog, ts) {
  return (foodLog || []).some(e => e && e.ts && e.ts >= ts);
}

/**
 * Påminnelser som gäller just nu. Ren funktion — samma indata ger samma svar.
 *
 * @returns [{ id, kind, text, cta, until }]
 *   `id` är stabilt PER HÄNDELSE (innehåller passets id), så att ett avfärdande
 *   gäller just den händelsen och inte tystar påminnelsen för all framtid.
 */
export function buildNudges({ sessions = [], foodLog = [], nutritionTargets, now = Date.now() } = {}) {
  const ut = [];

  // ── Protein efter passet ──────────────────────────────────────────────────
  // Kunskapsbanken: protein driver muskelproteinsyntesen efter träning, och
  // kolhydrater tillför inget för den delen. Fönstret är medvetet brett (20 min
  // till 3 h): det finns inget magiskt "anabolt fönster" på trettio minuter,
  // men har det gått ett halvt dygn är påminnelsen meningslös.
  const pass = (sessions || [])
    .filter(s => s && s.completedAt)
    .sort((a, b) => b.completedAt - a.completedAt)[0];

  if (pass) {
    const sedan = now - pass.completedAt;
    const inomFönster = sedan >= 20 * MIN && sedan <= 180 * MIN;
    if (inomFönster && !matEfter(foodLog, pass.completedAt)) {
      const minuter = Math.round(sedan / MIN);
      const mål = nutritionTargets && nutritionTargets.protein;
      // Dagens protein hittills, för att kunna säga hur mycket som är kvar.
      const idag = new Date(now); idag.setHours(0, 0, 0, 0);
      const ätit = (foodLog || [])
        .filter(e => e && e.ts && e.ts >= idag.getTime())
        .reduce((a, e) => a + (e.protein || 0), 0);
      const kvar = mål ? Math.max(0, Math.round(mål - ätit)) : null;

      ut.push({
        id: `protein:${pass.id}`,
        kind: "protein",
        text: kvar != null
          ? `Du loggade ett pass för ${minuter} min sedan och har inte ätit sedan dess. ${kvar} g protein kvar på dagens mål.`
          : `Du loggade ett pass för ${minuter} min sedan och har inte ätit sedan dess. Protein är det som bygger upp musklerna mellan passen.`,
        cta: "Logga mat",
        until: pass.completedAt + 180 * MIN,
      });
    }
  }

  return ut;
}

/**
 * Filtrerar bort avfärdade och utgångna påminnelser.
 * Avfärdanden lagras som { id: tidpunkt } och städas när `until` passerats —
 * annars växer listan för evigt med id:n som aldrig kan återkomma.
 */
export function activeNudges(nudges, dismissed = {}, now = Date.now()) {
  return (nudges || []).filter(n => n && !dismissed[n.id] && (n.until == null || n.until > now));
}

/** Rensar avfärdanden som inte längre kan gälla. */
export function pruneDismissed(dismissed = {}, now = Date.now(), maxAlder = 7 * 864e5) {
  const ut = {};
  Object.entries(dismissed).forEach(([id, ts]) => { if (now - ts < maxAlder) ut[id] = ts; });
  return ut;
}
