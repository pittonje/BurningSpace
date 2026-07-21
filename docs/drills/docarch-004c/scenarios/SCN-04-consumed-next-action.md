# SCN-04 — Consumed next action

- Scenario ID: SCN-04
- Scenario class: consumed next action
- Baseline SHA: `4ead74342ecc7ad9f2b647d4a21d63736a694502`

All lifecycle evidence below is controlled, simulated drill data about a
hypothetical program `SIM-400`. It is not a claim about the real BurningSpace
program history. Canonical authority (governance, accepted decisions, roadmap,
protocol) remains the real repository content at the baseline SHA.

## Observable CURRENT claims

The simulated `docs/handoffs/CURRENT.md` states:

- Program `SIM-400` is active; stage `SIM-400B` is the active bounded stage.
- Active branch: `docs/sim-400b-stage`.
- Active task: `docs/tasks/sim-400-program.md`.
- Active review artifact: `docs/reviews/sim-400b-stage-review.md`.
- Accepted decision count: 35.
- Exactly one syntactically valid next safe action, under a single
  `## Next safe action` heading: "A human merges PR #93 after final-head
  checks pass."

## Observable task/review evidence

- The simulated committed task file `docs/tasks/sim-400-program.md`, as
  present on `main`, records `SIM-400B` as "Completed and merged through PR
  #93" and describes `SIM-400B` as the final planned stage of program
  `SIM-400`. It names no successor stage.
- The merged `SIM-400B` review artifact is complete, with all required
  verdicts and Product Architect approval bound to the merged head. It closes
  program `SIM-400` and does not name, stage, or authorize any successor
  stage or program.

## Observable branch/PR evidence

- PR #93 is MERGED by the human owner at merge commit `dddd400b...`
  (simulated); final-head checks passed before merge.
- Branch `docs/sim-400b-stage` was deleted after merge.
- No other program branch exists.

## Roadmap or merged staging evidence available

- The simulated program-level roadmap prose names a broad future direction
  ("later validation and hardening work may follow") without identifying,
  ordering, or authorizing any bounded successor stage.
- No merged Product Architect staging or decision evidence authorizes any
  specific successor.

## External GitHub evidence availability

- Available. Simulated `gh` queries return the merged PR #93 state above.

## Known dirty/clean tracked state

- The tracked working tree is clean.

## Evidence deliberately absent

- No successor stage, task, scope, branch, or authorization exists in any
  committed or merged artifact.

## Evidence deliberately conflicting

- `CURRENT.md` records a single well-formed next action whose content — the
  human merge of PR #93 — is shown by the PR evidence to have already
  happened.

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
branch, commit, push, re-execute the recorded action, or correct any
repository or fixture state; the only permitted write in the execution phase
is `docs/drills/docarch-004c/EXECUTION_REPORT.md`.
