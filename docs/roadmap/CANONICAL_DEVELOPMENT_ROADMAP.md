# BurningSpace Canonical Development Roadmap

- Status: Canonical roadmap after human merge
- Program: DOCARCH-003
- Baseline: merged DOCARCH-003A / PR #47
- Accepted decisions: 35
- Runtime changes in this document: none

Accepted decisions remain canonical in their domains. This roadmap sequences
delivery but does not replace decision records. Implementation observations are
point-in-time evidence rather than automatic architecture or product authority.
Unresolved product or architecture choices are decision gates, and proposed
future task identifiers are non-canonical until separately accepted. Roadmap
status may be updated only through bounded tasks.

## 1. Purpose

This roadmap defines:

- delivery order and dependency order;
- the MVP boundary;
- the minimum credible campaign vertical slice;
- decision gates that must be resolved before dependent implementation;
- validation expectations and completion criteria;
- deferred programs and post-MVP domains;
- transition to DOCARCH-004 and DOCARCH-005.

It assigns no dates or effort estimates. It also does not create implementation
tasks, select unresolved technologies, or introduce mechanics or balance values.

## 2. Current verified baseline

The implemented foundation is a TypeScript npm-workspaces monorepo with a
Phaser/Vite browser client and a Node.js/TypeScript/Colyseus server. The current
multiplayer arena path provides client/server connection and profile flow,
server-authoritative movement and state, combat, and basic death with timed
respawn.

Major partial or absent areas are persistence, durable identity/session state,
reconnect, territorial state, outposts and authoritative turret lifecycle,
production integration of outpost respawn, accepted ship switching, room-level
multiplayer tests, deployment, observability, and production operational
tooling.

The full 28-capability evidence matrix and its confidence assessments are in
the [DOCARCH-003 readiness baseline](DOCARCH-003_READINESS_BASELINE.md). This
summary does not replace that point-in-time evidence.

## 3. Roadmap interpretation rules

- Each wave has entry prerequisites. Work may run in parallel only where those
  dependencies permit.
- A wave is complete only when every completion criterion is satisfied and the
  required review and evidence exist.
- Green build checks alone do not prove gameplay, authority, persistence, or
  operational completion.
- Implementation may not cross an unresolved decision gate.
- Accepted mechanics may not be silently reinterpreted during implementation.
- Multiplayer and campaign state transitions remain server-authoritative under
  `BS-ARCH-001`.
- The client may present, predict, and submit input or requests; it may not
  decide canonical outcomes.
- `packages/shared` remains the current canonical owner of broad runtime and
  profile contracts. `packages/protocol` remains the transitional public
  compatibility boundary with the accepted `protocol -> shared` direction.
- The local `GameScene` remains non-authoritative prototype material.
- Completion claims require bounded task evidence bound to the reviewed commit.

## 4. MVP boundary

MVP includes:

- authority and security hardening;
- a persistent-world foundation;
- a minimum identity/session model;
- reconnection and recovery sufficient for the campaign loop;
- sector ownership and capture;
- one operational outpost with exactly six governed sectors;
- accepted shield thresholds;
- minimum server-side creep participation required by `BS-MECH-019`;
- an outpost entity and structural lifecycle;
- turret destruction and restoration;
- outpost capture at zero structural HP;
- partial post-capture HP and resources;
- production integration of outpost-respawn eligibility;
- accepted ship-control and switching behavior;
- client UI needed to understand and exercise these systems;
- a deployable non-local environment;
- configuration, logging, diagnostics, and minimum operational readiness;
- stabilization and final security validation.

MVP excludes:

- full economy;
- full logistics;
- mining and resource-production loops;
- portals;
- advanced creep AI;
- broad post-MVP social systems;
- extensive production administration tooling beyond minimum operational
  needs.

No exact unresolved balance value is established by this boundary.

## 5. Minimum credible campaign vertical slice

The minimum credible campaign vertical slice contains:

- one operational outpost;
- exactly six governed sectors;
- two faction ownership states;
- the owner-relative signed sector-control meter;
- accepted shield activation and deactivation thresholds;
- the 4/6 post-outpost-capture governed-sector state;
- minimum creeps participating in sector control;
- destructible defensive turrets;
- accepted turret-restoration constraints;
- outpost capture at zero structural HP;
- a partial, vulnerable, and undersupplied post-capture state;
- integrated production outpost-respawn eligibility;
- accepted ship-control and switching behavior;
- server-authoritative state transitions;
- persistence across server restart;
- reconnect behavior sufficient to recover correct control and campaign state;
- room-level multiplayer tests;
- client visibility of sector, shield, outpost, capture, death, and respawn
  state.

The rule selecting the specific four retained sectors after capture remains
unresolved. Exact capture rates, player/creep weights, repair costs, repair
speeds, retained-resource formulas, and post-capture HP percentages remain
decision or balance gates. No implementation task may invent these values or
selection rules.

## 6. Delivery waves

### Wave 1 — Authority and Security Hardening

