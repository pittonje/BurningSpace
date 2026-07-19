# BS-MECH-020 — Owner-relative signed sector-control meter

Status: `accepted`

Date: `2026-07-19`

Owner: `Product Architect`

Scope / domain: `Sector control and ownership transition`

## Decision

- Sector control is represented as an owner-relative signed meter.
- Maximum control for the current owner is +100.
- Enemy capture pressure decreases the value.
- Ownership switches only when the meter reaches -50.
- A value of -49 remains owned by the current faction.
- A value of zero does not switch ownership.
- On capture, ownership changes and the meter becomes +50 from the new owner's perspective.
- Consolidation from +50 to +100 uses the same sector-control mechanic.
- There is no separate automatic consolidation timer.

## Rationale

This defines an explicit ownership transition boundary while preserving a
meaningful post-capture consolidation state. It avoids ambiguous positive-only
thresholds and prevents ownership from changing at zero.

## Consequences

- Old 50/80/100 ownership-threshold descriptions are not canonical.
- Capture progress and consolidation use one meter.
- Runtime and balance constants are not changed by this documentation PR.
- Creep-advance thresholds or other independent balance thresholds are not established by this record.

## Supersedes

none

## Superseded by

none

## Depends on

BS-MECH-019

## Source evidence

- `docs/tasks/docarch-002d-broader-reconciliation-and-closure.md`
- `docs/reviews/docarch-002-decision-recovery-report.md`
- Product Architect approval recorded during DOCARCH-002D preparation

## Verification

- Confirm exact -50 capture threshold.
- Confirm -49 and zero do not switch ownership.
- Confirm capture resets to new-owner-relative +50.
- Confirm no automatic consolidation timer is introduced.

## Notes

Exact rates, unit weights, capture speed, UI representation, and balance tuning
remain outside this decision.

The original decision date was not recovered. The Date field records Product
Architect approval for canonical D2 migration.
