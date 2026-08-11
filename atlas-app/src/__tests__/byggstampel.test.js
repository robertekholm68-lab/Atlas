// Byggstämpeln som visas i appen.
//
// VARFÖR TIDSZONEN ÄR HELA POÄNGEN: `__ATLAS_BUILD__` sätts i vite-configerna
// med `toISOString()` och är alltså UTC. Skrivs siffrorna ut rakt av — vilket
// den första versionen av versionsvisningen i 2.0 gjorde — står det 06:53 för
// en användare vars klocka säger 08:53.
//
// Det är förödande just här. Versionen finns till för att man ska kunna avgöra
// OM en ny version landat, och texten bredvid säger "stämmer inte tiden: stäng
// appen helt och öppna igen". En stämpel som ser två timmar gammal ut får alltså
// någon att jaga ett problem som inte finns, på en app som är helt uppdaterad.
//
// TZ sätts före allt annat: containern kör UTC, och där hade även den felaktiga
// varianten sett korrekt ut. Ett test som bara är grönt på rätt maskin skyddar
// ingenting.
process.env.TZ = "Europe/Stockholm";

import { describe, it, expect } from "vitest";
import { formatBuildTime } from "../engines/index.js";

describe("byggstämpeln tolkas som UTC och visas lokalt", () => {
  it("sommartid: 06:53 UTC blir 08:53 i Sverige", () => {
    // Exakt fallet från bygget 2026-08-11. Den naiva slice-varianten hade
    // svarat "2026-08-11 06:53" och sett en timme för gammal ut.
    expect(formatBuildTime("202608110653")).toBe("2026-08-11 08:53");
  });

  it("vintertid: en timmes skillnad i stället för två", () => {
    expect(formatBuildTime("202601152054")).toBe("2026-01-15 21:54");
  });

  it("dygnsgränsen flyttas med — inte bara klockslaget", () => {
    // 22:30 UTC den 10:e är 00:30 den 11:e i Sverige på sommaren. En slice av
    // siffrorna hade visat fel DATUM, inte bara fel tid.
    expect(formatBuildTime("202608102230")).toBe("2026-08-11 00:30");
  });

  it("den naiva slice-varianten hade gett ett ANNAT svar", () => {
    // Bevisar att skillnaden är verklig och inte kosmetisk — utan det här kan
    // någon i god tro "förenkla" tillbaka till strängklippning.
    const s = "202608110653";
    const naiv = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)} ${s.slice(8, 10)}:${s.slice(10, 12)}`;
    expect(formatBuildTime(s)).not.toBe(naiv);
  });
});

describe("och den ljuger inte när stämpeln saknas", () => {
  it("tom stämpel blir 'okänt', inte ett påhittat datum", () => {
    expect(formatBuildTime("")).toBe("okänt");
    expect(formatBuildTime(undefined)).toBe("okänt");
    expect(formatBuildTime(null)).toBe("okänt");
  });

  it("en stämpel i fel form skrivs ut som den är", () => {
    // Hellre ett obegripligt tal än ett datum vi hittat på ur skräp.
    expect(formatBuildTime("inte-en-stämpel")).toBe("inte-en-stämpel");
    expect(formatBuildTime("2026081")).toBe("2026081");
  });
});
