# OPS-002 Phase B — Draft Deployment GO Packet

Status: `DRAFT / INCOMPLETE / GO NOT ISSUED`

This packet is not a deployment authorization. Incomplete fields must be
resolved and verified for the exact environment before the Product Architect
can make an environment-specific GO decision.

## Fixed bindings

- Environment ID: `burningspace-staging-01`
- Environment class: `shared-existing-vps-with-isolated-compose-staging`
- Superseded environment class: `dedicated-isolated-single-host-vps`
- Provider: `Contabo`
- Canonical release registry: `GHCR`
- Server image repository: `ghcr.io/pittonje/burningspace-deploy-server`
- Client image repository: `ghcr.io/pittonje/burningspace-deploy-client`
- DNS zone: `burningforge.dev` — `CONFIGURED / PUBLICLY VERIFIED`
- Public client hostname: `game.burningforge.dev` — `A 164.68.107.13 / NO
  AAAA / VERIFIED`
- Public server hostname: `game-server.burningforge.dev` — `A 164.68.107.13 /
  NO AAAA / VERIFIED`
- Public client origin: `https://game.burningforge.dev`
- Public server origin: `https://game-server.burningforge.dev`
- Client build-time server URL:
  `VITE_BURNINGSPACE_SERVER_URL=https://game-server.burningforge.dev`
- Exact server allowed Origin: `https://game.burningforge.dev`
- Hostile smoke Origin: `https://hostile.burningforge.dev` — Origin-header test
  identity only; no Phase A DNS record, certificate, or host deployment is
  required for it.
- Publication workflow: `OPS-002 Publish Staging Images`
- Final private bootstrap: `COMPLETE`
- Final package existence: `VERIFIED`
- Final Gate 1: `PASS`
- Final Manage Actions access before publication: `pittonje/BurningSpace →
  WRITE` for both packages
- Final canonical publication: `SUCCESS`
- Final publication workflow run ID: `33340075681`
- Final target commit: `4a774354859c036d45666496539c2fc3c24b9f1c`
- Target platform: `linux/amd64`
- Final server digest/reference:
  `ghcr.io/pittonje/burningspace-deploy-server@sha256:816062e5165f3d02aed2b1d5524c1bc53de85bd0709fb92b0ef421d3be626085`
- Final client digest/reference:
  `ghcr.io/pittonje/burningspace-deploy-client@sha256:ae65d4c6faadd55b04549a4a070ac5cd6ba1e5d4288a6adb1f6b2a541b9d789f`
- Final Gate 2: `PASS — PRIVATE / repository source pittonje/BurningSpace
  observed and accepted / inherited access OFF / Actions WRITE`, both packages
- Final release-specific Phase A: `COMPLETE`
- Server package policy: `PRIVATE — PRODUCT ARCHITECT DECIDED`
- Client package policy: `PRIVATE — PRODUCT ARCHITECT DECIDED`
- Final provider state: `GATE 2 VERIFIED / PRIVATE`
- Bootstrap environment: `LOCAL WINDOWS WORKSTATION`
- Bootstrap tool: `crane — LOCAL DAEMONLESS EXECUTION COMPLETE`
- Bootstrap credential: `PAT CLASSIC / write:packages ONLY / EPHEMERAL`
- Bootstrap PAT: `REVOKED / CREDENTIAL CLEANUP PASS`
- Bootstrap artifact: `MINIMAL STANDARD OCI/DOCKER IMAGE MANIFEST /
  NON-RELEASE / NEVER DEPLOYMENT EVIDENCE`, tag
  `bootstrap-20260830T212613Z`, digest
  `sha256:1a243e5af4508768fad72a909b1f5173594327caae724af8ae483803e816d197`
- Host pull authority: `DEFINED`
- Credential class: `PAT CLASSIC / read:packages ONLY / EPHEMERAL`
- Persistent host registry credential: `NONE`
- Registry credential: `OPERATOR-HELD / NOT STORED ON HOST`
- Proof PAT lifecycle: `NOT REVOKED AUTOMATICALLY / SHORT-LIVED /
  OPERATOR-HELD`; reuse is limited to the post-GO exact-digest pull, followed
  immediately by logout, config destruction, and manual revocation. Revoke
  earlier if it expires or is no longer required.
