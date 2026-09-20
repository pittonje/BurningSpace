# PERSIST-002 Deployment-GO packet and procedure specification

G1 specification for [PERSIST002-ROLLOUT-02](../tasks/persist-002-rollout-02-deployment-go-preparation.md).
**G1 IMPLEMENTED / REVIEW PENDING. ROLLOUT-02 OPEN.**
**PUBLIC PERSISTENCE ROLLOUT — BLOCKED. DEPLOYMENT — NOT AUTHORIZED.**
This is a value-free contract, not a real packet, survey authorization,
Publication GO, Deployment GO or executable schema. Persistence is NOT DEPLOYED;
public staging remains the earlier verified NON-PERSISTENT runtime.

## Authority and source contracts

The task records the human PA's explicit G1 constraints. Those constraints fix
the first-rollout ordering, containment and two-checkpoint policy; generic or
historical operator examples do not relax them. Existing merged interfaces are
reused without modification:

- [Persistent v3 operator procedure](persist-002-staging-db-integration-plan.md)
  and [runtime runbook](public-arena-staging-runbook.md).
- [External staging runbook](public-arena-external-staging-runbook.md): registry
  custody and shared-host preservation; its historical v2 non-persistent rollback,
  Windows harness and credential-less smoke examples are not this procedure.
- [Caddy edge runbook](public-arena-caddy-edge-runbook.md),
  [edge preflight](../../apps/server/scripts/external-staging-edge-preflight.ts)
  and [disposable edge contract](../../apps/server/scripts/external-staging-edge-contract-check.ts).
- [Persistent exact-key contract](../../apps/server/scripts/persistent-rollout-contract.ts),
  [application preflight](../../apps/server/scripts/external-staging-preflight.ts),
  [operator dispatcher](../../apps/server/scripts/persistence-operator.ts),
  [private inputs](../../apps/server/scripts/private-operator-input.ts) and
  [PG transport](../../apps/server/scripts/persistence-tooling.ts).
- [Backup](../../apps/server/scripts/backup-dump.ts),
  [restore verification](../../apps/server/scripts/backup-restore-verify.ts),
  [restore target](../../apps/server/scripts/restore-target.ts),
  [admission diagnostic](../../apps/server/scripts/external-staging-admission-smoke.ts),
  [external smoke](../../apps/server/scripts/external-staging-smoke.ts) and
  [private smoke credential](../../apps/server/scripts/private-smoke-credential.ts).

G1 baseline is `de5e39721eb1806f080e59f400836c4f25447c8a`; it is **not the future
publication target**. No live host/provider value or future image digest is
filled here. No infrastructure action is authorized by this document.

## Release target and invalidation policy

Decision A binds **exact current main when RELEASE PUBLICATION GO is issued**,
after every authorized pre-publication ROLLOUT-02 repository change is merged
and reviewed. The approved [publication workflow](../../.github/workflows/publish-staging-images.yml)
is main-only, builds its dispatched `GITHUB_SHA`, sets OCI revision from that SHA,
and embeds `BURNINGSPACE_TOOLS_COMMIT` in tools. Backup provenance later uses
that embedded commit. Server, client and tools must share the bound revision.

Before dispatch, freshly compare main with Decision A's SHA. Movement means
STOP and rebind/re-authorize, not dispatching an older SHA through an invented
workflow input. Verify the resulting run's actual head again: a dispatch race
or mismatched run is INVALIDATED and non-deployable even if publication succeeds.
G1 changes neither the workflow nor its inputs.

After publication, main movement never silently republishes or substitutes a
candidate. Decision B may target the exact previously published commit, with
fresh ancestry/source-delta evidence and explicit unchanged image bindings.
Any subsequent runtime/deploy/security source change invalidates that candidate
until separately reviewed and explicitly dispositioned. Docs-only movement is
not automatically an image-candidate change, but it does not change the target
or relabel old CI/review evidence as new. Bind checks to their actual reviewed
heads and document any accepted source-equivalence reasoning.

Changed documentation may be transported in a build context without being copied
into image filesystems. This does not imply reproducible image digests: OCI
metadata, tools commit and mutable upstream build inputs matter. Never infer
digest equality from a docs-only source diff.

## Authorization states and decisions

Authorization state is distinct from execution result. All states retain
`publicProductionLaunchAuthorized=false`.

| Authorization state | Required transition evidence and permitted scope |
| --- | --- |
| DRAFT | G1 specification; no survey, publication or deployment authority |
| SURVEY_AUTHORIZED | Separate PA-approved G2 scope, identities, read-only observations, bounded access/window and safe-output policy |
| SURVEY_COMPLETE | Required G2 observations classified; retained safe evidence. Open STOP/PA items do not become PASS |
| PUBLICATION_READY | Required survey/provider blockers resolved, all three packages safe, reviewed exact current main, proposed Decision A complete |
| PUBLICATION_AUTHORIZED | Explicit Decision A binds one dispatch and evidence collection; no VPS or deployment authority |
| PUBLICATION_COMPLETE | G4 verifies one successful bound run and all three artifacts/provider results; no partial release |
| DEPLOYMENT_READY | G5 prerequisites complete and reviewed; no deployment permission inferred |
| DEPLOYMENT_AUTHORIZED | Explicit Decision B seals environment/release/procedure/window; each future phase still gated |
| EXECUTION_HANDOFF | Separate ROLLOUT-03 task accepts the exact sealed packet and fresh entry checks; ROLLOUT-02 remains preparation only |
| STOPPED / INVALIDATED | Failure, expired authority or binding drift; preserve evidence, record cause and required reauthorization; never advance by editing status alone |

G1's present authorization state is DRAFT. A document that describes future
authorized states does not enter them. ROLLOUT-02 cannot become deployment
EXECUTING. ROLLOUT-03 execution results use NOT_STARTED, phase identifiers,
PASS/FAIL/INCONCLUSIVE/NOT_RUN, STOPPED and ACCEPTED; result PASS never issues GO.

### Decision A — release publication only

G2 should precede publication authorization when practical to discover host STOP
conditions before registry mutation. Before Decision A require provider evidence
for **all three** canonical packages: `burningspace-deploy-server`,
`burningspace-deploy-client`, and `burningspace-persistence-tools` under
`ghcr.io/pittonje/`. Bind private visibility, approved Actions access and the
existing non-inherited permission policy from the external staging runbook.
Absent/unsafe tools package means STOP; separately authorize bounded package
bootstrap. The workflow is not implicit first-package creation or privacy repair.

Decision A may authorize only the exact main SHA, exact workflow path, one manual
`workflow_dispatch`, three private artifacts and bounded workflow/provider
evidence. It grants no VPS contact, staging pull, database, operator-secret
generation, Caddy or deployment scope. Its existing ephemeral job credential
does not authorize obtaining reusable registry credentials.

