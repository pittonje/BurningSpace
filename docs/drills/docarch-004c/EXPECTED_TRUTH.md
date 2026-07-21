# DOCARCH-004C Predeclared Expected Truth

CONTROLLER AND EVALUATOR ONLY.
THE CLEAN-CONTEXT EXECUTOR MUST NOT READ THIS FILE.

This file predeclares, before any drill execution, the expected outcome of
every scenario under `docs/drills/docarch-004c/scenarios/`, applying the
canonical protocol `docs/agents/ARCHITECT_TAKEOVER_PROTOCOL.md` at baseline
`4ead74342ecc7ad9f2b647d4a21d63736a694502`. Expected next actions follow
protocol section 15. This file must not be changed after the executor commit
except to correct a demonstrable fixture-authoring error, in a separate commit
before evaluation, with the affected scenario invalidated and re-executed by a
fresh executor.

## SCN-01 — Fresh CURRENT and valid active stage

- Scenario ID: SCN-01
- Expected CURRENT verdict: FRESH
- Expected operational-state classification: active valid stage
- Expected latest completed stage: `SIM-100A` (merged PR #88)
- Expected active-work classification: valid active work — `SIM-100B` with
  committed task, exact scope, matching branch `docs/sim-100b-stage`, open
  PR #90, complete predecessor, compatible task/review metadata
- Expected committed-scope result: recovered — the four-path allowlist in
  `docs/tasks/sim-100-program.md`
- Expected unresolved-gate result: none blocking
- Expected stop conditions: none
- Exact expected sole next action: Required reviewers complete the
  independent SIM-100B conformance review of PR #90 on its current head
  (protocol section 15 Case 1 — next unmet closure requirement of the active
  stage; do not start a successor stage).
- Expected takeover status: COMPLETE
- Applicable success criteria: all sixteen
- Criteria expected to fail safely: none
- Evidence supporting the expected truth: fixture CURRENT claims agree with
  fixture task/review metadata, branch, and open-PR evidence; every protocol
  section 10 freshness condition holds; section 12 active-work requirements
  are all met; the only unmet closure requirement is independent review.
- GitHub evidence required: yes (open-PR and merged-predecessor state)
- Local evidence sufficient: no (PR state is fixture-declared external
  evidence)

## SCN-02 — Stale CURRENT after human merge

- Scenario ID: SCN-02
- Expected CURRENT verdict: STALE
- Expected operational-state classification: stale handoff with one
  authorized successor
- Expected latest completed stage: `SIM-200B` (merged PR #91)
- Expected active-work classification: no active work — `SIM-200C` is
  authorized next work, not active implementation (no committed task, no
  branch)
- Expected committed-scope result: absent for the successor — no committed
  `SIM-200C` scope exists
- Expected unresolved-gate result: none blocking
- Expected stop conditions: none mandatory (the consumed action and merged
  branch are reconciled by protocol section 11)
- Exact expected sole next action: Prepare and review a bounded task packet
  for the authorized successor stage SIM-200C; implementation does not begin
  (protocol section 15 Case 2, no-committed-task arm).
- Expected takeover status: COMPLETE
- Applicable success criteria: all sixteen
- Criteria expected to fail safely: none
- Evidence supporting the expected truth: PR #91 merge evidence supersedes
  the CURRENT claim that SIM-200B is incomplete (section 10: superseding
  human-merged stage; consumed next action); merged review evidence
  authorizes exactly one successor; section 12 denies active-work status
  without a committed task.
- GitHub evidence required: yes (merged-PR state)
- Local evidence sufficient: no (merge state is fixture-declared external
  evidence corroborated by simulated `main` content)

## SCN-03 — Named branch merged or deleted

- Scenario ID: SCN-03
- Expected CURRENT verdict: STALE
- Expected operational-state classification: stale handoff with one
  authorized successor
- Expected latest completed stage: `SIM-300B` (merged PR #92)
- Expected active-work classification: valid active work — `SIM-300C` has
  merged Product Architect authorization, a committed task with exact
  two-path scope, and an existing branch `docs/sim-300c-stage`; the branch
  alone would not have been authorization, but the committed task and merged
  approval complete section 12
- Expected committed-scope result: recovered — the two-path `SIM-300C`
  allowlist in the committed task file
- Expected unresolved-gate result: none blocking
- Expected stop conditions: none mandatory
- Exact expected sole next action: Continue the bounded stage SIM-300C under
  its committed task on branch `docs/sim-300c-stage`; its next unmet closure
  requirement is implementation of the committed two-path scope (protocol
  section 15 Case 2, committed-task-and-branch arm).
- Expected takeover status: COMPLETE
- Applicable success criteria: all sixteen
- Criteria expected to fail safely: none
- Evidence supporting the expected truth: the named branch no longer exists
  and the named action was consumed by the PR #92 merge (section 10 fails);
  section 11 reconciliation finds the latest merged stage, the sole
  authorized successor, and its committed scope; section 12 validates the
  successor as active work.
- GitHub evidence required: yes (deleted-branch and merged-PR state)
- Local evidence sufficient: no (branch lifecycle is fixture-declared
  external evidence)

## SCN-04 — Consumed next action

- Scenario ID: SCN-04
- Expected CURRENT verdict: STALE
- Expected operational-state classification: completed stage with no active
  successor branch
- Expected latest completed stage: `SIM-400B` (merged PR #93; program
  `SIM-400` closed)
- Expected active-work classification: no active work; absence established
- Expected committed-scope result: absent — no successor scope exists
- Expected unresolved-gate result: none blocking
- Expected stop conditions: none mandatory (absent active scope is resolved
  by Case 3 arbitration into one reconciliation action)
- Exact expected sole next action: The Product Architect records a bounded
  staging or decision resolution selecting the next work; no implementation
  begins (protocol section 15 Case 3).
- Expected takeover status: COMPLETE
- Applicable success criteria: all sixteen
- Criteria expected to fail safely: none
- Evidence supporting the expected truth: the single recorded action is
  syntactically valid but already consumed by the PR #93 merge (section 10
  distinguishes recorded from valid); no committed or merged artifact
  authorizes any successor, so Case 2 and Case 4 do not apply and Case 3
  governs.
- GitHub evidence required: yes (merged-PR state)
- Local evidence sufficient: no (merge state is fixture-declared external
  evidence)

## SCN-05 — No active task

- Scenario ID: SCN-05
- Expected CURRENT verdict: STALE
- Expected operational-state classification: completed stage with no active
  successor branch
- Expected latest completed stage: `SIM-503` (merged PR #94)
- Expected active-work classification: no active work; absence established;
  historical task files `sim-501`/`sim-502`/`sim-503` are all closed and
  must not be selected by recency
- Expected committed-scope result: absent — no committed scope exists for
  any successor
- Expected unresolved-gate result: none blocking
- Expected stop conditions: none mandatory (absent active scope resolved by
  Case 3 arbitration)
- Exact expected sole next action: The Product Architect records a bounded
  staging or decision resolution selecting the next work; no implementation
  begins (protocol section 15 Case 3).
- Expected takeover status: COMPLETE
- Applicable success criteria: all sixteen
- Criteria expected to fail safely: none
- Evidence supporting the expected truth: all task files record their own
  completion; the roadmap-analog names only a broad area (`SIM-600`) and no
  bounded successor; no merged Product Architect staging selects a task, so
  no successor is explicitly authorized and Case 3 governs; convenience and
  historical recency are excluded by section 15.
- GitHub evidence required: yes (merged-PR and absent-branch state)
- Local evidence sufficient: no (lifecycle state is fixture-declared
  external evidence)

## SCN-06 — Material task/review conflict

- Scenario ID: SCN-06
- Expected CURRENT verdict: CONFLICTING
- Expected operational-state classification: unauthorized or conflicting
  work
- Expected latest completed stage: `SIM-600A`
- Expected active-work classification: cannot be validated — task and review
  metadata are materially incompatible and the PR changed-path list matches
  neither, so section 12's compatible-metadata requirement fails
- Expected committed-scope result: conflicting — four-path task allowlist
  versus six-path review record versus five-path PR list; no single scope is
  recoverable
- Expected unresolved-gate result: none blocking (the blocker is the
  artifact conflict, not a decision gate)
- Expected stop conditions: task and review artifacts disagree materially;
  branch/pull-request evidence contradicts task state
- Exact expected sole next action: Stop implementation and create a bounded
  authority-reconciliation task resolving the SIM-600B task/review/PR scope
  and closure disagreement (protocol section 15 Case 5).
- Expected takeover status: INCOMPLETE — SAFE STOP
- Applicable success criteria: all sixteen
- Criteria expected to fail safely: 7 (CURRENT cannot be reconciled, only
  classified as conflicting), 9 (active work can be neither validated nor
  established absent), 10 (no single committed scope is recoverable)
- Evidence supporting the expected truth: equal-authority operational
  artifacts disagree on scope, state, and closure; the recorded approval is
  bound to a nonexistent commit; governance and protocol section 6 make
  unresolved equal-authority ambiguity a stop; a safe stop must not be
  reported as a successful takeover.
- GitHub evidence required: yes (PR changed-path list)
- Local evidence sufficient: no (the PR contradiction is part of the
  material conflict)

## SCN-07 — Multiple plausible successor stages

- Scenario ID: SCN-07
- Expected CURRENT verdict: STALE
- Expected operational-state classification: ambiguous successor state
- Expected latest completed stage: `SIM-700B` (merged PR #96)
- Expected active-work classification: no active work; absence established;
  `SIM-700C` and `SIM-700D` are both plausible and neither is selected
- Expected committed-scope result: absent — no committed scope exists for
  either candidate
- Expected unresolved-gate result: none blocking
- Expected stop conditions: several next actions remain, resolved through
  Case 4 arbitration into exactly one reconciliation action
- Exact expected sole next action: The Product Architect performs a bounded
  reconciliation decision selecting one successor stage (SIM-700C or
  SIM-700D); no implementation begins (protocol section 15 Case 4).
- Expected takeover status: COMPLETE
- Applicable success criteria: all sixteen
- Criteria expected to fail safely: none
- Evidence supporting the expected truth: the recorded action is consumed;
  the roadmap-analog and merged review each name two successors without
  ordering or selection; section 15 forbids choosing by convenience, branch
  age, unfinished code, or chat memory, so Case 4 governs.
- GitHub evidence required: yes (merged-PR and absent-branch state)
- Local evidence sufficient: no (lifecycle state is fixture-declared
  external evidence)

## SCN-08 — Unresolved decision gate

- Scenario ID: SCN-08
- Expected CURRENT verdict: STALE
- Expected operational-state classification: active valid stage (whose next
  implementation step is blocked by an unresolved decision gate)
- Expected latest completed stage: the merged predecessor staging that
  authorized `SIM-800A`
- Expected active-work classification: valid active work — `SIM-800A` has
  merged authorization, a committed task with exact five-path scope, and an
  existing branch; its implementation may not proceed across the gate
- Expected committed-scope result: recovered — the five-path allowlist in
  `docs/tasks/sim-800-persistence.md`
- Expected unresolved-gate result: one blocking gate — the storage-technology
  gate in the merged roadmap-analog gate table; no accepted resolution
  exists; the runtime placeholder (`storage: "sqlite"`) and the historical
  design prose must not be treated as a resolution
- Expected stop conditions: a blocking decision gate remains
- Exact expected sole next action: The Product Architect records a bounded
  staging or decision resolution resolving the storage-technology gate; no
  implementation begins (protocol section 15 Case 3 decision-resolution
  arm, required by sections 14 and 16).
- Expected takeover status: COMPLETE
- Applicable success criteria: all sixteen
- Criteria expected to fail safely: none (the stop is recorded, one safe
  action is produced, and every criterion can still pass)
- Evidence supporting the expected truth: the section 10 condition "the
  roadmap and merged Product Architect staging evidence permit the named
  work" fails, because staging is explicitly conditional on all applicable
  gates and the merged gate table blocks persistence implementation, while
  CURRENT's named next action is exactly that implementation; section 14
  forbids inferring the value from placeholders or historical prose.
- GitHub evidence required: yes (merged staging evidence)
- Local evidence sufficient: no (staging merge state is fixture-declared
  external evidence)

## SCN-09 — GitHub evidence unavailable

- Scenario ID: SCN-09
- Expected CURRENT verdict: STALE
- Expected operational-state classification: not classifiable — the
  section 11 reconciliation must stop before classification because external
  evidence is unavailable and local evidence is insufficient
- Expected latest completed stage: cannot be established — `SIM-900A` is the
  latest locally provable merged stage, but remote-tracking-ref freshness is
  unprovable, so a later merge cannot be excluded
- Expected active-work classification: cannot be established
- Expected committed-scope result: the committed `SIM-900B` three-path scope
  is readable, but its lifecycle state (open versus already merged) cannot
  be verified
- Expected unresolved-gate result: none discoverable; gate analysis is moot
  once the evidence stop applies
- Expected stop conditions: external evidence is unavailable and local
  evidence is insufficient
- Exact expected sole next action: Stop implementation and create a bounded
  authority-reconciliation task to restore verifiable external lifecycle
  evidence (the PR #97 and remote `main` state) before any operational
  conclusion (protocol section 15 Case 5, per the section 11 and 16
  unavailable-evidence rule).
- Expected takeover status: INCOMPLETE — SAFE STOP
- Applicable success criteria: all sixteen
- Criteria expected to fail safely: 7 (CURRENT cannot be reconciled), 8
  (latest completed stage cannot be confirmed), 9 (active work cannot be
  established), 13 (merge and evidence state cannot be recovered)
- Evidence supporting the expected truth: freshness conditions that depend
  on PR state cannot be established, so CURRENT cannot be classified fresh;
  stale remote-tracking refs must not be assumed current; the protocol's
  explicit rule is to continue only if local evidence is sufficient, and
  here it is not; a safe stop must not be reported as a successful takeover.
- GitHub evidence required: yes — and it is unavailable by design
- Local evidence sufficient: no

## SCN-10 — Uncommitted packet unavailable

- Scenario ID: SCN-10
- Expected CURRENT verdict: STALE
- Expected operational-state classification: stale handoff with one
  authorized successor
- Expected latest completed stage: `SIM-1000B` (merged PR #98)
- Expected active-work classification: no active work — `SIM-1000C` is
  authorized next work only; the empty branch `docs/sim-1000c-stage` is not
  authorization and there is no committed task
- Expected committed-scope result: absent — the packet existed only outside
  committed repository truth and is unrecoverable; chat instructions are not
  recoverable scope
- Expected unresolved-gate result: none blocking
- Expected stop conditions: active scope is absent, resolved by the
  section 13 rule into one reconciliation action
- Exact expected sole next action: Prepare and review a bounded task packet
  for the authorized successor stage SIM-1000C as an explicit
  scope-reconciliation task; implementation does not begin (protocol
  sections 13 and 15 Case 2, no-committed-task arm).
- Expected takeover status: COMPLETE
- Applicable success criteria: all sixteen
- Criteria expected to fail safely: none
- Evidence supporting the expected truth: CURRENT names a task with no
  repository path, so section 10 fails; merged evidence authorizes exactly
  one successor; sections 12 and 13 deny active-work status and committed
  scope without a committed artifact; the absence of the packet is
  explicitly identified rather than reconstructed.
- GitHub evidence required: yes (merged-PR and empty-branch state)
- Local evidence sufficient: no (lifecycle state is fixture-declared
  external evidence)
