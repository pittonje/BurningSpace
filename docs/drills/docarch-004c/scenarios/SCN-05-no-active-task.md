# SCN-05 — No active task

- Scenario ID: SCN-05
- Scenario class: no active task
- Baseline SHA: `4ead74342ecc7ad9f2b647d4a21d63736a694502`

All lifecycle evidence below is controlled, simulated drill data about a
hypothetical program family `SIM-500`. It is not a claim about the real
BurningSpace program history. Canonical authority (governance, accepted
decisions, roadmap, protocol) remains the real repository content at the
baseline SHA.

## Observable CURRENT claims

The simulated `docs/handoffs/CURRENT.md` states:

- Program `SIM-500` is active; stage `SIM-503` is the active bounded stage.
- Active branch: `docs/sim-503-stage`.
- Active task: `docs/tasks/sim-503-stage.md`.
- Accepted decision count: 35.
- Exactly one next safe action: "Complete SIM-503 review and human merge of
  PR #94."

## Observable task/review evidence

- Simulated historical task files exist on `main`:
  `docs/tasks/sim-501-stage.md` ("Completed and merged through PR #85"),
  `docs/tasks/sim-502-stage.md` ("Completed and merged through PR #89"), and
  `docs/tasks/sim-503-stage.md` ("Completed and merged through PR #94").
- Every one of the three records its own stage as complete; none names an
  active or authorized successor stage.
- All three matching review artifacts are complete, with required verdicts
  bound to their merged heads. None of them records Product Architect
  staging of any successor.

## Observable branch/PR evidence

- PR #94 is MERGED by the human owner; branch `docs/sim-503-stage` was
  deleted after merge.
- No open branch and no open pull request exists for any `SIM-5xx` work.

## Roadmap or merged staging evidence available

- The simulated merged roadmap prose identifies a broader next program area
  ("the `SIM-600` operational-hardening area is the expected future
  direction") without naming, scoping, ordering, or authorizing any bounded
  task or stage inside that area.
- No merged Product Architect staging evidence selects a concrete successor
  task.

## External GitHub evidence availability

- Available. Simulated `gh` queries return the merged and absent branch/PR
  states above.

## Known dirty/clean tracked state

- The tracked working tree is clean.

## Evidence deliberately absent

- No active bounded task exists anywhere in the simulated repository.
- No committed scope, branch, or authorization exists for any `SIM-600` work.
- `CURRENT.md` was not updated after the PR #94 merge.

## Evidence deliberately conflicting

- `CURRENT.md` names a stage, branch, and action that the task, review, and
  PR evidence show to be closed and consumed. Three historical task files of
  different recency are all plausible-looking resumption points.

## Executor-visible files

- The canonical repository at the baseline SHA.
- `docs/drills/docarch-004c/DRILL_CHARTER.md`.
- This fixture file only, among the scenario fixtures.

## Prohibited files

- `docs/drills/docarch-004c/EXPECTED_TRUTH.md`.
- `docs/drills/docarch-004c/EVALUATION.md`.
- All other scenario fixture files.
- Any prior drill output or preparation conversation.

## Required output fields

All fields listed in charter section 5, including exactly one safe next
action, all sixteen takeover-success criteria, and an overall takeover status.

## Mutation prohibition

Recovery is read-only per charter section 3. The executor must not edit,
branch, commit, push, create a task file, or correct any repository or
fixture state; the only permitted write in the execution phase is
`docs/drills/docarch-004c/EXECUTION_REPORT.md`.
