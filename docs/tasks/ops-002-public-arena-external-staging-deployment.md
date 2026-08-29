# OPS-002 — Public Arena External Staging Deployment and Validation

Owner: `Product Architect`

Track: `Public Arena Alpha launch track`

## Status

`ACTIVE — EDGE REPOSITORY PREPARATION COMPLETE; HOST/RELEASE/DNS/TLS/VALIDATION REMAIN; DEPLOYMENT NOT AUTHORIZED`

## Risk

`HIGH — externally reachable infrastructure, security, secrets, and rollback`

Merge authority: `Human only`

This authority becomes effective only after the OPS-002 authority bootstrap
containing this document is merged into `main`. Bootstrap merge does not
authorize external staging execution.

## Baseline and milestone authority

- SEC-007 is `COMPLETE` and owns the fail-closed production Origin, CORS,
  WebSocket, and bounded-message boundary.
- NET-001 is `COMPLETE` and owns transient reconnect/session continuity.
- OPS-001 is `MERGED / CLOSED` and provides the local/container deployment
  foundation, health/readiness, shutdown behavior, smoke test, and runbook.
- UX-001 is `MERGED / CLOSED` and provides truthful connection, failure, and
  reconnect presentation.
- External Public Arena deployment has not been performed.
- Shared-host repository hardening is `MERGED / COMPLETE` through PR #67 and
  merge commit `21a4ce2fe796f655d20911d8a52a60c69eec432d`.
- Read-only host-gate discovery is `COMPLETE`. Host remediation remains
  required before deployment GO.
- Caddy edge repository preparation is `MERGED / COMPLETE` through PR #69 and
  merge `4d691b056a8fa5cc558f52ae81da51d69aff2fc1`. Caddy is not installed or
  configured on the host, and this authority permits no external host mutation.
- Host remediation, target and rollback image publication/binding, DNS/TLS,
  Caddy installation, and external validation remain required. Deployment `GO`
  remains `NOT ISSUED`.
- The accepted decision count remains 35. OPS-002 creates no accepted game
  design, architecture, process, or CI decision.
- The campaign roadmap and DOCARCH-004 paused state are unchanged.

OPS-002 is a controlled external staging milestone toward a non-local Public
Arena. It is not a public launch, production-scale launch, campaign-MVP
completion, or permanent authorization to operate a public service.

## Product goal

Deploy the existing Public Arena Alpha stack to one controlled external
staging environment and prove that the current single-process,
server-authoritative architecture works through a real TLS edge without
weakening security or overstating launch maturity.

A successful result has:

- one externally reachable HTTPS client staging origin;
- one externally reachable secure WebSocket/HTTPS server staging origin;
- valid TLS and an external reverse proxy;
- the browser's original `Origin` and WebSocket upgrade semantics preserved;
- host-side service exposure remaining explicitly loopback-bound;
- allowed-Origin matchmaking and reconnect working while hostile and absent
  production Origins are rejected;
- health/readiness and bounded graceful shutdown operationally observable;
- rollback documented and tested;
- no secret committed to the repository; and
- the environment explicitly labelled alpha, staging, and non-persistent.

Success is not a general public production launch.

## Existing topology and configuration truth

The repository currently defines one Node/Colyseus server container and one
static-client Nginx container in `deploy/docker-compose.staging.yml`.
Host bindings use `127.0.0.1` with
`BURNINGSPACE_SERVER_BIND_PORT` and `BURNINGSPACE_CLIENT_BIND_PORT`. The
server's internal `PORT` is `2567`; the client serves internally on `8080`.
TLS and the external reverse proxy are deliberately outside Compose.

For the selected `burningspace-staging-01` host, intended host publications
are `BURNINGSPACE_SERVER_BIND_PORT=2567` and
`BURNINGSPACE_CLIENT_BIND_PORT=18080`. Client port `18080` is an
environment-specific override because a preserved stopped legacy container
reserves host port `8080`; the generic Compose default remains unchanged.

Production uses:

- `BURNINGSPACE_ALLOWED_ORIGINS` for the exact client-origin allowlist;
- `VITE_BURNINGSPACE_SERVER_URL` for the exact server origin embedded in the
  production client build;
- `BURNINGSPACE_RECONNECT_GRACE_SECONDS` for the existing bounded reconnect
  grace;
- `BURNINGSPACE_SHUTDOWN_TIMEOUT_SECONDS` for bounded drain; and
- the existing profile/input rate-limit environment variables.

`GET /health` is liveness. `GET /ready` becomes ready only after startup and
becomes unready before drain. The existing smoke script validates real
health/readiness, optional hostile-Origin denial, allowed join/profile, owned
authoritative ship replication, movement, and intentional cleanup.

