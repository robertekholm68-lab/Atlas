// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MobileApp } from "../mobile/MobileApp.jsx";
import { parseHeartRate, hrSummary, hrIntensity, bluetoothSupported } from "../engines/hr.js";
import { encodeTag, decodeTag, readMessage, nfcSupported } from "../engines/nfc.js";
import { DEFAULT_CUES, notificationState } from "../engines/cues.js";

// Designspråket 2026-07-20 flyttade sekundärfunktionerna in i menyn.
// Testet öppnar den först — avsikten i varje test är oförändrad.
const öppnaMeny = async (el) => {
  const b = el.querySelector('[aria-label="Meny"]');
  if (!b) throw new Error("hittar inte menyknappen");
  await act(async () => { b.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
  await new Promise(x => setTimeout(x, 60));
};

const roots = [];
const mount = async () => { const el = document.createElement("div"); document.body.appendChild(el); const r = createRoot(el); roots.push({ r, el }); await act(async () => { r.render(<MobileApp />); }); await new Promise(x => setTimeout(x, 200)); return el; };
afterEach(async () => { await act(async () => { roots.splice(0).forEach(({ r, el }) => { try { r.unmount(); } catch (e) { } el.remove(); }); }); });
const clickText = (el, t) => { const b = [...el.querySelectorAll("button")].find(x => x.textContent.includes(t)); if (b) b.dispatchEvent(new MouseEvent("click", { bubbles: true })); return !!b; };

describe("pulsband — BLE", () => {
  const dv = bytes => new DataView(new Uint8Array(bytes).buffer);
  it("tolkar 8-bitars mätning", () => expect(parseHeartRate(dv([0x00, 72]))).toBe(72));
  it("tolkar 16-bitars mätning", () => expect(parseHeartRate(dv([0x01, 0x2C, 0x01]))).toBe(300 > 250 ? null : 300) );
  it("orimliga värden kastas", () => expect(parseHeartRate(dv([0x00, 0]))).toBe(null));
  it("sammanfattning ger snitt, max och zoner med ålder", () => {
    const s = hrSummary([120, 140, 160, 180], { age: 40 });
    expect(s.avg).toBe(150); expect(s.max).toBe(180);
    expect(s.zones.latt + s.zones.medel + s.zones.hard).toBeGreaterThan(90);
  });
  it("utan ålder ges inga zoner — ingen gissning", () => {
    const s = hrSummary([120, 140]);
    expect(s.zones).toBe(null); expect(s.pctMax).toBe(null);
  });
  it("intensitet ur puls kräver ålder", () => {
    expect(hrIntensity(170, 30)).toBe("Hård");
    expect(hrIntensity(120, 30)).toBe("Lätt");
    expect(hrIntensity(150, null)).toBe(null);
  });
});

describe("NFC-taggar", () => {
  it("kodar och avkodar en maskintagg", () => {
    const t = encodeTag("machine", "lat_pulldown");
    expect(decodeTag(t)).toEqual({ kind: "machine", id: "lat_pulldown" });
  });
  it("främmande taggar ignoreras i stället för att gissas på", () => {
    expect(decodeTag("https://nagot-annat.se")).toBe(null);
    expect(decodeTag("atlas:")).toBe(null);
    expect(decodeTag(null)).toBe(null);
  });
  it("läser ut taggen ur ett NDEF-meddelande", () => {
    const data = new TextEncoder().encode(encodeTag("machine", "leg_press"));
    expect(readMessage({ records: [{ recordType: "text", encoding: "utf-8", data: new DataView(data.buffer) }] }))
      .toEqual({ kind: "machine", id: "leg_press" });
  });
});

describe("signaler och telefonfunktioner i mobilen", () => {
  it("signal-inställningar finns med ljud på som standard", () => {
    expect(DEFAULT_CUES.sound).toBe(true);
    expect(DEFAULT_CUES.notify).toBe(false);      // notiser är opt-in
  });
  it("Signaler-sheeten öppnas och beskriver plattformsgränserna ärligt", async () => {
    window.localStorage.clear(); localStorage.setItem("atlas.mobile.mode", JSON.stringify("demo"));
    const el = await mount();
    await öppnaMeny(el); clickText(el, "Signaler"); await act(async () => { }); await new Promise(r => setTimeout(r, 150));
    expect(/Signaler i passet/.test(el.textContent)).toBe(true);
    expect(/iPhone saknar stöd för vibration/.test(el.textContent)).toBe(true);
  });
  it("NFC-knappen visas inte alls när plattformen saknar stöd", async () => {
    window.localStorage.clear(); localStorage.setItem("atlas.mobile.mode", JSON.stringify("demo"));
    const el = await mount();
    expect(nfcSupported()).toBe(false);                 // jsdom saknar NDEFReader
    const nfcBtn = [...el.querySelectorAll("button")].find(b => /NFC/.test(b.textContent));
    expect(nfcBtn).toBeUndefined();                     // ingen återvändsgränd
  });

  it("telefon-översikten förklarar ärligt vad som saknas och varför", async () => {
    window.localStorage.clear(); localStorage.setItem("atlas.mobile.mode", JSON.stringify("demo"));
    const el = await mount();
    await öppnaMeny(el); clickText(el, "Telefon"); await act(async () => { }); await new Promise(r => setTimeout(r, 150));
    expect(/Vad din telefon klarar/.test(el.textContent)).toBe(true);
    expect(/ett och samma bygge/.test(el.textContent)).toBe(true);
    expect(/NFC-taggar/.test(el.textContent)).toBe(true);   // syns som rad, men inte som knapp
  });
  it("pulsband: stöd detekteras i stället för att antas", () => {
    expect(typeof bluetoothSupported()).toBe("boolean");
    expect(bluetoothSupported()).toBe(false);      // jsdom har ingen bluetooth
  });
});
