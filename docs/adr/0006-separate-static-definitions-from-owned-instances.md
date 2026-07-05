# ADR 0006: Separate Static Definitions From Owned Instances

## Status

Proposed

## Context

Ship classes, hull definitions, equipment definitions, and behavior presets are content. Owned ships, equipment, and pilots are player state.

## Decision

Static definitions must be versioned content. Owned instances reference those definitions and store only player-specific state.

## Consequences

- Balance patches can update definitions without rewriting every account record.
- Persistence remains smaller and clearer.
- Migration strategy is required when definitions change incompatibly.

## Alternatives

- Copy full definitions into every owned record.
- Store all definitions in code constants only.
- Let clients provide content definitions.

## Open Questions

- How are content versions deployed?
- What happens to old owned instances after a hull rebalance?
- Which content lives in shared package versus server content data?

