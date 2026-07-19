// DATA: övningar, pass, utrustning, styrkestandard, sporter
import { H, T } from "./tokens.js";
import { SPORT_META, CAT_LOAD, LEGACY_MAP } from "./sportLibrary.js";

const EXERCISES = [
  { id: "bench_press", name: "Barbell Bench Press", group: "Chest", equipment: "Barbell", pattern: "Horizontal Push", loadMode: "external", activation: [{ muscleId: "pectoralis_major", factor: 1 }, { muscleId: "triceps_brachii", factor: 0.5 }, { muscleId: "deltoid_anterior", factor: 0.5 }] },
  { id: "incline_bench_bb", name: "Incline Barbell Bench Press", group: "Chest", equipment: "Barbell", pattern: "Incline Push", loadMode: "external", activation: [{ muscleId: "pectoralis_major", factor: 0.9 }, { muscleId: "deltoid_anterior", factor: 0.6 }, { muscleId: "triceps_brachii", factor: 0.5 }] },
  { id: "incline_db_press", name: "Incline Dumbbell Bench Press", group: "Chest", equipment: "Dumbbell", pattern: "Incline Push", loadMode: "external", activation: [{ muscleId: "pectoralis_major", factor: 0.9 }, { muscleId: "deltoid_anterior", factor: 0.6 }, { muscleId: "triceps_brachii", factor: 0.5 }] },
  { id: "db_bench_press", name: "Dumbbell Bench Press", group: "Chest", equipment: "Dumbbell", pattern: "Horizontal Push", loadMode: "external", activation: [{ muscleId: "pectoralis_major", factor: 1 }, { muscleId: "triceps_brachii", factor: 0.5 }, { muscleId: "deltoid_anterior", factor: 0.5 }] },
  { id: "decline_bench_bb", name: "Barbell Decline Bench Press", group: "Chest", equipment: "Barbell", pattern: "Horizontal Push", loadMode: "external", activation: [{ muscleId: "pectoralis_major", factor: 1 }, { muscleId: "triceps_brachii", factor: 0.5 }] },
  { id: "decline_db_press", name: "Dumbbell Decline Bench Press", group: "Chest", equipment: "Dumbbell", pattern: "Horizontal Push", loadMode: "external", activation: [{ muscleId: "pectoralis_major", factor: 1 }, { muscleId: "triceps_brachii", factor: 0.5 }] },
  { id: "chest_press_machine", name: "Chest Press Machine", group: "Chest", equipment: "Machine", pattern: "Horizontal Push", loadMode: "external", activation: [{ muscleId: "pectoralis_major", factor: 1 }, { muscleId: "triceps_brachii", factor: 0.4 }, { muscleId: "deltoid_anterior", factor: 0.4 }] },
  { id: "pec_deck", name: "Pec Deck", group: "Chest", equipment: "Machine", pattern: "Fly", loadMode: "external", activation: [{ muscleId: "pectoralis_major", factor: 1 }, { muscleId: "deltoid_anterior", factor: 0.2 }] },
  { id: "cable_crossover", name: "Cable Crossover", group: "Chest", equipment: "Cable", pattern: "Fly", loadMode: "external", activation: [{ muscleId: "pectoralis_major", factor: 1 }, { muscleId: "deltoid_anterior", factor: 0.3 }] },
  { id: "db_fly", name: "Dumbbell Fly", group: "Chest", equipment: "Dumbbell", pattern: "Fly", loadMode: "external", activation: [{ muscleId: "pectoralis_major", factor: 1 }, { muscleId: "deltoid_anterior", factor: 0.2 }] },
  { id: "incline_db_fly", name: "Incline Dumbbell Fly", group: "Chest", equipment: "Dumbbell", pattern: "Fly", loadMode: "external", activation: [{ muscleId: "pectoralis_major", factor: 0.9 }, { muscleId: "deltoid_anterior", factor: 0.3 }] },
  { id: "push_ups", name: "Push-Ups", group: "Chest", equipment: "Bodyweight", pattern: "Horizontal Push", loadMode: "bodyweight", bwFraction: 0.64, activation: [{ muscleId: "pectoralis_major", factor: 0.9 }, { muscleId: "triceps_brachii", factor: 0.5 }, { muscleId: "deltoid_anterior", factor: 0.4 }, { muscleId: "rectus_abdominis", factor: 0.3 }, { muscleId: "serratus_anterior", factor: 0.3 }] },
  { id: "row", name: "Barbell Row", group: "Back", equipment: "Barbell", pattern: "Horizontal Pull", loadMode: "external", activation: [{ muscleId: "latissimus_dorsi", factor: 0.9 }, { muscleId: "trapezius", factor: 0.8 }, { muscleId: "biceps_brachii", factor: 0.5 }, { muscleId: "deltoid_posterior", factor: 0.4 }, { muscleId: "erector_spinae", factor: 0.3 }] },
  { id: "db_row_single", name: "Dumbbell Bent-Over Row (Single Arm)", group: "Back", equipment: "Dumbbell", pattern: "Horizontal Pull", loadMode: "external", activation: [{ muscleId: "latissimus_dorsi", factor: 0.9 }, { muscleId: "trapezius", factor: 0.6 }, { muscleId: "biceps_brachii", factor: 0.5 }, { muscleId: "deltoid_posterior", factor: 0.4 }] },
  { id: "db_row", name: "Dumbbell Bent-Over Rows", group: "Back", equipment: "Dumbbell", pattern: "Horizontal Pull", loadMode: "external", activation: [{ muscleId: "latissimus_dorsi", factor: 0.9 }, { muscleId: "trapezius", factor: 0.6 }, { muscleId: "biceps_brachii", factor: 0.5 }] },
  { id: "t_bar_row", name: "T-Bar Row", group: "Back", equipment: "T-bar", pattern: "Horizontal Pull", loadMode: "external", activation: [{ muscleId: "latissimus_dorsi", factor: 0.9 }, { muscleId: "trapezius", factor: 0.7 }, { muscleId: "biceps_brachii", factor: 0.5 }] },
  { id: "seated_cable_row", name: "Seated Cable Row", group: "Back", equipment: "Cable", pattern: "Horizontal Pull", loadMode: "external", activation: [{ muscleId: "latissimus_dorsi", factor: 0.9 }, { muscleId: "trapezius", factor: 0.6 }, { muscleId: "biceps_brachii", factor: 0.5 }, { muscleId: "deltoid_posterior", factor: 0.3 }] },
  { id: "wide_pulldown", name: "Wide-Grip Lat Pulldown", group: "Back", equipment: "Cable", pattern: "Vertical Pull", loadMode: "external", activation: [{ muscleId: "latissimus_dorsi", factor: 1 }, { muscleId: "biceps_brachii", factor: 0.4 }, { muscleId: "trapezius", factor: 0.3 }] },
  { id: "close_pulldown", name: "Close-Grip Lat Pulldown", group: "Back", equipment: "Cable", pattern: "Vertical Pull", loadMode: "external", activation: [{ muscleId: "latissimus_dorsi", factor: 1 }, { muscleId: "biceps_brachii", factor: 0.5 }] },
  { id: "reverse_pulldown", name: "Reverse-Grip Pulldown", group: "Back", equipment: "Cable", pattern: "Vertical Pull", loadMode: "external", activation: [{ muscleId: "latissimus_dorsi", factor: 1 }, { muscleId: "biceps_brachii", factor: 0.6 }] },
  { id: "straight_arm_pulldown", name: "Straight-Arm Lat Pulldown", group: "Back", equipment: "Cable", pattern: "Vertical Pull", loadMode: "external", activation: [{ muscleId: "latissimus_dorsi", factor: 1 }, { muscleId: "triceps_brachii", factor: 0.2 }] },
  { id: "pull_up", name: "Pull-Up", group: "Back", equipment: "Bodyweight", pattern: "Vertical Pull", loadMode: "bodyweight", bwFraction: 0.95, activation: [{ muscleId: "latissimus_dorsi", factor: 1 }, { muscleId: "biceps_brachii", factor: 0.5 }, { muscleId: "trapezius", factor: 0.3 }] },
  { id: "chin_up", name: "Chin-Up (Supinated)", group: "Back", equipment: "Bodyweight", pattern: "Vertical Pull", loadMode: "bodyweight", bwFraction: 0.95, activation: [{ muscleId: "latissimus_dorsi", factor: 0.9 }, { muscleId: "biceps_brachii", factor: 0.7 }] },
  { id: "db_pullover", name: "Dumbbell Pullover", group: "Back", equipment: "Dumbbell", pattern: "Vertical Pull", loadMode: "external", activation: [{ muscleId: "latissimus_dorsi", factor: 0.8 }, { muscleId: "pectoralis_major", factor: 0.4 }, { muscleId: "triceps_brachii", factor: 0.3 }, { muscleId: "serratus_anterior", factor: 0.3 }] },
  { id: "deadlift", name: "Barbell Deadlift", group: "Back", equipment: "Barbell", pattern: "Hinge", loadMode: "external", activation: [{ muscleId: "hamstrings", factor: 1 }, { muscleId: "gluteals", factor: 0.9 }, { muscleId: "erector_spinae", factor: 0.8 }, { muscleId: "trapezius", factor: 0.5 }, { muscleId: "quadriceps", factor: 0.4 }, { muscleId: "forearms", factor: 0.4 }] },
  { id: "sumo_deadlift", name: "Sumo Deadlift", group: "Back", equipment: "Barbell", pattern: "Hinge", loadMode: "external", activation: [{ muscleId: "gluteals", factor: 1 }, { muscleId: "hamstrings", factor: 0.7 }, { muscleId: "quadriceps", factor: 0.6 }, { muscleId: "adductors", factor: 0.5 }, { muscleId: "erector_spinae", factor: 0.6 }] },
  { id: "trap_bar_deadlift", name: "Trap Bar Deadlift", group: "Back", equipment: "Trap bar", pattern: "Hinge", loadMode: "external", activation: [{ muscleId: "quadriceps", factor: 0.7 }, { muscleId: "gluteals", factor: 0.8 }, { muscleId: "hamstrings", factor: 0.7 }, { muscleId: "erector_spinae", factor: 0.7 }, { muscleId: "trapezius", factor: 0.5 }] },
  { id: "barbell_shrug", name: "Barbell Shrug", group: "Back", equipment: "Barbell", pattern: "Shrug", loadMode: "external", activation: [{ muscleId: "trapezius", factor: 1 }, { muscleId: "forearms", factor: 0.3 }] },
  { id: "db_shrug", name: "Dumbbell Shrug", group: "Back", equipment: "Dumbbell", pattern: "Shrug", loadMode: "external", activation: [{ muscleId: "trapezius", factor: 1 }, { muscleId: "forearms", factor: 0.3 }] },
  { id: "ohp", name: "Overhead Press", group: "Shoulders", equipment: "Barbell", pattern: "Vertical Push", loadMode: "external", activation: [{ muscleId: "deltoid_anterior", factor: 1 }, { muscleId: "deltoid_lateral", factor: 0.7 }, { muscleId: "triceps_brachii", factor: 0.6 }, { muscleId: "trapezius", factor: 0.3 }] },
  { id: "db_shoulder_press", name: "Dumbbell Shoulder Press", group: "Shoulders", equipment: "Dumbbell", pattern: "Vertical Push", loadMode: "external", activation: [{ muscleId: "deltoid_anterior", factor: 1 }, { muscleId: "deltoid_lateral", factor: 0.7 }, { muscleId: "triceps_brachii", factor: 0.5 }] },
  { id: "seated_bb_press", name: "Seated Barbell Shoulder Press", group: "Shoulders", equipment: "Barbell", pattern: "Vertical Push", loadMode: "external", activation: [{ muscleId: "deltoid_anterior", factor: 1 }, { muscleId: "deltoid_lateral", factor: 0.6 }, { muscleId: "triceps_brachii", factor: 0.6 }] },
  { id: "smith_shoulder_press", name: "Smith Machine Shoulder Press", group: "Shoulders", equipment: "Machine", pattern: "Vertical Push", loadMode: "external", activation: [{ muscleId: "deltoid_anterior", factor: 1 }, { muscleId: "deltoid_lateral", factor: 0.6 }, { muscleId: "triceps_brachii", factor: 0.5 }] },
  { id: "db_lateral_raise", name: "Dumbbell Lateral Raise", group: "Shoulders", equipment: "Dumbbell", pattern: "Raise", loadMode: "external", activation: [{ muscleId: "deltoid_lateral", factor: 1 }, { muscleId: "trapezius", factor: 0.2 }] },
  { id: "cable_lateral_raise", name: "Cable Lateral Raise", group: "Shoulders", equipment: "Cable", pattern: "Raise", loadMode: "external", activation: [{ muscleId: "deltoid_lateral", factor: 1 }] },
  { id: "db_front_raise", name: "Dumbbell Front Raise", group: "Shoulders", equipment: "Dumbbell", pattern: "Raise", loadMode: "external", activation: [{ muscleId: "deltoid_anterior", factor: 1 }] },
  { id: "bb_front_raise", name: "Barbell Front Raise", group: "Shoulders", equipment: "Barbell", pattern: "Raise", loadMode: "external", activation: [{ muscleId: "deltoid_anterior", factor: 1 }] },
  { id: "rear_delt_fly", name: "Rear Delt Fly", group: "Shoulders", equipment: "Cable", pattern: "Fly", loadMode: "external", activation: [{ muscleId: "deltoid_posterior", factor: 1 }, { muscleId: "trapezius", factor: 0.4 }] },
  { id: "bent_over_lateral", name: "Bent-Over Lateral Raise", group: "Shoulders", equipment: "Dumbbell", pattern: "Raise", loadMode: "external", activation: [{ muscleId: "deltoid_posterior", factor: 1 }, { muscleId: "trapezius", factor: 0.4 }] },
  { id: "upright_row", name: "Upright Row", group: "Shoulders", equipment: "Barbell", pattern: "Vertical Pull", loadMode: "external", activation: [{ muscleId: "deltoid_lateral", factor: 0.8 }, { muscleId: "trapezius", factor: 0.7 }, { muscleId: "biceps_brachii", factor: 0.3 }] },
  { id: "push_press", name: "Push Press", group: "Shoulders", equipment: "Barbell", pattern: "Vertical Push", loadMode: "external", activation: [{ muscleId: "deltoid_anterior", factor: 0.9 }, { muscleId: "deltoid_lateral", factor: 0.6 }, { muscleId: "triceps_brachii", factor: 0.5 }, { muscleId: "quadriceps", factor: 0.3 }] },
  { id: "curl", name: "Barbell Curl", group: "Biceps", equipment: "Barbell", pattern: "Curl", loadMode: "external", activation: [{ muscleId: "biceps_brachii", factor: 1 }, { muscleId: "forearms", factor: 0.4 }] },
  { id: "ez_curl", name: "EZ-Bar Curl", group: "Biceps", equipment: "EZ Bar", pattern: "Curl", loadMode: "external", activation: [{ muscleId: "biceps_brachii", factor: 1 }, { muscleId: "forearms", factor: 0.4 }] },
  { id: "db_curl", name: "Alternating Dumbbell Curl", group: "Biceps", equipment: "Dumbbell", pattern: "Curl", loadMode: "external", activation: [{ muscleId: "biceps_brachii", factor: 1 }, { muscleId: "forearms", factor: 0.4 }] },
  { id: "hammer_curl", name: "Hammer Curl", group: "Biceps", equipment: "Dumbbell", pattern: "Curl", loadMode: "external", activation: [{ muscleId: "biceps_brachii", factor: 0.9 }, { muscleId: "forearms", factor: 0.6 }] },
  { id: "preacher_curl", name: "Preacher Curl", group: "Biceps", equipment: "EZ Bar", pattern: "Curl", loadMode: "external", activation: [{ muscleId: "biceps_brachii", factor: 1 }] },
  { id: "incline_curl", name: "Incline Dumbbell Curl", group: "Biceps", equipment: "Dumbbell", pattern: "Curl", loadMode: "external", activation: [{ muscleId: "biceps_brachii", factor: 1 }] },
  { id: "concentration_curl", name: "Concentration Curl", group: "Biceps", equipment: "Dumbbell", pattern: "Curl", loadMode: "external", activation: [{ muscleId: "biceps_brachii", factor: 1 }] },
  { id: "cable_curl", name: "Cable Curl", group: "Biceps", equipment: "Cable", pattern: "Curl", loadMode: "external", activation: [{ muscleId: "biceps_brachii", factor: 1 }, { muscleId: "forearms", factor: 0.3 }] },
  { id: "reverse_curl", name: "Reverse Barbell Curl", group: "Biceps", equipment: "Barbell", pattern: "Curl", loadMode: "external", activation: [{ muscleId: "forearms", factor: 0.7 }, { muscleId: "biceps_brachii", factor: 0.6 }] },
  { id: "wrist_curl", name: "Seated Wrist Curl", group: "Biceps", equipment: "Barbell", pattern: "Curl", loadMode: "external", activation: [{ muscleId: "forearms", factor: 1 }] },
  { id: "triceps_pushdown", name: "Triceps Pressdown", group: "Triceps", equipment: "Cable", pattern: "Extension", loadMode: "external", activation: [{ muscleId: "triceps_brachii", factor: 1 }] },
  { id: "rope_pushdown", name: "Rope Pushdown", group: "Triceps", equipment: "Cable", pattern: "Extension", loadMode: "external", activation: [{ muscleId: "triceps_brachii", factor: 1 }] },
  { id: "skullcrusher", name: "Lying Triceps Extension", group: "Triceps", equipment: "EZ Bar", pattern: "Extension", loadMode: "external", activation: [{ muscleId: "triceps_brachii", factor: 1 }] },
  { id: "overhead_ext", name: "Overhead Triceps Extension", group: "Triceps", equipment: "Dumbbell", pattern: "Extension", loadMode: "external", activation: [{ muscleId: "triceps_brachii", factor: 1 }] },
  { id: "close_grip_bench", name: "Close-Grip Bench Press", group: "Triceps", equipment: "Barbell", pattern: "Horizontal Push", loadMode: "external", activation: [{ muscleId: "triceps_brachii", factor: 0.9 }, { muscleId: "pectoralis_major", factor: 0.5 }, { muscleId: "deltoid_anterior", factor: 0.4 }] },
  { id: "kickback", name: "Triceps Kickback", group: "Triceps", equipment: "Dumbbell", pattern: "Extension", loadMode: "external", activation: [{ muscleId: "triceps_brachii", factor: 1 }] },
  { id: "french_press", name: "Seated French Press", group: "Triceps", equipment: "Barbell", pattern: "Extension", loadMode: "external", activation: [{ muscleId: "triceps_brachii", factor: 1 }] },
  { id: "bench_dips", name: "Bench Dips", group: "Triceps", equipment: "Bodyweight", pattern: "Extension", loadMode: "bodyweight", bwFraction: 0.55, activation: [{ muscleId: "triceps_brachii", factor: 0.9 }, { muscleId: "pectoralis_major", factor: 0.4 }, { muscleId: "deltoid_anterior", factor: 0.3 }] },
  { id: "parallel_dip", name: "Parallel Bar Dip", group: "Triceps", equipment: "Bodyweight", pattern: "Horizontal Push", loadMode: "bodyweight", bwFraction: 0.9, activation: [{ muscleId: "triceps_brachii", factor: 0.8 }, { muscleId: "pectoralis_major", factor: 0.8 }, { muscleId: "deltoid_anterior", factor: 0.4 }] },
  { id: "plank", name: "Plank", group: "Core", equipment: "Bodyweight", pattern: "Core", loadMode: "time", intensityFactor: 2, activation: [{ muscleId: "rectus_abdominis", factor: 1 }, { muscleId: "obliques", factor: 0.5 }] },
  { id: "crunch", name: "Crunch", group: "Core", equipment: "Bodyweight", pattern: "Core", loadMode: "bodyweight", bwFraction: 0.35, activation: [{ muscleId: "rectus_abdominis", factor: 1 }, { muscleId: "obliques", factor: 0.3 }] },
  { id: "oblique_crunch", name: "Oblique Crunch", group: "Core", equipment: "Bodyweight", pattern: "Core", loadMode: "bodyweight", bwFraction: 0.35, activation: [{ muscleId: "obliques", factor: 1 }, { muscleId: "rectus_abdominis", factor: 0.4 }] },
  { id: "crunch_machine", name: "Crunch Machine", group: "Core", equipment: "Machine", pattern: "Core", loadMode: "external", activation: [{ muscleId: "rectus_abdominis", factor: 1 }, { muscleId: "obliques", factor: 0.3 }] },
  { id: "rope_ab_pulldown", name: "Rope Ab Pulldown", group: "Core", equipment: "Cable", pattern: "Core", loadMode: "external", activation: [{ muscleId: "rectus_abdominis", factor: 1 }, { muscleId: "obliques", factor: 0.4 }] },
  { id: "hanging_leg_raise", name: "Hanging Leg Raise", group: "Core", equipment: "Bodyweight", pattern: "Core", loadMode: "bodyweight", bwFraction: 0.5, activation: [{ muscleId: "rectus_abdominis", factor: 1 }, { muscleId: "hip_flexors", factor: 0.6 }, { muscleId: "obliques", factor: 0.4 }] },
  { id: "reverse_crunch", name: "Reverse Crunch", group: "Core", equipment: "Bodyweight", pattern: "Core", loadMode: "bodyweight", bwFraction: 0.35, activation: [{ muscleId: "rectus_abdominis", factor: 0.9 }, { muscleId: "hip_flexors", factor: 0.5 }] },
  { id: "squat", name: "Back Squat", group: "Legs", equipment: "Barbell", pattern: "Squat", loadMode: "external", activation: [{ muscleId: "quadriceps", factor: 1 }, { muscleId: "gluteals", factor: 0.8 }, { muscleId: "hamstrings", factor: 0.4 }, { muscleId: "erector_spinae", factor: 0.3 }, { muscleId: "adductors", factor: 0.3 }] },
  { id: "front_squat", name: "Front Squat", group: "Legs", equipment: "Barbell", pattern: "Squat", loadMode: "external", activation: [{ muscleId: "quadriceps", factor: 1 }, { muscleId: "gluteals", factor: 0.7 }, { muscleId: "erector_spinae", factor: 0.4 }] },
  { id: "hack_squat", name: "Hack Squat", group: "Legs", equipment: "Machine", pattern: "Squat", loadMode: "external", activation: [{ muscleId: "quadriceps", factor: 1 }, { muscleId: "gluteals", factor: 0.6 }] },
  { id: "goblet_squat", name: "Goblet Squat", group: "Legs", equipment: "Dumbbell", pattern: "Squat", loadMode: "external", activation: [{ muscleId: "quadriceps", factor: 0.9 }, { muscleId: "gluteals", factor: 0.7 }, { muscleId: "adductors", factor: 0.3 }] },
  { id: "leg_press", name: "Leg Press", group: "Legs", equipment: "Machine", pattern: "Squat", loadMode: "external", activation: [{ muscleId: "quadriceps", factor: 1 }, { muscleId: "gluteals", factor: 0.7 }, { muscleId: "hamstrings", factor: 0.3 }] },
  { id: "leg_extension", name: "Leg Extension", group: "Legs", equipment: "Machine", pattern: "Extension", loadMode: "external", activation: [{ muscleId: "quadriceps", factor: 1 }] },
  { id: "lunge", name: "Walking Lunge", group: "Legs", equipment: "Dumbbell", pattern: "Lunge", loadMode: "external", activation: [{ muscleId: "quadriceps", factor: 0.9 }, { muscleId: "gluteals", factor: 0.7 }, { muscleId: "hamstrings", factor: 0.4 }, { muscleId: "adductors", factor: 0.4 }] },
  { id: "bulgarian_split", name: "Bulgarian Split Squat", group: "Legs", equipment: "Barbell", pattern: "Lunge", loadMode: "external", activation: [{ muscleId: "quadriceps", factor: 0.9 }, { muscleId: "gluteals", factor: 0.8 }, { muscleId: "adductors", factor: 0.4 }] },
  { id: "step_up", name: "Dumbbell Step-Up", group: "Legs", equipment: "Dumbbell", pattern: "Lunge", loadMode: "external", activation: [{ muscleId: "quadriceps", factor: 0.8 }, { muscleId: "gluteals", factor: 0.7 }, { muscleId: "hamstrings", factor: 0.3 }] },
  { id: "wall_sit", name: "Wall Sit", group: "Legs", equipment: "Bodyweight", pattern: "Squat", loadMode: "time", intensityFactor: 2, activation: [{ muscleId: "quadriceps", factor: 1 }, { muscleId: "gluteals", factor: 0.4 }] },
  { id: "bodyweight_squat", name: "Bodyweight Squat", group: "Legs", equipment: "Bodyweight", pattern: "Squat", loadMode: "bodyweight", bwFraction: 0.65, activation: [{ muscleId: "quadriceps", factor: 0.9 }, { muscleId: "gluteals", factor: 0.7 }] },
  { id: "jump_squat", name: "Jump Squat", group: "Legs", equipment: "Bodyweight", pattern: "Squat", loadMode: "bodyweight", bwFraction: 0.7, activation: [{ muscleId: "quadriceps", factor: 0.9 }, { muscleId: "gluteals", factor: 0.7 }, { muscleId: "calves", factor: 0.4 }] },
  { id: "lying_leg_curl", name: "Lying Leg Curl", group: "Legs", equipment: "Machine", pattern: "Extension", loadMode: "external", activation: [{ muscleId: "hamstrings", factor: 1 }, { muscleId: "calves", factor: 0.3 }] },
  { id: "seated_leg_curl", name: "Seated Leg Curl", group: "Legs", equipment: "Machine", pattern: "Extension", loadMode: "external", activation: [{ muscleId: "hamstrings", factor: 1 }] },
  { id: "rdl", name: "Romanian Deadlift", group: "Legs", equipment: "Barbell", pattern: "Hinge", loadMode: "external", activation: [{ muscleId: "hamstrings", factor: 1 }, { muscleId: "gluteals", factor: 0.7 }, { muscleId: "erector_spinae", factor: 0.6 }] },
  { id: "db_rdl", name: "Dumbbell Stiff-Leg Deadlift", group: "Legs", equipment: "Dumbbell", pattern: "Hinge", loadMode: "external", activation: [{ muscleId: "hamstrings", factor: 1 }, { muscleId: "gluteals", factor: 0.6 }, { muscleId: "erector_spinae", factor: 0.5 }] },
  { id: "good_morning", name: "Good Morning", group: "Legs", equipment: "Barbell", pattern: "Hinge", loadMode: "external", activation: [{ muscleId: "hamstrings", factor: 0.9 }, { muscleId: "erector_spinae", factor: 0.8 }, { muscleId: "gluteals", factor: 0.6 }] },
  { id: "glute_ham_raise", name: "Glute-Ham Raise", group: "Legs", equipment: "Bodyweight", pattern: "Hinge", loadMode: "bodyweight", bwFraction: 0.85, activation: [{ muscleId: "hamstrings", factor: 1 }, { muscleId: "gluteals", factor: 0.6 }, { muscleId: "calves", factor: 0.3 }] },
  { id: "back_extension", name: "Back Extension", group: "Legs", equipment: "Bodyweight", pattern: "Hinge", loadMode: "bodyweight", bwFraction: 0.6, activation: [{ muscleId: "erector_spinae", factor: 1 }, { muscleId: "gluteals", factor: 0.6 }, { muscleId: "hamstrings", factor: 0.5 }] },
  { id: "reverse_hyper", name: "Reverse Hyperextension", group: "Glutes", equipment: "Machine", pattern: "Hinge", loadMode: "external", activation: [{ muscleId: "gluteals", factor: 0.9 }, { muscleId: "hamstrings", factor: 0.6 }, { muscleId: "erector_spinae", factor: 0.6 }] },
  { id: "sissy_squat", name: "Sissy Squat", group: "Legs", equipment: "Bodyweight", pattern: "Squat", loadMode: "bodyweight", bwFraction: 0.7, activation: [{ muscleId: "quadriceps", factor: 1 }] },
  { id: "hip_thrust", name: "Barbell Hip Thrust", group: "Glutes", equipment: "Barbell", pattern: "Bridge", loadMode: "external", activation: [{ muscleId: "gluteals", factor: 1 }, { muscleId: "hamstrings", factor: 0.5 }, { muscleId: "quadriceps", factor: 0.3 }] },
  { id: "glute_bridge", name: "Glute Bridge", group: "Glutes", equipment: "Bodyweight", pattern: "Bridge", loadMode: "bodyweight", bwFraction: 0.5, activation: [{ muscleId: "gluteals", factor: 1 }, { muscleId: "hamstrings", factor: 0.4 }] },
  { id: "kettlebell_swing", name: "Kettlebell Swing", group: "Glutes", equipment: "Kettlebell", pattern: "Hinge", loadMode: "external", activation: [{ muscleId: "gluteals", factor: 0.9 }, { muscleId: "hamstrings", factor: 0.8 }, { muscleId: "erector_spinae", factor: 0.5 }, { muscleId: "deltoid_anterior", factor: 0.2 }] },
  { id: "cable_kickback", name: "Cable Glute Kickback", group: "Glutes", equipment: "Cable", pattern: "Bridge", loadMode: "external", activation: [{ muscleId: "gluteals", factor: 1 }, { muscleId: "hamstrings", factor: 0.3 }] },
  { id: "hip_abduction", name: "Hip Abduction Machine", group: "Glutes", equipment: "Machine", pattern: "Raise", loadMode: "external", activation: [{ muscleId: "gluteals", factor: 0.9 }] },
  { id: "hip_adduction", name: "Hip Adduction Machine", group: "Legs", equipment: "Machine", pattern: "Raise", loadMode: "external", activation: [{ muscleId: "adductors", factor: 1 }] },
  { id: "cable_abduction", name: "Standing Cable Abduction", group: "Glutes", equipment: "Cable", pattern: "Raise", loadMode: "external", activation: [{ muscleId: "gluteals", factor: 0.9 }] },
  { id: "burpees", name: "Burpees", group: "Legs", equipment: "Bodyweight", pattern: "Core", loadMode: "bodyweight", bwFraction: 0.6, activation: [{ muscleId: "quadriceps", factor: 0.6 }, { muscleId: "pectoralis_major", factor: 0.4 }, { muscleId: "deltoid_anterior", factor: 0.3 }, { muscleId: "rectus_abdominis", factor: 0.4 }, { muscleId: "gluteals", factor: 0.4 }] },
  { id: "calf_raise", name: "Standing Calf Raise", group: "Calves", equipment: "Machine", pattern: "Calves", loadMode: "external", activation: [{ muscleId: "calves", factor: 1 }, { muscleId: "tibialis_anterior", factor: 0.2 }] },
  { id: "seated_calf_raise", name: "Seated Calf Raise", group: "Calves", equipment: "Machine", pattern: "Calves", loadMode: "external", activation: [{ muscleId: "calves", factor: 1 }] },
  { id: "kb_goblet_squat", name: "Kettlebell Goblet Squat", group: "Legs", equipment: "Kettlebell", pattern: "Squat", loadMode: "external", activation: [{ muscleId: "quadriceps", factor: 0.9 }, { muscleId: "gluteals", factor: 0.7 }, { muscleId: "adductors", factor: 0.3 }] },
  { id: "kb_press", name: "Kettlebell Overhead Press", group: "Shoulders", equipment: "Kettlebell", pattern: "Vertical Push", loadMode: "external", activation: [{ muscleId: "deltoid_anterior", factor: 1.0 }, { muscleId: "deltoid_lateral", factor: 0.6 }, { muscleId: "triceps_brachii", factor: 0.5 }] },
  { id: "kb_row", name: "Kettlebell Single-Arm Row", group: "Back", equipment: "Kettlebell", pattern: "Horizontal Pull", loadMode: "external", activation: [{ muscleId: "latissimus_dorsi", factor: 0.9 }, { muscleId: "trapezius", factor: 0.6 }, { muscleId: "biceps_brachii", factor: 0.5 }] },
  { id: "kb_rdl", name: "Kettlebell Romanian Deadlift", group: "Legs", equipment: "Kettlebell", pattern: "Hinge", loadMode: "external", activation: [{ muscleId: "hamstrings", factor: 1.0 }, { muscleId: "gluteals", factor: 0.7 }, { muscleId: "erector_spinae", factor: 0.5 }] },
  { id: "kb_lunge", name: "Kettlebell Reverse Lunge", group: "Legs", equipment: "Kettlebell", pattern: "Lunge", loadMode: "external", activation: [{ muscleId: "quadriceps", factor: 0.9 }, { muscleId: "gluteals", factor: 0.7 }, { muscleId: "hamstrings", factor: 0.4 }] },
  { id: "kb_clean_press", name: "Kettlebell Clean & Press", group: "Shoulders", equipment: "Kettlebell", pattern: "Vertical Push", loadMode: "external", activation: [{ muscleId: "deltoid_anterior", factor: 0.8 }, { muscleId: "trapezius", factor: 0.6 }, { muscleId: "quadriceps", factor: 0.5 }, { muscleId: "gluteals", factor: 0.5 }, { muscleId: "triceps_brachii", factor: 0.4 }] },
  { id: "safety_bar_squat", name: "Safety-Bar Squat", group: "Legs", equipment: "Barbell", pattern: "Squat", loadMode: "external", activation: [{ muscleId: "quadriceps", factor: 1 }, { muscleId: "gluteals", factor: 0.8 }, { muscleId: "hamstrings", factor: 0.4 }, { muscleId: "erector_spinae", factor: 0.4 }, { muscleId: "adductors", factor: 0.3 }, { muscleId: "trapezius", factor: 0.2 }] },
  { id: "db_neutral_press", name: "Neutral-Grip Dumbbell Press", group: "Chest", equipment: "Dumbbell", pattern: "Horizontal Push", loadMode: "external", activation: [{ muscleId: "pectoralis_major", factor: 0.9 }, { muscleId: "triceps_brachii", factor: 0.6 }, { muscleId: "deltoid_anterior", factor: 0.5 }] },
  { id: "chest_supported_row", name: "Chest-Supported Row", group: "Back", equipment: "Dumbbell", pattern: "Horizontal Pull", loadMode: "external", activation: [{ muscleId: "latissimus_dorsi", factor: 0.9 }, { muscleId: "trapezius", factor: 0.7 }, { muscleId: "deltoid_posterior", factor: 0.5 }, { muscleId: "biceps_brachii", factor: 0.5 }] },
  { id: "pallof_press", name: "Pallof Press", group: "Core", equipment: "Cable", pattern: "Core", loadMode: "external", activation: [{ muscleId: "obliques", factor: 1 }, { muscleId: "rectus_abdominis", factor: 0.6 }, { muscleId: "erector_spinae", factor: 0.3 }] },
  { id: "landmine_press", name: "Single-Arm Landmine Press", group: "Shoulders", equipment: "Landmine", pattern: "Vertical Push", loadMode: "external", activation: [{ muscleId: "deltoid_anterior", factor: 1 }, { muscleId: "triceps_brachii", factor: 0.5 }, { muscleId: "serratus_anterior", factor: 0.5 }, { muscleId: "deltoid_lateral", factor: 0.4 }, { muscleId: "pectoralis_major", factor: 0.4 }, { muscleId: "obliques", factor: 0.3 }] },
  { id: "face_pull", name: "Face Pull", group: "Shoulders", equipment: "Cable", pattern: "Fly", loadMode: "external", activation: [{ muscleId: "deltoid_posterior", factor: 1 }, { muscleId: "trapezius", factor: 0.6 }] },
  // ── NYA v2.0 (PDF 111–160). Belastningsandelar för nya maskin-/variantövningar är produktantaganden (draft: true). ──
  // Chest
  { id: "kb_floor_press", name: "Kettlebell Floor Press", group: "Chest", equipment: "Kettlebell", pattern: "Horizontal Push", loadMode: "external", aka: ["golvpress", "floor press kettlebell"], activation: [{ muscleId: "pectoralis_major", factor: 0.9 }, { muscleId: "triceps_brachii", factor: 0.6 }, { muscleId: "deltoid_anterior", factor: 0.4 }] },
  { id: "incline_chest_press_m", name: "Incline Chest Press Machine", group: "Chest", equipment: "Machine", pattern: "Incline Push", loadMode: "external", draft: true, aka: ["lutande bröstpress maskin", "incline press machine"], activation: [{ muscleId: "pectoralis_major", factor: 1 }, { muscleId: "deltoid_anterior", factor: 0.6 }, { muscleId: "triceps_brachii", factor: 0.5 }] },
  { id: "decline_chest_press_m", name: "Decline Chest Press Machine", group: "Chest", equipment: "Machine", pattern: "Horizontal Push", loadMode: "external", draft: true, aka: ["nedåtlutande bröstpress maskin"], activation: [{ muscleId: "pectoralis_major", factor: 1 }, { muscleId: "triceps_brachii", factor: 0.5 }] },
  { id: "iso_chest_press_m", name: "Iso-Lateral Chest Press Machine", group: "Chest", equipment: "Machine", pattern: "Horizontal Push", loadMode: "external", draft: true, aka: ["iso-lateral bröstpress", "hammer chest press"], activation: [{ muscleId: "pectoralis_major", factor: 1 }, { muscleId: "triceps_brachii", factor: 0.5 }, { muscleId: "deltoid_anterior", factor: 0.4 }] },
  { id: "half_kneel_cable_press", name: "Half-Kneeling Cable Press", group: "Chest", equipment: "Cable", pattern: "Horizontal Push", loadMode: "external", draft: true, aka: ["halvknästående kabelpress"], activation: [{ muscleId: "pectoralis_major", factor: 0.8 }, { muscleId: "deltoid_anterior", factor: 0.5 }, { muscleId: "triceps_brachii", factor: 0.4 }, { muscleId: "obliques", factor: 0.4 }] },
  // Back
  { id: "inverted_row", name: "Inverted Row", group: "Back", equipment: "Bodyweight", pattern: "Horizontal Pull", loadMode: "bodyweight", bwFraction: 0.6, aka: ["australisk rodd", "bodyweight row"], activation: [{ muscleId: "latissimus_dorsi", factor: 0.8 }, { muscleId: "trapezius", factor: 0.6 }, { muscleId: "biceps_brachii", factor: 0.5 }, { muscleId: "deltoid_posterior", factor: 0.4 }] },
  { id: "assisted_pull_up", name: "Assisted Pull-Up", group: "Back", equipment: "Machine", pattern: "Vertical Pull", loadMode: "external", draft: true, aka: ["assisterad pull-up", "assisterat chins"], activation: [{ muscleId: "latissimus_dorsi", factor: 1 }, { muscleId: "biceps_brachii", factor: 0.5 }, { muscleId: "trapezius", factor: 0.3 }] },
  { id: "high_row_m", name: "High Row Machine", group: "Back", equipment: "Machine", pattern: "Horizontal Pull", loadMode: "external", draft: true, aka: ["high row maskin"], activation: [{ muscleId: "latissimus_dorsi", factor: 0.9 }, { muscleId: "trapezius", factor: 0.7 }, { muscleId: "deltoid_posterior", factor: 0.5 }, { muscleId: "biceps_brachii", factor: 0.4 }] },
  { id: "iso_row_m", name: "Iso-Lateral Row Machine", group: "Back", equipment: "Machine", pattern: "Horizontal Pull", loadMode: "external", draft: true, aka: ["iso-lateral rodd", "hammer row"], activation: [{ muscleId: "latissimus_dorsi", factor: 0.9 }, { muscleId: "trapezius", factor: 0.7 }, { muscleId: "biceps_brachii", factor: 0.5 }, { muscleId: "deltoid_posterior", factor: 0.4 }] },
  { id: "pullover_m", name: "Pullover Machine", group: "Back", equipment: "Machine", pattern: "Vertical Pull", loadMode: "external", draft: true, aka: ["pullovermaskin", "nautilus pullover"], activation: [{ muscleId: "latissimus_dorsi", factor: 0.9 }, { muscleId: "pectoralis_major", factor: 0.3 }, { muscleId: "triceps_brachii", factor: 0.3 }] },
  { id: "landmine_row", name: "Landmine Row", group: "Back", equipment: "Landmine", pattern: "Horizontal Pull", loadMode: "external", aka: ["landmine rodd", "t-bar landmine"], activation: [{ muscleId: "latissimus_dorsi", factor: 0.9 }, { muscleId: "trapezius", factor: 0.7 }, { muscleId: "biceps_brachii", factor: 0.5 }, { muscleId: "deltoid_posterior", factor: 0.4 }] },
  { id: "neutral_pulldown", name: "Neutral-Grip Lat Pulldown", group: "Back", equipment: "Cable", pattern: "Vertical Pull", loadMode: "external", aka: ["neutralt latsdrag", "v-bar pulldown"], activation: [{ muscleId: "latissimus_dorsi", factor: 1 }, { muscleId: "biceps_brachii", factor: 0.5 }, { muscleId: "trapezius", factor: 0.3 }] },
  { id: "single_cable_row", name: "Single-Arm Cable Row", group: "Back", equipment: "Cable", pattern: "Horizontal Pull", loadMode: "external", aka: ["enarms kabelrodd"], activation: [{ muscleId: "latissimus_dorsi", factor: 0.9 }, { muscleId: "trapezius", factor: 0.6 }, { muscleId: "biceps_brachii", factor: 0.5 }, { muscleId: "obliques", factor: 0.3 }] },
  // Shoulders
  { id: "kb_clean", name: "Kettlebell Clean", group: "Shoulders", equipment: "Kettlebell", pattern: "Hinge", loadMode: "external", aka: ["kettlebell clean", "kb clean"], activation: [{ muscleId: "gluteals", factor: 0.6 }, { muscleId: "hamstrings", factor: 0.5 }, { muscleId: "trapezius", factor: 0.5 }, { muscleId: "deltoid_anterior", factor: 0.4 }, { muscleId: "forearms", factor: 0.4 }] },
  { id: "kb_snatch", name: "Kettlebell Snatch", group: "Shoulders", equipment: "Kettlebell", pattern: "Hinge", loadMode: "external", aka: ["kettlebell snatch"], activation: [{ muscleId: "gluteals", factor: 0.6 }, { muscleId: "hamstrings", factor: 0.5 }, { muscleId: "deltoid_anterior", factor: 0.6 }, { muscleId: "trapezius", factor: 0.5 }, { muscleId: "forearms", factor: 0.4 }] },
  { id: "kb_halo", name: "Kettlebell Halo", group: "Shoulders", equipment: "Kettlebell", pattern: "Raise", loadMode: "external", draft: true, aka: ["kettlebell halo"], activation: [{ muscleId: "deltoid_lateral", factor: 0.6 }, { muscleId: "deltoid_posterior", factor: 0.5 }, { muscleId: "trapezius", factor: 0.5 }, { muscleId: "triceps_brachii", factor: 0.3 }] },
  { id: "pike_push_up", name: "Pike Push-Up", group: "Shoulders", equipment: "Bodyweight", pattern: "Vertical Push", loadMode: "bodyweight", bwFraction: 0.6, aka: ["pike push-up", "höftvinklad armhävning"], activation: [{ muscleId: "deltoid_anterior", factor: 0.9 }, { muscleId: "deltoid_lateral", factor: 0.5 }, { muscleId: "triceps_brachii", factor: 0.6 }] },
  { id: "lateral_raise_m", name: "Lateral Raise Machine", group: "Shoulders", equipment: "Machine", pattern: "Raise", loadMode: "external", draft: true, aka: ["sidolyftsmaskin"], activation: [{ muscleId: "deltoid_lateral", factor: 1 }, { muscleId: "trapezius", factor: 0.3 }] },
  { id: "reverse_pec_deck", name: "Reverse Pec Deck", group: "Shoulders", equipment: "Machine", pattern: "Fly", loadMode: "external", draft: true, aka: ["omvänd pec deck", "rear delt machine"], activation: [{ muscleId: "deltoid_posterior", factor: 1 }, { muscleId: "trapezius", factor: 0.5 }] },
  // Biceps
  { id: "bayesian_curl", name: "Bayesian Cable Curl", group: "Biceps", equipment: "Cable", pattern: "Curl", loadMode: "external", aka: ["bayesian curl", "kabelcurl bakåtlutad"], activation: [{ muscleId: "biceps_brachii", factor: 1 }, { muscleId: "forearms", factor: 0.3 }] },
  // Triceps
  { id: "diamond_push_up", name: "Diamond Push-Up", group: "Triceps", equipment: "Bodyweight", pattern: "Horizontal Push", loadMode: "bodyweight", bwFraction: 0.64, aka: ["diamantarmhävning", "diamond push-up"], activation: [{ muscleId: "triceps_brachii", factor: 0.9 }, { muscleId: "pectoralis_major", factor: 0.6 }, { muscleId: "deltoid_anterior", factor: 0.4 }] },
  { id: "assisted_dip_m", name: "Assisted Dip Machine", group: "Triceps", equipment: "Machine", pattern: "Horizontal Push", loadMode: "external", draft: true, aka: ["assisterad dip maskin"], activation: [{ muscleId: "triceps_brachii", factor: 0.8 }, { muscleId: "pectoralis_major", factor: 0.6 }, { muscleId: "deltoid_anterior", factor: 0.4 }] },
  { id: "cable_oh_ext", name: "Cable Overhead Triceps Extension", group: "Triceps", equipment: "Cable", pattern: "Extension", loadMode: "external", aka: ["kabel overhead triceps", "cable overhead extension"], activation: [{ muscleId: "triceps_brachii", factor: 1 }] },
  // Core
  { id: "turkish_getup", name: "Turkish Get-Up", group: "Core", equipment: "Kettlebell", pattern: "Core", loadMode: "external", draft: true, aka: ["turkish get-up", "tgu"], activation: [{ muscleId: "obliques", factor: 0.7 }, { muscleId: "rectus_abdominis", factor: 0.6 }, { muscleId: "deltoid_anterior", factor: 0.6 }, { muscleId: "gluteals", factor: 0.5 }, { muscleId: "quadriceps", factor: 0.4 }] },
  { id: "kb_windmill", name: "Kettlebell Windmill", group: "Core", equipment: "Kettlebell", pattern: "Core", loadMode: "external", draft: true, aka: ["kettlebell windmill", "väderkvarn"], activation: [{ muscleId: "obliques", factor: 1 }, { muscleId: "rectus_abdominis", factor: 0.5 }, { muscleId: "deltoid_lateral", factor: 0.4 }, { muscleId: "hamstrings", factor: 0.4 }] },
  { id: "kb_suitcase_carry", name: "Kettlebell Suitcase Carry", group: "Core", equipment: "Kettlebell", pattern: "Carry", loadMode: "external", aka: ["suitcase carry", "resväskebärning"], activation: [{ muscleId: "obliques", factor: 1 }, { muscleId: "trapezius", factor: 0.5 }, { muscleId: "forearms", factor: 0.6 }, { muscleId: "erector_spinae", factor: 0.4 }] },
  { id: "kb_farmers_carry", name: "Kettlebell Farmer's Carry", group: "Core", equipment: "Kettlebell", pattern: "Carry", loadMode: "external", aka: ["farmers carry", "farmers walk kettlebell"], activation: [{ muscleId: "trapezius", factor: 0.7 }, { muscleId: "forearms", factor: 0.8 }, { muscleId: "obliques", factor: 0.5 }, { muscleId: "erector_spinae", factor: 0.4 }] },
  { id: "side_plank", name: "Side Plank", group: "Core", equipment: "Bodyweight", pattern: "Core", loadMode: "time", intensityFactor: 2, aka: ["sidoplanka", "side plank"], activation: [{ muscleId: "obliques", factor: 1 }, { muscleId: "rectus_abdominis", factor: 0.4 }] },
  { id: "dead_bug", name: "Dead Bug", group: "Core", equipment: "Bodyweight", pattern: "Core", loadMode: "bodyweight", bwFraction: 0.25, aka: ["dead bug", "död skalbagge"], activation: [{ muscleId: "rectus_abdominis", factor: 0.9 }, { muscleId: "obliques", factor: 0.5 }] },
  { id: "bird_dog", name: "Bird Dog", group: "Core", equipment: "Bodyweight", pattern: "Core", loadMode: "bodyweight", bwFraction: 0.25, aka: ["bird dog", "fågelhund"], activation: [{ muscleId: "erector_spinae", factor: 0.8 }, { muscleId: "gluteals", factor: 0.5 }, { muscleId: "rectus_abdominis", factor: 0.4 }] },
  { id: "ab_wheel", name: "Ab Wheel Rollout", group: "Core", equipment: "Ab Wheel", pattern: "Core", loadMode: "bodyweight", bwFraction: 0.5, aka: ["ab wheel", "maghjul", "rollout"], activation: [{ muscleId: "rectus_abdominis", factor: 1 }, { muscleId: "obliques", factor: 0.5 }, { muscleId: "latissimus_dorsi", factor: 0.4 }] },
  { id: "cable_wood_chop", name: "Cable Wood Chop", group: "Core", equipment: "Cable", pattern: "Rotation", loadMode: "external", aka: ["wood chop", "vedhugg kabel"], activation: [{ muscleId: "obliques", factor: 1 }, { muscleId: "rectus_abdominis", factor: 0.5 }] },
  { id: "trap_farmers_walk", name: "Trap Bar Farmer's Walk", group: "Core", equipment: "Trap bar", pattern: "Carry", loadMode: "external", aka: ["trap bar farmers walk", "bondgång trap bar"], activation: [{ muscleId: "trapezius", factor: 0.7 }, { muscleId: "forearms", factor: 0.8 }, { muscleId: "obliques", factor: 0.4 }, { muscleId: "erector_spinae", factor: 0.4 }] },
  { id: "copenhagen_plank", name: "Copenhagen Plank", group: "Core", equipment: "Bodyweight", pattern: "Core", loadMode: "time", intensityFactor: 2, draft: true, aka: ["copenhagen plank", "köpenhamnsplanka"], activation: [{ muscleId: "adductors", factor: 1 }, { muscleId: "obliques", factor: 0.6 }] },
  // Legs
  { id: "kb_front_squat", name: "Kettlebell Front-Rack Squat", group: "Legs", equipment: "Kettlebell", pattern: "Squat", loadMode: "external", aka: ["front-rack squat", "kettlebell frontböj"], activation: [{ muscleId: "quadriceps", factor: 0.9 }, { muscleId: "gluteals", factor: 0.7 }, { muscleId: "rectus_abdominis", factor: 0.4 }, { muscleId: "adductors", factor: 0.3 }] },
  { id: "nordic_curl", name: "Nordic Hamstring Curl", group: "Legs", equipment: "Bodyweight", pattern: "Extension", loadMode: "bodyweight", bwFraction: 0.9, aka: ["nordic curl", "nordisk hamstringcurl"], activation: [{ muscleId: "hamstrings", factor: 1 }, { muscleId: "gluteals", factor: 0.3 }] },
  { id: "pistol_squat", name: "Pistol Squat", group: "Legs", equipment: "Bodyweight", pattern: "Squat", loadMode: "bodyweight", bwFraction: 0.85, aka: ["pistol squat", "enbensknäböj"], activation: [{ muscleId: "quadriceps", factor: 1 }, { muscleId: "gluteals", factor: 0.7 }, { muscleId: "adductors", factor: 0.3 }] },
  { id: "belt_squat_m", name: "Belt Squat Machine", group: "Legs", equipment: "Machine", pattern: "Squat", loadMode: "external", draft: true, aka: ["bältesknäböj maskin", "belt squat"], activation: [{ muscleId: "quadriceps", factor: 0.9 }, { muscleId: "gluteals", factor: 0.8 }, { muscleId: "hamstrings", factor: 0.4 }] },
  { id: "pendulum_squat_m", name: "Pendulum Squat Machine", group: "Legs", equipment: "Machine", pattern: "Squat", loadMode: "external", draft: true, aka: ["pendelknäböj", "pendulum squat"], activation: [{ muscleId: "quadriceps", factor: 1 }, { muscleId: "gluteals", factor: 0.8 }, { muscleId: "hamstrings", factor: 0.4 }] },
  { id: "v_squat_m", name: "V-Squat Machine", group: "Legs", equipment: "Machine", pattern: "Squat", loadMode: "external", draft: true, aka: ["v-squat", "v-böj maskin"], activation: [{ muscleId: "quadriceps", factor: 1 }, { muscleId: "gluteals", factor: 0.7 }, { muscleId: "hamstrings", factor: 0.3 }] },
  { id: "single_leg_press", name: "Single-Leg Press", group: "Legs", equipment: "Machine", pattern: "Squat", loadMode: "external", draft: true, aka: ["enbens benpress", "single leg press"], activation: [{ muscleId: "quadriceps", factor: 1 }, { muscleId: "gluteals", factor: 0.7 }, { muscleId: "hamstrings", factor: 0.3 }] },
  { id: "standing_leg_curl_m", name: "Standing Leg Curl Machine", group: "Legs", equipment: "Machine", pattern: "Extension", loadMode: "external", draft: true, aka: ["stående lårcurl", "standing leg curl"], activation: [{ muscleId: "hamstrings", factor: 1 }] },
  { id: "sled_push", name: "Sled Push", group: "Legs", equipment: "Sled", pattern: "Push", loadMode: "external", aka: ["sled push", "släde push", "prowler"], activation: [{ muscleId: "quadriceps", factor: 0.9 }, { muscleId: "gluteals", factor: 0.8 }, { muscleId: "calves", factor: 0.6 }, { muscleId: "hamstrings", factor: 0.5 }] },
  { id: "sled_pull", name: "Sled Pull", group: "Legs", equipment: "Sled", pattern: "Pull", loadMode: "external", aka: ["sled pull", "släde pull"], activation: [{ muscleId: "quadriceps", factor: 0.8 }, { muscleId: "gluteals", factor: 0.7 }, { muscleId: "hamstrings", factor: 0.6 }, { muscleId: "latissimus_dorsi", factor: 0.4 }] },
  { id: "landmine_squat", name: "Landmine Squat", group: "Legs", equipment: "Landmine", pattern: "Squat", loadMode: "external", aka: ["landmine squat", "landmine knäböj"], activation: [{ muscleId: "quadriceps", factor: 0.9 }, { muscleId: "gluteals", factor: 0.7 }, { muscleId: "rectus_abdominis", factor: 0.3 }] },
  { id: "single_leg_rdl", name: "Single-Leg Romanian Deadlift", group: "Legs", equipment: "Dumbbell", pattern: "Hinge", loadMode: "external", aka: ["enbens rumänsk marklyft", "single-leg rdl"], activation: [{ muscleId: "hamstrings", factor: 1 }, { muscleId: "gluteals", factor: 0.7 }, { muscleId: "erector_spinae", factor: 0.4 }] },
  // Glutes
  { id: "glute_drive_m", name: "Glute Drive Machine", group: "Glutes", equipment: "Machine", pattern: "Bridge", loadMode: "external", draft: true, aka: ["glute drive", "booty builder"], activation: [{ muscleId: "gluteals", factor: 1 }, { muscleId: "hamstrings", factor: 0.5 }] },
  { id: "cable_pull_through", name: "Cable Pull-Through", group: "Glutes", equipment: "Cable", pattern: "Hinge", loadMode: "external", aka: ["pull-through", "kabel pull through"], activation: [{ muscleId: "gluteals", factor: 1 }, { muscleId: "hamstrings", factor: 0.6 }, { muscleId: "erector_spinae", factor: 0.3 }] },
  // Calves
  { id: "bw_calf_raise", name: "Bodyweight Calf Raise", group: "Calves", equipment: "Bodyweight", pattern: "Calves", loadMode: "bodyweight", bwFraction: 0.9, aka: ["vadpress kroppsvikt", "tåhävning"], activation: [{ muscleId: "calves", factor: 1 }] },
  { id: "tibialis_raise", name: "Tibialis Raise", group: "Calves", equipment: "Bodyweight", pattern: "Calves", loadMode: "bodyweight", bwFraction: 0.3, aka: ["tibialis raise", "främre vad"], activation: [{ muscleId: "tibialis_anterior", factor: 1 }] },
];