- Pre-GO private GHCR login: `PASS`
- Exact server manifest resolution: `PASS`
- Exact client manifest resolution: `PASS`
- Registry logout and temporary-config cleanup: `PASS`
- First-deployment rollback mode: `bootstrap-no-previous-release`
- First target edge configuration ID: `burningspace-staging-01-edge-v1`
- First-deployment previous release and edge bindings: `STRUCTURALLY ABSENT`
- Physical isolation: `false`
- Phase A merge: `33bff5009926bb5247acad5ebcf85ba8b7f626ce`
- Phase A implementation head: `3522116d62d8fb93a4a4ca1756aec6818280f0bb`
- Phase A evidence head: `d2322e24ac2ff0525d5b6332143098bb048d6262`
- Phase A implementation/tooling review: `APPROVED / COMPLETE`
- Shared-host hardening merge: `21a4ce2fe796f655d20911d8a52a60c69eec432d`
- Shared-host hardening implementation head:
  `aa611ece4b0f974c30951a10e6954749b3aa10c4`
- Authority transition: `MERGED / COMPLETE`
- Repository hardening: `COMPLETE` — shared-host repository hardening is
  `MERGED / COMPLETE`
- Host-gate discovery: `COMPLETE`
- Edge implementation: `SELECTED — Caddy host systemd service`
- Edge repository preparation: `MERGED / COMPLETE` through PR #69
- Edge reviewed implementation:
  `864d1aacb2f902e43e0395b5058fe3e970a9dc11`
- Edge evidence: `ee41232b4eff513ec3d3d04ee8a03845e719171d`
- Edge merge: `4d691b056a8fa5cc558f52ae81da51d69aff2fc1`
- Caddy validation baseline: `2.11.4`
- Host Caddy installation: `NOT PERFORMED`
- Installed Caddy version: `NOT VERIFIED`
- Admin control plane: `SELECTED — permission-restricted Unix socket`
- Admin socket: `unix//run/caddy/burningspace-admin.sock`
- Admin TCP listener: `FORBIDDEN`
- Systemd runtime directory: `NOT INSTALLED / NOT VERIFIED` — intended
  `/run/caddy`, `caddy:caddy`, mode `0700`, service `UMask=0077`
- Socket permission evidence: `NOT VERIFIED`
- Host reload evidence: `NOT VERIFIED`
- Phase B external execution authorized: `false`
- Deployment GO issued: `false`
- Public production launch authorized: `false`

## Retired public generation 1 evidence

- Workflow run: `33310151475`
- Target commit: `75e4cd0ca71ca0b104067e19e0b7bfb2b5b3c81a`
- Server image:
  `ghcr.io/pittonje/burningspace-server@sha256:9bcd2855cb588c326af72d10a634921db05b0729197e477c6862cc9e8aaddd58`
- Client image:
  `ghcr.io/pittonje/burningspace-client@sha256:118ebff019677c11654fef002cb6ca9c2eed8fd6821400994cd0f755eb8508c2`
- Provider state: `PUBLIC — MANUALLY OBSERVED BY PRODUCT ARCHITECT`
- Disposition: `RETIRED / HISTORICAL EVIDENCE ONLY / NOT AN AUTHORIZED
  DEPLOYMENT TARGET`
- Release-specific Phase A: `PASS EVIDENCE EXISTS / SUPERSEDED BY RETIRED
  CANDIDATE`

## Retired public generation 2 evidence

- Workflow run: `33323488162`
- Target commit: `f9c1d86348a9ff572c7068433aa4295cb92befc2`
- Server image:
  `ghcr.io/pittonje/burningspace-staging-server@sha256:0150c4ad32d4a2976502dda68d4507b4bf64eefc9ea7d4f2d23b3740c11c95a1`
- Client image:
  `ghcr.io/pittonje/burningspace-staging-client@sha256:bf14e873b82d9b419559f48ddac63bf2e2cebeb8c908e108d466b662d8db2968`
- Provider state: `PUBLIC — MANUALLY OBSERVED BY PRODUCT ARCHITECT`
- Package-settings evidence: source repository `pittonje/BurningSpace`;
  inherited access enabled.
- Disposition: `RETIRED / HISTORICAL EVIDENCE ONLY / FORBIDDEN DEPLOYMENT
  TARGET`
- Release-specific Phase A: `NEVER CREATED`

## Final private bootstrap and linkage gates

