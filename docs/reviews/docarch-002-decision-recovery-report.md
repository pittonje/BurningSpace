# DOCARCH-002A — Decision Recovery Report

## Purpose

Inventory decision knowledge needed for the BurningSpace documentation migration, distinguish authority from evidence and proposed identifiers, expose repository conflicts, and present the Product Architect approval matrix required before decision instance files are created.

## Authority and methodology

This report applies `docs/GOVERNANCE.md` and uses two bounded evidence sources:

1. the controlled Product Architect inventory export supplied for DOCARCH-002A;
2. repository paths and symbols named by that inventory.

Product Architect-confirmed meaning is recorded as current authority. Proposed IDs remain unapproved. Repository-explicit statements are candidates until the Product Architect confirms their canonical wording or status. Observed implementation is evidence only and is not automatically accepted design.

Where current Product Architect direction conflicts with repository text or code, the Product Architect direction is the accepted direction and the repository evidence is potentially stale. DOCARCH-002A does not edit, supersede, or reconcile either source. No decision status is changed in the registry and no decision instance file is created.

## Existing decision references

| Reference | Recovered meaning or role | Authority classification | Evidence | Required next action |
|---|---|---|---|---|
| `BS-MECH-005` | Outpost respawn requires all six governed sectors to belong to the same faction and a separate 120-second combat lock. | Repository-explicit accepted candidate | `docs/tasks/game-001-outpost-respawn-eligibility.md`; `apps/server/src/systems/outpostRespawn.ts` | Product Architect confirms full canonical wording before DOCARCH-002B. |
| `BS-MECH-006` | Every governed sector must be exactly 100% stabilized for outpost respawn eligibility. | Repository-explicit accepted candidate | Same GAME-001 task and server system | Product Architect confirms full canonical wording before DOCARCH-002B. |
| `GAME-001-D1` | Pure server-side calculation only. | Repository-explicit task-local candidate | GAME-001 task; AGENT-004 results; Preparation Agent guide | Product Architect confirms expanded per-ID wording. |
| `GAME-001-D2` | Strict cardinality: exactly six governed sectors. | Repository-explicit task-local candidate | Same sources | Product Architect confirms expanded per-ID wording. |
| `GAME-001-D3` | Exact stabilization: every governed sector equals 100%. | Repository-explicit task-local candidate | Same sources | Product Architect confirms expanded per-ID wording. |
| `GAME-001-D4` | Combat lock is active while `nowMs < combatLockUntilMs`; equality means expired. | Repository-explicit task-local candidate | Same sources; `isOutpostRespawnEligible` | Product Architect confirms expanded per-ID wording. |
| `GAME-001-D5` | Shield state is not an input to respawn eligibility. | Repository-explicit task-local candidate | Same sources | Product Architect confirms expanded per-ID wording. |
| `BS-MECH-013` | Remote control of an eligible allied ship at an allied outpost is available only from the no-active-ship state and does not permit unrestricted switching while a ship is active. | Product Architect confirmed | Controlled Product Architect export | Migrate in DOCARCH-002B after file review. |
| `BS-MECH-014` | Ending current ship control and becoming eligible to switch requires docking the current ship at the faction main base; outpost docking is insufficient. | Product Architect confirmed | Controlled Product Architect export | Migrate in DOCARCH-002B with unresolved predecessor noted. |
| `BS-MECH-015` | After valid main-base return and entry into the no-active-ship state, another eligible ship may be controlled immediately without added delay. | Product Architect confirmed | Controlled Product Architect export | Migrate in DOCARCH-002B after file review. |
| CI-003 accepted architecture | Trusted-base, fail-closed deterministic risk routing with bounded outputs, complete-pipeline skip, stale-run protection, reviewed-commit binding, and human merge authority. | Repository-explicit accepted architecture candidate; proposed ID not approved | CI-003 task and Phase A/B evidence | Product Architect decides the `CI-003-D1` ID and status for DOCARCH-002C. |
| AGENT-004 operating guidance | Preparation Agent pilot evidence, provisional risk-based preparation guidance, repeatable metrics, and stop-without-invention behavior. | Repository operating guidance; not a decision instance | `docs/tasks/agent-004-preparation-agent-pilot-results.md`; `docs/agents/PREPARATION_AGENT_GUIDE.md` | Use as process evidence; do not promote without Product Architect status approval. |

