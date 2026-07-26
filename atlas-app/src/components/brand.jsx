import { useState } from "react";
// Askr varumärkesgrafik — kantigt A-märke och startsidans tre ikoner.
//
// Ritas som vektor i stället för bild: skalar skarpt på alla skärmar, kostar
// ingenting i filstorlek, och färgen kan följa temat i stället för att vara
// inbränd i en PNG.

// Volt hämtas ur designsystemet i stället för att skrivas av. Den här filen
// hade "#D4FF3F" — en HELT annan, gulare grön än guidens Volt #D4FF00 — och
// samma felskrivning hade hunnit spridas till fyra andra filer. Att kopiera en
// hex är hur en palett glider isär; därför importeras den.
import { C } from "../atlas2/design.js";
// Importerade (inte URL-byggda) så att Vite kan bädda in dem i bygget. Skrevs
// de som `new URL(..., document.baseURI)` blev de systerfiler som en fristående
// HTML-fil aldrig hittade — och headern visade textfallbacken i stället för
// märket. Se assetsInlineLimit i vite-konfigurationerna.
import ordmarke from "../assets/brand/askr-wordmark.webp";
import symbol from "../assets/brand/askr-symbol.webp";
import primarlogo from "../assets/brand/askr-logo.webp";
const LIME = C.lime;

/**
 * A-märket: ett kantigt "A" byggt av två sneda ben och en tvärslå, där högra
 * benet är avhugget upptill så formen läser som ett berg. Samma silhuett som
 * i skissen.
 */
export function AtlasMark({ size = 34, color = LIME, style }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={style} aria-hidden focusable="false">
      {/* vänstra benet */}
      <path d="M8 96 L44 4 L60 4 L24 96 Z" fill={color} />
      {/* högra benet, kortare upptill */}
      <path d="M92 96 L66 30 L50 30 L76 96 Z" fill={color} />
      {/* tvärslån */}
      <path d="M34 62 L70 62 L64 76 L28 76 Z" fill={color} />
    </svg>
  );
}

/**
 * VARUMÄRKESFILERNA, enligt ASKR Brand & UI Style Guide v1.1.
 *
 * GRÄNSEN FÖR VAD SOM BÄDDAS IN: identitet bäddas in i bygget, innehåll ligger
 * utanför. Ordmärke, primärlogotyp, symbol och kroppsfigurerna ÄR appen och ska
 * aldrig hinna blinka förbi som textfallback. Fotografier och receptbilder är
 * innehåll — de får ladda i efterhand och saknas de degraderar vyn snyggt.
 *
 * Det som gällde förut var fel på två sätt. Vektorfallbacken ritade ett kantigt
 * "A" — ATLAS-erans märke, från innan produkten hette Askr. Och rasterfilen som
 * användes som primär logotyp var METALLSYMBOLEN, som guiden uttryckligen bara
 * tillåter dekorativt. Båda tillgängliga märkena var alltså fel märke.
 *
 * Nu används guidens egna varianter:
 *   · Ordmärke horisontellt  → headers och sidfötter (den vanligaste ytan)
 *   · Primär mörk            → startsidan, där det finns yta för hela låset
 *   · Symbol                 → app-ikon och dekor, aldrig som primär logotyp
 *
 * Filerna bär tagline och bokstäver som DESIGNAD grafik. Därför sätts ingen
 * Archivo-text bredvid dem längre — det hade visat namnet två gånger.
 *
 * Storleken anges som HÖJD. Bredden följer av bildens förhållande, så låset
 * aldrig skevas — guiden: logotypen roteras, skevas eller färgläggs aldrig om.
 */
