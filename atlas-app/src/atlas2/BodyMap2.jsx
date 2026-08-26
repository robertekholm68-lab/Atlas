// Askr 2.0 — muskelkartan, anatomisk och ren.
//
// Vad som ändrades mot nuvarande appen: den renderade figuren låg som en
// RASTERBILD med blå rymdgradient, gloria och en platta under fötterna
// inbakade i själva bilden — det gick alltså inte att färga bort. Här används
// i stället de anatomiska VEKTORFORMERNA som låg ovanpå den bilden, utan
// bilden. Resultatet: riktig muskelanatomi mot appens svärta, inget annat.
// 7 kB i stället för 750 kB base64.
//
// LAG: formerna bär samma muskel-id som förut och mappar mot 21-taxonomin.
//
// KÄND BEGRÄNSNING: figurens regioner är grövre än taxonomin på tre ställen —
// "deltoids" är EN form medan motorn skiljer på främre, sidre och bakre axel,
// och teres_major respektive rotator_cuff saknar egen post i taxonomin och
// visar därför latsens och bakre axelns återhämtning.
// En region färgas efter den av sina muskler som är MINST återhämtad, så en
// trött delmuskel aldrig göms bakom en utvilad. Riktig uppdelning kräver
// per-muskel-SVG som vi inte har.

import { useState } from "react";
import { C, recoveryColor } from "./design.js";
import REGIONS from "./body_regions.json";
import REGIONS_KVINNA from "./body_regions_female.json";
import figurFram from "../assets/brand/figur-fram.webp";
import figurBak from "../assets/brand/figur-bak.webp";
import kvinnaFram from "../assets/brand/figur-kvinna-fram.webp";
import kvinnaBak from "../assets/brand/figur-kvinna-bak.webp";

// TVÅ FIGURER, SAMMA REGION-ID:N.
//
// Profilen bär `sex` ("m"/"f"). Kvinnofiguren är byggd ur egna maskbilder
// (en bild per muskel i magenta, samma metod som mansfiguren) och har därför
// egna former och egna basbilder — men regionerna heter likadant, så MAP,
// NAMN, regionState och MuscleSheet är oförändrade. Saknas `sex` visas mannen,
// precis som förut.
//
// `lager` är hur färgen läggs på just den figuren. BÅDA figurerna är numera
// fotorealistiska, solbruna foton — och där gör multiply grönt till oliv och
// rött till "lite mörkare hud", varpå färgen slutar vara data. "color" byter
// nyansen men behåller fotots ljus och skugga, så muskeln behåller sin volym;
// det tunna "normal"-lagret finns för att färgen ska synas även över svarta
// kläder (sätet under shortsen), där color-blend inte kan lägga någon nyans
// alls. Värdena är mätta på skärmbild mot sex varianter.
//
// Mannen bar multiply 0.62 så länge han var en ljus illustration. Den figuren
// är utbytt; receptet följde med.
const FOTO = [["color", 0.9, 1], ["normal", 0.28, 0.4]];
const FIGURER = {
  m: { regions: REGIONS, bild: { front: figurFram, back: figurBak }, lager: FOTO },
  f: { regions: REGIONS_KVINNA, bild: { front: kvinnaFram, back: kvinnaBak }, lager: FOTO },
};
const figurFör = sex => FIGURER[sex] || FIGURER.m;

