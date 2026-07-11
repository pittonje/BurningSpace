# BurningSpace Current Handoff

Last updated: 2026-07-11
Updated by: Claude (CI-002 preparation only)

## Repository state

- Base branch: `main`
- Active branch: `ci/claude-review-pilot`
- Upstream: `origin/ci/claude-review-pilot` (after push)
- Stable task checkpoint: `6ec550e` (`docs: define CI-002 Claude review pilot`)
- Working tree: Clean after the task-definition commit
- Pull request: None opened
- Pull request state: N/A

## Current task

- Task ID: `CI-002`
- Task title: Claude Review Pilot
- Task file: `docs/tasks/ci-002-claude-review-pilot.md`
- Status: Authorized for Claude implementation and implementation is in
  progress. The repository owner ran `/install-github-app` (stdout:
  "GitHub Actions setup complete!") and the Product Architect explicitly
  confirmed, in the authorizing prompt: the official Claude GitHub App is
  installed for BurningSpace, and GitHub Actions secret
  `CLAUDE_CODE_OAUTH_TOKEN` exists. This agent independently re-verified
  only the secret's existence via `gh secret list --app actions` (name and
  creation timestamp `2026-07-11T11:13:28Z`, no value read); GitHub App
  installation is recorded here as a Product Architect attestation, not as
  something this agent independently confirmed via the GitHub API.

## Goal

Implement `.github/workflows/claude-qa-review-pilot.yml` exactly as
specified in `docs/tasks/ci-002-claude-review-pilot.md`, open the CI-002
pull request as the pilot test, and record its results here.

## Runtime changes

None. Workflow implementation: in progress on this branch (not yet merged;
PR not yet opened as of this commit).

## Completed work

- Verified PR #11 merged as `e7ecefa`, `main` synchronized with
  `origin/main`, working tree clean, and `CURRENT.md`'s prior stable
  checkpoint/handoff-child relationship (`e7ecefa` → `e78020b`, subject
  `docs: reset handoff after CI-001 merge`) before editing.
- Created branch `ci/claude-review-pilot` from `main` at `e78020b`.
- Corrected `PROJECT_CONTEXT.md` §12: recorded CI-001 as complete
  (PR #11 merged as `e7ecefa`, workflow active, Node 22, reviews
  approved) and removed it from the "recommended order" future list.
- Created `docs/tasks/ci-002-claude-review-pilot.md` defining the CI-002
  planned workflow, triggers, same-repository/owner/non-draft
  restriction, minimal permissions, authentication via
  `CLAUDE_CODE_OAUTH_TOKEN`, `qa-reviewer` invocation with read-only
  tools, required comment sections, concurrency, non-goals, allowed and
  forbidden files, and reviewer routing.
- Committed both as the stable task checkpoint `6ec550e`
  (`docs: define CI-002 Claude review pilot`).
- Checked `gh secret list --app actions`: no secrets are configured in
  this repository. `CLAUDE_CODE_OAUTH_TOKEN` does not exist. No secret
  value was accessed, printed, or requested.

## Files created

- `docs/tasks/ci-002-claude-review-pilot.md`

## Files modified

- `PROJECT_CONTEXT.md` (CI-001 completion recorded; CI-002 remains next)
- `docs/handoffs/CURRENT.md` (this file, in a separate commit)

## Allowed files for CI-002 implementation

- `.github/workflows/claude-qa-review-pilot.yml`
- `docs/tasks/ci-002-claude-review-pilot.md`
- `docs/handoffs/CURRENT.md`
- `PROJECT_CONTEXT.md`
- `docs/reviews/ci-002-security-review.md` (only if the task explicitly
  chooses to store it)

## Forbidden files

- `apps/**`
- `packages/**`
- `package.json`
- `package-lock.json`
- TypeScript configuration files
- assets
- `.claude/agents/**`
- `.github/workflows/pr-checks.yml`
- environment files
- existing historical review reports

## Preserved invariants

- Server authority unchanged.
- Wire format and networking unchanged.
- Gameplay and balance unchanged.
- Runtime source, scripts, dependencies, lockfile, and assets unchanged.
- CI-001 (`.github/workflows/pr-checks.yml`) unchanged.
- Reviewer definitions unchanged.
- No secret value accessed, printed, or committed.
- Local Claude settings remain private, ignored, and untracked.

## Manual setup status

- Claude GitHub App installation: Product Architect-attested as complete
  (repository owner ran `/install-github-app`); not independently
  re-verified via the GitHub API by this agent.
- `CLAUDE_CODE_OAUTH_TOKEN` Actions secret: **present** (independently
  re-confirmed via `gh secret list --app actions`; name and creation
  timestamp only, no value accessed).
- Secret value: not accessed.

## CI-003 / PR-007 status

- CI-003 (Routed Claude Reviews): not authorized.
- PR-007 (Narrow Profile Message Consumer Imports): not authorized.

## Reviewer routing (for future CI-002 implementation)

- Required: `security-reviewer`, `qa-reviewer`
- Recommended: `architecture-reviewer`
- Skipped: `network-reviewer`, `gameplay-reviewer`, `visual-design-lead`
- Reason: CI-002 adds a narrow Claude QA review pilot with no protocol,
  gameplay, or visual/asset change.

## Open blockers and decisions

None outstanding for implementation authorization. Remaining work is to
finish committing the workflow, open the CI-002 pull request, and record
its live results (Actions run, QA comment, security review) here.

## Next safe action

Commit `.github/workflows/claude-qa-review-pilot.yml` separately, push the
branch, and open the CI-002 pull request as the pilot test. Do not merge
it. Do not implement CI-003 or PR-007.

## Resume instructions

1. Read `PROJECT_CONTEXT.md`, `AGENTS.md`, and this handoff.
2. Read `docs/tasks/ci-002-claude-review-pilot.md` (implementation
   authority).
3. Verify branch `ci/claude-review-pilot`, `HEAD` at or after this
   commit, and a clean working tree.
4. If the CI-002 pull request is not yet open, open it and observe the
   pilot run. If it is already open, check its Actions run and QA comment
   results before taking further action.
5. Do not implement CI-003 or PR-007 from this handoff alone.
