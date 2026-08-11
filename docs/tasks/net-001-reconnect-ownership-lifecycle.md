# NET-001 — Reconnect Ownership and Disconnect Lifecycle

Owner: `Product Architect`

Wave: `Wave 1 — Authority and Security Hardening`

Risk: `HIGH — session ownership / multiplayer lifecycle`

Merge authority: `Human only`

## Baseline and authority

- SEC-007 / PR #55 is human-merged at
  `c9e38b4106bdd0537b74e4b478a71c413f1854d2`.
- The accepted decision count remains 35: 18 `BS-MECH`, 5 `GAME-001`,
  7 `BS-ARCH`, 4 `BS-PROC`, and 1 `CI`.
- NET-001 creates no accepted decision and changes no accepted gameplay
  mechanic. `BS-ARCH-001` server authority and `BS-PROC-001` human-only merge
  remain unchanged.

## Exact scope

NET-001 adds the minimum transient reconnect lifecycle for the current public
arena foundation:

- server-side reconnection grace and final cleanup in `BattleRoom`;
- reconnect-grace parsing in the existing network-boundary configuration;
- bounded automatic reconnect and listener rebinding in `NetworkClient`;
- production-room integration coverage for ownership, security, limiter, and
  room lifecycle behavior;
- this task, its pending review artifact, and the current handoff.

The exact changed paths are:

- `apps/server/src/rooms/BattleRoom.ts`;
- `apps/server/src/security/networkBoundary.ts`;
- `apps/client/src/network/NetworkClient.ts`;
- `apps/server/test/productionReconnectLifecycle.test.ts`;
- `docs/tasks/net-001-reconnect-ownership-lifecycle.md`;
- `docs/reviews/net-001-reconnect-ownership-lifecycle-review.md`;
- `docs/handoffs/CURRENT.md`.

The existing production-server test helper already accepts the complete
network-boundary configuration, so deterministic grace and clock overrides use
that established interface without a test-support change.

No server wire message, schema property, shared/protocol contract, dependency,
manifest, lockfile, workflow, accepted decision, or package boundary changes.

## Server reconnect lifecycle

The default grace is 10 seconds. `BURNINGSPACE_RECONNECT_GRACE_SECONDS` may
override it with an integer from 1 through 60 inclusive; an invalid production,
development, or test value fails configuration validation.

A consented leave performs final participant, ship, input, weapon, limiter, and
notice cleanup immediately. An unexpected leave immediately replaces active
movement and shooting input with neutral input while preserving aim, velocity,
participant, ship, profile, faction, mode, health, position, weapon cooldown,
and rate-limit state. The authoritative simulation continues during grace.

A successful reconnect uses Colyseus's opaque reconnect token, retains the
original session ID and current authoritative room state, and does not run join
or spawn semantics again. Grace expiry performs the same idempotent final
cleanup as a consented leave. Ordinary gameplay changes that happen during the
grace window remain authoritative.

## Client reconnect lifecycle

`NetworkClient` retains the current room's reconnection token in private memory
only. After an unexpected leave it performs at most five reconnect attempts,
after 250, 500, 1000, 2000, and 3000 milliseconds. Only one retry operation and
one cancellable retry timer may exist. Explicit disconnect, disposal, or a new
connection operation invalidates stale work.

Successful reconnect atomically binds the new room reference and all existing
message, state, error, and leave handlers. Generation checks prevent callbacks
from stale rooms from mutating current client state. Existing callback
registrations and accepted profile state remain usable without resending client
world state. Final failure clears the token and transitions to the existing
error behavior. Explicit disconnect remains idempotent and never starts a
retry loop.

## Token and security policy

The reconnection token is bearer authority for one transient Colyseus room
session; it is not account identity. It is not logged, exposed through public
snapshots, persisted in browser storage, or manually placed into a URL or query
parameter by BurningSpace code. There is no room-ID/session-ID fallback and no
session-ID-only reconnect path.

Random, wrong, expired, and consented-leave tokens cannot obtain ownership.
The pinned SDK's token validation retains the original session binding.
SEC-007's WebSocket `Origin` verifier remains active on the reconnect upgrade;
NET-001 does not rely on `BattleRoom.onAuth`, which the pinned reconnect
matchmaking path does not execute.

## Rate-limit preservation

Profile and input buckets remain keyed to the original session during an
unexpected disconnect and successful reconnect. They are deleted only during
consented final cleanup or grace expiry, so reconnect is not a fresh-budget
mechanism.

## Tests and validation

Production integration coverage uses the real room registry, `BattleRoom`,
WebSocket transport, SEC-007 network boundary, `colyseus.js` reconnect API, and
the real `NetworkClient`. It covers ownership preservation, neutral input,
automatic reconnect, listener/callback continuity, consented leave, expiry,
invalid-token isolation, hostile-Origin rejection followed by allowed-Origin
success, limiter continuity, remaining-room usability, exact-once removal, and
shutdown while reconnect is pending.

Required validation:

- `npm test`;
- `npm run typecheck`;
- `npm run build`;
- `npm run check:protocol-profile`;
- all three existing client/movement/combat diagnostics;
- three consecutive reconnect-suite runs;
- focused production authority and network-boundary regressions;
- zero skipped tests and no open-handle hang.

## Explicit non-goals

No accounts, authentication, durable identity, persistence, database, campaign
state, sectors, outposts, deployment, reverse-proxy trust, movement, combat,
projectile, damage, death, respawn, faction, spectator, ship-switching, spawn,
balance, UI, asset, or protocol work.

## Reviewer routing and merge gate

Required is one independent integrated Runtime/Security Reviewer covering the
Architecture, Network, Security, and QA triggers: the change affects a Colyseus
room lifecycle, connection ownership, bearer-token handling, environment
validation, rate-limit continuity, client listener rebinding, and executable
regression evidence. Mandatory substantive Claude QA and Product Architect
approval follow on the reviewed implementation head.

Gameplay review is skipped because no gameplay rule or balance value changes;
the integration suite instead protects existing movement, combat, and authority
semantics. Visual review is skipped because no UI, scene, asset, VFX, loader, or
presentation behavior changes.

One evidence commit may be created only after external verdicts are available.
Final-head Core Pull Request Checks must pass. No agent may merge.

## Next runtime boundary after merge

Public Arena deployment/readiness foundation. Deployment is not activated by
NET-001.
