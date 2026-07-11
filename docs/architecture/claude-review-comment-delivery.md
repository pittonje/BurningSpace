# Claude Review Comment Delivery

## Problem

The CI-002 Claude QA Review Pilot asked Claude to review a pull request and
then post its own review as a PR comment via a `Bash(gh pr comment:*)` tool
call. Post-merge verification (CI-002V) proved authentication, GitHub App
OIDC exchange, and `qa-reviewer` invocation all work reliably, but comment
delivery did not: one run completed successfully and posted zero comments;
a later run, under byte-identical workflow/agent configuration, completed
successfully and posted exactly one correctly structured comment. See
`docs/reviews/ci-002r-comment-delivery-forensics.md` for the full forensic
comparison.

## Evidence

- Both runs resolved `anthropics/claude-code-action@v1` to the identical
  commit `e90deca47693f9457b72f2b53c17d7c445a87342` and used the identical
  Claude Code CLI version `2.1.207` — ruling out version drift.
- Both runs used the identical workflow YAML and `qa-reviewer` agent
  definition — ruling out config drift.
- `permission_denials_count` was 4 in the failing run and 5 in the
  succeeding run — ruling out "permission denials blocked the comment" as
  the primary explanation, since the run with *more* denials succeeded.
- No MCP server for comment posting is registered for this workflow (agent
  mode without an `mcp__github_comment__*` allowlist entry); comment
  delivery depended entirely on Claude's own `Bash(gh pr comment:*)` tool
  call in both runs, with no action-level retry or fallback.
- The action's job-success signal (`result.subtype === "success"`) is fully
  decoupled from whether the intended GitHub side effect occurred.
- This near-exact symptom (green run, nonzero `permission_denials_count`,
  zero comments) is independently reported upstream in
  [anthropics/claude-code-action#1384](https://github.com/anthropics/claude-code-action/issues/1384).

## Previous architecture

```
Claude (agent mode)
  --allowedTools "Read,Grep,Glob,Bash(gh pr view:*),Bash(gh pr diff:*),Bash(gh pr comment:*)"
  → reasons about the PR
  → (maybe) calls `gh pr comment <n> --body "<review>"` as its own Bash tool call
  → job reports success regardless of whether that call happened
```

Comment delivery was an emergent side effect of free-form LLM tool use, not
a guaranteed, testable workflow step.

## Selected architecture

```
1. GitHub `pull_request` event (opened/synchronize/reopened/ready_for_review)
2. Trusted workflow: same-repo + owner + non-draft job gate (unchanged)
3. actions/checkout (pinned SHA)
4. Claude authentication (CLAUDE_CODE_OAUTH_TOKEN + OIDC → GitHub App token, unchanged)
5. qa-reviewer runs with Read/Grep/Glob/Bash(gh pr view:*)/Bash(gh pr diff:*) only
   — no comment-posting tool, no write tools
6. Claude returns structured JSON via --json-schema → structured_output step output
7. Deterministic "Validate and render QA review" step: strict re-validation
   (types, limits, character safety, reviewed_commit binding) + Markdown rendering
   — embedded Python, standard library only, never executes reviewer content
8. Deterministic "Publish QA review comment" step: live stale/closed/draft
   re-check, then `gh pr comment --body-file` with a step-scoped GH_TOKEN
9. Invalid/missing output → one sanitized failure comment, job fails
10. Valid output → one comment with the four required headings, job succeeds
```

Claude owns review reasoning only. The workflow owns validation and every
GitHub mutation. No single LLM turn-budget or tool-call choice can prevent
the comment from being posted, because posting no longer depends on Claude
choosing to make a specific tool call at all.

## Trust boundaries

- **Claude's execution context**: can read repository files and call
  `gh pr view` / `gh pr diff` (read-only, already proven reliable in both
  forensic runs). Cannot call `gh pr comment` — removed from
  `--allowedTools` entirely, so the Claude Code CLI's own permission engine
  denies it even if attempted (prompt-injection defense-in-depth, not just
  an instruction). Cannot `Write`/`Edit`/`NotebookEdit`, commit, or push
  (unchanged from the prior pilot).
- **Known limitation, inherited from the action's own design (not
  introduced by this task)**: `anthropics/claude-code-action` performs its
  own OIDC→GitHub-App token exchange and injects that token as
  `GITHUB_TOKEN`/`GH_TOKEN` into the Claude step's process environment
  regardless of any workflow-level `env:` setting, because `id-token:
  write` is required for the action's own (non-custom-app) authentication
  path — this was already established as necessary in CI-002's task file.
  This means a write-scoped token is technically present in Claude's
  execution environment; the control that actually holds is the CLI's tool
  allowlist, not token absence. This task narrows that allowlist to remove
  the one tool (`gh pr comment`) capable of a public-facing mutation.
