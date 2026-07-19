// DATA: kosttillskott — katalog för loggning + behovs-rådgivare.
// Evidensnivåer är ärliga och avsiktligt återhållsamma. Inget här är medicinsk rådgivning.
export const SUPPLEMENTS = [
  // ── Prestation ──
  { id: "creatine", name: "Kreatin monohydrat", dose: "3–5 g/dag", cat: "Prestation", evidence: "stark",
    note: "Ett av de mest beforskade tillskotten för styrka och högintensiv träning. Fungerar lika bra för kvinnor; ingen uppladdning behövs. Den lilla tidiga viktökningen är vatten, inte fett." },
  { id: "caffeine", name: "Koffein", dose: "~3 mg/kg före pass", cat: "Prestation", evidence: "stark",
    note: "Väldokumenterat prestationshöjande före träning. Undvik sent på dagen — stör sömnen." },
  { id: "beta_alanine", name: "Beta-alanin", dose: "3–6 g/dag", cat: "Prestation", evidence: "medel",
    note: "Kan förbättra prestation i högintensiva intervall på ~1–4 minuter. Ger ibland stickningar i huden — ofarligt." },
  { id: "citrulline", name: "Citrullinmalat", dose: "6–8 g före pass", cat: "Prestation", evidence: "medel",
    note: "Kan ge bättre 'pump' och något fler reps i högreps-set. Blygsam effekt." },
  { id: "eaa", name: "EAA (essentiella aminosyror)", dose: "vid behov kring pass", cat: "Prestation", evidence: "svag",
    note: "Praktiskt kring pass, men når du ditt proteinmål tillför de sällan något extra." },
  { id: "preworkout", name: "Pre-workout", dose: "1 dos före pass", cat: "Prestation", evidence: "medel",
    note: "Oftast koffein + beta-alanin + citrullin. Kolla innehållet så du inte dubblar koffein." },
  // ── Protein ──
  { id: "protein", name: "Proteinpulver (vassle)", dose: "vid behov", cat: "Protein", evidence: "stark",
    note: "Ett bekvämt sätt att nå proteinmålet — inte magiskt, riktig mat fungerar lika bra." },
  { id: "casein", name: "Kasein", dose: "vid behov", cat: "Protein", evidence: "medel",
    note: "Långsamt protein — kan passa som sista mål på dagen. Ingen fördel mot annan proteinkälla i övrigt." },
  { id: "collagen", name: "Kollagen", dose: "10–15 g + C-vitamin", cat: "Protein", evidence: "situationsberoende",
    note: "Visst stöd för sen- och ledbesvär när det tas med C-vitamin runt belastning. Bygger inte muskler som vanligt protein." },
  // ── Vitamin ──
  { id: "vitd", name: "D-vitamin", dose: "~10 µg/dag", cat: "Vitamin", evidence: "stark",
    note: "Relevant i Sverige, särskilt oktober–mars när solen inte räcker för egen produktion." },
  { id: "vitc", name: "C-vitamin", dose: "~75–100 mg", cat: "Vitamin", evidence: "medel",
    note: "De flesta får nog via frukt och grönt; tillskott mest vid lågt intag." },
  { id: "vitk2", name: "K2-vitamin", dose: "~90–120 µg", cat: "Vitamin", evidence: "medel",
    note: "Samspelar med D-vitamin för benhälsa; oftast mest relevant ihop med D." },
  { id: "b12", name: "B12", dose: "vid växtbaserad kost", cat: "Vitamin", evidence: "stark", medical: true,
    note: "B12 finns nästan bara i animaliska livsmedel — vegansk eller mycket växtbaserad kost kräver tillskott." },
  { id: "bcomplex", name: "B-vitaminkomplex", dose: "1/dag", cat: "Vitamin", evidence: "svag",
    note: "Sällan nödvändigt vid varierad kost; kan vara aktuellt vid ensidig eller växtbaserad kost." },
  { id: "folate", name: "Folsyra", dose: "400 µg (mer vid graviditetsönskan)", cat: "Vitamin", evidence: "stark", medical: true,
    note: "Rekommenderas till den som planerar eller kan bli gravid, gärna redan innan." },
  // ── Mineral ──
  { id: "iron", name: "Järn", dose: "endast vid konstaterad brist", cat: "Mineral", evidence: "situationsberoende", medical: true,
    note: "Ta inte järn i onödan — överskott är skadligt. Testa via vården först. Extra relevant vid menstruation eller lågt intag." },
  { id: "magnesium", name: "Magnesium", dose: "~200–350 mg", cat: "Mineral", evidence: "medel",
    note: "Kan hjälpa vid muskelkramp och sömn; de flesta får dock i sig tillräckligt via kosten." },
  { id: "calcium", name: "Kalcium", dose: "~500 mg vid behov", cat: "Mineral", evidence: "medel",
    note: "Främst om du undviker mejeri. Viktigt för benhälsan, särskilt genom klimakteriet." },
  { id: "zinc", name: "Zink", dose: "~10 mg vid behov", cat: "Mineral", evidence: "medel",
    note: "Vanligt att få nog via kött och baljväxter; tillskott mest vid ensidig kost." },
  { id: "electrolytes", name: "Elektrolyter", dose: "vid svettiga/långa pass", cat: "Mineral", evidence: "medel",
    note: "Natrium, kalium och magnesium vid mycket svettning eller långa pass; sällan nödvändigt annars." },
  // ── Fett ──
  { id: "omega3", name: "Omega-3 (fiskolja/alg)", dose: "~250–500 mg EPA+DHA", cat: "Fett", evidence: "medel",
    note: "Främst om du sällan äter fet fisk (lax, makrill, sill). Algolja är ett vegetariskt alternativ." },
  // ── Sömn & återhämtning ──
  { id: "melatonin", name: "Melatonin", dose: "0,5–3 mg före sömn", cat: "Sömn & återhämtning", evidence: "medel", medical: true,
    note: "Kan hjälpa vid sömnproblem eller jetlag; receptfritt i låg dos. Använd vid behov, inte som slentrian." },
  { id: "ashwagandha", name: "Ashwagandha", dose: "300–600 mg", cat: "Sömn & återhämtning", evidence: "svag",
    note: "Adaptogen med visst stöd för upplevd stress och sömn; effektstorleken är osäker." },
  // ── Övrigt ──
  { id: "multivitamin", name: "Multivitamin", dose: "1/dag", cat: "Övrigt", evidence: "svag",
    note: "En billig försäkring vid ensidig kost, men ersätter inte varierad mat." },
  { id: "probiotics", name: "Probiotika", dose: "1/dag", cat: "Övrigt", evidence: "svag",
    note: "Kan hjälpa magen hos vissa; effekten är stamspecifik och varierar mellan personer." },
];
export const SUPP_BY_ID = Object.fromEntries(SUPPLEMENTS.map(s => [s.id, s]));
// Svenska kosttillskottsmärken (marknadsöversikt 2026) — för att tagga loggade tillskott.
// Bara varumärken vars kärna är faktiska tillskott. Färdiga proteinprodukter och
// funktionsdrycker (NOCCO, Barebells, Vitamin Well, ProPud, Maurten) är livsmedel → matloggen.
export const SUPP_BRANDS = [
  "Star Nutrition", "GAAM", "Body Science", "Tyngre", "Core", "Swedish Supplements",
  "Holistic", "Better You", "Elexir Pharma", "BioSalma",
];
export const SUPP_CATS = ["Prestation", "Protein", "Vitamin", "Mineral", "Fett", "Sömn & återhämtning", "Övrigt"];
export const SUPP_EVIDENCE = {
  stark: { label: "Stark evidens", c: "#39D98A" },
  medel: { label: "Medel evidens", c: "#4DA3FF" },
  situationsberoende: { label: "Situationsberoende", c: "#FFD166" },
  svag: { label: "Svag evidens", c: "#FF9F43" },
};
