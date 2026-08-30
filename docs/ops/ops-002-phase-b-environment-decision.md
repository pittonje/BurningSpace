# OPS-002 Phase B — External Staging Environment Decision

Status: `FINAL PRIVATE RELEASE BOUND / GATE 2 PASS / REPLACEMENT PHASE A COMPLETE / HOST REMEDIATION AND INSTALLATION GATES REMAIN / GO NOT ISSUED`

Amended: 2026-08-31 — final private GHCR release reconciliation.
Repository hardening and Caddy edge repository preparation are merged, host
discovery is complete, and the Product Architect has selected private package
policy plus an ephemeral read-only host-pull model. Both accidental public
package generations remain retired from deployment authority. The final private
packages are bootstrapped, published, manually verified at Gate 2, and bound to
replacement release-specific Phase A evidence. The originally recorded class
`dedicated-isolated-single-host-vps` remains superseded for OPS-002 controlled
low-traffic external staging only. The supersession rationale and the
preserved historical audit conclusion are recorded below.

## Decision

- Environment ID: `burningspace-staging-01`
- Environment class: `shared-existing-vps-with-isolated-compose-staging`
- Superseded environment class: `dedicated-isolated-single-host-vps`
- Environment purpose: `controlled low-traffic BurningSpace external staging
  only`
- Provider: `Contabo`
- Canonical release registry: `GHCR`
- Server image repository: `ghcr.io/pittonje/burningspace-deploy-server`
- Client image repository: `ghcr.io/pittonje/burningspace-deploy-client`
- Target release commit policy: the exact `GITHUB_SHA` of the
  Product-Architect-approved successful `OPS-002 Publish Staging Images`
  workflow run, recorded concretely in the release GO packet and real Phase B
  inventory.
- Retired generation 1: workflow run `33310151475`, target commit
  `75e4cd0ca71ca0b104067e19e0b7bfb2b5b3c81a`, server
  `ghcr.io/pittonje/burningspace-server@sha256:9bcd2855cb588c326af72d10a634921db05b0729197e477c6862cc9e8aaddd58`,
  and client
  `ghcr.io/pittonje/burningspace-client@sha256:118ebff019677c11654fef002cb6ca9c2eed8fd6821400994cd0f755eb8508c2`.
  Provider state and disposition: `PUBLIC / RETIRED / HISTORICAL EVIDENCE
  ONLY / FORBIDDEN DEPLOYMENT TARGET`.
- Retired generation 2: workflow run `33323488162`, target commit
  `f9c1d86348a9ff572c7068433aa4295cb92befc2`, server
  `ghcr.io/pittonje/burningspace-staging-server@sha256:0150c4ad32d4a2976502dda68d4507b4bf64eefc9ea7d4f2d23b3740c11c95a1`,
  and client
  `ghcr.io/pittonje/burningspace-staging-client@sha256:bf14e873b82d9b419559f48ddac63bf2e2cebeb8c908e108d466b662d8db2968`.
  Provider state and disposition: `PUBLIC / RETIRED / HISTORICAL EVIDENCE
  ONLY / FORBIDDEN DEPLOYMENT TARGET`. Package settings showed source
  repository `pittonje/BurningSpace` and inherited access enabled.
- Final package bootstrap: `COMPLETE` — tag
  `bootstrap-20260830T212613Z`, digest
  `sha256:1a243e5af4508768fad72a909b1f5173594327caae724af8ae483803e816d197`,
  `NON-RELEASE / NEVER DEPLOYMENT EVIDENCE`; bootstrap PAT `REVOKED` and
  credential cleanup `PASS`.
- Final Gate 1 provider verification: `PASS`.
- Final Manage Actions access before publication: `pittonje/BurningSpace →
  WRITE` for both packages.
- Final canonical publication: workflow run `33340075681 / SUCCESS / exactly
  one dispatch / no retry`.
- Final target commit: `4a774354859c036d45666496539c2fc3c24b9f1c`.
- Final server image:
  `ghcr.io/pittonje/burningspace-deploy-server@sha256:816062e5165f3d02aed2b1d5524c1bc53de85bd0709fb92b0ef421d3be626085`.