**Purpose**

Make the existing multiplayer foundation safe to extend.

**Entry prerequisites**

- DOCARCH-003 is merged and the roadmap is canonical.
- SEC-006 is authorized as a bounded implementation task before its work begins.
- Any unresolved security behavior required for implementation is approved
  through an appropriate decision or task.

**Included systems**

- SEC-006 and structural isolation of `TestBattleRoom`;
- an automated guard against production registration of diagnostic rooms;
- explicit WebSocket origin policy;
- profile-message rate limiting;
- reconnect/recovery architecture and minimum implementation for the current
  multiplayer foundation;
- room-level multi-client authority tests using the real production room path;
- production-room movement, combat, death, and respawn authority tests;
- explicit world and room lifecycle behavior;
- validation of human-only merge and required-evidence process;
- assessment of possible CI-004 branch-protection work.

**Explicit exclusions**

- persistence technology selection or durable campaign storage;
- territorial, outpost, economy, or post-MVP gameplay implementation;
- production deployment before the foundation is accepted.

**Governing accepted decisions**

- `BS-ARCH-001`, `BS-ARCH-003`, `BS-ARCH-004`, `BS-ARCH-005`;
- `BS-PROC-001`, `BS-PROC-002`, `BS-PROC-003`, `BS-PROC-004`;
- `CI-003-D1`.

**Required decision gates**

- reconnect ownership and recovery behavior for the current room/session model;
- production WebSocket origin policy;
- rate-limit policy and thresholds;
- whether branch-protection enforcement requires possible CI-004.

**Expected implementation outputs**

- isolated diagnostic infrastructure with a dedicated test-only entrypoint or
  equivalent structural boundary;
- production-registration guard;
- validated origin and profile-message controls;
- documented and implemented minimum reconnect/recovery behavior;
- production-room, multi-client authority regression coverage;
- explicit room/world lifecycle documentation and tests;
- branch-protection assessment evidence.

**Validation requirements**

- Exercise the actual production bootstrap and `BattleRoom`, not only a test
  subclass.
- Prove untrusted clients cannot set canonical movement, combat, death, respawn,
  or another player's state.
- Test expected and interrupted disconnect/reconnect paths.
- Verify diagnostic room registration fails closed outside test infrastructure.
- Complete required Architecture, Network, Security, QA, and gameplay-aware
  reviews for implementation tasks as routed by their change surfaces.

**Completion criteria**

- Diagnostic infrastructure cannot be production-registered accidentally.
- No `TestBattleRoom` authority bypass is reachable from production bootstrap.
- Authority tests use the real production room path and cover movement, combat,
  death, and respawn.
- Reconnect behavior is explicitly documented and tested.
- World and room lifecycle behavior is explicit.
- Security review accepts the foundation for Wave 2.
- Human-only merge and evidence requirements are verified; any needed CI-004
  scope is recorded without being silently implemented.

**Major risks**

- A diagnostic inheritance path can bypass production authority assumptions.
- Reconnect work can accidentally trust client-carried state.
- Superficial room tests can pass without exercising production registration.
- Process rules may remain unenforced if branch protection is assumed rather
  than verified.

**Unlocks**

- Wave 2 persistent-world and identity work.
- Safe observability foundations and deployment research that do not select or
  deploy the final topology.

### Wave 2 — Persistent World and Identity Foundation

**Purpose**

Create durable ownership and lifecycle foundations for campaign state.

**Entry prerequisites**

- Wave 1 is complete.
- Storage, identity/session, world-instance, migration, and consistency gates
  required for implementation are resolved.

**Included systems**

- persistence architecture;
- database/storage selection through a dedicated decision task;
- persistent world-state model;
- minimum player identity/session model;
- durable faction membership;
- restart recovery;
- lifecycle and migration strategy;
- secrets/configuration model sufficient for persistence;
- persistence validation and backup/recovery expectations;
- durable binding of reconnect behavior to identity and campaign ownership.

**Explicit exclusions**

- selecting a database in this roadmap;
- sector, outpost, turret, economy, logistics, mining, or portal mechanics;
- broad account features or social systems beyond MVP identity/session needs.

**Governing accepted decisions**

- `BS-ARCH-001`, `BS-ARCH-002`, `BS-ARCH-003`, `BS-ARCH-004`,
  `BS-ARCH-005`, `BS-ARCH-006`;
- `BS-PROC-001`, `BS-PROC-002`, `BS-PROC-004`.

**Required decision gates**

- storage/database technology;
- account and identity model;
- session ownership model;
- world-instance lifecycle model;
- migration and rollback strategy;
- persistence consistency boundary;
- reconnect ownership behavior for durable identities.

**Expected implementation outputs**

- approved persistence architecture and selected storage technology;
- versioned persistent world and identity/session schemas;
- durable faction membership and active-session ownership;
- restart, migration, rollback, backup, and recovery mechanisms;
- validated secret/configuration handling;
- persistence and recovery test suites.

**Validation requirements**

