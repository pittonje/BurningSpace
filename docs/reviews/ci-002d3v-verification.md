# CI-002D3V — Simplified Claude QA Schema Verification

## Reviewed state

- Base: `main` at PR #21 merge commit `e94965c6012ee4d64b50125d29f6f0fc36844ee7`.
- Branch: `ci/verify-simplified-claude-schema`.
- Verification HEAD: `2a1ed27eaaf187cf905dd59337b17adcca49fd73`.
- Workflow is fully unchanged from `main`: simplified six-field
  `--json-schema` (no `maxItems`/`maxLength`/`pattern`), `--agent
  qa-reviewer`, read-only tools, safe diagnostics, deterministic
  validator/publisher all present exactly as merged in PR #21.

## Verification pull request

[PR #22 — CI-002D3V — Verify Simplified Claude QA Schema](https://github.com/pittonje/BurningSpace/pull/22)
is open and must not be merged automatically.

## CI-001

Run `29165055788` — conclusion **success**, commit `2a1ed27`. Independent
of the Claude QA result below.

## Claude invocation

`anthropics/claude-code-action@e90deca4…` (v1.0.171, Claude Code 2.1.207).
Reached `"type": "system", "subtype": "init"` (OIDC + App-token exchange +
initialization all succeeded, consistent with every prior run), then ran to
completion:

- Turns: **18**
- Cost: **$0.3609** (`0.36087959999999997`)
- `is_error`: **`false`**
- Result subtype: `success`
- Permission denials: **6**
- Duration: 85722 ms
- Session ID: present

This is a genuine, fully-completed multi-turn review — the same class of
result as the pre-simplification CI-002QAV run (25 turns, $0.4174), and not
the earlier one-turn/zero-cost immediate-failure signature. The
invocation clearly progresses normally with the simplified schema.

## Structured output

**Absent.** The Action logged the identical explicit error as before the
schema simplification:

> `--json-schema was provided but Claude did not return structured_output. Result subtype: success`

Safe diagnostic category: `structured_output_error` — the same category
CI-002QAV observed pre-simplification.

## Validator

`Validate and render QA review` step: `structured_output` was empty, so
`parse_and_validate` raised `ValidationError("structured output is empty or
whitespace-only")` exactly as designed; `render_failure` produced the
sanitized failure body.

## Published comment

Exactly one top-level comment, ID `4948447526`, posted by
`github-actions[bot]` at `2026-07-11T19:21:27Z`, bound to
`2a1ed27eaaf187cf905dd59337b17adcca49fd73`. Confirmed via
`gh api .../issues/22/comments` — one comment total, no duplicates. Job
failed loudly after publication (`Process completed with exit code 1`).

## Comparison

| Property | Before simplification (CI-002QAV) | After simplification (this run) |
|---|---:|---:|
| Turns | 25 | 18 |
| Cost | 0.4174 | 0.3609 |
| is_error | false | false |
| Permission denials | 10 | 6 |
| Structured output | absent | absent |
| Validator | rejected | rejected |

Both runs share the identical qualitative signature: genuine multi-turn
completion, `is_error: false`, no `structured_output`, same explicit Action
error message, same safe diagnostic category. Turn count, cost, and
permission-denial count differ (as expected for independent LLM sessions
reviewing different diffs) but are not diagnostically significant — the
decisive signal, `structured_output` presence, is unchanged.

## Read-only proof

Zero files, commits, or branches created by Claude. Zero inline reviews or
labels. The PR contains only the one preparation documentation commit. The
only GitHub mutation observed is the one expected failure comment.

## Secret safety

No OAuth/GitHub token, Authorization header, cookie, or environment value
observed unmasked. Only the Action's own scalar result fields and its
explicit, self-contained error sentence were read from the job log — same
safe-diagnostics boundary as all prior verifications.

## Experiment conclusion

**Simplified schema exonerated.**

Removing the nonessential JSON Schema constraints (`maxItems`, `maxLength`,
`pattern`) did not restore `structured_output`. The invocation ran normally
end-to-end (comparable turn count and cost to the pre-simplification run),
ruling out both token exhaustion and the specific schema constraints tested
as causes. The next candidate experiment per the CI-002D2/CI-002D3
decision-tree lineage is removing only `--agent qa-reviewer`, keeping
`--json-schema` (now simplified), the prompt, tools, and all other
invocation variables unchanged. This task does not implement that
experiment.

## Confidence

High confidence in the negative result itself: two independent runs (25
turns/$0.4174 and 18 turns/$0.3609), both genuinely multi-turn and
non-trivial in cost, both `is_error: false`, both producing the identical
explicit Action error and the identical safe diagnostic category, with only
the schema's nonessential constraints differing between them. Low
confidence in any claim about which remaining invocation component
(`--agent`, prompt structure, or something else in the CLI/SDK's
structured-output request path) is actually responsible — that remains
untested.

## Remaining uncertainty

- Whether removing `--agent qa-reviewer` will change the outcome is
  untested; it is the next candidate by elimination, not a confirmed cause.
- Whether the underlying defect is in Claude Code CLI 2.1.207's
  structured-output request construction under OAuth headless mode,
  independent of any workflow-side argument, cannot be determined from
  safe metadata alone.
- No root cause is confirmed by this verification.

## Recommended next task

CI-002D4 — Isolate Claude Agent Definition (remove only `--agent
qa-reviewer`, keep `--json-schema` and all other invocation variables
unchanged). Not implemented in this task; requires Product Architect
authorization.
