# BS-PROC-002 — Separation of governance responsibilities

Status: `accepted`

Date: `2026-07-14`

Owner: `Product Architect`

Scope / domain: `Process governance — role boundaries and independent review`

## Decision

Preparation, implementation, review, documentation consistency, architecture approval, quality assurance, and merge authority are separate governance responsibilities. Required independent review must not be performed by the implementer whose work is under review. A reviewer is read-only unless explicitly authorized to update a named review artifact.

## Rationale

Separating responsibilities prevents implementation, approval, evidence collection, and merge authority from collapsing into one self-validating role.

## Consequences

- The Implementer does not independently approve its own implementation.
- Reviewers do not modify production or decision content during review.
- A reviewer may update only the explicitly authorized review artifact when a task permits it.
- Reviewer and agent names may vary by domain or tool; this record does not make any current taxonomy exhaustive or permanent.
- Required reviewers remain defined by the applicable accepted task and governance context.

## Supersedes

none

## Superseded by

none

## Depends on

BS-PROC-001

## Source evidence

- `docs/GOVERNANCE.md`
- `AGENTS.md`
- `docs/agents/AGENT_SYSTEM.md`
- `docs/agents/ARTIFACT_CONTRACTS.md`
- `docs/agents/reviewer-routing.md`
- `docs/tasks/docarch-002b-confirmed-mechanics-migration.md`
- `docs/tasks/docarch-002c-architecture-process-decision-migration.md`
- `docs/reviews/docarch-002-decision-recovery-report.md`

## Verification

No role adapter, workflow, or reviewer-routing implementation is changed. The record preserves the responsibility separation already used by the repository process.

## Notes

Original decision date not recovered; the Date field records Product Architect migration approval (DOCARCH-002C).

This record deliberately does not declare the reviewer names in AGENTS.md, agent adapters, task files, or CI classifier output to be one exhaustive canonical taxonomy.
