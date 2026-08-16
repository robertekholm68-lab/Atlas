// RECEPTBILDER — receptid → bild.
//
// 134 bilder har legat i src/assets/recipes/ sedan bildbanken byggdes, men bara
// gamla appen visar dem. Askr 2.0 har aldrig gjort det. Sjunde gången med samma
// mönster: tillgången fanns, vägen dit saknades.
//
// LOGIKEN ÄR FLYTTAD, INTE OMSKRIVEN. Den bodde i features/recipes/index.jsx,
// alltså i gamla appens mapp, och 2.0 importerar inte därifrån. Att skriva en
// andra variant hade gett två uppsättningar regler för samma sak — och alias-
// tabellen nedan är precis den sortens kunskap som glider isär i tysthet.
//
// FILNAMNEN BÄR RECEPTETS ID. "g_bowl_23__bowl-med-kikartor.webp" matchar
// receptet g_bowl_23; allt efter "__" är för människor och ignoreras vid
// matchning. Det gör mappen läsbar utan uppslagstabell.

const MODULER = import.meta.glob("../assets/recipes/*.{jpg,jpeg,png,webp,avif}", { eager: true });

/** "g_bowl_23__bowl-med-kikartor.webp" → "g_bowl_23" */
export const bildIdUrFilnamn = namn => namn.replace(/\.[^.]+$/, "").split("__")[0];

const BILDER = Object.fromEntries(
  Object.entries(MODULER).map(([väg, mod]) => [
    bildIdUrFilnamn(väg.split("/").pop()),
    (mod && mod.default) || mod,
  ])
);

/**
 * Recept som i praktiken är samma rätt delar bild — avokadomacka med och utan
 * tomat, räkpasta i skål eller på tallrik. Alternativet vore att generera två
 * snarlika påhittade foton av samma mat.
 *
 * Nyckel = receptet utan egen bild. Värde = receptet som har den.
 */
export const BILD_ALIAS = {
  g_snack_10: "r_avokadomacka",     // avokadomacka utan tomat
  r_shrimp_pasta: "g_bowl_07",      // räkpasta med spenat
  r_shake: "g_snack_00",            // identiska ingredienser: whey, mjölk, banan
  r_notmix_apple: "g_snack_07",     // dubblett: äpple + mandlar
  r_apple_pb: "g_snack_12",         // dubblett: äpple + jordnötssmör
  r_makrill_quinoa: "g_panna_45",   // makrill + quinoa, spenat resp. grönkål
};

/** Bildens url, eller null när receptet saknar bild. */
export function receptBild(recept) {
  if (!recept) return null;
  const alias = BILD_ALIAS[recept.id];
  return BILDER[recept.id] || (alias && BILDER[alias]) || recept.image || null;
}

/** Hur många recept som har bild. Används i statusrapporter. */
export function bildtäckning(recept) {
  const med = (recept || []).filter(r => receptBild(r)).length;
  return { med, av: (recept || []).length };
}
