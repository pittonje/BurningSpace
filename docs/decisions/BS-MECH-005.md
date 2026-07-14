# BS-MECH-005 — Outpost respawn territorial requirement and combat lock

Status: `accepted`

Date: `2026-07-14`

Owner: `Product Architect`

Scope / domain: `Mechanics — outpost respawn`

## Decision

Outpost respawn eligibility requires exactly six governed sectors, and every governed sector must be owned by the outpost’s faction. A separate 120-second combat lock independently blocks respawn eligibility while active.

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

The current server calculation and focused tests corroborate the territorial and combat-lock conditions. Runtime evidence does not replace Product Architect authority.

## Notes

- “Governed sectors” is the canonical term.
- Current implementation symbols may still use “adjacent” naming.
- Original decision date not recovered; the Date field records Product Architect migration approval (DOCARCH-002B).
