// Profilen — en sanning om vem användaren är.
// Tyngdpunkten ligger på gender/sex-bron: den buggen var tyst och gav
// felaktiga siffror utan att någon fick veta.
import { describe, it, expect } from "vitest";
import {
  normaliseraProfil, profilLuckor, sammanfogaProfil, profilSammanfattning, FÄLT,
} from "../engines/profil.js";
import { derivedBodyFat, bfCategory } from "../engines/bodyfat.js";
import { byggIntervjuUnderlag } from "../engines/intervju.js";

const DAG = 864e5;
const NU = Date.now();

describe("normaliseraProfil — bron mellan sex och gender", () => {
  it("härleder gender ur v3:s sex", () => {
    expect(normaliseraProfil({ sex: "f" }).gender).toBe("female");
    expect(normaliseraProfil({ sex: "m" }).gender).toBe("male");
  });
  it("ett redan satt gender rörs inte (v2-profiler)", () => {
    expect(normaliseraProfil({ gender: "female", sex: "m" }).gender).toBe("female");
  });
  it("utan kön blir gender null — inte 'male'", () => {
    // Det här är hela poängen: motorernas `|| "male"` ska möta null och kunna
    // säga att uppgiften saknas, inte tyst anta en man.
    expect(normaliseraProfil({}).gender).toBe(null);
  });
  it("vikten kommer ur vikthistoriken, inte ur profilfältet", () => {
    const p = normaliseraProfil({ weight: 80 }, { weights: [{ ts: NU - 5 * DAG, kg: 96 }, { ts: NU - DAG, kg: 95 }] });
    expect(p.weight).toBe(95);
  });
  it("utan vägningar används profilens vikt som fallback (v2-import)", () => {
    expect(normaliseraProfil({ weight: 80 }, { weights: [] }).weight).toBe(80);
  });
  it("rör aldrig originalobjektet", () => {
    const p = { sex: "f" };
    normaliseraProfil(p);
    expect(p.gender).toBeUndefined();
  });
});

describe("DEN TYSTA BUGGEN: kvinna fick manliga referensvärden", () => {
  // Måtten anges som profilens Kroppsmått (svenska nycklar) — samma form som
  // profilvyn skriver.
  const mått = { height: 165, weight: 62, measurements: { "Hals": 32, "Midja": 74, "Höft": 96 }, sex: "f" };

  it("kroppsfett räknat på rå v3-profil ANVÄNDER FEL FORMEL — därför behövs normaliseringen", () => {
    // Rå profil: gender saknas → bodyfat.js faller tillbaka på "male".
    const rå = derivedBodyFat({ ...mått });
    const normaliserad = derivedBodyFat(normaliseraProfil({ ...mått }));
    expect(rå).not.toBeNull();
    expect(normaliserad).not.toBeNull();
    expect(normaliserad.inputs.gender).toBe("female");
    expect(rå.inputs.gender).toBe("male");
    // Formlerna skiljer sig — samma mått ger olika svar. Det är just därför
    // felet var farligt: talet såg rimligt ut.
    expect(normaliserad.bodyFat).not.toBe(rå.bodyFat);
  });

  it("kategorigränserna skiljer sig mellan könen", () => {
    // 24 % är olika saker för en man och en kvinna.
    expect(bfCategory("female", 24)).not.toBe(bfCategory("male", 24));
  });
});

describe("profilLuckor — ärlighet i stället för tysta standardvärden", () => {
  it("tom profil saknar allt obligatoriskt och redovisar vad det blockerar", () => {
    const l = profilLuckor({});
    expect(l.harAllt).toBe(false);
    expect(l.saknas.map(f => f.id)).toContain("sex");
    expect(l.saknas.map(f => f.id)).toContain("height");
    expect(l.blockerat.join(" ")).toMatch(/Kroppsfett/);
  });
  it("frivilliga fält räknas ALDRIG som luckor", () => {
    const full = { sex: "m", age: 40, height: 180, level: "intermediate", diet: "omnivore" };
    const l = profilLuckor(full);
    expect(l.harAllt).toBe(true);
    expect(l.saknas).toEqual([]);
    // dietApproach och injuryNotes saknas men är val, inte brist.
    expect(FÄLT.filter(f => f.frivilligt).map(f => f.id)).toEqual(["dietApproach", "injuryNotes"]);
  });
  it("tom sträng räknas som saknad, inte som svar", () => {
    expect(profilLuckor({ sex: "", age: 40, height: 180, level: "beginner", diet: "vegan" }).harAllt).toBe(false);
  });
});

describe("sammanfogaProfil — raderar aldrig det som inte redigerats", () => {
  it("bevarar fält utanför ändringarna", () => {
    const b = { sex: "m", supplements: ["kreatin"], id: "u_1", nutStyle: "flexible" };
    const ut = sammanfogaProfil(b, { age: 40, height: 180 });
    expect(ut.supplements).toEqual(["kreatin"]);
    expect(ut.id).toBe("u_1");
    expect(ut.nutStyle).toBe("flexible");
    expect(ut.age).toBe(40);
  });
  it("ett rensat fält sätts till null — inte bort", () => {
    const ut = sammanfogaProfil({ age: 40 }, { age: null });
    expect("age" in ut).toBe(true);
    expect(ut.age).toBe(null);
  });
});

describe("profilSammanfattning", () => {
  it("översätter id till läsbara namn och markerar luckor", () => {
    const s = profilSammanfattning({ sex: "f", diet: "vegan", level: "advanced" });
    const hitta = id => s.find(x => x.id === id);
    expect(hitta("sex").värde).toBe("Kvinna");
    expect(hitta("diet").värde).toBe("Vegan");
    expect(hitta("level").värde).toBe("Erfaren");
    expect(hitta("height").saknas).toBe(true);
    // Frivilliga fält markeras inte som saknade även när de är tomma.
    expect(hitta("injuryNotes").saknas).toBe(false);
  });
});

describe("målintervjun läser profilen", () => {
  it("profilens fält följer med som UNDERLAG, så coachen slipper fråga", () => {
    const u = byggIntervjuUnderlag({
      profile: normaliseraProfil({ sex: "f", age: 34, height: 168, level: "intermediate", diet: "vegetarian", injuryNotes: "ont i vänster axel" }),
      nu: NU,
    });
    expect(u.kön).toBe("female");
    expect(u.ålder).toBe(34);
    expect(u.längdCm).toBe(168);
    expect(u.träningsvana).toBe("intermediate");
    expect(u.kosthållning).toBe("vegetarian");
    expect(u.skadorOchBesvär).toMatch(/axel/);
  });
  it("saknade fält blir null — coachen ser att appen inte vet", () => {
    const u = byggIntervjuUnderlag({ profile: {}, nu: NU });
    expect(u.ålder).toBe(null);
    expect(u.längdCm).toBe(null);
    expect(u.skadorOchBesvär).toBe(null);
  });
});