// ── Stabila ID:n 001–160 (PDF-övningslista v2.0). String-id förblir funktionell nyckel
// (historik/program/loggning bryts inte); stableId är den publika stabila numreringen. ──
const STABLE_ID = {
  bench_press: "001", incline_bench_bb: "002", incline_db_press: "003", db_bench_press: "004", decline_bench_bb: "005", decline_db_press: "006", chest_press_machine: "007", pec_deck: "008", cable_crossover: "009", db_fly: "010", incline_db_fly: "011", push_ups: "012",
  row: "013", db_row_single: "014", db_row: "015", t_bar_row: "016", seated_cable_row: "017", wide_pulldown: "018", close_pulldown: "019", reverse_pulldown: "020", straight_arm_pulldown: "021", pull_up: "022", chin_up: "023", db_pullover: "024", deadlift: "025", sumo_deadlift: "026", trap_bar_deadlift: "027", barbell_shrug: "028", db_shrug: "029",
  ohp: "030", db_shoulder_press: "031", seated_bb_press: "032", smith_shoulder_press: "033", db_lateral_raise: "034", cable_lateral_raise: "035", db_front_raise: "036", bb_front_raise: "037", rear_delt_fly: "038", bent_over_lateral: "039", upright_row: "040", push_press: "041",
  curl: "042", ez_curl: "043", db_curl: "044", hammer_curl: "045", preacher_curl: "046", incline_curl: "047", concentration_curl: "048", cable_curl: "049", reverse_curl: "050", wrist_curl: "051",
  triceps_pushdown: "052", rope_pushdown: "053", skullcrusher: "054", overhead_ext: "055", close_grip_bench: "056", kickback: "057", french_press: "058", bench_dips: "059", parallel_dip: "060",
  plank: "061", crunch: "062", oblique_crunch: "063", crunch_machine: "064", rope_ab_pulldown: "065", hanging_leg_raise: "066", reverse_crunch: "067",
  squat: "068", front_squat: "069", hack_squat: "070", goblet_squat: "071", leg_press: "072", leg_extension: "073", lunge: "074", bulgarian_split: "075", step_up: "076", wall_sit: "077", bodyweight_squat: "078", jump_squat: "079", lying_leg_curl: "080", seated_leg_curl: "081", rdl: "082", db_rdl: "083", good_morning: "084", glute_ham_raise: "085", back_extension: "086",
  reverse_hyper: "087", sissy_squat: "088", hip_thrust: "089", glute_bridge: "090", kettlebell_swing: "091", cable_kickback: "092", hip_abduction: "093", hip_adduction: "094", cable_abduction: "095", burpees: "096", calf_raise: "097", seated_calf_raise: "098", kb_goblet_squat: "099",
  kb_press: "100", kb_row: "101", kb_rdl: "102", kb_lunge: "103", kb_clean_press: "104", safety_bar_squat: "105", db_neutral_press: "106", chest_supported_row: "107", pallof_press: "108", landmine_press: "109", face_pull: "110",
  // Nya v2.0 (111–160)
  turkish_getup: "111", kb_clean: "112", kb_snatch: "113", kb_front_squat: "114", kb_floor_press: "115", kb_windmill: "116", kb_halo: "117", kb_suitcase_carry: "118", kb_farmers_carry: "119", inverted_row: "120", pike_push_up: "121", assisted_pull_up: "122", nordic_curl: "123", pistol_squat: "124", diamond_push_up: "125", side_plank: "126", bw_calf_raise: "127", dead_bug: "128", bird_dog: "129", ab_wheel: "130", cable_wood_chop: "131",
  incline_chest_press_m: "132", decline_chest_press_m: "133", iso_chest_press_m: "134", high_row_m: "135", iso_row_m: "136", pullover_m: "137", lateral_raise_m: "138", reverse_pec_deck: "139", assisted_dip_m: "140", belt_squat_m: "141", pendulum_squat_m: "142", v_squat_m: "143", single_leg_press: "144", glute_drive_m: "145", standing_leg_curl_m: "146", sled_push: "147", sled_pull: "148", trap_farmers_walk: "149", cable_pull_through: "150", landmine_squat: "151", landmine_row: "152", neutral_pulldown: "153", single_cable_row: "154", half_kneel_cable_press: "155", cable_oh_ext: "156", bayesian_curl: "157", single_leg_rdl: "158", copenhagen_plank: "159", tibialis_raise: "160",
};
// Attacha stabilt id + ny-flagga på varje canonical record.
EXERCISES.forEach(e => { e.stableId = STABLE_ID[e.id] || null; e.isNew = e.stableId ? +e.stableId >= 111 : false; });