- Final client image:
  `ghcr.io/pittonje/burningspace-deploy-client@sha256:ae65d4c6faadd55b04549a4a070ac5cd6ba1e5d4288a6adb1f6b2a541b9d789f`.
- Final Gate 2 provider verification: `PASS` for both packages — visibility
  `PRIVATE`, repository source `pittonje/BurningSpace` observed and accepted,
  inherited access `OFF`, Manage Actions role `WRITE`.
- Final release-specific Phase A: `COMPLETE` — evidence
  `D:\Temp\burningspace-ops002-final-private-phasea-20260830T233259Z`,
  `SHA256SUMS.txt` SHA-256
  `3b78b2861450a1e39aa7dc729dd1cb065c80dcee1cbd8858c1ff04e829838a2e`.
- Server package visibility policy: `PRIVATE — PRODUCT ARCHITECT DECIDED`
- Client package visibility policy: `PRIVATE — PRODUCT ARCHITECT DECIDED`
- Final provider visibility confirmation: `PRIVATE / GATE 2 PASS`
- Host pull authority: `DEFINED — EPHEMERAL PAT CLASSIC / read:packages ONLY`
- Persistent host registry credential: `NONE`
- Registry credential created: `NO / NOT YET`
- First-deployment rollback mode: `bootstrap-no-previous-release`
- First target edge configuration ID: `burningspace-staging-01-edge-v1`
- Provider account: `NOT RECORDED IN CANONICAL DOCUMENTATION`
- Host: `SELECTED — existing shared VPS`
- Physical isolation: `NO`
- Operational isolation repository contract: `MERGED / COMPLETE`
- Host-side deployment and verification: `NOT STARTED`
- Region: `NOT RECORDED`
- Public IP: `NOT RECORDED IN CANONICAL DOCUMENTATION`
- DNS zone: `burningforge.dev` — `PRODUCT ARCHITECT SELECTED / APPROVED;
  NOT CONFIGURED`
- Public client hostname: `game.burningforge.dev` — `PRODUCT ARCHITECT
  SELECTED / APPROVED; DNS NOT CONFIGURED`
- Public server hostname: `game-server.burningforge.dev` — `PRODUCT ARCHITECT
  SELECTED / APPROVED; DNS NOT CONFIGURED`
- Derived public client origin: `https://game.burningforge.dev`
- Derived public server origin: `https://game-server.burningforge.dev`
- Client build-time server URL:
  `VITE_BURNINGSPACE_SERVER_URL=https://game-server.burningforge.dev`
- Server allowed origin: `https://game.burningforge.dev`
- TLS edge: `NOT CONFIGURED`
- Reverse proxy: `NOT CONFIGURED`
- Firewall: `ROOT REVIEW REQUIRED BEFORE GO`
- Deployment credentials: `APPROVED CLASS DEFINED / NOT CREATED`
- Authority transition: `MERGED / COMPLETE`
- Shared-host repository hardening: `MERGED / COMPLETE` — PR #67, merge
  `21a4ce2fe796f655d20911d8a52a60c69eec432d`
- Host-gate discovery: `COMPLETE`
- Host remediation: `REQUIRED BEFORE DEPLOYMENT GO`
- Edge repository preparation: `MERGED / COMPLETE` — PR #69, implementation
  head `864d1aacb2f902e43e0395b5058fe3e970a9dc11`, evidence head
  `ee41232b4eff513ec3d3d04ee8a03845e719171d`, merge
  `4d691b056a8fa5cc558f52ae81da51d69aff2fc1`
- Host Caddy installation: `NOT STARTED / NOT AUTHORIZED`
- External deployment: `NOT AUTHORIZED`
- Deployment GO: `NOT ISSUED`
- Phase B live execution: `NOT STARTED`
- Public production launch: `NOT AUTHORIZED`

The Product Architect selects the environment, the provider, and the isolation
boundary. Selecting the host is not deployment authorization and does not
satisfy any hardening, edge, DNS, TLS, rollback, or validation gate.

## Authorization scope

This decision authorizes:

- use of the existing Contabo VPS as the controlled low-traffic BurningSpace
  external staging host;
