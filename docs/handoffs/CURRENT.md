# BurningSpace Current Handoff

Last updated: 2026-07-14
Updated by: Codex — CI-003 implementation checkpoint

## Repository state

- Base branch: `main` at `a7bcfed` (PR #31, AGENT-004, merged).
- Active branch: `ci/risk-based-reviewer-routing`.
- Active task: CI-003 — Risk-Based Reviewer Routing.
- Pull request: [#32 — CI-003 — Risk-Based Reviewer Routing](https://github.com/pittonje/BurningSpace/pull/32).
- Implementation HEAD before the documentation correction: `0203f65`.
- Pull request state: open and mergeable; unstable only because Claude QA failed its expected workflow-identity check.

## Authorization and status

- The Product Architect authorized CI-003 implementation after Preparation Agent review and an independent CI/security challenge.
- The Product Architect accepted the implementation architecture and authorized a human merge exception limited to the expected Claude workflow-identity failure.
- Implementation adds trusted-base, path-based routing for the existing Claude QA workflow.
- CI-003 remains unverified until merge and successful completion of both CI-003V phases.
- This task does not authorize dependency, Action, permission, runtime, agent-definition, or `PROJECT_CONTEXT.md` changes.

## Validation state

- CI-001: passed.
- Claude QA: expected workflow-identity failure; Anthropic Action did not execute Claude because the pull request modifies its workflow relative to the default branch.
- Classifier tests: 29/29 passed.
- Vitest: 31/31 passed.
- Build: passed.
- Typecheck: passed.
- QA workflow audit: passed.
- Exactly eight CI-003 implementation-scope files changed.

## Security boundaries

- Live routing executes the classifier only from the pull request base SHA under `trusted-ci/`.
- Fail-safe outputs require QA before all fallible work.
- Changed paths remain JSON data; rename, deletion, pagination, count, truncation, malformed input, and stale-state cases fail closed.
- Only a complete successful classification of ordinary documentation and explicit test-directory paths can produce `qa_required=false`.
- All five Claude Phase-2 steps share the accepted complete-pipeline gate.
- Existing permissions, pins, invocation, sanitizer, validator, renderer, publisher, and stale-run protection remain preserved.

## Review routing

- Deterministic classifier tests and the Claude QA workflow audit are required in CI-001.
- PR #32 emitted fail-safe `qa_required=true`, `risk_level=unknown`, and `reason_codes=["classifier_error"]`; all five Phase-2 steps were activated before workflow-identity validation prevented Claude execution.
- Security/CI specialist review is manual and documented through the Fable challenge review and `docs/reviews/ci-003-security-review.md`; no automated specialist reviewer or Claude approval is claimed.
- The human merge exception applies only to the expected workflow-identity failure. Unrelated Claude QA failures remain blocking, and no agent may merge the pull request.

## Post-merge verification

CI-003V is mandatory and has two phases:

- Phase A: a real ordinary docs-only PR must report `qa_required=false`, correct tested SHAs, five skipped Phase-2 steps, a successful job, and zero QA comments.
- Phase B: the next genuine QA-required PR must report `qa_required=true`, execute the full pipeline, post exactly one valid QA comment bound to live HEAD, and preserve stale-run protection.

Do not call CI-003 verified and do not update `PROJECT_CONTEXT.md` before both phases pass.

## Next safe action

1. Verify the final documentation-only commit.
2. Human-merge PR #32 under the narrowly authorized workflow-identity exception.
3. Run CI-003V Phase A.
4. Run CI-003V Phase B.

`PROJECT_CONTEXT.md` must remain unchanged until both CI-003V phases pass.
