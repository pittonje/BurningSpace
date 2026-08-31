# Public Arena External Staging Runbook

## Scope and limitations

This runbook separates OPS-002 repository preparation from any later controlled external execution. The Public Arena remains alpha and non-persistent: one in-memory authoritative server process and one static-client container, with no accounts, persistence, horizontal scaling, production SLA, or public-production launch. A server restart or rollback resets active rooms and world state.

The existing [local/container staging runbook](public-arena-staging-runbook.md) remains the source for the bounded local Compose lifecycle. This document adds the shared-host staging, external edge, authorization, validation, and rollback contract. The selected provider and environment are recorded in the Phase B environment decision; that selection does not authorize deployment. The selected edge implementation and its repository validation contract are defined in the [Caddy edge runbook](public-arena-caddy-edge-runbook.md).

## Authorization boundary

Phase A is repository and dry-run preparation only. It may validate committed templates, local plans, Compose rendering, local containers, and loopback smoke behavior. It must not access DNS, certificates, firewalls, provider APIs, SSH, or a real external environment.

Phase B is controlled external execution. It may begin only after the Phase A implementation is reviewed and human-merged, the exact approved head has green Core and blocker-free specialist/QA evidence, rollback is ready, and the Product Architect issues an explicit environment-specific deployment GO. A merged Phase A PR is not a deployment GO. Public-production launch remains separately unauthorized.

## Execution-side binding

All repository and TypeScript tooling executes on the Product
Architect/operator Windows workstation in Git for Windows Bash, specifically
`C:\Program Files\Git\bin\bash.exe`, with a semantic Bash minimum of `3.0` for
the used shell features. Record the actual observed version in evidence; exact
patch-level banner equality is not required. This side
performs the fresh fetch, ancestry gate, detached worktree creation, active
inventory copy/hash binding, `npm ci`, workspace builds, standalone Compose
normalization, Edge and Application Phase B validator processes, smoke harness
readiness, external smoke against the public origins, and bounded evidence
collection. Node, npm, and npx must be reachable from that Bash process.

The staging host `burningspace-staging-01` / `164.68.107.13` performs only
authorized runtime operations: Caddy installation/activation, ACME/TLS,
listener/service observation, ephemeral private-GHCR login, exact-digest
pulls and `RepoDigests` proof, credential/config destruction, Compose runtime
startup, and bounded rollback. Host evidence is retained separately and its
hashes authorize evidence-linked inventory field promotion; it is not
represented as a live-evidence file directly consumed by the validator. The staging host must not receive a
BurningSpace Git checkout/worktree, `node_modules`, npm installation, workspace
validator build output, or external-smoke tooling. No step in this runbook
authorizes npm or repository tooling on the VPS.

## Required non-secret inventory

- non-secret environment identifier and exact
  `shared-existing-vps-with-isolated-compose-staging` class;
- exact provider-confirmed region/location; for `burningspace-staging-01` the
  literal Contabo panel value is `Hub Europe`, which does not establish a
  country, city, or physical datacenter;
- alpha/non-persistent label;
- exact public client and server origins;
- exact allowed browser Origins;
- client build endpoint;
- target approved commit/images and the selected rollback mode;
- loopback server and client bind ports;
- edge configuration identifier/version;
- rollback mode;
- management-access, abort, and rollback owners;
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

The canonical Git-ignored `PRE_GO_BASE` application inventory binds only final workflow run
`33340075681`, target commit
`4a774354859c036d45666496539c2fc3c24b9f1c`, and the immutable deploy-server
and deploy-client references recorded below. The release-independent edge
inventory was reused byte-identically. These four canonical files remain
immutable after GO; all authorization promotion occurs only in the unique
detached execution worktree. Replacement application and edge Phase
A passed; the evidence packet is
`D:\Temp\burningspace-ops002-final-private-phasea-20260830T233259Z`, whose
`SHA256SUMS.txt` SHA-256 is
`3b78b2861450a1e39aa7dc729dd1cb065c80dcee1cbd8858c1ff04e829838a2e`.
Only `PRE_GO_BASE` may exist under canonical `deploy/`; never retain a promoted
State 2 or State 3 variant there.

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
use `GITHUB_TOKEN` on the VPS. The completed pre-GO proof PAT is `REVOKED` and
must never be reused. No persistent registry credential is permitted. The
future post-GO exact pull requires a newly created short-lived PAT of the same
read-only class; it is `NOT CREATED` before GO and must be revoked manually
immediately after the pull's logout/config cleanup.

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