- repository-only edge design/preparation: selection of an edge implementation
  and definition of versioned configuration, TLS ownership, HTTP-to-HTTPS
  behavior, client and server/WebSocket routing, exact Origin preservation,
  query-safe logging, bounded WebSocket timeouts, rollback configuration,
  health checks, and deployment validation.

This decision does not authorize:

- public production launch;
- general-purpose or multi-tenant deployment;
- deployment before the remaining mandatory hardening gates below are met;
- installing an edge on Contabo, binding public TCP 80/443, requesting
  certificates, changing DNS, creating BurningSpace containers, publishing
  images, or otherwise mutating the external host;
- removal of the preserved BurningForge forum;
- unrestricted reuse of unrelated host services.

## Final private package bootstrap authority

The private deployment packages had to exist before any intentional repository
connection. Manual repository connection at package creation was forbidden.
The canonical private
publication workflow must not emit `org.opencontainers.image.source` or any
replacement repository-linking label. It retains
`org.opencontainers.image.revision=${GITHUB_SHA}` as non-linking release
provenance. The final workflow contains zero source labels, but GitHub's UI
nevertheless shows repository source `pittonje/BurningSpace` after normal
publication. This is recorded only as observed provider behavior; no causality
is inferred. Repository-source association alone is not a deployment blocker.
Private visibility, inherited access `OFF`, and explicit Manage Actions access
with role `WRITE` are the accepted release boundary.

The approved one-time bootstrap architecture is:

1. On a local Windows workstation, use the daemonless OCI image client
   `crane` from `google/go-containerregistry` to create each final package.
   `regctl` may be substituted only by a later explicit Product Architect
   decision. GitHub Actions, the Contabo VPS, Docker Desktop, and Docker
   Engine must not perform first package creation.
2. Authenticate locally with a newly created, short-lived PAT classic whose
   requested scope is only `write:packages`, including any provider-implied
   package-read capability. `repo`, `workflow`, `delete:packages`, `admin:*`,
   and `gist` are forbidden. Do not reuse an existing broad `gh` token. No
   token value may enter repository content or evidence.
3. Push a minimal standard OCI/Docker image manifest to each final repository
   with a `bootstrap-<timestamp>` tag. Do not use `latest`, source-linkage
   metadata, or repository connection metadata. Bootstrap versions are
   `NON-RELEASE / NEVER DEPLOYMENT EVIDENCE`; retain them and do not delete
   them.
4. Log out, destroy the local credential material, and revoke the bootstrap
   PAT immediately after both pushes and before Gate 1. No GitHub Actions or
   VPS secret is created. This bootstrap PAT is distinct from the later
   deployment-host PAT classic with `read:packages` only.

The one-time bootstrap completed with tag `bootstrap-20260830T212613Z` at
digest `sha256:1a243e5af4508768fad72a909b1f5173594327caae724af8ae483803e816d197`.
The artifact is retained as `NON-RELEASE / NEVER DEPLOYMENT EVIDENCE`; the PAT
was revoked, credential cleanup passed, and Gate 1 passed. Evidence is retained
at `D:\Temp\burningspace-ghcr-private-bootstrap-retry-exec-20260830T221704Z`.
The historical conclusion is `FIRST ATTEMPT PACKAGE MUTATION CONFIRMED`; any
earlier zero-mutation conclusion is obsolete.

### Private Gate 1 and repository authorization

After bootstrap and before repository authorization, the Product Architect
manually verified both `burningspace-deploy-server` and
`burningspace-deploy-client`: visibility `PRIVATE`, source repository linkage
`NONE`, inherited access `OFF / NOT APPLICABLE`, and Manage Actions access
`NONE`. Gate 1 passed before Manage Actions access was added. This remains the
historical pre-publication evidence standard, not a durable Gate 2 requirement.
If a future bootstrap package is public, stop with `PRIVATE_BOOTSTRAP_FAILED`;
do not change visibility, delete it, or automatically retry another namespace.

Only after Gate 1 passes, use each package's **Manage Actions access** control
to add `pittonje/BurningSpace` with `WRITE`. This is the approved repository
authorization mechanism. Do not use **Connect repository** or inherited
access, and do not intentionally grant `ADMIN`.

### Private Gate 2 and release eligibility

