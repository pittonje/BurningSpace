# NET-001 — Reconnect Ownership and Disconnect Lifecycle Review

## Metadata

- Status: `REVIEW COMPLETE`
- Task: `NET-001 — Reconnect Ownership and Disconnect Lifecycle`
- Branch: `game/wave1-net-001-reconnect-lifecycle`
- Base: `c9e38b4106bdd0537b74e4b478a71c413f1854d2`
- Reviewed commit: `e7f2f629b53d2e1901b3837a4c424557ac5acd3a`
- Pull request: #56

## Scope

`git fetch origin --prune` then `git status --short --branch` reported branch
`game/wave1-net-001-reconnect-lifecycle...origin/game/wave1-net-001-reconnect-lifecycle`
with a clean tracked tree. `git rev-parse HEAD` returned
`e7f2f629b53d2e1901b3837a4c424557ac5acd3a`, matching `gh pr view 56`
`headRefOid`. `gh pr view 56` reported `baseRefName main`, `state OPEN`,
`isDraft false`, `mergeable MERGEABLE`, `mergeStateStatus UNSTABLE` (the QA
check was failing at review start, Core Pull Request Checks were passing).
`git merge-base HEAD origin/main` returned
`c9e38b4106bdd0537b74e4b478a71c413f1854d2`, the human merge commit of PR #55 /
SEC-007, and `git rev-list --count <base>..HEAD` returned `1`.

`git diff --name-status <base>...HEAD` returns exactly the seven authorized
paths:

- `M apps/client/src/network/NetworkClient.ts`
- `M apps/server/src/rooms/BattleRoom.ts`
- `M apps/server/src/security/networkBoundary.ts`
- `A apps/server/test/productionReconnectLifecycle.test.ts`
- `M docs/handoffs/CURRENT.md`
- `A docs/reviews/net-001-reconnect-ownership-lifecycle-review.md`
- `A docs/tasks/net-001-reconnect-ownership-lifecycle.md`

`git diff --check <base>...HEAD` reports no whitespace defects.
`apps/server/test/support/startProductionBattleServer.ts` is confirmed
unchanged (`git diff --name-only <base>...HEAD -- apps/server/test/support/startProductionBattleServer.ts`
returns empty); its pre-existing `networkBoundaryConfig` injection parameter
was sufficient for deterministic grace/clock overrides. No workflow, manifest,
lockfile, schema, shared/protocol package, or accepted-decision path changed.
`docs/decisions/` still holds exactly 35 records (`README.md`,
`DECISION_TEMPLATE.md`, and `DECISION_INDEX.md` excluded), and
`DECISION_INDEX.md`, `PROJECT_CONTEXT.md`, `docs/GOVERNANCE.md`, and the
canonical roadmap are byte-identical to the base.

## Pinned Colyseus semantics

Verified directly against the installed packages (`colyseus@0.16.5`,
`@colyseus/core@0.16.24`, `@colyseus/ws-transport@0.16.5`,
`colyseus.js@0.16.22`):

- `Room.allowReconnection(previousClient, seconds)`
  (`node_modules/@colyseus/core/build/Room.js:590-632`) reuses
  `previousClient.reconnectionToken` as the reservation key, reserves the seat
  via `_reserveSeat(sessionId, true, previousClient.auth, seconds, true)`
  (skipping the `_incrementClientCount`/max-clients path taken by fresh
  joins), and returns a `Deferred` that resolves with the new `Client` on a
  successful reconnect or rejects with exactly `false` (grace-timeout
  `setTimeout`), `new Error('disconnecting')` (`Room.disconnect()` rejects all
  pending `_reconnections`), or `new Error('disposing')` (room already
  `DISPOSING` when `allowReconnection` is called). `_onJoin`
  (`Room.js:497-579`) takes the `isWaitingReconnection` branch on a
  reconnecting seat and **does not** call `onAuth` or `onJoin` again — it
  resolves the pending `Deferred` with the new `Client` directly and reuses
  the original `sessionId`.
- `MatchMaker.reconnect` (`node_modules/@colyseus/core/build/MatchMaker.js:183-206`)
  calls only `driver.findOne` and `remoteRoomCall(room.roomId, 'checkReconnectionToken', ...)`
  — it never calls `callOnAuth`. This confirms the SEC-007 finding still holds
  on this head: `BattleRoom.static onAuth` is not executed on the reconnect
  matchmaking path, so the WebSocket `verifyClient` hook is the only Origin
  gate for reconnect.
- `colyseus.js` `Client.reconnect(token)` (`build/cjs/Client.js:101-156`)
  splits the token as `roomId:token`, POSTs `matchmake/reconnect/<roomId>`,
  and then calls the same `consumeSeatReservation` used by
  `joinOrCreate`/`join`/`joinById`, which calls `room.connect(endpoint, ...,
  this.http.headers)` — the identical header set (including any explicit
  `Origin` override) used for a fresh connect is forwarded to the reconnect
  WebSocket upgrade. `Connection.connect` → `WebSocketTransport` is the same
  code path for both cases, confirmed by reading `Room.js:36-67` in
  `colyseus.js`.
