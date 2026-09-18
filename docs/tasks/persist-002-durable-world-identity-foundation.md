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
RUNTIME FIX OR REVIEW-C01-B. AN INDEPENDENT NETWORK REVIEW OF THE
ARCH-FIX3 HEAD THEN RAISED PERSIST002-NET-01 (HIGH): PUBLIC
CREATE/JOINORCREATE COULD SPAWN A PARALLEL BATTLEROOM AGAINST THE SAME
DURABLE WORLD. NET-FIX1 (BELOW) RESTRICTS PUBLIC MATCHMAKING TO EXACTLY
JOINBYID/RECONNECT. PERSIST002-NET-02 (MEDIUM) REMAINS OPEN,
DOCUMENTATION-ONLY IN THIS FIX. AN INDEPENDENT PERSISTENCE REVIEW OF THE
NET-FIX1 HEAD THEN RAISED PERSIST002-PERS-01: STALE-LEASE RECONCILIATION IN
`claimWorldWriter()` EVALUATED `clock_timestamp()` TWICE, INDEPENDENTLY, FOR
THE SAME RELEASED ROW'S `updated_at`/`expires_at`. PERS-FIX1 (BELOW) MAKES
ONE DB-TIME SAMPLE SUPPLY BOTH COLUMNS. INDEPENDENT VERIFICATION OF THE
REMAINING REVIEW-C01-A EARLY-FAILURE PATH, INDEPENDENT NETWORK DELTA REVIEW
OF NET-FIX1, INDEPENDENT PERSISTENCE DELTA REVIEW OF PERS-FIX1, CORE/QA FOR
THE PERS-FIX1 HEAD, PRODUCT ARCHITECT FINAL ACCEPTANCE, AND HUMAN MERGE ALL
REMAIN OUTSTANDING.**

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

Independent verification of ARCH-FIX3's early-failure cleanup evidence for
REVIEW-C01-A remains outstanding, superseded in urgency by NET-FIX1 below.

**NET-FIX1 — PERSIST002-NET-01 (HIGH), public matchmaking could create a
parallel battle room against the same durable world:** an independent
Network review, run against real PostgreSQL, reproduced that a valid guest
credential calling public `create`/`joinOrCreate` on the `'battle'` room
name creates an additional, independent `BattleRoom` instance backed by the
same canonical durable world — repeated calls accumulate rooms, they
persist after clients leave (`autoDispose=false` is unchanged), and a rogue
room accepts `SET_PROFILE` and real gameplay. This is parallel
room/simulation instances for the one singleton world, not multiple durable
world UUIDs.

