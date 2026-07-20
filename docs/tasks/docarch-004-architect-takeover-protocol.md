# DOCARCH-004 - Architect Takeover Protocol

Owner: `Product Architect`

Merge authority: `Human only`

## Purpose

Establish, through bounded stages, how a newly assigned Product Architect
recovers BurningSpace authority, current program state, active work, exact
permitted scope, exactly one safe next action, unresolved decision gates,
forbidden actions, merge authority, and review and evidence requirements from
repository truth alone, without chat history.

## Program state

- DOCARCH-000 through DOCARCH-003 are complete.
- DOCARCH-004A completed and merged through PR #49 at merge commit
  `858d14568f4dd6f040255df1b925046028237377`.
- The Product Architect accepted separate B and C stages through the merged
  DOCARCH-004A review evidence.
- DOCARCH-004B completed and merged through PR #50 at merge commit
  `4ead74342ecc7ad9f2b647d4a21d63736a694502`. The Architect Takeover Protocol
  at `docs/agents/ARCHITECT_TAKEOVER_PROTOCOL.md` is canonical and active.
- DOCARCH-004 remains open.
- DOCARCH-004C is the active bounded stage and independently validates the
  merged protocol. Its current phase is drill preparation.
- The accepted decision count remains 35 (18 `BS-MECH`, 5 `GAME-001`,
  7 `BS-ARCH`, 4 `BS-PROC`, 1 `CI`).
- DOCARCH-004C introduces no accepted decision record and no runtime change.
- DOCARCH-005 - Role and Model Portability remains reserved after
  DOCARCH-004.

## DOCARCH-004A - Readiness Assessment

Completed and merged through PR #49. A established the readiness baseline,
identified four blocking gaps, and recorded Product Architect approval for
separate protocol-authoring and independent-validation stages. Its assessment
and review evidence remain unchanged.

## DOCARCH-004B - Architect Takeover Protocol Authoring

Completed and merged through PR #50 at merge commit
`4ead74342ecc7ad9f2b647d4a21d63736a694502`. The protocol is canonical and
active. The B-stage scope, objectives, and closure conditions below remain
recorded as historical stage state.

### Exact B-stage file scope

Create exactly two files:

- `docs/agents/ARCHITECT_TAKEOVER_PROTOCOL.md`;
- `docs/reviews/docarch-004b-architect-takeover-protocol-review.md`.

Modify exactly seven files:

- `PROJECT_CONTEXT.md`;
- `AGENTS.md`;
- `CLAUDE.md`;
- `docs/agents/context-usage.md`;
- `docs/agents/handoff-protocol.md`;
- `docs/tasks/docarch-004-architect-takeover-protocol.md`;
- `docs/handoffs/CURRENT.md`.

The exact changed-path count is nine. No other path may change.

### B-stage objectives

- Establish the canonical cold-start entrypoint.
- Reconcile reading-order adapters.
- Define authority and conflict recovery.
- Define read-only repository preflight.
- Define `CURRENT.md` freshness rules.
- Define deterministic stale-`CURRENT.md` reconciliation.
- Define active-work and exact-scope recovery.
- Define sole-next-action arbitration.
- Define stop conditions and forbidden actions.
- Define merge-authority and evidence recovery.
- Define the mandatory takeover report.
- Define testable takeover success criteria.
- Define the DOCARCH-004C validation contract.

### B-stage non-goals

- No independent cold takeover drill.
- No DOCARCH-004C task, review, instructions, result, or simulated evidence.
- No new or modified accepted decision.
- No gameplay, runtime, architecture, design, package, workflow, script, test,
  dependency, repository-protection, or CI change.
- No model or vendor selection and no DOCARCH-005 implementation.

### Reviewer routing

Required:

- Product Architect - confirms protocol authority, recovery rules, success
  criteria, and stage boundaries.
- Architecture Reviewer - confirms authority separation and the
  implementation-evidence boundary.
- Documentation consistency review - confirms protocol, adapters, task,
  handoff, and unchanged authority sources agree.
- Claude QA - verifies exact scope, counts, deterministic recovery coverage,
  evidence requirements, and closure conditions.
- Human-only merge - required by `BS-PROC-001`.

Gameplay/Product Reviewer is not required unless protocol work changes
gameplay or roadmap scope; B changes neither.