- Restart the server and prove canonical campaign state survives.
- Test identity/session uniqueness, ownership, disconnect, reconnect, and
  concurrent-session behavior.
- Test schema migration, failed migration, rollback, backup, and restore paths.
- Confirm clients cannot author or replace persisted canonical state.
- Bind security, architecture, network, QA, and persistence review evidence to
  final implementation commits.

**Completion criteria**

- Campaign state survives server restart.
- Player identity can be associated with durable campaign participation and
  faction membership.
- Reconnect cannot duplicate or orphan active state.
- Persistence, migration, backup, and recovery tests exist and pass.
- Failure and recovery behavior is documented and tested.
- Secrets and configuration needed by storage are not committed or exposed.

**Major risks**

- Choosing storage before defining consistency and recovery requirements.
- Binding transient Colyseus sessions directly to durable identity.
- Schema changes without rollback or recovery evidence.
- Expanding campaign entities before lifecycle ownership is stable.

**Unlocks**

- Wave 3 authoritative, persistent territorial state.
- Persistent observability and operational evidence tied to world lifecycle.

### Wave 3 — Territorial Core

**Purpose**

Implement accepted sector-control and governed-sector mechanics on the durable
foundation.

**Entry prerequisites**

- Wave 2 is complete.
- Capture-rate, player/creep-weight, minimum-creep-participation, and retained
  four-sector selection gates are resolved.
- Authoritative sector contracts and persistence ownership are ready for
  coordinated server/client work.

**Included systems**

- faction-owned initial sectors with no neutral initial state;
- attacks against any enemy sector without an adjacency requirement;
- the defensive-turret destruction prerequisite for sector capture;
- owner-relative signed sector-control meter;
- ownership transition at -50 and retention at -49 or zero;
- +50 from the new owner's perspective after capture;
- consolidation toward +100 through the same control mechanic;
- exactly six governed sectors per outpost;
- shield active at 3/6 or more and inactive at 2/6 or fewer;
- the 4/6 post-outpost-capture state;
- minimum server-side creep participation required by `BS-MECH-019`;
- server-authoritative and persistent sector state;
- client representation needed for testing.

**Explicit exclusions**

- advanced creep AI;
- full economy, logistics, mining, and portals;
- outpost structural capture and full infrastructure lifecycle, which belong to
  Wave 4;
- any neutral-sector behavior or adjacency restriction.

**Governing accepted decisions**

- `BS-ARCH-001`, `BS-ARCH-004`, `BS-ARCH-005`, `BS-ARCH-006`;
- `BS-MECH-016`, `BS-MECH-017`, `BS-MECH-018`, `BS-MECH-019`,
  `BS-MECH-020`, `BS-MECH-021`, `BS-MECH-022`, `BS-MECH-023`,
  `BS-MECH-028`.

**Required decision gates**

- numeric sector capture and restoration rates;
- player and creep capture weights;
- exact minimum creep spawning and control-participation rules;
- selection rule for the four retained sectors after outpost capture.

**Expected implementation outputs**

- persistent authoritative sector, governance, control, and shield models;
- validated capture-pressure and ownership-transition systems;
- minimum server-side creep capture participation;
- protocol/shared contracts and client test representation updated through an
  approved coordinated migration;
- deterministic pure-function and room-level multi-client tests.

**Validation requirements**

- Deterministic multi-client tests cover attackers, defenders, creeps, ties,
  capture, and consolidation.
- Boundary tests cover +100, +50, zero, -49, and -50 without inventing new
  thresholds.
- Tests prove any enemy sector may be attacked without adjacency.
- Shield transitions are verified at accepted 3/6 and 2/6 boundaries.
- Restart tests preserve ownership, control, governance, and shield state.
- Client views are checked against authoritative snapshots, not local results.

**Completion criteria**

- Deterministic multi-client sector tests pass.
- Sector state survives restart without duplication or drift.
- Tie behavior stalls progress; defenders restore while attackers reduce it.
- Capture and consolidation match the owner-relative signed-meter decision.
- Shield transitions match accepted thresholds.
- No adjacency rule or neutral initial behavior is introduced.
- Minimum creep participation is authoritative and tested.
- The four-sector selection follows a separately approved rule.

**Major risks**

- Accidentally reviving historical 50/80/100 threshold semantics.
- Treating client visualization as sector authority.
- Inventing creep weights or the four-sector selection in implementation.
- Persisted control values becoming inconsistent with ownership perspective.

**Unlocks**

- Wave 4 outpost capture, turret restoration, respawn, and ship-control loop.
- Stable server contracts for dependent Wave 5 campaign UX prototypes.

### Wave 4 — Outpost and Infrastructure Loop

**Purpose**

Complete the accepted campaign capture loop and make the full vertical slice
playable end to end.

**Entry prerequisites**

- Wave 3 is complete.
- Repair speed/cost, resource sufficiency, post-capture condition, and any
  exact eligibility-data-model gates are resolved.
