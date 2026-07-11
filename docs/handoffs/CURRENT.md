# BurningSpace Current Handoff

Last updated: 2026-07-11
Updated by: Codex — CI-002RV started

## Repository state

- Base branch: `main`
- Base commit: `93569a3eb0093045409580ce1b5950de0a62e62f`
- Active branch: `ci/verify-deterministic-qa-comment`
- Upstream: none until first push
- Pull request: None until initial documentation commit is pushed
- Working tree: CI-002RV task and handoff documentation in progress

## Current task

- Task ID: `CI-002RV`
- Task title: Verify Deterministic Claude QA Comment Delivery
- Task file: `docs/tasks/ci-002rv-verify-deterministic-comment-delivery.md`
- Status: In progress — preflight complete

## Goal

Verify after PR #15 merged that the trusted workflow on `main` receives valid
Claude structured output and deterministically publishes exactly one correctly
bound four-heading QA comment per current workflow run.

## Confirmed preflight

- PR #15 merged into `main` as `93569a3`.
- Local `main` was clean and synchronized with `origin/main` before branching.
- `.github/workflows/claude-qa-review-pilot.yml` exists on `main`.
- `.github/workflows/pr-checks.yml` remains at its CI-001 content; its last
  change is commit `dd04674`.
- `CLAUDE_CODE_OAUTH_TOKEN` is listed for GitHub Actions; its value was not
  accessed.
- No local or remote `ci/verify-deterministic-qa-comment` branch existed.

## Reviewer routing

- Required: `security-reviewer`, `qa-reviewer`, `architecture-reviewer`.
- Skipped: Network (no networking/protocol change), Gameplay (no gameplay
  change), Visual Design (no visual/asset change).
- Reviewers are read-only and cannot edit, commit, push, branch, or comment.

## Allowed paths

- CI-002RV task, verification report, three reviewer reports, this handoff,
  and `PROJECT_CONTEXT.md` only after full verification.

## Forbidden paths

- Both workflows, runtime applications/packages, manifests, lockfile, tsconfig
  files, assets, and reviewer definitions.

## Next action

Commit and push the initial documentation, open the verification PR, and
observe the first CI-001 and Claude QA workflow runs. Do not merge the PR.

## Preserved constraints

- CI-003 and PR-007 remain unauthorized.
- No workflow or runtime modification is authorized.
- The invalid-output path must not be provoked by changing production workflow.
