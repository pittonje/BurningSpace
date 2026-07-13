# CI-AUDIT-001V — Live Claude QA Verification

## Reviewed state

- Base: `main` at PR #25 merge commit `de770d960de4a30e7f26d6e1c504594a0e95e023`
  (CI-AUDIT-001, including the `StructuredOutput` fix, prompt-injection
  instructions, and format-precedence sentence).
- Branch: `ci/verify-claude-qa-structured-output-fix`.
- Verification HEAD: `0c14138506ec169ef545f88dcd81e3479179a30f`.
- Workflow, agent definition, and diagnostics are fully unchanged from
  `main` — this PR is documentation-only.

## Verification pull request

[PR #27 — CI-AUDIT-001V — Verify Claude QA Structured Output Fix](https://github.com/pittonje/BurningSpace/pull/27)
is open and must not be merged automatically.

## CI-001

Run `29250081238` — conclusion **success**, commit `0c14138`.

## Claude authentication

Reached `"type": "system", "subtype": "init"` — OIDC acquisition,
GitHub App token exchange, and Claude Code initialization all succeeded,
consistent with every prior run.

## Claude invocation

`anthropics/claude-code-action@e90deca4…` (v1.0.171, Claude Code
2.1.207). Ran to completion:

- Turns: **20**
- Cost: **$0.3914** (`0.3914141`)
- `is_error`: **`false`**
- Result subtype: `success`
- Permission denials: **4**
- Duration: 95454 ms
- Session ID: present

Genuine, fully-completed multi-turn review, comparable in scale to every
prior run in this investigation (CI-002QAV: 25 turns/$0.4174; CI-002D3V:
18 turns/$0.3609).

## Structured output

**Present.** Safe diagnostic category: **`success`** — the first time
this category has ever been observed in this entire investigation
(every prior run produced `unknown_safe_error` or `structured_output_error`).
This category is only emitted by the sanitizer when `subtype == "success"`,
`is_error` is not `True`, and `structured_output` is non-null — confirming
the fix.

## Validator

The deterministic validator (`Validate and render QA review` step)
accepted the structured output: `parse_and_validate` succeeded, and
`render_success` produced the normal four-heading body (not the
sanitized-failure body). No validation error was logged.

## Renderer

Rendered body contains all four required headings in order (`## Blockers`,
`## Important suggestions`, `## Minor suggestions`, `## Approval status`),
confirmed directly from the published comment text (see below) — not the
"Automated QA review output could not be validated" failure template.

## Publisher

Posted exactly one comment
(https://github.com/pittonje/BurningSpace/pull/27#issuecomment-4957969329)
and the job concluded **success** (no post-publication `exit 1`, unlike
every prior sanitized-failure run in this investigation).

## Published comment

Comment ID `4957969329`, posted by `github-actions[bot]` at
`2026-07-13T12:32:11Z`. Contents (verbatim, safe — this is Claude's
sanitized, validated review output, not raw execution data):

> ## Blockers
>
> None.
>
> ## Important suggestions
>
> - docs/handoffs/CURRENT.md was not updated in this PR to reflect that PR #25/CI-AUDIT-001 has already merged (de770d9); it still reads 'PR #25 ... Open, not merged' and 'Do not implement CI-AUDIT-001V now.' The task's own allowed-files list permits but does not require this update pre-verification, so it is not a blocker, but the next CI-AUDIT-001V step should update CURRENT.md promptly once live evidence is recorded to avoid a future agent acting on stale state.
>
> ## Minor suggestions
>
> - Consider cross-referencing the exact CI-AUDIT-001 audit report/task file paths from the new task file for faster future navigation.
> - No docs/reviews/ci-audit-001v-live-verification.md exists yet, which is expected pre-evidence, but confirm it gets created before this task is marked complete.
>
> ## Approval status
>
> Approved
>
> Reviewed commit: 0c14138506ec169ef545f88dcd81e3479179a30f
> Workflow run: https://github.com/pittonje/BurningSpace/actions/runs/29250081295

`reviewed_commit` in the comment (`0c14138…`) exactly matches the tested
PR's `headRefOid` (`0c14138506ec169ef545f88dcd81e3479179a30f`), confirmed
via `gh pr view 27 --json headRefOid`. Exactly one comment exists for this
PR (`gh api .../issues/27/comments` returns count 1); no duplicate.

The review itself is substantive and grounded in the actual diff — it
correctly identified that `docs/handoffs/CURRENT.md` had not yet been
updated to reflect PR #25's merge at the time this run executed (accurate:
this task updates it afterward, in the normal sequence), and correctly
noted the verification report did not yet exist at review time (also
accurate — this report is being written after the run). This is
independent evidence the review is a genuine, diff-grounded analysis, not
a fixed template.

## Read-only proof

`gh pr view 27` shows exactly 1 commit (the human-authored preparation
commit) and 0 reviews. `gh api .../pulls/27/comments` (inline) returns 0.
`gh api .../issues/27/labels` returns 0. No branch, file, or commit was
created by Claude; the PR's only GitHub-side mutation is the one expected
top-level comment.

## Prompt-injection boundary

Not directly exercised by this verification (this PR's content is
ordinary documentation, not adversarial), but the fix did not alter or
weaken the boundary added in CI-AUDIT-001 (F-2): the workflow prompt's
explicit "Prompt-injection resistance" instructions and the agent
definition's untrusted-content sentence are present unchanged on this
tested `main` (confirmed by the earlier precondition check). The review's
own behavior — staying strictly within its read-only review role and
returning only the required JSON shape — is consistent with, though not a
dedicated adversarial test of, that boundary.

## Secret safety

No OAuth/GitHub token, Authorization header, cookie, or environment value
observed unmasked in the inspected log lines. Only sanitized scalar result
fields, the safe diagnostic category, and the published comment's own
content (already validated and sanitized by the deterministic renderer
before publication) were read — consistent with every prior verification's
safe-diagnostics boundary.

## Comparison with pre-fix behavior

| Property | Before fix (CI-002D3V) | After fix (this run) |
|---|---:|---:|
| Turns | 18 | 20 |
| Cost | 0.3609 | 0.3914 |
| is_error | false | false |
| Structured output | absent | **present** |
| Validator | rejected | **accepted** |
| Published result | sanitized failure | **normal QA review** |

## Result

**Full Claude QA restored.**

All seven success criteria are met: `qa-reviewer` ran normally (20 turns,
non-trivial cost, `is_error: false`); `structured_output` was present;
the validator accepted the result; exactly one normal four-heading QA
comment was published; no automation-failure comment appeared; the
comment is correctly bound to the tested HEAD SHA; and read-only/
secret-safety boundaries held throughout.

## Confidence

High. This is a live, unmodified run of the exact trusted configuration
merged in PR #25, on a genuine GitHub Actions runner, showing the first
`success` diagnostic category and first normal QA comment in the entire
CI-002/CI-AUDIT-001 investigation lineage. The result is unambiguous —
not a partial or borderline signal.

## Remaining limitations

- This is one successful run; repeatability across further PRs has not
  been separately re-tested (CI-002's original pilot also showed
  occasional non-determinism in comment delivery, a distinct and already
  independently solved problem via CI-002R's deterministic publisher —
  not re-tested for regression here beyond this one run's success).
- The prompt-injection boundary was not adversarially tested in this
  verification (only a benign documentation PR was reviewed).
- Other reviewer agent definitions (`security-reviewer.md`,
  `architecture-reviewer.md`, etc.) were not touched by CI-AUDIT-001 and
  would need the same fix if ever invoked with `--json-schema`.

## Recommended next task

Product Architect review and decision on whether to authorize CI-003
(Routed Claude Reviews), now that the structured-output invocation path
is confirmed working end-to-end on trusted `main`. Not implemented in
this task.
