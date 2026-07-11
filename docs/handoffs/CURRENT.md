# BurningSpace Current Handoff

Last updated: 2026-07-11
Updated by: Claude — CI-002R handoff to Codex

## Repository state

- Base branch: `main` (at `4c3de975b464a0752e09720b40466b6b35b021ac`)
- Active branch: `ci/deterministic-qa-comment-delivery`
- Upstream: `origin/ci/deterministic-qa-comment-delivery` (in sync)
- Stable work checkpoint: `8e2fae0805e28c210d7fe1c3a20d6198d7aa530b`
  ("ci: record render exit code under GitHub's default errexit shell")
- Expected handoff-only child: one commit with subject
  "docs: hand off CI-002R to Codex" containing only this file
- Working tree: clean after handoff
- Pull request: [#15 — CI-002R — Deterministic Claude QA Comment Delivery](https://github.com/pittonje/BurningSpace/pull/15)
- Pull request state: Open, not merged, MERGEABLE

## Current task

- Task ID: `CI-002R`
- Task title: Deterministic Claude QA Comment Delivery
- Task file: `docs/tasks/ci-002r-deterministic-comment-delivery.md`
- Status: In progress — handed off to Codex

## Goal

Replace model-controlled PR comment publication in the Claude QA Review
Pilot with deterministic, workflow-owned publication: Claude returns strict
structured JSON only (no comment/write/commit/push capability), and a
deterministic workflow step validates it, renders the four required
headings, and posts exactly one top-level comment — or one sanitized
failure comment plus a failed job when the output is invalid.

## Completed work

All evidence-backed; note this handoff supersedes an earlier assumption
that execution stopped near task section 15 — repository and GitHub
evidence shows implementation actually completed through section 30:

- Preflight completed (PR #14 merged as `4c3de97`; branch created from
  synced `main`).
- All 5 historical pilot runs inspected; forensic comparison of runs
  `29151662011` (no comment) and `29151923628` (comment posted) completed.
- Action source inspected at the exact resolved SHA (`e90deca4…` =
  v1.0.171); permission denials analyzed; upstream issues correlated.
- Forensic report completed: `docs/reviews/ci-002r-comment-delivery-forensics.md`.
- Task file created; architecture document completed.
- Workflow fully modified (structured output via `--json-schema`,
  comment tool removed from Claude, embedded Python validator/renderer,
  deterministic publisher with stale-run protection, actions pinned to
  exact SHAs).
- Local parser/renderer test matrix run: 47/47 pass against the Python
  extracted verbatim from the committed workflow.
- YAML parse, `bash -n`, `py_compile`, `git diff --check`, expression
  audit: all pass.
- Base project validation run: build, typecheck, protocol-profile,
  network callback, movement, combat — all pass.
- Scope verification: all forbidden-path diffs empty against the real
  commit range.
- Manual reviews run and stored with dispositions: Security (approved w/
  suggestions), QA (approved), Architecture (approved w/ suggestions) —
  zero blockers; all accepted corrections applied and re-validated.
- Five narrow commits created and pushed; PR #15 opened (open, unmerged).
- Live pre-merge evidence on PR #15: the merge-gated Claude-step skip
  exercised the deterministic failure path end-to-end (exactly one
  sanitized four-heading comment per run posted by `github-actions[bot]`,
  job failed loudly). Run `29154108613` exposed a real defect (GitHub's
  default `bash -e` shell aborted the render step before `exit_code` was
  recorded; the `${RENDER_EXIT_CODE:-1}` fail-safe held the contract);
  fixed in `8e2fae0` and confirmed working in run `29155243847` (render
  step green, publisher posts then fails the job by design).

## Partial work preserved

None — no partial artifacts exist. Every created file is in its completed,
reviewed form. Codex may edit any allowed-path file if the Product
Architect requests changes on PR #15.

## Files created

- `docs/tasks/ci-002r-deterministic-comment-delivery.md`
- `docs/reviews/ci-002r-comment-delivery-forensics.md`
- `docs/reviews/ci-002r-security-review.md`
- `docs/reviews/ci-002r-qa-review.md`
- `docs/reviews/ci-002r-architecture-review.md`
- `docs/architecture/claude-review-comment-delivery.md`

## Files modified

- `.github/workflows/claude-qa-review-pilot.yml`
- `PROJECT_CONTEXT.md`
- `docs/handoffs/CURRENT.md` (this file)

## Validation already completed

| Check | Result | Evidence |
|---|---|---|
| Renderer/parser adversarial matrix (47 cases) | Pass | Results table in `docs/architecture/claude-review-comment-delivery.md` |
| `python -m py_compile` on extracted embedded script | Pass | Extraction verified byte-identical to committed workflow |
| `bash -n` on both extracted shell steps | Pass | Local run |
| YAML parse (PyYAML, local-only) | Pass | 4 steps, valid structure |
| `git diff --check` | Pass | Clean |
| Build / typecheck / protocol-profile / network callback / movement / combat | Pass | Local runs; only the known pre-existing Vite chunk warning |
| Forbidden-path diffs vs `main` | Empty | `apps`, `packages`, manifests, lockfile, tsconfig, `.claude/agents`, `pr-checks.yml` |
| Security / QA / Architecture reviews | Approved, no blockers | `docs/reviews/ci-002r-{security,qa,architecture}-review.md` |
| CI-001 on PR #15 | Pass | Runs `29154108623`, `29155243821` |
| Deterministic failure path, live | Pass | Runs `29154108613`, `29155243847`; comments `4946158186`, `4946424192` |

## Validation not completed

- Happy-path remote verification (valid structured output → validated
  review comment): impossible pre-merge — Anthropic's action skips itself
  while the workflow file differs from `main`. This is CI-002RV's job.
- Post-merge verification (CI-002RV): not started, requires PR #15 merged
  first.

## Confirmed findings

- Both forensic runs used identical action SHA, CLI version, workflow and
  agent blobs; the run with *more* permission denials (5 vs 4) is the one
  that posted the comment.
- Comment delivery was 100% delegated to Claude's own
  `Bash(gh pr comment:*)` call; no MCP comment server was registered; the
  action's job-success signal is decoupled from the comment side effect
  with no retry/fallback.
- Root cause: primarily prompt/agent-output variability, amplified by that
  structural decoupling (full confidence labels in the forensic report).

## Remaining uncertainty

- Exact denied command strings in the forensic runs are unrecoverable
  (`show_full_output: false`, no artifacts).
- The `--json-schema` happy path is proven from source inspection and the
  action's own docs/examples, but not yet observed live in this repository
  (pre-merge gating); CI-002RV must confirm it.

## Preserved invariants

- CI-001 unchanged; runtime unchanged; package manifests unchanged;
  lockfile unchanged; reviewer definitions unchanged.
- Secrets not accessed or exposed; `.claude/settings.local.json` local,
  ignored, untracked, unmodified.
- CI-003 unauthorized; PR-007 unauthorized.

## Open blockers and decisions

- None for the branch itself.
- Awaiting Product Architect decision on PR #15 (human review and merge).
- Candidate follow-up (out of scope, from security review): a
  `.gitattributes` entry pinning LF for `.github/workflows/*.yml`.

## Next safe action

Codex reads the task file and this handoff, verifies Git state, and — since
every implementation section (1–30) is complete and evidenced — does **not**
resume implementation. The actual next steps are outside Codex's unilateral
authority:

1. Product Architect reviews and merges PR #15 (or requests changes, which
   Codex would then implement on this branch within the task's allowed
   files).
2. After merge: CI-002RV — Verify Deterministic Claude QA Comment Delivery
   (a new documentation-only task; do not start it without a scoped task
   file).

## Codex resume rules

1. Verify branch, stable checkpoint (`8e2fae0`) and the single
   handoff-only child commit ("docs: hand off CI-002R to Codex").
2. Verify clean working tree.
3. Read the active task file.
4. Inspect only current CI-002R diffs and related documentation.
5. Do not repeat completed forensics without a concrete contradiction.
6. Do not resume implementation — it is complete; act only on PR #15
   review feedback or a new Product Architect instruction.
7. Preserve all forbidden-path constraints.
8. Do not implement CI-003 or PR-007. Do not merge PR #15.
