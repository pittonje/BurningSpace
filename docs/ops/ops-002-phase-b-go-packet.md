# OPS-002 Phase B — Draft Deployment GO Packet

Status: `DRAFT / INCOMPLETE / GO NOT ISSUED`

This packet is not a deployment authorization. Incomplete fields must be
resolved and verified for the exact environment before the Product Architect
can make an environment-specific GO decision.

## Fixed bindings

- Environment ID: `burningspace-staging-01`
- Environment class: `dedicated-isolated-single-host-vps`
- Phase A merge: `33bff5009926bb5247acad5ebcf85ba8b7f626ce`
- Phase A implementation head: `3522116d62d8fb93a4a4ca1756aec6818280f0bb`
- Phase A evidence head: `d2322e24ac2ff0525d5b6332143098bb048d6262`
- Phase A review: `APPROVED / COMPLETE`
- Phase B external execution authorized: `false`
- Deployment GO issued: `false`
- Public production launch authorized: `false`

## Incomplete environment and execution bindings

- Provider: `NOT PROVIDED`
- Region: `NOT PROVIDED`
- Host/environment asset identifier: `NOT PROVIDED`
- Target public IP: `NOT PROVIDED`
- Public client origin: `NOT PROVIDED`
- Public server origin: `NOT PROVIDED`
- Exact server allowed Origin: `NOT PROVIDED`
- Target commit/image: `NOT PROVIDED`
- Previous approved commit/image: `NOT PROVIDED`
- Edge configuration identifier: `NOT PROVIDED`
- Rollback mode: `NOT PROVIDED`
- Resource limits: `NOT PROVIDED`
- Management-access owner: `NOT PROVIDED`
- Abort owner: `NOT PROVIDED`
- Credentials-ready confirmation without values: `NOT VERIFIED`
- DNS-ready confirmation: `NOT VERIFIED`
- TLS-ready confirmation: `NOT VERIFIED`
- Firewall-ready confirmation: `NOT VERIFIED`
- Log-redaction confirmation: `NOT VERIFIED`
- Rollback-ready confirmation: `NOT VERIFIED`
- External smoke command: `NOT PROVIDED`
- Evidence destination: `NOT PROVIDED`
- Operations/Security review binding: `NOT PROVIDED`
- Network/Runtime review binding: `NOT PROVIDED`
- Mandatory Claude QA binding: `NOT PROVIDED`
- Product Architect GO reference: `NOT PROVIDED`

## GO prerequisites

- Phase A remains merged, Core-green, independently approved, and bound to the
  fixed heads above.
- One dedicated isolated host is provisioned and verified against the
  environment decision.
- The exact environment, public origins, Origin allowlist, release bindings,
  edge configuration, rollback binding, resource limits, owners, and evidence
  destination are complete.
- Credential, DNS, TLS, firewall, log-redaction, and rollback readiness are
  confirmed without recording secret values.
- Operations/Security and Network/Runtime evidence approves the exact target.
- Mandatory Claude QA is bound to the exact target or receives a
  policy-compliant Product Architect infrastructure disposition.
- The Product Architect issues an explicit GO naming the environment and
  target release.

## Required evidence

The completed packet and later Phase B record must bind non-secret evidence
for:

- The exact repository head and deployed image or build identifiers.
- The environment ID, public client/server origins, and edge configuration.
- DNS and TLS status, loopback bindings, firewall exposure, and management
  separation.
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
service, admin, or dashboard port exposure; plaintext external transport;
disabled TLS verification; credential, reconnect-token, query-string, or
environment leakage; readiness failure; client endpoint mismatch; duplicate
reconnect ownership; stale review or Core bindings; unavailable rollback;
failed shutdown; an unexpected persistence requirement; or any difference
between the approved plan and effective environment.

A failed required check must not be reported as a successful deployment or
used to continue toward public launch.

## Rollback binding

Rollback remains incomplete until the previous approved release, target
release, environment and edge configuration version, rollback mode, rollback
owner, reproducible configuration or approved backup, expected room reset,
and post-rollback validation are all bound. Rollback must restore the previous
approved release and repeat the required health, readiness, client, Origin,
WebSocket, gameplay, reconnect, shutdown, redaction, and exposure checks.

## Secret handling

Credential values, private keys, provider credentials, SSH configuration,
private-key paths, real environment dumps, reconnect tokens, query-bearing
WebSocket URLs, and unbounded sensitive logs must remain outside Git, PR text,
CI output, and evidence. This packet records readiness by category only.

## Product Architect decision

GO: `NOT ISSUED`

Reason: No host has been provisioned and no exact environment, origins,
rollback binding, credential readiness, or external validation evidence
exists.
