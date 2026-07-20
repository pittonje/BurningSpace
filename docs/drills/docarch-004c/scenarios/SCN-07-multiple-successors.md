# SCN-07 — Multiple plausible successor stages

- Scenario ID: SCN-07
- Scenario class: multiple plausible successor stages
- Baseline SHA: `4ead74342ecc7ad9f2b647d4a21d63736a694502`

All lifecycle evidence below is controlled, simulated drill data about a
hypothetical program `SIM-700`. It is not a claim about the real BurningSpace
program history. Canonical authority (governance, accepted decisions, roadmap,
protocol) remains the real repository content at the baseline SHA.

## Observable CURRENT claims

The simulated `docs/handoffs/CURRENT.md` states:

- Program `SIM-700` is active; stage `SIM-700B` is the active bounded stage.
- Active branch: `docs/sim-700b-stage`.
- Active task: `docs/tasks/sim-700-program.md`.
- Accepted decision count: 35.
- Exactly one next safe action: "Complete SIM-700B review and human merge of
  PR #96."

## Observable task/review evidence

- The simulated committed task file `docs/tasks/sim-700-program.md`, as
  present on `main`, records `SIM-700B` as "Completed and merged through PR
  #96". Its program-continuation prose says: "After B, both an independent
  validation stage (`SIM-700C`) and a documentation-consolidation stage
  (`SIM-700D`) remain planned," without ordering them.
- The merged `SIM-700B` review artifact is complete with all required
  verdicts. Its Product Architect approval accepts the B-stage content and
  says "either `SIM-700C` or `SIM-700D` may reasonably follow," recording no
  selection.
- No task file, scope, or review artifact exists for `SIM-700C` or
  `SIM-700D`.

## Observable branch/PR evidence

- PR #96 is MERGED by the human owner; branch `docs/sim-700b-stage` was
  deleted after merge.
- No branch or pull request exists for `SIM-700C` or `SIM-700D`.

## Roadmap or merged staging evidence available

- The simulated merged roadmap prose lists both `SIM-700C` and `SIM-700D` as
  future stages and states no unique order, dependency, or priority between
  them.
- No merged Product Architect decision selects one successor.

## External GitHub evidence availability

- Available. Simulated `gh` queries return the merged and absent branch/PR
  states above.

## Known dirty/clean tracked state

- The tracked working tree is clean.

## Evidence deliberately absent

- No unique successor ordering exists in any committed or merged artifact.
- No committed task, scope, or branch exists for either candidate successor.
- `CURRENT.md` was not updated after the PR #96 merge.

## Evidence deliberately conflicting

- `CURRENT.md` records a consumed action, and the successor evidence leaves
  two stages equally plausible: the roadmap-analog and the merged review each
  name both candidates without selecting between them.

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
branch, commit, push, select a successor in repository state, or correct any
repository or fixture state; the only permitted write in the execution phase
is `docs/drills/docarch-004c/EXECUTION_REPORT.md`.
