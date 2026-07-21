# SCN-06 — Material task/review conflict

- Scenario ID: SCN-06
- Scenario class: conflicting task and review artifacts
- Baseline SHA: `4ead74342ecc7ad9f2b647d4a21d63736a694502`

All lifecycle evidence below is controlled, simulated drill data about a
hypothetical program `SIM-600`. It is not a claim about the real BurningSpace
program history. Canonical authority (governance, accepted decisions, roadmap,
protocol) remains the real repository content at the baseline SHA.

## Observable CURRENT claims

The simulated `docs/handoffs/CURRENT.md` states:

- Program `SIM-600` is active; stage `SIM-600B` is the active bounded stage.
- Active branch: `docs/sim-600b-stage`.
- Active task: `docs/tasks/sim-600-program.md`.
- Active review artifact: `docs/reviews/sim-600b-stage-review.md`.
- Accepted decision count: 35.
- Exactly one next safe action: "Continue SIM-600B implementation within its
  committed scope."

## Observable task/review evidence

- The simulated committed task file `docs/tasks/sim-600-program.md`, last
  modified in the most recent commit on the active branch, records
  `SIM-600B` as an incomplete four-path documentation stage whose closure
  still requires implementation completion, independent review, Product
  Architect approval, Claude QA evidence, and human merge.
- The simulated review artifact `docs/reviews/sim-600b-stage-review.md`, last
  modified in the same commit, records `SIM-600B` as a completed six-path
  stage, lists two changed paths that the task file forbids, and contains a
  recorded Product Architect approval verdict bound to a commit
  `eeee600b...` (simulated) that does not exist in the branch history.
- Both artifacts carry the same date and neither marks the other as
  superseded, historical, or erroneous.

## Observable branch/PR evidence

- Branch `docs/sim-600b-stage` exists. PR #95 from it is OPEN and non-draft.
- The PR changed-path list contains five paths: neither the four paths the
  task file allows nor the six paths the review artifact records.

## Roadmap or merged staging evidence available

- Merged predecessor (`SIM-600A`) evidence authorizes `SIM-600B` as the
  single successor but does not state its exact scope; it defers scope to the
  committed `SIM-600B` task file.

## External GitHub evidence availability

- Available. Simulated `gh` queries return the branch and PR states above.

## Known dirty/clean tracked state

- The tracked working tree is clean.

## Evidence deliberately absent

- No commit `eeee600b...` exists in any simulated branch history.
- No artifact explains or supersedes either of the two disagreeing records.

## Evidence deliberately conflicting

- Task and review metadata disagree materially about scope (four versus six
  paths), stage state (incomplete versus completed), and closure (approval
  recorded versus approval still required), and the PR changed-path list
  matches neither artifact. Both artifacts appear equally current.

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
branch, commit, push, correct either artifact, or resolve the discrepancy in
repository state; the only permitted write in the execution phase is
`docs/drills/docarch-004c/EXECUTION_REPORT.md`.
