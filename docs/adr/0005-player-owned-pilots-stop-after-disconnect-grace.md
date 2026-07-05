# ADR 0005: Player-Owned Pilots Stop After Disconnect Grace

## Status

Proposed

## Context

Player-owned pilots can mine and perform tasks. Unlimited activity while the owner is absent would create safe offline farming and distort the economy.

## Decision

Player-owned pilots stop active orders after the owner is absent for more than five minutes, attempt to return to an allied base, and stop producing resources after returning.

## Consequences

- Players can recover from brief disconnects.
- Long-term offline income is capped.
- The server needs owner-presence tracking.

## Alternatives

- Pilots continue indefinitely.
- Pilots stop immediately on disconnect.
- Pilots continue with upkeep cost.

## Open Questions

- Is the five-minute timer based on disconnect or last activity?
- What happens if a pilot cannot return to base?
- Can pilots defend themselves while returning?

