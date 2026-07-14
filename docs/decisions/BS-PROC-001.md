# BS-PROC-001 — Human-only merge authority

Status: `accepted`

Date: `2026-07-14`

Owner: `Product Architect`

Scope / domain: `Process governance — merge authority`

## Decision

Agents may prepare, implement, review, and recommend. Only the human project owner may make the final merge decision and merge pull requests. Product Architect approval, reviewer approval, and successful CI checks are evidence; none of them independently grants merge authority.

## Rationale

Decision approval, review evidence, automated checks, and execution of a merge are separate acts. Human-only merge authority prevents an agent or automated system from converting its own recommendation into an irreversible repository change.

## Consequences

- No agent may merge a pull request.
- A successful review or CI run does not authorize automatic merge.
- Product Architect approval and human merge execution remain distinct acts, even when the same person currently performs both roles.
- Technical GitHub permissions do not override this governance rule.

## Supersedes

none

## Superseded by

none

## Depends on

none

## Source evidence

- `docs/GOVERNANCE.md`
- `AGENTS.md`
- `docs/agents/AGENT_SYSTEM.md`
- `docs/agents/ARTIFACT_CONTRACTS.md`
- `docs/tasks/docarch-002-decision-inventory-and-recovery.md`
- `docs/tasks/docarch-002c-architecture-process-decision-migration.md`
- `docs/reviews/docarch-002-decision-recovery-report.md`

## Verification

No repository setting or workflow is changed. Existing governance and task evidence consistently assign merge execution to the human project owner.

## Notes

Original decision date not recovered; the Date field records Product Architect migration approval (DOCARCH-002C).

GitHub branch protection is not established by this record. Possible technical enforcement belongs to a separate explicitly approved task.
