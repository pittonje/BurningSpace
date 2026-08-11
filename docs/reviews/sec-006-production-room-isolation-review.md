# SEC-006 Production Room Isolation Review

## Review metadata

- Task: `SEC-006 — TestBattleRoom Production Isolation`
- Branch: `game/wave1-sec-006-production-room-isolation`
- Base: `4ead74342ecc7ad9f2b647d4a21d63736a694502`
- Reviewed implementation commit:
  `a5e3251f230182f259083c340898f0b1455c0bf8`
- Pull request: #53

## Repository baseline

- Evidence:
  - `git branch --show-current` returns
    `game/wave1-sec-006-production-room-isolation`.
  - `git rev-parse HEAD` returns
    `a5e3251f230182f259083c340898f0b1455c0bf8`.
  - `gh pr view 53` reports `headRefOid`
    `a5e3251f230182f259083c340898f0b1455c0bf8`, `baseRefName` `main`,
    `state` `OPEN`, `isDraft` `false`, `mergeable` `MERGEABLE`, and
    `mergeStateStatus` `CLEAN`.
  - `git merge-base HEAD origin/main` returns
    `4ead74342ecc7ad9f2b647d4a21d63736a694502`, and
    `git rev-list --count <base>..HEAD` returns `1`
    (`a5e3251 fix(server): isolate diagnostic room from production bootstrap`).
  - `git rev-parse origin/main` returns
    `4ead74342ecc7ad9f2b647d4a21d63736a694502`, so `origin/main` has not
    advanced beyond the implementation merge-base and no newer accepted
    authority competes with this task.
  - `git status --short --branch` reports no modified, staged, or untracked
    tracked-tree entries; `git status --short --ignored` lists only ignored
    `node_modules/` and `dist/` directories.
  - `gh pr checks 53` on the implementation commit reports `checks` pass and
    `qa-review` pass.
- Findings: Baseline conforms. Branch, HEAD, PR head, merge-base, and single
  implementation commit all match the approved task baseline.

## Scope verification

- Evidence:
  - `git diff --name-status -M <base>...HEAD` returns exactly nine paths:
    - `M PROJECT_CONTEXT.md`
    - `M apps/client/scripts/network-client-callback-check.ts`
    - `M apps/server/src/index.ts`
    - `A apps/server/src/rooms/productionRoomRegistry.ts`
    - `A apps/server/test/productionRoomRegistry.test.ts`
    - `R097 apps/server/src/rooms/TestBattleRoom.ts →
      apps/server/test/support/TestBattleRoom.ts`
    - `M docs/handoffs/CURRENT.md`
    - `A docs/reviews/sec-006-production-room-isolation-review.md`
    - `A docs/tasks/sec-006-production-room-isolation.md`
  - Git detected the move as a rename at 97% similarity, so the nine logical
    changes occupy nine physical entries.
  - `git diff --stat` reports 9 files changed, 389 insertions, 49 deletions;
    the runtime portion is 4 changed lines across `index.ts`, the client
    diagnostic script, and the moved file's import, plus 55 added lines in the
    new registry and its test.
  - `git diff --check <base>...HEAD` reports no whitespace defects.
  - `git diff --name-only <base>...HEAD -- docs/decisions .github packages
    docs/roadmap docs/GOVERNANCE.md AGENTS.md CLAUDE.md` returns empty.
  - The client diagnostic change is a single line: the import specifier moves
    from `../../server/src/rooms/TestBattleRoom.js` to
    `../../server/test/support/TestBattleRoom.js`. No other line of that script
    changed, and no client runtime source under `apps/client/src` was touched.
- Findings: Scope conforms. Exactly the nine authorized logical changes are
  present, the client diagnostic edit is limited to preserving the reference
  after the move, and no unauthorized path appears.

## Production bootstrap

- Evidence:
  - `apps/server/src/index.ts` now imports only
    `registerProductionRooms` from `./rooms/productionRoomRegistry.js` and calls
    `registerProductionRooms(gameServer)`.
  - The diff against the base commit changes exactly two lines: the
    `BattleRoom` import is replaced by the registry import, and
    `gameServer.define('battle', BattleRoom)` is replaced by
    `registerProductionRooms(gameServer)`.
  - The `/health` handler, the 404 fallback, `const port = Number(process.env.PORT ?? 2567)`,
    the `createServer` / `WebSocketTransport` / `Server` construction, and the
    three `console.log` startup lines are byte-identical to the base commit.
  - The bootstrap imports no test-support module and defines no additional
    room.
  - Runtime smoke against the built bootstrap (`node apps/server/dist/index.js`
    with `PORT=2599`) produced the startup log lines
    `BurningSpace server listening on http://localhost:2599`,
    `Health endpoint: /health`, and `Colyseus room: battle`.
  - `GET /health` returned status `200` with body
    `{"ok":true,"service":"burningspace-server"}`; an unknown path returned
    status `404` with body `{"ok":false,"error":"not_found"}`.
