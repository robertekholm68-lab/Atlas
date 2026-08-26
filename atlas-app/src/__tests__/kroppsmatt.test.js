// KROPPSMÅTT — datamodell och beräkningar.
//
// Kroppsmåtten lades till i den BEFINTLIGA mätningsposten (`matt`-objektet) i
// stället för i en egen lista. Skälet är att vikten redan hade fem läsare —
// profilen, coachen, framstegsvyn, målplanen och backupen — och en parallell
// modell hade betytt två ställen att hämta samma vikt från. Det felet finns
// redan dokumenterat i current-build.md, från när `matningar` och `weights`
// aldrig möttes.
//
// Testerna vaktar därför två saker samtidigt: att kroppsmåtten fungerar, och
// att den gamla viktkedjan är orörd.

import { describe, it, expect } from "vitest";
import {
  byggMätning, tolkaTal, slåIhopMätningar, vikterUrMätningar, mätvärde, serie,
  förändring, procentuellFörändring, asymmetri, mättMått, ändraMätning,
  raderaMätning, kroppsdata, trend, massor,
} from "../engines/utveckling.js";
import {
  KROPPSMATT, MATT_INDEX, MATT_PAR, GRUPPER, mattIGrupp, ALLA_INDEX,
  KROPPSSAMMANSATTNING, ENHETER, visaEnhet,
} from "../data/kroppsmatt.js";

const DAG = 864e5;
// FAST NOLLPUNKT. Med `Date.now()` inuti hjälparen gav två anrop med samma
// argument olika ts, och en post gick inte att slå upp igen — testet föll på
// sig självt i stället för på koden.
const NU = 1787000000000;
const T = (dagarSedan) => NU - dagarSedan * DAG;