Only after Gate 1 and Manage Actions access may the normal canonical workflow
publish through its repository-scoped `GITHUB_TOKEN`. After publication, Gate
2 requires visibility `PRIVATE`, inherited access `OFF`, and explicit Manage
Actions access for `pittonje/BurningSpace` with an acceptable recorded role.
Repository source `pittonje/BurningSpace` is permitted and was observed for
both final packages; its presence alone is not a blocker and must not be
removed. Do not click **Connect repository** or enable inherited access. The
actual role for this release is `WRITE`, so Gate 2 passed. If a future
publication reports `ADMIN`, do not mutate it automatically; stop for Product
Architect disposition. If either package is public, stop.

## Measured host evidence

The following sanitized measured facts are the evidence for this decision.
They were observed operationally. No BurningSpace deployment occurred, and no
firewall, proxy, DNS, or TLS mutation occurred.

- Provider: Contabo.
- Environment ID: `burningspace-staging-01`.
- Host class: `shared-existing-vps-with-isolated-compose-staging`.
- Host OS: Ubuntu 24.04.4 LTS.
- Capacity measured after forum shutdown: 4 vCPU, approximately 7.8 GiB total
  RAM with approximately 6.9 GiB available, approximately 48 GiB free disk,
  root filesystem approximately 35% used, and very low observed load. These
  point-in-time observations establish current resource headroom; they do not
  guarantee future capacity.
- Docker: healthy.
- System health: zero failed units and no current reboot-required marker.
- Package metadata was fresh during the audit; approximately 34 packages were
  pending, including Docker Engine, Docker CLI, containerd, Docker Compose
  plugin, and Docker Buildx.
- BurningForge forum: stopped, autostart disabled, restart policy `no`, with
  container, image, and data preserved. Forum recovery remains available
  through an explicitly recorded out-of-band operational rollback procedure.
- Public TCP 80: free.
- Public TCP 443: free.
- Selected BurningSpace host loopback endpoints:
  `BURNINGSPACE_SERVER_BIND_PORT=2567` (`127.0.0.1:2567`) and
  `BURNINGSPACE_CLIENT_BIND_PORT=18080` (`127.0.0.1:18080`). Client port
  `18080` is an environment-specific override: the generic Compose default of
  `8080` remains valid, but a preserved stopped legacy landing container
  reserves host port `8080` in its Docker metadata and could collide if
  started out of band.
- No public database, cache, or Docker API exposure was observed.
- TCP 4000 is a Dashy dashboard exposed on public IPv4 and IPv6 wildcards over
  plaintext HTTP; no authentication evidence was observed.
- TCP 9090 is Cockpit host administration exposed on public wildcards with
  PAM-backed authentication and a self-signed certificate at its direct
  endpoint.
- Unrelated TeamSpeak voice service on UDP 9987 and required file transfer may
  remain subject to host-owner requirements. Its administrative/query TCP
  10011, 10022, and 10080 require explicit effective-ingress review.
- Unrelated stable services remained operational during and after the forum
  shutdown.

Full container identifiers, SSH targets, public addresses, SSH fingerprints,
and unrelated-service private identifiers are deliberately excluded from
canonical documentation.

## Supersession of the earlier shared-host rejection

The earlier shared-host audit conclusion remains historically valid and is not
rewritten. That audit rejected this VPS primarily because the BurningForge
forum container:

- owned public TCP 80 and 443;
- contained the effective Nginx edge;
- coupled BurningSpace proxy changes and rollback to the forum; and
- created an unacceptable unrelated-service edge blast radius.

The decision changed because the operating conditions changed, not because the
earlier reasoning was wrong. That specific blocker has been removed: the forum
is stopped, preserved, set to restart policy `no`, recoverable, and no longer
owns 80/443. Public 80/443 can therefore be dedicated to a future
independently managed BurningSpace staging edge.

## Retained shared-host risk

This host is not physically isolated. The following resources remain shared
with unrelated workloads:

- kernel;
- CPU;
- RAM;
- disk;
- Docker daemon;
- public IP;
- host firewall;
- maintenance and reboot domain;
- security failure domain.

This residual risk is accepted only for controlled low-traffic staging and
only subject to the mandatory hardening below. Nothing in this decision claims
physical, kernel, or Docker-daemon isolation.

## Required isolation boundary

