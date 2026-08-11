# BurningSpace Current Handoff

Last updated: 2026-08-11
Updated by: Codex — SEC-007 network boundary hardening

## Repository state

- PR #54 / TEST-003 is human-merged at
  `e337c4d55d80af41ef27aa4c87baa42a73926bd3`.
- Production diagnostic isolation and real production `BattleRoom` authority
  coverage are established.
- Wave 1 — Authority and Security Hardening remains active.
- SEC-007 is the sole active bounded task.
- Risk: `HIGH — production network/security boundary`.
- Active branch: `game/wave1-sec-007-network-boundary-hardening`.
- Active task: `docs/tasks/sec-007-network-boundary-hardening.md`.
- Active review: `docs/reviews/sec-007-network-boundary-hardening-review.md`.
- DOCARCH-004 remains open but paused.
- DOCARCH-004C v1 / PR #51 remains open and draft as frozen historical
  methodology evidence.
- PR #52 is closed and superseded.
- The accepted decision count remains 35: 18 `BS-MECH`, 5 `GAME-001`,
  7 `BS-ARCH`, 4 `BS-PROC`, and 1 `CI`.

## Authorization and boundaries

- SEC-007 implements the explicit production Origin policy, fail-closed
  production configuration, bounded profile and player-input abuse controls,
  and remote execution of `npm test` in Core Pull Request Checks.
- This task creates no gameplay or accepted decision change and preserves
  existing protocol, schema, movement, combat, projectile, damage, death,
  respawn, faction, spectator, health, and room-registration behavior.
- Identity, accounts, persistence, sectors, outposts, deployment,
  reverse-proxy trust, and reconnect behavior remain outside the task.
- Reconnect ownership, disconnect lifecycle, and minimum reconnection behavior
  is the next runtime boundary after merge; it is not active.

## Review and merge gate

SEC-007 requires full local validation, Core CI including `npm test`, one
independent integrated Security/Runtime review, mandatory substantive Claude QA,
Product Architect approval, one combined evidence commit, passing final-head
checks, and human-only merge. Infrastructure-only Claude override requires
explicit Product Architect evidence. No agent may merge the pull request.

## Next safe action

Independent Security/Runtime reviewer validates SEC-007 on the current
pull-request head.
