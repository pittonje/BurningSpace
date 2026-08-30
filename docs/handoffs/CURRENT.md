# BurningSpace Current Handoff

Last updated: 2026-08-30
Updated by: Codex — OPS-002 release-candidate governance reconciliation

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
- OPS-002 Caddy edge repository preparation: `MERGED / COMPLETE` through PR
  #69 and normal merge commit
  `4d691b056a8fa5cc558f52ae81da51d69aff2fc1`. Host installation, DNS, TLS,
  external validation, deployment, and deployment `GO` remain incomplete or
  unauthorized; image publication completed later through workflow run
  `33310151475`.
- OPS-002 first-deployment bootstrap rollback: `MERGED / COMPLETE` through PR
  #71 and normal merge commit
  `0a90effcd11d6745a6a3ad36c2bf5069a1b8d82b`.
- OPS-002 GHCR staging publication workflow: `MERGED / COMPLETE` through PR
  #72 and normal merge commit
  `75e4cd0ca71ca0b104067e19e0b7bfb2b5b3c81a`. First publication workflow run
  `33310151475`: `SUCCESS`.
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
  is online or claimed. The provider, environment class, DNS zone, public
  hostnames, and derived public origins are recorded as authority decisions;
  DNS and TLS remain unconfigured. No public address, credential, SSH material,
  or secret environment value is recorded.
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

- Status: `MERGED / COMPLETE`.
- Pull request: #69 — `OPS-002 — Prepare Caddy external staging edge`, merged
  normally into `main` on 2026-08-24.
- Branch: `ops/ops-002-caddy-edge-preparation`.
- Base: `4533291d8b042858a0bcb143aadfec7061d44984`.
- Corrected reviewed implementation head:
  `864d1aacb2f902e43e0395b5058fe3e970a9dc11`.
- Evidence head: `ee41232b4eff513ec3d3d04ee8a03845e719171d`.
- Merge commit: `4d691b056a8fa5cc558f52ae81da51d69aff2fc1`.
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
- Final evidence-head Core run `32746509383`: `SUCCESS` on
  `ee41232b4eff513ec3d3d04ee8a03845e719171d`, with all required repository,
  edge-preflight, immutable-artifact, Caddy validation, systemd, and Unix-admin
  runtime checks passing.
- Evidence-head Claude QA run `32746509019` had wrapper `FAILURE` only because
  output validation rejected an overlength minor suggestion. Its substantive
  verdict was `Approved with suggestions, pending final-head Core success`;
  that temporal condition was closed by Core run `32746509383`, and the run
  identified no factual blocker. This is not recorded as wrapper success.
- Operations/Security: `APPROVE`.
- Network/Runtime: `APPROVE`.
- Product Architect: `APPROVE FOR MERGE`.
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
- Images: `PUBLISHED / IMMUTABLE DIGESTS BOUND` by workflow run `33310151475`.
- External validation: `NOT STARTED`.
- Deployment: `NOT AUTHORIZED / NOT STARTED`.
- Deployment `GO`: `NOT ISSUED`.
- Evidence state: the authorized documentation-only evidence commit and its
  final-head checks are complete. The exact one-time merge authorization was
  used for PR #69 and is exhausted.
- Accepted decision count: `35`, unchanged. The campaign roadmap is unchanged
  and DOCARCH-004 remains `PAUSED`.
- Review artifact:
  `docs/reviews/ops-002-public-arena-external-staging-deployment-review.md`.
- Edge external execution: `NONE`. During that edge task there was no Contabo
  access, host installation, public TCP 80/443 binding, DNS or certificate
  service contact, image publication, or deployment.

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
- DNS zone: `SELECTED / APPROVED` — `burningforge.dev`; `NOT CONFIGURED`.
- Client hostname: `SELECTED / APPROVED` — `game.burningforge.dev`; DNS
  `NOT CONFIGURED`.
- Server hostname: `SELECTED / APPROVED` — `game-server.burningforge.dev`; DNS
  `NOT CONFIGURED`.
- Public origins: `https://game.burningforge.dev` client and
  `https://game-server.burningforge.dev` server.
