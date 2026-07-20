# DOCARCH-003 Readiness Baseline

Status: Point-in-time evidence baseline for DOCARCH-003

This file records repository implementation evidence at merged PR #46. It is
not a mechanics or architecture decision registry. Accepted decision records
remain canonical in their domains, implementation state may evolve, and future
roadmap status must be updated through bounded tasks.

## Repository baseline

- Base merge: `0e8586f` / PR #46.
- DOCARCH-002 is closed.
- The registry contains 35 accepted decisions: 18 `BS-MECH`, 5 `GAME-001`,
  7 `BS-ARCH`, 4 `BS-PROC`, and 1 `CI`.
- The repository is a TypeScript npm-workspaces monorepo.
- The browser client uses Phaser and Vite.
- The Node.js/TypeScript server uses Colyseus.

## Classification vocabulary

- `IMPLEMENTED`
- `PARTIAL`
- `PROTOTYPE`
- `DOCUMENTED ONLY`
- `ABSENT`
- `UNKNOWN`

`IMPLEMENTED` describes observed repository behavior at this baseline; it does
not claim production readiness. `PROTOTYPE` identifies preserved,
non-authoritative local behavior. Confidence measures the strength of the cited
repository evidence, not delivery confidence.

## Implementation-state matrix

| Capability | State | Evidence paths | Governing decisions | Principal missing work | Confidence |
|---|---|---|---|---|---|
| Repository/workspaces | `IMPLEMENTED` | `package.json`; `apps/*/package.json`; `packages/*/package.json` | `BS-ARCH-002` | Continue bounded migration without changing the workspace/tooling contract silently. | High |
| Client bootstrap | `IMPLEMENTED` | `apps/client/src/main.ts`; `apps/client/src/config/phaserConfig.ts`; `apps/client/src/scenes/BootScene.ts` | `BS-ARCH-003`, `BS-ARCH-007` | Mature the startup surface beyond the network-test entry while preserving scene-order authority. | High |
| Server bootstrap | `IMPLEMENTED` | `apps/server/src/index.ts`; `apps/server/src/rooms/BattleRoom.ts` | `BS-ARCH-001`, `BS-ARCH-003` | Add production operations and campaign rooms/state through dedicated work. | High |
| Connection flow | `IMPLEMENTED` | `apps/client/src/network/NetworkClient.ts`; `apps/client/src/scenes/NetworkTestScene.ts`; `apps/server/src/rooms/BattleRoom.ts` | `BS-ARCH-001`, `BS-ARCH-003` | Add durable identity/session and reconnect behavior; the current flow is join, profile, play/spectate, and disconnect. | High |
| Shared/protocol contracts | `PARTIAL` | `packages/shared/src/index.ts`; `packages/protocol/src/index.ts`; `packages/protocol/package.json`; `packages/protocol/test/profileBoundary.test.ts` | `BS-ARCH-004`, `BS-ARCH-005` | Continue an approved incremental migration while preserving public compatibility and dependency direction. | High |
| Movement/state authority | `IMPLEMENTED` | `apps/server/src/rooms/BattleRoom.ts`; `apps/server/src/systems/shipMovement.ts`; `apps/server/src/schema/*`; `apps/client/src/scenes/MultiplayerGameScene.ts` | `BS-ARCH-001` | Extend authoritative state to campaign entities and add room-level verification. | High |
| Combat | `IMPLEMENTED` | `apps/server/src/rooms/BattleRoom.ts`; `apps/server/src/systems/combat.ts`; `apps/server/test/combat.test.ts` | `BS-ARCH-001` | Stabilize the arena implementation and extend authority to territorial targets and infrastructure. | High |
| Death/respawn | `PARTIAL` | `apps/server/src/systems/combat.ts`; `apps/server/src/systems/outpostRespawn.ts`; `apps/server/test/outpostRespawn.test.ts` | `BS-MECH-005`, `BS-MECH-006`, `GAME-001-D1` through `GAME-001-D5` | Integrate accepted outpost-respawn eligibility with real authoritative outpost/sector state and revalidate the helper at integration time. | High |
| Ship switching | `DOCUMENTED ONLY` | `docs/decisions/BS-MECH-013.md` through `docs/decisions/BS-MECH-015.md` | `BS-MECH-013`, `BS-MECH-014`, `BS-MECH-015` | Implement server-authoritative remote control, main-base docking release, validation, protocol, and UX. | High |
| Sectors | `DOCUMENTED ONLY` | `docs/decisions/BS-MECH-016.md` through `docs/decisions/BS-MECH-020.md`; `packages/config/src/map.full-mvp.ts` | `BS-MECH-016` through `BS-MECH-020`, `BS-ARCH-006` | Build authoritative sector topology, ownership, contest state, turret gate, and capture progression; current config has no runtime consumer. | High |
| Governed sectors/shields | `DOCUMENTED ONLY` | `docs/decisions/BS-MECH-021.md` through `docs/decisions/BS-MECH-023.md`; `packages/config/src/map.full-mvp.ts` | `BS-MECH-021`, `BS-MECH-022`, `BS-MECH-023` | Implement exactly-six governance, shield thresholds, and the 4/6 post-capture state. | High |
| Outposts | `DOCUMENTED ONLY` | `docs/decisions/BS-MECH-026.md` through `docs/decisions/BS-MECH-028.md`; `docs/design/mvp-game-design.md` | `BS-MECH-026`, `BS-MECH-027`, `BS-MECH-028` | Build authoritative outpost state, damage/capture, partial post-capture state, and persistence. | High |
| Turrets | `PROTOTYPE` | `apps/client/src/scenes/GameScene.ts`; `apps/client/public/assets/*turret.png`; `docs/decisions/BS-MECH-018.md`; `docs/decisions/BS-MECH-024.md`; `docs/decisions/BS-MECH-025.md` | `BS-ARCH-007`, `BS-MECH-018`, `BS-MECH-024`, `BS-MECH-025` | Replace non-authoritative local presentation/behavior with server-authoritative destruction, capture gating, and restoration. | High |
| Creeps | `PROTOTYPE` | `apps/client/src/systems/NpcManager.ts`; `apps/client/src/entities/NpcShip.ts`; `docs/decisions/BS-MECH-019.md` | `BS-ARCH-007`, `BS-MECH-019` | Implement the minimum server-side creep participation required for capture weighting; advanced AI and economy remain later work. | High |
| Resources/logistics | `DOCUMENTED ONLY` | `docs/design/mvp-game-design.md`; `packages/balance/src/mvp-balance-v0.1.ts` | No accepted resource/logistics mechanics decision; `BS-ARCH-006` governs package placement | Establish future decision gates before implementation; historical balance data is not current mechanics authority. | High |
| Persistence | `ABSENT` | `apps/server/package.json`; `apps/server/src/index.ts`; `apps/server/src/rooms/BattleRoom.ts` | Product Architect DOCARCH-003 MVP scope lock | Select an approved persistence architecture, data model, lifecycle, migrations, recovery, and tests before campaign expansion. | High |
| Accounts/identity | `PARTIAL` | `apps/server/src/schema/ParticipantState.ts`; `apps/server/src/validation/nickname.ts`; `apps/server/src/rooms/BattleRoom.ts`; `packages/shared/src/profile-contract.ts` | `BS-ARCH-001`; Product Architect DOCARCH-003 MVP scope lock | Add minimum durable identity/session foundations; current nickname/profile and Colyseus session identity are transient and unauthenticated. | High |
| Reconnection | `ABSENT` | `apps/client/src/network/NetworkClient.ts`; `apps/server/src/rooms/BattleRoom.ts` | Product Architect DOCARCH-003 MVP scope lock | Define and implement reconnect/resume behavior bound to minimum identity/session state. | High |
| TestBattleRoom | `PARTIAL` | `apps/server/src/rooms/TestBattleRoom.ts`; `apps/client/scripts/network-client-callback-check.ts`; `apps/server/src/index.ts` | `BS-ARCH-001`; SEC-006 reserved task | Preserve the diagnostic while structurally isolating it from production registration and add an automated exposure guard. | High |
| Automated tests | `PARTIAL` | `apps/server/test/*`; `packages/protocol/test/profileBoundary.test.ts`; `apps/*/scripts/*check.ts`; `vitest.config.ts` | `BS-PROC-004`, `CI-003-D1` | Add room-level multiplayer and campaign integration tests; several current checks are unit or dedicated diagnostic scripts. | High |
| CI/branch protection | `PARTIAL` | `.github/workflows/pr-checks.yml`; `.github/workflows/claude-qa-review-pilot.yml`; `.github/scripts/classify-pr-risk.py` | `BS-PROC-001`, `BS-PROC-004`, `CI-003-D1` | Verify/enforce branch protection separately; possible CI-004 remains dedicated work. | Medium |
| Config/secrets | `PARTIAL` | `apps/client/.env.example`; `apps/server/.env.example`; `packages/config/src/*`; `docs/decisions/BS-ARCH-006.md` | `BS-ARCH-006` | Integrate approved environment-neutral topology config and establish production secret/config handling; current examples cover only URLs/port. | High |
| Balance | `PARTIAL` | `packages/balance/src/mvp-balance-v0.1.ts`; `apps/client/src/config/gameConfig.ts`; `apps/client/src/config/runtimeBalance.ts`; `docs/design/balance-v0.1.md` | `BS-ARCH-006`; accepted mechanics override conflicting historical values | Reconcile and migrate accepted active values through bounded work; the balance package is not consumed and local prototype tuning is non-authoritative. | High |
| Observability | `PARTIAL` | `apps/server/src/index.ts`; `apps/server/src/rooms/BattleRoom.ts`; `apps/client/src/network/NetworkClient.ts` | No accepted observability decision | Extend the health endpoint and console logs with production-grade structured telemetry, metrics, diagnostics, and incident evidence. | High |
| Deployment | `ABSENT` | Root and workspace manifests; repository file inventory at `0e8586f` | Product Architect DOCARCH-003 MVP scope lock | Define and exercise a minimum deployment/operations path; no deployment or migration foundation is present. | High |
| Security | `PARTIAL` | `apps/server/src/validation/playerInput.ts`; `apps/server/src/validation/nickname.ts`; `apps/server/src/rooms/BattleRoom.ts`; `apps/server/src/rooms/TestBattleRoom.ts` | `BS-ARCH-001`; SEC-006 reserved task | Harden authority boundaries, identity/session handling, abuse controls, and diagnostic isolation. | Medium |
| Client MVP UX | `PARTIAL` | `apps/client/src/scenes/NetworkTestScene.ts`; `apps/client/src/scenes/MultiplayerGameScene.ts`; `apps/client/src/entities/NetworkShipView.ts` | `BS-ARCH-001`, `BS-ARCH-003` | Add the minimum campaign, territorial, outpost, ship-switching, state/error, and operations UX needed to exercise the MVP loop. | High |
| Operational tooling | `PARTIAL` | `apps/client/src/ui/AdminPanel.ts`; `apps/*/scripts/*check.ts`; `.github/workflows/*` | `BS-ARCH-007`, `BS-PROC-004`, `CI-003-D1` | Provide production-safe campaign administration, recovery, verification, and operational controls; current admin tooling belongs to the local prototype. | High |