const WORKOUTS = [
  { id: "novice", name: "Novice Strength", level: "Novice", mins: 45, focus: "Helkropp · linjär progression",
    desc: "Grundpasset. Få stora baslyft, 3×5. Kör 3 ggr/vecka och lägg på vikt varje pass.",
    plan: [["squat", 3, 5], ["bench_press", 3, 5], ["row", 3, 8], ["ohp", 3, 5]] },
  { id: "intermediate", name: "Intermediate Upper/Lower", level: "Intermediate", mins: 60, focus: "Baslyft + accessoarer",
    desc: "Mer volym. Tunga baslyft följt av accessoarer, 3–4 set. Varje muskel 2 ggr/vecka.",
    plan: [["squat", 4, 6], ["rdl", 3, 8], ["db_bench_press", 3, 8], ["seated_cable_row", 3, 10], ["db_lateral_raise", 3, 12], ["leg_extension", 3, 12]] },
  { id: "advanced", name: "Advanced Strength & Size", level: "Advanced", mins: 75, focus: "Hög volym · compound + isolering",
    desc: "För vana lyftare (2+ år). Tunga baslyft i lågt repspann + isolering för volym, 4–5 set.",
    plan: [["squat", 5, 5], ["deadlift", 3, 3], ["incline_bench_bb", 4, 6], ["wide_pulldown", 4, 8], ["ohp", 4, 6], ["curl", 3, 10], ["skullcrusher", 3, 10], ["calf_raise", 4, 12]] },
  { id: "fullbody", name: "Full-Body", level: "Helkropp", mins: 50, focus: "En övning per muskelgrupp",
    desc: "Balanserat helkroppspass, 3×8–12. Träffar alla större grupper. Bra 2–3 ggr/vecka.",
    plan: [["squat", 3, 10], ["db_bench_press", 3, 10], ["seated_cable_row", 3, 10], ["db_shoulder_press", 3, 10], ["lying_leg_curl", 3, 12], ["plank", 3, 45], ["calf_raise", 3, 15]] },
  { id: "kb_fullbody", name: "Kettlebell Full-Body", level: "Kettlebell", mins: 35, focus: "Kettlebell · styrka + kondition",
    desc: "Helkropp med enbart kettlebell. Svängar för motorn, styrkerörelser runt om. Minimal utrustning.",
    plan: [["kettlebell_swing", 5, 15], ["kb_goblet_squat", 3, 12], ["kb_press", 3, 8], ["kb_row", 3, 10], ["kb_rdl", 3, 10], ["kb_clean_press", 3, 6]] },
];