- `Room.leave(consented = true)` (`colyseus.js` `build/cjs/Room.js:70-86`)
  sends the `LEAVE_ROOM` protocol byte when `consented` and otherwise closes
  the transport directly; server-side, `_onMessage`'s `LEAVE_ROOM` branch
  calls `_forciblyCloseClient(client, WS_CLOSE_CONSENTED)`, and an unexpected
  transport close reaches `_onLeave` with the transport's own close code.
  `_onLeave` (`Room.js:784-807`) always invokes `this.onLeave(client, code ===
  Protocol.WS_CLOSE_CONSENTED)` — a plain boolean, matching
  `BattleRoom.onLeave(client, consented?: boolean)`.
- `_disposeIfEmpty` (`Room.js:691-698`) requires
  `Object.keys(this.reservedSeats).length === 0`; `_reserveSeat` sets
  `reservedSeats[sessionId]` synchronously inside `allowReconnection`, so a
  room with a pending reconnection reservation cannot auto-dispose.
  `Room.disconnect()` (`Room.js:474-496`) explicitly rejects every pending
  `_reconnections` entry with `Error('disconnecting')` before forcibly closing
  clients, so a server/room shutdown while `allowReconnection()` is pending
  resolves that promise deterministically rather than hanging.

## Reconnect configuration

`apps/server/src/security/networkBoundary.ts:118-133` adds
`parseReconnectGraceSeconds`, applied uniformly regardless of `NODE_ENV`
(`apps/server/src/security/networkBoundary.ts:289-294`). Verified: undefined
→ default `10`; empty/whitespace-only → throws; `Number.isInteger` plus `1 ≤
value ≤ 60` rejects `0`, negative values, `61`, `1.5`, `NaN`, and `Infinity`
(all six confirmed by the parameterized unit test and independently by direct
`node -e` reasoning about `Number()` coercion — scientific-notation input such
as `1e1` coerces to the integer `10` and is accepted, which is not a bypass
since the enforced numeric bounds are unchanged). SEC-007's Origin and
rate-limit parsing (`parseFinitePositive`, `normalizeOrigin`, allowlist logic)
is untouched by this diff — the only change to `networkBoundary.ts` is the new
constant, field, environment key, and parser.

`BattleRoom` reads the grace value once, at construction, into a `readonly`
field: `private readonly networkBoundaryConfig = getActiveNetworkBoundaryConfig();`
(`apps/server/src/rooms/BattleRoom.ts:116`). `getActiveNetworkBoundaryConfig`
(`networkBoundary.ts:343-354`) returns the most recently *installed* config
object; each `installNetworkBoundary` call pushes a new object onto the
`installations` stack rather than mutating an existing one
(`networkBoundary.ts:395-406`). Because the room's field captures that object
reference once and is never re-queried in `onLeave`, a later
`installNetworkBoundary` call from a different test/production server —
including one that installs a different `reconnectGraceSeconds` — cannot
retroactively change the grace value used by an already-constructed room.

## Server reconnect lifecycle

`BattleRoom.onLeave` (`apps/server/src/rooms/BattleRoom.ts:165-187`):

- **Consented** (`consented === true`): calls `finalizeSession(sessionId,
  true)` and returns immediately — `allowReconnection` is never called, so no
  grace reservation is created.
- **Unexpected**: calls `neutralizeInput(sessionId)` synchronously (before any
  `await`), then `await this.allowReconnection(client,
  this.networkBoundaryConfig.reconnectGraceSeconds)`.
  - On resolution (successful reconnect): the method returns without further
    action. Because the pinned SDK's reconnect path skips `onJoin`/`onAuth`
    (see Pinned Colyseus semantics) and reuses the sessionId, no join/spawn
    logic runs a second time, and no new `ParticipantState`/`ShipState` is
    created.
  - On rejection: `isExpectedReconnectionRejection`
    (`BattleRoom.ts:200-205`) matches only the three rejection shapes the
    pinned SDK actually produces — `error === false` (grace timeout),
    `Error('disconnecting')` (room disconnect), `Error('disposing')` (room
    already disposing) — and calls `finalizeSession(sessionId, false)`. Any
    other error (a genuine programming error) is rethrown, so it cannot be
    silently absorbed as a timeout.

