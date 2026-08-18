// Askr 2.0 — musikknappen med Spotify-koppling.
//
// Robert: "jag ser att musikknappen med spotifykoplingen är borta."
//
// Den fanns i 1.0 (mobile/MobileApp.jsx) och följde aldrig med till 2.0 — inte
// borttagen, aldrig byggd. Samma mönster som passlistan, övningsbanken och
// maskinguiden: funktionen fanns, vägen dit saknades.
//
// INGEN OAUTH, INGEN INTEGRATION. En sparad länk och window.open. Spotify-appen
// tar över om den är installerad, annars webbspelaren. Det enda man vill göra
// mitt i ett pass är att starta musiken.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const src = readFileSync(resolve("src/atlas2/WorkoutView.jsx"), "utf8");

describe("knappen sitter i passvyns header", () => {
  it("ersätter platshållaren, kostar ingen höjd", () => {
    // Platshållaren på 34 px balanserade tillbakapilen. Passvyn är den enda vy
    // som måste rymmas utan scroll — en knapp på egen rad hade gett samma
    // problem som bytesknappen och hoppa-knappen tidigare gjorde.
    expect(src).toMatch(/data-musik="1"/);
    expect(src).toMatch(/width: 34 \}\}>♫/);
  });

  it("har ett läsbart namn för skärmläsare", () => {
    // Symbolen ♫ säger ingenting uppläst.
    expect(src).toMatch(/aria-label="Träningsmusik"/);
  });
});

describe("länken sparas och laddas rätt", () => {
  it("hydreras i en effekt, inte som initialvärde", () => {
    // load() är ASYNKRON — som initialvärde i useState blir tillståndet ett
    // Promise i stället för data, och fältet står tomt fast en länk är sparad.
    // Samma fälla som veckomenyns byten gick i.
    expect(src).toMatch(/load\("spotify", ""\)\.then/);
    expect(src).not.toMatch(/useState\(\(\) => load\("spotify"/);
  });

  it("sparar innan den öppnar", () => {
    // Trycker man utan att ha sparat först vore länken borta nästa gång.
    const fn = src.slice(src.indexOf("const öppnaMusik"), src.indexOf("const öppnaMusik") + 400);
    expect(fn.indexOf("save(")).toBeLessThan(fn.indexOf("window.open"));
  });

  it("öppnar Spotify-appen även utan länk", () => {
    // "spotify:" är appens egen URI. Bättre än att inte göra något alls när
    // man tryckt på en knapp.
    expect(src).toMatch(/u \|\| "spotify:"/);
  });

  it("öppnar med noopener", () => {
    expect(src).toMatch(/"_blank", "noopener"/);
  });
});
