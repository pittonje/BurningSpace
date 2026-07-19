# BurningSpace Project Context

Last updated: 2026-07-20

## Purpose of this document

This file is the durable entrypoint and high-level repository summary for
BurningSpace. It helps a new architect or contributor find project authority,
current work, and the safest reading order.

This file is not a decision registry and is not independent decision authority.
Exact accepted decisions live under [`docs/decisions/`](docs/decisions/), with
navigation in the [Decision Index](docs/decisions/DECISION_INDEX.md). Current
operational state lives in [CURRENT](docs/handoffs/CURRENT.md).

## Product snapshot

BurningSpace is a persistent multiplayer top-down space campaign about faction
conflict over sectors, outposts, ships, resources, and infrastructure. The
long-term direction includes durable campaign state and player progression.
Multiplayer gameplay follows a server-authoritative model; the browser client
presents authoritative state and sends input or requests.

The repository already contains a working multiplayer movement and combat
foundation plus a preserved local prototype. Campaign systems remain
incremental future work rather than implemented assumptions.

## Authority map

- [Documentation governance](docs/GOVERNANCE.md) defines authority and conflict rules.
- [Decision Index](docs/decisions/DECISION_INDEX.md) navigates accepted decisions; the linked individual records are canonical in their domains.
- [Decision Registry README](docs/decisions/README.md) explains registry roles and status.
- [CURRENT](docs/handoffs/CURRENT.md) reports the active branch, task, review, and next safe action.
- [`docs/tasks/`](docs/tasks/) contains Product Architect-approved bounded task scope.
- [`docs/reviews/`](docs/reviews/) contains review and conformance evidence.
- [`docs/architecture/`](docs/architecture/) summarizes architecture subject to accepted decisions.
- [`docs/design/`](docs/design/) contains active summaries or historical material according to each document's label.

Accepted decision records override conflicting lower-authority summaries.
Observed implementation is evidence of current behavior, not automatic
architecture or product authority.

## Architecture snapshot

BurningSpace is a TypeScript npm-workspaces monorepo. The browser client uses
Phaser 3, Vite, and the Colyseus client; the Node.js/TypeScript server uses
Colyseus and owns authoritative gameplay and state transitions.

During the current transitional package state:

- `packages/shared` is the canonical owner of broad runtime and profile contracts;
- `packages/protocol` is an active public compatibility boundary that exposes or re-exports public contracts while depending on `packages/shared`;
- `packages/shared` must not depend on `packages/protocol`;
- `packages/balance` and `packages/config` are future structural boundaries whose current maturity and authority must not be overstated;
- the local `GameScene` prototype is preserved reference material and is not multiplayer authority.

Accepted architecture is recorded in
[`BS-ARCH-001`](docs/decisions/BS-ARCH-001.md),
[`BS-ARCH-002`](docs/decisions/BS-ARCH-002.md),
[`BS-ARCH-003`](docs/decisions/BS-ARCH-003.md),
[`BS-ARCH-004`](docs/decisions/BS-ARCH-004.md),
[`BS-ARCH-005`](docs/decisions/BS-ARCH-005.md),
[`BS-ARCH-006`](docs/decisions/BS-ARCH-006.md), and
[`BS-ARCH-007`](docs/decisions/BS-ARCH-007.md), with current summaries in
[Package Boundaries](docs/architecture/package-boundaries.md) and the
[Shared Dependency Map](docs/architecture/shared-dependency-map.md).

## Mechanics navigation

The accepted mechanics and GAME-001 records are indexed by domain in the
[Decision Index](docs/decisions/DECISION_INDEX.md). Consult those records for
exact rules concerning sector control, governed sectors and shields, outpost
capture, turret restoration, ship control and switching, and death/respawn.
This entrypoint intentionally does not duplicate their thresholds, formulas, or
implementation constraints.

## Current program state

DOCARCH-002D3 is the final DOCARCH-002 reconciliation and closure candidate.
The registry contains 35 accepted decisions. DOCARCH-002 remains open until D3
completes required review, evidence, final-head checks, and human merge. After
that merge, DOCARCH-003 will create the Canonical Development Roadmap.

Use [CURRENT](docs/handoffs/CURRENT.md) for live operational status rather than
maintaining pull-request or commit chronology here.

## Known deferred work

- TestBattleRoom and its authority-bypass risk remain deferred to SEC-006.
- Branch protection and possible CI-004 remain dedicated CI work.
- AGENT-004 and detailed role/model portability remain deferred to DOCARCH-005.
- Persistence, accounts, and database work remain future implementation work.
- Exact unresolved balance parameters remain outside the accepted mechanics until separately approved.

## Safe resumption sequence

Read in this order:

1. `PROJECT_CONTEXT.md`
2. `docs/GOVERNANCE.md`
3. `docs/decisions/DECISION_INDEX.md`
4. `docs/handoffs/CURRENT.md`
5. the active task named by `CURRENT.md`
6. the active review artifact named by `CURRENT.md`
7. relevant accepted decision records
8. relevant architecture and design documents
9. implementation sources only after authority and task scope are understood

When sources conflict or omit required intent, stop and return the ambiguity to
the Product Architect instead of inferring a new decision from implementation,
historical prose, or chat memory.
