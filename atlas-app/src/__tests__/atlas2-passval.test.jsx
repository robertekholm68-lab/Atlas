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

describe("passlistan", () => {
  const roots = [];
  afterEach(async () => {
    await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) {} el.remove(); }); });
  });
  const rendera = async (props = {}) => {
    const el = document.createElement("div"); document.body.appendChild(el);
    const r = createRoot(el); roots.push({ r, el });
    await act(async () => {
      r.render(createElement(ProgramSheet, {
        aktiv: program, sessions: [], setPrograms: () => {}, setActiveProgramId: () => {},
        nästa: { workout: program.workouts[0], index: 0 },
        onStarta: () => {}, onClose: () => {}, ...props,
      }));
    });
    return el;
  };
  // data-pass skiljer programmets pass från programmallarna längre ner i vyn.
  // Första versionen filtrerade på ordet "övningar" och fångade båda.
  const passknappar = el => [...el.querySelectorAll("button[data-pass]")];

  it("ALLA pass i programmet syns, inte bara nästa", () => {
    // Det var hela felet: tre av fyra pass var osynliga.
    return rendera().then(el => {
      expect(passknappar(el)).toHaveLength(4);
    });
  });

  it("det som står på tur är utmärkt", async () => {
    const el = await rendera();
    const märkta = passknappar(el).filter(b => /står på tur/i.test(b.textContent));
    expect(märkta).toHaveLength(1);
    expect(märkta[0].textContent).toMatch(/Överkropp/);
  });

  it("passen numreras — flera kan heta samma sak", async () => {
    // Ett Upper/Lower-program med fyra dagar har två "Överkropp" och två
    // "Underkropp". Utan nummer går de inte att skilja åt.
    const el = await rendera();
    const texter = passknappar(el).map(b => b.textContent);
    expect(texter.filter(t => /Pass 1/.test(t))).toHaveLength(1);
    expect(texter.filter(t => /Pass 4/.test(t))).toHaveLength(1);
  });

  it("ett ANNAT pass än nästa går att starta", async () => {
    // Kärnan i fyndet: appen föreslår, användaren bestämmer.
    let startat = null;
    const el = await rendera({ onStarta: w => { startat = w; } });
    await act(async () => { passknappar(el)[3].click(); });
    expect(startat).not.toBe(null);
    expect(startat.id).toBe("w4");
  });

  it("antalet övningar visas, så man vet vad man ger sig in i", async () => {
    const el = await rendera();
    expect(passknappar(el)[0].textContent).toMatch(/2 övningar/);
    expect(passknappar(el)[1].textContent).toMatch(/1 övning\b/);
  });

  it("utan aktivt program visas ingen passlista", async () => {
    const el = await rendera({ aktiv: null, nästa: null });
    expect(passknappar(el)).toHaveLength(0);
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
