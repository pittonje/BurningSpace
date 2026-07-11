# Shared Package Inventory

## Method and evidence

The audit covers every file in `packages/shared/src` and every symbol re-exported by `src/index.ts`. Consumers were found with repository-wide searches for `@burningspace/shared` and confirmed by inspecting import declarations. “Runtime” means the emitted JavaScript value is required; “type-only” is erased by TypeScript.

Consumer abbreviations:

- `NC`: `apps/client/src/network/NetworkClient.ts`
- `NT`: `apps/client/src/scenes/NetworkTestScene.ts`
- `MG`: `apps/client/src/scenes/MultiplayerGameScene.ts`
- `NS`: `apps/client/src/entities/NetworkShipView.ts`
- `NP`: `apps/client/src/entities/NetworkProjectileView.ts`
- `GC`: `apps/client/src/config/gameConfig.ts`
- `CC`: `apps/client/scripts/network-client-callback-check.ts`
- `BR`: `apps/server/src/rooms/BattleRoom.ts`
- `TR`: `apps/server/src/rooms/TestBattleRoom.ts`
- `SM`: `apps/server/src/systems/shipMovement.ts`
- `SP`: `apps/server/src/systems/spawn.ts`
- `CO`: `apps/server/src/systems/combat.ts`
- `VI`: `apps/server/src/validation/playerInput.ts`
- `MC`: `apps/server/scripts/movement-check.ts`
- `CB`: `apps/server/scripts/combat-check.ts`

Every row below is publicly re-exported by `packages/shared/src/index.ts`. “—” means no repository consumer was found.

