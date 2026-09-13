# MOBILE-001C — Combat Controls & Tactical Camera

Owner: Product Architect
Risk: NORMAL
Status: MERGED / DEPLOYED / FIELD-TESTED (dated reconciliation below)
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

Risk fields: runtime medium; networking none; security none; protocol none;
persistence none; performance low (local per-frame camera interpolation);
ci none; documentation low. Overall task risk remains NORMAL.

One independent narrow Client/UX review, explicitly selected by PA for this
NORMAL client UX slice. It covers input, camera, cancellation, visual usability
and QA/regression evidence. Under the PA disposition, no separate Network,
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

## Implementation and validation — 2026-09-13

Task authority was committed first (`f961b36`; exact SHA in branch history).
Implementation HEAD is the commit containing this section on the task branch.

Production: TouchInputState now provides radial 0.18 / equal 8-sector movement
and the right-held > movement-facing > authoritative-idle heading priority.
TouchInputSource creates exactly MOVE, AIM/FIRE and LOBBY; no separate fire
state remains. A fresh right-stick hold begins with authoritative fallback;
only meaningful direction within that hold updates its retained analog aim.

CameraZoomInput listens only on the gameplay canvas: desktop wheel emits a
smooth scale factor; two captured free touch pointers emit a distance ratio.
Controls are sibling DOM surfaces and own their captures; their pointerdown
events never target/bubble through canvas. Pinch release/cancel resets both
gesture pointers; blur/hidden/resize/shutdown clear gesture state. Scene owns
target/clamping and exponential interpolation `1 - exp(-12 * dt)`.
Follow math and spectator acceleration/deceleration remain; viewport/zoom
determines camera-center bounds. At 844x390 and zoom .40 the view is 2110x975
world units, far smaller than the 12000x12000 world.

Viewport meta includes viewport-fit=cover. All four existing safe-area insets
remain in control placement; touch gesture suppression is scoped to the active
canvas/controls and restored on cleanup. Default/min/max: .86/.40/1.15.

Validation (all PASS):

- `npm run test -w @burningspace/client -- test/touchInputState.test.ts test/touchInputSource.test.ts test/touchCombat.test.ts test/cameraZoomInput.test.ts test/multiplayerInput.test.ts test/desktopInputSource.test.ts`: **94/94**.
- `npm run test -w @burningspace/client`: **123/123**, including all 19 original desktop tests and one explicit movement/mouse-aim independence regression.
- `npm run typecheck:client`.
- `npm run typecheck` (all workspaces).
- `npm run build:client` with `VITE_BURNINGSPACE_SERVER_URL=https://game-server.burningforge.dev` (build setting only, no public request).
- `npm run build` (all workspaces), with the same production client setting.
- `git diff --check`.

Structural checks: DesktopInputSource and GameplayInputSource bytes unchanged;
player input send cadence/payload/neutralization unchanged; camera helper has no
network calls or camera mutation; only authorized client/test/doc paths changed.

## Resumed verification — 2026-09-13

The requested branch and both task commits already existed on resumption,
with clean worktree and implementation head `ad877304fb928e550d0e220d7457892fe5f42bc3`.
Fetched origin, checked out main, confirmed fast-forward was already current at
`175d87f47f16c6c5bf343728e29814165a2d9258`, then returned to the task branch.
Repeated validation, then added one desktop regression explicitly proving that
W/S/A/D never overrides mouse aim and that mouse aim still changes while moving.
Final focused 94/94 (now including desktop) and full 123/123 PASS;
client/workspace typecheck, client/workspace build and diff checks PASS.
Runtime code was unchanged during this verification. The extra regression and
evidence update are included in the implementation commit to retain the requested
two-commit history.

The in-app browser was available on resumption. Local Vite and local Colyseus
were used; staging was not contacted. Browser observations:

- Desktop mouse aim/LMB fire produced a projectile; wheel up enlarged the view,
  wheel down reduced it; no touch overlay was present.
- Forced Touch at 844x390 rendered a matching 844x390 canvas with exactly MOVE,
  AIM / FIRE and LOBBY. Separate pointer drags exercised movement and aim/fire.
  Both sticks stayed 16px from the bottom/side edges; LOBBY stayed 16px from
  the top/right. Viewport meta includes viewport-fit=cover; all four safe-area
  env() references remain in CSS. Actual notch insets require a real device.