The current outpost-respawn implementation exposes `OUTPOST_ADJACENT_SECTOR_COUNT`, `OUTPOST_RESPAWN_COMBAT_LOCK_MS`, `hasOutpostRespawnTerritorialEligibility`, and `isOutpostRespawnEligible`. It enforces exactly six same-faction sectors at exactly 100% and the exclusive lock boundary. This alignment is evidence, not independent decision authority.

## Product Architect-confirmed decisions

### Confirmed meaning with existing stable ID

| Stable ID | Confirmed statement | Authority status | Migration status |
|---|---|---|---|
| `BS-MECH-013` | From the no-active-ship state, a player may remotely control an eligible allied ship docked at an allied outpost under established eligibility rules; an active ship cannot be switched freely. | Product Architect confirmed | Pending DOCARCH-002B |
| `BS-MECH-014` | Current ship control may end only after main-base docking. The ship remains in-world, the player enters the no-active-ship state, and `BS-MECH-013` then applies. Outpost docking is insufficient. | Product Architect confirmed | Pending DOCARCH-002B |
| `BS-MECH-015` | After valid main-base return, another eligible ship may be controlled immediately; no cooldown, preparation timer, or role-change delay applies. Depends on `BS-MECH-013` and `BS-MECH-014`. | Product Architect confirmed | Pending DOCARCH-002B |

`BS-MECH-014` supersedes an unresolved prior allowance for switching at an outpost. The prior stable ID has not been recovered and must not be invented. Its future record may temporarily describe the unresolved predecessor in `Notes` until a controlled export identifies it.

### Confirmed meaning awaiting stable ID

The meanings below are Product Architect confirmed. Every displayed ID remains a proposal pending Product Architect approval; migration remains pending DOCARCH-002B or blocked as noted.

| Proposed ID | Confirmed meaning | ID status | Migration status |
|---|---|---|---|
| `BS-MECH-016` | All sectors start owned by one of two factions; no neutral starting sectors. | Pending Product Architect approval | Pending DOCARCH-002B |
| `BS-MECH-017` | Any enemy sector may be attacked; adjacency is not required. | Pending Product Architect approval | Pending DOCARCH-002B |
| `BS-MECH-018` | Sector capture becomes available only after defensive turrets are destroyed. Whether canonical wording says “all three sector turrets” still requires confirmation. | Pending Product Architect approval | Pending DOCARCH-002B after wording confirmation |
| `BS-MECH-019` | Players and creeps contribute capture weight; solo capture is allowed but impractical; ties stall; defenders restore and attackers reduce control. | Pending Product Architect approval | Pending DOCARCH-002B |
| `BS-MECH-020` | Owner-relative control runs to +100; capture occurs at -50, not at zero; the new owner starts at +50; consolidation uses the same mechanic with no timer. | Pending Product Architect approval | Conflict-blocked |
| `BS-MECH-021` | Each outpost governs exactly six sectors. | Pending Product Architect approval | Pending DOCARCH-002B |
| `BS-MECH-022` | Shield active at 3/6 or more and inactive at 2/6 or fewer. | Pending Product Architect approval | Pending DOCARCH-002B |
| `BS-MECH-023` | After outpost capture, the new owner starts with 4/6 sectors and an active shield; retaking two sectors disables it. | Pending Product Architect approval | Conflict-blocked |
| `BS-MECH-024` | Sector capture does not restore destroyed turrets. | Pending Product Architect approval | Pending DOCARCH-002B |
| `BS-MECH-025` | Turrets restore only for a same-faction responsible outpost, outside blocking active combat, and with required resources. | Pending Product Architect approval | Conflict-blocked |
| `BS-MECH-026` | Outpost capture occurs immediately at zero structural HP with no separate capture meter. | Pending Product Architect approval | Conflict-blocked |
| `BS-MECH-027` | A captured outpost retains partial HP and resources under rules not yet present in the repository, remaining vulnerable and undersupplied. | Pending Product Architect approval; parameters incomplete | Missing-content and conflict-blocked |
| `BS-MECH-028` | Sectors use control points; outposts use structural HP. | Pending Product Architect approval | Pending DOCARCH-002B |

### Repository-explicit accepted candidates