- Persistent sector/governance/shield state is stable.

**Included systems**

- outpost entities, structural HP, and ownership;
- turret destruction;
- turret restoration constrained by same-faction responsible outpost;
- automatic repair only while the responsible outpost is undamaged and
  sufficiently resourced;
- outpost capture at zero structural HP with immediate ownership switch;
- partial post-capture HP and resources;
- vulnerable and undersupplied post-capture state;
- production integration of outpost respawn eligibility;
- accepted exactly-six-sector, exact-stabilization, and 120-second combat-lock
  respawn semantics;
- revalidation and permitted adaptation of `outpostRespawn.ts` without changing
  accepted semantics;
- accepted ship-control and switching behavior;
- main-base docking to end control, with the docked ship preserved in-world;
- immediate eligible remote control after valid main-base return;
- direct control of eligible allied ships docked at allied outposts while in
  the no-active-ship state;
- server-authoritative tests and persistent state.

**Explicit exclusions**

- sector capture directly restoring turrets;
- an additional outpost capture meter or threshold;
- outpost docking as a way to end active ship control;
- full economy/logistics, mining, portals, or advanced creep AI;
- invented active-combat restrictions for turret restoration.

**Governing accepted decisions**

- `BS-ARCH-001`, `BS-ARCH-004`, `BS-ARCH-005`, `BS-ARCH-006`;
- `BS-MECH-005`, `BS-MECH-006`, `BS-MECH-013`, `BS-MECH-014`,
  `BS-MECH-015`, `BS-MECH-018`, `BS-MECH-021`, `BS-MECH-022`,
  `BS-MECH-023`, `BS-MECH-024`, `BS-MECH-025`, `BS-MECH-026`,
  `BS-MECH-027`, `BS-MECH-028`;
- `GAME-001-D1` through `GAME-001-D5`.

**Required decision gates**

- turret repair speed and cost;
- minimum resource sufficiency model needed by turret repair and outpost state;
- post-capture structural-HP percentage;
- post-capture retained-resource formula;
- any unresolved exact eligibility data model required to connect governed
  sector, combat-lock, and outpost state.

**Expected implementation outputs**

- persistent authoritative outpost, turret, damage, capture, repair, resource,
  respawn, docking, and ship-control state;
- integrated respawn eligibility on the production room/world path;
- coordinated contracts and minimum client test surfaces;
- end-to-end, multi-client, persistence, reconnect, and authority tests for the
  vertical slice.

**Validation requirements**

- Exercise sector pressure through turret destruction, sector capture, shield
  transition, outpost damage/capture, 4/6 transfer, recovery, and counterplay.
- Verify sector capture never directly restores turrets.
- Verify repair requires the accepted faction, outpost-condition, and resource
  conditions without an invented combat gate.
- Re-run accepted respawn boundary cases against real production state,
  including exactly six, exact stabilization, combat-lock equality, and shield
  exclusion.
- Test all accepted ship-control transitions, invalid switches, disconnects,
  reconnects, and restart recovery.

**Completion criteria**

- The full vertical slice is playable end to end.
- Outpost capture at zero structural HP switches ownership immediately and
  drives the approved 4/6 governed-sector state.
- Shield state follows accepted thresholds.
- Sector capture does not directly restore turrets.
- Production runtime enforces outpost-respawn eligibility.
- Ship switching matches `BS-MECH-013` through `BS-MECH-015`.
- Persistence and reconnect preserve correct ownership, docking, active control,
  combat lock, respawn, turret, and outpost state.
- No unresolved value was selected inside implementation without approval.

**Major risks**

- Treating the existing respawn helper as immutable architecture instead of
  revalidating it against live state.
- Smuggling a partial economy into the minimum resource sufficiency model.
- Losing or duplicating controlled ships during reconnect/restart.
- Applying sector-control semantics to outpost structural capture.

**Unlocks**

- Wave 5 completion of player-facing campaign and operational surfaces.
- A complete server-side MVP gameplay loop ready for integrated deployment.

### Wave 5 — MVP Client and Operational Surface

**Purpose**

Make the implemented server systems understandable, usable, observable, and
deployable outside a local development environment.

**Entry prerequisites**

- Wave 2 persistence and identity contracts are stable.
- Waves 3 and 4 server systems exist before dependent UX is considered
  complete.
- Deployment-topology and minimum administrative-access gates are resolved.

**Included systems**

- sector ownership and signed control-meter UI;
- governed-sector and shield UI;
- outpost HP, ownership, and status UI;
- turret state UI;
- respawn-eligibility feedback;
- ship-switching UI;
- reconnect, connection, and failure-state UX;
- minimum server/world selection or connection configuration;
- deployment packaging and a non-local environment;
- environment and secret handling;
- structured logging;
- health and readiness diagnostics;
- minimum operational documentation;
- minimum administrative controls required to operate the MVP safely.

**Explicit exclusions**

- client authority over campaign outcomes;
- local `GameScene` behavior as production implementation;
- extensive administration, moderation, social, analytics, or live-operations
  suites;