- Findings: Bootstrap conforms. Registration is now explicit and delegated,
  the ad-hoc direct `define` call is gone, and health, port, transport, and
  logging behavior are unchanged.

## Production room registry

- Evidence:
  - `apps/server/src/rooms/productionRoomRegistry.ts` exports
    `productionRoomDefinitions` as `Object.freeze([...] as const)` with each
    entry independently wrapped in `Object.freeze({ name: 'battle', room: BattleRoom })`,
    so both the array and its single entry resist runtime mutation.
  - It exports `registerProductionRooms(registrar: ProductionRoomRegistrar)`,
    which iterates the frozen definitions and calls `registrar.define(name, room)`
    once per definition.
  - `ProductionRoomRegistrar` is a locally declared minimal structural
    interface (`define(name: string, room: typeof BattleRoom): unknown`). The
    module imports nothing from `colyseus` and touches no private or unstable
    Colyseus internals, which also lets the contract be unit tested without
    starting a network server.
  - The module imports only `BattleRoom` from `./BattleRoom.js`; the real
    production constructor is preserved by reference, not wrapped or subclassed.
  - `apps/server/src` contains exactly one `define` occurrence — line 16 of the
    registry. No second registry and no duplicate ad-hoc `define("battle", ...)`
    call exists anywhere in production source.
  - The registry introduces no message name, schema, snapshot, or other wire or
    gameplay contract.
- Findings: Registry conforms. It is the single explicit source of truth for
  production registration, contains exactly `battle → BattleRoom`, contains no
  diagnostic, debug, or sandbox definition, and imports no test support.

## Test-room isolation

- Evidence:
  - `git show <base>:apps/server/src/rooms/TestBattleRoom.ts` compared with
    `apps/server/test/support/TestBattleRoom.ts` differs on one line only: the
    import of `BattleRoom` changes from `./BattleRoom.js` to
    `../../src/rooms/BattleRoom.js`. Git records the move at 97% similarity.
  - `TestRoomMessages.SET_SHIP_STATE = 'test:setShipState'` is retained.
  - `class TestBattleRoom extends BattleRoom` still overrides `onCreate`, calls
    `super.onCreate()`, and registers the same diagnostic message handler.
  - `handleSetShipState` retains identical validation (`isTestSetShipStateMessage`),
    identical clamping against `NETWORK_SHIP_RADIUS`, `WORLD_WIDTH`,
    `WORLD_HEIGHT`, and `NETWORK_SHIP_MAX_HEALTH`, and identical
    `velocityX`/`velocityY` zeroing.
  - `apps/server/test/support/TestBattleRoom.ts` is not re-exported from any
    barrel; `apps/server/src` contains no index or barrel module that re-exports
    room classes.
  - `apps/server/tsconfig.json` declares `"rootDir": "src"` and
    `"include": ["src"]`, so the moved file is outside the production program.
- Findings: Test-room isolation conforms. The diagnostic is semantically
  unchanged apart from the import path required by the move, and it is now
  outside the production source tree and the production build graph.

## Production import graph

