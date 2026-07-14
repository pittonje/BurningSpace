# GAME-001-D1 — Pure server-side eligibility calculation

Status: `accepted`

Date: `2026-07-14`

Owner: `Product Architect`

Scope / domain: `GAME-001 task-local implementation decision`

## Decision

Outpost respawn eligibility is implemented as a pure, deterministic, server-side calculation with no cached state, no client input, and no runtime integration side effects.

## Rationale

Not recorded in the controlled export or repository evidence. No rationale is invented.

## Consequences

None recorded beyond the decision statement.

## Supersedes

none

## Superseded by

none

## Depends on

none

## Source evidence

- `docs/tasks/docarch-002b-confirmed-mechanics-migration.md`
- `docs/reviews/docarch-002-decision-recovery-report.md`
- `docs/tasks/game-001-outpost-respawn-eligibility.md`
- `apps/server/src/systems/outpostRespawn.ts`
- `apps/server/test/outpostRespawn.test.ts`

## Verification

The current pure server functions and focused tests corroborate deterministic snapshot evaluation without integration side effects. Runtime evidence does not replace Product Architect authority.

## Notes

- This is task-local and is not promoted to a general BS-MECH or BS-ARCH decision.
- Promotion requires a separate Product Architect decision.
- Original decision date not recovered; the Date field records Product Architect migration approval (DOCARCH-002B).
