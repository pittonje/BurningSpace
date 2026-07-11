# BurningSpace Current Handoff

Last updated: 2026-07-11
Updated by: Claude (CI-002V verification complete — partially verified)

## Repository state

- Base branch: `main`
- Active branch: `ci/verify-claude-qa-pilot`
- Upstream: `origin/ci/verify-claude-qa-pilot`
- HEAD: `fdb5bfd93d8e0f17b3e93c7fbb034bc16833d776` (before this handoff
  commit; this file's update will be committed on top)
- Working tree: Clean
- Pull request: [#14 — CI-002V — Verify Claude QA Pilot](https://github.com/pittonje/BurningSpace/pull/14)
- Pull request state: Open, **not merged**

## Current task

- Task ID: `CI-002V`
- Task title: Post-Merge Claude QA Pilot Verification
- Task file: `docs/tasks/ci-002v-post-merge-pilot-verification.md`
- Verification report: `docs/reviews/ci-002v-pilot-verification.md`
- Status: **Partially verified.** See full detail in the verification
  report.

## CI-001 / CI-002 workflow status

- CI-001 (`.github/workflows/pr-checks.yml`): unchanged, active on
  `main`, passing independently (run `29151662021` on PR #14, success).
- CI-002 (`.github/workflows/claude-qa-review-pilot.yml`): unchanged,
  active on `main` since PR #13 merged as `558ce34`. Not modified by
  CI-002V.
- Runtime changes: none.
- Dependency changes: none.

## Verification result summary

Confirmed working, post-merge, on a normal subsequent PR (#14):

- Core Pull Request Checks (CI-001) passes independently.
- Claude QA Review Pilot executes fully — **not** merge-gated (the
  pre-merge "workflow file must match default branch" block observed on
  PR #13 is resolved now that the workflow exists on `main`).
- OAuth authentication (`CLAUDE_CODE_OAUTH_TOKEN`) succeeds.
- GitHub App OIDC token exchange succeeds ("App token successfully
  obtained", "Using GITHUB_TOKEN from OIDC").
- `qa-reviewer` is genuinely invoked (`--agent qa-reviewer`, 18 turns,
  ~97s, `total_cost_usd: 0.426`).
- Read-only boundary held: zero files/commits/branches changed by the
  automated reviewer; fail-closed regardless of the exact cause below.
- No secret value exposed anywhere in logs (verified by direct scan).

**Not achieved:**

- Zero PR comments were posted anywhere (confirmed via
  `gh api .../pulls/14/reviews`, `.../pulls/14/comments`,
  `.../issues/14/comments` — all empty), despite the job completing
  (`"is_error": false`, `"permission_denials_count": 4`). The required
  "exactly one top-level QA comment with four headings" acceptance
  criterion is unmet.
- Root cause not confirmed: the default Actions log doesn't expose
  per-tool-call permission-denial detail. `architecture-reviewer`
  surfaced a plausible lead — the workflow's `prompt:` text wraps the
  `gh pr comment ... --body "<review>"` example across a line break
  inside one backtick span, which could cause a constructed command that
  doesn't literally prefix-match the `Bash(gh pr comment:*)` allowlist.
  Unconfirmed; investigating further requires `show_full_output: true`,
  which is a pilot-workflow change out of scope for CI-002V.

## Files changed (PR #14, final)

- `docs/tasks/ci-002v-post-merge-pilot-verification.md` (new)
- `docs/reviews/ci-002v-pilot-verification.md` (new)
- `docs/handoffs/CURRENT.md` (this file)
- `PROJECT_CONTEXT.md` (CI-002 recorded as partially verified, not
  complete)

Confirmed empty diffs vs `main` for `.github/workflows/**`, `apps/**`,
`packages/**`, `package.json`, `package-lock.json`, `tsconfig.base.json`,
and `.claude/agents/**`.

## Preserved invariants

- Server authority, wire format, gameplay, and balance unchanged.
- Runtime source, scripts, dependencies, lockfile, and assets unchanged.
- CI-001 and CI-002 workflow files unchanged.
- Reviewer definitions unchanged.
- No secret value accessed, printed, or committed.
- Local Claude settings remain private, ignored, and untracked.

## CI-003 / PR-007 status

- CI-003 (Routed Claude Reviews): **not authorized**. Recommended by both
  manual reviews to remain blocked until a dedicated CI-002 follow-up
  fixes the comment-posting gap — layering routed multi-reviewer
  automation on an unreliable comment-posting path would multiply the
  same failure.
- PR-007 (Narrow Profile Message Consumer Imports): not authorized.

## Reviewer routing and results

- Required automated `qa-reviewer` (via the CI-002 workflow itself): ran
  to completion but did not post its comment — see above.
- Required `security-reviewer` (manual, read-only): **Approved**. No
  blockers. Confirmed `pull_request`-only, same-repo/owner/non-draft gate
  held, minimal permissions, `id-token` used only for the documented
  OIDC exchange, no secret exposure, no unauthorized write. Flagged the
  comment-posting gap as a functional issue, not a security failure
  (fail-closed).
- Recommended `architecture-reviewer` (manual, read-only): **Approved**
  for PR #14's own scope (documentation-only, no workflow/runtime change,
  no CI-003 leakage). **Not** approved as evidence CI-002 is ready to
  unblock CI-003 — recommends a dedicated follow-up first.
- Skipped: `network-reviewer`, `gameplay-reviewer`, `visual-design-lead`
  (no protocol, gameplay, or visual/asset change).

## Open blockers and decisions

- **CI-002's comment-posting step needs a dedicated, narrowly scoped
  follow-up task** (diagnosis + fix, with its own reviewer routing)
  before CI-003 can be authorized. This session did not attempt a fix,
  since modifying the pilot workflow was explicitly out of scope for
  CI-002V.

## Next safe action

Product Architect reviews PR #14 and `docs/reviews/ci-002v-pilot-verification.md`,
then authorizes a scoped CI-002 follow-up task to diagnose and fix the
comment-posting gap (likely starting with enabling `show_full_output:
true` for one debug run to see the exact denied tool call). Do not
implement CI-003 or PR-007 until that follow-up succeeds. Do not merge
PR #14 without the Product Architect's decision on the partial result.

## Resume instructions

1. Read `PROJECT_CONTEXT.md`, `AGENTS.md`, and this handoff.
2. Read `docs/tasks/ci-002v-post-merge-pilot-verification.md` and
   `docs/reviews/ci-002v-pilot-verification.md`.
3. Verify branch `ci/verify-claude-qa-pilot`, PR #14 open and unmerged,
   and a clean working tree.
4. Do not implement CI-003 or PR-007 from this handoff alone.
5. Any CI-002 comment-posting fix requires its own scoped task file and
   security review before modifying `.github/workflows/claude-qa-review-pilot.yml`.
