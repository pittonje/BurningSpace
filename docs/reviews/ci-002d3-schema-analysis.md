# CI-002D3 — Claude QA Schema Analysis

## Reviewed state

- Branch: `ci/simplify-claude-qa-schema`, based on `main` at
  `04a903bf5119873653bccd0d5a957bbff1404c21` (PR #20 merge commit).
- Only `.github/workflows/claude-qa-review-pilot.yml` is modified, and only
  the `--json-schema` value within it.

## Starting evidence

CI-002QAV (PR #20, run `29163795990`): 25 turns, cost $0.4174,
`is_error: false`, result subtype `success`, `permission_denials_count: 10`,
session ID present — a genuine, fully-completed multi-turn review.
`structured_output` was absent. The Action's own log stated:

> `--json-schema was provided but Claude did not return structured_output. Result subtype: success`

## Original constraints

Parsed with a real JSON parser from the committed `claude_args`. Six
properties, all required, `additionalProperties: false`. Per-field keywords:

| Field | Structural keywords (preserved) | Nonessential constraints (candidates) |
|---|---|---|
| `blockers` | `type: array`, `items.type: string` | `maxItems: 20`, `items.maxLength: 500` |
| `important_suggestions` | `type: array`, `items.type: string` | `maxItems: 20`, `items.maxLength: 500` |
| `minor_suggestions` | `type: array`, `items.type: string` | `maxItems: 20`, `items.maxLength: 500` |
| `approval_status` | `type: string` | `maxLength: 100` |
| `reviewed_commit` | `type: string` | `pattern: "^[0-9a-f]{40}$"` |
| `summary` | `type: string` | `maxLength: 2000` |

Top-level: `type: object`, `additionalProperties: false`, `required` (six
entries) — all structural, all preserved.

Total: 9 nonessential constraint instances (3 `maxItems`, 5 `maxLength`,
1 `pattern`). This is well above the stop-condition threshold (schema
already minimal), so the experiment proceeds.

## Removed constraints

- `maxItems: 20` — removed from `blockers`, `important_suggestions`,
  `minor_suggestions`.
- `maxLength: 500` — removed from each of those arrays' `items`.
- `maxLength: 100` — removed from `approval_status`.
- `maxLength: 2000` — removed from `summary`.
- `pattern: "^[0-9a-f]{40}$"` — removed from `reviewed_commit`.

No keyword outside this list was touched.

## Preserved contract

Exact six field names, `required` list, `additionalProperties: false`,
`type: object`, per-field base types (`array`/`string` for the three
suggestion fields, `string` for the other three), and array `items.type:
string`. Verified programmatically (see Validation, below) — no field
added, removed, renamed, or made optional; no type changed.

## Validator compatibility

The deterministic in-workflow validator (`Validate and render QA review`
step) is **byte-for-byte unchanged** by this PR and remains the
authoritative gate regardless of what the generation-time schema permits:

- `MAX_ITEMS = 20` — still enforced in `validate_array` for all three arrays.
- `MAX_ITEM_LEN = 500` — still enforced per array item.
- `MAX_APPROVAL_LEN = 100` — still enforced on `approval_status`.
- `MAX_SUMMARY_LEN = 2000` — still enforced on `summary`.
- `SHA_RE = r"^[0-9a-f]{40}$"` plus the `reviewed_commit == expected_sha`
  binding check — still enforced on `reviewed_commit`.
- All character-safety checks (control/bidi/invisible-character denylist),
  duplicate-key rejection, UTF-8 strictness, and the fail-closed
  `additionalProperties`/`required` checks in `parse_and_validate` are
  unchanged.

This is the key distinction this experiment relies on: the JSON Schema
passed to `--json-schema` only constrains what the *model* is asked to
produce at generation time; the workflow's own Python validator
independently re-checks every one of these same limits on whatever text
actually comes back, before anything is rendered or published. Removing the
generation-time constraints cannot allow an oversized, malformed, or
mis-bound comment to reach a PR — the validator would reject it exactly as
before and produce the same sanitized failure comment.

## Security impact

None negative. No permission, tool, secret-handling, publication, or
authentication change. The one component whose enforcement authority
matters for security (the validator) is untouched and remains the sole
authoritative gate on published content.

## Expected outcomes

1. **Structured output appears** → the schema *constraint* path (item/length
   limits or the SHA regex) is implicated as the reason generation failed;
   if more than one constraint class was removed, a further narrowing
   experiment would be needed to isolate which one, though that is out of
   this task's scope.
2. **Structured output remains absent** → the simplified schema is
   exonerated; the next single-variable candidate is removing only
   `--agent` (per the CI-002D2 candidate list), not further schema changes.
3. **Inconclusive** (cancellation, provider outage, insufficient safe
   evidence) → no next experiment authorized without further Product
   Architect direction.

## Focused local review

Local CI-002D3 Review — performed by Claude Code during implementation.

- Confirmed only schema constraints changed in executable configuration
  (workflow diff below is a single-line replacement of the `--json-schema`
  value; no other line touched).
- Confirmed the output shape (six fields, types, required list,
  `additionalProperties: false`) is unchanged.
- Confirmed the validator still enforces item count, item length, summary
  length, approval length, and the reviewed-commit SHA format and binding,
  independently of the schema.
- Confirmed read-only tool restrictions, permissions, `show_full_output:
  false`, authentication, safe diagnostics, renderer, and publisher are all
  untouched.
- Confirmed deterministic single-comment publication remains intact —
  nothing in this change affects the publisher step.
- Rollback is exact: restoring the five constraint keyword groups to their
  prior values and positions reproduces the original schema string exactly
  (verified by diffing the removed substrings against the pre-change blob).

## Remaining uncertainty

- Whether any of the three constraint classes (`maxItems`, `maxLength`,
  `pattern`) — individually or in combination — is actually responsible for
  the missing structured output is not established; this experiment tests
  all three simultaneously as one "nonessential constraints" variable per
  the authorized scope, not each independently.
- Whether the underlying issue is in the CLI/SDK's structured-output
  request construction, the model's handling of a JSON Schema this shape,
  or something else entirely remains unknown until post-merge evidence
  exists.
- No root cause is claimed as confirmed by this analysis.
