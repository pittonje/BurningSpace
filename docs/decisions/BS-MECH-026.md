# BS-MECH-026 — Outpost capture at zero structural HP

Status: `accepted`

Date: `2026-07-19`

Owner: `Product Architect`

Scope / domain: `Outpost capture trigger`

## Decision

- An outpost is captured when its structural HP reaches zero.
- Ownership switches immediately at that point.
- There is no separate outpost capture meter.
- There is no additional capture threshold after structural HP reaches zero.

## Rationale

Outposts are structural objectives rather than sector-style control-meter
objectives. A single zero-HP transition avoids duplicate capture systems and
ambiguous intermediate ownership states.

## Consequences

- Older documentation describing capture at 50% HP is not canonical.
- Outpost capture does not use the sector-control meter.
- Runtime HP values or damage balance are not changed by this record.

## Supersedes

none

## Superseded by

none

## Depends on

BS-MECH-028

## Source evidence

- `docs/tasks/docarch-002d-broader-reconciliation-and-closure.md`
- `docs/reviews/docarch-002-decision-recovery-report.md`
- Product Architect approval recorded during DOCARCH-002D preparation

## Verification

- Confirm capture occurs exactly at zero structural HP.
- Confirm ownership switches immediately.
- Confirm there is no separate capture meter or threshold.

## Notes

Post-capture condition is governed separately by BS-MECH-027.

The original decision date was not recovered. The Date field records Product
Architect approval for canonical D2 migration.
