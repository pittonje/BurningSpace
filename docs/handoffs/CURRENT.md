# BurningSpace Current Handoff

Last updated: 2026-07-11
Updated by: Claude (CI-002V verification setup)

## Repository state

- Base branch: `main`
- Active branch: `ci/verify-claude-qa-pilot`
- Upstream: not set until push
- Branched from: `main` at `558ce34` (merge commit for PR #13)
- Working tree: Clean after the task-definition commit
- Pull request: None opened yet

## Current task

- Task ID: `CI-002V`
- Task title: Post-Merge Claude QA Pilot Verification
- Task file: `docs/tasks/ci-002v-post-merge-pilot-verification.md`
- Status: Ready to open verification PR

## Goal

Prove the merged CI-002 workflow (`.github/workflows/claude-qa-review-pilot.yml`,
now on `main` since PR #13 merged as `558ce34`) executes fully — not
merge-gated — on a normal subsequent pull request, and posts exactly one
correctly structured top-level QA comment.

## CI-001 / CI-002 workflow status

- CI-001 (`.github/workflows/pr-checks.yml`): unchanged, active on `main`.
- CI-002 (`.github/workflows/claude-qa-review-pilot.yml`): unchanged,
  active on `main` since `558ce34`. Not modified by this task.
- Runtime changes: none.
- Dependency changes: none.

## CI-003 / PR-007 status

- CI-003 (Routed Claude Reviews): not authorized.
- PR-007 (Narrow Profile Message Consumer Imports): not authorized.

## Completed work (this task)

- Verified PR #13 merged as `558ce34` (`2026-07-11T11:48:44Z`), local
  `main` fast-forwarded to `origin/main`, `.github/workflows/claude-qa-review-pilot.yml`
  present on `main`, working tree clean, `CLAUDE_CODE_OAUTH_TOKEN` listed
  by `gh secret list --app actions` (name/timestamp only, no value
  accessed), and no prior `ci/verify-claude-qa-pilot` branch or CI-002V
  files existed.
- Created branch `ci/verify-claude-qa-pilot` from `main` at `558ce34`.
- Created `docs/tasks/ci-002v-post-merge-pilot-verification.md`.

## Allowed files for CI-002V

- `docs/tasks/ci-002v-post-merge-pilot-verification.md`
- `docs/reviews/ci-002v-pilot-verification.md`
- `docs/handoffs/CURRENT.md`
- `PROJECT_CONTEXT.md` (only if verification succeeds fully)

## Forbidden files

- `.github/workflows/**`
- `apps/**`
- `packages/**`
- `package.json`
- `package-lock.json`
- TypeScript configuration files
- assets
- `.claude/agents/**`
- environment files
- existing historical task or review reports

## Preserved invariants

- Server authority, wire format, gameplay, and balance unchanged.
- Runtime source, scripts, dependencies, lockfile, and assets unchanged.
- CI-001 and CI-002 workflow files unchanged.
- Reviewer definitions unchanged.
- No secret value accessed, printed, or committed.
- Local Claude settings remain private, ignored, and untracked.

## Open blockers

None.

## Next safe action

Commit the documentation-only verification setup, push the branch, open
the CI-002V pull request, and observe CI-001 and CI-002 execute on it.

## Resume instructions

1. Read `PROJECT_CONTEXT.md`, `AGENTS.md`, and this handoff.
2. Read `docs/tasks/ci-002v-post-merge-pilot-verification.md`.
3. Verify branch `ci/verify-claude-qa-pilot`, a clean working tree, and
   whether a PR has already been opened.
4. Do not implement CI-003 or PR-007 from this handoff alone.
5. Do not merge the CI-002V verification PR without explicit
   authorization.
