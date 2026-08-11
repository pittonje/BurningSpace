# SEC-006 — TestBattleRoom Production Isolation

Owner: `Product Architect`

Wave: `Wave 1 — Authority and Security Hardening`

Merge authority: `Human only`

## Program state

- Wave 1 is active, and BurningSpace runtime implementation has resumed.
- SEC-006 is the first bounded runtime task in Wave 1.
- DOCARCH-004 remains open but paused.
- DOCARCH-004C v1 / PR #51 remains frozen draft historical methodology
  evidence.
- DOCARCH-004C Attempt 5 is not authorized, and DOCARCH-004D implementation
  is not active.
- The accepted decision count remains 35: 18 `BS-MECH`, 5 `GAME-001`,
  7 `BS-ARCH`, 4 `BS-PROC`, and 1 `CI`.
- This task introduces no accepted decision and changes no accepted decision.

## Exact changed paths

Modify:

- `apps/server/src/index.ts`;
- `apps/client/scripts/network-client-callback-check.ts`;
- `docs/handoffs/CURRENT.md`;
- `PROJECT_CONTEXT.md`.

Create:

- `apps/server/src/rooms/productionRoomRegistry.ts`;
- `apps/server/test/productionRoomRegistry.test.ts`;
- `docs/tasks/sec-006-production-room-isolation.md`;
- `docs/reviews/sec-006-production-room-isolation-review.md`.

Move:

- `apps/server/src/rooms/TestBattleRoom.ts` to
  `apps/server/test/support/TestBattleRoom.ts`.

The client diagnostic script is the one additional direct-reference path found
by the mandatory pre-move search. A rename may appear as two physical paths in
Git output. No other path is authorized.

## Implementation objectives

- Make an explicit immutable production-room registry the sole source of
  production room registration.
- Keep exactly `battle → BattleRoom` in that registry.
- Make the production bootstrap consume the registry without directly
  importing `BattleRoom` or any diagnostic symbol.
- Move `TestBattleRoom` and `TestRoomMessages` into test-only support while
  preserving the existing network-client diagnostic.
- Add an automated guard that requires intentional review of every production
  room name and constructor and rejects diagnostic/test-only exposure.
- Preserve the health endpoint, port handling, startup logging, current
  `BattleRoom` behavior, client/server contracts, and dependency graph.

## Explicit non-goals

- No gameplay, movement, weapon, projectile, damage, spawn, respawn, faction,
  profile, spectator, snapshot, or rendering change.
- No territorial, sector, outpost, turret, persistence, account, reconnect,
  origin-policy, rate-limit, deployment, or campaign implementation.
- No wire-message, schema, package-boundary, dependency, manifest, lockfile,
  workflow, governance, roadmap-definition, or accepted-decision change.
- No DOCARCH-004C Attempt 5, DOCARCH-004D methodology redesign, DOCARCH-005,
  unrelated cleanup, or automatic merge.

## Required tests and verification

- `npm test`.
- `npm run typecheck`.
- `npm run build`.
- `npm run check:protocol-profile`.
- The production definition names are exactly `['battle']`.
- Registration defines `battle` exactly once with `BattleRoom`.
- `TestBattleRoom` is absent from production definitions, the production
  source tree, and the production import graph.
- No production room name contains `test`, `diagnostic`, `debug`, or `sandbox`.
- The diagnostic script continues to import test support and retain its
  existing behavior.
- Production health, port, logging, and arena behavior remain unchanged.
- No manifest, lockfile, workflow, decision, gameplay, protocol, or package
  boundary changes appear in the final diff.
- `CURRENT.md` contains exactly one `## Next safe action` heading.

## Reviewer routing

Required:

- Product Architect — confirms the Wave 1 transition, bounded scope, closure
  conditions, and post-merge boundary.
- Architecture Reviewer — confirms the explicit production registry and the
  production/test source-graph boundary.
- Security/CI Reviewer — confirms diagnostic authority is unreachable from
  production registration and the automated guard fails closed.
- Test/Quality Reviewer — confirms deterministic guard coverage, diagnostic
  preservation, and regression validation.
- Documentation consistency review — confirms the task, review skeleton,
  `CURRENT.md`, `PROJECT_CONTEXT.md`, roadmap, and accepted count agree.
- Claude QA — verifies final-head scope, conformance, validation, and evidence.
- Human-only merge — required by `BS-PROC-001`.

Skipped:

- Network Reviewer — the registry boundary changes no room schema, message
  name or payload, client/server contract, input handling, snapshot,
  connection lifecycle, or network behavior. The specifically authorized
  Architecture, Security/CI, and Test/Quality reviews cover diagnostic room
  registration risk.
- Gameplay/Product Reviewer — no gameplay semantics, rules, balance, authority
  outcomes, or player-facing behavior change.
- Visual Design Lead — no UI, asset, VFX, loader, or presentation path changes.

## Closure conditions

SEC-006 closes only after:

- all authorized implementation and documentation changes are complete;
- all required local validation passes, or an environmental blocker is
  explicitly recorded without changing dependency files;
- exactly one implementation commit exists over the approved baseline;
- the branch is pushed and the SEC-006 pull request remains unmerged;
- all required reviewer verdicts and evidence are bound to the final PR head;
- required remote checks pass on the final PR head;
- the human project owner performs the merge.

## Post-merge next task boundary

Production-room multi-client authority test harness covering the real
`BattleRoom` path. This boundary receives no new canonical task ID here.
