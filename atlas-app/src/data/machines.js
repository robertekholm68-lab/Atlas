// DATA: märkes- och gym-specifik maskindatabas (separat lager ovanpå övningsbiblioteket)
// ── Hierarki: gymkedja → klubb → utrustningsmärke → produktserie/modell → kanonisk maskintyp → övningar ──
// Befintliga övnings-ID (EXERCISES) och muskel-ID (MUSCLES) återanvänds oförändrade.
// Maskinvikter är INTE jämförbara mellan märken/modeller — PR & progression lagras per machineModelId.

export const RESISTANCE_TYPES = {
  selectorized: "Viktmagasin (selectorized)",
  "plate-loaded": "Viktskivor (plate-loaded)",
  cable: "Kabel",
  "bodyweight-assisted": "Kroppsvikt / assisterad",
  "free-weight": "Fria vikter (rack/Smith)",
};

// ── Utrustningsmärken (produktmärke; manufacturer = moderbolag där det skiljer) ──
export const MACHINE_BRANDS = [
  { id: "technogym", name: "Technogym", manufacturer: "Technogym", country: "IT", note: "Selectorized & plate-loaded, premiumkedjor." },
  { id: "life_fitness", name: "Life Fitness", manufacturer: "Life Fitness", country: "US", note: "Bred selectorized-linje." },
  { id: "hammer_strength", name: "Hammer Strength", manufacturer: "Life Fitness", country: "US", note: "Plate-loaded & iso-lateral; ägs av Life Fitness." },
  { id: "gymleco", name: "Gymleco", manufacturer: "Gymleco", country: "SE", note: "Svensk tillverkare, plate-loaded & selectorized." },
  { id: "matrix", name: "Matrix", manufacturer: "Johnson Health Tech", country: "TW", note: "Selectorized & Ultra-serien plate-loaded." },
  { id: "cybex", name: "Cybex", manufacturer: "Life Fitness", country: "US", note: "Eagle NX-serien; ägs av Life Fitness." },
  { id: "eleiko", name: "Eleiko", manufacturer: "Eleiko", country: "SE", note: "Fria vikter & racks snarare än maskiner." },
  { id: "panatta", name: "Panatta", manufacturer: "Panatta", country: "IT", note: "Freeweight- & plate-loaded-specialist." },
  { id: "nautilus", name: "Nautilus", manufacturer: "Nautilus Inc.", country: "US", note: "Klassisk selectorized-linje." },
  { id: "hoist", name: "Hoist", manufacturer: "Hoist Fitness", country: "US", note: "RocIt / Dual-serien." },
  { id: "precor", name: "Precor", manufacturer: "Precor", country: "US", note: "Selectorized & Discovery-serien." },
  { id: "booty_builder", name: "Booty Builder", manufacturer: "Booty Builder", country: "SE", note: "Höft-/glutespecialist (Glute Drive m.m.)." },
  { id: "lk", name: "LK", manufacturer: "LK", country: "SE", note: "Svensk gymutrustning, plate-loaded & selectorized." },
  { id: "thor_fitness", name: "Thor Fitness", manufacturer: "Thor Fitness", country: "SE", note: "Svensk tillverkare, racks & plate-loaded." },
];

