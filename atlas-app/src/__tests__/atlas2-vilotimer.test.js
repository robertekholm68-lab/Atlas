// Askr 2.0 — vilotimern räknar ur klockslag, inte nedräkning.
//
// Robert: "om vilotimern går igång och man släcker skärmen, pausas den då?"
//
// Ja — och det var ett verkligt fel. setTimeout fryser när skärmen släcks
// eller man byter app; webbläsaren pausar timers i bakgrunden. Timern stod
// alltså still i fickan: efter 90 sekunder visade den fortfarande 90 sekunder
// kvar, och signalen kom aldrig.
//
// Med ett måltidsklockslag räknas återstoden ur Date.now() varje tick och
// stämmer oavsett hur länge appen varit borta. Samma princip som passtiden,
// som räknas ur `startad` i stället för att tickas upp.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const src = readFileSync(resolve("src/atlas2/WorkoutView.jsx"), "utf8");

describe("återstoden räknas ur klockslaget", () => {
  it("varje tick läser Date.now, inte v - 1", () => {
    // Det gamla `setVila(v => v - 1)` antog att varje tick kom en sekund
    // efter det förra. I bakgrunden kom de inte alls.
    expect(src).toMatch(/slutTid\.current - Date\.now\(\)/);
    expect(src).not.toMatch(/setVila\(v => v - 1\)/);
  });

  it("återstoden kan aldrig bli negativ", () => {
    expect(src).toMatch(/Math\.max\(0, Math\.round\(\(slutTid\.current - Date\.now\(\)\) \/ 1000\)\)/);
  });
});

describe("appen räknar om när den vaknar", () => {
  it("lyssnar på visibilitychange och focus", () => {
    // Utan detta visar vyn det frusna värdet i upp till en sekund efter att
    // man väckt skärmen — och har vilan tagit slut ska den sluta NU.
    expect(src).toMatch(/addEventListener\("visibilitychange", vakna\)/);
    expect(src).toMatch(/addEventListener\("focus", vakna\)/);
  });

  it("lyssnarna städas vid avmontering", () => {
    expect(src).toMatch(/removeEventListener\("visibilitychange", vakna\)/);
    expect(src).toMatch(/removeEventListener\("focus", vakna\)/);
  });

  it("räknar bara om när sidan faktiskt är synlig", () => {
    expect(src).toMatch(/document\.visibilityState !== "visible"/);
  });
});

describe("vilan överlever att appen stängs helt", () => {
  it("klockslaget sparas på live-passet", () => {
    // live persisteras vid varje ändring. Utan detta överlevde vilan bara att
    // appen låg i bakgrunden, inte att den stängdes.
    expect(src).toMatch(/vilaSlut: slut/);
  });

  it("återställs vid montering", () => {
    // Ett pass man återvänder till efter en minut ska visa rätt återstod, inte
    // börja om på noll.
    expect(src).toMatch(/if \(!live\.vilaSlut\) return;/);
    expect(src).toMatch(/slutTid\.current = live\.vilaSlut/);
  });

  it("nollställs när man hoppar över vilan", () => {
    // Annars hade ett sparat klockslag återuppväckt en vila man avbrutit.
    expect(src).toMatch(/vilaSlut: 0/);
    expect(src).toMatch(/slutTid\.current = 0/);
  });
});
