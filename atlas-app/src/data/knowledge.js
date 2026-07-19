// DATA: ATLAS Kunskapsbank. EN strukturerad källa, två presentationer:
//  • läsbibliotek (rendreras som artiklar under Muskelfakta)
//  • citerbar coach-källa (citableFacts) — coachen plockar korta, verifierade meningar deterministiskt.
// Varje post har en SÄKERHETSNIVÅ. Coachen citerar bara "etablerad" som fakta; övrigt märks tydligt.
// Kost/skador bär alltid en medicinsk reservation.

export const LEVELS = {
  etablerad:   { label: "Etablerad", c: "#39D98A", short: "väldokumenterad fysiologi" },
  tumregel:    { label: "Tumregel", c: "#FFD166", short: "rimlig men individuell riktlinje" },
  omdiskuterat:{ label: "Omdiskuterat", c: "#9B7CFF", short: "forskningen är inte enig" },
};
export const CATEGORIES = {
  function:  { label: "Funktion & anatomi", icon: "◍" },
  training:  { label: "Träning", icon: "dumbbell" },
  recovery:  { label: "Återhämtning", icon: "◈" },
  nutrition: { label: "Kost", icon: "apple", medical: true },
  injury:    { label: "Skador & smärta", icon: "⚠", medical: true },
};
export const MEDICAL_DISCLAIMER = "Detta är allmän information och förslag — inte medicinsk rådgivning. Vid smärta, skada eller minsta osäkerhet: kontakta läkare eller fysioterapeut.";