G4 retains run ID/attempt, actual workflow head, platform, the three immutable
references, observed OCI revision equality, tools `sourceCommit` equality,
client build origin, provider manifest existence and post-publication
privacy/access. Parse repository/digest from each immutable reference; do not
maintain independently selectable duplicate targets. Check all three against
the same source and approved platform. Mutable tags are not deployment inputs.
The workflow summary/logged release JSON is not a durable GitHub release artifact:
capture bounded allowlisted metadata with source run reference, collection time,
byte length and SHA-256 in approved evidence custody. Do not archive raw logs.

Partial publication is retained as evidence and is NOT deployable. No automatic
workflow rerun, artifact deletion, package permission change or digest replacement.
A failed/mismatched run needs an explicit PA publication disposition.

### Decision B — staging deployment only

Require fresh complete G2 evidence, complete G4 publication, three immutable
application/tools references, exact target commit, provider privacy/access,
strict v3 application plan, edge plan/config, delivered asset hashes, approved
host-specific containment and capacity, private-input custody categories/paths,
stop-and-preserve recovery, **both mandatory checkpoints/rehearsals**, an exact
reviewed ROLLOUT-03 command packet and evidence manifest, owners, bounded retry
matrix and valid execution window. No unresolved STOP or required field remains.

Decision B permits only named capabilities behind phase prerequisites. It is not
an unconditional command list, completed live validation or public-production GO.
Secret generation and real private-input validation occur during authorized
preparation, before dependent mutation. Pre-GO template validation must not be
reported as real-input Phase A.

## Non-secret authorization envelope

Wrap existing [v3 application plan](../../deploy/external-staging-persistence-plan.example.json)
and [inventory](../../deploy/external-staging-persistence.env.example), and existing
[edge plan](../../deploy/edge/caddy/edge-plan.example.json) and
[inventory](../../deploy/edge/caddy/edge.env.example). Do not add governance keys to
their exact-key schemas. Do not create executable schemas or real packets in G1.

In the tables, slash-separated field names each inherit the stated timing,
source and sealing rule. Records/arrays use the specified member fields.

- **S:** required before survey authorization (G2).
- **A:** required before Publication GO (G3); actual target exists only then.
- **P:** required from completed publication (G4), before Decision B.
- **B:** required before Deployment GO (G5/G6).
- **X:** observed only during ROLLOUT-03 execution.
- **F:** required final acceptance result.
- **I:** immutable in its issued/sealed authorization or captured evidence record.
- **D:** narrowly authorized derived transition, appended with before/after safe
  hashes and observation; never silently edits the sealed GO.
- **R:** append-only result; slot declaration exists at B, observed value at X/F.

All listed fields are required at their timing unless explicitly conditional.
Unobserved slots are marked NOT_OBSERVED with producer phase/acceptance rule and
no fabricated value/hash. A digest of safe packet bytes is detached from those
bytes (or excludes its own digest field by a bound serialization rule); never
require a self-referential hash. G5 binds exact bytes/serialization.

| Group and exact fields | Required timing | Authority/source | Seal |
| --- | --- | --- | --- |
| identity.packetVersion / taskId / packetId / environmentId / environmentClass | A | PA task and approved staging identity; no live state inference | I |
| identity.executionTaskId | B | Separately scoped ROLLOUT-03 handoff identity | I |
| identity.g1Baseline | A | G1 baseline recorded above; not release target | I |
| decision.surveyReference / surveyIssuedAtUtc / surveyWindow | S | Explicit G2 permission | I |
| decision.publicationGoId / publicationIssuedAtUtc / publicationWindow / publicationDecisionReference | A | Explicit PA Decision A | I |
| decision.deploymentGoId / deploymentIssuedAtUtc / executionWindow / deploymentDecisionReference / packetSha256 | B | Explicit PA Decision B and sealed envelope bytes | I |
| owners.operator / abortOwner / recoveryOwner / sensitiveArtifactCustodian / acceptanceOwner | B | Named PA-approved accountable identities and role categories; same person may hold several | I |
| host.identityReference / architecture / sshTrustReference / locationEvidenceReference / baselineReference / baselineObservedAtUtc / freshnessRule | B | Authorized G2 observations; public host-key trust reference is not a private SSH configuration | I |
| host.toolchainBindings[] {tool, version, sourceReference, capabilityEvidenceReference} | B | G2 host and approved POSIX workstation capabilities; G5 binds verified dependencies | I |
| release.targetCommit / workflowPath / repositories / platform / expectedClientServerOrigin | A | Exact current main at Decision A; reviewed publication workflow and intended public origin | I |
| release.runReference / runId / attempt / workflowHead / publicationEvidenceReference | P | Actual authorized run and bounded captured metadata | I |
| release.images.{server,client,persistenceTools}.{immutableReference,ociRevision} | P | Workflow output plus registry manifest/config evidence; revision equals targetCommit | I |
| release.toolsSourceCommit / clientBuildServerOrigin | P | Tools metadata and client build binding; equal targetCommit / expected origin respectively | I |
| release.packageEvidence[] {repository,observedAtUtc,existence,visibility,actionsAccess,permissionPolicy,reference} | A and refreshed P/B | Authorized provider observations for all three packages; private and approved access required | I per observation |
| applicationPlan.planReference / inventoryReference / baseHashes / authorizedStageHashes / transitionRules | B | Exact strict v3 plan/inventory and G5 serialization; only approved flag/reference promotion and derived peer transition | I; D for recorded execution copies |
| database.postgresImage / databaseName / roleNames / expectedSchemaVersion / expectedDomainVersion / migrationAuthority / worldSlug | B | Reviewed target's persistent contract, init/grants assets and plan; exact fixed values, never guessed live results | I |
| database.initialVolumePolicy | B | Fresh-only first start; unexpected existing volume STOP; preserve partial init | I |
| assets.deploymentRoot / composeProject / runtimeFiles[] / toolsFiles[] | B | Exact ordered delivered paths from merged procedure; base then DB, optional tools last | I |
| assets.files[] {repositoryPath,deliveryOrBakedLocation,sha256} | B | Byte hashes from reviewed target; Compose, init, grants, Caddy template/drop-in/release and other command-packet dependencies | I |
| storage.volumeName / networkNames / privateParent / operationInputPaths / checkpointWorkPaths / sensitiveStoreReference | B | Canonical Compose names plus G2 viability/G5 approved absolute paths or opaque custody reference | I |
| storage.checkpointPolicy / retentionPolicy | B | Two required checkpoints and rehearsals; protected until ROLLOUT-03 closure AND explicit PA disposition | I |
| storage.capacityEvidenceReference / capacityDecisionReference / requiredHeadroom | B | G2 measurements, G5 calculated bytes/inodes/resources and PA decision; no default guessed threshold | I |
| edge.planReference / inventoryReference / stageHashes / edgeConfigId / previousEdgeConfigId / edgeRecoveryReference | B | Target strict edge contract and observed prior approved config; prior ID required for this existing-edge replacement | I; D only for approved stage promotion |
| edge.caddyArtifact / version / templateHash / dropInHash / renderedHash / adaptedHash | B | Reviewed Caddy contract and safe rendered/adapted artifacts, not evidence of host activation | I |
| edge.credentialSourceId / credentialSourcePath / loadedCredentialPath / trustedMode | B | Existing systemd credential contract; trusted-edge required; no bytes/verifier/hash of secret | I |
| edge.provisionalPeer / provisionalObservationReference / peerTransitionRule | B | Authorized real-Caddy old-topology observation; initial binding only, no subnet inference | I; D limited to final observed literal(s) |
| procedure.commandPacketReference / commandPacketSha256 / phaseDependencies / deadlines / retryMatrix / derivedTransitions | B | Exact reviewed ROLLOUT-03 interfaces, phase gates and PA retry constraints | I |
| containment.properties / mechanismReference / entryEvidenceRule / exitEvidenceRule / failureDisposition | B | Mandatory operator-only properties below; actual mechanism from G2/G5 and PA | I |
| recovery.mode / oldServerProvenance / oldClientProvenance / priorEdgeReference / controlledUnavailabilityRule / serviceModeFallbackRule | B | stop-and-preserve; G2 actual old images/config; old arena is not persistent rollback | I |
| evidence.schemaVersion / evidenceRoot / manifestId / acceptanceRequirements / reviewBindings[] / resultSlots[] | B | Manifest below, approved custody, exact-head reviews and phase producer/acceptance rules | I |
| authorization.state / surveyScope / publicationScope / deploymentCapabilities / publicProductionLaunchAuthorized | S/A/B as applicable | Separate PA decisions; capabilities bind phase prerequisites; production false everywhere | I per decision |

