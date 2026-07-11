# @burningspace/protocol

This package is the future home of versioned client/server messages, events, input frames, and snapshots.

## Current transitional status

The active runtime contract still lives in `@burningspace/shared`. PR-003 introduces profile compatibility exports from the protocol package root while preserving shared as the canonical owner.

Available profile facade exports:

- `ClientMessages` and `ServerMessages` as direct runtime object re-exports
- `JoinMode`
- `JoinRequest`
- `RoomParticipant`
- `ProfileAcceptedMessage`
- `ProfileRejectedMessage`

The profile flow uses only `ClientMessages.SET_PROFILE`, `ServerMessages.PROFILE_ACCEPTED`, and `ServerMessages.PROFILE_REJECTED`, but the complete objects are exposed temporarily to preserve strict identity without duplicating constants.

## Dependency rule

The transitional direction is:

```text
@burningspace/protocol -> @burningspace/shared
```

The reverse dependency is forbidden. Never copy active runtime message strings or duplicate payload definitions in this package.

The temporary shared dependency can be removed only after client, server, diagnostics, and compatibility exports have completed coordinated migration and no old consumers remain.
