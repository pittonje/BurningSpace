# Public Arena External Staging Runbook

## Scope and limitations

This runbook separates OPS-002 repository preparation from any later controlled external execution. The Public Arena remains alpha and non-persistent: one in-memory authoritative server process and one static-client container, with no accounts, persistence, horizontal scaling, production SLA, or public-production launch. A server restart or rollback resets active rooms and world state.

The existing [local/container staging runbook](public-arena-staging-runbook.md) remains the source for the bounded local Compose lifecycle. This document adds the shared-host staging, external edge, authorization, validation, and rollback contract. The selected provider and environment are recorded in the Phase B environment decision; that selection does not authorize deployment. The selected edge implementation and its repository validation contract are defined in the [Caddy edge runbook](public-arena-caddy-edge-runbook.md).

## Authorization boundary

Phase A is repository and dry-run preparation only. It may validate committed templates, local plans, Compose rendering, local containers, and loopback smoke behavior. It must not access DNS, certificates, firewalls, provider APIs, SSH, or a real external environment.

Phase B is controlled external execution. It may begin only after the Phase A implementation is reviewed and human-merged, the exact approved head has green Core and blocker-free specialist/QA evidence, rollback is ready, and the Product Architect issues an explicit environment-specific deployment GO. A merged Phase A PR is not a deployment GO. Public-production launch remains separately unauthorized.

## Required non-secret inventory

- non-secret environment identifier and exact
  `shared-existing-vps-with-isolated-compose-staging` class;
- alpha/non-persistent label;
- exact public client and server origins;
- exact allowed browser Origins;
- client build endpoint;
- target approved commit/images and the selected rollback mode;
- loopback server and client bind ports;
- edge configuration identifier/version;
- rollback mode;
- Product Architect deployment GO reference.

The release inventory always binds two immutable target OCI references:

- target server image;
- target client image.

Every reference must use `repository@sha256:<64 lowercase hex>` form. Mutable
tags, omitted images, malformed digests, and documentation placeholders fail
closed outside template validation.

For the first successful external staging deployment, rollback mode is exactly
`bootstrap-no-previous-release`. In that mode, `previousServerImage`,
`previousClientImage`, `previousApprovedCommit`, and `previousEdgeConfigId`
must be structurally absent from the real plan and environment inventories.
Empty strings, sentinels, dummy digests, documentation hostnames, and copies of
the target bindings are forbidden substitutes. For every later deployment,
rollback mode is exactly `previous-approved-release` and the two immutable
previous-approved images, previous-approved commit, and previous edge config ID
remain mandatory, distinct, and subject to the existing ancestry checks.

For `burningspace-staging-01`, the intended environment-specific loopback
values are:

```text
BURNINGSPACE_SERVER_BIND_PORT=2567
BURNINGSPACE_CLIENT_BIND_PORT=18080
```

The generic Compose client default remains `8080`. The `18080` override avoids
a collision if the preserved stopped legacy landing container, whose Docker
metadata reserves host port `8080`, is started out of band. Do not create or
commit a real environment file containing host credentials or secrets.

The four real release-inventory paths are:

- application environment: `deploy/.env.staging`;
- application plan: `deploy/external-staging-plan.json`;
- edge environment: `deploy/edge/caddy/.env.staging`;
- edge plan: `deploy/edge/caddy/edge-plan.json`.

All four real env/plan files are Git-ignored and must never be committed. The
committed `.example.*` files remain template/example authority only. The real
application plan's concrete `targetCommit` comes from the successful approved
publication workflow's `GITHUB_SHA`; it is not a static policy-document SHA.

When a release candidate or package namespace is retired, any existing real
inventory bound to it is automatically invalidated for future deployment. The
retired generation 1 inventory was copied byte-for-byte to
`D:\Temp\burningspace-ops002-retired-inventory-20260830T233138Z` with an
explicit retired marker and SHA-256 manifest before replacement. Its
`SHA256SUMS.txt` SHA-256 is
`0275a1d578842bc47a0de317b88b037aaaabbeb250017dc94057ee10722dd116`.