const SPORT_INTENSITY = { "Lätt": 0.7, "Medel": 1.0, "Hård": 1.35 };

const HIIT_MULT = 1.4;

const HIIT_MUSCLE_MULT = 1.15;

const SPORTS = [
  { id: "innebandy", name: "Innebandy", icon: "🏒", color: "#4DA3FF", cardio: 0.9, desc: "Sprint, sidledsrörelser och skott — belastar ben, säte och bål. Hög kondition.",
    activation: [{ muscleId: "quadriceps", factor: 0.9 }, { muscleId: "calves", factor: 0.8 }, { muscleId: "hamstrings", factor: 0.7 }, { muscleId: "gluteals", factor: 0.7 }, { muscleId: "hip_flexors", factor: 0.6 }, { muscleId: "obliques", factor: 0.5 }, { muscleId: "rectus_abdominis", factor: 0.4 }, { muscleId: "erector_spinae", factor: 0.3 }, { muscleId: "forearms", factor: 0.3 }, { muscleId: "deltoid_anterior", factor: 0.2 }] },
  { id: "muaythai", name: "Muay Thai", icon: "🥊", color: "#FF5C5C", cardio: 0.85, desc: "Slag, sparkar och knän — belastar axlar, bål, höftböjare och vader. Hög kondition.",
    activation: [{ muscleId: "obliques", factor: 0.8 }, { muscleId: "hip_flexors", factor: 0.8 }, { muscleId: "rectus_abdominis", factor: 0.7 }, { muscleId: "calves", factor: 0.7 }, { muscleId: "quadriceps", factor: 0.6 }, { muscleId: "deltoid_anterior", factor: 0.6 }, { muscleId: "deltoid_lateral", factor: 0.5 }, { muscleId: "hamstrings", factor: 0.5 }, { muscleId: "gluteals", factor: 0.5 }, { muscleId: "forearms", factor: 0.5 }, { muscleId: "triceps_brachii", factor: 0.4 }, { muscleId: "erector_spinae", factor: 0.3 }] },
];

