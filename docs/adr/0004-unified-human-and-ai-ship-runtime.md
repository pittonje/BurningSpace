# ADR 0004: Unified Human And AI Ship Runtime

## Status

Proposed

## Context

The future game includes humans, hired pilots, frontline creeps, and balance squads. Separate combat implementations would diverge and become hard to balance.

## Decision

Human ships and AI ships should share server runtime systems for movement, collision, weapons, health, damage, death, and navigation primitives. Controllers differ, runtime rules do not.

## Consequences

- AI uses the same constraints as players.
- Combat tuning is more consistent.
- Server architecture must separate controller logic from entity simulation.

## Alternatives

- Special-case NPC physics and damage.
- Fake distant combat with no shared local runtime.
- Separate AI combat shortcuts.

## Open Questions

- Which AI tiers can use aggregated simulation?
- How are pilot behavior presets represented?
- What telemetry is needed for AI balance?