- LOBBY removed the touch overlay and restored the canvas touch-action value.
  No warning/error appeared in the browser log. Temporary browser viewport,
  input preference and local processes were cleaned up.

INFO: browser automation exposes single-pointer actions, so simultaneous
two-stick combat, independent strafe/fire and two-touch pinch were not manually
validated. Their identity/ownership, distance-ratio, cancellation and reset
paths pass the focused tests; no real-device validation is claimed.
Vite retains the existing >500 kB chunk warning. Optional zoom memory deferred;
each scene starts at .86. No push, PR, deployment or independent review executed.

## FIX1 — M001C-UX-01 (2026-09-13)

PA accepted the sole MEDIUM finding from independent Client/UX review of
`1ec9532d54fea69aeab8750708edfb65c6bceaed`: camera zoom scaled/displaced hudText,
connectionBanner and respawnText. All other reviewed areas remain accepted.
One additive FIX1 commit; no rebase or prior commit rewrite.

Runtime change is confined to MultiplayerGameScene. The three texts retain
scrollFactor(0); layout computes inverse camera origin/zoom positions and applies
scale 1/zoom. This algebraic inverse uses current camera properties, avoiding
the stale preRender matrix that getWorldPoint could otherwise read during update.
It matches this scene's unrotated main camera, including Phaser's pixel-rounded
camera-origin translation. No additional camera or generic UI helper.

Frame order: views -> input -> camera movement/zoom -> HUD content -> anchoring.
The per-frame anchorHud method only updates position/scale; word-wrap/font
layout remains on the existing resize/presentation path, avoiding text rebuilds
solely because the camera changed.
Resize and connection presentation also retain immediate layout. Word wrapping
uses screen width. Banner is inverse-scaled before its displayHeight * zoom is
used as screen-space height for the normal HUD's top offset.

Regression: installed Phaser TransformMatrix and GetCalcMatrix calculate final
rendered anchors, object axes and banner bounds, rather than only asserting
object positions/scales. At 844x390, zoom .40/.86/1.15 and camera scroll
(800,1400)/(9300,8700), HUD stays at (16,14), or (16,62) below a visible 36px
banner. Banner stays centered at x=422, top y=14; respawn stays centered at
(422,163.8). Effective rendered scale remains 1. The matrix is refreshed after
layout, matching render timing. A same-frame camera/content-change test covers
ordering; a negative control reproduces the reviewed old placement and proves
its .40 scale and displaced visual anchors fail the invariant.

Validation:

- `npm run test -w @burningspace/client -- test/hudAnchoring.test.ts test/cameraZoomInput.test.ts test/multiplayerInput.test.ts`: **43/43 PASS** (14 HUD regression cases).
- `npm run test -w @burningspace/client`: **137/137 PASS** (previous 123 plus 14).
- `npm run typecheck:client`: **PASS**.
- `npm run typecheck`: **PASS**.
- `npm run build:client` with `VITE_BURNINGSPACE_SERVER_URL=https://game-server.burningforge.dev`: **PASS**.
- `git diff --check`: **PASS**.

Combat sources, camera input helper/constants, protocol, 50 ms input schedule,
connection behavior, safe-area DOM controls and accepted physics are unchanged.
No server/shared/protocol/deploy/workflow/dependency/lockfile edits. Existing
Vite large-chunk warning remains INFO. No push, PR or deployment.
Next action: delta review of M001C-UX-01.

## Closure reconciliation - PERSIST-001, 2026-09-13

MOBILE-001C merged through PR #84 at
`3b3621d248a73f67e1bed89cd3c267d5539f2c34`. The human PA's PERSIST-001 handoff
confirms bounded client-only deployment, healthy public staging and usable
controls on a real phone. These are user-confirmed external observations; no
new deployment/device check or independent review verdict is fabricated here.
Previous awaiting-review/next-action/no-deployment statements above are historical
implementation checkpoints. Mobile is no longer active. The single deferred UX
debt entry and current persistence task are in [CURRENT](../handoffs/CURRENT.md).
