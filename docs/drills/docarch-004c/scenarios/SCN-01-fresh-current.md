# SCN-01 — Fresh CURRENT and valid active stage

- Scenario ID: SCN-01
- Scenario class: fresh `CURRENT.md` and active implementation
- Baseline SHA: `4ead74342ecc7ad9f2b647d4a21d63736a694502`

All lifecycle evidence below is controlled, simulated drill data about a
hypothetical program `SIM-100`. It is not a claim about the real BurningSpace
program history. Canonical authority (governance, accepted decisions, roadmap,
protocol) remains the real repository content at the baseline SHA.

## Observable CURRENT claims

The simulated `docs/handoffs/CURRENT.md` states:

- Program `SIM-100` is active; stage `SIM-100B` is the active bounded stage
  and is incomplete.
- Predecessor stage `SIM-100A` completed through merged PR #88 at merge commit
  `aaaa100a...` (simulated).
- Active branch: `docs/sim-100b-stage`.
- Active task: `docs/tasks/sim-100-program.md`.
- Active review artifact: `docs/reviews/sim-100b-stage-review.md`.
- Accepted decision count: 35.
- Exactly one next safe action: "Required reviewers complete the SIM-100B
  conformance review of PR #90."

## Observable task/review evidence

- The simulated committed task file `docs/tasks/sim-100-program.md` records:
  `SIM-100A` complete through PR #88; `SIM-100B` active; an exact changed-path
  scope of four named documentation paths; reviewer set Product Architect,
  Documentation consistency review, Claude QA; human-only merge; closure
  requires independent conformance review, Product Architect approval
  evidence, Claude QA evidence, final-head checks, and human merge.
- The simulated review artifact `docs/reviews/sim-100b-stage-review.md` exists
  on the active branch with matching task, stage, branch, and PR metadata. All
  reviewer verdict sections are blank.
- Task and review metadata agree on stage, scope, branch, and PR number.

## Observable branch/PR evidence

- Branch `docs/sim-100b-stage` exists and contains the task and review
  artifacts named above plus one implementation commit matching the four-path
  scope exactly.
- PR #90 is OPEN, non-draft, MERGEABLE, from `docs/sim-100b-stage` into
  `main`; required checks pass on the current head.
- PR #88 (`SIM-100A`) is MERGED by the human owner.

## Roadmap or merged staging evidence available

- Merged `SIM-100A` review evidence records explicit Product Architect
  approval of `SIM-100B` as the single authorized successor stage, with the
  four-path scope later committed in the task file.
- No other candidate successor stage is named anywhere in the simulated
  evidence.

## External GitHub evidence availability

- Available. Simulated `gh` queries return the branch and PR states above.

## Known dirty/clean tracked state

- The tracked working tree is clean.

## Evidence deliberately absent

- No blocking decision gate applies to the `SIM-100B` scope.
- No reviewer verdict has been recorded yet.

## Evidence deliberately conflicting

- None.

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
branch, commit, push, or correct any repository or fixture state; the only
permitted write in the execution phase is
`docs/drills/docarch-004c/EXECUTION_REPORT.md`.
