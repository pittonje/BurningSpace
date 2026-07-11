# BurningSpace Current Handoff

Last updated: 2026-07-11
Updated by: Claude — CI-002D2 planning complete

## Repository state

- Base branch: `main`
- Active branch: `main` (planning-only documentation; no implementation
  branch created yet)
- Upstream: `origin/main`; the planning commit is local-only pending Product
  Architect review (not pushed, per the CI-002D2 planning brief)
- Stable checkpoint before this task: `829007ae9e78dee87b22017bd39fa3e0d9cf3d28`
  (PR #18 merge commit)
- Pull request: None for CI-002D2 (planning phase; no PR is opened)

## Current task

- Task ID: `CI-002D2`
- Task title: Isolate Claude Invocation Failure
- Task file: `docs/tasks/ci-002d2-isolate-claude-invocation-failure.md`
- Analysis: `docs/reviews/ci-002d2-invocation-analysis.md`
- Status: Planning complete, implementation not started

## Selected experiment

Single variable: **remove `--json-schema` from `claude_args`** in
`.github/workflows/claude-qa-review-pilot.yml`, changing nothing else.
Rationale: it is the only invocation input present in every failing run
(one turn, zero cost, `is_error: true`) and absent from every known-good run
(CI-002V, 18–19 turns, non-zero cost) at identical action SHA, CLI version,
agent, tool mechanism, and model alias. Static analysis this session
additionally verified: `claude_args` parse into exactly four clean
flag/value pairs, the 609-byte schema is valid JSON, and `--json-schema` is
a documented flag of CLI 2.1.207 (identical local version checked) — so the
suspect is the flag's runtime path, not syntax, transport, or flag
existence. The workflow's own validator remains the authoritative output
gate, so removing the schema weakens no security boundary and preserves the
one-comment deterministic publication contract in every outcome.

## Files created

- `docs/tasks/ci-002d2-isolate-claude-invocation-failure.md`
- `docs/reviews/ci-002d2-invocation-analysis.md`

## Files modified

- `docs/handoffs/CURRENT.md` (this file)

No workflow changes have been made. `PROJECT_CONTEXT.md` is unchanged
(planning produces no durable verified facts yet).

## Validation

| Check | Result |
|---|---|
| `git diff --check` | Clean |
| Workflow YAML parse (local PyYAML) | Pass (read-only validation; file unchanged) |
| `claude_args` token reconstruction | Pass — four flag/value pairs |
| JSON Schema parse | Pass — valid 609-byte object schema |
| Forbidden-path diffs | Empty |

Build/gameplay diagnostics intentionally not run: no executable code changed.

## Preserved invariants

- CI-001, runtime, packages, manifests, lockfile, reviewer definitions:
  unchanged.
- No secret accessed or exposed; local Claude settings untouched.
- CI-003 remains blocked; PR-007 remains deferred.

## Open blockers and decisions

- None for planning. The experiment itself requires Product Architect
  authorization before any workflow edit.

## Next safe action

Product Architect review of the selected single-variable experiment
(remove `--json-schema`), then a scoped implementation task on a dedicated
branch with its own PR, post-merge diagnostic run, and CI-002D2V evidence
recording. Do not start CI-003.