export const KNOWLEDGE = {
  pectoralis_major: {
    title: "Pectoralis Major (bröstmuskeln)",
    lead: "Den stora, solfjäderformade muskeln över bröstkorgen som styr merparten av dina tryckrörelser.",
    entries: [
      { category: "function", level: "etablerad",
        title: "Vad muskeln gör",
        body: "Pectoralis major för överarmen inåt och framåt över bröstet (adduktion och inåtrotation) och deltar när du trycker framåt. Den har två delar: den övre (klavikulära) delen som aktiveras mest vid lutande press, och den större nedre (sternokostala) delen som dominerar vid horisontell press.",
        fact: "Pectoralis major adducerar och inåtroterar överarmen och driver tryckrörelser; övre delen aktiveras mest vid lutande press.",
        source: { name: "muscles.se", url: "https://muscles.se" } },
      { category: "training", level: "etablerad",
        title: "Så tränas den",
        body: "Bröstet tränas i alla tryckrörelser: bänkpress, hantelpress, dips, armhävningar och flyes. Lutande press flyttar tonvikten mot övre bröstet, horisontell press mot mitten. Ett fullt rörelseomfång med kontrollerad sträckning nedtill ger god stimulans.",
        fact: "Bröstet tränas i tryckövningar (bänkpress, dips, armhävningar, flyes); lutande press betonar övre delen.",
        source: { name: "muscles.se", url: "https://muscles.se" } },
      { category: "training", level: "tumregel",
        title: "Hur mycket volym",
        body: "Ett vanligt spann för tillväxt hos de flesta är ungefär 10–20 hårda set per vecka, fördelat på 2–3 tillfällen. Börja i nedre delen av spannet och öka gradvis — mer är inte alltid bättre, och återhämtningen sätter taket.",
        fact: "Ungefär 10–20 hårda set per vecka är ett vanligt volymspann för brösttillväxt hos de flesta." },
      { category: "recovery", level: "tumregel",
        title: "Vila mellan bröstpass",
        body: "Bröstet är en stor muskelgrupp och behöver oftast 48–72 timmar mellan tunga pass för att återhämta sig fullt. ATLAS räknar med en halveringstid på ca 48 timmar för belastningen — kroppskartan visar när du är redo igen.",
        fact: "Stora muskler som bröstet behöver ofta 48–72 timmar mellan tunga pass." },
      { category: "nutrition", level: "tumregel",
        title: "Protein för muskeltillväxt",
        body: "Ett proteinintag på cirka 1,6–2,2 gram per kilo kroppsvikt och dag stödjer muskeluppbyggnad enligt sammanställd forskning, gärna fördelat över dagens måltider. Detta är en generell riktlinje — individuella behov varierar.",
        fact: "Cirka 1,6–2,2 g protein per kg kroppsvikt och dag stödjer muskeluppbyggnad enligt sammanställd forskning.",
        source: { name: "ISSN position stand (protein)", url: "https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8" } },
      { category: "injury", level: "omdiskuterat",
        title: "Vanligt obehag",
        body: "Främre axelsmärta vid bänkpress kopplas ofta till väldigt brett grepp, tummen-under-grepp eller att axeln vandrar framåt — teknik och greppbredd är värt att se över. En bristning i bröstmuskelns sena är ovanlig men allvarlig och ger ofta plötslig smärta och blånad. Vid kvarstående eller skarp smärta: sök vård." },
    ],
  },
  calves: {
    title: "Gastrocnemius (vadmuskeln)",
    lead: "Den ytliga, tvåhövdade vadmuskeln som ger form åt vaden och driver varje tåhävning och avstamp.",
    entries: [
      { category: "function", level: "etablerad",
        title: "Vad muskeln gör",
        body: "Gastrocnemius plantarflekterar foten (tåhävning) och bidrar även till att böja knät, eftersom den korsar både fotled och knäled. Just för att den passerar knät aktiveras den mest när knät är rakt. Under den ligger soleus, som gör mer av jobbet när knät är böjt.",
        fact: "Gastrocnemius plantarflekterar foten och korsar knät, så den aktiveras mest med rakt knä; soleus dominerar med böjt knä.",
        source: { name: "muscles.se", url: "https://muscles.se" } },
      { category: "training", level: "etablerad",
        title: "Så tränas den",
        body: "Stående tåhävning (rakt knä) träffar gastrocnemius bäst, medan sittande tåhävning (böjt knä) flyttar tonvikten till soleus. Ett fullt rörelseomfång med en tydlig sträckning i botten och en paus i toppen ger bäst stimulans — undvik att studsa.",
        fact: "Stående tåhävning (rakt knä) tränar gastrocnemius; sittande tåhävning (böjt knä) tränar soleus.",
        source: { name: "muscles.se", url: "https://muscles.se" } },
      { category: "training", level: "omdiskuterat",
        title: "Rep-spann för vaden",
        body: "Det påstås ibland att vaden \"bara\" svarar på väldigt höga reps. Forskningsläget är inte entydigt: både lägre och högre repsintervall verkar fungera så länge seten tas nära utmattning. Variera gärna och se vad just din vad svarar på.",
        fact: "Vadens optimala rep-spann är omdiskuterat; både lägre och högre reps fungerar om seten tas nära utmattning." },
      { category: "recovery", level: "tumregel",
        title: "Frekvens och återhämtning",
        body: "Vaden belastas dagligen bara du går, och tål därför ofta högre träningsfrekvens än många andra muskler. ATLAS räknar med en halveringstid på ca 36 timmar — den återhämtar sig relativt snabbt, vilket gör 2–3 pass i veckan rimligt för de flesta.",
        fact: "Vaden belastas dagligen vid gång och tål ofta hög träningsfrekvens; den återhämtar sig relativt snabbt." },
      { category: "nutrition", level: "tumregel",
        title: "Kramp och vätska",
        body: "Muskelkramp i vaden är vanligt och ofarligt för de flesta, och kopplas ibland till vätske- och elektrolytbalans (natrium, kalium, magnesium) — men orsaken är inte alltid kost. Generell näring och vätska räcker för de allra flesta. Återkommande, svåra kramper bör tas upp med vården.",
        fact: "Vadkramp kopplas ibland till vätske- och elektrolytbalans, men orsaken är inte alltid kostrelaterad." },
      { category: "injury", level: "etablerad",
        title: "När vadvärk kan vara allvarligt",
        body: "Träningsvärk och lättare ömhet i vaden är vanligt. Men akut, skarp smärta kan vara en muskelbristning, och ensidig svullnad, rodnad, värme eller smärta utan tydlig orsak kan i sällsynta fall vara en blodpropp (djup ventrombos) — det är ett akut tillstånd. Sök vård direkt vid sådana symtom." },
    ],
  },

  neck_anterior: {
    title: "Sternocleidomastoideus (halsmuskeln)",
    lead: "Det tydliga muskelbandet på sidan av halsen som böjer och vrider huvudet.",
    entries: [
      { category: "function", level: "etablerad", title: "Vad muskeln gör", body: "Sternocleidomastoideus går från bröstben och nyckelben upp till skallbasen. Ena sidan roterar huvudet åt motsatt håll och böjer det åt sin sida; båda sidor tillsammans böjer huvudet framåt.", fact: "Sternocleidomastoideus böjer huvudet framåt och roterar det åt motsatt sida.", source: { name: "muscles.se", url: "https://muscles.se" } },
      { category: "training", level: "tumregel", title: "Så tränas den", body: "Halsen tränas sällan direkt, men inom brottning, boxning och kontaktidrott stärks den för att tåla belastning. Använd lätt motstånd, höga reps och långsamma, kontrollerade rörelser — aldrig ryckigt.", fact: "Direkt halsträning görs med lätt vikt, höga reps och långsamma rörelser." },
      { category: "recovery", level: "tumregel", title: "Återhämtning", body: "Liten muskel som jobbar dagligen med att hålla huvudet — den återhämtar sig snabbt (halveringstid ca 24 timmar i ATLAS)." },
      { category: "injury", level: "omdiskuterat", title: "Nacksmärta", body: "Nackspänning och stelhet är mycket vanligt och oftast godartat, kopplat till hållning, stress och skärmtid. Men akut svår nacksmärta, särskilt med domningar, yrsel, svaghet eller efter trauma, ska bedömas av vård." },
    ],
  },

  trapezius: {
    title: "Trapezius (kappmuskeln)",
    lead: "Den stora, diamantformade muskeln över nacke och övre rygg som styr och stabiliserar skulderbladen.",
    entries: [
      { category: "function", level: "etablerad", title: "Vad muskeln gör", body: "Trapezius har tre delar: övre lyfter skulderbladet (elevation), mellersta drar ihop det (retraktion) och nedre sänker det. Tillsammans är den avgörande för axelhälsa och hållning.", fact: "Trapezius styr skulderbladet — övre lyfter, mellersta drar ihop, nedre sänker.", source: { name: "muscles.se", url: "https://muscles.se" } },
      { category: "training", level: "etablerad", title: "Så tränas den", body: "Övre delen tränas med shrugs och upprätt rodd; mellersta och nedre med rodd, face pulls och raka drag. Face pulls tränar den ofta försummade nedre/mellersta delen som håller axlarna friska.", fact: "Övre traps tränas med shrugs; mellersta/nedre med rodd och face pulls." },
      { category: "recovery", level: "tumregel", title: "Återhämtning", body: "Stor muskel (halveringstid ca 48 timmar), men övre traps jobbar dagligen med att bära armar och huvud och tål ofta hög frekvens." },
      { category: "injury", level: "tumregel", title: "Spänning i övre traps", body: "Ihållande spänning i övre traps kopplas ofta till stress, hållning och långvarigt stillasittande. Att stärka nedre/mellersta traps och ta rörelsepauser hjälper många. Vid utstrålande smärta eller domningar: sök vård." },
    ],
  },

  deltoid_anterior: {
    title: "Främre deltoideus (främre axeln)",
    lead: "Den främre delen av axelmuskeln som lyfter armen framåt och drar i varje tryckövning.",
    entries: [
      { category: "function", level: "etablerad", title: "Vad muskeln gör", body: "Främre delten lyfter armen framåt och uppåt (flexion) och bidrar i inåtrotation. Den är starkt inblandad i all press.", fact: "Främre deltoideus lyfter armen framåt och hjälper till i all tryckträning.", source: { name: "muscles.se", url: "https://muscles.se" } },
      { category: "training", level: "etablerad", title: "Så tränas den", body: "Tränas i axelpress och all horisontell/lutande press. Om du pressar mycket är den ofta redan väl belastad — extra isolering behövs sällan." },
      { category: "injury", level: "tumregel", title: "Axelbalans", body: "En mycket stark främre delt i förhållande till bakre delt och rotatorkuff kopplas till axelobalans hos vissa. Balansera pressen med drag och bakre delt-arbete. Vid axelsmärta: se över volymen och sök vård vid behov." },
    ],
  },

  deltoid_lateral: {
    title: "Sidodeltoideus (mellersta axeln)",
    lead: "Den mellersta delen av axeln som lyfter armen ut i sidled och ger axlarna bredd.",
    entries: [
      { category: "function", level: "etablerad", title: "Vad muskeln gör", body: "Sidodelten för armen utåt från kroppen (abduktion) och ger axeln dess runda, breda form.", fact: "Sidodeltoideus lyfter armen ut i sidled (abduktion) och breddar axeln.", source: { name: "muscles.se", url: "https://muscles.se" } },
      { category: "training", level: "etablerad", title: "Så tränas den", body: "Tränas bäst med sidolyft (lateral raises), där den isoleras. I tunga pressövningar bidrar den mindre. Använd lätt vikt, kontrollerad rörelse och gärna högre reps.", fact: "Sidodelten tränas bäst isolerat med sidolyft, ofta med lättare vikt och högre reps." },
    ],
  },

  deltoid_posterior: {
    title: "Bakre deltoideus (bakre axeln)",
    lead: "Den bakre delen av axeln — ofta försummad, men viktig motvikt till all press.",
    entries: [
      { category: "function", level: "etablerad", title: "Vad muskeln gör", body: "Bakre delten för armen bakåt (extension) och utåtroterar axeln. Den är en viktig motvikt till mycket tryckträning och stödjer hållningen.", fact: "Bakre deltoideus för armen bakåt och utåtroterar — motvikt till mycket press.", source: { name: "muscles.se", url: "https://muscles.se" } },
      { category: "training", level: "etablerad", title: "Så tränas den", body: "Tränas med face pulls, omvända flyes och rodd mot ansiktet. Den är ofta underutvecklad — extra volym gynnar axelbalans och hållning.", fact: "Bakre delten tränas med face pulls, omvända flyes och rodd mot ansiktet." },
    ],
  },

  serratus_anterior: {
    title: "Serratus anterior (sågmuskeln)",
    lead: "De sågtandade muskelbladen längs revbenen som stabiliserar skulderbladet vid rörelser över huvudet.",
    entries: [
      { category: "function", level: "etablerad", title: "Vad muskeln gör", body: "Serratus anterior drar skulderbladet framåt och uppåt runt bröstkorgen och håller det tätt mot ryggen. Den är avgörande för smärtfri axelrörelse när du lyfter armen över huvudet.", fact: "Serratus anterior stabiliserar skulderbladet mot bröstkorgen vid rörelser över huvudet.", source: { name: "muscles.se", url: "https://muscles.se" } },
      { category: "training", level: "tumregel", title: "Så tränas den", body: "Tränas i press över huvudet, armhävningar med extra framåtskjut i toppen (\"push-up plus\") och wall slides. Den är ofta svag hos personer med axelbesvär." },
    ],
  },

  latissimus_dorsi: {
    title: "Latissimus dorsi (breda ryggmuskeln)",
    lead: "Ryggens största muskel — den som ger den breda V-formen och driver alla drag.",
    entries: [
      { category: "function", level: "etablerad", title: "Vad muskeln gör", body: "Latissimus för överarmen nedåt och bakåt (adduktion och extension) och inåtroterar. Den dominerar i alla dragrörelser och ger ryggen dess bredd.", fact: "Latissimus dorsi för armen nedåt och bakåt och dominerar i alla drag.", source: { name: "muscles.se", url: "https://muscles.se" } },
      { category: "training", level: "etablerad", title: "Så tränas den", body: "Tränas i vertikala drag (chins, latsdrag) och horisontell rodd. Ett fullt rörelseomfång med sträckning i toppen och ihopdragning nedtill ger god stimulans.", fact: "Latissimus tränas i chins/latsdrag (vertikalt) och rodd (horisontellt)." },
      { category: "training", level: "tumregel", title: "Hur mycket volym", body: "Ett vanligt spann för ryggtillväxt är ungefär 10–20 hårda set per vecka, fördelat på flera pass. Ryggen tål ofta god volym." },
      { category: "recovery", level: "tumregel", title: "Återhämtning", body: "Stor muskel (halveringstid ca 48 timmar) — ge oftast 48–72 timmar mellan tunga ryggpass." },
    ],
  },

  erector_spinae: {
    title: "Erector spinae (ryggresarna)",
    lead: "Muskelsträngarna längs ryggraden som håller dig upprätt och stabiliserar bålen i tunga lyft.",
    entries: [
      { category: "function", level: "etablerad", title: "Vad muskeln gör", body: "Erector spinae sträcker ryggraden och håller den upprätt, samt sidoböjer. Under tunga lyft är dess viktigaste jobb att stabilisera och hålla ryggen neutral.", fact: "Erector spinae sträcker och stabiliserar ryggraden och håller bålen upprätt.", source: { name: "muscles.se", url: "https://muscles.se" } },
      { category: "training", level: "etablerad", title: "Så tränas den", body: "Belastas hårt i marklyft, rygglyft (back extensions), goda morgnar och tunga baslyft generellt, där den håller ryggen stabil." },
      { category: "recovery", level: "tumregel", title: "Återhämtning", body: "Belastas tungt av marklyft och kan ta längre tid att återhämta än man tror — ge ofta 48–72 timmar innan nästa tunga hinge." },
      { category: "injury", level: "etablerad", title: "Ländryggssmärta", body: "Ländryggssmärta är mycket vanligt och för det mesta godartat; gradvis belastning, rörelse och god teknik hjälper de flesta. Men smärta med utstrålning ner i benet, domningar, bensvaghet eller påverkan på blås-/tarmkontroll är akut — sök vård omgående." },
    ],
  },

  rectus_abdominis: {
    title: "Rectus abdominis (raka bukmuskeln)",
    lead: "Den framåtlöpande bukmuskeln — \"six-packen\" — som böjer bålen och stabiliserar mitten.",
    entries: [
      { category: "function", level: "etablerad", title: "Vad muskeln gör", body: "Raka bukmuskeln böjer ryggraden framåt (crunch-rörelsen) och stabiliserar bålen. Den syns som rutor tack vare senband som delar in muskeln.", fact: "Rectus abdominis böjer bålen framåt och stabiliserar mitten.", source: { name: "muscles.se", url: "https://muscles.se" } },
      { category: "training", level: "etablerad", title: "Så tränas den", body: "Tränas med bålböjningar (crunches), benlyft och anti-extension (planka, bukhjul). Precis som andra muskler svarar den på motstånd och progression — inte bara ändlösa reps." },
      { category: "nutrition", level: "tumregel", title: "Synliga magmuskler", body: "Att magmusklerna syns beror mest på låg kroppsfettprocent, inte på antalet situps. Det når du via energibalans över tid. Punktförbränning — att \"träna bort\" fett på just magen — fungerar inte. Detta är generell information; individuella behov varierar." },
    ],
  },

  obliques: {
    title: "Obliques (sneda bukmusklerna)",
    lead: "Bålens sido- och rotationsmuskler — nyckeln till att vrida, stabilisera och överföra kraft.",
    entries: [
      { category: "function", level: "etablerad", title: "Vad muskeln gör", body: "De sneda bukmusklerna roterar och sidoböjer bålen, och — kanske viktigast — motverkar oönskad rotation. De är centrala för stabilitet och kraftöverföring mellan över- och underkropp.", fact: "Obliques roterar och sidoböjer bålen och motverkar oönskad rotation.", source: { name: "muscles.se", url: "https://muscles.se" } },
      { category: "training", level: "etablerad", title: "Så tränas den", body: "Tränas med rotationer, sidoplanka, woodchops och anti-rotationsövningar (t.ex. Pallof press). Kontrollerad rörelse slår fart." },
    ],
  },

  biceps_brachii: {
    title: "Biceps brachii (armböjaren)",
    lead: "Framsidan av överarmen — böjer armbågen och vrider handen, och jobbar i varje drag.",
    entries: [
      { category: "function", level: "etablerad", title: "Vad muskeln gör", body: "Biceps böjer armbågen och vrider underarmen så handflatan pekar uppåt (supination). Den korsar även axeln och hjälper till att lyfta armen framåt.", fact: "Biceps brachii böjer armbågen och supinerar underarmen (vrider handflatan uppåt).", source: { name: "muscles.se", url: "https://muscles.se" } },
      { category: "training", level: "etablerad", title: "Så tränas den", body: "Tränas direkt med curls i olika grepp, men aktiveras även rejält i all dragträning (rodd, chins). Räkna in den indirekta volymen så du inte överdoserar.", fact: "Biceps tränas direkt med curls men får mycket indirekt volym från all dragträning." },
      { category: "recovery", level: "tumregel", title: "Återhämtning", body: "Liten muskel som återhämtar snabbt (halveringstid ca 24 timmar) och tål hög frekvens — men blir lätt överbelastad om du både drar mycket och curlar mycket." },
      { category: "injury", level: "tumregel", title: "Sen-irritation", body: "Irritation i bicepssenan vid axeln eller armbågen kan komma av för hög volym eller tung belastning. Ett hörbart \"knäpp\" följt av smärta och blånad kan vara en senruptur — sök vård." },
    ],
  },

  triceps_brachii: {
    title: "Triceps brachii (armsträckaren)",
    lead: "Baksidan av överarmen — den utgör merparten av armens massa och sträcker armbågen.",
    entries: [
      { category: "function", level: "etablerad", title: "Vad muskeln gör", body: "Triceps sträcker armbågen och står för ungefär två tredjedelar av överarmens muskelmassa. Dess långa huvud korsar axeln och hjälper till att föra armen bakåt.", fact: "Triceps sträcker armbågen och utgör ungefär två tredjedelar av överarmens massa.", source: { name: "muscles.se", url: "https://muscles.se" } },
      { category: "training", level: "etablerad", title: "Så tränas den", body: "Tränas direkt med pressdowns och extensions, och indirekt i all press (bänkpress, dips, axelpress). Överhäng-övningar (armarna över huvudet) töjer långa huvudet extra.", fact: "Triceps tränas direkt med pressdowns/extensions och indirekt i all press." },
      { category: "recovery", level: "tumregel", title: "Återhämtning", body: "Återhämtar snabbt (halveringstid ca 24 timmar), men hög press- plus isoleringsvolym kan irritera armbågen — öka gradvis." },
    ],
  },

  forearms: {
    title: "Underarmar & grepp",
    lead: "Musklerna som styr handled, fingrar och grepp — ofta det som ger vika först i tunga drag.",
    entries: [
      { category: "function", level: "etablerad", title: "Vad muskeln gör", body: "Underarmen har flexorer (insidan) som böjer handled och fingrar, och extensorer (utsidan) som sträcker dem. Tillsammans styr de greppet.", fact: "Underarmens flexorer och extensorer böjer och sträcker handled och fingrar och styr greppet.", source: { name: "muscles.se", url: "https://muscles.se" } },
      { category: "training", level: "tumregel", title: "Så tränas den", body: "Tränas indirekt av allt greppkrävande (drag, marklyft, chins) och direkt med handledscurls, greppträning och tunga farmer's carries.", fact: "Greppet tränas direkt med handledscurls och farmer's carries, indirekt av all tung dragträning." },
      { category: "injury", level: "tumregel", title: "Tennis- och golfarmbåge", body: "Sen-irritation vid armbågen (\"tennisarmbåge\" på utsidan, \"golfarmbåge\" på insidan) är vanligt vid hög grepp- eller datorbelastning. Belastningsanpassning och gradvis stärkande hjälper ofta. Kvarstående smärta: sök vård." },
    ],
  },

  gluteals: {
    title: "Gluteus maximus (stora sätesmuskeln)",
    lead: "Kroppens starkaste muskel — motorn bakom att resa dig, hoppa och sprinta.",
    entries: [
      { category: "function", level: "etablerad", title: "Vad muskeln gör", body: "Gluteus maximus sträcker höften (reser dig ur en böj, driver hopp och sprint) och utåtroterar låret. Den är en av kroppens största och mest kraftfulla muskler.", fact: "Gluteus maximus sträcker höften och är en av kroppens största och mest kraftfulla muskler.", source: { name: "muscles.se", url: "https://muscles.se" } },
      { category: "training", level: "etablerad", title: "Så tränas den", body: "Tränas i höftlyft (hip thrust), marklyft, knäböj och utfall. Hip thrust ger särskilt hög direkt sätesaktivering; djup knäböj och utfall bidrar också starkt.", fact: "Sätet tränas i hip thrust, marklyft, knäböj och utfall; hip thrust ger hög direkt aktivering." },
      { category: "training", level: "tumregel", title: "Hur mycket volym", body: "Svarar bra på både tung belastning och volym; ungefär 10–16 hårda set per vecka är ett vanligt spann." },
      { category: "injury", level: "tumregel", title: "Svaga glutes", body: "Svaga eller inaktiva glutes kopplas hos vissa till länd- och knäbesvär, och stärkta glutes ingår ofta i rehab. Sambanden är dock individuella. Vid ihållande smärta: sök vård." },
    ],
  },

  hip_flexors: {
    title: "Höftböjare (iliopsoas m.fl.)",
    lead: "De djupa musklerna som lyfter låret mot bålen — nyckel för sprint, knälyft och en stabil bål.",
    entries: [
      { category: "function", level: "etablerad", title: "Vad muskeln gör", body: "Höftböjarna (främst iliopsoas) lyfter låret uppåt mot bålen (höftflexion) och stabiliserar ländrygg och bäcken. De är centrala i sprint och när du drar upp knät.", fact: "Höftböjarna lyfter låret mot bålen (höftflexion) och stabiliserar bäckenet.", source: { name: "muscles.se", url: "https://muscles.se" } },
      { category: "training", level: "tumregel", title: "Så tränas och rörs den", body: "Blir ofta stela av mycket sittande. Tränas med benlyft och knälyft mot motstånd, och hålls rörliga med utfalls- och höftböjarstretch. Stelhet betyder inte automatiskt svaghet." },
    ],
  },

  quadriceps: {
    title: "Quadriceps (framsida lår)",
    lead: "De fyra musklerna på lårets framsida som sträcker knät — centrala för böj, hopp och gång.",
    entries: [
      { category: "function", level: "etablerad", title: "Vad muskeln gör", body: "Quadriceps sträcker knät, och en av de fyra (rectus femoris) böjer även höften eftersom den korsar båda lederna. De är motorn i knäböj, hopp och att gå i trappor.", fact: "Quadriceps sträcker knät; rectus femoris böjer även höften.", source: { name: "muscles.se", url: "https://muscles.se" } },
      { category: "training", level: "etablerad", title: "Så tränas den", body: "Tränas i knäböj, benpress, utfall och benspark (leg extension). Ett djupt knäböj med fullt knästräck i toppen ger god stimulans över hela muskeln.", fact: "Quadriceps tränas i knäböj, benpress, utfall och benspark." },
      { category: "training", level: "tumregel", title: "Hur mycket volym", body: "Ett vanligt spann är ungefär 10–20 hårda set per vecka. Tunga benpass är krävande för hela kroppen — sprid ut dem." },
      { category: "recovery", level: "tumregel", title: "Återhämtning", body: "Stor muskelgrupp (halveringstid ca 48 timmar). Tunga benpass ger ofta 2–3 dagars träningsvärk, särskilt i början eller efter uppehåll." },
      { category: "injury", level: "tumregel", title: "Främre knäsmärta", body: "Smärta runt eller under knäskålen (patellofemoral smärta) är vanligt. Bra teknik, gradvis ökad belastning och starka quads och glutes hjälper ofta. Vid skarp, svullen eller låsande knäskada: sök vård." },
    ],
  },

  hamstrings: {
    title: "Hamstrings (baksida lår)",
    lead: "Baksidans muskler som böjer knät och sträcker höften — och en av idrottens vanligaste skadeplatser.",
    entries: [
      { category: "function", level: "etablerad", title: "Vad muskeln gör", body: "Hamstrings böjer knät och sträcker höften, och korsar båda lederna. De är centrala i marklyft och sprint, och bromsar benet i slutet av varje kliv.", fact: "Hamstrings böjer knät och sträcker höften och korsar båda lederna.", source: { name: "muscles.se", url: "https://muscles.se" } },
      { category: "training", level: "etablerad", title: "Så tränas den", body: "Träna båda rollerna: höftsträckning (rumänsk marklyft, marklyft, goda morgnar) och knäböjning (leg curls, nordic curls). Många tränar bara den ena — täck båda.", fact: "Hamstrings tränas i två roller: höftsträckning (rumänsk marklyft) och knäböjning (leg curls)." },
      { category: "recovery", level: "tumregel", title: "Återhämtning", body: "Stor muskelgrupp (halveringstid ca 48 timmar). Rumänska marklyft och nordic curls ger ofta rejäl träningsvärk — öka volymen gradvis." },
      { category: "injury", level: "etablerad", title: "Hamstringsbristning", body: "Bristning i baksida lår är en av de vanligaste idrottsskadorna, ofta vid sprint eller explosiva sträckningar. Excentrisk träning (t.ex. nordic curls) minskar risken enligt forskning. Vid akut, skarp smärta i baksida lår: sök vård." },
    ],
  },

  adductors: {
    title: "Adduktorer (insida lår / ljumske)",
    lead: "Insida lår-musklerna som för benen inåt och stabiliserar bäckenet vid riktningsändringar.",
    entries: [
      { category: "function", level: "etablerad", title: "Vad muskeln gör", body: "Adduktorerna för benet inåt mot kroppens mittlinje (adduktion) och hjälper till att stabilisera bäcken och knä vid gång, knäböj och snabba riktningsändringar.", fact: "Adduktorerna för benet inåt mot mittlinjen och stabiliserar bäckenet.", source: { name: "muscles.se", url: "https://muscles.se" } },
      { category: "training", level: "etablerad", title: "Så tränas den", body: "Tränas i bred knäböj, sidoutfall, adduktormaskin och cossack squats. De arbetar också som stabilisatorer i de flesta benövningar.", fact: "Adduktorerna tränas i bred knäböj, sidoutfall, adduktormaskin och cossack squats." },
      { category: "injury", level: "tumregel", title: "Ljumskskada", body: "Ljumskbristning och -belastning är vanligt i idrotter med snabba riktningsändringar (fotboll, innebandy, hockey). Adduktorstyrka (t.ex. Copenhagen plank) minskar risken enligt forskning. Vid ihållande ljumsksmärta: sök vård." },
    ],
  },

  tibialis_anterior: {
    title: "Tibialis anterior (skenbensmuskeln)",
    lead: "Muskeln längs skenbenets framsida som lyfter foten — vadens motspelare och ofta försummad.",
    entries: [
      { category: "function", level: "etablerad", title: "Vad muskeln gör", body: "Tibialis anterior lyfter foten uppåt (dorsalflexion) och bromsar kontrollerat foten vid varje isättning i gång och löpning. Den är motspelare till vaden.", fact: "Tibialis anterior lyfter foten (dorsalflexion) och bromsar foten vid isättning i löpning.", source: { name: "muscles.se", url: "https://muscles.se" } },
      { category: "training", level: "tumregel", title: "Så tränas den", body: "Ofta svag i förhållande till vaden. Tränas med tibialis raises — att lyfta tårna mot motstånd (t.ex. mot en vikt eller ett band). Ett starkt underben kopplas hos vissa till mindre besvär.", fact: "Tibialis anterior tränas med tibialis raises (lyfta tårna mot motstånd)." },
      { category: "injury", level: "omdiskuterat", title: "Benhinnebesvär", body: "\"Benhinneinflammation\" (medialt tibialt stressyndrom) är vanligt vid snabb ökning av löpvolym. Gradvis upptrappning, bra skor och starka underben hjälper ofta. Kvarstående eller punktvis skarp smärta i skenbenet: sök vård för att utesluta stressfraktur." },
    ],
  },
};