- **Deterministic publisher step**: the only step with the workflow's own
  `GH_TOKEN: ${{ github.token }}`, scoped via `env:` to that step alone.
  This is a plain repository-scoped Actions token (`pull-requests: write`
  from the workflow's own `permissions:` block), separate from the action's
  internal GitHub App token.

## Structured output

`anthropics/claude-code-action@v1` (at the pinned SHA) supports a
`--json-schema '<json-schema>'` input inside `claude_args`, producing a
validated `structured_output` step output (confirmed against the action's
source and its official `examples/test-failure-analysis.yml`). The schema
enforced at this layer:

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["blockers", "important_suggestions", "minor_suggestions", "approval_status", "reviewed_commit", "summary"],
  "properties": {
    "blockers": {"type": "array", "maxItems": 20, "items": {"type": "string", "maxLength": 500}},
    "important_suggestions": {"type": "array", "maxItems": 20, "items": {"type": "string", "maxLength": 500}},
    "minor_suggestions": {"type": "array", "maxItems": 20, "items": {"type": "string", "maxLength": 500}},
    "approval_status": {"type": "string", "maxLength": 100},
    "reviewed_commit": {"type": "string", "pattern": "^[0-9a-f]{40}$"},
    "summary": {"type": "string", "maxLength": 2000}
  }
}
```

If Claude's output violates this schema, the action's own source
(`base-action/src/run-claude-sdk.ts`) force-fails the step
(`core.setFailed`) rather than silently succeeding — this alone converts
today's silent "success, zero comments" failure mode into a loud, detectable
one, before the workflow's own validation even runs.

## Validation

The `--json-schema` gate is a coarse, upstream-enforced layer. The
workflow's own embedded Python script (standard library only —
`json`, `re`, `os`, `sys`; no dependency added) is the **authoritative**,
second-layer validator, since JSON Schema alone cannot express every
security property needed here:

- JSON syntax, required fields, `additionalProperties: false`, array/string
  types (re-checked independently of the upstream schema).
- Array item and array-length limits (20 items, 500 chars/item).
- `approval_status` (≤100 chars), `summary` (≤2000 chars, validated but
  intentionally not rendered into the comment — see Comment publisher).
- No disallowed control characters (C0 range + DEL, plus the U+2028 line
  separator and U+2029 paragraph separator) in any field — catches null
  bytes, raw newlines/CR, and every Unicode line-break class (every field
  is single-line by design).
- No bidi override/embedding/isolate Unicode controls (Trojan-Source class)
  and no zero-width/invisible characters, BOM, word joiner (U+2060), or
  soft hyphen (U+00AD). The denylists are written in the source as `\u`
  escape sequences, not literal characters, so they are visible to a human
  reader and cannot be silently corrupted by editors or linters.
- Strict UTF-8 decoding (invalid UTF-8 is rejected, never silently
  replaced).
- No duplicate JSON object keys (rejected via a custom
  `object_pairs_hook`, since Python's default `json.loads` silently keeps
  the last value).
- `reviewed_commit` must be exactly 40 lowercase hex characters **and**
  must equal the trusted PR head SHA passed via `env:` from
  `github.event.pull_request.head.sha` — binds the review to the exact
  commit reviewed and rejects stale Claude output. The check fails closed:
  if the trusted head SHA is itself unavailable, the payload is rejected
  rather than the binding being skipped.
- One-comment guarantee at the code level: `main()` wraps the entire
  validate-and-render path so that an anticipated `ValidationError`
  produces the sanitized failure comment, and any *unanticipated* exception
  also produces the sanitized failure comment (surfacing only the
  exception's type name, never its message, which could embed
  reviewer-controlled text). No exception class can leave the comment file
  unwritten.
- `approval_status` must not contain `#` — this field is rendered at the
  start of a Markdown line, so an unescaped `#` could visually spoof an
  extra heading; array items are always rendered with a `- ` prefix, which
  structurally prevents the same spoofing for `blockers` /
  `important_suggestions` / `minor_suggestions` content (ATX headings
  require `#` to be the first character of the line, and a list-item
  prefix guarantees it never is).
- Final rendered comment capped at 60000 characters (GitHub's hard limit is
  65536), computed after all substitutions.

### Local test matrix (47 cases)

Reproduced and run against the **exact bytes embedded in the committed
workflow file** (extracted via a small script, not a hand-copied
approximation), using a temporary, untracked harness — no npm or Python
dependency was added to the repository.