- full economy/logistics, mining, portals, and advanced creep AI.

**Governing accepted decisions**

- `BS-ARCH-001`, `BS-ARCH-003`, `BS-ARCH-004`, `BS-ARCH-005`,
  `BS-ARCH-006`, `BS-ARCH-007`;
- all accepted mechanics exercised by the vertical slice;
- `BS-PROC-001`, `BS-PROC-004`, `CI-003-D1`.

**Required decision gates**

- deployment topology;
- production environment and secret-ownership model;
- minimum administrative-control scope and authorization boundary;
- any user-facing representation that would otherwise reinterpret accepted
  mechanics.

**Expected implementation outputs**

- authoritative-state-driven campaign UI and recovery UX;
- deployable client/server packaging and environment configuration;
- structured logs and health/readiness signals;
- minimum operational documentation and safe administrative controls;
- deployment and operational validation evidence.

**Validation requirements**

- Deploy to a non-local environment and exercise the complete vertical slice.
- Trace each displayed sector, shield, turret, outpost, respawn, and ship-control
  state to an authoritative server source.
- Test connection, reconnect, persistence, and capture failure states for clear
  player feedback.
- Verify secret handling, administrative authorization, logging usefulness,
  readiness behavior, and recovery documentation.
- Confirm the local prototype cannot be mistaken for production authority.

**Completion criteria**

- Non-local deployment succeeds.
- Required campaign and recovery state is visible and understandable to players.
- Critical failure states are understandable and actionable.
- Logs can diagnose connection, authority, persistence, and capture failures.
- Health/readiness diagnostics distinguish process health from world readiness.
- Minimum operations can be performed safely without exposing broad debug
  authority.
- No local `GameScene` prototype behavior is treated as production authority.

**Major risks**

- UX work racing ahead of stable authoritative contracts.
- Logs exposing secrets or identity data.
- Administrative shortcuts recreating diagnostic authority bypasses.
- A deployment succeeding technically while persistence or recovery is unsafe.

**Unlocks**

- Wave 6 integrated MVP stabilization and release-candidate work.

### Wave 6 — MVP Stabilization

**Purpose**

Turn the integrated campaign vertical slice into a release candidate.

**Entry prerequisites**

- Waves 1 through 5 satisfy their completion criteria.
- Required numeric tuning decisions are approved before values become
  authoritative.
- A deployable non-local MVP environment and operational evidence exist.

**Included systems**

- integration of the accepted balance boundary;
- replacement or retirement of stale placeholder balance constants;
- decision-gated numeric tuning;
- multiplayer soak tests;
- persistence, restart, and reconnect stress tests;
- final security review;
- deployment validation;
- operational runbook;
- regression coverage;
- client and server performance review;
- explicit release criteria and known limitations.

**Explicit exclusions**

- silent adoption of historical balance values;
- full economy/logistics, mining, portals, advanced creep AI, or broader social
  scope;
- automatic release or merge authority.

**Governing accepted decisions**

- `BS-ARCH-001` through `BS-ARCH-007` as applicable;
- all accepted mechanics implemented by the MVP;
- `BS-PROC-001`, `BS-PROC-002`, `BS-PROC-004`, `CI-003-D1`.

**Required decision gates**

- exact MVP tuning values not already established by accepted decisions;
- release-blocking performance and capacity thresholds;
- disposition of each stale or historical placeholder constant;
- release acceptance after required evidence is complete.

**Expected implementation outputs**

- integrated authoritative balance/configuration sources;
- resolved or removed stale placeholders;
- soak, stress, security, recovery, deployment, and performance evidence;
- operational runbook, release criteria, and known-limitations record;
- a Product Architect-reviewed MVP completion package.

**Validation requirements**

- Run representative multi-client soak and campaign-state-transition tests.
- Stress restart, persistence, reconnect, and active-control recovery.
- Re-run authority and security regressions against final deployed packaging.
- Verify every active balance value has approved authority and an active
  consumer.
- Validate runbook procedures and failure recovery in the non-local environment.

**Completion criteria**

- All MVP systems pass their wave completion criteria.
- No unresolved blocking security issue remains.
- No stale placeholder constant is silently authoritative.
- Persistence and recovery tests pass.
- Authority tests cover campaign state transitions.
- Deployment and operational runbook validation pass.
- Product Architect accepts MVP scope completion.
- The human release decision remains explicit.

**Major risks**

- Treating a green build as release readiness.
- Tuning against prototype or historical constants.
- Discovering persistence and reconnect failures only under soak load.
- Allowing release pressure to bypass security or evidence gates.

**Unlocks**

- An explicit human MVP release decision.
- Product Architect consideration of Wave 7 post-MVP authorization.

### Wave 7 — Post-MVP Expansion

**Purpose**

Sequence explicitly deferred systems only after MVP completion and separate
Product Architect authorization.

**Entry prerequisites**

