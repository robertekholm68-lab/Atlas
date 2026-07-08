# Fitness Intelligence Engine

**Version:** 1.0  
**Status:** MVP Foundation  
**Owner:** ATLAS Core Architecture

---

## Purpose

The Fitness Intelligence Engine is the calculation and recommendation layer of ATLAS.

It owns all physiological calculations.

UI modules, API clients and LLM prompts must never calculate recovery, fatigue, readiness, goal probability or recommendations independently.

---

## Core Rule

```text
Raw data -> Engine -> Outputs + Explanations -> UI / AI Coach
```

The engine returns both results and explanation payloads.

The LLM never computes. It narrates pre-computed engine outputs.

---

## Package Architecture

The engine should be implemented as a pure TypeScript package.

```text
packages/fitness-intelligence/
```

Rules:

- No database calls
- No network calls
- No direct Supabase dependency
- No React dependency
- Deterministic functions only
- Versioned models
- Golden-fixture tests

---

## Shared Types

### Explanation Factor

```ts
export type ExplanationFactor = {
  source: string;
  direction: 'positive' | 'negative' | 'neutral';
  contribution: number;
  label: string;
  description: string;
};
```

### Engine Output Wrapper

```ts
export type EngineOutput<T> = {
  modelVersion: string;
  generatedAt: string;
  result: T;
  explanation: ExplanationFactor[];
  confidence: number;
};
```

Every computed output must use this structure.

---

# Sub-engine 1 — Muscle Intelligence

## Purpose

Calculate per-muscle training load from logged workouts.

## Inputs

```ts
type LoggedSet = {
  exerciseId: string;
  weightKg: number;
  reps: number;
  rpe?: number;
  completedAt: string;
};

type ExerciseActivation = {
  exerciseId: string;
  muscleId: string;
  activationFactor: number; // 0.0 - 1.0
};
```

## V1 Model

For each set:

```text
set_load = weight_kg * reps
rpe_multiplier = rpe ? rpe / 10 : 0.8
muscle_load = set_load * activation_factor * rpe_multiplier
```

For each workout:

```text
muscle_session_load = sum(muscle_load for each affected muscle)
```

## Outputs

```ts
type MuscleLoadOutput = {
  muscleId: string;
  sessionLoad: number;
  weeklyLoad: number;
  lastTrainedAt: string;
};
```

## Explanation Examples

- Exercise contribution
- Volume contribution
- RPE contribution
- Activation factor contribution

---

# Sub-engine 2 — Recovery Engine

## Purpose

Estimate muscle recovery based on fatigue deposited by training and decayed over time.

## Inputs

```ts
type MuscleFatigueInput = {
  muscleId: string;
  sessionLoad: number;
  muscleSizeCategory: 'small' | 'medium' | 'large';
  completedAt: string;
};

type RecoveryModifiers = {
  sleepHours?: number;
  hrv?: number;
  restingHeartRate?: number;
};
```

## V1 Model

Fatigue deposit:

```text
fatigue = session_load / 100
```

Size modifier:

```text
small = 0.85
medium = 1.0
large = 1.2
```

Recovery half-life baseline:

```text
small = 24 hours
medium = 36 hours
large = 48 hours
```

Recovery score:

```text
remaining_fatigue = fatigue * exp(-elapsed_hours / half_life_hours)
recovery_score = clamp(100 - remaining_fatigue, 0, 100)
```

Optional modifiers adjust half-life:

- Good sleep shortens half-life
- Poor sleep extends half-life
- Low HRV extends half-life
- Elevated resting heart rate extends half-life

Modifiers are optional in MVP.

## Outputs

```ts
type MuscleRecoveryOutput = {
  muscleId: string;
  recoveryScore: number;
  fatigueScore: number;
  status: 'critical' | 'recovering' | 'nearly_ready' | 'ready' | 'undertrained';
  estimatedReadyAt?: string;
};
```

---

# Sub-engine 3 — Readiness Summary

## Purpose

Summarize whether muscles and the whole body are ready for training.

## Inputs

- Muscle recovery outputs
- Recent weekly load
- Muscle taxonomy

## V1 Model

```text
readiness = recovery_score - overload_penalty + undertraining_priority
```

Status thresholds:

| Score | Status |
|---:|---|
| 0-30 | critical |
| 31-55 | recovering |
| 56-75 | nearly_ready |
| 76-100 | ready |

## Outputs

```ts
type ReadinessOutput = {
  overallReadiness: number;
  readyMuscles: string[];
  recoveringMuscles: string[];
  priorityMuscles: string[];
};
```

---

# Sub-engine 4 — Recommendation Engine

## Purpose

Generate the next best action.

## V1 Rules

Priority order:

1. Avoid under-recovered muscles
2. Prioritize recovered muscles
3. Prioritize under-trained muscles
4. Respect recent workout balance
5. Keep recommendation simple

## Outputs

```ts
type RecommendationOutput = {
  recommendationId: string;
  type: 'train' | 'recover' | 'log_data' | 'review_goal';
  title: string;
  summary: string;
  targetMuscles: string[];
  avoidedMuscles: string[];
  actionLabel: string;
};
```

---

# Sub-engine 5 — Goal Intelligence

## MVP Status

Deferred beyond the smallest loop.

## V1 Contract Shape

The output shape is defined now so UI contracts remain stable.

```ts
type GoalIntelligenceOutput = {
  activeGoals: Array<{
    goalId: string;
    title: string;
    status: 'on_track' | 'behind' | 'at_risk' | 'completed' | 'not_enough_data';
    confidence: number;
    explanation: ExplanationFactor[];
  }>;
};
```

The internal prediction model is Phase 2.

---

# Sub-engine 6 — AI Coach Narration

## Purpose

Convert engine outputs into human-readable explanations.

## Core Rule

The LLM does not calculate.

It receives:

- Recommendation output
- Muscle recovery outputs
- Explanation factors
- User context

It returns:

- Plain-language explanation
- Suggested action text
- Optional follow-up question

## Prompt Boundary

The prompt must instruct the model:

```text
Use only supplied engine payloads. Do not invent scores. Do not calculate recovery. Do not infer hidden physiology.
```

---

# Model Versioning

Every engine output includes a `modelVersion`.

Examples:

- `muscle_load_model_v1`
- `recovery_model_v1`
- `recommendation_model_v1`

Historical snapshots store the model version used to generate them.

---

# Golden Fixture Testing

Golden fixtures are canonical input/output examples used to protect model behavior.

Example fixture:

```json
{
  "name": "bench_press_basic_load",
  "input": {
    "sets": [
      { "exerciseId": "bench_press", "weightKg": 80, "reps": 10, "rpe": 8 }
    ],
    "activation": [
      { "exerciseId": "bench_press", "muscleId": "pectoralis_left", "activationFactor": 1.0 },
      { "exerciseId": "bench_press", "muscleId": "triceps_left", "activationFactor": 0.7 }
    ]
  },
  "expected": {
    "pectoralis_left.sessionLoad": 640,
    "triceps_left.sessionLoad": 448
  }
}
```

Golden fixtures must be versioned with the model.

---

# Implementation Boundary

Allowed to call engine:

- Next.js server route handlers
- Server actions
- Background recompute jobs
- Test fixtures

Not allowed to call engine directly:

- React UI components
- LLM prompts
- Browser client bundles

---

# Transparency Promise

Every recommendation shown to the user must be traceable to explanation factors stored with the recommendation.

The UI displays these factors.

The AI Coach narrates these factors.

No recommendation should be a black box.
