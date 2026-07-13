# CI-002D3V — Verify Simplified Claude QA Schema

## Goal

Verify the trusted Claude QA workflow on `main`, now carrying the simplified
`--json-schema` from CI-002D3 (PR #21, merged as `e94965c`), on a normal
post-merge pull request.

## Starting evidence

CI-002QAV (pre-simplification): 25 turns, cost $0.4174, `is_error: false`,
`permission_denials_count: 10`, `structured_output` absent. The Action's own
log stated `--json-schema was provided but Claude did not return
structured_output. Result subtype: success`. CI-002D3 removed exactly 9
nonessential schema constraints (`maxItems` ×3, `maxLength` ×5, `pattern`
×1), preserving all six output fields, their types, `required`, and
`additionalProperties: false`. The deterministic validator is unchanged.

## Decision rule

- **Valid `structured_output` appears**, validator accepts it, exactly one
  normal QA comment is published, no failure comment appears → **schema
  constraint path implicated**.
- **Claude session runs normally** (progresses beyond the earlier immediate
  failure) but **`structured_output` remains absent**, validator rejects
  the empty result, exactly one sanitized failure comment is published →
  **simplified schema exonerated**; the next candidate experiment is
  removing only `--agent qa-reviewer` (not implemented in this task).
- **Cancellation, provider outage, authentication failure, missing
  diagnostic evidence, or contradictory metadata** → **inconclusive**.

The decisive signal is the presence or absence of valid `structured_output`.
Turn count and cost are supporting evidence only.

## Scope

Documentation only.

## Allowed files

- `docs/tasks/ci-002d3v-verify-simplified-claude-schema.md`
- `docs/reviews/ci-002d3v-verification.md`
- `docs/handoffs/CURRENT.md`
- `PROJECT_CONTEXT.md` only after a conclusive result

## Forbidden files

- `.github/workflows/**`
- `apps/**`
- `packages/**`
- `package.json`
- `package-lock.json`
- TypeScript configuration files
- `assets/**`
- `.claude/agents/**`

## Non-goals

- No workflow, runtime, or dependency change.
- No implementation of the next candidate experiment (`--agent` removal).
- No CI-003 implementation.
- Do not merge this verification PR.
