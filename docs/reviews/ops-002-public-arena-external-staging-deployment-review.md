# OPS-002 — Public Arena External Staging Deployment and Validation Review

## Metadata

- Status: `PHASE A COMPLETE / PHASE B EDGE REPOSITORY PREPARATION REVIEW
  COMPLETE / HOST INSTALLATION AND EXTERNAL EXECUTION NOT AUTHORIZED`
- Task: `OPS-002 — Public Arena External Staging Deployment and Validation`

Do not place host credentials, private addresses, tokens, private keys, SSH
configuration, provider secrets, or complete environment dumps in this file.

Each reviewed commit recorded below is an implementation head. Neither is the
documentation evidence commit that records this review.

### Phase A reviewed binding

Historical Phase A metadata, bound to the Phase A implementation head and not
rebound to any later sub-stage:

- Branch: `ops/ops-002-phase-a-external-staging-preparation`
- Base: `45c7f2e12aaa45548829239eacfc18333d855ce5`
- Reviewed commit: `3522116d62d8fb93a4a4ca1756aec6818280f0bb`
- Pull request: `#63`
- Target environment: `NOT SELECTED — PHASE A REPOSITORY PREPARATION ONLY`
- Deployed commit/image: `NOT DEPLOYED`
- Deployment execution date: `NOT APPLICABLE — PHASE B NOT AUTHORIZED`

### Phase B edge repository-preparation binding

- Phase B edge repository-preparation branch:
  `ops/ops-002-caddy-edge-preparation`
- Phase B edge preparation base:
  `4533291d8b042858a0bcb143aadfec7061d44984`
- Reviewed edge implementation commit:
  `864d1aacb2f902e43e0395b5058fe3e970a9dc11`
- Pull request: `#69`
- Target environment: `burningspace-staging-01 — SELECTED / NOT DEPLOYED`
- Caddy installed version: `NOT INSTALLED / NOT VERIFIED`
- Deployed commit/image: `NOT DEPLOYED`
- Deployment execution date: `NOT APPLICABLE — HOST INSTALLATION AND EXTERNAL
  EXECUTION NOT AUTHORIZED`

### Checkbox convention

This artifact covers the complete OPS-002 task, including future Phase B
external execution. A checkbox is marked complete only when repository, CI,
and loopback-container evidence fully satisfies its claim. Any claim whose
verification requires a real external environment, a host-installed edge, a
hostname, a certificate, or a firewall remains unchecked and is recorded
explicitly as `NOT EXECUTED — PHASE B NOT AUTHORIZED` or
`NOT EXECUTED — HOST EDGE NOT INSTALLED`. Those explicit states are recorded
evidence, not unresolved fields.

## 1. Scope verification

- [x] Changed paths match the approved OPS-002 implementation/evidence scope.
- [x] No unapproved runtime, protocol, gameplay, persistence, identity,
      dependency, or topology change exists.
- [x] Phase A repository preparation and Phase B execution evidence remain
      distinguishable.

Evidence: The Phase A implementation diff from base
`45c7f2e12aaa45548829239eacfc18333d855ce5` to reviewed head
`3522116d62d8fb93a4a4ca1756aec6818280f0bb` changes exactly seven paths:
`.github/workflows/pr-checks.yml`,
`apps/server/scripts/external-staging-preflight.ts`,
`apps/server/scripts/external-staging-smoke.ts`,
`apps/server/scripts/tsconfig.external-staging.json`,
`deploy/external-staging-plan.example.json`,
`deploy/external-staging.env.example`, and
`docs/ops/public-arena-external-staging-runbook.md`. No runtime server or
client source changed. No protocol, schema, shared contract, gameplay,
persistence, or identity change exists. No dependency or lockfile change
exists. No real infrastructure was contacted and no deployment occurred.
Phase A repository preparation and Phase B external execution remain
separated by explicit Phase A, Phase B, and public-launch flags in the
tooling and by distinct sections in this artifact.

Evidence (edge repository preparation): The edge diff from base
`4533291d8b042858a0bcb143aadfec7061d44984` to reviewed head
`864d1aacb2f902e43e0395b5058fe3e970a9dc11` changes exactly twelve
implementation paths before this evidence commit:
`.github/workflows/pr-checks.yml`,
`apps/server/scripts/external-staging-edge-contract-check.ts`,
`apps/server/scripts/external-staging-edge-preflight.ts`,
`apps/server/scripts/tsconfig.external-staging.json`,
`deploy/edge/caddy/Caddyfile.template`,
`deploy/edge/caddy/caddy-validation-release.json`,
`deploy/edge/caddy/edge-plan.example.json`,
`deploy/edge/caddy/edge.env.example`,
`deploy/edge/caddy/systemd/caddy.service.d/10-burningspace-edge.conf`,
`docs/ops/ops-002-phase-b-go-packet.md`,
`docs/ops/public-arena-caddy-edge-runbook.md`, and
`docs/ops/public-arena-external-staging-runbook.md`. No application runtime,
protocol, gameplay, dependency, lockfile, or Compose service change exists. No
Contabo access and no host installation occurred. No DNS or TLS was configured
and no deployment occurred. PR #69 carried six implementation commits and
twelve changed paths before this evidence commit.