function Märke({ fil, höjd, förhållande, alt = "", style }) {
  const [ok, setOk] = useState(true);
  // `fil` är antingen en importerad (inbäddad) resurs eller ett filnamn som
  // slås upp mot sidans adress — den stora primärlogotypen ligger kvar externt
  // eftersom den bara visas en gång, under onboarding.
  const src = /^(data:|https?:|blob:)/.test(fil) ? fil : new URL(fil, document.baseURI).href;
  // Faller tillbaka på ren text om filen saknas (offline, trasig deploy).
  // Aldrig tillbaka på det gamla A-märket — hellre bara namnet än fel märke.
  if (!ok) return (
    <span style={{ fontFamily: "'Archivo',sans-serif", fontStretch: "125%", fontWeight: 800,
      fontSize: höjd * 0.7, letterSpacing: "0.06em", color: "#F5F5F5", lineHeight: 1, ...style }}>ASKR</span>
  );
  return (
    <img src={src} alt={alt} onError={() => setOk(false)}
      style={{ height: höjd, width: höjd * förhållande, display: "block", flex: "none", ...style }} />
  );
}

/** Ordmärket, horisontellt. Guidens variant för headers och sidfötter. */
export function AskrWordmark({ höjd = 30, style }) {
  return <Märke fil={ordmarke} höjd={höjd} förhållande={5.0} alt="Askr" style={style} />;
}

/** Primär mörk — hela låset med symbol, ordmärke och tagline. */
export function AskrLogo({ höjd = 150, style }) {
  return <Märke fil={primarlogo} höjd={höjd} förhållande={1.0} alt="Askr" style={style} />;
}

/** Symbolen ensam. Dekorativt bruk och app-ikon — aldrig som primär logotyp. */
export function AskrSymbol({ höjd = 40, style }) {
  return <Märke fil={symbol} höjd={höjd} förhållande={0.86} style={style} />;
}

/**
 * Bakåtkompatibel omslagning: mobilkompanjonen och äldre anrop skickar `size`
 * och `tagline`. Taglinen bor numera i bildfilen, så flaggan ignoreras.
 * Nya vyer bör anropa AskrWordmark/AskrLogo direkt.
 */
export function AtlasLogo({ size = 34, hfont, style }) {
  return <AskrWordmark höjd={size * 1.15} style={style} />;
}

/**
 * Startsidans tre ikoner. Linjer, aldrig fyllda ytor — utom där limen ska peka
 * på det ikonen faktiskt handlar om (belastade muskler, den höga stapeln,
 * stjärnan i skölden).
 */
export function FeatureIcon({ name, size = 40, color = "#FFFFFF", accent = LIME }) {
  const p = { fill: "none", stroke: color, strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };

  if (name === "body") {
    // Kroppssiluett med två markerade muskelgrupper — appens kärna i miniatyr.
    return (
      <svg viewBox="0 0 48 64" width={size} height={size * 1.33} aria-hidden focusable="false">
        <circle cx="24" cy="7" r="5" {...p} />
        <path d="M24 12 v6 M14 20 h20 M14 20 c-3 0-5 2-5 5 v10 M34 20 c3 0 5 2 5 5 v10" {...p} />
        <path d="M16 20 v14 h16 V20" {...p} />
        <path d="M18 34 l-1 16 M30 34 l1 16 M17 50 v10 M31 50 v10" {...p} />
        {/* belastade grupper i lime */}
        <path d="M14 21 c-3 0-5 2-5 5 v8" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        <path d="M34 21 c3 0 5 2 5 5 v8" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        <path d="M18 35 l-1 14" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        <path d="M30 35 l1 14" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "bars") {
    // Tre staplar där den högsta är lime: veckovolym som växer mot sitt tak.
    return (
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden focusable="false">
        <rect x="5" y="30" width="10" height="14" rx="2" {...p} />
        <rect x="19" y="21" width="10" height="23" rx="2" {...p} />
        <rect x="33" y="8" width="10" height="36" rx="2" fill="none" stroke={accent} strokeWidth="2.2" strokeLinejoin="round" />
      </svg>
    );
  }

  // sköld med stjärna: ärliga siffror
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden focusable="false">
      <path d="M24 4 L41 11 v13 c0 11-7 17-17 20 -10-3-17-9-17-20 V11 Z" {...p} />
      <path d="M24 16 l2.6 5.6 6 .8 -4.4 4.3 1.1 6.1 -5.3-2.9 -5.3 2.9 1.1-6.1 -4.4-4.3 6-.8 Z"
        fill="none" stroke={accent} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
