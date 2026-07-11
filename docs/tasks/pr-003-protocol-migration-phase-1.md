# PR-003 — Protocol Compatibility Exports: Profile Messages

## Goal

Establish the smallest safe, testable protocol slice for profile negotiation without changing any active application import or wire behavior.

The coherent slice is:

- `ClientMessages.SET_PROFILE`
- `ServerMessages.PROFILE_ACCEPTED`
- `ServerMessages.PROFILE_REJECTED`
- `JoinMode`
- `JoinRequest`
- `RoomParticipant`
- `ProfileAcceptedMessage`
- `ProfileRejectedMessage`

## Why this slice

Profile negotiation has a clear request/accepted/rejected lifecycle, is smaller than movement/combat, does not involve Colyseus schema snapshots, and can be proven compatible before consumer cutover. Runtime message maps currently group unrelated names, so Phase 1 must avoid creating divergent duplicate objects.

## Scope

- Add only the `packages/protocol -> packages/shared` dependency required by the compatibility facade.
- Add canonical or compatibility protocol exports for the profile category.
- Add exact runtime string assertions and compile-time shape compatibility checks against the current shared contract.
- Decide and document an acyclic ownership/forwarding direction.
- Keep `NetworkClient` and `BattleRoom` imports on `@burningspace/shared` in this preparation PR unless reviewers approve an equally reversible coordinated cutover.

The previously proposed `apps/client/package.json` dependency correction is superseded for this PR. It is deferred to the coordinated consumer-cutover PR, where application dependencies and imports can change together. PR-003 is compatibility-facade only.

## Non-goals

- No wire string, field, optionality, validation, room, schema, gameplay, movement, combat, snapshot, or balance change.
- No removal from `packages/shared`.
- No migration of player input, room info, hit/death events, or snapshots.
- No client-only or server-only cutover.

## Compatibility requirements

- Literal strings remain `setProfile`, `profileAccepted`, and `profileRejected`.
- Payload fields remain identical and bidirectionally assignable.
- `Faction` remains a dependency-neutral shared primitive unless architecture review decides otherwise.
- `packages/shared` must not depend on `packages/protocol` if protocol imports `Faction` from shared.
- Product Architect confirmed `RoomParticipant` remains a shared-owned active definition exposed through the facade, and reaffirmed `Faction` as a dependency-neutral shared primitive for this PR.

## Expected files

- `packages/protocol/src/**`
- Focused protocol compatibility checks
- Package manifests/lockfile only if a new direct dependency is required
- Relevant architecture/task/context documentation

## Required verification

- `npm run build`
- `npm run typecheck`
- Exact runtime message-name assertions
- Compile-time old/new payload assignability
- A clean workspace package rebuild before compatibility assertions
- Existing network callback diagnostic
- Empty gameplay-behavior diff

## Rollback

Revert the new protocol exports and tests. Because active consumers remain on shared during compatibility preparation, rollback changes no runtime route or wire contract.

## Reviewers

- Architecture Reviewer: ownership direction and cycle prevention
- Network Reviewer: wire/shape parity and cutover safety
- QA Reviewer: checks, scope, and rollback evidence

## Acceptance criteria

- One canonical, non-divergent profile contract is demonstrably compatible with current shared exports.
- No runtime application consumer changes unless client and server are moved together with explicit approval.
- No field or message string changes.
- Shared cleanup is deferred until a later zero-consumer phase.

## Implemented compatibility facade

Selected exports from the package root:

- Runtime: `ClientMessages`, `ServerMessages`
- Type-only: `JoinMode`, `JoinRequest`, `RoomParticipant`, `ProfileAcceptedMessage`, `ProfileRejectedMessage`

The complete runtime message objects are re-exported to preserve strict identity. The profile surface currently uses only `ClientMessages.SET_PROFILE`, `ServerMessages.PROFILE_ACCEPTED`, and `ServerMessages.PROFILE_REJECTED`; temporary exposure of the other object properties is an accepted transitional trade-off.

Implementation files:

- `packages/protocol/src/profile.ts`
- `packages/protocol/src/profile-compatibility-check.ts`
- `packages/protocol/src/index.ts`
- protocol/root manifests and narrow lockfile metadata

Verification:

- strict runtime identity for both message objects
- exact profile wire strings
- bidirectional assignability for all five selected types
- package-root import through `@burningspace/protocol`
- `npm run check:protocol-profile`
- workspace build and typecheck

No client/server import, wire payload, Colyseus schema, room behavior, or gameplay change is complete in this PR.
