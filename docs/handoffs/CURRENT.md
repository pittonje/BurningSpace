# BurningSpace Current Handoff

Last updated: 2026-08-23
Updated by: Codex — OPS-002 authority bootstrap

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
  selected next bounded milestone. Its durable state after this authority
  bootstrap reaches `main` is `AUTHORITY DEFINED / IMPLEMENTATION NOT
  STARTED`.
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

## Claude QA advisory

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
  was configured. UX-001 completion does not launch Public Arena externally.

## OPS-002 authority

- Task: `OPS-002 — Public Arena External Staging Deployment and Validation`.
- Pre-merge bootstrap state: `AUTHORITY BOOTSTRAP IN PROGRESS`; this marker is
  historical once the bootstrap is present on `main`.
- Durable state when this bootstrap reaches `main`: `AUTHORITY DEFINED /
  IMPLEMENTATION NOT STARTED`.
- Implementation risk: `HIGH`.
- Authority bootstrap branch: `docs/ops-002-external-staging-authority`.
- Task authority:
  `docs/tasks/ops-002-public-arena-external-staging-deployment.md`.
- Integrated review template:
  `docs/reviews/ops-002-public-arena-external-staging-deployment-review.md`.
- OPS-002 separates Phase A repository/dry-run preparation from Phase B
  controlled external staging execution.
- Bootstrap merge does not authorize deployment. External execution requires
  reviewed and merged Phase A implementation, green required checks, approved
  Operations/Security and Network/Runtime evidence, mandatory Claude QA or a
  policy-compliant Product Architect infrastructure disposition, and an
  explicit environment-specific Product Architect deployment `GO`.
- Future OPS-002 implementation is human-merge-only unless a later exact
  Product Architect authorization states otherwise.
- External Public Arena deployment remains `NOT PERFORMED`. No staging service
  is online or claimed by this authority bootstrap, and no real provider,
  hostname, address, credential, or environment value is recorded.
- No other runtime task is active.

## Review and merge gate

OPS-001 review and human merge of PR #57 are complete.

UX-001 implementation review, final-head Core, required independent reviews,
Product Architect approval, and merge are complete. `UX-001-PA-F1` is closed,
the accessibility live-region LOW remains deferred, and the invalid advisory
Claude wrapper result remains non-blocking.

The one-time autonomous merge authorization used for PR #60 does not authorize
any later runtime task or future implementation PR.

The OPS-002 authority/bootstrap PR has a separate one-time Product Architect
authorization limited to its three documentation paths. That exception does
not authorize OPS-002 implementation or external execution.

## Next safe action

After this bootstrap reaches `main`, create a fresh OPS-002
implementation/preparation branch and begin only Phase A repository and dry-run
preparation within the task authority.

No external staging execution is authorized until the Product Architect issues
an explicit environment-specific deployment `GO`. Do not deploy externally as
part of authority bootstrap or Phase A merge.
