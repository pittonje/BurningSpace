# CI-002R — Security Review

Reviewer: `security-reviewer` (manual, read-only)
Reviewed state: branch `ci/deterministic-qa-comment-delivery`, working tree
on `main` @ `4c3de975b464a0752e09720b40466b6b35b021ac` with the CI-002R
workflow modification and documentation as uncommitted changes (reviewed
pre-commit by design; scope re-verified against the real commit range
before the PR was opened).

## Blockers

None.

## Important suggestions

- **Unhandled exception path in the embedded Python renderer could defeat
  the "always exactly one comment" guarantee.** `main()` originally wrapped
  only `parse_and_validate` in `try/except ValidationError`, leaving the
  `render_success` call outside it. `render_success` can raise
  `ValidationError` via its `MAX_TOTAL_LEN` check; an uncaught exception
  there would leave `comment.md` unwritten and the publisher step would
  fail the job **without posting any comment** — a loud (red check) but
  still zero-comment outcome. Confirmed currently unreachable (worst-case
  render at current schema limits ≈ 30,000 chars vs. the 60,000 cap), so a
  latent robustness gap, not an active exploit. Recommended a catch-all
  `except Exception` fallback that still writes a sanitized failure
  comment.
- **`docs/handoffs/CURRENT.md` and `PROJECT_CONTEXT.md` were not yet
  updated for the in-progress CI-002R work** — a process/traceability gap,
  not a security issue.

## Minor suggestions

- `git diff main...HEAD` was empty at review time because nothing was
  committed yet; the real change was working-tree-only. Noted so future
  reviewers are not misled.
- No `.gitattributes` pins line endings for `.github/workflows/*.yml` and
  the local repo has `core.autocrlf=true`; the current file and the `main`
  blob both contain zero CR bytes, so there is no live problem, but a
  future checkout/commit cycle on Windows could plausibly introduce CRLF
  into the heredoc-delivered embedded Python. Consider `*.yml text eol=lf`.
- The `render_review` step intentionally omits `set -e` (so a nonzero
  `python3` exit doesn't abort before `exit_code` is captured) — correct
  but subtle; an inline comment was recommended.
- The 41-case matrix never exercised the `MAX_TOTAL_LEN` overflow branch;
  either add a case or document its provable unreachability.

## Approval status

**Approved with suggestions.** All requested verification points held:
`Bash(gh pr comment:*)` fully removed from `--allowedTools` (not merely
narrowed); `Write`/`Edit`/`NotebookEdit` disallowed; publisher uses only
trusted `github.event.pull_request.number`/`github.repository` context;
`STRUCTURED_OUTPUT` flows exclusively via `env:` and is only ever
`json.loads`-parsed as data, never executed or spliced into a
`${{ }}`-expanded `run:` fragment; `GH_TOKEN: ${{ github.token }}` scoped
via `env:` to the publisher step only; no secret value or raw PR-controlled
content in any validator error message or the sanitized failure comment
(every `ValidationError` message site traced); `pull_request_target`
absent; job-level `if:` gate byte-identical to `main`; permissions block
unchanged and minimal; `id-token: write` serves only the documented
CI-002-era OIDC/GitHub-App exchange; stale-run protection logically
correct; `show_full_output` remains at its `false` default; both pinned
SHAs (`e90deca4…` = `claude-code-action` `v1.0.171`, `df4cb1c0…` =
`actions/checkout` `v6.0.3`) independently verified against the GitHub API.
Scope clean — only the workflow file plus allowed documentation changed.

## Disposition (post-review fixes applied)

- Catch-all `except Exception` added to `main()`: any unanticipated
  exception now writes the sanitized failure comment (exception type name
  only — never the message) and exits 1. Verified by new matrix case 45.
- Inline comment added to the render step explaining the deliberate
  absence of `set -e`.
- `MAX_TOTAL_LEN` unreachability documented explicitly in the architecture
  document's test-matrix section.
- `.gitattributes` intentionally **not** added — it is not on this task's
  allowed-files list; recorded as a candidate follow-up in the handoff
  instead. Verified the committed blob remains LF-only.
- `CURRENT.md` / `PROJECT_CONTEXT.md` updated as part of this task's
  documented completion steps.
