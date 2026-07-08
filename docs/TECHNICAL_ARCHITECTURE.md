# Technical Architecture

**Version:** 1.0  
**Status:** MVP Foundation

---

## Purpose

This document defines how ATLAS is structured technically for the MVP loop.

It exists to prevent product logic from leaking into the wrong layers.

---

## Planned Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Supabase Row-Level Security
- Vercel
- Pure TypeScript Fitness Intelligence Engine

---

## Core Architecture

```text
Client UI
  ↓
Next.js Server Routes / Server Actions
  ↓
Fitness Intelligence Engine
  ↓
Supabase Postgres
```

Raw user-owned records are stored in Supabase.

Computed scores and recommendations are produced by the Fitness Intelligence Engine and cached back to the database.

---

## Engine Boundary

The Fitness Intelligence Engine is a pure TypeScript package.

It receives inputs and returns outputs plus explanations.

It performs no I/O.

It is executed server-side only.

---

## Data Access Rules

### Direct Supabase Reads Allowed

Allowed for raw, user-owned records:

- User profile
- Workout history
- Exercise library
- Muscle taxonomy
- Body metrics

All direct reads must be protected by Row-Level Security.

### Engine-Backed Endpoint Required

Required for anything that is:

- Computed
- Scored
- Ranked
- Recommended
- Explained
- Forecasted

Examples:

- Recovery score
- Readiness
- Next action
- Muscle state
- Mission Control summary

---

## MVP Data Flow

```text
User logs workout
  ↓
Workout stored in Supabase
  ↓
Server route calls Fitness Intelligence Engine
  ↓
Engine computes muscle load, fatigue, recovery and recommendation
  ↓
Snapshots and recommendations are cached
  ↓
Mission Control and Body Map refresh
```

---

## Frontend Architecture

Initial app areas:

```text
app/
  dashboard/
  body-map/
  workouts/
  muscles/[id]/
  settings/
```

Component groups:

```text
components/
  mission-control/
  body-map/
  muscle-card/
  workout-builder/
  exercise-library/
  ui/
```

No physiological calculations are allowed in frontend components.

---

## Body Map Rendering Architecture

MVP uses an interactive anatomical model that supports:

- Zoom
- Pan
- Muscle selection
- Anterior/posterior switching
- Smooth controlled rotation
- Recovery Layer visualization

The first implementation may use SVG or lightweight mesh rendering.

Full free-rotation 3D is deferred but must remain compatible with the architecture.

---

## Backend Architecture

Next.js server routes or server actions handle:

- Workout submission
- Engine recompute
- Mission Control aggregation
- Muscle detail responses
- Recommendation generation

Supabase handles:

- Authentication
- Postgres storage
- Row-Level Security
- Basic raw data access

---

## Performance Budget

| Area | Target |
|---|---:|
| Mission Control interactive | < 2s on mid-range mobile |
| Body Map first render | < 1.5s |
| Body Map layer switch | < 100ms |
| Muscle Card open | < 200ms |
| Workout set save | < 150ms |
| Engine recompute after workout | < 2s |

---

## Security Principles

- Auth required for all user data
- RLS owner-only by default
- Engine outputs are generated server-side
- No secrets in client bundles
- No hidden health data in analytics

---

## Testing Strategy

- Unit tests for engine functions
- Golden-fixture tests for calculation stability
- Integration tests for submit-workout flow
- UI tests for the Body Map and logging loop
- Accessibility tests for color, keyboard and screen readers

---

## MVP Implementation Order

1. Muscle taxonomy seed
2. Exercise seed set
3. Database schema
4. Fitness Intelligence Engine package
5. Workout Builder
6. Body Map Recovery Layer
7. Muscle Cards read-only v1
8. Minimal Mission Control
9. Recommendation explanation display

---

## Non-Goals for MVP

- Full conversational AI
- Full nutrition tracking
- Wearable integrations
- Payments
- Coach portal
- Full 3D free-rotation anatomy
