# GAME-001-D5 — Shield state excluded from respawn eligibility

Status: `accepted`

Date: `2026-07-14`

Owner: `Product Architect`

Scope / domain: `GAME-001 task-local implementation decision`

## Decision

Outpost shield state is not an input to respawn eligibility. Meeting or exceeding a shield activation threshold grants no respawn eligibility.

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
- `apps/server/test/outpostRespawn.test.ts`

## Verification

The focused tests corroborate that meeting a separate shield threshold does not grant eligibility. Runtime evidence does not replace Product Architect authority.

## Notes

Original decision date not recovered; the Date field records Product Architect migration approval (DOCARCH-002B).