`deploymentCapabilities` enumerates private/host preparation, exact pulls, DB
mutation, edge activation, any explicitly approved containment mutation,
candidate activation, bounded diagnostics/checkpoints and acceptance closure.
Absence means forbidden. Do not reduce these to unrelated free-floating true
flags. Survey and publication grants cannot set deployment capabilities.

Application-plan members remain the exact keys in `PersistentPlan`, including
targetCommit, three image references, pinned PostgreSQL/migration authority,
schema/domain/world, origins/allowlist/loopback ports, edgeConfigId, GO reference,
execution flag and stop-and-preserve. All must cross-bind the envelope. Ports
must agree with the selected edge contract; generic example defaults do not
override that contract. Derive repository/digest from immutableReference and
require equality rather than introducing competing independent values.

### Future-result slots

| Required slot and contents | Producer / due | Source | Seal |
| --- | --- | --- | --- |
| hostImageVerification {repoDigests,revision,platform,result} | Phase 2 X, F | Selected local image metadata | R |
| privateInputChecks {ownerModeResults,formatAndEqualityResults,validatorResults} | Phases 3-4 X, F | Private validation, booleans only; no secret hash | R |
| edgeActivation {unitReference,configHashes,credentialChecks,tlsEvidence,adminExposureResults} | Phase 4 X, F | Effective host/service observations, selected safe metadata | R |
| durableStorage {volumeIdentity,networkIdentities,initOutcome} | Phase 5 X, F | Actual created resources and complete initialization evidence | R |
| databaseOperations {migration,grants,bootstrap,privileges,worldId,domainVersion} | Phases 6-9 X, F | Bounded dispatcher outputs and reviewed metadata | R |
| checkpoints[1,2] {backupReference,safeManifestReference,rehearsalReference,verification,cleanup} | Phases 10-11 / 17 X, F | Two separate backup/rehearsal evidence sets | R |
| finalTopology {containerId,pid,topologyId,nodePeer,observedAt,observationReference} | Phases 13 / 18 X, F | Node network-namespace socket measurement, real-Caddy correlation | R; replace authority with a new observation, retain history |
| admission {runId,a,b,spoof,local,observation,proofLogs,validationReference} | Phases 14-15 / 18 X, F | Existing bundle plus actual operator observations | R |
| continuity {provisionResult,firstSmoke,shutdown,secondSmoke,sameSourceVolume,checkpointReference} | Phases 16-18 X, F | Retained-file reuse, process lifecycle and safe summaries | R |
| acceptance {containmentExit,exposure,health,disposition,decisionReference} | Phase 19 F | Authorized acceptance owner after all requirements | R |

The final peer, candidate IDs, new volume identity, world UUID, backup checksum,
role connectivity and migration outcome cannot be pre-GO facts. Actual secret
values never enter any result slot. If no trustworthy provisional observation
can be obtained, STOP for a separately approved preparation path; do not guess
an IP or use disabled trusted-edge mode.

## G2 read-only survey contract

G1 authorizes **no survey**. Later G2 permission must name operator, target,
read-only interfaces, observation scope, bounded window, evidence custody and
any controlled observational requests needed for health/provisional peer.
No credential creation, repair, pull, install, probe beyond that scope or secret
readout follows implicitly. Use approved access categories; missing access is a
STOP, not permission to obtain credentials. Inspect selected metadata rather
than full environment/container/config dumps.

Each observation records category, source/interface, observedAtUtc, safe result,
evidence reference and exactly one classification: PASS, STOP, NOTE or
PA_DECISION_REQUIRED. PASS proves its named prerequisite only; NOTE requires a
reason showing no gate impact; it cannot hide an unresolved STOP. G5 binds
freshness rules and rechecks immediately before mutation; no arbitrary survey
expiry is invented in G1.

