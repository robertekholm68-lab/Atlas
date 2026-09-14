// MOTOR: läser en ZIP-fil i webbläsaren, utan bibliotek.
//
// VARFÖR ALLS. Garmins export ("Konto → Exportera dina data") kommer som en
// zip med hundratals filer. Utan det här måste man packa upp den på en dator,
// leta rätt på de filer som bär sömn och vilopuls, och mata in dem en i taget i
// telefonen. Med det här väljer man zip-filen.
//
// VARFÖR UTAN BIBLIOTEK. `DecompressionStream("deflate-raw")` finns i Chrome
// sedan 103 och i Node sedan 18 — alltså överallt appen körs. Ett bibliotek för
// det plattformen redan gör är 100 kB som ska laddas, uppdateras och granskas.
// Kontrollerat i den här sessionen: både Chromium och Node 22 klarar det.
//
// BARA DET SOM BEHÖVS. Vi läser den centrala katalogen i slutet av filen och
// packar upp de poster anroparen faktiskt vill ha. Krypterade zippar, zip64 och
// andra komprimeringsmetoder än deflate stöds inte — de finns inte i en
// Garmin-export, och att låtsas kunna dem vore att låta ett fel se ut som en
// tom fil.

const SIG_EOCD = 0x06054b50;        // End of central directory
const SIG_CEN = 0x02014b50;         // Central directory file header
const SIG_LOC = 0x04034b50;         // Local file header

/**
 * Filerna i en zip: namn, storlek och var innehållet ligger.
 *
 * Läser BAKIFRÅN, som formatet kräver: slutposten pekar ut katalogen, och
 * katalogen pekar ut varje fil. Att skanna framifrån efter lokala huvuden går
 * också, men blir fel för zippar där en fil raderats — katalogen är facit.
 */
export function zipPoster(buffert) {
  const dv = new DataView(buffert);
  const n = dv.byteLength;
  if (n < 22) return { poster: [], fel: "Filen är för liten för att vara en zip." };

  // Slutposten ligger sist, men kan ha upp till 64 kB kommentar efter sig.
  let eocd = -1;
  for (let i = n - 22; i >= Math.max(0, n - 22 - 65535); i--) {
    if (dv.getUint32(i, true) === SIG_EOCD) { eocd = i; break; }
  }
  if (eocd < 0) return { poster: [], fel: "Det här ser inte ut som en zip-fil." };

  const antal = dv.getUint16(eocd + 10, true);
  const katalogStart = dv.getUint32(eocd + 16, true);
  if (antal === 0xffff || katalogStart === 0xffffffff) {
    return { poster: [], fel: "Zip64 stöds inte — packa upp filen och välj filerna direkt." };
  }

  const poster = [];
  let p = katalogStart;
  const avkoda = new TextDecoder();
  for (let i = 0; i < antal && p + 46 <= n; i++) {
    if (dv.getUint32(p, true) !== SIG_CEN) break;
    const metod = dv.getUint16(p + 10, true);
    const packad = dv.getUint32(p + 20, true);
    const storlek = dv.getUint32(p + 24, true);
    const namnLängd = dv.getUint16(p + 28, true);
    const extraLängd = dv.getUint16(p + 30, true);
    const kommentarLängd = dv.getUint16(p + 32, true);
    const lokal = dv.getUint32(p + 42, true);
    const namn = avkoda.decode(new Uint8Array(buffert, p + 46, namnLängd));
    // Kataloger har storlek 0 och slutar på "/" — de bär inget innehåll.
    if (!namn.endsWith("/")) poster.push({ namn, metod, packad, storlek, lokal });
    p += 46 + namnLängd + extraLängd + kommentarLängd;
  }
  return { poster, fel: poster.length ? null : "Zip-filen innehåller inga filer." };
}

/**
 * Packar upp EN post till text.
 *
 * Det lokala huvudet läses om, för dess namn- och extrafält har andra längder
 * än katalogens — hoppar man över det landar man mitt i filnamnet i stället för
 * i datan. Det är den klassiska buggen i zip-läsare, och den ger sopor som ser
 * ut som innehåll.
 */
export async function zipLäsText(buffert, post) {
  const dv = new DataView(buffert);
  if (dv.getUint32(post.lokal, true) !== SIG_LOC) throw new Error("trasigt lokalt huvud");
  const namnLängd = dv.getUint16(post.lokal + 26, true);
  const extraLängd = dv.getUint16(post.lokal + 28, true);
  const start = post.lokal + 30 + namnLängd + extraLängd;
  const rå = new Uint8Array(buffert, start, post.packad);

  if (post.metod === 0) return new TextDecoder().decode(rå);          // lagrad
  if (post.metod !== 8) throw new Error(`komprimering ${post.metod} stöds inte`);

  // Rakt på DecompressionStream, utan Blob och Response. De två finns inte i
  // jsdom, och ett beroende som gör koden oprövbar är ett dåligt beroende —
  // strömmen är dessutom det enda som behövs.
  const ds = new DecompressionStream("deflate-raw");
  const skrivare = ds.writable.getWriter();
  skrivare.write(rå);
  skrivare.close();
  const läsare = ds.readable.getReader();
  const bitar = [];
  let längd = 0;
  for (;;) {
    const { done, value } = await läsare.read();
    if (done) break;
    bitar.push(value); längd += value.length;
  }
  const ut = new Uint8Array(längd);
  let i = 0;
  for (const b of bitar) { ut.set(b, i); i += b.length; }
  return new TextDecoder().decode(ut);
}

/** Ser filens första bytes ut som en zip? "PK\3\4" är signaturen. */
export function ärZip(buffert) {
  if (!buffert || buffert.byteLength < 4) return false;
  const dv = new DataView(buffert);
  const sig = dv.getUint32(0, true);
  // Tom zip börjar med den centrala katalogens signatur i stället.
  return sig === SIG_LOC || sig === SIG_CEN || sig === SIG_EOCD;
}
