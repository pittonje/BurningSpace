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
| `BS-MECH-016` | Initial sector ownership, no neutral start | accepted | Mechanics — sector ownership | none | [record](BS-MECH-016.md) |
| `BS-MECH-017` | Non-adjacent enemy-sector attacks | accepted | Mechanics — sector attack eligibility | none | [record](BS-MECH-017.md) |
| `BS-MECH-018` | Turret-gated sector capture | accepted | Mechanics — sector capture prerequisites | none | [record](BS-MECH-018.md) |
| `BS-MECH-019` | Combat-unit capture weighting | accepted | Mechanics — sector capture progress | none | [record](BS-MECH-019.md) |
| `BS-MECH-021` | Outpost sector governance cardinality | accepted | Mechanics — outpost governance | none | [record](BS-MECH-021.md) |
| `BS-MECH-022` | Outpost shield sector threshold | accepted | Mechanics — outpost shield eligibility | `BS-MECH-021` | [record](BS-MECH-022.md) |
| `BS-MECH-024` | Sector capture does not restore turrets | accepted | Mechanics — turret persistence | none | [record](BS-MECH-024.md) |
| `BS-MECH-028` | Sector and outpost contest metrics | accepted | Mechanics — capture metrics | none | [record](BS-MECH-028.md) |
| `BS-ARCH-001` | Server-authoritative multiplayer model | accepted | Architecture — multiplayer authority | none | [record](BS-ARCH-001.md) |
| `BS-ARCH-002` | npm-workspaces TypeScript monorepo | accepted | Architecture — repository structure and workspace tooling | none | [record](BS-ARCH-002.md) |
| `BS-ARCH-003` | Current client and server framework retention | accepted | Architecture — application frameworks | none | [record](BS-ARCH-003.md) |
| `BS-ARCH-004` | shared as current canonical runtime contract owner | accepted | Architecture — contract ownership | none | [record](BS-ARCH-004.md) |
| `BS-ARCH-005` | protocol as transitional public compatibility boundary | accepted | Architecture — protocol and package dependency direction | `BS-ARCH-004` | [record](BS-ARCH-005.md) |
| `BS-ARCH-006` | Balance and configuration package boundaries | accepted | Architecture — balance and configuration separation | none | [record](BS-ARCH-006.md) |
| `BS-ARCH-007` | Local GameScene prototype is non-authoritative | accepted | Architecture — client prototype boundary | `BS-ARCH-001` | [record](BS-ARCH-007.md) |

## Approved, pending migration — DOCARCH-002C

- `BS-PROC-001`
- `BS-PROC-002`
- `BS-PROC-003`
- `CI-003-D1`

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