| Category / future read-only interface | PASS / STOP rule; NOTE or PA disposition |
| --- | --- |
| GHCR package metadata and approved provider permission view | All three exist, private, correct Actions access/permission policy: PASS. Missing/unsafe: STOP; tools bootstrap needs separate narrow authorization, no repair |
| Host identity/architecture and provider identity record | Matches authorized target/platform: PASS; ambiguity/mismatch: STOP. No inferred provider city/location |
| SSH trust reference | Approved host-key verification reference exists: PASS; unknown/mismatch: STOP; never collect private key/config |
| Docker/Compose version and capability output | Bind actual versions, image-only/ordered overlay and required command capabilities: PASS; unavailable/incompatible: STOP; no new guessed minimum version |
| Individually selected container/service metadata | Expected ownership and state: PASS; foreign/conflicting project components: STOP; explained unrelated existing state may be NOTE. Aggregate Docker counters alone are insufficient |
| Current server/client images, bounded authorized health | Exact current provenance and expected healthy baseline: PASS; unexplained drift/failure: STOP; historical deployment records alone are insufficient |
| Compose/network/volume metadata | Expected project assets; fresh-init volume absence established: PASS; unexplained existing persistence volume/network ownership: STOP, never auto-adopt/delete |
| Listener ownership and targeted published-port metadata | Existing selected loopback ports owned by expected old services: PASS; conflicts/public backends/DB/admin: STOP. Do not require occupied approved ports to be free before cutover |
| Caddy/systemd/unit/drop-ins/version, selected safe fields | Effective baseline and compatibility with reviewed target: PASS; unknown/unsafe effective unit or unapproved version drift: STOP; no installation implied |
| LoadCredential capability | Supported service contract established: PASS; unsupported/uncertain: STOP. Source-file existence alone does not prove loaded credentials |
| nsenter/ss availability, versions and approved privilege | Required final socket observation possible: PASS; absent/inaccessible: STOP; no ad hoc installation |
| Effective IPv4/IPv6 firewall/listener baseline | Known safe exposure and management preserved: PASS; unexplained drift: STOP. Exact future containment remains PA_DECISION_REQUIRED |
| Unrelated services and preserved forum | Existing preservation invariants hold, forum stopped with restart policy no: PASS; violation: STOP. No prune, repair or forum restart |
| Free bytes/inodes, Docker storage, read-only-known artifact sizes | Measurements captured: PASS for observation only; capacity sufficiency remains PA_DECISION_REQUIRED until calculated/approved; no guessed GB/% |
| Memory/resources and concurrent workload | Baseline captured: PASS for observation; G5 accounts for runtime plus tools/rehearsal load. Required headroom remains PA_DECISION_REQUIRED |
| Private-directory parent viability, selected stat/path metadata | Secure creation and UID 1000 mounts possible without widening access: PASS; symlink, ownership or filesystem conflict: STOP; no write test or directory creation in survey |
| Time synchronization | Compatible stable clock evidence: PASS; relevant discontinuity/uncertainty: STOP; protects lease assumptions |
| Reboot-required/failed-unit state | No relevant blocker: PASS; relevant maintenance need: STOP; explicitly unrelated existing conditions may be NOTE. No reboot/repair |
| Provisional real-Caddy peer observation | Controlled request/socket correlation under explicit survey scope: PASS as preparation only; ambiguous/not observed: STOP for candidate binding, never guessed |

Only three unresolved decisions/facts remain: capacity thresholds, exact
containment mechanism, and tools-package first-creation/safe-configuration fact.
G2 gathers evidence; G5 proposes capacity and containment for PA approval.
Tools absent/unsafe blocks publication pending separate bootstrap authorization.

## Private inputs and custody

These are categories, not values. Creation is forbidden in G1/G2 unless a
separate explicit credential-provisioning authorization exists; ordinary G2 is
read-only. Decision A uses only its existing ephemeral workflow credential.
Decision B separately gates operator private preparation and pull credentials.

Common rule for every secret below: no literal secret in argv, shell tracing,
history, ordinary evidence, PR text or logs; no secret hash/verifier as evidence.
An approved private file path may be an argument. Use protected transport,
private files from first write, no symlinks/shared temporary paths. Secret-bearing
Compose JSON stays private and is transferred only through the approved channel.
Unknown output stays quarantined until reviewed.

| Category / creation timing | Consumer and transport | Compose-render policy | Temporary cleanup / protected retention |
| --- | --- | --- | --- |
| Four distinct bootstrap passwords / authorized phase 3, before first PG start | `bootstrap.env`: admin, migrator, runtime, backup password keys; PG init environment | Present in private effective PG model; never ordinary evidence | Retain recoverable protected source credentials; remove unneeded transferred copies under custody policy, never rotate by editing env |
| Migrator URL / derived from same password in phase 3 | `migrator.env`; migrate/status/grants/bootstrap/check-migrator and backup fence | Not a runtime Compose field; passed as scoped mounted file | Remove operation copy after known completion; retain protected source for authorized maintenance |
| Runtime URL / phase 3 | `runtime.env`; server environment | Present in private Compose model | Retain protected restart input; remove temporary workstation/render copies when no longer needed |
| Runtime-db URL / phase 3, same runtime credential | `runtime-db.env`; check-runtime only, no edge secret | Tools file mount, not tools environment | Remove operation copy; source runtime custody unchanged |
| Edge assertion secret / fresh phase 3 | Same canonical raw secret in Node `runtime.env` and Caddy credential source | Node copy in private model; never Caddy environment/render/adapted config | Retain protected Node/source copies for restart; no unapproved rotation |
| Backup URL / phase 3 | `backup.env`; check-backup and dump connection | Scoped file, not required in runtime model | Remove operation copies; retain protected backup custody |
| Admin URL / phase 3 | `admin.env`; rehearsal create/drop only | Scoped file, not runtime model | Remove operation copies; retain protected recovery authority, never give to server |
| Rehearsal migrator URL / per authorized rehearsal | Target-specific `migrator.env`, same role password, fresh target name | Scoped file, not runtime model | Remove after known rehearsal/cleanup outcome; source password custody unchanged |
| Local-proof raw secret file / authorized diagnostic preparation | Exactly the same edge proof, private POSIX file to local-proof CLI | Never Compose; file path only in argv | Delete temporary proof copy after bounded checks; source retained |
| Retained guest credential / one provisioning in phase 16 | Exclusive private file; external smoke reads `BURNINGSPACE_SMOKE_CREDENTIAL_FILE` | Never Compose; no credential value in environment/argv/evidence | Keep through restart and acceptance; protected future-smoke custody, no reissuance on retry |
| Publication credential / workflow job lifetime | Existing `GITHUB_TOKEN`, password-stdin registry login | Never Compose | Job cleanup; no VPS reuse or reusable token creation |
| Conditional package-bootstrap credential / separate authorization only | Existing external-runbook least-scope bootstrap channel | Never Compose | Immediate approved cleanup/revocation; not Decision A/G1 authority |
| Staging GHCR pull credential / authorized phase 2 | Temporary least-scope read credential, password-stdin and private ephemeral `DOCKER_CONFIG` | Never Compose | Logout, destroy temporary config, revoke before container starts; retain booleans only |
| SSH credential category / existing approved access, otherwise separate provisioning | Approved SSH client/agent and verified host trust | Never Compose | Existing protected custody; no private keys/config copied to evidence |
| Existing TLS/ACME material / pre-existing service custody | Caddy protected storage; only approved later service activity | Never Compose or ordinary evidence | Preserve protected storage; do not export private keys |