- Package-creation rule: both final private packages must exist before any
  repository connection.
- Canonical workflow source label: `org.opencontainers.image.source` is
  forbidden and must remain absent; no substitute repository-linking label is
  authorized. `org.opencontainers.image.revision=${GITHUB_SHA}` remains.
- Bootstrap context: local Windows workstation using daemonless `crane`; not
  BurningSpace GitHub Actions, the Contabo VPS, Docker Desktop, or Docker
  Engine.
- Bootstrap PAT lifecycle: create immediately before bootstrap with
  `write:packages` only, authenticate locally, push server then client, log out
  and destroy local credential material, then revoke immediately before Gate
  1. No Actions or VPS secret is created.
- Bootstrap versions: minimal standard OCI/Docker image manifests tagged
  `bootstrap-<timestamp>`; no `latest`, source-linkage metadata, or deployment
  authority. Retain them as `NON-RELEASE / NEVER DEPLOYMENT EVIDENCE`.
- Completed bootstrap binding: tag `bootstrap-20260830T212613Z`, digest
  `sha256:1a243e5af4508768fad72a909b1f5173594327caae724af8ae483803e816d197`,
  PAT `REVOKED`, credential cleanup `PASS`, Gate 1 `PASS`. The bootstrap is not
  a release target. The first attempt did mutate package state; any earlier
  zero-mutation conclusion is obsolete.
- Gate 1 observed result before repository authorization: each package
  `PRIVATE`, source linkage `NONE`, inherited access `OFF / NOT APPLICABLE`,
  Manage Actions access `NONE`. This is historical pre-publication evidence,
  not a durable Gate 2 source-linkage invariant.
- Repository authorization after Gate 1: Manage Actions access adds
  `pittonje/BurningSpace` with `WRITE`; **Connect repository**, inherited
  access, and an intentional `ADMIN` grant are forbidden.
- Gate 2 required result after normal `GITHUB_TOKEN` publication: each package
  `PRIVATE`, inherited access `OFF`, and explicit Actions access present with
  an acceptable recorded role. Repository source `pittonje/BurningSpace` is
  permitted and was observed for both final packages even though the workflow
  contains zero `org.opencontainers.image.source` labels. This is observed
  provider behavior, not a causal claim. The actual role is `WRITE`; Gate 2
  passed. A future `ADMIN` role requires Product Architect disposition without
  automatic mutation. Do not remove the source association, click **Connect
  repository**, or enable inherited access.
- Failure rule: if either package is public, stop. Do not change visibility,
  delete the package, or automatically retry another namespace.

## Known environment facts

[The environment decision](ops-002-phase-b-environment-decision.md) is the
single source of truth for the measured host evidence summarized here. Current
evidence satisfies the recorded pre-GO host remediation, reboot/baseline, DNS,
release, Phase A, private-registry, and bootstrap rollback-authority gates. It
does not establish live Caddy/TLS, either Phase B result, image pull/start, or
external smoke.

- Environment selected: `YES`
- Provider selected: `YES` — Contabo
- Environment class selected: `YES`
- Host discovery: `COMPLETE`
- Resource headroom: `PASS` — point-in-time measured evidence, not guaranteed
  capacity
- Forum: `STOPPED / PRESERVED / AUTOSTART DISABLED / RESTART POLICY NO`
- Public 80/443: `AVAILABLE`
- Server loopback: `127.0.0.1:2567`
- Client loopback: `127.0.0.1:18080` for this selected host; the generic
  Compose default remains `8080`
- Shared-host repository hardening: `MERGED / COMPLETE`
- Host remediation and controlled reboot: `COMPLETE / POST-REBOOT BASELINE PASS`
- Firewall: `PASS — ROOT-LEVEL EFFECTIVE REVIEW COMPLETE / UFW ACTIVE`
- TCP 4000: `LOOPBACK ONLY`
- TCP 9090: `LOOPBACK ONLY`
- TeamSpeak administrative/query ingress: `REVIEWED / EXPECTED LISTENERS ONLY`
- Maintenance: `COMPLETE BEFORE CONTAINER CREATION`
- Controlled reboot for current deployment sequence: `COMPLETE` at
  `2026-08-31T07:10:25Z`; boot ID
  `088f9941-7056-488e-a0fb-b25f8e87a0c7`
