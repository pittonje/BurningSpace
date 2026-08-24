# BurningSpace Current Handoff

Last updated: 2026-08-24
Updated by: Claude — OPS-002 Caddy edge review evidence

## Repository state

- PR #56 / NET-001 is human-merged at baseline
  `87ea2a5abe77c3548cded6347d0650c31e8bd72c`.
- The Wave 1 authority/security foundation required for Public Arena Alpha is
  complete at this baseline.
- The Public Arena Alpha launch track is active.
- SEC-007: `COMPLETE`.
- NET-001: `COMPLETE`.
- OPS-001: `MERGED / CLOSED` through PR #57 and normal merge commit
  `dd558a7648dca8c8a735f285257f4a317ce9a846`.
- OPS-001 implementation head:
  `ab74ea9fde13061ba68667e28c4f78b271b45bd8`.
- OPS-001 evidence head:
  `2f1ca4e389031a1bc23d9c6b68aaaa31f3add4af`.
- Final OPS-001 evidence-head Core run `31515348143` completed with `SUCCESS`.
- Final OPS-001 evidence-head Claude QA run `31515348155` completed with
  `SUCCESS`; its substantive verdict was `Approved with suggestions`, with no
  blockers.
- OPS-001-F1 is CLOSED. Generated fingerprinted `index-*.js` and
  `index-*.css` are immutable and long-lived; stable-name assets require
  revalidation; `index.html` is not long-lived; missing assets remain uncached
  404 responses.
- UX-001: `MERGED / CLOSED` through PR #60 and normal merge commit
  `c365b0b81cdda80e5f8aa5e499dee0baa26bf207`.
- OPS-002 — Public Arena External Staging Deployment and Validation is the
  active bounded milestone. Its authority bootstrap is merged on `main`
  through PR #62.
- OPS-002 Phase A: `MERGED / COMPLETE` through PR #63 and normal merge commit
  `33bff5009926bb5247acad5ebcf85ba8b7f626ce`.
- OPS-002 shared-host repository hardening: `MERGED / COMPLETE` through PR #67
  and normal merge commit `21a4ce2fe796f655d20911d8a52a60c69eec432d`.
- OPS-002 host-gate discovery: `COMPLETE`. Host remediation remains required
  before deployment GO. External deployment remains `NOT AUTHORIZED`,
  deployment GO is `NOT ISSUED`, and Phase B live execution is `NOT STARTED`.
- OPS-002 Caddy edge repository preparation: `CADDY EDGE REPOSITORY
  PREPARATION IMPLEMENTATION COMPLETE / REVIEW APPROVED / AWAITING
  EVIDENCE-HEAD CORE AND HUMAN MERGE` on open PR #69. Host installation, DNS,
  TLS, image publication, and deployment remain unauthorized.
- The accepted decision count remains 35: 18 `BS-MECH`, 5 `GAME-001`,
  7 `BS-ARCH`, 4 `BS-PROC`, and 1 `CI`.
- Campaign systems remain deferred and the canonical campaign roadmap is
  unchanged.
- DOCARCH-004: `PAUSED`.
- PR #51 remains a historical draft; PR #52 remains closed.

## UX-001 completion

- Status: `MERGED / CLOSED`.
- Pull request: #60, merged into `main` on 2026-08-23.
- Reviewed implementation head:
  `96b6c27b36159a019629ecbaa37ddcc9ab35a10f`.
- Evidence head:
  `74053b29c3049dc4875854cc59831271dbdee4e4`.
- Merge commit:
  `c365b0b81cdda80e5f8aa5e499dee0baa26bf207`.
- PR #60 entered `main` through a normal merge commit. The merge used an
  explicit one-time Product Architect autonomous merge authorization applying
  only to PR #60; no administrative fallback was required.
- Final-head Core run `32612275194`: `SUCCESS`, 13 test files and 163/163
  tests, including all 11 UX lifecycle tests and the client test TypeScript
  configuration in mandatory workspace typecheck.