## Authority corrections

`packages/shared` remains the current canonical owner of broad runtime and
profile contracts. `packages/protocol` is an active transitional public
compatibility boundary that exposes or re-exports public contracts while
depending on shared. The accepted direction is `protocol -> shared`; shared
must not depend on protocol. Runtime consumption and migration progress are
partial, but that does not transfer canonical broad-contract ownership to
protocol.

The minimum campaign slice is not one outpost plus one sector. It requires one
outpost with exactly six governed sectors, the accepted shield thresholds, the
4/6 post-capture state, and the relevant accepted sector/outpost mechanics.

Creeps are not wholly outside MVP. The minimum server-side creep participation
needed to satisfy `BS-MECH-019` belongs inside the territorial MVP. Advanced
NPC/creep AI and a full economy remain post-MVP.

## Current playable slice

The current multiplayer slice lets clients connect to the Colyseus `battle`
room, submit a validated nickname and player/spectator mode, choose a faction
when playing, send input, and render synchronized participants, ships, and
projectiles. The server validates input, owns movement, projectile simulation,
damage, death, timed arena respawn, spawn invulnerability, and canonical room
state. The client supplies input and presentation, including spectator camera,
HUD, and combat feedback.

This is an arena-combat foundation. It has no durable account or campaign
state, reconnect/resume path, authoritative sectors, governed-sector shields,
outpost capture, live turret lifecycle, campaign creep participation, or
deployment foundation.