The active Git-ignored application inventory now binds only final workflow run
`33340075681`, target commit
`4a774354859c036d45666496539c2fc3c24b9f1c`, and the immutable deploy-server
and deploy-client references recorded below. The release-independent edge
inventory was reused byte-identically. Replacement application and edge Phase
A passed; the evidence packet is
`D:\Temp\burningspace-ops002-final-private-phasea-20260830T233259Z`, whose
`SHA256SUMS.txt` SHA-256 is
`3b78b2861450a1e39aa7dc729dd1cb065c80dcee1cbd8858c1ff04e829838a2e`.
Only one real inventory variant may be active under `deploy/`; never retain
multiple candidate variants there.

## Secret inventory by category only

The future execution owner must provide these categories through secure external channels when applicable; values never belong in Git, PR text, CI logs, evidence, or this runbook:

- SSH or deployment access;
- DNS-provider access;
- TLS/private-key material;
- reverse-proxy or provider credentials; and
- container-registry pull credentials: for private GHCR access, a GitHub
  personal access token (classic) with `read:packages` only.

Do not add credential slots to copyable example environment files.

## Private package bootstrap

The final private deployment package repositories are:

- `ghcr.io/pittonje/burningspace-deploy-server`;
- `ghcr.io/pittonje/burningspace-deploy-client`.

They were created by the completed one-time bootstrap and are now the
authoritative private release pair. The bootstrap tag is
`bootstrap-20260830T212613Z`, its digest is
`sha256:1a243e5af4508768fad72a909b1f5173594327caae724af8ae483803e816d197`,
its role is `NON-RELEASE / NEVER DEPLOYMENT EVIDENCE`, its PAT is revoked, and
credential cleanup and Gate 1 passed. The private deployment packages existed
before intentional repository authorization.
The canonical publication workflow must not emit
`org.opencontainers.image.source`, and that label must not be reintroduced or
replaced with another repository-linking label. The workflow retains
`org.opencontainers.image.revision=${GITHUB_SHA}` as non-linking release
provenance. Label removal does not guarantee that GitHub's UI will show no
repository-source association.

First package creation occurs only from a local Windows workstation using the
daemonless OCI image client `crane` from `google/go-containerregistry`.
`regctl` may be substituted only by later explicit Product Architect
authority. Do not use BurningSpace GitHub Actions, the Contabo VPS, Docker
Desktop, or Docker Engine for first package creation.

Create a fresh PAT classic immediately before bootstrap with only
`write:packages` requested, including any provider-implied package-read
capability. `repo`, `workflow`, `delete:packages`, `admin:*`, and `gist` are
forbidden. Do not reuse an existing broad `gh` token. Authenticate `crane`
locally, push one minimal standard OCI/Docker image manifest to the server and
client repositories with `bootstrap-<timestamp>` tags, then log out, destroy
local credential material, and revoke the PAT immediately before Gate 1. No
token value enters repository content or evidence, and no GitHub Actions or VPS
secret is created. This bootstrap PAT is distinct from the later deployment
host PAT classic with `read:packages` only.

Bootstrap versions have no release authority: retain them as `NON-RELEASE /
NEVER DEPLOYMENT EVIDENCE`; do not deploy or delete them. Do not use `latest`
or source-linkage metadata. The bootstrap requires no `delete:packages` scope.

After bootstrap and PAT revocation, the Product Architect performed Gate 1 on
both package settings. Each showed visibility `PRIVATE`, source repository
linkage `NONE`, inherited access `OFF / NOT APPLICABLE`, and Manage Actions
access `NONE`. This historical pre-publication condition is not a durable Gate
2 source-linkage invariant. If either package is public during a future
bootstrap, stop with
`PRIVATE_BOOTSTRAP_FAILED`; do not change visibility, delete a package, or
automatically retry another namespace.