- `BS-MECH-005`, `BS-MECH-006`, and `GAME-001-D1–D5` have explicit task and implementation evidence but still require canonical wording confirmation.
- Proposed `BS-ARCH-001–007`, `BS-PROC-001–003`, and `CI-003-D1` derive from repository direction or operating rules but require Product Architect ID and status decisions before DOCARCH-002C.

### Implementation facts only

The following remain facts, not decisions: no persistence/database/account system currently exists; current manifests and imports; local drive and worktree paths; active branch names; and code behavior for which no Product Architect decision is established.

## Mechanics inventory

### Outpost respawn baseline

Product Architect-confirmed meaning aligns with `BS-MECH-005`, `BS-MECH-006`, `GAME-001-D1–D5`, and `apps/server/src/systems/outpostRespawn.ts`:

- exactly six governed sectors, all owned by the same faction;
- every sector exactly 100%; any loss or lower value disables eligibility immediately;
- 120-second combat lock;
- lock active only while `nowMs < combatLockUntilMs`; equality is expired;
- pure server calculation and no shield input.

The existing IDs are preserved, but repository-only full wording still requires Product Architect confirmation before migration.

### Ship-control baseline

`BS-MECH-013–015` are already Product Architect confirmed with existing stable IDs. Their future records require review before merge, not renewed approval of their exported meaning.

### Clean proposed mechanics set

The confirmed meanings currently clean enough for an ID/wording approval decision are proposed `BS-MECH-016–019`, `BS-MECH-021–022`, `BS-MECH-024`, and `BS-MECH-028`. `BS-MECH-018` additionally requires the “all three” wording decision.

Proposed `BS-MECH-020`, `BS-MECH-023`, `BS-MECH-025`, `BS-MECH-026`, and `BS-MECH-027` remain outside the clean migration set because their repository conflicts or missing parameters require separate follow-up.

## Architecture inventory

All identifiers in this section are unapproved proposals pending DOCARCH-002C.

| Proposed ID | Inventory statement | Classification | Evidence |
|---|---|---|---|
| `BS-ARCH-001` | Server-authoritative multiplayer model. | Repository-explicit normative direction | `docs/architecture/server-authoritative-model.md`; `AGENTS.md`; `PROJECT_CONTEXT.md` |
| `BS-ARCH-002` | npm-workspaces TypeScript monorepo; pnpm migration requires a dedicated task. | Implementation fact plus operating rule | `package.json`; `PROJECT_CONTEXT.md` |
| `BS-ARCH-003` | Retain Phaser/Vite client and Node.js/Colyseus server unless a dedicated accepted decision changes them. | Repository-explicit direction | `PROJECT_CONTEXT.md` |
| `BS-ARCH-004` | `packages/shared` currently canonically owns broad runtime contracts and the profile contract. | Transitional architecture | `PROJECT_CONTEXT.md`; package-boundary migration history |
| `BS-ARCH-005` | `packages/protocol` is a transitional public compatibility boundary depending on shared; shared must not depend on protocol. | Transitional architecture and dependency constraint | `docs/architecture/shared-dependency-map.md`; `packages/protocol/package.json` |
| `BS-ARCH-006` | Balance/config are future boundaries; balance currently stores accepted versioned MVP constants. | Future direction plus implementation fact | `PROJECT_CONTEXT.md`; shared dependency map |
| `BS-ARCH-007` | Preserve local `GameScene` as a non-authoritative reference, not multiplayer authority. | Repository operating rule | `PROJECT_CONTEXT.md`; server-authoritative model |

## Process and authority inventory

All proposed IDs remain unapproved.

| Proposed ID or source | Inventory statement | Classification | Next approval |
|---|---|---|---|
| `BS-PROC-001` | Human-only merge authority; agents do not merge pull requests. | Repository-explicit operating rule and accepted candidate | Approve ID and accepted status for DOCARCH-002C. |
| `BS-PROC-002` | Stable role boundaries separate Product Architect, Preparation Agent, Implementer, Test Architect, QA, and risk-routed specialists; reviewers do not edit reviewed implementation. | Repository-explicit operating rule | Approve ID, wording, and status. |
| `BS-PROC-003` | Codex is a current model/vendor assignment to the stable Implementer role, not the permanent role identity. | Product Architect direction requiring explicit confirmation | Confirm distinction, then approve ID/status. |
| `CI-003-D1` | Trusted-base, fail-closed deterministic reviewer routing with safe bounded outputs, complete conditional skip, stale-run and commit-binding protection, and human merge authority. | Repository-explicit accepted architecture candidate | Approve ID and accepted status. |
| AGENT-004 | Preparation pilot and provisional model-routing guidance with repeatable metrics and stop-without-invention behavior. | Operating guidance/evidence only | Decide later whether any portion warrants a stable process decision. |

