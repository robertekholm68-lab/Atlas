// DATA: gymkedjor & klubbar. En kedja delar INTE nödvändigtvis utrustning mellan klubbar —
// varje klubb har ett eget inventarium med verifieringsstatus + senast-verifierat-datum per post.
// verification: "verified" (bekräftad mot källa/på plats) | "unverified" | "community" (användarrapport, ej granskad)

export const GYM_CHAINS = [
  { id: "nordic_wellness", name: "Nordic Wellness", country: "SE", note: "Sveriges största kedja; utbud varierar mellan klubbar." },
  { id: "fitness24seven", name: "Fitness24Seven", country: "SE", note: "Standardutbud + variation efter storlek/inriktning." },
  { id: "stc", name: "STC", country: "SE", note: "Väst-/Mellansverige; klubbar av olika storlek." },
  { id: "sats", name: "SATS", country: "SE", note: "Nordisk premiumkedja." },
  { id: "actic", name: "Actic", country: "SE", note: "Ofta i simhallar; blandat utbud." },
  { id: "friskis_svettis", name: "Friskis & Svettis", country: "SE", note: "Ideell förening; utbud varierar per anläggning." },
];

// Datum som ISO-sträng → visas och åldras i UI. count = antal exemplar (valfritt).
const D = s => s; // läsbarhets-alias för senast-verifierat-datum
export const GYM_CLUBS = [
  { id: "club_nw_gardet", chainId: "nordic_wellness", name: "Gärdet", city: "Stockholm", inventory: [
    { machineModelId: "mdl_technogym_selection_chestpress", verification: "verified", lastVerified: D("2026-06-01"), source: "På plats" },
    { machineModelId: "mdl_technogym_selection_latmachine", verification: "verified", lastVerified: D("2026-06-01"), source: "På plats" },
    { machineModelId: "mdl_technogym_pure_legpress", verification: "verified", lastVerified: D("2026-06-01"), source: "På plats" },
    { machineModelId: "mdl_hammer_isolateral_row", verification: "verified", lastVerified: D("2026-06-01"), source: "På plats" },
    { machineModelId: "mdl_bootybuilder_glutedrive", verification: "verified", lastVerified: D("2026-06-01"), source: "På plats" },
    { machineModelId: "mdl_lifefitness_insignia_legext", verification: "unverified", lastVerified: D("2025-11-20"), source: "Äldre notering" },
  ] },
  { id: "club_nw_backebol", chainId: "nordic_wellness", name: "Bäckebol", city: "Göteborg", inventory: [
    { machineModelId: "mdl_hammer_vsquat", verification: "verified", lastVerified: D("2026-05-14"), source: "På plats" },
    { machineModelId: "mdl_gymleco_pendulum", verification: "verified", lastVerified: D("2026-05-14"), source: "På plats" },
    { machineModelId: "mdl_panatta_pullover", verification: "verified", lastVerified: D("2026-05-14"), source: "På plats" },
    { machineModelId: "mdl_cybex_eagle_lyingcurl", verification: "verified", lastVerified: D("2026-05-14"), source: "På plats" },
  ] },
  { id: "club_f24_mollevangen", chainId: "fitness24seven", name: "Möllevången", city: "Malmö", inventory: [
    { machineModelId: "mdl_matrix_versa_legpress", verification: "verified", lastVerified: D("2026-06-10"), source: "F24 2.0-koncept" },
    { machineModelId: "mdl_matrix_ultra_pecdeck", verification: "verified", lastVerified: D("2026-06-10"), source: "F24 2.0-koncept" },
    { machineModelId: "mdl_nautilus_pulldown", verification: "unverified", lastVerified: D("2026-02-17"), source: "Standardutbud, ej platsverifierad" },
    { machineModelId: "mdl_hoist_rocit_chest", verification: "unverified", lastVerified: D("2026-02-17"), source: "Standardutbud" },
    { machineModelId: "mdl_thor_bicepscurl", verification: "unverified", lastVerified: D("2026-02-17"), source: "Standardutbud" },
  ] },
  { id: "club_f24_huvudsta", chainId: "fitness24seven", name: "Solna Huvudsta", city: "Solna", inventory: [
    { machineModelId: "mdl_hoist_rocit_chest", verification: "verified", lastVerified: D("2026-06-25"), source: "På plats" },
    { machineModelId: "mdl_hoist_dip_chin", verification: "verified", lastVerified: D("2026-06-25"), source: "På plats" },
    { machineModelId: "mdl_matrix_versa_legpress", verification: "verified", lastVerified: D("2026-06-25"), source: "På plats" },
  ] },
  { id: "club_stc_partille", chainId: "stc", name: "Partille", city: "Partille", inventory: [
    { machineModelId: "mdl_gymleco_beltsquat", verification: "verified", lastVerified: D("2026-04-30"), source: "På plats" },
    { machineModelId: "mdl_gymleco_seatedrow", verification: "verified", lastVerified: D("2026-04-30"), source: "På plats" },
    { machineModelId: "mdl_lk_legpress", verification: "community", lastVerified: D("2026-06-28"), source: "Användarrapport (ej granskad)" },
  ] },
  { id: "club_sats_odenplan", chainId: "sats", name: "Odenplan", city: "Stockholm", inventory: [
    { machineModelId: "mdl_technogym_selection_chestpress", verification: "verified", lastVerified: D("2026-06-05"), source: "På plats" },
    { machineModelId: "mdl_lifefitness_insignia_shoulderpress", verification: "verified", lastVerified: D("2026-06-05"), source: "På plats" },
    { machineModelId: "mdl_cybex_eagle_legcurl", verification: "verified", lastVerified: D("2026-06-05"), source: "På plats" },
    { machineModelId: "mdl_precor_discovery_shoulderpress", verification: "unverified", lastVerified: D("2025-12-01"), source: "Äldre notering" },
  ] },
  { id: "club_actic_uppsala", chainId: "actic", name: "Uppsala Fyrishov", city: "Uppsala", inventory: [
    { machineModelId: "mdl_precor_discovery_shoulderpress", verification: "verified", lastVerified: D("2026-03-18"), source: "På plats" },
    { machineModelId: "mdl_precor_discovery_calf", verification: "verified", lastVerified: D("2026-03-18"), source: "På plats" },
    { machineModelId: "mdl_nautilus_pulldown", verification: "unverified", lastVerified: D("2025-10-10"), source: "Äldre notering" },
  ] },
  { id: "club_friskis_sodermalm", chainId: "friskis_svettis", name: "Södermalm", city: "Stockholm", inventory: [
    { machineModelId: "mdl_lifefitness_insignia_shoulderpress", verification: "verified", lastVerified: D("2026-05-02"), source: "På plats" },
    { machineModelId: "mdl_lifefitness_insignia_legext", verification: "verified", lastVerified: D("2026-05-02"), source: "På plats" },
    { machineModelId: "mdl_lk_adduction", verification: "community", lastVerified: D("2026-06-20"), source: "Användarrapport (ej granskad)" },
  ] },
];
