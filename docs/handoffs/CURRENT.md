# BurningSpace Current Handoff

Last updated: 2026-08-23
Updated by: Codex — UX-001 authority bootstrap

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
- The accepted decision count remains 35: 18 `BS-MECH`, 5 `GAME-001`,
  7 `BS-ARCH`, 4 `BS-PROC`, and 1 `CI`.
- Campaign systems remain deferred and the canonical campaign roadmap is
  unchanged.
- DOCARCH-004 remains paused.
- PR #51 remains a historical draft; PR #52 remains closed.

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
- The merge closes deployment/readiness foundation only. External launch is a
  separate operation requiring explicit authorization.
- SEC-007 and NET-001 remain complete. This reconciliation makes no runtime,
  gameplay, protocol, campaign, account, persistence, authority, reconnect,
  accepted-decision, package-contract, or dependency change.
- UX-001 — Public Arena Connection, Error, and Reconnect UX is `AUTHORITY
  DEFINED / IMPLEMENTATION NOT STARTED`. Its bounded authority is defined by
  `docs/tasks/ux-001-public-arena-connection-error-reconnect-ux.md` and becomes
  effective when this bootstrap is present on `main`.
- UX-001 introduces no accepted game-design decision. The accepted decision
  count remains 35, the campaign roadmap remains unchanged, DOCARCH-004
  remains paused, and external Public Arena deployment remains unperformed.

## Review and merge gate

OPS-001 local and corrected-head Linux Core validation passed. Independent
integrated/focused Operations/Security review, mandatory substantive Claude QA,
Product Architect approval, and final evidence-head Core and Claude QA success
are complete. Human merge of PR #57 is complete. The earlier
implementation-head Category-C infrastructure override remains historical
evidence and is not a failing gate on the merged state.

The UX-001 authority bootstrap is a LOW-RISK documentation-only change. The
future UX-001 implementation is NORMAL risk and requires Core CI/tests,
independent Network/Runtime review, independent Visual/UX review, Product
Architect approval, and human merge. Claude QA is advisory/non-blocking unless
risk is elevated or scope expands into a HIGH-RISK boundary. Gameplay,
Security, and Architecture review triggers remain as defined by the task. No
external deployment is authorized.

## Next safe action

After this authority bootstrap is merged, create a fresh UX-001 implementation
branch and implement only the bounded client-side task defined in
`docs/tasks/ux-001-public-arena-connection-error-reconnect-ux.md`. Preserve
NET-001 reconnect semantics, SEC-007 boundaries, server authority, and the
NORMAL-risk reviewer route. UX-001 implementation has not started.
