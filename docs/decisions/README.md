# BurningSpace Decision Registry

## Purpose

This registry will contain BurningSpace architecture, design, mechanics, process, and governance decisions with stable IDs and explicit statuses.

## Current status

The registry is intentionally empty after DOCARCH-001. DOCARCH-001 defines authority and record structure only; it creates no decision instance files.

DOCARCH-002 will inventory and recover existing decisions.

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

## Allowed files after DOCARCH-001

Only these files should exist in `docs/decisions/` after DOCARCH-001:

- `README.md`
- `DECISION_TEMPLATE.md`

No decision instance file is created by this task.

## Future migration

DOCARCH-002 will decide how to preserve legacy identifiers, including `BS-MECH-*` and `GAME-001-D*`, while inventorying and recovering decisions.
