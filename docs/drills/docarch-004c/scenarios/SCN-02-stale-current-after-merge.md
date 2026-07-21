# SCN-02 — Stale CURRENT after human merge

- Scenario ID: SCN-02
- Scenario class: stale `CURRENT.md` after human merge
- Baseline SHA: `4ead74342ecc7ad9f2b647d4a21d63736a694502`

All lifecycle evidence below is controlled, simulated drill data about a
hypothetical program `SIM-200`. It is not a claim about the real BurningSpace
program history. Canonical authority (governance, accepted decisions, roadmap,
protocol) remains the real repository content at the baseline SHA.

## Observable CURRENT claims

The simulated `docs/handoffs/CURRENT.md` states:

- Program `SIM-200` is active; stage `SIM-200B` is the active bounded stage
  and is incomplete.
- Active branch: `docs/sim-200b-stage`.
- Active task: `docs/tasks/sim-200-program.md`.
- Active review artifact: `docs/reviews/sim-200b-stage-review.md`.
- Accepted decision count: 35.
- Exactly one next safe action: "Required reviewers complete the SIM-200B
  conformance review and a human merges PR #91."

## Observable task/review evidence

- The simulated committed task file `docs/tasks/sim-200-program.md` records
  `SIM-200B` as active with an exact three-path scope.
- The simulated review artifact `docs/reviews/sim-200b-stage-review.md` is
  complete: all required reviewer verdicts are recorded and bound to the final
  PR #91 head, including Product Architect approval and Claude QA evidence.
- The merged `SIM-200B` review evidence records explicit Product Architect
  approval of exactly one successor stage, `SIM-200C`, described as "an
  independent validation stage to be scoped by a future committed task."
- No task file, packet, or committed artifact for `SIM-200C` exists anywhere
  in the simulated repository.

## Observable branch/PR evidence

- PR #91 is MERGED. The merge commit is `bbbb200b...` (simulated), merged by
  the human owner; `main` contains the `SIM-200B` implementation and evidence
  commits.
- Branch `docs/sim-200b-stage` still exists on the remote but is fully merged
  into `main`.
- No branch for any `SIM-200C` work exists.

## Roadmap or merged staging evidence available

- The merged `SIM-200B` review evidence (above) is the only successor staging
  evidence; it authorizes `SIM-200C` and nothing else.
- The simulated program documentation names no other candidate successor.

## External GitHub evidence availability

- Available. Simulated `gh` queries return the merged PR #91 state above.

## Known dirty/clean tracked state

- The tracked working tree is clean.

## Evidence deliberately absent

- No committed `SIM-200C` task, scope, branch, or review artifact exists.
- `CURRENT.md` has not been updated since before the PR #91 merge.

## Evidence deliberately conflicting

- The `CURRENT.md` claims describe `SIM-200B` as incomplete and its review and
  merge as pending, while branch/PR evidence shows PR #91 already merged by a
  human.

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
branch, commit, push, or correct any repository or fixture state — including
the simulated stale `CURRENT.md`; the only permitted write in the execution
phase is `docs/drills/docarch-004c/EXECUTION_REPORT.md`.
