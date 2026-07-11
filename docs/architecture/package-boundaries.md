# Package Boundaries

## Applications

- `apps/client`: rendering, interpolation/prediction presentation, input collection, UI, audio, and visual effects. No canonical gameplay decisions.
- `apps/server`: simulation, validation, rooms, AI, world logic, and authoritative state transitions.

## Packages

- `packages/shared`: generic IDs, math primitives, and simple environment-neutral shared types.
- `packages/protocol`: versioned client/server messages, requests, events, and snapshots.
- `packages/balance`: accepted gameplay balance constants, with named/versioned balance sets where appropriate.
- `packages/config`: map topology and non-balance structural configuration.

## Incremental migration

The active protocol and several constants remain in `packages/shared` for compatibility. Types in `packages/protocol` are non-runtime placeholders, not a second message contract. PR-001 does not rewrite existing imports.

Later PRs should move one responsibility at a time, preserve field-level compatibility during transition, update client and server together, and verify behavior after each step. `AGENTS.md` defines the matching repository-wide rules; this document is the detailed boundary reference.
