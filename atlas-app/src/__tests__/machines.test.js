import { describe, it, expect } from "vitest";
import { MACHINE_TYPES, MACHINE_MODELS, MACHINE_BRANDS } from "../data/machines.js";
import { GYM_CHAINS, GYM_CLUBS } from "../data/gyms.js";
import { EXERCISES } from "../data/exercises.js";
import { MUSCLES } from "../data/muscles.js";
import {
  resolveModel, searchMachines, filterOptions, availableExerciseIdsAtClub,
  availableModelIdsAtClub, verifiedAlternativesForType, recordMachinePR, machineProgress, clubInventory,
} from "../engines/machines.js";

describe("maskindatabas — dataintegritet", () => {
  it("6 kedjor och 14 märken seedade", () => {
    expect(GYM_CHAINS.length).toBe(6);
    expect(MACHINE_BRANDS.length).toBe(14);
    ["nordic_wellness", "fitness24seven", "stc", "sats", "actic", "friskis_svettis"].forEach(id => expect(GYM_CHAINS.some(c => c.id === id)).toBe(true));
    ["technogym", "life_fitness", "hammer_strength", "gymleco", "matrix", "cybex", "eleiko", "panatta", "nautilus", "hoist", "precor", "booty_builder", "lk", "thor_fitness"].forEach(id => expect(MACHINE_BRANDS.some(b => b.id === id)).toBe(true));
  });

  it("kanoniska typer inkluderar F24-seed + tillägg (hack/pendel/bältesknäböj, assisterad dip/chin, pullover, high row, glute drive)", () => {
    const ids = MACHINE_TYPES.map(t => t.id);
    ["lat_pulldown", "seated_row", "chest_press", "shoulder_press", "pec_deck", "leg_press", "leg_extension", "seated_leg_curl", "lying_leg_curl", "hip_adduction", "calf"].forEach(id => expect(ids).toContain(id));
    ["hack_squat", "pendulum_squat", "belt_squat", "assisted_dip_chin", "pullover", "high_row", "glute_drive"].forEach(id => expect(ids).toContain(id));
    expect(MACHINE_TYPES.some(t => t.seeded)).toBe(true);
  });

  it("varje modell resolvar och refererar bara giltiga övnings- och muskel-ID", () => {
    MACHINE_MODELS.forEach(m => {
      const r = resolveModel(m.id);
      expect(r).toBeTruthy();
      expect(r.exercises.length).toBeGreaterThan(0);
      r.exercises.forEach(ex => expect(EXERCISES.find(e => e.id === ex), `okänd exId ${ex} i ${m.id}`).toBeTruthy());
      r.muscles.forEach(mu => expect(MUSCLES[mu.muscleId], `okänd muscleId ${mu.muscleId} i ${m.id}`).toBeTruthy());
      // varje modell "lagrar" hela schemat via resolvern
      ["manufacturer", "brandId", "model", "typeId", "resistance", "design", "setup", "adjustments", "commonErrors", "alternatives", "media", "source"].forEach(k => expect(r).toHaveProperty(k));
    });
  });

  it("klubb-inventarier refererar bara existerande modeller och har verifieringsstatus + datum", () => {
    GYM_CLUBS.forEach(c => c.inventory.forEach(i => {
      expect(MACHINE_MODELS.find(m => m.id === i.machineModelId), `okänd modell ${i.machineModelId} i ${c.id}`).toBeTruthy();
      expect(["verified", "unverified", "community"]).toContain(i.verification);
      expect(i.lastVerified).toBeTruthy();
    }));
  });

  it("ingen tillverkarbild visas utan dokumenterad rätt (media.rights null i seed)", () => {
    MACHINE_MODELS.forEach(m => expect(m.media.rights).toBeNull());
  });
});

describe("maskindatabas — filter & tillgänglighet", () => {
  it("filtrerar på märke, maskintyp, muskel, mönster och motstånd", () => {
    expect(searchMachines({ brandId: "hammer_strength" }).every(m => m.brandId === "hammer_strength")).toBe(true);
    expect(searchMachines({ typeId: "leg_press" }).every(m => m.typeId === "leg_press")).toBe(true);
    expect(searchMachines({ resistance: "plate-loaded" }).every(m => m.resistance === "plate-loaded")).toBe(true);
    expect(searchMachines({ muscleId: "gluteals" }).every(m => m.muscles.some(x => x.muscleId === "gluteals"))).toBe(true);
    const opts = filterOptions();
    expect(opts.brands.length).toBeGreaterThan(0);
    expect(opts.muscles.length).toBeGreaterThan(0);
  });

  it("fritextsök hittar på övningsnamn", () => {
    const r = searchMachines({ query: "leg press" });
    expect(r.length).toBeGreaterThan(0);
  });

  it("klubbfilter begränsar till klubbens inventarium; community-rapport läggs till", () => {
    const club = "club_nw_gardet";
    const base = availableModelIdsAtClub(club);
    expect(base.length).toBeGreaterThan(0);
    const community = [{ clubId: club, machineModelId: "mdl_panatta_pullover", verification: "community", lastVerified: "2026-07-01" }];
    const withC = clubInventory(club, community);
    expect(withC.some(i => i.machineModelId === "mdl_panatta_pullover" && i.verification === "community")).toBe(true);
  });

  it("tillgängliga övningar på en klubb härleds ur maskinerna", () => {
    const ex = availableExerciseIdsAtClub("club_nw_gardet");
    expect(ex.length).toBeGreaterThan(0);
    ex.forEach(id => expect(EXERCISES.find(e => e.id === id)).toBeTruthy());
  });

  it("verifierade alternativ föreslås för saknad maskintyp, verifierade först", () => {
    // Gärdet har benpress (verified) → alternativ till hack_squat bör inkludera benpress
    const alts = verifiedAlternativesForType("hack_squat", "club_nw_gardet");
    expect(Array.isArray(alts)).toBe(true);
    if (alts.length > 1) {
      const rank = { verified: 0, unverified: 1, community: 2 };
      for (let i = 1; i < alts.length; i++) expect(rank[alts[i - 1].verification]).toBeLessThanOrEqual(rank[alts[i].verification]);
    }
  });
});

describe("maskindatabas — PR & baslinje per modell", () => {
  it("första loggning blir baslinje; byte av modell ger ny baslinje utan styrkeförlust", () => {
    let prs = {};
    prs = recordMachinePR(prs, "mdl_technogym_pure_legpress", "leg_press", 120);
    let p = machineProgress(prs, "mdl_technogym_pure_legpress", "leg_press");
    expect(p.baseline).toBe(120);
    expect(p.deltaFromBaseline).toBe(0);
    prs = recordMachinePR(prs, "mdl_technogym_pure_legpress", "leg_press", 130);
    p = machineProgress(prs, "mdl_technogym_pure_legpress", "leg_press");
    expect(p.best).toBe(130);
    expect(p.deltaFromBaseline).toBe(10);
    // byt till annan modell → egen baslinje, ingen jämförelse mot 130
    prs = recordMachinePR(prs, "mdl_matrix_versa_legpress", "leg_press", 90);
    const p2 = machineProgress(prs, "mdl_matrix_versa_legpress", "leg_press");
    expect(p2.baseline).toBe(90);
    expect(p2.deltaFromBaseline).toBe(0); // inte -40
  });
});
