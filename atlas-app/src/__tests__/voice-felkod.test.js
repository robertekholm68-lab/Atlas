// Askr — taligenkänningens felmeddelanden.
//
// FYND FRÅN RIKTIG ANVÄNDNING (skärmbild, 2026-07-27 23:30): mikrofonknappen
// slocknade INNAN användaren hunnit säga något, och appen skrev
//
//     "Det gick inte att tolka ljudet."
//
// Det var fel på två sätt. Det lät som att man sagt något otydligt — men
// ingenting hade spelats in. Och felkoden, det enda som hade förklarat varför,
// kastades bort innan den nådde skärmen.
//
// Tredje gången samma feltyp i samma app på ett dygn: en gren som inte vet vad
// som är fel men ändå uttalar sig bestämt. Först behörigheten, sedan "stäng
// appar som spelar in", nu ljudet. Varje gång skickades användaren åt fel håll.

import { describe, it, expect } from "vitest";
import { felText } from "../engines/voice.js";

describe("felkoden når alltid skärmen", () => {
  it("en okänd kod skrivs ut i klartext", () => {
    // Utan den här raden går felet inte att laga — det är precis vad som hände.
    expect(felText("audio-hardware-glitch")).toContain("audio-hardware-glitch");
  });

  it("och den okända texten påstår INTE att ljudet var otolkbart", () => {
    const t = felText("något-nytt");
    expect(t).not.toMatch(/gick inte att tolka ljudet/i);
    // Den ska tvärtom öppna för att inget spelades in.
    expect(t).toMatch(/inte säkert att ljudet ens spelades in/i);
  });
});

describe("de fel som betyder att mikrofonen aldrig öppnades", () => {
  it("audio-capture skyller inte på ljudet", () => {
    const t = felText("audio-capture");
    expect(t).toMatch(/ingenting spelades in/i);
    expect(t).not.toMatch(/tolka ljudet/i);
  });

  it("audio-capture pekar på den inbäddade webbvyn", () => {
    // Samma vägg som app-skalet gick in i: en länk öppnad inifrån en annan app
    // ger ofta ingen mikrofon.
    expect(felText("audio-capture")).toMatch(/webbläsaren/i);
  });

  it("aborted förklarar att inspelningen aldrig hann börja", () => {
    expect(felText("aborted")).toMatch(/avbröts/i);
    expect(felText("aborted")).toMatch(/webbläsaren/i);
  });
});

describe("de kända felen behåller sina råd", () => {
  it("nekad behörighet pekar på inställningarna", () => {
    expect(felText("not-allowed")).toMatch(/blockerad/i);
    expect(felText("service-not-allowed")).toMatch(/blockerad/i);
  });

  it("no-speech är kort och sant", () => {
    expect(felText("no-speech")).toBe("Hörde ingenting.");
  });

  it("network säger att det behövs nät", () => {
    expect(felText("network")).toMatch(/nät/i);
  });

  it("språk som inte stöds säger just det", () => {
    expect(felText("language-not-supported")).toMatch(/svenska/i);
  });
});

describe("meddelandena är gemensamma för set och diktering", () => {
  it("samma kod ger samma text oavsett var den uppstod", () => {
    // Grenarna låg dubblerade och hade redan hunnit glida isär: dikteringens
    // network-text saknade meningen om lokal tolkning. Två uppsättningar regler
    // för samma sak blir förr eller senare två olika sanningar.
    const koder = ["not-allowed", "no-speech", "network", "audio-capture", "aborted", "okänt"];
    koder.forEach(k => expect(typeof felText(k)).toBe("string"));
    expect(felText("network").length).toBeGreaterThan(20);
  });
});
