# BurningSpace Decision Registry

## Purpose

This registry will contain BurningSpace architecture, design, mechanics, process, and governance decisions with stable IDs and explicit statuses.

## Current status

DOCARCH-002C is complete. DOCARCH-002D1 merged via PR #44, and DOCARCH-002D2
merged via PR #45. DOCARCH-002D3 is the active final reconciliation and closure
candidate. It creates no decision records, so the accepted count remains 35.
Active architecture and design summaries are being reconciled to the accepted
registry, while `balance-v0.1.md` is explicitly historical and
non-authoritative. After D3 human merge, DOCARCH-002 closes and DOCARCH-003 —
Canonical Development Roadmap becomes the next repository task.

[`DECISION_INDEX.md`](DECISION_INDEX.md) remains the canonical decision-navigation
source. Do not duplicate its detailed registry here.

## Authority

Decision authority is defined by [`docs/GOVERNANCE.md`](../GOVERNANCE.md).

- Only the Product Architect can mark a decision `accepted`.
- Agents may prepare `draft` or `proposed` records within an accepted task.
- Observed implementation is evidence and is not automatically an accepted decision.
- `PROJECT_CONTEXT.md` is a durable entrypoint and summary, not decision authority.

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

## Reconciliation boundary

DOCARCH-002D3 changes navigation and lower-authority summaries only. Accepted
decision semantics remain in the individual records, and unrecovered IDs must
not receive placeholder files.
