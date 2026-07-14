# DOCARCH-002C3 — CI Routing Migration Conformance Review

Task: DOCARCH-002C3 — CI Routing Decision Migration (`docs/tasks/docarch-002c-architecture-process-decision-migration.md`)

Reviewed implementation commit: `77eeb23222849a1ceafb0c1ec4717fd25fa21476`

Pull request: #42

Branch: `docs/docarch-002c3-ci-routing-decision`

## Record conformance matrix

| Record | Decision exact match | Status | Owner | Date | Dependencies | Source evidence | Trusted-base execution | Fail-closed behavior | Commit binding | Stale-run protection | Routing skip versus approval distinction | Manual reviewer advisory status | Workflow-change non-goal | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `CI-003-D1` | Matches required meaning: deterministic classifier executed only from the PR's trusted base commit, never PR-head code; changed-file list consumed as JSON data; bounded fixed-vocabulary output with no raw paths; fail-closed on retrieval/classifier/schema/stale-state failures; only literal qa_required=false skips gated QA; skip is not approval; QA evidence bound to reviewed commit matching PR head; publish re-checks live head/state/draft and skips superseded runs; manual reviewer suggestions advisory; human merge authority unchanged | `accepted` | `Product Architect` | `2026-07-14` | `BS-PROC-001`, `BS-PROC-004` (correct) | All 11 cited paths exist and support the statement (CI-003 task, both workflows, both scripts, security review, Phase A/B, recovery report, BS-PROC-001/004) | `claude-qa-review-pilot.yml` checks out `github.event.pull_request.base.sha` into `trusted-ci` and runs only `trusted-ci/.github/scripts/classify-pr-risk.py`; record correctly disclaims changing the workflow | Fail-safe defaults written to `GITHUB_OUTPUT` before any network/parse/classifier work; retrieval_error, classifier_error, stale_pr_state mapped on failure; classifier `default_result` sets qa_required=true for empty_change_set and malformed_path; record uses non-exhaustive "include" wording | Validator rejects any `reviewed_commit` not equal to the expected PR head SHA (40-char lowercase hex, exact match) | Publish step re-queries live headRefOid, state, and isDraft and skips superseded/closed/drafted runs | All five Phase-2 steps gated on `steps.routing.outputs.qa_required != 'false'`; record states skip is a routing outcome, not approval, and green checks alone are not approval | Record states suggestions are advisory routing outputs that create no merge authority; Notes explicitly decline taxonomy canonization | Verification and Consequences explicitly state no workflow, script, setting, runtime, package, or CI-behavior change; Notes disclaim branch protection and QA-formatting fixes | MATCH |

## Product Architect

Verdict: APPROVED FOR HUMAN MERGE

Findings: No blockers. Approval accepts the independent Security/CI + Architecture review verdict of APPROVED WITH NON-BLOCKING NOTES. The non-blocking wording clarification follow-up is deferred to DOCARCH-002C4.

Reviewed commit: `755cf4bea5a13843127a0ddef205738fa0b32a99`

Evidence source: PR #42 comment by the human project owner (`pittonje`), https://github.com/pittonje/BurningSpace/pull/42#issuecomment-4970588069

Date: 2026-07-14

PR comment URL: https://github.com/pittonje/BurningSpace/pull/42#issuecomment-4970588069

Quoted verdict: "Product Architect verdict: APPROVED FOR HUMAN MERGE."

## Security/CI Reviewer

Verdict: APPROVED