const CUES = {
  safety_bar_squat: ["Stången vilar på axlarna, greppa handtagen", "Håll bålen upprätt — stången vill fälla dig framåt", "Sänk till djup du behärskar, knäna följer tårna", "Driv upp genom hela foten"],
  db_neutral_press: ["Handflatorna mot varandra (neutralt grepp)", "Armbågarna något indragna, skonsamt för axeln", "Pressa upp och lätt ihop", "Sänk kontrollerat till brösthöjd"],
  chest_supported_row: ["Bröstet mot dynan, undvik att kasta med kroppen", "Dra med armbågarna bakåt/nedåt", "Kläm ihop skulderbladen i toppen", "Sänk kontrollerat till full sträckning"],
  pallof_press: ["Stå sidledes mot kabeln, handtaget vid bröstet", "Spänn bålen och motstå rotationen", "Pressa rakt ut och håll emot", "För in mot bröstet igen utan att vrida"],
  landmine_press: ["Stångänden i ett hörn, greppa andra änden i axelhöjd", "Bålen spänd, pressa upp och lätt framåt", "Skonsam vinkel för axeln — pressa inte rakt över huvudet", "Sänk kontrollerat till axeln"],
  face_pull: ["Rep i ansiktshöjd, dra mot pannan", "För armbågarna högt och brett", "Rotera ut axlarna i slutläget", "Släpp fram kontrollerat"],
  squat: ["Fötter axelbrett, tår lätt utåt", "Bröst upp, neutral rygg, spänn bålen", "Höften bakåt och ner, knän i linje med tår", "Minst till parallell, tryck ifrån genom hälarna"],
  front_squat: ["Stången vilar på främre axeln, armbågar högt", "Håll bålen upprätt genom hela lyftet", "Knän utåt, djup till parallell", "Tryck ifrån genom mitten av foten"],
  bench_press: ["Skulderbladen ihopdragna och nedåt", "Lätt svank, fötterna stadigt i golvet", "Sänk stången mot nedre bröstet", "Pressa upp och lätt bakåt, lås inte armbågarna hårt"],
  incline_bench_bb: ["Bänk 30–45° lutning", "Skulderbladen ihop, stadig bål", "Sänk mot övre bröstet", "Pressa rakt upp i en kontrollerad båge"],
  db_bench_press: ["Håll handlederna raka över armbågarna", "Skulderbladen ihopdragna", "Sänk hantlarna till brösthöjd", "Pressa ihop upptill utan att låsa hårt"],
  ohp: ["Stången i axelhöjd, greppet strax utanför axlarna", "Spänn bål och säte, revben ner", "Pressa rakt upp, för in huvudet när stången passerar", "Lås ut med stången över mitten av foten"],
  db_shoulder_press: ["Sitt eller stå med spänd bål", "Starta i axelhöjd, handlederna raka", "Pressa upp utan att svanka", "Sänk kontrollerat till axelhöjd"],
  deadlift: ["Stången nära smalbenen, greppet utanför knäna", "Neutral rygg, spänn bålen, bröst upp", "Driv med benen och för höften mot stången", "Lås ut med raka höfter — luta dig inte bakåt"],
  sumo_deadlift: ["Bred fotställning, tår utåt, grepp innanför knäna", "Sänk höften, håll bröstet upp", "Driv isär golvet med fötterna", "Lås ut höft och knän samtidigt"],
  rdl: ["Lätt böjda knän genom hela lyftet", "Skjut höften bakåt, stången nära benen", "Känn sträckning i baksida lår", "Res dig genom att föra höften framåt"],
  row: ["Böj i höften ~45°, neutral rygg", "Dra stången mot nedre bröst/övre mage", "Led med armbågarna, kläm ihop skulderbladen", "Sänk kontrollerat, tappa inte hållningen"],
  pull_up: ["Fullt hängande start, aktivera skulderbladen", "Dra armbågarna ner och bak", "Bröstet mot stången, undvik att svinga", "Sänk kontrollerat till raka armar"],
  chin_up: ["Underhandsgrepp axelbrett", "Dra med rygg och biceps", "Hakan över stången utan att svinga", "Sänk hela vägen till raka armar"],
  lunge: ["Ta ett stadigt steg framåt", "Sänk tills bakre knät nästan når golvet", "Främre knät över foten, inte förbi tårna", "Tryck ifrån genom främre hälen"],
  bulgarian_split: ["Bakre foten på bänk, stå stadigt", "Sänk rakt ner, bålen upprätt", "Främre knät i linje med foten", "Tryck upp genom främre hälen"],
  hip_thrust: ["Övre ryggen mot bänk, fötter platt", "Hakan indragen, revben ner", "Driv höften upp till rak linje axel–knä", "Kläm sätet i toppen, sänk kontrollerat"],
  leg_press: ["Fötter axelbrett på plattan", "Sänk tills knä ~90°, rygg mot stödet", "Tryck genom hälarna", "Lås inte knäna hårt i toppen"],
  wide_pulldown: ["Brett grepp, dra ner skulderbladen först", "Dra stången mot övre bröstet", "Led med armbågarna, luta bålen lätt bak", "Släpp upp kontrollerat till full sträckning"],
  parallel_dip: ["Starta med raka armar, axlar nedåt", "Luta bålen lätt framåt för bröst", "Sänk tills axlar är i armbågshöjd", "Pressa upp utan att rycka"],
  curl: ["Armbågarna stilla vid sidorna", "Lyft utan att svinga med kroppen", "Kläm biceps i toppen", "Sänk långsamt till raka armar"],
  kettlebell_swing: ["Höftgångjärn, inte knäböj", "Kettlebell svingas av höftens kraft", "Neutral rygg, spänn bål och säte", "Toppen når brösthöjd — armarna är bara krokar"],
  plank: ["Armbågar under axlarna", "Rak linje från huvud till häl", "Spänn bål och säte, andas lugnt", "Låt inte höften sjunka eller lyftas"],
  // Nya v2.0
  inverted_row: ["Kroppen rak, hälarna i golvet", "Dra bröstet mot stången", "Kläm ihop skulderbladen", "Sänk kontrollerat till raka armar"],
  pike_push_up: ["Höften högt, kroppen som ett upp-och-ner-V", "Sänk hjässan mot golvet", "Pressa upp genom axlarna", "Håll bålen spänd"],
  diamond_push_up: ["Händerna ihop under bröstet (diamant)", "Armbågarna nära kroppen", "Sänk bröstet mot händerna", "Pressa upp, spänn bålen"],
  pistol_squat: ["Ett ben rakt fram, sänk på ett ben", "Håll hälen i golvet, bålen upprätt", "Ner till djup du behärskar", "Tryck upp utan att tappa balansen"],
  nordic_curl: ["Fäst vristerna, knäna på dyna", "Håll höften rak — fäll från knät", "Bromsa nedgången så långt du kan", "Skjut ifrån golvet lätt om det behövs"],
  ab_wheel: ["Starta på knä, hjulet under axlarna", "Spänn bålen, undvik svank", "Rulla ut så långt du behärskar", "Dra tillbaka med magen, inte höften"],
  side_plank: ["Armbåge under axeln", "Rak linje huvud–höft–fot", "Lyft höften, spänn sidan av bålen", "Håll — sänk inte höften"],
  dead_bug: ["Ligg på rygg, armar mot taket, knän 90°", "Pressa ländryggen mot golvet", "Sänk motsatt arm och ben långsamt", "Håll bålen spänd hela tiden"],
  bird_dog: ["Stå på alla fyra, neutral rygg", "Sträck motsatt arm och ben", "Håll höften stilla, ingen rotation", "Återgå kontrollerat, växla sida"],
  copenhagen_plank: ["Övre foten på bänk, underarmen i golvet", "Lyft höften till rak linje", "Spänn insida lår", "Håll — börja kort och bygg på"],
  turkish_getup: ["Börja liggande, vikt rakt upp", "Res dig stegvis: armbåge, hand, brygga, knä", "Håll blicken på vikten hela vägen", "Backa samma väg ner, kontrollerat"],
  kb_farmers_carry: ["Stå lång, axlar ner och bak", "Greppa hårt, spänn bålen", "Gå med kontrollerade steg", "Låt inte kroppen luta åt sidan"],
  kb_suitcase_carry: ["Vikt i en hand, stå rakt", "Motstå att luta mot vikten", "Spänn motsatt sida av bålen", "Gå stadigt, byt sida"],
  sled_push: ["Lågt grepp, kroppen lutad framåt", "Driv med benen i korta kraftfulla steg", "Håll bålen spänd", "Andas i takt med stegen"],
  landmine_squat: ["Håll stångänden vid bröstet", "Sänk i knäböj, bålen upprätt", "Knäna i linje med tårna", "Tryck upp genom hälarna"],
  single_leg_rdl: ["Stå på ett ben, lätt böjt knä", "Fäll i höften, bakre benet bakåt", "Rygg neutral, känn baksida lår", "Res upp genom att föra höften fram"],
  cable_pull_through: ["Vänd ryggen mot kabeln, repet mellan benen", "Skjut höften bakåt (gångjärn)", "Res dig genom att klämma sätet", "Låt inte det bli en knäböj"],
  reverse_pec_deck: ["Bröstet mot dynan, greppa handtagen", "För armarna bakåt och isär", "Kläm ihop bakre axlar/skulderblad", "Släpp fram kontrollerat"],
  bayesian_curl: ["Kabeln bakom dig, armen bakåtsträckt", "Curla utan att flytta armbågen fram", "Kläm biceps i toppen", "Släpp till full sträckning för stretch"],
};

