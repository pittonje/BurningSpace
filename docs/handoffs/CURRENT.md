# BurningSpace Current Handoff

Last updated: 2026-07-11
Updated by: Claude (CI-002R implementation complete, pre-commit)

## Repository state

- Base branch: `main` (at `4c3de975b464a0752e09720b40466b6b35b021ac`, the
  PR #14 merge commit)
- Active branch: `ci/deterministic-qa-comment-delivery`
- Upstream: not yet pushed at the time this handoff was written; see the
  pull-request section below for the state after push
- Stable task checkpoint: `4c3de97` (branch point); the CI-002R commits are
  this checkpoint's documented children with subjects listed under
  "Commit plan" below
- Working tree at handoff-write time: CI-002R changes staged/committed per
  the commit plan
- Pull request: to be opened as "CI-002R — Deterministic Claude QA Comment
  Delivery" (base `main`, head `ci/deterministic-qa-comment-delivery`);
  the number is recorded in the PR itself and the final session report

## Current task

- Task ID: `CI-002R`
- Task title: Deterministic Claude QA Comment Delivery
- Task file: `docs/tasks/ci-002r-deterministic-comment-delivery.md`
- Forensic report: `docs/reviews/ci-002r-comment-delivery-forensics.md`
- Architecture: `docs/architecture/claude-review-comment-delivery.md`
- Status: implementation and local validation complete; all three manual
  reviews approved (no blockers); accepted review corrections applied and
  re-validated.

## Forensic conclusion (summary)

CI-002V's intermittent comment delivery is attributed primarily to
non-deterministic agent tool-call behavior under a narrow Bash allowlist
(`Bash(gh pr comment:*)`), amplified by `claude-code-action`'s decoupling
of job success from the comment side effect, with no retry/fallback. Both
observed runs used identical action SHA/CLI version/config; the run with
*more* permission denials is the one that succeeded — ruling out config
drift, auth failure, transient API failure, and MCP startup failure.
Corroborated upstream by anthropics/claude-code-action#1384. Full detail
and confidence labels in the forensic report.

## Workflow change summary

`.github/workflows/claude-qa-review-pilot.yml` (only workflow changed):

- Claude step (`id: claude_review`): tools reduced to
  `Read,Grep,Glob,Bash(gh pr view:*),Bash(gh pr diff:*)` — comment posting
  removed; `--json-schema` added (six-field strict contract); actions
  pinned to exact SHAs (`claude-code-action` @ `e90deca4…` = v1.0.171,
  `checkout` @ `df4cb1c0…` = v6.0.3).
- New deterministic render step (`id: render_review`, `if: always()`):
  embedded stdlib-Python validator/renderer; strict second-layer
  validation (types, limits, control/bidi/invisible characters, duplicate
  keys, UTF-8, fail-closed `reviewed_commit` = trusted head SHA binding);
  renders the four required headings; catch-all guarantees a sanitized
  failure comment for any unanticipated defect.
- New deterministic publish step (`if: always()`): live
  headRefOid/state/isDraft re-check (silent skip when superseded, closed,
  or drafted), `gh pr comment --body-file` with step-scoped
  `GH_TOKEN: ${{ github.token }}`, job fails after posting the failure
  comment when validation failed.

## Local validation results

- Renderer test matrix: 47/47 pass (40 required cases + case-24 split +
  6 reviewer-feedback cases), run against the Python extracted verbatim
  from the committed workflow file.
- `python -m py_compile`: pass. `bash -n` on both extracted shell steps:
  pass. YAML parse (PyYAML, local-only install): pass. `git diff --check`:
  clean. GitHub `${{ }}` expressions: 16/16 balanced, all from trusted
  context.
- Base checks: build, typecheck, protocol-profile, network callback,
  movement, combat — all pass; only the known pre-existing Vite chunk-size
  warning (unchanged, informational).

## Reviewer routing and results

- `security-reviewer` (required, manual, read-only): **Approved with
  suggestions**, no blockers — `docs/reviews/ci-002r-security-review.md`.
- `qa-reviewer` (required, manual, read-only): **Approved**, no blockers —
  `docs/reviews/ci-002r-qa-review.md`. (The automated qa-reviewer runs via
  the workflow itself, which cannot execute its modified form pre-merge.)
- `architecture-reviewer` (recommended, manual, read-only): **Approved
  with suggestions**, no blockers —
  `docs/reviews/ci-002r-architecture-review.md`.
- Skipped: `network-reviewer` (deviation from matrix default recorded in
  the task file), `gameplay-reviewer`, `visual-design-lead`.
- All accepted corrections applied and re-validated (catch-all exception
  guarantee, fail-closed SHA binding, extended invisible-character
  denylist as `\u` escapes, doc reconciliations); matrix re-run at 47/47.

## Exact changed files

- `.github/workflows/claude-qa-review-pilot.yml` (modified)
- `docs/tasks/ci-002r-deterministic-comment-delivery.md` (new)
- `docs/reviews/ci-002r-comment-delivery-forensics.md` (new)
- `docs/reviews/ci-002r-security-review.md` (new)
- `docs/reviews/ci-002r-qa-review.md` (new)
- `docs/reviews/ci-002r-architecture-review.md` (new)
- `docs/architecture/claude-review-comment-delivery.md` (new)
- `docs/handoffs/CURRENT.md` (this file)
- `PROJECT_CONTEXT.md` (CI-002R recorded; recommended order updated)

Confirmed empty diffs vs `main` for `apps/**`, `packages/**`,
`package.json`, `package-lock.json`, `tsconfig.base.json`,
`.claude/agents/**`, and `.github/workflows/pr-checks.yml`.

## Commit plan

1. `docs: record Claude comment delivery forensics`
2. `ci: make Claude QA comment delivery deterministic`
3. `docs: document deterministic review delivery`
4. `docs: finalize CI-002R reviews and handoff`

## Preserved invariants

- Server authority, wire format, gameplay, and balance unchanged.
- Runtime source, scripts, dependencies, lockfile, and assets unchanged.
- CI-001 workflow and reviewer definitions unchanged.
- `pull_request`-only; same-repo/owner/non-draft gate unchanged; minimal
  permissions unchanged; no fork support; no `pull_request_target`.
- No secret value accessed, printed, or committed.
- Local Claude settings remain private, ignored, and untracked.

## Post-merge limitation

The Claude step cannot execute its new configuration on this PR
(Anthropic's action skips itself when the workflow file differs from the
default branch — observed live in run `29154108613` on PR #15, matching
the PR #13 history). However, that same run **did** exercise the
deterministic failure path end-to-end on a real runner: the Claude-step
skip produced empty structured output, the render step wrote the sanitized
failure comment, the publisher posted exactly one comment
(`issuecomment-4946158186`, all four headings, trusted footer, posted by
`github-actions[bot]`), and the job failed loudly. The run also exposed
one real defect — GitHub's default `bash -e` shell aborted the render step
before `exit_code` was recorded; the fail-safe `${RENDER_EXIT_CODE:-1}`
default held the contract. Fixed with an explicit `set +e` (commit
"ci: record render exit code under GitHub's default errexit shell").
What still cannot be proven pre-merge: the happy path (valid structured
output → validated review comment), which is CI-002RV's job.

## Open blockers and decisions

- None for CI-002R itself.
- Candidate follow-up (out of scope, from security review): consider a
  `.gitattributes` entry pinning LF for `.github/workflows/*.yml` (the
  committed blob is LF-only today; risk is theoretical on Windows
  checkouts with `core.autocrlf=true`).
- CI-003 remains blocked until CI-002RV passes. PR-007 not authorized.

## Next safe action

Before PR creation: open the CI-002R pull request and inspect merge-gated
CI behavior (CI-001 must pass; the modified pilot must not execute with
untrusted privileges).

After PR creation: human review and merge of CI-002R, followed by CI-002RV
post-merge reliability verification (documentation-only PR proving: valid
structured output → exactly one four-heading comment; invalid output → one
sanitized failure comment + failed job; no zero-comment success path; no
duplicate comments; stale runs do not comment; secrets masked; CI-001
independent; CI-003 blocked until CI-002RV passes).

## Resume instructions

1. Read `PROJECT_CONTEXT.md`, `AGENTS.md`, and this handoff.
2. Read `docs/tasks/ci-002r-deterministic-comment-delivery.md`, the
   forensic report, and the architecture document.
3. Verify branch `ci/deterministic-qa-comment-delivery`, the commit chain
   from checkpoint `4c3de97` per the commit plan, a clean working tree,
   and the PR state.
4. Do not merge the CI-002R PR without human review.
5. Do not implement CI-003 or PR-007 from this handoff alone; CI-002RV
   requires its own scoped task file after CI-002R merges.
