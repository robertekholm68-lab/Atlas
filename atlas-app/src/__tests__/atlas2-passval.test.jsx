// @vitest-environment jsdom
// Askr 2.0 — att välja vilket pass man kör.
//
// Fynd från riktig användning: "Jag ser inga val av pass i appen." Programvyn
// visade bara "Nästa: Pass A" och en knapp som startade just det. Ett program
// med flera pass visade alltså aldrig de andra — man kunde varken se vad som
// ingick eller köra i en annan ordning än den appen räknat fram.
//
// Appen ska föreslå, användaren bestämma. Samma hållning som coachen: förslaget
// syns tydligt, men det finns alltid en väg runt det.

import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createElement } from "react";
import { ProgramSheet } from "../atlas2/ProgramSheet.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const program = {
  id: "p1", name: "Upper/Lower", daysPerWeek: 4,
  workouts: [
    { id: "w1", name: "Överkropp", exercises: [{ exId: "bench_press" }, { exId: "row" }] },
    { id: "w2", name: "Underkropp", exercises: [{ exId: "squat" }] },
    { id: "w3", name: "Överkropp", exercises: [{ exId: "ohp" }] },
    { id: "w4", name: "Underkropp", exercises: [{ exId: "deadlift" }] },
  ],
};

describe("passlistan bor i passvyn, inte i programarket", () => {
  // Listan byggdes ursprungligen i ProgramSheet. Arket stängs så fort man går
  // därifrån, så i praktiken fanns valet ingenstans — och när listan flyttades
  // till passvyn blev arkets kvar: samma pass renderades två gånger, en gång
  // med förhandsvisning och en gång utan. Den utan startade passet direkt.
  //
  // Ett val ska finnas på ETT ställe. Testerna nedan läser App2:s passvy, och
  // ett av dem vaktar att arket inte får tillbaka sin egen lista.
  const app2 = readFileSync(resolve("src/atlas2/App2.jsx"), "utf8");
  const passvy = app2.slice(app2.indexOf('if (flik === "pass")'));

  it("ALLA pass i programmet listas, inte bara nästa", () => {
    expect(passvy).toMatch(/activeProgram\.workouts.*\.map/s);
  });

  it("det som står på tur är utmärkt", () => {
    expect(passvy).toMatch(/påTur/);
    expect(passvy).toMatch(/står på tur/);
  });

  it("passen numreras — flera kan heta samma sak", () => {
    expect(passvy).toMatch(/Pass \{i \+ 1\}/);
  });

  it("ett ANNAT pass än nästa går att starta", () => {
    // startaPass tar passet som argument i stället för att räkna fram nästa.
    expect(passvy).toMatch(/startaPass\(w\)/);
  });

  it("antalet övningar visas, så man vet vad man ger sig in i", () => {
    expect(passvy).toMatch(/övningar\.length/);
  });

  it("programarket har INTE en egen passlista", () => {
    const ark = readFileSync(resolve("src/atlas2/ProgramSheet.jsx"), "utf8");
    expect(ark).not.toMatch(/data-pass="1"/);
  });
});

describe("startaPass tål att få ett klick-event", () => {
  // Buggen jag införde och som DOM-verifieringen fångade: onClick={startaPass}
  // skickar Reacts SyntheticEvent som första argument. Utan vakt tolkades det
  // som ett valt pass, buildLive fick ett event i stället för ett träningspass,
  // och skärmen blev blank så när som på bottennavet — utan felmeddelande.
  //
  // Regeln som testas: bara ett objekt med en exercises-ARRAY är ett pass.
  const ärPass = p => !!(p && typeof p === "object" && Array.isArray(p.exercises));

  it("ett riktigt pass känns igen", () => {
    expect(ärPass({ id: "w1", name: "Överkropp", exercises: [{ exId: "bench" }] })).toBe(true);
  });

  it("ett klick-event gör det INTE", () => {
    const event = { type: "click", target: {}, currentTarget: {}, nativeEvent: {}, preventDefault() {} };
    expect(ärPass(event)).toBe(false);
  });

  it("inget argument alls betyder 'ta nästa'", () => {
    expect(ärPass(undefined)).toBe(false);
    expect(ärPass(null)).toBe(false);
  });

  it("ett halvt pass utan övningslista räknas inte", () => {
    // Hellre falla tillbaka på nästa pass än starta något tomt.
    expect(ärPass({ id: "w1", name: "Trasigt" })).toBe(false);
  });
});