## 2. Environment binding

- [ ] The exact approved repository head and deployed image/build identifiers
      are recorded.
- [ ] The target is one controlled alpha/non-persistent staging environment.
- [ ] Environment identity is recorded without secret values.

Evidence: No target environment was selected. No provider, hostname, address,
or account was chosen or contacted. No deployed image exists. The Phase A
environment template `deploy/external-staging.env.example` and the
machine-readable plan template `deploy/external-staging-plan.example.json`
are provider-neutral and value-free. Actual environment binding is
`NOT EXECUTED — PHASE B NOT AUTHORIZED`.

Evidence (edge repository preparation): The environment is selected as
`burningspace-staging-01`, provider `Contabo`, environment class
`shared-existing-vps-with-isolated-compose-staging`. The repository edge
contract is selected as a host-managed Caddy systemd service with a pinned
`2.11.4` validation baseline. Host installation and real edge bindings remain
`NOT EXECUTED — HOST EDGE NOT INSTALLED`. No deployed image exists, so the
deployed-image checkboxes remain unchecked.

## 3. Secret handling

- [x] Real environment files and credentials remain outside Git.
- [x] CI, PR, operational logs, generated assets, and evidence contain no
      unintended secrets.
- [x] Public server origin is treated as public configuration, not a secret.
- [ ] Reconnect-token query material is redacted from edge/access logs.

Evidence (Phase A): The committed templates contain no credentials and no
real values. The preflight tooling rejects secret-like keys and values and
emits bounded, redacted JSON. Core secret scans passed, including the
high-signal scan of generated client assets. No real environment file exists
in the repository or working tree. The external smoke does not print the
reconnect token, and Core confirmed token output remains absent. The public
server origin is handled as public build configuration.

Evidence (edge repository preparation): The committed Caddy templates contain
no credential fields and use only `.example.invalid` hostname and
configuration-identifier fixtures. Linux Core verified reconnect-token query,
`Authorization`, `Proxy-Authorization`, and `Cookie` canaries clean, and
verified that the request URI is deleted from both access logs and the default
runtime/error log.

Phase B: Effective real edge and access-log behavior, including reconnect
token query-material redaction at a real proxy, is
`NOT EXECUTED — PHASE B NOT AUTHORIZED`. Real host effective log files are
`NOT EXECUTED — HOST EDGE NOT INSTALLED`. The runbook records the required
access-log query-token safety contract.

## 4. DNS

- [ ] Client and server names resolve to the intended staging edge.
- [ ] No unintended management hostname or address is exposed.

Evidence: `NOT EXECUTED — PHASE B NOT AUTHORIZED` /
`NOT EXECUTED — DNS NOT CONFIGURED`. No DNS name was selected, registered,
configured, or queried. No DNS provider was accessed.

Evidence (edge repository preparation): The edge contract requires distinct
exact client and server hostnames. Real hostname values are not yet selected
and the committed templates use `.example.invalid` fixtures only.

## 5. TLS

- [ ] Client HTTPS and server HTTPS/WSS certificates are valid for their names.
- [ ] HTTP redirects to HTTPS where appropriate.
- [ ] Insecure obsolete TLS protocols are rejected where controlled by the
      selected edge.

Evidence (Phase A): The Phase A tooling requires HTTPS and WSS for all
non-loopback targets and fails closed otherwise. TLS certificate validation
is enabled for external runs and is never disabled. Plain HTTP is permitted
only through an explicit dual-loopback override for local validation.

Evidence (edge repository preparation): The repository edge contract selects
Caddy automatic HTTPS for the future real public hostnames and restricts
public protocols to `h1` and `h2`, with HTTP/3 disabled and deferred. No
certificate was requested.

Phase B: Real certificate validity, redirect behavior, and obsolete-protocol
rejection are `NOT EXECUTED — PHASE B NOT AUTHORIZED` and
`NOT EXECUTED — TLS NOT CONFIGURED`. No certificate service was contacted.

## 6. Reverse proxy

- [ ] The external edge terminates TLS and routes to loopback services only.
- [ ] `Host`, timeout, and long-lived WebSocket handling are coherent.
- [ ] No hostile Origin rewriting or permissive recovery workaround exists.