- A human MVP release decision has occurred.
- The Product Architect explicitly authorizes post-MVP planning.
- Each domain's mechanics, architecture, and task scope are decided before
  implementation.

**Included systems**

- expanded creeps and NPC AI;
- full economy;
- resources and mining;
- logistics;
- portals;
- broader social systems;
- expanded administration and moderation;
- additional campaign breadth;
- advanced live operations.

**Explicit exclusions**

- treating any listed domain as part of the current MVP;
- assuming the active design summary establishes exact mechanics;
- assigning canonical task IDs or selecting mechanics in this roadmap.

**Governing accepted decisions**

- `BS-ARCH-001` through `BS-ARCH-007` where applicable;
- current accepted mechanics only where their domains apply;
- `BS-PROC-001`, `BS-PROC-002`, `BS-PROC-004`.

**Required decision gates**

- dedicated Product Architect decisions for each authorized domain;
- exact economy, resource, mining, logistics, portal, advanced AI, social,
  administration, campaign-breadth, and live-operations boundaries;
- architecture, persistence, security, balance, and operational implications of
  each expansion.

**Expected implementation outputs**

- separately accepted decisions and bounded tasks for authorized domains;
- dependency-aware implementation and review evidence;
- roadmap updates made only through approved bounded work.

**Validation requirements**

- Validate each domain against its future accepted decisions and task criteria.
- Preserve server authority, persistence safety, security review, and final-head
  evidence requirements.
- Prove post-MVP additions do not regress the released MVP loop.

**Completion criteria**

- No single global completion condition is established here.
- Each authorized domain completes only under its future accepted scope and
  evidence.
- The roadmap is updated through bounded tasks as expansion programs are
  approved or superseded.

**Major risks**

- Pulling deferred economy or AI scope into MVP stabilization.
- Treating historical design prose as accepted mechanics.
- Expanding administration or live operations without corresponding security
  authority.

**Unlocks**

- Only the specific later domains authorized by the Product Architect. This
  roadmap creates no automatic post-MVP authorization.

These systems are not part of the current MVP, require dedicated Product
Architect decisions, and have no exact mechanics or accepted task IDs created
by this roadmap.

## 7. Cross-cutting tracks

Cross-cutting work may advance across waves only where it does not bypass entry
prerequisites or unresolved decisions.

### Testing

- Pure-function tests establish deterministic domain boundaries.
- Room-level tests exercise the production room and registration path.
- Multi-client authority tests verify canonical state and adversarial input.
- Persistence tests cover restart, migration, rollback, backup, and recovery.
- Reconnect tests cover ownership, duplication, orphaning, and active control.
- Security regression tests protect diagnostic, origin, rate-limit, identity,
  and administrative boundaries.
- Deployment and health checks validate packaging and readiness.
- Soak tests exercise long-running multiplayer and persistent campaign state.

### Security

- SEC-006 isolates production from diagnostic capability and adds an exposure
  guard.
- Production origin policy and profile-message rate limits are decided and
  tested before public deployment.
- Secrets remain outside committed configuration.
- Identity, persistence, reconnect, deployment, and administrative changes
  receive their required security review.
- Final MVP security review is a Wave 6 release gate.

### CI and merge governance

- `BS-PROC-001` preserves human-only merge authority.
- `BS-PROC-003` keeps durable governance roles independent of the current
  model, vendor, or adapter; DOCARCH-005 remains the detailed portability
  program.
- `BS-PROC-004` requires reviewer evidence bound to the reviewed final head.
- `CI-003-D1` governs trusted-base risk routing and fail-closed QA behavior.
- Possible CI-004 remains a separate, unapproved task label until its scope is
  accepted.
- Branch protection must be verified rather than inferred from process prose.
- Final-head checks and all task-required verdicts are mandatory before human
  merge.

### Persistence and migration

- Storage and consistency decisions precede persistence implementation.
- Every persistent schema change defines migration, rollback, backup, and
  recovery expectations.
- Restart/recovery testing begins in Wave 2 and continues through stabilization.
- Later campaign systems consume the established lifecycle rather than creating
  independent persistence paths.

### Documentation and authority

- Accepted decisions remain canonical in their domains.
- `CURRENT.md` remains the operational source for active work and exactly one
  next safe action.
- Roadmap status changes only through bounded tasks.
- Observed implementation cannot silently establish architecture, mechanics,
  balance, or roadmap authority.
- Review evidence and handoffs are updated at meaningful checkpoints.

### Balance

- `packages/balance` remains a retained but currently unused boundary until an
  approved integration task gives it active consumers.
- Unresolved values require dedicated balance or Product Architect decisions.
- Historical balance documents and stale placeholder constants remain
  non-authoritative.
- Accepted mechanics override conflicting historical values.

## 8. Consolidated decision gates

