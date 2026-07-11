# PR-005 — Isolate Profile Message Contract

## Goal

Isolate profile message names and types in a dedicated shared module without changing consumers or runtime behavior.

## Starting state

Applications consume profile types and broad message objects through `@burningspace/protocol`, which directly re-exports shared definitions.

## Problem with broad message registries

Profile wire names were defined inside registries that also contain input, room, and combat messages. A narrow contract could not be imported without exposing unrelated names.

## Selected runtime values

- `ProfileClientMessages.SET_PROFILE`: `setProfile`
- `ProfileServerMessages.PROFILE_ACCEPTED`: `profileAccepted`
- `ProfileServerMessages.PROFILE_REJECTED`: `profileRejected`

## Selected types

- `JoinMode`
- `JoinRequest`
- `RoomParticipant`
- `ProfileAcceptedMessage`
- `ProfileRejectedMessage`

## Scope

Create `packages/shared/src/profile-contract.ts`, route broad profile properties through it, expose the narrow objects from both package roots, and extend focused compatibility verification.

## Non-goals

No application consumer cutover, protocol ownership transfer, broad export removal, other message migration, wire/schema/validation/callback/gameplay change, or dependency change.

## Canonical ownership

Shared remains canonical. Each profile wire string has one production definition in `profile-contract.ts`.

## Shared module structure

The dedicated module owns both narrow runtime objects and all five selected profile types. Existing shared modules retain type re-exports for compatibility.

## Broad registry compatibility

`ClientMessages.SET_PROFILE`, `ServerMessages.PROFILE_ACCEPTED`, and `ServerMessages.PROFILE_REJECTED` reference the narrow values. All unrelated registry entries remain unchanged.

## Protocol facade

Protocol directly re-exports the narrow and broad shared objects plus the selected types. It copies no definitions.

## Validation

- `npm run build`
- `npm run typecheck`
- `npm run check:protocol-profile`
- `npx tsx apps/client/scripts/network-client-callback-check.ts`
- canonical production-literal scan (exact-value assertions may repeat literals in verification code, but not in production definitions)
- empty application and manifest diffs

## Acceptance criteria

Narrow package-root imports work, broad imports remain compatible, runtime identities and types match, and all checks pass without application changes.

## Rollback plan

Move the selected definitions back to their previous shared modules and restore literal registry entries. No wire, data, or consumer migration is involved.

## Reviewer focus

Canonical literal uniqueness, strict identity, public API compatibility, acyclic dependency direction, empty application diff, and documentation accuracy.

## Follow-up task

PR-006 switches the three existing consumers from broad protocol aliases to `ProfileClientMessages` and `ProfileServerMessages` while retaining broad exports.
