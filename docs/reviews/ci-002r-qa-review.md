# CI-002R — QA Review

Reviewer: `qa-reviewer` (manual, read-only)
Reviewed state: branch `ci/deterministic-qa-comment-delivery`, working tree
on `main` @ `4c3de975b464a0752e09720b40466b6b35b021ac` with the CI-002R
workflow modification and documentation as uncommitted changes (reviewed
pre-commit by design; scope re-verified against the real commit range
before the PR was opened).

Independent verification performed by the reviewer: every cited run ID,
SHA, conclusion, `permission_denials_count`, `num_turns`, and
`total_cost_usd` value in the forensics document was re-checked live
against GitHub and matched exactly; the single PR #14 comment ID/timestamp/
body matched; the workflow-validation-skip log text was confirmed in the
live logs for runs `29150963058` and `29151025479`; the pinned
`claude-code-action` source's `--json-schema` → `core.setFailed` behavior
was confirmed at the pinned SHA; the embedded Python renderer was
extracted verbatim, byte-compiled, and driven with ~25 payloads spot-
checking the matrix — all matched the documented table; all six base
project checks were independently re-run and passed.

## Blockers

None found.

## Important suggestions

1. **`render_success` failure path not caught in `main()`** — same finding
   as the security review; a latent path that could produce a loud
   zero-comment failure. Confirmed unreachable under current schema
   constants (worst-case render ≈ 30,281 chars vs. the 60,000 cap) but
   fragile against future limit increases.
2. **Forensics doc header/content mismatch**: "six-way classification"
   introduced a list of five items; the sub-classification also did not
   explicitly address every candidate cause class from the brief
   (specifically "transient MCP startup failure").
3. **`docs/handoffs/CURRENT.md` and `PROJECT_CONTEXT.md` stale** relative
   to the actual branch/task state at review time.
4. **Nothing committed yet**, so the task's own `git diff main...HEAD`
   scope-verification commands returned empty against the working tree;
   scope must be re-verified against the real commit range after commit.
5. **Reviewer-routing artifacts required by the task did not yet exist**
   (`ci-002r-security-review.md`, `ci-002r-qa-review.md`,
   `ci-002r-architecture-review.md`).

## Minor suggestions

- The invisible/bidi denylist did not cover U+2028/U+2029 line/paragraph
  separators, U+2060 word joiner, or U+00AD soft hyphen (confirmed by
  direct execution that U+2028 passed validation). Assessed as not
  practically exploitable for ATX heading-spoofing on GitHub (cmark-gfm
  does not treat U+2028 as a block-level line break) but a completeness gap
  worth closing.
- The "Contributing structural cause (confirmed...)" bullet sat under
  "Probable causes" rather than "Confirmed facts".
- `validate_string`'s `isinstance(value, bool)` clause is dead code
  (a Python `bool` is never `isinstance(..., str)`); harmless.

## Manual verification checklist

- [x] Commit the working-tree changes and re-run the scope-verification
      diffs against the real commit range (done before the PR was opened;
      see `docs/handoffs/CURRENT.md`).
- [x] Resolve the "six-way classification" mismatch in the forensics doc
      (reworded to "five determinations, the fifth selecting among seven
      candidate classifications", and all seven classes now addressed
      explicitly, including transient MCP startup failure — rejected, since
      no MCP comment server was ever registered).
- [x] Update `docs/handoffs/CURRENT.md` and `PROJECT_CONTEXT.md` for
      CI-002R.
- [x] Produce the three reviewer artifacts named in the task's routing
      (this file and its two siblings).
- [x] Harden the `render_success`/`main()` exception path (catch-all added;
      verified by new matrix case 45).
- [ ] After merge: run CI-002RV on a normal subsequent PR to prove the
      `if: always()` render/publish chain, the stale/closed/draft live
      re-check, the exactly-one-comment guarantee, and the sanitized-
      failure-plus-job-fail path on a live runner (cannot be proven
      pre-merge — GitHub's workflow-validation guard skips a PR's modified
      workflow file until it matches `main`; independently confirmed in the
      live logs of runs `29150963058` and `29151025479`).
- [ ] Confirm zero secret exposure on the first live CI-002RV run.

## Approval status

**Approved**, with important suggestions to address before commit/PR (none
rise to blocker level against the as-written code — the one latent
robustness gap was unreachable under current schema constants, and the
documentation-accuracy items did not affect runtime behavior). The core
design is sound and unusually well-evidenced; every specific factual claim
checked in the forensics and architecture docs was independently verified
as accurate against live GitHub data and the pinned action source.
Forbidden files are genuinely untouched, and base project checks all pass
with no runtime diff.

## Disposition (post-review fixes applied)

- All five important suggestions addressed: catch-all exception fallback
  added (case 45); forensics doc classification section reconciled with all
  seven candidate cause classes; `CURRENT.md`/`PROJECT_CONTEXT.md` updated;
  changes committed and scope re-verified against the real commit range;
  the three reviewer artifacts created.
- The U+2028/U+2029/U+2060/U+00AD gap closed in the validator; new matrix
  cases 41–43b prove rejection. The structural-cause bullet moved to
  Confirmed facts (item 8). The denylists were additionally rewritten as
  `\u` escape sequences so they are visible and corruption-proof.
- The dead `isinstance(value, bool)` clause was left in place as harmless
  explicit intent, per the review's own "no action needed" assessment.