- Post-reboot baseline: `PASS`; reboot-required `CLEARED`
- Edge: `SELECTED / REPOSITORY PREPARATION MERGED AND COMPLETE / NOT INSTALLED`
- DNS: `CONFIGURED / VERIFIED`
- TLS: `NOT READY / NOT CONFIGURED`
- Final private bootstrap: `COMPLETE / PAT REVOKED`
- Final package existence: `VERIFIED`
- Final Gate 1: `PASS`
- Final Manage Actions access: `WRITE / VERIFIED`, both packages
- Final publication: `33340075681 / SUCCESS`
- Final target commit: `4a774354859c036d45666496539c2fc3c24b9f1c`
- Final image digests: `BOUND`, exact references in Fixed bindings
- Final Gate 2: `PASS`
- Final release-specific Phase A: `COMPLETE`
- Server package visibility policy: `PRIVATE — PRODUCT ARCHITECT DECIDED`
- Client package visibility policy: `PRIVATE — PRODUCT ARCHITECT DECIDED`
- Final provider visibility confirmation: `PRIVATE / VERIFIED`
- Host pull authority: `DEFINED / OPERATOR-HELD / PRE-GO PROOF PASS / NO HOST
  PERSISTENCE`
- Host images pulled: `NO`
- Caddy deployment: `NOT DEPLOYED`
- BurningSpace deployment: `NOT DEPLOYED`
- Previous release image digests: `STRUCTURALLY ABSENT —
  bootstrap-no-previous-release`
- External validation: `NOT STARTED`
- Deployment GO: `NOT ISSUED`
- Packet state: `DRAFT / INCOMPLETE`

## Remaining pre-GO decision bindings and post-GO execution bindings

- Final real inventory bound to final target commit and immutable digests:
  `VERIFIED / ACTIVE / GIT-IGNORED`; application env SHA-256
  `8e989f048fa5c80f15b672c5de3638c81d48cbb2f6e1a0f471d60a1a0759b08e`,
  application plan SHA-256
  `0ffa473d762230f084f6d239e7fb5a328069cbba0ae9409c7b712e9a3fb29607`
- Region: `NOT PROVIDED — PRE-GO BLOCKER`
- Host/environment asset identifier: `vmi3266913`
- Target public IP: `164.68.107.13`
- Previous approved commit: `ABSENT — bootstrap-no-previous-release`
- Previous server image digest: `ABSENT — bootstrap-no-previous-release`
- Previous client image digest: `ABSENT — bootstrap-no-previous-release`
- Edge configuration identifier: `burningspace-staging-01-edge-v1`
- Previous edge configuration identifier: `ABSENT — bootstrap-no-previous-release`
- Installed Caddy version/source: `NOT VERIFIED`
- Effective Caddy systemd unit/drop-in, runtime-directory ownership/mode, Unix
  socket ownership/mode, and absence of TCP admin listeners: `NOT VERIFIED`
- Rollback mode: `bootstrap-no-previous-release`
- Effective resource-limit validation on deployed containers: `NOT PERFORMED`
- Management-access owner: `NOT PROVIDED — PRE-GO BLOCKER`
- Abort owner: `NOT PROVIDED — PRE-GO BLOCKER`
- Rollback owner: `NOT PROVIDED — PRE-GO BLOCKER`
- Credentials-ready confirmation without values: `PASS — operator-held
  read:packages PAT; no value recorded`
- Server package provider visibility: `PRIVATE / VERIFIED`
- Client package provider visibility: `PRIVATE / VERIFIED`
- Repository source: `pittonje/BurningSpace / OBSERVED / ACCEPTED`, both
  packages
- Inherited access: `OFF / VERIFIED`, both packages
- Manage Actions access role: `WRITE / VERIFIED`, both packages
- Ephemeral private-registry login: `PASS`
- Exact server manifest resolution: `PASS`
- Exact client manifest resolution: `PASS`
- Registry logout and temporary-config cleanup: `PASS`
- DNS-ready confirmation: `PASS`
- TLS-ready confirmation: `POST-GO EXECUTION GATE / NOT READY`
- Firewall-ready confirmation: `PASS` — root-level evidence
  `D:\Temp\burningspace-ops002-controlled-reboot-20260831T070724Z\post-reboot-firewall.json`,
  listener evidence `post-reboot-listeners.json`, evidence-manifest SHA-256
  `509a4b066d30ea7cae38edcf62dd9dc58c6e6b0dfa0867593d1893b480ee438d`