- Independent Network/Runtime review: `APPROVE`.
- Independent Visual/UX review: `APPROVE`.
- Product Architect: `APPROVE`.
- `UX-001-PA-F1`: `CLOSED`.
- Blocking findings: none. No HIGH or MEDIUM finding remains open.
- Accessibility live-region semantics: `LOW / DEFERRED`.
- Review artifact:
  `docs/reviews/ux-001-public-arena-connection-error-reconnect-ux-review.md`.

## UX-001 Claude QA advisory

- Run: `32612275281`.
- Reviewed head: `74053b29c3049dc4875854cc59831271dbdee4e4`.
- Wrapper: `FAILURE — output validation / summary-length failure`.
- Usable substantive blocker: None.
- Disposition: `ADVISORY / NON-BLOCKING`.
- No valid substantive Claude approval is claimed.

## Authorization and boundaries

- OPS-001 completed the deployment/readiness foundation for one in-memory
  server container and one static-client container, loopback-only staging
  Compose, explicit production client origin, health/readiness, structured
  lifecycle logs, bounded graceful shutdown, real arena smoke coverage, Core
  container validation, and an operations runbook.
- The arena remains one in-memory server process with no persistence or
  accounts; it is server-authoritative and unsuitable for horizontal scaling.
  Restart resets active rooms and world state.
- TLS and the public reverse proxy remain outside the application containers.
- External launch remains a separate operation requiring explicit
  authorization.
- UX-001 preserves NET-001 reconnect semantics, SEC-007 boundaries, server
  authority, and the protocol. It introduced no server, protocol, schema,
  shared-contract, dependency, lockfile, gameplay, campaign, account,
  persistence, accepted-decision, or deployment change.
- UX-001 introduced no accepted game-design decision. The accepted decision
  count remains 35, the campaign roadmap remains unchanged, and DOCARCH-004
  remains paused.
- External Public Arena deployment was not performed. No public hostname, TLS
  edge, production proxy, production credential, or external infrastructure
  was configured. Neither UX-001 completion nor OPS-002 Phase A merge launches
  Public Arena externally.

## OPS-002 authority

- Task: `OPS-002 — Public Arena External Staging Deployment and Validation`.
- Durable state of the authority bootstrap: `AUTHORITY DEFINED`, merged on
  `main` through PR #62.
- Implementation risk: `HIGH`.
- Task authority:
  `docs/tasks/ops-002-public-arena-external-staging-deployment.md`.
- Integrated review artifact:
  `docs/reviews/ops-002-public-arena-external-staging-deployment-review.md`.
- OPS-002 separates Phase A repository/dry-run preparation from Phase B
  controlled external staging execution.
- External execution requires reviewed and merged Phase A implementation,
  green required checks, approved Operations/Security and Network/Runtime
  evidence, mandatory Claude QA or a policy-compliant Product Architect
  infrastructure disposition, and an explicit environment-specific Product
  Architect deployment `GO`.
- External Public Arena deployment remains `NOT PERFORMED`. No staging service
  is online or claimed. The provider and environment class are now recorded as
  an authority decision; no hostname, public address, credential, SSH
  material, or secret environment value is recorded.
- No other runtime task is active.

## OPS-002 Phase A completion

- Status: `MERGED / COMPLETE`.
- Pull request: #63 — `OPS-002 Phase A — External Staging Preparation`,
  `MERGED` into `main` on 2026-08-23.
- Branch: `ops/ops-002-phase-a-external-staging-preparation`.
- Base: `45c7f2e12aaa45548829239eacfc18333d855ce5`.
- Implementation head:
  `3522116d62d8fb93a4a4ca1756aec6818280f0bb`.
- Evidence head:
  `d2322e24ac2ff0525d5b6332143098bb048d6262`.
- Phase A merge commit:
  `33bff5009926bb5247acad5ebcf85ba8b7f626ce`.