Standing pre-dispatch operator gate: the canonical `OPS-002 Publish Staging
Images` workflow must not be dispatched unless recorded Gate 1 evidence exists
for both `ghcr.io/pittonje/burningspace-deploy-server` and
`ghcr.io/pittonje/burningspace-deploy-client`. That evidence must be captured
after the bootstrap PAT is revoked and immediately before proceeding to
repository Actions authorization and publication. For each package it must
record visibility `PRIVATE`, source repository linkage `NONE`, inherited
access `OFF / NOT APPLICABLE`, and Manage Actions access `NONE`. Absence or
incompleteness of either package's Gate 1 evidence means publication dispatch
is prohibited.

Only after Gate 1 passes, use **Package settings → Manage Actions access → Add
repository** to add `pittonje/BurningSpace` with `WRITE` for each package. This
is the approved repository authorization path. Do not use **Connect
repository**, enable inherited access, or intentionally grant `ADMIN`.

Immediately before dispatch, reconfirm that the authority for proceeding is
the recorded post-bootstrap Gate 1 evidence for both packages. The required
sequence is private bootstrap, bootstrap PAT revocation, recorded Gate 1
evidence, Manage Actions access `WRITE`, that authority reconfirmation, and
only then canonical publication dispatch. This is an operator/governance
precondition; the workflow must not query or create packages to satisfy it.

The normal manual canonical workflow may publish with its repository-scoped
`GITHUB_TOKEN` only after that access gate. Durable Gate 2 policy requires
visibility `PRIVATE`, inherited access `OFF`, and explicit Manage Actions
access for `pittonje/BurningSpace` with an acceptable recorded role.
Repository-source linkage itself is permitted. GitHub showed repository source
`pittonje/BurningSpace` for both final packages after normal publication even
though the workflow has zero `org.opencontainers.image.source` labels; this is
recorded as observed provider behavior without asserting why it occurred. Do
not remove that association, click **Connect repository**, or enable inherited
access. The actual role for this release is `WRITE`, so Gate 2 passed. A future
`ADMIN` role requires Product Architect disposition without automatic
mutation. If either package is public, stop.

The two accidental public generations remain historical evidence and are
forbidden deployment targets:

- generation 1: `burningspace-server` and `burningspace-client`, workflow run
  `33310151475`, `PUBLIC / RETIRED`;
- generation 2: `burningspace-staging-server` and
  `burningspace-staging-client`, workflow run `33323488162`, `PUBLIC /
  RETIRED`; package settings showed source repository `pittonje/BurningSpace`
  and inherited access enabled.

Do not delete, mutate, or deploy either generation. The observed public
outcomes occurred with source-repository linkage and inherited access, but
provider documentation does not fully specify the final visibility
consequence; manual Gate 1 and Gate 2 remain mandatory.

## Private GHCR pull authority

Both final deployment packages are manually verified private at Gate 2. Final
workflow run `33340075681` and the immutable release references are bound. The
host pull model is defined, and the authorized post-reboot pre-GO proof now
records successful ephemeral login, both exact immutable manifest resolutions,
logout, and temporary-config cleanup without image-layer pulls.

Private pull authority uses a fresh, short-lived GitHub personal access token
(classic) owned by an operator who can read both packages. Its only scope is
`read:packages`. `write:packages`, `delete:packages`, `repo`, `workflow`,
`admin:*`, and `gist` are forbidden. Do not reuse local `gh` authentication or
use `GITHUB_TOKEN` on the VPS. The proof credential remains operator-held and
is not stored on the host; no persistent registry credential is permitted.
It is intentionally not revoked by automation because the same short-lived
credential may be used for the one post-GO exact-digest pull. The operator must
revoke it manually immediately after the pull's logout/config cleanup, or
earlier when expired or no longer required.

For each release, the operator enters the token directly in the interactive
SSH session. Do not forward or paste it through a PowerShell command. The
token must not appear in argv, shell history, environment exports, evidence,
inventory, or repository content. Do not run the credential block with shell
tracing/xtrace enabled, and do not capture a full terminal or session
transcript containing credential handling. Bounded evidence may record command
outcomes only. Use the following reviewed ephemeral pattern after the
separately authorized reboot and baseline revalidation:

