# UX-001 — Public Arena Connection, Error, and Reconnect UX

Owner: `Product Architect`

Track: `Public Arena Alpha launch track`

Merge authority: `Human only`

## Status

`READY FOR IMPLEMENTATION`

This implementation authority becomes effective only when the UX-001
authority bootstrap containing this document is present on `main`.

## Risk

`NORMAL — client connection-lifecycle presentation with network-sensitive behavior`

## Product goal

Make the Public Arena connection lifecycle understandable and recoverable for
the player without changing multiplayer authority or reconnect mechanics. The
player must be able to understand:

- that an initial arena connection is in progress;
- that the arena connection succeeded and gameplay is ready;
- that connectivity was lost;
- that the existing automatic session reconnect is being attempted;
- that reconnect succeeded;
- that reconnect failed or is no longer possible; and
- which safe recovery action is available after terminal connection failure.

Presentation must not claim that gameplay state is safe, durable, or resumed
until the existing client/network lifecycle has actually established that
result.

## Repository baseline

- `apps/client/src/network/NetworkClient.ts` currently exposes
  `disconnected`, `connecting`, `connected`, and `error` through
  `ConnectionState`. Initial connection uses `joinOrCreate('battle')` and
  reports `connecting` before reporting `connected` or `error`.
- Unexpected room leave with a retained token starts the NET-001 bounded
  automatic reconnect operation. The current public state reuses `connecting`
  during reconnect and `connected` after reconnect, so player-facing code
  cannot currently distinguish initial connect from reconnect or ordinary
  connect success from reconnect success.
- NET-001 owns the reconnect mechanics: an in-memory opaque reconnect token,
  at most five attempts after 250, 500, 1000, 2000, and 3000 milliseconds,
  generation-based stale-work rejection, listener rebinding, session
  continuity on success, and final cleanup/error behavior on exhaustion.
- `NetworkTestScene` is the current connection/profile lobby. It renders the
  raw four-value status and current error strings, disables connection actions
  while `connecting`, and enters `MultiplayerGameScene` only after a profile is
  accepted on a connected room.
- `MultiplayerGameScene` renders the current connection status in its HUD. It
  stays active during the current automatic reconnect because that operation
  reports `connecting`, and returns to `NetworkTestScene` after terminal
  `error` or `disconnected`.
- Current low-level connection and room errors may flow directly into
  player-facing scene text. Initial `connect()` resolves after recording a
  failed join, so the current Connect click continuation may call
  `setProfile()` after failure and replace the useful failure with
  `Connect before applying a profile.`
- OPS-001 provides the single-process, in-memory Public Arena runtime and
  production client endpoint validation. External deployment has not been
  performed. A server restart can reset active rooms and world state.

NET-001 remains the authority for reconnect ownership and mechanics. This task
defines presentation and client-lifecycle behavior around that implementation;
it does not restate or replace it.

## Hard invariants

1. Server authority remains unchanged.
2. NET-001 reconnect ownership, token validity, grace period, cleanup, and
   lifecycle semantics remain authoritative and unchanged.
3. UX-001 MUST NOT create a parallel reconnect protocol.
4. No new wire message, schema field, shared contract, matchmaking API, or
   server event is authorized.
5. No server source modification is authorized under normal UX-001 scope.
6. Origin, CORS, and WebSocket enforcement from SEC-007 is unchanged.
7. A reconnect UI state must never be treated as proof that the server has
   accepted reconnection.
8. `Connected`, `ready`, or equivalent gameplay-ready presentation may be
   reached only from a real successful client/network lifecycle event.
9. Terminal reconnect failure must not silently loop forever.
10. UI actions and repeated callbacks must not cause duplicate simultaneous
    connection or reconnect attempts.
11. Stale asynchronous callbacks from an obsolete connection attempt must not
    overwrite the state of a newer successful attempt.
12. Player-facing connection errors must be bounded and player-readable.
13. Player-facing UI must not expose raw stack traces, internal exception
    objects, access tokens, reconnection tokens, Origin allowlists, internal
    host details, or credentials.
14. No persistence or account guarantee is implied. Under the current
    architecture a server restart may reset active rooms and world state.
15. External Public Arena deployment is not part of UX-001.

## Required UX lifecycle

The implementation must model and render these behavioral states, using names
that fit existing client conventions:

| Semantic state | Required truth and behavior |
|---|---|
| Idle / not connected | No connection or reconnect attempt is active. |
| Connecting | An initial `joinOrCreate` attempt is active; connection actions that could duplicate it are guarded. |
| Connected / ready | A real initial room join succeeded. Gameplay-ready controls additionally remain subject to the existing accepted-profile requirement. |
| Connection lost | An unexpected leave was observed; the prior transport is no longer presented as connected. This may be a brief transition into reconnecting. |
| Reconnecting | The existing NET-001 reconnect operation is active. This is not proof of continuity or success. |
| Reconnected | The existing reconnect call actually succeeded and the authoritative room/session was rebound. This may be transient before normal connected presentation. |
| Terminal connection failure | Initial connection or reconnect has terminally failed and no background attempt remains active. A safe recovery action is presented where available. |

The distinction between actual network lifecycle truth and rendered status must
remain explicit. A presentation-only transient state must not initiate or
validate network behavior.

No numerical reconnect countdown is required. The client has fixed retry
delays but no authoritative, non-divergent source for remaining server grace
time. UX-001 must not copy the server grace constant into presentation merely
to manufacture a countdown.

## Initial connection behavior

- Starting an arena join immediately presents Connecting and guards repeated
  connect/retry actions.
- A successful `joinOrCreate` produces Connected / ready from the actual room
  success event. Profile acceptance remains a separate existing prerequisite
  for entering gameplay.
- Server-unavailable, transport, rejected matchmaking/join, and unexpected
  client failures become bounded player-facing categories rather than raw
  exception forwarding.
- A failed join must remain the terminal connection result; follow-on profile
  application must not overwrite or obscure it.
- A terminal initial failure offers a safe retry path. Retry must begin only
  after prior attempt state is settled or invalidated and must not race another
  active operation.
- OPS-001 production URL validation remains a build/runtime-configuration
  concern and is not redefined here.

## Disconnect and reconnect behavior

- Unexpected connection loss becomes visible even if the transition into
  reconnecting is immediate.
- Reconnecting is distinguishable from initial Connecting and from terminal
  failure, while preserving NET-001's single bounded automatic operation.
- Reconnect success is emitted or derived only at the point where
  `client.reconnect(token)` succeeds and the authoritative existing room is
  rebound. It retains the session/profile/world continuity provided by
  NET-001; it does not resend or fabricate client world state.
- Reconnect failure must not fabricate continuity, create a second player or
  session, or fall back automatically to `joinOrCreate` as though it were the
  same session.
- User retry cannot race or supersede an active automatic reconnect. The UI
  must guard the action, and the underlying single-operation invariant remains
  in force.
- When reconnect becomes terminal, background retries stop and the player is
  given a bounded recovery capability using the existing connection/lobby
  scene structure. Starting a genuinely new arena session must be presented as
  a new connection, not a successful resume.
- Consented disconnect remains idempotent, returns to the idle/not-connected
  state, and never starts automatic reconnect.

## Error taxonomy

Player-facing presentation must use a small, stable taxonomy. Multiple
low-level failures may map to the same category:

- server unavailable or transport failure;
- matchmaking or arena-join failure;
- connection lost;
- reconnect in progress;
- reconnect expired, rejected, or exhausted;
- unexpected connection failure.

Wording must describe player impact and the safe next action without revealing
network internals. Diagnostic logging, if needed, remains separate from the
player-facing string and must also preserve token and credential secrecy.
Profile validation errors remain distinct from connection lifecycle errors.

## Visual and interaction principles

- Status presentation must make clear whether gameplay is actually active.
- Connecting, Reconnecting, and terminal failure must be visually distinct.
- Terminal failure must expose a clear recovery action when one exists.
- Buttons and equivalent actions must guard repeated activation.
- Brief transition states should remain legible without excessive flicker.
- The implementation must fit the established Phaser/client visual language
  and existing DOM-backed connection lobby rather than introduce another UI
  framework.

Typography, color, animation, exact wording, and layout are Visual/UX
implementation decisions unless existing design authority fixes them.

## Explicitly out of scope

- server reconnect semantic or grace-duration changes;
- reconnect token format or ownership changes;
- new protocol messages, schema fields, or shared contracts;
- persistence, accounts, authentication, or durable identity;
- campaign systems or gameplay mechanics;
- matchmaking redesign;
- Origin, CORS, or WebSocket policy changes;
- production deployment or reverse-proxy changes;
- major menu/navigation redesign unrelated to connection lifecycle;
- a generic notification/toast framework unless strictly needed and approved
  within the bounded implementation.

