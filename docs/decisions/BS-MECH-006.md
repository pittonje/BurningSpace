# BS-MECH-006 — Exact stabilization requirement for outpost respawn

Status: `accepted`

Date: `2026-07-14`

Owner: `Product Architect`

Scope / domain: `Mechanics — outpost respawn`

## Decision

Every governed sector must be exactly 100% stabilized. Any value below 100% disables eligibility immediately. No tolerance, threshold below 100%, or grace period applies.

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

The current server calculation and focused tests corroborate the exact stabilization boundary. Runtime evidence does not replace Product Architect authority.

## Notes

Original decision date not recovered; the Date field records Product Architect migration approval (DOCARCH-002B).
