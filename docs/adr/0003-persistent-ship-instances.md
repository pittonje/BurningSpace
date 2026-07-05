# ADR 0003: Persistent Ship Instances

## Status

Proposed

## Context

The planned hangar requires owned ships. A class alone cannot represent equipment, damage, pilot assignment, cargo, or active orders.

## Decision

Ships owned by players should be persistent `ShipInstance` records referencing static hull definitions.

## Consequences

- Hangar and deployment systems need clear ownership invariants.
- Combat runtime ships are created from persistent instances.
- Ship loss and repair policies must be approved before implementation.

## Alternatives

- Loadout-only ships without persistent instances.
- Fully temporary battle ships.
- Class unlocks with no owned hulls.

## Open Questions

- Are ships permanently destroyable?
- How is damage persisted?
- Can one account own multiple copies of the same hull?