- Evidence:
  - A repository-wide search for `TestBattleRoom`, `TestRoomMessages`,
    `test:setShipState`, and `server/test/support` classifies every executable
    hit as follows:
    - test support — `apps/server/test/support/TestBattleRoom.ts`;
    - test — `apps/server/test/productionRoomRegistry.test.ts` (lines 8, 32);
    - diagnostic/static-check script —
      `apps/client/scripts/network-client-callback-check.ts` (lines 16, 75, 134);
    - historical documentation — `README.md`, `docs/architecture/**`,
      `docs/roadmap/**`, `docs/tasks/**`, `docs/reviews/**`.
  - No file under `apps/server/src` or `apps/client/src` references
    `TestBattleRoom`, `TestRoomMessages`, or `apps/server/test`.
  - No production source imports from `apps/server/test`; a search for
    `from '../test` and `from '../../test` inside `apps/server/src` returns no
    hits.
  - The registry contains no dynamic `import()`, glob, alias, or barrel export;
    the only registration path is the frozen literal definition list.
  - `apps/server/package.json` builds with `tsc -p tsconfig.json`, whose
    `outDir` is `dist` and whose `rootDir`/`include` are both `src`, so
    `apps/server/dist` is the production build-output directory and test support
    cannot enter it.
  - `apps/server/dist` was deleted and regenerated by `npm run build`. The
    clean rebuild contains 13 files: `index.js`, `rooms/BattleRoom.js`,
    `rooms/productionRoomRegistry.js`, four `schema/*.js`, four `systems/*.js`,
    and two `validation/*.js`. No `TestBattleRoom.js` and no `test` directory
    are emitted.
  - Scanning `apps/server/dist`, `apps/client/dist`, and every `packages/*/dist`
    for `TestBattleRoom`, `TestRoomMessages`, `test:setShipState`, and
    `server/test/support` returns no matches.
  - The client diagnostic script is executed only through
    `npx tsx apps/client/scripts/network-client-callback-check.ts`. It is
    excluded from `apps/client/tsconfig.json` (`"include": ["src"]`) and is not
    part of the Vite build input, so it is not a production runtime dependency.
    It starts its own ephemeral loopback Colyseus server on an OS-assigned port
    and registers `battle-test` only on that local instance.
  - The `rootDir` boundary is enforced by the compiler, not only by convention.
    A reproduction using the repository's TypeScript version with the same
    `rootDir`/`include` settings, compiling a `src` file that imports a sibling
    `test/support` file, fails with
    `error TS6059: File ... is not under 'rootDir' ...`. Because `npm run build`
    and `npm run typecheck` are required checks in `.github/workflows/pr-checks.yml`,
    any future production import of test support fails remotely at compile time.
- Findings: Import graph conforms. `TestBattleRoom` is unreachable from the
  production module graph at source, build, and runtime, and the boundary is
  additionally enforced by `rootDir` at compile time.

## Diagnostic capability preservation

- Evidence:
  - `npx tsx apps/client/scripts/network-client-callback-check.ts` exits `0`
    and prints `"ok": true`.
  - The run exercised three joins plus a rejoin, faction assignment, profile
    lifecycle including a rename to `AliceNew` and a spectator profile, ship
    add/change/remove events, 16 projectile lifecycles, nine damage events at
    `hit:...:15`, ship removal on disconnect, and the reported
    `respawnDelayMs: 3000`, `inputTimeoutMs: 300`, and
    `spawnInvulnerabilityMs: 2000` values.
  - `profileErrorKeptConnection: true` confirms the profile-error path still
    preserves the connection.
  - The script drove that scenario through the relocated
    `apps/server/test/support/TestBattleRoom.ts` import and the
    `TestRoomMessages.SET_SHIP_STATE` diagnostic message.
  - `npx tsx apps/server/scripts/movement-check.ts` and
    `npx tsx apps/server/scripts/combat-check.ts` each exit `0` and print
    `{"ok": true}`.
- Findings: Diagnostic capability conforms. Multi-client movement, combat,
  damage, death, respawn, invulnerability, spectator, and projectile-lifetime
  diagnostics all still run against the relocated test room, with no weakening
  and no expansion into production.

## Automated exposure guard

- Evidence:
  - `apps/server/test/productionRoomRegistry.test.ts` contains three tests, all
    passing, and exercises only the exported registry contract — no private or
    internal Colyseus surface.
  - Test 1 asserts `productionRoomDefinitions.map(({ name }) => name)` equals
    `['battle']` and `.map(({ room }) => room)` equals `[BattleRoom]`. Both are
    exact-equality assertions, so any added, removed, renamed, or substituted
    definition fails.
  - Test 2 drives `registerProductionRooms` through a recording stub registrar
    and asserts the captured registrations equal exactly
    `[{ name: 'battle', room: BattleRoom }]`. This proves registration happens
    exactly once, with the real `BattleRoom` constructor, and fails on any
    duplicate or additional `define` call made through the registry.
  - Test 3 asserts `productionRoomDefinitions` does not contain
    `TestBattleRoom` and that no definition name matches
    `/test|diagnostic|debug|sandbox/i`.
  - Collectively the three tests cover all required invariants: the exact name
    list, single registration, exact constructor identity, `TestBattleRoom`
    absence, forbidden-name rejection, and failure on a silently added second
    room. Adding a diagnostic room to `productionRoomDefinitions` fails tests 1
    and 2 on exact equality, and additionally fails test 3 if it carries a
    forbidden name — so exposure requires a deliberate, reviewable test change.
  - Beyond the unit guard, the runtime smoke against the built bootstrap
    confirmed the shipped behavior directly: `joinOrCreate('battle')` succeeded
    and returned room name `battle`, while `battle-test`, `test`, `diagnostic`,
    `debug`, and `sandbox` each failed with
    `provided room name "<name>" not defined`.
