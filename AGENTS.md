# BurningSpace Agent Instructions

## Project Summary

BurningSpace is a Phaser/Vite + Colyseus monorepo. The current multiplayer core is server-authoritative for player movement, projectiles, damage, death, respawn, and combat lifecycle. The next direction is a persistent multiplayer space action-strategy with accounts, hangars, ships, pilots, wings, economy, and a shared faction frontline.

Start with [docs/design/GAME_VISION.md](docs/design/GAME_VISION.md).

## Authority Rules

- Server gameplay authority is mandatory.
- Clients send input and render state; clients do not decide hits, damage, rewards, currency, ownership, or authoritative entity creation.
- Economic operations must eventually go through validated server transactions.
- Persistent account state, runtime room state, and static content definitions are separate data classes.

## Data Classes

- Persistent data: account, faction, hangar, ship instances, pilots, inventory, wallet, progression, tutorial milestones.
- Runtime data: connection, input, room state, combat ships, projectiles, current position, temporary effects.
- Static data: ship classes, hull definitions, equipment definitions, behavior presets.

See:

- [docs/architecture/DOMAIN_MODEL.md](docs/architecture/DOMAIN_MODEL.md)
- [docs/architecture/PERSISTENCE.md](docs/architecture/PERSISTENCE.md)

## Required Reading

Before changing code or docs, read the relevant files:

- design changes: `docs/design/**`, `docs/DECISIONS_PENDING.md`;
- architecture changes: `docs/architecture/**`, `docs/adr/**`;
- client work: `apps/client/AGENTS.md`;
- server work: `apps/server/AGENTS.md`;
- shared protocol work: `packages/shared/AGENTS.md`.

## Design Control

Do not silently change approved design direction. If a task requires a new architecture decision, update or add an ADR and call out the decision in the handoff.

## ExecPlan Requirement

Use `PLANS.md` for any task involving:

- auth;
- database;
- economy;
- persistent models;
- new network entity;
- AI architecture;
- cross-workspace refactor;
- work expected to exceed one focused session.

## Branch And PR Rules

- One task, one branch, one PR.
- Do not push directly to `main`.
- Do not mix feature, refactor, graphics, and documentation implementation in one PR unless explicitly requested.
- Do not rewrite history or force push without explicit approval.

## Dependencies

Do not add dependencies without a short justification in the PR and handoff. Do not add ORM, database driver, auth SDK, Redis, queue, telemetry, or deployment tooling until the relevant design is approved.

## Secrets

Never commit secrets. Use environment variables and `.env.example` files only.

## Required Checks

Run:

```bash
npm install
npm test
```

If a task touches a specific workspace, also run focused checks when available.

## Migration Rules

- Migrations require an ExecPlan.
- Database choices require an ADR.
- Persistent model changes must state rollback and data ownership.

## Handoff Format

Use `docs/agents/HANDOFF_TEMPLATE.md`. Include branch, base commit, changed files, decisions, tests, known limitations, commit, PR, and follow-up work.