Projection names/keys and connection constraints are exactly those in the v3
operator procedure and `validateProjection`: fixed matching role, internal PG
host/port/source DB, no query-secret transport; only rehearsal changes the target
DB name. URLs encode passwords in userinfo privately. Native PG tools strip
passwords from argv and use a temporary private `PGPASSFILE`, then clean it up.

Workstation real-input preflight and file-based diagnostics require an approved
POSIX environment: directories `0700`, files `0600`, owned by invoking UID.
Native Windows checks fail closed. Tools use UID:GID `1000:1000`, private
non-symlink `/run/private` and `/work`, exact operation file set and backup write
access. Host parent directories must be controlled against substitution. Do not
resolve EACCES by widening modes or running tools as root.

Caddy source remains the runbook's `root:root` `0600` raw file: exactly 43 canonical
base64url bytes, no newline or `KEY=`. `LoadCredential` exposes it to the unit;
no service-environment channel or plaintext-in-config substitute. Mode/size and
private equality PASS are evidence; bytes/verifier/hash are not.

**Host-side Compose resolution is broader than the tools container's inputs.**
The merged wrappers load bootstrap and runtime projections to resolve the full
model even for a one-role operation. The tools container receives only its exact
mounted operation projection(s), not the entire host private directory. Both
boundaries must be described honestly. Full render/inspect environment output
is not a safe artifact.

## ROLLOUT-03 command interface registry

Identifiers below name existing merged interfaces, not new executables or
permission to run commands in G1. G5 binds exact invocations, controlled shell,
dependencies, source/artifact hashes and deadlines in the future command packet.
No host Git checkout, Node/npm/tsx install, runtime source build, CI overlay,
Docker socket mount or new diagnostic endpoint is introduced.

| Command ID | Existing interface / source |
| --- | --- |
| BIND | Exact-head/ancestry, safe artifact and workstation harness checks in external staging runbook, adapted to the approved POSIX v3 inputs |
| BASELINE | G2 read-only observation interfaces, repeated within Decision B before mutation |
| PULL | External staging runbook bounded registry login, exact digest pull, selected RepoDigest inspection, logout/config destruction/revocation; extended bindings cover all three application/tools images plus pinned PG |
| PRIVATE | V3 secure directory/projection delivery and private model rendering; `runtime_compose` and `tools_compose` functions from the integration plan |
| APP-A / APP-B | `external-staging-preflight.ts --phase-a` / `--phase-b`, exact `--env`, `--plan`, `--private-dir`, `--deployment-root`, private `--compose-stdin`; validate runtime and operator profile models |
| EDGE | Existing Caddy runbook render/adapt/validate/inspect, credential/unit activation, explicit restart and live TLS/admin checks; edge preflight `--phase-b` after evidence-linked stage promotion |
| PG-START | Integration-plan PostgreSQL-only `runtime_compose up -d --no-deps postgres`, `ps postgres`, no-published-port check and topology/volume inspection |
| OP | `tools_compose run --rm --no-deps persistence-tools <operation> [target]`; operation names and projections below are dispatcher-owned |
| CANDIDATE | Integration-plan `runtime_compose up -d --no-deps server client`; exact approved pair, no dependency-driven DB migration |
| STOP-SERVER | Integration-plan `runtime_compose stop server`; bounded graceful lifecycle evidence |
| HEALTH | Existing bounded loopback/public `/health` and `/ready` checks; actual bound ports, not generic template defaults |
| PEER | Integration-plan selected container ID/PID plus `nsenter` / `ss` inside server network namespace; controlled real-Caddy correlation; no header/payload capture |
| ADMISSION | Existing admission CLI `a-exhaust`, `b-isolation`, `a-spoof`, `local-proof`, and `validate`, exact config/bundle shapes |
| PROVISION / SMOKE | Existing smoke `--provision-credential` exclusive file path, then ordinary external smoke with retained credential file and exact non-secret origin variables |
| CONTAINMENT / ACCEPT | No generic merged mutation command: G5 must bind the approved host-specific entry/exit procedure and safe acceptance observations after G2; G1 invents none |

PULL completes before any container starts; G5 must bind the existing Compose
no-pull policy for every start/run so credential cleanup is not followed by
implicit authentication or substitution. Interface shorthand above does not
relax that policy. A missing safe executable interface is a STOP for bounded
follow-up, never permission to improvise an unreviewed script or privileged tool.

APP-A validates real private inputs only after phase 3 prepares them. Its copy
keeps execution false. APP-B uses the GO-bound execution copy after evidence-linked
promotion; source HEAD equals published target and ancestry is freshly verified.
Application and edge authorization flags remain in their own schemas. Pre-render
edge artifacts with the supported unactivated inventory; never mark TLS ready
before real evidence or treat expected future hashes as observed readiness.

## Execution phases — separate task only

All preceding phases must PASS unless an explicit prerequisite below narrows a
repeat. Entry always requires valid Decision B, current bindings/window and the
ROLLOUT-03 operator. Only listed mutations are permitted. Exit zero alone is
insufficient without the stated evidence. Missing/ambiguous evidence is
INCONCLUSIVE and prevents progression, just as FAIL does. No phase runs in G1.

### Shared STOP and retry rules

- **S0:** before maintenance, stop progression; old approved services remain
  untouched/available if healthy; clean temporary auth safely. No DB created.
- **S1:** after containment entry, keep containment effective and old server
  stopped. Preserve old/new edge artifacts and actual activation state. If the
  new edge cannot safely remain active, use only the explicitly bound edge stop
  or previous-config disposition; never expose an unaccepted candidate.
- **S2:** S1 plus preserve PG volume, operation outputs and rehearsal targets.
  Stop failed PG init/restart loops. Healthy PG may remain internal; no candidate
  traffic. No source restore, DOWN, ledger edit or volume removal.
- **S3:** S2 plus explicitly stop candidate server (restart policy is not a
  recovery controller). Client may remain static, but gameplay is unavailable.
- **R0:** no retry authority by default; stop/PA disposition.
- **R-READ:** eligible unchanged read-only/harness recheck.
- **R-IDEMP:** eligible demonstrated idempotent operation with established prior
  outcome; SQL transactional intent alone does not prove that outcome.

R-READ/R-IDEMP are eligibility classes, not granted retries. Same-GO retry needs
the packet's explicit operation/class, maximum count/deadline, unchanged inputs,
artifacts/config, known prior outcome and no uncertain mutation. G5 must fill
those bounds; no infinite or implicit retry. Any missing condition means R0.
Unknown mutation, destructive recovery, source restore, volume recreation,
credential rotation, changed image/config/containment, old-arena fallback or
unlisted mutation requires PA reauthorization. Planned exact rehearsal cleanup
is a primary authorized phase, not permission for arbitrary destructive cleanup.
Peer correction is the specifically sealed derived transition described below,
not an exception allowing general config retries.

