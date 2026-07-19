// DATA: coach-lägen, adaptiv-konfiguration
import { H } from "./tokens.js";

const COACH_MODES = [
  { id: "performance", label: "Prestation", tag: "Maximera styrka & kraft" },
  { id: "physique", label: "Bodybuilding", tag: "Muskelmassa & symmetri" },
  { id: "fatloss", label: "Fettförbränning", tag: "Behåll muskel i underskott" },
  { id: "beginner", label: "Nybörjare", tag: "Teknik & vana" },
  { id: "mobility", label: "Rörlighet", tag: "Led & rörelseomfång" },
  { id: "rehab", label: "Rehab", tag: "Skydda & återuppbygg" },
  { id: "lifestyle", label: "Livsstil", tag: "Hälsa & balans" },
];

const MODE_WEIGHTS = {
  performance: { progress: 3, plateau: 3, overload: 2, volume_high: 1 },
  physique: { volume_low: 3, volume_high: 2, balance: 3, neglect: 2 },
  fatloss: { protein: 3, frequency_low: 2, frequency_high: 1, neglect: 1 },
  beginner: { frequency_low: 3, frequency_high: 1, progress: 1, overload: 1 },
  mobility: { overload: 2, neglect: 2, frequency_high: 2 },
  rehab: { overload: 3, volume_high: 3, frequency_high: 2 },
  lifestyle: { frequency_low: 2, balance: 2, protein: 1 },
};

const ADAPTIVE_MIN = 8;

const ADAPTIVE_EXERCISES = [["bench_press", "Bänkpress"], ["squat", "Knäböj"], ["deadlift", "Marklyft"], ["ohp", "Militärpress"], ["row", "Skivstångsrodd"], ["incline_bench_bb", "Lutande press"], ["db_lateral_raise", "Sidolyft"]];

export { COACH_MODES, MODE_WEIGHTS, ADAPTIVE_MIN, ADAPTIVE_EXERCISES };
