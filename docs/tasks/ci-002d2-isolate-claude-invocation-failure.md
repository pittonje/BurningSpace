# CI-002D2 — Isolate Claude Invocation Failure

## Implementation checkpoint

- The Product Architect approved experiment B (remove `--json-schema`).
- Implementation removes exactly the `--json-schema` flag and its schema
  value from `claude_args` in
  `.github/workflows/claude-qa-review-pilot.yml`; no other invocation
  variable changed (agent, prompt, tools, model behavior, action SHA,
  validator, publisher, diagnostics, gates, and permissions all unchanged).
- The remote result remains pending post-merge verification (CI-002D2V);
  no outcome is claimed from this PR's own checks because the modified
  workflow cannot exercise itself pre-merge.
- Rollback: re-add the exact removed flag/value (preserved in Git history
  at planning commit `00788f6` and in the pre-change blob).

## Goal

Turn the non-specific `unknown_safe_error` from CI-002DV into either a
specific safe diagnostic category or successful structured output by changing
exactly one invocation variable, without weakening any security boundary and
without touching the deterministic publication path.

## Starting evidence

- CI-002RV runs `29156077671`, `29156150151`, `29156280877` and the CI-002DV
  run `29157358557` all fail identically: one turn, zero cost, zero permission
  denials, `is_error: true`, result subtype `success`, execution file present,
  session ID present, no structured output.
- CI-002DV normalized category: `unknown_safe_error` (Safe but inconclusive).
- The last known-good Claude executions (CI-002V, runs `29151662011` and
  `29151923628`) used the same action SHA (`e90deca4…` = v1.0.171), the same
  Claude Code version (2.1.207), the same `--agent qa-reviewer`, the same tool
  allow/disallow mechanism, and the same model alias (`sonnet` →
  `claude-sonnet-5`) — and ran 18–19 turns with non-zero cost.
- Zero cost with one turn indicates the model request was never successfully
  billed: the failure occurs at request construction, entitlement, or
  flag-handling level, before any reviewing work.

## Confirmed working layers

- OAuth secret availability and masking.
- GitHub OIDC acquisition and Claude GitHub App token exchange.
- Claude Code 2.1.207 installation and initialization.
- Execution-file write and safe sanitized diagnostics.
- Deterministic validation, sanitized failure rendering, single-comment
  publication, stale-run protection, and loud job failure.
- CI-001 independence.

## Unknown layer

The model-request layer between successful CLI initialization and the first
billed turn. The sanitized evidence cannot distinguish: `--json-schema`
runtime handling, `--agent` × `--json-schema` interaction, model/entitlement
rejection of the structured-output request shape, or an Action-level
extraction defect.

## Exact current invocation

Statically reconstructed and validated in
`docs/reviews/ci-002d2-invocation-analysis.md`:

- Action: `anthropics/claude-code-action@e90deca47693f9457b72f2b53c17d7c445a87342` (v1.0.171)
- Claude Code: 2.1.207 (pinned by the action)
- `claude_args` parse to exactly four flag/value pairs:
  `--agent qa-reviewer`;
  `--allowedTools "Read,Grep,Glob,Bash(gh pr view:*),Bash(gh pr diff:*)"`;
  `--disallowedTools "Write,Edit,NotebookEdit"`;
  `--json-schema '<609-byte valid JSON object schema>'`.
- No explicit `--model` (agent definition supplies alias `sonnet`).
- No explicit max-turns (SDK default).
- Prompt: workflow-owned literal block instructing a JSON-only reply.
- `--json-schema` is a documented flag of CLI 2.1.207 (verified against the
  identical local CLI version), so an unknown-flag failure is excluded.

## Candidate experiments

