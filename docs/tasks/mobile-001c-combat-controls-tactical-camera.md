# MOBILE-001C — Combat Controls & Tactical Camera

Owner: Product Architect
Risk: NORMAL
Status: AUTHORIZED / TASK AUTHORITY BEFORE RUNTIME
Branch: `game/mobile-001c-combat-camera-refinement`
Base/main: `175d87f47f16c6c5bf343728e29814165a2d9258` (PR #83 merged).

## Scope and semantics

- Replace separate touch AIM and FIRE with one AIM/FIRE stick; retain MOVE and LOBBY.
- Right held: continuous aim (last meaningful angle during that hold, otherwise current rotation), shooting gated by canShoot, independent left movement.
- Right released: digital movement determines heading; idle uses authoritative fallback rotation.
- Movement: radial dead zone 0.18, eight equal 45-degree sectors and unchanged boolean payload.
- Client-local zoom: default 0.86, min 0.40, max 1.15; desktop canvas wheel and touch pinch on two free canvas pointers. Combat/LOBBY pointers never participate.
- Scene owns target zoom, frame-rate-independent smoothing, follow and spectator bounds. Preserve acceleration/deceleration and input cadence.
- Scoped gesture suppression, cancellation/blur/hidden/resize/cleanup reset, listener disposal; viewport-fit=cover and existing safe-area spacing.

A small canvas camera-input helper keeps camera mutation out of input sources.
Optional zoom persistence is deferred to keep this slice bounded; each scene starts at 0.86.

## Invariants and non-goals

Desktop WASD/arrows, mouse aim, LMB/Space, Esc, neutralization and 50 ms network
cadence remain. No server authority, payload, shared/protocol, simulation,
connection, deployment, workflow, dependency, lockfile or accepted-decision edits.
No push, PR, deployment or further MOBILE task.

## Review routing

One independent narrow Client/UX review, explicitly selected by PA for this
NORMAL client UX slice. It covers input, camera, cancellation, visual usability
and regression evidence. Under the PA disposition, no separate Network,
Security, Architecture or Gameplay review: no wire contract, trust boundary,
authority model, dependency or canonical simulation changes. No broader visual
redesign. This bounded routing supersedes generic defaults in reviewer-routing.md.

## Validation and handoff

Focused tests cover heading priorities, equal sectors/boundaries, combined
fire cancellation, wheel/pinch direction/clamping, pointer exclusion, smoothing,
camera follow/bounds/resize, cleanup and desktop regression.
Run full client tests, client/workspace typecheck, client production build with
VITE_BURNINGSPACE_SERVER_URL and git diff --check. If existing browser tooling
is available, check local Desktop and forced Touch at 844x390; no new browser
dependency and no unperformed real-device claim.

Commit this authority/CURRENT before runtime. Second commit records implementation
and validation. Final state: IMPLEMENTED / AWAITING NARROW CLIENT/UX REVIEW.
Next action: one independent narrow Client/UX review.