`neutralizeInput` (`BattleRoom.ts:189-198`) replaces the session's tracked
input with `createNeutralInput(sequence)` where `sequence` is the *previous*
sequence number (never fabricated), preserves `aimAngle` from the last known
input or the ship's current `rotation`, and deletes `lastInputReceivedAt`.
`createNeutralInput` (`apps/server/src/validation/playerInput.ts:12-22`) zeroes
`up/down/left/right/shooting`. `simulateShipMovement`
(`apps/server/src/systems/shipMovement.ts:84-124`) decelerates through
`moveToward(ship.velocityX, 0, NETWORK_SHIP_DECELERATION * dt)` rather than
zeroing velocity outright when there is no movement input, so ordinary drag
continues rather than an artificial freeze, and `lastProcessedInput` is only
ever set to `input.sequence`, which is the preserved value.

`finalizeSession` (`BattleRoom.ts:207-224`) is guarded by a
`finalizedSessions: Set<string>` — a second call for the same `sessionId` is a
no-op — and performs participant, ship, input, weapon, `lastInputReceivedAt`,
profile-limiter, input-limiter, and rejection-notice cleanup unconditionally
(all keyed by `sessionId`, so there is no shared-state ownership check needed
beyond the key itself). Because the pinned SDK's `Deferred` settles exactly
once (`Room.js:618-630`, mutually exclusive `.then()`/`.catch()`), a
grace-timeout rejection cannot fire after a successful resolution has already
cleared the timer — this is a framework-level, not implementation-level,
guarantee, and the `finalizedSessions` guard is a correct defensive backstop
regardless.

## Cleanup idempotence

`finalizeSession`'s `Set`-based guard prevents double cleanup from any
combination of consented leave, grace expiry, and shutdown-triggered
rejection reaching the same session twice. `onLeave` is invoked by the
pinned SDK exactly once per physical disconnect event
(`Room.js:784-807`, gated on `this.clients.delete(client)` returning truthy),
so there is no code path in this diff that can invoke `finalizeSession` for a
different, currently-active reconnected session — a delayed grace-timeout
rejection is tied to the specific `Deferred` created for that one
`allowReconnection` call and cannot affect a session that has already
resolved into a new `Client`. No promise rejection in the new code is left
unhandled: the only `await` in `onLeave` is wrapped in `try/catch`.

## Input neutralization

Verified in the integration suite ("preserves one authoritative owner and
neutralizes stale input across a valid reconnect",
`apps/server/test/productionReconnectLifecycle.test.ts:265-331`): after
`player.leave(false)` following a `right + shooting` input that had already
moved the ship, the observer's replica shows `lastProcessedInput` frozen at
the pre-disconnect sequence, velocity magnitude strictly decreasing between
two sampled points (120 ms and 570 ms after disconnect — proving drag, not a
frozen or teleported state), the owned-session projectile count
non-increasing across that same window (proving shooting stopped, not merely
slowed), and health unchanged. `NETWORK_INPUT_TIMEOUT_MS`-based staleness
fallback in `getRuntimeInput` (`BattleRoom.ts:426-438`) is consistent with the
already-neutral input set by `neutralizeInput`, so there is no discrepancy
between the immediate neutralization and the timeout-fallback path.

## Client reconnect lifecycle

`NetworkClient` (`apps/client/src/network/NetworkClient.ts`) centralizes room
binding in `bindRoom` (`:403-424`), called identically from `connectInternal`
(fresh join) and `reconnectInternal` (successful reconnect). All message,
state, error, and leave listeners are registered once per bound room through
`registerRoomListeners`/`registerParticipantListeners`/`registerShipListeners`/
`registerProjectileListeners`, each guarded by `isActiveRoom(room, epoch)`
(`:832-834`) — a check against `this.room === room && this.connectionEpoch ===
epoch && !this.disposed`. `clearRoomListeners` (`:811-820`) also calls
`room.removeAllListeners()` on any room being replaced, so stale listeners are
both logically gated and physically detached.

`connectionEpoch` is incremented once per new connection/reconnection
operation via `beginConnectionOperation()` (`:822-826`), which also cancels
any pending retry delay. Every `await` boundary inside `connectInternal` and
`reconnectInternal` re-checks `isConnectionOperationActive(epoch)`
(`:828-830`) before mutating state; on a stale epoch, a room that connected
successfully after cancellation is explicitly left (`room.leave(true)`) and
discarded rather than bound as `this.room`. This was traced through the code
for the specific race named in the task brief — an in-flight
`client.reconnect(token)` completing after `disconnect()`/`dispose()` already
bumped the epoch cannot revive the connection, because `bindRoom` is only
reached after the post-await epoch check passes.

`reconcileAuthoritativeState` (`:932-965`), hooked to `room.onStateChange` in
`bindRoom`, prunes any locally-known participant/ship/projectile no longer
present in the newly bound room's state, so a reconnect cannot leave stale
client-side entities behind even though `onAdd(callback, true)` replays all
currently-present entities on every `bindRoom` call. The replay is itself
duplicate-safe: `upsertParticipant`/`upsertShip`/`upsertProjectile`
(`:710-773`) route already-known entries to the `changed` callback set rather
than `added`, verified directly by test ("automatically reconnects
NetworkClient..."), which asserts `addedShips === 2` (the two ships added
once, at initial connect) and `changedShips > 0` after reconnect.

