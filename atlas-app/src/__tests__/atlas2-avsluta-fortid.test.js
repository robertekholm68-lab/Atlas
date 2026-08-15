// Askr 2.0 — "Avsluta i förtid" måste faktiskt avsluta.
//
// Robert: "Även om jag avslutar i förtid så kommer jag bara tillbaks till
// samma." Han hade rätt: onAbort satte bara flik till "hem" och rörde aldrig
// live. Passet låg kvar i lagringen, så nästa gång man öppnade Pass var man
// tillbaka i exakt samma pass — och kom aldrig åt passlistan.
//
// Knappen såg ut att göra något men gjorde ingenting bestående. Det är värre
// än en knapp som saknas: man tror att man löst problemet.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const app2 = readFileSync(resolve("src/atlas2/App2.jsx"), "utf8");

describe("avbrutet pass försvinner", () => {
  it("onAbort rensar live — inte bara byter flik", () => {
    const rad = app2.slice(app2.indexOf("onAbort={"), app2.indexOf("onAbort={") + 220);
    expect(rad).toMatch(/setLive\(null\)/);
    expect(rad).toMatch(/save\("live", null\)/);
  });

  it("passet raderas bara när det saknar loggade set", () => {
    // avsluta() i WorkoutView sparar passet i historiken om det finns set, och
    // anropar onAbort BARA när listan är tom. Inget med innehåll får kastas.
    const wv = readFileSync(resolve("src/atlas2/WorkoutView.jsx"), "utf8");
    expect(wv).toMatch(/if \(!sets\.length\) \{ onAbort\(\); return; \}/);
  });
});

describe("ett startat men glömt pass fångas i tid", () => {
  it("tomt pass får en kortare gräns än ett påbörjat", () => {
    // Robert såg "PASSTID 3 tim, 0 av 15 set" och kom inte åt passlistan.
    // Åttatimmarsgränsen var rätt för ett pass man är mitt i, men fel för ett
    // som aldrig kom igång.
    expect(app2).toMatch(/harSet/);
    expect(app2).toMatch(/harSet \? 8 : 1/);
  });

  it("gränsen räknas från sista aktivitet, inte från start", () => {
    expect(app2).toMatch(/const gräns/);
    expect(app2).toMatch(/Date\.now\(\) - sista > gräns/);
  });
});
