# BurningSpace Current Handoff

Last updated: 2026-07-14
Updated by: Codex — CI-003 implementation checkpoint

## Repository state

- Base branch: `main` at `a7bcfed` (PR #31, AGENT-004, merged).
- Active branch: `ci/risk-based-reviewer-routing`.
- Active task: CI-003 — Risk-Based Reviewer Routing.
- Pull request: to be opened from the active branch after local validation.
- Merge state: not merged.

## Authorization and status

- The Product Architect authorized CI-003 implementation after Preparation Agent review and an independent CI/security challenge.
- Implementation adds trusted-base, path-based routing for the existing Claude QA workflow.
- CI-003 remains unverified until merge and successful completion of both CI-003V phases.
- This task does not authorize dependency, Action, permission, runtime, agent-definition, or `PROJECT_CONTEXT.md` changes.

## Security boundaries

- Live routing executes the classifier only from the pull request base SHA under `trusted-ci/`.
- Fail-safe outputs require QA before all fallible work.
- Changed paths remain JSON data; rename, deletion, pagination, count, truncation, malformed input, and stale-state cases fail closed.
- Only a complete successful classification of ordinary documentation and explicit test-directory paths can produce `qa_required=false`.
- All five Claude Phase-2 steps share the accepted complete-pipeline gate.
- Existing permissions, pins, invocation, sanitizer, validator, renderer, publisher, and stale-run protection remain preserved.

## Review routing

- Deterministic classifier tests and the Claude QA workflow audit are required in CI-001.
- Claude QA is expected to run on the CI-003 implementation PR through the fail-safe path because the old base lacks the trusted classifier.
- Security/CI specialist review is manual and documented in `docs/reviews/ci-003-security-review.md`; no automated specialist reviewer is claimed.
- Product Architect review is required before human merge. No agent may merge the pull request.

## Post-merge verification

CI-003V is mandatory and has two phases:

- Phase A: a real ordinary docs-only PR must report `qa_required=false`, correct tested SHAs, five skipped Phase-2 steps, a successful job, and zero QA comments.
- Phase B: the next genuine QA-required PR must report `qa_required=true`, execute the full pipeline, post exactly one valid QA comment bound to live HEAD, and preserve stale-run protection.

Do not call CI-003 verified and do not update `PROJECT_CONTEXT.md` before both phases pass.

## Next safe action

Complete local validation, open the CI-003 pull request, observe CI-001 and Claude QA, obtain Product Architect review, and perform a human merge only after approval. Then execute CI-003V Phase A and Phase B.
