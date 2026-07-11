# CI-002DV — Verify Safe Claude Invocation Diagnostics

Status: Safe but inconclusive

## Goal

Verify the safe diagnostic path added by CI-002D on a normal pull request after
the diagnostic workflow has reached `main`.

## Verification requirements

The documentation-only verification PR must prove:

1. CI-001 passes independently.
2. Claude QA uses the trusted workflow from `main`.
3. OAuth and GitHub App OIDC exchange succeed.
4. Claude Code initializes.
5. The safe diagnostic step executes.
6. GitHub Step Summary contains allowlisted diagnostic metadata only.
7. No raw transcript, prompt, tool output, token, header, or environment value
   is exposed.
8. Exactly one normalized category is produced.
9. Allowlisted execution-file metadata supports that category without
   contradiction.
10. Missing structured output still creates exactly one sanitized top-level
    failure comment.
11. The job fails loudly after publication.
12. No zero-comment failure path occurs.
13. No runtime or workflow file changes occur in this PR.
14. CI-003 remains blocked until the invocation problem is understood and
    corrected.

## Allowed files

- `docs/tasks/ci-002dv-verify-safe-claude-diagnostics.md`
- `docs/reviews/ci-002dv-safe-diagnostic-verification.md`
- `docs/reviews/ci-002dv-local-security-review.md`
- `docs/reviews/ci-002dv-local-qa-review.md`
- `docs/reviews/ci-002dv-local-architecture-review.md`
- `docs/handoffs/CURRENT.md`
- `PROJECT_CONTEXT.md` only when durable facts are verified

## Forbidden files

- `.github/workflows/**`
- `apps/**`
- `packages/**`
- `package.json`
- `package-lock.json`
- tsconfig files
- assets
- `.claude/agents/**`
- environment files and secrets

## Reviewer policy

Local Claude tokens are unavailable. Do not invoke Claude Code or named Claude
reviewers. Perform and label `Local Security Review`, `Local QA Review`, and
`Local Architecture Review` as structured Codex reviews only.

## Non-goals

- No workflow, model, schema, or permission change.
- No fix for the observed category.
- No CI-003 or PR-007 implementation.
- Do not merge this verification PR.
