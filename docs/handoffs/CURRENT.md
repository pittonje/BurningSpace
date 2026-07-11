# BurningSpace Current Handoff

Last updated: 2026-07-11
Updated by: Claude (CI-002 implementation, pilot pending merge)

## Repository state

- Base branch: `main`
- Active branch: `ci/claude-review-pilot`
- Upstream: `origin/ci/claude-review-pilot`
- Workflow commit: `41b3b77` (`ci: add claude qa review pilot`)
- Fix commit: `70fad5b` (`fix: restore id-token permission for Claude
  GitHub App OIDC exchange`) — current branch tip
- Working tree: Clean
- Pull request: [#13](https://github.com/pittonje/BurningSpace/pull/13)
- Pull request state: Open, **not merged** (merge is out of scope for this
  session)

## Current task

- Task ID: `CI-002`
- Task title: Claude Review Pilot
- Task file: `docs/tasks/ci-002-claude-review-pilot.md`
- Status: Implemented and pushed. CI-001 passes independently on PR #13.
  The Claude QA Review Pilot workflow authenticates correctly
  (`claude_code_oauth_token` + OIDC exchange for the Claude GitHub App
  token both succeed) but cannot post its review comment on this PR
  because Anthropic's own backend blocks execution for any PR whose
  workflow file differs from the default branch (see "Pilot verification
  blocker" below). This is documented, expected platform behavior, not a
  bug in the implementation.

## Manual setup status (confirmed working)

- Claude GitHub App installation: Product Architect-attested as complete
  (repository owner ran `/install-github-app`, stdout "GitHub Actions
  setup complete!"). Empirically corroborated: the workflow's OIDC token
  request and its exchange for a Claude GitHub App installation token
  both succeeded in the second pilot run — this would not succeed if the
  App were not installed.
- `CLAUDE_CODE_OAUTH_TOKEN` Actions secret: present and functional
  (confirmed via `gh secret list --app actions`, name/timestamp only, and
  via successful `claude_code_oauth_token` authentication in both pilot
  runs). No secret value was ever read, printed, or logged.

## Pilot verification blocker (platform-level, not a defect)

The CI-002 pull request is the PR that *introduces* the workflow file, so
its content does not yet match `main`. Anthropic's backend explicitly
refuses to execute the review step in this situation:

> "Skipping action due to workflow validation: Workflow validation
> failed. The workflow file must exist and have identical content to the
> version on the repository's default branch... Action skipped due to
> workflow validation error. This is expected when adding Claude Code
> workflows to new repositories or on PRs with workflow changes... your
> workflow will begin working once you merge your PR."

This is a deliberate anti-privilege-escalation control: it stops a PR from
modifying its own workflow to grant itself an elevated GitHub App token
and exploiting it within the same run. Using `pull_request_target` would
sidestep this control and is explicitly forbidden by the task file for
exactly that reason, so it was not used. No PR comment was posted by the
automated reviewer on PR #13 (confirmed via `gh pr view 13 --comments`,
empty). Full pilot verification (OAuth auth **and** a posted QA comment
with all four required headings) can only be observed after this PR
merges to `main` and a subsequent PR/push triggers the now-matching
workflow. This session was explicitly told not to merge, so that final
verification step is deferred to whoever is authorized to merge.

## Completed work

- Verified PR #11 merged as `e7ecefa`, `main` synchronized, working tree
  clean, and prior stable checkpoint/handoff-child relationship
  (`e7ecefa` → `e78020b`) before editing.
- Created branch `ci/claude-review-pilot` from `main` at `e78020b`.
- Corrected `PROJECT_CONTEXT.md` §12 (CI-001 completion recorded).
- Created `docs/tasks/ci-002-claude-review-pilot.md`; committed with the
  context correction as stable checkpoint `6ec550e`.
- Verified `CLAUDE_CODE_OAUTH_TOKEN` secret existence only (no value) and
  recorded the Product Architect's GitHub App installation attestation;
  committed as `35bdbaa`.
- Verified current `anthropics/claude-code-action@v1` inputs against
  official docs/`action.yml` before writing any YAML: `claude_code_oauth_token`,
  `github_token`, `prompt`, `claude_args` (`--agent`, `--allowedTools`,
  `--disallowedTools`), `track_progress`/`use_sticky_comment` defaults
  (both `false`), and confirmed `actions/checkout@v6` exists.
- Implemented `.github/workflows/claude-qa-review-pilot.yml` per the task
  file: `pull_request` only, same-repo/owner/non-draft job `if:` gate,
  concurrency cancellation, `qa-reviewer` agent via `claude_args`, tools
  restricted to `Read`/`Grep`/`Glob`/three `gh` subcommands, `Write`/`Edit`/
  `NotebookEdit` disallowed, exactly one comment guaranteed via explicit
  `track_progress: "false"`/`use_sticky_comment: "false"`. Committed as
  `41b3b77`.
- Ran `security-reviewer` read-only against the drafted workflow before
  committing; it found the technical posture sound but blocked on a
  documentation gap (CURRENT.md not yet reflecting the granted
  authorization) — resolved by the `35bdbaa` update above, done before
  `41b3b77`.
- Pushed and opened PR #13. CI-001 (Core Pull Request Checks) passed
  independently, confirming CI-002 does not interfere with it.
- First pilot run failed: `id-token: write` was initially omitted based
  on a docs-only reading that turned out to be incomplete. Root cause
  (from the failure's stack trace): the action's `setupGitHubToken` calls
  `getOidcToken` to exchange a GitHub Actions OIDC token for a Claude
  GitHub App installation token whenever no custom `github_token` is
  supplied — required regardless of using a static
  `claude_code_oauth_token`. Restored `id-token: write` and corrected the
  task file's rationale with this empirically verified cause; committed
  as `70fad5b`.
- Second pilot run: OIDC token obtained and exchanged successfully
  (confirms the fix and confirms the GitHub App is genuinely installed
  and functional). Execution then stopped at Anthropic's own workflow-
  validation guard, described above — expected for this introducing PR.

## Files changed (final diff vs `main`)

- `.github/workflows/claude-qa-review-pilot.yml` (new)
- `docs/tasks/ci-002-claude-review-pilot.md`
- `docs/handoffs/CURRENT.md` (this file)
- `PROJECT_CONTEXT.md`

Confirmed empty diffs vs `main` for `apps/**`, `packages/**`,
`package.json`, `package-lock.json`, `tsconfig.base.json`,
`.claude/agents/**`, and `.github/workflows/pr-checks.yml` (CI-001
untouched).

## Preserved invariants

- Server authority, wire format, gameplay, and balance unchanged.
- Runtime source, scripts, dependencies, lockfile, and assets unchanged.
- CI-001 (`.github/workflows/pr-checks.yml`) unchanged and still passing.
- Reviewer definitions unchanged.
- No secret value accessed, printed, or committed at any point.
- Local Claude settings remain private, ignored, and untracked.

## CI-003 / PR-007 status

- CI-003 (Routed Claude Reviews): not authorized, not implemented.
- PR-007 (Narrow Profile Message Consumer Imports): not authorized, not
  implemented.

## Reviewer routing and results

- Required `security-reviewer`: ran read-only against the drafted
  workflow; approved the technical security posture (trigger scope,
  permissions, secret handling, tool restrictions, CI-001 isolation) with
  one residual note (Bash argument-level injection surface is
  prefix/pattern-based, not a hard boundary — same-repo/owner-only
  trigger limits this to a self-inflicted risk, not an external-attacker
  vector) and one minor note (mutable action tags vs SHA pinning, matches
  CI-001's existing convention). Initially blocked on the CURRENT.md
  authorization-recording gap, resolved before the workflow commit.
- Required `qa-reviewer`: **not yet observable**. This is the automated
  pilot itself; it cannot post its comment until after merge, per the
  platform-level blocker above. Manual verification of output-section
  format and read-only behavior is deferred to the post-merge run.
- Recommended `architecture-reviewer`: not run this session (not
  requested by this implementation's instructions; may be requested
  before merge).
- Skipped: `network-reviewer`, `gameplay-reviewer`, `visual-design-lead`
  (no protocol, gameplay, or visual/asset change).

## Open blockers and decisions

- **Pilot cannot be fully verified pre-merge.** Anthropic's backend
  blocks the review step on any PR whose workflow file doesn't match
  `main` yet, by design. Options for the Product Architect: (a) merge
  PR #13 once satisfied with CI-001's pass and the security review, then
  push a trivial follow-up PR/commit to observe the QA comment appear for
  real; or (b) request further changes here first. This session is not
  authorized to merge.

## Next safe action

Product Architect reviews PR #13 (diff, CI-001 pass, security review
above) and decides whether to merge to unblock final pilot verification,
or requests changes first. Do not implement CI-003 or PR-007. Do not
implement further CI-002 changes without new authorization.

## Resume instructions

1. Read `PROJECT_CONTEXT.md`, `AGENTS.md`, and this handoff.
2. Read `docs/tasks/ci-002-claude-review-pilot.md`.
3. Verify branch `ci/claude-review-pilot`, `HEAD` at or after `70fad5b`,
   PR #13 open and unmerged, and a clean working tree.
4. If PR #13 has since merged, check whether a post-merge run posted the
   QA comment with all four required headings, and record that result
   here before considering CI-002 complete.
5. Do not implement CI-003 or PR-007 from this handoff alone.
