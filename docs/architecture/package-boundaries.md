# Package Boundaries

This document summarizes the accepted package roles in `BS-ARCH-001` through
`BS-ARCH-007` and distinguishes them from current implementation maturity.

## `apps/client`

The client is a Phaser 3/Vite browser application using the Colyseus client. It
renders and presents authoritative state, collects input, and consumes public
and shared contracts. Local `GameScene` prototype behavior is preserved as
non-authoritative reference material and must not become multiplayer gameplay
authority.

## `apps/server`

The Node.js/TypeScript/Colyseus server owns authoritative gameplay simulation
and state transitions. The current implementation provides a multiplayer
movement and combat foundation; it must not be described as though the future
persistent campaign, economy, sectors, or outposts are already complete.

## `packages/shared`

Shared is the current canonical owner of broad runtime contracts and profile
contracts during the transitional package state. It contains active messages,
snapshots, constants, movement types, and profile definitions used by client and
server. It must not depend on `packages/protocol`.

This ownership is current rather than permanent; a future approved migration
may narrow shared to environment-neutral primitives.

## `packages/protocol`

Protocol is an active transitional public compatibility boundary. Its public
entrypoint exposes or re-exports profile contracts, message surfaces,
`PROTOCOL_VERSION`, and snapshot contracts demonstrated by the repository. Both
applications consume its profile boundary, and the package depends on shared.

Protocol is not merely a collection of non-runtime placeholders, but it is also
not yet the fully separated canonical owner of broad runtime contracts. The
accepted dependency direction is `protocol -> shared`; `shared -> protocol` is
forbidden unless the governing decision is superseded.

## `packages/balance`

Balance is the future gameplay-balance boundary and contains a versioned
historical MVP constant set. No active application consumer was found during
the D3 audit. Stale or conflicting constants must not be presented as current
canonical gameplay truth; accepted mechanics decisions govern instead.

## `packages/config`

Config is a future environment-neutral map/topology and structural
configuration boundary. It is currently immature and has no active application
consumer demonstrated by the D3 audit.

## Incremental migration

Package ownership changes require separately approved, coordinated work. A
migration must preserve wire compatibility, update client and server together,
declare direct dependencies, and verify runtime behavior. The current
documentation reconciliation changes no package, dependency, export, or
consumer.
