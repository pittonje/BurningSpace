# DOCARCH-002B — Confirmed Mechanics Decision Migration

Owner: `Product Architect`

Approval date: `2026-07-14`

Merge authority: `Human only`

The Product Architect approved all eighteen canonical statements and the B1/B2 identifier treatment recorded here on 2026-07-14.

## Goal

Migrate Product Architect-approved mechanics decisions into canonical decision records without changing runtime behavior, design baselines, roadmap content, or unresolved conflict decisions.

## Stage status

- DOCARCH-002B1 — existing-ID mechanics migration: completed and merged via PR #38.
- DOCARCH-002B2 — approved new-ID mechanics migration: active in this PR.

## Approved canonical statements — DOCARCH-002B1

### BS-MECH-005 — Outpost respawn territorial requirement and combat lock

Outpost respawn eligibility requires exactly six governed sectors, and every governed sector must be owned by the outpost’s faction. A separate 120-second combat lock independently blocks respawn eligibility while active.

### BS-MECH-006 — Exact stabilization requirement for outpost respawn

Every governed sector must be exactly 100% stabilized. Any value below 100% disables eligibility immediately. No tolerance, threshold below 100%, or grace period applies.

### GAME-001-D1 — Pure server-side eligibility calculation

Outpost respawn eligibility is implemented as a pure, deterministic, server-side calculation with no cached state, no client input, and no runtime integration side effects.

### GAME-001-D2 — Strict six-sector cardinality

Eligibility requires exactly six governed sectors. Snapshots with fewer or more than six sectors fail eligibility regardless of their contents.

### GAME-001-D3 — Exact 100% stabilization, no tolerance

All six governed sectors must equal exactly 100% stabilization. No threshold or tolerance below 100% satisfies eligibility.

### GAME-001-D4 — Exclusive combat-lock boundary

The combat lock is active only while nowMs < combatLockUntilMs. At exact equality the lock is expired. When nowMs > combatLockUntilMs the lock is expired. A null lock value means no lock.

### GAME-001-D5 — Shield state excluded from respawn eligibility

Outpost shield state is not an input to respawn eligibility. Meeting or exceeding a shield activation threshold grants no respawn eligibility.

### BS-MECH-013 — Remote ship control from allied outposts

A player in the no-active-ship state may remotely take control of an eligible allied ship docked at an allied outpost, subject to the established eligibility rules. This does not permit unrestricted switching while another ship is active.

### BS-MECH-014 — Ending current ship control requires main-base docking

A player currently controlling a ship may end control and become eligible to select another ship only after docking the current ship at the faction’s main base.

Docking at an outpost, including a fully stabilized allied outpost, is not sufficient for role or ship switching.

After main-base docking, the ship remains in the world, the player returns to the no-active-ship state, and remote control permitted by BS-MECH-013 becomes available.

The restriction prevents rapid or exploitable role changes across the front.

### BS-MECH-015 — No additional delay after valid main-base return

After the current ship is docked at the faction’s main base and the player enters the no-active-ship state, the player may immediately control another eligible ship.

There is no additional cooldown, preparation timer, or role-change delay. The physical return to the main faction base is the complete switching cost.

## Approved canonical statements — DOCARCH-002B2

The IDs and meanings below are approved. DOCARCH-002B1 must not create their instance files.

### BS-MECH-016

All sectors start owned by one of the two factions. There are no neutral starting sectors.

### BS-MECH-017

Any enemy sector may be attacked. Adjacency is not required.

### BS-MECH-018

Sector capture becomes available only after defensive turrets are destroyed.

No turret count is part of this approved statement.

### BS-MECH-019

Capture weight is based on combat units, including players and creeps. Solo capture is allowed but strategically impractical. A tie stalls progress. Defenders restore control while attackers reduce it.

No numeric meter values are part of this approved statement.

### BS-MECH-021

Each outpost governs exactly six sectors.

### BS-MECH-022

The outpost shield is active when the faction owns at least 3 of the 6 governed sectors. The shield is inactive at 2 of 6 or fewer.

### BS-MECH-024

Sector capture does not restore destroyed turrets.

No turret restoration conditions are part of this approved statement.

### BS-MECH-028

Sectors use control points. Outposts use structural HP.

No capture threshold is part of this approved statement.

## Reserved and unrecovered identifiers

- Reserved without files: `BS-MECH-020`, `BS-MECH-023`, `BS-MECH-025`, `BS-MECH-026`, `BS-MECH-027`.
- Not recovered and not assignable: `BS-MECH-001–004`, `BS-MECH-007–012`.
- The prior allowance referenced by `BS-MECH-014` has no recovered stable ID; no predecessor ID may be invented.

## DOCARCH-002B1 exact allowed files

1. `docs/decisions/BS-MECH-005.md`
2. `docs/decisions/BS-MECH-006.md`
3. `docs/decisions/GAME-001-D1.md`
4. `docs/decisions/GAME-001-D2.md`
5. `docs/decisions/GAME-001-D3.md`
6. `docs/decisions/GAME-001-D4.md`
7. `docs/decisions/GAME-001-D5.md`
8. `docs/decisions/BS-MECH-013.md`
9. `docs/decisions/BS-MECH-014.md`
10. `docs/decisions/BS-MECH-015.md`
11. `docs/decisions/DECISION_INDEX.md`
12. `docs/tasks/docarch-002b-confirmed-mechanics-migration.md`
13. `docs/reviews/docarch-002b-mechanics-migration-review.md`
14. `docs/decisions/README.md`
15. `docs/handoffs/CURRENT.md`

All other files are forbidden. In particular, no runtime, tests, workflow, dependency, design, architecture, agent, project-context, entrypoint, template, roadmap, B2 instance, reserved-ID, or missing-ID file may change.

## Record rules

- All ten B1 records have status `accepted`, owner `Product Architect`, and migration approval date `2026-07-14`.
- Original decision dates are not recovered and must not be invented.
- Records follow `DECISION_TEMPLATE.md` section order exactly.
- Decision statements, dependencies, evidence mappings, rationales, and required notes follow the accepted implementation packet exactly.
- Runtime evidence corroborates repository-explicit decisions only and does not become authority over Product Architect-approved mechanics.

## Required review

- Product Architect: conformance to approved decisions and authority.
- Gameplay Reviewer: mechanics consistency and absence of unintended implications.
- Claude QA: automatically routed documentation and acceptance review.
- Documentation consistency review: template, index, dependencies, links, and scope.

Reviewers remain read-only and fill the review artifact against the committed SHA. Human-only merge authority remains mandatory.

## Validation

- Exactly 15 changed paths and ten accepted B1 instance files.
- Exact approved B1 IDs; no B2, reserved, or unrecovered instance files.
- Exact template section order, metadata, dependency graph, evidence mapping, and notes.
- Each record appears once in the non-canonical index.
- Empty independent reviewer verdicts before review.
- No runtime, design, roadmap, architecture implementation, workflow, dependency, test, or agent change.

Do not run dependency installation, tests, builds, typechecks, or runtime diagnostics for this documentation-only migration.

## Rollback

Revert the single DOCARCH-002B1 documentation commit. No runtime, data, dependency, workflow, or deployment rollback is required.