| Phase / prerequisites | Allowed mutations; interface; secret projection | Evidence and PASS | FAIL / INCONCLUSIVE, safe STOP and retry eligibility |
| --- | --- | --- | --- |
| 0 Bind execution / explicit B and separate task | Create approved safe evidence directory; BIND; existing management access only | Exact sealed packet, published target, reviewed command packet, owners, valid window, harness ready | Binding/window/harness mismatch: S0, R-READ only for unchanged known harness state; changed bindings need PA |
| 1 Fresh baseline / 0 | Read-only BASELINE; no repair, existing access | All required host/provider facts fresh and consistent; safe selected metadata | Drift/unclassified findings: S0, R-READ; remediation needs PA |
| 2 Exact images / 1 | PULL approved server/client/tools/PG; temporary pull credential only | Local exact RepoDigests, platform, three revision bindings; auth cleanup/revocation complete | Wrong/missing artifact or uncertain pull/auth outcome: S0, R0; unchanged verification may be R-READ |
| 3 Private inputs / 2 | PRIVATE, private render and APP-A; four bootstrap passwords, role URLs and edge secret | Source/delivery asset hashes, owners/modes, exact projections, equality/format and runtime/tools models PASS | Private/input failure: S0, R-READ for unchanged validation; rotation/new inputs need PA; no insecure permission workaround |
| 4 Containment and edge / 3 | Approved CONTAINMENT entry; STOP-SERVER on old service; EDGE activation/restart, evidence-linked edge Phase B then APP-B; raw Caddy credential, private runtime/bootstrap resolution | Non-operator exclusion and management preservation, old server stopped, safe effective edge/TLS/admin contract, both Phase B PASS | Entry/activation/proof/exposure failure: S1, R0; read-only verification only R-READ, repair/change needs PA |
| 5 PG fresh start / 4 | PG-START only, bootstrap projection; exact fresh-volume condition | Complete init evidence, actual named volume/internal network/init mount, no DB port, health within merged 100-second bound | Partial/unknown init, existing volume or unhealthy loop: S2, stop PG; R0 and PA recovery, never reinitialize |
| 6 Migrate/status / 5 | OP migrate then status; migrator | Canonical migration and ledger, exact schema version 1, bounded operation success | Failure/drift/unknown commit outcome: S2, R0; status R-READ and migrate R-IDEMP only after outcome established |
| 7 Grants / 6 | OP grants; migrator | Exact baked grants asset and successful result | Possible partial grants: S2; R-IDEMP only with known state and explicit bound; otherwise PA |
| 8 Bootstrap / 7 | OP bootstrap; migrator | Canonical public-arena world UUID, domain 1, known result | Unknown world outcome: S2; R-IDEMP only after establishing state, never replacement world |
| 9 Role checks / 8 | OP check-migrator, check-runtime, check-backup; migrator, runtime-db, backup in separate input dirs | All allowed/denied probes PASS, transactional test writes rolled back; actual role connectivity proved | Failed boundary or uncertain cleanup: S2; R-IDEMP only for confirmed rolled-back state; correction needs PA |
| 10 Checkpoint 1 backup / 9, no candidate traffic | OP backup; migrator + backup; fresh private work directory | Quiesced exported snapshot, dump and original private manifest, safe metadata projection, initial counts/world | Failure/partial files/live writer: S2, R0; retain partial set, no overwrite/reissue by retry assumption |
| 11 Checkpoint 1 rehearsal / 10 | OP restore-prepare with admin; restore-verify with target migrator; restore-cleanup with admin | Fresh marked isolated same-cluster target, full verification and explicit successful cleanup | Prepare/restore/cleanup failure or unknown state: S2, R0; no FORCE, auto-drop or source restore |
| 12 Candidate pair / 11, active edge and containment | CANDIDATE approved server/client pair; runtime DB + real edge proof, broader host Compose resolution | Correct images, loopback bindings, final two-network server topology, containment remains effective | Start/restart-loop/config mismatch: S3, R0; no old-image fallback |
| 13 Readiness/final peer / 12 | HEALTH, PEER; only pre-authorized observed-peer correction may stop/update/revalidate/recreate server; same secret | Ready true plus final netns real-Caddy peer equals trusted binding; latest container/PID and config evidence | Mismatch stops server: S3; bounded derived transition only if sealed, else PA. Ambiguity R-READ within bound; never none |
| 14 Public A/B/spoof / 13, quiet/refilled keys | ADMISSION phases, invalid body only; no secret | Exact arrays/timing and independently observed different effective public keys, same final topology/run | Wrong/ambiguous attribution or timing: S3; no automatic repeat. A new bounded diagnostic attempt needs explicit packet authority and known no-issuance outcome |
| 15 Local proof/logs / 14 and same topology | Approved local forwarding, ADMISSION local-proof and validate; raw private proof file | Exact local array, required fixed log reasons, correlated bundle PASS; quota not spent by invalid proofs | Missing sampled log, invalid proof result or inconsistent bundle: S3; R-READ for validator only; fresh live attempt requires explicit bound/quiet conditions |
| 16 Retained guest/smoke / 15 | PROVISION once then SMOKE; exclusive retained credential file | One intended durable issuance, file safely retained; allowed gameplay/movement/reconnect and hostile rejection PASS | Empty/reserved file, lost issuance response or assertion failure: S3, R0; no automatic new guest. Known pre-invocation harness failure may use R-READ |
| 17 Checkpoint 2 / 16 with durable identity/membership | STOP-SERVER, OP backup in second fresh work dir, restore-prepare/verify/cleanup against second fresh target; migrator + backup, then admin/target migrator/admin | Graceful quiescence; second protected dump/manifest includes smoke data; full second rehearsal and explicit cleanup PASS | Any backup/rehearsal/capacity uncertainty: S3, R0; no one-checkpoint downgrade; PA disposition |
| 18 Restart/continuity / 17 | Restart same candidate against source volume through CANDIDATE interface scoped to server; HEALTH/PEER and current-topology admission/log checks, then SMOKE using same credential | Same source images/config/volume and world identity; current final peer/bundle; successful retained credential after process restart; no provisioning | Startup/peer/admission/continuity failure: S3, R0; unchanged read-only/harness checks only if listed; derived peer rule still applies |
| 19 Acceptance / 18 and complete reviewed evidence | Approved CONTAINMENT exit only after acceptance prerequisites; ACCEPT bounded exposure/health checks, decision record | All evidence current, expected public exposure restored, unrelated services preserved; explicit final disposition | Exit/exposure drift or missing acceptance: S3, restore only authorized containment failure state; otherwise PA; never silently expose candidate |

