# PERSIST002-ROLLOUT-02 — Persistence Deployment-GO Preparation

Status: **OPEN**. G1: **IMPLEMENTED / REVIEW PENDING**.
**PUBLIC PERSISTENCE ROLLOUT — BLOCKED. DEPLOYMENT — NOT AUTHORIZED.**
Persistence is merged but NOT DEPLOYED; staging remains the earlier verified
NON-PERSISTENT runtime. This task records no fresh infrastructure observations.

## Purpose and authority

Prepare the minimum deterministic authorization, input, command and evidence
contracts for a later first persistent staging rollout. Completion of this task
does not equal Publication GO or Deployment GO. ROLLOUT-03 owns deployment
execution and requires a separate explicit environment-specific PA decision.

G1 baseline: `de5e39721eb1806f080e59f400836c4f25447c8a`.
This is the G1 repository baseline, **not the future publication target**.
Branch: `ops/persist002-rollout-02-go-preparation`, created directly from that
baseline after live-main, clean-worktree and task-collision checks passed.

The human PA's 2026-09-20 G1 authorization explicitly accepted the task-local
constraints below. They narrow this rollout's procedure; they do not reopen
accepted persistence architecture or grant infrastructure authority.
PERSIST-001, PERSIST-002 and PERSIST002-NET-02 remain MERGED / CLOSED.
[ROLLOUT-01](persist-002-rollout-01-staging-readiness.md) remains MERGED / CLOSED —
REPOSITORY READINESS COMPLETE.

The [Deployment-GO packet specification](../ops/persist-002-deployment-go-packet.md)
owns this task's detailed contracts. Read it alongside the
[v3 operator procedure](../ops/persist-002-staging-db-integration-plan.md),
[Caddy runbook](../ops/public-arena-caddy-edge-runbook.md), and accepted
[world lifecycle](../decisions/BS-ARCH-011.md) and
[lease/reconnect](../decisions/BS-ARCH-010.md) decisions. Governance and accepted
architecture retain their authority.

## Reviewer routing — declared before implementation

Routing follows [reviewer-routing.md](../agents/reviewer-routing.md), strengthened
by the explicit G1 authorization:

| Domain | Requirement and reason |
| --- | --- |
| Architecture | Required: preparation/execution and persistence recovery boundaries |
| Network | Required: containment, edge, peer and admission sequencing |
| Security | Required: private inputs, evidence and authorization boundaries |
| Ops / QA | Required: command/state/retry contracts and acceptance evidence |
| Gameplay | Not applicable: no mechanics, balance or gameplay authority changes |
| Visual | Not applicable: no presentation, assets or UI changes |

The implementation author is not an independent reviewer. No review agents are
invoked during G1 implementation. Independent consolidated review applies only
to the stable G1 candidate and must identify its exact head. Ordinary Core and
governed QA checks may run after the PR opens; they do not substitute for the
independent consolidated review or PA disposition.

## Scope and non-goals

G1 permits specification/governance edits to exactly four files:

1. `docs/tasks/persist-002-rollout-02-deployment-go-preparation.md`
2. `docs/ops/persist-002-deployment-go-packet.md`
3. `docs/handoffs/CURRENT.md`
4. `PROJECT_CONTEXT.md`

No executable schema/code, runtime, migration, workflow or `deploy/*.json`
changes. No real packet, future digest, live host value or secret is created.
No agents, workflow dispatch, image publication, GHCR/provider mutation or
package bootstrap. No registry credential creation, VPS/Contabo/SSH access,
host survey, secret generation, PostgreSQL, volume/network creation,
migration/grants/bootstrap, backup/restore, candidate execution, Caddy operation,
DNS/TLS/firewall change or public probe. Preserve unrelated behavior and history.

G2-G6 are specified here, not authorized for execution by G1. A necessary fifth
file is `SCOPE_EXPANSION_REQUIRED`; do not expand scope silently.

## Packet sequence and authorization boundaries

| Packet | Dependency and output | Authority boundary |
| --- | --- | --- |
| G1 | This repository task and value-free packet/procedure specification | Docs only; exact-head review and PA G1 disposition pending |
| G2 | After G1 merge, request explicit bounded read-only provider/host survey authority; collect the separately authorized survey | Discover STOP conditions before publication when practical; no repair or publication |
| G3 | G2 evidence and blockers resolved; prepare RELEASE PUBLICATION GO (Decision A) | PA may authorize one exact main-only workflow run, three private artifacts and bounded provider/release evidence; no VPS |
| G4 | Execute only the separately authorized Decision A; capture immutable release evidence | No deployment; partial publication is non-deployable, with no automatic rerun/deletion |
| G5 | G2 fresh survey + G4 evidence + resolved PA choices | Assemble final non-secret STAGING DEPLOYMENT-GO packet and exact ROLLOUT-03 command/evidence bindings |
| G6 | Complete reviewed G5 | PA GO / NO-GO (Decision B); completion is not an inferred GO |
| ROLLOUT-03 | Separate task, explicit Decision B and fresh entry checks | Prerequisite-gated deployment execution only; ROLLOUT-02 never becomes deployment EXECUTING |

## PA-accepted task constraints

