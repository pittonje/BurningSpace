# CI-002R — Architecture Review

Reviewer: `architecture-reviewer` (manual, read-only)
Reviewed state: branch `ci/deterministic-qa-comment-delivery`, working tree
on `main` @ `4c3de975b464a0752e09720b40466b6b35b021ac` with the CI-002R
workflow modification and documentation as uncommitted changes (reviewed
pre-commit by design; scope re-verified against the real commit range
before the PR was opened).

Independent verification performed by the reviewer: the embedded Python
validator was extracted from the workflow's `run:` block, dedented, and
executed directly against 22 spot-checked matrix cases — all matched the
documented expected outcomes; empty diffs confirmed for `apps/**`,
`packages/**`, `.claude/agents/**`, and `.github/workflows/pr-checks.yml`.

## Blockers

None found.

## Important suggestions

1. **Uncaught-exception path could still produce zero comments** — the
   `render_success` length check sits outside `main()`'s
   `try/except ValidationError`; the true worst-case render at schema
   maximums was computed at 30,510 characters (well under the 60,000 cap),
   so the branch is currently unreachable, but a catch-all fallback was
   recommended so the one-comment guarantee holds for unanticipated bugs
   too.
2. **`reviewed_commit` binding failed open, not closed**, when
   `expected_sha` was empty (`if expected_sha and ...` silently skipped the
   match check). Not currently exploitable (the value comes from trusted
   GitHub context) but fail-closed was recommended.
3. **`docs/handoffs/CURRENT.md` and `PROJECT_CONTEXT.md` still described
   only the CI-002V state** and needed a CI-002R entry before merge
   readiness.

## Minor suggestions

- The task file marked `network-reviewer` "Not applicable" without
  explicitly flagging the deviation from the routing matrix's closest row
  ("Deployment/environment configuration" defaults Network to
  Recommended); the substantive reason is correct, but the deviation should
  be recorded per `docs/agents/reviewer-routing.md`.
- Only 22 of the 41 documented cases were spot-checked (the harness is
  untracked by design); the checked subset matched exactly.
- The `--json-schema` → `structured_output` mechanism claim is asserted
  from source inspection and is not independently verifiable from inside
  this repo — correctly handled by requiring CI-002RV post-merge
  verification rather than treating it as proven.
- `BIDI_CONTROLS`/`INVISIBLE_CHARS` embedded literal invisible characters
  in source; an explanatory comment (or escapes) was suggested so future
  editors/linters don't corrupt them.

## Approval status

**Approved with suggestions — no blockers found.** Verified:
comment-posting capability fully absent from Claude's `--allowedTools`;
the deterministic publisher is the sole `gh pr comment` call site in the
file; CI-001 and CI-003/PR-007 scope untouched; `apps/**`, `packages/**`,
`.claude/agents/**` zero diff; the six-field structured-output contract is
a narrow internal CI schema with no gameplay/protocol coupling; failure
handling posts exactly one sanitized comment and fails the job
(independently confirmed via the extracted validator, not just prose);
stale/closed/draft runs skip silently via a live `gh pr view` re-check
that is a distinct code path from the invalid-output failure path; and
CI-002RV post-merge verification is explicitly and correctly deferred
rather than overclaimed.

## Disposition (post-review fixes applied)

- Catch-all `except Exception` added to `main()` (important #1); verified
  by new matrix case 45.
- `reviewed_commit` binding made fail-closed: `parse_and_validate` now
  rejects the payload outright when the expected head SHA is unavailable
  (important #2); verified by new matrix case 44.
- `CURRENT.md` and `PROJECT_CONTEXT.md` updated for CI-002R (important #3).
- The routing-matrix deviation for `network-reviewer` is now recorded
  explicitly in the task file's reviewer-routing section (minor #1).
- The bidi/invisible denylists were rewritten as `\u` escape sequences with
  explanatory comments (minor #4), which also closed the related QA-review
  gap by extending coverage to U+2028/U+2029/U+2060/U+00AD.