// Figurens region → muskel-id:n i 21-taxonomin.
const MAP = {
  pectoralis_major: ["pectoralis_major"],
  deltoids: ["deltoid_anterior", "deltoid_lateral", "deltoid_posterior"],
  biceps_brachii: ["biceps_brachii"],
  triceps_brachii: ["triceps_brachii"],
  forearms: ["forearms"],
  rectus_abdominis: ["rectus_abdominis"],
  obliques: ["obliques"],
  trapezius: ["trapezius"],
  quadriceps: ["quadriceps"],
  adductors: ["adductors"],
  tibialis_anterior: ["tibialis_anterior"],
  serratus_anterior: ["serratus_anterior"],
  latissimus_dorsi: ["latissimus_dorsi"],
  teres_major: ["latissimus_dorsi"],
  // Rotatorkuffen är fyra små muskler på skulderbladet och finns INTE i
  // 21-taxonomin — den är för liten att logga separat och tränas aldrig för
  // sig. Utan post här föll den på `MAP[id] || [id]` och sökte ett
  // muskel-id som inte finns, vilket gav null varje gång: regionen ritades,
  // gick att peka på, och färgades aldrig oavsett hur man tränat.
  //
  // Bakre deltoiden, inte alla tre: kuffen ligger bakom axeln och belastas av
  // samma drag och utåtrotationer. Samma resonemang som teres major ovan, som
  // visar latsens återhämtning eftersom den arbetar med den.
  rotator_cuff: ["deltoid_posterior"],
  erector_spinae: ["erector_spinae"],
  gluteals: ["gluteals"],
  hamstrings: ["hamstrings"],
  calves: ["calves"],
};

const NAMN = {
  pectoralis_major: "Bröst", deltoids: "Axlar", biceps_brachii: "Biceps",
  triceps_brachii: "Triceps", forearms: "Underarmar", rectus_abdominis: "Mage",
  obliques: "Sneda bukmuskler", trapezius: "Kappmuskel", quadriceps: "Framsida lår",
  adductors: "Insida lår", tibialis_anterior: "Framsida underben", serratus_anterior: "Sågmuskel",
  latissimus_dorsi: "Breda ryggmuskeln", teres_major: "Ryggen", erector_spinae: "Ryggresare",
  gluteals: "Säte", hamstrings: "Baksida lår", calves: "Vader", rotator_cuff: "Rotatorkuff",
};

// Otränad muskel: syns som anatomi men läser inte som ett värde.
const GRUNDTON = "#2E333B";

// Den detaljerade anatomibilden ligger UNDER muskelformerna. Den låg tidigare
// som 750 kB base64 inne i SVG:n tillsammans med en blå bakgrund — men den
// bakgrunden kom aldrig från bilden, den kom från CSS i gamla vyn. Bilden
// själv är 73 % genomskinlig: bara kroppen, ingen platta, ingen gloria.
// Här ligger den som extern webp (39 kB), avmättad och mörkad så att de
// färgade musklerna får bära informationen.
// Anatomibilden bäddas IN i bygget (se assetsInlineLimit). Som systerfil hann
// den aldrig laddas innan kartan ritades, och i en fristående HTML-fil fanns
// den inte alls — kartan visade då bara färgformerna, utan kroppen under.
const bildUrl = (vy, figur = FIGURER.m) => figur.bild[vy];

/** Regionens tillstånd = den av dess muskler som är MINST återhämtad. */
function regionState(regionId, states) {
  const ids = MAP[regionId] || [regionId];
  let vald = null;
  ids.forEach(id => {
    const s = states[id];
    if (!s || s.status === "no_data" || s.readiness == null) return;
    if (!vald || s.readiness < vald.readiness) vald = s;
  });
  return vald;
}

