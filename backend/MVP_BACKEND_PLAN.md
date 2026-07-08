# MVP Backend Plan

## Goal

Support the smallest complete ATLAS loop.

## Backend Responsibilities

- Authenticate user
- Store profile baseline
- Store workouts and sets
- Load exercise activation profiles
- Call Fitness Intelligence Engine after session completion
- Store muscle state snapshots
- Store recommendations with explanation payloads

## Server-Side Rule

Computed values must be produced server-side.

React components must only render engine-backed outputs.

## Initial Services

- Profile service
- Exercise service
- Session service
- Engine recompute service
- Recommendation service

## Deferred

- Wearable sync
- Nutrition services
- Payments
- Coach portal
- Full goal forecasting