The completed pre-GO proof used its now-revoked authenticated session only for
read-only provider-state and manifest checks. It confirmed both packages
private and resolved both exact immutable manifests without pulling image
layers. The two variables below were the exact immutable
`repository@sha256:<digest>` references approved in the packet and base
inventory; mutable tags remain forbidden:

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

## Pinned release-worktree provisioning

This entire section runs on `[OPERATOR WORKSTATION]`, never on the staging
host. Application Phase B, Edge Phase B, and later external smoke use one clean
detached release worktree at exactly
`4a774354859c036d45666496539c2fc3c24b9f1c`. The operator uses Git for Windows
Bash at `C:\Program Files\Git\bin\bash.exe`, gated semantically at Bash `>=3.0`,
and sets `COMPOSE_EXE` to a directly executable local standalone Compose
binary. That binary must be official Compose `v5.5.0` with SHA-256
`51e1e61195f3616896265487ed64551095f3bd27ac7fbd5758d3538c3bfa1b19`.
No Docker daemon or ambient `docker compose` command is required on the
workstation.

Before creating the worktree, perform a bounded fresh remote-tracking update.
Fetch failure is `PINNED_WORKTREE_PROVISIONING_NOT_READY`; do not use stale
`origin/main`, and do not pull, merge, reset, or check out `main`:

```sh
targetCommit=4a774354859c036d45666496539c2fc3c24b9f1c
canonicalCheckout=/d/BurningSpace
releaseRoot="$(mktemp -d /d/Temp/burningspace-ops002-release-exec-XXXXXXXX)"
releaseWorktree="$releaseRoot/release"
: "${COMPOSE_EXE:?set COMPOSE_EXE to the verified standalone Compose binary}"
if (( BASH_VERSINFO[0] < 3 )); then
  printf '%s\n' 'Git for Windows Bash 3.0 or newer is required.' >&2
  exit 1
fi
git -C "$canonicalCheckout" fetch --no-tags origin main
git -C "$canonicalCheckout" cat-file -e "$targetCommit^{commit}"
git -C "$canonicalCheckout" merge-base --is-ancestor "$targetCommit" origin/main
git -C "$canonicalCheckout" worktree add --detach "$releaseWorktree" "$targetCommit"
cd "$releaseWorktree"
test "$(git rev-parse HEAD)" = "$targetCommit"
test -z "$(git status --porcelain --untracked-files=all)"
test "$("$COMPOSE_EXE" version)" = "Docker Compose version v5.5.0"
test "$(sha256sum "$COMPOSE_EXE" | cut -d' ' -f1)" = "51e1e61195f3616896265487ed64551095f3bd27ac7fbd5758d3538c3bfa1b19"
```

The immutable canonical `PRE_GO_BASE` exists only in `D:\BurningSpace` and is
Git-ignored. Before every base copy, the workstation must prove each source exists,
is a regular local file, is not a symlink/junction/reparse point, remains
Git-ignored, and has the exact bound hash below. A mismatch is
`ACTIVE_RELEASE_INVENTORY_BINDING_FAILED`; never regenerate from templates.
Copy without moving, editing, line-ending normalization, or JSON rewriting:

```sh
while read -r expected relative; do
  sourceFile="$canonicalCheckout/$relative"
  destinationFile="$releaseWorktree/$relative"
  test -f "$sourceFile" && test ! -L "$sourceFile"
  git -C "$canonicalCheckout" check-ignore --quiet -- "$relative"
  test "$(sha256sum "$sourceFile" | cut -d' ' -f1)" = "$expected"
  cp -- "$sourceFile" "$destinationFile"
  test -f "$destinationFile" && test ! -L "$destinationFile"
  git check-ignore --quiet -- "$relative"
  test "$(sha256sum "$destinationFile" | cut -d' ' -f1)" = "$expected"
done <<'INVENTORY'
8e989f048fa5c80f15b672c5de3638c81d48cbb2f6e1a0f471d60a1a0759b08e deploy/.env.staging
0ffa473d762230f084f6d239e7fb5a328069cbba0ae9409c7b712e9a3fb29607 deploy/external-staging-plan.json
478e01e65070a10eb170e41ba1ee3c85b593e3382f397fcc2108d7ae230e98f4 deploy/edge/caddy/.env.staging
c9168b6801ce8df86bee9ba967e77a85d5b8d79f3e31dd9cf96a631022ca5ec7 deploy/edge/caddy/edge-plan.json
INVENTORY
test -z "$(git status --porcelain --untracked-files=all)"
```

On Windows, the source and destination checks additionally inspect
`Get-Item -Force` attributes and reject `ReparsePoint`; the Bash `-L` guard is
not a substitute for that Windows-native check. Run this bounded PowerShell
5.1 guard and enter the exact newly created absolute directory. This block
defines its own `$ReleaseWorktree`, rejects empty/unresolved/wrong-root values,
and does not reuse Bash variable syntax:

```powershell
$ReleaseWorktree = Read-Host 'Exact D:\Temp\burningspace-ops002-release-exec-...\release path'
if ([string]::IsNullOrWhiteSpace($ReleaseWorktree) -or
    -not [IO.Path]::IsPathRooted($ReleaseWorktree)) {
  throw 'ReleaseWorktree must be one bound absolute path'
}
$ReleaseWorktree = (Resolve-Path -LiteralPath $ReleaseWorktree).Path
$RequiredPrefix = 'D:\Temp\burningspace-ops002-release-exec-'
if (-not $ReleaseWorktree.StartsWith($RequiredPrefix, [StringComparison]::OrdinalIgnoreCase) -or
    $ReleaseWorktree.StartsWith('D:\BurningSpace', [StringComparison]::OrdinalIgnoreCase)) {
  throw 'ReleaseWorktree must be the unique execution worktree outside canonical/shared worktrees'
}
if ((git -C $ReleaseWorktree rev-parse HEAD) -ne
    '4a774354859c036d45666496539c2fc3c24b9f1c') {
  throw 'ReleaseWorktree does not point to the exact target'
}
$RelativeInventory = @(
  'deploy/.env.staging',
  'deploy/external-staging-plan.json',
  'deploy/edge/caddy/.env.staging',
  'deploy/edge/caddy/edge-plan.json'
)
foreach ($Relative in $RelativeInventory) {
  foreach ($Path in @(
    (Join-Path 'D:\BurningSpace' $Relative),
    (Join-Path $ReleaseWorktree $Relative)
  )) {
    $Item = Get-Item -LiteralPath $Path -Force
    if ($Item.PSIsContainer -or
        (($Item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)) {
      throw "Inventory path is not a regular non-reparse file: $Path"
    }
  }
}
```

Only exact, ignored, byte-identical regular `PRE_GO_BASE` destinations with an
empty status emit `PINNED_WORKTREE_INVENTORY_BOUND_PASS`. Do not retain `.old`,
`.copy`, or alternate active inventory. Never edit the canonical sources.

At real GO, the Product Architect assigns an independent reference such as
`OPS002-DEPLOY-GO-<UTC>-<NONCE>` and seals a non-secret execution bundle. The
bundle binds decision timestamp, target commit/images, the four base hashes,
per-file allowed transitions, expected State 2 and State 3 hashes, owners,
rollback, GO reference, and bundle SHA-256. Its
`inventory-stage-manifest.json` has these activation rules:

- `PRE_GO_BASE`: current canonical bytes; active before GO and immutable;
- `GO_AUTHORIZED_PRE_TLS`: requires `PRODUCT_ARCHITECT_GO`;
- `TLS_READY_PHASE_B`: requires `PRODUCT_ARCHITECT_GO` plus
  `REAL_TLS_EVIDENCE`.

