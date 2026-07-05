# Server Agent Instructions

The server owns gameplay authority, validation, room lifecycle, combat simulation, and future persistence services.

## Rules

- Validate every client message.
- Keep gameplay state server-authoritative.
- Persistence must go through services/repositories once introduced.
- Economic actions must be idempotent and auditable.
- AI must not bypass ordinary movement, weapon, health, damage, and death systems.
- Do not add production account/economy skeletons until the design is approved.

## Required Checks

```bash
npm run typecheck -w @burningspace/server
npm run build -w @burningspace/server
npx tsx apps/server/scripts/movement-check.ts
npx tsx apps/server/scripts/combat-check.ts
```