describe("registret", () => {
  it("varje mått har id, namn och grupp som finns", () => {
    const grupper = new Set(GRUPPER.map(g => g.id));
    for (const m of KROPPSMATT) {
      expect(m.id, JSON.stringify(m)).toBeTruthy();
      expect(m.namn, m.id).toBeTruthy();
      expect(grupper.has(m.grupp), `${m.id} har okänd grupp ${m.grupp}`).toBe(true);
      expect(m.enhet, m.id).toBe("cm");
    }
  });

  it("inga dubbletter av id", () => {
    const ids = KROPPSMATT.map(m => m.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("de fjorton måtten ur kravet finns", () => {
    const krav = [
      "hals", "axlar", "brost", "midja", "mage", "hoft",
      "biceps_vanster", "biceps_hoger", "underarm_vanster", "underarm_hoger",
      "lar_vanster", "lar_hoger", "vad_vanster", "vad_hoger",
    ];
    for (const id of krav) expect(MATT_INDEX[id], `${id} saknas`).toBeTruthy();
  });

  it("varje par pekar på varandra", () => {
    for (const m of KROPPSMATT) {
      if (!m.par) continue;
      expect(MATT_INDEX[m.par], `${m.id} pekar på okänt ${m.par}`).toBeTruthy();
      expect(MATT_INDEX[m.par].par, `${m.par} pekar inte tillbaka`).toBe(m.id);
    }
  });

  it("MATT_PAR härleds ur registret och namnger utan sida", () => {
    expect(MATT_PAR.length).toBe(4);
    const biceps = MATT_PAR.find(p => p.vanster === "biceps_vanster");
    expect(biceps.hoger).toBe("biceps_hoger");
    expect(biceps.namn).toBe("Biceps");
  });

  it("grupperna delar upp alla mått, ingen hamnar utanför", () => {
    const summa = GRUPPER.reduce((n, g) => n + mattIGrupp(g.id).length, 0);
    expect(summa).toBe(KROPPSMATT.length);
  });

  it("ett nytt mått kräver bara en rad — inget register saknar det", () => {
    // Vakten mot att lägga till ett mått på ett ställe och glömma ett annat:
    // ALLA_INDEX byggs ur KROPPSMATT, så den kan inte glida isär. Faller det
    // här har någon börjat lista mått för hand igen.
    for (const m of KROPPSMATT) {
      expect(ALLA_INDEX[m.id], `${m.id} saknas i ALLA_INDEX`).toBeTruthy();
      expect(ALLA_INDEX[m.id].källa).toBe("matt");
    }
    for (const m of KROPPSSAMMANSATTNING) {
      expect(ALLA_INDEX[m.id].källa).toBe("falt");
    }
  });

  it("procentenheter skiljs från procent i registret", () => {
    // Hela poängen: en förändring i kroppsfett mäts i pp, inte i %.
    expect(ALLA_INDEX.fat.enhet).toBe("%");
    expect(ALLA_INDEX.fat.enhetDiff).toBe("pp");
    expect(ALLA_INDEX.muscle.enhetDiff).toBe("pp");
    expect(ALLA_INDEX.kg.enhetDiff).toBe("kg");
    expect(ALLA_INDEX.midja.enhetDiff).toBe("cm");
  });

  it("enheterna är förberedda för imperiellt utan att vara påslagna", () => {
    expect(visaEnhet("kg")).toBe("kg");
    expect(visaEnhet("cm")).toBe("cm");
    expect(visaEnhet("kg", "imperiell")).toBe("lb");
    expect(visaEnhet("cm", "imperiell")).toBe("in");
    expect(ENHETER.cm.faktor).toBeCloseTo(0.393701, 5);
  });
});

describe("skapa mätning", () => {
  it("full mätning med vikt, sammansättning och mått", () => {
    const m = byggMätning({
      ts: 1000, kg: 82.4, fat: 22.1, muscle: 37.4,
      matt: { midja: 91.5, brost: 103, biceps_hoger: 36 },
    });
    expect(m.kg).toBe(82.4);
    expect(m.fat).toBe(22.1);
    expect(m.matt).toEqual({ midja: 91.5, brost: 103, biceps_hoger: 36 });
  });

  it("PARTIELL mätning — bara midja, ingen vikt", () => {
    // Det här var omöjligt förut: byggMätning returnerade null utan kg.
    const m = byggMätning({ matt: { midja: 91.5 } });
    expect(m).toBeTruthy();
    expect(m.kg).toBe(null);
    expect(m.matt).toEqual({ midja: 91.5 });
  });

  it("bara vikt fungerar precis som förut", () => {
    const m = byggMätning({ kg: 82.4 });
    expect(m.kg).toBe(82.4);
    expect(m.matt).toBeUndefined();
  });

  it("helt tom mätning avvisas", () => {
    expect(byggMätning({})).toBe(null);
    expect(byggMätning({ kg: "", fat: "", matt: {} })).toBe(null);
    expect(byggMätning({ matt: { midja: "" } })).toBe(null);
  });

  it("decimaler med både komma och punkt", () => {
    expect(byggMätning({ kg: "82,4" }).kg).toBe(82.4);
    expect(byggMätning({ kg: "82.4" }).kg).toBe(82.4);
    expect(byggMätning({ matt: { midja: "91,5" } }).matt.midja).toBe(91.5);
    expect(byggMätning({ matt: { vad_vanster: "37.5" } }).matt.vad_vanster).toBe(37.5);
  });

  it("TOMMA VÄRDEN BLIR ALDRIG NOLL", () => {
    // Kravet ordagrant: 0 får inte automatiskt användas för tomma fält. En
    // omätt midja och en midja på 0 cm är olika påståenden.
    const m = byggMätning({ kg: 82, fat: "", muscle: null, matt: { midja: "", brost: 103 } });
    expect(m.fat).toBe(null);
    expect(m.muscle).toBe(null);
    expect(m.matt).toEqual({ brost: 103 });
    expect("midja" in m.matt).toBe(false);
  });

  it("negativa mått accepteras inte", () => {
    expect(tolkaTal("-5", 1, 300)).toBe(null);
    expect(byggMätning({ kg: 82, matt: { midja: -91.5 } }).matt).toBeUndefined();
    expect(byggMätning({ kg: -82 })).toBe(null);
  });

  it("kroppsfett kan inte vara negativt och håller sig inom gränserna", () => {
    expect(byggMätning({ kg: 82, fat: -1 }).fat).toBe(null);
    expect(byggMätning({ kg: 82, fat: 0 }).fat).toBe(null);
    expect(byggMätning({ kg: 82, fat: 95 }).fat).toBe(null);
    expect(byggMätning({ kg: 82, fat: 22.1 }).fat).toBe(22.1);
  });

  it("orimliga omkretsar avvisas men rimliga släpps igenom", () => {
    expect(byggMätning({ matt: { midja: 915 } })).toBe(null);   // tappat komma
    expect(byggMätning({ matt: { midja: 91.5 } }).matt.midja).toBe(91.5);
    expect(byggMätning({ matt: { hals: 12 } }).matt.hals).toBe(12);
  });

  it("skräpinmatning ger null, inte NaN", () => {
    expect(byggMätning({ kg: "abc" })).toBe(null);
    expect(byggMätning({ kg: 82, matt: { midja: "hej" } }).matt).toBeUndefined();
  });
});

describe("redigera och radera", () => {
  const bas = [
    byggMätning({ ts: T(30), kg: 87, matt: { midja: 99 } }),
    byggMätning({ ts: T(15), kg: 84, matt: { midja: 95 } }),
    byggMätning({ ts: T(1), kg: 82.4, matt: { midja: 91.5 } }),
  ];

  it("ändraMätning ersätter posten", () => {
    const ny = byggMätning({ ts: T(15), kg: 85.5, matt: { midja: 94 } });
    const ut = ändraMätning(bas, T(15), ny);
    expect(ut.length).toBe(3);
    expect(ut.find(m => m.ts === T(15)).kg).toBe(85.5);
  });

  it("redigering ERSÄTTER, så ett rensat fält försvinner", () => {
    // Med sammanslagning hade det gamla värdet legat kvar och fältet gått att
    // ändra men inte att tömma.
    const ny = byggMätning({ ts: T(15), kg: 84 });
    const ut = ändraMätning(bas, T(15), ny);
    expect(ut.find(m => m.ts === T(15)).matt).toBeUndefined();
  });

  it("raderaMätning tar bort exakt en post", () => {
    const ut = raderaMätning(bas, T(15));
    expect(ut.length).toBe(2);
    expect(ut.some(m => m.ts === T(15))).toBe(false);
    expect(ut.some(m => m.ts === T(30))).toBe(true);
  });

  it("radera en post som inte finns rör ingenting", () => {
    expect(raderaMätning(bas, 12345).length).toBe(3);
  });
});

describe("förändring", () => {
  const serieMätningar = [
    byggMätning({ ts: T(60), kg: 87.2, fat: 25.5, matt: { midja: 99 } }),
    byggMätning({ ts: T(30), kg: 84.8, fat: 24.0, matt: { midja: 93.2 } }),
    byggMätning({ ts: T(14), kg: 83.1, fat: 23.0, matt: { midja: 92.0 } }),
    byggMätning({ ts: T(1), kg: 82.4, fat: 22.1, matt: { midja: 91.5 } }),
  ];

  it("sedan start och sedan senaste", () => {
    const f = förändring(serieMätningar, "midja");
    expect(f.värde).toBe(91.5);
    expect(f.sedanStart).toBe(-7.5);      // 91,5 − 99
    expect(f.sedanSenaste).toBe(-0.5);    // 91,5 − 92,0
    expect(f.punkter).toBe(4);
  });

  it("vikt räknas ur samma serie", () => {
    const f = förändring(serieMätningar, "kg");
    expect(f.värde).toBe(82.4);
    expect(f.sedanStart).toBe(-4.8);
  });

  it("PROCENTENHETER, inte procent, för kroppsfett", () => {
    const f = förändring(serieMätningar, "fat");
    expect(f.sedanStart).toBe(-3.4);                          // 22,1 − 25,5 pp
    expect(procentuellFörändring(serieMätningar, "fat")).toBe(-13.3); // −3,4/25,5
  });

  it("EN mätning ger null, inte noll", () => {
    const en = [byggMätning({ ts: T(1), kg: 82.4 })];
    const f = förändring(en, "kg");
    expect(f.värde).toBe(82.4);
    expect(f.sedanStart).toBe(null);
    expect(f.sedanSenaste).toBe(null);
  });

  it("mått som aldrig mätts ger null", () => {
    expect(förändring(serieMätningar, "hals")).toBe(null);
  });

  it("hoppar över poster som saknar just det måttet", () => {
    // Ett mättillfälle med bara vikt ska inte bryta midjeserien.
    const blandat = [
      byggMätning({ ts: T(60), matt: { midja: 99 } }),
      byggMätning({ ts: T(30), kg: 84.8 }),
      byggMätning({ ts: T(1), matt: { midja: 91.5 } }),
    ];
    const f = förändring(blandat, "midja");
    expect(f.punkter).toBe(2);
    expect(f.sedanStart).toBe(-7.5);
  });
});

describe("vänster och höger", () => {
  it("skillnaden redovisas neutralt med större sida", () => {
    const m = [byggMätning({ ts: T(1), matt: { biceps_vanster: 35.5, biceps_hoger: 36.0 } })];
    const a = asymmetri(m, "biceps_vanster", "biceps_hoger");
    expect(a.vänster).toBe(35.5);
    expect(a.höger).toBe(36);
    expect(a.diff).toBe(0.5);
    expect(a.större).toBe("höger");
  });

  it("lika sidor ger noll och ingen större", () => {
    const m = [byggMätning({ ts: T(1), matt: { lar_vanster: 58, lar_hoger: 58 } })];
    const a = asymmetri(m, "lar_vanster", "lar_hoger");
    expect(a.diff).toBe(0);
    expect(a.större).toBe(null);
  });

  it("kräver BÅDA sidorna i samma mätning", () => {
    // Annars vore två månaders utveckling asymmetri.
    const m = [
      byggMätning({ ts: T(60), matt: { biceps_vanster: 34 } }),
      byggMätning({ ts: T(1), matt: { biceps_hoger: 36 } }),
    ];
    expect(asymmetri(m, "biceps_vanster", "biceps_hoger")).toBe(null);
  });

  it("tar den SENASTE posten som har båda", () => {
    const m = [
      byggMätning({ ts: T(60), matt: { vad_vanster: 36, vad_hoger: 37 } }),
      byggMätning({ ts: T(1), matt: { vad_vanster: 37.5, vad_hoger: 38 } }),
    ];
    const a = asymmetri(m, "vad_vanster", "vad_hoger");
    expect(a.vänster).toBe(37.5);
    expect(a.diff).toBe(0.5);
  });
});

describe("historik", () => {
  it("ett mättillfälle kan innehålla endast några värden", () => {
    const historik = [
      byggMätning({ ts: T(14), kg: 83.1, matt: { midja: 92, brost: 103.5 } }),
      byggMätning({ ts: T(1), kg: 82.4, fat: 22.1, muscle: 37.4, matt: { midja: 91.5, biceps_hoger: 36 } }),
    ];
    expect(historik[0].fat).toBe(null);
    expect(historik[0].matt.biceps_hoger).toBeUndefined();
    expect(historik[1].matt.brost).toBeUndefined();
  });

  it("mättMått listar bara det som faktiskt mätts", () => {
    const m = [byggMätning({ ts: T(1), kg: 82, matt: { midja: 91.5 } })];
    const ids = KROPPSMATT.map(x => x.id);
    expect(mättMått(m, ids)).toEqual(["midja"]);
  });

  it("serie sorteras äldst först oavsett inmatningsordning", () => {
    const m = [
      byggMätning({ ts: T(1), matt: { midja: 91.5 } }),
      byggMätning({ ts: T(60), matt: { midja: 99 } }),
      byggMätning({ ts: T(30), matt: { midja: 95 } }),
    ];
    expect(serie(m, "midja").map(p => p.v)).toEqual([99, 95, 91.5]);
  });
});

describe("bakåtkompatibilitet med befintlig viktdata", () => {
  it("gamla poster utan matt är fortfarande giltiga", () => {
    // Precis den form som ligger i localStorage hos befintliga användare.
    const gammal = { ts: T(30), kg: 84.8, fat: 24, muscle: 36, visceral: 8, källa: "omron" };
    expect(mätvärde(gammal, "kg")).toBe(84.8);
    expect(mätvärde(gammal, "midja")).toBe(null);
    expect(förändring([gammal], "kg").värde).toBe(84.8);
    expect(massor(gammal).fettfriMassa).toBeCloseTo(64.4, 1);
  });

  it("vikten når fortfarande weights — kedjan är orörd", () => {
    // Buggen som redan kostat: matningar fylldes medan weights förblev tom, och
    // profilen, coachen, framstegsvyn och målplanen såg ingen vikt.
    const m = [
      byggMätning({ ts: T(30), kg: 84.8, matt: { midja: 95 } }),
      byggMätning({ ts: T(1), matt: { midja: 91.5 } }),   // ingen vikt
    ];
    const w = vikterUrMätningar([], m);
    expect(w.length).toBe(1);
    expect(w[0].kg).toBe(84.8);
  });

  it("trend() fungerar oförändrat på poster med kroppsmått", () => {
    const m = [
      byggMätning({ ts: T(60), kg: 87.2, matt: { midja: 99 } }),
      byggMätning({ ts: T(1), kg: 82.4, matt: { midja: 91.5 } }),
    ];
    const t = trend(m, "kg", 90);
    expect(t.diff).toBe(-4.8);
    expect(t.punkter).toBe(2);
  });

  it("sammanslagning slår ihop matt nyckel för nyckel", () => {
    // En rak spread hade raderat bröstet och biceparna som mättes samma morgon.
    const ts = T(1);
    const a = byggMätning({ ts, kg: 82.4, matt: { brost: 103, biceps_hoger: 36 } });
    const b = byggMätning({ ts: ts + 6e5, matt: { midja: 91.5 } });
    const ut = slåIhopMätningar([a], [b]);
    expect(ut.length).toBe(1);
    expect(ut[0].matt).toEqual({ brost: 103, biceps_hoger: 36, midja: 91.5 });
    expect(ut[0].kg).toBe(82.4);
  });
});

describe("underlag för AI-coachen", () => {
  const m = [
    byggMätning({ ts: T(60), kg: 87.2, fat: 25.5, muscle: 35.2, matt: { midja: 99 } }),
    byggMätning({ ts: T(40), kg: 85.5, fat: 24.4, muscle: 36.0, matt: { midja: 95 } }),
    byggMätning({ ts: T(1), kg: 82.4, fat: 22.1, muscle: 37.4, matt: { midja: 91.5 } }),
  ];

  it("levererar aktuella värden och förändringar", () => {
    const d = kroppsdata(m, { dagar: 30, mattIds: ["midja"] }, NU);
    expect(d.vikt.värde).toBe(82.4);
    expect(d.vikt.sedanStart).toBe(-4.8);
    expect(d.kroppsfett.värde).toBe(22.1);
    expect(d.kroppsfett.sedanStart).toBe(-3.4);
    expect(d.muskel.värde).toBe(37.4);
    expect(d.mått.midja.värde).toBe(91.5);
    expect(d.mått.midja.sedanStart).toBe(-7.5);
  });

  it("förändring över 30 dagar mäts mot punkten före fönstret", () => {
    const d = kroppsdata(m, { dagar: 30 }, NU);
    expect(d.viktFörändringPeriod).toBe(-3.1);   // 82,4 − 85,5 (dag 40)
  });

  it("tom historik ger null rakt igenom, aldrig nollor", () => {
    const d = kroppsdata([], { mattIds: ["midja"] }, NU);
    expect(d.vikt).toBe(null);
    expect(d.kroppsfett).toBe(null);
    expect(d.viktFörändringPeriod).toBe(null);
    expect(d.mått).toEqual({});
    expect(d.antalMätningar).toBe(0);
  });

  it("en enda mätning ger värde men ingen förändring", () => {
    const d = kroppsdata([byggMätning({ ts: T(1), kg: 82.4 })], {}, NU);
    expect(d.vikt.värde).toBe(82.4);
    expect(d.vikt.sedanStart).toBe(null);
    expect(d.viktFörändringPeriod).toBe(null);
  });
});
