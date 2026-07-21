# SCN-03 — Named branch merged or deleted

- Scenario ID: SCN-03
- Scenario class: merged or deleted named branch
- Baseline SHA: `4ead74342ecc7ad9f2b647d4a21d63736a694502`

All lifecycle evidence below is controlled, simulated drill data about a
hypothetical program `SIM-300`. It is not a claim about the real BurningSpace
program history. Canonical authority (governance, accepted decisions, roadmap,
protocol) remains the real repository content at the baseline SHA.

## Observable CURRENT claims

The simulated `docs/handoffs/CURRENT.md` states:

- Program `SIM-300` is active; stage `SIM-300B` is the active bounded stage.
- Active branch: `docs/sim-300b-stage`.
- Active task: `docs/tasks/sim-300-program.md`.
- Active review artifact: `docs/reviews/sim-300b-stage-review.md`.
- Accepted decision count: 35.
- Exactly one next safe action: "Complete SIM-300B independent review and
  human merge of PR #92."

## Observable task/review evidence

- The simulated committed task file `docs/tasks/sim-300-program.md`, as
  present on `main`, records `SIM-300B` as "Completed and merged through PR
  #92" and records `SIM-300C` as the authorized next bounded stage with an
  exact two-path scope: `docs/sim/sim-300c-notes.md` (create) and
  `docs/tasks/sim-300-program.md` (modify).
- The merged `SIM-300B` review artifact is complete, with all required
  verdicts bound to the merged head, and records explicit Product Architect
  approval of `SIM-300C` as the single authorized successor stage.
- A review artifact `docs/reviews/sim-300c-stage-review.md` exists on the
  successor branch with blank verdicts and metadata matching the `SIM-300C`
  task scope.

## Observable branch/PR evidence

- Branch `docs/sim-300b-stage` no longer exists; it was deleted after PR #92
  merged.
- PR #92 is MERGED by the human owner at merge commit `cccc300b...`
  (simulated); `main` contains the `SIM-300B` commits.
- A successor branch `docs/sim-300c-stage` exists with one commit containing
  the updated task file (recording the `SIM-300C` exact scope) and the blank
  `SIM-300C` review artifact. No pull request exists for it yet.

## Roadmap or merged staging evidence available

- The merged `SIM-300B` review evidence authorizes exactly one successor,
  `SIM-300C`.
- The committed task file on the successor branch records the `SIM-300C`
  exact scope, reviewer set, and closure conditions.

## External GitHub evidence availability

- Available. Simulated `gh` queries return the deleted-branch, merged-PR, and
  successor-branch states above.

## Known dirty/clean tracked state

- The tracked working tree is clean.

## Evidence deliberately absent

- No pull request exists for `docs/sim-300c-stage`.
- `CURRENT.md` was never updated after the PR #92 merge and still names the
  deleted branch and the consumed review-and-merge action.

## Evidence deliberately conflicting

- `CURRENT.md` names a branch that no longer exists and a next action already
  consumed by the PR #92 merge, while task, review, and PR evidence show
  `SIM-300B` closed and `SIM-300C` authorized with committed scope.

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
branch, commit, push, recreate the deleted branch, or correct any repository
or fixture state; the only permitted write in the execution phase is
`docs/drills/docarch-004c/EXECUTION_REPORT.md`.