// ── Kanoniska maskintyper ──
// Seedade från Fitness24Sevens publicerade styrkemaskinlista (seeded: true),
// därefter vanliga tillägg (hack/pendel/bältesknäböj, assisterad dip/chin, pullover, high row, glute drive).
// Varje typ bär defaults för exercises/muscles/setup/adjustments/commonErrors/alternatives (typeId).
// En modell ärver dessa och överlagrar bara det som skiljer (se resolveModel i engines/machines.js).
export const MACHINE_TYPES = [
  { id: "lat_pulldown", name: "Latsdrag", en: "Lat Pulldown", category: "Back", pattern: "Vertical Pull", resistanceDefault: "selectorized", seeded: true,
    exercises: ["wide_pulldown", "close_pulldown", "reverse_pulldown"], muscles: [{ muscleId: "latissimus_dorsi", factor: 1 }, { muscleId: "biceps_brachii", factor: 0.5 }, { muscleId: "trapezius", factor: 0.4 }, { muscleId: "deltoid_posterior", factor: 0.3 }],
    setup: ["Ställ lårstödet så knäna sitter stadigt", "Greppa stången utanför axelbredd"], adjustments: ["Lårstöd", "Sitshöjd", "Greppbredd/handtag"], commonErrors: ["Luta bålen för långt bak", "Dra med armarna i stället för ryggen"], alternatives: ["assisted_dip_chin", "high_row", "pullover"] },
  { id: "seated_row", name: "Sittande rodd", en: "Seated Row", category: "Back", pattern: "Horizontal Pull", resistanceDefault: "selectorized", seeded: true,
    exercises: ["seated_cable_row", "chest_supported_row"], muscles: [{ muscleId: "latissimus_dorsi", factor: 0.9 }, { muscleId: "trapezius", factor: 0.7 }, { muscleId: "biceps_brachii", factor: 0.5 }, { muscleId: "deltoid_posterior", factor: 0.4 }],
    setup: ["Bröstet mot dynan om sådan finns", "Fötter stadigt, lätt böjda knän"], adjustments: ["Bröststöd", "Sitshöjd", "Handtag"], commonErrors: ["Rycka med hela kroppen", "Runda ryggen"], alternatives: ["lat_pulldown", "high_row"] },
  { id: "high_row", name: "High row", en: "High Row", category: "Back", pattern: "Horizontal Pull", resistanceDefault: "plate-loaded",
    exercises: ["seated_cable_row", "chest_supported_row"], muscles: [{ muscleId: "latissimus_dorsi", factor: 0.9 }, { muscleId: "trapezius", factor: 0.7 }, { muscleId: "deltoid_posterior", factor: 0.5 }, { muscleId: "biceps_brachii", factor: 0.4 }],
    setup: ["Bröstet mot dynan", "Greppa högt, dra ner och bak"], adjustments: ["Sitshöjd", "Bröststöd"], commonErrors: ["För kort rörelsebana", "Dra med armarna"], alternatives: ["seated_row", "lat_pulldown"] },
  { id: "chest_press", name: "Bröstpress", en: "Chest Press", category: "Chest", pattern: "Horizontal Push", resistanceDefault: "selectorized", seeded: true,
    exercises: ["chest_press_machine", "db_bench_press"], muscles: [{ muscleId: "pectoralis_major", factor: 1 }, { muscleId: "triceps_brachii", factor: 0.5 }, { muscleId: "deltoid_anterior", factor: 0.5 }],
    setup: ["Ställ sitsen så handtagen är i brösthöjd", "Rygg mot dynan, skulderblad ihop"], adjustments: ["Sitshöjd", "Startläge/ROM"], commonErrors: ["För hög sits (axelbelastning)", "Låsa ut hårt"], alternatives: ["pec_deck", "chest_press"] },
  { id: "pec_deck", name: "Pec deck", en: "Pec Deck", category: "Chest", pattern: "Fly", resistanceDefault: "selectorized", seeded: true,
    exercises: ["pec_deck"], muscles: [{ muscleId: "pectoralis_major", factor: 1 }, { muscleId: "deltoid_anterior", factor: 0.3 }],
    setup: ["Sitshöjd så armarna är i brösthöjd", "Rygg mot dynan"], adjustments: ["Sitshöjd", "Startvinkel"], commonErrors: ["För stort ROM (axeln)", "Använda för tung vikt"], alternatives: ["chest_press"] },
  { id: "shoulder_press", name: "Axelpress", en: "Shoulder Press", category: "Shoulders", pattern: "Vertical Push", resistanceDefault: "selectorized", seeded: true,
    exercises: ["db_shoulder_press", "smith_shoulder_press", "ohp"], muscles: [{ muscleId: "deltoid_anterior", factor: 1 }, { muscleId: "deltoid_lateral", factor: 0.6 }, { muscleId: "triceps_brachii", factor: 0.5 }],
    setup: ["Sitshöjd så handtagen är i axelhöjd", "Rygg mot dynan, spänd bål"], adjustments: ["Sitshöjd", "Handtag/greppvinkel"], commonErrors: ["Svanka i ryggen", "För djupt startläge för axeln"], alternatives: ["chest_press"] },
  { id: "triceps_press", name: "Tricepspress", en: "Triceps Press", category: "Arms", pattern: "Isolation", resistanceDefault: "selectorized", seeded: true,
    exercises: ["triceps_pushdown"], muscles: [{ muscleId: "triceps_brachii", factor: 1 }],
    setup: ["Sitshöjd så armbågarna är stödda", "Fäst greppet"], adjustments: ["Sitshöjd", "Handtag"], commonErrors: ["Använda axlarna", "Halvt rörelseomfång"], alternatives: ["assisted_dip_chin"] },
  { id: "biceps_curl", name: "Bicepscurl", en: "Biceps Curl", category: "Arms", pattern: "Curl", resistanceDefault: "selectorized", seeded: true,
    exercises: ["cable_curl", "preacher_curl"], muscles: [{ muscleId: "biceps_brachii", factor: 1 }, { muscleId: "forearms", factor: 0.3 }],
    setup: ["Överarmarna mot dynan", "Sitshöjd så axeln är avslappnad"], adjustments: ["Sitshöjd", "Handtag"], commonErrors: ["Lyfta armbågarna från dynan", "Studsa i botten"], alternatives: [] },
  { id: "leg_press", name: "Benpress", en: "Leg Press", category: "Legs", pattern: "Leg Press", resistanceDefault: "plate-loaded", seeded: true,
    exercises: ["leg_press"], muscles: [{ muscleId: "quadriceps", factor: 1 }, { muscleId: "gluteals", factor: 0.7 }, { muscleId: "hamstrings", factor: 0.3 }, { muscleId: "adductors", factor: 0.3 }],
    setup: ["Fötter axelbrett mitt på plattan", "Ryggen mot stödet, släpp säkerhetsspärrarna"], adjustments: ["Ryggstödsvinkel", "Fotplacering"], commonErrors: ["Böja för djupt så ländryggen lyfter", "Låsa knäna hårt"], alternatives: ["hack_squat", "pendulum_squat", "belt_squat"] },
  { id: "leg_extension", name: "Benspark", en: "Leg Extension", category: "Legs", pattern: "Extension", resistanceDefault: "selectorized", seeded: true,
    exercises: ["leg_extension"], muscles: [{ muscleId: "quadriceps", factor: 1 }],
    setup: ["Knäleden i linje med maskinens vridpunkt", "Vristkudden strax ovanför foten"], adjustments: ["Ryggstöd", "Vristkudde", "ROM-begränsare"], commonErrors: ["Studsa i toppen", "För tung vikt → knäbelastning"], alternatives: ["leg_press", "hack_squat"] },
  { id: "seated_leg_curl", name: "Lårcurl (sittande)", en: "Seated Leg Curl", category: "Legs", pattern: "Curl", resistanceDefault: "selectorized", seeded: true,
    exercises: ["seated_leg_curl"], muscles: [{ muscleId: "hamstrings", factor: 1 }],
    setup: ["Knäleden i maskinens vridpunkt", "Lårstödet ner"], adjustments: ["Ryggstöd", "Lårstöd", "Vristkudde"], commonErrors: ["Lyfta säten från sitsen", "För kort ROM"], alternatives: ["lying_leg_curl"] },
  { id: "lying_leg_curl", name: "Lårcurl (liggande)", en: "Lying Leg Curl", category: "Legs", pattern: "Curl", resistanceDefault: "selectorized", seeded: true,
    exercises: ["lying_leg_curl"], muscles: [{ muscleId: "hamstrings", factor: 1 }],
    setup: ["Knäna strax utanför dynans kant", "Vristkudden vid hälen"], adjustments: ["Vristkudde"], commonErrors: ["Lyfta höften", "Studsa i botten"], alternatives: ["seated_leg_curl"] },
  { id: "hip_adduction", name: "Adduktor (insida lår)", en: "Hip Adduction", category: "Legs", pattern: "Raise", resistanceDefault: "selectorized", seeded: true,
    exercises: ["hip_adduction"], muscles: [{ muscleId: "adductors", factor: 1 }],
    setup: ["Ställ startbredden efter rörlighet", "Sitt upprätt mot stödet"], adjustments: ["Startbredd/ROM", "Ryggstöd"], commonErrors: ["För stort startomfång", "Rycka ihop benen"], alternatives: [] },
  { id: "hip_abduction", name: "Abduktor (utsida lår)", en: "Hip Abduction", category: "Glutes", pattern: "Raise", resistanceDefault: "selectorized", seeded: true,
    exercises: ["hip_abduction"], muscles: [{ muscleId: "gluteals", factor: 0.9 }],
    setup: ["Sitt upprätt mot stödet", "Dynor mot utsida knä"], adjustments: ["Startbredd/ROM", "Ryggstöd/lutning"], commonErrors: ["Luta bålen för att fuska", "För kort ROM"], alternatives: [] },
  { id: "hip_thrust", name: "Höftlyft / hip thrust", en: "Hip Thrust", category: "Glutes", pattern: "Hinge", resistanceDefault: "plate-loaded", seeded: true,
    exercises: ["hip_thrust", "glute_bridge"], muscles: [{ muscleId: "gluteals", factor: 1 }, { muscleId: "hamstrings", factor: 0.5 }],
    setup: ["Övre ryggen mot dynan", "Fötter platt, driv genom hälarna"], adjustments: ["Ryggdyna", "Fotplatta"], commonErrors: ["Översträcka ländryggen", "Kort ROM i toppen"], alternatives: ["glute_drive"] },
  { id: "glute_drive", name: "Glute drive", en: "Glute Drive", category: "Glutes", pattern: "Hinge", resistanceDefault: "plate-loaded",
    exercises: ["hip_thrust", "glute_bridge"], muscles: [{ muscleId: "gluteals", factor: 1 }, { muscleId: "hamstrings", factor: 0.5 }],
    setup: ["Sitt in i maskinen, höftbältet/dynan över höften", "Fötter på plattan"], adjustments: ["Sitshöjd", "Fotplatta"], commonErrors: ["Skjuta med quadriceps", "Kort ROM"], alternatives: ["hip_thrust"] },
  { id: "calf", name: "Vadpress", en: "Calf Raise", category: "Calves", pattern: "Calf", resistanceDefault: "plate-loaded", seeded: true,
    exercises: ["calf_raise", "seated_calf_raise"], muscles: [{ muscleId: "calves", factor: 1 }],
    setup: ["Trampdynan under trampdynan på foten", "Full sträckning ner"], adjustments: ["Axeldynor/lårdyna", "Fotplacering"], commonErrors: ["Studsa", "Kort ROM"], alternatives: [] },
  { id: "hack_squat", name: "Hack squat", en: "Hack Squat", category: "Legs", pattern: "Squat", resistanceDefault: "plate-loaded",
    exercises: ["hack_squat"], muscles: [{ muscleId: "quadriceps", factor: 1 }, { muscleId: "gluteals", factor: 0.7 }, { muscleId: "hamstrings", factor: 0.3 }],
    setup: ["Rygg och axlar mot dynorna", "Fötter axelbrett mitt på plattan"], adjustments: ["Axeldynor", "Fotplacering"], commonErrors: ["Släppa ländryggen från dynan", "Låsa knäna hårt"], alternatives: ["leg_press", "pendulum_squat", "belt_squat"] },
  { id: "pendulum_squat", name: "Pendelknäböj", en: "Pendulum Squat", category: "Legs", pattern: "Squat", resistanceDefault: "plate-loaded",
    exercises: ["hack_squat", "squat"], muscles: [{ muscleId: "quadriceps", factor: 1 }, { muscleId: "gluteals", factor: 0.8 }, { muscleId: "hamstrings", factor: 0.4 }],
    setup: ["Rygg mot dynan, axlar under dynorna", "Fötter enligt önskat fokus"], adjustments: ["Axeldynor", "Fotplatta"], commonErrors: ["För kort ROM", "Knäna faller inåt"], alternatives: ["hack_squat", "leg_press", "belt_squat"] },
  { id: "belt_squat", name: "Bältesknäböj", en: "Belt Squat", category: "Legs", pattern: "Squat", resistanceDefault: "plate-loaded",
    exercises: ["squat", "goblet_squat"], muscles: [{ muscleId: "quadriceps", factor: 0.9 }, { muscleId: "gluteals", factor: 0.8 }, { muscleId: "hamstrings", factor: 0.4 }],
    setup: ["Fäst bältet runt höften", "Stå på plattformen, greppa handtagen lätt"], adjustments: ["Bältesposition", "Plattformshöjd"], commonErrors: ["Luta för långt fram", "Kort ROM"], alternatives: ["hack_squat", "leg_press"] },
  { id: "assisted_dip_chin", name: "Assisterad dip / chin", en: "Assisted Dip/Chin", category: "Back", pattern: "Vertical Pull", resistanceDefault: "bodyweight-assisted",
    exercises: ["parallel_dip", "bench_dips", "chin_up", "pull_up"], muscles: [{ muscleId: "latissimus_dorsi", factor: 0.8 }, { muscleId: "pectoralis_major", factor: 0.6 }, { muscleId: "triceps_brachii", factor: 0.6 }, { muscleId: "biceps_brachii", factor: 0.5 }],
    setup: ["Ställ assistansvikten (mer vikt = mer hjälp)", "Knän eller fötter på plattan"], adjustments: ["Assistansvikt", "Greppläge (dip vs chin)"], commonErrors: ["För kort ROM", "Studsa i botten"], alternatives: ["lat_pulldown", "triceps_press"] },
  { id: "pullover", name: "Pullover", en: "Pullover", category: "Back", pattern: "Isolation", resistanceDefault: "selectorized",
    exercises: ["db_pullover", "straight_arm_pulldown"], muscles: [{ muscleId: "latissimus_dorsi", factor: 0.9 }, { muscleId: "pectoralis_major", factor: 0.4 }, { muscleId: "triceps_brachii", factor: 0.3 }],
    setup: ["Armbågarna mot dynorna", "Sitshöjd så axeln roterar fritt"], adjustments: ["Sitshöjd", "Startvinkel"], commonErrors: ["Böja armbågarna för mycket", "För stort ROM i axeln"], alternatives: ["lat_pulldown"] },
  { id: "incline_chest_press", name: "Lutande bröstpress", en: "Incline Chest Press", category: "Chest", pattern: "Incline Push", resistanceDefault: "plate-loaded",
    exercises: ["chest_press_machine", "incline_bench_bb", "incline_db_press"], muscles: [{ muscleId: "pectoralis_major", factor: 1 }, { muscleId: "deltoid_anterior", factor: 0.6 }, { muscleId: "triceps_brachii", factor: 0.5 }],
    setup: ["Sitshöjd så handtagen är i övre brösthöjd", "Rygg mot dynan"], adjustments: ["Sitshöjd", "Ryggstödsvinkel"], commonErrors: ["För hög sits (axeln)", "Låsa ut hårt"], alternatives: ["chest_press", "pec_deck"] },
  { id: "decline_chest_press", name: "Nedåtlutande bröstpress", en: "Decline Chest Press", category: "Chest", pattern: "Horizontal Push", resistanceDefault: "plate-loaded",
    exercises: ["decline_bench_bb", "decline_db_press", "chest_press_machine"], muscles: [{ muscleId: "pectoralis_major", factor: 1 }, { muscleId: "triceps_brachii", factor: 0.5 }],
    setup: ["Sitshöjd så handtagen är i nedre brösthöjd", "Rygg mot dynan"], adjustments: ["Sitshöjd", "Ryggstödsvinkel"], commonErrors: ["Kort ROM", "Använda för tung vikt"], alternatives: ["chest_press"] },
  { id: "cable_crossover", name: "Kabelkors / kabelstation", en: "Cable Crossover", category: "Chest", pattern: "Cable", resistanceDefault: "cable",
    exercises: ["cable_crossover", "cable_lateral_raise", "triceps_pushdown", "rope_pushdown", "cable_curl", "face_pull"], muscles: [{ muscleId: "pectoralis_major", factor: 0.8 }, { muscleId: "deltoid_anterior", factor: 0.4 }, { muscleId: "triceps_brachii", factor: 0.4 }],
    setup: ["Ställ remskivans höjd efter övning", "Fäst rätt handtag"], adjustments: ["Remskivehöjd", "Handtag", "Vikt per sida"], commonErrors: ["Använda för tung vikt", "Tappa hållningen"], alternatives: ["pec_deck", "chest_press"] },
  { id: "functional_trainer", name: "Funktionell kabelmaskin", en: "Functional Trainer", category: "Full body", pattern: "Cable", resistanceDefault: "cable",
    exercises: ["cable_crossover", "cable_curl", "triceps_pushdown", "cable_lateral_raise", "face_pull", "cable_kickback", "straight_arm_pulldown"], muscles: [{ muscleId: "pectoralis_major", factor: 0.5 }, { muscleId: "latissimus_dorsi", factor: 0.5 }, { muscleId: "deltoid_anterior", factor: 0.4 }],
    setup: ["Två justerbara remskivor", "Ställ höjd och handtag efter övning"], adjustments: ["Remskivehöjd", "Handtag", "Vikt per sida"], commonErrors: ["För tung vikt", "Kompensera med bålen"], alternatives: ["cable_crossover"] },
  { id: "rear_delt", name: "Bakre axel / omvänd pec deck", en: "Rear Delt Machine", category: "Shoulders", pattern: "Fly", resistanceDefault: "selectorized",
    exercises: ["rear_delt_fly", "bent_over_lateral", "face_pull"], muscles: [{ muscleId: "deltoid_posterior", factor: 1 }, { muscleId: "trapezius", factor: 0.4 }],
    setup: ["Bröstet mot dynan", "Greppa handtagen med raka armar"], adjustments: ["Sitshöjd", "Startvinkel"], commonErrors: ["Böja armbågarna", "Rycka bakåt"], alternatives: ["seated_row"] },
  { id: "lateral_raise_machine", name: "Sidolyftsmaskin", en: "Lateral Raise Machine", category: "Shoulders", pattern: "Raise", resistanceDefault: "selectorized",
    exercises: ["db_lateral_raise", "cable_lateral_raise"], muscles: [{ muscleId: "deltoid_lateral", factor: 1 }, { muscleId: "trapezius", factor: 0.3 }],
    setup: ["Överarmarna mot dynorna", "Sitshöjd så axeln är i led"], adjustments: ["Sitshöjd", "Dynor"], commonErrors: ["Lyfta med fällknivsrörelse", "För tung vikt"], alternatives: ["shoulder_press"] },
  { id: "shrug_machine", name: "Shrugsmaskin", en: "Shrug Machine", category: "Back", pattern: "Shrug", resistanceDefault: "plate-loaded",
    exercises: ["barbell_shrug", "db_shrug"], muscles: [{ muscleId: "trapezius", factor: 1 }, { muscleId: "forearms", factor: 0.3 }],
    setup: ["Greppa handtagen, armarna raka", "Stå/sitt upprätt"], adjustments: ["Handtag", "Stödhöjd"], commonErrors: ["Rulla axlarna", "Böja armbågarna"], alternatives: [] },
  { id: "t_bar_row", name: "T-bar rodd", en: "T-Bar Row", category: "Back", pattern: "Horizontal Pull", resistanceDefault: "plate-loaded",
    exercises: ["t_bar_row", "chest_supported_row"], muscles: [{ muscleId: "latissimus_dorsi", factor: 0.9 }, { muscleId: "trapezius", factor: 0.7 }, { muscleId: "biceps_brachii", factor: 0.5 }, { muscleId: "erector_spinae", factor: 0.4 }],
    setup: ["Bröstet mot dynan om sådan finns", "Greppa handtagen"], adjustments: ["Bröststöd", "Handtag"], commonErrors: ["Rycka med ländryggen", "Kort ROM"], alternatives: ["seated_row", "high_row"] },
  { id: "ab_crunch", name: "Magmaskin", en: "Abdominal Crunch", category: "Core", pattern: "Core", resistanceDefault: "selectorized",
    exercises: ["crunch_machine", "crunch", "rope_ab_pulldown"], muscles: [{ muscleId: "rectus_abdominis", factor: 1 }, { muscleId: "obliques", factor: 0.4 }],
    setup: ["Sitshöjd så dynan vilar mot bröstet", "Fäst fötterna"], adjustments: ["Sitshöjd", "ROM"], commonErrors: ["Dra med armarna", "Böja i höften i stället för att cruncha"], alternatives: [] },
  { id: "rotary_torso", name: "Rotationsmaskin (bål)", en: "Rotary Torso", category: "Core", pattern: "Rotation", resistanceDefault: "selectorized",
    exercises: ["oblique_crunch"], muscles: [{ muscleId: "obliques", factor: 1 }, { muscleId: "rectus_abdominis", factor: 0.4 }],
    setup: ["Sitt stadigt, lås underkroppen", "Bröstet mot dynan"], adjustments: ["Startvinkel/ROM", "Sitshöjd"], commonErrors: ["För stort rörelseomfång", "Rotera med höften"], alternatives: [] },
  { id: "back_extension", name: "Ryggresning (45°/Roman chair)", en: "Back Extension", category: "Back", pattern: "Hinge", resistanceDefault: "bodyweight-assisted",
    exercises: ["back_extension", "good_morning"], muscles: [{ muscleId: "erector_spinae", factor: 1 }, { muscleId: "gluteals", factor: 0.6 }, { muscleId: "hamstrings", factor: 0.5 }],
    setup: ["Ställ lårdynan vid höftleden", "Fäst fötterna"], adjustments: ["Lårdynans höjd", "Fotstöd"], commonErrors: ["Hyperextendera ryggen i toppen", "Studsa i botten"], alternatives: ["reverse_hyper", "ghd"] },
  { id: "reverse_hyper", name: "Reverse hyper", en: "Reverse Hyper", category: "Glutes", pattern: "Hinge", resistanceDefault: "plate-loaded",
    exercises: ["reverse_hyper", "glute_bridge"], muscles: [{ muscleId: "gluteals", factor: 0.9 }, { muscleId: "hamstrings", factor: 0.6 }, { muscleId: "erector_spinae", factor: 0.6 }],
    setup: ["Ligg med höften vid kanten", "Greppa handtagen"], adjustments: ["Fotdynor", "ROM"], commonErrors: ["Svinga med fart", "Överextendera ländryggen"], alternatives: ["back_extension", "hip_thrust"] },
  { id: "ghd", name: "Glute-ham developer", en: "Glute-Ham Developer", category: "Legs", pattern: "Hinge", resistanceDefault: "bodyweight-assisted",
    exercises: ["glute_ham_raise", "back_extension"], muscles: [{ muscleId: "hamstrings", factor: 1 }, { muscleId: "gluteals", factor: 0.6 }, { muscleId: "erector_spinae", factor: 0.5 }],
    setup: ["Ställ fotplatta och dyna efter benlängd", "Fäst fötterna"], adjustments: ["Fotplatta", "Dynposition"], commonErrors: ["För kort ROM", "Böja i höften i stället för knät"], alternatives: ["seated_leg_curl", "lying_leg_curl"] },
  { id: "seated_dip", name: "Dipsmaskin (sittande)", en: "Seated Dip", category: "Arms", pattern: "Vertical Push", resistanceDefault: "selectorized",
    exercises: ["parallel_dip", "bench_dips"], muscles: [{ muscleId: "triceps_brachii", factor: 1 }, { muscleId: "pectoralis_major", factor: 0.5 }, { muscleId: "deltoid_anterior", factor: 0.4 }],
    setup: ["Sitshöjd så handtagen är vid sidorna", "Rygg mot dynan"], adjustments: ["Sitshöjd", "Handtag"], commonErrors: ["Kort ROM", "Skjuta med axlarna"], alternatives: ["triceps_press", "assisted_dip_chin"] },
  { id: "preacher_curl_machine", name: "Preacher curl-maskin", en: "Preacher Curl Machine", category: "Arms", pattern: "Curl", resistanceDefault: "selectorized",
    exercises: ["preacher_curl", "cable_curl"], muscles: [{ muscleId: "biceps_brachii", factor: 1 }, { muscleId: "forearms", factor: 0.3 }],
    setup: ["Överarmarna platt mot dynan", "Sitshöjd så axeln är avslappnad"], adjustments: ["Sitshöjd", "Handtag"], commonErrors: ["Lyfta armbågarna", "Studsa i botten"], alternatives: ["biceps_curl"] },
  { id: "seated_calf", name: "Vadpress (sittande)", en: "Seated Calf Raise", category: "Calves", pattern: "Calf", resistanceDefault: "plate-loaded",
    exercises: ["seated_calf_raise"], muscles: [{ muscleId: "calves", factor: 1 }],
    setup: ["Lårdynan över knäna", "Trampdynan under trampdynan på foten"], adjustments: ["Lårdyna", "Fotplacering"], commonErrors: ["Studsa", "Kort ROM"], alternatives: ["calf"] },
  { id: "multi_hip", name: "Multi-höft", en: "Multi-Hip", category: "Glutes", pattern: "Raise", resistanceDefault: "selectorized",
    exercises: ["hip_abduction", "hip_adduction", "cable_kickback", "cable_abduction"], muscles: [{ muscleId: "gluteals", factor: 0.9 }, { muscleId: "adductors", factor: 0.4 }],
    setup: ["Ställ vridpunkten vid höften", "Håll bålen upprätt"], adjustments: ["Rörelseriktning (flex/ext/abd/add)", "ROM"], commonErrors: ["Svinga med fart", "Luta bålen"], alternatives: ["hip_abduction", "hip_adduction"] },
  { id: "standing_leg_curl", name: "Lårcurl (stående)", en: "Standing Leg Curl", category: "Legs", pattern: "Curl", resistanceDefault: "selectorized",
    exercises: ["lying_leg_curl", "seated_leg_curl"], muscles: [{ muscleId: "hamstrings", factor: 1 }],
    setup: ["Ett ben i taget, lårdynan mot låret", "Håll höften still"], adjustments: ["Lårdyna", "Vristkudde"], commonErrors: ["Svinga höften", "Kort ROM"], alternatives: ["seated_leg_curl", "lying_leg_curl"] },
  { id: "sissy_squat", name: "Sissy squat-maskin", en: "Sissy Squat", category: "Legs", pattern: "Squat", resistanceDefault: "bodyweight-assisted",
    exercises: ["sissy_squat"], muscles: [{ muscleId: "quadriceps", factor: 1 }],
    setup: ["Fäst vristerna, luta bakåt", "Håll höften rak"], adjustments: ["Vriststöd", "Lutning"], commonErrors: ["Böja i höften", "Tappa kontrollen bakåt"], alternatives: ["leg_extension", "hack_squat"] },
  { id: "smith_machine", name: "Smithmaskin", en: "Smith Machine", category: "Full body", pattern: "Guided", resistanceDefault: "free-weight",
    exercises: ["squat", "bench_press", "ohp", "rdl", "bulgarian_split"], muscles: [{ muscleId: "quadriceps", factor: 0.7 }, { muscleId: "pectoralis_major", factor: 0.6 }, { muscleId: "deltoid_anterior", factor: 0.5 }, { muscleId: "gluteals", factor: 0.5 }],
    setup: ["Ställ säkerhetsstopp i rätt höjd", "Rotera stången för att låsa/låsa upp"], adjustments: ["Säkerhetsstopp", "Bänk/fotposition"], commonErrors: ["Fel fotplacering (fast bana)", "Glömma haka av stången"], alternatives: ["power_rack"] },
  { id: "power_rack", name: "Power rack / rig", en: "Power Rack", category: "Full body", pattern: "Free Weight", resistanceDefault: "free-weight",
    exercises: ["squat", "bench_press", "ohp", "deadlift", "front_squat", "rdl"], muscles: [{ muscleId: "quadriceps", factor: 0.7 }, { muscleId: "pectoralis_major", factor: 0.6 }, { muscleId: "gluteals", factor: 0.6 }, { muscleId: "erector_spinae", factor: 0.5 }],
    setup: ["Ställ säkerhetsarmar och krokar i rätt höjd", "Centrera stången"], adjustments: ["Säkerhetsarmar", "J-krokar", "Bänk"], commonErrors: ["För låga säkerhetsarmar", "Ojämnt lastad stång"], alternatives: ["smith_machine"] },
];

