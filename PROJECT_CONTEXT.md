# BurningSpace Project Context

_Last updated: 2026-07-11_  
_Context owner: Product Architect / ChatGPT_  
_Update rule: Codex must update this file whenever project structure, stack, architecture, agent workflow, or accepted design baseline changes._

## 1. Purpose of this file

This is the primary handoff context for BurningSpace. Every AI agent, reviewer, coding session, design session, and future chat should read it before acting on the project.

This is not a task file, full design document, architecture specification, or changelog. Task-specific instructions live in `docs/tasks/`, detailed design in `docs/design/`, architecture in `docs/architecture/`, and agent rules in `AGENTS.md` and `docs/agents/`.

This file is the compact source of truth for current repository state, technical direction, preservation rules, accepted MVP baseline, agent workflow, and recommended next work. If it conflicts with older chat memory, notes, or assumptions, this file wins unless the Product Architect explicitly says otherwise.

## 2. Project summary

BurningSpace is a server-authoritative persistent multiplayer top-down space campaign game.

The long-term concept includes two main factions, a persistent campaign map, bases, outposts, sectors, turrets, mining and logistics, server-controlled creeps, physical projectiles, player and AI-controlled ships, territory control, campaign resets, and later persistent account progression.

The current focus is narrower:

1. Preserve the existing working prototype and multiplayer foundation.
2. Introduce clean structural boundaries.
3. Document architecture and agent workflow.
4. Evolve incrementally toward a persistent campaign.

The current multiplayer path already provides a server-authoritative movement and combat foundation. The local `GameScene` prototype is preserved as reference material and must not be confused with the authoritative multiplayer path.

## 3. Current repository state and stack

The repository is an npm-workspaces TypeScript monorepo. It is not empty and is not merely a client-only prototype.

### Client

- TypeScript
- Phaser 3
- Vite
- Colyseus browser client
- HTML/CSS
- Canvas/WebGL rendering through Phaser
- Existing assets under `apps/client/public/assets/`

### Server

- Node.js
- TypeScript
- Colyseus
- WebSocket transport
- HTTP health endpoint
- In-memory server state
- Server-authoritative multiplayer movement/combat foundation

### Workspaces and packages

- Package manager: npm; do not introduce pnpm without a dedicated approved task.
- Workspace roots: `apps/*` and `packages/*`.
- Lockfile: `package-lock.json`.
- Existing runtime shared package: `packages/shared`.
- Structural packages: `packages/balance`, `packages/config`, `packages/protocol`.

`packages/shared` currently mixes network message names/types, faction and join-mode types, network/world constants, and movement types.

There is no database, persistence layer, Prisma, PostgreSQL, or account system. Server state is currently in memory.

Do not replace the working Phaser/Colyseus foundation during structural PRs. Earlier discussions may have considered PixiJS or a custom WebSocket stack, but the current plan is to extend the actual repository safely rather than rebuild it.

## 4. Repository preservation rule

Extend the repository incrementally. Do not rebuild its structure from scratch.

Preserve:

- `apps/client`
- `apps/server`
- `packages/shared`
- client assets and loader paths
- the current server-authoritative multiplayer path
- the local `GameScene` prototype
- `package-lock.json`
- the npm workspace setup

If a file looks old or temporary but its purpose is uncertain, preserve it until confirmed.

## 5. Server-authoritative rule

The server is the source of truth. The client renders authoritative state and sends input or explicit requests.

The client must not decide:

- final movement authority
- projectile hits
- damage
- death or respawn
- resources or inventory outcomes
- sector or outpost capture
- AI or creep behavior
- campaign state
- portal eligibility
- repairs or ownership changes

The client may render, interpolate, collect input, display UI, show approved temporary/predicted presentation, and send commands.

The server must validate input and own simulation, world state, campaign state, AI, resources, capture, and ownership rules.

## 6. Important existing areas

### 6.1 Local prototype

The local prototype is client-authoritative reference material, not the future multiplayer authority model.

