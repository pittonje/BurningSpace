# BS-MECH-023 — Post-outpost-capture governed-sector state

Status: `accepted`

Date: `2026-07-19`

Owner: `Product Architect`

Scope / domain: `Outpost ownership transition and shield state`

## Decision

- After an outpost is captured, the new owner begins with exactly four of its six governed sectors.
- The outpost shield is therefore active immediately after capture.
- The former owner must retake at least two governed sectors, reducing the new owner's control to two of six, to disable the shield.
- This decision does not define which specific four sectors transfer.

## Rationale

The 4/6 state gives the new owner a defensible but incomplete foothold while
preserving immediate counterplay for the former owner.

## Consequences

- The older statement that governed sectors do not change ownership after outpost capture is not canonical.
- Specific sector-selection logic requires a separate implementation or design decision.
- No runtime change is made by this migration.

## Supersedes

none

## Superseded by

none

## Depends on

- BS-MECH-021
- BS-MECH-022
- BS-MECH-026

## Source evidence

- `docs/tasks/docarch-002d-broader-reconciliation-and-closure.md`
- `docs/reviews/docarch-002-decision-recovery-report.md`
- Product Architect approval recorded during DOCARCH-002D preparation

## Verification

- Confirm exactly 4/6 sectors after capture.
- Confirm shield active under BS-MECH-022.
- Confirm two sectors must be retaken to reach 2/6.
- Confirm specific-sector selection remains undecided.

## Notes

This record governs the ownership count, not the algorithm selecting the four
sectors.

The original decision date was not recovered. The Date field records Product
Architect approval for canonical D2 migration.