## Preserved existing IDs

The following existing identifiers are preserved exactly and are not normalized:

- `BS-MECH-005`
- `BS-MECH-006`
- `GAME-001-D1`
- `GAME-001-D2`
- `GAME-001-D3`
- `GAME-001-D4`
- `GAME-001-D5`
- `BS-MECH-013`
- `BS-MECH-014`
- `BS-MECH-015`

## Proposed ID map

Every identifier below is unapproved and must not be used as a decision filename in DOCARCH-002A.

| Proposed IDs | Proposed subjects | Approval state |
|---|---|---|
| `BS-MECH-016–019` | Initial ownership; attack reach; turret prerequisite; capture weighting | Unapproved; pending Product Architect ID approval |
| `BS-MECH-020` | Signed owner-relative sector control | Unapproved; conflict-blocked |
| `BS-MECH-021–022` | Six governed sectors; shield threshold | Unapproved; pending Product Architect ID approval |
| `BS-MECH-023` | Post-capture 4/6 sector state | Unapproved; conflict-blocked |
| `BS-MECH-024` | No turret restoration on sector capture | Unapproved; pending Product Architect ID approval |
| `BS-MECH-025–027` | Turret restoration; zero-HP outpost capture; retained HP/resources | Unapproved; conflict or missing-content blocked |
| `BS-MECH-028` | Sector control points versus outpost structural HP | Unapproved; pending Product Architect ID approval |
| `BS-ARCH-001–007` | Server authority, workspace/frameworks, package boundaries, prototype preservation | Unapproved; pending DOCARCH-002C approval matrix |
| `BS-PROC-001–003` | Merge authority, role boundaries, model-to-role distinction | Unapproved; pending DOCARCH-002C approval matrix |
| `CI-003-D1` | Deterministic risk-based reviewer routing architecture | Unapproved; pending Product Architect ID/status approval |

## Conflict register

### C1 — Signed sector meter versus 50/80/100 thresholds

- Current Product Architect direction: owner-relative maximum `+100`; capture at `-50`; `-49` retains the defender; zero does not switch ownership; the new owner begins at `+50`; consolidation uses the same mechanic without an automatic timer.
- Conflicting repository evidence: `MVP_BALANCE_V0_1.sector.ownerSwitchControl=50`, `creepAdvanceControl=80`, and `stableControl=100`; `docs/design/balance-v0.1.md`; `docs/design/mvp-game-design.md`; `PROJECT_CONTEXT.md`.
- Authority interpretation: Product Architect export is accepted direction; repository baseline is potentially stale, not an equal alternative.
- Affected files/symbols: `packages/balance/src/mvp-balance-v0.1.ts` sector constants and the named design/context sections.
- Required future supersession: explicitly supersede the 50/80/100 accepted baseline.
- Required future implementation reconciliation: separately scoped balance/config and any consuming simulation/test changes.
- Migration status: blocked from decision-file creation until the supersession and implementation follow-up are scoped.

### C2 — Post-capture 4/6 state versus no automatic sector change

- Current Product Architect direction: captured outpost begins for the new owner with 4/6 governed sectors and an active shield; the former owner can retake two sectors to disable it.
- Conflicting repository evidence: `PROJECT_CONTEXT.md` states sectors do not automatically change owner after outpost capture.
- Authority interpretation: Product Architect export is accepted direction; the context baseline is potentially stale.
- Affected files/symbols: `PROJECT_CONTEXT.md` outpost shield/capture baseline; no current runtime capture implementation was established by this inventory.
- Required future supersession: explicitly supersede the no-automatic-sector-change statement.
- Required future implementation reconciliation: separately scope campaign/outpost sector-transition behavior and tests.
- Migration status: blocked from decision-file creation until the follow-up is scoped.

### C3 — Turret restoration conditions

