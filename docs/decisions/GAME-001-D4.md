# GAME-001-D4 — Exclusive combat-lock boundary

Status: `accepted`

Date: `2026-07-14`

Owner: `Product Architect`

Scope / domain: `GAME-001 task-local implementation decision`

## Decision

The combat lock is active only while nowMs < combatLockUntilMs. At exact equality the lock is expired. When nowMs > combatLockUntilMs the lock is expired. A null lock value means no lock.

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

The current server calculation and focused tests corroborate the exclusive boundary, equality expiry, and null-lock behavior. Runtime evidence does not replace Product Architect authority.

## Notes

Original decision date not recovered; the Date field records Product Architect migration approval (DOCARCH-002B).
