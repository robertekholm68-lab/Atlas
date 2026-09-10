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
  // Källa: styrkelabbet.se/triceps-pushdown och muscles.se/ovningsbank/
  // armovningar/triceps/pushdowns. Egna formuleringar, inget ordagrant.
  //
  // INGEN SEKUNDÄRMUSKEL LADES TILL i activation. Flera källor understryker
  // att pushdown är en renodlad isolationsövning, och att man känner den i
  // bröst eller rygg är ett tecken på att TEKNIKEN brustit — inte på att de
  // musklerna belastas. Att lägga in dem hade varit att skriva in ett fel.
  // Källor: styrkelabbet.se/sidolyft-med-hantlar, gymgrossisten.com/
  // sidolyft-med-hantlar, muscles.se/.../hantellyft-at-sidan,
  // privatetrainingonline.se/hantellyft-sidan, mathiaszachau.com/sidolyft-hantlar.
  // Egna formuleringar.
  //
  // ALLA KÄLLOR SÄGER SAMMA TRE SAKER, och de står i punkt 2-4:
  //
  //   LED MED ARMBÅGARNA, inte händerna. Armbågen ska vara högst i toppen.
  //   Är handleden högre roterar man axeln utåt och träffar FRÄMRE deltoideus
  //   i stället för den yttre.
  //
  //   STANNA VID AXELHÖJD. Högre kopplar ur mellersta deltoideus och låter
  //   trapezius ta över — man gör en shrug, inte ett sidolyft.
  //
  //   SKULDRORNA NER. Drar man upp hela axelpartiet mot öronen tar
  //   kappmuskeln över, och nacken får spänningar.
  //
  // Lätt framåtlutning och lyft i skapulaplanet (cirka 30 grader framåt)
  // ger mest utrymme i axelleden. Rakt ut åt sidan ökar risken för
  // impingement enligt Gymgrossisten.
  db_lateral_raise: ["Stå med lätt böjda knän och luta överkroppen 10-15 grader framåt", "Böj armbågarna lätt och lås vinkeln — leda med armbågen, inte handen", "Lyft ut och något framåt tills överarmarna är horisontella", "Håll skuldrorna nedpressade och sänk kontrollerat"],

  // Kabeln drar hela vägen, till skillnad från hantlar som är nästan
  // avlastade i botten. Därför känns den tyngre på samma vikt.
  // UPPRÄTT RODD / DRAG TILL HAKAN. Källor: gymgrossisten.com/
  // drag-till-hakan-med-skivstang, mathiaszachau.com/uppratt-rodd,
  // privatetrainingonline.se/uppratt-rodd, proteinpannkaka.se/ovningar/
  // staende-rodd-upright-row. Egna formuleringar.
  //
  // Övningen är den mest omdiskuterade i axelbanken — källorna kallar den
  // kontroversiell och nämner inklämning (impingement) i axeln. De är eniga om
  // exakt vad som skiljer en bra upprätt rodd från en dålig, och de tre
  // sakerna bär punkt 1–3:
  //
  //   INTE FÖR SMALT GREPP. Händerna tätt ihop tvingar axelleden i en onaturlig
  //   vinkel. Axelbrett eller strax innanför är det källorna landar i.
  //
  //   LED MED ARMBÅGARNA. Händerna håller bara stången; armbågarna drar uppåt
  //   och något utåt — inte rakt bakåt.
  //
  //   ARMBÅGARNA ALDRIG ÖVER AXELHÖJD. Stanna när överarmarna är horisontella.
  //   Högre gör det till en trapezius-övning och är just där inklämningen
  //   uppstår.
  //
  // Punkt 4 höll först med att för tung vikt tvingar fram en sving — sant enligt
  // källorna, men meningen blev 118 tecken mot 62–85 för de andra och gick till
  // tre rader i kortet. Mätt i skärmbild: listan sköts upp så punkt 1 hamnade
  // vid knäna. Kortad till 76 tecken; viktresonemanget ryms i punkt 3–4 ändå.
  //
  // Aktiveringen rörs inte: deltoid_lateral 0,8 och trapezius 0,7 är precis
  // vad källorna beskriver, och biceps 0,3 följer av armböjningen.
  upright_row: ["Stå höftbrett med stången mot låren, överhandsgrepp ungefär axelbrett — inte smalare", "Spänn bålen och stå stolt med bröstet upp, ryggen neutral", "Dra med armbågarna uppåt och något utåt, händerna bara håller stången", "Stanna vid horisontella överarmar och sänk kontrollerat — aldrig över axelhöjd"],

  // PUSH PRESS / STÖTPRESS. Källor: privatetrainingonline.se/stotpress,
  // mmsports.se/blogg/push-press-teknik-och-tips, privatetrainingonline.se/
  // militarpress (jämförelsen), mathiaszachau.com/thrusters-stang,
  // styrketraningonline.se/push-press. Egna formuleringar.
  //
  // DET SOM SKILJER FRÅN MILITÄRPRESS ÄR HELA POÄNGEN, och källorna säger det
  // rakt ut: i militärpress får benen inte hjälpa till, i push press ska de.
  // Kraften hämtas från underkroppen så att axlar och triceps kan belastas
  // tyngre än de klarar strikt.
  //
  // Rörelsen kallas "dip and drive" och de två delarna bär punkt 2 och 3:
  //
  //   DIPPEN ÄR KORT OCH GRUND. En djup knäböj gör det till en thruster —
  //   en annan övning. Överkroppen ska stå upprätt genom dippen, annars
  //   hamnar stången framför lodlinjen.
  //
  //   DRIVET ÄR EXPLOSIVT. Benen sträcks först, armarna tar över och låser ut.
  //   Stången går rakt upp; framåt eller bakåt är fel bana (Zachau om
  //   militärpressens bana, gäller lika här).
  //
  // Aktiveringen rörs inte — quadriceps 0,3 är just bendrivet, och att det
  // står med är rätt enligt källorna.
  push_press: ["Stå axelbrett med stången vilande mot främre axlarna, bålen spänd", "Dippa kort och grunt med knäna, överkroppen kvar upprätt", "Sträck benen explosivt och låt armarna ta över och låsa ut rakt upp", "Sänk kontrollerat tillbaka till axlarna innan nästa repetition"],

  // KETTLEBELL: CLEAN, SNATCH, CLEAN & PRESS, HALO. Källor: styrkelabbet.se/
  // kettlebell-clean, /kettlebell-snatch, /kettlebellpress, /kettlebells-ovningar,
  // styrkeprogrammet.se/ovningsarkiv (halo), gymkompaniet.se/kettlebell-ovningar,
  // mygreatness.com/guide-sa-tranar-du-med-kettlebells. Egna formuleringar.
  //
  // TRE SAKER GÅR IGEN I ALLA KETTLEBELL-KÄLLORNA och styr punkterna nedan:
  //
  //   KRAFTEN KOMMER FRÅN HÖFTEN, inte armen. Källorna beskriver clean och
  //   snatch som svingens släktingar — armen styr banan, höften driver.
  //   Görs de som en curl slår klotet hårt mot underarm och axel.
  //
  //   RAK HANDLED. Nämns uttryckligen för både clean och press.
  //
  //   KLOTET SKA VÄLTA, INTE SLÅ. Vid övergången smyger man in armen under
  //   handtaget i stället för att låta klotet falla runt handen.
  //
  // Clean: rackpositionen ÄR övningens slutläge — klotet vilar mot underarm
  // och bröst, inte i ett hårt grepp.
  // KETTLEBELLPRESS. Källor: styrkelabbet.se/kettlebellpress och
  // /kettlebells-ovningar, gymkompaniet.se/kettlebellovningar,
  // linabjorkskog.com (rackpositionen). Egna formuleringar.
  //
  // Raden fanns inte — min grep räknade träffar på "kb_press" i program- och
  // id-tabellerna och trodde att punkterna fanns. Verifieringsskriptet fångade
  // det: bild registrerad, noll punkter i DOM. Det är precis det tomma mörka
  // fält som processen varnar för.
  //
  // Källorna framhåller två saker som är särskilda för kettlebellpressen:
  //
  //   AXELN SKA VARA SÄNKT genom hela lyftet — den är starkast och stabilast
  //   där, och åker den upp ur sitt läge både ökar skaderisken och orkar man
  //   mindre.
  //
  //   PRESSA MED AXELN, INTE BENEN. Skjuter man ifrån med benen är det push
  //   press, en annan övning (som nu finns med egen bild och egna punkter).
  //
  // Bålen står med i aktiveringen och det stämmer: med ett klot i en hand
  // måste de sneda magmusklerna kontra den ensidiga belastningen.
  kb_press: ["Frivänd klotet till rackposition mot underarm och bröst, rak handled", "Stå något bredare än axelbrett, spänn mage och säte", "Pressa upp till rak arm med axeln sänkt — skjut inte ifrån med benen", "Sänk kontrollerat tillbaka till rackposition med spänd lats"],

  kb_clean: ["Stå brett med kettlebellen en halvmeter framför dig, greppa med en hand", "Skicka klotet bakåt mellan benen och res dig explosivt med höften", "Styr klotet nära kroppen och smyg in armen under handtaget", "Fånga i rackposition mot underarm och bröst, med rak handled"],

  // Snatch: samma start som clean, men klotet går hela vägen upp. Styrkelabbet
  // beskriver draget som att starta en motorgräsklippare — det ändrar banan så
  // klotet seglar upp i stället för att fortsätta framåt. Källorna är eniga om
  // att enhandssvingen måste sitta först; övningen kallas den tekniskt
  // svåraste av kettlebellövningarna.
  kb_snatch: ["Sätt fart på klotet med en enhandssving bakåt mellan benen", "Res dig explosivt med höften och dra klotet in mot kroppen", "Vrid handen runt handtaget så klotet vänder utan att slå mot underarmen", "Lås ut armen rakt över huvudet med sänkt axel och rak handled"],

  // Clean & press: clean upp, press över huvudet, en repetition. Styrkelabbet
  // om pressdelen: håll axeln sänkt (den är starkast där), spänn mage och
  // rumpa, och pressa med axeln — hjälper benen till är det push press, en
  // annan övning.
  kb_clean_press: ["Frivänd klotet till rackposition med rak handled och sänkt axel", "Spänn mage och säte, knyt den fria handen hårt", "Pressa upp till rak arm utan att skjuta ifrån med benen", "Sänk till rackposition igen och gör en ny clean inför nästa rep"],

  // Halo: rörlighetsövning, inte styrkeövning. Källorna kallar den uppvärmning
  // inför tyngre kettlebellarbete, och säger att den inte ska tvingas fram —
  // känns det stopp i axeln är rörligheten inte där än.
  kb_halo: ["Håll kettlebellen upp och ner i handtaget med båda händerna", "För klotet runt huvudet nära, ett varv åt vardera hållet", "Håll huvud och bål stilla — det är bara armarna som rör sig", "Lätt vikt och långsamt; tvinga aldrig igenom ett stopp i axeln"],

  // SIDOLYFT I MASKIN. Källor: styrkelabbet.se/sidolyft-i-maskin,
  // fitnessclubcenter.se/artikel/sidolyft, muscles.se/.../hantellyft-at-sidan.
  // Egna formuleringar.
  //
  // Maskinen tar bort svängningen men inte de två felen som gäller allt
  // sidolyft: för tung vikt, och att lyfta högre än axelhöjd så trapezius tar
  // över. Det maskinspecifika är INSTÄLLNINGEN — dynorna mot armbågarna och
  // vridpunkten i linje med axelleden; sitter man fel går rörelsen inte där
  // axeln vill.
  lateral_raise_m: ["Ställ sitshöjden så maskinens vridpunkt ligger i linje med axeln", "Placera armbågarna mot dynorna, inte händerna", "Lyft ut åt sidorna tills överarmarna är horisontella, inte högre", "Sänk kontrollerat — hellre lätt vikt och kontakt än tung och sving"],

  // OMVÄNDA FLYES I KABELKORS. Källor: gymgrossisten.com/
  // omvanda-flyes-i-kabelmaskin, privatetrainingonline.se/omvanda-flyes,
  // muscles.se/.../omvanda-hantelflyes, fitnessclubcenter.se/artikel/
  // omvanda-flyes. Egna formuleringar.
  //
  // KORSNINGEN ÄR HELA UPPSTÄLLNINGEN och måste stå först: vänster vajer i
  // höger hand, höger vajer i vänster. Källorna beskriver den så uttryckligen.
  // Utan korsning finns inget motstånd i den riktning armarna ska gå.
  //
  // Källorna är eniga om resten:
  //
  //   HORISONTELL ABDUKTION MED IHOPTRYCKTA SKULDERBLAD är det som gör att
  //   bakre deltoideus och mellersta trapezius jobbar. Gymgrossisten skriver
  //   att det är hela syftet med övningen.
  //
  //   ARMBÅGSVINKELN LÅSES. Böjs och sträcks armbågarna blir det en rodd.
  //
  //   KABELNS FÖRDEL ÄR JÄMN BELASTNING genom hela banan, till skillnad från
  //   hantlar där det är lättast i botten. Den fördelen går förlorad om man
  //   svingar — därför lätt vikt och kontrollerad återgång.
  //
  // Aktiveringen rörs inte: deltoid_posterior 1 och trapezius 0,4 stämmer med
  // källorna. Rhomboiderna nämns också men finns inte i taxonomin.
  rear_delt_fly: ["Stå mellan två höga trissor och korsa kablarna — vänster vajer i höger hand", "Håll armarna framför dig i axelhöjd med låst, lätt böjd armbågsvinkel", "Dra isär rakt ut åt sidorna och tryck ihop skulderbladen i slutläget", "Låt kablarna dra tillbaka armarna kontrollerat utan att armbågarna böjs"],

  // Lutande hantelcurl: bänkens lutning är övningen. Med ryggen mot ett stöd
  // i 45-60 grader hamnar armbågen BAKOM kroppslinjen, vilket sträcker biceps
  // långa huvud i bottenläget — det källorna anger som skälet att välja den.
  // Den sittande positionen tar dessutom bort all möjlighet att fuska med
  // höften. Källorna varnar för att låta överarmarna glida framåt: gör de det
  // försvinner stretchen som är hela poängen.
  incline_curl: ["Ställ bänken i 45-60 grader och luta dig tillbaka mot stödet", "Låt armarna hänga rakt ner bakom kroppslinjen med handflatorna framåt", "Curla upp mot axlarna utan att dra överarmarna framåt", "Sänk hela vägen ner och behåll stretchen i botten"],

  // Koncentrationscurl. Källorna är eniga om det vanligaste felet, och det
  // bär punkt 2: armbågens SPETS ska inte ligga ovanpå låret eller knäskålen.
  // Då blir leden en gungbräda och man kan hjälpa till med benet. Den köttiga
  // baksidan av överarmen ska pressas mot lårets insida så armen låses.
  //
  // Gymgrossisten beskriver också supinationsvarianten: vrid underarmen på
  // vägen upp så tummen pekar mot knät i toppen, vilket får biceps att arbeta
  // mer. Den är med i punkt 3.
  concentration_curl: ["Sitt brett med fötterna stadigt och en hantel i ena handen", "Pressa överarmens baksida mot lårets insida — inte armbågsspetsen på låret", "Curla upp mot axeln och vrid handflatan uppåt på vägen", "Kläm biceps i toppen och sänk långsamt utan att gunga med benet"],

  // Kabelcurl: kabelns fördel enligt källorna är att belastningsriktningen är
  // diagonal mot golvet, så biceps aldrig får vila — till skillnad från stång
  // och hantel där spänningen försvinner i bottenläget. Den fördelen kräver
  // att man står tillräckligt långt fram för att kabeln ska dra hela vägen.
  cable_curl: ["Fäst stången i den lägsta trissan och ta ett steg framåt", "Stå med spänd bål och armbågarna intill sidorna", "Curla upp mot bröstet utan att låta armbågarna glida bakåt", "Släpp tillbaka mot kabelns drag utan att tappa spänningen"],

  // Handledscurl: rörelsen sker i handleden, inte armbågen. Källorna beskriver
  // att stången ska tillåtas rulla ut på fingrarna i bottenläget och sedan
  // dras in med fingrarna igen — det är det som ger underarmarna fullt
  // arbete. Vanligaste felet är att underarmarna vinklas snett utåt, vilket
  // belastar handleder och fingrar ojämnt.
  wrist_curl: ["Sitt med underarmarna på låren och händerna utanför knäna", "Håll underarmarna parallella, inte snett utåt", "Låt stången rulla ut på fingrarna och böj handlederna nedåt", "Dra in stången med fingrarna och curla upp knogarna så högt som möjligt"],

  cable_lateral_raise: ["Ställ dig med trissan i lågt läge på motsatt sida om armen", "Böj armbågen lätt och håll vinkeln genom hela lyftet", "Lyft ut åt sidan tills överarmen är horisontell, inte högre", "Håll skuldran nere och släpp tillbaka kontrollerat mot kabelns drag"],

  // FRAMÅTLYFT. Källor: styrkelabbet.se/framatlyft-med-hantlar,
  // styrkelabbet.se/framatlyft-med-skivstang, mathiaszachau.com/
  // framatlyft-hantlar. Egna formuleringar.
  //
  // Alla tre säger samma två saker, och de bär punkt 3 och 4:
  //
  //   STANNA VID AXELHÖJD. Lyfts hantlarna högre går arbetet över till
  //   trapezius — främre deltoideus har gjort sitt när armen är horisontell.
  //
  //   LÄTT VIKT, STRIKT. Övningen är lätt att fuska med genom att luta sig
  //   bakåt och svinga upp vikten; det ger mer kilo på hanteln men mindre
  //   belastning på just den muskel övningen finns till för. Sänk
  //   kontrollerat — släpp inte.
  //
  // Bara främre deltoideus i aktiveringen, som i datan. Källorna beskriver
  // en isolationsövning; känns den i kappmuskeln har man lyft för högt.
  db_front_raise: ["Stå stadigt med hantlarna hängande framför låren, lätt böjda armbågar", "Spänn bålen och håll överkroppen stilla — ingen gungning bakåt", "Lyft kontrollerat rakt fram tills armarna är horisontella, inte högre", "Sänk lika kontrollerat, hellre lättare vikt än sämre form"],

  // Stången tvingar båda armarna att gå i takt och tar bort möjligheten att
  // alternera, i övrigt samma regler som hantelvarianten.
  bb_front_raise: ["Håll stången med överhandsgrepp ungefär axelbrett, hängande mot låren", "Spänn bålen och undvik att luta dig bakåt när stången lämnar låren", "Lyft med nästan raka armar tills stången är i axelhöjd, inte över", "Sänk kontrollerat hela vägen ner utan att släppa spänningen"],

  // BENT-OVER LATERAL / OMVÄNDA HANTELFLYES. Källor: muscles.se/.../
  // omvanda-hantelflyes, mathiaszachau.com/omvanda-flyes-hantlar,
  // privatetrainingonline.se/omvanda-flyes. Egna formuleringar.
  //
  // Källorna är eniga om tre saker:
  //
  //   FÄLL I HÖFTEN MED RAK RYGG tills överkroppen är nära horisontell —
  //   det är fällningen som vänder lyftet bakåt och träffar bakre deltoideus.
  //
  //   LÅS ARMBÅGSVINKELN OCH LED MED ARMBÅGARNA. Böjer och sträcker man
  //   blir det en rodd, och ryggen tar över.
  //
  //   LÄTT VIKT. Bakre deltoideus är liten; för tungt och latsen och
  //   kappmuskeln gör jobbet i stället. Svingar man upp vikten tränar man
  //   andra muskler.
  //
  // Trapezius 0,4 i datan stämmer med källorna — de nämner att skulderbladen
  // dras ihop i toppen. Ingen rygg-/latsaktivering läggs till: den ska
  // uttryckligen INTE vara med om tekniken håller.
  bent_over_lateral: ["Fäll i höften med rak rygg tills överkroppen är nära horisontell, lätt böjda knän", "Låt hantlarna hänga rakt ner, armbågarna lätt böjda och vinkeln låst", "Lyft ut åt sidorna och led med armbågarna tills överarmarna är i linje med ryggen", "Sänk kontrollerat — lätt vikt, annars tar ryggen och nacken över"],

  // Källor: styrkelabbet.se/sittande-axelpress-med-skivstang,
  // mathiaszachau.com/sittande-axelpress-skivstang, muscles.se/.../axelpress,
  // privatetrainingonline.se/axelpress. Egna formuleringar.
  //
  // RYGGSTÖDET SKA INTE STÅ I 90 GRADER. Flera källor säger 75-85: det ger en
  // naturligare pressvinkel och är skonsammare för axelleden.
  //
  // SVANKNING ÄR DET FARLIGASTE FELET enligt muscles.se — man kompenserar för
  // stel axel eller för tung vikt, och övningen blir en lutande bänkpress
  // medan ländryggen tar smällen. Därför står bålen i punkt 2.
  // Smithmaskinen låser banan, så bålen behöver inte stabilisera — man kan
  // ta tyngre. Priset är att banan är rak medan en fri press går i en svag
  // båge; sitt därför så stången passerar nära ansiktet, inte framför.
  smith_shoulder_press: ["Ställ bänken så att stången hamnar strax framför ansiktet", "Fäll ryggstödet ett snäpp bakåt och spänn bålen", "Pressa rakt upp längs skenan till nästan raka armar", "Sänk till axelhöjd utan att låta stången gå bakom huvudet"],

  seated_bb_press: ["Fäll ryggstödet ett snäpp bakåt, inte rakt 90 grader", "Spänn bålen och sätet så ryggen inte svankar från stödet", "Greppa stången strax bredare än axelbrett och pressa rakt upp", "Sänk kontrollerat till axelhöjd utan att låsa armbågarna i toppen"],

  // DECLINE I MASKIN: det som gör den till en decline-press är att armarna rör
  // sig framåt och NEDÅT, inte att kroppen lutar bakåt. Handtagen sitter vid
  // nedre bröstet och maskinens armar går snett ned — banan gör jobbet, precis
  // som i pec deck där sitsen är upprätt men rörelsen ändå isolerar bröstet.
  //
  // Nedre bröstet får därför mer arbete än i plan maskinpress, utan att man
  // behöver ligga med huvudet lägre än höften.
  decline_chest_press_m: ["Ställ sitsen så att handtagen hamnar vid nedre bröstet", "Dra ihop skulderbladen mot ryggstödet och håll dem där", "Pressa framåt och nedåt längs maskinens bana, till nästan raka armar", "Släpp tillbaka kontrollerat tills du känner sträck i bröstet"],

  // ISO-LATERAL: armarna rör sig OBEROENDE av varandra, vilket är hela
  // poängen — den starka sidan kan inte hjälpa den svaga, som den gör med
  // skivstång. Ourfitness påpekar samma sak om floor press med hantlar.
  //
  // I övrigt samma som chest_press_machine: sitshöjden avgör om arbetet
  // hamnar i bröstet eller i axlarna.
  iso_chest_press_m: ["Ställ sitsen så att handtagen är i bröstvårtehöjd", "Dra ihop skulderbladen mot ryggstödet och håll dem där", "Pressa fram en sida i taget eller båda samtidigt, till nästan raka armar", "Släpp tillbaka tills du känner sträck — låt inte den starka sidan leda"],

  // Lutande maskinpress träffar övre bröstet, som lutande bänkpress. Vinkeln
  // är fast i maskinen, så det som återstår är sitshöjd och skuldror.
  incline_chest_press_m: ["Ställ sitsen så att handtagen hamnar vid övre bröstet", "Dra ihop skulderbladen och håll bröstet högt", "Pressa uppåt och framåt tills armarna är nästan raka", "Släpp tillbaka kontrollerat utan att axlarna åker fram"],

  // Källa: styrkelabbet.se/kabelflyes för kabelns jämna belastning.
  //
  // KNÄSTÅENDE TAR BORT BENEN ur rörelsen — man kan inte skjuta ifrån med
  // fötterna, så bålen måste hålla emot kabelns drag. Det är övningens syfte,
  // inte en begränsning.
  half_kneel_cable_press: ["Stå på ett knä med trissan i brösthöjd bakom dig", "Spänn bålen och sätet så höften inte vrids av kabeln", "Pressa handtaget rakt framåt tills armen är nästan rak", "För tillbaka kontrollerat utan att överkroppen roterar"],

  // Källor: styrkelabbet.se/floor-press-med-hantlar, ourfitness.se/floor-press,
  // mathiaszachau.com/golvpress. Egna formuleringar.
  //
  // POÄNGEN ÄR ATT GOLVET STOPPAR RÖRELSEN. Överarmarna tar emot, banan blir
  // kortare än i bänkpress, och axelleden belastas mindre i botten — därför
  // väljs övningen ofta vid axelbesvär. Triceps får jobba mer.
  //
  // Ourfitness varnar särskilt för att låta armbågarna SLÅ i golvet; de ska
  // ta emot mjukt och vända, inte studsa.
  kb_floor_press: ["Ligg på rygg med böjda knän, kettlebellsen över bröstet", "Håll armbågarna cirka 45 grader från kroppen, inte rakt ut", "Sänk tills överarmarna mjukt tar emot golvet — låt dem inte slå i", "Pressa upp utan att låsa armbågarna helt"],

  // Källor: styrkelabbet.se/hantelflyes, gymgrossisten.com/hantelflyes,
  // muscles.se/styrkeovningar/flyes. Egna formuleringar.
  //
  // ARMBÅGSVINKELN LÅSES — det är den punkt alla källor återkommer till. Böjer
  // och sträcker man armarna blir det en pressövning för triceps i stället för
  // en fly. Styrkelabbet påpekar också att hävarmen blir lång i bottenläget,
  // vilket gör att man lätt tar för tungt.
  db_fly: ["Ligg på plan bänk, hantlarna över bröstet, handflatorna mot varandra", "Böj armbågarna lätt och LÅS vinkeln genom hela rörelsen", "Sänk i en båge tills överarmarna är i linje med bänken", "För ihop i samma båge, kläm bröstet i toppen"],

  incline_db_fly: ["Vinkla bänken 30-45 grader, fötterna stadigt i golvet", "Böj armbågarna lätt och håll vinkeln oförändrad", "Sänk i en båge tills du känner sträck i övre bröstet", "För ihop utan att räta ut armarna — då blir det en press"],

  // Källor: styrkelabbet.se/kabelflyes, gymgrossisten.com/flyes-i-kabelmaskin,
  // privatetrainingonline.se/kryssdrag.
  //
  // Kabelns fördel är JÄMN belastning: hantelflyes är nästan avlastade i
  // toppläget, kabeln drar hela vägen. Skuldrorna får inte följa med framåt —
  // då tar axlarna över arbetet.
  cable_crossover: ["Ställ dig i gångstående mellan trissorna, luta lätt framåt", "Håll armbågarna lätt böjda och vinkeln låst", "Dra i en vid båge tills händerna möts framför kroppen", "Släpp tillbaka kontrollerat utan att skuldrorna åker fram"],

  // Källa: styrkelabbet.se/armhavningar. Cirka 70 % av kroppsvikten lyfts;
  // händerna tätare flyttar arbetet mot triceps, bredare mot bröstet.
  push_ups: ["Händerna något bredare än axlarna, kroppen rak från nacke till häl", "Spänn bålen och sätet så höften inte sjunker", "Sänk tills bröstet är strax över golvet, armbågarna 45 grader ut", "Pressa upp utan att höften leder rörelsen"],

  // Maskinen styr banan, så det som återstår är sitshöjd och skuldror. Samma
  // fel som i pec deck: sitter man fel går arbetet till axlarna.
  chest_press_machine: ["Ställ sitsen så att handtagen är i bröstvårtehöjd", "Dra ihop skulderbladen mot ryggstödet och håll dem där", "Pressa fram tills armarna är nästan raka", "Släpp tillbaka tills du känner sträck, utan att axlarna åker fram"],

  // Källor: styrkelabbet.se/pec-deck, muscles.se/.../pec-deck,
  // privatetrainingonline.se/pec-deck, effektimalt.se. Egna formuleringar.
  //
  // Sitshöjden är det källorna återkommer mest till: sitter man för lågt
  // flyttas arbetet till axlarna i stället för bröstet, och maskinen blir
  // både verkningslös och sliten på axelleden. Därför står den först.
  //
  // "Pressa med armbågarna, inte händerna" står i flera källor — händerna
  // vilar bara, kraften kommer från överarmen.
  pec_deck: ["Ställ sitsen så att överarmarna blir horisontella, inte högre", "Dra ihop skulderbladen och håll dem mot ryggstödet", "Pressa ihop med armbågarna, håll dem lätt böjda", "Släpp tillbaka kontrollerat, stanna när armarna är i linje med kroppen"],

  // Källor: styrkelabbet.se/uppatlutad-hantelpress, gymgrossisten.com/
  // lutande-hantelpress, ourfitness.se/lutande-hantelpress. Egna
  // formuleringar. 30-45 graders lutning återkommer i alla tre; över det tar
  // främre deltoideus över rörelsen och det blir en axelpress.
  incline_db_press: ["Vinkla bänken 30-45 grader, fötterna stadigt i golvet", "Dra ihop skulderbladen bakåt och nedåt mot bänken", "Håll armbågarna 30-45 grader från kroppen, inte rakt ut", "Pressa upp tills armarna är raka över axlarna"],

  // Källor: privatetrainingonline.se/hantelpress, fashionablefit.nu/hantelpress.
  // Nedåtlutning flyttar belastningen till bröstets nedre del; många är
  // starkare i den vinkeln.
  decline_bench_bb: ["Ställ bänken nedåtlutande och lås fast benen", "Dra ihop skulderbladen, håll bröstet högt", "Sänk stången kontrollerat mot nedre bröstet", "Pressa upp utan att låsa armbågarna hårt"],

  decline_db_press: ["Ställ bänken nedåtlutande och lås fast benen", "Håll hantlarna över nedre bröstet, handflatorna framåt", "Sänk tills du känner sträck i bröstet, armbågarna 45 grader ut", "Pressa upp och håll hantlarna över bröstet, inte över axlarna"],

  triceps_pushdown: ["Greppa stången eller repet i axelhöjd, armbågarna in mot kroppen", "Håll överarmarna helt stilla genom hela rörelsen", "Pressa ner tills armarna är raka, känn triceps jobba", "För tillbaka kontrollerat utan att armbågarna vandrar ut"],
  safety_bar_squat: ["Stången vilar på axlarna, greppa handtagen", "Håll bålen upprätt — stången vill fälla dig framåt", "Sänk till djup du behärskar, knäna följer tårna", "Driv upp genom hela foten"],
  db_neutral_press: ["Handflatorna mot varandra (neutralt grepp)", "Armbågarna något indragna, skonsamt för axeln", "Pressa upp och lätt ihop", "Sänk kontrollerat till brösthöjd"],
  chest_supported_row: ["Bröstet mot dynan, undvik att kasta med kroppen", "Dra med armbågarna bakåt/nedåt", "Kläm ihop skulderbladen i toppen", "Sänk kontrollerat till full sträckning"],
  pallof_press: ["Stå sidledes mot kabeln, handtaget vid bröstet", "Spänn bålen och motstå rotationen", "Pressa rakt ut och håll emot", "För in mot bröstet igen utan att vrida"],
  landmine_press: ["Stångänden i ett hörn, greppa andra änden i axelhöjd", "Bålen spänd, pressa upp och lätt framåt", "Skonsam vinkel för axeln — pressa inte rakt över huvudet", "Sänk kontrollerat till axeln"],
  // FACE PULL. Källor: styrkelabbet.se/facepull, muscles.se/styrkeovningar/
  // axelovningar/face-pull, gymgrossisten.com/facepull, mathiaszachau.com/
  // face-pull, traningsgladje.se/traning/ovningar/face-pulls. Egna
  // formuleringar.
  //
  // Punkterna fanns redan men i den korta stilen (fyra fragment på 25-30
  // tecken, utan källkommentar). Skrevs om när bilden lades in: bredvid ett
  // foto blir "Dra mot pannan" för tunt, och sex källor säger mer än så.
  //
  // Det de är eniga om:
  //
  //   HÖGA ARMBÅGAR. Armbågarna till axelhöjd eller något över är det som gör
  //   det till en bakre-axel-övning i stället för en rodd.
  //
  //   MOT ANSIKTET, inte mot bröstet eller halsen.
  //
  //   UTÅTROTATION I SLUTLÄGET. Underarmarna vrids uppåt — det är där
  //   rotatorkuffen kommer in.
  //
  //   LÄTT VIKT. Blir den för tung tar övre trapezius över och axlarna åker
  //   upp mot öronen; flera källor kallar det övningens vanligaste fel.
  //
  // Aktiveringen rörs inte. Källorna nämner rhomboider och rotatorkuff, men
  // ingen av dem finns i 21-muskeltaxonomin — de får inte tryckas in i
  // närmaste granne.
  face_pull: ["Rep i högt fäste, kliv bakåt tills kabeln är spänd från start", "Dra mot pannan med armbågarna i axelhöjd eller något över", "Rotera underarmarna uppåt i slutläget och håll axlarna nere", "Lätt vikt — åker axlarna upp mot öronen har trapezius tagit över"],
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

  // BICEPSCURLENS FAMILJ. Källor: styrkelabbet.se/bicepscurl och /hantelcurl,
  // gymgrossisten.com/bicepscurl-med-skivstang, privatetrainingonline.se/
  // hantelcurl-biceps och /preacher-curls, muscles.se/.../hammercurls-med-hantlar,
  // ourfitness.se/preacher-curls-teknik-tips, filbornaarena.se/bra-bicepsovningar.
  // Egna formuleringar.
  //
  // ALLA KÄLLOR SÄGER SAMMA TVÅ SAKER om varje curlvariant, och de står redan
  // i curl-posten ovan:
  //
  //   ÖVERARMEN FÅR INTE GÅ BAKÅT. Styrkelabbet skriver det för både stång,
  //   hantel och kabel: håll överarmen vid sidan eller svagt framåt. Går
  //   armbågen bakom kroppens lodlinje tar axeln över.
  //
  //   INGEN GUNGNING. Svingar man upp vikten gör ryggen jobbet, och man kan
  //   lyfta mer utan att armarna tränas mer.
  //
  // Punkterna nedan lägger till det som är SPECIFIKT för varje variant, i
  // stället för att upprepa de två ovan fyra gånger.

  // EZ-stångens hela poäng: den vågiga stången ger handlederna en svagt
  // inåtroterad vinkel, vilket källorna anger som skälet att välja den framför
  // rak stång vid besvär i handled eller armbåge.
  ez_curl: ["Greppa den vinklade delen med handflatorna snett uppåt", "Håll överarmarna vid sidorna — låt dem inte gå bakåt", "Curla upp till brösthöjd och spänn biceps kort i toppen", "Sänk långsamt; svingar du med kroppen är vikten för tung"],

  // Hantelcurl: supinationen är fördelen mot stången. Biceps både böjer
  // armbågen och vrider underarmen, och källorna är tydliga med att den som
  // curlar utan att vrida handleden missar halva muskelns funktion.
  // Alternerande utförande enligt namnet i banken.
  db_curl: ["Låt hantlarna hänga längs sidorna med neutralt grepp", "Curla upp en arm i taget och vrid handflatan uppåt på vägen", "Håll överarmen stilla vid sidan genom hela lyftet", "Sänk kontrollerat och vrid tillbaka innan nästa arm"],

  // Hammercurl: neutralt grepp hela vägen. Källorna framhåller att arbetet
  // flyttas till brachialis och brachioradialis, vilket syns i aktiveringen
  // (forearms 0,6 mot 0,4 för vanlig curl) — den skillnaden fanns redan i
  // datan och stämmer med källorna.
  hammer_curl: ["Håll hantlarna med tummarna uppåt, handflatorna mot varandra", "Behåll det neutrala greppet hela vägen — vrid inte handleden", "Curla upp mot axeln med överarmen stilla vid sidan", "Sänk långsamt utan att låta armbågen glida bakåt"],

  // Preacher curl: dynan är övningen. Med baksidan av överarmarna låsta mot
  // en lutande dyna går det inte att luta sig bakåt eller skjuta fram axeln,
  // vilket källorna kallar den ärligaste bicepsövningen. Därför står bara
  // biceps i aktiveringen.
  //
  // Källorna varnar samstämmigt för att släppa ner vikten okontrollerat i
  // bottenläget: med armen låst mot dynan tar armbågsleden smällen.
  preacher_curl: ["Ställ dynan så att armhålorna vilar mot överkanten", "Greppa EZ-stången axelbrett med handflatorna uppåt", "Curla upp mot hakan tills biceps är helt spänd", "Sänk långsamt — släpp aldrig ner armarna okontrollerat"],
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

export { EXERCISES, WORKOUTS, SPORT_INTENSITY, HIIT_MULT, HIIT_MUSCLE_MULT, SPORTS, CARDIO, CUES, CUES as TEKNIK_CUES, EX_GROUPS, EQUIP_ALL, EQUIP_PROFILES, BODYWEIGHT, STRENGTH_STD, MAIN_LIFTS, STABLE_ID, resolveActivity, DEFAULT_ACTIVE_SPORTS };

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
