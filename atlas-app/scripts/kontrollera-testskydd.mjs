// Kontrollerar att testskyddet inte KRYMPER tyst. Körs i CI.
//
// VARFÖR: en grön svit bevisar att det som testas fungerar. Den säger
// ingenting om vad som slutat testas. Två gånger har regressionsskydd för
// buggar som en användare faktiskt hittat raderats i en omstrukturering —
// och båda gångerna var sviten grön, eftersom de borttagna fallen inte fanns
// kvar för att bli röda.
//
// Det går inte att upptäcka i ett testresultat. Därför räknas testfallen och
// jämförs mot ett golv som ligger i repot.
//
// KONTROLLEN FÖRBJUDER INGENTING. Tester ska kunna tas bort — konsolidering är
// sunt. Den gör bara borttagningen SYNLIG: golvet måste sänkas i samma commit,
// och då står det i diffen med ett skäl. Det är skillnaden mellan ett medvetet
// beslut och ett som ingen märkte.

import { readdirSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";

const KATALOG = resolve("src/__tests__");
const GOLV = resolve("scripts/testgolv.json");

let fall = 0;
const perFil = {};
for (const f of readdirSync(KATALOG).filter(n => /\.test\.(js|jsx)$/.test(n))) {
  const src = readFileSync(resolve(KATALOG, f), "utf8");
  // Räknar deklarerade testfall. Trubbigt med flit: det ska vara omöjligt att
  // missförstå vad talet betyder, och en statisk räkning kan inte påverkas av
  // att ett test hoppas över vid körning.
  const n = (src.match(/(^|\s)it(\.\w+)?\s*\(/g) || []).length;
  perFil[f] = n;
  fall += n;
}

const golv = existsSync(GOLV) ? JSON.parse(readFileSync(GOLV, "utf8")) : { testfall: 0, filer: 0 };
const filer = Object.keys(perFil).length;

console.log(`Testskydd: ${fall} testfall i ${filer} filer (golv: ${golv.testfall} i ${golv.filer}).`);

const brister = [];
if (fall < golv.testfall) brister.push(`${golv.testfall - fall} testfall färre än golvet`);
if (filer < golv.filer) brister.push(`${golv.filer - filer} testfil(er) färre än golvet`);

if (brister.length) {
  console.error(`\nFEL: testskyddet har krympt — ${brister.join(", ")}.\n`);
  console.error("Är borttagningen avsiktlig? Sänk då golvet i scripts/testgolv.json");
  console.error("i SAMMA commit och skriv varför. Poängen är inte att förbjuda,");
  console.error("utan att en minskning aldrig ska kunna passera obemärkt.\n");
  process.exit(1);
}

if (fall > golv.testfall || filer > golv.filer) {
  console.log(`Golvet kan höjas till ${fall} i ${filer}.`);
}
