# PERSIST-002 — Durable World & Identity Foundation

Owner: Product Architect
Risk: HIGH — authentication / persistence / runtime authority
Base: `98bda8f5bed41112f5687eb4ef2fd52a0c82950a` (`origin/main`, merge commit of PR #85)
Branch: `feat/persist-002-durable-world-identity-foundation`

## Authority

PERSIST-001 is MERGED / CLOSED. Its accepted architecture and
[`BS-ARCH-008`](../decisions/BS-ARCH-008.md) through
[`BS-ARCH-011`](../decisions/BS-ARCH-011.md) are the governing authority for
this task. This task does not reopen or reinterpret PERSIST-001 decisions.

- Task: [PERSIST-001 — Persistent World & Durable Identity Architecture](persist-001-persistence-identity-architecture.md)
- Architecture: [Persistent World and Durable Identity Architecture](../architecture/PERSISTENT_WORLD_IDENTITY_ARCHITECTURE.md)
- Review: [PERSIST-001 Architecture / Security Review](../reviews/persist-001-architecture-security-review.md) — APPROVE, 0 BLOCKER / 0 HIGH / 0 MEDIUM
- Merge: PR #85, merge commit `98bda8f5bed41112f5687eb4ef2fd52a0c82950a`

## Scope

PERSIST-002 implements:

- PostgreSQL integration;
- versioned schema/migrations;
- migration/status/bootstrap tools;
- durable guest identity;
- recovery credential;
- world membership/faction persistence;
- gameplay leases;
- writer fencing;
- singleton canonical world lifecycle;
- readiness integration;
- Level 1 reconnect ownership validation;
- Level 2 durable recovery;
- minimum client credential storage/error UX;
- real PostgreSQL integration tests;
- backup/restore evidence;
- repository-only staging PostgreSQL definition.

## Explicit non-goals

- sectors;
- outposts;
- turrets;
- economy;
- mining;
- logistics;
- portals;
- persistent projectiles;
- durable combat health;
- durable ship transform;
- broad account/auth system;
- email/password/OAuth;
- horizontal server scaling;
- production HA.

## Implementation phases

The approved seven-packet sequence:

1. **Packet 1** — authority + reconciliation (this packet).
2. **Packet 2** — PostgreSQL dependency, lockfile, migration 001, migration
   runner/status, real-PG test DB.
3. **Packet 3** — race-safe world bootstrap, writer fencing, monotonic local
   deadline, readiness.
4. **Packet 4** — guest credential + HTTP identity/discovery endpoints.
5. **Packet 5** — BattleRoom identity wiring, static-safe DI, fresh-auth rate
   limiting, Level 1 reconnect, client identity/discovery flow, existing test
   migration.
6. **Packet 6** — durable membership/faction + gameplay leases + full
   persistence test matrix.
7. **Packet 7** — DB-required container CI, backup/restore proof,
   repository-only staging DB definition.

## Execution directives

1. No push and no PR between Packets 1–6. All seven implementation packets
   are executed locally as sequential commits. First push/PR is allowed only
   after Packet 7 and a complete local validation pass. This avoids knowingly
   publishing intermediate heads whose staging-container CI cannot yet pass
   after DB-required startup is introduced.

2. Canonical server boot order for later implementation:

   ```text
   configuration
   → PostgreSQL connectivity
   → migration/schema compatibility
   → canonical world lookup
   → writer claim / stale operational reconciliation
   → install production room persistence dependencies
   → register production room handler
   → create exactly one canonical BattleRoom
   → publish current roomId for discovery
   → mark RuntimeLifecycle ready
   ```

   Never create the canonical room before the room handler is registered.

3. Backup/restore proof: acceptance backup will use a genuinely
   quiesced/stopped writer. Additionally, a separate real-PostgreSQL recovery
   test must prove that restored or seeded stale active/recovering
   operational leases from an obsolete writer epoch cannot reactivate after a
   new boot.

## Review routing

Required final implementation reviews:

- Architecture
- Network
- Security
- QA

Gameplay: Recommended only; this implementation enforces accepted
faction/session authority rather than changing an accepted gameplay rule.

Visual: Not applicable for the planned minimal reuse of existing
status/error surfaces. If implementation later materially changes
layout/presentation, reconsider this.

Heavy independent reviews should use Claude sessions, not Codex. Mandatory
governed PR checks remain required. Human merge only.

## Deployment boundary

PERSIST-002 implementation does NOT authorize:

- Contabo/VPS access;
- staging DB creation;
- deployment;
- image publication;
- container replacement;
- Caddy changes;
- DNS changes;
- TLS changes;
- production launch.

`deploy/docker-compose.staging.db.yml`, when eventually authored in Packet 7,
is repository preparation only. Actual staging rollout is a separate future
bounded operation.

## Acceptance contract

The PERSIST-001 19-step foundation proof. At minimum:

1. start PostgreSQL;
2. migrate empty DB;
3. explicit world bootstrap;
4. server ready only after persistence recovery;
5. create durable guest identity;
6. assign faction;
7. verify player/world UUID + faction persisted;
8. disconnect;
9. restart application while DB survives, including crash scenario;
10. reconnect with retained credential;
11. same durable player UUID;
12. same faction/world UUID;
13. new transient sessionId/process identity;
14. concurrent duplicate gameplay ownership rejected;
15. stale ownership recoverable within bounded time;
16. invalid/revoked credential and forged UUID cannot claim identity;
17. create backup;
18. restore to fresh isolated DB;
19. prove identity/world/faction/revision/revocation survive and stale
    sessions do not reactivate.

Do not claim battle-state durability.

## Status

**IMPLEMENTATION PUSHED AS PR #86 (OPEN). CORE PR CHECKS: SUCCESS AT
IMPLEMENTATION CHECKPOINT `0dba3e74562b3d0e395a5cad2a29732512e68515`, AGAIN
AT QA-RECOVERY-001 HEAD `f146a3f2480525f13ae6691bd1fa75cb96927a8f`, AND
AGAIN AT QA-RECOVERY-002 HEAD `097cb92804ede1449f3fc1dca1a8a063f9aa3cef`,
WHERE GOVERNED CLAUDE QA ALSO RAN AND RETURNED "APPROVED WITH
SUGGESTIONS". AN INDEPENDENT ARCHITECTURE REVIEW OF THAT HEAD THEN RAISED
PERSIST002-C-01 (MEDIUM); PRODUCT ARCHITECT DISPOSITION WAS
REQUEST_CHANGES. ARCH-FIX1 IMPLEMENTED THE RUNTIME FIX, INDEPENDENTLY
**CLOSED** AT `cc87ab0c679acbce5c16f866f84780c1804c4e31`. THAT SAME DELTA
REVIEW FOUND TWO PROBLEMS IN ARCH-FIX1's OWN TEST EVIDENCE
(REVIEW-C01-A: A RESOURCE-LEAK IN THE TEARDOWN-WINDOW SCENARIO'S CLEANUP;
REVIEW-C01-B: A NON-DISCRIMINATING MISSING-CAPABILITY REGRESSION), SO
ARCH-FIX1's OVERALL DELTA DISPOSITION REMAINED REQUEST_CHANGES.
ARCH-FIX2 CORRECTED BOTH WITH ITS OWN NEGATIVE-CONTROL EVIDENCE.
INDEPENDENT REVIEW OF ARCH-FIX2 THEN CLOSED REVIEW-C01-B AND CONFIRMED
A'S SUCCESSFUL-PATH CLEANUP, BUT FOUND ITS EARLY-ASSERTION-FAILURE
CLEANUP PATH STILL DEFECTIVE. ARCH-FIX3 (BELOW) MOVES ALL CLEANUP
RESPONSIBILITY INTO THE HARNESS'S GUARANTEED `stop()` PATH, WITH A
PERMANENT REGRESSION AND A SCRATCH FAILURE-PROBE REPRODUCING AND THEN
RESOLVING THE CONFIRMED DEFECT. IT DOES NOT REOPEN THE ALREADY-CLOSED
RUNTIME FIX OR REVIEW-C01-B. INDEPENDENT VERIFICATION OF THE REMAINING
REVIEW-C01-A EARLY-FAILURE PATH, CORE/QA FOR THE ARCH-FIX3 HEAD, PRODUCT
ARCHITECT FINAL ACCEPTANCE, AND HUMAN MERGE ALL REMAIN OUTSTANDING.**

All seven implementation packets plus four bounded post-implementation
corrections (FIX1–FIX4) are pushed as local sequential commits on
`feat/persist-002-durable-world-identity-foundation`
([PR #86](https://github.com/pittonje/BurningSpace/pull/86), OPEN, not
merged, no auto-merge). Nothing merged, no staging deployment, no
VPS/Contabo contact, no image publication.

Local acceptance evidence gathered (Packet 7):

- Full real-PostgreSQL test suite (48 files / 446 tests) green, 0 skipped,
  0 failures, run against the real Packet-2 test database.
- `apps/server/test/persistence/backupRestore.test.ts`: a real quiesced
  `pg_dump`/`pg_restore` backup-and-restore cycle against real Docker
  PostgreSQL 17, including durable identity/faction/credential-revocation
  recovery, stale-writer-epoch lease non-reactivation after restore, and a
  negative corrupted-dump SHA-256 integrity test — both tests pass, 0
  skipped.
- `apps/server/scripts/db-privilege-check.ts`: transactional (rollback-safe)
  proof that `burningspace_runtime`/`burningspace_migrator`/
  `burningspace_backup` each have exactly their intended privileges and no
  more, run against the same roles the CI server container uses.
- A CI-only ephemeral integration Compose stack
  (`deploy/docker-compose.staging.integration.yml`) locally validated
  end-to-end: hardening assertions, real migration + grants + privilege
  check, the real production server booting against a real restricted
  `burningspace_runtime` database connection, the updated durable-identity
  `public-arena-smoke.ts` and `external-staging-smoke.ts`, and a clean
  graceful shutdown — with full container/network cleanup afterward.
- A repository-only, never-applied real-staging PostgreSQL definition
  (`deploy/docker-compose.staging.db.yml` +
  `deploy/staging.db.env.example`) and its future operator sequence,
  documented in
  [`docs/ops/persist-002-staging-db-integration-plan.md`](../ops/persist-002-staging-db-integration-plan.md).

**Packet 7 FIX1 (bounded post-Packet-7 correction):** Product Architect
review of Packet 7 raised one blocker — the production
`deploy/server.Dockerfile` runtime image did not package
`apps/server/db/migrations`, which every server boot needs for its
fail-closed schema-compatibility check, so an immutable image-only staging
rollout would fail to boot. FIX1 corrected this by adding the single
required `COPY` line to `deploy/server.Dockerfile`'s runtime stage, removed
the CI-only bind-mount workaround, added an explicit CI packaging assertion
against the built image, and re-validated the entire local acceptance
evidence set (CI integration stack, backup/restore, full real-PostgreSQL
test suite, typecheck/build) end-to-end with the corrected image. Full
detail in `docs/ops/persist-002-staging-db-integration-plan.md`.

**FIX2 (`b97f4eb`):** made the persistence CI harness deterministic —
replaced a fixed 8-tick client-test wait with condition polling on the
actual `joinById` call, and gave native Linux CI a working path to the
loopback-only-published test database (`--network host` for the ephemeral
pg_dump/pg_restore/psql tool containers on Linux only; the existing
`host.docker.internal` path on Windows/Mac Docker Desktop is unchanged).

**FIX3 (`793aa6c`):** on native Linux CI, `pg_dump`'s bind-mounted output
file was created container-root-owned, so a later host-side rewrite of
that same file (the backup/restore test's negative corruption case) failed
with `EACCES`. Fixed by running only that one container invocation as the
invoking host UID:GID on Linux; `pg_restore`/`psql` (read-only consumers of
host-mounted files) and the Windows/Mac path are unchanged.

**FIX4 (`0dba3e7`):** the standalone Network client callback diagnostic
(`apps/client/scripts/network-client-callback-check.ts`) predated durable
identity and used its own bespoke test server with no `/identity/guest` or
discovery endpoints, so it could never satisfy the current `NetworkClient`
connect flow. Migrated it onto the real
`startProductionBattleServer({ battleRoomClassOverride: TestBattleRoom })`
composition (real isolated PostgreSQL, real identity/discovery, the real
canonical room, diagnostic-only ship-state controls), with isolated
per-client in-memory identity storage for all four real guest identities
it creates. The CI test-database teardown step was moved to run after this
diagnostic instead of before it.

**Core / Claude QA evidence at implementation checkpoint
`0dba3e74562b3d0e395a5cad2a29732512e68515`:** Core Pull Request Checks —
**SUCCESS** (run `34948430842`, job `104313315933`, attempt 1), all steps
including Caddy edge contract validation and local staging-container
integration. This SUCCESS is bound specifically to that checkpoint, not
to any later commit. Claude QA automation at that same checkpoint (run
`34948430896`, job `104313316185`, attempt 1) did **not** produce a
validated review: the diagnostic sanitizer returned
`execution_file_invalid` for the reviewer's execution transcript (the
precise internal subreason for this historical run is not established,
since its execution file was not captured, and is not claimed to be known
here), and independently the review validator rejected the reviewer's
structured output for an oversized `important_suggestions[0]` (>500
characters); the publisher posted a sanitized failure comment (ID
`5677380407`) before its own next step failed. This is an automation gap,
not a QA verdict on the implementation in either direction.

**QA-RECOVERY-001:** a bounded patch adds fixed, allowlisted
execution-file-invalid subreason codes to the sanitizer for future-run
diagnosability (it does not retroactively establish the unestablished
historical subreason above), and adds conservative generation-guidance
targets to the QA reviewer prompt (well under the existing hard
500/20/100/2000 limits, which are unchanged) to reduce the chance of a
recurrence of the oversized-item failure. It does not change persistence,
authentication, or gameplay behavior. Product Architect inspected the
technical bytes (three files, blob hashes verified unchanged before
commit) and the documentation correction, and approved exactly one
bounded commit/push. That commit was made on top of implementation
checkpoint `0dba3e74562b3d0e395a5cad2a29732512e68515`
(`f146a3f2480525f13ae6691bd1fa75cb96927a8f`) and pushed to PR #86.

**Observed at `f146a3f...`:** Core Pull Request Checks — **SUCCESS** (run
`35093811907`, job `104786149103`, attempt 1), including all later
diagnostics/Caddy/staging-container-integration checks. Claude QA Review
Pilot (run `35093811913`, job `104786148454`, attempt 1) — the reviewer
**did not start**: the Action's own log reports a workflow-content trust
mismatch against the default-branch version of
`.github/workflows/claude-qa-review-pilot.yml` and skips before invoking
the reviewer (not retryable by re-running the same head). The empty
`execution_file` and empty `structured_output` seen at this head were
downstream consequences of that skip, not a reviewer or sanitizer/
validator outcome.

**QA-RECOVERY-002:** restores `.github/workflows/claude-qa-review-pilot.yml`
to the existing trusted default-branch bytes (blob
`89ccd3928ee452ebb23ecb632a7d93b6a3d76ddb`; independently confirmed equal
on the default branch, in the known prior commit
`0dba3e74562b3d0e395a5cad2a29732512e68515`, and in the restored working
tree before commit). This removes the PR's workflow-content difference
without bypassing or weakening the Action's trust validation, and changes
no runtime, permission, tool-policy, or Action-pin behavior. The
generation-guidance enhancement QA-RECOVERY-001 added is thereby
**deferred, not active** on this branch. Following a pre-commit STOP
(restoring the workflow left three audit assertions checking for that
now-removed prompt text with no way to pass without touching the frozen
test file), Product Architect explicitly authorized removing exactly
those three `check(...)` calls in
`.github/scripts/test-claude-qa-audit.py`; no other test, limit, fixture,
or expected exit code in that file changed, and the sanitizer
(`sanitize-claude-diagnostic.py`) remains byte-identical. Safe, allowlisted
`execution_file_invalid` subreason reporting in the sanitizer remains
implemented and unaffected; the historical subreason for the original
`0dba3e7...` QA run's `execution_file_invalid` result remains unknown.

At `097cb92804ede1449f3fc1dca1a8a063f9aa3cef` (QA-RECOVERY-002 head): Core
Pull Request Checks — **SUCCESS** (run `35193478755`), and the governed
Claude QA reviewer ran and returned "Approved with suggestions" (run
`35193478806`). An independent Architecture review of that head then
raised one finding, addressed by ARCH-FIX1 below.

**ARCH-FIX1 — PERSIST002-C-01 (MEDIUM), simulation not fenced on process
authority loss:** the independent Architecture review found that
`BattleRoom.updateSimulation()` (respawn, ship movement, firing,
projectile movement/collision/damage, and simulation-origin combat
broadcasts) ran without checking current process/world authority.
Rejecting new input, or having started asynchronous graceful shutdown,
does not by itself fence that simulation path — the reviewer did not
claim simulation was observed to continue for the full shutdown timeout,
only that the guard was missing. Product Architect disposition:
**REQUEST_CHANGES** (implement a fix; do not accept as residual risk).
The reviewer's original verdict, including its own stated limitation that
it did not personally run the real-PostgreSQL test suites, is preserved
above and is not altered by this fix.

Implementation (`apps/server/src/index.ts`,
`apps/server/src/rooms/BattleRoom.ts`):

- `index.ts` now composes the `writer` capability handed to
  `createProductionRoomDependencies()` from BOTH signals that can declare
  process authority lost — `persistenceRuntime.writer.isControlSafe()`
  (the writer's own local heartbeat/deadline check) AND
  `lifecycle.state === 'ready'` (which the separate schema-maintenance-
  connection authority-loss path, and voluntary graceful shutdown, both
  also affect via the existing `handleAuthorityLost()`/`markFailed()`
  path) — instead of passing the writer object through unchanged. No new
  capability shape, no Pool/URL/database internals exposed to the room,
  no change to writer claim/renewal/expiry algorithms, no change to boot
  order.
- `BattleRoom.ts` adds one private, room-local, synchronous authority
  check (`isProcessAuthoritySafe()`) consulting only the above composed
  signal via the existing `getActiveProductionRoomDependencies()`
  accessor. It fences, at their single entry points: the entire
  simulation tick (`updateSimulation()` — no respawn, movement, firing,
  projectile update/collision/damage, or new combat broadcast from a
  rejected tick); player input application (`handlePlayerInput()`); and
  the async `SET_PROFILE` completion boundary (a durable transaction that
  finishes after authority is lost releases any lease it just acquired
  and returns, without spawning/updating a ship or sending
  `PROFILE_ACCEPTED` — the already-committed durable faction/membership
  is never rolled back, matching the existing generation-mismatch
  branch it sits beside). The check is terminal per room instance once
  authority has genuinely been observed lost (a two-flag latch:
  `hasObservedAuthoritySafe` only becomes true on a genuine safe
  observation, so a room created before the process reaches `'ready'`
  during normal startup is never mistakenly disabled; once safe has been
  observed, a later unsafe observation latches permanently, so a
  subsequent superficially-safe value can never resume the room). No new
  same-process recovery path; the existing bounded shutdown remains
  solely responsible for teardown. Ordinary per-player disconnect
  semantics are unchanged: this is a process/world-authority fence, not a
  per-player control gate, so one player's lost lease or reconnect grace
  never pauses the rest of the world while process authority stays safe.

New regression file
`apps/server/test/persistence/simulationAuthorityGate.test.ts` (8
scenarios, real PostgreSQL, exercising the real `BattleRoom` simulation
path via a real `startProductionServer()` composition with an injected
writer clock, not only a boolean helper): a safe-authority positive
control; authority lost immediately before a tick with a primed
moving/firing ship, a live in-flight projectile aimed at another ship,
and a killed ship whose respawn deadline is crossed only after the
freeze (proving `tryRespawnShip` never runs once frozen); the local
monotonic deadline alone (no lifecycle transition, no heartbeat callback)
freezing the room; the asynchronous-teardown window (`lifecycle.markFailed()`
called directly, mirroring `handleAuthorityLost()`'s own synchronous
`markFailed()` step, deliberately without also triggering its coupled
teardown — a real trigger disposes the room almost immediately regardless
of this fence, which would prove nothing about the fence specifically);
fail-closed when production room dependencies have actually been
uninstalled (via real teardown); the terminal latch surviving a clock
rewound back to an apparently-safe value; a delayed `SET_PROFILE`
completion (gated via the existing `gameplayAuthorityTestHooks` seam)
losing authority mid-flight; and ordinary per-player disconnect not
freezing the rest of the world while authority stays safe. A negative
control was run manually against this task's starting (pre-fix)
`BattleRoom.ts`: 5 of the 8 scenarios failed as expected, confirming the
suite actually detects the defect; the working tree was restored to the
implemented fix afterward (this mutation was never committed).

This implementation is by its author (the same agent that authored the
fix); it is not independently verified merely because a fix now exists.

**Independent delta review of PERSIST002-C-01 (the runtime fix in
`index.ts`/`BattleRoom.ts` itself): CLOSED**, at
`cc87ab0c679acbce5c16f866f84780c1804c4e31`. The production fix is not
reopened or reinterpreted by ARCH-FIX2 below.

**Overall ARCH-FIX1 delta disposition: REQUEST_CHANGES**, because the same
review found two problems in the accompanying test evidence, not in the
production fix:

- **REVIEW-C01-B:** the "fail-closed on a missing authority capability"
  regression ran only after ordinary cleanup had already removed the ship,
  caught any exception, and asserted nothing when none was thrown — so it
  passed identically whether or not the production fence existed, and was
  not discriminating.
- **REVIEW-C01-A:** the "asynchronous teardown window" scenario's
  cleanup used a `skipDatabaseDrop` escape hatch that permanently leaked
  the process-private HTTP identity pool's connection and left its
  disposable database undropped for the ephemeral test-Postgres
  container's own lifecycle to eventually reclaim, instead of the test
  itself proving those resources closed.

**ARCH-FIX2 (commit `test(persist-002): strengthen authority-fence proof
and clean up its harness`)** corrects both, test-only, in
`apps/server/test/persistence/simulationAuthorityGate.test.ts`:

- **REVIEW-C01-B fix:** the missing-capability scenario now keeps a real,
  alive, moving+firing ship in the room throughout (never disposed or
  emptied first), establishes a healthy positive control (the same input
  genuinely advances position and creates a real projectile while the
  capability is present), then makes only
  `getActiveProductionRoomDependencies()` return `undefined` for the
  single `updateSimulation()` call under test, via a narrowly scoped
  `vi.spyOn` restored synchronously immediately after that one call. It
  asserts: no throw; the primed ship's position/velocity do not advance;
  no new projectile appears; and (last, confirming the missing-authority
  path was actually exercised rather than merely that nothing happened to
  throw) the spied lookup was reached.
  **Negative-control evidence:** run in a separate, disposable
  `git worktree` checked out at this task's pre-runtime-fix commit
  (`097cb92804ede1449f3fc1dca1a8a063f9aa3cef`, i.e. before
  PERSIST002-C-01's own fix — `BattleRoom.ts` there has no
  `isProcessAuthoritySafe()` fence and never calls
  `getActiveProductionRoomDependencies()` from `updateSimulation()` at
  all) with only this corrected test file copied in; nothing in the
  implementation worktree was mutated for this. The corrected scenario
  **failed there exactly at the intended assertion** — the primed ship's
  `x` position had genuinely advanced (a real ~11-unit move) — not via an
  unrelated exception, a broken fixture, or a failed server boot. The
  same scenario against the ARCH-FIX1+ARCH-FIX2 candidate **passes**.
- **REVIEW-C01-A fix:** `skipDatabaseDrop` is removed. The scenario still
  fences its freeze assertions with `lifecycle.markFailed()` called
  directly (deliberately not yet coupled to teardown, so the freeze is
  proven to come from the fence and not from a real trigger's near-
  immediate room disposal) — but, strictly after those freeze assertions,
  it now advances the injected writer clock and calls the writer's own
  `performHeartbeat()` (the exact method production's heartbeat timer
  would have called), driving the real `handleAuthorityLost()` →
  `performTeardown()` path, and confirms via `writer.state === 'failed'`
  that this actually took the intended local-safety-deadline failure
  route. It then waits boundedly (not `performHeartbeat()`'s own return,
  which proves nothing about the async teardown) for each independently
  observable effect: the canonical room disposed
  (`matchMaker.getLocalRoomById`); the HTTP listener refusing new
  connections; `getActiveProductionRoomDependencies()` and
  `getActiveNetworkBoundaryConfig()` both back at their pre-boot
  baselines; and, via a separate admin observer connection to a different
  database (never the disposable one itself, so it can never appear in
  its own count), zero remaining `pg_stat_activity` rows for the
  disposable database. It then drops that database with a plain
  `DROP DATABASE` (no `FORCE`, no `pg_terminate_backend`) — which only
  succeeds because nothing is still attached — and confirms it is gone
  from `pg_database`. This is real evidence of closure, not an assumption.
- **Also corrected, narrower in scope:** the delayed-`SET_PROFILE`
  scenario's fixed `delay(300)` is replaced with a bounded wait on the
  room's own real per-session profile-operation tail
  (`awaitProfileTail`, reflected via the same test-only room-access seam
  already used elsewhere in this file) — an actual completion signal, not
  a guessed sleep duration. All of that scenario's existing assertions
  (no spawn, no `PROFILE_ACCEPTED`, durable membership/lease evidence)
  are unchanged.
- **Documentation correction (no test code changed for this item):** the
  "ordinary per-player disconnect" scenario proves exactly one thing —
  a **consented** disconnect of one client does not globally pause
  another client's ship. It is not evidence for unconsented-disconnect
  reconnect grace or disconnected-ship inertia (both already independently
  covered by the pre-existing
  `apps/server/test/productionReconnectLifecycle.test.ts`, specifically
  "preserves one authoritative owner and neutralizes stale input across a
  valid reconnect": an unconsented `leave(false)`, ownership retained
  through the grace window, and the disconnected ship's velocity
  decaying rather than being instantly frozen). **Projectile continuation
  specifically during a disconnect remains an unproved existing gap** —
  the reconnect-lifecycle test only asserts the disconnected player's own
  projectile count does not increase, not that another player's
  in-flight projectile continues its path while someone is disconnected.
  No new projectile-subsystem test is added here for this.

Every ARCH-FIX2 run recorded above used the repository's normal
`deploy-postgres-1` disposable test-Postgres container (pre-existing, not
started or stopped by this task) and this task's own disposable
`bs_test_*` databases (each created and dropped by the run that created
it). Two `npm test` attempts hit the already-documented, pre-existing
Vitest/tinypool `ERR_IPC_CHANNEL_CLOSED` worker-crash flake; a third
attempt completed cleanly. Those two crashed attempts left exactly 3
orphaned `bs_test_*` databases (named individually, not identified by
wildcard), which were confirmed to have zero active connections and then
dropped by their exact names; the 19 `bs_test_*` databases already
present before this task began were left untouched.

**Correction (ARCH-FIX3):** the line above originally called those two
crashes "unrelated to any assertion in this file." An independent
reviewer reproduced the underlying cause: the asynchronous-teardown-
window scenario drove its explicit teardown-triggering code only after
its freeze assertions, in the test body itself (REVIEW-C01-A); an
assertion thrown before that point left the process-private HTTP identity
pool, and other resources, still connected when the harness's plain
`database.drop()` then force-terminated them, producing exactly this
class of unhandled pg/worker error. This is a harness defect, now fixed
below — it is **not** established that every historical
`ERR_IPC_CHANNEL_CLOSED` occurrence in this project shared this same
cause, and this fix does not claim to eliminate every possible cause of
that flake; only this specific, now-reproduced-and-fixed path is
attributed here.

**ARCH-FIX3 — REVIEW-C01-A, remaining early-failure cleanup gap:**
independent review disposition: PERSIST002-C-01 and REVIEW-C01-B remain
independently **CLOSED**; A's successful-path cleanup was already proved,
but its early-assertion-failure path could still leak resources (as
above) and obscure the original test failure behind a secondary
pg/worker error. ARCH-FIX3 moves all cleanup responsibility into
`bootAuthorityTestServer()`'s `stop()` (shared, idempotent, state-aware:
normal starting/ready, synthetic-failed-with-owning-writer, teardown-
already-initiated, and already-stopped are all handled by the one
implementation), called unconditionally from every scenario's
afterEach/finally regardless of where or whether the test body itself
threw. A new permanent regression
("guaranteed cleanup after an early test failure") boots a real server,
creates genuine authenticated activity, marks the lifecycle failed,
throws a unique synthetic marker before any explicit teardown-triggering
code, then exercises the exact same shared `stop()` path and
independently re-verifies the resource baselines, zero application
connections, and database removal, while confirming the original marker
survived. A scratch, disposable-worktree probe (not committed) injected
the identical early failure into the actual teardown-window test and ran
it with the default `forks` pool: against the pre-ARCH-FIX3 harness it
reproduced the same unhandled "terminating connection due to
administrator command" / IPC crash observed above; against the
ARCH-FIX3-corrected harness it instead failed cleanly on the injected
marker alone, with cleanup still completing (database dropped, zero
residual connections). This is by its own author and is **not**
independently verified merely because it exists.

No claim is made here that Core/QA for the ARCH-FIX3 head have already
passed — see `docs/handoffs/CURRENT.md` for what is actually pending.
**Independent verification of the remaining REVIEW-C01-A early-failure
cleanup path remains outstanding.**

Next safe action: independent verification of ARCH-FIX3's early-failure
cleanup evidence for REVIEW-C01-A, and observation of the ordinary
push-triggered Core/governed-QA results for the ARCH-FIX3 head
once available. Product Architect final acceptance and human merge remain
outstanding.