- `apps/client/src/scenes/GameScene.ts`
- `apps/client/src/entities/PlayerShip.ts`
- `apps/client/src/entities/Projectile.ts`
- `apps/client/src/entities/Asteroid.ts`
- `apps/client/src/entities/NpcShip.ts`
- `apps/client/src/entities/NpcProjectile.ts`
- `apps/client/src/systems/AsteroidManager.ts`
- `apps/client/src/systems/NpcManager.ts`
- `apps/client/src/world/SpaceMap.ts`
- `apps/client/src/ui/Hud.ts`
- `apps/client/src/ui/AdminPanel.ts`
- `apps/client/src/config/runtimeBalance.ts`
- `apps/client/src/config/gameConfig.ts`

Preserve this path unless a dedicated task explicitly authorizes migration. Do not move it during structural PRs or copy its authority model into multiplayer systems.

### 6.2 Multiplayer foundation

- `apps/server/src/rooms/BattleRoom.ts`
- `apps/server/src/rooms/TestBattleRoom.ts`
- `apps/server/src/schema/`
- `apps/server/src/systems/`
- `apps/server/src/validation/`
- `apps/client/src/network/`
- `apps/client/src/scenes/NetworkTestScene.ts`
- `apps/client/src/scenes/MultiplayerGameScene.ts`
- `apps/client/src/entities/NetworkShipView.ts`
- `apps/client/src/entities/NetworkProjectileView.ts`
- `packages/shared/src/`

Preserve this path and the active Colyseus message contract. Future protocol migration must be incremental and coordinated across client and server.

### 6.3 Assets

- `apps/client/public/assets/`
- `apps/client/src/styles.css`
- `apps/client/index.html`
- `tmp-blue-edit-area.png`
- `tmp-blue-tower-crop.png`

Do not move assets without updating and verifying loader paths. Do not delete tracked files with temporary-looking names until their purpose is confirmed. Placeholders are acceptable in technical PRs; final assets go through the visual pipeline.

## 7. Package boundaries

### `packages/shared`

Current role: generic shared types plus the active multiplayer runtime contract, constants, messages, and movement types. Future role: generic IDs, math, simple types, and small environment-neutral utilities. It must not remain a dumping ground, but existing imports must not be broken by bulk migration.

### `packages/protocol`

Current role: future protocol boundary with non-runtime placeholder types. It is not the active contract. Future role: client-to-server messages, server-to-client messages, snapshots, protocol version, input frames, and events. Migrate from `packages/shared/src/messages.ts` incrementally and preserve field compatibility until client and server cut over together.

### `packages/balance`

Current role: accepted versioned MVP balance constants. Future role: gameplay numbers such as ship stats, capture thresholds, creep composition, outpost, portal, mining, and repair values. Migration may be incremental; do not change current gameplay feel accidentally.

### `packages/config`

Current role: accepted future map/topology configuration. Future role: campaign map graphs and environment-neutral structural config. Do not place secrets or deployment environment values here.

### Applications

- `apps/client`: rendering, input, UI, audio, and presentation only.
- `apps/server`: authoritative simulation, validation, rooms, AI, and world logic.

## 8. Accepted MVP design baseline

This section records accepted future design; most of it is not implemented yet.

### 8.1 Map and sectors

Per faction, the full MVP map has line A with 2 outposts, line B with 3, and line C with 4. The intended total is 2 bases, 18 outposts, 6 sectors per outpost, and 3 turrets per sector.

Sector capture is available only after all three sector turrets are destroyed. Control thresholds are:

- 50%: owner switches
- 80%: creeps may advance
- 100%: fully stable

Control changes through combat-unit presence, not automatic time regeneration.

### 8.2 Outpost shield and capture

- Owner controls 0–2 adjacent sectors: shield off.
- Owner controls 3–6 adjacent sectors: shield on.

Attackers therefore need at least 4 of 6 sectors to expose an outpost. After capture, the owner changes, the outpost receives 50% HP, old resources burn, an emergency reserve is granted, and sectors do not automatically change owner. Surviving turrets remain aligned with the sector owner.