const EX_GROUPS = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Core", "Legs", "Glutes", "Calves"];

const EQUIP_ALL = ["Barbell", "Bodyweight", "Cable", "Dumbbell", "EZ Bar", "Kettlebell", "Machine", "T-bar", "Trap bar", "Landmine", "Sled", "Ab Wheel"];

const EQUIP_PROFILES = {
  Gym: EQUIP_ALL,
  Hemma: ["Dumbbell", "Kettlebell", "Bodyweight", "Ab Wheel"],
  Kettlebell: ["Kettlebell", "Bodyweight"],
  Kroppsvikt: ["Bodyweight"],
};

const BODYWEIGHT = 82.4;

const STRENGTH_STD = { bench_press: [0.75, 1.0, 1.5], squat: [1.0, 1.5, 2.0], deadlift: [1.25, 1.75, 2.25], ohp: [0.5, 0.7, 1.0] };

const MAIN_LIFTS = [["bench_press", "Bänkpress"], ["squat", "Knäböj"], ["deadlift", "Marklyft"], ["ohp", "Militärpress"], ["row", "Skivstångsrodd"]];

export { EXERCISES, WORKOUTS, SPORT_INTENSITY, HIIT_MULT, HIIT_MUSCLE_MULT, SPORTS, CARDIO, CUES, EX_GROUPS, EQUIP_ALL, EQUIP_PROFILES, BODYWEIGHT, STRENGTH_STD, MAIN_LIFTS, STABLE_ID, resolveActivity, DEFAULT_ACTIVE_SPORTS };