```sh
umask 077

DOCKER_CONFIG="$(mktemp -d /run/burningspace-deploy.XXXXXXXX)"
export DOCKER_CONFIG

cleanup() {
  docker logout ghcr.io >/dev/null 2>&1 || true
  rm -rf "$DOCKER_CONFIG"
}

trap cleanup EXIT INT TERM

set +x
read -rs GHCR_PAT
printf '%s' "$GHCR_PAT" |
  docker login ghcr.io -u pittonje --password-stdin
unset GHCR_PAT
```

Before GO, use the authenticated session only for read-only provider-state and
manifest checks. Confirm both packages are private, then resolve both exact
immutable manifests without pulling image layers. The two variables below
must contain the exact immutable `repository@sha256:<digest>` references
already approved in the current per-release GO packet and real inventory;
mutable tags are forbidden:

```sh
docker buildx imagetools inspect "$BURNINGSPACE_SERVER_IMAGE"
docker buildx imagetools inspect "$BURNINGSPACE_CLIENT_IMAGE"
```

Run `docker logout ghcr.io`, remove the temporary `DOCKER_CONFIG`, and retain
only bounded evidence that authentication, both manifest resolutions, logout,
and cleanup succeeded. Never record the token. Pre-GO registry checks must not
pull image layers or cause runtime mutation.

Only after an explicit deployment GO may the operator create a new ephemeral
session and pull exactly the approved digests:

```sh
docker pull "$BURNINGSPACE_SERVER_IMAGE"
docker pull "$BURNINGSPACE_CLIENT_IMAGE"
docker image inspect --format '{{json .RepoDigests}}' "$BURNINGSPACE_SERVER_IMAGE"
docker image inspect --format '{{json .RepoDigests}}' "$BURNINGSPACE_CLIENT_IMAGE"
cleanup
trap - EXIT INT TERM
unset DOCKER_CONFIG
```

Require each inspected local `RepoDigests` set to contain its exact approved
digest. The explicit `cleanup` logs out and removes the temporary
`DOCKER_CONFIG`; disabling the trap and unsetting the now-invalid path occur
only after cleanup succeeds. Complete this before starting containers. The
required sequence is:

```text
AUTHENTICATED EXACT-DIGEST PULL
→ LOCAL DIGEST VERIFICATION
→ LOGOUT
→ CREDENTIAL DESTRUCTION
→ CONTAINER START
```

Container startup uses the real shared-host Compose path and must not contact
the registry:

```sh
docker compose --env-file deploy/.env.staging -f deploy/docker-compose.staging.yml up -d --pull never
```

Do not run `docker compose pull` after logout or credential destruction. Do
not replace the exact digest references with `latest`, another mutable tag, or
another digest. Compose startup must not require registry authentication.

Once the exact images are in the local Docker image store, running containers
and ordinary restart or reboot recovery do not require GHCR credentials. PAT
expiry or revocation does not affect already-local images. Authentication is
required again only for a future explicit pull, such as a later release or
recovery after the local image has been removed. Revoke the short-lived PAT
after the required pull and local-digest verification succeed.

## Provider-neutral edge contract

For `burningspace-staging-01`, the selected implementation is an independent
host-managed Caddy systemd service. Repository validation is pinned to official
Caddy `2.11.4` with no plugins. Caddy is not part of the Compose project and is
not installed or configured by repository preparation. The provider-neutral
requirements below remain authoritative; implementation-specific validation,
reload, rollback, ownership, and logging details live in the Caddy edge
runbook.

The selected edge must:

- terminate TLS for the exact client and server names and redirect HTTP to HTTPS where appropriate;
- preserve the browser's original `Origin`; it must never rewrite a hostile or absent Origin into an allowed value;
- keep `Host` coherent for the chosen upstream policy;
- use HTTP/1.1 upstream where required and forward `Upgrade` and `Connection` correctly;
- provide a bounded timeout suitable for long-lived WebSockets;
- route only to explicit loopback upstreams;
- expose no direct Node/static-client service ports or administrative/dashboard ports;
- expose Caddy administration only through the service-owned
  `/run/caddy/burningspace-admin.sock` inside a systemd-managed `caddy:caddy`
  mode-`0700` runtime directory with `UMask=0077`; no TCP admin listener is
  allowed;
- treat forwarded client IP only as operations metadata, never identity or gameplay authority.

For external targets, TLS verification remains enabled. Do not recover from edge failures by weakening the exact Origin allowlist, using plaintext external transport, or exposing Compose ports publicly.

## Access-log safety

Colyseus may carry a reconnect bearer token in a WebSocket query string. The effective edge access and runtime/error-log formats must not retain request query strings for WebSocket routes, including failed-upstream paths, and logs/evidence must not contain reconnect tokens. Verify the actual effective logging behavior of the selected edge; no single provider-specific directive is assumed sufficient. Application lifecycle logs must remain bounded and omit Origin lists, headers, tokens, and gameplay state.

## Phase A commands

These commands operate only on committed examples, repository state, or loopback containers:

```sh
npx tsc -p apps/server/scripts/tsconfig.external-staging.json --noEmit
npx tsx apps/server/scripts/external-staging-preflight.ts --self-test
npx tsx apps/server/scripts/external-staging-edge-preflight.ts --self-test
npx tsx apps/server/scripts/external-staging-edge-preflight.ts --template
npx tsx apps/server/scripts/external-staging-edge-contract-check.ts --self-test
docker compose --env-file deploy/external-staging.env.example -f deploy/docker-compose.staging.yml config --format json | npx tsx apps/server/scripts/external-staging-preflight.ts --template --env deploy/external-staging.env.example --plan deploy/external-staging-plan.example.json --compose-stdin
docker compose --env-file deploy/staging.env.example -f deploy/docker-compose.staging.yml -f deploy/docker-compose.staging.build.yml config --format json
```

A real Phase A plan uses full local commit SHAs, keeps `externalExecutionAuthorized=false`, and is validated with `--phase-a`. The separate edge Phase A inventory keeps `hostInstallationAuthorized=false` and `externalExecutionAuthorized=false`. Do not run either `--phase-b` mode without the later exact environment-specific authorization packet. None of these commands deploys or contacts `.example.invalid`. When no local Caddy binary is available, the edge contract tool reports that runtime execution was unavailable; Linux Core must then provide the authoritative checksum-bound Caddy runtime evidence.

For the Core loopback smoke only, both targets must be loopback and `BURNINGSPACE_EXTERNAL_SMOKE_ALLOW_LOOPBACK_HTTP=true` must be explicit. That override cannot enable HTTP for a non-loopback target.

## Shared-host Compose and image boundary

`deploy/docker-compose.staging.yml` is the only real shared-host staging
Compose model. It is image-only: both images are externally supplied immutable
digest references, and the file has no source-context `build` entry. The
shared VPS must never build either staging image from a repository checkout.

The provisional low-traffic limits are enforced with ordinary Docker Compose
service limits, not Swarm-only deployment reservations:

- server: `1.00` CPU and `1 GiB` memory;
- client: `0.25` CPU and `256 MiB` memory;
- both services: `json-file` logging with `max-size=10m` and `max-file=3`.

Both services attach only to the non-external project-scoped `burningspace`
bridge network. Published ports remain exactly loopback-bound. Privileged
mode, host networking, Docker-socket mounts, fixed global container names, and
all service bind/persistent-volume mounts remain forbidden.

