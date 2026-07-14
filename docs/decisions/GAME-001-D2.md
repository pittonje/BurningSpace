# GAME-001-D2 — Strict six-sector cardinality

Status: `accepted`

Date: `2026-07-14`

Owner: `Product Architect`

Scope / domain: `GAME-001 task-local implementation decision`

## Decision

Eligibility requires exactly six governed sectors. Snapshots with fewer or more than six sectors fail eligibility regardless of their contents.

## Rationale

Not recorded in the controlled export or repository evidence. No rationale is invented.

## Consequences

None recorded beyond the decision statement.

## Supersedes

none

## Superseded by

none

## Depends on

`BS-MECH-005`

## Source evidence

- `docs/tasks/docarch-002b-confirmed-mechanics-migration.md`
- `docs/reviews/docarch-002-decision-recovery-report.md`
- `docs/tasks/game-001-outpost-respawn-eligibility.md`
- `apps/server/src/systems/outpostRespawn.ts`
- `apps/server/test/outpostRespawn.test.ts`

## Verification

The current server calculation and focused tests corroborate rejection of fewer or more than six sectors. Runtime evidence does not replace Product Architect authority.

## Notes

Original decision date not recovered; the Date field records Product Architect migration approval (DOCARCH-002B).
