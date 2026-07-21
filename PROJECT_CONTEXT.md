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

For a cold Product Architect takeover, begin here and then follow the
[Architect Takeover Protocol](docs/agents/ARCHITECT_TAKEOVER_PROTOCOL.md). The
protocol is canonical after DOCARCH-004B human merge and remains subordinate
to governance and accepted decisions.

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
- [Canonical Development Roadmap](docs/roadmap/CANONICAL_DEVELOPMENT_ROADMAP.md) defines delivery sequence, dependencies, the MVP boundary, and unresolved decision gates after human merge. It does not replace accepted decisions or `CURRENT.md`.
- [Decision Registry README](docs/decisions/README.md) explains registry roles and status.
- [Architect Takeover Protocol](docs/agents/ARCHITECT_TAKEOVER_PROTOCOL.md) is the canonical operational cold-takeover procedure and remains subordinate to governance and accepted decisions.
- [CURRENT](docs/handoffs/CURRENT.md) reports the active branch, task, review, and next safe action. During takeover it must be validated through the protocol rather than assumed fresh.
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

DOCARCH-000 through DOCARCH-003 are complete. DOCARCH-004 remains open.
DOCARCH-004C v1 failed its methodology repeatability audit, although the
protocol remained materially safe. The v1 corpus is frozen as historical
evidence and Attempt 5 is not authorized. The historical audit commit is
`d0fd34d46d6bb20c58b4b9b049901aadbab452a6`.

`BS-PROC-005` establishes separate safety and exact-conformance verdicts.
DOCARCH-004D is the active redesign program, with DOCARCH-004D-A as its active
bounded stage. A versioned DOCARCH-004C v2 is required after the protocol and
normative-rubric stages. The registry contains 36 accepted decisions.
DOCARCH-005 — Role and Model Portability remains reserved after DOCARCH-004.

Use [CURRENT](docs/handoffs/CURRENT.md) for live operational status rather than
maintaining pull-request or commit chronology here.

## Known deferred work

- TestBattleRoom and its authority-bypass risk remain deferred to SEC-006.
- Branch protection and possible CI-004 remain dedicated CI work.
- AGENT-004 and detailed role/model portability remain deferred to DOCARCH-005.
- Persistence, accounts, and database work remain future implementation work.
- Exact unresolved balance parameters remain outside the accepted mechanics until separately approved.

## Safe resumption

For a cold Product Architect takeover, read this file first and then follow
`docs/agents/ARCHITECT_TAKEOVER_PROTOCOL.md`; it owns the complete recovery
sequence, freshness checks, conflict handling, and success criteria.

For normal bounded-task execution with a fresh handoff, use `AGENTS.md`,
`docs/handoffs/CURRENT.md`, and the task named there. When sources conflict or
omit required intent, stop instead of inferring a decision from implementation,
historical prose, or chat memory.