| Case | Description | Result |
|---|---|---|
| 1 | valid, all arrays populated | Accepted |
| 2 | valid, empty arrays | Accepted |
| 3 | empty structured output | Rejected |
| 4 | whitespace-only output | Rejected |
| 5 | malformed JSON | Rejected |
| 6 | missing `blockers` field | Rejected |
| 7 | wrong `blockers` type (string not array) | Rejected |
| 8 | null field (`blockers=null`) | Rejected |
| 9 | additional unexpected property | Rejected |
| 10 | too many blocker entries (21) | Rejected |
| 11 | oversized entry (501 chars) | Rejected |
| 12 | oversized total comment (20×500×3 fields, still under the 60000 cap) | Accepted (verifies render-length headroom) |
| 13 | `reviewed_commit` mismatch vs. expected head SHA | Rejected |
| 14 | embedded double quotes | Accepted (literal text) |
| 15 | embedded apostrophes | Accepted (literal text) |
| 16 | embedded backticks | Accepted (literal text) |
| 17 | triple Markdown fences | Accepted (literal text) |
| 18 | `$(command)` as literal text | Accepted (never executed) |
| 19 | `${{ github.token }}` as literal text | Accepted (never re-evaluated) |
| 20 | `$(command)` in `summary` | Accepted (never executed) |
| 21 | semicolons | Accepted (literal text) |
| 22 | ampersands | Accepted (literal text) |
| 23 | redirection characters | Accepted (literal text) |
| 24a | "multiline Unicode" interpreted as an embedded `\n` | Rejected |
| 24b | "multiline Unicode" interpreted as long single-line Unicode | Accepted |
| 25 | Cyrillic text | Accepted |
| 26 | emoji | Accepted |
| 27 | bidi override control character | Rejected |
| 28 | zero-width characters | Rejected |
| 29 | embedded BOM | Rejected |
| 30 | null byte | Rejected |
| 31 | invalid UTF-8 bytes | Rejected |
| 32 | HTML tags as literal text | Accepted (never rendered as HTML by this pipeline) |
| 33 | Markdown links | Accepted (literal text, nothing auto-fetches) |
| 34 | very long URL (over 500 chars) | Rejected |
| 35 | newline injection in `approval_status` | Rejected |
| 36 | CRLF in item text | Rejected |
| 37 | `approval_status` containing `#` | Rejected |
| 38 | blocker item containing `## Heading` | Accepted (rendered as `- ## Heading`, list-item prefix prevents ATX interpretation) |
| 39 | duplicate JSON keys | Rejected |
| 40 | actual number where a string was expected | Rejected |
| 41 | U+2028 line separator in an item | Rejected |
| 42 | U+2029 paragraph separator in an item | Rejected |
| 43a | U+00AD soft hyphen in an item | Rejected |
| 43b | U+2060 word joiner in an item | Rejected |
| 44 | empty expected head SHA (fail-closed check) | Rejected |
| 45 | synthetic unanticipated exception inside rendering | Sanitized failure comment written, exit 1, exception message not leaked |

**47/47 cases produced the expected outcome.** Case 24 was deliberately
split into two sub-interpretations because "multiline Unicode" is ambiguous
in the original brief; both readings are covered. Cases 41–45 were added in
response to reviewer feedback (see the CI-002R review artifacts under
`docs/reviews/`).

The case-38 property is the load-bearing structural mitigation for
heading-spoofing via array items: the renderer *always* emits array items
with a `- ` prefix, by construction, not as a best-effort filter.

One boundary is intentionally documented rather than tested: the
`MAX_TOTAL_LEN` (60000) overflow branch in `render_success` is provably
unreachable under the current schema limits — the worst-case rendered body
at maximum field sizes (20 items × 500 chars × 3 arrays, plus the 100-char
approval status and footer) is roughly 30500 characters, about half the
cap. The branch exists as defense-in-depth for future limit increases; if
`MAX_ITEMS`/`MAX_ITEM_LEN` are ever raised, the `main()` catch-all
guarantees an overflow still produces the sanitized failure comment rather
than a zero-comment run.

## Comment publisher

A separate `gh pr comment` step (not Claude) is the only code path in this
workflow capable of posting a PR comment:

- Trusted `PR_NUMBER` (`github.event.pull_request.number`) and `REPO`
  (`github.repository`) — both simple GitHub-controlled values, not
  PR-content-derived strings.
- `GH_TOKEN: ${{ github.token }}` scoped via `env:` to this step only.
- The rendered Markdown is passed via `--body-file`, reading a file the
  validation step already wrote — never inlined into the shell command
  line and never inlined into a `${{ }}`-interpolated `run:` script
  fragment (both of which are documented GitHub Actions script-injection
  vectors when the interpolated value is untrusted).
- Before posting, the step re-fetches the PR's *live* `headRefOid`,
  `state`, and `isDraft` via `gh pr view` and compares against the SHA this
  run was triggered for. On any mismatch (stale head, closed, or converted
  to draft), the step exits `0` without posting — this is a deliberate,
  single, documented policy (silent skip), distinct from the "invalid
  output" failure path.
