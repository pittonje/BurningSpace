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
| `BS-MECH-020` | Owner-relative signed sector-control meter | accepted | Sector control and ownership transition | `BS-MECH-019` | [record](BS-MECH-020.md) |
| `BS-MECH-021` | Outpost sector governance cardinality | accepted | Mechanics — outpost governance | none | [record](BS-MECH-021.md) |
| `BS-MECH-022` | Outpost shield sector threshold | accepted | Mechanics — outpost shield eligibility | `BS-MECH-021` | [record](BS-MECH-022.md) |
| `BS-MECH-023` | Post-outpost-capture governed-sector state | accepted | Outpost ownership transition and shield state | `BS-MECH-021`, `BS-MECH-022`, `BS-MECH-026` | [record](BS-MECH-023.md) |
| `BS-MECH-024` | Sector capture does not restore turrets | accepted | Mechanics — turret persistence | none | [record](BS-MECH-024.md) |
| `BS-MECH-025` | Turret restoration eligibility | accepted | Sector defensive-turret restoration | `BS-MECH-024` | [record](BS-MECH-025.md) |
| `BS-MECH-026` | Outpost capture at zero structural HP | accepted | Outpost capture trigger | `BS-MECH-028` | [record](BS-MECH-026.md) |
| `BS-MECH-027` | Partial post-capture outpost condition | accepted | Outpost state immediately after ownership transition | `BS-MECH-026` | [record](BS-MECH-027.md) |
| `BS-MECH-028` | Sector and outpost contest metrics | accepted | Mechanics — capture metrics | none | [record](BS-MECH-028.md) |
| `BS-ARCH-001` | Server-authoritative multiplayer model | accepted | Architecture — multiplayer authority | none | [record](BS-ARCH-001.md) |
| `BS-ARCH-002` | npm-workspaces TypeScript monorepo | accepted | Architecture — repository structure and workspace tooling | none | [record](BS-ARCH-002.md) |
| `BS-ARCH-003` | Current client and server framework retention | accepted | Architecture — application frameworks | none | [record](BS-ARCH-003.md) |
| `BS-ARCH-004` | shared as current canonical runtime contract owner | accepted | Architecture — contract ownership | none | [record](BS-ARCH-004.md) |
| `BS-ARCH-005` | protocol as transitional public compatibility boundary | accepted | Architecture — protocol and package dependency direction | `BS-ARCH-004` | [record](BS-ARCH-005.md) |
| `BS-ARCH-006` | Balance and configuration package boundaries | accepted | Architecture — balance and configuration separation | none | [record](BS-ARCH-006.md) |
| `BS-ARCH-007` | Local GameScene prototype is non-authoritative | accepted | Architecture — client prototype boundary | `BS-ARCH-001` | [record](BS-ARCH-007.md) |
| `BS-PROC-001` | Human-only merge authority | accepted | Process governance — merge authority | none | [record](BS-PROC-001.md) |
| `BS-PROC-002` | Separation of governance responsibilities | accepted | Process governance — role boundaries and independent review | `BS-PROC-001` | [record](BS-PROC-002.md) |
| `BS-PROC-003` | Durable governance roles are independent of model or vendor | accepted | Process governance — role identity | `BS-PROC-002` | [record](BS-PROC-003.md) |
| `BS-PROC-004` | Required review evidence before human merge | accepted | Process governance — review evidence and merge preconditions | `BS-PROC-001`, `BS-PROC-002` | [record](BS-PROC-004.md) |
| `BS-PROC-005` | Architect Takeover Validation Separates Safety from Exact Conformance | accepted | Process governance — architect takeover validation | `BS-PROC-001`, `BS-PROC-002`, `BS-PROC-004`, `CI-003-D1` | [record](BS-PROC-005.md) |
| `CI-003-D1` | Deterministic trusted-base PR-risk routing for Claude QA | accepted | CI governance — PR QA routing and QA evidence binding | `BS-PROC-001`, `BS-PROC-004` | [record](CI-003-D1.md) |

## DOCARCH-002D status

- DOCARCH-002C is complete.
- DOCARCH-002D1 merged through PR #44.
- DOCARCH-002D2 merged through PR #45.
- DOCARCH-002D3 is the active final reconciliation and closure candidate; it is not yet merged and creates no decision records.
- The accepted decision-record count is 36: 18 `BS-MECH`, 5 `GAME-001`,
  7 `BS-ARCH`, 5 `BS-PROC`, and 1 `CI`.
- After D3 human merge, DOCARCH-003 — Canonical Development Roadmap is the next repository task.
- AGENT-004 remains deferred to DOCARCH-005.

## Not recovered — do not assign

- `BS-MECH-001–004`
- `BS-MECH-007–012`

No placeholder files are authorized for reserved or unrecovered IDs.