Expected State 3 hashes may be computed deterministically when the GO bundle is
sealed. Those expected future bytes are not current readiness evidence, and
State 3 must not be materialized before real TLS evidence is retained.

Use a bounded structural promotion helper, not search/replace. It must parse env
files as exact key/value records, reject duplicates, and parse JSON
structurally. It rejects unknown/missing keys, wrong base hashes,
symlink/reparse substitution, unexpected initial true flags, wrong
target/image/origin/rollback bindings, mutable image refs, and retired
namespaces. It writes deterministically, hashes destinations against the stage
manifest, and emits a structured field diff. The complete allowlist is:

- application env, State 2:
  `BURNINGSPACE_DEPLOYMENT_GO_REFERENCE`,
  `BURNINGSPACE_EXTERNAL_EXECUTION_AUTHORIZED`;
- application plan, State 2: `deploymentGoReference`,
  `externalExecutionAuthorized`;
- edge env, State 2: `BURNINGSPACE_DEPLOYMENT_GO_REFERENCE`;
- edge plan, State 2: `deploymentGoReference`,
  `hostInstallationAuthorized`, `dnsConfigured`,
  `externalExecutionAuthorized`; and
- edge plan, State 3: only `tlsReady`.

State 2 uses the same concrete GO reference in every owning file, sets the
application and edge execution flags true, sets host installation true, binds
the independently proven DNS state true, and leaves `tlsReady=false`. State 3
is created only after retained real TLS evidence and changes edge-plan
`tlsReady=false -> true`; the application files and edge env stay identical to
State 2. No other field changes. Environment/class, target, images, origins,
allowlist/hostile Origin, ports, rollback, edge/Caddy IDs, resource limits, and
bootstrap previous-release structural absence remain unchanged.

Before GO, verify `PRE_GO_BASE` hashes. After GO and before TLS, verify
`GO_AUTHORIZED_PRE_TLS`. After TLS, verify `TLS_READY_PHASE_B`. Stale base
hashes must never be required for promoted execution copies.

Provision from the target lockfile and strengthen module readiness from mere
resolution to readable regular-file integrity:

```sh
npm ci
npm run build -w @burningspace/shared
npm run build -w @burningspace/protocol
test -f packages/shared/dist/index.js
test -f packages/protocol/dist/index.js
npx --no-install tsx --version
node --input-type=module -e "import {fileURLToPath} from 'node:url'; import {accessSync,constants,statSync} from 'node:fs'; for (const s of ['tsx','colyseus.js','@burningspace/shared','@burningspace/protocol']) { const p=fileURLToPath(import.meta.resolve(s)); accessSync(p,constants.R_OK); if (!statSync(p).isFile()) throw new Error(s+' is not a readable regular file'); console.log(s+'='+p); }"
test -z "$(git status --porcelain --untracked-files=all)"
```

