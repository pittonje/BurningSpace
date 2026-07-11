# CI-002D2 — Claude Invocation Analysis

## Reviewed state

- `main` at PR #18 merge commit `829007ae9e78dee87b22017bd39fa3e0d9cf3d28`.
- Working tree clean before this planning task; no workflow modification is
  made by CI-002D2 planning.
- Inputs: CI-002D static reconstruction
  (`docs/reviews/ci-002d-invocation-diagnostics.md`), CI-002DV remote evidence
  (`docs/reviews/ci-002dv-safe-diagnostic-verification.md`), the current
  committed workflow, and a fresh local re-validation of the argument stream.

## Current invocation

`anthropics/claude-code-action@e90deca4…` (v1.0.171, pinning Claude Code
2.1.207) receives a workflow-owned prompt and `claude_args` that parse —
re-verified this session with a POSIX tokenizer against the committed YAML —
into exactly four flag/value pairs: `--agent qa-reviewer`, one
`--allowedTools` list (read-only + two scoped `gh` reads), one
`--disallowedTools` list, and one 609-byte `--json-schema` value that parses
as a valid JSON object schema (six required fields,
`additionalProperties: false`). No explicit `--model` or max-turns; the
trusted agent definition supplies alias `sonnet`, observed by the action as
`claude-sonnet-5`.

## Confirmed valid components

- YAML structure and literal-block scalars (parsed cleanly this session).
- Argument boundaries (four clean pairs; no splitting or quoting defect).
- JSON Schema syntax and transport (valid JSON; no fences, newlines, or
  continuation characters).
- Flag existence: `--json-schema`, `--agent`, `--allowedTools`,
  `--disallowedTools` are all documented flags of CLI 2.1.207, verified
  against a local installation of the identical version. An unknown-flag
  pre-request crash is excluded.
- Authentication, initialization, execution-file write, safe diagnostics,
  and deterministic publication (proven across CI-002RV/CI-002DV).

## Suspicious components

- `--json-schema` runtime handling in headless OAuth mode, alone or in
  interaction with `--agent`: it is the only invocation input absent from the
  last known-good executions (CI-002V runs `29151662011`/`29151923628`,
  18–19 turns, non-zero cost) and present in every failing execution
  (one turn, zero cost, `is_error: true`).
- Secondary, lower-prior suspects that the same evidence cannot yet exclude:
  model/entitlement rejection of the structured-output request shape, and an
  action-level result-extraction defect that misreports an early failure.

## Candidate experiment comparison

| # | Variable | Supporting evidence | Diagnostic value | Security impact | Preserves deterministic publication |
|---|---|---|---|---|---|
| A | Remove `--agent` | Agent×schema interaction untested anywhere | Medium — tests interaction, not the new input itself | None | Yes |
| B | Remove `--json-schema` | Only delta from last known-good configuration | High — implicates or exonerates the new input directly | None (validator remains authoritative) | Yes — absent structured output produces the standard single failure comment |
| C | Minimal inline prompt, keep schema | None specific | Medium | None | Yes, but changes two variables (prompt + agent) |
| D | Explicit `--model` | Alias worked in CI-002V | Low prior | None | Yes |
| E | Remove tool flags | Tools worked in CI-002V | Low | Negative — weakens read-only boundary | Yes |
| F | Minimal no-tools prompt + schema | None specific | Medium | Negative (as E) | Yes, but multi-variable |
| G | Upgrade action/CLI | Upstream fixes plausible | Medium but unfocused | New SHA requires trust review | Yes |

## Recommended experiment

**B — remove the `--json-schema` argument from `claude_args`; change nothing
else.** One line removed, one-line rollback.

## Why only one variable changes

Every failing run differs from every known-good run by this one invocation
input at identical action SHA, CLI version, agent, tool mechanism, and model
alias. Changing anything else simultaneously (prompt, agent, tools, model,
version) would make either outcome unattributable. A/B-style multi-variable
minimization is explicitly rejected for this iteration.

## Security impact

None negative. The JSON Schema was a defense-in-depth constraint on Claude's
output shape; the workflow's own embedded validator — unchanged — remains the
authoritative gate (strict field, type, length, character, and SHA-binding
checks) before anything reaches a PR comment. Read-only tools, minimal
permissions, gates, `show_full_output: false`, and workflow-owned publication
are untouched.

## Expected outcomes

1. **Multi-turn, non-zero cost, `is_error: false`, diagnostic category
   `success`, structured output absent** → schema path implicated with high
   confidence; follow-up targets the structured-output mechanism (e.g.,
   prompt-only JSON relying on the validator, alternate schema transport, or
   a reviewed action upgrade). The run still ends with one sanitized failure
   comment (structured output is absent by design of the experiment), which
   is expected and documented.
2. **Unchanged one-turn, zero-cost failure** → schema exonerated; next
   single-variable candidate (A, then D) with the same method.
3. **Any new distinct category** from the safe sanitizer → follow the more
   specific evidence.

No outcome is interpreted as a confirmed root cause by itself; each outcome
selects the next narrowest step.

## Rollback

Re-add the single `--json-schema` line (exact value preserved in Git
history). No other component depends on the flag.

## Remaining uncertainty

- The root cause is not confirmed; `--json-schema` involvement is the highest-
  prior hypothesis, not an established fact.
- Whether CLI 2.1.207's structured-output path misbehaves specifically under
  OAuth headless mode cannot be determined statically.
- The Step Summary body remains unavailable via REST for second-channel
  inspection; the sanitized job-log category and safe metadata remain the
  primary evidence channel for the experiment.
