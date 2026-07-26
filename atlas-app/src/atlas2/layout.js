// Askr 2.0 — ytan appen har att arbeta med.
//
// VARFÖR en egen modul: layouten fattade tidigare sina beslut på tre ställen
// (`maxWidth: 480` i App2, samma siffra igen i Nav, och en fast `height={300}`
// på kartan). Tre kopior av samma beslut glider isär — det är exakt så
// paletten glidit isär förut.
//
// GRUNDREGELN, och skälet till att kartan inte längre har en fast höjd:
// kroppen är gränssnittet. Allt annat på skärmen får en budget; kartan får det
// som blir över. På en liten telefon krymper den, på en stor skärm växer den.
// Det är omvändningen mot hur det såg ut: kartan hade 300 px oavsett skärm, och
// resten fick scrolla ut ur bild.
//
// Höjden räknas INTE ut här i pixlar. Vyerna är flex-kolumner där kartan är
// `flex: 1` — webbläsaren gör aritmetiken, och den har alltid rätt. Här bor bara
// besluten som inte går att uttrycka i CSS: när layouten byter läge, och hur
// bred en kolumn får bli.

import { useState, useEffect } from "react";

/** Under den här bredden är appen en telefon, över den är den en skrivbordsapp. */
export const DESKTOP_MIN = 1000;

/** Telefonkolumnens maxbredd. Samma siffra som förr, nu på ETT ställe. */
export const MOBIL_MAX = 480;

/** Sidopanelens bredd på desktop. */
export const PANEL_BREDD = 232;

/** Innehållsytans maxbredd på desktop (utan sidopanelen). */
export const INNEHÅLL_MAX = 1180;

/**
 * Vilket läge en given bredd hör hemma i. Ren funktion — testas utan att
 * montera React eller mocka matchMedia.
 */
export function layoutFor(bredd) {
  const desktop = (bredd || 0) >= DESKTOP_MIN;
  return {
    läge: desktop ? "desktop" : "mobil",
    desktop,
    mobil: !desktop,
    // Kartan står ensam på mobil men delar ytan med korten på desktop.
    spalter: desktop ? 2 : 1,
    // Färgnyckeln får plats på en rad först när det finns bredd till det.
    kompaktNyckel: (bredd || 0) < 420,
  };
}

/**
 * `100vh` LJUGER i mobila webbläsare: den räknar in adressfältet, så en vy som
 * exakt fyller skärmen ändå får en scrollbar. `100dvh` är den dynamiska höjden
 * och är det enda som stämmer när fältet glider upp och ner. Fallbacken finns
 * för äldre webbvyer (Androidskalet) som inte kan dvh — där är `vh` rätt ändå,
 * eftersom det inte finns något adressfält att räkna fel på.
 */
export const FULL_HÖJD = "100dvh";
export const FULL_HÖJD_FALLBACK = "100vh";

/**
 * Bottennavens faktiska höjd: ikon 23 + etikett ~13 + padding 10/12 ≈ 62 px.
 * Vyerna reserverade tidigare 90 px för den — nästan 30 px ren luft på en skärm
 * där varje pixel räknas. Safe-area läggs till separat; den är noll på allt
 * utom telefoner med hak.
 */
export const NAV_HÖJD = 62;

/** Höjden en flik har till sitt förfogande på mobil, naven borträknad. */
export const UTAN_NAV = `calc(${FULL_HÖJD} - ${NAV_HÖJD}px - env(safe-area-inset-bottom))`;

/**
 * Nuvarande layoutläge. Lyssnar på resize; ingen mätning sker under render.
 * Startvärdet är mobil med flit — det är den smalare av de två, och en felaktig
 * första bildruta ska hellre vara för smal än för bred.
 */
export function useLayout() {
  const [bredd, setBredd] = useState(() =>
    (typeof window !== "undefined" && window.innerWidth) ? window.innerWidth : 390);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const på = () => setBredd(window.innerWidth);
    på();
    window.addEventListener("resize", på);
    return () => window.removeEventListener("resize", på);
  }, []);

  return layoutFor(bredd);
}