Resource priority is: outpost repair, own turret rebuild, allied player repair, then allied creep/other services. Turrets may be rebuilt only after all six adjacent sectors belong to the outpost owner. Shields do not directly consume resources.

### 8.3 Creeps

Base group:

- 6 normal
- 1 repair
- 2 heavy

Full line-loss upgrades:

- C lost: 8 normal, 2 repair, 2 heavy
- C+B lost: 8 normal, 2 repair, 4 heavy
- C+B+A lost: 9 normal, 3 repair, 5 heavy, +30% shields

Individual outpost loss does not trigger a full-line upgrade. Creeps route through the outpost graph rather than fixed hardcoded paths, distributing across lines while prioritizing defense, recovery, and recapture.

### 8.4 Portals

- Base portal is permanent.
- Outpost portal requires faction ownership, all 6 sectors, no nearby combat, and 180 seconds of stability.
- Outpost to base has no cooldown.
- Base to outpost cooldown is 300 seconds.
- Every ship in a wing must have no more than 10% cargo fill.
- No temporary invulnerability after exit.

### 8.5 Resources and mining

- Safe mining: 10 ore/min
- Medium mining: 16 ore/min
- Dangerous mining: 24 ore/min
- Unload speed: 50 ore/min

Resource zones progress from safe/low-profit near bases through medium zones toward dangerous/high-profit frontline areas.

### 8.6 Ships

- Miner: 1200 hull, 500 shield, 100 cargo
- Scout: 500 hull, 400 shield
- Fighter: 900 hull, 700 shield

Further ship and module progression is postponed.

## 9. Accepted technical direction

Safe current work includes documentation, package boundaries, read-only agent setup, architecture planning, incremental migration preparation, build/type-check fixes, and preservation of runtime behavior.

Do not during unrelated or structural PRs:

- migrate npm to pnpm
- replace Phaser with PixiJS
- replace Colyseus with a custom WebSocket stack
- add PostgreSQL, Prisma, or persistence without a scoped task
- move assets or `GameScene`
- delete prototype files
- implement campaign, sectors, outposts, creeps, mining, or portals prematurely
- run `npm audit fix`
- upgrade dependencies

## 10. Agent workflow

### Roles

- ChatGPT / Product Architect: design decisions, architecture direction, task decomposition, acceptance criteria, conflict resolution.
- Codex / Primary Implementer: implementation, tests, migrations, build/type-check fixes, PR execution, and relevant documentation updates.
- Claude Code reviewers: read-only reviewers by default.
- Visual Design Lead / Art Director: visual direction, faction identity, placeholder policy, asset briefs, and VFX readability.
- Graphics/VFX/UI agents: work only from approved briefs and do not edit gameplay code.

### Rules

- One branch per task.
- No overlapping writes.
- Codex writes code; Claude reviews.
- Reviewers do not edit, commit, or run destructive commands unless explicitly reassigned.
- Reviewer output includes blockers, important suggestions, minor suggestions, and approval status.
- Product Architect resolves design conflicts.
- Codex updates this file when structure, stack, architecture, workflow, or accepted design changes.

Current reviewer agents are `architecture-reviewer`, `network-reviewer`, `security-reviewer`, `qa-reviewer`, `gameplay-reviewer`, and `visual-design-lead`.

## 11. Current PR-001 status

PR-001 — Structure Foundation & Agent Workflow:

