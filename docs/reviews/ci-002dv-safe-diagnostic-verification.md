# CI-002DV — Safe Claude Diagnostic Verification

## Reviewed state

- Base: `main` at PR #17 merge commit `eaf65c8`.
- Branch: `ci/verify-safe-claude-diagnostics`.
- Verification HEAD: `111fe111688de2987b79266a80f3ebd2e0e629cf`.
- Workflows and runtime are unchanged by this documentation-only PR.

## Verification pull request

[PR #18 — CI-002DV — Verify Safe Claude Invocation Diagnostics](https://github.com/pittonje/BurningSpace/pull/18)
is open and must not be merged automatically.

## CI-001 result

Run `29157358527` passed. `npm ci`, build, typecheck, profile compatibility,
network callback, movement, and combat steps all succeeded. Existing runtime
warnings were informational and unchanged.

## Claude workflow result

Run `29157358557` used the trusted workflow from `main`. OIDC acquisition,
GitHub App token exchange, Claude Code installation, and initialization
succeeded. Claude returned no structured output. The safe diagnostic step
succeeded, the deterministic renderer succeeded, the publisher posted the
sanitized failure comment, and the job failed after publication.

## Safe diagnostic summary

Allowlisted evidence observed without raw execution-file access:

| Field | Value |
|---|---|
| Action SHA | `e90deca47693f9457b72f2b53c17d7c445a87342` |
| Claude Code version | `2.1.207` |
| Execution file | Present |
| Final record type | `result` |
| Final subtype | `success` |
| `is_error` | `true` |
| Turn count | `1` |
| Total cost | `0` |
| Permission denial count | `0` |
| Structured output present | No |
| Session ID present | Yes |
| Normalized category | `unknown_safe_error` |
| Safe error code / HTTP status | Unavailable in inspected safe output |

The committed sanitizer step completed successfully and logged exactly one
category. GitHub REST returned no Step Summary body, and the in-app browser
runtime could not start; therefore each rendered Step Summary cell could not be
independently inspected through a second channel.

## Confirmed facts

- Authentication and Claude initialization work.
- An execution file was written and accepted by the committed sanitizer.
- The result is an error despite subtype `success`, with one turn and zero cost.
- Structured output is absent.
- Safe diagnostics execute without breaking deterministic failure publication.

## Normalized diagnostic category

`unknown_safe_error`.

## Confidence

High confidence that this is the category emitted by the committed sanitizer
and that the allowlisted metadata does not contradict it. Low confidence about
the underlying root cause because the category is intentionally non-specific.

## Remaining uncertainty

The safe metadata does not distinguish model/entitlement, named-agent loading,
schema interaction, CLI/SDK compatibility, provider request/response, managed
settings, or Action extraction causes. The Step Summary table was not directly
retrievable with available tooling.

## Deterministic failure comment

Exactly one top-level comment (`4947003599`) was posted by
`github-actions[bot]`. It contains the four required headings in order, binds
to `111fe111688de2987b79266a80f3ebd2e0e629cf`, exposes no diagnostic detail
beyond the established safe failure category, and precedes the failed job.
There is no duplicate for this run.

## Secret-safety verification

| Check | Result |
|---|---|
| OAuth token exposed | No observed value |
| GitHub token exposed | No observed value |
| Authorization credential exposed | No observed value |
| Cookie exposed | No observed value |
| Untrusted prompt content exposed | No |
| Raw execution transcript exposed | No |
| Environment dump present | No |

Workflow-configured instructional text and safe warnings may mention field
names such as authorization or `show_full_output`; no credential value or raw
transcript was observed.

## Read-only verification

The PR contains one user-authored documentation commit. GitHub inspection found
zero inline review comments, submitted reviews, labels/events, or `claude/*`
branches. The only workflow mutation is the one expected top-level comment.

## Local Security Review

Approved with the Step Summary retrieval limitation. See
`docs/reviews/ci-002dv-local-security-review.md`.

## Local QA Review

Approved with the same limitation. See
`docs/reviews/ci-002dv-local-qa-review.md`.

## Local Architecture Review

Approved. See `docs/reviews/ci-002dv-local-architecture-review.md`.

## Acceptance criteria

| Criterion | Result | Evidence |
|---|---|---|
| CI-001 passes independently | Pass | Run `29157358527` |
| Trusted workflow/auth/init | Pass | Run `29157358557` safe logs |
| Diagnostic step executes | Pass | Step 4 succeeded |
| Step Summary allowlist | Partial | Committed sanitizer succeeded; body unavailable via API/browser |
| No secret/raw transcript exposure | Pass from inspected evidence | Logs, comment, diff audit |
| Exactly one normalized category | Pass | `unknown_safe_error` |
| Category supported | Pass, non-specific | Error result metadata has no more specific safe indicator |
| One sanitized failure comment | Pass | Comment `4947003599` |
| Job fails after comment | Pass | Publisher step/job failed |
| No zero-comment/duplicate path | Pass | One comment for one run |
| No workflow/runtime change | Pass | Forbidden diffs empty |
| CI-003 remains blocked | Pass | Task/context/handoff |

## Final status

**Safe but inconclusive.** The diagnostic path executed safely and produced a
supported normalized category, but `unknown_safe_error` does not identify the
underlying invocation failure and the Step Summary body could not be directly
retrieved for complete second-channel inspection.

## Recommended follow-up

**CI-002D2 — Refine Safe Unknown-Error Diagnostics.** One narrowly scoped task
should add further allowlisted structural metadata or one minimal safe A/B
experiment without exposing raw content. Do not start CI-003.

