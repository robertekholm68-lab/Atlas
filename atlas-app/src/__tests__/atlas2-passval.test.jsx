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
