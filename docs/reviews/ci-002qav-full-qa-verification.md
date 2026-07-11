# CI-002QAV — Full Claude QA Verification

## Reviewed state

- Base: `main` at PR #18 merge commit `829007a`, additionally carrying
  planning commit `00788f6` (CI-002D2 planning; no workflow change).
- Branch: `ci/reverify-full-claude-qa`.
- Verification HEAD: `ffaf3f1da1bf20897a7232720491b24507848f08`.
- Workflow is fully unchanged: `--agent qa-reviewer`, `--json-schema`,
  read-only tools, safe diagnostics, deterministic validator/publisher all
  present exactly as on `main`.

## Verification pull request

[PR #20 — CI-002QAV — Re-verify Full Claude QA](https://github.com/pittonje/BurningSpace/pull/20)
is open and must not be merged automatically.

## CI-001

Run `29163795945` — conclusion **success**, commit `ffaf3f1`, event
`pull_request`. Independent of the Claude QA result below.

## Claude authentication

OAuth token accepted; the run reached `"type": "system", "subtype": "init"`
before any turn executed, consistent with successful OIDC/App-token
exchange and Claude Code initialization (unchanged from all prior runs).

## Claude invocation

| Property | Previous failure (CI-002DV, run `29157358557`) | Current run (`29163795990`) |
|---|---:|---:|
| Turns | 1 | **25** |
| Cost (USD) | 0 | **0.4173757** |
| `is_error` | `true` | **`false`** |
| Result subtype | `success` | `success` |
| Permission denials | 0 | **10** |
| Duration | — | 86230 ms |
| Session ID | present | present |
| Structured output | absent | **absent** |
| Safe diagnostic category | `unknown_safe_error` | **`structured_output_error`** |

The token-exhaustion hypothesis is **not supported** by this run: Claude
executed a full, genuinely multi-turn review (25 turns, non-trivial cost,
`is_error: false`), which is inconsistent with an exhausted-token failure
mode and is instead comparable in scale to the last known-good CI-002V runs
(18–19 turns). The failure this time is specific and directly stated by the
Action itself in its own log, not inferred:

> `--json-schema was provided but Claude did not return structured_output. Result subtype: success`

This is the Action's own explicit error message (safe — no prompt, tool
output, or transcript content), and it is the most direct evidence yet
obtained on this whole investigation: a complete, successful review ran to
completion, but its output did not conform to the `--json-schema` contract,
so the Action itself failed the step on that specific, named condition.

## Validator

`Validate and render QA review` step: `structured_output` was empty, so
`parse_and_validate` raised `ValidationError("structured output is empty or
whitespace-only")` as designed; `render_failure` produced the sanitized
failure body; step concluded `success` (by design — `if: always()`, and the
exit code is captured for the publisher, not asserted here).

## Published comment

Exactly one top-level comment, ID `4948323012`, posted by
`github-actions[bot]` at `2026-07-11T18:39:09Z`. Contains all four required
headings in order (`## Blockers`, `## Important suggestions`,
`## Minor suggestions`, `## Approval status`), binds to
`ffaf3f1da1bf20897a7232720491b24507848f08`, states failure category
"structured output is empty or whitespace-only," and exposes no raw
diagnostic detail. Confirmed via `gh api .../issues/20/comments` —
exactly one comment total, no duplicates.

## Read-only proof

Zero files, commits, or branches created by Claude. Zero inline reviews or
labels. The PR contains only the two user/session-authored documentation
commits. The only GitHub mutation observed is the one expected comment.

## Secret safety

No OAuth/GitHub token, Authorization header, cookie, or environment value
observed unmasked. No raw prompt, tool output, or execution transcript was
retrieved — only the Action's own scalar result fields (`type`, `subtype`,
`is_error`, `duration_ms`, `num_turns`, `total_cost_usd`,
`permission_denials_count`) and its one explicit, self-contained error
sentence were read from the job log, consistent with the safe-diagnostics
boundary already established in CI-002D/CI-002DV.

## Result

**Full QA still failing.**

Not the same immediate failure as before (one turn, zero cost) — this run
is a materially different and more informative failure: a complete,
non-trivial, non-zero-cost review that fails specifically and explicitly
at structured-output extraction. The Success criteria (structured output
present, validator accepts, one valid QA comment posted, no automation-
failure comment) are not met; the Failure criteria's literal
one-turn/zero-cost/no-structured-output signature also does not exactly
match, but "another functional failure prevents a valid QA result" applies
directly, and the task file's own text requires classification of anything
short of full success as "Full QA still failing" or "Inconclusive" — this
is not inconclusive, since strong, specific, self-reported evidence exists.

## Decision regarding PR #19

Per the task file's decision rule for a still-failing result: **leave PR
#19 open, do not modify either workflow, do not run the schema-removal
experiment yet.** This verification's evidence in fact substantially
strengthens PR #19's original hypothesis — the Action itself now names the
`--json-schema` structured-output path as the exact failure point, on a run
that proves the underlying model/entitlement/turn-execution path works
correctly. Whether to proceed with PR #19's schema-removal experiment, or
select a more targeted structured-output remedy given this new evidence, is
a Product Architect decision, not this task's to make.

## Remaining limitations

- The GitHub Step Summary body remains outside this session's direct
  retrieval path; the Action's own explicit error line in the job log
  substituted for it here and is arguably stronger evidence (it is the
  Action's own stated reason, not an inferred category).
- Whether `structured_output_error` under a genuine multi-turn/non-zero-cost
  run and the earlier `unknown_safe_error` under one-turn/zero-cost runs
  share one root cause or are two distinct defects is not established.
- No root cause is claimed as confirmed beyond the Action's own quoted
  statement; this is the proximate failure point, not necessarily the
  underlying reason Claude's response omitted structured output.

## Next safe action

Product Architect review of this evidence and decision on how to proceed:
continue PR #19's schema-removal experiment (now more strongly motivated),
select an alternative structured-output remedy, or request further
diagnostics. Do not merge PR #20. Do not merge PR #19. Do not implement
CI-003.
