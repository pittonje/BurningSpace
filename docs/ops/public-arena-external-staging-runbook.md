# Public Arena External Staging Runbook

## Scope and limitations

This runbook separates OPS-002 repository preparation from any later controlled external execution. The Public Arena remains alpha and non-persistent: one in-memory authoritative server process and one static-client container, with no accounts, persistence, horizontal scaling, production SLA, or public-production launch. A server restart or rollback resets active rooms and world state.

The existing [local/container staging runbook](public-arena-staging-runbook.md) remains the source for the bounded local Compose lifecycle. This document adds the shared-host staging, external edge, authorization, validation, and rollback contract. The selected provider and environment are recorded in the Phase B environment decision; that selection does not authorize deployment.

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
- target approved commit/image and previous approved commit/image;
- loopback server and client bind ports;
- edge configuration identifier/version;
- rollback mode;
- Product Architect deployment GO reference.

The release inventory must also bind four immutable OCI references:

- target server image;
- target client image;
- previous-approved server image; and
- previous-approved client image.

Every reference must use `repository@sha256:<64 lowercase hex>` form. Mutable
tags, omitted images, malformed digests, and documentation placeholders fail
closed outside template validation.

Keep a real plan beside a Git-ignored `deploy/.env.*` file. The committed examples use only `.example.invalid` values and explicitly set external execution and public-production launch authorization to false.

## Secret inventory by category only

The future execution owner must provide these categories through secure external channels when applicable; values never belong in Git, PR text, CI logs, evidence, or this runbook:

- SSH or deployment access;
- DNS-provider access;
- TLS/private-key material;
- reverse-proxy or provider credentials.

Do not add credential slots to copyable example environment files.

## Provider-neutral edge contract

The selected edge must:

- terminate TLS for the exact client and server names and redirect HTTP to HTTPS where appropriate;
- preserve the browser's original `Origin`; it must never rewrite a hostile or absent Origin into an allowed value;
- keep `Host` coherent for the chosen upstream policy;
- use HTTP/1.1 upstream where required and forward `Upgrade` and `Connection` correctly;
- provide a bounded timeout suitable for long-lived WebSockets;
- route only to explicit loopback upstreams;
- expose no direct Node/static-client service ports or administrative/dashboard ports;
- treat forwarded client IP only as operations metadata, never identity or gameplay authority.

For external targets, TLS verification remains enabled. Do not recover from edge failures by weakening the exact Origin allowlist, using plaintext external transport, or exposing Compose ports publicly.

## Access-log safety

Colyseus may carry a reconnect bearer token in a WebSocket query string. The effective edge/access-log format must not retain request query strings for WebSocket routes, and logs/evidence must not contain reconnect tokens. Verify the actual effective logging behavior of the selected edge; no single provider-specific directive is assumed sufficient. Application lifecycle logs must remain bounded and omit Origin lists, headers, tokens, and gameplay state.

## Phase A commands

These commands operate only on committed examples, repository state, or loopback containers:

```sh
npx tsc -p apps/server/scripts/tsconfig.external-staging.json --noEmit
npx tsx apps/server/scripts/external-staging-preflight.ts --self-test
docker compose --env-file deploy/external-staging.env.example -f deploy/docker-compose.staging.yml config --format json | npx tsx apps/server/scripts/external-staging-preflight.ts --template --env deploy/external-staging.env.example --plan deploy/external-staging-plan.example.json --compose-stdin
docker compose --env-file deploy/staging.env.example -f deploy/docker-compose.staging.yml -f deploy/docker-compose.staging.build.yml config --format json
```

A real Phase A plan uses full local commit SHAs, keeps `externalExecutionAuthorized=false`, and is validated with `--phase-a`. Do not run `--phase-b` without the later environment-specific authorization packet. None of these commands deploys or contacts `.example.invalid`.

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
shared-host deployment command. No registry is selected and this repository
task does not publish images; a later authorized release process must publish
the exact reviewed images and record their resulting digests before GO.

## Deployment GO packet

Before the Product Architect can issue GO, provide one non-secret packet containing:

- target environment identifier;
- target and previous approved commit/image bindings;
- exact client/server origins and allowlist;
- edge configuration ID;
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

1. Revalidate the non-secret plan in `--phase-b` mode and bind the approved release and rollback release.
2. Confirm credentials are available through secure channels and no value will enter repository output.
3. Confirm DNS/TLS/edge configuration and service-port exposure against the approved inventory.
4. Pull or otherwise retrieve the exact prebuilt, digest-pinned target images derived from the approved merged commit; never build from source on the shared host.
5. Apply the provider-neutral edge configuration and one-server/one-client deployment through the approved operational mechanism.
6. Run the complete external matrix below, including machine reconnect/session smoke and separate browser UX evidence.
7. Abort or roll back on any failed required check; never report a partial smoke as success.
8. Capture only bounded, redacted evidence.

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
- rollback restores the previous approved release and all post-rollback health/readiness/smoke checks pass.

## Browser UX evidence

Machine smoke proves network/session continuity; it does not visually prove Phaser presentation. Separately capture bounded manual/browser Phase B evidence that unexpected loss becomes visible, reconnecting is distinct, successful reconnect appears only after the real reconnect succeeds, terminal failure remains truthful, a recovery action is available, and no duplicate player appears. Screenshots or video may supplement this evidence but do not replace machine reconnect/session smoke.

## Rollback

Before change, bind the previous server/client image digests, target server/client image digests, and environment/edge configuration version. Preserve a reproducible configuration or approved backup outside Git and confirm the rollback owner and operation. Rollback switches to the exact previous-approved image digests and never rebuilds an image. On rollback, restore the matching environment/edge configuration, expecting all active rooms/world state to reset. Then rerun health, readiness, client/static asset, Origin, raw WebSocket, allowed gameplay, reconnect, shutdown, log-redaction, and exposure checks. Record bounded release IDs, timestamps, outcomes, and the expected reset; never record secrets.

## Abort conditions

Abort Phase B for invalid TLS; wrong DNS; stripped/rewritten Origin; hostile or absent Origin acceptance; wildcard allowlist; broken WebSocket upgrade; direct service/admin port exposure; plaintext external target; disabled TLS verification; secret, reconnect-token, query-string, or environment leakage; readiness remaining false; client endpoint mismatch; duplicate reconnect ownership/session/ship; stale Core/reviewer/QA binding; unavailable or unbound rollback; failed shutdown; unexpected persistence requirement; or any difference between the approved plan and effective environment.

After abort, do not continue toward public launch. Restore the previous approved staging release when safe, preserve redacted evidence, and report the exact bounded failure.

## Evidence and redaction

Evidence may include exact commits/images, non-secret environment ID, public origins, edge configuration ID, statuses, bounded JSON smoke summaries, and redacted operational events. It must never include private keys, tokens, passwords, SSH configuration, complete environment dumps, reconnect tokens, raw WebSocket query strings, unbounded/raw sensitive logs, provider credentials, or certificate private material.

## Public communication boundary

OPS-002 external staging is not a public-production launch. Communications must not imply persistence, account safety, durable identity, scaling, unrestricted availability, production SLA, campaign completion, or permanent authorization to operate the service.