- Log-redaction confirmation: `PRE-GO LOCAL CONTRACT PASS / LIVE POST-GO
  EVIDENCE PENDING`
- Rollback-ready confirmation: `BOOTSTRAP AUTHORITY PASS / NAMED ABORT OWNER
  STILL REQUIRED`
- External smoke command: `NOT PROVIDED — PRE-GO RUNBOOK BINDING REMAINS OPEN`
- Evidence destination:
  `D:\Temp\burningspace-ops002-private-ghcr-prego-retry-20260831T081129Z`
  — checksum-bound operator evidence outside Git; it is not a CI artifact and
  requires trusted operator attestation
- Operations/Security review binding: `NOT PROVIDED FOR COMPLETE PRE-GO PACKET`
- Network/Runtime review binding: `NOT PROVIDED FOR COMPLETE PRE-GO PACKET`
- Mandatory Claude QA binding: `PR REQUIRED CHECK / MUST BE SUCCESS ON EXACT
  MERGE HEAD`; the substantive reconciliation review on implementation head
  `f6a4cd3cc94435ee21a157c93df826626636cf6b` returned `Approved with
  suggestions` with no blockers in workflow run `33374592021`
- Product Architect GO reference: `NOT PROVIDED`

The missing GO reference and all `true` execution fields are intentionally
post-decision values, not pre-GO blockers. Host Caddy installation, real TLS,
Edge Phase B, Application Phase B, image pull/start, and external smoke are
mandatory post-GO execution gates. They remain pending by design and cannot be
used to claim deployment success.

## Repository hardening contract

PR #67 merged the controlled-staging repository contract:

- authoritative server maximum: `1.00 CPU`, `1 GiB RAM`;
- static client maximum: `0.25 CPU`, `256 MiB RAM`;
- both containers: Docker `json-file`, `max-size=10m`, `max-file=3`;
- one non-external project-scoped `burningspace` bridge network;
- host publications remain loopback-only through supported bind-port
  configuration. For `burningspace-staging-01`, intended environment values
  are `BURNINGSPACE_SERVER_BIND_PORT=2567` and
  `BURNINGSPACE_CLIENT_BIND_PORT=18080`; the latter is a selected-host override
  of the valid generic `8080` default;
- the real staging Compose path contains immutable image references and no
  source-context build;
- local/CI source builds use a separate override and are not a shared-host
  deployment path;
- target server/client images must each be recorded as
  `repository@sha256:<64 lowercase hex>`;
- first deployment uses `bootstrap-no-previous-release` with all previous
  image/commit/edge fields structurally absent; and
- subsequent deployments use `previous-approved-release`, require distinct
  immutable previous-approved images/commit/edge configuration, and switch to
  those exact digests without a rebuild.

These repository limits remain `SUITABLE / MUST BE VERIFIED WHEN DEPLOYED`.
Host capacity is not guaranteed. GHCR is the selected registry authority. The
images published by runs `33310151475` and `33323488162` are retired historical
evidence and not active target images. Final private workflow run `33340075681`
succeeded once at exact `GITHUB_SHA`
`4a774354859c036d45666496539c2fc3c24b9f1c`; the immutable deploy-server and
deploy-client references in Fixed bindings are the only active release images.

## Pre-GO prerequisites

- Phase A implementation/tooling remains merged, Core-green, independently
  approved, and bound to the fixed heads above. Release-specific Phase A for
  generation 1 is superseded, generation 2 never received it, and the final
  candidate's replacement release-specific Phase A is `COMPLETE`. Its evidence
  is `D:\Temp\burningspace-ops002-final-private-phasea-20260830T233259Z`;
  `SHA256SUMS.txt` SHA-256 is
  `3b78b2861450a1e39aa7dc729dd1cb065c80dcee1cbd8858c1ff04e829838a2e`.
- Every pre-GO repository, host, DNS, private-registry, rollback-readiness, and
  operational-isolation condition in
  [the environment decision](ops-002-phase-b-environment-decision.md) is
  complete and evidenced. Live Caddy/TLS state and both Phase B validators are
  post-GO execution gates and are not prerequisites for issuing GO.
