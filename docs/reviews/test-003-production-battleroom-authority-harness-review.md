# TEST-003 — Production BattleRoom Authority Harness Review

## Metadata

- Status: `REVIEW COMPLETE`
- Task: `TEST-003 — Production BattleRoom Multi-Client Authority Harness`
- Branch: `game/wave1-test-003-battleroom-authority-harness`
- Base: `b4dfce94384ef2162a155360f9d5f1f6fec74290`
- Reviewed commit: `1ae98c5ff1a39c32f23e16915908bcf152df8af7`
- Pull request: #54

## Scope

`git merge-base HEAD origin/main` returns `b4dfce94384ef2162a155360f9d5f1f6fec74290`
(the human merge commit of PR #53 / SEC-006), `git rev-list --count <base>..HEAD`
returns `1`, and `gh pr view 54` reports `headRefOid`
`1ae98c5ff1a39c32f23e16915908bcf152df8af7`, `state` `OPEN`, `isDraft` `false`,
`mergeable` `MERGEABLE`. The tracked working tree was clean at review start.

`git diff --name-status <base>...HEAD` returns exactly the six authorized paths:

- `A apps/server/test/support/startProductionBattleServer.ts`
- `A apps/server/test/productionBattleRoomAuthority.test.ts`
- `A docs/tasks/test-003-production-battleroom-authority-harness.md`
- `A docs/reviews/test-003-production-battleroom-authority-harness-review.md`
- `M docs/handoffs/CURRENT.md`
- `M PROJECT_CONTEXT.md`

`git diff --check <base>...HEAD` reports no whitespace defects.
`git diff --name-only <base>...HEAD -- apps/server/src apps/client/src packages`
returns empty. `git diff --name-only <base>...HEAD -- package.json
package-lock.json "**/package.json" .github vitest.config.ts docs/decisions`
also returns empty. No production source, package, manifest, lockfile,
workflow, Vitest configuration, accepted decision, or historical DOCARCH drill
evidence changed.

## Real BattleRoom verification

`startProductionBattleServer.ts` constructs an ordinary `colyseus` `Server` over
a `WebSocketTransport` bound to a bare `node:http` server and registers rooms
solely through `registerProductionRooms(gameServer)` imported from
`../../src/rooms/productionRoomRegistry.js`. It contains no `define` call of its
own, so it cannot duplicate or override the `battle → BattleRoom` definition, and
it never imports or references `TestBattleRoom`, `TestRoomMessages`, or
`test:setShipState`.

The test connects with the real `NetworkClient`, which performs
`client.joinOrCreate(roomName)` over the WebSocket transport. The path under
test is therefore `NetworkClient → WebSocket → production room registry → real
BattleRoom`, and every assertion reads replicated client-visible state
(`currentParticipants`, `currentShips`, `currentProjectiles`) rather than
server internals.

`battle-test` unavailability is proven positively: the first client connects to
room name `battle-test`, and the test asserts its connection status is `error`
with an undefined session ID. Server logs from a review run show a single
`[BattleRoom] created roomId=...` line for the whole test, confirming the
diagnostic room name created no room.

No `BattleRoom` subclass is instantiated, no private production state is patched,
no production test hook exists, and no test-only production message was added.
`BattleRoom.onCreate` registers exactly two handlers — `SET_PROFILE` and
`PLAYER_INPUT` — with no `onMessage('*')` wildcard.

## Multi-client authority verification

The test drives player A (red), player B (blue), and a spectator. After profile
acceptance it waits for every one of the three clients to independently
replicate three participants and exactly two ships before asserting anything, so
no assertion runs against a single client's stale snapshot.

For each of the three observers it asserts the sorted participant session IDs
equal the three real session IDs, the sorted ship owners equal exactly the two
player session IDs, player A's ship faction is `red`, player B's is `blue`, and
`shipFor(observer, spectatorSessionId)` is `undefined`. Session IDs are asserted
defined and then narrowed by an explicit throw, so `undefined` cannot be
accepted as success.

Movement authority: initial positions are captured from the spectator's
replicated state after stable replication. Only player A sends `rightInput()`.
`simulateShipMovement` maps `right: true` to `rawDirectionX = 1` and adds
`velocityX * dt` to `ship.x`, so the wait condition
`(shipFor(observer, playerASessionId)?.x ?? 0) > playerAStart.x + 10` is a real
positional assertion, required to hold on all three observers. The `?? 0`
fallback cannot mask an absent ship: red spawns at `RED_BASE_X = 760`, so
`0 > 770` is false and an undefined ship keeps the wait pending until timeout.
Player B's ship is then asserted positionally unchanged via
`expectPositionUnchanged`, which asserts `toBeDefined()` before comparing, and
both ships' `ownerSessionId` values are re-asserted, so ownership is proven not
to transfer.

All waits are bounded at `WAIT_TIMEOUT_MS = 5000` and each throws
`Timed out after 5000ms waiting for <label>.` with a specific label naming the
missing condition.

## Diagnostic-bypass verification

This assertion is causally real, not nominal, and was confirmed by direct
runtime evidence.

`rawRoomFor(playerA.client).send('test:setShipState', { targetSessionId:
playerBSessionId, x: 6000, y: 6000, health: 1 })` targets another player and
attempts to mutate position and health. `rawRoomFor` throws
`Expected a connected production battle room.` when the private room reference
is absent, so the test cannot pass with the send path unexecuted. The message
type is a literal string, not a `TestRoomMessages` import, so no production or
test dependency on the diagnostic module is created.

Running the test with server output captured produced the server-side line:

```
room onMessage for "test:setShipState" not registered. (roomId: ksbehwxKk)
```

This proves the message was serialized, transmitted over the WebSocket, and
reached the real production `battle` room instance, which rejected it because
`BattleRoom` registers no such handler. Ignoring an unregistered production
message is the accepted outcome.

State is observed before the attempt (`targetBeforeDiagnostic` is a spread copy
of the live snapshot) and after. `expectShipUnchangedFor` then polls for
`AUTHORITY_OBSERVATION_MS = NETWORK_TICK_INTERVAL_MS * 6`. With
`NETWORK_TICK_RATE = 20`, that is 300 ms, roughly six server simulation ticks
and patch cycles — sufficient bounded time for a mutation to have replicated had
one occurred. The polled values come from `NetworkClient.currentShips`, which
`upsertShip` rebuilds through `toShipSnapshot` on every schema `onChange`, so the
comparison uses fresh replicated state rather than a cached object. Position,
health, and `ownerSessionId` are all re-asserted unchanged afterwards.
`BattleRoom` is unmodified by this PR.

## Multi-client authority — spectator, profile, projectile, disconnect

Spectator: the test bypasses `NetworkClient.sendPlayerInput`, which returns early
for any client whose accepted mode is not `player`, and instead sends a raw
`ClientMessages.PLAYER_INPUT` through `rawRoomFor(spectator.client)`. This is
what makes the assertion meaningful — the message genuinely reaches the server.
`BattleRoom.handlePlayerInput` resolves the ship by the sender's own session ID
and returns when none exists, so the spectator creates no ship and moves nobody.
The test asserts player B's ship is unchanged for the full observation window,
that the spectator still holds no ship, and that the spectator connection remains
`connected`. Spectator-by-default is existing production behavior: `onJoin` sets
`mode = 'spectator'` with no ship, unchanged by this PR.

Profile: after player A's `red`/`player` profile is accepted, the test attempts a
faction change to `blue`. `handleSetProfile` rejects any mode or faction change
once `participant.profileReady` is set. The test waits for the exact production
rejection reason `Disconnect before changing mode or faction.` and then asserts
final authoritative state, not merely the error callback: the connection remains
`connected`, the accepted profile faction is still `red`, the replicated ship
faction is still `red`, and `ownerSessionId` is unchanged. It then proves the
connection is still usable by sending input and waiting for `lastProcessedInput`
to advance.

Projectile: player A sends `shootingInput()`; the test waits for a projectile in
the spectator's replicated state whose `ownerSessionId` equals player A's real
session, asserts it is not player B's, and cross-checks that player B's
independent replica of the same projectile ID reports the same owner. Server
control of the lifecycle is proven by waiting for the projectile to disappear
from both observers' state without any client action. No `TestBattleRoom`
positioning is used and no hit or death outcome is asserted.

Disconnect: player A disconnects; the test waits until both player B and the
spectator observe removal of player A's participant entry and ship through
replicated state. It then asserts player B's participant and ship remain with
correct ownership, and that player B's connection still functions by advancing
`lastProcessedInput`. The spectator is asserted still `connected`. No reconnect
semantics are defined or asserted.

## Test determinism and cleanup

The authority test was run three consecutive times as required. All three passed
and exited cleanly (exit code `0`), at 2933 ms, 2854 ms, and 2844 ms — no flake
and no meaningful variance.

- Every wait is bounded by `WAIT_TIMEOUT_MS` or `AUTHORITY_OBSERVATION_MS`; there
  is no unbounded polling. The only fixed sleep is the 20 ms poll granularity
  inside `waitFor`/`expectShipUnchangedFor`.
- Every timeout message names the specific missing condition.
- The suite contains one test, so order independence is trivially satisfied and
  no mutable state is shared between tests.
- `afterEach` disposes every registered client through
  `Promise.allSettled(clients.splice(0).map(...))` and then calls
  `server?.stop()`, so cleanup runs even when an assertion throws.
- `stop()` is idempotent via a `stopped` flag, and performs
  `gracefullyShutdown` → conditional `httpServer.close()` → IPC restore in a
  `finally`.
- Every failure path in `startProductionBattleServer` (transport construction,
  listen error, unresolvable address) shuts down the Colyseus server, closes the
  HTTP server when listening, and restores the patched IPC before rethrowing, so
  a failed startup cannot leak an open server.
- The port is ephemeral (`listen(0, '127.0.0.1')`), loopback-only, and the client
  URL is derived from the resolved `AddressInfo.port`. No fixed port and no
  global mutable singleton server is used.
- No promise rejection is ignored silently; `catch(() => undefined)` appears only
  on best-effort shutdown paths inside an already-failing branch.
- No broad `as any` is used. The single cast is a narrow
  `as unknown as { room?: RawRoomSender }` read of a private field.

After the full review run, no `node` process remained on the machine.

## Regression validation

All commands were run from the repository root on the reviewed commit.

| Command | Result |
|---|---|
| `npm test` | Pass — `Test Files 6 passed (6)`, `Tests 35 passed (35)`, 0 skipped |
| `npx vitest run apps/server/test/productionBattleRoomAuthority.test.ts` ×3 | Pass — 3/3, exit `0` each |
| `npm run typecheck` | Pass — all six workspaces |
| `npm run build` | Pass — all workspaces, client `built in 8.28s` |
| `npm run check:protocol-profile` | Pass — `Profile protocol compatibility check passed.` |
| `npx tsx apps/client/scripts/network-client-callback-check.ts` | Pass — `"ok": true` |
| `npx tsx apps/server/scripts/movement-check.ts` | Pass — `{"ok": true}` |
| `npx tsx apps/server/scripts/combat-check.ts` | Pass — `{"ok": true}` |

The six discovered test files are `productionBattleRoomAuthority.test.ts` (1),
`profileBoundary.test.ts` (3), `playerInput.test.ts` (11),
`outpostRespawn.test.ts` (13), `combat.test.ts` (4), and
`productionRoomRegistry.test.ts` (3) — 35 tests, exactly the pre-existing 34
plus the one new authority test. Vitest exited without hanging on every run.

`.github/workflows/pr-checks.yml` was re-inspected and still does not invoke
`npm test`; the local results above are the required reviewer-rerun evidence.
No CI change was made in this review.

## Documentation consistency

`docs/tasks/test-003-production-battleroom-authority-harness.md` records
TEST-003, Wave 1 active, `NORMAL — test-focused runtime foundation` risk,
SEC-006 / PR #53 merged at `b4dfce94384ef2162a155360f9d5f1f6fec74290`, the
accepted count 35 with the split 18/5/7/4/1, the exact created and modified
paths, the harness architecture, the authority invariants, the deliberate
production death/respawn exclusion, the no-production-source and
no-dependency/workflow non-goals, the required validation, the single integrated
review, Claude QA as advisory and non-blocking, human-only merge under
`BS-PROC-001`, and the next runtime boundary as WebSocket origin policy and
bounded abuse/rate-limit protection. It invents no accepted decision ID and
states the task introduces and changes none.

The review artifact was committed at `1ae98c5` as a compact `PENDING` skeleton
with blank sections, a single integrated verdict block, and no separate reviewer,
Product Architect, or Claude sections.

## CURRENT and PROJECT_CONTEXT

`docs/handoffs/CURRENT.md` records PR #53 / SEC-006 merged at
`b4dfce94384ef2162a155360f9d5f1f6fec74290`, production diagnostic-room isolation
established, Wave 1 active, TEST-003 as the sole active bounded task, the correct
branch, task, and review paths, that no production or accepted-decision behavior
changes, DOCARCH-004 open but paused, PR #51 open and draft as frozen historical
methodology evidence, PR #52 closed and superseded, and the accepted count 35
with its split. Remote state confirms PR #51 is `OPEN` and draft and PR #52 is
`CLOSED`. The file contains exactly one `## Next safe action` heading, reading
"Independent reviewer validates the TEST-003 production-BattleRoom authority
harness on the current pull-request head." It does not claim TEST-003 merged,
Wave 1 complete, network hardening active, DOCARCH-004 closed, PR #51 closed, or
PR #52 active.

`PROJECT_CONTEXT.md` records SEC-006 merged, production diagnostic isolation
established, runtime-first Wave 1 active, and that real production `BattleRoom`
authority coverage is being expanded, while deferring the exact active bounded
task to `CURRENT.md`. It tracks no TEST-003 detail, contains no hexadecimal
commit token, and claims neither TEST-003 nor Wave 1 complete. The wording is
durable and should reduce per-task edits.

## Accepted count

`docs/decisions/` holds 35 decision records excluding `README.md`,
`DECISION_TEMPLATE.md`, and `DECISION_INDEX.md`, split 18 `BS-MECH`,
5 `GAME-001`, 7 `BS-ARCH`, 4 `BS-PROC`, and 1 `CI`. No decision file changed and
`DECISION_INDEX.md` did not change. The test introduces no semantic decision.

## Blocking findings

None.

## Non-blocking notes

1. **`npm test` is not a Core PR Check.** `.github/workflows/pr-checks.yml` runs
   build, typecheck, protocol-profile, and the three diagnostic scripts, but not
   `npm test`, so the new authority coverage is not durably enforced remotely.
   This is the known follow-up recorded by the task; local rerun evidence is
   above. A separate bounded CI task remains the appropriate remedy.

2. **The new harness files are not statically typechecked.** Both
   `apps/server/tsconfig.json` and `apps/client/tsconfig.json` `include` only
   `src`, so `npm run typecheck` covers neither
   `productionBattleRoomAuthority.test.ts` nor
   `startProductionBattleServer.ts`. This is a pre-existing repository-wide gap
   that TEST-003 inherits rather than introduces. A dedicated
   `tsconfig.test.json` would restore coverage.

3. **`rawRoomFor` depends on a private `NetworkClient` field.** The
   `as unknown as { room?: RawRoomSender }` read is the correct technique here —
   `sendPlayerInput` deliberately short-circuits for non-players and there is no
   public raw-send API, so reaching the room is what makes the spectator and
   diagnostic assertions causally real. It reads rather than patches production
   state, but it is coupled to an internal field name; a short comment explaining
   why the reflection is intentional would protect it from future renames.

4. **`filterPm2TelemetryFromWorkerIpc` patches global `process.send`.** The
   restore is correctly guarded by identity (`process.send === filteredSend`) and
   nests correctly for sequential start/stop. Out-of-order stops of two
   concurrent servers would leave one patch layer installed. That cannot occur
   under the current `fileParallelism: false` / `maxWorkers: 1` / non-concurrent
   Vitest settings; a comment recording that dependency would prevent a future
   concurrency change from silently regressing it.

5. **One monolithic test.** The scenario is a single ~200-line `it` whose later
   phases depend on earlier state. That is a legitimate shape for a sequential
   authority scenario and satisfies order-independence trivially, but splitting
   the independent invariants into separate `it` blocks over a shared server
   would localize failures better.

6. **The spectator movement assertion is an indirect proxy.** Asserting that
   player B's ship does not move under spectator input only catches a server that
   misroutes input to an arbitrary ship. The directly proven invariants — the
   spectator owns no ship, and `handlePlayerInput` resolves the ship from the
   sender's own session — are the stronger ones and are both covered.

7. **Cross-workspace relative import.** The server test imports
   `../../client/src/network/NetworkClient` by deep relative path. This matches
   the existing precedent of `apps/client/scripts/network-client-callback-check.ts`
   importing server test support, is test-only, and affects no production package
   boundary.

8. **Observation, outside TEST-003 scope.** Server logs show player A's
   mid-test `NetworkClient.disconnect()` recorded as
   `left sessionId=... consented=false`, while the `afterEach` disconnects record
   `consented=true`. Cleanup is identical either way and the test asserts nothing
   about consent, so this does not affect any verdict. It is pre-existing client
   behavior that TEST-003 does not touch, and may be worth confirming when
   reconnect/recovery work begins.

## Integrated reviewer verdict

- Verdict: `APPROVED WITH NON-BLOCKING NOTES`
- Reviewed commit: `1ae98c5ff1a39c32f23e16915908bcf152df8af7`
- Evidence source: Independent integrated runtime review of PR #54 — repository
  and scope verification, harness and production-path inspection against
  `BattleRoom`, `productionRoomRegistry`, `shipMovement`, and `NetworkClient`,
  captured server-side rejection of `test:setShipState`, three consecutive
  authority-test runs, full local regression suite, and documentation
  verification, all recorded above.
- Date: 2026-08-11

The harness proves authority through the real production registration path, the
diagnostic mutation message is demonstrably transmitted and demonstrably
ineffective, every authority assertion is causally meaningful rather than
vacuous, the test is deterministic across repeated runs, cleanup is reliable
including on failure, scope is exact, and all required validation passes. The
notes above are deferred follow-ups that do not weaken production authority.

## Human merge gate

One independent integrated reviewer verdict and passing Core Pull Request
Checks on the final head are required before human-only merge. Claude QA is
advisory and non-blocking for TEST-003 unless a successful substantive review
reports `CHANGES REQUIRED`.
