// Askr 2.0 — fotologgning.
//
// Claude kan se ett foto och säga "kyckling, ris, broccoli". Vad den INTE kan
// är att veta hur mycket: en portion ris kan vara 100 g eller 250 g beroende på
// tallriksstorlek och vinkel, och skillnaden är 200 kcal. Modellen svarar ändå
// med ett tal, eftersom det är vad den gör.
//
// DÄRFÖR: modellen identifierar, motorn räknar, användaren bekräftar. Fotot är
// en snabbstart, inte ett facit. Alternativet — låta modellen sätta kalorierna
// rakt av — hade varit fel med tjugo procent utan att någon märkte det, tills
// readiness byggde på skräp.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { tolkaFotosvar, matchaLivsmedel, fotoNäring, FOTO_SYSTEM } from "../engines/fotoMaltid.js";

const SVAR = '{"livsmedel":[{"namn":"kycklingfilé","gram":150,"säkerhet":"hög"},{"namn":"kokt ris","gram":180,"säkerhet":"medel"}],"notering":"Såsen går inte att bedöma."}';

describe("tolkning av modellsvaret", () => {
  it("ren JSON", () => {
    const t = tolkaFotosvar(SVAR);
    expect(t.ok).toBe(true);
    expect(t.livsmedel.length).toBe(2);
    expect(t.notering).toMatch(/såsen/i);
  });

  it("kodstaket städas bort i stället för att kasta svaret", () => {
    // Modellen ombeds svara med ren JSON men lägger ibland till ```json.
    expect(tolkaFotosvar("```json\n" + SVAR + "\n```").ok).toBe(true);
  });

  it("inledande text före JSON tolereras", () => {
    expect(tolkaFotosvar("Här är vad jag ser:\n" + SVAR).ok).toBe(true);
  });

  it("trasig JSON ger ett skäl, inte en krasch", () => {
    expect(tolkaFotosvar('{"livsmedel":[').ok).toBe(false);
    expect(tolkaFotosvar("").ok).toBe(false);
    expect(tolkaFotosvar(null).ok).toBe(false);
  });

  it("tom lista är ett giltigt svar", () => {
    // Modellen ska kunna säga att den inte ser mat. Ett tomt svar är alltid
    // bättre än en påhittad måltid.
    const t = tolkaFotosvar('{"livsmedel":[],"notering":"Bilden visar en katt."}');
    expect(t.ok).toBe(true);
    expect(t.livsmedel.length).toBe(0);
  });

  it("orimliga gramtal kapas", () => {
    // Över två kilo på en tallrik är inte en portion, det är ett fel.
    const t = tolkaFotosvar('{"livsmedel":[{"namn":"ris","gram":9000,"säkerhet":"hög"}]}');
    expect(t.livsmedel[0].gram).toBeLessThanOrEqual(2000);
  });

  it("okänd säkerhetsnivå faller till låg", () => {
    const t = tolkaFotosvar('{"livsmedel":[{"namn":"ris","gram":100,"säkerhet":"jättesäker"}]}');
    expect(t.livsmedel[0].säkerhet).toBe("låg");
  });
});

describe("matchning mot livsmedelsdatan", () => {
  it("modellens namn är en sökfråga och slås upp", () => {
    const m = matchaLivsmedel(tolkaFotosvar(SVAR).livsmedel);
    expect(m.every(x => x.matchad)).toBe(true);
    expect(m[0].food.name).toMatch(/kyckling/i);
  });

  it("en post utan träff markeras, den tvingas inte mot närmaste ord", () => {
    // En felaktig matchning ger fel näring utan att någon märker det; en tom
    // rad syns.
    const m = matchaLivsmedel([{ namn: "xyzzy qwerty", gram: 100, säkerhet: "låg" }]);
    expect(m[0].matchad).toBe(false);
  });
});

describe("näringen räknas av motorn", () => {
  it("summan kommer ur databasen, inte ur modellen", () => {
    const n = fotoNäring(matchaLivsmedel(tolkaFotosvar(SVAR).livsmedel));
    expect(n.kcal).toBeGreaterThan(0);
    expect(n.matchade).toBe(2);
  });

  it("omatchade poster räknas inte in", () => {
    const m = matchaLivsmedel([
      { namn: "kycklingfilé", gram: 100, säkerhet: "hög" },
      { namn: "xyzzy qwerty", gram: 500, säkerhet: "låg" },
    ]);
    const n = fotoNäring(m);
    expect(n.matchade).toBe(1);
    expect(n.totalt).toBe(2);
  });

  it("helhetens säkerhet styrs av den osäkraste posten", () => {
    // En måltid är inte säkrare än sin osäkraste del.
    const m = matchaLivsmedel([
      { namn: "kycklingfilé", gram: 100, säkerhet: "hög" },
      { namn: "kokt ris", gram: 100, säkerhet: "låg" },
    ]);
    expect(fotoNäring(m).säkerhet).toBe("låg");
  });
});

describe("prompten förbjuder modellen att räkna", () => {
  it("systemprompten ber om livsmedel och gram, inte kalorier", () => {
    expect(FOTO_SYSTEM).toMatch(/Inga kalorital/i);
    expect(FOTO_SYSTEM).toMatch(/appen räknar dem själv/i);
  });

  it("den ber modellen säga när den inte ser", () => {
    expect(FOTO_SYSTEM).toMatch(/tomt svar är alltid bättre/i);
  });

  it("vyn loggar med quality photo — tilliten märks på posten", () => {
    // dataConfidence ska kunna se att en fotad måltid inte är en vägd.
    const src = readFileSync(resolve("src/atlas2/FotoMaltid.jsx"), "utf8");
    expect(src).toMatch(/quality: "photo"/);
  });

  it("vyn säger att summan är uppskattad", () => {
    const src = readFileSync(resolve("src/atlas2/FotoMaltid.jsx"), "utf8");
    expect(src).toMatch(/Uppskattat ur bilden/);
  });
});