Use the target commit's committed `package-lock.json`. `npm install`, `npm
update`, package/lockfile mutation, implicit `npx` installation, and execution
from a newer docs-tip checkout are forbidden. The target manifests bind the
workspace names `@burningspace/shared` and `@burningspace/protocol` and export
their runtime entry points from the two checked `dist/index.js` files.

Before Application Phase B, generate normalized Compose JSON on the operator
workstation through the verified direct `COMPOSE_EXE` path. The harness precheck
must prove exact HEAD and fresh ancestry, the application files against their
State 2/3 expected hashes and the edge files against State 3 after Edge Phase B,
the exact `TLS_READY_PHASE_B` stage name and concrete GO reference, ignored
status, target lockfile and `node_modules`, both dist files, tsx and module-file
integrity, Compose version/hash, successful normalization, exact final private
image refs, absence of retired refs, exact origins/loopback ports/rollback
mode, and a clean worktree. Only then emit
`APPLICATION_PHASE_B_HARNESS_READY` and invoke the unchanged validator:

```sh
"$COMPOSE_EXE" --env-file deploy/.env.staging -f deploy/docker-compose.staging.yml config --format json | \
npx --no-install tsx apps/server/scripts/external-staging-preflight.ts --phase-b --env deploy/.env.staging --plan deploy/external-staging-plan.json --compose-stdin
```

If the precheck fails, emit event `application_phase_b_harness_not_ready`,
classify `APPLICATION_PHASE_B_HARNESS_NOT_READY`, record that the validator was
not invoked, and stop before validator/pull/start. This tooling failure does not
by itself require runtime rollback because application mutation has not begun.
If the ready validator returns bounded validation failure, emit
`application_phase_b_validator_failed`, classify
`APPLICATION_PHASE_B_VALIDATOR_FAILED`, preserve its bounded output, and stop
before pull/start.

Edge Phase B is also an `[OPERATOR WORKSTATION]` TypeScript process in this
same worktree. Its actual accepted inputs are the State 3 edge env/plan,
committed Caddy validation release, Caddyfile, and systemd drop-in. Caddy/TLS
operations and observations remain on `[STAGING HOST]`; retained live evidence
is stored separately and authorizes evidence-linked promotion of
`dnsConfigured`, `hostInstallationAuthorized`, `tlsReady`,
`externalExecutionAuthorized`, and the GO reference. The promotion record links
evidence hashes, allowed transitions, and resulting inventory hashes. The
validator checks declared execution inventory/static edge authority; it does
not query the host. Node/npm/tsx never moves there.

```sh
npx --no-install tsx apps/server/scripts/external-staging-edge-preflight.ts --phase-b --env deploy/edge/caddy/.env.staging --plan deploy/edge/caddy/edge-plan.json
```

Keep this same provisioned worktree for the later smoke. The procedure is
pre-GO `BOUND / LOCALLY PROVEN`, including State 1→2, State 2→3, the exact Edge
and Application Phase-B command paths, Compose normalization, and smoke
self-test 3/3 at
`D:\Temp\burningspace-ops002-inventory-stage-proof-20260831T170134Z`. That
packet uses only a `LOCAL_FIXTURE_ONLY / NON_AUTHORITATIVE / NEVER_DEPLOY` GO
reference and `LOCAL_TLS_READY_FIXTURE`; it is not real GO, TLS, either real
Phase B, or external smoke. Actual worktree provisioning and stage activation
remain post-GO execution steps.

## Bound external smoke command

The exact post-deployment machine smoke is the existing repository script. Run
it from the provisioned pinned release worktree only after explicit GO,
`PINNED_WORKTREE_PROVISIONING_PASS`, Caddy/TLS, Edge Phase B PASS, Application
Phase B PASS, exact image pull and digest verification, credential cleanup,
Compose startup, and `SMOKE_HARNESS_READINESS_PASS`:

```sh
BURNINGSPACE_EXTERNAL_SMOKE_CLIENT_ORIGIN=https://game.burningforge.dev \
BURNINGSPACE_EXTERNAL_SMOKE_SERVER_ORIGIN=https://game-server.burningforge.dev \
BURNINGSPACE_EXTERNAL_SMOKE_ALLOWED_ORIGIN=https://game.burningforge.dev \
BURNINGSPACE_EXTERNAL_SMOKE_HOSTILE_ORIGIN=https://hostile.burningforge.dev \
BURNINGSPACE_EXTERNAL_SMOKE_TIMEOUT_MS=15000 \
npx --no-install tsx apps/server/scripts/external-staging-smoke.ts
```

Do not set `BURNINGSPACE_EXTERNAL_SMOKE_ALLOW_LOOPBACK_HTTP` for this external
run. Node HTTPS/fetch and raw TLS use the normal public trust chain; no
certificate-verification bypass is permitted. The HTTPS checks reject any
redirect and require direct `200` responses. The client checks cover `/`,
`/index.html`, and a referenced fingerprinted asset. Server checks require
`/health` to return `{ "ok": true, "service": "burningspace-server" }` and
`/ready` to return `{ "ok": true, "service": "burningspace-server", "ready":
true }`, both with HTTP `200`.

There is no invented fixed gameplay WebSocket path. The script uses the same
Colyseus client contract as the browser: matchmaking through
`joinOrCreate('battle')` (`/matchmake/joinOrCreate/battle`) and then the
server-returned WebSocket session path. It also sends the literal hostile
Origin `https://hostile.burningforge.dev` through hostile matchmaking and a
raw WebSocket upgrade and requires the latter to receive HTTP `403`; no DNS
record for that hostile identity is required.

