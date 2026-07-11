# CI-002R — Claude QA Comment Delivery Forensics

## Reviewed state

- `main` merge commit containing CI-002V: `4c3de975b464a0752e09720b40466b6b35b021ac`
  (PR #14, merged `2026-07-11T12:17:13Z`).
- CI-002R branch: `ci/deterministic-qa-comment-delivery`, created from synced
  `main` after the hard precondition in the task brief was verified
  (PR #14 merged, `main` matched `origin/main`, working tree clean).
- `.github/workflows/claude-qa-review-pilot.yml` blob at reviewed commit:
  `9888bd0d8e2374d7216edd50a268bb2f8b534e64`.
- `.github/workflows/pr-checks.yml` blob at reviewed commit:
  `ff7394f2e47291b78bf94e5e26bf3b5cafac32d3` (unchanged by this task).
- `.claude/agents/qa-reviewer.md` blob at reviewed commit:
  `2bc987952ccb5c099924cb890fd59cb87d88f925` (unchanged by this task).

## Relevant pull requests

- PR [#13 — CI-002 Claude Review Pilot](https://github.com/pittonje/BurningSpace/pull/13),
  merged into `main` as `558ce3484e6a02bc8015674095c19bc3d6e6124f`. Created the
  pilot workflow.
- PR [#14 — CI-002V — Verify Claude QA Pilot](https://github.com/pittonje/BurningSpace/pull/14),
  merged into `main` as `4c3de975b464a0752e09720b40466b6b35b021ac`. Ran the
  pilot post-merge on a normal PR and captured the intermittent
  comment-posting evidence this task diagnoses.

## Relevant runs

Full history of the `Claude QA Review Pilot` workflow (5 runs total; no
others exist as of this investigation):

| Run ID | Branch | Commit | Conclusion | Notes |
|---|---|---|---|---|
| `29150904334` | `ci/claude-review-pilot` (PR #13) | `41b3b77e…` | **failure** | First live run. OIDC token request failed (`id-token: write` was missing at that point in history). Fixed by commit `70fad5b` ("fix: restore id-token permission for Claude GitHub App OIDC exchange"). Unrelated to comment delivery. |
| `29150963058` | `ci/claude-review-pilot` (PR #13) | `70fad5b4…` | success | OIDC succeeded, but GitHub's own workflow-validation guard skipped the job (`Skipping action due to workflow validation: ... file must ... have identical content to the version on the repository's default branch`) because the workflow file itself was being modified on the PR. No Claude invocation occurred. |
| `29151025479` | `ci/claude-review-pilot` (PR #13) | `557f484c…` | success | Same workflow-validation skip as above. No Claude invocation. |
| `29151662011` | `ci/verify-claude-qa-pilot` (PR #14) | `fdb5bfd93d8e0f17b3e93c7fbb034bc16833d776` | success | **Run A — primary partial-verification run.** Full Claude invocation, `permission_denials_count: 4`, **zero PR comments posted.** |
| `29151923628` | `ci/verify-claude-qa-pilot` (PR #14) | `16ec25ca0e99d7b4607f61a2eeba3fb89ec51fd1` | success | **Run B — later successful run.** Full Claude invocation, `permission_denials_count: 5`, **one PR comment posted** (`issuecomment-4945542798`, four required headings in order, posted 2026-07-11T12:02:38Z). |

No runs exist yet on `ci/deterministic-qa-comment-delivery` (confirmed via
`gh run list --workflow claude-qa-review-pilot.yml --branch
ci/deterministic-qa-comment-delivery`, empty result) — this is a clean
baseline branch with no prior CI history to confuse the comparison.

## Workflow and agent hashes

Both Run A and Run B executed the **same** committed workflow blob
(`.github/workflows/claude-qa-review-pilot.yml` as merged in PR #13,
unchanged through PR #14) and the **same** `qa-reviewer` agent definition —
neither file changed between the two runs. This rules out "the workflow or
agent definition changed between runs" as an explanation.

`anthropics/claude-code-action@v1` resolved to the **identical** commit SHA
in both runs: `e90deca47693f9457b72f2b53c17d7c445a87342` (tagged
`v1.0.171`, committed 2026-07-11T00:52:42Z — "chore: bump Claude Code to
2.1.207 and Agent SDK to 0.3.207"). The Claude Code CLI version
(`2.1.207`), model (`claude-sonnet-5`), runner image, and `bun` runtime
version were also identical between the two runs. This rules out "different
Action or CLI version between runs" as an explanation.

## Run comparison

| Property | Run A `29151662011` (no comment) | Run B `29151923628` (comment posted) | Difference | Relevance |
|---|---|---|---|---|
| Commit reviewed | `fdb5bfd9…` | `16ec25ca…` | Different (separate pushes to PR #14) | Expected, not a cause |
| `claude-code-action@v1` resolved SHA | `e90deca4…` | `e90deca4…` | **Identical** | Rules out Action-version drift |
| Claude Code CLI version | `2.1.207` | `2.1.207` | **Identical** | Rules out CLI-version drift |
| Model | `claude-sonnet-5` | `claude-sonnet-5` | Identical | — |
| `allowedTools` / `disallowedTools` | Identical config | Identical config | Identical | Rules out config drift |
| OIDC / GitHub App token exchange | Succeeded | Succeeded | Identical | Rules out auth failure |
| `is_error` | `false` | `false` | Identical | Both SDK-level "success" |
| `subtype` | `success` | `success` | Identical | Both SDK-level "success" |
| `num_turns` | 18 | 19 | **+1 in Run B** | Consistent with Run A's final turn not completing a matching `gh pr comment` call |
| `total_cost_usd` | 0.4264 | 0.5168 | **+21% in Run B** | Same signal as `num_turns` |
| `permission_denials_count` | **4** | **5** | Run B has *more* denials | **Denial count does not predict comment success — see below** |
| MCP server for comments | Not registered (agent mode, no `mcp__github_comment__*` in `allowedTools`) | Not registered (same reason) | Identical | Comment posting in both runs depends solely on Claude choosing to run `Bash(gh pr comment:*)` correctly |
| `show_full_output` | `false` | `false` | Identical | Per-turn tool-call detail is hidden in both logs; exact denied command strings are not recoverable from either run |
| Retry/rate-limit/timeout signatures | None found | None found | Identical (none) | Rules out transient GitHub API failure |
| PR #14 comments before/after run window | 0 / 0 | 0 / 1 | **The actual outcome difference** | Confirmed via `gh api` across reviews/comments/issue-comments (only one comment exists total) |

## Permission denials

- **Confirmed:** Run A = 4 denials, Run B = 5 denials — both nonzero, and
  the run that succeeded at posting a comment had *more* denials than the
  one that failed.
- **Confirmed (from the workflow file):** the tool allowlist is
  `Read,Grep,Glob,Bash(gh pr view:*),Bash(gh pr diff:*),Bash(gh pr
  comment:*)` with `Write,Edit,NotebookEdit` explicitly disallowed.
  Anything else — `git log`/`diff`/`blame`, `cat`, `find`, `gh api`, other
  `gh` subcommands — is not allowlisted and is auto-denied with no human
  present to approve it in CI.
- **Unknown:** which specific tool calls were denied in either run.
  `show_full_output: false` (the workflow's default) suppresses the
  per-turn tool-call stream in the Actions log, and neither run uploaded an
  artifact containing the full SDK transcript, so the exact denied command
  strings are not recoverable after the fact.
- **Key finding:** because Run B (which succeeded) had a *higher* denial
  count than Run A (which failed), permission denials by themselves are not
  the discriminating factor. Whatever caused denials in both runs was
  evidently recoverable and non-fatal — the discriminator is something else
  about how each run's *final* turn concluded (see Root-cause confidence).

## Comment publication paths

In the current (pre-CI-002R) design, there is exactly **one** possible
comment publication path, and it is entirely model-driven:

1. The workflow's `prompt:` instructs Claude to run
   `gh pr comment ${{ github.event.pull_request.number }} --body "<review>"`
   as a `Bash` tool call, itself.
2. `anthropics/claude-code-action@v1` in `agent` mode (which this workflow
   triggers, since `track_progress: "false"` and the event is
   `pull_request`) registers a `github_comment` MCP server (exposing
   `update_claude_comment`) **only if** `allowedTools` contains an
   `mcp__github_comment__*` entry. This workflow's `allowedTools` does not
   contain one, so **no MCP comment server is ever installed** for this
   pilot.
3. The action's own cleanup step is a no-op in agent mode
   (`commentId: undefined // No tracking comment in agent mode`).
4. Therefore comment delivery is **100% delegated** to whether Claude, on
   its own initiative within its turn budget, chooses to make a
   correctly-formed `Bash` call matching the `Bash(gh pr comment:*)` glob as
   one of its tool calls, and that call actually executes successfully.
   There is no action-level retry, no independent posting mechanism, and no
   fallback path if that specific tool call is skipped, mis-formed, or
   denied.
5. The action determines overall job "success" purely from the Agent SDK's
   `result.subtype === "success"` — which only means the turn loop
   terminated without crashing, and is **completely decoupled** from
   whether the intended `gh pr comment` side effect ever happened. This is
   why both Run A (no comment) and Run B (comment posted) show `conclusion:
   success` in GitHub Actions.

## Upstream correlation

| Candidate | Matching evidence | Contradicting evidence | Confidence |
|---|---|---|---|
| [anthropics/claude-code-action#1384](https://github.com/anthropics/claude-code-action/issues/1384) — "Claude runs successfully but cannot post PR comments — `permission_denials_count: 23`" | Near-exact structural match: green run, nonzero `permission_denials_count`, zero PR comments, `agent` mode with a `Bash(gh pr comment:*)`-style allowlist. Reporter tried multiple permission-config variants without resolving it; issue is still open. | Denial count in that issue (23) is much higher than BurningSpace's (4–5); not confirmed to be the exact same underlying trigger. | **Highly probable** |
| [anthropics/claude-code-action#1087](https://github.com/anthropics/claude-code-action/issues/1087) — review completes but produces an empty result / no comment | Documents a related mechanism: if the agent's *final* turn is a tool call (e.g. `TodoWrite`) rather than a text block, the SDK's `result` string comes back empty even though a full review was generated. Same symptom class (job succeeds, no comment). | Different trigger mechanism (plugin/`TodoWrite`-driven, not a raw `gh pr comment` Bash call) — not a 1:1 match. | **Probable** (related mechanism) |
| [anthropics/claude-code-action#1368](https://github.com/anthropics/claude-code-action/issues/1368) — team switched to `claude -p` with deterministic structured output because action-orchestrated review comments were unreliable | Not a root-cause report, but strong precedent: another team independently arrived at the same fix direction this task implements (`--json-schema` + external publisher). | N/A — not a diagnosis, a design precedent. | **Confirmed as precedent**, not a diagnosis |
| [anthropics/claude-code-action#1393](https://github.com/anthropics/claude-code-action/issues/1393) — no retry mechanism for degenerate/truncated output | Corroborates that the action has no built-in retry or self-healing for a run that completes "successfully" but doesn't deliver its intended output. | General corroboration, not specific to comment posting. | **Confirmed** as corroborating evidence |
| [anthropics/claude-code-action#1292](https://github.com/anthropics/claude-code-action/issues/1292) — agent halts after Edit/Write phase with `stop_reason: end_turn`, never invokes Bash | Shows a separate, spontaneous "ends turn before the directed final action" failure mode. | Reported with `permission_denials: []` — a *different* mechanism (pure agent choice, not a denied permission) from what BurningSpace observed (nonzero denials in both runs). | **Possible** analogue, different mechanism |
| [anthropics/claude-code-action#1462](https://github.com/anthropics/claude-code-action/issues/1462) — headless run reports success after agent backgrounds work and ends turn | Generalizes the "job success ≠ intended side effect happened" decoupling documented above. | Not comment-posting specific. | **Possible**, supporting context |
| [anthropics/claude-code-action#1052](https://github.com/anthropics/claude-code-action/issues/1052), [#1108](https://github.com/anthropics/claude-code-action/issues/1108), [#1128](https://github.com/anthropics/claude-code-action/issues/1128), [#1251](https://github.com/anthropics/claude-code-action/issues/1251) — `use_sticky_comment` broken/no-effect in agent mode | Confirms agent-mode's built-in comment machinery is broadly immature. | The pilot sets `use_sticky_comment: "false"` and never relies on that machinery at all — not directly applicable. | **Unlikely** as a direct cause / useful context only |

## Confirmed facts

1. Run A and Run B used byte-identical workflow YAML, byte-identical
   `qa-reviewer` agent definition, identical `anthropics/claude-code-action@v1`
   resolved SHA, and identical Claude Code CLI version.
2. Both runs authenticated successfully (OAuth + OIDC + GitHub App token
   exchange) and both completed with SDK-level `subtype: success`,
   `is_error: false`.
3. Both runs had a nonzero `permission_denials_count` (4 and 5
   respectively); the run with the *higher* denial count is the one that
   successfully posted a comment.
4. Exactly one comment exists on PR #14 in total, posted by Run B at
   2026-07-11T12:02:38Z, containing all four required headings in the
   required order.
5. No MCP server for comment posting was registered in either run (the
   workflow's `allowedTools` never included an `mcp__github_comment__*`
   entry); comment delivery depended entirely on Claude's own `Bash(gh pr
   comment:*)` tool call in both runs.
6. `anthropics/claude-code-action@v1` (at the resolved SHA both runs used)
   supports a `--json-schema` input inside `claude_args`, which produces a
   validated `structured_output` step output — a mechanism entirely
   separate from, and independent of, any Bash tool call.
7. No retry, rate-limit, or timeout signature appears in either run's log.
8. The action determines overall job success purely from the Agent SDK's
   `result.subtype === "success"`, which is fully decoupled from whether
   the intended `gh pr comment` side effect occurred, and the action
   provides no retry or fallback for comment delivery under this
   configuration — a structural property confirmed directly from the
   action's source at the resolved SHA, and the reason the failure mode is
   silent.

## Probable causes

- **Most probable (moderate-to-high confidence):** agent/tool-call
  non-determinism under a narrow Bash-command allowlist. Posting a
  multi-line Markdown review body via a single-line, double-quoted shell
  argument (`gh pr comment N --body "<multi-section markdown>"`) is exactly
  the kind of construction where an LLM may vary its exact approach between
  runs (e.g. attempting a heredoc, a temp-file write, or different quoting
  before or instead of a directly-matching `gh pr comment` invocation).
  Because the allowlist is a strict command-prefix glob
  (`Bash(gh pr comment:*)`), any alternate construction is denied, and nothing
  in the workflow guarantees the agent's *final* turn is the one correctly-
  shaped call. This matches the near-identical publicly reported symptom in
  upstream issue #1384 and is consistent with Run B needing one additional
  turn and ~21% more cost than Run A to reach the same nominal task.
- **Contributing structural cause:** see Confirmed facts item 8 — the
  job-success/side-effect decoupling and absence of any retry/fallback is a
  confirmed structural property (listed there rather than here because it
  is directly observed from source, not inferred). Its *contribution to
  this specific incident* is what belongs in this section: it is what made
  the primary cause silent — a reviewer or CI dashboard sees a green check
  with no comment and no visible error.

## Rejected hypotheses

- **Different Action or CLI version between the two runs.** Rejected — both
  runs resolved to the identical `claude-code-action` SHA and identical CLI
  version (see Run comparison table).
- **Different workflow or agent-definition content between the two runs.**
  Rejected — both runs executed the same committed blobs (see Workflow and
  agent hashes).
- **Auth/token-scope failure.** Rejected — OIDC exchange succeeded in both
  runs, and the exchanged token carries `pull_requests: write` by default;
  a scope failure would very likely surface as an outright action error,
  not a silent zero-comment "success."
- **Transient GitHub API failure (rate limit, 5xx, timeout) on the `gh pr
  comment` call itself.** Rejected — `permission_denials_count` is a
  CLI-permission-engine metric produced *before* any GitHub API call would
  be attempted, and no retry/timeout/rate-limit signature appears in either
  log.
- **Permission denials directly blocking the intended `gh pr comment`
  call.** Rejected as the sole or primary explanation — the run with *more*
  denials (Run B) is the one that succeeded. Denials in both runs are more
  consistent with normal exploratory tool-use friction (e.g., attempts at
  non-allowlisted commands like `git log` or `cat`) than with the specific
  final comment-posting call being denied. (Not fully falsifiable without
  `show_full_output: true` — see Root-cause confidence.)
- **YAML block-scalar line-wrap literally breaking the `Bash(gh pr
  comment:*)` prefix match**, as hypothesized in `docs/reviews/ci-002v-pilot-verification.md`.
  Not confirmed and not clearly supported: if a formatting artifact in the
  *prompt text* reliably produced a malformed command, it should behave
  consistently across identical-config runs, but Run B succeeded under the
  exact same prompt text. This hypothesis is not rejected outright (it may
  have contributed noise/confusion in the agent's reasoning about the exact
  command shape, indirectly feeding into the broader non-determinism
  above), but it is not supported as an independent, sufficient cause on
  its own.

## Root-cause confidence

Evaluated against the five determinations required by the task brief (the
fifth of which selects among seven candidate classifications):

1. **Why did the primary run have four permission denials?** Unknown in
   exact detail (denied command strings are not recoverable from either
   run's log under `show_full_output: false`); most consistent with normal
   agent exploration attempting commands outside the narrow allowlist.
   Confidence: **Possible** (plausible, not directly observed).
2. **Why did the primary run produce no comment?** Most consistent with the
   agent's final turn not completing a correctly-formed, allowlist-matching
   `gh pr comment` call — a manifestation of relying on model-driven tool
   choice for a required, structurally exact side effect. Confidence:
   **Probable**.
3. **Why did the later run produce a comment?** The agent's final turn (one
   turn later, ~21% more cost) did complete a correctly-formed call.
   Confidence: **Probable**.
4. **Did the two outcomes use the same publication path?** Yes — both runs
   relied on the identical, sole mechanism (Claude's own `Bash(gh pr
   comment:*)` tool call; no MCP server, no action-level fallback in
   either). Confidence: **Confirmed**.
5. **Classification** — each of the seven candidate classes from the task
   brief, addressed explicitly:
   - *Deterministic configuration error*: rejected as the primary cause —
     configuration was byte-identical across both runs, yet outcomes
     differed.
   - *Nondeterministic Action defect*: contributing factor, not primary —
     the action's job-success/side-effect decoupling and lack of any
     retry/fallback convert agent variability into a silent failure, but
     the action code itself behaved identically in both runs.
   - *Transient GitHub API failure*: rejected — no retry, rate-limit, or
     timeout signature in either log, and `permission_denials_count` is
     produced by the CLI's permission engine before any GitHub API call.
   - *Transient MCP startup failure*: rejected — no MCP comment server was
     ever registered in either run (agent mode without an
     `mcp__github_comment__*` allowlist entry), so there was no MCP server
     whose startup could have failed; comment delivery never depended on
     MCP in this workflow.
   - *Final-result extraction defect*: rejected in the narrow sense of
     issue #1087 (that mechanism concerns the `result` text field, not the
     `Bash(gh pr comment:*)` call itself) — though it is the same broader
     class of "job succeeds, deliverable doesn't happen" defect.
   - *Prompt/agent-output variability*: **primary cause** —
     non-deterministic LLM tool-call behavior under a narrow, exact-match
     permission surface.
   - *Combination of several causes*: yes, in the specific sense above —
     primary agent variability, amplified into a silent failure by the
     contributing action-design factor.

## Security implications

- The current architecture gives Claude's execution context access to a
  write-scoped GitHub token (via the action's own OIDC→GitHub-App exchange,
  independent of the workflow step's own `GH_TOKEN: ${{ github.token }}`)
  for the entire duration of its reasoning loop, gated only by the Claude
  Code CLI's own tool-permission allowlist. This is a real trust-boundary
  width: a prompt-injection payload embedded in PR-controlled content
  (title, description, diff) that successfully persuaded Claude to attempt
  an out-of-allowlist command would be *denied* by the CLI's permission
  engine (defense-in-depth held in both observed runs — zero unauthorized
  writes occurred), but the token itself is present in that execution
  context regardless.
- Because comment publication currently has no independent, deterministic
  gate, there is no structural guarantee that only well-formed, schema-
  valid review content is ever posted — today, *whatever* Claude manages to
  pass as the `--body` argument would be posted verbatim, with no size,
  content, or structural validation.
- No secret exposure was found in either run's logs (per the CI-002V
  verification and re-confirmed by this task's log review under the
  sanitization rule).

## Reliability implications

- The core reliability defect is that a required, discrete side effect (one
  PR comment, four headings, in order) is being produced as an emergent
  side effect of free-form LLM tool use rather than as a guaranteed,
  testable step. This cannot be fixed by prompt wording alone, because the
  two observed runs used *identical* prompt text and still diverged.
- The fix requires moving the actual GitHub mutation out of the model's
  control entirely: Claude should return validated structured data (via the
  confirmed `--json-schema` / `structured_output` mechanism), and a
  deterministic, workflow-owned step — not subject to LLM turn-budget or
  tool-call variability — should own parsing, validation, rendering, and
  publication.

## Architectural recommendation

Adopt Architecture B, exactly as authorized in Section 7 of the task brief:
Claude inspects the PR and returns machine-validated structured output only
(no comment-posting permission, no file-write permission, no commit/push
permission); a deterministic workflow step validates that output against a
strict contract, renders the four required Markdown headings, and posts
exactly one top-level comment via `gh pr comment --body-file`, using a
`GH_TOKEN` scoped only to that step. On missing/invalid/malformed output,
the same deterministic step posts one sanitized failure comment and fails
the job, so no run can silently produce zero comments while still reporting
a green check. This directly closes the failure mode demonstrated by Run A
without depending on any change in model behavior, and remains consistent
with the upstream precedent in issue #1368, where another team reached the
same conclusion independently.