- PR #63 entered `main` through a normal two-parent merge commit preserving
  all four pull-request commits. The merge used an exact one-time Product
  Architect autonomous merge authorization applying only to PR #63 at evidence
  head `d2322e24ac2ff0525d5b6332143098bb048d6262`; no administrative fallback
  was required.
- Phase A delivered exactly seven implementation paths plus two documentation
  evidence paths: the PR-checks workflow, the external staging preflight and
  smoke scripts and their TypeScript configuration, the provider-neutral
  environment and plan templates, the external staging runbook, this handoff,
  and the OPS-002 review artifact. No runtime server or client source,
  protocol, schema, gameplay, persistence, identity, dependency, or lockfile
  change was made.
- Implementation-head Core run `32615914407`: `SUCCESS` on
  `3522116d62d8fb93a4a4ca1756aec6818280f0bb`.
- Final evidence-head Core run `32616866513`: `SUCCESS` on
  `d2322e24ac2ff0525d5b6332143098bb048d6262`, with 13 test files and 163/163
  tests, workspace build and typecheck, protocol compatibility, existing
  callback/movement/combat diagnostics, external script typecheck, 24
  preflight self-tests, 3 smoke self-tests, template validation, high-signal
  secret scans, machine-readable Compose validation proving exact `127.0.0.1`
  binds for both services with no privileged mode, host networking, Docker
  socket, or named persistent volume, both images built, real containers
  started, Public Arena smoke passed, external loopback smoke passed with all
  18 checks true, hostile raw WebSocket rejected, authoritative movement
  passed, reconnect retained the same session and room with coherent ship
  continuity and no duplicate participant or ship, reconnect token output
  absent, graceful shutdown passed, and cleanup passed.
- Operations/Security: `APPROVE`.
- Network/Runtime: `APPROVE`.
- Product Architect: `APPROVE PHASE A`.
- Blocking findings: none. No HIGH or MEDIUM finding remains open. Earlier
  implementation-review MEDIUM findings were closed by the hardening commit
  `3522116d62d8fb93a4a4ca1756aec6818280f0bb`.
- Non-blocking: two Operations/Security LOW items, one Network/Runtime NOTE,
  and the Claude QA suggestions remain `DEFERRED / NON-BLOCKING` and were not
  implemented.
- Review artifact:
  `docs/reviews/ops-002-public-arena-external-staging-deployment-review.md`,
  status `PHASE A REVIEW COMPLETE / PHASE B NOT AUTHORIZED`. It is historical
  evidence bound to the reviewed implementation head and is not rewritten by
  this reconciliation.
- Phase A external execution: `NONE`. No VPS, DNS provider, certificate
  service, Cloudflare account, firewall, reverse proxy, public hostname, or
  external staging environment was accessed at any point.

## OPS-002 Phase A Claude QA record

- Implementation-head run `32615914388` on
  `3522116d62d8fb93a4a4ca1756aec6818280f0bb`: usable substantive verdict
  `Approved with suggestions` with `0` blockers, followed by a wrapper
  conclusion of `FAILURE — summary exceeds max length 2000`. The Product
  Architect recorded an explicit Category-C infrastructure and
  output-packaging disposition; the mandatory Claude QA gate was satisfied and
  a manual rerun was not required. Wrapper success is not claimed for this
  run.
- Evidence-head run `32616866496` on
  `d2322e24ac2ff0525d5b6332143098bb048d6262`: wrapper conclusion `SUCCESS`,
  substantive verdict `Approved with suggestions`, `0` blockers. Its
  suggestions concern the deferred generated-client chunk-scan LOW, the
  `fetch-depth: 0` checkout tradeoff, an explanatory maintenance comment for
  the secret regexes, and PR-description wording. None alleges inaccurate or
  misleading evidence and none is blocking.
- The PR #63 description retains a generic `HUMAN MERGE ONLY` sentence that
  the exact one-time Product Architect authorization superseded for that pull
  request and head only. A clarifying pull-request metadata note was
  authorized but could not be applied; the authorization of record is the
  Product Architect decision, not the pull-request body. This is a `LOW`
  audit-clarity item with no repository effect.

