# BS-MECH-025 — Turret restoration eligibility

Status: `accepted`

Date: `2026-07-19`

Owner: `Product Architect`

Scope / domain: `Sector defensive-turret restoration`

## Decision

- Sector capture itself does not restore destroyed turrets.
- Turret restoration is eligible only when the responsible outpost belongs to the same faction as the sector.
- Automatic repair additionally requires the responsible outpost to be undamaged and to have sufficient resources.
- Repair speed and repair cost remain balance parameters.
- This decision does not establish a separate active-combat gating condition.

## Rationale

Turret restoration is tied to functioning faction infrastructure rather than
ownership change alone. This preserves attrition and gives outpost damage and
resources strategic meaning.

## Consequences

- The older all-six-sectors restoration rule is not canonical.
- A captured sector may remain without restored turrets.
- Runtime repair rates, costs, timing, and resource values are not changed here.
- No active-combat requirement may be inferred from older recovery wording.

## Supersedes

none

## Superseded by

none

## Depends on

BS-MECH-024

## Source evidence

- `docs/tasks/docarch-002d-broader-reconciliation-and-closure.md`
- Product Architect clarification: https://github.com/pittonje/BurningSpace/pull/44#issuecomment-5017096699

## Verification

- Confirm sector capture does not restore turrets.
- Confirm same-faction responsible-outpost requirement.
- Confirm undamaged and sufficiently resourced automatic-repair requirements.
- Confirm no active-combat gating condition is introduced.

## Notes

Exact repair speed, repair cost, and resource quantities remain balance
parameters.

The original decision date was not recovered. The Date field records Product
Architect approval for canonical D2 migration.