- Findings: The exposure guard conforms and fails closed for every route
  through the production registry. One scope limitation is recorded as a
  non-blocking note: the guard asserts on the registry contract, not on
  `apps/server/src/index.ts`, so a future ad-hoc `define` added directly to the
  bootstrap would not fail these tests. That route is not present on this
  commit, is the exact pattern SEC-006 removed, and cannot register test
  support without failing `rootDir` compilation.

## Behavior-preservation verification

- Evidence:
  - The complete runtime diff is four changed lines plus two new files. No
    hunk touches gameplay logic.
  - `apps/server/src/rooms/BattleRoom.ts`, every file under
    `apps/server/src/systems/`, `apps/server/src/schema/`, and
    `apps/server/src/validation/`, and every file under `packages/` are absent
    from `git diff --name-only <base>...HEAD`.
  - No message name, snapshot shape, schema field, or public contract appears
    anywhere in the diff.
  - `apps/client/src` is untouched, so client rendering is unchanged.
  - The network-client callback diagnostic reproduced the same movement,
    combat, projectile, damage, death, respawn, invulnerability, spectator, and
    profile behavior, with `respawnDelayMs`, `inputTimeoutMs`, and
    `spawnInvulnerabilityMs` unchanged.
  - `/health` response body and status, the 404 body and status, port
    resolution, and all three startup log lines were confirmed identical at
    runtime.
- Findings: Behavior preservation conforms. The only intended behavior change
  is structural — production registration became explicit and the diagnostic
  room became test-only. Movement, combat, projectile creation and collision,
  damage, death, respawn, faction logic, player profile, spectator behavior,
  message names, snapshots, and client rendering are all unchanged.

## Dependency verification

- Evidence:
  - `git diff --name-only <base>...HEAD -- package.json package-lock.json
    "*/package.json" "*/package-lock.json" "**/package.json"
    "**/package-lock.json"` returns empty.
  - No manifest, lockfile, or workflow file appears in the nine changed paths.
  - The new registry imports only the existing local `BattleRoom` module; the
    new test imports only `vitest`, the registry, `BattleRoom`, and the moved
    test support. No new dependency is required.
  - `vitest.config.ts` already includes `apps/server/test/**/*.test.ts`, so the
    new test is collected by the existing configuration without change.
  - `apps/server/tsconfig.json` already scopes the production program to `src`,
    so the moved test support is legitimately supported without configuration
    change.
- Findings: Dependency verification conforms. No manifest, lockfile, or
  dependency change was introduced, and existing TypeScript and Vitest
  configuration supports both new files unmodified.

## Server typecheck

- Evidence:
  - `npm run typecheck` at the repository root ran
    `npm run typecheck --workspaces` across all six workspaces
    (`tsc --noEmit -p tsconfig.json` for the packages and server, `tsc --noEmit`
    for the client) and exited successfully with no diagnostics.
  - The structural `ProductionRoomRegistrar` interface accepts the Colyseus
    `Server` instance in `index.ts` without a cast; the server typecheck passing
    is the evidence.
- Findings: Typecheck conforms. All workspaces typecheck cleanly.

## Server build

- Evidence:
  - `apps/server/dist` was deleted before building to force a clean emit.
  - `npm run build` ran `npm run build --workspaces` and exited `0`. The client
    build completed via `tsc --noEmit && vite build` (108 modules transformed).
    The pre-existing chunk-size advisory is unrelated to this change.
  - The regenerated `apps/server/dist` contains 13 files and no diagnostic
    artifact.
  - `npm run check:protocol-profile` exited `0` and printed
    `Profile protocol compatibility check passed.`
- Findings: Build conforms. All workspaces build, production output excludes
  test support, and protocol-profile validation remains green.

## Repository tests

- Evidence:
  - `npm test` (`vitest run`) reports `Test Files 5 passed (5)` and
    `Tests 34 passed (34)`.
  - The per-file breakdown accounts for every test:
    `packages/protocol/test/profileBoundary.test.ts` (3),
    `apps/server/test/combat.test.ts` (4),
    `apps/server/test/outpostRespawn.test.ts` (13),
    `apps/server/test/playerInput.test.ts` (11), and
    `apps/server/test/productionRoomRegistry.test.ts` (3).
  - `git ls-tree -r --name-only <base> -- apps/server/test` shows the base
    commit had three server test files; the reported total is therefore the
    pre-existing 31 tests plus the 3 new registry tests.
  - No test is reported as skipped, todo, or filtered.
  - `apps/server/test/support/TestBattleRoom.ts` is not matched by the Vitest
    `include` glob, so it is imported as support rather than collected as a
    suite.