## OPS-002 Caddy edge repository preparation

- Status: `CADDY EDGE REPOSITORY PREPARATION IMPLEMENTATION COMPLETE / REVIEW
  APPROVED / AWAITING EVIDENCE-HEAD CORE AND HUMAN MERGE`.
- Pull request: #69 — `OPS-002 — Prepare Caddy external staging edge`, `OPEN`,
  non-draft, unmerged.
- Branch: `ops/ops-002-caddy-edge-preparation`.
- Base: `4533291d8b042858a0bcb143aadfec7061d44984`.
- Corrected reviewed implementation head:
  `864d1aacb2f902e43e0395b5058fe3e970a9dc11`.
- Implementation-head Core run `32740776653`: `SUCCESS` on
  `864d1aacb2f902e43e0395b5058fe3e970a9dc11`, with 13 test files and 163/163
  repository tests, workspace build and typecheck, protocol compatibility,
  existing callback/movement/combat diagnostics, external script typecheck, 47
  existing external-staging preflight self-tests, 58 corrected edge preflight
  self-tests, immutable Caddy `2.11.4` artifact verification against recorded
  SHA-256, SHA-512, and checksum-manifest bindings, Caddy format/adapt/validate
  of the rendered configuration, eight rejected Origin-mutation negative cases,
  `systemd-analyze verify` of the drop-in against a safe temporary unit tree,
  and a Unix admin runtime contract of 28 tests with all 26 required
  assertions true.
- Mandatory Claude QA run `32740776780` on
  `864d1aacb2f902e43e0395b5058fe3e970a9dc11`: wrapper `SUCCESS`, substantive
  verdict `Approved with suggestions`, `0` blockers.
- Operations/Security: `APPROVE`.
- Network/Runtime: `APPROVE`.
- Product Architect: `APPROVE CADDY EDGE REPOSITORY PREPARATION`.
- `OPS-002-EDGE-PA-F1`: `CLOSED`. The Caddy admin API no longer uses an
  unauthenticated loopback TCP listener on the shared host.
- Blocking findings: none. No HIGH or MEDIUM finding remains open.
- Non-blocking: host ownership and socket-mode verification deferred to
  installation, deliberate checksum duplication, the CI unrelated-test-user
  runner assumption, duplicated Origin-negative coverage, and documentation
  suggestions all remain `DEFERRED / NON-BLOCKING` and were not implemented.
- Selected implementation: host-managed Caddy systemd service.
- Caddy validation baseline: `2.11.4`, bound to the official immutable
  `linux/amd64` release archive with recorded SHA-256 and SHA-512 values.
- Admin control plane: permission-restricted Unix-domain socket, with a
  `/run/caddy` runtime directory at mode `0700` and service `UMask=0077`.
- Admin socket: `unix//run/caddy/burningspace-admin.sock`.
- TCP Caddy admin listener: `FORBIDDEN`. Linux Core verified none is present,
  including the Caddy default TCP `2019`.
- Client upstream: `127.0.0.1:18080`.
- Server upstream: `127.0.0.1:2567`.
- Host installation: `NOT PERFORMED / NOT AUTHORIZED`.
- DNS: `NOT CONFIGURED`.
- TLS: `NOT CONFIGURED`.
- Images: `NOT PUBLISHED / NOT SELECTED`.
- External validation: `NOT STARTED`.
- Deployment: `NOT AUTHORIZED / NOT STARTED`.
- Deployment `GO`: `NOT ISSUED`.
- Evidence state: exactly one authorized documentation-only evidence commit
  records this review. Final-head Core on the evidence head is required before
  merge, and PR #69 remains human-merge-only.
- Accepted decision count: `35`, unchanged. The campaign roadmap is unchanged
  and DOCARCH-004 remains `PAUSED`.
- Review artifact:
  `docs/reviews/ops-002-public-arena-external-staging-deployment-review.md`.