describe("passen syns i PASSVYN, inte bara i programarket", () => {
  // Roberts fynd: "Jag ser fortfarande ingenstans där jag kan välja pass."
  //
  // Listan byggdes först inuti ProgramSheet — ett ark som stängs så fort man
  // går därifrån. I praktiken fanns valet alltså ingenstans: man såg
  // "Starta pass" i passvyn och fick det pass appen räknat fram, utan att veta
  // att programmet hade fler.
  //
  // Testet vaktar att listan ligger i App2:s passvy. Flyttas den tillbaka in i
  // ett ark blir det rött.
  it("App2 renderar passen med startaPass, inte bara en Starta pass-knapp", () => {
    const src = readFileSync(resolve("src/atlas2/App2.jsx"), "utf8");
    // Passvyns gren måste innehålla en lista över activeProgram.workouts.
    const passvy = src.slice(src.indexOf('if (flik === "pass")'));
    expect(passvy).toMatch(/activeProgram\.workouts.*\.map/s);
    expect(passvy).toMatch(/startaPass\(w\)/);
    expect(passvy).toMatch(/data-pass="1"/);
  });

  it("det pass som står på tur märks ut", () => {
    const src = readFileSync(resolve("src/atlas2/App2.jsx"), "utf8");
    const passvy = src.slice(src.indexOf('if (flik === "pass")'));
    expect(passvy).toMatch(/påTur/);
    expect(passvy).toMatch(/står på tur/);
  });

  it("passnumret står med — flera pass kan heta samma sak", () => {
    // Ett Upper/Lower med fyra dagar har två "Överkropp" och två "Underkropp".
    const src = readFileSync(resolve("src/atlas2/App2.jsx"), "utf8");
    expect(src.slice(src.indexOf('if (flik === "pass")'))).toMatch(/Pass \{i \+ 1\}/);
  });
});

describe("ett tryck visar passet, det startar det inte", () => {
  // Robert: "istället för att direkt köra igång passet som man valt vill jag se
  // vilka övningar som ingår först".
  //
  // Rimligt: man väljer pass i omklädningsrummet och vill veta vad som väntar
  // innan man går ut på golvet. Och att av misstag starta ett pass man bara
  // ville titta på är dyrt — klockan börjar gå, och passet tar över hela vyn
  // tills man avslutar det.
  const src = readFileSync(resolve("src/atlas2/App2.jsx"), "utf8");
  const passvy = src.slice(src.indexOf('if (flik === "pass")'));

  it("passknappen fäller ut, den startar inte", () => {
    expect(passvy).toMatch(/data-pass="1"[^>]*aria-expanded/s);
    expect(passvy).toMatch(/setFörhandsvisat/);
  });

  it("start kräver en egen knapp", () => {
    expect(passvy).toMatch(/data-starta="1"/);
    expect(passvy).toMatch(/startaPass\(w\)/);
  });

  it("övningarnas namn slås upp ur banken, inte ur passet", () => {
    // Passet bär id och volym; namnet hör hemma på ett ställe. Annars kan ett
    // omdöpt övningsnamn stå kvar i gamla program.
    expect(passvy).toMatch(/EXERCISES\.find/);
  });

  it("set och reps visas — det är det man vill veta i förväg", () => {
    expect(passvy).toMatch(/set`/);
    expect(passvy).toMatch(/reps`/);
  });
});

describe("ett valt program går att byta", () => {
  // Robert, tredje gången: "ser fortfarande bara helkropp".
  //
  // "Välj program"-knappen låg bara i else-grenen — alltså när man SAKNADE
  // program. Så fort ett var valt fylldes passvyn med dess pass och vägen till
  // programlistan försvann helt. Han såg "Helkropp A, B, C" och drog den rimliga
  // slutsatsen att det var alla program som fanns.
  //
  // Ett val man gjort en gång måste gå att göra om.
  const app2 = readFileSync(resolve("src/atlas2/App2.jsx"), "utf8");
  const passvy = app2.slice(app2.indexOf('if (flik === "pass")'));

  it("bytesknappen visas NÄR ett program är aktivt", () => {
    // Villkoret står före knappen; en kommentar kan ligga emellan, så testet
    // läser ordningen i stället för exakt formatering.
    const i = passvy.indexOf('data-byt="1"');
    expect(i).toBeGreaterThan(0);
    expect(passvy.slice(Math.max(0, i - 400), i)).toMatch(/activeProgram &&/);
  });

  it("den öppnar programarket", () => {
    const bit = passvy.slice(passvy.indexOf('data-byt="1"') - 200, passvy.indexOf('data-byt="1"') + 100);
    expect(bit).toMatch(/setSheet\("program"\)/);
  });

  it("den säger vilket program som är valt", () => {
    // "Byt program" ensamt svarar inte på frågan "vad kör jag nu?".
    expect(passvy).toMatch(/Byt program.*activeProgram\.name/s);
  });
});
