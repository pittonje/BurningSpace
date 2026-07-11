# BurningSpace Current Handoff

Last updated: 2026-07-11
Updated by: Claude (preparation only)

## Repository state

- Base branch: `main`
- Active branch: `ci/core-pr-checks`
- Upstream: `origin/ci/core-pr-checks` (after push)
- Current HEAD: `b3ab7d5` (stable CI-001 task checkpoint)
- Working tree: Clean after the task-definition commit
- Pull request: None opened
- Pull request state: N/A

## Current task

- Task ID: `CI-001`
- Task title: Core Pull Request Checks
- Task file: `docs/tasks/ci-001-core-pr-checks.md`
- Status: Authorized for Claude implementation

## Goal

Implement `.github/workflows/pr-checks.yml` exactly as specified in
`docs/tasks/ci-001-core-pr-checks.md`. No other file may change except the
explicitly allowed set below.

## Completed work

- Verified `main` matched `origin/main` at `025ce9b` and the working tree
  was clean before branching.
- Verified WF-001 (PR #10) remains merged and is an ancestor of `main`.
- Verified no unexpected untracked files exist.
- Verified all six required validation commands exist in the repository
  before writing the task file.
- Created branch `ci/core-pr-checks` from `main` at `025ce9b`.
- Created `docs/tasks/ci-001-core-pr-checks.md` defining scope, allowed and
  forbidden files, exact workflow requirements, and reviewer routing.
- Committed the task file separately as `b3ab7d5`
  (`docs: define CI-001 core pull request checks`).

## Files created

- `docs/tasks/ci-001-core-pr-checks.md`

## Files modified

- `docs/handoffs/CURRENT.md` (this file, in a separate commit)

## Allowed files for implementation

- `.github/workflows/pr-checks.yml`
- `docs/tasks/ci-001-core-pr-checks.md`
- `docs/handoffs/CURRENT.md`
- `PROJECT_CONTEXT.md` (concise durable CI status update only)

## Forbidden files

- `apps/**`
- `packages/**`
- `package.json`
- `package-lock.json`
- TypeScript configuration files
- assets
- `.claude/agents/**`
- any dependency upgrade
- any Claude Actions integration
- any CI-002 work

## Preserved invariants

- Server authority unchanged.
- Wire format and networking unchanged.
- Gameplay and balance unchanged.
- Runtime source, scripts, dependencies, and assets unchanged.
- Reviewer definitions unchanged.
- Local Claude settings remain private, ignored, and untracked.

## Validation commands (to run after implementation)

- `npm run build`
- `npm run typecheck`
- `npm run check:protocol-profile`
- `npx tsx apps/client/scripts/network-client-callback-check.ts`
- `npx tsx apps/server/scripts/movement-check.ts`
- `npx tsx apps/server/scripts/combat-check.ts`
- All six commands must also pass inside the new GitHub Actions run itself.

## Reviewer routing

- Required: `qa-reviewer`, `security-reviewer`
- Recommended: `architecture-reviewer`
- Not applicable: `network-reviewer`, `gameplay-reviewer`, `visual-design-lead`
- Reason: CI-001 executes existing diagnostics unmodified and does not touch
  networking, gameplay, assets, or UI.

## Open blockers and decisions

None.

## Next safe action

Implement `.github/workflows/pr-checks.yml` exactly as specified in
`docs/tasks/ci-001-core-pr-checks.md`, then run the validation commands
locally, commit, and push before opening a pull request.

## Resume instructions

1. Read `PROJECT_CONTEXT.md`, `AGENTS.md`, and this handoff.
2. Read `docs/tasks/ci-001-core-pr-checks.md` (implementation authority).
3. Verify branch `ci/core-pr-checks`, `HEAD` at or after `b3ab7d5`, and a
   clean working tree.
4. Implement only `.github/workflows/pr-checks.yml` per the task file.
