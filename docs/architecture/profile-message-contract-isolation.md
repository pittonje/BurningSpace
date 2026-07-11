# Profile Message Contract Isolation

## Purpose

PR-005 gives the profile handshake a narrow runtime and type surface while shared remains canonical.

## Before PR-005

```text
shared ClientMessages / ServerMessages
    └──> protocol broad-object facade
```

Profile wire names lived beside unrelated input, room, and combat names.

## After PR-005

```text
shared profile contract
    ├──> shared broad message registries
    └──> protocol profile facade
```

## Canonical message values

`packages/shared/src/profile-contract.ts` defines `setProfile`, `profileAccepted`, and `profileRejected` exactly once in production source.

## Type ownership

The same module owns `JoinMode`, `JoinRequest`, `RoomParticipant`, `ProfileAcceptedMessage`, and `ProfileRejectedMessage`. `Faction` remains a dependency-neutral shared primitive. Compatibility type re-exports preserve earlier shared paths.

## Broad registry compatibility

The old broad properties remain public and reference the narrow values. Broad shared and protocol imports therefore keep the existing wire contract.

## Shared package-root API

Shared exports `ProfileClientMessages`, `ProfileServerMessages`, and the five selected types without requiring deep imports.

## Protocol package-root API

Protocol directly re-exports the shared narrow objects and types. Existing `ClientMessages` and `ServerMessages` exports remain transitional.

## Dependency direction

`packages/protocol -> packages/shared`. There is no reverse runtime dependency or circular runtime import. The shared `Faction`/`JoinMode` relationship is type-only and erased from emitted JavaScript.

## Wire-format impact

No serialized value, payload field, optionality, validation, callback, schema, room behavior, or message ordering changed.

## Consumer impact

None. `NetworkClient`, `NetworkTestScene`, and `BattleRoom` remain unchanged and continue using broad protocol objects for profile properties.

## Rollback plan

Restore the previous shared file placement and registry literals. No application, wire, or state rollback is needed.

## Future narrow consumer cutover

PR-006 should replace only the broad profile aliases with the narrow objects in all three consumers, retaining broad exports for rollback.
