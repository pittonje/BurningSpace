# DOCARCH-004D — Architect Takeover Methodology Redesign

Status: `staged`

Owner: `Product Architect`

Merge authority: `Human only`

## Purpose

Convert the methodology-audit findings into a versioned, canonical and
independently testable takeover-validation system.

## Accepted authority and provenance

- `BS-PROC-005` separates safety from exact conformance, freezes DOCARCH-004C
  v1, prohibits Attempt 5, and requires DOCARCH-004C v2.
- Audit: `docs/reviews/docarch-004c-methodology-repeatability-audit.md` at
  `d0fd34d46d6bb20c58b4b9b049901aadbab452a6`.
- Audit verdict: `AUDIT FINDING — DRILL REDESIGN REQUIRED`.
- Accepted path: `PATH E — Redesign the drill with separate safety and
  exact-conformance verdicts`.

## Program state and dependencies

DOCARCH-004 remains open. DOCARCH-004C v1 and its four attempts are frozen
historical evidence. PR #51 remains a draft historical-evidence PR and is not
the implementation branch for v2.

The mandatory stage order is:

`A → B → C → D → E → F → G`

No later stage starts before human merge of the prior stage. B may clarify
protocol meaning prospectively. C implements B without adding new semantics.
D binds to merged B and C. E and F use clean contexts. V1 evidence remains
historical.

## DOCARCH-004D-A — Decision and bounded redesign scope

### Scope

- `docs/decisions/BS-PROC-005.md`;
- `docs/decisions/DECISION_INDEX.md`;
- `docs/tasks/docarch-004d-takeover-methodology-redesign.md`;
- `docs/reviews/docarch-004d-a-decision-and-scope-review.md`;
- `docs/handoffs/CURRENT.md`;
- `PROJECT_CONTEXT.md`.

Exactly these six tracked paths may change.

### Required outcome

- Establish `BS-PROC-005` as accepted Product Architect authority.
- Register 36 accepted decisions: 18 `BS-MECH`, 5 `GAME-001`, 7 `BS-ARCH`,
  5 `BS-PROC`, and 1 `CI`.
- Stage this A–G redesign program.
- Preserve DOCARCH-004C v1 without modification.
- Make DOCARCH-004D-A the active bounded stage and record exactly one next
  action in `CURRENT.md`.
- Create the pending A-stage review artifact.

### Non-goals

- No takeover-protocol modification.
- No rubric, drill-v2 artifact, fixture, expected truth, execution,
  evaluation, or conformance review.
- No PR #51 readiness change, merge, or DOCARCH-004 closure.
- No final decision on taxonomy details, `UNDETERMINABLE`, criteria
  6/7/8/9/10/13/16 computation, action-equivalence entries, v2 scenario count,
  corrected SCN-09 answer, protocol implementation details, or evaluator
  algorithm.

### Completion

DOCARCH-004D-A completes only when the accepted decision, task, and review
artifact exist; `CURRENT.md` names exactly one next action; Product Architect
approval, Documentation consistency review, and Claude QA evidence are
recorded against the reviewed commit; final-head checks pass; and a human
merges the stage-A pull request.

## DOCARCH-004D-B — Protocol classification and criterion clarification

Purpose: revise `docs/agents/ARCHITECT_TAKEOVER_PROTOCOL.md` prospectively.

Required outputs:

- canonical `CURRENT` classification taxonomy;
- explicit relationship between document classifications and evidence-ledger
  statuses;
- unavailable-evidence handling;
- operationalization of criteria 6, 7, 8, 9, 10, 13, and 16;
- `COMPLETE` / `INCOMPLETE` rules;
- action-equivalence principles;
- safety-versus-conformance boundary; and
- protocol-version marker or revision note.

B must not create drill fixtures or expected truth.

## DOCARCH-004D-C — Normative execution and evaluation rubric

Purpose: create a committed rubric visible to executor and evaluator at
`docs/agents/ARCHITECT_TAKEOVER_EVALUATION_RUBRIC.md`.