Because physical isolation is unavailable, isolation must be achieved
operationally and must be bounded and explicit:

- a bounded Compose project boundary;
- a bounded container boundary;
- an explicit project-scoped Docker network boundary;
- explicit `127.0.0.1` loopback binds for both services;
- explicit resource limits for every BurningSpace container;
- explicit immutable release and rollback bindings.

PR #67 implements the repository side of this contract: the project-scoped
network, loopback-only configurable publications, explicit container resource
limits and bounded logs, immutable release/rollback reference validation, and
off-host/CI build boundary are merged. No host-side deployment or verification
has begun.

Other host workloads remain outside BurningSpace ownership and must not be
modified by BurningSpace deployment operations. The preserved forum is not
part of the BurningSpace runtime.

## Required host capabilities

- A supported current Ubuntu LTS release or equivalent maintained Linux.
- Docker Engine and the Docker Compose plugin.
- Non-root administrative access.
- Dedicated BurningSpace use of inbound TCP 80 and 443 for the application
  edge unless operational evidence explicitly authorizes another port.
- SSH and other management access restricted separately from the application
  edge.
- Sufficient CPU, RAM, and storage for one static-client container, one
  authoritative server process, the reverse proxy, logs, and bounded deploy
  activity, with sufficient host reserve remaining for unrelated workloads.
- Resource limits selected and recorded before any deployment GO.
- Rollback-capable disk space.
- A synchronized system clock.
- A secure update policy.

## Mandatory conditions before deployment GO

Repository hardening is complete. Every host remediation, edge, DNS/TLS,
rollback-release binding, and external-validation condition below remains
open unless explicitly marked complete.

### Repository hardening

Status: `MERGED / COMPLETE` through PR #67.

Merged controls:

- explicit server/client CPU and RAM limits;
- bounded Docker log rotation;
- mode-aware immutable target and previous-approved image-reference validation;
- off-host or CI image build with no source-context staging build on this
  shared host; and
- an explicit project-scoped Docker network.

The images from workflow runs `33310151475` and `33323488162` are historical
evidence only and are not authorized deployment targets because both package
generations were manually observed public and retired. Final workflow run
`33340075681` succeeded at target commit
`4a774354859c036d45666496539c2fc3c24b9f1c`; its exact final private server and
client references above are the only active release bindings. For the first
deployment, previous-approved image and commit bindings remain
intentionally absent under `bootstrap-no-previous-release`; for every later
deployment they remain mandatory under `previous-approved-release`.

### Private registry authority

Gate 1, Manage Actions access, canonical publication, Gate 2, and replacement
release-specific Phase A are complete. The following host-side authority is
still required before GO after the separately authorized reboot and baseline
revalidation:

- successful Gate 2 evidence, now recorded, that both final server and client
  packages are private, have inherited access off, and authorize
  `pittonje/BurningSpace` through Manage Actions access with role `WRITE`.
  Repository source `pittonje/BurningSpace` is observed and acceptable; it is
  not proof that the forbidden OCI source label exists. If either package is
  observed public, stop; no visibility mutation, deletion, or automatic
  namespace retry is authorized;
- secure external availability of a fresh short-lived GitHub personal access
  token (classic) with `read:packages` only and read authority for both
  packages. `write:packages`, `delete:packages`, `repo`, `workflow`, `admin:*`,
  and `gist` are forbidden;
- successful interactive ephemeral authentication using `--password-stdin`
  and a mode-restricted temporary `DOCKER_CONFIG` under `/run`, with no token
  in argv, shell history, environment exports, repository content, inventory,
  GO packet, or evidence;
- read-only `docker buildx imagetools inspect` resolution, without pulling
  image layers, of the exact immutable server and client image references
  bound by the approved per-release GO packet and real inventory; and
- evidenced logout and removal of the temporary registry configuration.

Actual image pulls remain post-GO. After GO, authenticate through the same
ephemeral model, run explicit `docker pull` for each exact digest, verify both
local `RepoDigests`, then log out and destroy the temporary `DOCKER_CONFIG`
before container startup. Startup must use the exact real shared-host Compose
arguments with `--pull never`; `docker compose pull` after credential
destruction is forbidden. Once the images are local, normal container restart
or reboot recovery does not require GHCR authentication. No persistent host
registry secret is permitted.

