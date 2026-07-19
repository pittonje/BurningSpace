# MVP Balance v0.1

**Status: Historical, non-authoritative baseline**

This document records an earlier balance and design baseline. It is historical
evidence, not canonical authority. Accepted decisions under
[`docs/decisions/`](../decisions/) override conflicting content. Read the
[Decision Index](../decisions/DECISION_INDEX.md) and its linked records for
exact current mechanics. Implementation must not use a value solely because it
appears in this document.

## Reconciliation note

- For old 50/80/100 sector-control thresholds, current authority is [`BS-MECH-020`](../decisions/BS-MECH-020.md).
- For old nonzero or 50% outpost-capture thresholds, current authority is [`BS-MECH-026`](../decisions/BS-MECH-026.md).
- For fixed 50% post-capture HP and resource assumptions, current authority is [`BS-MECH-027`](../decisions/BS-MECH-027.md).
- For governed-sector post-capture assumptions, current authority is [`BS-MECH-023`](../decisions/BS-MECH-023.md).
- For turret-restoration assumptions, current authority is [`BS-MECH-024`](../decisions/BS-MECH-024.md) and [`BS-MECH-025`](../decisions/BS-MECH-025.md).

The machine-readable source is `packages/balance/src/mvp-balance-v0.1.ts`.

## Server and ships

- Tick rate: 20 Hz.
- Miner: 1200 hull, 500 shield, 100 cargo.
- Scout: 500 hull, 400 shield.
- Fighter: 900 hull, 700 shield.

## Sectors and outposts

- Three turrets per sector.
- Control thresholds: owner switch at 50, creep advance at 80, stable at 100.
- Outpost: 80,000 hull; capture at 50% HP; 500 emergency resources; 5,000 maximum resources; 3,000 raw ore storage.

## Creeps

- Maximum 12 groups per faction; spawn interval 90 seconds.
- Base group: 6 normal, 1 repair, 2 heavy.
- Lost C: 8 normal, 2 repair, 2 heavy.
- Lost C+B: 8 normal, 2 repair, 4 heavy.
- Lost C+B+A: 9 normal, 3 repair, 5 heavy, 30% shield bonus.

## Portals

- Outpost stability requirement: 180 seconds.
- Base-to-outpost cooldown: 300 seconds.
- Cargo limit: 10%.

These values describe the preserved v0.1 historical baseline. They are not
current authority and are not applied to gameplay by this documentation task.
