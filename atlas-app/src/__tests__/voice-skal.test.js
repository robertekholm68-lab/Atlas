// Askr — röst i app-skalet kontra webbläsaren.
//
// Bevis från telefon, i tre lager:
//   1. Androids inställningar: behörigheten BEVILJAD för Askr.
//   2. Ingen annan app igång.
//   3. Androids EGEN mikrofonhistorik listade Messenger och Samsung Browser —
//      men inte Askr, trots att knappen just tryckts.
//
// Inspelningen nådde alltså aldrig operativsystemet. NotReadableError var
// WebViewens sätt att säga att den inte fick öppna hårdvaran, inte att någon
// annan höll den. Att då säga "stäng appar som spelar in" skickar användaren
// efter något som inte finns.

import { describe, it, expect, afterEach } from "vitest";
import { micReady } from "../engines/voice.js";
import { isAndroidWebView } from "../engines/platform.js";

const UA_SKAL = "Mozilla/5.0 (Linux; Android 14; SM-S911B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36";
const UA_CHROME = "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const UA_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1";

const miljö = (ua, felnamn) => {
  const err = new Error("test"); err.name = felnamn;
  Object.defineProperty(globalThis, "navigator", {
    value: { userAgent: ua, mediaDevices: { getUserMedia: async () => { throw err; } } },
    configurable: true, writable: true,
  });
};

// Den ÄKTA navigator läggs tillbaka, inte en tom stubbe. Att lämna kvar
// { userAgent: "" } är samma läcka som rättades i voice-mikfel.test.js: allt som
// körs efter det här får en navigator utan mediaDevices, och sviten har redan
// bränt sig på tillstånd som rinner mellan testfall.
const ÄKTA = Object.getOwnPropertyDescriptor(globalThis, "navigator");

afterEach(() => {
  if (ÄKTA) Object.defineProperty(globalThis, "navigator", ÄKTA);
  else delete globalThis.navigator;
});

describe("skalet känns igen på Androids egen flagga", () => {
  it('"; wv)" i user agent betyder WebView', () => {
    Object.defineProperty(globalThis, "navigator", { value: { userAgent: UA_SKAL }, configurable: true, writable: true });
    expect(isAndroidWebView()).toBe(true);
  });

  it("Chrome på Android är INTE ett skal", () => {
    Object.defineProperty(globalThis, "navigator", { value: { userAgent: UA_CHROME }, configurable: true, writable: true });
    expect(isAndroidWebView()).toBe(false);
  });

  it("iPhone är inte heller det", () => {
    Object.defineProperty(globalThis, "navigator", { value: { userAgent: UA_IPHONE }, configurable: true, writable: true });
    expect(isAndroidWebView()).toBe(false);
  });
});

describe("samma fel, olika besked", () => {
  it("i SKALET erkänns att det inte går att lösa inifrån appen", async () => {
    miljö(UA_SKAL, "NotReadableError");
    const r = await micReady();
    expect(r.note).toMatch(/app-skalet/i);
    expect(r.note).toMatch(/öppna Askr i webbläsaren/i);
    // Det gamla rådet skickade efter en app som inte fanns.
    expect(r.note).not.toMatch(/stäng appar som spelar in/i);
    expect(r.note).toContain("NotReadableError");
  });

  it("i WEBBLÄSAREN är det fortfarande rimligt att mikrofonen är upptagen", async () => {
    miljö(UA_CHROME, "NotReadableError");
    const r = await micReady();
    expect(r.note).toMatch(/upptagen av något annat/i);
    expect(r.note).not.toMatch(/app-skalet/i);
  });

  it("nekad behörighet påverkas inte av var vi kör", async () => {
    miljö(UA_SKAL, "NotAllowedError");
    expect((await micReady()).note).toMatch(/inte tillåten/i);
  });

  it("felnamnet följer med även i skalet — det är ledtråden", async () => {
    miljö(UA_SKAL, "NotReadableError");
    expect((await micReady()).namn).toBe("NotReadableError");
  });
});