// Cardio/kondition — samma form som SPORTS (cardio-faktor 0–1 + aktivering), byggs med computeCardioLoad/computeSportLoad.
const CARDIO = [
  { id: "lopning", name: "Löpning", icon: "🏃", color: "#4DA3FF", cardio: 0.9, desc: "Löpning utomhus eller på band.",
    activation: [{ muscleId: "quadriceps", factor: 0.7 }, { muscleId: "hamstrings", factor: 0.7 }, { muscleId: "calves", factor: 0.8 }, { muscleId: "gluteals", factor: 0.6 }, { muscleId: "hip_flexors", factor: 0.5 }, { muscleId: "tibialis_anterior", factor: 0.4 }, { muscleId: "erector_spinae", factor: 0.3 }] },
  { id: "cykling", name: "Cykling", icon: "🚴", color: "#39D98A", cardio: 0.8, desc: "Cykel ute eller spinning.",
    activation: [{ muscleId: "quadriceps", factor: 0.8 }, { muscleId: "gluteals", factor: 0.6 }, { muscleId: "hamstrings", factor: 0.5 }, { muscleId: "calves", factor: 0.5 }] },
  { id: "rodd", name: "Rodd", icon: "🚣", color: "#9B7CFF", cardio: 0.85, desc: "Roddmaskin — helkropp.",
    activation: [{ muscleId: "latissimus_dorsi", factor: 0.7 }, { muscleId: "quadriceps", factor: 0.7 }, { muscleId: "erector_spinae", factor: 0.6 }, { muscleId: "hamstrings", factor: 0.5 }, { muscleId: "gluteals", factor: 0.5 }, { muscleId: "biceps_brachii", factor: 0.4 }, { muscleId: "trapezius", factor: 0.4 }, { muscleId: "rectus_abdominis", factor: 0.3 }] },
  { id: "simning", name: "Simning", icon: "🏊", color: "#4DA3FF", cardio: 0.85, desc: "Simning — helkropp, skonsamt för lederna.",
    activation: [{ muscleId: "latissimus_dorsi", factor: 0.7 }, { muscleId: "deltoid_posterior", factor: 0.5 }, { muscleId: "deltoid_anterior", factor: 0.5 }, { muscleId: "triceps_brachii", factor: 0.5 }, { muscleId: "pectoralis_major", factor: 0.4 }, { muscleId: "rectus_abdominis", factor: 0.4 }, { muscleId: "gluteals", factor: 0.3 }] },
  { id: "gang", name: "Rask gång", icon: "🚶", color: "#39D98A", cardio: 0.45, desc: "Rask promenad eller lutande gång på band.",
    activation: [{ muscleId: "calves", factor: 0.5 }, { muscleId: "quadriceps", factor: 0.4 }, { muscleId: "gluteals", factor: 0.4 }, { muscleId: "hamstrings", factor: 0.3 }] },
  { id: "hopprep", name: "Hopprep", icon: "🪢", color: "#FFD166", cardio: 0.9, desc: "Hopprep — hög intensitet, mycket vader.",
    activation: [{ muscleId: "calves", factor: 0.8 }, { muscleId: "quadriceps", factor: 0.4 }, { muscleId: "forearms", factor: 0.4 }, { muscleId: "deltoid_lateral", factor: 0.3 }] },
  { id: "trappmaskin", name: "Trappmaskin", icon: "🪜", color: "#9B7CFF", cardio: 0.8, desc: "StairMaster / trappmaskin.",
    activation: [{ muscleId: "quadriceps", factor: 0.7 }, { muscleId: "gluteals", factor: 0.7 }, { muscleId: "calves", factor: 0.5 }, { muscleId: "hamstrings", factor: 0.4 }] },
  { id: "crosstrainer", name: "Crosstrainer", icon: "🎿", color: "#4DA3FF", cardio: 0.7, desc: "Elliptical/crosstrainer — skonsam helkroppscardio.",
    activation: [{ muscleId: "quadriceps", factor: 0.6 }, { muscleId: "gluteals", factor: 0.5 }, { muscleId: "hamstrings", factor: 0.4 }, { muscleId: "calves", factor: 0.4 }, { muscleId: "latissimus_dorsi", factor: 0.3 }] },
  { id: "hiit", name: "HIIT-intervaller", icon: "🔥", color: "#FF5C5C", cardio: 0.95, desc: "Intervaller med hög intensitet.",
    activation: [{ muscleId: "quadriceps", factor: 0.7 }, { muscleId: "gluteals", factor: 0.6 }, { muscleId: "calves", factor: 0.5 }, { muscleId: "hamstrings", factor: 0.5 }, { muscleId: "rectus_abdominis", factor: 0.4 }, { muscleId: "deltoid_anterior", factor: 0.3 }] },
];