Security/CI Reviewer is not required unless workflow, security, repository
protection, or CI scope expands; B changes none of those areas.

### DOCARCH-004B closure condition

DOCARCH-004B closes only after:

- the protocol candidate is authored;
- adapter reading orders are reconciled;
- independent conformance review is completed;
- Product Architect approval evidence is recorded;
- Claude QA evidence is recorded;
- all required checks pass on the final pull-request head;
- a human merges the B-stage pull request.

The protocol remains a candidate until human merge.

## DOCARCH-004C - Independent Cold Takeover Drill

Active bounded validation stage. It uses three separate evidence-bearing
phases, each with its own commit and actor:

1. Preparation (current phase) - a Drill Controller authors the drill
   charter, ten scenario fixtures, predeclared expected truth, blank
   execution and evaluation reports, the review skeleton, and program-state
   updates. The preparation session becomes ineligible to execute the drill.
2. Independent execution - a later new clean-context Drill Executor, without
   access to the preparation conversation or
   `docs/drills/docarch-004c/EXPECTED_TRUTH.md`, executes all ten scenarios
   read-only.
3. Independent evaluation - a later evaluator that did not author the
   executor report compares the report against the predeclared expected
   truth.

DOCARCH-004C creates no accepted decision and no runtime, workflow, or
protocol change. A protocol defect discovered by the drill is recorded as a
failure and corrected later through separate bounded work.

### Exact C-stage Phase-1 file scope

Create exactly fifteen files:

- `docs/drills/docarch-004c/DRILL_CHARTER.md`;
- `docs/drills/docarch-004c/EXPECTED_TRUTH.md`;
- `docs/drills/docarch-004c/EXECUTION_REPORT.md`;
- `docs/drills/docarch-004c/EVALUATION.md`;
- `docs/drills/docarch-004c/scenarios/SCN-01-fresh-current.md`;
- `docs/drills/docarch-004c/scenarios/SCN-02-stale-current-after-merge.md`;
- `docs/drills/docarch-004c/scenarios/SCN-03-merged-or-deleted-branch.md`;
- `docs/drills/docarch-004c/scenarios/SCN-04-consumed-next-action.md`;
- `docs/drills/docarch-004c/scenarios/SCN-05-no-active-task.md`;
- `docs/drills/docarch-004c/scenarios/SCN-06-task-review-conflict.md`;
- `docs/drills/docarch-004c/scenarios/SCN-07-multiple-successors.md`;
- `docs/drills/docarch-004c/scenarios/SCN-08-unresolved-decision-gate.md`;
- `docs/drills/docarch-004c/scenarios/SCN-09-github-evidence-unavailable.md`;
- `docs/drills/docarch-004c/scenarios/SCN-10-uncommitted-packet-unavailable.md`;
- `docs/reviews/docarch-004c-independent-cold-takeover-drill-review.md`.

Modify exactly three files:

- `PROJECT_CONTEXT.md`;
- `docs/tasks/docarch-004-architect-takeover-protocol.md`;
- `docs/handoffs/CURRENT.md`.

The exact Phase-1 changed-path count is eighteen. No other path may change.

### C-stage Phase-2 scope

The independent clean-context Drill Executor modifies only:

- `docs/drills/docarch-004c/EXECUTION_REPORT.md`.

### C-stage Phase-3 scope

The independent Drill Evaluator modifies only:

- `docs/drills/docarch-004c/EVALUATION.md`.

### C-stage reviewer routing

Required after execution and evaluation:

- Product Architect;
- Architecture Reviewer;
- Documentation consistency review;
- Claude QA;
- human-only merge per `BS-PROC-001`.

### DOCARCH-004C closure condition

DOCARCH-004C closes only after:

- the preparation work is merged into the C branch;
- the independent executor report is complete;
- the independent evaluation is complete;
- all ten scenarios are evaluated;
- the drill verdict is PASS under the charter's mandatory all-scenarios rule;
- the conformance review is completed;
- Product Architect approval evidence is recorded;
- Claude QA evidence is recorded;
- all required checks pass on the final pull-request head;
- a human merges the C-stage pull request.

DOCARCH-004C is not complete, and no drill has been executed or passed, at
the preparation phase.

## Program continuation after C

DOCARCH-004 closes only after the successful human merge of DOCARCH-004C.
DOCARCH-005 remains reserved after DOCARCH-004.
