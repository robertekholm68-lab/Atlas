// MOTOR: pulsband över Bluetooth (BLE Heart Rate Service, 0x180D).
// Fungerar med standardband — Polar, Garmin, Wahoo, Coospo m.fl. — eftersom de alla
// sänder över samma standardprofil.
// ÄRLIG BEGRÄNSNING: Web Bluetooth finns i Chrome på Android men INTE i iOS Safari;
// Apple har avstått från att implementera det. På iPhone går det alltså inte alls
// från en webbapp, och appen säger det rakt ut i stället för att låtsas leta.

export function bluetoothSupported() {
  try { return typeof navigator !== "undefined" && !!navigator.bluetooth; } catch (e) { return false; }
}

// Tolkar en mätning enligt Heart Rate Measurement-formatet:
// första byten är flaggor, bit 0 anger om pulsen ligger i 8 eller 16 bitar.
export function parseHeartRate(dataView) {
  const flags = dataView.getUint8(0);
  const is16 = flags & 0x01;
  const bpm = is16 ? dataView.getUint16(1, true) : dataView.getUint8(1);
  return bpm > 0 && bpm < 250 ? bpm : null;
}

// Ansluter till ett band och rapporterar varje mätning. Returnerar en handle att koppla ner med.
export async function connectHeartRate({ onBpm, onDisconnect } = {}) {
  if (!bluetoothSupported()) throw new Error("unsupported");
  const device = await navigator.bluetooth.requestDevice({ filters: [{ services: ["heart_rate"] }] });
  const server = await device.gatt.connect();
  const service = await server.getPrimaryService("heart_rate");
  const ch = await service.getCharacteristic("heart_rate_measurement");
  const handler = e => { const bpm = parseHeartRate(e.target.value); if (bpm && onBpm) onBpm(bpm); };
  ch.addEventListener("characteristicvaluechanged", handler);
  await ch.startNotifications();
  const onGattDisc = () => { if (onDisconnect) onDisconnect(); };
  device.addEventListener("gattserverdisconnected", onGattDisc);
  return {
    name: device.name || "Pulsband",
    disconnect: async () => {
      try { ch.removeEventListener("characteristicvaluechanged", handler); await ch.stopNotifications(); } catch (e) { }
      try { device.removeEventListener("gattserverdisconnected", onGattDisc); } catch (e) { }
      try { if (device.gatt.connected) device.gatt.disconnect(); } catch (e) { }
    },
  };
}

// Samlar puls under ett pass och ger snitt/max samt tid i zon.
export function hrSummary(samples, { age = null } = {}) {
  const s = (samples || []).filter(x => x > 0);
  if (!s.length) return null;
  const avg = Math.round(s.reduce((a, b) => a + b, 0) / s.length);
  const max = Math.max(...s);
  let zones = null, pctMax = null;
  if (typeof age === "number" && age > 0) {
    const hrMax = 220 - age;                        // enkel åldersformel; individuell variation är stor
    pctMax = Math.round(avg / hrMax * 100);
    const z = { latt: 0, medel: 0, hard: 0 };
    s.forEach(b => { const p = b / hrMax; if (p < 0.7) z.latt++; else if (p < 0.85) z.medel++; else z.hard++; });
    const n = s.length;
    zones = { latt: Math.round(z.latt / n * 100), medel: Math.round(z.medel / n * 100), hard: Math.round(z.hard / n * 100) };
  }
  return { avg, max, samples: s.length, pctMax, zones };
}

// Intensitet ur puls när åldern är känd — mer träffsäkert än att gissa ur tempo.
export function hrIntensity(avgBpm, age) {
  if (!avgBpm || typeof age !== "number" || age <= 0) return null;
  const p = avgBpm / (220 - age);
  return p >= 0.85 ? "Hård" : p >= 0.7 ? "Medel" : "Lätt";
}

// ── ASKR 2.0 ────────────────────────────────────────────────────────────────

import { platformKind, isAndroidWebView } from "./platform.js";

/**
 * Går det att koppla ett band HÄR — och om inte, varför.
 *
 * Skälet är hela poängen. "Bluetooth saknas" är sant men obrukbart: den som
 * står på gymmet med ett band på bröstet behöver veta om det är telefonen,
 * webbläsaren eller appens skal som säger nej, och vad som går att göra åt det.
 *
 *   iOS            Apple har inte implementerat Web Bluetooth. Inget att göra.
 *   Android/WebView Skalet saknar det Chrome har. Öppna i Chrome tills en
 *                  brygga finns i skalet — samma sorts brygga som mikrofonen.
 *   annat          Webbläsaren saknar det. Chrome på Android eller desktop.
 */
export function bluetoothStatus() {
  if (bluetoothSupported()) return { ok: true, skäl: null };
  const os = platformKind();
  if (os === "ios") return { ok: false, skäl: "Apple har inte implementerat Web Bluetooth, så pulsband går inte att koppla på iPhone." };
  if (isAndroidWebView()) return { ok: false, skäl: "Appens skal saknar Bluetooth. Öppna Askr i Chrome för att koppla bandet." };
  return { ok: false, skäl: "Den här webbläsaren saknar Web Bluetooth. Chrome på Android eller dator har det." };
}

/**
 * Det som sparas PÅ PASSET av en pulsmätning — eller ingenting.
 *
 * Fälten är samma som mobilkompanjonen skrivit sedan 2025 (`avgHr`, `maxHr`),
 * så importerad historik och nya pass ser likadana ut. Zonerna och antalet
 * prover är nya och additiva. Utan ett enda prov returneras ett tomt objekt:
 * ett pass utan band ska inte bära `avgHr: null` som ser ut som ett fält
 * någon glömt fylla i.
 *
 * Råproverna sparas INTE. En timme ger 3 600 tal per pass; snitt, max och
 * zonfördelning är det som går att läsa efteråt, och de räknas här.
 */
export function sessionPulsFält(samples, age = null) {
  const s = hrSummary(samples, { age: typeof age === "number" && age > 0 ? age : null });
  if (!s) return {};
  return {
    avgHr: s.avg,
    maxHr: s.max,
    hrSamples: s.samples,
    ...(s.zones ? { hrZones: s.zones } : {}),
  };
}