| Gate | Required before wave | Question | Current authority | Blocking effect | Expected resolution vehicle |
|---|---|---|---|---|---|
| Reconnect ownership behavior | Wave 1 minimum; Wave 2 durable binding | What server-owned state and identity may a reconnecting client resume, and how are duplication and expiry handled? | DOCARCH-003 MVP scope requires reconnect; exact behavior is unresolved. | Blocks safe reconnect implementation and later durable session binding. | Dedicated Product Architect-approved architecture/security decision task. |
| WebSocket origin policy | Wave 1 | Which production origins are accepted and how does the server fail closed? | Security hardening scope is approved; exact policy is unresolved. | Blocks public exposure of the current WebSocket service. | Bounded security task with Security and Network review. |
| Profile-message rate limits | Wave 1 | What limits, windows, and enforcement behavior apply to profile messages? | Rate limiting is required by this roadmap; values are unresolved. | Blocks completion of the Wave 1 abuse-control boundary. | Bounded security/balance task with measured validation. |
| Branch protection / possible CI-004 | Wave 1 completion | Which GitHub protections are absent, and is dedicated CI-004 required to enforce governed merge gates? | `BS-PROC-001`, `BS-PROC-004`, and `CI-003-D1` govern process; technical protection is not established. | Blocks a claim that process requirements are technically enforced. | Read-only settings assessment followed by a separately accepted CI task if needed. |
| Storage/database technology | Wave 2 | Which storage technology satisfies world-state, consistency, recovery, and operational requirements? | No accepted storage selection exists. | Blocks persistence implementation. | Dedicated Product Architect-approved architecture decision task. |
| Identity/account/session model | Wave 2 | What durable identity exists, how is it authenticated, and how are sessions bound to it? | MVP requires minimum identity/session; exact model is unresolved. | Blocks durable player ownership and faction participation. | Dedicated Product Architect-approved identity/security decision task. |
| World-instance lifecycle | Wave 2 | How are worlds created, identified, started, stopped, recovered, and retired? | Server authority is accepted; lifecycle model is unresolved. | Blocks durable world ownership and restart recovery. | Dedicated architecture/product decision task. |
| Persistence migration strategy | Wave 2 | How are schema versions migrated, rolled back, backed up, and restored? | Recovery expectations are roadmap requirements; strategy is unresolved. | Blocks production-safe persistent schema evolution. | Persistence architecture decision plus bounded implementation task. |
| Persistence consistency boundary | Wave 2 | Which transitions are atomic and how are conflicts or partial failures recovered? | `BS-ARCH-001` requires server authority; transaction boundary is unresolved. | Blocks reliable campaign transitions and recovery tests. | Dedicated persistence architecture decision task. |
| Sector capture rates | Wave 3 | At what rates do attacker and defender pressure change the accepted signed meter? | `BS-MECH-019`/`020` define behavior but intentionally omit rates. | Blocks deterministic sector progression implementation. | Dedicated Product Architect-approved balance decision. |
| Player/creep weights | Wave 3 | What numeric capture weight does each eligible player or creep contribute? | `BS-MECH-019` includes both but omits numeric weights. | Blocks authoritative capture-pressure calculation. | Dedicated Product Architect-approved balance decision. |
| Minimum creep participation rules | Wave 3 | How are MVP creeps spawned, made eligible, assigned, and counted for sector control? | `BS-MECH-019` requires creep participation; exact rules are unresolved. | Blocks the minimum territorial MVP implementation. | Dedicated gameplay/architecture decision task. |
| Specific four-sector post-capture selection | Wave 3 before Wave 4 integration | Which four of six governed sectors transfer after outpost capture? | `BS-MECH-023` fixes the count and explicitly leaves selection unresolved. | Blocks deterministic post-capture ownership transition. | Dedicated Product Architect gameplay decision task. |
| Turret repair speed and cost | Wave 4 | How quickly and at what cost are eligible turrets restored? | `BS-MECH-025` explicitly leaves both as balance parameters. | Blocks authoritative turret restoration timing and spending. | Dedicated Product Architect-approved balance decision. |
| Resource sufficiency model | Wave 4 | What minimum resource state supports turret repair and partial outpost state without implementing a full economy? | `BS-MECH-025` requires sufficient resources; the exact model is unresolved. | Blocks repair eligibility and persistent resource-state validation. | Narrow gameplay/architecture decision task scoped to MVP infrastructure. |
| Post-capture HP/resource formulas | Wave 4 | What partial HP percentage and retained-resource formula apply after capture? | `BS-MECH-027` requires partial values and explicitly leaves formulas unresolved. | Blocks deterministic outpost capture transition. | Dedicated Product Architect-approved balance decision. |
| Exact respawn integration data model | Wave 4 | How do governed-sector snapshots, combat-lock state, and outpost ownership feed the pure eligibility calculation? | `BS-MECH-005`/`006` and `GAME-001-D1` through `D5` govern semantics; live model is absent. | Blocks production integration without changing accepted meanings. | Bounded architecture/implementation task with gameplay and network review. |
| Deployment topology | Wave 5 | Where and how are client, server, storage, networking, and secrets deployed? | Non-local deployment is in MVP; no topology is selected. | Blocks deployment packaging and operational validation. | Dedicated Product Architect-approved deployment architecture decision task. |
| Minimum administrative authorization | Wave 5 | Which operational actions are required and who may perform them safely? | Minimum operations are in MVP; exact controls are unresolved. | Blocks safe production administrative tooling. | Dedicated operations/security decision task. |
| MVP tuning and placeholder disposition | Wave 6 | Which approved values replace or retire every active historical or embedded placeholder? | `BS-ARCH-006` preserves the boundary; historical values are non-authoritative. | Blocks release-candidate balance authority. | Dedicated balance decisions and bounded migration tasks. |
| Post-MVP economy/logistics/portal mechanics | Wave 7 | What exact mechanics, boundaries, and dependencies apply to each deferred domain? | No accepted exact mechanics exist for these deferred domains. | Blocks any implementation of those domains. | Separate Product Architect decisions and bounded tasks per domain. |

