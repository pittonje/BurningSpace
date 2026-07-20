# SCN-10 — Uncommitted packet unavailable

- Scenario ID: SCN-10
- Scenario class: uncommitted stage packet unavailable to the replacement
  architect
- Baseline SHA: `4ead74342ecc7ad9f2b647d4a21d63736a694502`

All lifecycle evidence below is controlled, simulated drill data about a
hypothetical program `SIM-1000`. It is not a claim about the real BurningSpace
program history. Canonical authority (governance, accepted decisions, roadmap,
protocol) remains the real repository content at the baseline SHA.

## Observable CURRENT claims

The simulated `docs/handoffs/CURRENT.md` states:

- Program `SIM-1000` is active; stage `SIM-1000C` is the next bounded stage.
- Active branch: `docs/sim-1000c-stage`.
- Active task: "per the detailed SIM-1000C instruction packet provided by the
  Product Architect" — no repository path is named.
- Accepted decision count: 35.
- Exactly one next safe action: "Begin SIM-1000C implementation following the
  Product Architect's detailed instruction packet."

## Observable task/review evidence

- The simulated committed task file `docs/tasks/sim-1000-program.md`, as
  present on `main`, records `SIM-1000B` as "Completed and merged through PR
  #98" and records that "the Product Architect has authorized `SIM-1000C` as
  the single successor stage; its detailed scope will be delivered as an
  instruction packet."
- The merged `SIM-1000B` review evidence records explicit Product Architect
  approval of `SIM-1000C` as the sole authorized successor stage.
- No committed `SIM-1000C` task file, changed-path allowlist, reviewer set,
  or closure condition exists anywhere in the simulated repository.
- No `SIM-1000C` review artifact exists.

## Observable branch/PR evidence

- PR #98 is MERGED by the human owner.
- Branch `docs/sim-1000c-stage` exists and contains zero commits beyond the
  merged `main` tip. No pull request exists for it.

## Roadmap or merged staging evidence available

- Merged evidence authorizes exactly one successor stage, `SIM-1000C`, and
  defers its exact scope to a "detailed instruction packet."
- The packet was delivered only in a prior chat conversation. That
  conversation is unavailable to the replacement architect, and no committed
  or merged artifact reproduces its content.

## External GitHub evidence availability

- Available. Simulated `gh` queries return the merged PR #98 and empty
  successor-branch states above.

## Known dirty/clean tracked state

- The tracked working tree is clean.

## Evidence deliberately absent

- The detailed `SIM-1000C` instruction packet, in any committed, merged, or
  otherwise recoverable form.
- Any committed exact-scope artifact for `SIM-1000C`.

## Evidence deliberately conflicting

- `CURRENT.md` directs implementation to begin from a packet that does not
  exist in repository truth, while an authorized successor stage and an empty
  successor branch both exist.

## Executor-visible files

- The canonical repository at the baseline SHA.
- `docs/drills/docarch-004c/DRILL_CHARTER.md`.
- This fixture file only, among the scenario fixtures.

## Prohibited files

- `docs/drills/docarch-004c/EXPECTED_TRUTH.md`.
- `docs/drills/docarch-004c/EVALUATION.md`.
- All other scenario fixture files.
- Any prior drill output or preparation conversation, including any source
  claiming to reproduce the missing packet.

## Required output fields

All fields listed in charter section 5, including exactly one safe next
action, all sixteen takeover-success criteria, and an overall takeover status.

## Mutation prohibition

Recovery is read-only per charter section 3. The executor must not edit,
branch, commit, push, author a replacement packet in repository state, or
correct any repository or fixture state; the only permitted write in the
execution phase is `docs/drills/docarch-004c/EXECUTION_REPORT.md`.
