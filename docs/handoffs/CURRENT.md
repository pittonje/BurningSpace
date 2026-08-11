# BurningSpace Current Handoff

Last updated: 2026-08-11
Updated by: Codex — NET-001 reconnect ownership lifecycle

## Repository state

- PR #55 / SEC-007 is human-merged at baseline
  `c9e38b4106bdd0537b74e4b478a71c413f1854d2`.
- The SEC-007 production network boundary is established: fail-closed Origin
  enforcement and bounded profile/input rate limits remain active.
- Wave 1 — Authority and Security Hardening remains active.
- NET-001 is the sole active bounded task.
- Risk: `HIGH — session ownership / multiplayer lifecycle`.
- Active branch: `game/wave1-net-001-reconnect-lifecycle`.
- Active task: `docs/tasks/net-001-reconnect-ownership-lifecycle.md`.
- Active review: `docs/reviews/net-001-reconnect-ownership-lifecycle-review.md`.
- DOCARCH-004 remains open but paused.
- DOCARCH-004C v1 / PR #51 remains open and draft as frozen historical
  methodology evidence.
- PR #52 is closed and superseded.
- The accepted decision count remains 35: 18 `BS-MECH`, 5 `GAME-001`,
  7 `BS-ARCH`, 4 `BS-PROC`, and 1 `CI`.

## Authorization and boundaries

- NET-001 implements the bounded 10-second transient reconnect lifecycle,
  original-session ownership preservation, immediate input neutralization,
  private in-memory bearer-token handling, bounded client retries, Origin
  enforcement on reconnect, and limiter continuity through grace.
- Consented leave remains immediate and final; grace expiry performs the same
  final cleanup exactly once.
- This task creates no accepted decision or gameplay decision change and
  preserves protocol, schema, movement, combat, projectile, damage, death,
  respawn, faction, spectator, health, spawn, and room-registration behavior.
- Accounts, durable identity, persistence, sectors, outposts, campaign state,
  deployment, and new gameplay remain outside scope.
- Public Arena deployment/readiness foundation is the next runtime boundary
  after NET-001 merges; it is not active.

## Review and merge gate

NET-001 requires full local validation, Core CI including `npm test`, one
independent integrated Runtime/Security review, mandatory substantive Claude QA,
Product Architect approval, one later evidence commit, passing final-head
checks, and human-only merge. No agent may merge the pull request.

## Next safe action

Independent Runtime/Security reviewer validates NET-001 on the current PR head.
