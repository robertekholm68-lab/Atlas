// Sport-ikonerna (94 SVG:er, ~2,4 MB) ligger INTE i HTML-bygget.
//
// Bakgrund: de låg tidigare inbakade i sportLibrary.js, vilket gjorde webbygget till
// 4,25 MB JavaScript som skulle tolkas vid start. Det räckte för att Chrome skulle
// döda fliken på en vanlig Android-telefon. Ikonerna är ren dekoration och behövs
// inte förrän man faktiskt tittar på en sportvy.
//
// Samma mönster som receptbilderna: filen ligger bredvid HTML:en, hämtas en gång och
// cachas av service workern. Tills den är inne visar SportIcon sin emoji-fallback,
// så ingenting ser trasigt ut under tiden.

let ikoner = null;          // laddad karta id -> svg-markup
let hämtning = null;        // pågående löfte, så vi hämtar bara en gång
const lyssnare = new Set();

/** Ikonerna om de är inne, annars null. Synkron — anropas under render. */
export function sportIcons() { return ikoner; }

/** Startar hämtningen om den inte redan är gjord eller pågår. */
export function ensureSportIcons() {
  if (ikoner || hämtning) return hämtning || Promise.resolve(ikoner);
  if (typeof fetch === "undefined") return Promise.resolve(null);

  const url = new URL("sport-icons.json", document.baseURI).href;
  hämtning = fetch(url)
    .then(r => (r.ok ? r.json() : null))
    .then(data => {
      ikoner = data && typeof data === "object" ? data : {};
      lyssnare.forEach(fn => { try { fn(); } catch (e) {} });
      return ikoner;
    })
    .catch(() => {
      // Nätet kan saknas. Då blir det emoji, och det är helt i sin ordning.
      ikoner = {};
      lyssnare.forEach(fn => { try { fn(); } catch (e) {} });
      return ikoner;
    });
  return hämtning;
}

/** Prenumerera på "ikonerna kom in". Returnerar en avregistreringsfunktion. */
export function onSportIcons(fn) {
  lyssnare.add(fn);
  return () => lyssnare.delete(fn);
}

// Endast för tester: nollställ modulens tillstånd.
export function __resetSportIcons() { ikoner = null; hämtning = null; lyssnare.clear(); }
