# Economy Principles

## Status

The final currency model is not chosen. This document records constraints that future economy implementation must satisfy.

## Required Rules

- Rewards are server-authoritative.
- Purchases are server-authoritative.
- Economic operations need an immutable transaction history or reliable ledger.
- Rewards must be idempotent.
- The server must protect against repeated reward claims.
- Safe AFK mining must be capped or constrained.
- Infinite offline farming is not allowed.
- A hired pilot stops active orders after the owner is absent for more than five minutes.
- Frontline combat rewards should be higher than safe tutorial mining.
- Starter progression must not be so slow that a new player leaves before buying a Scout.
- Ship loss must not fully reset a new player.

## Transaction Principles

Economic state changes should go through a transaction service. Combat servers must not trust the client to change currency, purchases, mining results, or ship ownership state.

Every economic command should be designed for retry safety:

- stable operation id;
- idempotent handling;
- no double-spend;
- no duplicated reward;
- auditable result.

## Open Decisions

- one currency or multiple currencies;
- repair cost;
- insurance;
- destruction versus temporary damage;
- cargo loss;
- market pricing;
- pilot salaries;
- resource sinks;
- anti-inflation controls;
- player-to-player trading;
- economy wipe or seasonal reset.

