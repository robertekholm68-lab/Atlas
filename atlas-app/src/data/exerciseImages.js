// ÖVNINGSBILDER — id → fil.
//
// Bilderna är diptyker: startposition till vänster, slutposition till höger, i
// en och samma 16:9-bild. De genereras i Higgsfield enligt skillen
// `atlas-exercise-images` och läggs i `public/ovningar/` som `<exerciseId>.webp`.
//
// VARFÖR public/ OCH INTE src/assets/.
// Atlas 2.0 byggs med vite-plugin-singlefile, och byggkonfigurationen håller
// medvetet bilder UTANFÖR bundeln (assetsInlineLimit) så att en ny appversion
// inte tvingar fram en ny nedladdning av hela bildbanken. Konsekvensen är att
// en bild importerad ur src/assets/ blir en extern fil som singlefile-bygget
// inte skriver ut — img-taggen renderas men bilden laddas aldrig. Mätt: naturalWidth 0.
//
// Filer i public/ kopieras rakt igenom och nås på en stabil sökväg. Det gör
// också att en ny bild kan läggas till utan att appen byggs om.
//
// SAKNAD BILD ÄR ETT GILTIGT TILLSTÅND. 160 övningar finns, och alla får inte
// bild samtidigt. Vyerna frågar `bildFör(id)` och får null när den saknas —
// aldrig en platshållare som ser ut som en trasig bild.

/**
 * Övningar som HAR en bild. Handhållen lista, till skillnad från receptbildernas
 * glob — filer i public/ syns inte för bygget, så det finns inget att globba.
 * Priset är att listan måste hållas i takt med mappen; ett test kontrollerar att
 * varje id här finns i övningsbanken.
 */
export const MED_BILD = [
  "triceps_pushdown",
  "squat",
  "deadlift",
  "bench_press",
  "wide_pulldown",
  "seated_cable_row",
  "t_bar_row",
  "db_row",
];

const HAR = new Set(MED_BILD);

/** Bildens url, eller null när övningen saknar bild. */
export function bildFör(exerciseId) {
  return HAR.has(exerciseId) ? `${import.meta.env.BASE_URL}ovningar/${exerciseId}.webp` : null;
}

/** Hur många av bankens övningar som har bild. */
export function bildtäckning(exercises) {
  const med = (exercises || []).filter(e => HAR.has(e.id)).length;
  return { med, av: (exercises || []).length };
}
