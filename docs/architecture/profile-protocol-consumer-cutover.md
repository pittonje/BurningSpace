# Profile Protocol Consumer Cutover

## Purpose

PR-004 moves only the profile-related application imports onto the compatibility facade created by PR-003. It does not transfer canonical ownership.

## Before PR-004

```text
apps/client profile ─┐
                     ├──> packages/shared
apps/server profile ─┘
packages/protocol ───────> packages/shared
```

## After PR-004

```text
apps/client profile ─┐
                     ├──> packages/protocol ──> packages/shared
apps/server profile ─┘

apps/client non-profile ─┐
                         ├──> packages/shared
apps/server non-profile ─┘
```

## Consumer map

| File | Profile symbols moved | Shared imports retained |
|---|---|---|
| `NetworkClient.ts` | both message aliases and all five selected types | non-profile message maps, faction, input/events/snapshots |
| `NetworkTestScene.ts` | `JoinMode`, `JoinRequest`, `RoomParticipant` | `Faction` |
| `BattleRoom.ts` | both message aliases, `JoinMode`, `JoinRequest`, accepted/rejected payloads | constants, faction, input/events |

## Runtime message-object aliases

The complete message objects expose mixed categories. Clear protocol aliases are used only for `SET_PROFILE`, `PROFILE_ACCEPTED`, and `PROFILE_REJECTED`; existing shared object imports continue serving player input, room info, hit, and destruction messages. No object is copied or recreated.

## Dependency graph

Both applications explicitly depend on protocol and shared. Protocol depends on shared. Shared has no reverse dependency.

## Wire-format impact

- No serialized value changes
- No payload or optionality changes
- No validation changes
- No schema changes
- No callback or event-order changes

## Shared compatibility retention

Old shared exports remain available and canonical, providing immediate import-only rollback.

## Rollback plan

Restore the selected imports/usages to shared and remove application protocol dependencies. No data or protocol transformation is needed.

## Future ownership transfer

A later PR may move canonical profile definitions into protocol and re-export them from shared. That transfer must preserve runtime identity and all existing shared import paths.