Fix (`apps/server/src/security/networkBoundary.ts`): `installNetworkBoundary()`
now also narrows the shared, process-level
`matchMaker.controller.exposedMethods` (Colyseus 0.16.5's own supported
public-method restriction — no hand-written URL filtering, no monkey-patched
room creation) to exactly `['joinById', 'reconnect']`, using the same
install/nested-ownership/idempotent-restore lifecycle already trusted for
CORS header restoration, so `restore()` never re-permits `create`/
`joinOrCreate`/`join` while any owning installation could still be serving
public requests. The internal bootstrap creation of the one canonical room
(`matchMaker.createRoom('battle', {})` in `index.ts`) is a distinct,
lower-level call that `exposedMethods` never gates, so no temporary reopen
was ever needed; `index.ts` required no changes. `controller.invokeMethod()`
rejects an unexposed method (`MATCHMAKE_NO_HANDLER`, code 4210) before
`matchMaker[method]()` — and therefore before `onAuth` — is ever called, so
a rejected public `create`/`joinOrCreate`/`join` reserves no seat, creates no
room, and grants no authority, with or without a credential. This project's
transport (`@colyseus/ws-transport` + `@colyseus/core`'s own matchmake route)
always answers HTTP 200 for `/matchmake/*`; only the JSON body's `code`
field distinguishes success from rejection, so the new/adapted tests assert
on that body/SDK error code, never on `response.ok` alone.

Evidence, all against real PostgreSQL and the real production HTTP/WS
composition (`apps/server/test/persistence/canonicalRoomLifecycle.test.ts`,
extended existing test plus 6 new cases; `apps/server/test/
productionNetworkBoundary.test.ts`, Origin-boundary assertions moved from
`joinOrCreate` to `joinById` against the real canonical room ID with a
credential obtained through the allowed-origin identity path, keeping a
positive allowed-origin control and the exact `'onAuth failed'` rejection):
free-capacity `create`/`joinOrCreate`/`join` all rejected (authenticated and
unauthenticated, proving `onAuth` never runs for them) with zero room/
lease/membership growth; the raw `/matchmake/create/battle` HTTP response
inspected directly (status 200, body `code: 4210`); repeated sequential and
bounded concurrent creation attempts all rejected with the real room-count
inventory (`matchMaker.query({name: 'battle'})`) staying at exactly one
room throughout and after a real client joins and leaves; an unknown room
ID through the still-public `joinById` rejected with the distinct
`MATCHMAKE_INVALID_ROOM_ID` (4212), not `MATCHMAKE_NO_HANDLER`, and creates
no replacement room; ordinary `joinById` → `SET_PROFILE` admission still
acquires exactly one real `active_session_leases` row whose `room_id`
column is the actual canonical room ID. A full-room case, extended from the
pre-existing test, additionally proves `create`/`joinOrCreate` stay
rejected even while the canonical room has no free capacity. A disposable,
detached scratch `git worktree` at this task's starting head
(`4f02a00cc9e51d17d24fd80c3a0da6833daf2480`, i.e. the unmodified pre-fix
`networkBoundary.ts`) with only the new regression tests copied in
reproduced the defect directly — the representative case failed because
`create()` returned successfully (no `MATCHMAKE_NO_HANDLER`) and a real
second `battle` room actually existed in the inventory afterward, not
because the fixture failed to boot; the same tests pass against the fixed
candidate. The scratch worktree was removed afterward; the implementation
worktree was never mutated for this control.

Full real-PostgreSQL suite: 49 files / 461 tests (baseline 49/455 plus the
6 new cases above), 0 skipped, 0 failures. Full-workspace `npm run
typecheck` and `npm run build` (with
`VITE_BURNINGSPACE_SERVER_URL=http://127.0.0.1:2567`) both clean. The
standalone Network client callback diagnostic
(`apps/client/scripts/network-client-callback-check.ts`, which already used
discovery-then-`joinById`) and `apps/server/scripts/public-arena-smoke.ts`
(also already `joinById`-based) both ran clean against, respectively, the
real test-database composition and a disposable local production-mode
integration server — never real staging. No pre-existing `bs_test_*`
database or the `deploy-postgres-1` container was touched; the baseline of
19 pre-existing disposable databases was unchanged after all runs,
including the scratch negative-control run (cleaned via its own harness).

**PERSIST002-NET-02 (MEDIUM) remains OPEN, documentation-only in this
fix:** raw transport-peer attribution is unchanged; `X-Forwarded-For`/
`X-Real-IP`/`Forwarded` remain untrusted; no quota or rate-limit change was
made. Recorded in
[`docs/ops/persist-002-staging-db-integration-plan.md`](../ops/persist-002-staging-db-integration-plan.md):
behind a single effective transport peer, guest/fresh-auth budgets are
shared — a deployment availability constraint, not an authentication
bypass — and public persistence rollout is not authorized until Security/
Ops accepts an explicit mitigation or bounded operating policy; a future
trusted-proxy solution needs an explicit trust boundary and
spoof-resistance tests, not arbitrary header trust. NET-02 is not marked
fixed, waived, or accepted here, and no merge/deployment approval is implied
by this fix.

This implementation is by its own author and is **not** independently
verified merely because it exists.

**PERS-FIX1 — PERSIST002-PERS-01, two independent DB-clock evaluations in
stale-lease reconciliation:** an independent Persistence review of the
NET-FIX1 head (`c2777bbccfd8b69587379c1cac5ec1d7355b2451`) raised
**PERSIST002-PERS-01**: `claimWorldWriter()`'s stale-lease reconciliation
`UPDATE active_session_leases ... SET updated_at = clock_timestamp(),
expires_at = clock_timestamp()` called the VOLATILE `clock_timestamp()`
twice, independently evaluated; the two calls can return different values,
which can violate migration 001's `active_session_leases_state_shape_check`
(a `status = 'released'` row requires `expires_at <= updated_at`). This
concerns the two independent DB-clock evaluations in stale-lease
reconciliation — not any canonical-profile timeout.

Fix (`apps/server/src/persistence/repositories/worldsRepository.ts`): the
reconciliation statement now uses `WITH db_time AS (SELECT clock_timestamp()
AS now) ... FROM db_time`, sampling the DB clock exactly once and reusing
that one value for both `updated_at` and `expires_at`, the same idiom
already used by `credentialsRepository.ts`'s `releaseLeasesForCredential()`
and `sessionLeasesRepository.ts`'s `releaseGameplayLease()`/
`markRecovering()`.

Evidence, all against real PostgreSQL
(`apps/server/test/persistence/writerFencing.test.ts`): the two existing
takeover tests gained a PostgreSQL-level `expires_at = updated_at` equality
assertion (evaluated inside the database, not a JS-side comparison of two
separately fetched `Date`s) and a `worlds.state_revision`-unchanged
assertion; a new isolation test proves a takeover reconciles only its own
world's non-released, prior-epoch leases (an unrelated world's lease and an
already-released same-world lease are byte-for-byte untouched, including
`updated_at`); a new deterministic regression installs a schema-qualified,
test-only VOLATILE clock function (`test_only.advancing_clock()`, backed by
a real table insert so each call is provably distinct without depending on
wall-clock timing, confined to the disposable test database) behind a
narrow `Queryable`-forwarding probe that rewrites `clock_timestamp()` to the
test clock inside only the one fingerprinted reconciliation statement,
forwarding every other call unchanged — transaction control, predicates,
assignments and the real constraint are all left intact. Against the fixed
candidate: exactly one substituted-clock call (proving single evaluation
under the installed PostgreSQL version, via the multiply-referenced CTE's
automatic materialization), the claim succeeds, and the shape check holds.
**Negative control:** the identical test file, copied unmodified into a
disposable, detached scratch `git worktree` at the pre-fix head
(`c2777bbccfd8b69587379c1cac5ec1d7355b2451`), failed the same deterministic
test with the real PostgreSQL error `violates check constraint
"active_session_leases_state_shape_check"`, thrown from the exact pre-fix
statement — not a fixture or boot failure; the other three tests passed
either way, confirming the deterministic test is the reliable, non-flaky
detector. The scratch worktree was removed afterward; the implementation
worktree was never mutated for this control.

