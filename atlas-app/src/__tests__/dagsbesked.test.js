// HEMVYNS DAGLIGA BESKED.
//
// Det som prövas är att meningen FÖRÄNDRAS med vad som hänt — det var hela
// skälet att skriva om den. En avläsning av readiness är sann varje dag och
// därför samma varje dag, och en coach som säger samma sak oavsett läge slutar
// man läsa.
//
// Utöver det bevakas de vanliga ärlighetsreglerna: inga nollor som ser ut som
// mätningar, inga kilo som egentligen är lasttal, och `empty` bara när det
// verkligen saknas underlag.

import { describe, it, expect } from "vitest";
import { dagensBesked } from "../engines/dagsbesked.js";
import { MUSCLES } from "../data/muscles.js";

const DAG = 864e5;
// Klockan pinnas till 20:00 i dag. Flera fall lägger pass tidigt samma dygn,
// och med den riktiga klockan hade de hamnat på gårdagen när sviten körs på
// morgonen — samma nattliga fallgrop som påminnelsetesterna redan gått i.
const NU = (() => { const d = new Date(); d.setHours(20, 0, 0, 0); return d.getTime(); })();

const namn = id => MUSCLES[id].name;
const redoStates = {
  quadriceps: { readiness: 94, status: "ready" },
  pectoralis_major: { readiness: 88, status: "ready" },
  latissimus_dorsi: { readiness: 41, status: "fatigued" },
};
const alltTrött = {
  quadriceps: { readiness: 38, status: "fatigued" },
  pectoralis_major: { readiness: 44, status: "fatigued" },
};

const pass = (extra = {}) => ({
  id: "s1", title: "Push A", completedAt: NU - 2 * 3600e3,
  sets: [], muscleLoads: {}, ...extra,
});
// 100 × 8 × 4 = 3 200 kg.
const fyraSet = Array.from({ length: 4 }, () => ({ exerciseId: "bench_press", weight: 100, reps: 8 }));

describe("utan underlag hittas ingenting på", () => {
  it("tomma states ger inbjudan och flaggan empty", () => {
    const b = dagensBesked({ states: {}, sessions: [], now: NU });
    expect(b.empty).toBe(true);
    expect(b.text).toMatch(/Ingen historik än/);
  });

  it("bara no_data räknas också som inget underlag", () => {
    const b = dagensBesked({
      states: { quadriceps: { readiness: null, status: "no_data" } }, sessions: [], now: NU,
    });
    expect(b.empty).toBe(true);
  });
});

describe("tränat i dag: ett kvitto, inte en uppmaning", () => {
  it("säger antal set, volym i kilo och vad som belastades", () => {
    const b = dagensBesked({
      states: redoStates, now: NU,
      sessions: [pass({ sets: fyraSet, muscleLoads: { pectoralis_major: 180, triceps_brachii: 90 } })],
    });
    expect(b.text).toMatch(/Passet är loggat: 4 set, 3\s?200 kg\./);
    expect(b.text).toContain(`${namn("pectoralis_major")} och ${namn("triceps_brachii")} jobbar nu.`);
    expect(b.empty).toBeUndefined();
  });

  it("volymen är KILO, inte lasttal — de två heter sessionVolume båda två", () => {
    // muscleLoads summerar till 270. Står det 270 kg har kilona hämtats ur fel
    // modul, och siffran på skärmen betyder något helt annat än enheten säger.
    const b = dagensBesked({
      states: redoStates, now: NU,
      sessions: [pass({ sets: fyraSet, muscleLoads: { pectoralis_major: 180, triceps_brachii: 90 } })],
    });
    expect(b.text).not.toMatch(/270 kg/);
  });

  it("ett pass utan set påstår inga nollor", () => {
    // Sportpass: inga set, ingen volym. "0 set, 0 kg" vore att svara på en
    // fråga som aldrig ställdes.
    const b = dagensBesked({
      states: redoStates, now: NU,
      sessions: [pass({ title: "Innebandy", sets: [], muscleLoads: { quadriceps: 120 } })],
    });
    expect(b.text).toMatch(/^Passet är loggat\./);
    expect(b.text).not.toMatch(/0 set/);
    expect(b.text).not.toMatch(/0 kg/);
    expect(b.text).toContain(`${namn("quadriceps")} jobbar nu.`);
  });

  it("ett pass utan muscleLoads tiger om musklerna i stället för att krascha", () => {
    // Äldre importerad data saknar fältet helt.
    const utan = { id: "gammal", title: "Import", completedAt: NU - 3600e3, sets: fyraSet };
    const b = dagensBesked({ states: redoStates, sessions: [utan], now: NU });
    expect(b.text).toBe("Passet är loggat: 4 set, " + (3200).toLocaleString("sv-SE") + " kg.");
  });

  it("ett morgonpass räknas till i dag även när kvällen kommit", () => {
    // 07:00 och 20:00 är tretton timmar isär men samma kalenderdygn. Räknat i
    // timmar hade beskedet sagt "1 dagar sedan senaste passet".
    const morgon = new Date(NU); morgon.setHours(7, 0, 0, 0);
    const b = dagensBesked({
      states: redoStates, now: NU,
      sessions: [pass({ completedAt: morgon.getTime(), sets: fyraSet })],
    });
    expect(b.text).toMatch(/^Passet är loggat/);
  });
});

