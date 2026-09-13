# MOBILE-001A — Client Input Abstraction

Owner: `Product Architect`

Risk: `NORMAL`

Status: `IMPLEMENTED / RUNTIME REVIEW APPROVED / AWAITING HUMAN PR REVIEW`

## Goal and scope

Extract production multiplayer desktop keyboard/mouse input behind a semantic
input-source abstraction without changing desktop gameplay behavior or the
server input contract.

- `GameplayInputSource` semantic contract and `DesktopInputSource`.
- `MultiplayerGameScene` migration for player input, spectator movement and
  semantic back/lobby requests through the same abstraction.
- Focused desktop-input and scene regression tests.

The scene retains network-send scheduling, spectator camera physics, scene
transitions, connection lifecycle and neutral-input safety. The input source
provides intent only; it does not send network messages or own game authority.

## Non-goals and preserved invariants

No touch controls, device detection, mobile HUD, orientation handling, gamepad,
server changes, protocol/shared changes, persistence or deployment. No changes
to the preserved local `GameScene`, accepted decisions, CI or dependencies.

Preserve the 50 ms player-input send cadence, WASD/arrows, mouse world-space
aim, LMB/Space fire and own-ship alive gating. Esc sends neutral input before
the lobby transition; blur, document hidden and shutdown retain neutralization.
Spectator camera normalization, acceleration/deceleration, max speed, bounds
and clamped-axis velocity reset remain unchanged. Server authority and the
existing player-input payload are unchanged.

## Implementation and review binding

- Branch: `game/mobile-001a-input-abstraction`.
- Base: `b18a53dc64a4cbc86a8dc41b779733b8c96b587d`.
- Reviewed implementation: `fda1f0782ea1ebfcbe74329e9bbb52ab792e2e2b`.
- Independent Runtime/Client review: **APPROVE**, 0 BLOCKER / 0 HIGH / 0 MEDIUM,
  as reported in the Product Architect's conformance follow-up disposition.
- Product Architect: **APPROVE**; runtime implementation accepted.
- Human PR review/merge: pending. No autonomous merge authorization.

The single process LOW was the missing committed repository task file. The
implementation was performed under an explicit scoped external PA brief; this
task file did **not** exist as committed authority before implementation. The
work stayed within that brief and passed independent runtime review. This
documentation-only follow-up records the bounded authority after implementation
and closes the repository-record gap before PR/merge; it does not backdate
authority or rewrite the reviewed implementation commit.

Per the PA disposition and [reviewer routing](../agents/reviewer-routing.md),
the narrow Runtime/Client review is complete. Separate specialist reviews are
not selected because server authority, protocol, security and visual/mechanical
behavior are unchanged. Claude QA is advisory/non-blocking if CI routes it.
No new agent review or additional runtime review is required for this
documentation-only conformance follow-up.

## Acceptance evidence

Recorded implementation validation; not rerun for this documentation follow-up:

- Focused input tests: 29/29 PASS.
- All client tests: 40/40 PASS.
- Client typecheck and workspace typecheck: PASS.
- Client production build: PASS with required
  `VITE_BURNINGSPACE_SERVER_URL=https://game-server.burningforge.dev`.
- `git diff --check`: PASS.
- Server/protocol/shared/deployment untouched.

The follow-up verifies that implementation/test bytes remain unchanged from
the reviewed commit and that its diff contains only this task file and
[`docs/handoffs/CURRENT.md`](../handoffs/CURRENT.md).

## Next safe action

Documentation conformance commit → push → PR → human review/merge.

Next task: **MOBILE-001B — Touch Controls**. It is future work, outside
MOBILE-001A, and is **not authorized** by this task.
