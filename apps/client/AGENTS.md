# Client Agent Instructions

The client owns rendering, input capture, interpolation, UI, audio/visual feedback, and local-only prototype scenes.

## Rules

- Do not determine authoritative hits or damage.
- Do not mutate currency, inventory, hangar, or account state as trusted data.
- Do not create authoritative gameplay entities.
- Do not trust local account state.
- Keep Phaser, DOM, and asset concerns inside the client workspace.
- Network protocol changes must coordinate with `packages/shared` and `apps/server`.

## Required Checks

```bash
npm run typecheck -w @burningspace/client
npm run build -w @burningspace/client
```

For networking UI changes, also run:

```bash
npx tsx apps/client/scripts/network-client-callback-check.ts
```