The rubric must define safety-verdict and exact-conformance-verdict
computation; `CURRENT` and operational-state comparison; an action-equivalence
table; criterion recalculation; overall status calculation; executor- and
fixture-validity checks; defect attribution; allowed scenario and drill-level
verdicts; and evidence and confidence boundaries. It must contain no
scenario-specific expected answers.

## DOCARCH-004D-D — DOCARCH-004C v2 preparation

Purpose: create a fresh, uncontaminated validation corpus under
`docs/drills/docarch-004c-v2/`.

Required artifacts are `DRILL_CHARTER.md`, `EXPECTED_TRUTH.md`,
`EXECUTION_REPORT.md`, `EVALUATION.md`, scenario fixtures, version metadata,
and preparation-integrity evidence.

The corpus must not copy hidden contradictions from v1. Its
SCN-09-equivalent evidence-unavailable scenario must align classification,
criteria, operational state, and status. Fixtures must not leak answers;
expected truth must trace to the protocol and rubric; all expected material
results require direct citations; and safety and exact-conformance
expectations remain separate. The preparation session is ineligible to
execute or evaluate.

## DOCARCH-004D-E — Independent v2 execution

- Use a new clean-context executor with protocol and rubric visible and
  expected truth hidden.
- Process fixtures sequentially through read-only recovery.
- Permit exactly one execution-report mutation.
- Prohibit drill-level self-evaluation.

## DOCARCH-004D-F — Independent v2 evaluation

- Use a separate independent evaluator with expected truth visible.
- Prohibit prior v1 execution/evaluation content.
- Compare the executor report against protocol, rubric, fixtures, and expected
  truth.
- Produce separate safety and conformance verdicts, deterministic action
  equivalence, and explicit defect attribution.

## DOCARCH-004D-G — Conformance review and closure evidence

Required evidence:

- independent architecture/governance review;
- Documentation consistency review;
- Product Architect approval;
- Claude QA evidence;
- final-head checks;
- human merge; and
- a DOCARCH-004 closure decision only after successful merge.

## Reviewer routing for stage A

Required:

- Product Architect — confirms the accepted semantic decision, bounded stage
  order, and unresolved-detail deferral.
- Documentation consistency review — confirms the decision, index, task,
  handoff, project context, and historical evidence agree.
- Claude QA — required because governance, decision, task, and handoff paths
  change; verifies scope, counts, stage boundaries, and final-head evidence.
- Human-only merge — required by `BS-PROC-001`.

Recommended:

- Architecture/Governance Reviewer — checks that the safety/conformance split
  preserves authority and does not introduce protocol semantics in stage A.

Skipped as not applicable:

- Network Reviewer — no protocol contracts, messages, rooms, or networking
  behavior change.
- Security Reviewer — no authentication, secrets, deployment, dependency,
  workflow, or runtime trust boundary changes.
- Gameplay Reviewer — no gameplay rule, balance, or roadmap scope changes.
- Visual Design Lead — no player-facing presentation or asset change.

Reviews are read-only, sequential where independence matters, and bound to the
reviewed commit. Codex must not approve its own work.

## Validation

- Run `git diff --check`, `git status --short`, `git diff --name-only`, and
  `git diff --stat`.
- Verify exactly the six A-stage paths changed.
- Verify `BS-PROC-005` is accepted and the index totals 36 with the
  18/5/7/5/1 split.
- Verify stages A–G and dependency order `A → B → C → D → E → F → G`.
- Verify `CURRENT.md` contains exactly one next action and authorizes no
  protocol or drill-v2 implementation.
- Verify the review artifact remains pending and no v1, protocol, fixture, or
  expected-truth path changed.

## Stop conditions

- Stop if any change outside the six-path allowlist is required.
- Stop if stage A would decide semantics reserved for B–D.
- Stop if PR #51 or any v1 artifact would need modification.
- Stop if required audit provenance or Product Architect authority cannot be
  established.

## Expected commit

Exactly one commit: `docs: stage DOCARCH-004D takeover methodology redesign`.
Do not amend, rebase, force-push, use `git add .`, or use `git commit -a`.

## Stage-A exact next action

Independent reviewers complete the DOCARCH-004D-A decision-and-scope
conformance review on the final PR head.
