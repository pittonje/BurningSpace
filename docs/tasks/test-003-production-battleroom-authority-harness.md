# TEST-003 — Production BattleRoom Multi-Client Authority Harness

Owner: `Product Architect`

Wave: `Wave 1 — Authority and Security Hardening`

Risk: `NORMAL — test-focused runtime foundation`

Merge authority: `Human only`

## Baseline and program state

- SEC-006 / PR #53 is merged at
  `b4dfce94384ef2162a155360f9d5f1f6fec74290`.
- Wave 1 remains active, and TEST-003 expands regression coverage against the
  real production `BattleRoom` path.
- This task introduces or changes no accepted decision. The accepted count
  remains 35: 18 `BS-MECH`, 5 `GAME-001`, 7 `BS-ARCH`, 4 `BS-PROC`, and
  1 `CI`.

## Exact changed paths

Create:

- `apps/server/test/support/startProductionBattleServer.ts`;
- `apps/server/test/productionBattleRoomAuthority.test.ts`;
- `docs/tasks/test-003-production-battleroom-authority-harness.md`;
- `docs/reviews/test-003-production-battleroom-authority-harness-review.md`.

Modify:

- `docs/handoffs/CURRENT.md`;
- `PROJECT_CONTEXT.md`.

No other path is authorized without an explicitly discovered test-only need.

## Harness architecture

- A test-only loopback HTTP/Colyseus server listens on an ephemeral port and
  registers rooms exclusively through `registerProductionRooms`.
- Real `NetworkClient` instances connect through the normal WebSocket,
  production registry, real `BattleRoom`, and authoritative schema replication
  path.
- Cleanup disconnects every client and gracefully shuts down the in-process
  server after the test, including assertion failures.
- No `TestBattleRoom`, diagnostic mutation handler, subclass, production hook,
  private `BattleRoom` state, or fixed port is used.

## Authority invariants tested

- `battle` connects through the production registry; `battle-test` is absent.
- Two profiled players and one spectator replicate as three participants and
  exactly two server-owned ships.
- Ship `ownerSessionId` values derive from real sessions, and factions derive
  from accepted profiles.
- Player A input moves only player A's ship and replicates to both player B and
  the spectator without changing ownership.
- `test:setShipState` cannot change another production player's position,
  health, or ownership.
- A spectator owns no ship and cannot move another player's ship with raw
  player input.
- An in-session faction change is rejected while the connection and original
  red ship remain usable and unchanged.
- Projectile creation, ownership, replication, and removal remain controlled
  by the server and bind to the shooting player's real session.
- Disconnect removes only the leaving participant and ship; the remaining
  player and spectator stay usable.

## Deliberate boundary

The harness does not force production death or respawn. Legitimate red and blue
spawns are intentionally far apart, and production exposes no state-positioning
authority. Existing combat/death/respawn unit tests and the isolated
`TestBattleRoom` diagnostic remain unchanged. TEST-003 does not weaken
production authority to manufacture that scenario.

## Non-goals and preservation

- No production source, gameplay semantics, protocol, schema, message,
  package, dependency, manifest, lockfile, workflow, or Vitest configuration
  change.
- No reconnect, persistence, sector, outpost, origin-policy, rate-limit,
  deployment, or new gameplay implementation.
- No `BattleRoom` or `NetworkClient` refactor and no unrelated cleanup.

## Required validation

- `npm test` with the new production authority test discovered and no skipped
  tests.
- `npm run typecheck`.
- `npm run build`.
- `npm run check:protocol-profile`.
- `npx tsx apps/client/scripts/network-client-callback-check.ts`.
- `npx tsx apps/server/scripts/movement-check.ts`.
- `npx tsx apps/server/scripts/combat-check.ts`.
- Scope, decision-count, cleanup, production-source, dependency, and workflow
  verification against `origin/main`.

Core Pull Request Checks do not currently invoke `npm test`; the local result
must be prominent in the pull request, and the independent reviewer must rerun
it. This task does not modify CI.

## Review and merge routing

Required:

- One independent integrated runtime reviewer — covers multiplayer authority,
  bounded security implications, test determinism and quality, regression
  validation, and documentation consistency.
- Passing Core Pull Request Checks on the final pull-request head.
- Human-only merge under `BS-PROC-001`.

Claude QA is advisory and non-blocking. A substantive successful review may be
considered; substantive `CHANGES REQUIRED` must be inspected. Infrastructure,
schema, output-validation, or timeout failure does not block TEST-003, and at
most one manual infrastructure rerun is permitted. No Claude or Product
Architect evidence-only commit is required.

Skipped as separate review sessions:

- Architecture, Network, Security, Test/Quality, and Documentation reviewers —
  their applicable test-foundation concerns are intentionally combined in the
  one authorized independent integrated review.
- Gameplay Reviewer — no gameplay rule, balance value, or behavior changes.
- Visual Design Lead — no UI, asset, loader, VFX, or presentation changes.

## Closure conditions

TEST-003 closes only after the authorized paths are complete, all required
local validation passes, the independent integrated reviewer records an
approving verdict in the compact review artifact, Core checks pass on the final
head, and the human project owner merges the pull request.

## Next runtime boundary after merge

Network boundary hardening: WebSocket origin policy and bounded abuse/rate-limit
protection.
