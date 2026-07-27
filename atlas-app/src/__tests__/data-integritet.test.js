// Dataintegritet: inga hål i någon exporterad array i src/data/.
//
// VARFÖR: ett dubbelkomma i en arrayliteral skapar en TOM PLATS. `length`
// räknar den, men `forEach`, `map` och `filter` hoppar över den. En post kan
// försvinna ur banken utan att något kastar fel.
//
// Det hände på riktigt: FOOD_KB rapporterade 65 poster men itererade 64, och
// testet som skulle fånga det mätte `length` — och passerade därför på exakt
// det tal som var fel. Ett test som mäter fel storhet ger falsk trygghet.
//
// Den här filen använder import.meta.glob och täcker därför VARJE datamodul
// automatiskt, även sådana som skrivs efter att den här raden är skriven. Det
// är hela poängen: skyddet ska inte behöva någon som kommer ihåg att utöka det.

import { describe, it, expect } from "vitest";

const moduler = import.meta.glob("../data/*.js", { eager: true });

describe("dataintegritet", () => {
  it("hittar datamodulerna alls", () => {
    expect(Object.keys(moduler).length).toBeGreaterThan(5);
  });

  Object.entries(moduler).forEach(([sökväg, mod]) => {
    const fil = sökväg.split("/").pop();
    const arrayer = Object.entries(mod).filter(([, v]) => Array.isArray(v));
    if (!arrayer.length) return;

    it(`${fil}: inga tomma platser i ${arrayer.length} array(er)`, () => {
      arrayer.forEach(([namn, arr]) => {
        let besökta = 0;
        arr.forEach(() => besökta++);
        expect(besökta, `${namn}: length ${arr.length} men forEach besöker ${besökta} — leta efter ",," i literalen`).toBe(arr.length);
        arr.forEach((x, i) => {
          expect(x, `${namn}[${i}] är ${x}`).not.toBe(undefined);
          expect(x, `${namn}[${i}] är null`).not.toBe(null);
        });
      });
    });
  });
});
