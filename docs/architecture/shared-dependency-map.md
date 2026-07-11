# Shared Dependency Map

## Actual current workspace graph

```text
apps/client ──(source import, undeclared manifest dependency)──> packages/shared
apps/server ──(declared "*")──────────────────────────────────> packages/shared

packages/protocol   (no package dependencies; no consumers)
packages/balance    (no package dependencies; no consumers)
packages/config     (no package dependencies; no consumers)
packages/shared     (no package dependencies)
```

The root npm workspace glob links all packages. `apps/server/package.json` explicitly declares `@burningspace/shared`; `apps/client/package.json` does not, despite seven client source/script files importing it. The client currently succeeds through root workspace installation/hoisting, which is an undeclared dependency risk for isolated workspace installs and future package cutovers.

## Current import relationships

- Client runtime: `gameConfig`, `NetworkClient`, network scenes, and network entity views import the public `@burningspace/shared` entry point.
- Client diagnostic: `network-client-callback-check.ts` imports constants and snapshot types.
- Server runtime: `BattleRoom`, `TestBattleRoom`, movement/combat/spawn systems, and input validation import the public entry point.
- Server diagnostics: movement and combat checks import constants and `PlayerInputMessage`.
- No source imports `packages/protocol`, `packages/balance`, or `packages/config`.
- No deep imports such as `@burningspace/shared/src/messages` were found.
- No relative source import bypasses the package public entry point.

## Public entry point and resolution

`packages/shared/package.json` resolves types to `src/index.ts` and runtime JavaScript to `dist/index.js`. This split is intentional but creates a dual-resolution constraint:

- TypeScript sees current source declarations.
- Node runtime requires the package to have been built.
- Runtime constants and message-name objects cannot be migrated as type-only aliases.
- A stale `dist` can disagree with source types if consumers run without a fresh workspace build.
- New packages copy the same export pattern, so consumer cutover requires those packages to build before runtime diagnostics/server startup.

## Target dependency graph

```text
apps/client ──────> packages/protocol ──────> packages/shared
      │                       │
      ├──────────> packages/balance (presentation values only)
      └──────────> packages/config  (world presentation/topology)

apps/server ──────> packages/protocol ──────> packages/shared
      │
      ├──────────> packages/balance (authoritative values)
      └──────────> packages/config  (authoritative topology)

packages/shared   -X-> packages/protocol
packages/balance  (dependency-light)
packages/config   (dependency-light)
```

Every source import should have a matching direct dependency in the consuming workspace manifest. PR-002 documents this target but intentionally changes no manifest.

## Circular-dependency risks

- `packages/protocol` may depend on `packages/shared` only for generic primitives such as `Faction` or `Vector2`.
- `packages/shared` must never import or re-export from `packages/protocol`; doing so while protocol imports shared creates a cycle and reverses ownership.
- Compatibility should be provided from the old package by re-export only if protocol does not itself depend on shared declarations involved in that re-export. Prefer canonical definitions in protocol plus temporary consumer-by-consumer cutover, or type forwarding with a verified acyclic direction.
- Balance/config must not import application code or protocol payloads.
- Applications must not become dependencies of any package.

## Package dependency gaps

- Confirmed: `apps/client` uses `@burningspace/shared` without declaring it.
- Future: both applications must explicitly declare each new package before importing it.
- No current missing declaration exists for server-to-shared.
- Structural packages currently have no source imports and correctly declare no dependencies.

## Deep-import and public-surface findings

- Deep imports: none.
- Public-entry bypasses: none.
- All shared modules are exposed wholesale through `export *`; consumers can couple to every constant and payload.
- There are no package subpath exports, deprecation aliases, or compatibility entry points today.

## Migration hazards

1. Changing `ClientMessages`/`ServerMessages` identity or string values breaks live dispatch even if TypeScript passes.
2. Moving type-only payloads without runtime message maps creates a split contract that can drift.
3. Moving world dimensions separately from spawn coordinates can desynchronize client rendering and server clamps.
4. Moving authoritative balance values can silently change gameplay if values are reformatted or duplicated.
5. Adding protocol-to-shared and shared-to-protocol re-exports can create NodeNext cycles.
6. Client manifest gaps can be masked by workspace hoisting.