### Host hardening

Required before GO:

- root-level effective firewall review covering `ufw status verbose`,
  `nft list ruleset`, `iptables -S`, `ip6tables -S`, the `DOCKER-USER` chain,
  and effective IPv4/IPv6 exposure for TCP 22, 4000, 9090, 10011, 10022,
  10080, 30033, and UDP 9987. UFW is enabled with default INPUT and FORWARD
  policy DROP, but privileged effective rules were not available during the
  audit and Docker-published ports do not rely solely on UFW INPUT. Firewall
  status is therefore not a PASS;
- TCP 4000: `RESTRICT BEFORE GO`. A future approved action must either rebind
  Dashy to loopback behind an appropriately authenticated administrative path,
  or restrict ingress through an effective Docker-aware host boundary such as
  `DOCKER-USER`/source filtering. This decision does not select a mechanism;
- TCP 9090: `RETAIN SERVICE / RESTRICT OR VERIFY EFFECTIVE INGRESS BEFORE GO`.
  Future evidence must bind root-level effective IPv4 and IPv6 ingress and the
  operator access path. Cockpit must not be removed;
- TeamSpeak administrative/query TCP 10011, 10022, and 10080:
  `REVIEW / RESTRICT BEFORE GO`. BurningSpace operations do not own the
  TeamSpeak runtime;
- verification that no unintended public database, cache, or Docker API
  exposure exists;
- host maintenance before any BurningSpace containers are created. The audit
  found approximately 34 pending packages, including Docker Engine, Docker
  CLI, containerd, Docker Compose plugin, and Docker Buildx; maintenance may
  restart the Docker daemon;
- confirmation of sufficient host reserve after resource-limit selection.

The required order is completed host maintenance, then one controlled reboot
with separate Product Architect authorization, then shared-host baseline
revalidation, then image and edge deployment. This decision does not authorize
or execute the reboot. After reboot, record the new boot ID and reverify Docker
health; exact individual forum state and restart policy `no`; TCP 80/443, 2567,
and 18080 availability; Dashy and Cockpit loopback-only bindings; expected
TeamSpeak listeners; failed systemd units; the current reboot-required state;
unrelated-service operation; and effective firewall state. Exact individual
container inspection is authoritative on this host because Docker aggregate
container counters have disagreed with individually inspected state; do not
use `docker info ContainersRunning` alone as a stop/GO gate.

The preserved forum must not be started while the BurningSpace staging edge
owns TCP 80/443. Recheck forum stopped, restart policy `no`, and TCP 80/443
free immediately before edge activation and after every host reboot, Docker
daemon restart, or host maintenance event.

### Edge

Status: repository contract `MERGED / COMPLETE`; real-host configuration,
installation, effective ownership, and public-listener evidence remain
incomplete. Repository evidence does not prove the required `caddy:caddy`
identity, runtime-directory or socket permissions, absence of TCP admin
listeners on the real host, public ingress, DNS, TLS, or certificate state.
Required before GO:

- independent BurningSpace reverse proxy or edge ownership;
- dedicated public 80/443 use for BurningSpace staging;
- exact original `Origin` preservation;
- a hostile or absent `Origin` is never rewritten into an allowed `Origin`;
- correct HTTP/1.1 WebSocket `Upgrade` and `Connection` behavior;
- a bounded long-lived WebSocket timeout;
- query-safe access logging;
- no reconnect bearer-token leakage through query-string logging;
- versioned and reproducible edge configuration;
- independent edge rollback.

### DNS and TLS

Required before GO:

- configured and verified DNS records for `game.burningforge.dev` and
  `game-server.burningforge.dev`;
- certificate issuance;
- certificate renewal ownership;
- an applied and verified allowed-`Origin` binding for
  `https://game.burningforge.dev`;
- no wildcard origin authorization.

### Rollback

Required before GO:

- an immutable target release binding;
- exactly one explicit rollback mode:
  - first deployment: `bootstrap-no-previous-release`, with previous server
    image, previous client image, previous approved commit, and previous edge
    config ID structurally absent; rollback restores
    `PRE_BURNINGSPACE_DEPLOYMENT_STATE` by removing only BurningSpace staging
    Compose and edge state while preserving unrelated services and the stopped
    forum;
  - every later deployment: `previous-approved-release`, with immutable,
    distinct previous-approved server/client images, previous approved commit,
    and previous edge configuration required under the existing strict checks;
