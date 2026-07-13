# CI-AUDIT-001V — Live Verification of Claude QA Structured Output Fix

## Goal

Exercise the trusted, merged Claude QA configuration (PR #25, merge
commit `de770d9`) on a normal pull request to confirm whether the
`StructuredOutput` tools-allowlist fix actually restores
`structured_output` on a live GitHub Actions run.

## Starting evidence

Every Claude QA run since CI-002RV — including CI-002QAV (25 turns,
$0.4174, `is_error: false`) and CI-002D3V (18 turns, $0.3609,
`is_error: false`, post schema-simplification) — completed a genuine
multi-turn review but never produced `structured_output`, with the
Action's own log stating `--json-schema was provided but Claude did not
return structured_output. Result subtype: success`. CI-AUDIT-001 found
the root cause locally: the `qa-reviewer` agent's explicit `tools:`
allowlist implicitly excluded the CLI's internal `StructuredOutput` tool.
Fixed by adding it; confirmed in 8 local reproductions (E1–E8a) on the
identical pinned Claude Code CLI version (2.1.207), but never yet
exercised on a live GitHub Actions run of the merged configuration — the
action self-skips on any PR whose workflow copy differs from `main`, so
PR #25 itself could not prove its own fix.

## Success criteria

1. `qa-reviewer` runs normally (OIDC + App-token exchange succeed, CLI
   initializes, turns execute).
2. `structured_output` is present.
3. The deterministic validator accepts the result.
4. Exactly one normal four-heading QA comment is published.
5. No sanitized automation-failure comment is published.
6. The comment is bound to the tested PR's HEAD SHA.
7. Read-only and secret-safety boundaries hold.

## Failure criteria

`qa-reviewer` runs but `structured_output` is absent; the validator
rejects the result; a sanitized failure comment is published instead; or
another reproducible functional defect prevents normal QA output. This
task does not modify the implementation if this occurs — it records the
result and returns to the Product Architect.

## Inconclusive criteria

Cancellation, provider outage, authentication failure unrelated to the
fix, missing evidence, or contradictory metadata.

## Scope

Documentation only.

## Allowed files

- `docs/tasks/ci-audit-001v-live-verification.md`
- `docs/reviews/ci-audit-001v-live-verification.md`
- `docs/handoffs/CURRENT.md`
- `PROJECT_CONTEXT.md` only after a conclusive result

## Forbidden files

- `.github/workflows/**`
- `.github/scripts/**`
- `.claude/agents/**`
- `apps/**`
- `packages/**`
- `package.json`
- `package-lock.json`
- `vitest.config.ts`
- `assets/**`

## Non-goals

- No workflow, agent, runtime, dependency, or test change.
- No new root-cause claim.
- No CI-003 implementation.
- Do not merge this verification PR.