| Symbol | Current file | Kind | Runtime/type-only | Client consumers | Server consumers | Proposed owner | Risk | Notes |
|---|---|---|---|---|---|---|---|---|
| `TEAM_CAPACITY` | constants.ts | runtime constant | Runtime | — | — | balance | Low | Unused capacity rule; migrate only when a consumer exists. |
| `TOTAL_PLAYER_CAPACITY` | constants.ts | runtime constant | Runtime | — | — | balance | Low | Unused derived/product rule by convention, currently literal. |
| `MAX_ROOM_CLIENTS` | constants.ts | runtime constant | Runtime | — | BR | server | Medium | Colyseus room limit is authoritative operational policy, not wire data. |
| `NETWORK_TICK_RATE` | constants.ts | runtime constant | Runtime | — | — | balance | Medium | Exported but only used internally to derive tick interval at module evaluation. |
| `NETWORK_TICK_INTERVAL_MS` | constants.ts | runtime constant | Runtime | — | BR | balance | High | Drives authoritative simulation scheduling; value parity is mandatory. |
| `NETWORK_INPUT_TIMEOUT_MS` | constants.ts | runtime constant | Runtime | CC | BR | server | High | Authoritative anti-stale-input policy; diagnostic also asserts behavior. |
| `WORLD_WIDTH` | constants.ts | runtime constant | Runtime | GC, MG | BR, TR, SM, SP, MC | config | High | Shared topology affects rendering, spawn, movement clamps, tests, and simulation. |
| `WORLD_HEIGHT` | constants.ts | runtime constant | Runtime | GC, MG | BR, TR, SM, SP | config | High | Same coordinated topology risk as width. |
| `RED_BASE_X` | constants.ts | runtime constant | Runtime | GC | SP | config | High | Structural spawn coordinate used by local presentation and server spawn. |
| `RED_BASE_Y` | constants.ts | runtime constant | Runtime | GC | SP | config | High | Structural spawn coordinate. |
| `BLUE_BASE_X` | constants.ts | runtime constant | Runtime | GC, CC | SP | config | High | Structural spawn coordinate and diagnostic expectation. |
| `BLUE_BASE_Y` | constants.ts | runtime constant | Runtime | GC, CC | SP | config | High | Structural spawn coordinate and diagnostic expectation. |
| `NETWORK_SHIP_MAX_SPEED` | constants.ts | runtime constant | Runtime | — | SM, MC | balance | High | Authoritative movement value; must not change during import migration. |
| `NETWORK_SHIP_ACCELERATION` | constants.ts | runtime constant | Runtime | — | SM | balance | High | Authoritative movement value. |
| `NETWORK_SHIP_DECELERATION` | constants.ts | runtime constant | Runtime | — | SM | balance | High | Authoritative movement value. |
| `NETWORK_SHIP_TURN_SPEED` | constants.ts | runtime constant | Runtime | — | SM | balance | High | Authoritative movement value. |
| `NETWORK_SHIP_RADIUS` | constants.ts | runtime constant | Runtime | — | BR, TR, SM, SP, MC | balance | High | Used by movement bounds, spawn, collision, test room, and diagnostics. |
| `NETWORK_SHIP_MAX_HEALTH` | constants.ts | runtime constant | Runtime | CC | BR, TR, CO, CB | balance | High | Authoritative combat/lifecycle value and diagnostic expectation. |
| `NETWORK_PROJECTILE_DAMAGE` | constants.ts | runtime constant | Runtime | CC | BR, CB | balance | High | Wire events expose the result; value parity required. |
| `NETWORK_PROJECTILE_SPEED` | constants.ts | runtime constant | Runtime | — | BR | balance | High | Authoritative projectile simulation value. |
| `NETWORK_PROJECTILE_MAX_RANGE` | constants.ts | runtime constant | Runtime | — | BR | balance | High | Authoritative projectile lifetime/range rule. |
| `NETWORK_PROJECTILE_RADIUS` | constants.ts | runtime constant | Runtime | — | BR | balance | High | Authoritative swept-collision radius. |
| `NETWORK_PROJECTILE_MUZZLE_OFFSET` | constants.ts | runtime constant | Runtime | — | BR | balance | High | Authoritative spawn geometry. |
| `NETWORK_WEAPON_FIRE_INTERVAL_MS` | constants.ts | runtime constant | Runtime | — | BR | balance | High | Authoritative cooldown. |
| `NETWORK_MAX_ACTIVE_PROJECTILES_PER_SHIP` | constants.ts | runtime constant | Runtime | — | BR | balance | High | Authoritative abuse/resource limit; server ownership is also defensible. |
| `NETWORK_RESPAWN_DELAY_MS` | constants.ts | runtime constant | Runtime | CC | CO, CB | balance | High | Lifecycle timing exposed in snapshots/events. |
| `NETWORK_SPAWN_INVULNERABILITY_MS` | constants.ts | runtime constant | Runtime | CC | CO, CB | balance | High | Authoritative lifecycle protection. |
| `Faction` | factions.ts | type alias | Type-only | NC, NT | BR, CO, SP | shared | Medium | Generic domain identifier used by protocol and simulation; keep dependency-neutral. |
| `JoinMode` | factions.ts | type alias | Type-only | NC, NT | BR | protocol | Medium | Meaning is specific to connection/profile transport. |
| `ClientMessages` | messages.ts | message-name object | Runtime | NC | BR | protocol | High | Active wire names; client/server must cut over together with identical strings. |
| `ServerMessages` | messages.ts | message-name object | Runtime | NC | BR | protocol | High | Active wire names; identical runtime object exports needed during transition. |
| `ClientMessageType` | messages.ts | type alias | Type-only | — | — | protocol | Low | Derived from `ClientMessages`; no current consumers. |
| `ServerMessageType` | messages.ts | type alias | Type-only | — | — | protocol | Low | Derived from `ServerMessages`; no current consumers. |
| `JoinRequest` | messages.ts | payload interface | Type-only | NC, NT | BR | protocol | High | Profile payload; field names and optionality are wire-facing. |
| `RoomParticipant` | messages.ts | payload interface | Type-only | NC, NT | — | protocol | Medium | UI-facing participant projection; also base of accepted-profile payload. |
| `ShipSnapshot` | messages.ts | snapshot interface | Type-only | NC, MG, NS, CC | — | protocol | High | Mirrors Colyseus schema fields; shape parity required. |
| `ProjectileSnapshot` | messages.ts | snapshot interface | Type-only | NC, MG, NP, CC | — | protocol | High | Mirrors Colyseus schema fields; shape parity required. |
| `ProfileAcceptedMessage` | messages.ts | payload interface | Type-only | NC | BR | protocol | High | Server-to-client profile event extending `RoomParticipant`. |
| `ProfileRejectedMessage` | messages.ts | payload interface | Type-only | NC | BR | protocol | Medium | Server-to-client validation error payload. |
| `RoomInfoMessage` | messages.ts | payload interface | Type-only | NC | BR | protocol | Medium | Server-to-client room metadata and clock sample. |
| `HitEventMessage` | messages.ts | payload interface | Type-only | NC, MG | BR | protocol | High | Combat event fields are active wire format. |
| `ShipDestroyedMessage` | messages.ts | payload interface | Type-only | NC | BR | protocol | High | Lifecycle event fields are active wire format. |
| `PlayerInputMessage` | messages.ts | payload interface | Type-only | NC | BR, SM, VI, MC | protocol | High | Active input-frame format, validation target, and simulation input. |
| `Vector2` | movement.ts | interface | Type-only | — | — | shared | Low | Generic environment-neutral primitive; currently unused. |

## Classification summary

- Keep in `packages/shared`: `Faction`, `Vector2` (2).
- Future `packages/protocol`: 15 symbols (`JoinMode`, two runtime message maps, two derived message-name types, and ten payload/snapshot interfaces).
- Future `packages/balance`: 17 constants.
- Future `packages/config`: 6 world/topology constants.
- Server-owned policy: 2 constants (`MAX_ROOM_CLIENTS`, `NETWORK_INPUT_TIMEOUT_MS`).
- Ambiguous: `NETWORK_MAX_ACTIVE_PROJECTILES_PER_SHIP` is classified as balance but could be server policy; `RoomParticipant` could be a UI projection but is currently wire-derived; `Faction` is a domain primitive used by protocol and simulation.
- No shared public export is purely client-only or legacy-local-prototype-only.

## Internal and non-exported symbols

There are no non-exported declarations except the type-only import of `Faction` and `JoinMode` inside `messages.ts`. `index.ts` re-exports all four implementation modules wholesale. No symbol is hidden behind a narrower public surface.
