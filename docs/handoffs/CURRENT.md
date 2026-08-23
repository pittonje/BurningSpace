# BurningSpace Current Handoff

Last updated: 2026-08-23
Updated by: Claude — UX-001 review evidence

## Repository state

- PR #56 / NET-001 is human-merged at baseline
  `87ea2a5abe77c3548cded6347d0650c31e8bd72c`.
- The Wave 1 authority/security foundation required for Public Arena Alpha is
  complete at this baseline.
- The Public Arena Alpha launch track is active.
- OPS-001 is MERGED / CLOSED through PR #57. It entered `main` through the
  normal merge commit `dd558a7648dca8c8a735f285257f4a317ce9a846`.
- OPS-001 implementation head:
  `ab74ea9fde13061ba68667e28c4f78b271b45bd8`.
- OPS-001 evidence head:
  `2f1ca4e389031a1bc23d9c6b68aaaa31f3add4af`.
- Final evidence-head Core run `31515348143` completed with `SUCCESS`.
- Final evidence-head Claude QA run `31515348155` completed with `SUCCESS`;
  its substantive verdict was `Approved with suggestions`, with no blockers.
- OPS-001-F1 is CLOSED. Generated fingerprinted `index-*.js` and
  `index-*.css` are immutable and long-lived; stable-name assets require
  revalidation; `index.html` is not long-lived; missing assets remain uncached
  404 responses.
- No Public Arena external deployment was performed. OPS-001 configured no
  public hostname, TLS edge, reverse proxy, or production credentials.
- UX-001 is `IMPLEMENTATION COMPLETE / REVIEW APPROVED / AWAITING FINAL-HEAD
  CORE AND HUMAN MERGE` on PR #60. It is not merged.
- The accepted decision count remains 35: 18 `BS-MECH`, 5 `GAME-001`,
  7 `BS-ARCH`, 4 `BS-PROC`, and 1 `CI`.
- Campaign systems remain deferred and the canonical campaign roadmap is
  unchanged.
- DOCARCH-004 remains paused.
- PR #51 remains a historical draft; PR #52 remains closed.

## UX-001 state

- Status: `IMPLEMENTATION COMPLETE / REVIEW APPROVED / AWAITING FINAL-HEAD
  CORE AND HUMAN MERGE`.
- Pull request: #60, open, non-draft, unmerged, human-merge-only.
- Branch: `game/ux-001-connection-error-reconnect-ux`.
- Base: `d79d13635b96af10cf3528783b7b3f17b0f2ba2e`.
- Reviewed implementation head:
  `96b6c27b36159a019629ecbaa37ddcc9ab35a10f`.
- Core implementation-head run `32610827739` completed with `SUCCESS` at that
  head: 13 test files and 163/163 tests, including all 11 client lifecycle
  tests, with client test sources typechecked by the mandatory workspace
  typecheck.
- Independent Network/Runtime review: `APPROVE`.
- Independent Visual/UX review: `APPROVE`.
- Product Architect: `APPROVE`.
- Blocking findings: none.
- `UX-001-PA-F1` (MEDIUM — client lifecycle tests not discovered or
  typechecked by mandatory Core) is `CLOSED` by
  `96b6c27b36159a019629ecbaa37ddcc9ab35a10f`.
- Claude QA: ADVISORY wrapper failure on run `32610827741`; no valid
  substantive result was produced; non-blocking under current NORMAL-risk
  routing. No manual rerun is required and no substantive Claude approval is
  claimed.
- Accessibility live-region LOW (lobby asynchronous status/error output lacks
  explicit `role="status"` and `aria-live` semantics): `DEFERRED`.
- Scope: 11 changed paths, client-side application changes only. The single
  path outside `apps/client/**` is `vitest.config.ts`, authorized solely to
  include the existing client lifecycle suite in mandatory root Core.
- External deployment: NOT PERFORMED and not authorized.
- Review artifact:
  `docs/reviews/ux-001-public-arena-connection-error-reconnect-ux-review.md`.

## Authorization and boundaries

- OPS-001 completed the deployment/readiness foundation for one in-memory
  server container and one static-client container, loopback-only staging
  Compose, explicit production client origin, health/readiness, structured
  lifecycle logs, bounded graceful shutdown, real arena smoke coverage, Core
  container validation, and an operations runbook.
- The arena remains one in-memory server process with no persistence or
  accounts; it is server-authoritative and unsuitable for horizontal scaling.
  Restart resets active rooms/world state.
- TLS and the public reverse proxy remain outside the application containers.
- External launch is a separate operation requiring explicit authorization.
- SEC-007 and NET-001 remain complete. UX-001 preserves NET-001 reconnect
  semantics, SEC-007 boundaries, server authority, and the protocol, and makes
  no server, protocol, schema, shared-contract, dependency, lockfile,
  gameplay, campaign, account, persistence, accepted-decision, or deployment
  change.
- UX-001 introduces no accepted game-design decision. The accepted decision
  count remains 35, the campaign roadmap remains unchanged, DOCARCH-004
  remains paused, and external Public Arena deployment remains unperformed.

## Review and merge gate

OPS-001 review and human merge of PR #57 are complete.

UX-001 is NORMAL risk. Core CI/tests, independent Network/Runtime review,
independent Visual/UX review, and Product Architect approval are complete at
`96b6c27b36159a019629ecbaa37ddcc9ab35a10f`, with no blocking finding open.
Claude QA is advisory/non-blocking unless it produces a concrete, valid
substantive blocker, or risk is elevated, or scope expands into a HIGH-RISK
boundary. The remaining gate is successful Core on the final evidence head,
followed by human-only merge. No external deployment is authorized.

## Next safe action

1. Validate final-head Core triggered by the UX-001 evidence commit on
   `game/ux-001-connection-error-reconnect-ux`.
2. If Core succeeds and no new substantive factual blocker appears, perform
   human-only merge of PR #60.
3. Do not deploy externally as part of this gate.

Do not activate another runtime task before the UX-001 human merge.