- a named rollback procedure;
- post-rollback validation.

### External validation

Required before GO:

- Phase A preflight passes against real environment inventory;
- Phase B preflight passes;
- external client smoke;
- health and readiness;
- hostile matchmaking rejection;
- hostile raw WebSocket rejection;
- allowed matchmaking;
- authoritative movement;
- reconnect continuity;
- no duplicate participant or ship;
- token-safe output and log handling;
- browser connection and reconnect UX evidence.

## Risk classification and review process

This post-hardening reconciliation is `NORMAL RISK`: it changes documentation
and authority only and performs no external action. It requires documentation
validation, one independent read-only Operations/Architecture review, Product
Architect approval, and human merge. Network, Security, QA, Gameplay, and
Visual reviewers are skipped because this reconciliation changes no
executable network/security behavior, acceptance tests, gameplay, or player
presentation.

Claude QA is advisory and non-blocking for this normal-risk documentation
reconciliation under the current risk-based process.

The completed edge repository implementation retained the reviewer set and
risk classification selected for its implementation surface. This
reconciliation does not weaken any mandatory host, edge-installation, or
deployment review.

## Rejected environment classes

- A developer workstation.
- Home-network exposure.
- Any topology that publishes the Node or Colyseus port directly.
- Shared hosting without Docker and network-policy control.
- Serverless or static-only hosting for the authoritative server.
- A multi-node or distributed topology.
- A production environment.

Historical note: an existing shared multi-service host was previously rejected
for this environment because staging required isolation from unrelated
services and because the forum then owned the effective public edge. That
rejection is superseded for controlled low-traffic staging only, for the
reasons recorded above. It is not superseded for public production.

## Architecture preservation

- Exactly one authoritative Node process.
- Exactly one static-client container.
- Explicit loopback container binds.
- An external TLS edge.
- No persistence.
- No accounts.
- No horizontal scaling.
- Restart resets active rooms and world state.

The client remains non-authoritative, and the existing gameplay, protocol,
reconnect, rate-limit, `Origin`, and CORS semantics remain unchanged.

## Provisioning prerequisites

Before an environment-specific Product Architect GO decision can be requested,
the following non-secret prerequisites must be complete:

- The repository, host, edge, DNS/TLS, rollback, and external-validation
  conditions above are complete and evidenced.
- Public client and server origins and the exact server allowed `Origin` are
  assigned.
- Target image bindings and the exact rollback-mode-appropriate previous-state
  bindings or structural absences are recorded.
- Private bootstrap Gate 1 has passed, Manage Actions access is configured,
  the canonical publication has succeeded from post-recovery-merge `main`,
  and its exact workflow `GITHUB_SHA` and immutable server/client digests are
  bound in the per-release GO packet and real inventory only after Gate 2.
- Gate 2 confirms both package states private, permits the observed provider
  repository-source association, requires inheritance off, and records the
  actual Actions role `WRITE`; the approved ephemeral host-pull credential
  class is available through
  secure handling; authentication and both exact manifest resolutions succeed
  without pulling layers; and logout plus temporary-config cleanup are
  evidenced without recording the token.
- Edge configuration, rollback mode, owners, and resource limits are recorded.
- Credential readiness is confirmed without recording credential values.
- Log-redaction, rollback-readiness, external-smoke, review, and evidence
  bindings are completed in the GO packet.

Repository edge preparation is complete, but provisioning is not complete and
credentials have not been requested. External host mutation, including Caddy
installation, remains closed until separate Product Architect authorization.

## Decision expiration

This decision expires and must return to the Product Architect if
implementation requires any of the following:

- use of this host for anything beyond controlled low-traffic external
  staging, including public production launch;
- non-loopback direct service exposure;
- persistence;
- horizontal scaling;
- protocol or security changes;
- removal, modification, or non-recoverable disruption of the preserved forum
  or any other unrelated host workload;
- abandoning any mandatory hardening condition above;
- provider-specific architecture that conflicts with the external staging
  runbook.
