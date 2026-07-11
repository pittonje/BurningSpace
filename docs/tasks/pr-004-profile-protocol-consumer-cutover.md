# PR-004 — Coordinated Profile Protocol Consumer Cutover

## Goal

Switch the complete profile-related client/server consumer set to the public `@burningspace/protocol` facade in one coordinated change while preserving the active shared-owned contract.

## Starting state

PR-003 made profile symbols available from protocol as direct shared re-exports. All runtime consumers still imported them from shared.

## Selected consumers

- `apps/client/src/network/NetworkClient.ts`
- `apps/client/src/scenes/NetworkTestScene.ts`
- `apps/server/src/rooms/BattleRoom.ts`

## Selected symbols

- Runtime objects: `ClientMessages`, `ServerMessages`
- Profile properties: `SET_PROFILE`, `PROFILE_ACCEPTED`, `PROFILE_REJECTED`
- Types: `JoinMode`, `JoinRequest`, `RoomParticipant`, `ProfileAcceptedMessage`, `ProfileRejectedMessage`

## Scope

- Cut over the selected profile imports in client and server together.
- Add explicit protocol dependencies to both applications.
- Add the client's previously undeclared shared dependency because non-profile imports remain.
- Preserve every old shared export.

## Non-goals

- No canonical definition transfer, shared cleanup, other message migration, wire/schema/validation/callback/gameplay change, or dependency upgrade.

## Import strategy

Selected types use type-only protocol imports. `NetworkTestScene` retains only `Faction` from shared.

## Mixed message-object handling

`NetworkClient` and `BattleRoom` use message objects for profile and non-profile properties. They retain shared `ClientMessages`/`ServerMessages` for non-profile traffic and import protocol aliases `ProfileClientMessages`/`ProfileServerMessages` for only the three profile properties.

## Manifest changes

- Client declares protocol and shared.
- Server declares protocol and retains shared.
- Lockfile records only those workspace edges.

## Wire-compatibility requirements

Strings, payload fields, optionality, validation, callback order, room behavior, and schemas remain identical.

## Validation

- `npm run build`
- `npm run typecheck`
- `npm run check:protocol-profile`
- `npx tsx apps/client/scripts/network-client-callback-check.ts`

## Acceptance criteria

- All three consumers use protocol for the selected profile group.
- Non-profile shared imports remain intact.
- Shared/protocol source definitions remain unchanged.
- All validation commands pass.

## Rollback strategy

Restore the selected imports/usages to shared and remove application protocol dependencies. No data, schema, or wire migration is involved.

## Reviewer focus

Atomic client/server cutover, narrow aliases, manifest accuracy, exact wire behavior, empty shared/protocol source diff, and rollback viability.

## Follow-up task

Transfer canonical profile definitions into protocol while re-exporting them through shared for backward compatibility; do not remove shared exports yet.
