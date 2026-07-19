# BS-MECH-027 — Partial post-capture outpost condition

Status: `accepted`

Date: `2026-07-19`

Owner: `Product Architect`

Scope / domain: `Outpost state immediately after ownership transition`

## Decision

- A captured outpost does not reset to full condition.
- It transfers to the new owner with partial structural HP.
- It transfers with partial resources.
- It remains vulnerable and undersupplied immediately after capture.
- This decision does not establish:
  - an exact HP percentage;
  - an exact retained-resource amount;
  - a resource-burn formula;
  - a mandatory emergency reserve.

## Rationale

Capture should grant ownership without erasing the consequences of the battle.
The new owner gains a foothold but must repair and resupply it.

## Consequences

- Old fixed claims such as 50% HP, complete resource burn, or mandatory emergency reserve are not canonical.
- Exact post-capture values remain unresolved balance parameters.
- Runtime or balance constants are not changed by this record.

## Supersedes

none

## Superseded by

none

## Depends on

BS-MECH-026

## Source evidence

- `docs/tasks/docarch-002d-broader-reconciliation-and-closure.md`
- `docs/reviews/docarch-002-decision-recovery-report.md`
- Product Architect approval recorded during DOCARCH-002D preparation

## Verification

- Confirm condition is partial rather than full.
- Confirm both HP and resources are partial.
- Confirm no exact percentage, resource formula, or reserve amount is invented.

## Notes

D3 will reconcile active context and design documents to this decision without
choosing exact balance values.

The original decision date was not recovered. The Date field records Product
Architect approval for canonical D2 migration.
