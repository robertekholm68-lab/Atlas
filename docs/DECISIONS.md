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

---

## Decision 002

### Title

ATLAS is a Digital Human Twin.

### Decision

ATLAS is positioned as a Digital Human Twin and Body Operating System rather than a workout tracker.

### Reasoning

This creates a clearer long-term vision and differentiates the platform from traditional fitness applications.

### Outcome

Accepted.

---

## Decision 003

### Title

Fitness Intelligence Engine owns physiological calculations.

### Decision

All physiological calculations are centralized in the Fitness Intelligence Engine.

UI modules present data but never implement business logic.

### Outcome

Accepted.

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