- Findings: Repository tests conform. The new registry test is included in
  `npm test`, the reported count is fully explained, and nothing is silently
  skipped.

## Validation summary

| Command | Result |
|---|---|
| `npm test` | Pass — 5 files, 34 tests, 0 skipped |
| `npm run typecheck` | Pass — all six workspaces |
| `npm run build` | Pass — all workspaces, clean server emit |
| `npm run check:protocol-profile` | Pass — `Profile protocol compatibility check passed.` |
| `npx tsx apps/client/scripts/network-client-callback-check.ts` | Pass — exit `0`, `"ok": true` |
| `npx tsx apps/server/scripts/movement-check.ts` | Pass — exit `0`, `{"ok": true}` |
| `npx tsx apps/server/scripts/combat-check.ts` | Pass — exit `0`, `{"ok": true}` |
| Production bootstrap smoke (`node apps/server/dist/index.js`) | Pass — `battle` registered, all probed diagnostic names undefined, `/health` `200`, clean shutdown |

Evidence limitation: the repository commits no dedicated production-startup
smoke script. The production smoke used only the committed `start` path
(`node dist/index.js`, per `apps/server/package.json`) on `PORT=2599`, probed
`/health` and room registration through the existing `colyseus.js` dependency,
and terminated the process. No repository file was created or modified for it,
and no server process was left running.

## Documentation transition

- Evidence:
  - `docs/tasks/sec-006-production-room-isolation.md` records Wave 1 active,
    SEC-006 as the first bounded runtime task, DOCARCH-004 open but paused,
    DOCARCH-004C v1 / PR #51 as frozen draft historical methodology evidence,
    Attempt 5 not authorized, DOCARCH-004D not active, and the accepted count
    35 with the category split 18 `BS-MECH`, 5 `GAME-001`, 7 `BS-ARCH`,
    4 `BS-PROC`, 1 `CI`.
  - It states the task introduces and changes no accepted decision.
  - Its "Exact changed paths" section lists all nine authorized paths,
    including `apps/client/scripts/network-client-callback-check.ts`, and
    explains that path as the single additional direct reference found by the
    mandatory pre-move search. The listed paths match the observed diff exactly.
  - It records implementation objectives, explicit non-goals, required tests
    and verification, reviewer routing with reasons for the three skipped
    reviewers, and closure conditions.
  - The post-merge boundary is stated as "Production-room multi-client
    authority test harness covering the real `BattleRoom` path" with the
    explicit note "This boundary receives no new canonical task ID here". It is
    a boundary description, not an invented accepted ID, and it matches the
    Wave 1 scope already recorded in
    `docs/roadmap/CANONICAL_DEVELOPMENT_ROADMAP.md`.
  - The review artifact as created at `a5e3251` contained the review metadata
    block, all seventeen verification sections, six reviewer sections with
    blank verdicts, no prefilled evidence, and no requirement that the artifact
    self-reference its own commit SHA — consistent with `BS-PROC-004`.
- Findings: Documentation transition conforms.

## CURRENT state

- Evidence:
  - `docs/handoffs/CURRENT.md` records PR #50 / DOCARCH-004B merged at
    `4ead74342ecc7ad9f2b647d4a21d63736a694502`, which matches the merge commit
    in `git log` and the current `origin/main`.
  - It records the Architect Takeover Protocol as canonical and subordinate to
    governance and accepted decisions; DOCARCH-004 open but paused;
    DOCARCH-004C v1 / PR #51 open and draft as frozen historical methodology
    evidence; Attempt 5 not authorized; DOCARCH-004D not active.
  - It records Wave 1 active, runtime implementation resumed, SEC-006 as the
    sole active bounded task, branch
    `game/wave1-sec-006-production-room-isolation`, task path
    `docs/tasks/sec-006-production-room-isolation.md`, review path
    `docs/reviews/sec-006-production-room-isolation-review.md`, and the accepted
    count 35 with its category split.
  - It records that SEC-006 introduces no accepted decision and authorizes no
    mechanics, protocol, schema, wire-message, package-boundary, dependency,
    manifest, lockfile, or workflow change, and that DOCARCH-005 remains
    deferred.
  - It contains exactly one `## Next safe action` heading; its four headings are
    `## Repository state`, `## Authorization and boundaries`, `## Merge gate`,
    and `## Next safe action`.
  - The sole action reads: "Independent reviewers complete the SEC-006
    production-room-isolation conformance review on the final PR head."
  - It makes none of the forbidden claims: it does not say SEC-006 is merged,
    Wave 1 is complete, DOCARCH-004 is closed, DOCARCH-004D is active, PR #51 is
    closed, Attempt 5 is authorized, or that a later runtime task is active.
