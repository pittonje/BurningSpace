# Protocol Profile Compatibility Exports

## Purpose

PR-003 establishes the first transitional `@burningspace/protocol` facade without moving the active contract or changing any consumer. It proves a new public package-root path can reference the exact existing profile definitions.

## Selected symbols

| Name | Runtime/type-only | Existing owner | Current consumers | New public import path |
|---|---|---|---|---|
| `ClientMessages` | Runtime object | `packages/shared/src/messages.ts` | `NetworkClient`, `BattleRoom` | `@burningspace/protocol` |
| `ServerMessages` | Runtime object | `packages/shared/src/messages.ts` | `NetworkClient`, `BattleRoom` | `@burningspace/protocol` |
| `JoinMode` | Type-only | `packages/shared/src/factions.ts` | `NetworkClient`, `NetworkTestScene`, `BattleRoom` | `@burningspace/protocol` |
| `JoinRequest` | Type-only | `packages/shared/src/messages.ts` | `NetworkClient`, `NetworkTestScene`, `BattleRoom` | `@burningspace/protocol` |
| `RoomParticipant` | Type-only | `packages/shared/src/messages.ts` | `NetworkClient`, `NetworkTestScene` | `@burningspace/protocol` |
| `ProfileAcceptedMessage` | Type-only | `packages/shared/src/messages.ts` | `NetworkClient`, `BattleRoom` | `@burningspace/protocol` |
| `ProfileRejectedMessage` | Type-only | `packages/shared/src/messages.ts` | `NetworkClient`, `BattleRoom` | `@burningspace/protocol` |

The profile subset uses `ClientMessages.SET_PROFILE`, `ServerMessages.PROFILE_ACCEPTED`, and `ServerMessages.PROFILE_REJECTED`. Because these are properties rather than standalone exports, both complete message objects are temporarily exposed through the facade. No new standalone constants are created.

## Existing active owner

`packages/shared` remains the single canonical active owner in PR-003. Definitions, runtime objects, values, and payload shapes remain unchanged there.

## New compatibility export path

```ts
import {
  ClientMessages,
  ServerMessages,
  type JoinRequest,
  type ProfileAcceptedMessage
} from '@burningspace/protocol';
```

No deep source or `dist` import is required.

## Dependency direction

```text
packages/protocol ──> packages/shared
```

The reverse dependency is forbidden. Applications do not depend on protocol yet.

## Runtime identity strategy

`ClientMessages` and `ServerMessages` are direct ES module re-exports. They are not recreated, wrapped, or copied. The focused check asserts strict object identity and exact profile property strings.

## Type compatibility strategy

Selected types are type-only re-exports. Compile-time assertions verify assignability from shared to protocol and protocol to shared, preserving required fields, optional fields, names, and unions.

## Current consumers

PR-004 completed the coordinated consumer cutover: `NetworkClient`, `NetworkTestScene`, and `BattleRoom` import the selected profile group from `@burningspace/protocol`. Mixed non-profile message properties remain on shared imports. Shared remains the canonical definition owner.

## Wire-format impact

- No message name change
- No serialized string change
- No payload field change
- No required/optional field change
- No Colyseus schema or room behavior change

## Non-goals

- No consumer cutover
- No shared export removal or ownership transfer
- No other protocol-group migration
- No gameplay or validation change

## Future cutover plan

A separate PR will add explicit application dependencies and update the client and server profile imports together. It must retain the shared exports as rollback compatibility until all consumers and diagnostics have moved.

## Rollback plan

While no application consumes the facade, rollback is limited to removing the profile re-export module, its dependency, and its focused check. Runtime behavior is unaffected.
