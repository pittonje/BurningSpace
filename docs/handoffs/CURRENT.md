# BurningSpace Current Handoff

Last updated: 2026-07-11
Updated by: Claude — CI-AUDIT-001 audit and hardening complete

## Repository state

- Base branch: `main` (at `e94965c6012ee4d64b50125d29f6f0fc36844ee7`, PR #21
  merge commit)
- Active branch: `ci/audit-system-hardening`
- Pull request: [#25 — CI-AUDIT-001 — Full Claude QA System Audit and Hardening](https://github.com/pittonje/BurningSpace/pull/25)
- Pull request state: Open, not merged

## Current task

- Task ID: `CI-AUDIT-001`
- Task title: Full Claude QA System Audit and Hardening
- Task file: `docs/tasks/ci-audit-001-full-qa-system-audit.md`
- Audit report: `docs/reviews/ci-audit-001-full-qa-system-audit.md`
- Status: Audit and fixes complete, not post-merge verified

## Also completed this session: CI-002D3V (PR #22, unmerged)

- Task file: `docs/tasks/ci-002d3v-verify-simplified-claude-schema.md`
- Report: `docs/reviews/ci-002d3v-verification.md`
- Result: **Simplified schema exonerated** — 18 genuine turns, $0.3609
  cost, `is_error: false`, `structured_output` still absent, identical
  Action error and diagnostic category as before simplification.
- PR #22 remains open, unmerged. This audit branch was created from `main`
  (which does not yet include PR #22), so `PROJECT_CONTEXT.md` on this
  branch has been updated to record both CI-002D3V's confirmed result and
  this audit's finding together, since they are both established facts.

## Audit result summary

**Audit system usable with documented limitations.** Root cause found for
the `structured_output_error` that has affected every run since
CI-002RV: the `qa-reviewer` agent definition's explicit `tools:` allowlist
implicitly excludes the CLI's internal `StructuredOutput` tool. Confirmed
by 8 local reproductions (E1–E8a) on Claude Code CLI 2.1.207 (identical to
the pinned action's installed version). Fixed with a one-line addition.

## Confirmed defects and fixes

| ID | Severity | Defect | Fixed | File |
|---|---|---|---|---|
| F-1 | Important | `structured_output` non-functional with `--agent` + `--json-schema` | Yes | `.claude/agents/qa-reviewer.md` |
| F-2 | Important | No prompt-injection-resistance instructions | Yes | `.github/workflows/claude-qa-review-pilot.yml`, `.claude/agents/qa-reviewer.md` |
| F-3 | Minor | Agent's Markdown-heading contract vs. JSON-only invocation | Yes | `.claude/agents/qa-reviewer.md` |

No blockers found. Full detail, evidence, and confidence levels in the
audit report.

## Tests added

`.github/scripts/test-claude-qa-audit.py` — stdlib-only, 41 deterministic
checks (invocation contract, embedded validator/renderer, sanitizer
redaction). All 41 pass. No new dependency.

## Validation results

| Check | Result |
|---|---|
| `git diff --check` | Clean |
| Audit test suite | 41/41 pass |
| Forbidden-path diffs | Empty |
| Local structured-output reproduction (E8a, CI-exact config) | Pass — `structured_output` present, `is_error: false`, 2 turns |

Build/gameplay diagnostics intentionally not run — no runtime code changed;
CI-001 validates remotely.

## Files created

- `docs/tasks/ci-audit-001-full-qa-system-audit.md`
- `docs/reviews/ci-audit-001-full-qa-system-audit.md`
- `.github/scripts/test-claude-qa-audit.py`

## Files modified

- `.github/workflows/claude-qa-review-pilot.yml` (prompt-injection block
  added; no invocation-argument change)
- `.claude/agents/qa-reviewer.md` (`StructuredOutput` tool added;
  prompt-injection sentence; format-precedence sentence)
- `PROJECT_CONTEXT.md` (CI-002D3V + CI-AUDIT-001 durable facts recorded)
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
- CI-003 remains blocked; PR-007 remains deferred.

## Remaining limitations

- The structured-output fix is locally proven on the identical CLI version
  but not yet exercised on a live GitHub Actions run — this PR's own
  workflow/agent changes cannot self-verify (self-modifying-workflow skip,
  consistent with every prior CI-002D* PR). CI-AUDIT-001V (documentation-
  only, post-merge) is required.
- Other reviewer agent definitions share the pre-fix `tools:` pattern and
  would hit the same defect if ever given `--json-schema`; not currently
  affected, deferred to CI-003 planning.

## Next safe action

Human review and merge of the CI-AUDIT-001 pull request, followed by
CI-AUDIT-001V — live post-merge verification that structured output is
now produced, the validator accepts it, and exactly one normal four-
heading QA comment is published. Do not implement CI-AUDIT-001V now. Do
not start CI-003.