`deploy/docker-compose.staging.build.yml` is a local/CI-only override. Core
uses it to build both Dockerfiles off-host from the eventual shared VPS and to
run deterministic loopback container smoke. It is not part of the real
shared-host deployment command. GHCR is the selected release registry, with
`ghcr.io/pittonje/burningspace-deploy-server` and
`ghcr.io/pittonje/burningspace-deploy-client` as the canonical repositories.
The manual-only `OPS-002 Publish Staging Images` GitHub Actions workflow is
the approved staging publication mechanism. It runs on `main`, uses the
repository-scoped `GITHUB_TOKEN` with `contents: read` and `packages: write`,
and publishes commit-tagged `linux/amd64` images without `latest`. It omits
`org.opencontainers.image.source` and all repository-linking labels while
preserving the revision label. It is not a first-package-creation mechanism.
Both earlier public generations are retired from deployment authority; their
run, commit, and immutable manifest bindings remain historical evidence in the
GO packet. The workflow does not change package visibility, and publication
does not authorize deployment.

The first final release workflow was dispatched exactly once after private
bootstrap Gate 1 and Manage Actions access `WRITE`. Run `33340075681` succeeded
at `GITHUB_SHA` `4a774354859c036d45666496539c2fc3c24b9f1c` for
`linux/amd64` and produced:

- `ghcr.io/pittonje/burningspace-deploy-server@sha256:816062e5165f3d02aed2b1d5524c1bc53de85bd0709fb92b0ef421d3be626085`;
- `ghcr.io/pittonje/burningspace-deploy-client@sha256:ae65d4c6faadd55b04549a4a070ac5cd6ba1e5d4288a6adb1f6b2a541b9d789f`.

Both registry manifest inspections passed, Gate 2 passed, and replacement
release-specific Phase A is complete. Publication and Phase A do not authorize
DNS, host access, credential creation, Phase B, deployment GO, or deployment.

## Shared-host remediation gates

Repository hardening, root-level effective firewall review, Dashy/Cockpit
loopback remediation, TeamSpeak administrative/query review, host maintenance,
the controlled reboot, and post-reboot baseline are complete. UFW is active,
the reboot-required marker is cleared, and the current boot ID is
`088f9941-7056-488e-a0fb-b25f8e87a0c7`.

The bounded root-level evidence is
`D:\Temp\burningspace-ops002-controlled-reboot-20260831T070724Z\post-reboot-firewall.json`
plus `post-reboot-listeners.json`; its `SHA256SUMS.txt` SHA-256 is
`509a4b066d30ea7cae38edcf62dd9dc58c6e6b0dfa0867593d1893b480ee438d`.

Immediately before GO and again before the first post-GO mutation, confirm that
this evidence remains current. Any drift in firewall treatment, administrative
listeners, forum standstill, Docker health, unrelated services, or reserved
ports returns the packet to pre-GO remediation; this runbook does not authorize
an automatic repair.

After host maintenance, reverify Docker health; the forum remains stopped with
restart policy `no`; TCP 80/443 and both selected loopback ports remain free;
unrelated services remain operational; and effective firewall state remains
acceptable. Use exact individual container inspection as authority. Docker
aggregate container counters have disagreed with individually inspected state
on this host, so `docker info ContainersRunning` alone is not a stop/GO gate.

The required authorization order is: completed host maintenance; then one
controlled, separately Product-Architect-authorized reboot; then shared-host
baseline revalidation and the complete pre-GO packet; then explicit Deployment
GO; then the bounded post-GO edge and application sequence below. This runbook
does not authorize or perform a reboot or issue GO. After the reboot and before
the GO decision, record the new boot ID and verify: the forum is stopped with
restart policy `no`; TCP 80/443, 2567, and 18080 are free; Dashy and Cockpit are
loopback-only; TeamSpeak has only its expected listeners; failed systemd units
have been checked; and the current reboot-required state has been checked and
recorded.

## Preserved forum standstill and cleanup prohibition

The preserved BurningForge forum container MUST NOT be started while the
BurningSpace staging edge owns public TCP 80/443. Immediately before edge
activation, and again after any host reboot, Docker daemon restart, or host
maintenance, verify the forum is stopped, its restart policy is `no`, and TCP
80 and 443 are free.