// ── Branded maskinmodeller ──
// Ärver typens defaults (exercises/muscles/setup/adjustments/commonErrors/alternatives) via resolveModel.
// media.rights = null → ingen bild får visas (inga tillverkarbilder utan dokumenterad rätt).
// source.verified = true om modellen bekräftats mot tillverkarens produktsida/gym; url = referens.
const SL = (v, url, note) => ({ verified: v, url: url || null, note: note || null });
const NOIMG = { ref: null, rights: null };
export const MACHINE_MODELS = [
  // Technogym
  { id: "mdl_technogym_selection_chestpress", manufacturer: "Technogym", brandId: "technogym", model: "Selection Pro Chest Press", series: "Selection Pro", typeId: "chest_press", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(true, "https://www.technogym.com", "Selection Pro-serien") },
  { id: "mdl_technogym_selection_latmachine", manufacturer: "Technogym", brandId: "technogym", model: "Selection Pro Lat Machine", series: "Selection Pro", typeId: "lat_pulldown", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(true, "https://www.technogym.com") },
  { id: "mdl_technogym_pure_legpress", manufacturer: "Technogym", brandId: "technogym", model: "Pure Strength Leg Press", series: "Pure Strength", typeId: "leg_press", resistance: "plate-loaded", design: "bilateral", media: NOIMG, source: SL(true, "https://www.technogym.com") },
  // Life Fitness
  { id: "mdl_lifefitness_insignia_shoulderpress", manufacturer: "Life Fitness", brandId: "life_fitness", model: "Insignia Series Shoulder Press", series: "Insignia", typeId: "shoulder_press", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(true, "https://www.lifefitness.com") },
  { id: "mdl_lifefitness_insignia_legext", manufacturer: "Life Fitness", brandId: "life_fitness", model: "Insignia Series Leg Extension", series: "Insignia", typeId: "leg_extension", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(true, "https://www.lifefitness.com") },
  // Hammer Strength (mfr Life Fitness)
  { id: "mdl_hammer_isolateral_row", manufacturer: "Life Fitness", brandId: "hammer_strength", model: "Iso-Lateral High Row", series: "Iso-Lateral", typeId: "high_row", resistance: "plate-loaded", design: "iso-lateral", media: NOIMG, source: SL(true, "https://www.lifefitness.com/hammer-strength") },
  { id: "mdl_hammer_isolateral_chest", manufacturer: "Life Fitness", brandId: "hammer_strength", model: "Iso-Lateral Chest Press", series: "Iso-Lateral", typeId: "chest_press", resistance: "plate-loaded", design: "iso-lateral", media: NOIMG, source: SL(true, "https://www.lifefitness.com/hammer-strength") },
  { id: "mdl_hammer_vsquat", manufacturer: "Life Fitness", brandId: "hammer_strength", model: "V-Squat", series: "Plate-Loaded", typeId: "hack_squat", resistance: "plate-loaded", design: "bilateral", media: NOIMG, source: SL(true, "https://www.lifefitness.com/hammer-strength") },
  // Gymleco
  { id: "mdl_gymleco_pendulum", manufacturer: "Gymleco", brandId: "gymleco", model: "Pendulum Squat", series: "Plate-Loaded", typeId: "pendulum_squat", resistance: "plate-loaded", design: "bilateral", media: NOIMG, source: SL(true, "https://gymleco.com") },
  { id: "mdl_gymleco_beltsquat", manufacturer: "Gymleco", brandId: "gymleco", model: "Belt Squat", series: "Plate-Loaded", typeId: "belt_squat", resistance: "plate-loaded", design: "bilateral", media: NOIMG, source: SL(true, "https://gymleco.com") },
  { id: "mdl_gymleco_seatedrow", manufacturer: "Gymleco", brandId: "gymleco", model: "Seated Row", series: "Selectorized", typeId: "seated_row", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(false, "https://gymleco.com", "Modellnamn ej verifierat") },
  // Matrix
  { id: "mdl_matrix_versa_legpress", manufacturer: "Johnson Health Tech", brandId: "matrix", model: "Versa Leg Press", series: "Versa", typeId: "leg_press", resistance: "plate-loaded", design: "bilateral", media: NOIMG, source: SL(true, "https://www.matrixfitness.com") },
  { id: "mdl_matrix_ultra_pecdeck", manufacturer: "Johnson Health Tech", brandId: "matrix", model: "Ultra Pec Fly", series: "Ultra", typeId: "pec_deck", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(true, "https://www.matrixfitness.com") },
  // Cybex (mfr Life Fitness)
  { id: "mdl_cybex_eagle_legcurl", manufacturer: "Life Fitness", brandId: "cybex", model: "Eagle NX Seated Leg Curl", series: "Eagle NX", typeId: "seated_leg_curl", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(true, "https://www.cybexintl.com") },
  { id: "mdl_cybex_eagle_lyingcurl", manufacturer: "Life Fitness", brandId: "cybex", model: "Eagle NX Prone Leg Curl", series: "Eagle NX", typeId: "lying_leg_curl", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(true, "https://www.cybexintl.com") },
  // Panatta
  { id: "mdl_panatta_hacksquat", manufacturer: "Panatta", brandId: "panatta", model: "Hack Squat", series: "Freeweight", typeId: "hack_squat", resistance: "plate-loaded", design: "bilateral", media: NOIMG, source: SL(true, "https://www.panattasport.com") },
  { id: "mdl_panatta_pullover", manufacturer: "Panatta", brandId: "panatta", model: "Super Pullover", series: "Super Series", typeId: "pullover", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(true, "https://www.panattasport.com") },
  // Nautilus
  { id: "mdl_nautilus_pulldown", manufacturer: "Nautilus Inc.", brandId: "nautilus", model: "Nitro Plus Lat Pulldown", series: "Nitro Plus", typeId: "lat_pulldown", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(false, "https://www.nautilus.com", "Serie ej verifierad") },
  // Hoist
  { id: "mdl_hoist_rocit_chest", manufacturer: "Hoist Fitness", brandId: "hoist", model: "RocIt Chest Press", series: "RocIt", typeId: "chest_press", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(true, "https://www.hoistfitness.com") },
  { id: "mdl_hoist_dip_chin", manufacturer: "Hoist Fitness", brandId: "hoist", model: "Assisted Dip/Chin", series: "Dual", typeId: "assisted_dip_chin", resistance: "bodyweight-assisted", design: "bilateral", media: NOIMG, source: SL(false, "https://www.hoistfitness.com") },
  // Precor
  { id: "mdl_precor_discovery_shoulderpress", manufacturer: "Precor", brandId: "precor", model: "Discovery Shoulder Press", series: "Discovery", typeId: "shoulder_press", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(true, "https://www.precor.com") },
  { id: "mdl_precor_discovery_calf", manufacturer: "Precor", brandId: "precor", model: "Discovery Calf Extension", series: "Discovery", typeId: "calf", resistance: "plate-loaded", design: "bilateral", media: NOIMG, source: SL(false, "https://www.precor.com") },
  // Booty Builder
  { id: "mdl_bootybuilder_glutedrive", manufacturer: "Booty Builder", brandId: "booty_builder", model: "Glute Drive", series: "Glute Drive", typeId: "glute_drive", resistance: "plate-loaded", design: "bilateral", media: NOIMG, source: SL(true, "https://bootybuilder.com") },
  { id: "mdl_bootybuilder_hipthrust", manufacturer: "Booty Builder", brandId: "booty_builder", model: "Hip Thrust Machine", series: "Booty Builder", typeId: "hip_thrust", resistance: "plate-loaded", design: "bilateral", media: NOIMG, source: SL(true, "https://bootybuilder.com") },
  { id: "mdl_bootybuilder_abduction", manufacturer: "Booty Builder", brandId: "booty_builder", model: "Abductor", series: "Booty Builder", typeId: "hip_abduction", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(false, "https://bootybuilder.com") },
  // LK
  { id: "mdl_lk_legpress", manufacturer: "LK", brandId: "lk", model: "Leg Press 45°", series: "Plate-Loaded", typeId: "leg_press", resistance: "plate-loaded", design: "bilateral", media: NOIMG, source: SL(false, null, "Community-verifiering behövs") },
  { id: "mdl_lk_adduction", manufacturer: "LK", brandId: "lk", model: "Adductor", series: "Selectorized", typeId: "hip_adduction", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(false, null) },
  // Thor Fitness
  { id: "mdl_thor_beltsquat", manufacturer: "Thor Fitness", brandId: "thor_fitness", model: "Belt Squat", series: "Plate-Loaded", typeId: "belt_squat", resistance: "plate-loaded", design: "bilateral", media: NOIMG, source: SL(false, "https://thorfitness.se") },
  { id: "mdl_thor_bicepscurl", manufacturer: "Thor Fitness", brandId: "thor_fitness", model: "Biceps Curl", series: "Selectorized", typeId: "biceps_curl", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(false, "https://thorfitness.se") },
  // ── Fler modeller ──
  // Technogym
  { id: "mdl_technogym_selection_shoulderpress", manufacturer: "Technogym", brandId: "technogym", model: "Selection Pro Shoulder Press", series: "Selection Pro", typeId: "shoulder_press", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(true, "https://www.technogym.com") },
  { id: "mdl_technogym_selection_legcurl", manufacturer: "Technogym", brandId: "technogym", model: "Selection Pro Leg Curl", series: "Selection Pro", typeId: "lying_leg_curl", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(true, "https://www.technogym.com") },
  { id: "mdl_technogym_pure_incline", manufacturer: "Technogym", brandId: "technogym", model: "Pure Strength Incline Press", series: "Pure Strength", typeId: "incline_chest_press", resistance: "plate-loaded", design: "bilateral", media: NOIMG, source: SL(true, "https://www.technogym.com") },
  { id: "mdl_technogym_pure_abduction", manufacturer: "Technogym", brandId: "technogym", model: "Selection Pro Abductor", series: "Selection Pro", typeId: "hip_abduction", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(true, "https://www.technogym.com") },
  // Life Fitness
  { id: "mdl_lifefitness_insignia_pulldown", manufacturer: "Life Fitness", brandId: "life_fitness", model: "Insignia Series Lat Pulldown", series: "Insignia", typeId: "lat_pulldown", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(true, "https://www.lifefitness.com") },
  { id: "mdl_lifefitness_insignia_row", manufacturer: "Life Fitness", brandId: "life_fitness", model: "Insignia Series Row", series: "Insignia", typeId: "seated_row", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(true, "https://www.lifefitness.com") },
  { id: "mdl_lifefitness_signature_cable", manufacturer: "Life Fitness", brandId: "life_fitness", model: "Signature Dual Adjustable Pulley", series: "Signature", typeId: "functional_trainer", resistance: "cable", design: "bilateral", media: NOIMG, source: SL(true, "https://www.lifefitness.com") },
  { id: "mdl_lifefitness_insignia_abcrunch", manufacturer: "Life Fitness", brandId: "life_fitness", model: "Insignia Series Abdominal Crunch", series: "Insignia", typeId: "ab_crunch", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(false, "https://www.lifefitness.com") },
  // Hammer Strength
  { id: "mdl_hammer_isolateral_pulldown", manufacturer: "Life Fitness", brandId: "hammer_strength", model: "Iso-Lateral Front Lat Pulldown", series: "Iso-Lateral", typeId: "lat_pulldown", resistance: "plate-loaded", design: "iso-lateral", media: NOIMG, source: SL(true, "https://www.lifefitness.com/hammer-strength") },
  { id: "mdl_hammer_isolateral_shoulder", manufacturer: "Life Fitness", brandId: "hammer_strength", model: "Iso-Lateral Shoulder Press", series: "Iso-Lateral", typeId: "shoulder_press", resistance: "plate-loaded", design: "iso-lateral", media: NOIMG, source: SL(true, "https://www.lifefitness.com/hammer-strength") },
  { id: "mdl_hammer_incline", manufacturer: "Life Fitness", brandId: "hammer_strength", model: "Iso-Lateral Incline Press", series: "Iso-Lateral", typeId: "incline_chest_press", resistance: "plate-loaded", design: "iso-lateral", media: NOIMG, source: SL(true, "https://www.lifefitness.com/hammer-strength") },
  { id: "mdl_hammer_seated_calf", manufacturer: "Life Fitness", brandId: "hammer_strength", model: "Seated Calf Raise", series: "Plate-Loaded", typeId: "seated_calf", resistance: "plate-loaded", design: "bilateral", media: NOIMG, source: SL(true, "https://www.lifefitness.com/hammer-strength") },
  // Gymleco
  { id: "mdl_gymleco_tbar", manufacturer: "Gymleco", brandId: "gymleco", model: "T-Bar Row", series: "Plate-Loaded", typeId: "t_bar_row", resistance: "plate-loaded", design: "bilateral", media: NOIMG, source: SL(false, "https://gymleco.com") },
  { id: "mdl_gymleco_reverse_hyper", manufacturer: "Gymleco", brandId: "gymleco", model: "Reverse Hyper", series: "Plate-Loaded", typeId: "reverse_hyper", resistance: "plate-loaded", design: "bilateral", media: NOIMG, source: SL(false, "https://gymleco.com") },
  { id: "mdl_gymleco_backext", manufacturer: "Gymleco", brandId: "gymleco", model: "45° Back Extension", series: "Bodyweight", typeId: "back_extension", resistance: "bodyweight-assisted", design: "bilateral", media: NOIMG, source: SL(false, "https://gymleco.com") },
  // Matrix
  { id: "mdl_matrix_versa_pulldown", manufacturer: "Johnson Health Tech", brandId: "matrix", model: "Versa Lat Pulldown", series: "Versa", typeId: "lat_pulldown", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(true, "https://www.matrixfitness.com") },
  { id: "mdl_matrix_go_reardelt", manufacturer: "Johnson Health Tech", brandId: "matrix", model: "Go Rear Delt / Pec Fly", series: "Go", typeId: "rear_delt", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(false, "https://www.matrixfitness.com") },
  { id: "mdl_matrix_magnum_cablecross", manufacturer: "Johnson Health Tech", brandId: "matrix", model: "Magnum Cable Crossover", series: "Magnum", typeId: "cable_crossover", resistance: "cable", design: "bilateral", media: NOIMG, source: SL(true, "https://www.matrixfitness.com") },
  // Cybex
  { id: "mdl_cybex_eagle_chest", manufacturer: "Life Fitness", brandId: "cybex", model: "Eagle NX Chest Press", series: "Eagle NX", typeId: "chest_press", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(true, "https://www.cybexintl.com") },
  { id: "mdl_cybex_eagle_legpress", manufacturer: "Life Fitness", brandId: "cybex", model: "Eagle NX Leg Press", series: "Eagle NX", typeId: "leg_press", resistance: "plate-loaded", design: "bilateral", media: NOIMG, source: SL(true, "https://www.cybexintl.com") },
  { id: "mdl_cybex_smith", manufacturer: "Life Fitness", brandId: "cybex", model: "Smith Machine", series: "Ion", typeId: "smith_machine", resistance: "free-weight", design: "bilateral", media: NOIMG, source: SL(false, "https://www.cybexintl.com") },
  // Panatta
  { id: "mdl_panatta_pendulum", manufacturer: "Panatta", brandId: "panatta", model: "Pendulum Squat", series: "Freeweight", typeId: "pendulum_squat", resistance: "plate-loaded", design: "bilateral", media: NOIMG, source: SL(true, "https://www.panattasport.com") },
  { id: "mdl_panatta_beltsquat", manufacturer: "Panatta", brandId: "panatta", model: "Belt Squat", series: "Freeweight", typeId: "belt_squat", resistance: "plate-loaded", design: "bilateral", media: NOIMG, source: SL(true, "https://www.panattasport.com") },
  { id: "mdl_panatta_reardelt", manufacturer: "Panatta", brandId: "panatta", model: "Super Rear Delt", series: "Super Series", typeId: "rear_delt", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(true, "https://www.panattasport.com") },
  // Nautilus
  { id: "mdl_nautilus_legext", manufacturer: "Nautilus Inc.", brandId: "nautilus", model: "Nitro Plus Leg Extension", series: "Nitro Plus", typeId: "leg_extension", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(false, "https://www.nautilus.com") },
  { id: "mdl_nautilus_abcrunch", manufacturer: "Nautilus Inc.", brandId: "nautilus", model: "Inspiration Abdominal", series: "Inspiration", typeId: "ab_crunch", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(false, "https://www.nautilus.com") },
  // Hoist
  { id: "mdl_hoist_rocit_row", manufacturer: "Hoist Fitness", brandId: "hoist", model: "RocIt Seated Row", series: "RocIt", typeId: "seated_row", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(true, "https://www.hoistfitness.com") },
  { id: "mdl_hoist_rotarytorso", manufacturer: "Hoist Fitness", brandId: "hoist", model: "Rotary Torso", series: "Dual", typeId: "rotary_torso", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(false, "https://www.hoistfitness.com") },
  // Precor
  { id: "mdl_precor_discovery_pulldown", manufacturer: "Precor", brandId: "precor", model: "Discovery Lat Pulldown", series: "Discovery", typeId: "lat_pulldown", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(true, "https://www.precor.com") },
  { id: "mdl_precor_discovery_legcurl", manufacturer: "Precor", brandId: "precor", model: "Discovery Seated Leg Curl", series: "Discovery", typeId: "seated_leg_curl", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(false, "https://www.precor.com") },
  // Booty Builder
  { id: "mdl_bootybuilder_adduction", manufacturer: "Booty Builder", brandId: "booty_builder", model: "Adductor", series: "Booty Builder", typeId: "hip_adduction", resistance: "selectorized", design: "bilateral", media: NOIMG, source: SL(false, "https://bootybuilder.com") },
  { id: "mdl_bootybuilder_multihip", manufacturer: "Booty Builder", brandId: "booty_builder", model: "Multi Hip", series: "Booty Builder", typeId: "multi_hip", resistance: "selectorized", design: "unilateral", media: NOIMG, source: SL(false, "https://bootybuilder.com") },
  // LK
  { id: "mdl_lk_hacksquat", manufacturer: "LK", brandId: "lk", model: "Hack Squat", series: "Plate-Loaded", typeId: "hack_squat", resistance: "plate-loaded", design: "bilateral", media: NOIMG, source: SL(false, null, "Community-verifiering behövs") },
  { id: "mdl_lk_chestpress", manufacturer: "LK", brandId: "lk", model: "Chest Press", series: "Plate-Loaded", typeId: "chest_press", resistance: "plate-loaded", design: "bilateral", media: NOIMG, source: SL(false, null) },
  // Thor Fitness
  { id: "mdl_thor_powerrack", manufacturer: "Thor Fitness", brandId: "thor_fitness", model: "Power Rack", series: "Rigs & Racks", typeId: "power_rack", resistance: "free-weight", design: "bilateral", media: NOIMG, source: SL(true, "https://thorfitness.se") },
  { id: "mdl_thor_ghd", manufacturer: "Thor Fitness", brandId: "thor_fitness", model: "GHD", series: "Rigs & Racks", typeId: "ghd", resistance: "bodyweight-assisted", design: "bilateral", media: NOIMG, source: SL(false, "https://thorfitness.se") },
  // Eleiko (fria vikter / rack / rig)
  { id: "mdl_eleiko_powerrack", manufacturer: "Eleiko", brandId: "eleiko", model: "Prestera Power Rack", series: "Prestera", typeId: "power_rack", resistance: "free-weight", design: "bilateral", media: NOIMG, source: SL(true, "https://eleiko.com") },
  { id: "mdl_eleiko_smith", manufacturer: "Eleiko", brandId: "eleiko", model: "Smith Machine", series: "Prestera", typeId: "smith_machine", resistance: "free-weight", design: "bilateral", media: NOIMG, source: SL(false, "https://eleiko.com") },
];