// ── Träningsprinciper: artiklar utöver musklerna, grundade i evidensbaserade källor (Styrkelabbet m.fl.) ──
// Egna formuleringar — inga citat ordagrant. Källa anges per avsnitt.
const SL = url => ({ name: "Styrkelabbet", url });
export const TOPICS = {
  progressiv_overbelastning: {
    title: "Progressiv överbelastning",
    tag: "Träningsprincip",
    lead: "Den enskilt viktigaste principen för att fortsätta bli starkare och bygga muskel: att gradvis göra mer över tid.",
    sections: [
      { level: "etablerad", title: "Grundprincipen", body: "Kroppen anpassar sig bara till en belastning den inte redan är van vid. För att fortsätta utvecklas måste du därför successivt göra mer — mer vikt, fler repetitioner eller fler set. Slutar du öka stannar framstegen av när kroppen väl anpassat sig.", fact: "Progressiv överbelastning innebär att gradvis göra mer (vikt, reps eller set) så kroppen tvingas fortsätta anpassa sig.", source: SL("https://www.styrkelabbet.se/progressiv-styrketraning/") },
      { level: "tumregel", title: "Så gör du i praktiken", body: "Vanligast är att lägga på minsta möjliga vikt (ofta 2,5 kg på en skivstång) och sikta på samma antal reps, eller behålla vikten och ta en rep till. Ett tredje sätt är att lägga till ett set. Klarar du inte fler reps på en högre vikt — stanna kvar tills du gör det, och öka sedan.", fact: "Öka minsta möjliga vikt (ofta 2,5 kg), ta en extra rep, eller lägg till ett set — och håll kvar tills du klarar målet innan du ökar igen.", source: SL("https://www.styrkelabbet.se/progressiv-styrketraning/") },
      { level: "etablerad", title: "Viktigare med tiden", body: "Som nybörjare ökar vikterna nästan av sig själva de första månaderna. När framstegen börjar komma långsammare är det progressiv överbelastning som blir avgörande — det räcker inte längre att bara dyka upp och träna.", fact: "Nybörjare gör snabba framsteg nästan automatiskt; efter första månaderna blir medveten progressiv överbelastning avgörande.", source: SL("https://www.styrkelabbet.se/progressiv-styrketraning/") },
    ],
  },
  traningsvolym: {
    title: "Träningsvolym",
    tag: "Träningsprincip",
    lead: "Hur mycket du tränar en muskel — en av de mest avgörande faktorerna för styrka och muskeltillväxt.",
    sections: [
      { level: "etablerad", title: "Vad volym är", body: "Träningsvolym räknas oftast som set × reps × belastning, men i praktiken pratar man ofta om antalet hårda arbetsset per muskel och vecka. Tillsammans med tillräckligt tung och tillräckligt frekvent träning bildar volymen grunden för dina resultat.", fact: "Träningsvolym (set × reps × belastning, ofta räknat som hårda set per muskel och vecka) är en av de mest avgörande faktorerna för resultat.", source: SL("https://www.styrkelabbet.se/traningsvolym/") },
      { level: "tumregel", title: "Hur mycket är lagom", body: "För de flesta fungerar ungefär 10–20 hårda set per muskel och vecka bra, förutsatt att seten tas nära failure. Stannar du längre från failure tål du mer volym. Rätt mängd är individuell — hitta ditt eget lagom.", fact: "Runt 10–20 hårda set per muskel och vecka fungerar för de flesta när seten tas nära failure.", source: SL("https://www.styrkelabbet.se/traningsvolym/") },
      { level: "etablerad", title: "Öka gradvis", body: "Musklerna anpassar sig relativt snabbt, men leder och ligament hänger inte med lika fort. Att öka volymen för mycket för snabbt är en vanlig väg till överbelastning — höj i måttliga steg.", fact: "Öka volymen gradvis: musklerna anpassar sig snabbare än leder och ligament, så för snabba ökningar ökar skaderisken.", source: SL("https://www.styrkelabbet.se/traningsvolym/") },
      { level: "omdiskuterat", title: "Variera över tid", body: "Ett sätt att strukturera volymen är i block på ungefär 4–8 veckor där du börjar lågt och ökar gradvis, för att sedan starta om på en lägre nivå. Enligt vissa är just den gradvisa volymökningen inom ett block en av de viktigaste principerna för fortsatta framsteg — men forskningen är inte helt enig.", source: SL("https://www.styrkelabbet.se/traningsvolym/") },
    ],
  },
  traningsfrekvens: {
    title: "Träningsfrekvens",
    tag: "Träningsprincip",
    lead: "Hur ofta du tränar en muskel eller övning — och varför det mest handlar om volym.",
    sections: [
      { level: "etablerad", title: "Vad frekvens är", body: "Träningsfrekvens är antalet pass under en period, oftast räknat per vecka — antingen totalt eller för en specifik muskel. Vanliga rekommendationer landar på att träna varje muskel 2–3 gånger i veckan.", fact: "Träningsfrekvens är antalet pass per vecka; vanliga rekommendationer är 2–3 pass per muskel och vecka.", source: SL("https://www.styrkelabbet.se/traningsfrekvens-2/") },
      { level: "etablerad", title: "Volymen är det som driver", body: "När den totala veckovolymen hålls lika stor spelar själva frekvensen liten roll för styrkeökningarna — ett pass i veckan ger ungefär lika mycket som tre, om volymen är densamma. Vinsten med högre frekvens kommer främst av att den gör det lättare att få in mer volym.", fact: "Vid matchad veckovolym påverkar frekvensen i sig styrkeökningarna lite; högre frekvens hjälper främst genom att möjliggöra mer total volym.", source: SL("https://www.styrkelabbet.se/vilken-ar-den-optimala-traningsfrekvensen-for-att-bli-sa-stark-som-mojligt/") },
      { level: "tumregel", title: "Fördelen: bättre setkvalitet", body: "Att krossa en muskel med 15 set i ett enda pass gör ofta att kvaliteten sjunker mot slutet. Delar du upp samma volym på flera pass håller du högre kvalitet på varje set. Femton bra set slår nio bra plus sex halvdana.", fact: "Att dela upp veckovolymen på fler pass bevarar setkvaliteten jämfört med att göra allt i ett långt pass.", source: SL("https://www.styrkelabbet.se/vilken-ar-den-optimala-traningsfrekvensen-for-att-bli-sa-stark-som-mojligt/") },
      { level: "tumregel", title: "Så ökar du frekvensen", body: "Höj ett steg i taget — från ett till två pass, utvärdera efter några veckor, och lägg till ett tredje först om du återhämtar dig väl. Håll den totala volymen konstant till en början och öka den sedan gradvis om allt känns bra.", source: SL("https://www.styrkelabbet.se/vilken-ar-den-optimala-traningsfrekvensen-for-att-bli-sa-stark-som-mojligt/") },
    ],
  },
  narhet_failure: {
    title: "Närhet till failure",
    tag: "Träningsprincip",
    lead: "Hur hårt du tar dina set avgör både hur mycket stimulans du får och hur mycket återhämtning som krävs.",
    sections: [
      { level: "etablerad", title: "Varför det spelar roll", body: "För att ett set ska ge god stimulans behöver det tas tillräckligt nära failure — punkten där du inte klarar en till med bibehållen teknik. Set som avbryts långt före failure ger mindre stimulans men kräver också mindre återhämtning.", fact: "Set som tas nära failure ger mer stimulans men kräver mer återhämtning; set långt från failure kräver mindre men ger mindre stimulans.", source: SL("https://www.styrkelabbet.se/traningsvolym/") },
      { level: "tumregel", title: "RIR — reps i reserv", body: "Ett vanligt sätt att styra hur nära failure du tränar är RIR (reps in reserve): hur många reps du hade kunnat göra till. RIR 1–3 (1–3 reps kvar) är ett vanligt spann för muskeltillväxt som balanserar stimulans mot återhämtning.", fact: "RIR (reps i reserv) beskriver hur många reps du har kvar till failure; RIR 1–3 är ett vanligt spann för tillväxt." },
    ],
  },
  progressionsmodeller: {
    title: "Progressionsmodeller",
    tag: "Träningsprincip",
    lead: "Olika sätt att strukturera hur du ökar — och vilket som passar styrka respektive muskeltillväxt.",
    sections: [
      { level: "tumregel", title: "Singelprogression", body: "Du ökar vikten gradvis medan reps och set hålls konstanta, till exempel 5×5. Enkelt och tydligt, och en vanlig rekommendation för nybörjare och för ren styrka på baslyften.", fact: "Singelprogression: öka vikten medan reps och set hålls konstanta (t.ex. 5×5) — vanligt för styrka och nybörjare." },
      { level: "tumregel", title: "Dubbelprogression", body: "Du arbetar inom ett repintervall (t.ex. 8–12) och ökar först antalet reps innan du höjer vikten. Det balanserar mekanisk spänning och volym väl och anpassar sig efter dagsform — ofta det bästa valet för muskeltillväxt.", fact: "Dubbelprogression: progrediera reps inom ett intervall (t.ex. 8–12) innan du ökar vikten — ofta bäst för muskeltillväxt." },
    ],
  },
  aterhamtning: {
    title: "Återhämtning & vila",
    tag: "Träningsprincip",
    lead: "Musklerna byggs inte under passet, utan i vilan mellan passen.",
    sections: [
      { level: "etablerad", title: "Träning + vila = framsteg", body: "Träningen är stimulansen, men det är under återhämtningen som kroppen reparerar och bygger sig starkare. Utan tillräcklig vila hinner anpassningen inte ske, och för mycket träning för lite vila leder till stagnation eller överbelastning.", fact: "Muskler byggs under återhämtningen, inte under själva passet — tillräcklig vila är en förutsättning för framsteg." },
      { level: "tumregel", title: "Sömn och mellandagar", body: "Sikta på 7–9 timmars sömn — det är en av de mest underskattade återhämtningsfaktorerna. Stora muskelgrupper behöver ofta 48–72 timmar mellan tunga pass, medan mindre muskler som återhämtar snabbare tål högre frekvens.", fact: "Sikta på 7–9 timmars sömn; stora muskelgrupper behöver ofta 48–72 timmar mellan tunga pass." },
    ],
  },
  protein_kost: {
    title: "Protein & kost",
    tag: "Kost",
    lead: "Träningen är stimulansen — men utan tillräckligt med protein och energi kan resultaten av gymtimmarna utebli.",
    sections: [
      { level: "etablerad", title: "Protein är byggstenarna", body: "Muskler repareras och byggs upp av protein. Får du i dig för lite bromsas tillväxten oavsett hur bra du tränar — byggstenarna helt enkelt inte räcker till. Träningen är viktigast, men utan en vettig kosthållning blir resultaten lidande.", fact: "Muskler byggs av protein; för lågt intag bromsar tillväxten oavsett hur bra träningen är.", source: SL("https://www.styrkelabbet.se/protein-per-dag/") },
      { level: "tumregel", title: "Hur mycket", body: "Runt 1,6 g protein per kilo kroppsvikt och dygn täcker behovet för de flesta. Eftersom gensvaret på protein varierar mellan individer kan du sikta upp mot 2,2 g/kg — då täcks behovet för praktiskt taget alla naturligt tränande, oavsett nivå. Mer än så ger inga extra fördelar för muskeltillväxten.", fact: "≈1,6 g protein/kg/dygn täcker behovet för de flesta; upp mot 2,2 g/kg täcker individuell variation.", source: SL("https://www.styrkelabbet.se/protein/") },
      { level: "tumregel", title: "Fördela över dagen", body: "Muskeluppbyggnaden kan bara stimuleras av en begränsad mängd protein per intag och behöver sedan några timmar innan nästa stimulans. Dela därför hellre upp intaget på flera måltider med minst ~30 g protein i varje, än att samla allt i ett par stora mål.", fact: "Fördela proteinet på flera måltider (minst ~30 g styck) hellre än ett par stora — stimulansen per måltid är begränsad.", source: SL("https://www.styrkelabbet.se/proteinrik-mat/") },
      { level: "etablerad", title: "Kalorier och resten", body: "Kolhydrater och fett har inga egna muskelbyggande egenskaper — de är energikällor. Så länge du täcker ditt kalori- och proteinbehov fungerar de flesta upplägg, från lågfett till lågkolhydrat, för både muskeltillväxt och fettförlust. Basera ändå kosten på hyfsat oraffinerad mat för hälsans och mikronäringens skull.", fact: "Kolhydrater och fett är energikällor utan egen muskelbyggande effekt; täck kalori- och proteinbehovet så fungerar de flesta upplägg.", source: SL("https://www.styrkelabbet.se/kost/") },
    ],
  },
  energibalans: {
    title: "Energibalans – deff & bulk",
    tag: "Kost",
    lead: "Om du går upp, ner eller står stilla i vikt avgörs av balansen mellan energi in och energi ut.",
    sections: [
      { level: "etablerad", title: "Balans, överskott, underskott", body: "Äter du lika mycket energi som du förbrukar står du stilla i vikt — det kallas energibalans. Ett kaloriöverskott (bulk) ger extra energi att bygga av; ett kaloriunderskott (deff) tvingar kroppen att ta av sina reserver, och du går ner i vikt.", fact: "Energibalans = intag ≈ förbrukning; överskott (bulk) bygger, underskott (deff) minskar vikten.", source: SL("https://www.styrkelabbet.se/deffa/") },
      { level: "tumregel", title: "Lagom bulk", body: "För att bygga muskel med så lite fettökning som möjligt räcker ett måttligt överskott, ofta i storleksordningen 350–500 kcal per dygn. Ett större överskott bygger inte mer muskel — det ger mest extra fett. Ju mindre överskott, desto större andel av viktuppgången blir muskel.", fact: "Ett måttligt överskott (~350–500 kcal/dygn) räcker för muskeltillväxt; större överskott ger mest extra fett.", source: SL("https://www.styrkelabbet.se/maximalt-med-muskler-hur-stort-kalorioverskott/") },
      { level: "tumregel", title: "Deffa utan att tappa muskel", body: "Håll underskottet måttligt — en viktnedgång på ungefär 0,5–1 % av kroppsvikten per vecka, i kombination med tillräckligt protein och fortsatt tung styrketräning, minimerar muskelförlusten. Ju mindre underskott, desto lägre andel av viktnedgången blir muskel.", fact: "Måttligt underskott (~0,5–1 % kroppsvikt/vecka) + högt protein + tung träning minimerar muskelförlust under deff.", source: SL("https://www.styrkelabbet.se/deffa/") },
      { level: "etablerad", title: "Underskottets baksida", body: "Ett kaloriunderskott sänker muskelproteinsyntesen — studier har sett minskningar kring 20–30 % — och ger mindre energi till både träning och återhämtning. Sänk därför träningsvolymen i proportion till underskottet och lägg krutet på de tunga baslyften.", fact: "Underskott sänker proteinsyntesen (~20–30 %) och återhämtningen; sänk volymen i proportion och prioritera baslyften.", source: SL("https://www.styrkelabbet.se/traning-under-deff/") },
      { level: "omdiskuterat", title: "Måste man bulka och deffa?", body: "Nybörjare och överviktiga kan ofta bygga muskel och tappa fett samtidigt (recomp), även vid energibalans eller ett lätt underskott. För mer vältränade går det långsammare, och då brukar cykler av deff och bulk vara effektivare — men det bästa upplägget beror på dina mål.", source: SL("https://www.styrkelabbet.se/bulka-bygga-muskler/") },
    ],
  },
  deload: {
    title: "Deload & avlastning",
    tag: "Återhämtning",
    lead: "En planerad lättare period som låter kroppen hämta in trötthet innan den hinner bli ett problem.",
    sections: [
      { level: "etablerad", title: "Vad en deload är", body: "En deload är en planerad vecka (ibland kortare) där du medvetet sänker belastningen så att muskler, leder och nervsystem får återhämta sig efter en period av hård träning. Syftet är att fortsätta utvecklas — inte att vila för vilans skull.", fact: "En deload är en planerad lättare vecka som låter muskler, leder och nervsystem hämta in trötthet efter hård träning.", source: SL("https://www.styrkelabbet.se/plataer-styrketraning/") },
      { level: "tumregel", title: "Hur du gör den", body: "Vanligast är att antingen halvera volymen (antalet set) eller sänka intensiteten (vikten) med runt hälften — sällan bådadera fullt ut samtidigt. Volymminskning passar de flesta; att sänka intensiteten passar den som tränar väldigt tungt.", fact: "Gör en deload genom att ungefär halvera volymen eller sänka vikten ~50 % — sällan båda fullt ut samtidigt." },
      { level: "tumregel", title: "När den behövs", body: "Behovet är individuellt och styrs av hur mycket och hur tungt du tränar — ofta någonstans kring var 4–8:e vecka, och tätare vid låg kaloritillgång eller hög livsstress. Ovanlig svaghet på gymmet, försämrad sömn, irritabilitet och utebliven progression är signaler på att det är dags.", fact: "Deload-behovet är individuellt (ofta ~var 4–8:e vecka); svaghet, dålig sömn, irritation och stagnation är signaler." },
      { level: "etablerad", title: "Hellre för tidigt än för sent", body: "Det är mycket enklare att förebygga trötthet än att gräva sig ur en redan överbelastad kropp. En deload i tid kostar lite och skyddar mot skador, ett uttröttat nervsystem och långa stopp i utvecklingen.", fact: "En deload i tid förebygger skador och överbelastning — billigare än att gräva sig ur en redan uttröttad kropp." },
    ],
  },
  uppvarmning: {
    title: "Uppvärmning",
    tag: "Uppvärmning",
    lead: "Några minuters förberedelse höjer kvaliteten på passet och minskar skaderisken.",
    sections: [
      { level: "etablerad", title: "Varför värma upp", body: "Uppvärmning höjer temperaturen i muskler och leder, förbereder nervsystemet och gör dig mentalt redo. Det är ingen garanti mot skador, men ökar chansen att du presterar bra i arbetsseten och håller dig hel.", fact: "Uppvärmning höjer temperatur, förbereder nervsystemet och sänker skaderisken — samtidigt som prestationen höjs.", source: SL("https://www.styrkelabbet.se/hur-varmer-man-upp-infor-ett-styrketraningspass/") },
      { level: "tumregel", title: "Allmän + specifik", body: "Börja med några minuters lätt allmän aktivitet som höjer kroppstemperaturen tills du fått en lätt svetthinna. Gå sedan över till specifik uppvärmning — samma övning du ska träna, fast lätt — så att rätt muskler och rörelsemönster kopplas in.", fact: "Värm upp allmänt (lätt aktivitet tills lätt svettig) och sedan specifikt i den övning du ska träna.", source: SL("https://www.styrkelabbet.se/mall-for-traningspass/") },
      { level: "tumregel", title: "Stegrande set", body: "Arbeta dig upp till arbetsvikten i steg: börja med tom stång eller mycket lätt vikt och lägg på över några set (t.ex. mot ~50 % och sedan högre). Ju tyngre och mer komplex övningen är, desto fler uppvärmningsset — isolationsövningar sent i passet behöver få eller inga.", fact: "Stega upp till arbetsvikten från tom stång; fler uppvärmningsset ju tyngre/komplex övning, få eller inga på isolation sent i passet.", source: SL("https://www.styrkelabbet.se/hur-varmer-man-upp-infor-ett-styrketraningspass/") },
      { level: "omdiskuterat", title: "Stretching", body: "Statisk stretch värmer inte upp muskeln och kan tillfälligt sänka den maximala kraftutvecklingen om den görs länge precis före tunga lyft. Dynamisk rörlighet fungerar bra i uppvärmningen; spara längre, avancerad mobilitetsträning till andra tillfällen än direkt före passet.", fact: "Statisk stretch värmer inte muskeln och kan sänka maxkraften strax före tunga lyft; dynamisk rörlighet passar bättre.", source: SL("https://www.styrkelabbet.se/hur-varmer-man-upp-infor-ett-styrketraningspass/") },
    ],
  },
  muskler_efter_50: {
    title: "Bygga muskler efter 50",
    tag: "Ålder & träning",
    lead: "Det är aldrig för sent att börja. Du kan bygga muskler och bli starkare oavsett ålder — det krävs bara att du tränar lite smartare.",
    sections: [
      { level: "etablerad", title: "Det går — och det är viktigt", body: "Från 30-årsåldern börjar kroppen långsamt tappa muskelmassa, en process som accelererar med åren. Styrketräning vänder den utvecklingen: forskning visar att både män och kvinnor över 50 bygger muskler och blir starkare, med lika stora relativa ökningar. Det är en av de mest effektiva och säkra sakerna du kan göra för ett friskt åldrande.", fact: "Muskelmassa tappas från ~30 års ålder men styrketräning vänder det — både män och kvinnor över 50 bygger muskel och styrka effektivt.", source: SL("https://www.styrkelabbet.se/bygga-muskler-efter-50/") },
      { level: "etablerad", title: "Vad som skiljer efter 50", body: "Tre saker förändras med åldern: återhämtningen går något långsammare (mindre relevant för styrketräning än för kondition), de muskeluppbyggande hormonerna sjunker, och musklerna svarar lite sämre på träning och protein (\"anabol resistens\"). Allt detta motverkas av en hälsosam, aktiv livsstil och ett tillräckligt högt proteinintag.", fact: "Efter 50 går återhämtningen något långsammare och musklerna svarar lite sämre (anabol resistens) — motverkas av aktiv livsstil och mer protein.", source: SL("https://www.styrkelabbet.se/bygga-muskler-efter-50/") },
      { level: "tumregel", title: "Behöver du läkarkoll först?", body: "För det mesta inte, om du känner dig frisk och symtomfri. Rekommendationen idag är att rådfråga läkare först om du har hjärt-/kärlsjukdom, diabetes eller njursjukdom, eller riskfaktorer som högt kolesterol eller fetma — annars är det fritt fram. Har du en känd sjukdom eller skada: prata med vården först.", fact: "De flesta friska behöver ingen läkarkoll före start; rådfråga läkare vid hjärt-/kärlsjukdom, diabetes, njursjukdom eller riskfaktorer.", source: SL("https://www.styrkelabbet.se/bygga-muskler-efter-50/") },
      { level: "tumregel", title: "Så tränar du", body: "Träna varje muskelgrupp 2–3 gånger i veckan, gärna som helkroppspass byggda på flerledsövningar (knäböj, bänkpress, marklyft, rodd, latsdrag, press). Börja lugnt med ett set per övning och arbeta dig upp till 3–4 set, mot ungefär 10 hårda set per muskel och vecka. Progressiv överbelastning gäller lika mycket som för en 20-åring — sträva alltid efter att göra lite mer över tid.", fact: "2–3 helkroppspass/vecka med flerledsövningar, upp mot ~10 set per muskel/vecka, och progressiv överbelastning — samma princip som för unga.", source: SL("https://www.styrkelabbet.se/bygga-muskler-efter-50/") },
      { level: "tumregel", title: "Belastning, reps & vila", body: "Du bygger muskel över ett brett rep-spann. För äldre ger måttlig belastning med fler reps (håll dig runt 8–15) likvärdig tillväxt som maxtungt, med lägre skaderisk. Att gå ända till failure är inte nödvändigt — lämna hellre ett par reps i tanken. Äldre klarar ofta kortare setvila (1–2 minuter) än yngre, eftersom de långsamma, uttröttningståliga muskelfibrerna blir fler med åldern.", fact: "Ett rep-spann på 8–15 med måttlig belastning bygger lika bra som maxtungt för äldre, med lägre skaderisk; failure är inte nödvändigt.", source: SL("https://www.styrkelabbet.se/bygga-muskler-efter-50/") },
      { level: "tumregel", title: "Protein & tillskott", body: "Äldre behöver mer protein än unga — sikta på minst ~1,7 g/kg kroppsvikt per dygn, gärna upp mot 2–2,2 g/kg för säkerhets skull, fördelat på ~0,4 g/kg var 3:e–4:e timme och gärna ~40 g efter passet. Ät i ett litet kaloriöverskott om du inte är överviktig. Kreatin (5 g/dag monohydrat) och D-vitamin är de mest värdefulla tillskotten för äldre; omega-3 kan hjälpa. (Allmänna riktlinjer, inte medicinsk rådgivning.)", fact: "Efter 50: sikta på minst ~1,7 g protein/kg/dygn (gärna upp mot 2–2,2), ~0,4 g/kg per måltid; kreatin och D-vitamin är mest värdefulla tillskotten.", source: SL("https://www.styrkelabbet.se/bygga-muskler-efter-50/") },
    ],
  },
  kolhydrater: {
    title: "Kolhydrater",
    tag: "Kost",
    lead: "Vän eller fiende för muskler, prestation och deff? Kort svar: kolhydrater är ett utmärkt bränsle — men inte lika avgörande som många tror.",
    sections: [
      { level: "etablerad", title: "Ingen fast rekommendation", body: "Till skillnad från protein finns ingen etablerad kolhydratrekommendation för styrketränande. Siffror som 3–6 g/kg kroppsvikt och dygn förekommer, men de är mest lånade från forskning på konditionsidrott. Kolhydrater lagras som glykogen och är kroppens främsta bränsle vid intensivt arbete.", fact: "Det finns ingen etablerad kolhydratrekommendation för styrketränande; vanliga siffror (3–6 g/kg) är lånade från konditionsforskning.", source: SL("https://www.styrkelabbet.se/kolhydrater/") },
      { level: "etablerad", title: "Påverkar det prestationen?", body: "I kontrollerade studier på styrketränande har låg kolhydrattillgång oftast inte försämrat styrkan eller den muskeluppbyggande signalen — man har till och med kunnat öka i styrka på extrem lågkolhydratkost. Möjligen skulle skillnader kunna visa sig vid mycket intensiv, lång eller frekvent träning, men för de flesta är kolhydratmängden inte avgörande för resultaten i gymmet.", fact: "Låg kolhydrattillgång försämrar oftast inte styrka eller muskeltillväxt i studier — kolhydratmängden är sällan avgörande för resultaten.", source: SL("https://www.styrkelabbet.se/kolhydrater/") },
      { level: "tumregel", title: "Kolhydrater runt passet", body: "Ett kolhydratintag före passet kan hjälpa prestationen om passet är långt (mer än ~50 minuter och fler än 10 set på moderat till hög intensitet), och särskilt om du äter lågkolhydrat till vardags. För kortare, vanliga styrkepass gör timingen liten skillnad.", fact: "Kolhydrat före passet kan hjälpa vid långa pass (>50 min, >10 set) eller om du äter lågkolhydrat annars; annars gör timingen liten skillnad.", source: SL("https://www.styrkelabbet.se/kolhydrater/") },
      { level: "etablerad", title: "Kolhydrater & muskeluppbyggnad", body: "Insulin bygger inte muskel direkt, och det är aminosyror (protein) som startar muskelproteinsyntesen — att lägga kolhydrat till proteinet efter passet ökar inte muskeluppbyggnaden. Muskeltillväxten fungerar dessutom lika bra med låga glykogennivåer. Det är alltså protein som är avgörande efter träning, inte kolhydraterna.", fact: "Att lägga kolhydrat till protein efter passet ökar inte muskeluppbyggnaden; protein driver proteinsyntesen — kolhydrat behövs inte för den.", source: SL("https://www.styrkelabbet.se/kolhydrater/") },
      { level: "tumregel", title: "Deff & påfyllning", body: "Fettförlust styrs av kaloriunderskottet, inte av lågkolhydrat kontra lågfett — med tillräckligt protein avgör din preferens hur du fördelar resten. Eftersom styrketräning är anaerob och inte utnyttjar fett bra som bränsle kan det löna sig att behålla en del kolhydrater för prestationen. Att fylla på glykogen snabbt är sällan bråttom om du inte tränar samma muskler igen inom ett dygn.", fact: "Under deff styr underskottet fettförlusten (inte låg-carb vs låg-fett); behåll gärna en del kolhydrater för prestationen. Snabb påfyllning behövs sällan.", source: SL("https://www.styrkelabbet.se/kolhydrater/") },
      { level: "tumregel", title: "Prova dig fram", body: "Sätt ditt kaloribehov, lägg dig på ett lämpligt proteinintag (från ~1,6 g/kg vid bulk upp mot 2,5 g/kg vid hård deff) och fördela sedan resten av energin mellan kolhydrater och fett efter vad du trivs och presterar bäst på. Basera valen på näringsrik, oraffinerad mat så blir det inte kosten som begränsar dig.", fact: "Sätt kalorier, fyll proteinbehovet, fördela sedan resten fritt mellan kolhydrat och fett efter preferens och prestation — baserat på näringsrik mat.", source: SL("https://www.styrkelabbet.se/kolhydrater/") },
    ],
  },
  alkohol: {
    title: "Alkohol & träning",
    tag: "Hälsa",
    lead: "Måste du välja mellan öl och gains? Nej — men mängden och tajmingen spelar roll. Här är en balanserad bild.",
    sections: [
      { level: "etablerad", title: "Energi & mättnad", body: "Alkohol ger runt 7 kcal/gram, men eftersom en del går åt till att bryta ned den blir bara ~5,7 kcal/gram tillgängligt. Öl, cider och söta drinkar bidrar dessutom med kolhydrater, medan sprit och torrt vin knappt innehåller några. Alkohol mättar dåligt och sänker omdömet, vilket ökar risken att äta mer än planerat — men det är fortfarande energibalansen som styr fettet.", fact: "Alkohol ger ~5,7 kcal/gram tillgängligt, mättar dåligt och kan öka det totala energiintaget — men energibalansen styr fettet.", source: SL("https://www.styrkelabbet.se/alkohol-och-traning/") },
      { level: "etablerad", title: "Fettförbränningen pausas", body: "Så fort du får i dig alkohol prioriterar kroppen att förbränna den, eftersom den ses som ett gift som ska bort. Fettförbränningen sänks då kraftigt — efter ett rejält intag kan fettoxidationen vara nedsatt med runt 80 % i några timmar. Över tid är det ändå energibalansen som avgör din kroppsfettsmängd.", fact: "Medan alkohol finns i kroppen pausas fettförbränningen kraftigt (upp mot ~80 % lägre i några timmar efter ett stort intag).", source: SL("https://www.styrkelabbet.se/alkohol-och-traning/") },
      { level: "etablerad", title: "Testosteron & hormoner", body: "En måttlig mängd påverkar hormonerna lite: cirka tre öl om dagen i tre veckor sänkte testosteronet med bara ~7 % hos män och inte alls hos kvinnor. En rejäl fylla (8–9 öl) sänkte däremot testosteronet med ~23 % i upp till 16 timmar. Måttliga mängder är alltså inget att oroa sig för.", fact: "Måttligt drickande påverkar testosteronet minimalt (~7 %); en rejäl fylla kan sänka det ~23 % i upp till 16 timmar.", source: SL("https://www.styrkelabbet.se/alkohol-och-traning/") },
      { level: "tumregel", title: "Före passet", body: "Stora mängder alkohol före träning dämpar det positiva hormonsvaret från passet (i studier sänkte 0,75 g/kg det tydligt, medan 0,5 g/kg inte gjorde skillnad mot att inte dricka alls). Alkohol försämrar också balans och teknik, vilket ökar skaderisken. Att träna tungt berusad är alltså ingen bra idé.", fact: "Större mängder alkohol före passet dämpar hormonsvaret och försämrar teknik/balans (ökad skaderisk); en liten mängd gör liten skillnad.", source: SL("https://www.styrkelabbet.se/alkohol-och-traning/") },
      { level: "tumregel", title: "Efter passet & att träna bakfull", body: "En stor mängd (5–6 öl) inom en halvtimme efter passet försämrade återhämtningen i studier, medan 2–3 öl inte gjorde det. Du förbränner ungefär 0,1 g alkohol per kilo kroppsvikt i timmen (individuellt), så efter ett par öl går det bra att träna på morgonen, men efter en rejäl fylla kan det behövas nästan ett dygn. Stora mängder stör dessutom sömnen, som är viktig för både muskler och fettförbränning.", fact: "5–6 öl direkt efter passet försämrar återhämtningen (2–3 gör det inte); efter en rejäl fylla kan det ta nästan ett dygn innan alkoholen är ute.", source: SL("https://www.styrkelabbet.se/alkohol-och-traning/") },
      { level: "tumregel", title: "En balanserad syn", body: "De akuta effekterna på fettförbränning, proteinsyntes och styrka är negativa medan du är påverkad — men det fönstret är kort om du inte dricker väldigt mycket. En öl eller ett glas vin då och då förstör inte dina resultat så länge du håller dig inom dina energi- och näringsramar och sköter dig resten av veckan. (Allmän information, inte hälsoråd — alkohol har även andra risker.)", fact: "Enstaka öl eller glas vin förstör inte resultaten om helheten sköts; det är stora, upprepade mängder som ger tydligt negativa effekter.", source: SL("https://www.styrkelabbet.se/alkohol-och-traning/") },
    ],
  },
  kvinnor_bulkmyt: {
    title: "Styrketräning gör dig inte “bulkig”",
    tag: "Kvinnor & träning",
    lead: "En seg myt är att tunga lyft ger stora, manliga muskler. Fysiologin säger något annat.",
    sections: [
      { level: "etablerad", title: "Varför det inte händer av misstag", body: "De flesta kvinnor har en bråkdel av mäns testosteron, vilket kraftigt begränsar hur snabbt och hur mycket muskelmassa som byggs. Tung styrketräning ger starkare, tätare och mer definierad muskulatur, bättre benhälsa och ämnesomsättning — inte oavsiktlig storlek. De som ser mycket muskulösa ut har byggt det med år av riktad träning, kost och volym.", fact: "Kvinnors lägre testosteronnivåer gör att styrketräning ger styrka och definition snarare än oavsiktlig storlek.", source: { name: "muscles.se", url: "https://muscles.se" } },
      { level: "etablerad", title: "Samma principer gäller", body: "Proteinbehov (~1,6–2,2 g/kg vid styrketräning) och progressiv överbelastning gäller kvinnor precis som män. Det finns ingen separat “kvinnoträning” med bara lätta vikter och många reps som skulle vara mer lämplig — att lyfta tungt nog för att utmanas ger styrka och skyddar benhälsan, extra värdefullt genom klimakteriet när östrogenet sjunker.", fact: "Proteinbehov och progressiv överbelastning är desamma för kvinnor; tung träning skyddar särskilt benhälsan genom klimakteriet.", source: { name: "muscles.se", url: "https://muscles.se" } },
    ],
  },
  kvinnor_menscykel: {
    title: "Att träna med menscykeln",
    tag: "Kvinnor & träning",
    lead: "Hormonerna svänger över cykeln och kan påverka energi och återhämtning — men mönstret är individuellt.",
    sections: [
      { level: "omdiskuterat", title: "Faserna i praktiken", body: "Många upplever mest ork och styrka i follikelfasen (efter mens fram till ägglossning) och en dipp premenstruellt (sena lutealfasen). Pragmatiskt: planera gärna tyngre pass när du känner dig stark och var snäll mot dig själv med lättare pass eller mer vila när energin är låg. Det finns ingen anledning att sluta träna under mens om du mår bra — rörelse kan tvärtom lindra besvär.", fact: "Energi och styrka toppar ofta i follikelfasen och kan dippa premenstruellt, men mönstret varierar mycket mellan individer.", source: { name: "muscles.se", url: "https://muscles.se" } },
      { level: "tumregel", title: "Använd spårningen som fingervisning", body: "ATLAS cykelspårning (Profil → Menscykel) uppskattar din fas och justerar readiness lätt därefter. Se det som en påminnelse, inte en dom — din egen upplevelse i stunden väger alltid tyngst.", fact: "Cykelspårningen ger en fingervisning om fasen; den egna upplevelsen väger tyngst.", source: { name: "muscles.se", url: "https://muscles.se" } },
    ],
  },
  kvinnor_jarn_reds: {
    title: "Järn och energitillgång (RED-S)",
    tag: "Kvinnor & träning",
    lead: "Två saker att hålla koll på som menstruerande och tränande: järn och att äta tillräckligt.",
    sections: [
      { level: "etablerad", title: "Järn", body: "Menstruation innebär månatlig järnförlust och större risk för järnbrist, som ger trötthet och sämre träningskapacitet. Bra källor är rött kött, lever, baljväxter och mörkgröna blad; C-vitamin till måltiden ökar upptaget.", fact: "Menstruerande har högre järnbehov; brist ger trötthet och sämre kapacitet, och C-vitamin ökar upptaget.", source: { name: "muscles.se", url: "https://muscles.se" } },
      { level: "etablerad", title: "Låg energitillgång (RED-S)", body: "Äter man för lite i förhållande till träningen kan man hamna i låg energitillgång (RED-S), vilket kan störa menscykeln, försämra benhälsan och bromsa framsteg. Uteblivna eller oregelbundna menstruationer hos den som tränar är en varningssignal värd att ta på allvar.", fact: "För lågt energiintag (RED-S) kan störa menscykel, benhälsa och prestation; uteblivna mens hos tränande är en varningssignal.", source: { name: "muscles.se", url: "https://muscles.se" }, medical: true },
    ],
  },
  kvinnor_backenbotten: {
    title: "Bäckenbotten och tunga lyft",
    tag: "Kvinnor & träning",
    lead: "Bäckenbotten samspelar med bålen vid tunga lyft — och besvär går oftast att förbättra.",
    sections: [
      { level: "tumregel", title: "Andning och belastning", body: "Läckage vid hopp, lyft eller hosta är vanligt men inte något du behöver acceptera som normalt. Kontrollerad andning (andas ut i den tunga delen av lyftet i stället för att pressa hårt nedåt) och att bygga belastning gradvis hjälper.", fact: "Läckage vid lyft är vanligt men går oftast att förbättra med kontrollerad andning och gradvis ökad belastning.", source: { name: "muscles.se", url: "https://muscles.se" } },
      { level: "tumregel", title: "När du bör söka hjälp", body: "Efter graviditet, eller vid läckage, tyngdkänsla eller smärta, är en fysioterapeut specialiserad på bäckenbotten rätt väg. Träningen kan nästan alltid anpassas snarare än stoppas helt.", fact: "Vid läckage, tyngdkänsla eller smärta — eller efter graviditet — bör en bäckenbotten-fysioterapeut kopplas in; träningen kan oftast anpassas.", source: { name: "muscles.se", url: "https://muscles.se" }, medical: true },
    ],
  },
  kvinnor_klimakteriet: {
    title: "Styrketräning genom klimakteriet",
    tag: "Kvinnor & träning",
    lead: "När östrogenet sjunker ökar risken för benskörhet och muskelförlust — styrketräning är ett av de mest effektiva motmedlen.",
    sections: [
      { level: "etablerad", title: "Skelett och muskler", body: "När östrogennivåerna sjunker förlorar skelettet benmassa snabbare och muskelförlusten påskyndas, samtidigt som fett lättare lagras. Styrketräning stimulerar benbildningen och bevarar muskelmassa, vilket motverkar båda och samtidigt förbättrar insulinkänslighet och ämnesomsättning.", fact: "Lägre östrogen påskyndar ben- och muskelförlust; styrketräning stimulerar benbildning och bevarar muskelmassa.", source: { name: "forskning.se", url: "https://forskning.se/2019/07/10/styrketraning-kan-hjalpa-mot-klimakterieproblem/" } },
      { level: "etablerad", title: "Vallningar och mående", body: "En svensk studie (Linköpings universitet, publicerad i Maturitas 2019) fann att kvinnor som styrketränade två till tre gånger i veckan i femton veckor minskade sina värmevallningar med i snitt runt 44 procent. Träningen behöver vara tillräckligt ansträngande för att höja pulsen och framkalla svettning för att ge effekt på besvären.", fact: "Styrketräning 2–3 ggr/vecka minskade värmevallningar med i snitt ~44 % i en svensk studie; effekten kräver ansträngande pass.", source: { name: "forskning.se", url: "https://forskning.se/2019/07/10/styrketraning-kan-hjalpa-mot-klimakterieproblem/" } },
      { level: "tumregel", title: "Så lägger du upp den", body: "Prioritera de stora muskelgrupperna (ben, säte, rygg, bröst och bål) och lyft tungt nog att det känns utmanande men säkert. När östrogenet minskar svarar kroppen ofta bra på färre men tyngre repetitioner. Vid låg energi eller dålig sömn: dra ned på antalet pass snarare än på tyngden, och ta längre pauser mellan seten.", fact: "Fokusera på stora muskelgrupper och tunga lyft; vid låg energi, minska antalet pass snarare än belastningen.", source: SL("https://www.styrkelabbet.se/styrketraning-och-klimakterieproblem/") },
    ],
  },
  kvinnor_kreatin: {
    title: "Kreatin för kvinnor",
    tag: "Kvinnor & träning",
    lead: "Kreatin har länge setts som ett “killtillskott” — men det fungerar lika bra för kvinnor, och flera fördelar är minst lika relevanta.",
    sections: [
      { level: "etablerad", title: "Effekt och dos", body: "Kreatinmonohydrat i dosen 3–5 gram per dag förbättrar styrka och prestation vid högintensiv träning — även för kvinnor. Ingen uppladdningsfas behövs; det är det dagliga intaget över tid som fyller musklernas depåer. Monohydrat är den mest beforskade och kostnadseffektiva formen; dyrare varianter har inte visats bättre.", fact: "Kreatinmonohydrat 3–5 g/dag förbättrar styrka och högintensiv prestation även hos kvinnor; ingen uppladdning behövs.", source: SL("https://www.styrkelabbet.se/kreatin/") },
      { level: "etablerad", title: "Vattenvikt, inte fett", body: "En vanlig oro är att kreatin gör att man går upp i vikt. Den lilla ökningen i början (ofta ~0,5–2 kg) är vatten som binds i musklerna, inte kroppsfett, och stabiliseras efter de första veckorna.", fact: "Den tidiga viktökningen av kreatin är vatten i musklerna (~0,5–2 kg), inte fett, och planar ut.", source: { name: "Tyngre", url: "https://tyngre.se/artiklar/kost/kreatin-for-kvinnor-allt-du-behover-veta" } },
      { level: "omdiskuterat", title: "Extra relevant med åldern", body: "Hos kvinnor efter klimakteriet tyder forskning på att kreatin i kombination med styrketräning kan stödja muskelstyrka, funktion och benhälsa. Möjliga kognitiva effekter studeras men är fortfarande tidiga — inget att lova.", fact: "Efter klimakteriet kan kreatin + styrketräning stödja styrka och benhälsa; kognitiva effekter är lovande men tidiga.", source: SL("https://www.styrkelabbet.se/kreatin/") },
    ],
  },
  kvinnor_graviditet: {
    title: "Träning under och efter graviditet",
    tag: "Kvinnor & träning",
    lead: "För de flesta är träning under graviditeten både säkert och rekommenderat — anpassad efter fas och dagsform.",
    sections: [
      { level: "etablerad", title: "Under graviditeten", body: "Regelbunden fysisk aktivitet under graviditeten är i de allra flesta fall säkert och rekommenderas, och det finns inget som tyder på högre risk vid måttlig träning. Håll måttlig intensitet (du ska bli varm och andfådd men kunna föra ett samtal), fokusera på teknik framför maximal belastning, och träna bäckenbotten. Var graviditet är unik — rådgör med barnmorska eller läkare, särskilt vid komplikationer eller om du är osäker.", fact: "Måttlig träning under graviditeten är för de flesta säkert och rekommenderat; håll intensiteten måttlig och rådgör med vården vid osäkerhet.", source: SL("https://www.styrkelabbet.se/styrketraning-under-graviditeten/"), medical: true },
      { level: "tumregel", title: "Efter förlossningen", body: "Återgången sker i etapper — kroppen har varit försvagad och behöver bygga upp styrkan på nytt. Börja med bäckenbotten (knipövningar) och skonsam bål-aktivering samt promenader, och öka gradvis. Vid läckage, tyngdkänsla, smärta eller misstänkt delning av magmusklerna (diastas): sök en fysioterapeut för individuell bedömning.", fact: "Bygg upp träningen i etapper efter förlossning, börja med bäckenbotten och bål; sök fysioterapeut vid läckage, smärta eller diastas.", source: { name: "1177 / Apohem", url: "https://www.apohem.se/tips-rad/traning-motion/trana-efter-forlossning" }, medical: true },
    ],
  },
  kvinnor_benskorhet: {
    title: "Styrketräning mot benskörhet",
    tag: "Kvinnor & träning",
    lead: "Ungefär varannan svensk kvinna över 50 får någon gång en fraktur kopplad till benskörhet — och belastande träning är ett av de bästa icke-medicinska skydden.",
    sections: [
      { level: "etablerad", title: "Belastning bygger ben", body: "Skelettet är levande vävnad som svarar på belastning. Viktbärande träning och styrketräning stimulerar benbildningen, och fysiskt aktiva äldre drabbas av färre höftfrakturer än inaktiva. De första åren efter klimakteriet kan benmassan minska med upp till omkring tre procent per år, vilket gör regelbunden belastning extra viktig då.", fact: "Viktbärande träning och styrketräning stimulerar benbildning; benmassan kan minska upp till ~3 %/år de första åren efter klimakteriet.", source: { name: "Vetenskap & hälsa (Lunds universitet)", url: "https://www.vetenskaphalsa.se/regelbunden-jogging-forebygger-benskorhet/" } },
      { level: "etablerad", title: "Vad forskningen visar", body: "Enligt FYSS (Sveriges kunskapsstöd för fysisk aktivitet) kan styrketräning omkring 40–60 minuter två gånger i veckan under några månader förbättra livskvalitet och minska smärta hos medelålders och äldre kvinnor med osteopeni eller osteoporos. Progressiv, belastande träning (successivt mot 60–85 % av 1RM) rekommenderas.", fact: "FYSS: styrketräning ~40–60 min 2 ggr/vecka kan förbättra livskvalitet och minska smärta vid osteopeni/osteoporos.", source: { name: "FYSS", url: "http://www.fyss.se/wp-content/uploads/2018/01/Osteoporos-1.pdf" } },
      { level: "tumregel", title: "Säkert att lyfta – med teknik", body: "Även högintensiv styrketräning har i studier (t.ex. LIFTMOR) visat sig säker för postmenopausala kvinnor med låg benmassa, utan ökad frakturrisk. Börja ändå under handledning med god teknik, och vid uttalad osteoporos: var försiktig med snabba, oskyddade framåtböjningar och vridningar av ryggen. Rådgör med vården vid diagnos.", fact: "Högintensiv styrketräning har visats säker även vid låg benmassa (LIFTMOR); börja med god teknik och rådgör med vården vid osteoporos.", source: { name: "Physiotutors (LIFTMOR)", url: "https://www.physiotutors.com/sv/strong-steady-and-straight-physical-activity-and-exercise-recommendations-for-osteoporosis/" }, medical: true },
    ],
  },
  kvinnor_pcos: {
    title: "Träning vid PCOS",
    tag: "Kvinnor & träning",
    lead: "PCOS går inte att bota, men träning — särskilt styrketräning — är en av de mest effektiva långsiktiga behandlingarna för symtom och metabol hälsa.",
    sections: [
      { level: "etablerad", title: "Insulinkänslighet i fokus", body: "Många med PCOS har insulinresistens, där kroppens celler svarar sämre på insulin. Styrketräning ökar muskelmassan och förbättrar insulinkänsligheten, vilket sänker insulinnivåerna och kan dämpa androgena besvär och hjälpa till att reglera menstruationscykeln.", fact: "Styrketräning förbättrar insulinkänsligheten vid PCOS, vilket kan sänka insulin och androgena besvär.", source: { name: "BakingBabies (fysioterapi)", url: "https://bakingbabies.se/2026/02/02/pcos-vad-kan-traning-och-rorelse-gora/" } },
      { level: "etablerad", title: "Vad riktlinjerna säger", body: "Internationella riktlinjer lyfter livsstil — träning i sig eller träning kombinerat med kost och beteendestöd — som en grundpelare i PCOS-behandlingen, och vinsterna finns även utan viktnedgång. En kombination av konditionsträning och styrketräning rekommenderas för bäst metabol och hormonell effekt.", fact: "Riktlinjer: livsstil/träning är en grundpelare vid PCOS, med vinster även utan viktnedgång; kombinera kondition och styrka.", source: { name: "IntensivePT", url: "https://www.intensivept.se/blogg/2026/4/11/trning-med-pcos" } },
      { level: "tumregel", title: "Lägg upp den hållbart", body: "Sikta på 2–3 styrkepass i veckan plus regelbunden kondition, och välj former du kan hålla i över tid — regelbundenhet slår perfektion. Träning botar inte PCOS, men är en av de mest effektiva långsiktiga insatserna. Rådgör med vården eller en fysioterapeut för ett individuellt upplägg.", fact: "2–3 styrkepass/vecka + kondition, hållbart över tid; träning botar inte PCOS men är en effektiv långsiktig insats.", source: { name: "BakingBabies (fysioterapi)", url: "https://bakingbabies.se/2026/02/02/pcos-vad-kan-traning-och-rorelse-gora/" }, medical: true },
    ],
  },
  kvinnor_ppiller: {
    title: "P-piller och träning",
    tag: "Kvinnor & träning",
    lead: "En vanlig oro är att hormonella preventivmedel skulle försämra träningen — men forskningen ger inget tydligt stöd för det.",
    sections: [
      { level: "etablerad", title: "Påverkar de styrkan?", body: "Forskningen hittills tyder på att hormonella preventivmedel varken tydligt förbättrar eller försämrar styrka och prestation, åtminstone vid relativt låg dosering. I studier blev både p-pilleranvändare och icke-användare starkare av samma träning — det var träningen som gjorde jobbet.", fact: "Hormonella preventivmedel verkar varken tydligt förbättra eller försämra styrka; det är träningen som ger effekten.", source: SL("https://www.styrkelabbet.se/hormonella-preventivmedel-och-traning/") },
      { level: "etablerad", title: "Prestation och vikt", body: "Kvinnliga idrottare behöver enligt forskningen inte oroa sig för att p-piller ska sänka prestationen, och någon säker viktökning som påverkar prestationen har inte kunnat visas. P-piller kan dessutom minska risken för anemi vid rikliga blödningar och används ibland för att styra när mensen kommer.", fact: "P-piller sänker inte idrottsprestationen enligt forskning, och kan minska anemirisk vid rikliga blödningar.", source: { name: "Idrottsforskning.se", url: "https://www.idrottsforskning.se/p-piller-inget-hinder-for-bra-idrottsprestationer/" } },
      { level: "omdiskuterat", title: "Bra att veta", body: "Kortisol (ett stresshormon) kan vara generellt högre hos p-pilleranvändare — tolka inte förhöjda värden som överträning per automatik. Hormoner är komplexa och större studier behövs för säkra slutsatser; individuellt gensvar varierar. Rådgör med vården om preventivmedel och hälsa.", fact: "Kortisol kan vara generellt högre med p-piller — inte nödvändigtvis ett tecken på överträning; större studier behövs.", source: { name: "forskning.se", url: "https://www.forskning.se/2016/09/20/effektivast-styrketraning-veckorna-efter-mens/" }, medical: true },
    ],
  },
};
export function hasTopic(id) { return !!TOPICS[id]; }
// Citerbara meningar ur en träningsprincip (TOPICS) — coachen plockar korta, verifierade rader.
// Default tar med både etablerad fysiologi och tumregler (principerna är råd, inte medicinska påståenden).
export function citableTopic(id, { levels = ["etablerad", "tumregel"] } = {}) {
  const t = TOPICS[id]; if (!t) return [];
  return t.sections
    .filter(s => s.fact && levels.includes(s.level))
    .map(s => ({ fact: s.fact, level: s.level, title: s.title, source: s.source || null }));
}
export function citableFacts(muscleId, { levels = ["etablerad"], categories = null } = {}) {
  const k = KNOWLEDGE[muscleId]; if (!k) return [];
  return k.entries
    .filter(e => e.fact && levels.includes(e.level) && (!categories || categories.includes(e.category)))
    .map(e => ({ fact: e.fact, level: e.level, category: e.category, medical: !!CATEGORIES[e.category].medical, source: e.source || null }));
}
export function hasKnowledge(muscleId) { return !!KNOWLEDGE[muscleId]; }