Evidence (Phase A): The runbook documents a provider-neutral reverse-proxy
contract covering TLS termination, loopback-only upstreams, `Host` handling,
timeouts, and long-lived WebSocket behavior. The staging Compose topology
remains loopback-only, which Core validated machine-readably. No permissive
recovery workaround was introduced.

Evidence (edge repository preparation): The selected edge implementation is a
host-managed Caddy systemd service. The committed routing contract targets the
exact loopback upstreams `127.0.0.1:18080` for the client and
`127.0.0.1:2567` for the server, keeps `Host` and forwarded protocol coherent,
and forbids direct public exposure of the application containers. The
host-installation boundary remains provider-neutral. No permissive recovery
workaround exists.

Phase B: No real edge was configured and Caddy was not installed on any host.
Effective external proxy validation and real edge termination are
`NOT EXECUTED — PHASE B NOT AUTHORIZED` /
`NOT EXECUTED — HOST EDGE NOT INSTALLED`.

## 7. Origin preservation

- [ ] The browser's original allowed Origin reaches the server unchanged.
- [ ] Hostile and absent production Origins are not rewritten into an allowed
      value.

Evidence (Phase A): Exact Origin contracts are enforced by the Phase A
tooling, which parses Origins exactly and rejects wildcard and duplicate
entries. Local hostile and allowed Origin paths are Core-tested against real
loopback containers.

Evidence (edge repository preparation): The Linux Core runtime contract
verified that an exact Origin is preserved unchanged, that a hostile Origin is
passed through unchanged for SEC-007 to reject, and that an absent Origin
remains absent. No header mutation and no path or query rewrite exists.
Adapted-configuration inspection rejected all eight Origin-mutation negative
cases, including wildcard Origin deletion. No edge Origin allowlist exists;
application enforcement remains authoritative.

Phase B: Real external edge Origin preservation and rewriting behavior is
`NOT EXECUTED — PHASE B NOT AUTHORIZED` /
`NOT EXECUTED — HOST EDGE NOT INSTALLED`.

## 8. WebSocket upgrade

- [ ] `Upgrade` and `Connection` are forwarded correctly through the real edge.
- [ ] Allowed gameplay and reconnect WebSockets succeed.
- [ ] Hostile raw WebSocket upgrade is rejected.

Evidence (Phase A): The loopback Core raw hostile WebSocket probe required and
received an exact HTTP 403 rejection. The allowed gameplay and reconnect
socket path passed locally in Core against real containers.

Evidence (edge repository preparation): Against a locally pinned Caddy
`2.11.4`, the runtime contract verified WebSocket upgrade and bidirectional
traffic over an HTTP/1.1-compatible upstream transport, and verified that the
query reached the upstream unchanged. The contract sets a `24h` stream
timeout, a `5m` reload stream close delay, a `5s` dial timeout, and a `30s`
response-header timeout. No reconnect semantic change was introduced.

Phase B: Real HTTPS/WSS edge upgrade forwarding is
`NOT EXECUTED — PHASE B NOT AUTHORIZED` /
`NOT EXECUTED — HOST EDGE NOT INSTALLED`.

## 9. Loopback and firewall exposure

- [x] Server and client container host ports remain explicitly loopback-bound.
- [ ] Direct Node, static-client, admin, and dashboard ports are externally
      unreachable.
- [ ] Firewall exposure matches the approved edge-only topology.

Evidence (Phase A): Machine-readable Compose validation in Core proved exact
`127.0.0.1` host binds for both services. Core also confirmed no privileged
mode, no host networking, no Docker socket mount, and no named persistent
volume.

Evidence (edge repository preparation): The edge routes only to the client
upstream `127.0.0.1:18080` and the server upstream `127.0.0.1:2567`. The Caddy
admin control plane uses the Unix-domain socket
`unix//run/caddy/burningspace-admin.sock`, and Linux Core verified that no TCP
admin listener is present, including the Caddy default TCP `2019`.

Phase B: Real external firewall configuration, root-level effective firewall
review, and external port reachability testing are
`NOT EXECUTED — PHASE B NOT AUTHORIZED` /
`NOT EXECUTED — HOST EDGE NOT INSTALLED`. No firewall was inspected or
mutated.

## 10. Client build endpoint

- [ ] `VITE_BURNINGSPACE_SERVER_URL` is the exact approved public server
      staging origin.
- [x] Generated client assets contain no secret material.
- [x] Missing or malformed production client configuration fails closed.

Evidence (Phase A): The example public server origin is embedded as expected
during the Core client build. The high-signal generated-asset scan passed.
Production client configuration remains fail-closed when the server origin is
missing or malformed.

