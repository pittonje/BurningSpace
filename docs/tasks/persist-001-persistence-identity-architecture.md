# PERSIST-001 - Persistent World & Durable Identity Architecture

Owner: Product Architect
Risk: HIGH ARCHITECTURE IMPACT / DOCUMENTATION-ONLY
Status: ARCHITECTURE/SECURITY REVIEW APPROVED / PA ACCEPTED / AWAITING HUMAN MERGE
Date: 2026-09-13
Branch: `arch/persist-001-persistence-identity`
Base/main: `3b3621d248a73f67e1bed89cd3c267d5539f2c34`

## Authority and goal

The human project owner explicitly grants Product Architect authority for this
bounded decision task. Resolve the required architecture gates for Wave 2
persistence. No runtime implementation is authorized. Commit this task and
CURRENT before architecture work. PA-selected defaults are PostgreSQL, `pg`
and explicit repositories, versioned SQL migrations, durable guest UUID plus
opaque recovery credential, durable world/faction membership, one gameplay
session per player/world, and one canonical world with an explicit UUID.
Audit these defaults against accepted authority; do not silently replace them.
New records may be accepted under this explicit delegated PA decision authority;
that does not claim independent review or final acceptance of PERSIST-001.
PERSIST-002 must not start before independent review and PA task acceptance.

## Recovery and evidence ledger

This is an explicitly supplied bounded handoff, including authority to fetch,
switch main, fast-forward, reconcile stale CURRENT, and create this task.
The takeover protocol was consulted; its generic read-only cold-takeover
restriction does not override these explicit starting instructions.

| Claim | Evidence / authority | Disposition |
|---|---|---|
| Repository and base | origin is pittonje/BurningSpace; fetched; main fast-forwarded to exact SHA above; clean tracked/untracked state | Confirmed locally |
| Existing registry | 35 accepted files: 18 BS-MECH, 5 GAME-001, 7 BS-ARCH, 4 BS-PROC, 1 CI; index agrees | Confirmed; next free architecture ID is BS-ARCH-008 |
| MOBILE-001C awaiting review | CURRENT and task pre-merge state | Stale; local main merge PR #84 supersedes active-task claim |
| Client deployed, staging healthy, real-phone controls usable | Human PA's PERSIST-001 handoff, 2026-09-13 | External-only user-confirmed evidence; no new VPS/probe evidence claimed |
| Persistence successor | Explicit human PA task plus canonical Wave 2 gates | Authorized architecture task only |
| Prior governance | Governance, BS-ARCH-001-007, BS-PROC-001-004 | Preserved; no historical accepted record edits |
| Independent Architecture/Security review | `docs/reviews/persist-001-architecture-security-review.md`, reviewed commit `356b2f94573c3be641296a26fff727158063ed36` | APPROVE; 0 BLOCKER / 0 HIGH / 0 MEDIUM |
| Product Architect disposition | PA accepted the reviewed PERSIST-001 architecture in chat on 2026-09-13 | ACCEPTED; PERSIST-002 may open only as a separate bounded implementation task after merge |

## Exact documentation scope

- This task and `docs/handoffs/CURRENT.md`.
- `docs/tasks/mobile-001c-combat-controls-tactical-camera.md`: dated closure only.
- `docs/architecture/PERSISTENT_WORLD_IDENTITY_ARCHITECTURE.md`.
- Next free records `docs/decisions/BS-ARCH-008.md` through `BS-ARCH-011.md`.
- `docs/decisions/DECISION_INDEX.md` and `docs/decisions/README.md`: registry navigation/count reconciliation.
- `docs/roadmap/CANONICAL_DEVELOPMENT_ROADMAP.md`: Wave 2 gate resolution/status only.
- `PROJECT_CONTEXT.md`: durable navigation/current program reconciliation.
- `docs/agents/ARCHITECT_TAKEOVER_PROTOCOL.md`: current registry count only, preserving historical baseline.
- `docs/reviews/persist-001-architecture-security-review.md`: independent review evidence added after authoring and before merge.

No changes to apps/client, apps/server, any packages, deploy, .github, manifests,
lockfiles, dependencies, prototype or assets. No SQL implementation, Docker
service implementation, secrets, VPS contact, merge or PERSIST-002.
No sector/outpost/turret/economy/mining/logistics/portal mechanics, broad accounts,
horizontal scaling, tick persistence or projectile durability.

## Required outputs and acceptance

Create a small coherent set of decisions for storage/consistency/migration,
guest identity, active session/reconnect ownership, and world lifecycle.
Each record states status, decision, rationale, consequences, non-goals and
relationship to prior decisions. Architecture defines actual current boundaries,
identity/session/boot lifecycles, durability classes, relational keys/constraints,
transactions, migration/rollback, configuration/secrets, staging topology,
backup/restore, failures, threat model, exact PERSIST-002 proof and deferred gates.
PERSIST-002's proof must recover identical player UUID/world/faction after an
application-only restart with a different transport session, prevent duplicate
control and invalid credential takeover, reclaim stale leases, and demonstrate
a real backup restored into a fresh database. No battle-state semantics invented.

## Reviewer declaration

Per [reviewer routing](../agents/reviewer-routing.md), the human PA selected one
independent combined Architecture/Security review after the architecture was
defined. The review covered identity/session separation, credential security,
duplicate ownership, consistency, migration/rollback, restore evidence,
secrets/network boundaries and implementability without architecture gaps.
Network and QA concerns were included in that review's reconnect/failure/acceptance
coverage; separate reviewers were skipped under this documentation-only PA routing
because no executable contracts, runtime, deployment or tests changed. Gameplay
and Visual were not applicable. This does not weaken the future PERSIST-002
implementation review or eventual PR's governed QA/CI gates.