Findings: Trusted-base execution — the record's central claim is verified: `claude-qa-review-pilot.yml` checks out `${{ github.event.pull_request.base.sha }}` into `trusted-ci/` with the pinned checkout Action and executes only `trusted-ci/.github/scripts/classify-pr-risk.py` for live routing; no PR-head classifier or workflow code determines routing. Fail-closed behavior — the routing step writes qa_required=true, risk_level=unknown, and reason_codes=["classifier_error"] to `GITHUB_OUTPUT` before any fallible operation; retrieval failures, jq schema-validation failures of both the paginated files payload and the classifier result, live/event SHA mismatch (stale_pr_state), changed-file count mismatch, and >3000-file truncation all return early with QA required; the classifier's `default_result` keeps qa_required=true for empty_change_set and malformed_path, and its output vocabulary (8 risk areas, 12 reason codes, 6 reviewer names, boolean flags, validated SHAs) matches both the jq allowlist and the record's bounded-output claim; no raw changed path reaches stdout, outputs, or summaries. Commit binding — the render-step validator rejects any reviewed_commit that is not a 40-character lowercase hex SHA exactly equal to the expected PR head, and fails closed when the expected SHA is unavailable. Stale-run protection — the publish step re-checks live headRefOid, state, and isDraft via `gh pr view` and skips superseded, closed, or drafted runs before commenting. Skip versus approval — exactly the five Phase-2 steps are gated on `qa_required != 'false'`, so only the literal false output skips; a skip posts no comment and constitutes no approval, and an approving verdict exists only inside a validated, SHA-bound published comment. `pr-checks.yml` runs `test-classify-pr-risk.py` and `test-claude-qa-audit.py` on every PR, auditing the trusted checkout, token scope, gating, pins, and permissions. CI-003V Phase A (PR #33, qa_required=false, five steps skipped, zero comments) and Phase B (PR #34, qa_required=true, full pipeline, one SHA-bound approved comment) provide live evidence for both routing paths. C3 changes no file under `.github/**`; the record makes no claim of workflow or script change and none occurred.

Reviewed commit: `77eeb23222849a1ceafb0c1ec4717fd25fa21476`

Evidence source: Read-only inspection of `.github/workflows/claude-qa-review-pilot.yml`, `.github/workflows/pr-checks.yml`, `.github/scripts/classify-pr-risk.py`, `.github/scripts/test-classify-pr-risk.py`, `.github/scripts/sanitize-claude-diagnostic.py`, `docs/reviews/ci-003-security-review.md`, `docs/reviews/ci-003v-phase-a.md`, `docs/reviews/ci-003v-phase-b.md`, and the PR #42 diff (`git diff origin/main...HEAD`)

Date: 2026-07-14

## Architecture Reviewer

Verdict: APPROVED

Findings: CI-003-D1 records the accepted CI-003 routing architecture (`docs/tasks/ci-003-risk-based-reviewer-routing.md` "Accepted architecture" and "Security invariants") without authority drift. The record stays at decision altitude: it fixes the trusted-base execution boundary, data-only changed-file transport, bounded output contract, fail-closed semantics, literal-false skip rule, commit binding, stale-run protection, and the advisory status of reviewer suggestions, while explicitly not freezing future CI policy, not canonizing a reviewer taxonomy, and not claiming any workflow behavior change. Governance layering is correct: as an accepted decision it sits above operational and evidence documents and defers merge authority to BS-PROC-001 and review-evidence preconditions to BS-PROC-004, both correctly declared as dependencies; no dependency on BS-PROC-002 is claimed and none is needed. The dependency graph is acyclic. The record does not convert the CI-003 task's implementation detail (exact path rules, test matrix) into decision text, keeping the classifier contract with the task and evidence layers where it belongs. Scope is clean at exactly 6 changed paths with no forbidden file touched.

Reviewed commit: `77eeb23222849a1ceafb0c1ec4717fd25fa21476`

Evidence source: Read-only inspection of `docs/GOVERNANCE.md`, `docs/decisions/CI-003-D1.md`, `docs/decisions/BS-PROC-001.md`, `docs/decisions/BS-PROC-004.md`, `docs/tasks/ci-003-risk-based-reviewer-routing.md`, and the PR #42 diff

Date: 2026-07-14

## Documentation consistency review

Verdict: APPROVED