Evidence (edge repository preparation): The Caddy client route points to the
selected-host loopback client upstream `127.0.0.1:18080`.

Phase B: The real staging origin is `NOT SELECTED / NOT DEPLOYED`. No real
public client origin exists and none is claimed.

## 11. Health/readiness

- [ ] `/health` and `/ready` are reachable through the intended operations
      route without exposing gameplay or secret state.
- [x] Readiness is true only after successful startup and false during drain.

Evidence (Phase A): Local real-container `/health` and `/ready` checks passed
in Core, exposing no gameplay or secret state. Readiness became true only
after successful startup and false during bounded drain.

Evidence (edge repository preparation): The routing contract preserves the
server route to `127.0.0.1:2567`, through which `/health` and `/ready` remain
reachable.

Phase B: The external operations route and real host health/readiness through
public TLS are `NOT EXECUTED — PHASE B NOT AUTHORIZED` /
`NOT EXECUTED — HOST EDGE NOT INSTALLED`.

## 12. Allowed-Origin smoke

- [ ] Allowed-Origin matchmaking, profile setup, and gameplay connection
      succeed through the real edge.
- [ ] The exact configured allowlist is recorded without unrelated origins.

Evidence (Phase A): Allowed-Origin matchmaking, profile setup, and gameplay
connection passed against real local containers in Core, including the client
root, index, and static entry, plus health and readiness.

Evidence (edge repository preparation): The selected edge contract rewrites
no path, query, or Origin, so allowed-Origin behavior reaches the application
unchanged.

Phase B: Real edge validation and the real configured allowlist are
`NOT EXECUTED — PHASE B NOT AUTHORIZED` /
`NOT EXECUTED — HOST EDGE NOT INSTALLED`. No real allowlist exists because no
environment binding or host edge exists.

## 13. Hostile-Origin smoke

- [ ] Hostile matchmaking is rejected.
- [ ] Hostile raw WebSocket upgrade is rejected.
- [ ] Absent Origin is rejected in production.

Evidence (Phase A): Hostile-Origin matchmaking was bounded and rejected
locally in Core. An independent raw hostile WebSocket probe returned the
expected exact HTTP 403.

Evidence (edge repository preparation): The selected edge contract passes
hostile and absent Origins through unchanged rather than rewriting them, so
SEC-007 rejection remains authoritative.

Phase B: Real edge hostile-Origin validation and absent-Origin external
validation are `NOT EXECUTED — PHASE B NOT AUTHORIZED` /
`NOT EXECUTED — HOST EDGE NOT INSTALLED`. No absent-Origin external smoke was
run and none is claimed.

## 14. Authoritative gameplay smoke

- [ ] Participant and owned ship state replicate from the authoritative server.
- [ ] Authoritative movement succeeds.
- [ ] The client does not decide canonical gameplay outcomes.

Evidence (Phase A): Core proved authoritative participant replication, owned
ship replication, and authoritative movement against real local containers.
Server authority was preserved and no client-side authority was introduced.

Evidence (edge repository preparation): The selected edge contract rewrites
no path or query and changes no gameplay or authority boundary.

Phase B: Real external edge gameplay validation is
`NOT EXECUTED — PHASE B NOT AUTHORIZED` /
`NOT EXECUTED — HOST EDGE NOT INSTALLED`.

## 15. UX-001 connection/reconnect smoke

- [ ] Unexpected loss, reconnecting, success, and terminal failure remain
      truthful through the external edge.
- [ ] Reconnect within NET-001 behavior succeeds without duplicate player,
      session, or ship ownership.

Evidence (Phase A machine evidence): The external smoke performs a real
Colyseus `Client.reconnect(token)` call and Core confirmed the same session
and the same room after reconnect, coherent ship continuity, and no duplicate
participant or ship ownership. Intentional leave and cleanup passed. No
reconnect token was printed.

Evidence (edge repository preparation): The selected edge contract does not
rewrite paths, queries, Origin, or reconnect semantics, and the runtime
contract confirmed query pass-through unchanged.

Limitation: Machine smoke does not prove Phaser visual presentation. Browser
visual evidence through an external edge is
`NOT EXECUTED — PHASE B NOT AUTHORIZED` /
`NOT EXECUTED — HOST EDGE NOT INSTALLED`.

## 16. Shutdown/drain

- [ ] SIGTERM makes readiness false before bounded drain.
- [x] Expected lifecycle logs are present and normal shutdown exits cleanly.

Evidence (Phase A): Local container graceful shutdown passed in Core with the
expected lifecycle events and a zero exit code. Container cleanup passed.

Evidence (edge repository preparation): Caddy process cleanup is bounded in
CI, and the runtime contract verified bounded cleanup and admin socket
cleanup. A Unix-socket reload preserves both routes, confirmed by post-reload
client and server routing.

