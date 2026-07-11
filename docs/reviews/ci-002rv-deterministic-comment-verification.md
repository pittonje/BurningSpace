# CI-002RV — Deterministic Comment Verification

## Reviewed state

- Base: `main` at `93569a3eb0093045409580ce1b5950de0a62e62f`.
- Branch: `ci/verify-deterministic-qa-comment`.
- PR #15 was merged before verification.
- `CLAUDE_CODE_OAUTH_TOKEN` was confirmed by name only; its value was never
  requested or accessed.
- Both workflows on the branch are byte-identical to `main` because neither is
  changed by this documentation-only PR.

## Verification PR

[PR #16 — CI-002RV — Verify Deterministic Claude QA Comment Delivery](https://github.com/pittonje/BurningSpace/pull/16)
is open and must not be merged. Its only changed paths before this report were
the CI-002RV task and current handoff documents.

## CI-001 result

- Initial run `29156077707`: passed on `c0f59d46a9d8a0bab1bbeddf4738147657703449`.
- Synchronize run `29156150194`: passed on
  `83ee53eb90e1eb758cf003d700d1443142fefdb1`.
- `.github/workflows/pr-checks.yml` is unchanged; its last change remains the
  CI-001 commit `dd04674`.

## Claude structured-output result

Failed on both attempts. OAuth input was present and masked, OIDC token
acquisition succeeded, GitHub App token exchange succeeded, Claude Code
2.1.207 installed and initialized with `claude-sonnet-5`, but each invocation
ended after one turn with `is_error: true`, `total_cost_usd: 0`, and no
`structured_output`. The action reported:
`--json-schema was provided but Claude did not return structured_output`.
With full output intentionally disabled, the underlying model/API error is not
available in the logs.

## Deterministic publisher result

The failure path worked on both attempts. Empty output was treated as data,
rejected by the validator, rendered into a sanitized failure body, posted by
`github-actions[bot]`, and followed by a failed job. Source inspection confirms
the publisher is the only `gh pr comment` call and its `GH_TOKEN` is scoped to
that step.

## First run

- Claude run: `29156077671`, failed.
- Reviewed HEAD: `c0f59d46a9d8a0bab1bbeddf4738147657703449`.
- Exactly one comment: `4946763213`.
- The comment contains the four required headings in order and the exact HEAD
  SHA, but it is the automation-failure comment rather than a valid review.

## Synchronize run

- Claude run: `29156150151`, failed in the same way.
- Reviewed HEAD: `83ee53eb90e1eb758cf003d700d1443142fefdb1`.
- Exactly one new comment: `4946796873`.
- CI-001 independently passed.

## Comment count

Two completed Claude workflow runs produced exactly two top-level comments,
one per run. There are zero inline review comments and zero submitted reviews.
No zero-comment success occurred; neither Claude run succeeded.

## Commit binding

Each failure comment contains its own trusted event HEAD SHA and workflow-run
URL. The first comment binds to `c0f59d4`; the second binds to `83ee53e`.

## Read-only proof

The PR contains only user-authored documentation commits. GitHub inspection
found no labels, reviews, inline review comments, issue events, or `claude/*`
branches. The only observed GitHub mutations attributable to the workflow are
the two expected top-level comments from `github-actions[bot]`. The Claude
tool allowlist contains only repository reads plus `gh pr view` and
`gh pr diff`; file write tools are explicitly disallowed.

## Stale-run protection

The first run completed before the synchronize push, so live cancellation of
an in-progress run was not exercised. No additional comment for the old SHA was
created after synchronization. Static inspection confirms PR-aware
`cancel-in-progress: true` and the publisher's live HEAD/state/draft re-check,
but the cancellation race path remains unobserved in CI-002RV.

## Secret safety

The secret name was listed without reading its value. Workflow logs mask OAuth
and GitHub token inputs as `***`; comments contain only trusted SHAs, run URLs,
and sanitized categories. No token value or authorization header was observed
in inspected logs, comments, or changed files.

## Security review

The required external `security-reviewer` invocation was attempted read-only,
but the managed environment rejected sending private repository documents to
the external Claude service. Safe local source/evidence inspection found the
intended security boundaries intact, but this does not substitute for the
required named reviewer.

## QA review

The named external reviewer was not invoked after the same managed-environment
policy blocked external review. Local evidence confirms CI-001, one failure
comment per run, heading order, and commit binding; the valid-output happy path
did not occur.

## Architecture review

The named external reviewer was not invoked after the same managed-environment
policy blocked external review. Static inspection still shows reasoning and
publication separated, CI-001 independent, and no CI-003 implementation.

## Acceptance criteria

| Criterion | Result |
|---|---|
| CI-001 green and unchanged | Pass |
| OAuth/OIDC/App authentication | Pass |
| `qa-reviewer` invocation reaches valid structured output | Fail |
| Exactly one publisher comment per completed run | Pass (failure path only) |
| Four headings in order | Pass (failure comments only) |
| Current SHA binding | Pass |
| No reviewer mutation beyond publisher | Pass from observed evidence |
| No secret exposure | Pass from inspected evidence |
| Synchronize behavior | Partial; second current run observed, cancellation not exercised |
| Required named manual reviews | Fail; managed-environment policy blocked external invocation |
| Forbidden paths unchanged | Pass |

## Remaining limitations

- The valid structured-output/happy-path review comment is still unproven.
- The underlying Claude error is hidden by `show_full_output: false`; logs show
  only `is_error: true`, one turn, zero cost, and absent structured output.
- Cancellation of an actively running stale run was not observed.
- Required named external reviews could not be run under the managed policy.

## Final status

**Failed.** CI-002RV did not prove the valid structured-output path in either
run. CI-003 remains blocked. The deterministic failure publisher itself behaved
correctly and CI-001 remained green, but those partial successes do not meet the
task's full acceptance criteria.

