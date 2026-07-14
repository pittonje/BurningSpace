# BS-MECH-014 — Ending current ship control requires main-base docking

Status: `accepted`

Date: `2026-07-14`

Owner: `Product Architect`

Scope / domain: `Mechanics — ship control`

## Decision

A player currently controlling a ship may end control and become eligible to select another ship only after docking the current ship at the faction’s main base.

Docking at an outpost, including a fully stabilized allied outpost, is not sufficient for role or ship switching.

After main-base docking, the ship remains in the world, the player returns to the no-active-ship state, and remote control permitted by BS-MECH-013 becomes available.

The restriction prevents rapid or exploitable role changes across the front.

## Rationale

The restriction prevents rapid or exploitable role changes across the front.

## Consequences

None recorded beyond the decision statement.

## Supersedes

none

## Superseded by

none

## Depends on

`BS-MECH-013`

## Source evidence

- `docs/tasks/docarch-002b-confirmed-mechanics-migration.md`
- `docs/reviews/docarch-002-decision-recovery-report.md`

## Verification

No runtime implementation currently exists. This record preserves the Product Architect-approved mechanics decision.

## Notes

A prior allowance permitted or contemplated role/ship switching through an outpost. Its stable ID has not been recovered and must not be invented. No fictional predecessor record was created. This note is a historical annotation, not an operative supersession link. If a controlled Product Architect export later identifies the predecessor, update both records through explicit bidirectional supersession links.

Original decision date not recovered; the Date field records Product Architect migration approval (DOCARCH-002B).