| # | Variable changed | Diagnostic value | Security impact | Risk |
|---|---|---|---|---|
| A | Remove `--agent`, keep schema and prompt | Isolates agent×schema interaction | None (tools unchanged) | Leaves the primary suspect untested first |
| B | Remove `--json-schema`, keep agent and prompt | Reverts the single delta from last known-good; directly implicates or exonerates the schema path | None (workflow validator remains authoritative) | Success path still posts a failure comment (structured output absent) — acceptable for a diagnostic run |
| C | Minimal inline prompt instead of named agent, keep schema | Similar to A but changes two things (prompt + agent) | None | Not single-variable |
| D | Explicit known-supported `--model`, keep all else | Tests alias resolution/entitlement | None | Alias `sonnet` already proven working in CI-002V; low prior |
| E | Remove tool flags, keep all else | Tests tool-flag interaction | Weakens read-only restriction | Unacceptable security cost; tools proven working in CI-002V |
| F | Minimal no-tools prompt with schema | Smallest schema-only request | Tool removal as in E | Changes many variables at once |
| G | Upgrade/pin newer Action or CLI | Tests platform defect fixed upstream | Requires new SHA trust review | Changes the whole platform, not one input |

## Selected single-variable experiment

**B — remove the `--json-schema` argument. Change nothing else.**

- `--json-schema` is the only invocation input that did not exist in the last
  known-good runs; every other input (agent, tools mechanism, model alias,
  action SHA, CLI version, prompt transport) is proven working at this exact
  version.
- If the run then executes multiple turns with non-zero cost and the safe
  diagnostic reports `success` (with structured output absent), the schema
  path is implicated with high confidence and the follow-up can target the
  structured-output mechanism specifically.
- If the run still fails one-turn/zero-cost, the schema path is exonerated
  and the next single-variable candidate (A, then D) is justified.
- Either outcome converts `unknown_safe_error` into a decision-grade fact.

## Security boundaries

Unchanged and mandatory: `pull_request` only; same-repository/owner/non-draft
gates; minimal permissions; OAuth + OIDC exchange; PR-aware concurrency;
read-only Claude tools (`Write`/`Edit`/`NotebookEdit` disallowed, no comment
tool); `show_full_output: false`; workflow-owned single-comment publication;
sanitized failure comments; stale-run protection; no secret output. Removing
`--json-schema` removes a defense-in-depth layer only — the workflow's own
validator remains the authoritative gate on anything that gets published.

## Allowed files

- `.github/workflows/claude-qa-review-pilot.yml` (implementation phase only)
- `docs/tasks/ci-002d2-isolate-claude-invocation-failure.md`
- `docs/reviews/ci-002d2-invocation-analysis.md`
- `docs/handoffs/CURRENT.md`
- `PROJECT_CONTEXT.md` only for durable facts after verification

## Forbidden files

- `.github/workflows/pr-checks.yml`
- `apps/**`
- `packages/**`
- `package.json`
- `package-lock.json`
- tsconfig files
- `assets/**`
- `.claude/agents/**`
- secrets and environment files
- CI-003 implementation
- PR-007 implementation
- gameplay implementation

## Required checks

Implementation phase (not this planning phase) must run: `git diff --check`,
workflow YAML parse, shell syntax on extracted steps, exact `claude_args`
token reconstruction, forbidden-path empty diffs. No build/gameplay
diagnostics are required for a workflow-only change unless runtime files are
touched (they must not be).

## Stop conditions

- Any evidence of secret exposure: stop and report.
- The experiment requires changing a second variable to run at all: stop and
  return to the Product Architect.
- The diagnostic run posts more than one comment or posts no comment on a
  non-superseded run: stop; that is a regression of the delivery contract.
- Unrelated user changes appear in the working tree: stop.

## Post-merge verification

The experiment can only run post-merge (the action skips itself while the
workflow differs from `main`). A follow-up documentation-only PR (CI-002D2V)
must record: turn count, cost, `is_error`, diagnostic category, comment
count, and the resulting classification decision. CI-003 remains blocked
until the invocation path is reliable.

## Rollback

Restore the single removed `--json-schema` line (one-line revert). The
deterministic validation and publication flow is independent of the flag and
needs no rollback.