Findings: `CI-003-D1.md` uses the exact `DECISION_TEMPLATE.md` section order (Status → Date → Owner → Scope/domain → Decision → Rationale → Consequences → Supersedes → Superseded by → Depends on → Source evidence → Verification → Notes) with `Status: accepted`, `Owner: Product Architect`, `Date: 2026-07-14`, `Supersedes: none`, `Superseded by: none`, and the required Notes line stating the Date records Product Architect migration approval (DOCARCH-002C); no original decision date is invented. All 11 source-evidence paths exist. `DECISION_INDEX.md` changes are limited to one additive `CI-003-D1` row (accepted, correct scope and dependencies) plus replacement of the pending-CI-003-D1 section with a C4-pending section; all 29 pre-existing accepted rows and the reserved and unrecovered ranges are byte-unchanged; exactly 30 files contain `Status: accepted`, exactly 30 accepted index rows exist, each ID appears exactly once, and no `AGENT-004.md` file exists. `README.md`'s single-sentence status update names C3 complete and C4 pending, still points to `DECISION_INDEX.md`, and duplicates no registry content. The task file records C1 completed/merged via PR #40, C2 completed/merged via PR #41, C3 active in this PR, C4 pending, the exact one-ID C3 set, the C3 allowed/forbidden scope matching the actual diff, the five required reviewer roles plus human-only merge, the BS-PROC-004 evidence rule, DOCARCH-002D as separate post-C4 reconciliation, AGENT-004/portability deferral to DOCARCH-005, and no workflow/script/setting/CI-bug change; it also relabels the C1-era validation section as historical, resolving the C2 review's non-blocking note. `CURRENT.md` marks PR #41/C2 merged and closed, names C3 active on `docs/docarch-002c3-ci-routing-decision`, points to the C task file, claims neither C3 merged nor C4 active, lists the correct required review roles, and contains exactly one Next safe action. This review artifact's skeleton carried all required reviewer sections with no pre-filled verdicts and no field requiring a commit to self-reference its own SHA. Non-blocking note: the Consequences sentence "Governance, agent, handoff, workflow, dependency, and production paths require QA unless the accepted classifier contract says otherwise" could be misread as covering `docs/GOVERNANCE.md`, which the accepted classifier contract classifies as `documentation_only` (the contract's "governance documents" set is `AGENTS.md`, `CLAUDE.md`, `PROJECT_CONTEXT.md`, `docs/agents/**`, `docs/handoffs/CURRENT.md`); the trailing deference clause keeps the sentence accurate, but a future C-stage edit could name the set explicitly.

Reviewed commit: `77eeb23222849a1ceafb0c1ec4717fd25fa21476`

Evidence source: Read-only inspection of the 6-path diff, `docs/decisions/**`, `docs/tasks/**`, `docs/handoffs/CURRENT.md`, `.github/scripts/test-classify-pr-risk.py`, and historical review artifacts

Date: 2026-07-14

## Claude QA

Verdict: Approved

Findings: No blockers and no important suggestions. Two non-blocking minor suggestions: (1) Product Architect and Claude QA verdict rows in this review artifact were blank by design pending each role's own review; the deterministic workflow, not this file, is the system of record for the Claude QA verdict, so the blank rows should not be mistaken for missing review. (2) The Documentation consistency review's own non-blocking note (possible misreading of the CI-003-D1 Consequences sentence listing governance/agent/handoff/workflow/dependency/production paths as requiring QA) is reasonable; a future C-stage edit could name the classifier's documentation_only path set explicitly, as already flagged in this review artifact.

Reviewed commit: `755cf4bea5a13843127a0ddef205738fa0b32a99`

Evidence source: `Claude QA Review Pilot` workflow (check `qa-review`), run https://github.com/pittonje/BurningSpace/actions/runs/29341519185, and its published PR #42 comment https://github.com/pittonje/BurningSpace/pull/42#issuecomment-4970411095 whose footer binds the review to reviewed commit `755cf4bea5a13843127a0ddef205738fa0b32a99`

Date: 2026-07-14

Workflow/check name: `Claude QA Review Pilot` (required check: `qa-review`)