Phase B: External edge drain validation and real host service drain are
`NOT EXECUTED — PHASE B NOT AUTHORIZED` /
`NOT EXECUTED — HOST EDGE NOT INSTALLED`.

## 17. Restart/reset behavior

- [ ] Restart behavior is observed and documented as room/world resetting.
- [x] No persistence, account safety, or continuity guarantee is claimed.

Evidence (Phase A): The alpha, non-persistent reset limitation is documented
in the runbook. No persistence, account safety, or continuity guarantee is
claimed anywhere in Phase A.

Evidence (edge repository preparation): No change. The edge introduces no
persistence, account safety, or continuity guarantee, and none is claimed.

Phase B: Real external restart and reset observation is
`NOT EXECUTED — PHASE B NOT AUTHORIZED`.

## 18. Logs and redaction

- [x] Expected bounded lifecycle events are present.
- [ ] Logs omit credentials, Origin allowlists, reconnect tokens, query bearer
      material, private management data, and gameplay state.
- [x] Client-facing failures contain no stack trace or secret detail.

Evidence (Phase A): Phase A tooling output is bounded and redacted. The
reconnect token was not printed by the smoke and Core confirmed token output
remains absent. Expected bounded lifecycle events were present in the local
container run. Access-log query-token safety is required by the runbook.

Evidence (edge repository preparation): Both access loggers and the default
runtime/error logger apply filter encoders that delete `request>uri` and the
`Authorization`, `Proxy-Authorization`, and `Cookie` request headers. Access
logs are bounded by a `10MiB` maximum file size, `3` retained files, and a
`72h` retention. Linux Core verified reconnect-token, query, `Authorization`,
`Cookie`, and runtime-error canaries clean.

Phase B: Effective real edge log format, real operational log redaction, and
real host effective log files are `NOT EXECUTED — PHASE B NOT AUTHORIZED` /
`NOT EXECUTED — HOST EDGE NOT INSTALLED`.

## 19. Rollback

- [ ] Previous and target approved commits/images are bound.
- [ ] Configuration is backed up or reproducible without storing secrets here.
- [ ] Rollback is executed or rehearsed within the approved bound.
- [ ] Post-rollback validation passes and expected room reset is recorded.

Evidence (Phase A): The rollback contract is documented, including previous
and target commit bindings, abort rules, and the non-secret deployment `GO`
packet requirements. The preflight tooling enforces rollback binding and an
explicit `GO` requirement for Phase B.

Evidence (edge repository preparation): The current and previous edge
configuration identifiers are part of the committed repository contract, and
systemd reload plus offline configuration validation are defined. No real edge
configuration identifier exists.

Phase B: External rollback execution and rollback rehearsal are
`NOT EXECUTED — PHASE B NOT AUTHORIZED` /
`NOT EXECUTED — HOST EDGE NOT INSTALLED`.

## 20. Repository and image binding

- [ ] Deployed images derive from the exact approved merged repository commit.
- [ ] Image digests/build identifiers and the post-deployment clean repository
      state are recorded.

Evidence (Phase A): The reviewed repository head is
`3522116d62d8fb93a4a4ca1756aec6818280f0bb`. Core built local CI images from
that exact head and started real containers from them. No deployed external
image exists.

Evidence (edge repository preparation): The Caddy validation artifact is
immutable and checksum-bound to the official
`caddy_2.11.4_linux_amd64.tar.gz` release archive with recorded SHA-256 and
SHA-512 values and a bound checksum manifest, all verified in Linux Core. The
reviewed repository edge head is
`864d1aacb2f902e43e0395b5058fe3e970a9dc11`. Caddy was not installed on any
host, and no game image was published or deployed.

Phase B: Deployed image digests and post-deployment repository state are
`NOT EXECUTED — PHASE B NOT AUTHORIZED`.

## 21. Core evidence

### Phase A Core evidence

- Implementation-head Core run: `32615914407`
- Evidence/final-head Core run: Required after this evidence commit; exact run
  will be reported in the implementation PR handoff and `CURRENT`.
- Result and exact reviewed head: `SUCCESS` on
  `3522116d62d8fb93a4a4ca1756aec6818280f0bb`.

Accepted implementation-head Core evidence: 13 test files and 163 tests;
workspace build and typecheck; protocol compatibility; existing callback,
movement, and combat diagnostics; external script TypeScript check; 24
preflight self-tests; smoke self-tests; template validation; high-signal
secret scan; machine-readable Compose exposure validation proving both
services loopback-bound with no privileged mode, no host networking, no
Docker socket, and no named persistent volume; both images built; real
containers started; existing Public Arena smoke passed; external loopback
smoke passed; hostile raw WebSocket rejected; authoritative movement passed;
reconnect continuity passed; no duplicate ownership; token output absent;
graceful shutdown passed; cleanup passed.

