# BurningSpace Current Handoff

Last updated: 2026-07-13
Updated by: Claude — CI-AUDIT-001 reconciled with current main

## Repository state

- Base branch: `main`, currently at `c0cb629` (PR #26 merge commit),
  which includes PR #22 (CI-002D3V, merged `3c36a47`), PR #23 (HYG-001,
  merged `3cb8689`), PR #24 (PR-007, merged `e69a38d`), and PR #26
  (TEST-001, merged `c0cb629`)
- Active branch: `ci/audit-system-hardening`
- Pull request: [#25 — CI-AUDIT-001 — Full Claude QA System Audit and Hardening](https://github.com/pittonje/BurningSpace/pull/25)
- Pull request state: Open, not merged
- This branch has been reconciled with current `main` via
  `git merge --no-ff origin/main` (conflicts in `PROJECT_CONTEXT.md` and
  this file resolved to preserve both the CI-002D3V/HYG-001/PR-007/
  TEST-001 facts already on `main` and the CI-AUDIT-001 findings)

## Current task

- Task ID: `CI-AUDIT-001`
- Task title: Full Claude QA System Audit and Hardening
- Task file: `docs/tasks/ci-audit-001-full-qa-system-audit.md`
- Audit report: `docs/reviews/ci-audit-001-full-qa-system-audit.md`
- Status: Audit and fixes complete, reconciled with current main, not
  post-merge verified

## Audit result summary

**Audit system usable with documented limitations.** Root cause found for
the `structured_output_error` that has affected every run since
CI-002RV, including CI-002QAV and CI-002D3V (both merged, both confirmed
the schema-content path was not the cause): the `qa-reviewer` agent
definition's explicit `tools:` allowlist implicitly excludes the CLI's
internal `StructuredOutput` tool. Confirmed by 8 local reproductions
(E1–E8a) on Claude Code CLI 2.1.207 (identical to the pinned action's
installed version). Fixed with a one-line addition, superseding
CI-002D3V's originally planned next step (removing `--agent` entirely).

## Confirmed defects and fixes (unchanged after reconciliation)

| ID | Severity | Defect | Fixed | File |
|---|---|---|---|---|
| F-1 | Important | `structured_output` non-functional with `--agent` + `--json-schema` | Yes | `.claude/agents/qa-reviewer.md` |
| F-2 | Important | No prompt-injection-resistance instructions | Yes | `.github/workflows/claude-qa-review-pilot.yml`, `.claude/agents/qa-reviewer.md` |
| F-3 | Minor | Agent's Markdown-heading contract vs. JSON-only invocation | Yes | `.claude/agents/qa-reviewer.md` |

No blockers found. Full detail, evidence, and confidence levels in the
audit report.

## Tests

`.github/scripts/test-claude-qa-audit.py` — stdlib-only, 41 deterministic
checks (invocation contract, embedded validator/renderer, sanitizer
redaction). Re-ran after reconciliation: all 41 pass. No new dependency.

## Validation results

| Check | Result |
|---|---|
| `git diff --check` | Clean |
| Audit test suite (post-reconciliation) | 41/41 pass |
| Forbidden-path diffs vs. current `origin/main` | Empty |
| Local structured-output reproduction (E8a, CI-exact config) | Pass — `structured_output` present, `is_error: false`, 2 turns |

CI-001 validates remotely; TEST-001's `npm test`/build/typecheck were not
re-run locally in this reconciliation pass (no runtime code touched by
CI-AUDIT-001; TEST-001's own 15/15 test result is unaffected and recorded
durably in `PROJECT_CONTEXT.md`).

## Files created

- `docs/tasks/ci-audit-001-full-qa-system-audit.md`
- `docs/reviews/ci-audit-001-full-qa-system-audit.md`
- `.github/scripts/test-claude-qa-audit.py`

## Files modified (CI-AUDIT-001 scope, unchanged by reconciliation)

- `.github/workflows/claude-qa-review-pilot.yml` (prompt-injection block
  added; no invocation-argument change)
- `.claude/agents/qa-reviewer.md` (`StructuredOutput` tool added;
  prompt-injection sentence; format-precedence sentence)
- `PROJECT_CONTEXT.md` (CI-002D3V/HYG-001/PR-007/TEST-001 durable facts
  from current main preserved; CI-AUDIT-001 findings appended)
- `docs/handoffs/CURRENT.md` (this file)

## Preserved invariants

- CI-001, runtime, packages, manifests, lockfile, other reviewer
  definitions: unchanged.
- Permissions, gates, `--allowedTools`/`--disallowedTools`, action pins,
  authentication, safe diagnostics, validator, renderer, publisher,
  concurrency, stale-run protection, `show_full_output: false`: all
  unchanged.
- No permission expansion; no write-capable tool granted to Claude; no
  secret accessed or exposed.
- CI-003 remains blocked. PR-007 is complete (merged as #24) — no longer
  deferred.

## Remaining limitations

- The structured-output fix is locally proven on the identical CLI
  version but not yet exercised on a live GitHub Actions run — this PR's
  own workflow/agent changes cannot self-verify (self-modifying-workflow
  skip, consistent with every prior CI-002D* PR). CI-AUDIT-001V
  (documentation-only, post-merge) is required.
- Other reviewer agent definitions share the pre-fix `tools:` pattern and
  would hit the same defect if ever given `--json-schema`; not currently
  affected, deferred to CI-003 planning.

## Next safe action

Human review and merge of the CI-AUDIT-001 pull request, followed by a
documentation-only CI-AUDIT-001V post-merge verification confirming
structured output is now produced, the validator accepts it, and exactly
one normal four-heading QA comment is published. Do not implement
CI-AUDIT-001V now. Do not start CI-003.
