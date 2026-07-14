# BS-PROC-003 — Durable governance roles are independent of model or vendor

Status: `accepted`

Date: `2026-07-14`

Owner: `Product Architect`

Scope / domain: `Process governance — role identity`

## Decision

Governance roles are durable project concepts. The current model, product, or vendor assigned to perform a role does not define that role and does not change its duties, boundaries, or authority.

## Rationale

Project continuity must survive changes in available models, vendors, tools, and agent implementations. Authority belongs to the governed role rather than to the current software product performing it.

## Consequences

- Names such as Codex, Claude, ChatGPT, or another model or vendor describe current assignments or adapters, not permanent governance authorities.
- Reassigning a role does not automatically expand or reduce that role's authority.
- Repository authority must remain understandable without relying on one vendor's terminology.
- Detailed model selection, fallback order, token-budget strategy, vendor substitution, and portability procedures are not defined by this record.

## Supersedes

none

## Superseded by

none

## Depends on

BS-PROC-002

## Source evidence

- `docs/GOVERNANCE.md`
- `PROJECT_CONTEXT.md`
- `docs/agents/AGENT_SYSTEM.md`
- `docs/agents/AGENT_ROUTING.md`
- `docs/agents/PREPARATION_AGENT_GUIDE.md`
- `docs/reviews/docarch-002-decision-recovery-report.md`
- `docs/tasks/docarch-002c-architecture-process-decision-migration.md`

## Verification

No model assignment, agent adapter, routing rule, or workflow is changed. The record separates durable role authority from current tool and vendor assignments.

## Notes

Original decision date not recovered; the Date field records Product Architect migration approval (DOCARCH-002C).

Detailed role/model portability, model-selection, substitution, fallback, and vendor-migration policy remains deferred to DOCARCH-005.

The current label “Claude QA” may remain in operational files; it does not make the vendor name the permanent definition of the independent QA responsibility.
