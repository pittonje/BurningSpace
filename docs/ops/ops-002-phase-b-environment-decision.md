# OPS-002 Phase B — External Staging Environment Decision

Status: `ENVIRONMENT CLASS SELECTED / HOST NOT PROVISIONED / GO NOT ISSUED`

## Decision

- Environment ID: `burningspace-staging-01`
- Environment class: `dedicated-isolated-single-host-vps`
- Environment purpose: `BurningSpace Public Arena external staging only`
- Provider: `NOT SELECTED`
- Provider account: `NOT SELECTED`
- Host: `NOT PROVISIONED`
- Region: `NOT SELECTED`
- Public IP: `NOT ASSIGNED`
- Public client hostname: `NOT ASSIGNED`
- Public server hostname: `NOT ASSIGNED`
- DNS zone: `NOT SELECTED`
- TLS edge: `NOT CONFIGURED`
- Reverse proxy: `NOT CONFIGURED`
- Firewall: `NOT CONFIGURED`
- Deployment credentials: `NOT REQUESTED`
- Deployment GO: `NOT ISSUED`
- Phase B execution: `NOT AUTHORIZED`
- Public production launch: `NOT AUTHORIZED`

The Product Architect selects the required environment topology and isolation
boundary. This decision does not select a commercial provider and does not
claim that a physical or virtual host currently exists.

## Isolation rationale

OPS-002 is HIGH risk and its staging server is intentionally externally
reachable through a TLS edge. A shared host would create unnecessary blast
radius through resource exhaustion, Docker daemon failures, reverse-proxy
mistakes, host maintenance, and operator error. A dedicated host permits
staging-specific rollback, firewall policy, logs, restart, resource limits,
and teardown. Staging failure must not interrupt unrelated services.

The selected environment remains a single-host deployment and does not alter
the current one-process, no-persistence architecture. The existing shared
multi-service host is not selected. No private infrastructure inventory or
unrelated-service detail is recorded here.

## Required host capabilities

- A supported current Ubuntu LTS release or equivalent maintained Linux.
- Docker Engine and the Docker Compose plugin.
- Non-root administrative access.
- Inbound TCP 80 and 443 only for the application edge unless operational
  evidence explicitly authorizes another port.
- SSH and other management access restricted separately from the application
  edge.
- Sufficient CPU, RAM, and storage for one static-client container, one
  authoritative server process, the reverse proxy, logs, and bounded
  build/deploy activity.
- Resource limits selected and recorded before any deployment GO.
- No unrelated services on the host.
- Rollback-capable disk space.
- A synchronized system clock.
- A secure update policy.

Exact resource quantities remain unselected until evidence for the actual host
and workload supports them.

## Rejected environment classes

- The existing shared multi-service host, because staging requires isolation
  from unrelated services.
- A developer workstation.
- Home-network exposure.
- Any topology that publishes the Node or Colyseus port directly.
- Shared hosting without Docker and network-policy control.
- Serverless or static-only hosting for the authoritative server.
- A multi-node or distributed topology.
- A production environment.

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
reconnect, rate-limit, Origin, and CORS semantics remain unchanged.

## Provisioning prerequisites

Before an environment-specific Product Architect GO decision can be requested,
the following non-secret prerequisites must be complete:

- A provider, provider account, region, and dedicated host asset are selected.
- The host satisfies the required capabilities and isolation boundary.
- Public client and server origins and the exact server allowed Origin are
  assigned.
- DNS, TLS edge, reverse proxy, firewall, and restricted management access are
  designed for the selected host.
- Target and previous approved commit or image bindings are recorded.
- Edge configuration, rollback mode, owners, and resource limits are recorded.
- Credential readiness is confirmed without recording credential values.
- Log-redaction, rollback-readiness, external-smoke, review, and evidence
  bindings are completed in the GO packet.

Provisioning is not complete, credentials have not been requested, and this
decision is not authorization to perform any prerequisite.

## Decision expiration

This decision expires and must return to the Product Architect if
implementation requires any of the following:

- Shared hosting.
- Non-loopback direct service exposure.
- Persistence.
- Horizontal scaling.
- Protocol or security changes.
- Provider-specific architecture that conflicts with the external staging
  runbook.