- Added `packages/balance`, `packages/config`, and `packages/protocol`.
- Added architecture, design, workflow, visual-pipeline, task, and reviewer documentation.
- Added Claude Code reviewer definitions under `.claude/agents/`.
- Added root `AGENTS.md` and updated README.
- Synchronized `package-lock.json` with new workspaces.
- Clarified protocol placeholders as a future boundary, not an active runtime replacement.
- Preserved runtime files in `apps/client`, `apps/server`, and `packages/shared`.
- Implemented no gameplay systems.
- `npm run build` and `npm run typecheck` pass.
- Five reviewers reported no confirmed blockers.
- Branch `feature/project-bootstrap` is pushed to `origin/feature/project-bootstrap`.
- Commit `db3242d` contains the main PR-001 structure and workflow changes.
- PR [#4](https://github.com/pittonje/BurningSpace/pull/4) was merged into `main` as `2b61d80`.
- PR-001 is complete.
- No runtime gameplay files were intentionally modified.

Known follow-ups include real use of `PROTOCOL_VERSION`, incremental shared/protocol/balance/config migration, stronger technical guardrails for Bash-enabled reviewers, a visual style/faction identity brief, and dependency audit review as a separate task.

## 12. Next recommended PRs

Completed planning work:

- PR-002 — Shared Package Boundary Audit & Migration Plan
- Branch: `planning/shared-package-boundary-audit`
- Scope: documentation, dependency audit, ownership classification, and migration planning only
- PR [#5](https://github.com/pittonje/BurningSpace/pull/5) was merged into `main` as `efe9899`.
- Audit and planning phase is complete.

Current implementation work:

- PR-003 — Protocol Compatibility Exports: Profile Messages
- Branch: `feature/protocol-profile-compat-exports`
- PR: [#6](https://github.com/pittonje/BurningSpace/pull/6), open against `main` and awaiting human review
- `packages/shared` remains the canonical active owner.
- `packages/protocol` is a compatibility facade for `ClientMessages`, `ServerMessages`, `JoinMode`, `JoinRequest`, `RoomParticipant`, `ProfileAcceptedMessage`, and `ProfileRejectedMessage`.
- No client/server consumer cutover, wire-format change, Colyseus schema change, or gameplay change.
- Build, typecheck, and focused profile compatibility check pass locally.
- Local structured Architecture, Network, and QA reviews found no blockers; external Claude was unavailable under managed-environment policy.

Recommended order:

1. PR-003 — Protocol Compatibility Exports: Profile Messages.
2. A coordinated profile-protocol consumer cutover after compatibility is proven.
3. Incremental balance migration with exact value-parity checks.
4. Incremental world topology/config migration with behavior-parity checks.
5. Server-side campaign lifecycle skeleton only after package boundaries stabilize.
6. Persistent campaign storage planning.

Any implementation PR must define a narrow scope and explicit non-goals.

## 13. Required first-read order

Every agent should read:

1. `PROJECT_CONTEXT.md`
2. `AGENTS.md`
3. `docs/tasks/<current-task>.md`
4. Architecture documents relevant to the task
5. Design documents relevant to the task

If an agent cannot access this file, it should request the latest version before making major architecture or implementation decisions.

## 14. Update policy

Codex must update this file when the stack, package manager, repository structure, agent workflow, accepted design baseline, current PR status, package boundaries, or major architectural decisions change.

Keep updates concise and factual. Do not turn this file into a changelog; details belong in `docs/architecture/`, `docs/design/`, and `docs/tasks/`.

## 15. Hard safety rules

Never casually delete or overwrite:

- `apps/client/src/scenes/GameScene.ts`
- `apps/client/src/scenes/MultiplayerGameScene.ts`
- `apps/client/src/scenes/NetworkTestScene.ts`
- `apps/server/src/rooms/BattleRoom.ts`
- `apps/server/src/schema/`
- `apps/server/src/systems/`
- `apps/server/src/validation/`
- `apps/client/src/network/`
- `apps/client/public/assets/`
- `packages/shared/src/`
- `package-lock.json`
- `tmp-blue-edit-area.png`
- `tmp-blue-tower-crop.png`

Never assume the project is empty, PixiJS is the active stack, pnpm is the package manager, `packages/protocol` is already the runtime contract, persistence already exists, or local `GameScene` is authoritative multiplayer logic.

Always preserve current working behavior unless a scoped task explicitly says otherwise.

## 16. Short agent reminder

BurningSpace already has a working Phaser/Colyseus multiplayer foundation.

Do not rebuild it. Extend it safely.