- Authority transition: `MERGED / COMPLETE`.
- Shared-host repository hardening: `MERGED / COMPLETE`.
- Host-gate discovery: `COMPLETE`.
- Host remediation: `REQUIRED BEFORE DEPLOYMENT GO`.
- Root firewall review: `REQUIRED BEFORE GO`.
- Edge repository design/preparation: `MERGED / COMPLETE` through PR #69 and
  merge `4d691b056a8fa5cc558f52ae81da51d69aff2fc1`. Host edge installation and
  ownership: `NOT STARTED / NOT AUTHORIZED`.
- Edge host installation, DNS, TLS, rollback readiness, and external validation:
  `NOT COMPLETE`. Immutable target images are published and bound.
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
  Repository-only edge design/preparation is `MERGED / COMPLETE` through PR
  #69. Selecting, preparing, approving, or merging the repository edge contract
  authorizes no external access, credential collection, host installation,
  public binding, DNS/TLS change, container creation, image publication, or
  deployment.
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

OPS-002 Caddy edge repository preparation is merged and complete through PR
#69. Corrected implementation head
`864d1aacb2f902e43e0395b5058fe3e970a9dc11`, evidence head
`ee41232b4eff513ec3d3d04ee8a03845e719171d`, and merge commit
`4d691b056a8fa5cc558f52ae81da51d69aff2fc1` are the fixed bindings.
Independent Operations/Security and Network/Runtime reviews approve; Product
Architect approval is recorded; `OPS-002-EDGE-PA-F1` is closed; implementation
Claude run `32740776780` succeeded with `Approved with suggestions` and `0`
blockers; and final-head Core run `32746509383` succeeded. Evidence-head Claude
run `32746509019` failed output validation after a substantively approving
review whose only temporal condition was closed by that Core success; it is
not represented as wrapper success and establishes no factual blocker. The
exact one-time merge authorization used for PR #69 is exhausted. Merge of the
repository preparation authorizes no host installation, Contabo mutation, DNS
or TLS change, image publication, external execution, or deployment `GO`.

The one-time autonomous merge authorizations used for PR #60, PR #62, PR #63,
and PR #69 are exhausted. PR #67 entered `main` through a normal human merge.
None of those actions authorizes any later runtime task, any future
implementation PR, OPS-002 Phase B, or any external execution. Future OPS-002
work remains human-merge-only unless a later exact Product Architect
authorization states otherwise.

## OPS-002 first-deployment bootstrap rollback implementation

- Status: `MERGED / COMPLETE`.
- Branch: `ops/ops-002-first-deployment-bootstrap-rollback`.
- Implementation HEAD: `ea216e3be1f6f98776bd66b00162c70f3ca5c501`.
- Evidence HEAD: `84d36aeb577ec31501b82bde488f610d08ef855d`.
- Merge commit: `0a90effcd11d6745a6a3ad36c2bf5069a1b8d82b`.
- Base: `c1daa96aefce961ec6b595af058b8f105ac98800` from exact local
  `origin/main`.
- Historical implementation bindings: GHCR repositories
  `ghcr.io/pittonje/burningspace-server` and
  `ghcr.io/pittonje/burningspace-client`; first edge ID
  `burningspace-staging-01-edge-v1`. The concrete deployment target is now
  governed by the successful publication workflow `GITHUB_SHA`, not this
  implementation branch's historical base.
- Rollback modes: first deployment uses exactly
  `bootstrap-no-previous-release` with previous image, commit, and edge fields
  structurally absent; later deployments retain strict
  `previous-approved-release` requirements.
- Bootstrap rollback restores `PRE_BURNINGSPACE_DEPLOYMENT_STATE` and may touch
  only the BurningSpace staging Compose project and BurningSpace Caddy edge
  configuration. Unrelated services and the stopped forum remain preserved;
  prune and unrelated cleanup remain forbidden.
- Reboot ordering is documented as completed maintenance, separately
  Product-Architect-authorized reboot, shared-host baseline revalidation, then
  image/edge deployment. No reboot, host contact, image publication, DNS, or
  deployment occurred.
- Focused validation passed: external staging preflight `56/56`; edge preflight
  `64/64`. Core Pull Request Checks run `33277932406`: `PASS`.
