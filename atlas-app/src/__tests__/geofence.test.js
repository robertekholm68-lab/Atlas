import { describe, it, expect } from "vitest";
import {
  distanceMeters, placeState, nearestPlace, detectGym, makePlace, DEFAULT_RADIUS_M,
} from "../engines/geofence.js";

// Kista centrum som referens
const KISTA = { lat: 59.4022, lng: 17.9445 };
// ~1 grad latitud = 111 km. 0.0009 grader ≈ 100 m rakt norrut.
const norrut = m => ({ lat: KISTA.lat + m / 111320, lng: KISTA.lng });

const plats = (extra = {}) => ({ id: "p1", name: "Mitt gym", ...KISTA, radius: DEFAULT_RADIUS_M, ...extra });

describe("distanceMeters", () => {
  it("ger noll på samma punkt", () => {
    expect(distanceMeters(KISTA, KISTA)).toBe(0);
  });
  it("räknar hundra meter norrut rimligt rätt", () => {
    const d = distanceMeters(KISTA, norrut(100));
    expect(d).toBeGreaterThan(95);
    expect(d).toBeLessThan(105);
  });
  it("är symmetriskt", () => {
    expect(distanceMeters(KISTA, norrut(250))).toBe(distanceMeters(norrut(250), KISTA));
  });
  it("returnerar null på skräpindata", () => {
    for (const [a, b] of [[null, KISTA], [KISTA, null], [{ lat: "x", lng: 1 }, KISTA], [{}, {}]]) {
      expect(distanceMeters(a, b)).toBeNull();
    }
  });
});

describe("placeState – tre svar, aldrig en gissning", () => {
  it("innanför radien med bra mätning", () => {
    expect(placeState(plats(), { ...norrut(50), accuracy: 10 })).toMatchObject({ state: "inne" });
  });
  it("utanför radien med bra mätning", () => {
    expect(placeState(plats(), { ...norrut(600), accuracy: 10 })).toMatchObject({ state: "ute" });
  });
  it("säger osäker när felmarginalen spänner över gränsen", () => {
    // 140 m från mitten, radie 150, men ±40 m fel: vi vet inte vilken sida vi är på.
    const r = placeState(plats(), { ...norrut(140), accuracy: 40 });
    expect(r.state).toBe("osäker");
    expect(r.reason).toBe("nara-gransen");
  });
  it("säger osäker vid helt grov mätning", () => {
    const r = placeState(plats(), { ...norrut(20), accuracy: 900 });
    expect(r.state).toBe("osäker");
    expect(r.reason).toBe("grov-matning");
  });
  it("klarar mätning utan angiven noggrannhet", () => {
    expect(placeState(plats(), norrut(50)).state).toBe("inne");
  });
  it("är osäker utan position alls", () => {
    expect(placeState(plats(), null).state).toBe("osäker");
    expect(placeState(null, KISTA).state).toBe("osäker");
  });
  it("respekterar en egen radie", () => {
    expect(placeState(plats({ radius: 40 }), { ...norrut(80), accuracy: 5 }).state).toBe("ute");
    expect(placeState(plats({ radius: 300 }), { ...norrut(80), accuracy: 5 }).state).toBe("inne");
  });
});

describe("nearestPlace", () => {
  const a = plats({ id: "a", name: "Nära" });
  const b = plats({ id: "b", name: "Långt", lat: KISTA.lat + 0.05 });

  it("väljer den närmaste", () => {
    expect(nearestPlace([b, a], norrut(10)).place.id).toBe("a");
  });
  it("returnerar null utan platser eller position", () => {
    expect(nearestPlace([], KISTA)).toBeNull();
    expect(nearestPlace(null, KISTA)).toBeNull();
    expect(nearestPlace([a], null)).toBeNull();
  });
  it("hoppar över trasiga platser", () => {
    expect(nearestPlace([{ id: "trasig" }, a], norrut(10)).place.id).toBe("a");
  });
});

describe("detectGym", () => {
  it("hittar gymmet man står på", () => {
    const r = detectGym([plats()], { ...norrut(30), accuracy: 15 });
    expect(r.found).toBe(true);
    expect(r.place.name).toBe("Mitt gym");
  });
  it("skiljer på 'är' och 'kanske'", () => {
    const säker = detectGym([plats()], { ...norrut(30), accuracy: 15 });
    const osäker = detectGym([plats()], { ...norrut(145), accuracy: 50 });
    expect(säker.found).toBe(true);
    expect(osäker.found).toBe(false);
    expect(osäker.maybe).toBe(true);
  });
  it("säger ifrån när inga platser är sparade", () => {
    expect(detectGym([], KISTA)).toMatchObject({ found: false, state: "ingen-plats" });
  });
  it("hittar ingenting när man är hemma", () => {
    const r = detectGym([plats()], { ...norrut(3000), accuracy: 10 });
    expect(r.found).toBe(false);
    expect(r.maybe).toBe(false);
  });
});

describe("makePlace", () => {
  it("skapar en plats med id och avrundade koordinater", () => {
    const p = makePlace({ name: "  Gärdet  ", pos: { lat: 59.40221234567, lng: 17.94459876, accuracy: 12.6 } });
    expect(p.name).toBe("Gärdet");
    expect(p.id).toMatch(/^plats_/);
    expect(String(p.lat).split(".")[1].length).toBeLessThanOrEqual(6);
    expect(p.accuracy).toBe(13);
    expect(p.radius).toBe(DEFAULT_RADIUS_M);
  });
  it("vägrar utan namn eller giltig position", () => {
    expect(makePlace({ name: "", pos: KISTA })).toBeNull();
    expect(makePlace({ name: "X", pos: null })).toBeNull();
    expect(makePlace({ name: "X", pos: { lat: "a", lng: 1 } })).toBeNull();
  });
  it("ger unika id:n", () => {
    const a = makePlace({ name: "A", pos: KISTA });
    const b = makePlace({ name: "B", pos: KISTA });
    expect(a.id).not.toBe(b.id);
  });
});