- Edge external execution: `NONE`. No Contabo access, no host installation, no
  public TCP 80/443 binding, no DNS or certificate service contact, no image
  publication, and no deployment occurred at any point.

## Deployment boundary

- OPS-002 Phase B live execution: `NOT STARTED`. External deployment remains
  unauthorized.
- Target provider/environment: `SELECTED` — Contabo,
  `burningspace-staging-01`, class
  `shared-existing-vps-with-isolated-compose-staging`. Selection is not
  deployment authorization.
- Deployment `GO`: `NOT ISSUED`.
- External staging: `NOT DEPLOYED`. No staging service is online.
- Public production launch: `NOT AUTHORIZED`.
- No credential was requested, supplied, or stored. No real environment file
  exists in the repository.
- Merging Phase A is repository preparation only. It is not a deployment `GO`
  and does not authorize any external execution.

## OPS-002 Phase B environment decision

- Environment ID: `burningspace-staging-01`.
- Environment class: `shared-existing-vps-with-isolated-compose-staging`.
- Superseded environment class: `dedicated-isolated-single-host-vps`.
- Selection status: `ENVIRONMENT SELECTED`.
- Provider: `Contabo`.
- Host: `SELECTED — existing shared VPS`.
- Physical isolation: `NO`. Kernel, CPU, RAM, disk, Docker daemon, public IP,
  host firewall, maintenance domain, and security failure domain remain
  shared with unrelated workloads.
- Operational isolation repository contract: `MERGED / COMPLETE` through PR
  #67. Host-side deployment and verification: `NOT STARTED`.
- Hostnames: `NOT ASSIGNED`.
- Authority transition: `MERGED / COMPLETE`.
- Shared-host repository hardening: `MERGED / COMPLETE`.
- Host-gate discovery: `COMPLETE`.
- Host remediation: `REQUIRED BEFORE DEPLOYMENT GO`.
- Root firewall review: `REQUIRED BEFORE GO`.
- Edge repository design/preparation: `IMPLEMENTATION COMPLETE / REVIEW
  APPROVED / AWAITING EVIDENCE-HEAD CORE AND HUMAN MERGE` on PR #69. Host edge
  installation and ownership: `NOT STARTED / NOT AUTHORIZED`.
- Edge host installation, DNS, TLS, immutable target/rollback images, external
  validation: `NOT COMPLETE`.
- GO packet: `DRAFT / INCOMPLETE`.
- Deployment GO: `NOT ISSUED`.
- External deployment: `NOT AUTHORIZED`.
- Phase B live execution: `NOT STARTED`.
- External staging: `NOT DEPLOYED`.
- Public production launch: `NOT AUTHORIZED`.
- The earlier rejection of this shared host is superseded for controlled
  low-traffic staging only. It was driven primarily by the forum container
  owning public TCP 80/443 and the effective edge; the forum is now stopped,
  autostart-disabled, restart policy `no`, preserved, recoverable through an
  out-of-band operational procedure, and no longer owns 80/443. Public 80/443
  is reserved conceptually for a future independently managed BurningSpace
  staging edge. The rejection is not superseded for public production.
- Measured audit evidence after forum shutdown: Ubuntu 24.04.4 LTS, 4 vCPU,
  approximately 7.8 GiB total RAM with approximately 6.9 GiB available,
  approximately 48 GiB free disk, root filesystem approximately 35% used,
  very low observed load, healthy Docker, and unrelated stable services still
  operational. This is a point-in-time capacity observation, not guaranteed
  capacity. The selected-host loopback pair is `127.0.0.1:2567` server and
  `127.0.0.1:18080` client; `18080` is an environment-specific override of the
  valid generic `8080` default because a preserved legacy container reserves
  host port `8080` in its Docker metadata.
- No public address, SSH target, SSH fingerprint, container identifier, or
  unrelated-service private identifier is recorded in canonical documentation.