- Reviewer declaration: Security and QA required; Architecture and Network
  recommended; Gameplay and Visual not applicable. Independent Claude
  targeted/final review: `APPROVE`, with `0 BLOCKER / 0 HIGH / 0 MEDIUM`.
- Final-head Core run `33303715791`: `PASS`.
- PR #71: `MERGED / CLOSED`.
- Protected stash `6dd950c5829db8a88150d3b08217277e17274187` remains present and untouched.

## OPS-002 GHCR staging publication and release candidate

- Status: `MERGED / CLOSED / FIRST PUBLICATION COMPLETE`.
- Branch: `ops/ops-002-ghcr-staging-publish`.
- Base: `0a90effcd11d6745a6a3ad36c2bf5069a1b8d82b` from exact local
  `origin/main`.
- PR #72 implementation head: `7f20d5a434725bb04e1d204a67b5371e1b6316a3`.
- PR #72 hostname reconciliation head:
  `55997ae5afeed1bccb723b0d39c8c34d2f84516d`.
- PR #72 merge commit: `75e4cd0ca71ca0b104067e19e0b7bfb2b5b3c81a`.
- Workflow: `.github/workflows/publish-staging-images.yml`, manual
  `workflow_dispatch` only, guarded to `refs/heads/main`, on `ubuntu-latest`.
- Authentication: repository-scoped `GITHUB_TOKEN` with only
  `contents: read` and `packages: write`; no PAT or repository GHCR secret.
- Release binding: the checked-out `HEAD` must equal `GITHUB_SHA`; both
  `linux/amd64` images use commit-derived tags, OCI source/revision labels,
  buildx metadata digest capture, and independent immutable-reference
  inspection. No `latest` tag is published.
- The workflow emits bounded non-secret `phaseb-image-release.json` evidence
  in the job log and step summary. It does not change package visibility.
- Final PR #72 Core run `33309831684`: `SUCCESS`. Claude QA run `33309831735`:
  `SUCCESS / Approved with suggestions / 0 blockers`.
- Targeted local checks pass: `git diff --check`, YAML structure and trigger
  inspection, embedded Bash syntax, Dockerfile existence, client build-arg
  consumption, and static credential-output scan.
- First publication workflow run `33310151475`: `SUCCESS` at exact target
  commit `75e4cd0ca71ca0b104067e19e0b7bfb2b5b3c81a`, platform `linux/amd64`.
- Server image: `PUBLISHED / IMMUTABLE DIGEST BOUND` —
  `ghcr.io/pittonje/burningspace-server@sha256:9bcd2855cb588c326af72d10a634921db05b0729197e477c6862cc9e8aaddd58`.
- Client image: `PUBLISHED / IMMUTABLE DIGEST BOUND` —
  `ghcr.io/pittonje/burningspace-client@sha256:118ebff019677c11654fef002cb6ca9c2eed8fd6821400994cd0f755eb8508c2`.
- Approved hostile smoke Origin: `https://hostile.burningforge.dev`; this is an
  Origin-header test identity and requires no Phase A DNS record or TLS
  certificate.
- Package visibility: `UNCHANGED / PRODUCT ARCHITECT DECISION PENDING`.
- Host pull authority if packages remain private: `NOT DEFINED`.
- No local Docker or PAT was required. No host, provider API, DNS, TLS, Caddy,
  firewall, visibility, credential, or deployment operation occurred.

## Next safe action

Send the exact release-candidate governance reconciliation diff to Claude for
targeted review. Do not create the real Phase B inventory, change GHCR
visibility, create host pull credentials, or deploy from this checkpoint.

Approving or merging the Caddy edge repository preparation does not activate
host installation.

Host maintenance, root-level effective firewall review, public/admin port
remediation, host edge installation and ownership, DNS, TLS, rollback
readiness, and external validation remain outstanding and must be
completed before the non-secret GO packet can be returned for an
environment-specific Product Architect GO decision.

Phase B live execution remains unstarted and external deployment remains
unauthorized. The approved staging hostnames are not yet configured in DNS,
no credential is requested or stored, and no deployment GO is issued. Do not
configure DNS, TLS, a reverse proxy, or a firewall, do not modify the preserved
forum or any other unrelated host workload, and do not deploy externally until
the Product Architect issues an explicit environment-specific deployment GO.
