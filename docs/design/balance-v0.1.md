# MVP Balance v0.1

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

These values describe accepted future campaign balance. PR-001 does not apply them to current gameplay.
