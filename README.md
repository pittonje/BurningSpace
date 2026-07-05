# BurningSpace

BurningSpace is a Phaser 3 + TypeScript + Vite client and Colyseus server monorepo. The current `main` branch contains a stable server-authoritative multiplayer core: network participants, player/spectator modes, server movement, server projectiles, damage, death, respawn, and combat lifecycle hardening.

The project direction is now a persistent multiplayer space action-strategy with accounts, hangars, ship classes, hired pilots, player wings, economy, and a shared two-faction frontline. Persistent systems are not implemented yet; this repository stage documents and prepares the architecture.

## Structure

```text
apps/client       Phaser/Vite client, UI, rendering, input, local prototype
apps/server       Node.js/TypeScript/Colyseus server
packages/shared   shared protocol types and constants
docs/design       product and gameplay direction
docs/architecture architecture boundaries
docs/adr          architecture decision records
docs/agents       agent handoff and review templates
```

## Milestone

- Stable multiplayer core tag: `v0.7.0-multiplayer-core`.
- Main branch: `main`.
- Planning branch for the persistent game direction: `planning/persistent-game-foundation`.
- Local prototype tag: `local-prototype-v0.4`.

## Install

```bash
npm install
```

## Run

Server:

```bash
npm run dev:server
```

Client:

```bash
npm run dev:client
```

Health endpoint:

```text
http://localhost:2567/health
```

Expected response:

```json
{
  "ok": true,
  "service": "burningspace-server"
}
```

## Test

Use the unified check:

```bash
npm test
```

It runs:

- workspace typecheck;
- workspace build;
- movement diagnostic;
- combat diagnostic;
- network/client lifecycle diagnostic.

Focused commands are also available:

```bash
npm run typecheck
npm run build
npm run check:movement
npm run check:combat
npm run check:network
```

## Basic Multiplayer Test

1. Start the server: `npm run dev:server`.
2. Start the client: `npm run dev:client`.
3. Open two browser tabs.
4. Click `Connect` in both tabs.
5. Set different nicknames.
6. Choose different factions: `red` and `blue`.
7. Click `Apply profile`.
8. Verify both tabs show the same participant list.
9. Click `Enter multiplayer` in both tabs.
10. Verify both ships are visible in the multiplayer scene.

## Current Multiplayer Rules

BattleRoom synchronizes:

- `participants`;
- `ships`;
- `projectiles`.

The client sends input only: movement, `aimAngle`, and `shooting`. `NetworkClient` owns the increasing input sequence. The server computes movement, creates and moves projectiles, checks collisions, applies damage, sends hit/death events, and performs respawn.

Lifecycle hardening includes:

- stale input timeout;
- mode/faction locked until disconnect;
- profile validation errors separate from connection errors;
- projectiles survive owner disconnect;
- server clock offset for respawn/invulnerability UI;
- no test teleport in the production BattleRoom.

The local `GameScene` remains separate. Asteroids, the local NPC, bases, runtime balance, and the admin panel are still part of the local prototype, not the multiplayer BattleRoom.

## Design And Architecture Docs

Start here:

- [Game Vision](docs/design/GAME_VISION.md)
- [Onboarding](docs/design/ONBOARDING.md)
- [Core Loop](docs/design/CORE_LOOP.md)
- [Account And Progression](docs/design/ACCOUNT_AND_PROGRESSION.md)
- [Ship Classes](docs/design/SHIP_CLASSES.md)
- [NPC Systems](docs/design/NPC_SYSTEMS.md)
- [Squads And Squadrons](docs/design/SQUADS_AND_SQUADRONS.md)
- [Economy Principles](docs/design/ECONOMY.md)
- [Domain Model](docs/architecture/DOMAIN_MODEL.md)
- [Persistence Boundaries](docs/architecture/PERSISTENCE.md)
- [Scalability Requirements](docs/architecture/SCALABILITY.md)
- [Auth And Security](docs/architecture/AUTH_AND_SECURITY.md)
- [Roadmap](docs/ROADMAP.md)
- [Decisions Pending](docs/DECISIONS_PENDING.md)

## Agent Workflow

Agents should read [AGENTS.md](AGENTS.md) before work. Longer or cross-module tasks require an ExecPlan using [PLANS.md](PLANS.md).

Supporting docs:

- [Contributing](docs/CONTRIBUTING.md)
- [Responsibility Matrix](docs/agents/RESPONSIBILITY_MATRIX.md)
- [Task Template](docs/agents/TASK_TEMPLATE.md)
- [Handoff Template](docs/agents/HANDOFF_TEMPLATE.md)
- [Review Template](docs/agents/REVIEW_TEMPLATE.md)

Rules:

- one task, one branch, one PR;
- no direct push to `main`;
- no secrets in the repository;
- update ADRs for architecture decisions;
- do not implement account/economy/persistence before design approval.

## Current Limitations

- No registration or authentication.
- No database or persistent account state.
- No economy implementation.
- No hangar, pilots, or wing system.
- No server-side asteroids, NPC waves, or bases.
- No Docker, deployment, monitoring, or production secrets.