- Exactly one comment is posted per non-superseded run — either the
  validated review or the sanitized failure notice, never both, never
  neither.

## Failure behavior

Missing, empty, malformed, or schema/validator-rejected structured output
produces exactly one sanitized failure comment (never the raw payload,
never zero comments on a non-superseded run):

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

...followed by a trusted-context footer (reviewed commit, workflow run URL)
and a short, character-filtered failure category (validation error class
only — field names, lengths, Unicode codepoints; never raw reviewer-
controlled text, since none of the validator's error messages embed field
content). After posting, the job fails (non-zero exit), so the failure is
visible in the PR's check status, not only in the comment body.

## Concurrency

`cancel-in-progress: true` on the existing `claude-qa-pilot-<PR number>`
concurrency group is retained as the primary defense — a superseded run is
normally killed before it reaches the publish step. The live stale-check in
the publisher step (above) is a race-window backstop for the residual case
where cancellation doesn't land before the publish step runs.

## Secret handling

- `CLAUDE_CODE_OAUTH_TOKEN` usage is unchanged from the existing pilot.
- The workflow's own `GH_TOKEN` is now scoped via `env:` to the publisher
  step only, rather than also being set at the Claude step level (which was
  redundant regardless, since the action overrides `GITHUB_TOKEN`/`GH_TOKEN`
  with its own OIDC-exchanged token before spawning the CLI).
- No secret value is echoed, logged, or included in any comment.
- Claude-produced text never reaches a shell command line or a `${{ }}`
  interpolation site; it is only ever read as data (`json.loads`) by the
  embedded Python validator.

## Tool restrictions

`--allowedTools "Read,Grep,Glob,Bash(gh pr view:*),Bash(gh pr diff:*)"` /
`--disallowedTools "Write,Edit,NotebookEdit"`. `Bash(gh pr comment:*)` is
removed entirely (the one change from the prior pilot's tool
configuration) — this is the primary trust-boundary fix: Claude cannot
post a comment even if a prompt-injection payload in PR-controlled content
tried to make it, because the Claude Code CLI's own permission engine
denies the tool call before it can execute.

## Action pinning

Both forensic runs (the failing and the succeeding one) executed
`anthropics/claude-code-action@v1` at the identical, already-validated
commit `e90deca47693f9457b72f2b53c17d7c445a87342` (tagged `v1.0.171`,
committed 2026-07-11T00:52:42Z). Per the stated security preference
(immutable commit SHA, with an adjacent comment naming the release), this
task pins to that exact, evidence-validated SHA rather than the floating
`@v1` tag, which was observed to move roughly daily across recent releases
and would otherwise silently change this workflow's behavior on a future
run with no corresponding change in this repository.

`actions/checkout@v6` is similarly pinned to its resolved commit
`df4cb1c069e1874edd31b4311f1884172cec0e10` (tagged `v6.0.3`, committed
2026-06-02T14:31:30Z) for the same reason. Neither action is upgraded
beyond what was already in use — pinning only fixes the version already
running, it does not introduce a version bump.

## Known limitations

- Same-repository, owner-created PRs only — no fork support (unchanged, by
  design).
- One comment per workflow run, no sticky-comment deduplication across
  repeated pushes (unchanged from CI-002; deferred to a future task, not
  CI-003 and not this task).
- The `summary` field is part of the structured contract and is validated,
  but is intentionally not rendered into the PR comment — the comment
  renders exactly the four headings required by the task brief, with no
  fifth section invented to surface it.
- This PR modifies the pilot workflow itself, so GitHub's own
  workflow-validation guard prevents it from proving its new behavior
  end-to-end before merge (see Post-merge verification requirement below).
- Claude's execution environment still technically holds a write-scoped
  GitHub App token (inherent to the action's own OIDC-based auth path, not
  something this task can change); the control that holds is the narrowed
  tool allowlist, not token absence — documented above under Trust
  boundaries.

## Post-merge verification requirement

This PR's workflow change cannot be exercised on itself: GitHub blocks a
pull request's own modified workflow file from running with its new
content until that content exists on the default branch (observed directly
in the PR #13 forensic history — see
`docs/reviews/ci-002r-comment-delivery-forensics.md`). A dedicated
follow-up, **CI-002RV — Verify Deterministic Claude QA Comment Delivery**,
must be opened after this PR merges to prove, on a normal subsequent PR:
valid structured output produces exactly one comment with all four
headings in order; invalid output produces exactly one sanitized failure
comment and fails the job; Claude has no comment-posting capability; no
zero-comment silent-success path exists; and no duplicate comment is
produced per run. CI-003 remains blocked until CI-002RV passes.