The independent Architecture/Security review is complete and recorded at
[docs/reviews/persist-001-architecture-security-review.md](../reviews/persist-001-architecture-security-review.md),
bound to commit `356b2f94573c3be641296a26fff727158063ed36`, with verdict **APPROVE** and
0 BLOCKER / 0 HIGH / 0 MEDIUM. Product Architect accepted PERSIST-001 after that
review. Human-only merge policy remains.

## Validation and commits

Validate changed links/paths, unique decision IDs and registry counts, untouched
historical accepted records, documentation-only diff and `git diff --check`.
Inspect available documentation check scripts; run build/typecheck when possible.
Read current production BattleRoom, NetworkClient and reconnect configuration
and tests to verify migration boundaries. Do not execute deployment tooling.

1. `PERSIST-001 - Define persistence and identity architecture task`
2. `PERSIST-001 - Define persistent world and identity architecture`
3. documentation-only review/evidence reconciliation before merge

No runtime implementation is authorized in this task.

## Architecture completion checkpoint - 2026-09-13

Authority commit: `0dec9d546cd7289f73bff843d8cfdeda79bc87b8`.
Architecture reviewed commit: `356b2f94573c3be641296a26fff727158063ed36`.
Decisions BS-ARCH-008 through BS-ARCH-011 are accepted under the explicitly
delegated PA decision authority. Existing 35 accepted records remain unchanged.
Independent combined Architecture/Security review is complete and APPROVED;
Product Architect final acceptance is complete. PERSIST-001 is awaiting human
merge only.

[Architecture](../architecture/PERSISTENT_WORLD_IDENTITY_ARCHITECTURE.md) defines
storage/identity/session/world lifecycle, concrete schema/transaction boundaries,
credential/lease threat model, failure/rollback/restore behavior, staging topology,
19-step PERSIST-002 proof and mandatory race/failure cases. Deferred classifications
remain ship transform/health/respawn/cooldowns and later campaign control state;
production HA/RPO/RTO/admin/account extensions remain future scope. No baseline
PA default was substituted. Package ownership and accepted mechanics are preserved.

MOBILE-001C closure is reconciled in its task and CURRENT, based on local PR #84
merge history and separately attributed human PA deployment/phone observations.
No new mobile task, deployment proof or external review verdict is fabricated.

## PR #85 automated QA follow-up

On PR #85, Core Pull Request Checks completed `SUCCESS` on reviewed architecture
HEAD `356b2f94573c3be641296a26fff727158063ed36`.

The automated Claude QA invocation also completed its review successfully, but
the deterministic publisher rejected one blocker string because it exceeded the
500-character field limit. The wrapper therefore concluded `FAILURE` and posted
a sanitized failure comment. Its substantive concern was an evidence-state
mismatch: the PR description already referenced the completed independent
Architecture/Security review while this task and CURRENT still contained the
pre-review `READY FOR REVIEW` checkpoint and no in-repository review artifact.

The independent review artifact and this documentation-only reconciliation close
that mismatch. The failed wrapper is not claimed as a successful QA run. Exact-head
Core and automated QA are expected to rerun on the evidence follow-up commit.

Next action: obtain green exact-head required checks on the documentation evidence
follow-up, then human-merge PR #85. Do not start PERSIST-002 before merge.

## Mechanical validation evidence

- `npm run build`: PASS across all workspaces, production client URL supplied
  as build configuration only. Existing Vite >500 kB chunk warning remains INFO.
- `npm run typecheck`: PASS across all workspaces.
- `git diff --check`: PASS on the architecture authoring checkpoint.
- Local path-link checker: 113 relative links in changed Markdown resolve;
  heading checker: 3 local fragments resolve.
- Registry checker: 39 accepted files match 39 unique index rows; all four new
  records have required decision/rationale/consequences/non-goal/relationship fields.
- All 35 pre-existing accepted decision records have zero diff from base.
- Architecture authoring scope checker: exactly 13 Markdown files, no runtime/package/deploy/workflow
  changes. No dependency, SQL migration, Docker service or secret created.
- No dedicated documentation linter/check command found in package scripts or
  repository scripts/workflows; bounded path/anchor/registry/scope checks used.
- Source audit covered BattleRoom, ParticipantState, NetworkClient, production
  room registration, runtime readiness and NET-001 configuration/test cases.
- No runtime test suite or persistence/DB/restore test is claimed for this
  documentation-only task; implementation proof belongs to PERSIST-002.
- Independent Architecture/Security review: APPROVE, 0 BLOCKER / 0 HIGH / 0 MEDIUM,
  bound to `356b2f94573c3be641296a26fff727158063ed36`.
- Core run `34759176294`: SUCCESS on that reviewed architecture head.
- Claude QA run `34759176306`: substantive evidence-state finding; wrapper
  FAILURE because an overlength blocker string failed deterministic output validation.

Architecture-authoring changed files relative to recorded main base:

1. PROJECT_CONTEXT.md
2. docs/agents/ARCHITECT_TAKEOVER_PROTOCOL.md
3. docs/architecture/PERSISTENT_WORLD_IDENTITY_ARCHITECTURE.md
4. docs/decisions/BS-ARCH-008.md
5. docs/decisions/BS-ARCH-009.md
6. docs/decisions/BS-ARCH-010.md
7. docs/decisions/BS-ARCH-011.md
8. docs/decisions/DECISION_INDEX.md
9. docs/decisions/README.md
10. docs/handoffs/CURRENT.md
11. docs/roadmap/CANONICAL_DEVELOPMENT_ROADMAP.md
12. docs/tasks/mobile-001c-combat-controls-tactical-camera.md
13. docs/tasks/persist-001-persistence-identity-architecture.md

Review/evidence follow-up additionally adds:

14. docs/reviews/persist-001-architecture-security-review.md