- Current Product Architect direction: turrets restore only when the responsible outpost is same-faction, active combat does not block repair, and required resources exist. Sector capture itself does not restore destroyed turrets.
- Conflicting repository evidence: `PROJECT_CONTEXT.md` says turrets may be rebuilt only after all six adjacent sectors belong to the outpost owner.
- Authority interpretation: Product Architect export is accepted direction; the six-sector-only baseline is potentially stale.
- Affected files/symbols: `PROJECT_CONTEXT.md` resource priority and turret rebuild text; no current authoritative turret restoration implementation was established by this inventory.
- Required future supersession: replace the all-six condition with explicit same-faction/combat/resource rules while preserving the no-restoration-on-sector-capture rule.
- Required future implementation reconciliation: separately scope repair resources, combat gating, ownership validation, and tests.
- Migration status: blocked from decision-file creation until the follow-up is scoped.

### C4 — Zero-HP capture versus `captureHpPercent=50`

- Current Product Architect direction: an outpost changes ownership immediately at zero structural HP; there is no separate capture meter.
- Conflicting repository evidence: `MVP_BALANCE_V0_1.outpost.captureHpPercent=50`, `docs/design/balance-v0.1.md` capture at 50% HP, and `PROJECT_CONTEXT.md` describing 50% HP after capture.
- Authority interpretation: Product Architect export is accepted direction; the 50% capture baseline is potentially stale.
- Affected files/symbols: `packages/balance/src/mvp-balance-v0.1.ts` `captureHpPercent`; named balance and context documents.
- Required future supersession: explicitly supersede capture-at-50%-HP wording and clarify post-capture HP separately from the zero-HP trigger.
- Required future implementation reconciliation: separately scope balance removal/change, authoritative damage/capture transition, snapshots, and tests.
- Migration status: blocked from decision-file creation until the follow-up is scoped.

### C5 — Retained HP/resources after capture

- Current Product Architect direction: a captured outpost retains partial HP and resources under established rules and remains vulnerable and undersupplied.
- Conflicting repository evidence: no matching implementation rules exist; `PROJECT_CONTEXT.md` instead says the outpost receives 50% HP, old resources burn, and an emergency reserve is granted; `MVP_BALANCE_V0_1.outpost` contains `captureHpPercent=50` and `emergencyResources=500`.
- Authority interpretation: Product Architect export is accepted direction, while repository wording/values are potentially stale; exact retained amounts remain an unknown implementation parameter.
- Affected files/symbols: `PROJECT_CONTEXT.md`; `MVP_BALANCE_V0_1.outpost.captureHpPercent`; `MVP_BALANCE_V0_1.outpost.emergencyResources`; absent authoritative outpost-capture implementation.
- Required future supersession: define retained HP/resource semantics and explicitly supersede burn/emergency-reserve wording as applicable.
- Required future implementation reconciliation: separately scope canonical parameters, resource handling, capture state transition, persistence implications if any, and tests.
- Migration status: blocked from decision-file creation until the follow-up is scoped; no placeholder record is authorized.

## Missing decision references

The following ranges are not recovered:

- `BS-MECH-001–004`
- `BS-MECH-007–012`

They may exist in hidden historical context. Their absence must not be interpreted as intentional non-use. Do not fabricate records or create `unknown` placeholder files; a controlled Product Architect export is required.

The prior decision superseded by `BS-MECH-014` is also not recovered. Its stable ID must not be invented.

## Product Architect approval matrix

### 1. New stable ID approvals

| Approval question | Required decision | Target stage |
|---|---|---|
| Approve `BS-MECH-016–019`, `BS-MECH-021–022`, `BS-MECH-024`, and `BS-MECH-028` for their confirmed clean meanings? | Approve, revise mapping, or defer each ID. | DOCARCH-002B |
| Reserve or defer `BS-MECH-020`, `BS-MECH-023`, `BS-MECH-025–027` while conflicts remain blocked? | Decide whether IDs may be reserved without files or remain wholly unapproved. | Conflict follow-up / DOCARCH-002D |
| Approve `BS-ARCH-001–007` mappings? | Approve, revise, or reject each proposed ID. | DOCARCH-002C |
| Approve `BS-PROC-001–003` mappings? | Approve, revise, or reject each proposed ID. | DOCARCH-002C |
| Approve `CI-003-D1` as the stable ID for the routed-review architecture? | Approve, revise, or reject. | DOCARCH-002C |