// ── SPORT-BIBLIOTEK: resolver ──────────────────────────────────────
// Appens gamla id:n (innebandy) och bibliotekets (floorball) resolvas till en full
// aktivitet. Har den en detaljmodell i SPORTS/CARDIO används den; annars byggs en
// från kategorins CAT_LOAD (ärligt estimat). libId pekar ut relief-ikonen.
const LIB_TO_APP = Object.fromEntries(Object.entries(LEGACY_MAP).map(([app, lib]) => [lib, app]));
function resolveActivity(id) {
  if (!id) return null;
  const appId = LIB_TO_APP[id];
  const existing = [...SPORTS, ...CARDIO].find(a => a.id === id || a.id === appId);
  if (existing) return { ...existing, libId: LEGACY_MAP[existing.id] || existing.id };
  const meta = SPORT_META[id];
  if (!meta) return null;
  const load = CAT_LOAD[meta.cat] || CAT_LOAD["cardio-endurance"];
  return { id, name: meta.sv, icon: meta.type === "machine" ? "\u2699\ufe0f" : "\ud83c\udfc5", color: "#4DA3FF", cardio: load.cardio,
    activation: load.activation.map(([muscleId, factor]) => ({ muscleId, factor })),
    desc: meta.sv + " \u2014 uppskattad belastning utifr\u00e5n kategori.", fromLibrary: true, libId: id };
}
// Standard "framme"-set: appens tidigare aktiviteter som biblioteks-id:n (inget regredierar).
const DEFAULT_ACTIVE_SPORTS = ["floorball", "muay-thai", "running", "cycling", "rowing", "swimming", "power-walking", "jump-rope", "cardio-stair-climber", "cardio-elliptical", "hiit"];
