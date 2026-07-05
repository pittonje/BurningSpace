# Domain Model

This document proposes domain boundaries. It does not define ORM models, database schema, migrations, or production services.

## Entity Summary

| Entity | Kind | Authority | Identifier | Key invariants |
| --- | --- | --- | --- | --- |
| Account | persistent | account service | account id | Owns profile, hangar, pilots, inventory, wallet. |
| PlayerProfile | persistent | account service | profile id | Belongs to exactly one account. |
| FactionMembership | persistent | account service | account id + faction | Faction rules are not final. |
| Hangar | persistent | hangar service | hangar id | Belongs to one account. |
| ShipInstance | persistent | hangar service | ship instance id | Belongs to one account; cannot be in two deployments. |
| ShipHullDefinition | static content | content service | hull key + version | Versioned; not owned by players. |
| ShipClassDefinition | static content | content service | class key + version | Defines role, not a concrete owned ship. |
| EquipmentInstance | persistent | inventory/hangar service | equipment instance id | Assigned to at most one ship slot. |
| Pilot | persistent | pilot service | pilot id | Belongs to one account; assigned to at most one ship. |
| PilotBehaviorProfile | persistent/static hybrid | pilot service | behavior id | Validated before deployment. |
| ActiveDeployment | runtime/session | game server | deployment id | Maps persistent assets into runtime entities. |
| Wing | persistent/runtime hybrid | hangar/game server | wing id | Has one active human ship and limited wingmen. |
| WingMember | persistent/runtime hybrid | hangar/game server | wing id + member slot | References a ship and optional pilot/controller. |
| Inventory | persistent | economy service | inventory id | Mutated only by server transactions. |
| Wallet | persistent | economy service | wallet id | Mutated only by ledgered transactions. |
| Transaction | persistent | economy service | transaction id | Immutable or append-only. |
| ResourceStack | persistent/runtime | economy/game server | resource key + owner | Quantity cannot be negative. |
| WorldEntity | runtime | game server | entity id | Exists only while simulated. |
| CombatShip | runtime | game server | entity id | Created from a ShipInstance or systemic NPC definition. |
| NpcWave | runtime/durable world | world/game server | wave id | Owns groups of frontline creeps. |
| NpcSquad | runtime | game server | squad id | Systemic NPC group with a controller. |
| MiningOrder | runtime/persistent order | game server/order service | order id | Reward generation is server-authoritative. |
| NavigationOrder | runtime | game server | order id | Cannot move entities outside allowed rules. |
| FrontlineState | durable world | world service | frontline id | Stores strategic pressure and object ownership. |
| Session | session/runtime | session service | session id | Links authenticated account to connection. |
| Connection | runtime | Colyseus/game server | session id | Never trusted as account identity by itself. |

## Persistent, Static, Runtime

Static content:

- `ShipHullDefinition`;
- `ShipClassDefinition`;
- possible equipment definitions and behavior presets.

Persistent account data:

- `Account`;
- `PlayerProfile`;
- `FactionMembership`;
- `Hangar`;
- `ShipInstance`;
- `EquipmentInstance`;
- `Pilot`;
- `Inventory`;
- `Wallet`;
- `Transaction`;
- tutorial milestones.

Runtime game state:

- `Connection`;
- `Session` in an active room;
- `CombatShip`;
- projectiles;
- current input;
- active collision state;
- transient effects;
- local AI decisions.

Durable world state:

- `FrontlineState`;
- strategic object ownership;
- campaign progress;
- active world events.

## Critical Invariants

- A client cannot choose or mutate an account id as trusted data.
- A `ShipInstance` belongs to one account.
- A `ShipInstance` cannot be deployed twice at the same time.
- A `Pilot` cannot be assigned to two active ships.
- A `CombatShip` is server-authoritative and never client-authored.
- A reward transaction cannot be applied twice.
- A purchase cannot create a ship without a successful economic transaction.
- Runtime death does not directly imply persistent destruction until the approved ship-loss policy exists.
- Static definitions are versioned and never stored as mutable owned instances.

## Current Prototype Mapping

Current multiplayer `ShipState` is a runtime `CombatShip` equivalent. It is not yet backed by `ShipInstance`. Current participants are session/runtime entities, not authenticated accounts.

