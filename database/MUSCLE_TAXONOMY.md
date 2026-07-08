# Muscle Taxonomy

**Version:** 1.0  
**Status:** MVP Foundation  
**Owner:** Fitness Intelligence Engine

---

## Purpose

The Muscle Taxonomy defines the stable set of muscle regions used by ATLAS v1.

It is the shared reference for:

- Body Map regions
- Exercise activation profiles
- Muscle Cards
- Recovery calculations
- Muscle state snapshots
- Recommendations
- Future Body Playback

This document is load-bearing. IDs defined here must remain stable.

---

## Versioning Rule

This taxonomy is **v1**.

Subdivision is deferred.

Future versions may split a parent region into more granular children, but existing IDs must not be renamed or removed.

Example:

```text
trapezius

future:
trapezius_upper
trapezius_middle
trapezius_lower
```

The parent ID remains valid for historical records.

---

## Region Groups

Allowed `region_group` values:

- shoulders
- chest
- back
- arms
- core
- glutes
- legs
- calves

Allowed `view_membership` values:

- anterior
- posterior
- both

---

## V1 Muscle Regions

| ID | English Name | Latin Name | View | Region Group | Parent Region |
|---|---|---|---|---|---|
| neck_anterior | Anterior Neck | Sternocleidomastoideus | anterior | core | null |
| trapezius | Trapezius | Musculus trapezius | posterior | back | null |
| deltoid_anterior_left | Left Anterior Deltoid | Deltoideus pars clavicularis | anterior | shoulders | deltoid_left |
| deltoid_anterior_right | Right Anterior Deltoid | Deltoideus pars clavicularis | anterior | shoulders | deltoid_right |
| deltoid_lateral_left | Left Lateral Deltoid | Deltoideus pars acromialis | both | shoulders | deltoid_left |
| deltoid_lateral_right | Right Lateral Deltoid | Deltoideus pars acromialis | both | shoulders | deltoid_right |
| deltoid_posterior_left | Left Posterior Deltoid | Deltoideus pars spinalis | posterior | shoulders | deltoid_left |
| deltoid_posterior_right | Right Posterior Deltoid | Deltoideus pars spinalis | posterior | shoulders | deltoid_right |
| pectoralis_left | Left Pectoralis Major | Musculus pectoralis major | anterior | chest | null |
| pectoralis_right | Right Pectoralis Major | Musculus pectoralis major | anterior | chest | null |
| serratus_anterior_left | Left Serratus Anterior | Musculus serratus anterior | anterior | chest | null |
| serratus_anterior_right | Right Serratus Anterior | Musculus serratus anterior | anterior | chest | null |
| latissimus_left | Left Latissimus Dorsi | Musculus latissimus dorsi | posterior | back | null |
| latissimus_right | Right Latissimus Dorsi | Musculus latissimus dorsi | posterior | back | null |
| erector_spinae | Erector Spinae | Musculus erector spinae | posterior | back | null |
| rectus_abdominis | Rectus Abdominis | Musculus rectus abdominis | anterior | core | null |
| obliques_left | Left Obliques | Musculi obliqui abdominis | anterior | core | null |
| obliques_right | Right Obliques | Musculi obliqui abdominis | anterior | core | null |
| biceps_left | Left Biceps | Musculus biceps brachii | anterior | arms | null |
| biceps_right | Right Biceps | Musculus biceps brachii | anterior | arms | null |
| triceps_left | Left Triceps | Musculus triceps brachii | posterior | arms | null |
| triceps_right | Right Triceps | Musculus triceps brachii | posterior | arms | null |
| forearms_left | Left Forearms | Antebrachial flexors/extensors | both | arms | null |
| forearms_right | Right Forearms | Antebrachial flexors/extensors | both | arms | null |
| gluteus_left | Left Gluteals | Musculi glutei | posterior | glutes | null |
| gluteus_right | Right Gluteals | Musculi glutei | posterior | glutes | null |
| hip_flexors_left | Left Hip Flexors | Iliopsoas group | anterior | legs | null |
| hip_flexors_right | Right Hip Flexors | Iliopsoas group | anterior | legs | null |
| quadriceps_left | Left Quadriceps | Musculus quadriceps femoris | anterior | legs | null |
| quadriceps_right | Right Quadriceps | Musculus quadriceps femoris | anterior | legs | null |
| hamstrings_left | Left Hamstrings | Ischiocrural muscles | posterior | legs | null |
| hamstrings_right | Right Hamstrings | Ischiocrural muscles | posterior | legs | null |
| adductors_left | Left Adductors | Adductor muscle group | anterior | legs | null |
| adductors_right | Right Adductors | Adductor muscle group | anterior | legs | null |
| calves_left | Left Calves | Gastrocnemius/Soleus | posterior | calves | null |
| calves_right | Right Calves | Gastrocnemius/Soleus | posterior | calves | null |
| tibialis_left | Left Tibialis Anterior | Musculus tibialis anterior | anterior | calves | null |
| tibialis_right | Right Tibialis Anterior | Musculus tibialis anterior | anterior | calves | null |

---

## Granularity Rationale

The v1 set is intentionally broad enough to be usable on mobile and specific enough to support meaningful exercise activation, recovery, and Muscle Cards.

Deep muscles and small anatomical subdivisions are deferred.

---

## Implementation Rules

- Every Body Map region must map to exactly one taxonomy ID.
- Every exercise activation factor must reference a valid taxonomy ID.
- Every muscle state snapshot must reference a valid taxonomy ID.
- Renaming IDs is forbidden after production data exists.
- New subdivisions must use `parent_region` to preserve backwards compatibility.
