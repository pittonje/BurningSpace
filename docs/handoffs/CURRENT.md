# BurningSpace Current Handoff

Last updated: 2026-07-11
Updated by: Claude — CI-002D2 implementation complete

## Repository state

- Base branch: `main` (origin at `829007a`, PR #18 merge commit)
- Active branch: `ci/isolate-claude-schema-failure`
- Planning commit: `00788f6` — docs: define CI-002D2 invocation experiment
  (created on local main, carried onto this branch)
- Implementation commit: the single child of `00788f6` with subject
  "ci: isolate Claude schema invocation failure"
- Working tree: clean after commit
- Pull request: to be recorded after creation (see PR section below once
  updated by the post-PR handoff commit)

## Current task

- Task ID: `CI-002D2`
- Task title: Isolate Claude Invocation Failure
- Task file: `docs/tasks/ci-002d2-isolate-claude-invocation-failure.md`
- Analysis: `docs/reviews/ci-002d2-invocation-analysis.md`
- Status: Implementation complete, post-merge experiment pending

## Selected experiment and exact change

Experiment B (Product Architect approved): remove exactly the
`--json-schema` flag and its 609-byte schema value from `claude_args` in
`.github/workflows/claude-qa-review-pilot.yml`. One line removed; nothing
else changed. Post-edit reconstruction confirms `claude_args` contains
exactly `--agent qa-reviewer`, the unchanged read-only `--allowedTools`
list, and the unchanged `--disallowedTools` list — no `--json-schema`, no
`--model`, no new tool permissions, no debug flags.

## Validation results

| Check | Result |
|---|---|
| `git diff --check` | Clean |
| Workflow YAML parse (local PyYAML) | Pass — 5 steps |
| `claude_args` token reconstruction | Pass — exactly 3 unchanged pairs |
| Workflow diff review | Exactly one line removed |
| Forbidden-path diffs vs origin/main | Empty |
| Focused local security review | Pass — read-only tools intact, no secret handling changed, `show_full_output` remains false, deterministic publication untouched, one-line exact rollback |

Build/movement/combat/network diagnostics intentionally not run — no
runtime code changed; CI-001 validates remotely.

## Expected behavior and interpretation rules

Without `--json-schema`, `structured_output` may remain absent, so even a
successful Claude execution still produces one sanitized failure comment
and a failed job — that does not invalidate the experiment. The validator
was deliberately not modified to compensate. Interpretation happens only
in CI-002D2V from safe metadata: multi-turn or non-zero cost implicates
the schema path; an unchanged one-turn zero-cost `is_error: true` failure
exonerates it and makes `--agent` removal the next single-variable
candidate. A Claude failure on this self-modifying-workflow PR itself is
NOT the experiment result (the action skips itself pre-merge).

## Files changed on this branch

- `.github/workflows/claude-qa-review-pilot.yml` (one line removed)
- `docs/tasks/ci-002d2-isolate-claude-invocation-failure.md`
  (implementation checkpoint)
- `docs/reviews/ci-002d2-invocation-analysis.md` (implementation
  conformance)
- `docs/handoffs/CURRENT.md` (this file)

`PROJECT_CONTEXT.md` deliberately unchanged — the experiment is not
verified yet.

## Preserved invariants

- CI-001 workflow, runtime, packages, manifests, lockfile, reviewer
  definitions: unchanged.
- `pull_request` only; same-repo/owner/non-draft gates; minimal
  permissions; OAuth/OIDC; concurrency; stale-run protection; sanitized
  failure comments; `show_full_output: false` — all unchanged.
- No secret accessed or exposed; local Claude settings untouched.
- CI-003 remains blocked; PR-007 remains deferred.

## Open blockers and decisions

- None. No root-cause conclusion is claimed.

## Next safe action

Human review and merge of the CI-002D2 pull request, followed by
CI-002D2V — Verify Claude Invocation Without JSON Schema (documentation-
only post-merge verification). Do not implement CI-002D2V now. Do not
start CI-003.
