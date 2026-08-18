// FOTOIGENKÄNNING AV GYMMASKIN.
//
// Maskiner har ingen streckkod som mat har. Två vägar in i maskinguiden:
// QR-koden som redan sitter på maskinen (matchaMaskinkod i machines.js), eller
// ett foto när ingen kod finns eller den är sliten/borttagen.
//
// SAMMA REGEL SOM FOTOLOGGNINGEN AV MAT: modellen identifierar, den räknar
// aldrig något. Här finns inga tal att räkna fel på — risken är i stället att
// modellen pekar ut fel maskintyp med skenbar säkerhet. Därför är svaret alltid
// en av de 43 KÄNDA typerna i MACHINE_TYPES, aldrig en fritt uppfunnen.

import { MACHINE_TYPES } from "../data/machines.js";

const TYPLISTA = MACHINE_TYPES.map(t => `${t.id}: ${t.name} (${t.en})`).join("\n");

export const MASKIN_SYSTEM = `Du känner igen gymmaskiner åt en svensk träningsapp.

Här är de ENDA maskintyper du får svara med — ett id ur listan, inget annat:
${TYPLISTA}

SVARA ENDAST MED JSON, inget annat — ingen inledning, inga kodstaket:
{"typeId":"lat_pulldown","säkerhet":"hög","notering":"kort mening"}

REGLER:

typeId MÅSTE vara ett av id:na i listan ovan, exakt stavat. Hittar du ingen rimlig matchning: svara {"typeId":null,"notering":"vad du ser i stället"}.

Sätt säkerhet till "hög" när loggan eller formen är tydlig, "medel" när du känner igen typen men är osäker på detaljer, "låg" när du gissar utifrån en vag form.

SÄG NÄR DU INTE KAN SE. Är bilden suddig, för långt bort, eller visar något som inte är en gymmaskin: svara med typeId null och förklara i noteringen. Ett fel svar som pekar mot en helt annan maskin är värre än inget svar — användaren hamnar då i fel guide och läser felaktiga säkerhetsråd.

Noteringen är EN kort mening, till exempel vad på bilden som gjorde att du kände igen typen, eller varför du är osäker.`;

/** Tolkar modellens JSON-svar. Kodstaket och inledande text städas bort. */
export function tolkaMaskinsvar(text) {
  if (!text || typeof text !== "string") return { ok: false, skäl: "tomt" };
  const rensad = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = rensad.indexOf("{");
  const slut = rensad.lastIndexOf("}");
  if (start < 0 || slut <= start) return { ok: false, skäl: "inte-json" };
  let d;
  try { d = JSON.parse(rensad.slice(start, slut + 1)); }
  catch (e) { return { ok: false, skäl: "trasig-json" }; }
  if (!d) return { ok: false, skäl: "fel-form" };

  if (!d.typeId) {
    return { ok: false, skäl: "vet-inte", notering: String(d.notering || "").trim() };
  }

  // TYPID VALIDERAS MOT DEN FAKTISKA LISTAN. Modellen ombeds hålla sig till de
  // 43 kända typerna, men ett hittepå-id (felstavat eller påhittat) ska
  // behandlas som "vet inte" i stället för att krascha guiden med ett id som
  // inte finns.
  const känd = MACHINE_TYPES.some(t => t.id === d.typeId);
  if (!känd) return { ok: false, skäl: "okänt-id" };

  return {
    ok: true,
    typeId: d.typeId,
    säkerhet: ["hög", "medel", "låg"].includes(d.säkerhet) ? d.säkerhet : "låg",
    notering: String(d.notering || "").trim(),
  };
}