- Findings: CURRENT conforms.

## PROJECT_CONTEXT state

- Evidence:
  - `PROJECT_CONTEXT.md` records the takeover protocol as canonical after the
    human merge of PR #50 and subordinate to governance and accepted decisions.
  - Its "Current program state" section records DOCARCH-004 open but paused,
    DOCARCH-004C v1 / PR #51 frozen draft historical evidence, Attempt 5 not
    authorized, DOCARCH-004D not active, runtime development resumed, Wave 1
    active, SEC-006 as the current bounded runtime task, and the accepted count
    35.
  - It records the server-authoritative multiplayer arena as the implementation
    foundation and the local `GameScene` as preserved non-authoritative
    prototype material, consistent with `BS-ARCH-001` and `BS-ARCH-007`.
  - It names `CURRENT` as the live operational source.
  - It does not duplicate the task file or any methodology audit; the SEC-006
    reference is two sentences plus one deferred-work bullet.
  - A search for hexadecimal commit-like tokens in `PROJECT_CONTEXT.md` returns
    none, so no transient implementation or review SHA was introduced.
  - It does not claim SEC-006 complete, Wave 1 complete, or DOCARCH-004 closed.
- Findings: PROJECT_CONTEXT conforms.

## Accepted-count verification

- Evidence:
  - `docs/decisions/` contains 38 files: `README.md`, `DECISION_TEMPLATE.md`,
    `DECISION_INDEX.md`, and 35 decision records.
  - The 35 records split as 18 `BS-MECH` (005, 006, 013–028), 5 `GAME-001`
    (D1–D5), 7 `BS-ARCH` (001–007), 4 `BS-PROC` (001–004), and 1 `CI`
    (`CI-003-D1`), matching the counts stated in the task and `CURRENT.md`.
  - Every one of the 35 records reports `Status: accepted`.
  - `git diff --name-only <base>...HEAD -- docs/decisions` returns empty, so no
    accepted decision file and no `DECISION_INDEX.md` line changed.
  - The diff introduces no new accepted semantic; the task and `CURRENT.md`
    both state explicitly that SEC-006 creates no decision.
- Findings: Accepted-count verification conforms.

## PR #51 preservation

- Evidence:
  - `gh pr view 51 --json state,isDraft,headRefOid,url` reports `state` `OPEN`,
    `isDraft` `true`, and `headRefOid`
    `d0fd34d46d6bb20c58b4b9b049901aadbab452a6`.
  - No action of any kind was taken on PR #51 during this review.
  - `CURRENT.md` and `PROJECT_CONTEXT.md` both describe it as frozen draft
    historical evidence, which matches the observed remote state.
- Findings: PR #51 preservation conforms. It remains open, draft, and untouched.

## Blocking findings

None. No blocking finding was identified by the Architecture, Security/CI,
Test/Quality, or Documentation consistency review.

## Non-blocking notes

1. **`npm test` is not a required remote check.**
   `.github/workflows/pr-checks.yml` runs the trusted-routing audit, `npm run build`,
   `npm run typecheck`, `npm run check:protocol-profile`, and the three
   diagnostic scripts, but never `npm test`. The new exposure guard therefore
   has local evidence only and is not durably enforced on future pull requests.
   This is classified non-blocking because no accepted process record and no
   SEC-006 closure condition mandates `npm test` as a required remote check:
   `BS-PROC-004` requires reviewer evidence and passing required checks without
   naming the check set, `CI-003-D1` governs QA routing only, and the SEC-006
   closure conditions require local validation to pass rather than to be
   remotely enforced. Local evidence is complete and reproducible. Recommend a
   separate bounded CI task to add `npm test` to `pr-checks.yml` if durable
   remote enforcement is desired. No workflow change was made in this pull
   request.

