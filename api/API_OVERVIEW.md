# API Overview

Version: 1.0
Status: MVP Foundation

## Purpose

This document defines the API boundary for the ATLAS MVP loop.

The API protects the Fitness Intelligence Engine boundary and ensures that computed, scored, ranked, recommended or explained data is generated server-side.

## Boundary Rule

Raw user-owned records may be read directly from Supabase when protected by Row-Level Security.

Anything computed, scored, ranked, recommended, forecasted or explained must go through engine-backed endpoints.

## Shared Response Pattern

Engine-backed responses include:

- data
- modelVersions
- generatedAt
- explanation, when applicable

## MVP Endpoint Set

### POST /api/workouts

Creates a draft workout.

Request fields:

- title, optional
- startedAt, optional

### POST /api/workouts/{workoutId}/sets

Adds a logged set to an active workout.

Request fields:

- exerciseId
- setIndex
- weightKg, optional
- reps, optional
- rpe, optional
- completedAt, optional

### POST /api/workouts/complete

Finalizes a workout and triggers engine recompute.

Request fields:

- workoutId

Response fields:

- workoutId
- updatedMuscles
- recommendation
- explanation

### GET /api/mission-control

Returns the minimal home dashboard for the MVP loop.

Response fields:

- overallReadiness
- primaryRecommendation
- readyMuscles
- recoveringMuscles
- lastWorkout, optional

### GET /api/body-map

Returns the current Body Map state for the Recovery Layer.

Response fields:

- activeLayer
- viewMode
- muscles
- generatedAt

Each muscle contains:

- muscleId
- recoveryScore
- fatigueScore
- readinessScore
- status
- colorToken

### GET /api/muscles/{muscleId}

Returns read-only Muscle Card data.

Response fields:

- muscleId
- name
- regionGroup
- recoveryScore
- fatigueScore
- readinessScore
- weeklyLoad
- lastTrainedAt, optional
- explanation
- relatedExercises

### GET /api/exercises

Returns the seeded Exercise Library.

Response fields:

- exercises

Each exercise contains:

- id
- name
- movementPattern
- equipment
- difficulty

## Shared Domain Types

### Explanation Factor

Fields:

- source
- direction: positive, negative or neutral
- contribution
- label
- description

### Muscle State Summary

Fields:

- muscleId
- name
- recoveryScore
- fatigueScore
- readinessScore
- status

### Recommendation Summary

Fields:

- recommendationId
- type
- title
- summary
- targetMuscles
- avoidedMuscles
- actionLabel

## Versioning

Initial endpoints are unversioned during internal MVP development.

Before public release, production API routes should use /api/v1.

Engine model versions are returned separately from API versions.

## Security

- All user-owned endpoints require authentication.
- Supabase RLS protects raw records.
- Engine-backed endpoints validate ownership before computing.
- Clients receive explanation payloads, not independent calculation authority.

## Non-Goals for MVP

- Public API
- Third-party developer API
- Wearable ingestion endpoints
- Nutrition endpoints
- Full goal forecasting endpoints