Run URL or run ID: https://github.com/pittonje/BurningSpace/actions/runs/29341519185 (run ID 29341519185)

Approval status: Approved

Check conclusion: SUCCESS

## Dependency verification

- `CI-003-D1` → `BS-PROC-001`: present and correct; the record's human-merge-authority clause defers to the accepted merge-authority decision.
- `CI-003-D1` → `BS-PROC-004`: present and correct; the record's evidence-binding and green-check-insufficiency clauses defer to the accepted review-evidence decision.
- Both dependencies resolve to accepted records; no cycles; no dependency on `BS-PROC-002`; no invented dependency (the record body contains no other decision reference).
- `Supersedes: none`, `Superseded by: none` — no false supersession claims; `DECISION_INDEX.md` dependency column matches the record file exactly.

## Overclaim-risk verification

The record does not claim: branch protection enabled (Notes explicitly disclaim it); QA always runs for every PR (docs/test-only skips acknowledged); docs-only PRs always require QA ("may skip" wording); workflow, script, setting, runtime, package, or CI behavior changed by C3 (Verification and Consequences explicitly disclaim it); QA formatting bugs fixed (Notes state formatting defects fail closed and are not fixed here); action pinning fully solved (pinning is not asserted at all); future CI policy permanently frozen; an exhaustive future error-code list (reason codes use "include"); or a canonical reviewer taxonomy (Notes explicitly disclaim it). A QA skip is stated to be a routing outcome, not approval, and a green check alone is stated to be insufficient — no skip-as-approval or green-check-as-approval error is present.

## Known-CI-issues-not-fixed verification

The record correctly leaves known CI limitations untouched and unclaimed: the workflow-identity self-modification limitation (`docs/tasks/ci-003-risk-based-reviewer-routing.md` "Self-modifying limitation") remains a documented limitation, restated only as the fail-closed inability of a PR to self-certify through modified head workflow code; QA output formatting defects, including over-length reviewer output, are stated to fail closed to non-approval and explicitly not fixed; branch-protection technical enforcement remains outside the record. No CI bug fix, workflow edit, or script edit occurred in this PR (`.github/**` absent from the diff), matching the task's C3 forbidden-files rule.

## Validation summary

- Repository state: branch `docs/docarch-002c3-ci-routing-decision`, HEAD `77eeb23222849a1ceafb0c1ec4717fd25fa21476`, clean tracked working tree; PR #42 `headRefOid` matches, state OPEN, not draft, mergeable CLEAN.
- `git diff --check origin/main...HEAD`: clean, no whitespace errors.
- `git diff --name-only origin/main...HEAD`: exactly 6 changed paths matching the expected C3 scope (2 created: `CI-003-D1.md`, this review artifact; 4 modified: index, README, task file, `CURRENT.md`); no forbidden path (`BS-ARCH-*`, `BS-PROC-*`, `BS-MECH-*`, `GAME-001-*`, B1/B2/C1/C2 review artifacts, `docs/GOVERNANCE.md`, `DECISION_TEMPLATE.md`, `PROJECT_CONTEXT.md`, `AGENTS.md`, `CLAUDE.md`, `docs/agents/**`, `docs/architecture/**`, `docs/design/**`, `apps/**`, `packages/**`, `.github/**`, `package.json`, `package-lock.json`) touched.
- `git diff --stat origin/main...HEAD`: 6 files changed, 223 insertions, 17 deletions — consistent with the expected scope.
- Registry counts: exactly one CI decision file; exactly 30 files containing `Status: accepted`; exactly 30 accepted index rows with no duplicate ID; `CI-003-D1` accepted in the index and removed from pending; C4 remains pending; reserved and unrecovered ranges byte-unchanged; no `AGENT-004.md` exists.
- Section order, metadata, dependencies, and all 11 source-evidence path existences verified deterministically.
- No dependency installation, tests, builds, typechecks, or runtime diagnostics were run, per instructions.

## Blocking findings

None.
