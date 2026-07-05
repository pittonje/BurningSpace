# ADR 0001: Server-Authoritative Gameplay

## Status

Accepted

## Context

The current multiplayer prototype already moved player movement, projectiles, damage, death, respawn, and lifecycle safeguards to the server. The future persistent game increases the value of cheating prevention and consistent simulation.

## Decision

Authoritative gameplay state lives on the server. Clients send input and render synchronized state. Clients do not decide hits, damage, rewards, currency, ownership, or authoritative entity creation.

## Consequences

- Combat logic is harder to cheat.
- Client prediction and reconciliation may be needed later for feel.
- Server performance and load testing become critical.
- Shared code should avoid Phaser and DOM dependencies.

## Alternatives

- Client-authoritative combat with server validation.
- Hybrid trust by feature.
- Local-only simulation for early prototypes.

## Open Questions

- When should client prediction be introduced?
- How much lag compensation is acceptable?
- Which future systems need deterministic shared logic?