## Implementation scope boundary

The default authorized implementation area is `apps/client/**`. Existing
shared types may be imported, but `packages/shared` and `packages/protocol`
must not be modified merely for UI convenience. No server source, wire
contract, schema, dependency, lockfile, deployment, accepted-decision,
gameplay, or campaign change is authorized.

If a required user-visible distinction cannot be made truthfully without a new
server or wire signal, STOP. Document the missing information and request
Product Architect scope expansion instead of presenting a client heuristic as
authoritative truth.

This authority automatically expires for any proposed expansion involving
server source, shared/protocol changes, reconnect-token semantics, new wire
messages, grace-period behavior, matchmaking, Origin/CORS, persistence,
accounts, or authentication. Product Architect re-authorization is required
before such work continues.

## Testing requirements

Use focused deterministic state-transition/unit coverage where the current
client architecture permits. Prefer controlled promises, callbacks, and fake
time over visual sleeps. Evidence must cover:

1. successful initial connection;
2. terminal initial connection failure;
3. unexpected disconnect becoming visible;
4. reconnect entering an active state;
5. reconnect succeeding from the actual network lifecycle;
6. reconnect terminally failing after the bounded NET-001 operation;
7. duplicate retry being prevented;
8. a stale prior-attempt callback being unable to override newer state;
9. player-facing errors excluding raw sensitive/internal data;
10. existing `NetworkClient` callback behavior remaining compatible;
11. existing NET-001 reconnect regression coverage remaining green; and
12. full repository Core remaining green.

Visual/manual evidence may supplement but not replace deterministic
network-lifecycle coverage.

## Required diagnostics and regression

Preserve all relevant existing network-client callback diagnostics, reconnect
lifecycle tests, protocol compatibility checks, movement/combat diagnostics
run by Core, and Public Arena smoke coverage where applicable. UX-001 must not
weaken or bypass them.

## Acceptance criteria

- [ ] Initial connection, success, loss, reconnecting, reconnect success, and
      terminal failure are visible, distinct, and truthful.
- [ ] Gameplay-ready presentation is based on actual room success and retains
      the existing accepted-profile gate.
- [ ] Retry and reconnect races are prevented at both interaction and client
      lifecycle boundaries.
- [ ] Reconnect success is based on the actual NET-001 reconnect result and
      resumes the authoritative existing session.
- [ ] Terminal failure stops background work and provides a bounded recovery
      path without claiming session continuity.
- [ ] Stale callbacks cannot overwrite a newer lifecycle result.
- [ ] Player-facing errors are bounded, readable, and free of raw sensitive or
      internal data.
- [ ] No server, protocol, schema, reconnect-semantic, gameplay, security
      boundary, dependency, deployment, or accepted-decision change occurs.
- [ ] Focused deterministic lifecycle tests and the full Core suite pass.
- [ ] Existing NET-001 reconnect and NetworkClient diagnostics remain green.
- [ ] Independent Network/Runtime review approves the reviewed commit.
- [ ] Independent Visual/UX review approves the reviewed commit.
- [ ] Product Architect approves the reviewed commit.
- [ ] Merge is performed by a human only.

## Reviewer routing

Risk: `NORMAL`

Required:

- Core CI/tests;
- Independent Network/Runtime reviewer, because connection-state exposure,
  retry ownership, callback generations, and NET-001 compatibility are
  network-sensitive;
- Independent Visual/UX reviewer, because the work changes player-facing
  lifecycle status, errors, controls, and scene presentation;
- Product Architect approval; and
- Human merge.

Claude QA: `ADVISORY / NON-BLOCKING`, unless the Product Architect later
elevates risk or scope expands into a HIGH-RISK boundary.

Gameplay review is not required unless gameplay semantics change. Security
review is not required unless Origin enforcement, authentication/identity,
credentials, security-sensitive logging, or a server network trust boundary
changes. Architecture review is not required for the bounded client-only
implementation; it becomes required if scope expands beyond that boundary.

## Merge authority

The future UX-001 implementation PR is `HUMAN MERGE ONLY`. The one-time
autonomous merge authorization for the documentation bootstrap does not apply
to implementation.
