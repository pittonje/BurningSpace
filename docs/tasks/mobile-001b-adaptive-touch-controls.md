# MOBILE-001B — Adaptive Touch Controls

Owner: `Product Architect`

Risk: `NORMAL`

Status: `AUTHORIZED / TASK AUTHORITY BOOTSTRAP BEFORE IMPLEMENTATION`

Branch: `game/mobile-001b-touch-controls`

Base/main: `232966797ac34575fecfb808bbc2d67847048266` (merged MOBILE-001A / PR #82).

## Goal and scope

Make production multiplayer playable with adaptive phone/tablet touch input
while preserving desktop behavior and the server-authoritative input contract.

- Capability-based Auto resolution; local Auto / Keyboard + Mouse / Touch
  preference and lobby selector, resolved once per multiplayer scene lifetime.
- `TouchInputSource` behind `GameplayInputSource`, with movement and aim sticks,
  separate FIRE and semantic LOBBY control; independent pointer ownership.
- Responsive, translucent overlay with safe-area spacing and scoped gesture
  suppression; pointerup/cancel/lost-capture handling and explicit reset.
- Scene integration, lifecycle reset before neutralization, mode-specific
  control hints, and focused tests without additional dependencies.

Auto requires maxTouchPoints > 0 AND pointer: coarse AND hover: none. Manual
override takes precedence; malformed/unavailable local storage falls back to
Auto. No User-Agent detection or in-match source hot-swap.

Movement uses a clamped unit vector and 0.18 per-axis dead zone mapped to the
existing boolean fields. Aim uses atan2(y, x), retaining the last meaningful
angle in neutral and using the supplied ship rotation before first aim. FIRE
requires held intent and scene-provided canShoot; aim alone never fires.

## Invariants and non-goals

Preserve WASD/arrows, mouse world-space aim, LMB/Space, Esc, 50 ms send cadence,
alive gating, spectator camera physics, neutral network payloads, connection
and profile semantics. The scene owns networking, player/spectator distinction,
camera movement and transitions. Sources only provide semantic intent.

No server/shared/protocol changes, analog network input, gamepad, campaign UI,
fullscreen implementation, major HUD redesign, deployment, persistence, native
app, new dependencies or lockfile edits. No accepted decision changes. Do not
contact the VPS or redeploy staging. MOBILE-001C is not authorized here.

## Review and validation

Expected independent review: one narrow Client/UX review, then PA approval and
human merge. Per the PA brief and [reviewer routing](../agents/reviewer-routing.md),
no separate authority/network/security review is selected: those behaviors are
unchanged. This scope includes touch interaction and requires Client/UX review.

Run new focused tests and all client tests, client and workspace typecheck,
production client build with required VITE_BURNINGSPACE_SERVER_URL, and
git diff --check. Prove cancellation/reset, independent multitouch, back action,
stable mode lifetime, no leaked overlay, desktop regression and unchanged
server payload. Perform a small local browser smoke where available; do not
claim actual-phone validation without it. No deployment acceptance suites.

## Commit and handoff

Commit this task and CURRENT before runtime implementation. Then implement on
the same branch and record validation/status in these documents in the runtime
commit. No push, PR or merge in this task. Next safe action after implementation:
one independent Client/UX review.