function Figur({ vy, states, onSelect, rör, setRör, figur = FIGURER.m }) {
  const data = figur.regions[vy];
  const [bildOk, setBildOk] = useState(true);
  if (!data) return null;
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Anatomin. Saknas filen faller vyn tillbaka på enbart muskelformerna —
          färre detaljer, men fortfarande läsbar och fortfarande sann. */}
      {bildOk && (
        <img src={bildUrl(vy, figur)} alt="" onError={() => setBildOk(false)}
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain",
            // INGEN UPPLJUSNING AV DEN ANATOMISKA ILLUSTRATIONEN.
            //
            // brightness(1.8) fanns för det gamla, MÖRKA fotot — det behövde
            // ljusas upp för att synas mot appens svarta bakgrund. Den nya
            // illustrationen är redan ljus (medelvärde 156 i PSD:n), och 1,8
            // blåste ut den till 252,250,249: nästan rent vitt. Muskelteckningen
            // försvann och hela figuren såg blek ut. Mätt på skärmbild.
            //
            // Kontrasten höjs en aning i stället. Den lyfter fram
            // muskeldefinitionen utan att flytta ljusheten, och det är just
            // teckningen som gör att färgen ser inbakad ut i stället för
            // påklistrad.
            filter: "contrast(1.12)",
          }} />
      )}
      <svg viewBox={data.viewBox} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        role="img" aria-label={vy === "front" ? "Muskelkarta framifrån" : "Muskelkarta bakifrån"}>
        {/* MJUK KANT.
            En SVG-path slutar tvärt på en pixel. Muskler gör det inte — de går
            in i varandra, och en knivskarp gräns ovanpå ett foto läses av ögat
            som en dekal. Suddningen låter färgen tona ut mot grannmuskeln.

            Radien är angiven i viewBox-enheter, inte pixlar, så den skalar med
            figuren i stället för att bli grov på en liten skärm. */}
        <defs>
          <filter id={`mjuk-${vy}`} x="-6%" y="-6%" width="112%" height="112%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
        </defs>
      {data.regions.map(r => {
        const st = regionState(r.id, states);
        // STEGLÖS FÄRG UR readiness, inte ur status.
        //
        // status var fyra hinkar; readiness är det tal motorn faktiskt räknar,
        // med muskelspecifik halveringstid. Nyansen följer nu återhämtningen i
        // exakt den takt den sker i verkligheten.
        const färg = st ? (recoveryColor(st.readiness) || GRUNDTON) : GRUNDTON;
        const aktiv = rör === r.id;
        return (
          <g key={r.id} data-region={r.id}
            style={{ cursor: onSelect ? "pointer" : "default" }}
            onMouseEnter={() => setRör(r.id)} onMouseLeave={() => setRör(null)}
            onClick={() => onSelect && onSelect(r.id)}>
            {/* INGEN <title>. Den gav webbläsarens gula ruta vid hovring, och
                namnet på muskeln är inte det man är där för — färgen är
                avläsningen, och vill man veta mer öppnar man arket.

                Den kostar heller ingenting för skärmläsare: svg:n ovanför bär
                role="img", vilket gör hela kartan till EN grafik i
                tillgänglighetsträdet. Barnen exponeras inte, så titlarna lästes
                aldrig upp — de var enbart en muspekarruta. */}
            {r.d.map((d, i) => figur.lager.map(([blend, op, opAktiv], li) => (
              <path key={`${i}-${li}`} d={d} fill={färg}
                filter={`url(#mjuk-${vy})`}
                // FÄRGEN SKA LIGGA I ANATOMIN, INTE OVANPÅ DEN.
                //
                // Tidigare: mixBlendMode "screen" med opacitet 0,72–0,9.
                // "screen" ljusnar bara och tar ingen hänsyn till vad som finns
                // under — ett mörkt veck och en ljus höjdpunkt fick samma
                // färgpålägg. Tillsammans med den höga opaciteten dränktes
                // fotots muskeldefinition just där färgen var som mest
                // intressant, och resultatet såg påklistrat ut.
                //
                // "overlay" behåller fotots ljus och skugga och lägger färgen
                // som en ton ovanpå. Muskeln behåller sin volym. Då behövs
                // dessutom mindre färg för samma läsbarhet, därav den lägre
                // opaciteten.
                //
                // Otränade muskler ritas nästan inte alls — anatomibilden under
                // räcker för att visa att de finns. Det som lyser är det som
                // faktiskt har underlag.
                // Opaciteten höjs med den ljusare figuren. Overlay späder ut
                // färgen mot ett ljust underlag — samma 0,5 som räckte mot ett
                // mörkt foto ger blek status mot ett ljust. Mätt i pixelvärden,
                // inte uppskattat.
                //
                // Opaciteterna per lager ligger i FIGURER — mansfiguren har
                // kvar exakt 0,62/0,78 med multiply; kvinnofiguren sina egna.
                fillOpacity={st ? (aktiv ? opAktiv : op) : (aktiv && li === 0 ? 0.18 : 0)}
                stroke={aktiv && st && li === 0 ? färg : "none"} strokeWidth={1.5}
                // MULTIPLY, INTE OVERLAY, MOT DEN LJUSA FIGUREN.
                //
                // "overlay" behåller underlagets ljus och lägger färgen som en
                // ton. Mot det gamla MÖRKA fotot fungerade det; mot den ljusa
                // anatomiillustrationen blev resultatet nästan osynligt — den
                // ljusa huden drog färgen mot vitt.
                //
                // "multiply" mörknar i stället, vilket ger full kulör mot ljust
                // underlag och samtidigt låter muskelteckningens skuggor lysa
                // igenom. Mätt på skärmbild, inte uppskattat.
                style={{ transition: "fill .5s, fill-opacity .25s", mixBlendMode: blend }} />
            )))}
          </g>
        );
      })}
      </svg>
    </div>
  );
}