2. **The exposure guard is registry-scoped, not bootstrap-scoped.**
   `productionRoomRegistry.test.ts` asserts on the exported registry contract.
   A future ad-hoc `gameServer.define(...)` added directly to
   `apps/server/src/index.ts` would bypass those assertions. This is not
   present on the reviewed commit and is materially constrained: registering
   test support that way fails `rootDir` compilation under `npm run build` and
   `npm run typecheck`, which are required remote checks. Optional hardening
   outside SEC-006 scope: assert on the bootstrap's realized registrations, or
   add a lint rule forbidding `define(` outside the registry module.

3. **The relocated test support lost static typecheck coverage.**
   `apps/server/test/support/TestBattleRoom.ts` moved from `src` (covered by
   `tsc --noEmit -p tsconfig.json`) to `apps/server/test`, which no tsconfig
   includes. Vitest transpiles without type checking, so type errors in that
   file would no longer surface in `npm run typecheck`. This matches the
   pre-existing treatment of the three older files in `apps/server/test` and is
   the direct cost of the isolation the task required. Optional follow-up: a
   dedicated `tsconfig.test.json` covering `apps/server/test`.

4. **Stale historical path references to the pre-move location.**
   `docs/architecture/shared-package-inventory.md:17` and
   `docs/roadmap/DOCARCH-003_READINESS_BASELINE.md:56,63` still cite
   `apps/server/src/rooms/TestBattleRoom.ts`. Both are dated audit and baseline
   evidence outside executable source and outside the nine authorized paths, so
   correcting them here would have exceeded scope.

5. **Pre-existing staleness in the decision registry prose.**
   `docs/decisions/README.md` and the "DOCARCH-002D status" section of
   `docs/decisions/DECISION_INDEX.md` still describe DOCARCH-002D3 as the
   active candidate. This predates SEC-006, was correctly left unchanged, and
   does not affect the accepted count, which remains verified at 35.

## 1. Product Architect

- Verdict: `APPROVED FOR HUMAN MERGE WITH QA INFRASTRUCTURE OVERRIDE`
- Reviewed commit: `0ee7c0afa6906fd64967564a7befb13bb041dc50`
- Evidence source: Owner-authored Product Architect approval on PR #53:
  https://github.com/pittonje/BurningSpace/pull/53#issuecomment-5248436466
- Date: 2026-08-11

Rationale: The Product Architect accepted the completed independent review,
which is `APPROVED WITH NON-BLOCKING NOTES`, confirmed that blocking findings
are `NONE`, verified the passing Core Pull Request Checks and full local
validation, and classified the unavailable Claude QA result as a non-blocking
infrastructure/output-format failure after the single permitted rerun. Human
merge is authorized after this override is recorded and Core Pull Request
Checks pass on the final head.

## 2. Architecture Reviewer

- Verdict: `APPROVED`
- Reviewed commit: `a5e3251f230182f259083c340898f0b1455c0bf8`
- Evidence source: Independent conformance review of PR #53 — repository state,
  scope and diff verification, production bootstrap, production room registry,
  test-room isolation, production import graph, build-output inspection, and
  behavior-preservation verification recorded above.
- Date: 2026-08-11

Rationale: The explicit immutable registry is the single source of truth for
production registration and holds exactly `battle → BattleRoom`. The bootstrap
consumes it without importing `BattleRoom` or any diagnostic symbol. The
production/test source-graph boundary is clean at source, build output, and
runtime, and is additionally enforced by the compiler through
`rootDir: "src"`. The registry depends on a locally declared structural
interface rather than Colyseus internals, introduces no wire or gameplay
contract, and preserves `BS-ARCH-001` server authority and the `BS-ARCH-004` /
`BS-ARCH-005` package boundaries unchanged.

## 3. Security/CI Reviewer

- Verdict: `APPROVED WITH NON-BLOCKING NOTES`
- Reviewed commit: `a5e3251f230182f259083c340898f0b1455c0bf8`
- Evidence source: Independent conformance review of PR #53 — production import
  graph, clean-rebuild build-output scan, automated exposure guard analysis,
  production bootstrap runtime smoke, `.github/workflows/pr-checks.yml`
  inspection, dependency verification, and PR #51 state check recorded above.
- Date: 2026-08-11

Rationale: Direct production exposure of the diagnostic room is structurally
prevented. `TestBattleRoom` is absent from production source, from the
regenerated `apps/server/dist`, and from the running server, where `battle`
joins successfully while `battle-test`, `test`, `diagnostic`, `debug`, and
`sandbox` are all reported undefined. No diagnostic message is reachable
through the production bootstrap. Accidental future registration through the
registry is guarded by a fail-closed test, and accidental production import of
test support fails compilation under checks that already run remotely. No
branch-protection, workflow, secret, permission, or dependency change was
introduced; trusted-base CI routing under `CI-003-D1` is untouched; no existing
check was weakened. PR #51 remains open and draft, and no action was taken on
it. Non-blocking notes 1 and 2 record the CI coverage gap and the
registry-scoped limit of the guard.

