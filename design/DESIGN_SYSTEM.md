# ATLAS Design System

**Version:** 1.0  
**Status:** MVP Foundation

---

## Purpose

The ATLAS Design System defines the visual and interaction rules for the MVP.

The Body Map is the core interface, so the design system must make muscle state understandable, accessible and visually consistent.

---

## Design Principles

1. The body comes first.
2. Clarity before density.
3. Motion has meaning.
4. Colour is never the only channel.
5. AI explains; it does not mystify.
6. Premium does not mean complicated.

---

## Theme Direction

ATLAS is dark-first.

Rationale:

- Training environments often have mixed lighting.
- Dark UI supports high-contrast muscle colours.
- The Body Map becomes visually central.
- It creates a premium, focused interface.

Light mode may be added later but is not required for the first MVP.

---

## Core Colour Tokens

### Background

| Token | Value | Use |
|---|---|---|
| bg.app | #090B10 | Main background |
| bg.surface | #11151D | Cards and panels |
| bg.surfaceRaised | #171C26 | Elevated panels |
| bg.muted | #202632 | Secondary containers |

### Text

| Token | Value | Use |
|---|---|---|
| text.primary | #F4F7FA | Main text |
| text.secondary | #A7B0BE | Supporting text |
| text.muted | #687385 | Low priority text |

### Accent

| Token | Value | Use |
|---|---|---|
| accent.primary | #4DA3FF | Primary actions |
| accent.secondary | #9B7CFF | AI and insight accents |
| accent.success | #39D98A | Positive state |
| accent.warning | #FFD166 | Warning state |
| accent.danger | #FF5C5C | Critical state |

---

## Muscle Base Colours

The default muscle model uses a muted anatomical grey-red base so activated states remain visible.

| Token | Value | Use |
|---|---|---|
| muscle.base | #6F4B4B | Default muscle |
| muscle.baseMuted | #4C3D42 | Unfocused muscle |
| muscle.tendon | #C8C2B8 | Tendons |
| muscle.outline | #2B2F38 | Region separation |

---

## Recovery Layer Colours

| State | Token | Value |
|---|---|---|
| Critical | recovery.critical | #FF4D4D |
| Recovering | recovery.recovering | #FF9F43 |
| Nearly Ready | recovery.nearlyReady | #FFD166 |
| Ready | recovery.ready | #39D98A |
| Undertrained | recovery.undertrained | #4DA3FF |
| No Data | recovery.noData | #5E6673 |

Recovery colours must always be accompanied by text, numbers or accessible region labels.

---

## Typography

Preferred font direction:

- Modern sans-serif
- High readability
- Strong numeric clarity

Scale:

| Token | Size | Use |
|---|---:|---|
| type.display | 40px | Hero metrics |
| type.h1 | 32px | Page titles |
| type.h2 | 24px | Section titles |
| type.h3 | 20px | Widget titles |
| type.body | 16px | Primary text |
| type.small | 14px | Supporting text |
| type.micro | 12px | Labels |

---

## Spacing

Base spacing unit: 4px.

| Token | Value |
|---|---:|
| space.1 | 4px |
| space.2 | 8px |
| space.3 | 12px |
| space.4 | 16px |
| space.6 | 24px |
| space.8 | 32px |
| space.12 | 48px |

---

## Body Map Interaction Rules

MVP Body Map supports:

- Tap/click muscle selection
- Keyboard focus for muscle regions
- Zoom controls
- Pan controls
- Anterior/posterior switching
- Smooth controlled rotation between views
- Recovery Layer as first active layer

Full free-rotation 3D is deferred, but the interface should feel spatial and premium.

---

## Muscle Region States

Each region supports:

- default
- hover
- focused
- selected
- ready
- recovering
- critical
- undertrained
- no data

Selected muscle regions must have both:

- colour state
- visible outline or glow

---

## Accessibility Commitments

### 1. Colour is never the only channel

Every muscle state must also be available through:

- Muscle Card numbers
- Text status
- Tooltips or labels
- List-view equivalent

### 2. SVG regions are semantically addressable

Every muscle region must be:

- named
- focusable
- keyboard reachable
- screen-reader labelled

### 3. WCAG 2.1 AA Target

ATLAS targets WCAG 2.1 AA.

The Recovery Layer colour ramp must be checked for deuteranopia and other common colour-vision deficiencies.

---

## Motion

Motion communicates state change.

Allowed MVP motion:

- soft fade
- controlled zoom
- anterior/posterior rotation
- selected muscle pulse
- recovery state transition

Motion should be subtle and never distract from the Body Map.

Reduced motion mode must disable non-essential animation.

---

## Components Required for MVP

- App Shell
- Mission Control Summary
- Body Map Canvas
- Body Map Controls
- Muscle Card
- Workout Logger
- Exercise Picker
- Recommendation Card
- Recovery Legend
- Empty State
- Loading State

---

## Design Non-Goals for MVP

- Full light mode
- Fully custom icon system
- Complex chart library
- Full 3D free camera controls
- Advanced theme editor
