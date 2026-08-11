# BurningSpace Current Handoff

Last updated: 2026-08-11
Updated by: Codex — OPS-001 Public Arena readiness foundation

## Repository state

- PR #56 / NET-001 is human-merged at baseline
  `87ea2a5abe77c3548cded6347d0650c31e8bd72c`.
- The Wave 1 authority/security foundation required for Public Arena Alpha is
  complete at this baseline.
- The Public Arena Alpha launch track is active.
- OPS-001 is the sole active bounded task.
- Risk: `HIGH — production runtime, container, endpoint, and shutdown behavior`.
- Active branch: `game/ops-001-public-arena-readiness`.
- Active task: `docs/tasks/ops-001-public-arena-readiness.md`.
- Active review: `docs/reviews/ops-001-public-arena-readiness-review.md`.
- The deployment remains local/not externally launched.
- The accepted decision count remains 35: 18 `BS-MECH`, 5 `GAME-001`,
  7 `BS-ARCH`, 4 `BS-PROC`, and 1 `CI`.
- Campaign systems remain deferred and the canonical campaign roadmap is
  unchanged.
- DOCARCH-004 remains paused.
- PR #51 remains a historical draft; PR #52 remains closed.

## Authorization and boundaries

- OPS-001 prepares one in-memory server container and one static-client
  container, loopback-only staging Compose, explicit production client origin,
  health/readiness, structured lifecycle logs, bounded graceful shutdown,
  real arena smoke coverage, Core container validation, and an operations
  runbook.
- The arena remains single-process, non-persistent, server-authoritative, and
  unsuitable for horizontal replicas. Restart resets active rooms/world state.
- TLS and the public reverse proxy remain outside the application containers.
- No external deployment, campaign, account, persistence, gameplay, authority,
  reconnect, accepted-decision, package-contract, or dependency change is
  authorized.
- UX-001 is the next bounded task after merge; it is not active.

## Review and merge gate

OPS-001 requires full local validation, Linux Core container validation, one
independent integrated Operations/Security review, mandatory substantive Claude
QA, Product Architect approval, one later evidence commit, passing final-head
checks, and human-only merge. No agent may deploy externally or merge.

## Next safe action

Independent Operations/Security reviewer validates OPS-001 on the current
pull-request head.