## Principal gaps

- Persistence.
- Accounts and minimum durable identity/session state.
- Reconnect/resume behavior.
- Authoritative territorial systems.
- Authoritative outposts and turret destruction/restoration.
- Live integration of `outpostRespawn.ts` with real sector/outpost state.
- Room-level multiplayer tests.
- Deployment.
- Production-grade observability.

## Critical risks

- `TestBattleRoom` preserves useful diagnostics but remains structurally close
  to production room code; accidental production exposure must be prevented by
  SEC-006 isolation and an automated guard.
- Focused tests around unwired code, especially `outpostRespawn.ts`, can create
  false confidence until the code is integrated with authoritative live state.
- Expanding campaign systems before persistence risks building core state on an
  unsuitable lifecycle and recovery foundation.
- Repository process relies on checks and human-only merge rules without
  verified branch-protection enforcement; possible CI-004 remains separate.
- `CURRENT.md` remained stale after the D3 merge. This PR corrects the instance;
  a general recovery procedure remains reserved for DOCARCH-004.

## Product Architect decisions

These decisions are DOCARCH-003 roadmap-scope authority. They are not new
accepted decision records and do not change the accepted count of 35.

1. **MVP boundary.** MVP includes authority/security hardening; persistent-world
   and minimum identity/session foundations; territorial gameplay; one outpost
   with exactly six governed sectors; shields; turret destruction/restoration;
   outpost capture and partial post-capture state; integrated outpost respawn
   eligibility; ship control/switching required by accepted decisions; minimum
   server-side creep participation required by `BS-MECH-019`; minimum client UX
   and deployment/operations needed to exercise the loop; and MVP
   stabilization. MVP excludes full economy, full logistics, mining/resource
   production, portals, advanced NPC/creep AI, and broad post-MVP social and
   operational systems.