Immediately before this command, on `[OPERATOR WORKSTATION]` in that same
worktree, rerun exact HEAD, all four `TLS_READY_PHASE_B` hashes/ignored status,
shell, toolchain, dist, and module-file integrity checks. The smoke does not
consume inventory directly, but this binding proves the exact authorized
release context:

```sh
test "$(git rev-parse HEAD)" = "4a774354859c036d45666496539c2fc3c24b9f1c"
test "${BASH_VERSINFO[0]}" -gt 3 || { test "${BASH_VERSINFO[0]}" -eq 3 && test "${BASH_VERSINFO[1]}" -ge 0; }
test -d node_modules
test -f packages/shared/dist/index.js
test -f packages/protocol/dist/index.js
npx --no-install tsx --version
node --input-type=module -e "import {fileURLToPath} from 'node:url'; import {accessSync,constants,statSync} from 'node:fs'; for (const s of ['tsx','colyseus.js','@burningspace/shared','@burningspace/protocol']) { const p=fileURLToPath(import.meta.resolve(s)); accessSync(p,constants.R_OK); if (!statSync(p).isFile()) throw new Error(s+' is not a readable regular file'); }"
```

Only all PASS emits event `smoke_harness_readiness_pass` and classification
`SMOKE_HARNESS_READINESS_PASS`.

If the precheck fails or the smoke process cannot load/start before producing
its structured failure envelope, emit `smoke_harness_not_ready` and classify
`SMOKE_HARNESS_NOT_READY`: the abort owner halts progression and no completion
may be declared, but harness failure alone does not prove the deployed runtime
unhealthy and does not automatically invoke rollback. Repair or reprovision
the harness and rerun under bounded authority, or obtain an explicit Product
Architect rollback decision for another reason.

Once the ready harness starts, it exits `0` only after every required client,
health/readiness, hostile-Origin, WebSocket, authoritative-state/movement,
reconnect-continuity, and duplicate-ownership assertion passes. Any required
assertion failure emits structured event `external_staging_smoke_failed` with
a bounded named error code and is classified `SMOKE_ASSERTION_FAILED`: the
abort owner halts progression, deployment validation fails, and the mandatory
`bootstrap-no-previous-release` rollback disposition applies. Binding this
command and classification is a pre-GO packet requirement; executing it is
post-deployment only and forbidden during packet preparation.

Retained bounded evidence records the precheck result/exit, whether smoke was
invoked, smoke process exit, whether the structured failure envelope existed,
and its bounded error code when present. Never record secrets or reconnect
tokens. This evidence makes harness-start failure mechanically distinct from a
deployed assertion failure.

## Deployment GO packet

Before the Product Architect can issue GO, provide one non-secret packet containing:

- target environment identifier;
- provider-confirmed region/location;
- target commit/image bindings and the exact rollback mode;
- independently assigned GO reference and sealed GO execution-bundle SHA-256;
- `inventory-stage-manifest.json` with `PRE_GO_BASE`,
  `GO_AUTHORIZED_PRE_TLS`, and `TLS_READY_PHASE_B` hashes, activation rules,
  and exact per-file allowed transitions;
- exact client/server origins and allowlist;
- edge configuration ID;
- the bootstrap absence of a previous edge configuration, or the strict
  previous edge configuration ID for a later deployment, plus exact Caddy
  version/source and rendered and adapted configuration hashes;
- exact final Core run and reviewed head;
- Operations/Security and Network/Runtime verdict bindings;
- mandatory Claude QA result and reviewed head;
- read-only confirmation that both GHCR packages are private;
- confirmation that the pre-GO proof PAT is revoked and the future post-GO
  pull PAT is not yet created; plus completed exact pre-GO manifest-resolution
  and logout/temporary-config cleanup evidence without any token value;
- rollback readiness and expected room reset;
- exact external smoke command with the bound non-secret production values;
- named management-access, abort, and rollback owners;
- intended redacted evidence location.

