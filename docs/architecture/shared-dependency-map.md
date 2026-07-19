# Shared Dependency Map

## Purpose and authority

This document separates the declared workspace graph, observed imports,
accepted architecture, and future package direction. Manifests and imports are
current implementation evidence. Accepted package authority and dependency
direction come from `BS-ARCH-004`, `BS-ARCH-005`, and `BS-ARCH-006`.

## Declared workspace dependencies

```text
apps/client   -> packages/shared
apps/client   -> packages/protocol
apps/server   -> packages/shared
apps/server   -> packages/protocol
packages/protocol -> packages/shared

packages/shared   (no workspace dependencies)
packages/balance  (no workspace dependencies)
packages/config   (no workspace dependencies)
```

Both application manifests declare `@burningspace/shared` and
`@burningspace/protocol`. The protocol manifest declares
`@burningspace/shared`. No shared-to-protocol dependency exists, so there is no
shared/protocol package cycle.

## Actual current consumers and imports

- Client runtime and diagnostic sources import broad runtime contracts from `@burningspace/shared`.
- Client networking and scene sources import profile contracts from `@burningspace/protocol`.
- Server runtime, validation, systems, tests, and diagnostics import broad runtime contracts from `@burningspace/shared`.
- `BattleRoom` imports profile contracts from `@burningspace/protocol`.
- Protocol sources re-export profile contracts from shared and also expose protocol-version, message-envelope, and snapshot surfaces through their public entrypoint.
- No application or package source currently imports `@burningspace/balance` or `@burningspace/config`.
- No shared source imports `@burningspace/protocol`.

These relationships were re-audited from the workspace manifests and source
imports during DOCARCH-002D3. They describe the repository at that point; they
do not independently change accepted ownership.

## Accepted architectural direction

- `packages/shared` is the current canonical owner of broad runtime and profile contracts.
- `packages/protocol` is an active transitional public compatibility boundary that may expose or re-export stable public contracts while depending on shared.
- The accepted direction is `protocol -> shared`.
- The forbidden direction is `shared -> protocol` unless `BS-ARCH-005` is explicitly superseded.
- `packages/protocol` is not yet the fully separated canonical owner of broad runtime contracts.
- `packages/balance` and `packages/config` are retained future boundaries; their integration and maturity must not be overstated.

## Current public resolution

Shared and protocol publish TypeScript declarations from `src/index.ts` and
runtime JavaScript from `dist/index.js`. Consumers therefore rely on public
package entrypoints and fresh workspace builds for runtime exports. No deep
imports or application-to-package source bypass is established by the audited
consumer set.

## Future intended boundaries

Future approved work may move contract ownership, integrate balance data, or
populate configuration incrementally. Such work must update direct manifest
dependencies, preserve compatibility, and keep client/server consumers
coordinated. This document neither proposes nor performs that migration.

## Dependency safety rules

- Packages must not depend on application code.
- Shared must not import or re-export protocol.
- Protocol may depend on shared during the accepted transitional state.
- Balance and config must remain environment-neutral and dependency-light.
- Runtime message values, snapshots, and world constants must not be moved independently in a way that desynchronizes client and server.
