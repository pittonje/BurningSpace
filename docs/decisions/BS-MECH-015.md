# BS-MECH-015 — No additional delay after valid main-base return

Status: `accepted`

Date: `2026-07-14`

Owner: `Product Architect`

Scope / domain: `Mechanics — ship control`

## Decision

After the current ship is docked at the faction’s main base and the player enters the no-active-ship state, the player may immediately control another eligible ship.

There is no additional cooldown, preparation timer, or role-change delay. The physical return to the main faction base is the complete switching cost.

## Rationale

The physical return to the main faction base is the complete switching cost.

## Consequences

None recorded beyond the decision statement.

## Supersedes

none

## Superseded by

none

## Depends on

- `BS-MECH-013`
- `BS-MECH-014`

## Source evidence

- `docs/tasks/docarch-002b-confirmed-mechanics-migration.md`
- `docs/reviews/docarch-002-decision-recovery-report.md`

## Verification

No runtime implementation currently exists. This record preserves the Product Architect-approved mechanics decision.

## Notes

Original decision date not recovered; the Date field records Product Architect migration approval (DOCARCH-002B).