- **Publication target:** Decision A binds exact current main when issued, after
  all authorized pre-publication repository changes are merged/reviewed. Main
  movement before dispatch means STOP and rebind/re-authorize. After publication,
  preserve that exact candidate; no silent republication/substitution. Later
  runtime/deploy/security changes invalidate it pending separate review;
  docs-only movement does not silently change its target.
- **Containment:** operator-only maintenance/validation is mandatory. Exclude
  non-operator gameplay, preserve management and unrelated services, explicitly
  allow diagnostics, prove entry/exit and reversibility, and fail unavailable.
  G2/G5 must establish the actual mechanism; G1 supplies no firewall commands.
- **Cutover:** edge-first maintenance. Enter containment, stop old server,
  activate/validate edge credential/config, then initialize PostgreSQL. No DB
  preparation while the old public arena serves without a later PA change.
- **Peer bootstrap:** use an observed provisional literal and real secret under
  containment; never disabled trusted-edge mode. Provisional evidence is not
  acceptance. A mismatch requires stop, explicitly authorized derived-peer
  correction, revalidation/recreation and remeasurement. Wrong peer can use
  direct-peer budgeting; it is not universal traffic fail-close.
- **Failed first init:** preserve exact volume and bounded evidence; do not
  assume init replay or automatically delete/reinitialize, even before traffic.
  Destructive recovery needs explicit PA disposition.
- **Checkpoint 1:** required quiesced initial backup, manifest, fresh same-cluster
  restore rehearsal, full verification and explicit cleanup before candidate
  traffic.
- **Checkpoint 2:** required quiesced fresh backup containing durable smoke
  identity/membership, separate fresh rehearsal, full verification and explicit
  cleanup before same-candidate source-DB restart/continuity proof. It is not
  optional. Both backup sets remain protected until ROLLOUT-03 closes **and** PA
  explicitly authorizes disposition; no time-based expiry. Insufficient capacity
  returns `PA_DECISION_REQUIRED`, never a one-checkpoint downgrade.
- **Retry:** STOP-AND-PRESERVE by default. Same-GO retry requires a listed class,
  unchanged inputs/artifacts/config, read-only or demonstrated idempotence,
  known outcome, no uncertain mutation, and a bounded count/deadline. Changed
  images/config/containment, rotation, uncertain mutation, destructive cleanup,
  volume recreation, source restore, old-arena fallback or unlisted mutation
  needs PA reauthorization. The explicitly pre-authorized derived-peer
  transition is a gated phase transition, not a blanket config-change retry.
- **Old arena:** not persistent rollback. Any return is separately authorized
  SERVICE-MODE FALLBACK with matching client/edge handling.

## Only unresolved PA/evidence items

1. **Capacity thresholds:** G2 measures bytes, inodes, Docker storage, memory,
   resource baseline and read-only-known artifact sizes. G5 derives concrete
   headroom for both checkpoints/rehearsals; PA decides before Decision B.
   No universal GB/% is guessed.
2. **Exact containment mechanism:** G2 observes host/network/firewall/listeners;
   G5 binds the exact reversible mechanism and any mutation/restoration for PA
   approval before Decision B.
3. **Tools package first-creation fact:** G2 checks existence, private visibility
   and Actions access for `ghcr.io/pittonje/burningspace-persistence-tools`.
   Absent/unsafe means STOP and a separate bounded bootstrap authorization.
   Publication is not implicit first-package bootstrap.

## G1 validation and completion criteria

- Exactly the four allowed files; `git diff --check` and local link/path checks.
- Repeated SHA/run/hash facts checked against source; baseline labelled as such.
- Authority/status scans preserve PUBLIC PERSISTENCE ROLLOUT BLOCKED and
  DEPLOYMENT NOT AUTHORIZED; no line issues either GO in this packet.
- No real secret, secret hash, invented host observation or future image digest.
- Envelope field timing/authority/sealing, authorization states and future-result
  slots specified separately from strict application/edge schemas.
- All 20 future phases, both mandatory checkpoints, edge/PG/admission contracts,
  private custody, evidence and abort/retry dispositions are specified.
- No runtime tests required for this docs-only packet; ordinary PR checks remain
  independent future evidence, not a local PASS claim.
- One docs-only commit, pushed branch, one PR to main; no merge or auto-merge.

Local G1 verification: PASS for `git diff --check`, exact four-file Markdown
scope, all 34 added local links, baseline SHA transcription, all envelope groups
and authorization states, phases 0-19, source-backed operator names/limits and
admission arrays. Added-text scans plus manual review found no issued GO, secret,
secret hash, invented live address or future image digest; blocked/not-authorized
status and separate ROLLOUT-03 ownership are explicit. Runtime tests were not run
for this docs-only packet. No remote CI or independent review PASS is claimed.

G1 is implemented, not independently approved. Exact-head Core, governed QA,
independent consolidated Architecture/Network/Security/Ops-QA review and PA G1
disposition remain required before human merge. After G1 merge, the next safe
action is to **request bounded G2 read-only provider/host survey authorization**.

ROLLOUT-02 completion requires G2-G5 evidence and an explicit recorded G6
disposition. NO-GO leaves execution blocked; GO still requires a separate
ROLLOUT-03 handoff and phase gates. Task completion never grants Deployment GO.
