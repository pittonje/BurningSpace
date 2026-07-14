# BS-PROC-004 — Required review evidence before human merge

Status: `accepted`

Date: `2026-07-14`

Owner: `Product Architect`

Scope / domain: `Process governance — review evidence and merge preconditions`

## Decision

For governed pull requests created after PR #39, human merge is allowed only after every review role required by the applicable task has recorded a verdict and evidence bound to the reviewed commit, and all required checks pass on the final pull-request head. A successful check alone is not sufficient review evidence. Review artifacts from pull requests merged before PR #40 remain immutable historical evidence and are not backfilled.

## Rationale

Task-local review requirements did not reliably preserve complete review evidence in earlier merged artifacts. A durable repository decision is required so future project recovery does not depend on chat history, unstated practice, or external inference.

## Consequences

- A blank required-reviewer verdict blocks human merge.
- Product Architect approval must identify the reviewed pull request and commit.
- When GitHub prevents the pull-request author from formal self-approval, Product Architect approval may be recorded through an attributable PR comment stating the verdict and reviewed commit.
- The review artifact must cite or link the Product Architect evidence.
- Claude QA evidence must include the QA verdict, evidence source, and reviewed commit; a green workflow result without an approving QA verdict is insufficient.
- Required checks must be successful on the final PR head at merge time.
- Evidence-only commits may trigger a fresh QA run and therefore do not inherit approval from an earlier head automatically.
- The review artifact must not require a commit to self-reference its own SHA.
- Historical B1 and B2 artifact gaps are not reopened or backfilled.

## Supersedes

none

## Superseded by

none

## Depends on

- BS-PROC-001
- BS-PROC-002

## Source evidence

- `docs/GOVERNANCE.md`
- `docs/agents/AGENT_SYSTEM.md`
- `docs/agents/handoff-protocol.md`
- `docs/tasks/docarch-002b-confirmed-mechanics-migration.md`
- `docs/tasks/docarch-002c-architecture-process-decision-migration.md`
- `docs/reviews/docarch-002b-mechanics-migration-review.md`
- `docs/reviews/docarch-002b2-mechanics-migration-review.md`
- `docs/reviews/docarch-002c1-architecture-migration-review.md`
- `docs/reviews/docarch-002-decision-recovery-report.md`

## Verification

No workflow, GitHub setting, or historical review artifact is changed. The record preserves the Product Architect-approved review-evidence rule first applied to PR #40.

## Notes

Original decision date not recovered; the Date field records Product Architect migration approval (DOCARCH-002C).

The cutoff is intentional:

- PRs merged before PR #40 retain their historical artifacts unchanged.
- PR #40 and later governed pull requests require complete evidence before human merge.

Technical enforcement through GitHub branch protection is outside this record and requires a separate approved task.