Local validation: required non-container validation passed; preflight passed
24/24 three consecutive times; local Docker was unavailable and no container
result was falsely claimed; Linux Core supplied the container evidence; no
real external infrastructure was contacted.

### Caddy edge repository-preparation Core evidence

- Corrected implementation-head Core run: `32740776653`
- Result and exact reviewed head: `SUCCESS` on
  `864d1aacb2f902e43e0395b5058fe3e970a9dc11`.
- Evidence/final-head Core run: Required after this evidence commit. Its exact
  run identifier is reported in the implementation PR handoff and `CURRENT`
  and is not invented here.

Accepted corrected implementation-head Core evidence: 13 test files and
163/163 repository tests; workspace build; workspace typecheck; protocol
compatibility; existing callback, movement, and combat diagnostics; external
staging verification-script TypeScript check; 47 existing external-staging
preflight self-tests; 58 corrected edge preflight self-tests; immutable Caddy
`2.11.4` release-artifact download verified against the recorded SHA-256,
SHA-512, and checksum-manifest bindings; `caddy fmt`, `caddy adapt`, and
`caddy validate` of the rendered configuration; adapted-configuration
inspection plus eight Origin-mutation negative cases, all rejected; systemd
drop-in validation through `systemd-analyze verify` against a safe temporary
unit tree; and the Unix admin runtime contract reporting 28 tests with all 26
required assertions true.

The 26 verified runtime assertions cover: admin socket created; admin socket
directory private; admin socket reachable by the service only; no TCP admin
listener present; unrelated local user denied; Unix-socket reload succeeded;
post-reload client routing; post-reload server routing; client routing; server
routing; client and server route separation; exact Origin preserved; hostile
Origin passed unchanged; absent Origin still absent; coherent `Host`; coherent
forwarded protocol; WebSocket upgrade; bidirectional WebSocket traffic; query
pass-through unchanged; reconnect-token log safety; `Authorization` log
safety; `Cookie` log safety; runtime error-log safety; offline reload
validation; socket cleanup; and bounded cleanup.

Local validation: no host Caddy installation, no Contabo access, no DNS or TLS
configuration, and no deployment occurred. Linux Core supplied all Caddy
runtime evidence.

## 22. Findings

Blocking findings: None.

Non-blocking findings:

- Earlier implementation-review MEDIUM findings are `CLOSED` before the final
  reviewed head through hardening commit
  `3522116d62d8fb93a4a4ca1756aec6818280f0bb`, which added bounded matchmaking
  and reconnect operations, `AbortController`-backed cancellation, cleanup of
  late-resolving rooms, exact Phase B checked-out target validation, trusted
  `origin/main` ancestry validation, bounded chunked HTTP responses, and smoke
  self-tests in Core. No HIGH or MEDIUM finding remains open.
- Operations/Security LOW: the generated-client secret scan currently inspects
  generated `index-*.js` entries rather than every possible emitted chunk.
  Disposition: `DEFERRED / NON-BLOCKING`.
- Operations/Security LOW: optional broader loopback-alias recognition may be
  considered later. Disposition: `DEFERRED / NON-BLOCKING`.
- Network/Runtime NOTE: bounded matching and reconnect plus late-resolution
  cleanup are now present, and no fresh-join fallback was introduced.
- Claude QA suggestions: full-history checkout remains required for ancestry
  validation; an explanatory maintenance comment may be added later; the
  high-signal secret heuristics may be broadened later. Disposition:
  `DEFERRED / NON-BLOCKING`. These suggestions were not implemented in this
  evidence commit.

Abort events and disposition: None during Phase A. No external execution
occurred, so no external abort condition could arise.

### Caddy edge repository-preparation findings

`OPS-002-EDGE-PA-F1` — severity `MEDIUM` — disposition `CLOSED`.

- Original defect: the Caddy admin API used an unauthenticated loopback TCP
  listener on `127.0.0.1:2019` on a shared host.
- Repair: `f09ef8b0efcf59850d7fa3e62e0eb0aabfe64395`.
- Follow-up Core stabilization: `864d1aacb2f902e43e0395b5058fe3e970a9dc11`.
- Closure evidence: a permission-restricted Unix-domain admin socket; a
  private systemd runtime directory `/run/caddy` at mode `0700`; a restrictive
  service `UMask=0077`; no TCP admin listener; a successful reload through the
  exact Unix socket; an unrelated local user denied; and unchanged routing,
  Origin, WebSocket, and logging behavior.

Remaining blocking findings: None. No HIGH finding remains open. No MEDIUM
finding remains open.