The provider and environment class are selected by the merged
[Phase B environment decision](../ops/ops-002-phase-b-environment-decision.md).
No hostname, address, credential, firewall product, or TLS issuer is selected
by current repository authority. The selected edge implementation is a
host-managed Caddy systemd service; its repository contract is merged, but it
is not installed or configured on the host.

## Hard architectural invariants

1. Exactly one authoritative Node server process is used.
2. Exactly one static-client container is used.
3. World state remains in memory only; there is no persistence.
4. There are no accounts or authentication system.
5. Redis, databases, distributed room registries, multiple server replicas,
   and horizontal scaling remain forbidden.
6. Server restart may reset every active room and world state.
7. The client remains non-authoritative.
8. Gameplay, protocol, reconnect, rate-limit, Origin, and CORS semantics remain
   unchanged.
9. Node/Colyseus and static-client container ports are never directly public;
   host-side bindings remain explicit loopback bindings.
10. The external edge terminates TLS, preserves the browser's original
    `Origin`, and forwards `Upgrade` and `Connection` correctly.
11. The edge must never rewrite a hostile Origin into an allowed Origin.
12. Forwarded client IP is operations metadata only, never player identity or
    gameplay authority.
13. The public client build uses one exact canonical server origin.
14. The server allowlist contains only the exact intended staging client
    origin or explicitly approved origins; wildcard Origin is forbidden.
15. Missing or invalid production configuration fails closed.
16. Secrets, private keys, tokens, provider credentials, real environment
    contents, and SSH material never enter Git.
17. Health/readiness exposes no gameplay or secret state; readiness becomes
    false during drain and SIGTERM remains bounded.
18. Rollback does not assume persistence and may reset active rooms.
19. Staging is explicitly labelled alpha and non-persistent; no claim may
    imply account safety, persistence, scaling, or a production SLA.

## Delivery phases and authorization boundary

### Phase A — Repository and dry-run preparation

Phase A may make bounded, provider-neutral repository changes needed for real
external staging, including reverse-proxy examples or validated configuration,
deployment scripts, safe environment templates, external verification tools,
rollback procedures, evidence templates, operational documentation, and CI
validation for static configuration.

Phase A contains no secrets and performs no external deployment. Its
implementation PR is independently reviewed, Core-green, evidence-bound, and
human-merged before any external execution. A merged Phase A PR does not
authorize Phase B.

### Phase B — Controlled external staging execution

Phase B may begin only after:

- Phase A implementation is reviewed and merged;
- every mandatory repository, host, edge, DNS/TLS, rollback, and
  external-validation condition in the Phase B
  [environment decision](../ops/ops-002-phase-b-environment-decision.md) is
  complete and evidenced, including the operational isolation boundary
  required because the selected staging host is shared and not physically
  isolated;
- mandatory Core passes on the approved implementation/evidence head;
- mandatory Claude QA produces a usable blocker-free substantive result, or a
  policy-compliant Product Architect infrastructure disposition is recorded;
- Independent Operations/Security review approves;
- Independent Network/Runtime review approves;
- Product Architect approves the exact implementation and issues an explicit
  environment-specific deployment `GO`;
- the rollback path is ready; and
- credentials are available through secure external channels.

Phase B performs one controlled staging deployment and captures evidence. A
successful Phase A merge alone is not deployment authorization.

### Current edge-preparation authority

The authorized bounded repository task selected a host-managed Caddy systemd
service and defined versioned configuration, TLS ownership, HTTP-to-HTTPS
behavior, client routing, server/WebSocket routing, exact Origin preservation,
query-safe logging, bounded WebSocket timeout behavior, rollback configuration,
health checks, and deployment validation. It is `MERGED / COMPLETE` through PR
#69 at implementation head `864d1aacb2f902e43e0395b5058fe3e970a9dc11`,
evidence head `ee41232b4eff513ec3d3d04ee8a03845e719171d`, and merge
`4d691b056a8fa5cc558f52ae81da51d69aff2fc1`.

This does not authorize installing the edge on Contabo, binding public TCP
80/443, requesting certificates, changing DNS, creating BurningSpace
containers, publishing images, deploying the game, or publishing a
production/public service. External mutation remains closed until separate
Product Architect authorization.

Before deployment GO, complete the root-level effective firewall review,
restrict TCP 4000, restrict or verify effective TCP 9090 ingress, review and
restrict as required TeamSpeak administrative/query TCP 10011/10022/10080,
complete host maintenance before container creation, preserve the forum
standstill and prune prohibition, and finish the edge, DNS, TLS, immutable
release/rollback, and external-validation gates in the environment decision.

## Implementation scope boundary

Default repository scope for future OPS-002 implementation is limited to files
directly required for external staging under:

- `deploy/**`;
- `docs/ops/**`;
- `apps/server/scripts/**`;
- `apps/client/scripts/**`; and
- `.github/workflows/**`.

Changes to `apps/server/src/**`, `apps/client/src/**`, `packages/**`, wire
contracts, gameplay, reconnect semantics, Origin-policy implementation, or
rate-limit implementation require explicit Product Architect scope expansion.
Dependencies and lockfile changes require separate justification and approval.
Provider credentials and secrets are never authorized in Git.

## Environment and secret model

Phase A must define a value-free inventory covering:

- public client hostname;
- public server hostname;
- exact server Origin allowlist;
- client build-time server URL;
- SSH/deployment access;
- DNS-provider access;
- TLS/private-key material when not automatically managed; and
- optional reverse-proxy provider credentials.

Real `.env` files stay untracked. Secrets come from the deployment environment
or a secret manager. Logs, PR text, CI output, and evidence redact values.
Generated client assets must be inspected for unintended secret leakage; the
public server origin is expected in those assets and is not a secret. Private
management endpoints must not become public.

The Colyseus SDK may carry a reconnect bearer token in the WebSocket endpoint
query. External edge and access-log configuration must prevent that token from
being retained or exposed in logs and evidence.

## DNS, TLS, proxy, and exposure requirements

Evidence must show:

- DNS resolves to the intended external staging edge;
- certificates are valid for both client and server staging hostnames;
- HTTP redirects to HTTPS where appropriate;
- obsolete insecure TLS protocols are rejected where the chosen edge controls
  them;
- WebSocket upgrade works through the real edge;
- original `Origin` reaches the application unchanged;
- `Host` handling and proxy timeouts are coherent for long-lived WebSockets;
- direct host container ports and unintended admin/dashboard ports are
  externally unreachable;
- hostile and absent production Origins are rejected through the real edge;
  and
- allowed Origin can join and reconnect.

Provider-specific directives must not be prescribed before a provider and edge
are selected through an approved implementation plan.

## External staging smoke matrix

Phase B evidence must cover at minimum:

1. client HTTPS root is reachable;
2. static assets load;
3. server health is reachable through the intended operations route;
4. readiness is reachable and true;
5. allowed-Origin matchmaking succeeds;
6. hostile-Origin matchmaking is rejected;
7. hostile raw WebSocket upgrade is rejected;
8. allowed WebSocket gameplay connection succeeds;
9. authoritative participant and ship state replicate;
10. authoritative movement works;
11. unexpected disconnect becomes visible in UX;
12. reconnect begins;
13. reconnect succeeds within existing NET-001 behavior;
14. terminal reconnect failure remains truthful when continuity is lost;
15. reconnect creates no duplicate player/session;
16. graceful restart/drain makes readiness false;
17. restart is documented as room-resetting;
18. logs contain expected bounded lifecycle events;
19. client-facing responses contain no stack traces or secrets; and
20. rollback either restores the previous approved release or, for the first
    successful staging deployment only, restores the pre-BurningSpace state.

A failed smoke must never be reported as a successful deployment.

## Rollback and abort policy

A rollback plan is required before any external change. The first successful
external staging deployment uses exactly `bootstrap-no-previous-release` and
must structurally omit previous server/client images, previous approved commit,
and previous edge configuration. Its rollback restores
`PRE_BURNINGSPACE_DEPLOYMENT_STATE` by removing only the BurningSpace staging
Compose project and Caddy edge configuration, proving BurningSpace listeners
are gone, and preserving unrelated services and the stopped forum. Every later
deployment uses exactly `previous-approved-release` and retains the strict
immutable previous-image, previous-commit, previous-edge, ancestry, and
inequality requirements. Both modes record the target image/commit, external
configuration version, reproducible configuration or backup, rollback
procedure, post-rollback validation, expected room reset, and log/evidence
capture.

Abort conditions include invalid TLS; stripped or rewritten Origin; hostile
Origin acceptance; direct container-port exposure; secret leakage; readiness
remaining false after startup; broken WebSocket upgrade; duplicate reconnect
ownership/session; stale Core or reviewer evidence; unavailable rollback; or
discovery of an unexpected persistence requirement.

On abort, do not continue toward public launch. Execute the explicitly bound
rollback mode when safe, preserve evidence, and report the exact failure.

## Required implementation evidence

Durable evidence must bind:

- exact repository head and deployed image/build identifiers;
- a non-secret external environment identifier;
- DNS/TLS status and public client/server origins;
- loopback bindings and firewall exposure;
- proxy Origin preservation and WebSocket upgrade;
- allowed/hostile smoke results and authoritative gameplay behavior;
- UX reconnect behavior with duplicate-ownership protection;
- health/readiness, shutdown, and restart/reset behavior;
- log redaction and generated-asset inspection;
- rollback execution or bounded rollback rehearsal; and
- post-deployment clean repository state.

