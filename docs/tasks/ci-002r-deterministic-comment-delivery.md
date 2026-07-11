# CI-002R — Deterministic Claude QA Comment Delivery

## Goal

Replace model-controlled PR comment publication in the CI-002 Claude QA
Review Pilot with deterministic, workflow-controlled publication, so that a
completed review run always results in exactly one top-level PR comment
(either a valid review or a sanitized failure notice) — never a silent
zero-comment "success."

## Starting state

- `main` merge commit: `4c3de975b464a0752e09720b40466b6b35b021ac` (PR #14).
- `.github/workflows/claude-qa-review-pilot.yml` unchanged since PR #13
  (blob `9888bd0d8e2374d7216edd50a268bb2f8b534e64`): `pull_request`-only,
  same-repository/owner/non-draft restricted, `contents: read` /
  `pull-requests: write` / `id-token: write`, authenticates with
  `CLAUDE_CODE_OAUTH_TOKEN`, invokes `qa-reviewer` with
  `--allowedTools "Read,Grep,Glob,Bash(gh pr view:*),Bash(gh pr
  diff:*),Bash(gh pr comment:*)"` and asks Claude to post its own comment via
  `gh pr comment ... --body "<review>"`.
- CI-001 (`.github/workflows/pr-checks.yml`) unchanged and independent.
- `.claude/agents/qa-reviewer.md` unchanged.

## Evidence from CI-002V

See `docs/reviews/ci-002r-comment-delivery-forensics.md` for full detail.
Summary: two runs on PR #14, byte-identical workflow/agent content and
identical `claude-code-action@v1` SHA / Claude Code CLI version, produced
different outcomes — Run `29151662011` completed with
`permission_denials_count: 4` and posted zero comments; run `29151923628`
completed with `permission_denials_count: 5` (more denials, not fewer) and
posted exactly one correctly structured comment. The discriminator is not
config, version, or auth — it is non-deterministic agent tool-call behavior
under a narrow Bash-command allowlist, with no action-level retry or
fallback for comment delivery.

## Confirmed problem

Comment delivery is currently 100% delegated to whether Claude's own
`Bash(gh pr comment:*)` tool call happens to execute correctly as part of
its free-form turn budget. No MCP comment server is registered for this
workflow (agent mode without an `mcp__github_comment__*` allowlist entry),
and the action's own success/failure signal
(`result.subtype === "success"`) is fully decoupled from whether that
specific side effect occurred. This is corroborated by upstream
[anthropics/claude-code-action#1384](https://github.com/anthropics/claude-code-action/issues/1384),
which reports the identical symptom shape (green run, nonzero
`permission_denials_count`, zero comments).

## Architectural decision

Per Product Architect authorization (Section 7 of the CI-002R brief):

- Claude inspects the PR and `qa-reviewer`-reviews it, then returns
  machine-validated structured JSON output only. Claude has no permission
  to post comments, edit files, commit, or push.
- A deterministic, workflow-owned step validates that structured output
  against a strict contract, renders exactly the four required Markdown
  headings, and posts exactly one top-level PR comment using a `GH_TOKEN`
  scoped only to that step.
- On missing, empty, malformed, or schema-invalid output, the same
  deterministic step posts one sanitized failure comment and fails the job
  — no code path silently produces zero comments on a still-current,
  non-superseded run.

This separates review reasoning (Claude), output validation (a Python
standard-library script embedded in the workflow), and the GitHub mutation
(a dedicated `gh pr comment --body-file` step), so no single LLM turn-budget
or tool-call choice can prevent the comment from being posted.

## Scope

- Modify only `.github/workflows/claude-qa-review-pilot.yml`.
- Add the documentation and review artifacts listed under Allowed files.
- No runtime, protocol, gameplay, dependency, or lockfile change.
- No change to `.claude/agents/qa-reviewer.md` or any other reviewer
  definition.
- No change to `.github/workflows/pr-checks.yml` (CI-001).

## Non-goals

This task does not:

- implement CI-003 (routed multi-reviewer automation);
- implement PR-007 (narrow profile message consumer imports);
- add sticky-comment replacement or deduplication across runs;
- add inline PR review comments;
- add progress-tracking comments;
- support fork PRs;
- change the existing same-repository/owner/non-draft job gating;
- change runtime code, dependencies, or package manifests;
- upgrade the Action version merely because newer code exists (see Action
  pinning decision in the architecture document);
- merge this pull request.

## Allowed files

- `.github/workflows/claude-qa-review-pilot.yml`
- `docs/tasks/ci-002r-deterministic-comment-delivery.md`
- `docs/reviews/ci-002r-comment-delivery-forensics.md`
- `docs/reviews/ci-002r-security-review.md`
- `docs/reviews/ci-002r-qa-review.md`
- `docs/reviews/ci-002r-architecture-review.md`
- `docs/architecture/claude-review-comment-delivery.md`
- `docs/handoffs/CURRENT.md`
- `PROJECT_CONTEXT.md`

## Forbidden files

- `.github/workflows/pr-checks.yml`
- `apps/**`
- `packages/**`
- `package.json`
- `package-lock.json`
- TypeScript configuration files
- assets
- `.claude/agents/**`
- environment files
- secrets
- deployment configuration
- CI-003 implementation
- PR-007 implementation

## Structured-output contract

Claude's review is captured via the Action's `--json-schema` /
`structured_output` mechanism (confirmed to exist at the exact resolved
`claude-code-action@v1` SHA both forensic runs used — see the architecture
document). The logical JSON contract:

```json
{
  "blockers": ["string"],
  "important_suggestions": ["string"],
  "minor_suggestions": ["string"],
  "approval_status": "string",
  "reviewed_commit": "string",
  "summary": "string"
}
```

Requirements, enforced in two layers (a coarse `--json-schema` gate at the
Action level, and a strict re-validation in the workflow's own renderer
script — the renderer is authoritative):

- all six fields required; `additionalProperties: false`;
- `blockers`, `important_suggestions`, `minor_suggestions`: arrays of
  strings only, empty arrays allowed, max 20 items, each item max 500
  characters, no embedded control characters (including newline/CR and the
  U+2028/U+2029 line/paragraph separators), no bidi
  override/embedding/isolate controls, no zero-width/invisible characters
  (including word joiner and soft hyphen), no BOM, no null byte;
- `approval_status`: string, max 100 characters, same character
  restrictions as above, plus must not contain `#` (prevents heading
  spoofing, since this field is rendered at the start of a Markdown line);
- `reviewed_commit`: string, must exactly match `^[0-9a-f]{40}$` and must
  equal the trusted PR head SHA (`github.event.pull_request.head.sha`) —
  binds the review to the exact commit reviewed and rejects stale output;
  validation fails closed (payload rejected) if the trusted head SHA is
  itself unavailable;
- `summary`: string, max 2000 characters, same character restrictions;
  validated for contract completeness but intentionally **not** rendered
  into the PR comment body (the comment renders exactly the four
  Section-13-required headings and nothing else — no fifth heading is
  invented to display it);
- total rendered comment body capped well under GitHub's 65536-character
  comment limit (60000 chars) as a final render-time check.

The full JSON Schema and validator source are embedded directly in the
workflow file (see Allowed files — no separate script file is introduced,
consistent with the forbidden-files list not including one).

## Comment-rendering contract

Renders exactly:

```
## Blockers

<items as a Markdown list, or "None.">

## Important suggestions

<items as a Markdown list, or "None.">

## Minor suggestions

<items as a Markdown list, or "None.">

## Approval status

<approval_status>
```

Followed by an optional footer built entirely from trusted GitHub Actions
context (reviewed commit SHA, workflow run URL) — never from Claude-
controlled fields. List items are always rendered with a `- ` prefix, which
is a deliberate security property: it prevents an item's text (even if it
contains `##`) from being interpreted as a new Markdown heading, since ATX
headings require `#` to be the first character of the line.

## Failure behavior

Any of: missing structured output, empty/whitespace-only output, malformed
JSON, a JSON Schema violation, or a validator rejection (see Structured-
output contract) triggers exactly one sanitized failure comment — never
zero comments and never the raw invalid payload:

```
## Blockers

Automated QA review output could not be validated.

## Important suggestions

Inspect the linked workflow run before merging this pull request.

## Minor suggestions

None.

## Approval status

Not approved — automation failure
```

Followed by the same trusted-context footer, plus a short sanitized failure
category string (validation error class only — never raw JSON, tool
output, exception internals, prompts, or PR-controlled text). After posting
this comment, the job fails (non-zero exit), so the failure is visible in
GitHub's check status, not just in the comment.

## Security requirements

- Claude's `--allowedTools` no longer includes `Bash(gh pr comment:*)` —
  Claude cannot post a comment even if prompted or confused into trying;
  the tool-permission engine denies it. This is the primary trust-boundary
  fix, not merely a prompt instruction.
- Claude retains no `Write`/`Edit`/`NotebookEdit` access (unchanged from the
  existing pilot).
- The `GH_TOKEN` used to post the comment is scoped to the publisher step
  only (`env:` on that step), never passed into the Claude step's
  environment beyond what the Action itself requires for its own OIDC
  exchange.
- Claude-produced text is never interpolated directly into a shell command
  or a GitHub Actions expression inside a `run:` block; it is passed via
  `env:` variables and written to files with `printf '%s'`, then parsed as
  data (`json.loads`) by an embedded Python script — never executed,
  evaluated, or shell-substituted.
- `reviewed_commit` binding plus a live re-check of the PR's current head
  SHA immediately before posting prevents a stale/superseded run from
  posting after a newer push, without introducing a second comment shape
  for that case (see Concurrency behavior).
- No `pull_request_target`, no fork support, no change to the existing
  same-repository/owner/non-draft job gate.

## Concurrency behavior

- `cancel-in-progress: true` on the existing PR-scoped concurrency group is
  retained as the primary defense — a superseded run is normally killed
  before it reaches the publish step at all.
- As a race-window backstop, the publish step re-fetches the PR's *live*
  head SHA, state, and draft status via `gh pr view` immediately before
  posting. If the live head SHA no longer matches
  `github.event.pull_request.head.sha`, or the PR is no longer open, or it
  has become a draft, the step exits `0` without posting anything (chosen
  policy: silent skip for superseded/closed/draft runs — this is
  intentionally a *different* code path from the "invalid output" failure
  path above, and is not itself a job failure, since a newer run is
  expected to have already handled or will handle the up-to-date state).

## Local test matrix

A temporary, untracked Python harness (not committed — no npm/Python
dependency is added; the actual renderer logic lives embedded in the
workflow YAML) exercises 47 cases: the 40 required cases (with case 24
"multiline Unicode" split into two sub-interpretations to resolve its
ambiguity, yielding 41), plus 6 cases added after reviewer feedback
(U+2028/U+2029 line separators, U+00AD soft hyphen, U+2060 word joiner,
fail-closed behavior when the expected head SHA is unavailable, and the
`main()` catch-all one-comment guarantee for unanticipated exceptions).
Coverage spans valid/empty/malformed/missing/wrong-typed/oversized
payloads, SHA mismatch, shell-metacharacter and GitHub-expression literal
text, Unicode (Cyrillic, emoji, bidi controls, zero-width characters, BOM),
null bytes, invalid UTF-8, HTML/Markdown content, heading-spoofing attempts,
duplicate JSON keys, and type confusion. All 47 cases pass against the
renderer logic extracted verbatim from the committed workflow file (see the
architecture document for the full results table).

## Remote validation limitation

This PR modifies the pilot workflow itself. GitHub's own workflow-validation
guard (observed directly in the PR #13 forensic history — runs
`29150963058` and `29151025479`) skips execution of a modified workflow
file on its own PR until that file matches `main`. Therefore this PR cannot
prove its own new behavior end-to-end before merge; local validation
(renderer test matrix, YAML/Python syntax checks, base project checks) is
the evidence available pre-merge. A separate CI-002RV follow-up task, opened
after this PR merges, must prove the new behavior on a normal subsequent
PR — exactly mirroring how CI-002V validated CI-002.

## Reviewer routing

Required:

- `security-reviewer` — verifies Claude cannot post comments or write
  files, token-scoping boundaries, absence of shell/expression injection,
  stale-run protection, and that the same-repository/owner/non-draft gate
  is unchanged.
- `qa-reviewer` — verifies the structured schema is strict, all four
  headings are deterministic and in order, valid output produces exactly
  one comment, invalid output produces exactly one sanitized failure
  comment and fails the job, and no path silently produces zero comments.

Recommended:

- `architecture-reviewer` — verifies review reasoning and GitHub mutation
  remain separated, CI-003 is not implemented, and no package/runtime
  boundary changes occurred.

Not applicable:

- `network-reviewer` — no protocol or network behavior change. Recorded
  explicitly as a deviation from the routing matrix's closest row
  ("Deployment/environment configuration", where Network defaults to
  Recommended): this reviewer's charter covers Colyseus protocol, message
  payloads, rooms/schemas, and client/server network consumers — none of
  which a GitHub Actions workflow change touches. Skipping is a
  Product-Architect-authorized scope decision, not an oversight.
- `gameplay-reviewer` — no gameplay or balance change.
- `visual-design-lead` — no visual or asset change.

## Acceptance criteria

- Claude's `allowedTools` no longer includes any comment-posting tool.
- Claude's `claude_args` includes a `--json-schema` matching the
  structured-output contract above.
- A deterministic workflow step (not Claude) is the only step that ever
  calls `gh pr comment`.
- Valid structured output produces exactly one comment with the four
  required headings in order.
- Missing/empty/malformed/schema-invalid output produces exactly one
  sanitized failure comment and fails the job — never zero comments on a
  non-superseded run.
- A stale/superseded/closed/draft run posts no comment and does not fail
  the job.
- No secret value is exposed in logs, comments, or workflow output.
- CI-001 remains independent and unmodified.
- Local renderer test matrix (47 cases) passes.
- `git diff --check`, YAML syntax, and `python -m py_compile` on the
  extracted renderer all pass.
- Base project checks (build, typecheck, protocol-profile, network
  callback, movement, combat) pass with no runtime diff.
- Scope-verification diffs against `apps/`, `packages/`, `package.json`,
  `package-lock.json`, `tsconfig.base.json`, `.claude/agents/`, and
  `.github/workflows/pr-checks.yml` are all empty.
- Security and QA reviews approve; Architecture review finds no CI-003
  scope leakage.
- This PR remains open, unmerged, pending human review.

## Rollback

Revert `.github/workflows/claude-qa-review-pilot.yml` to the version merged
in PR #13 (model-driven comment posting). No runtime, schema, protocol,
data, or dependency rollback is required. The documentation files added by
this task may remain as a historical record even if the workflow change is
reverted.

## Follow-up verification

CI-002RV — Verify Deterministic Claude QA Comment Delivery (documentation-
only follow-up task, opened after this PR merges, proving the new behavior
on a normal subsequent PR — see the architecture document's "Post-merge
verification requirement" section for the exact criteria). CI-003 remains
blocked until CI-002RV passes.
