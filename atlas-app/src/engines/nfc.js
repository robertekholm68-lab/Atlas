// MOTOR: NFC-taggar. Tanken är en tagg på varje maskin i gymmet — håll telefonen mot
// den så vet appen direkt vilken maskin det är, utan att leta i en lista.
// ÄRLIG BEGRÄNSNING: Web NFC finns bara i Chrome på Android. Apple har avstått från att
// implementera det, så på iPhone fungerar det inte alls från en webbapp.

const PREFIX = "atlas:";                    // taggens innehåll: "atlas:machine:<id>"

export function nfcSupported() {
  try { return typeof window !== "undefined" && "NDEFReader" in window; } catch (e) { return false; }
}

export function encodeTag(kind, id) { return `${PREFIX}${kind}:${id}`; }

// Tolkar en tagg. Okända format ignoreras hellre än gissas på.
export function decodeTag(text) {
  if (typeof text !== "string" || !text.startsWith(PREFIX)) return null;
  const rest = text.slice(PREFIX.length);
  const i = rest.indexOf(":");
  if (i < 1) return null;
  const kind = rest.slice(0, i), id = rest.slice(i + 1);
  if (!id) return null;
  return { kind, id };
}

// Plockar ut första texten ur ett NDEF-meddelande.
export function readMessage(message) {
  for (const rec of (message && message.records) || []) {
    if (rec.recordType !== "text" && rec.recordType !== "url") continue;
    try {
      const dec = new TextDecoder(rec.encoding || "utf-8");
      const text = dec.decode(rec.data);
      const tag = decodeTag(text);
      if (tag) return tag;
    } catch (e) { }
  }
  return null;
}

// Startar avläsning. Returnerar en funktion som avbryter.
export async function scanTags({ onTag, onError } = {}) {
  if (!nfcSupported()) throw new Error("unsupported");
  const reader = new window.NDEFReader();
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  reader.onreading = e => { const tag = readMessage(e.message); if (tag && onTag) onTag(tag); else if (!tag && onError) onError("Taggen är inte en Askr-tagg."); };
  reader.onreadingerror = () => { if (onError) onError("Kunde inte läsa taggen — håll telefonen stilla mot den."); };
  await reader.scan(ctrl ? { signal: ctrl.signal } : undefined);
  return () => { try { if (ctrl) ctrl.abort(); } catch (e) { } };
}

// Programmerar en tom tagg med en maskin.
export async function writeTag(kind, id) {
  if (!nfcSupported()) throw new Error("unsupported");
  const reader = new window.NDEFReader();
  await reader.write({ records: [{ recordType: "text", data: encodeTag(kind, id) }] });
  return true;
}
