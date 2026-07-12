# CI-AUDIT-001 — Full Claude QA System Audit and Hardening

## Goal

Audit the complete Claude QA path (triggers, permissions, authentication,
invocation, prompt-injection resistance, tool policy, structured output,
validator, renderer, publisher, diagnostics, self-modifying-workflow
behavior, tests, documentation) and apply narrow, evidence-based fixes for
confirmed defects without weakening any security boundary.

## Current architecture

`pull_request` → gated job (same-repo/owner/non-draft) → pinned
`claude-code-action` (v1.0.171, Claude Code 2.1.207, OAuth + OIDC/App
exchange) runs `qa-reviewer` read-only with `--json-schema` → safe
sanitized diagnostics to Step Summary → deterministic embedded-Python
validator → renderer (four fixed headings) → workflow-owned publisher
(`gh pr comment --body-file`, step-scoped `github.token`, live stale-run
re-check) → exactly one comment per run; invalid output posts one
sanitized failure comment and fails the job.

## Trust boundaries

- Untrusted: all PR-controlled content (diff, files, title, description,
  commit messages, file names) and all Claude output.
- Trusted: workflow definition from `main` (action self-skips otherwise),
  GitHub event context, step-scoped tokens, the embedded validator and
  sanitizer, the pinned action SHA.
- Claude has no comment, write, commit, push, or token access; the
  publisher owns the only GitHub mutation.

## Threat model

Prompt injection from reviewed content; hostile Markdown/Unicode in model
output; secret exfiltration via logs/comments/diagnostics; stale or
wrong-PR publication; privileged execution of untrusted workflow
modifications; silent zero-comment failures; false approvals.

## Functional requirements

Valid review → one four-heading comment bound to the tested HEAD SHA.
Invalid/absent review → one sanitized failure comment + failed job. No
zero-comment success path. Structured output must actually function.

## Security requirements

Least-privilege permissions; read-only Claude tools; no secret in
Claude-visible context; `show_full_output: false`; sanitized diagnostics;
fail-closed validation; SHA binding; stale-run protection; pinned actions.

## Reliability requirements

Deterministic publication; per-PR concurrency with cancellation;
fail-closed on every anticipated and unanticipated error class.

## Reviewed components

Workflow triggers/gates/permissions/concurrency; OAuth/OIDC/App token
flow; action + checkout pins; `claude_args` (agent, tools, schema);
`.claude/agents/qa-reviewer.md`; embedded validator + renderer; publisher;
`.github/scripts/sanitize-claude-diagnostic.py`; historical run evidence
(CI-002V through CI-002D3V); local CLI 2.1.207 experiments E1–E8a.

## Confirmed defects

See `docs/reviews/ci-audit-001-full-qa-system-audit.md` for the full
table. Summary: F-1 (IMPORTANT — structured output non-functional; root
cause: the agent `tools:` allowlist excludes the CLI's internal
`StructuredOutput` tool); F-2 (IMPORTANT — workflow prompt lacked explicit
prompt-injection-resistance instructions); F-3 (MINOR — contradictory
output contracts between the agent definition and JSON-only invocation).

## Accepted fixes

- F-1: add `StructuredOutput` to the agent's `tools:` line (one word;
  locally verified end-to-end on the identical CLI version).
- F-2: add a prompt-injection-resistance block to the workflow-owned
  prompt.
- F-3: one-sentence output-format precedence rule in the agent definition.
- New committed audit test suite:
  `.github/scripts/test-claude-qa-audit.py` (stdlib-only, 41 checks).

## Deferred risks

- Sanitizer `classify()` "agent" needle is overly broad (no observed
  misclassification; revisit with evidence).
- No explicit `--max-turns` bound (observed runs bounded at 18–25 turns;
  SDK/action defaults apply).
- One comment per run/rerun with no deduplication (by design until the
  CI-003 era).
- Other reviewer agents share the pre-fix `tools:` pattern and would hit
  F-1 if ever given `--json-schema`; fix them in CI-003 planning, not here.

## Allowed files

- `.github/workflows/claude-qa-review-pilot.yml`
- `.claude/agents/qa-reviewer.md`
- `.github/scripts/test-claude-qa-audit.py`
- `docs/tasks/ci-audit-001-full-qa-system-audit.md`
- `docs/reviews/ci-audit-001-full-qa-system-audit.md`
- `docs/handoffs/CURRENT.md`
- `PROJECT_CONTEXT.md` (durable verified facts only)

## Forbidden files

`.github/workflows/pr-checks.yml`, `apps/**`, `packages/**`,
`package.json`, `package-lock.json`, tsconfig files, `assets/**`,
gameplay documents, CI-003 implementation, other reviewer agents'
definitions, Codex branches/worktrees.

## Required validation

`git diff --check`; workflow YAML parse; `claude_args` reconstruction;
schema contract check; full audit test suite (41 checks); forbidden-path
empty diffs; local CLI experiments E1–E8a for the structured-output fix.

## Stop conditions

Secret exposure; a fix requiring new dependencies, permission expansion,
raw output, or architecture replacement; unrelated working-tree changes.

## Rollback

Each fix is independently revertible: remove `StructuredOutput` from the
agent tools line; remove the prompt-injection block; remove the precedence
sentence; delete the test script. No other component depends on them.

## Post-merge verification

This PR modifies both the workflow file and the agent definition, so the
action self-skips pre-merge and nothing on this PR proves the fix in CI. A
separate documentation-only post-merge verification task (CI-AUDIT-001V)
must confirm: structured output present, validator accepts, exactly one
normal four-heading QA comment, no failure comment, boundaries hold.
