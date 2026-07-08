# Database Schema

**Version:** 1.0  
**Status:** MVP Foundation  
**Database:** PostgreSQL / Supabase

---

## Purpose

This document defines the minimum storage model required to support the ATLAS MVP loop:

```text
log workout -> update muscles -> update recovery -> explain -> show next action
```

The database stores raw user-owned records and engine-derived cached snapshots.

The Fitness Intelligence Engine owns calculations.

---

## Core Data Principle

ATLAS stores:

1. Immutable source events where possible
2. Versioned engine-derived snapshots
3. Explanation payloads for transparency and auditability

Current recovery is not manually edited.

It is derived from workout events and cached in `muscle_state_snapshots`.

---

## Row-Level Security Intent

Default rule:

> Users may only access their own data.

Reference tables such as `muscles` and seeded `exercises` are public read-only.

All user-specific tables require owner-only Row-Level Security.

Privacy is a foundation, not a feature.

---

# Tables

## profiles

Stores user baseline and preference data.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key, references auth user |
| display_name | text | User-facing name |
| height_cm | numeric | Optional baseline |
| biological_sex | text | Optional, user-controlled |
| date_of_birth | date | Optional |
| preferred_units | jsonb | kg/lb, km/mi, kcal/kj |
| timezone | text | Required for daily summaries |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: owner-only.

---

## muscles

Seeded taxonomy table.

Source: `database/MUSCLE_TAXONOMY.md`.

| Column | Type | Notes |
|---|---|---|
| id | text | Stable taxonomy ID |
| english_name | text | |
| latin_name | text | |
| view_membership | text | anterior/posterior/both |
| region_group | text | shoulders/back/etc |
| parent_region | text | nullable |
| created_at | timestamptz | |

RLS: public read-only.

---

## exercises

Seeded exercise library.

| Column | Type | Notes |
|---|---|---|
| id | text | Stable exercise ID |
| name | text | Display name |
| movement_pattern | text | push/pull/squat/hinge/etc |
| equipment | text | barbell/dumbbell/machine/etc |
| difficulty | text | beginner/intermediate/advanced |
| status | text | active/deprecated |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: public read-only for seed data.

---

## exercise_muscle_activation

Maps exercises to muscles.

| Column | Type | Notes |
|---|---|---|
| exercise_id | text | references exercises.id |
| muscle_id | text | references muscles.id |
| activation_factor | numeric | 0.0 - 1.0 |
| role | text | primary/secondary/stabilizer |
| model_version | text | activation_profile_v1 |

Primary key: `(exercise_id, muscle_id, model_version)`.

RLS: public read-only for seed data.

---

## workouts

Workout session header.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| started_at | timestamptz | |
| completed_at | timestamptz | nullable until completed |
| status | text | draft/active/completed/cancelled |
| title | text | optional |
| session_rpe | numeric | optional |
| notes | text | optional |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: owner-only.

---

## workout_sets

Individual logged sets.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| workout_id | uuid | references workouts.id |
| user_id | uuid | Owner, denormalized for RLS |
| exercise_id | text | references exercises.id |
| set_index | int | order within exercise |
| weight_kg | numeric | nullable for bodyweight/cardio |
| reps | int | nullable for duration-based work |
| rpe | numeric | optional |
| completed_at | timestamptz | |

RLS: owner-only.

---

## body_metrics

Manual or imported baseline metrics.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| metric_type | text | weight/body_fat/hrv/rhr/etc |
| value | numeric | |
| unit | text | kg/%/ms/bpm/etc |
| source | text | manual/imported |
| recorded_at | timestamptz | |
| created_at | timestamptz | |

RLS: owner-only.

---

## muscle_state_snapshots

Cached engine outputs per muscle.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| muscle_id | text | references muscles.id |
| snapshot_at | timestamptz | |
| recovery_score | numeric | 0-100 |
| fatigue_score | numeric | 0-100 |
| readiness_score | numeric | 0-100 |
| weekly_load | numeric | |
| status | text | critical/recovering/ready/etc |
| model_version | text | e.g. recovery_model_v1 |
| explanation | jsonb | array of explanation factors |
| created_at | timestamptz | |

RLS: owner-only.

---

## recommendations

Stores generated next actions and explanations.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| type | text | train/recover/log_data/review_goal |
| title | text | |
| summary | text | |
| target_muscles | text[] | muscle IDs |
| avoided_muscles | text[] | muscle IDs |
| action_label | text | |
| model_version | text | recommendation_model_v1 |
| explanation | jsonb | explanation factors |
| created_at | timestamptz | |
| expires_at | timestamptz | optional |

RLS: owner-only.

---

## engine_runs

Optional audit table for debugging and reproducibility.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| trigger_type | text | workout_completed/manual_recompute/etc |
| input_hash | text | hash of canonical inputs |
| output_hash | text | hash of canonical outputs |
| model_versions | jsonb | versions used |
| created_at | timestamptz | |

RLS: owner-only.

---

# Event-Sourced Recovery Rule

Training events are stored immutably in `workouts` and `workout_sets`.

Current recovery is derived and cached in `muscle_state_snapshots`.

This enables:

- Recalculation when models improve
- Historical auditability
- Future Body Playback
- Versioned model comparisons

---

# MVP Exclusions

The following are intentionally deferred from MVP schema unless needed later:

- Food logging tables
- Wearable provider credentials
- Goal prediction internals
- Social features
- Coach/client relationships
- Payments

---

# Required Indexes

Recommended initial indexes:

```sql
profiles(id)
workouts(user_id, completed_at desc)
workout_sets(user_id, completed_at desc)
workout_sets(workout_id)
exercise_muscle_activation(exercise_id)
muscle_state_snapshots(user_id, muscle_id, snapshot_at desc)
recommendations(user_id, created_at desc)
body_metrics(user_id, metric_type, recorded_at desc)
```

---

# Open Questions

- Whether to store daily aggregate snapshots in addition to event snapshots.
- Whether exercise seed data should be managed through migrations or a separate seed pipeline.
- Whether user-created exercises are allowed in Phase 1 or deferred.
