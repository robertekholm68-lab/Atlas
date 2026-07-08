# ATLAS Architecture Decisions

This document records significant architectural and product decisions.

Keeping the reasoning behind decisions is as important as documenting the decisions themselves.

---

## Decision 001

**Date:** 2026-07-08

### Title

The body is the primary interface.

### Decision

The anatomical Body Map is the central interface of ATLAS.

Dashboards, charts and statistics support the body visualization rather than replacing it.

### Reasoning

People understand anatomy faster than abstract charts.

A visual body provides immediate context for training load, recovery and muscle balance.

### Alternatives Considered

- Dashboard-first UI
- Statistics-first UI
- Traditional fitness tracker layout

### Outcome

Accepted.

### Related documents

- `MANIFESTO.md`
- `docs/ATLAS_PRODUCT_BIBLE.md`
- `prd/BODY_MAP.md`

---

## Decision 002

**Date:** 2026-07-08

### Title

ATLAS is a Digital Human Twin.

### Decision

ATLAS is positioned as a Digital Human Twin and Body Operating System rather than a workout tracker.

### Reasoning

This creates a clearer long-term vision and differentiates the platform from traditional fitness applications.

### Alternatives Considered

- Fitness tracker
- Workout logger
- Nutrition tracker
- Wearable dashboard

### Outcome

Accepted.

### Related documents

- `MANIFESTO.md`
- `docs/ATLAS_PRODUCT_BIBLE.md`
- `docs/ROADMAP.md`

---

## Decision 003

**Date:** 2026-07-08

### Title

Fitness Intelligence Engine owns physiological calculations.

### Decision

All physiological calculations are centralized in the Fitness Intelligence Engine.

UI modules present data but never implement business logic.

### Reasoning

Centralizing calculations prevents contradictory recovery, readiness or recommendation logic from leaking into React components, API handlers or LLM prompts.

The product promise of transparent explanations requires one authoritative calculation layer.

### Alternatives Considered

- UI-level calculations
- Database triggers for physiological calculations
- LLM-generated calculations
- Separate calculations inside each module

### Outcome

Accepted.

### Related documents

- `ai/FITNESS_INTELLIGENCE_ENGINE.md`
- `database/SCHEMA.md`
- `api/API_OVERVIEW.md`

---

## Decision 004

**Date:** 2026-07-08

### Title

MVP scope is the smallest complete ATLAS loop.

### Decision

The MVP is scoped to the smallest useful loop:

1. Log workout
2. Update muscle states
3. Update recovery
4. Update goal/recommendation context
5. Explain the result
6. Show the next action

Minimum dependencies included in the MVP:

- Authentication
- Profile baseline values
- Exercise Library seed set
- Workout Builder focused on logging
- Body Map with Recovery Layer as the first active layer
- Muscle Cards read-only v1
- Minimal Mission Control
- Fitness Intelligence Engine v1

Explicitly post-loop / post-MVP:

- Full Nutrition Dashboard
- Full Goals Dashboard
- Wearable integrations
- Additional Body Layers beyond Recovery
- Fully conversational AI Coach
- Advanced prediction models
- 30-day Body Playback

### Reasoning

The Product Bible originally listed a broad MVP, while the Roadmap correctly states that the product should become useful before it becomes large.

The smallest complete loop proves the core product concept: user logs training, the Digital Human Twin changes, and ATLAS explains what to do next.

### Alternatives Considered

- Build all twelve product modules in the first MVP
- Build a visual prototype only
- Build workout logging only without Body Map intelligence

### Outcome

Accepted.

### Related documents

- `docs/ROADMAP.md`
- `docs/ATLAS_PRODUCT_BIBLE.md`
- `prd/WORKOUT_BUILDER.md`
- `prd/BODY_MAP.md`
- `prd/MISSION_CONTROL.md`

---

## Decision 005

**Date:** 2026-07-08

### Title

Body Map v1 uses an interactive anatomical model with zoom, pan and controlled rotation; full 3D is deferred.

### Decision

The Body Map must support:

- Zoom
- Pan
- Muscle selection
- Anterior / posterior switching
- Smooth controlled rotation between views
- Persistence of camera position where possible

For MVP implementation, the preferred technical approach is an interactive SVG or lightweight mesh-based anatomical model with a 2.5D experience.

A full free-rotation 3D anatomical model remains part of the product vision but is deferred until the core loop is validated.

### Reasoning

The product experience should feel like an interactive body workspace, not a static image.

However, full 3D introduces substantial complexity: asset pipeline, hit detection, mobile performance, accessibility, and anatomical correctness.

The MVP should preserve the user-facing promise of rotation and zoom while avoiding unnecessary implementation risk.

### Alternatives Considered

- Static 2D anterior/posterior images only
- Full 3D model from day one
- Raster body-map images with hotspots

### Outcome

Accepted.

### Related documents

- `prd/BODY_MAP.md`
- `design/DESIGN_SYSTEM.md`
- `docs/ATLAS_PRODUCT_BIBLE.md`

---

## Decision 006

**Date:** 2026-07-08

### Title

Engine runs as a pure TypeScript package executed server-side.

### Decision

The Fitness Intelligence Engine is implemented as a pure, dependency-free TypeScript package.

It exposes deterministic functions:

```text
inputs -> outputs + explanation payloads
```

It performs no I/O directly.

The engine is executed server-side in Next.js route handlers or server actions.

### Reasoning

A pure package is easier to test, version, refactor and protect from UI leakage.

Server-side execution keeps calculation rules authoritative and avoids exposing internal model logic in client bundles.

### Alternatives Considered

- Client-side calculations
- Supabase database functions as primary calculation layer
- LLM-driven calculations

### Outcome

Accepted.

### Related documents

- `ai/FITNESS_INTELLIGENCE_ENGINE.md`
- `docs/TECHNICAL_ARCHITECTURE.md`
- `api/API_OVERVIEW.md`

---

## Decision 007

**Date:** 2026-07-08

### Title

Computed and explained data must go through engine-backed API endpoints.

### Decision

Raw user-owned records may be read directly from Supabase when protected by Row-Level Security.

Anything computed, recommended, ranked, scored or explained must go through engine-backed API endpoints.

### Reasoning

This preserves Decision 003 and prevents duplicated logic across frontend, database and AI layers.

### Alternatives Considered

- All reads direct from Supabase
- All reads through custom API only
- Mixed access with no boundary rule

### Outcome

Accepted.

### Related documents

- `api/API_OVERVIEW.md`
- `docs/TECHNICAL_ARCHITECTURE.md`
- `ai/FITNESS_INTELLIGENCE_ENGINE.md`

---

## Decision Log Rules

Every future decision shall include:

1. Date
2. Title
3. Decision
4. Reasoning
5. Alternatives
6. Outcome
7. Related documents