The table records blockers; it does not resolve them or assign canonical IDs to
unnamed future work.

## 9. Roadmap status model

Roadmap items use these delivery statuses:

- `NOT STARTED`
- `DECISION GATED`
- `READY`
- `ACTIVE`
- `BLOCKED`
- `REVIEW`
- `COMPLETE`
- `DEFERRED`
- `SUPERSEDED`

These are roadmap delivery statuses, not decision-record statuses. Only bounded
task evidence may change an item's status. A wave cannot be `COMPLETE` while a
blocking criterion remains unmet. `CURRENT.md` identifies active work and
exactly one next safe action; this roadmap may summarize status but does not
replace `CURRENT.md` operationally.

Initial status after this roadmap is human-merged:

| Wave | Initial status | Reason |
|---|---|---|
| Wave 1 | `READY` | It is the next delivery wave, but no implementation has begun. |
| Wave 2 | `DECISION GATED` | Storage, identity, lifecycle, migration, and consistency choices are unresolved. |
| Wave 3 | `DECISION GATED` | Capture, creep, and four-sector selection gates are unresolved and Wave 2 is incomplete. |
| Wave 4 | `DECISION GATED` | Infrastructure balance/data-model gates are unresolved and Wave 3 is incomplete. |
| Wave 5 | `NOT STARTED` | It depends on server systems and a deployment-topology decision. |
| Wave 6 | `NOT STARTED` | It depends on integration of Waves 1 through 5. |
| Wave 7 | `DEFERRED` | It requires MVP completion and explicit post-MVP authorization. |

Wave 1 is not `ACTIVE` or `COMPLETE` merely because the roadmap exists.

## 10. Dependency view

```text
Wave 1
  ↓
Wave 2
  ↓
Wave 3
  ↓
Wave 4
  ↓
Wave 5
  ↓
Wave 6
  ↓
MVP release decision

Wave 7 begins only after explicit post-MVP authorization.
```

Safe parallelism may include deployment research during earlier waves, client
UX prototypes after server contracts stabilize, and observability foundations
during Waves 1–2. Research and prototypes do not satisfy completion criteria and
must not imply that dependent implementation is complete before prerequisite
authority and state exist.

## 11. Dedicated deferred programs

### DOCARCH-004 — Architect Takeover Protocol

DOCARCH-004 is the reserved next repository program after DOCARCH-003 closes.
Its required future scope is:

- cold-start reading sequence;
- authority recovery;
- stale `CURRENT` recovery;
- active-task discovery;
- sole-next-action recovery;
- forbidden actions;
- merge-authority verification;
- takeover success criteria;
- cold takeover drill.

This roadmap does not implement DOCARCH-004.

### DOCARCH-005 — Role and Model Portability

DOCARCH-005 remains reserved after DOCARCH-004. Its required future scope is:

- vendor/model-independent roles;
- minimum capability requirements;
- implementer/reviewer separation;
- standardized evidence;
- fallback routing;
- model replacement;
- prompt/adapter portability;
- AGENT-004 recovery or creation.

Its role-portability direction remains subject to `BS-PROC-002` and
`BS-PROC-003`; this roadmap does not reinterpret those records.

This roadmap does not implement DOCARCH-005.

### Other dedicated work

Established names:

- `SEC-006`;
- possible `CI-004`.

Non-canonical future work domains include persistence architecture,
identity/authentication, deployment, observability, balance migration,
dependency-boundary enforcement, documentation linting, and generated indexes.
This roadmap assigns no canonical IDs to unnamed work.

## 12. DOCARCH-003 closure and transition

This file is a canonical-roadmap candidate until the DOCARCH-003B pull request
completes required conformance review, Product Architect approval evidence,
Claude QA evidence, final-head checks, and human merge. DOCARCH-003 remains open
until that merge.

After human merge, DOCARCH-003 closes, this roadmap becomes canonical, Wave 1
is `READY`, and DOCARCH-004 becomes the next repository program for readiness
assessment. DOCARCH-005 remains reserved after DOCARCH-004. Human-only merge
and release authority remain unchanged.
