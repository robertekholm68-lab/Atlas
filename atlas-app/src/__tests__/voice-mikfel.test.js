// Askr — mikrofonens felmeddelanden.
//
// Fynd från telefon: Androids behörighet var BEVILJAD, men appen sa ändå
// "kan sakna mikrofonbehörighet — öppna den i webbläsaren i stället".
// Felet var något annat, och rådet pekade åt fel håll.
//
// Ett felmeddelande som skickar användaren till rätt inställning där allt redan
// är rätt är värre än ett som erkänner sin okunskap: hen letar, hittar inget,
// och slutar lita på appen.

import { describe, it, expect, vi, afterEach } from "vitest";
import { micReady } from "../engines/voice.js";

// navigator är skrivskyddad i miljön — definiera om egenskapen i stället.
const medFel = namn => {
  const err = new Error("test"); err.name = namn;
  Object.defineProperty(globalThis, "navigator", {
    value: { mediaDevices: { getUserMedia: async () => { throw err; } } },
    configurable: true, writable: true,
  });
};

afterEach(() => { vi.restoreAllMocks(); });

describe("micReady berättar vad den vet", () => {
  it("nekad behörighet pekar på inställningarna", async () => {
    medFel("NotAllowedError");
    const r = await micReady();
    expect(r.reason).toBe("nekad");
    expect(r.note).toMatch(/inte tillåten/i);
  });

  it("ingen mikrofon säger just det", async () => {
    medFel("NotFoundError");
    expect((await micReady()).reason).toBe("ingen-mikrofon");
  });

  it("upptagen mikrofon får sitt eget råd", async () => {
    medFel("NotReadableError");
    expect((await micReady()).note).toMatch(/upptagen/i);
  });

  it("ETT OKÄNT FEL GISSAR INTE PÅ BEHÖRIGHETEN", async () => {
    // Det var precis det som hände på telefonen.
    medFel("NotSupportedError");
    const r = await micReady();
    expect(r.note).not.toMatch(/behörighet.*öppna den i webbläsaren/i);
    expect(r.note).toMatch(/NotSupportedError/);
    expect(r.namn).toBe("NotSupportedError");
  });

  it("felnamnet följer med så att felet går att laga", async () => {
    medFel("AbortError");
    const r = await micReady();
    expect(r.namn).toBe("AbortError");
    expect(r.note).toContain("AbortError");
  });
});