While forum preservation is required, do not run or perform destructive
cleanup equivalent to:

- `docker container prune`;
- `docker system prune`;
- `docker system prune -a`;
- removing the preserved forum container or required forum images; or
- deleting its preserved host bind data.

The container writable layer and images are recoverable state even though
Docker disk accounting may classify them as reclaimable. Bounded
BurningSpace-specific container/image cleanup is allowed only when it is
conclusively unable to touch preserved forum assets.

## Deployment GO packet

Before the Product Architect can issue GO, provide one non-secret packet containing:

- target environment identifier;
- target commit/image bindings and the exact rollback mode;
- exact client/server origins and allowlist;
- edge configuration ID;
- the bootstrap absence of a previous edge configuration, or the strict
  previous edge configuration ID for a later deployment, plus exact Caddy
  version/source and rendered and adapted configuration hashes;
- exact final Core run and reviewed head;
- Operations/Security and Network/Runtime verdict bindings;
- mandatory Claude QA result and reviewed head;
- read-only confirmation that both GHCR packages are private;
- availability of the approved ephemeral PAT-class authority without its
  value, successful authentication, both exact pre-GO manifest resolutions,
  and logout/temporary-config cleanup evidence;
- rollback readiness and expected room reset;
- exact external smoke command with values supplied outside evidence;
- named abort owner;
- intended redacted evidence location.

GO must name the environment and target release explicitly. It cannot be inferred from a merge, a green check, or this document.

## Phase B execution sequence

Only after explicit GO:

1. Bind the concrete GO reference and switch only the authorized real edge and
   application inventory fields to truthful execution semantics. Preserve the
   exact target release and exactly one rollback mode:
   `bootstrap-no-previous-release` for the first deployment or
   `previous-approved-release` later.
2. Confirm maintenance and shared-host pre-GO gates remain current, including
   the forum standstill, cleanup prohibition, DNS, firewall, and reserved ports.
3. Install and activate the already Phase-A-reviewed Caddy version, drop-in,
   service identity, runtime directory, Unix admin socket, configuration, and
   bounded logging contract. This is the first host-mutation stage authorized
   by GO.
4. Allow automatic HTTPS/ACME to obtain the real certificates. Prove the live
   certificate, renewal ownership, exact Origin behavior, listeners, socket
   permissions, adapted hashes, and log safety before setting `tlsReady=true`.
5. Run Edge Phase B with truthful `dnsConfigured=true`, `tlsReady=true`,
   `hostInstallationAuthorized=true`, `externalExecutionAuthorized=true`, and
   the exact GO reference. If it fails, stop before application deployment.
6. From the pinned release worktree whose `HEAD` equals `targetCommit`, run
   Application Phase B with the exact immutable images, rollback structure,
   normalized Compose contract, execution authorization, and GO reference. If
   it fails, do not pull or start application images.
7. Authenticate through the ephemeral private-GHCR procedure, run explicit
   `docker pull` for exactly the two digest-pinned images, verify local
   `RepoDigests`, then log out and destroy the temporary `DOCKER_CONFIG`.
8. Start the one-server/one-client deployment with the exact real Compose
   arguments and `--pull never`. Never use `docker compose pull` after
   credential destruction.
9. Run the complete external matrix below, including machine reconnect/session
   smoke and separate browser UX evidence.
10. Abort or perform the bounded rollback on any failed required check; never
    bypass either Phase B validator or report a partial smoke as success.
11. Capture only bounded, redacted evidence.

## External validation matrix

Required external evidence must bind each result to the exact environment, release, and edge configuration:

- DNS resolves both approved names only to the intended edge;
- certificates are valid for both names, HTTPS/WSS works, appropriate HTTP redirects occur, and obsolete TLS is rejected where the edge controls it;
- direct server, client, admin, and dashboard ports are externally unreachable;
- client root, `index.html`, and a real fingerprinted static asset load;
- the generated client contains the exact public server origin and no credential/private-key marker, complete environment file, reconnect token, or SSH/provider credential;
- `/health` returns the bounded liveness shape and `/ready` is 200 with `ready=true`;
- original allowed `Origin` reaches the application unchanged;
- hostile and absent production Origins are rejected and never rewritten;
- hostile matchmaking and an independent hostile raw WebSocket upgrade receive the expected application rejection;
- allowed matchmaking, WebSocket gameplay, profile/participant state, owned ship, and authoritative movement succeed;
- the existing Colyseus reconnect-token call succeeds, retains the same session/room and coherent ship state, and creates no duplicate participant/player/ship;
- graceful drain makes readiness false, shutdown is bounded, lifecycle logs are present, and restart is recorded as room-resetting;
- effective logs contain no query-bearing reconnect token, credentials, stack trace, or sensitive environment dump;
- rollback either restores the previous approved release or, for the first
  deployment only, restores `PRE_BURNINGSPACE_DEPLOYMENT_STATE`; all applicable
  post-rollback health/readiness/exposure checks pass.

## Browser UX evidence

Machine smoke proves network/session continuity; it does not visually prove Phaser presentation. Separately capture bounded manual/browser Phase B evidence that unexpected loss becomes visible, reconnecting is distinct, successful reconnect appears only after the real reconnect succeeds, terminal failure remains truthful, a recovery action is available, and no duplicate player appears. Screenshots or video may supplement this evidence but do not replace machine reconnect/session smoke.

## Rollback

For the first successful external staging deployment, bind
`bootstrap-no-previous-release`, the target image digests, target commit,
environment, target edge ID, reproducible configuration, and rollback owner.
Rollback restores `PRE_BURNINGSPACE_DEPLOYMENT_STATE`: stop and remove only the
`burningspace-staging` Compose project; deactivate and remove only the
BurningSpace Caddy edge configuration; verify no BurningSpace backend listeners
remain; and verify BurningSpace no longer owns public TCP 80/443. Preserve
Dashy, Cockpit, TeamSpeak, and the forum installation. The forum remains stopped
with restart policy `no`. Never run Docker/container/system prune or unrelated
cleanup.

For every later deployment, bind `previous-approved-release`, distinct target
and previous-approved server/client image digests, distinct approved commits,
and distinct current/previous edge IDs. Rollback switches to the exact previous
digests without rebuilding, restores the matching environment and edge
configuration, and retains all existing ancestry, health, readiness, client,
Origin, WebSocket, gameplay, reconnect, shutdown, redaction, and exposure
checks. Either mode may reset all active rooms and world state. Record bounded
release IDs, timestamps, outcomes, and the expected reset; never record secrets.

## Abort conditions

Abort Phase B for invalid TLS; wrong DNS; stripped/rewritten Origin; hostile or absent Origin acceptance; wildcard allowlist; broken WebSocket upgrade; direct service/admin port exposure; plaintext external target; disabled TLS verification; secret, reconnect-token, query-string, or environment leakage; readiness remaining false; client endpoint mismatch; duplicate reconnect ownership/session/ship; stale Core/reviewer/QA binding; unavailable or unbound rollback; failed shutdown; unexpected persistence requirement; or any difference between the approved plan and effective environment.

After abort, do not continue toward public launch. Execute the selected rollback
mode when safe, preserve redacted evidence, and report the exact bounded failure.

## Evidence and redaction

Evidence may include exact commits/images, non-secret environment ID, public origins, edge configuration ID, statuses, bounded JSON smoke summaries, and redacted operational events. It must never include private keys, tokens, passwords, SSH configuration, complete environment dumps, reconnect tokens, raw WebSocket query strings, unbounded/raw sensitive logs, provider credentials, or certificate private material.

## Public communication boundary

OPS-002 external staging is not a public-production launch. Communications must not imply persistence, account safety, durable identity, scaling, unrestricted availability, production SLA, campaign completion, or permanent authorization to operate the service.
