# BurningSpace Project Context

Last updated: 2026-09-20

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
protocol is canonical after the human merge of PR #50 and remains subordinate
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
- [Architect Takeover Protocol](docs/agents/ARCHITECT_TAKEOVER_PROTOCOL.md) is the canonical operational cold-takeover procedure after merged PR #50; it remains subordinate to governance and accepted decisions.
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
[`BS-ARCH-007`](docs/decisions/BS-ARCH-007.md), plus persistence decisions
[`BS-ARCH-008`](docs/decisions/BS-ARCH-008.md),
[`BS-ARCH-009`](docs/decisions/BS-ARCH-009.md),
[`BS-ARCH-010`](docs/decisions/BS-ARCH-010.md), and
[`BS-ARCH-011`](docs/decisions/BS-ARCH-011.md). Current summaries are in
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

DOCARCH-000 through DOCARCH-003 are complete. The Architect Takeover Protocol
is canonical after merged PR #50. DOCARCH-004 remains open but is paused;
DOCARCH-004C v1 / PR #51 remains frozen draft historical evidence,
DOCARCH-004C Attempt 5 is not authorized, and DOCARCH-004D is not active.

OPS-002 is `COMPLETE — EXTERNAL STAGING DEPLOYED AND VALIDATED` as of
2026-09-13. Public Arena external staging is online at
[game.burningforge.dev](https://game.burningforge.dev), with server origin
`https://game-server.burningforge.dev`. Release
`4a774354859c036d45666496539c2fc3c24b9f1c` completed the frozen deployment
controller sequence through `DEPLOYMENT_COMPLETE`; health/readiness and the
one external hash-bound smoke passed (18/18, including reconnect continuity).
The server-authoritative arena is now proven through the public TLS edge.
Exact immutable image digests and execution provenance are recorded in the
[OPS-002 completion record](docs/tasks/ops-002-public-arena-external-staging-deployment.md#2026-09-13--phase-b-execution-closure).

This is non-persistent Public Arena staging, not production or campaign MVP.
The deployed server/world state remains in-memory and may reset on restart.
Durable world/guest identity and writer fencing are implemented and merged in
the repository (PERSIST-002); they are not deployed. Campaign
systems remain future incremental work. MOBILE-001A/B/C are merged; MOBILE-001C
entered main through PR #84. The human PA confirms its bounded client-only
staging update and successful real-phone usability test. These are supplied
observations, not fresh deployment verification in PERSIST-001. Original OPS-002
release evidence above remains historical server/deployment baseline.

Wave 2 persistence/identity is the active program. PERSIST-001 selects PostgreSQL,
explicit pg repositories, durable guest UUID/credential, world/faction membership
and fenced session/world lifecycle. See
[Persistent World and Identity Architecture](docs/architecture/PERSISTENT_WORLD_IDENTITY_ARCHITECTURE.md).
The registry now has 39 accepted decisions under explicit delegated PA authority;
independent Architecture/Security review APPROVED and PERSIST-001 acceptance is
complete. PERSIST-001 and PERSIST-002 are MERGED / CLOSED; PERSIST002-NET-02 is
also MERGED / CLOSED. PERSIST002-ROLLOUT-01 is MERGED / CLOSED through PR #92:
repository rollout readiness is complete, including the persistent v3 contract,
immutable role-scoped DB operations, isolated restore rehearsal, bounded rollout
evidence and operator procedure. Persistence remains NOT DEPLOYED; public
persistence rollout remains BLOCKED and deployment NOT AUTHORIZED.
[PERSIST002-ROLLOUT-02](docs/tasks/persist-002-rollout-02-deployment-go-preparation.md)
is OPEN; G1 is IMPLEMENTED / REVIEW PENDING. Its
[packet/procedure specification](docs/ops/persist-002-deployment-go-packet.md)
separates a bounded read-only survey, Publication GO, immutable publication
evidence, final Deployment-GO preparation and PA GO/NO-GO. A separate ROLLOUT-03
owns execution; preparation completion grants no deployment authority. Publication
targets exact current main at Decision A, not the G1 baseline. The first rollout
requires operator-only edge-first maintenance, final peer/proof evidence,
stop-and-preserve recovery and two protected backup/full-rehearsal checkpoints.
After G1 review, PA disposition and human merge, request bounded G2 read-only
provider/host survey authorization; G1 grants neither survey nor either GO. Use
[CURRENT](docs/handoffs/CURRENT.md) for exact task/review state and deferred mobile
UX. Local GameScene remains preserved non-authoritative prototype material.

DOCARCH-005 — Role and Model Portability remains deferred. Use
[CURRENT](docs/handoffs/CURRENT.md) as the live operational source.

## Known deferred work

- Branch protection and possible CI-004 remain dedicated CI work.
- AGENT-004 and detailed role/model portability remain deferred to DOCARCH-005.
- Persistence rollout awaits a separate Deployment-GO preparation/authorization step and live acceptance evidence; repository readiness is MERGED / CLOSED. Broad accounts and campaign systems remain deferred.
- Exact unresolved balance parameters remain outside the accepted mechanics until separately approved.

## Safe resumption

For a cold Product Architect takeover, read this file first and then follow
`docs/agents/ARCHITECT_TAKEOVER_PROTOCOL.md`; it owns the complete recovery
sequence, freshness checks, conflict handling, and success criteria.

For normal bounded-task execution with a fresh handoff, use `AGENTS.md`,
`docs/handoffs/CURRENT.md`, and the task named there. When sources conflict or
omit required intent, stop instead of inferring a decision from implementation,
historical prose, or chat memory.
