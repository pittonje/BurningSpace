# BurningSpace Decision Registry

## Purpose

This registry will contain BurningSpace architecture, design, mechanics, process, and governance decisions with stable IDs and explicit statuses.

## Current status

DOCARCH-002C is complete. DOCARCH-002D1 is active for status and authority
reconciliation. DOCARCH-002D2 will migrate five Product Architect-approved
mechanics records, and DOCARCH-002D3 will reconcile context, architecture, and
design documentation. The accepted decision-record count remains 30 until D2
merges. Each individual record is authoritative within its accepted scope.

[`DECISION_INDEX.md`](DECISION_INDEX.md) remains the canonical decision-navigation
source. Do not duplicate its detailed registry here.

## Authority

Decision authority is defined by [`docs/GOVERNANCE.md`](../GOVERNANCE.md).

- Only the Product Architect can mark a decision `accepted`.
- Agents may prepare `draft` or `proposed` records within an accepted task.
- Observed implementation is evidence and is not automatically an accepted decision.
- `PROJECT_CONTEXT.md` is transitional and is not decision authority.

## ID policy

Decision IDs are stable and domain-scoped:

- `BS-MECH-013` identifies a BurningSpace mechanics decision.
- `GAME-001-D1` preserves a task-local decision namespace already introduced by a task.
- `DOCARCH-001-D1` identifies a documentation-architecture decision.
- `DEC-NNN` is reserved for general decisions that do not fit a domain-specific namespace.

DOCARCH-001 does not rename, normalize, or migrate existing identifiers.

## Allowed registry files

The registry may contain:

- `README.md`
- `DECISION_TEMPLATE.md`
- `DECISION_INDEX.md`
- accepted decision records named `<ID>.md`

The index is derived navigation and does not create decision authority. Accepted authority resides in individual decision records.

## Future migration

DOCARCH-002B1 preserves approved existing identifiers. Later approved stages may add records for already approved pending IDs; reserved and unrecovered IDs must not receive placeholder files.
