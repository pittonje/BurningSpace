# Persistence Boundaries

## Persistent Data

Persistent data survives sessions and server restarts:

- account;
- credentials identity reference;
- faction membership;
- hangar;
- ship instances;
- hired pilots;
- inventory;
- wallet;
- purchases;
- progression;
- completed tutorial stages;
- achievements and statistics.

Persistent data must be mutated only by server-side services with validation, transactions, and audit where needed.

## Session And Runtime Data

Session/runtime data exists while the player or room is active:

- room connection;
- current input;
- projectiles;
- current position;
- combat target;
- navigation path;
- current temporary effect;
- transient NPC state;
- hit events;
- respawn timers.

This data belongs to the game server. The client may display it and send input, but may not authoritatively change it.

## Durable World State

Durable world state sits between account persistence and room runtime:

- strategic object ownership;
- frontline pressure;
- active campaigns;
- world events;
- possible campaign season data.

This data should be updated by world services or controlled game-server transactions, not by raw client messages.

## Economic Boundary

The combat server must not trust the client for:

- currency changes;
- purchases;
- mining rewards;
- cargo delivery;
- ship repair;
- ship ownership;
- pilot ownership;
- tutorial reward completion.

All economic operations should pass through a server transaction service. The service should validate the source event and write an idempotent transaction.

## Runtime-To-Persistent Handoff

Future combat results may create persistent events, such as:

- resources earned;
- ship damaged;
- cargo lost;
- tutorial step completed;
- pilot order completed.

Those events must be explicitly validated and converted into transactions. Do not let runtime state objects directly mutate account records.

