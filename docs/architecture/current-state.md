# Current Repository State

BurningSpace uses npm workspaces with `apps/*` and `packages/*`.

- `apps/client` is a TypeScript Phaser 3 application built by Vite. It uses `colyseus.js` for multiplayer connectivity.
- `apps/server` is a TypeScript Node.js and Colyseus server with WebSocket transport and an HTTP health endpoint.
- `packages/shared` currently mixes world constants, gameplay/network balance, protocol message definitions, and simple shared types.
- `GameScene` is the preserved client-authoritative local prototype with NPCs, asteroids, bases, combat, UI, and runtime balance controls.
- `MultiplayerGameScene` and `BattleRoom` form the current multiplayer path. The server already owns player movement, projectiles, hits, health, death, and respawn.
- Runtime state is in memory. There is no database, persistence, account system, migration framework, or campaign world.

PR-001 adds future package boundaries without changing the active runtime contract.