/**
 * Fram och bak sida vid sida, som i skisserna. Ingen bakgrund, ingen gloria,
 * ingen platta — figurerna står mot appens svärta.
 */
export function BodyMap2({ muscleStates = {}, onSelect, height = 300, legend = true, kompakt = false, fyll = false, sex = null }) {
  // `rör` lever kvar trots att namnraden är borta: den markerar formen man
  // pekar på genom att höja opaciteten (`opAktiv` i Figur). Det är återkoppling
  // på att regionen går att klicka, inte en etikett.
  const [rör, setRör] = useState(null);
  const figur = figurFör(sex);

  // `fyll` betyder: ta den höjd som finns kvar i föräldern i stället för ett
  // bestämt antal pixlar. Föräldern är då en flex-kolumn, och kartan är den som
  // får resten — kroppen är gränssnittet, alltså är det kartan som ska växa när
  // det finns plats och krympa när det inte gör det. `minHeight: 0` krävs för
  // att en flex-child ska FÅ krympa; utan den växer den ur skärmen i stället.
  const yttre = fyll
    ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }
    : {};
  const figurer = fyll
    ? { display: "flex", gap: 10, justifyContent: "center", flex: 1, minHeight: 0 }
    : { display: "flex", gap: 10, height, justifyContent: "center" };

  return (
    <div style={yttre}>
      <div style={figurer}>
        {["front", "back"].map(v => (
          <div key={v} style={{ flex: 1, maxWidth: "48%", height: "100%" }}>
            <Figur vy={v} states={muscleStates} onSelect={onSelect} rör={rör} setRör={setRör} figur={figur} />
          </div>
        ))}
      </div>

      {/* HÄR STOD MUSKELNAMNET man rörde vid, med sin readiness-siffra. Borta
          på Roberts begäran: kartan ska läsas som en bild, inte som en lista
          med etiketter, och den som vill ha siffran öppnar arket.

          Raden bar dessutom en dold kostnad. Den reserverade höjd även när
          ingenting hovrades (minHeight plus marginTop, tom text i transparent
          färg) för att figuren inte skulle hoppa när texten dök upp. På en
          liten telefon var det ~25 px som kartan nu får i stället — och kartan
          är det kroppen ska mätas på. */}

      {/* Färgnyckeln får ALDRIG tas bort för att spara höjd: färgerna är
          avläsningen, och en karta man inte kan läsa är dekoration. Däremot får
          den bli kortare — samma fem betydelser, färre tecken. */}
      {legend && (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: kompakt ? "3px 10px" : "6px 14px", marginTop: kompakt ? 4 : 6, flexShrink: 0 }}>
          {(kompakt
            ? [["Redo", C.ready], ["Återhämtar", C.recovering], ["Överbelastad", C.critical], ["Otränad", C.undertrained], ["Ingen data", GRUNDTON]]
            : [["Redo att träna", C.ready], ["Återhämtar sig", C.recovering], ["Överbelastad", C.critical], ["Behöver träning", C.undertrained], ["Ej tränad", GRUNDTON]]
          ).map(([l, c]) => (
            <span key={l} style={{ display: "flex", alignItems: "center", gap: kompakt ? 4 : 6, fontSize: kompakt ? 10 : 11, color: C.muted }}>
              <span style={{ width: kompakt ? 7 : 8, height: kompakt ? 7 : 8, borderRadius: 4, background: c }} />{l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export { NAMN as REGIONNAMN, MAP as REGION_MAP, regionState, FIGURER };
