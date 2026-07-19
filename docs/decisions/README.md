# BurningSpace Decision Registry

## Purpose

This registry will contain BurningSpace architecture, design, mechanics, process, and governance decisions with stable IDs and explicit statuses.

## Current status

Accepted decision records now exist after DOCARCH-002B1, DOCARCH-002B2, DOCARCH-002C1, DOCARCH-002C2, and DOCARCH-002C3. DOCARCH-002C4 is active as the C-stage closure pass. Each individual record is authoritative within its accepted scope.

[`DECISION_INDEX.md`](DECISION_INDEX.md) is the complete non-canonical navigation listing for accepted, pending, reserved, and unrecovered IDs.

## Authority

Decision authority is defined by [`docs/GOVERNANCE.md`](../GOVERNANCE.md).

- Only the Product Architect can mark a decision `accepted`.
- Agents may prepare `draft` or `proposed` records within an accepted task.
- Observed implementation is evidence and is not automatically an accepted decision.

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