- Host maintenance is complete before any BurningSpace container is created,
  the separately Product-Architect-authorized reboot is complete, and the new
  boot ID plus post-reboot forum, port, Docker, unrelated-service, failed-unit,
  reboot-required-state, and firewall checks pass.
- Root-level effective IPv4/IPv6 firewall evidence is complete, including
  Docker-aware forwarding and `DOCKER-USER` treatment. TCP 4000 is restricted;
  TCP 9090 ingress is restricted or effectively verified; and TeamSpeak
  administrative/query TCP 10011, 10022, and 10080 are reviewed/restricted.
- The forum standstill is acknowledged: the preserved forum remains stopped
  with restart policy `no` while the BurningSpace staging edge owns TCP 80/443.
- The exact environment, public origins, Origin allowlist, release bindings,
  edge configuration, rollback binding, resource limits, owners, and evidence
  destination are complete.
- The pre-GO Caddy contract binds the reviewed version, drop-in, service
  identity, runtime directory, Unix admin socket, hashes, log-safety rules, and
  rollback. Effective host ownership/listener/reload/TLS evidence is required
  after GO and before Edge Phase B may pass.
- The target server/client image references are supplied, digest-pinned,
  non-placeholder, and derived from approved off-host builds. Previous-release
  references are structurally absent for bootstrap or strictly supplied for a
  later `previous-approved-release` deployment.
- The local daemonless bootstrap has completed with the bootstrap PAT revoked;
  Gate 1 verified both packages private with no source linkage, inherited
  access, or Actions access before publication; and Manage Actions access then grants
  `pittonje/BurningSpace` `WRITE` without connecting the repository.
- The canonical publication has succeeded from post-recovery-merge `main` and
  its workflow run, exact `GITHUB_SHA`, and immutable server/client references
  are bound. Gate 2 reconfirmed both packages private, accepted the observed
  provider repository-source association, verified inheritance off, and
  recorded Actions role `WRITE` before final release-specific Phase A.
- If either package is public at a private gate, execution stops. Package
  visibility is not mutated, the package is not deleted, and another namespace
  is not tried automatically. An unexpected `ADMIN` role at Gate 2 is returned
  to the Product Architect for F4 disposition without automatic mutation.
- The approved host pull authority is available through secure external
  handling: a fresh short-lived PAT classic with `read:packages` only, read
  authority for both packages, and no additional `write:packages`,
  `delete:packages`, `repo`, `workflow`, `admin:*`, or `gist` authority.
- After the authorized reboot and baseline revalidation, ephemeral
  authentication succeeds; read-only `docker buildx imagetools inspect`
  resolves both exact immutable manifests without pulling image layers; and
  logout plus removal of the temporary `DOCKER_CONFIG` are evidenced without
  recording the token.
- Actual image pulls remain post-GO. After GO, explicit `docker pull` retrieves
  each exact digest, local `RepoDigests` are verified, logout and temporary
  credential destruction complete before startup, and the exact real Compose
  startup uses `--pull never`. `docker compose pull` after credential
  destruction is forbidden.
- Credential, DNS, firewall, pre-GO log-redaction contract, and rollback
  readiness are confirmed without recording secret values. Real TLS and live
  log-redaction evidence are post-GO execution gates.
- Operations/Security and Network/Runtime evidence approves the exact target.
- Mandatory Claude QA is bound to the exact target or receives a
  policy-compliant Product Architect infrastructure disposition.
- The Product Architect issues an explicit GO naming the environment and
  target release.

## Mandatory post-GO execution gates

GO authorizes the bounded host-mutation sequence; it does not waive any gate:

1. bind the exact GO reference and truthful authorization fields;
2. install/activate the Phase-A-reviewed Caddy edge;
3. obtain and prove real automatic-HTTPS/ACME certificates;
4. set `tlsReady=true` only after evidence exists and require Edge Phase B PASS;
5. require Application Phase B PASS from the pinned target worktree;
6. perform exact-digest pulls under ephemeral authentication, verify
   `RepoDigests`, log out, and destroy the temporary config;
7. start with `--pull never`, run external smoke, and complete or roll back.

Failure of either Phase B validator stops progression. GO is not permission to
bypass a failed validator.

## Required evidence

The completed packet and later Phase B record must bind non-secret evidence
for:

