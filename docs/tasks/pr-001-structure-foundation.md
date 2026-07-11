# PR-001 — Structure Foundation & Agent Workflow

## Context

BurningSpace is already an npm-workspaces monorepo. It contains a Phaser/Vite client, a Colyseus server, shared code, a preserved local prototype, and a server-authoritative multiplayer foundation.

## Goal

Introduce explicit future boundaries for balance, map configuration, and network protocol, plus the architecture and agent workflow documentation required for later campaign work.

## Non-goals

- Replacing Phaser, Vite, Colyseus, npm, or the workspace layout.
- Migrating existing runtime imports in bulk.
- Changing network behavior or scene startup order.
- Moving assets or local prototype files.
- Adding campaign gameplay, sectors, outposts, creeps, mining, portals, persistence, databases, migrations, or deployment services.

## Acceptance criteria

- `packages/balance`, `packages/config`, and `packages/protocol` build and type-check as npm workspaces.
- Existing client, server, shared package, scripts, assets, and runtime behavior remain intact.
- Architecture, design, visual pipeline, and agent workflow are documented.
- Root and Claude agent instructions enforce read-only reviews and server authority.
- `npm run build` and `npm run typecheck` pass.

## Preservation list

Preserve all existing files. In particular:

- Local prototype: `GameScene`, local entities, asteroid/NPC systems, `SpaceMap`, HUD, admin panel, runtime balance, and game config.
- Multiplayer foundation: `BattleRoom`, schemas, server systems and validation, client network code, multiplayer/network scenes, network views, and `packages/shared`.
- Assets/config: `apps/client/public/assets`, styles, HTML, lockfile, and tracked temporary image sources.

## Reviewer focus

- No hidden gameplay or networking changes.
- No client-side authority added to the multiplayer path.
- New package boundaries do not break existing imports or npm scripts.
- Prototype and assets remain untouched.
- PR non-goals remain respected.
