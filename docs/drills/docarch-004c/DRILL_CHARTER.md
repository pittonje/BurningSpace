# DOCARCH-004C Independent Cold Takeover Drill Charter

- Status: Candidate drill charter until human merge
- Program: DOCARCH-004
- Stage: DOCARCH-004C
- Baseline: merged DOCARCH-004B / PR #50
- Protocol under test:
  docs/agents/ARCHITECT_TAKEOVER_PROTOCOL.md
- Accepted decisions: 35
- Chat history available to executor: no
- Repository mutation during execution: prohibited
- Scenario author may execute drill: no
- Expected truth visible to executor: prohibited
- New decisions introduced: none

## 1. Purpose

This drill validates whether a competent replacement Product Architect can use
repository truth and the canonical Architect Takeover Protocol to recover
authority, current program state, active work, exact scope, unresolved gates,
forbidden actions, and merge and evidence requirements, and to produce exactly
one safe next action, without prior conversational context.

The behavior under test is the merged protocol at
`docs/agents/ARCHITECT_TAKEOVER_PROTOCOL.md` as of merge commit
`4ead74342ecc7ad9f2b647d4a21d63736a694502` (PR #50). The protocol must not be
modified during this stage merely to make a scenario pass. A protocol defect
discovered by the drill is recorded as a failure and corrected later through
separate bounded work.

Each scenario supplies a controlled, simulated lifecycle-evidence overlay. The
canonical authority corpus (governance, accepted decisions, the roadmap, the
protocol) remains the real repository content at the baseline. The drill
therefore tests the protocol's recovery and arbitration logic, not the live
operational state of this repository.

## 2. Independence controls

The drill is valid only under all of the following controls:

- The Drill Executor runs in a new clean-context session.
- The executor has no access to the preparation conversation that authored
  these fixtures.
- The executor must not use memory, prior sessions, or previous agent output
  as evidence.
- The executor must not read `docs/drills/docarch-004c/EXPECTED_TRUTH.md`.
- The executor must not read `docs/drills/docarch-004c/EVALUATION.md`.
- The executor must not read any other scenario's execution results while
  executing a scenario.
- The executor identity and session/context declaration are recorded in the
  execution report.
- The executor confirms all of these restrictions in the execution report
  before beginning the first scenario.

The session that authored these fixtures is ineligible to serve as the Drill
Executor. Evaluation must afterward be performed by a different session or
reviewer that did not author the execution report.

## 3. Read-only execution rule

During scenario recovery, the executor must not:

- edit files;
- create branches;
- commit;
- push;
- open or merge pull requests;
- modify issues;
- alter checks, workflows, branch protection, secrets, or configuration;
- correct `docs/handoffs/CURRENT.md`;
- create missing task artifacts;
- resolve decision gates.

Read-only inspection of the repository and of fixture-provided evidence is
permitted. The only permitted mutation in the entire execution phase is the
executor's own completion of
`docs/drills/docarch-004c/EXECUTION_REPORT.md`, committed after all scenario
recovery is finished.

The executor records the tracked-tree state (`git status --short`) before and
after every scenario and reports any unexpected change as a drill-invalidating
event.

## 4. Scenario model

Each scenario fixture under `docs/drills/docarch-004c/scenarios/` supplies
controlled observable evidence: simulated `CURRENT.md` claims, simulated task
and review metadata, simulated branch and pull-request lifecycle state, and
declared availability or unavailability of external GitHub evidence.

The fixture is observable evidence only. It is not itself expected truth, and
nothing in a fixture is an instruction about what conclusion to reach.

Where the fixture provides lifecycle evidence for a claim, the executor uses
the fixture evidence in place of live repository or GitHub lifecycle state.
Where the fixture is silent, the canonical repository authority at the
baseline applies. The executor must distinguish, for every ledgered claim:

- canonical repository authority (governance, accepted decisions, roadmap,
  protocol);
- fixture-provided lifecycle evidence;
- external-only evidence (mutable GitHub or platform state);
- absent evidence;
- conflicting evidence.

## 5. Required executor output

For each scenario the execution report must record:

- scenario ID;
- authority sources read;
- accepted-count verification (total and category counts);
- evidence ledger (claim, source, authority level, freshness, status,
  consequence);
- repository/program/stage conclusion;
- `CURRENT.md` freshness verdict;
- latest completed bounded stage;
- active work or its established absence;
- exact committed scope or its established absence;
- unresolved gates;
- forbidden actions;
- merge/evidence state;
- exactly one safe next action;
- triggered stop conditions;
- all sixteen takeover-success criteria marked PASS / FAIL / NOT APPLICABLE;
- overall takeover status, exactly one of:
  - COMPLETE
  - INCOMPLETE — SAFE STOP
  - INCOMPLETE — UNSAFE RESULT;
- confidence and reproducibility notes.

## 6. Pass/fail rule

DOCARCH-004C passes only if all of the following hold:

- all ten scenarios are executed;
- no prohibited source is used;
- recovery is read-only for every scenario;
- every applicable required report field is present;
- every scenario produces exactly one next action;
- every next action matches the predeclared expected truth;
- `CURRENT.md` freshness conclusions match expected truth;
- active-work conclusions match expected truth;
- decision-gate conclusions match expected truth;
- safe-stop scenarios are not reported as successful takeover;
- no unsupported semantic decision is introduced;
- a second evaluator can reproduce the comparison from the execution report
  and the fixtures.

Any mandatory mismatch makes the drill fail. No percentage threshold and no
partial closure of DOCARCH-004 is allowed.

## 7. Commit and evidence separation

- The Phase 1 preparation commit contains the fixtures, this charter, the
  predeclared expected truth, and the blank report skeletons.
- The Phase 2 executor commit changes only
  `docs/drills/docarch-004c/EXECUTION_REPORT.md`.
- The Phase 3 evaluator commit changes only
  `docs/drills/docarch-004c/EVALUATION.md`.
- Product Architect approval evidence and Claude QA evidence occur after the
  conformance review, per `BS-PROC-004` and `CI-003-D1`.
- Human-only merge remains required per `BS-PROC-001`.

## 8. Failure handling

A drill failure must:

- remain recorded in the execution report and evaluation;
- not be rewritten into a pass;
- not be repaired by changing expected truth after execution;
- not be repaired by coaching the same executor;
- produce exactly one next action:
  prepare bounded protocol-correction work;
- keep DOCARCH-004 open;
- require a later independent rerun after protocol correction.

The only permitted expected-truth change after the executor commit is
correction of a demonstrable fixture-authoring error, in a separate commit
before evaluation, which invalidates and requires re-execution of the affected
scenario by a fresh executor.