Per-operation projections remain exact. Dispatcher operations are bounded by
the merged 240-second process cap, native PG subprocesses by their existing
caps; these are not retry authority. G5 binds missing aggregate phase/window
limits without inventing capacity thresholds. Health is not readiness or role
proof. Schema-dependent role checks belong after migrations/grants; no invented
pre-schema all-role success gate is required.

The candidate client and server form one authorized release pair. They are not
transactionally replaced by Compose, so containment spans the entire replacement;
do not serve a mixed old-server/new-client combination publicly. Explicit
sequencing replaces depends_on/restart-policy assumptions. Stage 18 restarts the
same source DB/volume, never either restored rehearsal database.

## Edge bootstrap and containment contract

Operator-only maintenance/validation is mandatory. Exclude non-operator public
gameplay; preserve SSH/management and unrelated services; explicitly allow the
diagnostic source paths; make entry/exit reversible and evidenced. Failure must
leave gameplay unavailable rather than expose an unaccepted candidate. G2
observes the mechanism's prerequisites; G5 binds exact entry/exit and failure
commands for PA approval. Any firewall mutation/restoration requires that exact
Decision B scope. **No firewall command is specified by G1.**

Use a measured old-topology peer only as a provisional literal, never a subnet
guess or final acceptance. Candidate starts under containment with real trusted
peer(s) and matching real secret; disabled-trusted-edge/none bootstrap is
forbidden. An untrusted actual direct peer can use direct-peer budgeting, so a
wrong provisional value is not universal traffic fail-close.

Observe inside the actual final Node network namespace with the merged bounded
nsenter/ss method, correlated to controlled real-Caddy traffic. Exclude healthcheck
and direct-curl sockets; no header logger or permanent endpoint. A mismatch means
stop candidate. Only the packet's derived trusted-peer inventory field may change
to the observed literal(s), with safe before/after inventory hashes, observation
reference, repeated application validation, server recreation/restart and
remeasurement. Bind maximum iterations/deadline in G5. All other config changes
need PA reauthorization. Docker network recreation invalidates old measurements;
post-restart acceptance also requires current container/PID/topology correlation.

Stop the old server before activating the proof-bearing edge. Node and Caddy
need identical proof; the Docker gateway identifies a network path, not Caddy.
LoadCredential needs service activation/restart per the existing runbook: merely
writing the source or reloading Caddy configuration does not reload the systemd
credential. Keep secret out of Caddy environment, rendered/adapted config and
evidence. Final peer plus live admission/local-proof evidence is mandatory.
The disposable edge contract harness is not a live-host validation command.

## PostgreSQL first-boot contract

Four distinct validated passwords exist before first fresh start. The official
image's init scripts operate only on a fresh data directory; later env changes
do not rotate roles. PG health is not proof of complete role initialization.
Complete proof includes successful init plus actual migrations, role checks,
backup and admin/rehearsal operations at their proper stages.

Unexpected existing volume or partial first init means STOP. Stop a failing PG
restart loop; preserve exact volume identity and bounded evidence. Do not assume
scripts replay after partial initialization. No automatic deletion/recreation,
even before accepted persistent traffic. Destructive volume disposition requires
explicit PA recovery authority. No DOWN, ledger editing or restore over source.

## Two mandatory recovery checkpoints

Checkpoint 1 is before candidate traffic. Checkpoint 2 is after retained durable
smoke identity/membership and before final restart continuity. Both require
quiescence, a fresh custom-format backup, private original manifest, reviewed
safe metadata projection, fresh marked same-cluster rehearsal, full verification
and explicit cleanup. Use distinct private work directories (each tool output is
`rehearsal.dump`) and distinct `bs_rehearsal_` targets under the existing name
guard. No reuse/overwrite of a partial or prior checkpoint.

Backup uses migrator for the row-lock/exported snapshot fence and backup role
for SELECT-only dump. Reject a live writer; maintain one consistent snapshot
through dump completion. Rehearsal create/drop uses admin; restore uses the
target migrator. Validate fresh owner/marker/isolation, dump integrity before
restore, exact canonical schema/ledger/checksum, domain, world UUID/revision and
writer epoch, counts, active/revoked credential counts, expected constraints and
FK consistency. Cleanup is explicit, refuses source/unknown target and has no
FORCE. Partial create/revoke/marker outcomes require admin/PA disposition, not
automatic destructive cleanup.

Both dump sets and original manifests remain protected until **ROLLOUT-03 is
closed AND PA explicitly authorizes disposition**. There is no time-based expiry
in G1. Restricted custody and encrypted retained/transferred copies follow the
existing backup controls. Capacity insufficient for both sets/rehearsals means
STOP / PA_DECISION_REQUIRED; neither checkpoint nor rehearsal becomes optional.

Safe projection fields: checkpoint ID, opaque dump reference, dump SHA-256,
timestamps, application commit, PG server/tool majors, backup mode, migration
authority, world UUID/slug/revision/domain/writer epoch, aggregate player,
credential, membership and lease counts, active/revoked counts, rehearsal ID,
verification results and cleanup outcome. The dump contains credential hashes;
raw dump and original manifest stay private by default. World UUID, aggregate
counts and dump integrity hash are safe metadata; credential/verifier hashes
are never ordinary evidence. Backup application commit must bind the tools image;
do not demand a fabricated non-null migration-ledger application commit.

## Admission and durable continuity acceptance

Do not redesign the merged diagnostic. Expected machine sequences are:

| Phase | Exact statuses |
| --- | --- |
| a-exhaust | 400,400,400,429 |
| b-isolation | 400 |
| a-spoof | 429,429,429,429,429 |
| local-proof | 429,429,429,429,400,400,400,429 |

Operators establish actual Caddy-observed public addresses and genuinely
different effective keys (IPv4 address or IPv6 /64), actual final Node peer,
container/topology/edge IDs, run ID, target/environment and timestamps. Two
physical machines are not required; two sources sharing one effective NAT key
do not qualify. Do not choose a provider merely to satisfy a machine count.

The merged limits remain: per-phase at most 12 seconds; A then B then spoof
within 20 seconds; per-request deadline 1500 ms and response cap 512 bytes;
peer observation/local-proof correlation within ten minutes of A. Bind quiet and
refill assumptions, actual real-Caddy correlation, and local log reason records
for edge_proof_missing, edge_proof_malformed and edge_proof_rejected within the
validator's window. Account for diagnostic sampling before a live attempt; no
unbounded retries to manufacture a passing bundle.

Diagnostic bodies are only `{}`: zero issuance-body path and no intended durable
guest rows. The bundle validator checks provided shape/sequences/correlation;
it does not independently discover addresses, inspect the host, execute probes
or count database rows. Human observation references and bound script provenance
are therefore required. **freshAuth remains INCONCLUSIVE** even when guest
admission evidence passes. No acceptance claim of fresh-auth exhaustion is made.