Screenshots may supplement but not replace machine-verifiable evidence. Never
store private keys, tokens, passwords, SSH configuration, or complete
sensitive environment dumps.

## Review routing and sequencing

Future implementation risk is `HIGH`.

For the bounded first-deployment rollback implementation, Security and QA are
required because executable deployment validation and release-readiness
invariants change. Architecture and Network are recommended for the rollback
boundary and edge/runtime interaction. Gameplay and Visual are not applicable:
no gameplay, protocol, UI, or asset behavior changes. Independent Claude review
follows the implementation diff as directed by the Product Architect.

Mandatory route:

1. Core CI/tests;
2. Independent Operations/Security review;
3. Independent Network/Runtime review;
4. mandatory Claude QA;
5. Product Architect approval;
6. one bounded evidence commit;
7. final-head Core;
8. explicit environment-specific Product Architect deployment `GO`;
9. controlled external staging execution;
10. post-deployment verification; and
11. human merge/closure according to the actual repository/execution sequence.

If repository changes are required, the implementation PR is reviewed and
human-merged before deployment, and execution uses an approved merged commit.
If execution creates repository evidence afterward, use one bounded
evidence/reconciliation PR rather than an infinite evidence chain.

Security review cannot be skipped. Visual/UX review is not required unless
player-facing presentation changes. Gameplay review is not required unless
gameplay semantics change. Architecture review is required only if the
single-process/no-persistence topology changes. QA is satisfied through Core,
mandatory Claude QA, and the specialist evidence route for this HIGH-risk
boundary.

The post-hardening host-reconciliation PR is separately classified `NORMAL
RISK` because it is documentation/authority only. Its declared reviewer set is
one required independent read-only Operations/Architecture reviewer, followed
by Product Architect approval and human merge. Network, Security, QA,
Gameplay, and Visual reviewers are skipped for that reconciliation because it
changes no executable behavior, external infrastructure, security control,
test acceptance, gameplay, or presentation. This bounded route does not apply
to the later edge implementation or Phase B execution.

Claude QA must provide a usable substantive implementation verdict. A wrapper
failure may be dispositioned only by an explicit policy-compliant Product
Architect infrastructure decision when usable substantive review evidence
exists. Future implementation merges remain human-only unless a later exact
Product Architect authorization says otherwise.

## Explicitly out of scope

- public marketing or unrestricted general traffic;
- public production launch or a production SLA;
- persistence, accounts, authentication, payments, or moderation;
- horizontal scaling, Redis, databases, multi-region, or autoscaling;
- campaign systems, economy/logistics, gameplay, protocol, or schema changes;
- reconnect semantic changes or a new security model;
- provider migration unrelated to staging;
- permanent production credentials in Git; and
- destructive infrastructure changes unrelated to this staging stack.

## Acceptance criteria

- [ ] One controlled external staging environment exists and is labelled
      alpha/non-persistent.
- [ ] HTTPS and WSS certificates are valid.
- [ ] The exact allowed Origin works; hostile and absent production Origins
      fail.
- [ ] Direct service ports are not public.
- [ ] The client points to the exact approved server origin.
- [ ] Server production configuration fails closed.
- [ ] Health and readiness work through the intended operations route.
- [ ] WebSocket works through the external edge with original Origin intact.
- [ ] Authoritative gameplay smoke passes.
- [ ] UX-001 connection/reconnect states remain truthful.
- [ ] Reconnect produces no duplicate session or player.
- [ ] Graceful shutdown works and readiness becomes false during drain.
- [ ] Restart/reset limitations are documented and observed.
- [ ] No secret appears in repository, logs, generated assets, or evidence.
- [ ] Rollback is proven.
- [ ] Core passes on the required heads.
- [ ] Independent Operations/Security review approves.
- [ ] Independent Network/Runtime review approves.
- [ ] Mandatory Claude QA is satisfied or explicitly dispositioned under the
      bounded infrastructure policy.
- [ ] Product Architect approves and issues an explicit deployment `GO`.
- [ ] No public-production claim is made.
- [ ] Post-deployment evidence is complete.

## Merge and deployment authority

The authority/bootstrap PR has one-time autonomous documentation merge
authorization from the Product Architect.

Every future OPS-002 implementation PR is `HUMAN MERGE ONLY` unless a later
exact Product Architect authorization states otherwise.

External staging deployment is `NOT AUTHORIZED` by the bootstrap merge alone.
Execution requires reviewed implementation, green required checks, approved
evidence, and an explicit environment-specific Product Architect deployment
`GO`.

Public production launch is `NOT AUTHORIZED` by OPS-002.