2. **Decision-record boundary.** DOCARCH-003 creates no new accepted decision
   records. Roadmap-blocking unknowns become future decision gates or dedicated
   tasks rather than silent resolutions.
3. **`outpostRespawn.ts`.** Accepted respawn semantics remain authoritative.
   The present helper is implementation evidence, not immutable architecture;
   it must be revalidated and may be adapted when real sector/outpost state
   exists without changing `BS-MECH-005`, `BS-MECH-006`, or `GAME-001-D1`
   through `GAME-001-D5` meanings.
4. **`TestBattleRoom`.** Preserve useful diagnostic capability. SEC-006 must
   structurally isolate it from production registration, preferably through
   test-only infrastructure or a dedicated test entrypoint, and add an
   automated guard against accidental production exposure.
5. **`CURRENT.md`.** Correct the stale post-D3 handoff in DOCARCH-003A.
   DOCARCH-004 must later define a general recovery procedure for future
   `CURRENT`-versus-git discrepancies.

## Approved roadmap shape

The canonical roadmap will use these high-level waves:

1. Authority and security hardening
2. Persistent world and identity foundation
3. Territorial core
4. Outpost and infrastructure loop
5. MVP client and operational surface
6. MVP stabilization
7. Post-MVP expansion

This baseline does not define the full roadmap, wave completion criteria, or
task dependency graph.

## DOCARCH-003B boundary

After DOCARCH-003A merges, DOCARCH-003B will create the canonical development
roadmap using this evidence and scope lock. DOCARCH-003B will not modify
runtime.

## DOCARCH-004 reserved scope

DOCARCH-004 is reserved for the architect-takeover protocol:

- cold-start sequence;
- authority recovery;
- stale `CURRENT` recovery;
- active-task discovery;
- sole-next-action recovery;
- forbidden actions;
- merge authority;
- takeover success criteria;
- cold takeover drill.

DOCARCH-003A does not implement any of this scope.

## DOCARCH-005 reserved scope

DOCARCH-005 is reserved for role and model portability:

- vendor/model-independent roles;
- minimum role capabilities;
- implementer/reviewer separation;
- standardized evidence;
- fallback routing;
- model replacement;
- prompt/adapter portability;
- AGENT-004 recovery or creation.

DOCARCH-003A does not implement any of this scope.

## Dedicated deferred tasks

- `SEC-006` is the established dedicated task name for `TestBattleRoom`
  isolation and its production-exposure guard.
- Possible `CI-004` is the established non-final label for branch-protection or
  related CI enforcement work.
- No additional deferred-task label is made canonical by this baseline; any
  later label is a non-canonical proposal until approved through a bounded
  task.