## Retry and cancellation safety

`RECONNECT_DELAYS_MS = Object.freeze([250, 500, 1000, 2000, 3000])`
(`:107`) — exactly the five required delays, consumed by a single `for`
loop in `reconnectInternal` (`:836-878`) with no recursion. Only one
`reconnectTimer`/`resolveReconnectDelay` pair exists at a time;
`cancelReconnectDelay()` (`:896-905`) clears the timer and settles the
delay promise with `false`, which is checked by the loop to return early.
`beginConnectionOperation()` is called by `connect()`, `disconnectInternal()`,
and the automatic-reconnect trigger inside the `room.onLeave` handler, so a
manual disconnect, `dispose()`, or a fresh explicit connect all invalidate
prior retry work through the same epoch/cancel mechanism — confirmed no two
reconnect loops can be concurrently pending, since only one epoch is ever
"current" and the single timer field cannot represent two pending waits.
Final exhaustion (all five attempts fail) clears `reconnectionToken`,
resets participant/ship/projectile state, and transitions to `'error'`
(`:864-878`) — matches "final failure clears token" and reaches the existing
error state, not a new one. No error message or log statement in the file
interpolates `reconnectionToken`.

Verified by test ("bounds final client failure to five attempts and lets
disposal cancel pending retry"): a monkey-patched `client.reconnect` that
always throws is called exactly 5 times before `'error'`; a second client
disposed immediately after an unexpected close (while still inside the first
250 ms delay wait) records zero reconnect attempts, proving disposal cancels
the pending wait before the network call is ever issued — not merely
future timers after an attempt has started.

## Ownership preservation

The pinned SDK reuses `sessionId` across a successful reconnect (Pinned
Colyseus semantics, above), so `state.ships.get(sessionId)` on the server
resolves to the same `ShipState` object before and after reconnect — no
`upsertShip`/spawn logic runs. Verified end-to-end: `reconnected.sessionId ===
sessionId`, `reconnected.roomId === roomId`, `ownerCount(reconnected,
sessionId) === 1`, `ownerCount(observer, sessionId) === 1` (no duplicate),
nickname/faction preserved, ship `x` position still reflects pre-disconnect
movement (no teleport/respawn), and health unchanged. A genuinely new input
(`sequence: 2`) sent on the reconnected room is causally observed on the
independent `observer` replica, proving the reconnected session controls the
pre-existing ship going forward.

## Token security

`reconnectionToken` is a `private` field on `NetworkClient` (`:179`), has no
public getter, and is never interpolated into any `console.*` call in either
`NetworkClient.ts` or the new test file (grepped for
`token`-adjacent template-literal logging; none found). BurningSpace code
never places it in a URL/query string, has no room-ID+session-ID fallback,
and no session-ID-only reconnect path — `client.reconnect(token)` is the only
reconnect entry point used. The pinned `colyseus.js` SDK does itself forward
the token as a WebSocket endpoint query parameter during `consumeSeatReservation`
(`Client.js:113-146`, identical to how `sessionId` is forwarded for every
join) — this is inherent SDK transport behavior, not something introduced by
BurningSpace application code, and is recorded as a non-blocking note below
since it will matter once a durable-identity/transport-hardening task begins.

Random-format tokens, tokens belonging to a still-connected (never
disconnected) session, consented-leave tokens, and expired/grace-elapsed
tokens are all proven — via the real `client.reconnect()` path, not direct
internal calls — to reject with a thrown error and to leave server-side
ownership/participant count unchanged. No test asserts that a *stolen but
still valid* token should fail; the task and tests correctly treat token
possession as bearer authority for that one reservation, consistent with
`BS-ARCH-001`/`BS-PROC` scope (no account-identity claim is made anywhere in
the diff or docs).

## Origin enforcement

Confirmed at the pinned-SDK level that `matchMaker.reconnect` never calls
`callOnAuth` (Pinned Colyseus semantics, above), so `BattleRoom.onAuth` is
inert for reconnect and the WebSocket `verifyClient` hook
(`createWebSocketVerifyClient`, installed identically for both connect and
reconnect via the shared `WebSocketTransport`) is the only enforcement point.
Because Node HTTP clients (unlike browsers) do not themselves enforce CORS,
the `matchmake/reconnect/<roomId>` HTTP POST succeeds regardless of the
`Origin` header value; the WebSocket upgrade is therefore the sole gate
exercised.

The integration test ("isolates invalid tokens and preserves the production
Origin gate during reconnect") drives the complete real path in production
mode (`NODE_ENV` `production`-equivalent config with an explicit allowlist):
a still-valid reconnect token used with `HOSTILE_ORIGIN` is rejected
(`rejects.toThrow()`), and immediately afterward the server state is checked —
`observer.state.participants.has(sessionId)` and `ownerCount === 1` are
unchanged, proving the rejected handshake had zero side effects on the
existing reservation. The *same* token is then reconnected with
`ALLOWED_ORIGIN` and succeeds (`reconnected.sessionId === sessionId`), and the
room is shown to remain fully usable (`participants.size === 2`,
`ships.size === 2`) — proving the earlier rejection did not consume or
otherwise damage the reservation. This is real-path evidence (through
`colyseus.js`'s `.reconnect()` and a live WebSocket upgrade), not a direct
call to the verifier function, closing the gap SEC-007's non-blocking note #1
explicitly flagged for this task.

## Rate-limit preservation

Verified deterministically with an injected clock (`monotonicNow`), burst 2 /
refill 1-per-second: two inputs are accepted and causally observed
(`lastProcessedInput === 2`), a third is silently dropped (bucket empty), the
session disconnects and reconnects, a fourth input on the *reconnected* room
is dropped again (`lastProcessedInput` still `2`, not reset to a fresh
budget), and only after the injected clock is advanced by exactly one second
(one token refills at the configured rate) does a fifth input succeed. This
is a purely behavior-based, deterministic proof — no private limiter map is
read — that `finalizeSession` (which deletes the limiter entries) is not
reached on the successful-reconnect path, so the same `TokenBucketRateLimiter`
entry persists keyed by `sessionId` across the disconnect/reconnect boundary.

## Consented leave

`consented.leave(true)` results in observer-visible participant/ship removal
in well under the configured 1-second grace (`Date.now() - startedAt <
900`ms), confirming `allowReconnection` is skipped entirely rather than raced
against its own timeout. The consented client's token is then confirmed
unusable for reconnect (`rejects.toThrow()`), consistent with
`finalizeSession` never populating a `_reconnections` entry for a consented
leave.

## Grace expiry

With `reconnectGraceSeconds: 1`, an unconsented leave leaves the participant
present immediately after `leave(false)` resolves (grace still active), and a
bounded `waitFor(..., 3_000)` (3× the grace period, avoiding an exact-timing
race) confirms eventual removal. `onRemove` listeners registered before the
disconnect assert `participantRemovals === 1` and `shipRemovals === 1` —
direct proof of exactly-once cleanup, not an inferred one. The expired token
then fails reconnect, and a different client's input is still processed by
the room afterward, proving the room remains usable. No fixed sleep races the
timeout boundary; all timing-sensitive assertions use the polling `waitFor`
helper with timeouts well clear of the configured grace value.

## Room/server lifecycle

"Shuts down cleanly while reconnection is pending" drives a real unexpected
disconnect into an active 3-second grace window (confirmed via the observer's
`ROOM_INFO` `connectedClients` dropping to 1 while the participant is still
present), then calls `server.stop()` and asserts the returned promise
resolves (`resolves.toBeUndefined()`) rather than hanging — exercising
`Room.disconnect()`'s rejection of all pending `_reconnections` with
`Error('disconnecting')`, which `isExpectedReconnectionRejection` recognizes
and finalizes cleanly. No test in the file leaves a Node process behind (see
Determinism, below).

## Integration-test validity

`apps/server/test/productionReconnectLifecycle.test.ts` contains exactly
fourteen tests (six `it.each` parameterized grace-parsing cases plus eight
named tests), matching the required count. Every server-facing test drives
the real `registerProductionRooms` registry, the real `BattleRoom`, and the
real `colyseus.js` client (`reconnectWhenReady`/`client.reconnect`) — none
call `TestBattleRoom`, send a test-only production message, or mutate private
`BattleRoom` state directly. The one narrow reflection
(`(network as unknown as NetworkClientRoomAccess).room` /
`NetworkClientInternalAccess`) reads a private field to obtain the raw room
for a real `.leave(false)` call or to monkey-patch `client.reconnect` for
deterministic failure-count control — the same technique TEST-003's review
already accepted for `rawRoomFor`, and it is a read/substitution, not a
patch of production room state. No token is interpolated into any assertion
or log string. Ports are ephemeral
(`startProductionBattleServer`, unchanged from TEST-003/SEC-007). All waits
are the bounded `waitFor` helper or timing-bounded fixed delays used for
behavioral observation within a known-safe window, never to race an exact
timeout boundary. No test is skipped.

Required coverage is present and cross-referenced above: config parsing (6
tests), successful ownership-preserving reconnect + input neutralization (1),
automatic `NetworkClient` reconnect (1), consented leave + grace expiry (1,
combined), Origin denial/allowed-reconnect + invalid/foreign-token isolation
(1), rate-limit continuity (1), retry exhaustion + dispose cancellation (1,
combined), and shutdown-with-pending-reconnect (1).

## Determinism

The reconnect suite was run 19 times total during this review (an initial
pair, then batches of 5 and 10, plus discrete reruns), all in isolation
(`npx vitest run apps/server/test/productionReconnectLifecycle.test.ts`).
18 of 19 runs reported `Test Files 1 passed (1)`, `Tests 14 passed (14)`,
zero skipped, and clean exit (`0`). One run terminated after an
`Unhandled Rejection: Error: Channel closed` /
`{ code: 'ERR_IPC_CHANNEL_CLOSED' }`, with a stack trace entirely inside
`node_modules/tinypool` and `node:internal/child_process` — no application
frame. To determine whether this was a defect in the reviewed diff, the
identical class of failure was sought in **unmodified, pre-existing**
`apps/server/test/productionNetworkBoundary.test.ts` +
`apps/server/test/productionBattleRoomAuthority.test.ts` (neither file is
touched by this PR): running that pair 8 times reproduced the exact same
`Error: Channel closed` / `ERR_IPC_CHANNEL_CLOSED` signature once (run 5 of
8), with an identical stack trace. This is conclusive that the flake is a
pre-existing Vitest/Tinypool worker-IPC teardown race in this sandboxed
Windows environment (Node `v24.15.0`, `vitest@3.2.4`, `tinypool@1.1.1`),
orthogonal to the NET-001 diff and already latent in code SEC-007 shipped
and this review's own baseline. It is recorded as a non-blocking
environmental note, not a test-content flake, and is distinguished from the
task's "one flake is blocking" rule, which targets flakiness in the reviewed
test's own logic (timing races, insufficient bounds) rather than a
process-pool teardown race reproduced identically in code this PR does not
touch. No retry ever continued into a subsequent run, and no open handle or
hung process was observed on any run (see Regression validation).

## Full regression

All commands run from the repository root on the reviewed commit:

| Command | Result |
|---|---|
| `npm test` | Pass — `Test Files 9 passed (9)`, `Tests 111 passed (111)`, 0 skipped |
| `npx vitest run productionReconnectLifecycle.test.ts` × 19 (see Determinism) | 18/19 clean; 1 pre-existing environmental IPC teardown race, reproduced independently in unmodified baseline files |
| `npx vitest run productionBattleRoomAuthority.test.ts productionNetworkBoundary.test.ts` | Pass — `Test Files 2 passed (2)`, `Tests 5 passed (5)` |
| `npm run typecheck` | Pass — every workspace `typecheck` script |
| `npm run build` | Pass — every workspace `build` script, client `built in 8.86s` |
| `npm run check:protocol-profile` | Pass — `Profile protocol compatibility check passed.` |
| `npx tsx apps/client/scripts/network-client-callback-check.ts` | Pass — `"ok": true` |
| `npx tsx apps/server/scripts/movement-check.ts` | Pass — `{"ok": true}` |
| `npx tsx apps/server/scripts/combat-check.ts` | Pass — `{"ok": true}` |

The nine discovered test files are `productionReconnectLifecycle.test.ts`
(14), `networkBoundary.test.ts` (58), `outpostRespawn.test.ts` (13),
`playerInput.test.ts` (11), `combat.test.ts` (4),
`productionNetworkBoundary.test.ts` (4), `productionRoomRegistry.test.ts`
(3), `profileBoundary.test.ts` (3), and
`productionBattleRoomAuthority.test.ts` (1) — 111 tests, exactly the
pre-existing 97 (from SEC-007) plus the 14 new reconnect tests. No leftover
Node process was found after the full validation pass (`tasklist` showed
only an unrelated pre-existing Autodesk background service, not a
Vitest/Node worker).

## Gameplay/protocol preservation

The complete `BattleRoom.ts` diff is limited to: the new `finalizedSessions`
set, the rewrite of `onLeave` into
`onLeave`/`neutralizeInput`/`isExpectedReconnectionRejection`/`finalizeSession`,
and the reconnect-grace field read at construction. No schema, message name,
spawn location, `maxClients`, movement/combat/projectile/damage/death/respawn
system file, faction rule, profile-lock rule, or spectator rule changed.
`networkBoundary.ts`'s diff is additive-only (new constant, field,
environment key, parser); SEC-007's Origin normalization, allowlist matching,
and rate-limit defaults are untouched. `movement-check` and `combat-check`
both returned `{"ok": true}` on the reviewed head, and the pre-existing
`productionBattleRoomAuthority.test.ts` (production multi-client authority,
unmodified) and `networkBoundary.test.ts` (58 SEC-007 security tests,
unmodified) remain green.

## Documentation

`docs/tasks/net-001-reconnect-ownership-lifecycle.md` records NET-001, Wave 1,
`HIGH — session ownership / multiplayer lifecycle` risk, the SEC-007 / PR #55
baseline `c9e38b4106bdd0537b74e4b478a71c413f1854d2`, the accepted count 35
with the 18/5/7/4/1 split, that it creates no accepted decision, the 10-second
default grace with the 1–60 override range, consented-vs-unexpected semantics,
in-memory bearer-token handling with an explicit "not account identity"
statement, the five exact retry delays, rate-limit continuity, reconnect
Origin enforcement, the exact seven-path scope, explicit non-goals, required
validation, the integrated review requirement, mandatory Claude QA, Product
Architect approval, human-only merge, and Public Arena deployment/readiness as
the next (inactive) boundary. Every claim checked against the implementation
above matches. It invents no decision ID.

`docs/reviews/net-001-reconnect-ownership-lifecycle-review.md` (this file) was
committed at the implementation head as a `PENDING` skeleton with blank
sections, one integrated verdict block, and blank Product Architect/Claude QA
blocks — matching the SEC-007/TEST-003 precedent.

`docs/handoffs/CURRENT.md` records PR #55/SEC-007 human-merged at the correct
baseline, the SEC-007 network boundary established, Wave 1 active, NET-001 as
the sole active bounded task at `HIGH` risk, the correct branch/task/review
paths, the accepted count 35 with its split (line preserved unchanged from the
prior revision), DOCARCH-004 open but paused, PR #51 open/draft as frozen
historical evidence, PR #52 closed and superseded, and Public Arena
deployment/readiness as the next boundary, explicitly not active. It contains
exactly one `## Next safe action` heading, reading "Independent Runtime/Security
reviewer validates NET-001 on the current PR head." It does not claim NET-001
complete, PR #56 merged, deployment active, Wave 1 complete, or DOCARCH work
active.

## CURRENT

Verified above under Documentation: PR #55/SEC-007 merged at the correct
baseline, Wave 1 active, NET-001 active, `HIGH` risk, correct branch/task/
review paths, network boundary established, reconnect as the active bounded
scope, accepted count 35, no gameplay/decision change, DOCARCH-004 paused,
PR #51 historical draft, PR #52 closed, and exactly one `## Next safe action`.
No claim of NET-001 completion, PR #56 merge, deployment activation, Wave 1
completion, or active DOCARCH work is present.

## Accepted count

`docs/decisions/` holds 35 records excluding `README.md`,
`DECISION_TEMPLATE.md`, and `DECISION_INDEX.md` (confirmed by direct file
count), split 18 `BS-MECH`/`GAME-001` mechanics-family records as previously
recorded, 7 `BS-ARCH`, 4 `BS-PROC`, and 1 `CI` (unchanged split, no decision
file touched, `DECISION_INDEX.md` byte-identical to base). NET-001 elevates
no session/reconnect semantic to accepted authority; the task and review
documents both explicitly scope reconnect as bounded alpha transport/session
lifecycle, not durable identity.

## Claude implementation-head history

`gh pr view 56 --json comments` shows two `github-actions` comments on
`e7f2f629b53d2e1901b3837a4c424557ac5acd3a`
(`2026-08-11T10:05:01Z` and `2026-08-11T10:09:29Z`), both reading "Automated
QA review output could not be validated" / "Not approved — automation
failure". `gh api .../actions/runs/31480313432` confirms `run_attempt: 2`,
and `.../attempts/1` and `.../attempts/2` both report `conclusion: failure`
on the same run — i.e., one manual same-head rerun of the same workflow run,
both attempts failing during structured-output/schema validation rather than
producing a substantive verdict, matching the task's stated history exactly.
No concrete implementation `CHANGES REQUIRED` finding was produced by either
attempt. The manual-rerun allowance for this task is confirmed spent; this
review does not rerun Claude QA.

## Blocking findings

None.

## Non-blocking notes

1. **The pinned `colyseus.js` SDK itself forwards the reconnection token as a
   WebSocket endpoint query parameter** (`Client.js` `consumeSeatReservation`
   → `buildEndpoint`), identically to how it forwards `sessionId` for every
   join. This is inherent SDK transport behavior, not something introduced by
   BurningSpace application code — the task and implementation correctly
   avoid adding any *further* token exposure (no logging, no storage, no
   manual URL placement) — but it means the token is visible in the raw
   WebSocket upgrade URL to anything positioned to observe it (proxies,
   access logs). Worth revisiting when TLS-termination/proxy topology is
   selected in the Wave 5 deployment decision gate.
2. **A one-in-nineteen `ERR_IPC_CHANNEL_CLOSED` Vitest/Tinypool worker-IPC
   teardown race** was observed and is reproduced identically (1-in-8) in the
   unmodified, pre-existing SEC-007 production test files run in isolation
   from this diff — see Determinism. It is pre-existing sandbox/Windows
   infrastructure noise, not a defect in the reconnect suite's logic, but a
   future CI-reliability task should investigate the same class of PM2/Vitest
   IPC interference that `0a43352` (SEC-007) partially addressed for `axm:`
   telemetry specifically; this signature is a different, more general
   Tinypool worker-channel race not covered by that filter.
3. **`NetworkClient.connect()` piggybacks on an in-flight automatic-reconnect
   promise rather than starting a fresh connection operation** when
   `this.connectingPromise` is already set (`connect()`,
   `NetworkClient.ts:246-248`). This is a reasonable design choice — it
   prevents a second concurrent connection attempt — but it means an explicit
   `connect()` call made while an automatic reconnect is in progress simply
   awaits that reconnect rather than superseding it. No test exercises this
   exact interleaving; it does not weaken any invariant verified above (the
   epoch/cancellation mechanism still guarantees at most one active
   operation), but a short comment at the guard clause would make the choice
   explicit for future readers.
4. **The new `productionReconnectLifecycle.test.ts` is outside
   `apps/server/tsconfig.json`'s `include: ["src"]`**, so `npm run typecheck`
   does not statically check it — the same pre-existing repository-wide gap
   already recorded in the TEST-003 and SEC-007 reviews, now inherited by a
   third security-critical test file.
5. **The "bounds final client failure to five attempts" test takes ~7.2
   seconds** because it waits through the real 250/500/1000/2000/3000 ms
   retry delays rather than an accelerated clock. This is correct behavior
   (it proves the actual production delays), not a defect, but it is the
   dominant contributor to the suite's ~13–15 second total runtime; noting it
   only because a future fake-timer-based variant could shorten CI time if
   that ever becomes a constraint.

## Integrated Runtime/Security Reviewer

- Verdict: `APPROVED WITH NON-BLOCKING NOTES`
- Reviewed commit: `e7f2f629b53d2e1901b3837a4c424557ac5acd3a`
- Evidence source: Independent integrated Runtime/Security review of PR #56 —
  repository, branch, HEAD, merge-base, and exact seven-path scope
  verification; pinned `colyseus@0.16.5`/`@colyseus/core@0.16.24`/
  `@colyseus/ws-transport@0.16.5`/`colyseus.js@0.16.22` source inspection for
  `allowReconnection`, `onAuth`/`onJoin` skip-on-reconnect, `onLeave` consented
  semantics, auto-dispose-while-reserved behavior, and shared connect/reconnect
  header forwarding; line-level inspection of `BattleRoom.ts`,
  `networkBoundary.ts`, and `NetworkClient.ts` against those pinned contracts;
  full read of the 14-test `productionReconnectLifecycle.test.ts` for causal
  validity, isolation, and scope; 19 total runs of the reconnect suite plus 8
  runs of the unmodified SEC-007 production test files to isolate and
  attribute a Vitest/Tinypool IPC teardown race; the full local regression
  suite, typecheck, build, protocol-profile check, and all three diagnostics;
  focused reruns of `productionBattleRoomAuthority.test.ts` and
  `productionNetworkBoundary.test.ts`; Claude QA run/attempt history via `gh
  api`; and documentation, CURRENT, and accepted-count verification — all
  recorded above.
- Date: 2026-08-11

Server-side reconnect ownership is preserved through the pinned SDK's own
session-ID reuse and skip-onJoin/onAuth reconnect path, not through any
custom session-binding logic that could be defeated. Unexpected disconnect
immediately neutralizes movement and shooting while preserving aim, ship
identity, profile, limiter state, and ordinary authoritative simulation;
consented leave and grace expiry both route through a single, `Set`-guarded,
exactly-once `finalizeSession`. The client's epoch/cancellation mechanism is
race-safe against manual disconnect, disposal, and a stale in-flight reconnect
completing after cancellation, verified both by source inspection and by a
dedicated monkey-patched-failure test. The reconnection token remains a
private, unlogged, in-memory bearer credential with no session-ID fallback.
Origin enforcement on the real reconnect path was proven end-to-end — hostile
Origin rejected with zero side effects, the same still-valid token then
succeeding from an allowed Origin — closing the exact gap SEC-007's review
flagged for this task. Rate-limit buckets persist unchanged across a
successful reconnect and are deleted only on consented leave or grace expiry,
proven with a frozen injected clock rather than internal state inspection. No
duplicate participant or ship was observed in any test, and no stale room
callback was shown able to mutate current client state. All required local
validation passes, and the one observed test-run anomaly was traced
conclusively to pre-existing sandbox infrastructure rather than the reviewed
diff. The notes above are deferred follow-ups; none weakens ownership,
token, Origin, or rate-limit boundaries.

## Product Architect

- Verdict:
- Reviewed commit:
- Evidence source:
- Date:

## Claude QA

- Verdict:
- Reviewed commit:
- Evidence source:
- Check conclusion:
- Date:

## Human merge gate

Human merge requires an approving independent integrated Runtime/Security
verdict, substantive Claude QA, Product Architect approval, one later evidence
commit, and passing final-head Core Pull Request Checks. No agent may merge.
