// Askr 2.0 — skanna maskin: QR-kod eller foto.
//
// Maskiner har ingen streckkod som mat har. Robert: "jag vill ha in skanning
// av maskiner också". Två vägar in i maskinguiden:
//
//   QR-koden som redan sitter på maskinen — exakt, pekar på en modell.
//   Foto — reserven när koden saknas eller är sliten. AI identifierar TYPEN,
//     aldrig ett tal, och svaret valideras alltid mot de 43 kända typerna.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { matchaMaskinkod } from "../engines/machines.js";
import { tolkaMaskinsvar, MASKIN_SYSTEM } from "../engines/fotoMaskin.js";
import { MACHINE_TYPES, MACHINE_MODELS } from "../data/machines.js";

describe("QR-koden tolkas mot en riktig modell", () => {
  it("ett modell-id direkt ger exakt träff", () => {
    const id = MACHINE_MODELS[0].id;
    const m = matchaMaskinkod(id);
    expect(m).toBeTruthy();
    expect(m.id).toBe(id);
  });

  it("en URL med id i sökvägen eller frågesträngen matchar", () => {
    const id = MACHINE_MODELS[0].id;
    expect(matchaMaskinkod(`https://technogym.com/product/${id}`).id).toBe(id);
    expect(matchaMaskinkod(`https://technogym.com/p?model=${id}`).id).toBe(id);
  });

  it("fritext med tillverkare och modell matchar", () => {
    // Många maskiners egna QR-etiketter visar literally namnet, inte ett id.
    const modell = MACHINE_MODELS[0];
    const m = matchaMaskinkod(`${modell.manufacturer} ${modell.model}`);
    expect(m && m.id).toBe(modell.id);
  });

  it("en okänd kod ger null, inte en gissning", () => {
    // QR-koder på gymutrustning kan peka mot instruktionsvideor eller
    // garantisidor — helt andra saker än en maskinmodell.
    expect(matchaMaskinkod("https://youtube.com/watch?v=xyz")).toBe(null);
    expect(matchaMaskinkod("")).toBe(null);
    expect(matchaMaskinkod(null)).toBe(null);
  });
});

describe("fototolkningen valideras mot de kända typerna", () => {
  it("ett giltigt typeId tolkas", () => {
    const t = tolkaMaskinsvar('{"typeId":"lat_pulldown","säkerhet":"hög","notering":"Tydlig logga."}');
    expect(t.ok).toBe(true);
    expect(t.typeId).toBe("lat_pulldown");
  });

  it("ett påhittat eller felstavat id avvisas", () => {
    // Ett hittepå-id ska inte krascha guiden med en typ som inte finns.
    expect(tolkaMaskinsvar('{"typeId":"finns_inte_alls","säkerhet":"hög"}').ok).toBe(false);
    expect(tolkaMaskinsvar('{"typeId":"finns_inte_alls"}').skäl).toBe("okänt-id");
  });

  it('"vet inte" är ett giltigt svar', () => {
    // Ett fel svar som pekar mot en helt annan maskin är värre än inget svar
    // — användaren hamnar då i fel guide och läser felaktiga säkerhetsråd.
    const t = tolkaMaskinsvar('{"typeId":null,"notering":"Bilden är för mörk."}');
    expect(t.ok).toBe(false);
    expect(t.skäl).toBe("vet-inte");
    expect(t.notering).toMatch(/mörk/);
  });

  it("trasig JSON ger ett skäl, inte en krasch", () => {
    expect(tolkaMaskinsvar("{").ok).toBe(false);
    expect(tolkaMaskinsvar("").ok).toBe(false);
    expect(tolkaMaskinsvar(null).ok).toBe(false);
  });

  it("okänd säkerhetsnivå faller till låg", () => {
    expect(tolkaMaskinsvar('{"typeId":"lat_pulldown","säkerhet":"jättesäker"}').säkerhet).toBe("låg");
  });
});

describe("prompten listar bara verkliga typer", () => {
  it("alla 43 typerna finns med", () => {
    for (const t of MACHINE_TYPES) expect(MASKIN_SYSTEM, t.id).toContain(t.id);
  });

  it("modellen ombeds hålla sig till listan", () => {
    expect(MASKIN_SYSTEM).toMatch(/ENDA maskintyper/);
    expect(MASKIN_SYSTEM).toMatch(/SÄG NÄR DU INTE KAN SE/);
  });
});

describe("vyn kopplar en träff till rätt öppning", () => {
  const src = readFileSync(resolve("src/atlas2/MachineGuide.jsx"), "utf8");

  it("kameran stängs av när skanningsvyn lämnas", () => {
    // En kamera som lever vidare i bakgrunden är både ett batteriläckage och
    // en förtroendefråga.
    const skannaSrc = readFileSync(resolve("src/atlas2/SkannaMaskin.jsx"), "utf8");
    expect(skannaSrc).toMatch(/ström\.getTracks\(\)\.forEach/);
  });

  it("guiden tar emot både full modell och bart typeId", () => {
    // QR-vägen kan ge en full modell (med typeId), fotovägen bara typeId.
    expect(src).toMatch(/typIdEllerModell && typIdEllerModell\.typeId/);
  });
});
