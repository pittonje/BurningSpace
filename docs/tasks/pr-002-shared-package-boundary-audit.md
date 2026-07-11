# PR-002 — Shared Package Boundary Audit & Migration Plan

## Goal

Create an evidence-based inventory of `packages/shared`, map every public symbol to its consumers and intended owner, and define a reversible migration sequence without changing the active runtime contract.

## Current state

`packages/shared` is the active public entry point for multiplayer message names, payload types, snapshots, domain primitives, world topology, and multiplayer balance. Both applications import it; only the server declares it as a direct workspace dependency.

## Scope

- Audit all files and exports under `packages/shared/src`.
- Identify client, server, and diagnostic-script consumers.
- Document current and target dependency direction.
- Classify ownership and migration risk.
- Prepare a phased plan and the smallest safe protocol-migration task.

## Non-goals

- No runtime import migration or wire-format change.
- No changes to `apps/client/src`, `apps/server/src`, or `packages/shared/src`.
- No gameplay, Colyseus schema, room lifecycle, dependency, lockfile, asset, database, or package-manager changes.

## Allowed files

- `docs/**`
- Factual PR status in `PROJECT_CONTEXT.md`
- Package README files if boundary clarification becomes necessary

## Forbidden files

- `apps/client/src/**`
- `apps/server/src/**`
- `packages/shared/src/**`
- Runtime manifests and `package-lock.json`
- Assets and framework configuration

## Audit method

1. Read every shared source and its public barrel.
2. Search the repository for package imports and symbol use.
3. Inspect each consumer rather than classify by name alone.
4. Compare manifest declarations with source imports and lockfile links.
5. Record ambiguity and risk instead of moving code.

## Deliverables

- Complete shared-symbol inventory
- Current and target dependency map
- Phased migration plan with rollback and tests
- PR-003 task for the smallest safe protocol slice
- Architecture, network, and QA review summaries

## Acceptance criteria

- All 44 public exports are classified with evidence and consumers.
- Runtime values and type-only declarations are distinguished.
- Dependency gaps, resolution risks, deep imports, and circularity risks are documented.
- `npm run build` and `npm run typecheck` pass.
- Runtime source diff and manifest/lockfile diff are empty.
- No gameplay or runtime contract migration occurs.

## Reviewer focus

- Inventory completeness and ownership accuracy
- Actual versus target dependency direction
- Preservation of wire names, payload fields, and Colyseus behavior
- Narrow, coordinated, reversible follow-up phases
- Empty runtime source diff

## Follow-up PRs

1. PR-003 — Protocol compatibility exports for message names and payloads
2. A coordinated consumer cutover after compatibility exports are proven
3. Balance-constant migration with value-parity checks
4. World topology/config migration with behavior-parity checks
5. Shared export cleanup only after zero consumers remain
