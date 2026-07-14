# BurningSpace Decision Index

This file is non-canonical navigation. Individual decision files are authoritative. The index is derived from those records and must not create, approve, or modify decisions.

## Accepted decision records

| ID | Title | Status | Scope | Depends on | File |
|---|---|---|---|---|---|
| `BS-MECH-005` | Outpost respawn territorial requirement and combat lock | accepted | Mechanics — outpost respawn | none | [record](BS-MECH-005.md) |
| `BS-MECH-006` | Exact stabilization requirement for outpost respawn | accepted | Mechanics — outpost respawn | none | [record](BS-MECH-006.md) |
| `GAME-001-D1` | Pure server-side eligibility calculation | accepted | GAME-001 task-local implementation | none | [record](GAME-001-D1.md) |
| `GAME-001-D2` | Strict six-sector cardinality | accepted | GAME-001 task-local implementation | `BS-MECH-005` | [record](GAME-001-D2.md) |
| `GAME-001-D3` | Exact 100% stabilization, no tolerance | accepted | GAME-001 task-local implementation | `BS-MECH-006` | [record](GAME-001-D3.md) |
| `GAME-001-D4` | Exclusive combat-lock boundary | accepted | GAME-001 task-local implementation | `BS-MECH-005` | [record](GAME-001-D4.md) |
| `GAME-001-D5` | Shield state excluded from respawn eligibility | accepted | GAME-001 task-local implementation | none | [record](GAME-001-D5.md) |
| `BS-MECH-013` | Remote ship control from allied outposts | accepted | Mechanics — ship control | none | [record](BS-MECH-013.md) |
| `BS-MECH-014` | Ending current ship control requires main-base docking | accepted | Mechanics — ship control | `BS-MECH-013` | [record](BS-MECH-014.md) |
| `BS-MECH-015` | No additional delay after valid main-base return | accepted | Mechanics — ship control | `BS-MECH-013`, `BS-MECH-014` | [record](BS-MECH-015.md) |

## Approved, pending migration — DOCARCH-002B2

The meanings and IDs below are Product Architect approved, but instance files are not yet created:

- `BS-MECH-016`
- `BS-MECH-017`
- `BS-MECH-018`
- `BS-MECH-019`
- `BS-MECH-021`
- `BS-MECH-022`
- `BS-MECH-024`
- `BS-MECH-028`

## Reserved — do not create files

- `BS-MECH-020` — signed sector meter
- `BS-MECH-023` — post-capture 4/6 state
- `BS-MECH-025` — turret restoration conditions
- `BS-MECH-026` — zero-HP outpost capture
- `BS-MECH-027` — retained HP/resources

## Not recovered — do not assign

- `BS-MECH-001–004`
- `BS-MECH-007–012`

No placeholder files are authorized for reserved or unrecovered IDs.
