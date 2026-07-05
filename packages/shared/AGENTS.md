# Shared Package Agent Instructions

`@burningspace/shared` contains pure protocol types, constants, and deterministic shared definitions.

## Rules

- No Phaser imports.
- No DOM or browser-only APIs.
- No database drivers.
- No secrets.
- No mutable singleton gameplay state.
- Keep shared exports stable and explicit.
- Server authority must not be weakened by shared client helpers.

## Required Checks

```bash
npm run typecheck -w @burningspace/shared
npm run build -w @burningspace/shared
```

