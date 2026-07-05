# ADR 0007: Economic Transactions Are Server-Authoritative

## Status

Proposed

## Context

The future game adds resources, purchases, mining, rewards, repair, pilots, and possibly trading. Economic cheating would undermine the game.

## Decision

All economic operations are server-authoritative, validated, and recorded through idempotent transactions or a reliable ledger.

## Consequences

- Combat and mining events must be converted into economic transactions.
- Transaction ids and replay protection are required.
- Auditability becomes a core requirement.

## Alternatives

- Client-submitted rewards with validation.
- Direct wallet mutation from gameplay rooms.
- Periodic reconciliation without transaction history.

## Open Questions

- What database will store the ledger?
- Are transactions immutable or append-only with corrections?
- How are failed and retried operations represented?

