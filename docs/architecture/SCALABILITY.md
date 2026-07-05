# Scalability Requirements

## Current Reality

The current `BattleRoom` is a server-authoritative combat prototype. It is not expected to support the future full-scale NPC population without additional architecture.

## Required Directions

- server-authoritative simulation;
- fixed simulation tick;
- interest management;
- spatial partitioning;
- client-side object pooling;
- entity update tiers;
- reduced AI frequency for distant NPCs;
- group-level AI for creep waves;
- individual AI only in local combat;
- group navigation;
- aggregated distant combat;
- explicit entity budgets;
- load testing.

## Initial Performance Hypotheses

These are planning hypotheses, not promises:

- 20-40 human connections in one active zone;
- hundreds of simple visible NPCs with interest management and pooling;
- thousands of logical NPCs only with aggregation or simulation LOD;
- separate budgets for projectiles, effects, pathfinding, and network updates.

## Simulation Tiers

Tier 0: directly observed combat.

- Full movement, collision, weapons, health, and projectiles.
- Individual AI decisions.
- Highest network frequency.

Tier 1: nearby but not central.

- Reduced decision frequency.
- Interest-filtered updates.
- Simplified effects.

Tier 2: distant frontline groups.

- Group-level movement.
- Aggregated weapon outcomes.
- Sparse state updates.

Tier 3: strategic background.

- No individual entities.
- Frontline pressure and event outcomes only.

## Load Testing Needs

Future load tests should cover:

- human player count;
- NPC count by tier;
- projectile count;
- room memory growth;
- callback cleanup;
- reconnect behavior;
- pathfinding budget;
- server tick stability.