- The forum and all other unrelated host workloads remain outside BurningSpace
  ownership and must not be modified by BurningSpace deployment operations.
- Host selection is `APPROVED`; repository hardening is `MERGED / COMPLETE`.
  Repository-only edge design/preparation is implemented and review-approved on
  PR #69 and awaits evidence-head Core and human merge. Selecting, preparing,
  approving, or merging the repository edge contract authorizes no external
  access, credential collection, host installation, public binding, DNS/TLS
  change, container creation, image publication, or deployment.
- Remaining pre-GO gates include root-level effective firewall review;
  restriction of the public plaintext dashboard on TCP 4000; restriction or
  effective-ingress verification for Cockpit on TCP 9090; review/restriction
  of TeamSpeak administrative/query TCP 10011, 10022, and 10080; host
  maintenance before BurningSpace containers are created; edge, DNS, TLS,
  immutable release/rollback, and external validation completion; and the
  forum standstill and preservation controls in the external staging runbook.

## Review and merge gate

OPS-001 review and human merge of PR #57 are complete.

UX-001 implementation review, final-head Core, required independent reviews,
Product Architect approval, and merge are complete. `UX-001-PA-F1` is closed,
the accessibility live-region LOW remains deferred, and the invalid advisory
Claude wrapper result remains non-blocking.

OPS-002 Phase A review, final evidence-head Core, evidence-head Claude QA,
required independent reviews, Product Architect approval, and merge are
complete.

OPS-002 shared-host repository hardening is merged and complete through PR
#67. The host-gate audit is complete. This post-hardening reconciliation is a
`NORMAL RISK`, docs-only change requiring documentation validation, one
independent read-only Operations/Architecture review, Product Architect
approval, and human merge. Network, Security, QA, Gameplay, and Visual review
are not applicable because it changes no executable behavior, infrastructure,
security implementation, acceptance test, gameplay, or presentation surface.

OPS-002 Caddy edge repository preparation is implementation-complete and
review-approved on PR #69 at corrected head
`864d1aacb2f902e43e0395b5058fe3e970a9dc11`. Independent Operations/Security
and Network/Runtime reviews approve, mandatory Claude QA passed with wrapper
`SUCCESS` and `0` blockers, `OPS-002-EDGE-PA-F1` is closed, and the Product
Architect approved the repository preparation and authorized exactly one
documentation-only evidence commit. Merge is not authorized until final-head
Core succeeds on the evidence head and the Product Architect issues the final
merge disposition. Approval of the repository preparation authorizes no host
installation, Contabo mutation, DNS or TLS change, image publication, external
execution, or deployment `GO`.

The one-time autonomous merge authorizations used for PR #60, PR #62, and PR
#63 are exhausted. PR #67 entered `main` through a normal human merge. None of
those actions authorizes any later runtime task, any future implementation PR,
OPS-002 Phase B, or any external execution. No autonomous merge authorization
exists for PR #69. That pull request, this evidence commit, and future OPS-002
work remain human-merge-only unless a later exact Product Architect
authorization states otherwise.

## Next safe action

1. Validate the final-head Core run triggered by the OPS-002 Caddy edge
   evidence commit on PR #69.
2. If that run succeeds and no new factual blocker exists, perform a
   human-only merge of PR #69.
3. Do not install Caddy and do not start host execution in this gate.

Approving or merging the Caddy edge repository preparation does not activate
host installation.

Host maintenance, root-level effective firewall review, public/admin port
remediation, host edge installation and ownership, DNS, TLS, immutable release
and rollback binding, and external validation remain outstanding and must be
completed before the non-secret GO packet can be returned for an
environment-specific Product Architect GO decision.

Phase B live execution remains unstarted and external deployment remains
unauthorized. No hostname is assigned, no credential is requested or stored,
and no deployment GO is issued. Do not configure DNS, TLS, a reverse proxy, or
a firewall, do not modify the preserved forum or any other unrelated host
workload, and do not deploy externally until the Product Architect issues an
explicit environment-specific deployment GO.