- The exact repository head and deployed image or build identifiers.
- Gate 1 and Gate 2 confirmations for both GHCR packages, including private
  visibility, the observed and accepted repository-source association,
  disabled inheritance, and Actions access state and actual role; successful
  ephemeral host read-only authentication; both
  exact pre-GO manifest resolutions; and successful logout and
  temporary-config cleanup, without any credential value or image-layer pull
  before GO.
- The environment ID, public client/server origins, and edge configuration.
- Pre-GO DNS, loopback bindings, firewall exposure, and management separation;
  the later Phase B record binds live TLS status.
- Effective Caddy service identity, committed drop-in, runtime-directory and
  socket ownership/modes, service umask, Unix-socket reload result, unrelated
  local-user denial, post-reload routing, and live proof that no TCP admin
  listener exists on IPv4 or IPv6.
- The bounded Compose project, container, and project-scoped network
  boundaries and the effective per-container CPU, RAM, and log-rotation
  limits, plus confirmation that sufficient host reserve remains.
- Confirmation that unrelated host workloads, including the preserved and
  stopped forum, were not modified by BurningSpace deployment operations.
- Confirmation that the forum standstill and preservation/prune prohibition
  remained effective through maintenance, Docker restarts, and edge cutover.
- Original Origin preservation, hostile and absent Origin rejection, and
  WebSocket upgrade behavior.
- Allowed gameplay, authoritative state and movement, reconnect continuity,
  and duplicate-ownership protection.
- Browser reconnect UX, health/readiness, bounded shutdown, restart/reset, and
  lifecycle logs.
- Generated-asset and effective edge-log redaction.
- Rollback execution or bounded rehearsal and post-rollback validation.
- A clean post-execution repository state.

## Abort conditions

Abort for invalid TLS or DNS; stripped or rewritten Origin; hostile or absent
Origin acceptance; wildcard allowlisting; broken WebSocket upgrade; direct
service, admin, or dashboard port exposure; any TCP Caddy admin listener; an
admin socket reachable by an unrelated local user; wrong Caddy runtime-directory
ownership, mode, or umask; failed Unix-socket reload; plaintext external transport;
disabled TLS verification; credential, reconnect-token, query-string, or
environment leakage; readiness failure; client endpoint mismatch; duplicate
reconnect ownership; stale review or Core bindings; unavailable rollback;
failed shutdown; an unexpected persistence requirement; or any difference
between the approved plan and effective environment.

A failed required check must not be reported as a successful deployment or
used to continue toward public launch.

## Rollback binding

Rollback remains incomplete until the target release, environment, edge
configuration, exact rollback mode, rollback owner, reproducible configuration
or approved backup, expected room reset, and post-rollback validation are all
bound. For this first deployment, `bootstrap-no-previous-release` restores
`PRE_BURNINGSPACE_DEPLOYMENT_STATE` by removing only the BurningSpace Compose
project and edge configuration and proving its backend/public listeners are
gone while preserving unrelated services and the stopped forum. Later
deployments remain strict `previous-approved-release` rollbacks with all
previous approved release and edge bindings mandatory.

## Secret handling

Credential values, private keys, provider credentials, SSH configuration,
private-key paths, real environment dumps, reconnect tokens, query-bearing
WebSocket URLs, and unbounded sensitive logs must remain outside Git, PR text,
CI output, and evidence. The GHCR token is entered directly in the interactive
SSH session through non-echoing input, is never forwarded through a PowerShell
command, exported, placed in argv or shell history, or stored in an inventory.
This packet records readiness by category only. The short-lived token remains
operator-held; its value is not recorded, and no persistent host registry
credential is authorized or present.

## Product Architect decision

GO: `NOT ISSUED`

Reason: Environment selection, repository/host hardening, controlled reboot,
post-reboot baseline, DNS, Caddy repository preparation/local validation, final
private publication and gates, replacement release-specific Phase A, ephemeral
registry login, both exact manifest resolutions, and credential cleanup are
complete. True pre-GO packet blockers remain: region metadata; management,
abort, and rollback owners; the exact external smoke command; complete
Operations/Security and Network/Runtime review bindings. Mandatory Claude QA
for this reconciliation is enforced as a required PR check on the exact merge
head and does not replace either specialist packet review. Live Caddy
installation, TLS, Edge/Application Phase B, image pull/start, and smoke
execution are post-GO gates rather than pre-GO blockers. Deployment `GO` is
not issued.
