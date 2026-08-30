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

## Secret inventory by category only

The future execution owner must provide these categories through secure external channels when applicable; values never belong in Git, PR text, CI logs, evidence, or this runbook:

- SSH or deployment access;
- DNS-provider access;
- TLS/private-key material;
- reverse-proxy or provider credentials.

Do not add credential slots to copyable example environment files.

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
`ghcr.io/pittonje/burningspace-server` and
`ghcr.io/pittonje/burningspace-client` as the canonical repositories. The
manual-only `OPS-002 Publish Staging Images` GitHub Actions workflow is the
approved staging publication mechanism. It runs on `main`, uses the
repository-scoped `GITHUB_TOKEN` with `contents: read` and `packages: write`,
and publishes commit-tagged `linux/amd64` images without `latest`. The first
release candidate was published successfully by run `33310151475` from exact
`GITHUB_SHA` `75e4cd0ca71ca0b104067e19e0b7bfb2b5b3c81a`; its immutable manifest
digests are bound in the GO packet. The workflow did not change package
visibility, and publication does not authorize deployment.

For every release, the operator must dispatch the reviewed staging-image
publication workflow, record its exact `GITHUB_SHA` and immutable manifest
digests in the GO packet, and decide GHCR package visibility separately before
deployment GO. If the packages remain private, the exact host pull authority
must be defined and evidenced before deployment GO.

## Shared-host remediation gates

Repository hardening and read-only host discovery are complete. The following
host actions remain required before deployment GO and are not authorized by
this runbook or by edge design/preparation:

- Complete root-level effective firewall review for IPv4 and IPv6, including
  `ufw status verbose`, `nft list ruleset`, `iptables -S`, `ip6tables -S`, the
  `DOCKER-USER` chain, and effective exposure for TCP 22, 4000, 9090, 10011,
  10022, 10080, 30033, and UDP 9987. UFW default INPUT/FORWARD DROP is not by
  itself a firewall PASS because Docker-published ports do not rely solely on
  the UFW INPUT chain.
- Restrict the public plaintext Dashy dashboard on TCP 4000. Acceptable future
  dispositions are loopback rebinding behind an appropriately authenticated
  administrative path or effective Docker-aware source filtering. The exact
  mechanism requires separate authority.
- Retain Cockpit on TCP 9090, but restrict or verify its effective ingress,
  including root-level IPv4/IPv6 treatment and the operator access path.
- Review and restrict as required the unrelated TeamSpeak administrative/query
  TCP 10011, 10022, and 10080. BurningSpace operations do not own TeamSpeak;
  UDP 9987 and required file transfer remain subject to host-owner needs.
- Complete host maintenance before creating BurningSpace containers. The
  audited pending set includes Docker Engine, Docker CLI, containerd, Docker
  Compose plugin, and Docker Buildx, so the Docker daemon may restart.

After host maintenance, reverify Docker health; the forum remains stopped with
restart policy `no`; TCP 80/443 and both selected loopback ports remain free;
unrelated services remain operational; and effective firewall state remains
acceptable. Use exact individual container inspection as authority. Docker
aggregate container counters have disagreed with individually inspected state
on this host, so `docker info ContainersRunning` alone is not a stop/GO gate.

The required Phase B order is: completed host maintenance; then one controlled,
separately Product-Architect-authorized reboot; then shared-host baseline
revalidation; then image and edge deployment. This runbook does not authorize
or perform that reboot. After the reboot and before deployment, record the new
boot ID and verify: the forum is stopped with restart policy `no`; TCP 80/443,
2567, and 18080 are free; Dashy and Cockpit are loopback-only; TeamSpeak has
only its expected listeners; failed systemd units have been checked; and the
current reboot-required state has been checked and recorded.

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
- rollback readiness and expected room reset;
- exact external smoke command with values supplied outside evidence;
- named abort owner;
- intended redacted evidence location.

GO must name the environment and target release explicitly. It cannot be inferred from a merge, a green check, or this document.

## Phase B execution sequence

Only after explicit GO:

1. Revalidate the non-secret plan in `--phase-b` mode and bind the approved
   target release plus exactly one rollback mode. The first deployment uses
   `bootstrap-no-previous-release`; later deployments use
   `previous-approved-release`.
2. Confirm credentials are available through secure channels and no value will enter repository output.
3. Confirm maintenance and all shared-host remediation gates are complete,
   including the forum standstill and cleanup prohibition.
4. Confirm the selected Caddy version, effective systemd drop-in and service
   identity, `/run/caddy` ownership/mode, service umask, Unix admin socket and
    reload path, absence of IPv4/IPv6 TCP admin listeners, rollback-mode-correct
    current/previous config IDs, rendered/adapted hashes, DNS/TLS edge state, log safety, and
   service-port exposure against the approved inventory and Caddy runbook.
5. Pull or otherwise retrieve the exact prebuilt, digest-pinned target images derived from the approved merged commit; never build from source on the shared host.
6. Apply the provider-neutral edge configuration and one-server/one-client deployment through the approved operational mechanism.
7. Run the complete external matrix below, including machine reconnect/session smoke and separate browser UX evidence.
8. Abort or roll back on any failed required check; never report a partial smoke as success.
9. Capture only bounded, redacted evidence.

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
