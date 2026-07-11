# CI-002RV — Verify Deterministic Claude QA Comment Delivery

Status: Failed — both live runs returned no structured output; CI-003 remains blocked

## Goal

Verify on a normal documentation-only pull request that the deterministic
Claude QA review architecture merged by PR #15 operates reliably from the
trusted workflow definition on `main`.

## Scope

- Create a documentation-only verification PR.
- Observe the initial `pull_request` run and a second harmless documentation
  push.
- Verify CI-001 independently remains green.
- Verify Claude authentication, reviewer invocation, structured output, and
  workflow-owned publication.
- Verify exactly one top-level four-heading comment per completed current run,
  commit binding, read-only behavior, stale-run protection, and secret safety.
- Record Security, QA, and Architecture read-only reviews.

## Allowed files

- `docs/tasks/ci-002rv-verify-deterministic-comment-delivery.md`
- `docs/reviews/ci-002rv-deterministic-comment-verification.md`
- `docs/reviews/ci-002rv-security-review.md`
- `docs/reviews/ci-002rv-qa-review.md`
- `docs/reviews/ci-002rv-architecture-review.md`
- `docs/handoffs/CURRENT.md`
- `PROJECT_CONTEXT.md` only after full verification

## Forbidden files

- `.github/workflows/**`
- `apps/**`
- `packages/**`
- `package.json`
- `package-lock.json`
- all tsconfig files
- assets
- `.claude/agents/**`

## Reviewer routing

- `security-reviewer`: required; verifies mutation isolation, data handling,
  stale-run controls, secret safety, and absence of `pull_request_target`.
- `qa-reviewer`: required; verifies both runs, comment cardinality and binding,
  headings, and CI-001 independence.
- `architecture-reviewer`: required by this task; verifies separation of
  reasoning and publication and that CI-003 remains unimplemented.
- `network-reviewer`: skipped; no protocol, networking, or deployment change.
- `gameplay-reviewer`: skipped; no gameplay or authority change.
- `visual-design-lead`: skipped; no visual or asset change.

All reviewers are read-only and may not edit, commit, push, create branches, or
post GitHub comments.

## Verification procedure

1. Confirm PR #15 merged, clean synchronized `main`, required workflow files,
   secret name, and absence of an existing task branch.
2. Open a documentation-only PR from
   `ci/verify-deterministic-qa-comment`.
3. Observe the first CI-001 and Claude QA runs and inspect their logs, outputs,
   comments, actors, and mutation footprint.
4. Make a harmless documentation-only synchronize commit and observe the
   second runs.
5. Verify an old commit produces no stale comment and the new current run
   produces exactly one comment.
6. Verify the invalid-output fallback from the committed local matrix, CI-002R
   evidence, and source inspection only; do not corrupt the workflow.
7. Run Security, QA, and Architecture reviewers and disposition only in-scope
   findings.
8. Complete the verification report and update durable context only if every
   acceptance criterion passes.

## Acceptance criteria

- CI-001 passes independently on both pushes and remains unchanged.
- The trusted workflow from `main` authenticates via OAuth/OIDC, invokes
  `qa-reviewer`, and receives valid structured output.
- Claude makes no GitHub mutation; the deterministic publisher is the only
  mutation path.
- Each completed current run posts exactly one top-level comment with exactly
  the four required headings in order and the current PR HEAD SHA.
- No zero-comment successful run or duplicate per-run comment occurs.
- The synchronize push produces no stale comment for the superseded commit.
- No reviewer-created files, commits, branches, labels, issues, inline reviews,
  or secret/token disclosure is observed.
- All forbidden-path diffs are empty.
- Security, QA, and Architecture reviews have no blockers.

## Non-goals

- Do not modify either workflow.
- Do not deliberately trigger invalid output.
- Do not implement CI-003 or PR-007.
- Do not modify runtime code, dependencies, manifests, lockfiles, assets, or
  reviewer definitions.
- Do not merge the verification PR.
