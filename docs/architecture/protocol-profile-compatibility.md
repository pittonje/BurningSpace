# Protocol Profile Compatibility Exports

## Purpose

PR-003 establishes the first transitional `@burningspace/protocol` facade without moving the active contract or changing any consumer. It proves a new public package-root path can reference the exact existing profile definitions.

## Selected symbols

PR-005 adds narrow runtime exports `ProfileClientMessages` and `ProfileServerMessages`. They are the intended profile-specific API and contain only the three selected profile properties. The broad runtime exports remain transitional because current applications still import them through protocol aliases.

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

`packages/shared` remains the single canonical active owner. PR-005 isolates the definitions in `packages/shared/src/profile-contract.ts`; values and payload shapes remain unchanged.

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

The reverse dependency is forbidden. Both applications now declare protocol and shared directly; protocol alone depends on shared.

## Runtime identity strategy

Narrow and broad objects are direct ES module re-exports. They are not recreated, wrapped, or copied. The focused check asserts strict object identity, narrow-to-broad equality, and exact profile property strings.

## Type compatibility strategy

Selected types are type-only re-exports. Compile-time assertions verify assignability from shared to protocol and protocol to shared, preserving required fields, optional fields, names, and unions.

## Current consumers

PR-004 completed the coordinated package cutover: `NetworkClient`, `NetworkTestScene`, and `BattleRoom` import the selected profile group from `@burningspace/protocol`. They still use broad protocol message objects under profile-specific aliases. A later PR will switch those aliases to the narrow runtime objects. Mixed non-profile message properties remain on shared imports.

## Wire-format impact

- No message name change
- No serialized string change
- No payload field change
- No required/optional field change
- No Colyseus schema or room behavior change

## Non-goals

- No narrow runtime-object consumer cutover in PR-005
- No shared export removal or ownership transfer
- No other protocol-group migration
- No gameplay or validation change

## Future cutover plan

A separate PR will update the client and server from broad protocol aliases to `ProfileClientMessages` and `ProfileServerMessages` together. It must retain broad shared and protocol exports for rollback.

## Rollback plan

Rollback restores the previous shared definition placement and broad registry literals while leaving application imports unchanged. No wire, data, or runtime behavior migration is involved.
