# Golden Fixtures

## Purpose

Golden fixtures protect the Fitness Intelligence Engine from accidental behaviour changes.

A fixture is a canonical input scenario with expected output.

## MVP Fixture Areas

- Muscle load from a logged set
- Recovery decay after a session
- Readiness summary
- Recommendation selection

## Fixture Rule

If a model changes intentionally, update the model version and fixture expectations together.

Never silently change expected outputs.

## Example Scenario

A pressing exercise with a defined activation profile should increase chest, shoulder and triceps load according to its activation factors.

The exact expected values belong in versioned test files when implementation begins.