Accepted non-blocking edge findings:

- Actual host `caddy:caddy` ownership and effective socket modes remain
  installation evidence, not repository evidence. This stays a future
  host-installation verification gate.
- Checksum constants and the committed release JSON contain some deliberate
  defense-in-depth duplication.
- CI assumes a standard Linux runner with an available unrelated test user
  such as `nobody`.
- Origin-negative checks are intentionally duplicated across the semantic and
  workflow layers.
- Documentation and maintainability suggestions remain
  `DEFERRED / NON-BLOCKING`.

None of these suggestions was implemented in this evidence commit.

Abort events and disposition (edge repository preparation): None. No host
installation or external execution occurred, so no external abort condition
could arise.

## 23. Operations/Security Reviewer

- Verdict: `APPROVE PHASE A`
- Reviewed commit/environment: `3522116d62d8fb93a4a4ca1756aec6818280f0bb` /
  `NO EXTERNAL ENVIRONMENT`
- Evidence source: Independent Operations/Security review of the final Phase A
  head.
- Required changes: None.
- Date: 2026-08-23

### Caddy edge repository preparation

- Verdict: `APPROVE EDGE REPOSITORY PREPARATION`
- Reviewed commit/environment: `864d1aacb2f902e43e0395b5058fe3e970a9dc11` /
  `REPOSITORY AND LINUX CORE ONLY; NO CONTABO INSTALLATION`
- Reviewer: Hegel
- Evidence source: Independent Operations/Security review of the corrected
  edge implementation head.
- Required changes: None. No BLOCKER, HIGH, or MEDIUM finding remains.
- Date: 2026-08-24

## 24. Network/Runtime Reviewer

- Verdict: `APPROVE PHASE A`
- Reviewed commit/environment: `3522116d62d8fb93a4a4ca1756aec6818280f0bb` /
  `LOOPBACK CORE ENVIRONMENT ONLY`
- Evidence source: Independent Network/Runtime review of the final Phase A
  head.
- Required changes: None.
- Date: 2026-08-23

### Caddy edge repository preparation

- Verdict: `APPROVE EDGE REPOSITORY PREPARATION`
- Reviewed commit/environment: `864d1aacb2f902e43e0395b5058fe3e970a9dc11` /
  `REPOSITORY AND LINUX CORE RUNTIME ONLY`
- Reviewer: Noether
- Evidence source: Independent Network/Runtime review of the corrected edge
  implementation head.
- Required changes: None. No BLOCKER, HIGH, or MEDIUM finding remains.
- Date: 2026-08-24

## 25. Claude QA

- Substantive verdict: `Approved with suggestions`
- Reviewed commit: `3522116d62d8fb93a4a4ca1756aec6818280f0bb`
- Workflow run: `32615914388`
- Wrapper conclusion: `FAILURE — summary exceeds max length 2000`
- Blockers: `0`
- Product Architect infrastructure disposition, if applicable: Category-C
  infrastructure and output-packaging failure following a usable exact-head
  substantive review. The mandatory Claude QA gate is satisfied. A manual
  rerun is not required. The wrapper failure is recorded as a failure and is
  not rewritten as success, and the public automation-failure comment is not a
  substantive rejection.

### Caddy edge repository preparation

- Substantive verdict: `Approved with suggestions`
- Reviewed commit: `864d1aacb2f902e43e0395b5058fe3e970a9dc11`
- Workflow run: `32740776780`
- Wrapper conclusion: `SUCCESS`
- Blockers: `0`
- Disposition: The mandatory HIGH-risk repository-preparation Claude QA gate
  is satisfied on the corrected implementation head. The recorded suggestions
  are non-blocking and were not implemented in this evidence commit. Earlier
  wrapper output-validation failures on the superseded heads
  `4680ede58bfe9d878c6ec48cff577d492a0f6954` and
  `f09ef8b0efcf59850d7fa3e62e0eb0aabfe64395` are recorded as wrapper
  automation failures, not substantive rejections.

## 26. Product Architect

- Verdict: `APPROVE PHASE A IMPLEMENTATION`
- Reviewed commit/evidence: `3522116d62d8fb93a4a4ca1756aec6818280f0bb`
- Findings disposition: No BLOCKER, HIGH, or MEDIUM finding remains. The
  evidence commit and the guarded autonomous Phase A merge are authorized.
  Phase B and any deployment `GO` are not authorized.
- Date: 2026-08-23

### Caddy edge repository preparation