Provision the retained credential once through the exclusive private-file
interface, which reserves before issuance. A failure may leave an empty file or
uncertain issued identity; preserve it for disposition, never delete/retry to
create another guest automatically. Ordinary external smoke requires that file.
Reuse it across phase 18 without re-provisioning. Successful pre/post-process
smoke plus checkpoint/source identity proves bounded durable recovery evidence;
the existing one-process reconnect test alone does not prove restart persistence.
Do not claim identical transient session, room or ship transform across restart.

## Abort / recovery matrix

Every failure stops progression. The S0-S3 states and retry predicates above
apply to every row. There is no established compatible previous persistent image.
An old non-persistent arena restart is separate **SERVICE-MODE FALLBACK**, requiring
PA authority with matching client/edge handling. No automatic old-arena recovery.

| Failure class | Stop / what remains, including availability and edge | Retry / PA requirement |
| --- | --- | --- |
| Before maintenance | S0; old approved edge/server/client remain; any existing volume untouched | Listed R-READ only; changed/unknown state PA |
| Edge activation | S1; old server stopped, old/new/partial edge state explicitly recorded; retain configs/credentials; gameplay unavailable | Bound safe edge disposition only; activation/config repair PA |
| First PG init | S2; stop failing PG; exact partial volume retained, new validated edge/containment remain; old arena unavailable | No auto-init replay/recreate; PA recovery |
| Migrate | S2; tools stopped, DB/ledger retained | Read-only diagnosis; known-outcome R-IDEMP only if listed; uncertainty PA |
| Grants | S2; potentially partial grants retained | Known-state listed idempotent retry only; no assumed transaction rollback |
| Bootstrap | S2; possible committed world retained | Establish outcome; listed idempotent retry only; no replacement world |
| Privilege checks | S2; candidate never starts, DB preserved | Confirm rollback before listed retry; privilege corrections PA |
| Either backup | S2 before candidate or S3 after smoke; preserve partial and completed sets/volume; no source restore | R0; new attempt/output or cleanup requires explicit disposition |
| Restore prepare/verify/cleanup | S2/S3; preserve source and partial target plus dump/manifest; no forced drop | R0; uncertain create/marker/drop outcome PA; only originally bound successful cleanup is routine |
| Candidate start | S3; stop server/restart loop, preserve DB and both available checkpoint sets; new edge, client may remain static | No automatic restart/fallback; correction PA unless exact listed known-state action |
| Readiness | S3; same preservation, gameplay unavailable | Read-only diagnosis only within listed bound; actual failure correction PA |
| Peer mismatch | S3; same DB/edge; old arena remains stopped | Only sealed derived-literal transition/revalidation loop; otherwise PA |
| Admission evidence | S3; failed/inconclusive bounded bundle retained | No acceptance from consistency alone; explicitly bounded new diagnostic run only with known state, otherwise PA |
| Smoke harness | Halt/contain; S3 default preserves DB, edge and retained credential; harness failure alone does not diagnose runtime failure | Listed unchanged pre-invocation harness retry only; no automatic rollback or provisioning |
| Continuity assertion | S3; preserve credential, source volume and both recovery sets; game unavailable | PA recovery; never restore rehearsal over source or switch old binary |
| Secret leak / unsafe listener | Contain affected service/activity, S1/S3 as applicable; preserve DB and unrelated services; quarantine raw output | PA incident/recovery/rotation authority; never weaken TLS, allowlist, socket modes or containment |

Stopping a healthy PG service is not routine recovery; retain its internal-only
state unless the bound failure disposition requires a stop. Stopped candidate
and effective containment prevent restart policy or partial edge activation
from silently exposing an unaccepted runtime. After maintenance begins the old
arena stays unavailable unless PA separately authorizes service-mode fallback.

## Safe evidence manifest specification

Future directory naming: approved evidence root / execution task ID /
UTC timestamp plus run ID. Actual root and identifiers are bound in G5, not
invented here. The safe manifest is separate from private backup manifests and
secret-bearing render/input files. Unknown output is private/quarantined until
reviewed; never collect arbitrary raw stderr/transcripts into normal evidence.

| Required manifest field(s) | Source and timing |
| --- | --- |
| schemaVersion / packetId / packetSha256 / goId / runId / environmentId / targetCommit | Sealed B plus phase 0 identity; immutable |
| publicationRunReference / images | G4 exact immutable release; immutable |
| startedAtUtc / completedAtUtc | Execution clock; completion absent until terminal disposition |
| previousState / currentState | Append-only phase transitions; authorization remains separately referenced |
| phaseResults[] | One bounded record per actual attempt, including NOT_RUN dependencies |
| safeArtifacts[] | Reviewed non-secret artifact references and integrity metadata |
| sensitiveArtifactReferences[] | Opaque references only, never copied secret content |
| finalDisposition / acceptanceOrStopDecisionReference | Required at acceptance/stop closure, absent while incomplete; explicit accountable decision |

Each `phaseResults` item contains phaseId, attempt, operatorReference, commandId,
commandPacketSha256, startedAtUtc, completedAtUtc, invoked, exitCode (absent if
not invoked), event, boundedCode, result (PASS/FAIL/INCONCLUSIVE/NOT_RUN),
evidenceReferences and nextState. Record whether a structured tool result exists;
do not manufacture a runtime assertion failure for a harness that never started.
Select fixed known event/code fields and phase-declared safe metrics only.

Each `safeArtifacts` item contains path/reference, type, byteLength and sha256.
Each `sensitiveArtifactReferences` item contains opaqueId, custodian,
retentionPolicy and disposition. References must not embed access tokens or
password-bearing URLs. Preserve previous/current observations with attempt
history; an updated result does not erase prior failure or grant broader scope.

NEVER ordinary evidence: DB passwords, password-bearing DB URLs, raw edge proof,
edge-secret verifier/hash, smoke/reconnect credentials, GHCR PAT/token, SSH
credential/config, full secret-bearing Compose JSON, raw dump, arbitrary raw
stderr/transcripts, query-bearing credential URLs or TLS private material.
Do not publish sensitive-file hashes as surrogate proof of secret correctness.
The reviewed dump SHA is an expressly permitted artifact-integrity field.

## G1 verification and next gate

G1 changes only its task/specification and the two governance summaries. Validate
diff whitespace, four-file scope, links/paths, repeated source facts, authority
and status wording, baseline-vs-target distinction, no secrets/invented live
values/digests, and separate ROLLOUT-03 execution ownership. No runtime test or
infrastructure check is required/permitted by this documentation packet.

Next gates: exact-head Core, governed QA, independent consolidated
Architecture/Network/Security/Ops-QA review, then PA G1 disposition and human
merge. Only after G1 merge request bounded G2 read-only provider/host survey
authorization. G1, its commit, its PR and task completion issue neither GO.