### 2. Full wording confirmation for repository-only decisions

| Reference | Wording confirmation required |
|---|---|
| `BS-MECH-005` | Confirm that exactly six same-faction governed sectors plus the separate 120-second combat lock is the complete canonical statement. |
| `BS-MECH-006` | Confirm that every governed sector must equal exactly 100%, with any lower value disabling eligibility immediately. |
| `GAME-001-D1–D5` | Confirm the expanded per-ID wording recorded in Existing decision references, including the exclusive equality boundary and no-shield input. |
| Proposed `BS-MECH-018` | Confirm whether the canonical prerequisite explicitly requires all three defensive sector turrets. |

The exported meanings of `BS-MECH-013`, `BS-MECH-014`, and `BS-MECH-015` are already confirmed and are not questions in this matrix.

### 3. Architecture/process status approvals

| Candidates | Status decision required |
|---|---|
| `BS-ARCH-001`, `003`, `005` | Decide whether repository-explicit direction is `accepted` architecture and confirm exact wording. |
| `BS-ARCH-002`, `004`, `006`, `007` | Separate accepted architecture/operating rules from transitional implementation facts. |
| `BS-PROC-001` | Confirm accepted status for human-only merge authority. |
| `BS-PROC-002` | Confirm stable role-boundary wording and accepted status. |
| `BS-PROC-003` | Confirm that Codex is a current model/vendor assignment rather than permanent Implementer identity, then decide status. |
| `CI-003-D1` | Confirm accepted architecture status and whether the proposed wording is complete. |
| AGENT-004 guidance | Decide whether any provisional preparation/model-routing guidance should become a stable process decision or remain operating evidence. |

### 4. Conflict reconciliation task authorization

| Conflict | Authorization required |
|---|---|
| C1 signed sector meter | Authorize explicit supersession plus scoped balance/simulation reconciliation. |
| C2 post-capture 4/6 state | Authorize supersession plus scoped sector-transition implementation. |
| C3 turret restoration | Authorize supersession plus ownership/combat/resource repair rules and implementation. |
| C4 zero-HP capture | Authorize supersession plus capture-trigger/balance implementation. |
| C5 retained HP/resources | Supply exact parameters, authorize supersession, and scope resource/capture implementation. |

### 5. Missing-context export requirements

- Supply a controlled export for `BS-MECH-001–004` if those decisions exist.
- Supply a controlled export for `BS-MECH-007–012` if those decisions exist.
- Identify the prior stable ID superseded by `BS-MECH-014`, if recoverable; otherwise explicitly authorize unresolved-predecessor notes in the future `BS-MECH-014` record.

## Recommended staged migration

1. DOCARCH-002B migrates `BS-MECH-013–015`, then repository-only respawn IDs and the clean approved proposed mechanics set after the ID/wording matrix is accepted. Gameplay Reviewer is required. Conflict-blocked mechanics remain excluded.
2. DOCARCH-002C migrates only Product-Architect-approved architecture, process, and CI records after ID/status decisions. Architecture Reviewer is required.
3. Separately authorized implementation tasks reconcile C1–C5; no conflict record is created prematurely.
4. DOCARCH-002D reconciles `PROJECT_CONTEXT.md`, completes indexes and links, and migrates resolved conflict decisions after explicit supersession and implementation scope exist.

## Validation design

- Compare changed paths against the three-file allowlist.
- Confirm `docs/decisions/**` is byte-unchanged and contains only README/template.
- Search the report for every preserved and proposed ID, missing range, conflict cluster, and approval category.
- Confirm proposed IDs are labeled unapproved and Product Architect-confirmed meaning is not labeled as awaiting meaning approval.
- Confirm all five conflicts remain blocked and name future supersession and implementation work.
- Confirm implementation facts are separated from decision candidates.
- Confirm `CURRENT.md` contains exactly one next safe action.
- Do not run runtime tests, builds, typechecks, or diagnostics for this evidence-only change.

## Result

The inventory is complete enough to proceed to Product Architect review. The decision registry is unchanged and no decision instance has been migrated.

DOCARCH-002B remains blocked until the Product Architect accepts the ID and wording matrix for its clean mechanics set. Conflict-blocked mechanics require separately scoped supersession and implementation reconciliation before decision-file creation.
