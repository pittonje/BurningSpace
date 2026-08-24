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
- Physical isolation: `false`
- Phase A merge: `33bff5009926bb5247acad5ebcf85ba8b7f626ce`
- Phase A implementation head: `3522116d62d8fb93a4a4ca1756aec6818280f0bb`
- Phase A evidence head: `d2322e24ac2ff0525d5b6332143098bb048d6262`
- Phase A review: `APPROVED / COMPLETE`
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

## Known environment facts

[The environment decision](ops-002-phase-b-environment-decision.md) is the
single source of truth for the measured host evidence summarized here. These
facts resolve host selection, repository hardening, host discovery, and
resource-headroom assessment only. They satisfy no host-remediation, edge,
DNS, TLS, release/rollback, or external-validation gate.

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
- Host remediation: `REQUIRED BEFORE DEPLOYMENT GO`
- Firewall: `ROOT REVIEW REQUIRED`
- TCP 4000: `RESTRICT BEFORE GO`
- TCP 9090: `RESTRICT / VERIFY BEFORE GO`
- TeamSpeak administrative/query ingress: `VERIFY BEFORE GO`
- Maintenance: `REQUIRED BEFORE CONTAINER CREATION`
- Edge: `SELECTED / REPOSITORY PREPARATION MERGED AND COMPLETE / NOT INSTALLED`
- DNS: `NOT CONFIGURED`
- TLS: `NOT CONFIGURED`
- Target image digest: `NOT SELECTED / PUBLISHED`
- Rollback image digests: `NOT SELECTED / PUBLISHED`
- External validation: `NOT STARTED`
- Deployment GO: `NOT ISSUED`
- Packet state: `DRAFT / INCOMPLETE`

## Incomplete environment and execution bindings

- Region: `NOT PROVIDED`
- Host/environment asset identifier: `NOT RECORDED IN CANONICAL
  DOCUMENTATION`
- Target public IP: `NOT RECORDED IN CANONICAL DOCUMENTATION`
- Public client origin: `NOT PROVIDED`
- Public server origin: `NOT PROVIDED`
- Exact server allowed Origin: `NOT PROVIDED`
- Target commit: `NOT PROVIDED`
- Target server image digest: `NOT PROVIDED`
- Target client image digest: `NOT PROVIDED`
- Previous approved commit: `NOT PROVIDED`
- Previous server image digest: `NOT PROVIDED`
- Previous client image digest: `NOT PROVIDED`
- Edge configuration identifier: `NOT SELECTED FOR REAL ENVIRONMENT`
- Previous edge configuration identifier: `NOT SELECTED`
- Installed Caddy version/source: `NOT VERIFIED`
- Effective Caddy systemd unit/drop-in, runtime-directory ownership/mode, Unix
  socket ownership/mode, and absence of TCP admin listeners: `NOT VERIFIED`
- Rollback mode: `NOT PROVIDED`
- Effective resource-limit validation on deployed containers: `NOT PERFORMED`
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
- target and previous-approved server/client images must each be recorded as
  `repository@sha256:<64 lowercase hex>`; and
- rollback switches to the recorded previous-approved digests without a
  rebuild.

These repository limits remain `SUITABLE / MUST BE VERIFIED WHEN DEPLOYED`.
Host capacity is not guaranteed. No registry is selected and no image was
published by repository hardening.

## GO prerequisites

- Phase A remains merged, Core-green, independently approved, and bound to the
  fixed heads above.
- Every mandatory repository, host, edge, DNS/TLS, rollback, and
  external-validation condition in
  [the environment decision](ops-002-phase-b-environment-decision.md) is
  complete and evidenced. Because the selected host is shared and not
  physically isolated, the required operational isolation boundary — bounded
  Compose project, container, and project-scoped network boundaries, explicit
  loopback binds, explicit resource limits, and immutable release and rollback
  bindings — is implemented and verified.
- Host maintenance is complete before any BurningSpace container is created,
  and the post-maintenance forum, port, Docker, unrelated-service, and
  firewall checks pass.
- Root-level effective IPv4/IPv6 firewall evidence is complete, including
  Docker-aware forwarding and `DOCKER-USER` treatment. TCP 4000 is restricted;
  TCP 9090 ingress is restricted or effectively verified; and TeamSpeak
  administrative/query TCP 10011, 10022, and 10080 are reviewed/restricted.
- The forum standstill is acknowledged: the preserved forum remains stopped
  with restart policy `no` while the BurningSpace staging edge owns TCP 80/443.
- The exact environment, public origins, Origin allowlist, release bindings,
  edge configuration, rollback binding, resource limits, owners, and evidence
  destination are complete.
- The effective Caddy unit uses the reviewed drop-in, runs as `caddy:caddy`,
  creates `/run/caddy` mode `0700` with `UMask=0077`, exposes only
  `/run/caddy/burningspace-admin.sock` for administration, denies an unrelated
  local user, and reloads successfully through that socket with no TCP admin
  listener before or after reload.
- The target and previous-approved server/client image references are all
  supplied, digest-pinned, non-placeholder, and derived from approved
  off-host builds.
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

Reason: Environment selection, repository hardening, host discovery, and the
resource-headroom assessment and Caddy repository preparation are complete,
but required host maintenance,
root firewall review, TCP 4000/9090 and TeamSpeak administrative ingress
dispositions, edge ownership/configuration, DNS, TLS, immutable release and
rollback bindings, and external validation evidence remain outstanding. Host
Caddy installation and deployment are not authorized, and deployment `GO` is
not issued.