- Verdict: `APPROVE CADDY EDGE REPOSITORY PREPARATION`
- Reviewed commit/evidence: `864d1aacb2f902e43e0395b5058fe3e970a9dc11`
- Findings disposition: `OPS-002-EDGE-PA-F1` is `CLOSED`. No BLOCKER, HIGH, or
  MEDIUM finding remains. The evidence commit is `AUTHORIZED`. Merge is
  `NOT AUTHORIZED` until final-head Core succeeds and the Product Architect
  issues the final merge disposition. Host Caddy installation, Contabo
  mutation, DNS, TLS, image publication, and external execution are
  `NOT AUTHORIZED`. A deployment `GO` is `NOT ISSUED`.
- Date: 2026-08-24

## 27. Deployment GO

- Environment-specific GO: `NOT ISSUED`
- Authorized target and commit/image: `NONE`
- Authorization source/date: `PHASE B NOT AUTHORIZED`
- Rollback readiness confirmed: `CONTRACT PREPARED; REAL ENVIRONMENT ROLLBACK
  NOT YET VERIFIED`

No repository merge or Phase A completion is itself a deployment GO.

Edge repository preparation: Approval of the Caddy edge repository
preparation is not a host installation authorization and not a deployment
`GO`. Caddy was not installed, no `GO` was issued, and no external execution
was authorized.

## 28. Post-deployment verification

- [ ] The complete external smoke matrix passed.
      `NOT EXECUTED — PHASE B NOT AUTHORIZED`
- [ ] No abort condition remains unresolved.
      `NOT EXECUTED — PHASE B NOT AUTHORIZED`
- [ ] Rollback evidence and limitations are recorded.
      `NOT EXECUTED — PHASE B NOT AUTHORIZED`
- [ ] Staging remains explicitly alpha/non-persistent.
      `NOT EXECUTED — PHASE B NOT AUTHORIZED`
- [ ] No public-production claim or unrestricted launch occurred.
      `NOT EXECUTED — PHASE B NOT AUTHORIZED`

Evidence: `NOT EXECUTED — PHASE B NOT AUTHORIZED` /
`NOT EXECUTED — NO DEPLOYMENT`. No external staging deployment exists and no
host edge was installed, so no post-deployment verification could be
performed.

## 29. Closure / human gate

Phase A merge gate:

- [x] Required specialist reviews approve.
- [x] Mandatory Claude QA is satisfied or has an explicit policy-compliant
      Product Architect infrastructure disposition.
- [ ] Product Architect approval and environment-specific deployment GO exist.
- [ ] Final-head Core and post-deployment evidence are bound.
- [x] Any implementation/evidence PR follows human-only merge authority unless
      a later exact Product Architect authorization says otherwise.

Phase A merge-gate detail: Operations/Security and Network/Runtime approve the
final Phase A head. The mandatory Claude QA gate is satisfied through the
usable exact-head substantive review and the explicit Product Architect
infrastructure disposition in section 25. Product Architect approval of the
Phase A implementation is complete. This is the one authorized Phase A
evidence commit. Final-head Core on the evidence head is required before
merge. An exact one-time Product Architect autonomous merge authorization
applies to PR #63 and supersedes human-merge-only authority for that pull
request alone. Product Architect approval exists for Phase A, but no
environment-specific deployment `GO` exists, so that combined item remains
unchecked. Post-deployment evidence cannot be bound because Phase B has not
run.

### Caddy edge repository-preparation merge gate

- [x] Edge implementation review is complete on
      `864d1aacb2f902e43e0395b5058fe3e970a9dc11`.
- [x] Independent Operations/Security approval is complete.
- [x] Independent Network/Runtime approval is complete.
- [x] Mandatory Claude QA is complete with wrapper `SUCCESS` and `0` blockers.
- [x] Product Architect approval of the edge repository preparation is
      complete.
- [x] `OPS-002-EDGE-PA-F1` is `CLOSED`.
- [x] This is the one authorized edge evidence commit.
- [ ] Final-head Core on the evidence head is bound. Required after this
      evidence commit.
- [x] PR #69 follows human-only merge authority. No autonomous merge
      authorization exists for it.

Edge repository-preparation merge-gate detail: Host installation, DNS, TLS,
image publication, and deployment remain unauthorized. Approval of the edge
repository preparation authorizes this one documentation-only evidence commit
and, after a successful final-head Core run and the Product Architect's final
merge disposition, a human-only merge of PR #69. It authorizes nothing else.

Phase B closure: `NOT STARTED / NOT AUTHORIZED`. No deployment `GO` exists and
no external evidence exists. Edge repository preparation is a repository-only
sub-stage and does not start Phase B external execution.

Closure status: `PHASE A COMPLETE / PHASE B EDGE REPOSITORY PREPARATION REVIEW
COMPLETE / HOST INSTALLATION AND EXTERNAL EXECUTION NOT AUTHORIZED`. Phase B
is not closed and OPS-002 overall is not closed.