GO must name the environment and target release explicitly. It cannot be inferred from a merge, a green check, or this document.

## Phase B execution sequence

Only after explicit GO:

1. `[OPERATOR WORKSTATION / GOVERNANCE]` Assign the concrete GO reference and
   seal the execution bundle/stage manifest with exact targets, base hashes,
   allowlist, expected State 2/3 hashes, owners, rollback, and bundle SHA.
2. `[OPERATOR WORKSTATION]` Create/reverify the exact target worktree, copy
   immutable `PRE_GO_BASE`, promote only allowlisted fields to
   `GO_AUTHORIZED_PRE_TLS`, and verify exact State 2 hashes with
   `tlsReady=false`.
3. `[STAGING HOST]` Confirm shared-host gates remain current, then install and
   activate the Phase-A-reviewed Caddy version, service identity, runtime
   directory, Unix admin socket, configuration, and bounded logging contract.
4. `[STAGING HOST]` Allow automatic HTTPS/ACME to obtain certificates and prove
   live certificate, renewal, listeners, socket permissions, adapted hashes,
   exact Origin behavior, and log safety.
5. `[OPERATOR WORKSTATION / GOVERNANCE]` Bind retained TLS evidence to the
   execution bundle.
6. `[OPERATOR WORKSTATION]` Promote only edge-plan `tlsReady=false -> true`,
   producing `TLS_READY_PHASE_B`, and verify exact State 3 hashes.
7. `[OPERATOR WORKSTATION]` Run the Edge Phase B TypeScript validator against
   State 3 and require PASS. If it fails, stop before application deployment.
8. `[OPERATOR WORKSTATION]` Perform or reverify fresh ancestry, the detached
   worktree, all four State 3 hashes/ignored status, target-lockfile
   install/builds, module-file integrity, and standalone Compose binding.
9. `[OPERATOR WORKSTATION]` Require `APPLICATION_PHASE_B_HARNESS_READY`, then
   run Application Phase B through direct `COMPOSE_EXE` normalized JSON and
   `npx --no-install tsx`. Apply the named harness/validator events above and
   stop before pull/start on either failure.
10. `[STAGING HOST]` Create/use the fresh post-GO pull PAT, authenticate through
   the ephemeral private-GHCR procedure,
   explicitly pull exactly the two digest-pinned images, and verify local
   `RepoDigests`.
11. `[STAGING HOST]` Log out and destroy the temporary `DOCKER_CONFIG`; never run
   `docker compose pull` after credential destruction.
12. `[STAGING HOST]` Start the one-server/one-client runtime with the authorized
   deployment files and `docker compose up -d --pull never`.
13. `[OPERATOR WORKSTATION]` Recheck the same worktree, exact release context,
    and all State 3 hashes;
    require event `smoke_harness_readiness_pass`.
14. `[OPERATOR WORKSTATION]` Execute the bound external smoke against the public
    origins and separately capture browser UX evidence. Apply
    `SMOKE_HARNESS_NOT_READY` versus `SMOKE_ASSERTION_FAILED` mechanically.
15. `[GOVERNANCE]` Declare completion only after all required PASS evidence, or
    halt and apply the bounded rollback disposition. Preserve only bounded,
    redacted evidence.

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
mode when required by the classified failure: it is mandatory for
`SMOKE_ASSERTION_FAILED`, while `SMOKE_HARNESS_NOT_READY` alone requires halt,
harness repair/reprovisioning, and rerun or an explicit Product Architect
rollback decision. Preserve redacted evidence and report the exact bounded
failure.

## Evidence and redaction

Evidence may include exact commits/images, non-secret environment ID, public origins, edge configuration ID, statuses, bounded JSON smoke summaries, and redacted operational events. It must never include private keys, tokens, passwords, SSH configuration, complete environment dumps, reconnect tokens, raw WebSocket query strings, unbounded/raw sensitive logs, provider credentials, or certificate private material.

## Public communication boundary

OPS-002 external staging is not a public-production launch. Communications must not imply persistence, account safety, durable identity, scaling, unrestricted availability, production SLA, campaign completion, or permanent authorization to operate the service.
