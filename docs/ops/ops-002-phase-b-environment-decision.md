# OPS-002 Phase B — External Staging Environment Decision

Status: `ENVIRONMENT SELECTED / HARDENING REQUIRED / GO NOT ISSUED`

Amended: 2026-08-24 — shared-host authority transition. The originally
recorded class `dedicated-isolated-single-host-vps` is superseded for OPS-002
controlled low-traffic external staging only. The supersession rationale and
the preserved historical audit conclusion are recorded below.

## Decision

- Environment ID: `burningspace-staging-01`
- Environment class: `shared-existing-vps-with-isolated-compose-staging`
- Superseded environment class: `dedicated-isolated-single-host-vps`
- Environment purpose: `controlled low-traffic BurningSpace external staging
  only`
- Provider: `Contabo`
- Provider account: `NOT RECORDED IN CANONICAL DOCUMENTATION`
- Host: `SELECTED — existing shared VPS`
- Physical isolation: `NO`
- Operational isolation: `REQUIRED / NOT YET IMPLEMENTED`
- Region: `NOT RECORDED`
- Public IP: `NOT RECORDED IN CANONICAL DOCUMENTATION`
- Public client hostname: `NOT ASSIGNED`
- Public server hostname: `NOT ASSIGNED`
- DNS zone: `NOT SELECTED`
- TLS edge: `NOT CONFIGURED`
- Reverse proxy: `NOT CONFIGURED`
- Firewall: `NOT REVIEWED`
- Deployment credentials: `NOT REQUESTED`
- Shared-host hardening preparation: `AUTHORIZED`
- Repository hardening implementation: `AUTHORIZED AFTER THIS DECISION MERGES
  / NOT IMPLEMENTED`
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
- bounded shared-host hardening preparation;
- bounded repository hardening implementation once this decision is merged.

This decision does not authorize:

- public production launch;
- general-purpose or multi-tenant deployment;
- deployment before the remaining mandatory hardening gates below are met;
- removal of the preserved BurningForge forum;
- unrestricted reuse of unrelated host services.

## Measured host evidence

The following sanitized measured facts are the evidence for this decision.
They were observed operationally. No BurningSpace deployment occurred, and no
firewall, proxy, DNS, or TLS mutation occurred.

- Provider: Contabo.
- Environment ID: `burningspace-staging-01`.
- Host class: `shared-existing-vps-with-isolated-compose-staging`.
- Capacity measured after forum shutdown: 4 vCPU, approximately 6.9 GiB
  available RAM, approximately 48 GiB free disk, root filesystem approximately
  35% used, very low observed load.
- Docker: healthy.
- BurningForge forum: stopped, autostart disabled, restart policy `no`, with
  container, image, and data preserved. Forum recovery remains available
  through an explicitly recorded out-of-band operational rollback procedure.
- Public TCP 80: free.
- Public TCP 443: free.
- Selected BurningSpace internal loopback endpoints: `127.0.0.1:2567` for the
  authoritative server and `127.0.0.1:8080` for the static client.
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

Every condition below remains open. None is satisfied by this decision.

### Repository hardening

Required before GO:

- explicit server CPU limit;
- explicit server RAM limit;
- explicit client CPU limit;
- explicit client RAM limit;
- bounded Docker log rotation;
- immutable target image reference;
- immutable rollback image reference;
- off-host or CI image build;
- no source-context production or staging build on this shared host.

Recommended and expected:

- an explicit project-scoped Docker network.

### Host hardening

Required before GO:

- root-level firewall review;
- explicit disposition of public TCP 4000;
- identification and disposition of TCP 9090;
- verification that no unintended public database, cache, or Docker API
  exposure exists;
- maintenance and update review;
- confirmation of sufficient host reserve after resource-limit selection.

### Edge

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

- an exact staging client hostname;
- an exact staging server hostname;
- certificate issuance;
- certificate renewal ownership;
- an exact allowed-`Origin` binding;
- no wildcard origin authorization.

### Rollback

Required before GO:

- an immutable target release binding;
- an immutable previous-approved release binding;
- an edge configuration rollback binding;
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

The upcoming shared-host hardening implementation is `HIGH RISK` because it
affects deployment isolation, resource containment, logs, release and rollback
reproducibility, public edge preparation, and security boundaries.

Its implementation requires:

- Core CI and tests;
- independent Operations/Security review;
- independent Network/Runtime review where network behavior is affected;
- mandatory Claude QA;
- Product Architect approval;
- human merge.

The project's risk-based review policy is not weakened by this decision.

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
- Target and previous approved image bindings are recorded.
- Edge configuration, rollback mode, owners, and resource limits are recorded.
- Credential readiness is confirmed without recording credential values.
- Log-redaction, rollback-readiness, external-smoke, review, and evidence
  bindings are completed in the GO packet.

Provisioning is not complete, credentials have not been requested, and this
decision is not authorization to perform any prerequisite beyond bounded
repository and shared-host hardening preparation.

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
