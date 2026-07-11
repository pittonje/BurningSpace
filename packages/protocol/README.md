# @burningspace/protocol

This package is the future home of versioned client/server messages, events, input frames, and snapshots.

## Current transitional status

The active runtime contract still lives in `@burningspace/shared`. PR-005 adds narrow profile compatibility exports from the protocol package root while preserving shared as the canonical owner.

Available profile facade exports:

- `ProfileClientMessages` with only `SET_PROFILE`
- `ProfileServerMessages` with only `PROFILE_ACCEPTED` and `PROFILE_REJECTED`
- `ClientMessages` and `ServerMessages` as direct runtime object re-exports
- `JoinMode`
- `JoinRequest`
- `RoomParticipant`
- `ProfileAcceptedMessage`
- `ProfileRejectedMessage`

The narrow objects are the intended profile-specific API. `ClientMessages` and `ServerMessages` remain transitional because application consumers still use their profile properties through protocol aliases. All objects are direct shared re-exports; protocol duplicates no constants or types.

## Dependency rule

The transitional direction is:

```text
@burningspace/protocol -> @burningspace/shared
```

The reverse dependency is forbidden. Never copy active runtime message strings or duplicate payload definitions in this package.

The temporary shared dependency can be removed only after client, server, diagnostics, and compatibility exports have completed coordinated migration and no old consumers remain.

The next step is a coordinated narrow consumer cutover to `ProfileClientMessages` and `ProfileServerMessages`, with broad exports retained for rollback.
