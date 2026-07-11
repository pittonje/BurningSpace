# CI-002D3 — Simplify Claude QA Structured Output Schema

## Implementation checkpoint

- Product Architect authorized this schema-only experiment; PR #19 was
  closed as superseded (branch preserved) and PR #20 (CI-002QAV) is merged
  into `main` as `04a903b`.
- Implementation removes exactly the 9 nonessential constraint instances
  identified in `docs/reviews/ci-002d3-schema-analysis.md` (3 `maxItems`,
  5 `maxLength`, 1 `pattern`) from the `--json-schema` value; the diff
  against `main` touches exactly one line.
- All six fields, their base types, the `required` list, and
  `additionalProperties: false` are unchanged; verified programmatically.
- The deterministic validator (`Validate and render QA review` step) is
  byte-for-byte unchanged and remains the sole authoritative gate on
  published content, independently re-enforcing every limit the schema
  used to encode at generation time.
- Not yet post-merge verified — the modified workflow cannot exercise
  itself pre-merge.
- Rollback: restore the five removed constraint groups to their exact
  prior values (preserved in Git history at this branch's parent commit).

## Goal

Preserve the full Claude QA architecture (`qa-reviewer` agent, `--json-schema`,
prompt, model, read-only tools, deterministic validation/publication) while
testing whether one or more nonessential JSON Schema constraints are the
reason Claude never returns `structured_output`, by removing exactly those
constraints and nothing else.

## Starting evidence

CI-002QAV (PR #20, run `29163795990`) reached: 25 turns, cost $0.4174,
`is_error: false`, result subtype `success`, `permission_denials_count: 10`,
session ID present — a genuine, fully-completed multi-turn review comparable
in scale to the last known-good CI-002V runs. `structured_output` was still
absent. The Action's own log stated the reason directly:

> `--json-schema was provided but Claude did not return structured_output. Result subtype: success`

This rules out token exhaustion and confirms the model/entitlement/execution
path itself works; the unresolved question is specifically why the
`--json-schema`-constrained output was never produced.

## Hypothesis

One or more nonessential JSON Schema constraints (`maxItems`, `maxLength`,
`pattern`) may prevent the synthetic structured-output path from completing,
independent of the six-field output contract itself.

## Single changed variable

Schema constraints only. Nothing else in the invocation changes.

## Preserved architecture

- `--agent qa-reviewer`
- Identical prompt text
- Model behavior (agent alias `sonnet` → `claude-sonnet-5`)
- `--allowedTools` / `--disallowedTools` (unchanged read-only restriction)
- Action SHA `e90deca47693f9457b72f2b53c17d7c445a87342` (v1.0.171)
- Authentication (OAuth + OIDC + App token exchange)
- Safe diagnostics (`.github/scripts/sanitize-claude-diagnostic.py`)
- Deterministic validator, renderer, and publisher (all byte-unchanged)
- Concurrency, stale-run protection, permissions, `show_full_output: false`

## Original schema keywords

Full inventory in `docs/reviews/ci-002d3-schema-analysis.md`. Summary:
`type`, `additionalProperties`, `required`, `properties`, and per-field
`items` are structural (preserved). `maxItems` (3 occurrences), `maxLength`
(5 occurrences), and `pattern` (1 occurrence) are nonessential generation-time
constraints (candidates for removal).

## Removed schema keywords

- `maxItems: 20` on `blockers`, `important_suggestions`, `minor_suggestions`
- `maxLength: 500` on each array's `items`
- `maxLength: 100` on `approval_status`
- `maxLength: 2000` on `summary`
- `pattern: "^[0-9a-f]{40}$"` on `reviewed_commit`

## Resulting schema shape

Six required fields, unchanged names and base types
(`array`/`string`/`string`/`string`/`string`/`string` — arrays of strings for
the three suggestion fields), `additionalProperties: false`, no length/count/
pattern constraints. Exact JSON in
`docs/reviews/ci-002d3-schema-analysis.md`.

## Allowed files

- `.github/workflows/claude-qa-review-pilot.yml`
- `docs/tasks/ci-002d3-simplify-claude-qa-schema.md`
- `docs/reviews/ci-002d3-schema-analysis.md`
- `docs/handoffs/CURRENT.md`

`PROJECT_CONTEXT.md` is not modified before post-merge verification.

## Forbidden files

- `.github/workflows/pr-checks.yml`
- `apps/**`
- `packages/**`
- `package.json`
- `package-lock.json`
- TypeScript configuration files
- `assets/**`
- `.claude/agents/**`
- secrets and environment files
- CI-003 implementation

## Required checks

`git diff --check`; workflow YAML parse; extracted-schema JSON parse and
field/type/required/`additionalProperties` equality check against the
original; `claude_args` token reconstruction confirming only the schema value
changed; forbidden-path empty diffs. No build or gameplay diagnostics (no
runtime code changed).

## Stop conditions

- The current schema already contained only structural keywords (not the
  case here — see Constraint inventory).
- Any evidence of secret exposure.
- A second invocation variable would need to change for the experiment to
  run at all.
- The diagnostic run posts more than one comment, or no comment on a
  non-superseded run.

## Post-merge verification

The action skips itself while the workflow file differs from `main`, so this
experiment can only be exercised after merge, in a separate
documentation-only CI-002D3V PR, which must record: turn count, cost,
`is_error`, `structured_output` presence, safe diagnostic category, and
comment outcome.

## Rollback

Restore the exact removed keywords (preserved in Git history at this
branch's parent commit and in `docs/reviews/ci-002d3-schema-analysis.md`).
No other component depends on them.

## Decision tree

- **Structured output appears** → schema content/constraint path implicated;
  narrow further within the constraint set if more than one was removed.
- **Structured output remains absent** → simplified schema exonerated; next
  experiment removes only `--agent`.
- **Run inconclusive** (cancellation, provider outage, insufficient safe
  evidence) → no next experiment authorized; return to Product Architect.
