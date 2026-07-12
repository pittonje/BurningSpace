# PR-007 — Narrow Profile Protocol Imports

## Goal

Replace the remaining broad profile-message aliases in application consumers with the narrow public profile exports from `@burningspace/protocol`.

## Starting state

`NetworkClient` and `BattleRoom` renamed the broad `ClientMessages` and `ServerMessages` objects as profile-specific aliases. `NetworkTestScene` already used narrow type-only imports.

## Architecture boundary

`packages/shared` remains the canonical owner of the active profile contract. `packages/protocol` remains the transitional public re-export boundary and depends on shared; shared does not depend on protocol.

## Consumers reviewed

- `apps/client/src/network/NetworkClient.ts`
- `apps/server/src/rooms/BattleRoom.ts`
- `apps/client/src/scenes/NetworkTestScene.ts` as the existing narrow-import reference

## Broad imports found

Both primary consumers imported broad `ClientMessages` and `ServerMessages` exports under profile-specific aliases.

## Narrow imports selected

Both primary consumers now import `ProfileClientMessages` and `ProfileServerMessages` directly. Existing profile types remain explicit type imports from `@burningspace/protocol`.

## Runtime compatibility

Message names, payload types, callbacks, validation, serialization, and gameplay logic are unchanged. The narrow runtime objects retain identity with the corresponding shared exports through the protocol compatibility facade.

## Allowed files

- The two primary application consumers
- This task document

## Forbidden files

CI and Claude infrastructure, review reports, handoff and durable context files, manifests, lockfiles, dependencies, TypeScript configuration, assets, other protocol groups, and TEST-001 files remain out of scope.

## Acceptance criteria

- Both primary consumers use the narrow public profile exports.
- No broad profile aliases remain in those consumers.
- Shared remains independent from protocol.
- Runtime and wire-format behavior remain unchanged.
- Required build, typecheck, compatibility, callback, movement, and combat checks pass.

## Validation

Run the repository build and typecheck, the profile compatibility check, the network callback check, movement and combat checks, focused import searches, and Git diff/scope checks.

Reviewer routing: Architecture, Network, and QA concerns apply to this import-boundary change. Security, Gameplay, and Visual review are skipped because no payload, validation, authority, gameplay, UI, or asset behavior changes.

## Known limitations

Canonical profile definitions remain in shared, and unrelated protocol groups are not migrated. Independent Claude review is unavailable for this task; the focused implementation review is performed and labelled as Codex review.

## Rollback

Restore the two broad message-object imports and aliases; no data or dependency rollback is required.