describe("tränat i går", () => {
  it("nämner passet vid namn och vad som är redo i dag", () => {
    const b = dagensBesked({
      states: redoStates, now: NU,
      sessions: [pass({ completedAt: NU - DAG })],
    });
    expect(b.text).toBe(`I går: Push A. ${namn("quadriceps")} och ${namn("pectoralis_major")} är redo i dag.`);
  });

  it("utan något återhämtat sägs det i stället för att räkna upp ingenting", () => {
    const b = dagensBesked({
      states: alltTrött, now: NU,
      sessions: [pass({ completedAt: NU - DAG })],
    });
    expect(b.text).toBe("I går: Push A. Kroppen behöver återhämtning i dag.");
  });

  it("ett namnlöst pass får ett namn som inte låtsas vara ett", () => {
    const b = dagensBesked({
      states: redoStates, now: NU,
      sessions: [pass({ title: undefined, completedAt: NU - DAG })],
    });
    expect(b.text).toMatch(/^I går: ett pass\./);
  });
});

describe("två dagar eller mer", () => {
  it("talet gör meningen ny varje dag", () => {
    const tre = dagensBesked({ states: redoStates, sessions: [pass({ completedAt: NU - 3 * DAG })], now: NU });
    const fyra = dagensBesked({ states: redoStates, sessions: [pass({ completedAt: NU - 4 * DAG })], now: NU });
    expect(tre.text).toMatch(/^3 dagar sedan senaste passet\./);
    expect(fyra.text).toMatch(/^4 dagar sedan senaste passet\./);
    expect(tre.text).not.toBe(fyra.text);
  });

  it("konstaterande, inte tillrättavisning — och vad kroppen säger står kvar", () => {
    const b = dagensBesked({ states: redoStates, sessions: [pass({ completedAt: NU - 5 * DAG })], now: NU });
    expect(b.text).toContain(`${namn("quadriceps")} och ${namn("pectoralis_major")} är redo.`);
  });

  it("en vilovecka gör inte underlaget tomt — startknappen får inte byta text", () => {
    // `empty` styr "Starta första passet". Den som tagit en vecka ledigt har
    // fortfarande loggat sitt första pass.
    const b = dagensBesked({ states: redoStates, sessions: [pass({ completedAt: NU - 9 * DAG })], now: NU });
    expect(b.empty).toBeUndefined();
    expect(b.text).toMatch(/^9 dagar sedan/);
  });
});

describe("det senaste passet är det som räknas", () => {
  it("historiken sorteras, inte tas i den ordning den råkar ligga", () => {
    const b = dagensBesked({
      states: redoStates, now: NU,
      sessions: [
        pass({ id: "gammalt", title: "Ben B", completedAt: NU - 12 * DAG }),
        pass({ id: "nytt", title: "Push A", completedAt: NU - DAG }),
        pass({ id: "mitten", title: "Pull A", completedAt: NU - 6 * DAG }),
      ],
    });
    expect(b.text).toMatch(/^I går: Push A\./);
  });

  it("pass utan completedAt räknas inte som senaste", () => {
    const b = dagensBesked({
      states: redoStates, now: NU,
      sessions: [{ id: "halvt", title: "Avbrutet", sets: [] }, pass({ completedAt: NU - 2 * DAG })],
    });
    expect(b.text).toMatch(/^2 dagar sedan senaste passet\./);
  });
});