## 4. Test/Quality Reviewer

- Verdict: `APPROVED WITH NON-BLOCKING NOTES`
- Reviewed commit: `a5e3251f230182f259083c340898f0b1455c0bf8`
- Evidence source: Independent conformance review of PR #53 — `npm test`,
  `npm run typecheck`, `npm run build`, `npm run check:protocol-profile`, the
  three committed diagnostic scripts, the production bootstrap smoke, and the
  guard-coverage analysis recorded above.
- Date: 2026-08-11

Rationale: All four required commands exit successfully. `npm test` reports 5
files and 34 tests passing with none skipped, and the count is fully explained
by the 31 pre-existing tests plus the 3 new registry tests. The new test is
collected by the existing Vitest configuration and exercises the exported
contract with exact-equality assertions, so any added, renamed, duplicated, or
substituted production definition fails deterministically. Diagnostic
capability is preserved end to end: the network-client callback check still
drives multi-client movement, combat, damage, death, respawn, invulnerability,
spectator, and projectile behavior through the relocated test room and returns
`"ok": true`. Non-blocking notes 2 and 3 record the guard's registry scope and
the loss of static typecheck coverage on the relocated support file.

## 5. Documentation consistency review

- Verdict: `APPROVED WITH NON-BLOCKING NOTES`
- Reviewed commit: `a5e3251f230182f259083c340898f0b1455c0bf8`
- Evidence source: Independent conformance review of PR #53 — documentation
  transition, CURRENT state, PROJECT_CONTEXT state, accepted-count
  verification, and reference-classification results recorded above.
- Date: 2026-08-11

Rationale: The task file, review skeleton, `CURRENT.md`, `PROJECT_CONTEXT.md`,
the canonical roadmap, and the decision registry agree. The task's exact
changed paths match the observed diff, the post-merge boundary is described
without inventing a canonical ID, and the review skeleton was created with
blank verdicts and no self-referencing SHA requirement, consistent with
`BS-PROC-004`. `CURRENT.md` carries exactly one `## Next safe action` heading
with the required meaning and makes no false state claim. `PROJECT_CONTEXT.md`
stays concise, carries no transient SHA, and claims no completion. The accepted
count is independently verified at 35 with the stated category split, and no
decision file or index line changed. Non-blocking notes 4 and 5 record stale
historical path references and pre-existing registry prose, both outside the
authorized scope of this task.

## 6. Claude QA

- Verdict: `UNAVAILABLE — NON-BLOCKING INFRASTRUCTURE FAILURE`
- Reviewed commit: `0ee7c0afa6906fd64967564a7befb13bb041dc50`
- Evidence source:
  - Initial invocation — workflow run ID `31452472458`, attempt 1:
    https://github.com/pittonje/BurningSpace/actions/runs/31452472458/attempts/1
    (`qa-review` job `93659421408`:
    https://github.com/pittonje/BurningSpace/actions/runs/31452472458/job/93659421408;
    failure notice:
    https://github.com/pittonje/BurningSpace/pull/53#issuecomment-5248345652).
  - Single permitted manual rerun on the identical head — workflow run ID
    `31452472458`, attempt 2:
    https://github.com/pittonje/BurningSpace/actions/runs/31452472458/attempts/2
    (`qa-review` job `93661491864`:
    https://github.com/pittonje/BurningSpace/actions/runs/31452472458/job/93661491864;
    failure notice:
    https://github.com/pittonje/BurningSpace/pull/53#issuecomment-5248422237).
  - Product Architect QA infrastructure override:
    https://github.com/pittonje/BurningSpace/pull/53#issuecomment-5248436466
- Date: 2026-08-11

Evidence state:

- The initial Claude QA invocation on reviewed head
  `0ee7c0afa6906fd64967564a7befb13bb041dc50` failed during structured
  execution/output validation.
- One manual rerun on the identical head also failed during QA
  output-validation/publication.
- Neither run produced a substantive `CHANGES REQUIRED` finding.
- The Product Architect explicitly accepted the unavailable QA result as
  non-blocking after the single permitted infrastructure rerun.
- Further manual QA reruns are not required for SEC-006.
