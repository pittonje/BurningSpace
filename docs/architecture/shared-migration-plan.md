# Shared Package Migration Plan

## Phase 0 — Inventory and dependency map

- Files affected: documentation only.
- Consumers: none changed.
- Compatibility: record the current public surface and values as the baseline.
- Rollback: revert documentation commits.
- Tests: build, typecheck, empty runtime/manifest diff.
- Reviewers: architecture, network, QA.
- Non-goals: all runtime migration.

## Phase 1 — Canonical protocol compatibility exports

- Files affected: `packages/protocol/src`; focused protocol contract tests; package manifests only where an actual import is introduced.
- Expected consumers: initially tests only; active applications remain on shared if compatibility is not proven.
- Compatibility: define the existing message-name objects and one coherent payload group with identical property names, optionality, literal strings, and serialization meaning. Avoid parallel hand-written shapes by using type aliases/re-exports where acyclic.
- Rollback: remove new protocol exports; applications remain on the old shared entry point.
- Required tests: clean removal/rebuild of package `dist` outputs through the normal workspace build, exact message-string equality, compile-time bidirectional assignability for payloads, package build/typecheck, existing callback diagnostic.
- Reviewers: architecture, network, QA.
- Non-goals: consumer cutover, wire changes, schema changes, gameplay changes, old export removal.

## Phase 2 — One coordinated protocol consumer cutover

- Files affected: the relevant `NetworkClient` import, `BattleRoom` import, explicit client/server manifest dependencies, and protocol compatibility tests.
- Expected consumers: client and server for one complete message category only.
- Compatibility: client and server move in the same PR; strings and payload fields remain byte/shape equivalent; old shared exports remain available for rollback.
- Rollback: revert imports/manifests to `@burningspace/shared`; no state migration is required.
- Required tests: build/typecheck, network callback diagnostic, focused room lifecycle behavior, exact wire-name assertions.
- Reviewers: network, architecture, QA.
- Non-goals: unrelated messages, Colyseus schema, balance, config, gameplay.

## Phase 3 — Balance constants

- Files affected: selected balance exports, authoritative server consumers, presentation consumers only when needed, and parity tests.
- Expected consumers: migrate one subsystem at a time (movement, combat, then lifecycle).
- Compatibility: copy no value manually during cutover; assert old/new values and behavior are identical before removing old exports.
- Rollback: restore old import paths while compatibility exports remain.
- Required tests: value parity, movement/combat diagnostics, build/typecheck, multiplayer callback diagnostic.
- Reviewers: gameplay, network where events expose values, QA.
- Non-goals: rebalance, tuning, campaign values, local prototype migration unless separately scoped.
- Open ownership decision: Product Architect must confirm whether `NETWORK_MAX_ACTIVE_PROJECTILES_PER_SHIP` is gameplay balance or server-only resource/abuse policy before migration.

## Phase 4 — Map and topology config

- Files affected: config exports plus coordinated client/server consumers of world dimensions and spawn coordinates.
- Expected consumers: `gameConfig`, multiplayer scene, server movement/spawn/room, diagnostics.
- Compatibility: migrate the coherent world-bounds and base-coordinate set together; assert exact coordinate parity.
- Rollback: restore imports to shared; do not transform persisted state (none currently exists).
- Required tests: coordinate parity, spawn/bounds diagnostics, build/typecheck, visual smoke test.
- Reviewers: architecture, gameplay, network, QA.
- Non-goals: implementing the future campaign graph or changing world size.

## Phase 5 — Shared cleanup

- Files affected: `packages/shared` exports and docs only after repository search proves zero consumers.
- Expected consumers: none for removed symbols.
- Compatibility: deprecate first; remove only after all application, script, and test imports are gone.
- Rollback: restore forwarding exports.
- Required tests: repository grep, clean install, build/typecheck, all focused diagnostics.
- Reviewers: architecture, network, QA.
- Non-goals: opportunistic refactoring or behavior changes.

## Cross-phase gates

- Never rename wire strings or payload fields during an import-path migration.
- Never migrate client and server halves of a message category in separate merge windows.
- Preserve old exports until zero consumers remain and rollback has been exercised.
- Keep `packages/shared -> packages/protocol` forbidden.
- Update `PROJECT_CONTEXT.md` factually after each accepted boundary change.