`writerFencing.test.ts` alone (`npx vitest run
apps/server/test/persistence/writerFencing.test.ts`, from the worktree
root): 4/4 pass. Full real-PostgreSQL suite (`npx vitest run`, from the
worktree root): 49 files / 463 tests (baseline 49/461 plus the 2 new cases
above), 0 skipped, 0 failed. Full-workspace `npm run typecheck` clean;
`writerFencing.test.ts` sits outside every workspace's own
`tsconfig.json`/`tsconfig.test.json` `include`, so it was additionally
typechecked via a temporary, throwaway `apps/server/tsconfig.tmp-test-check.json`
(extending the real server config, adding `test` to `include`), confirmed
zero errors specific to this file, then deleted — not part of any commit.
`npm run build`, with `VITE_BURNINGSPACE_SERVER_URL=http://127.0.0.1:2567`
set only in the invoking process's environment (never written to a
repository `.env` file, absent again afterward), completed clean.

**Docker note:** mid-session, Docker Desktop's daemon became unresponsive
(`docker ps`/`docker info` timing out) and needed a user-initiated restart;
a second user-initiated restart was then needed because the first left
containerd's own metadata store mounted read-only (`write .../meta.db:
read-only file system`), which blocked creating *any* new container —
including `backupRestore.test.ts`'s own ephemeral role-separated Postgres
containers, which failed for that reason on the first full-suite attempt.
Both restarts were performed by the user, not by this task. The
pre-existing `deploy-postgres-1` container was `docker start`ed back up
unchanged after each restart (never recreated, reconfigured, or had its
data touched by this task); two ephemeral `bs_backup_test_*` containers left
behind by the interrupted first `backupRestore.test.ts` attempt were removed
(`docker rm`) once Docker was healthy, and a repeat run of that file then
passed cleanly (2/2). A subsequent full-suite run after resolving the
containerd issue was clean (49/463 above).

**Resource accounting:** `docker inspect deploy-postgres-1` reports
`Mounts: []` — it has no persistent volume; all of its data lives in the
container's own writable layer, and the container itself was not recreated
across either restart (`Created` unchanged from 2026-09-17). This document's
NET-FIX1 section above records a baseline of 19 pre-existing `bs_test_*`
databases as of the previous session; **that baseline is no longer
current** — after the Docker Desktop incident, `deploy-postgres-1` now
contains 4 total databases and zero matching `bs_test_*`/`bs_backup_test_*`.
This is not attributable to this task's own test runs (which only ever
create and drop their own uniquely-named disposable databases, confirmed
zero left over after every run in this session) and most plausibly followed
from the containerd-repair restart resetting the container's writable-layer
contents; the exact mechanism was not directly observed and is not claimed
with more certainty than that. No other task's resources were deleted by
wildcard, or assumed unchanged without checking.

This fix is by its own author and is **not** independently verified merely
because it exists. Core and governed Claude QA for the resulting PERS-FIX1
head have not yet been observed — this document does not claim those checks
have passed.

Next safe action: independent Persistence delta review of
PERSIST002-PERS-01 for the PERS-FIX1 head, alongside the still-outstanding
independent Network delta review of PERSIST002-NET-01 and the
still-outstanding independent verification of ARCH-FIX3's REVIEW-C01-A
early-failure cleanup evidence. Product Architect final acceptance and
human merge remain outstanding for all three.
