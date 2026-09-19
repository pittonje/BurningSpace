# BurningSpace Current Handoff

Last updated: 2026-09-19
Updated by: Post-merge governance reconciliation — PERSIST002-NET-02 repository-stage closure

## Current state — Public Arena external staging: ONLINE

- Client: https://game.burningforge.dev
- Server origin: https://game-server.burningforge.dev
- Environment: `burningspace-staging-01` on the existing shared Contabo VPS.
- OPS-002 external staging deployment is complete and validated.
- Original deployed application release: `4a774354859c036d45666496539c2fc3c24b9f1c`.
- Last verified staging server runtime: the approved immutable server image from OPS-002 (not re-inspected by later documentation work).
- Subsequent MOBILE-001B/C updates replaced only the static client container; server, Caddy, TLS and network remained unchanged during those bounded client-only updates.
- Public health/readiness and the bounded external multiplayer smoke passed after the client updates.
- **Deployed state:** the last verified staging deployment is the earlier **non-persistent** runtime — world/player campaign state there is in-memory and may reset on server restart. Staging is not production or campaign MVP.
- **Repository state:** persistence (PERSIST-002) is implemented and merged in the repository (PR #86); it is **not deployed**, and no persistence deployment is authorized (see the PERSIST-002 status below).

Canonical historical deployment details remain in the OPS-002 task/review evidence and Git history. `CURRENT.md` intentionally records only the latest operational/task state.

## Active program — Wave 2 persistence / durable identity

PERSIST-001 — Persistent World & Durable Identity Architecture: **MERGED / CLOSED**.

Task: [PERSIST-001 — Persistent World & Durable Identity Architecture](../tasks/persist-001-persistence-identity-architecture.md)

Architecture: [Persistent World & Durable Identity Architecture](../architecture/PERSISTENT_WORLD_IDENTITY_ARCHITECTURE.md)

Review evidence: [PERSIST-001 Architecture / Security Review](../reviews/persist-001-architecture-security-review.md)

Merged branch: `arch/persist-001-persistence-identity`

Base/main at architecture authoring: `3b3621d248a73f67e1bed89cd3c267d5539f2c34`

Authority commit: `0dec9d546cd7289f73bff843d8cfdeda79bc87b8`

Reviewed architecture commit: `356b2f94573c3be641296a26fff727158063ed36`

PR #85 merge commit (the base of PERSIST-002; `origin/main` before PR #86): `98bda8f5bed41112f5687eb4ef2fd52a0c82950a`

Status: **ARCHITECTURE/SECURITY REVIEW APPROVED / PRODUCT ARCHITECT ACCEPTED / MERGED / CLOSED**

PERSIST-002 — Durable World & Identity Foundation: **PA ACCEPTED / MERGED** (2026-09-19). **Repository implementation complete; no persistence deployment is authorized.**

- **Merge provenance:** PR [#86](https://github.com/pittonje/BurningSpace/pull/86), human-merged by `pittonje` at 2026-09-19T05:13:39Z. Merge commit on `main`: `0c988f69ddac99e167e48255b05b1e7822d03fa5`; parents: base `98bda8f5bed41112f5687eb4ef2fd52a0c82950a` and approved source HEAD `098362b189f95cb8662bf70861d5eb665213a503`.
- **Tree equivalence:** the approved source HEAD, the historical CI PR-merge checkout `e0754b073629484c1177bb1b532e95637a8dc398` (parents: the same base and source HEAD; a CI artifact, not the commit on `main`) and the actual merge commit all have Git tree `12d9152708891972999ef654882680c7f86a6bef`.
- **Accepted evidence checkpoint** (historical checks at source HEAD `098362b...`; they are not fresh checks of the merge commit or of any later documentation commit):
  - Core Pull Request Checks run `35419305467` / job `105833832318` / attempt 1: **SUCCESS** — completed remote suite **52 files / 516 tests / zero skipped**; classifier 29 OK; QA audit 89 PASS / 0 FAIL; standard build/typecheck and integration checks succeeded.
  - Governed Claude QA run `35419305462` / job `105833832325` / attempt 1: **SUCCESS** — published comment `5739111798`; Blockers: None; **Approved with suggestions**; the reviewer disclosed static-only inspection.
- **Dispositions:** **QA-03 (final evidence reconciliation) — ACCEPTED / CLOSED** by the Product Architect. The earlier Architecture, Network, Persistence and Security closures (C-01, REVIEW-C01-A/B, NET-01, PERS-01, SEC-01/02/03) remain closed at their actual historical checkpoints; independent functional QA remains a separate accepted review. None of those reports is relabelled as a new review of `main` or of this documentation change.
- **Open obligations:**
  - **QA-01 — OPEN / DEFERRED:** test-completeness hardening; non-blocking for the completed source merge.
  - **QA-02 — OPEN / DEFERRED:** original-review archival; missing original review reports remain missing and are not reconstructed, and supplied report/patch hashes are not claimed as independently recomputed.
  - **PERSIST002-NET-02 — MERGED / CLOSED.** PR [#88](https://github.com/pittonje/BurningSpace/pull/88) was human-merged after exact-head Core and governed QA success, independent QA closure review, Architecture/Network/Security delta approvals with no blockers, and Product Architect acceptance. The approved source head, merge commit, and tree provenance are recorded in the final closure below and in the task file. This closes only the repository-stage NET-02 task; **PUBLIC PERSISTENCE ROLLOUT — BLOCKED** and **DEPLOYMENT — NOT AUTHORIZED** remain in force.
- **Execution limitations, kept explicit:** (1) a supplemental temporary tsconfig reported a `process.send` typing error; an identical baseline run was not established, so it is not claimed to be pre-existing (standard typechecks passed); (2) a complete local default-forks run at the final source HEAD is not claimed — the 52/516 completed run is remote Core evidence; (3) SOURCE-TEXT-FIX1's local validation used owned disposable databases inside the existing `deploy-postgres-1`, not a newly created isolated container, and its cleanup/container-state statements are supplied local evidence, not GitHub verification.
- **Repository state vs deployed state:** persistence is implemented and merged in the repository. The last verified staging deployment is the earlier non-persistent runtime described under "Current state" above; this reconciliation does not inspect or update staging, and no deployment, image publication or VPS access is authorized by it.

The dated sections below are the historical, pre-merge record of how each fix was made and reviewed. Wording in them such as "open", "pending", "not yet observed" or "awaiting merge" describes their own checkpoint and is superseded by this status.

## PERSIST-001 accepted architecture

PERSIST-001 defines and Product Architect accepts:

- PostgreSQL as the canonical durable campaign store;
- Node `pg`, explicit SQL and typed server-side repository boundaries;
- durable player UUID separate from transient Colyseus `sessionId`;
- opaque random guest recovery credential with at least 256 bits of entropy and verifier-only database storage;
- immutable durable faction membership for the initial foundation;
- one active gameplay ownership lease per player/world;
- server-instance identity plus writer-epoch fencing and stale-lease recovery;
- one initial canonical world with explicit durable world UUID;
- semantic transactional durability rather than per-tick persistence;
- explicit versioned SQL migrations, serialized migration execution and fail-closed schema compatibility checks;
- expand/migrate/contract compatibility and restore-based recovery for destructive schema changes;
- internal-only staging PostgreSQL topology with persistent storage and runtime/migration privilege separation;
- tested backup/restore as a required PERSIST-002 acceptance proof.

New accepted architecture records:

- `BS-ARCH-008`
- `BS-ARCH-009`
- `BS-ARCH-010`
- `BS-ARCH-011`

Accepted decision registry count: **39**. The 35 previously accepted decision records remain unchanged.

## Independent review / PA acceptance

Independent combined Architecture/Security review of commit `356b2f94573c3be641296a26fff727158063ed36` concluded:

- BLOCKER: 0
- HIGH: 0
- MEDIUM: 0
- verdict: **APPROVE**

The review confirmed identity/session separation, credential security, faction concurrency semantics, duplicate-session prevention, stale-process fencing, database failure behavior, migration/rollback, secrets/network boundaries, backup/restore and PERSIST-002 implementability without unresolved Product Architect decisions.

Product Architect subsequently accepted PERSIST-001 at that reviewed architecture commit.

PR #85 is human-merged (merge commit `98bda8f5bed41112f5687eb4ef2fd52a0c82950a`). PERSIST-002 is now open as a separate bounded implementation task; see [PERSIST-002 — Durable World & Identity Foundation](../tasks/persist-002-durable-world-identity-foundation.md).

## PR #85 checks and QA reconciliation

PR #85: `PERSIST-001 — Define persistent world and durable identity architecture`.

Core Pull Request Checks run `34759176294` completed **SUCCESS** on reviewed architecture HEAD `356b2f94573c3be641296a26fff727158063ed36`.

Claude QA run `34759176306` had a wrapper `FAILURE`, but the Claude invocation itself completed successfully. Its structured review was rejected by the deterministic publisher because one blocker string exceeded the 500-character limit.

The substantive QA concern was an evidence/state mismatch, not an architecture defect: the PR body already referenced the completed independent Architecture/Security review while the repository still contained the pre-review `READY FOR REVIEW` status and no committed review artifact.

That mismatch is closed by:

- `docs/reviews/persist-001-architecture-security-review.md`;
- this reconciled `CURRENT.md`;
- the reconciled PERSIST-001 task status/evidence ledger.

The failed Claude wrapper is not represented as a successful automated-QA run. Exact-head PR checks must rerun on the documentation evidence follow-up commits.

## PERSIST-002 acceptance direction

PERSIST-002 must prove at minimum:

1. PostgreSQL starts and an empty DB migrates successfully.
2. Canonical world bootstraps and readiness becomes true only after persistence initialization.
3. A new client can obtain a durable guest identity and credential.
4. First faction choice persists transactionally.
5. Application-only restart preserves player UUID, world UUID and faction while transient sessionId changes.
6. A duplicate concurrently active durable identity cannot own two gameplay sessions.
7. Stale lease recovery after crash/restart is bounded and safe.
8. Invalid/revoked credentials and forged UUIDs cannot claim another identity.
9. Backup is created and restored into a fresh isolated DB.
10. Restore proves identity/world/faction/revision/revocation state without reviving stale active sessions.

No territorial/outpost implementation is authorized by PERSIST-001.

## Deferred classifications / non-goals

Still intentionally deferred:

- durable ship transform semantics;
- combat health persistence semantics;
- respawn/cooldown persistence semantics;
- future sector/outpost/campaign state implementation;
- production HA and final RPO/RTO policy;
- email/password/OAuth/social accounts;
- Sybil resistance for anonymous guest creation;
- horizontal server scaling.

## MOBILE-001C closure / UX debt

MOBILE-001A/B/C are merged. MOBILE-001C was deployed through the bounded client-only staging update and field-tested on a real phone.

Current touch controls are usable for continued development. Known non-blocking UX debt:

**8-way touch movement feels somewhat stepped.**

Disposition: **DEFERRED UX TUNING / NON-BLOCKING FOR PERSISTENCE**.

No mobile-control task is currently active.

## PR #86 evidence (Packets 1–7 + FIX1–FIX4, through implementation checkpoint 0dba3e7)

PERSIST-001 is merged and closed. PERSIST-002 implementation is pushed as
PR #86 (`feat/persist-002-durable-world-identity-foundation` → `main`),
currently OPEN, not merged, no auto-merge requested. Eleven bounded
commits ahead of the PERSIST-001 merge base
`98bda8f5bed41112f5687eb4ef2fd52a0c82950a`, up through implementation
checkpoint `0dba3e74562b3d0e395a5cad2a29732512e68515` — this count
describes history up to that checkpoint only, not a claim about the PR's
eventual total commit count (a further QA-RECOVERY-001 commit follows it;
see below):

- Packets 1–7 (`16ee7d8`…`a5680d7`) — durable world/identity foundation
  implementation; see the task file for full per-packet evidence.
- `ef93b3d` FIX1 — corrected `deploy/server.Dockerfile` to package
  `apps/server/db/migrations` into the immutable runtime image (the sole
  blocker raised by Product Architect review of Packet 7), removed the
  CI-only bind-mount workaround it had used.
- `b97f4eb` FIX2 — made the persistence CI harness deterministic: replaced
  a fixed-tick client-test wait with condition polling, and made Linux CI
  reach the loopback-only test database via `--network host` (Windows/Mac
  Docker Desktop path unchanged).
- `793aa6c` FIX3 — preserved backup-artifact ownership on native Linux CI
  (`pg_dump`'s bind-mounted output was container-root-owned; now written
  as the invoking host UID:GID on Linux only).
- `0dba3e7` FIX4 — migrated the standalone Network client callback
  diagnostic off its obsolete bespoke test server onto the real
  `startProductionBattleServer`/durable-identity flow, and moved the CI
  test-database teardown to after that diagnostic.

**Core Pull Request Checks:** SUCCESS at implementation checkpoint
`0dba3e74562b3d0e395a5cad2a29732512e68515` — run `34948430842`, job
`104313315933`, attempt 1. All steps passed, including the Caddy edge
contract validation and the local staging-container integration stack.
This SUCCESS is bound specifically to that checkpoint, not to any later
commit.

**Claude QA automation at that same checkpoint:** run `34948430896`, job
`104313316185`, attempt 1 — did **not** produce a validated review. Two
independent failures observed: (1) the diagnostic sanitizer returned
`execution_file_invalid` for the reviewer's execution transcript (the
precise internal subreason for this historical run is not established,
since its execution file was not captured, and is not claimed to be known
here); (2) independently, the review validator rejected the reviewer's
structured output because `important_suggestions[0]` exceeded the
500-character hard limit. The deterministic publisher still posted a
sanitized failure comment (ID `5677380407`) before its own subsequent
step failed. **This is an automation gap, not a QA approval and not a QA
rejection of the implementation** — it must not be read as either.

**QA-RECOVERY-001** adds fixed, allowlisted `execution_file_invalid`
subreason codes to the sanitizer (observability for future runs only —
it does not retroactively establish the unestablished historical
subreason above) and conservative generation-guidance targets in the QA
reviewer prompt, well under the unchanged hard 500/20/100/2000 limits, to
reduce recurrence of the oversized-item failure. Product Architect
approved this patch for exactly one bounded commit/push (technical bytes
frozen and verified by blob hash before commit); it is committed on top
of implementation checkpoint `0dba3e74562b3d0e395a5cad2a29732512e68515`.
The resulting new PR head has not yet had Core or Claude QA observed —
this has not passed remote checks and no claim to that effect is made
here; the next verification action is to obtain and inspect Core and
governed Claude QA for that resulting PR head.

Independent Architecture, Network, Security, and QA reviews; Product
Architect final acceptance; and human merge all remain outstanding for PR
#86. No staging deployment, image publication, or VPS/Contabo contact has
occurred. The branch implementation above is distinct from the deployed
staging environment described earlier in this document, which is
unchanged and still non-persistent.

## QA-RECOVERY-002 (2026-09-17): trusted workflow restoration

At the QA-RECOVERY-001 head `f146a3f2480525f13ae6691bd1fa75cb96927a8f`:

- **Core Pull Request Checks: SUCCESS** — run `35093811907`, job
  `104786149103`, attempt 1, including all later diagnostics/Caddy/
  container-integration checks.
- **Claude QA Review Pilot** — run `35093811913`, job `104786148454`,
  attempt 1: the reviewer **did not start**. The Action's own log reports
  workflow-validation content mismatch against the default-branch
  version of `.github/workflows/claude-qa-review-pilot.yml` and skips
  before invoking the reviewer; this is not retryable by re-running the
  same head. The empty `execution_file` and empty `structured_output`
  observed at this head were downstream consequences of that skip, not a
  reviewer or validator outcome.

QA-RECOVERY-002 restores `.github/workflows/claude-qa-review-pilot.yml`
to the existing trusted default-branch bytes (blob
`89ccd3928ee452ebb23ecb632a7d93b6a3d76ddb`, independently confirmed equal
on the default branch, in the known prior commit `0dba3e7...`, and in the
restored working tree before commit). This removes the PR's
workflow-content difference from the default branch; it does not bypass
or weaken the Action's trust validation, and changes no runtime,
permission, tool-policy, or Action-pin behavior. The generation-guidance
enhancement QA-RECOVERY-001 had added to the reviewer prompt is thereby
**deferred, not active** on this branch. After Product Architect
authorization following a pre-commit STOP (the restoration otherwise left
three audit assertions checking for that now-removed prompt text with no
way to pass without touching the frozen test file), the three
corresponding `check(...)` calls in
`.github/scripts/test-claude-qa-audit.py` that asserted presence of that
deferred guidance were removed; no other test, limit, fixture, or expected
exit code in that file was changed, and the sanitizer
(`sanitize-claude-diagnostic.py`) is byte-identical to before. Safe,
allowlisted `execution_file_invalid` subreason reporting in the sanitizer
remains implemented and unaffected; the historical subreason for the
original `0dba3e7...` QA run's `execution_file_invalid` result remains
unknown and is not claimed to be established by this change.

No validated QA approval or final PERSIST-002 acceptance has been
obtained at any head to date. Independent Architecture, Network,
Security, and QA reviews; Product Architect final acceptance; and human
merge remain required. Staging/runtime deployment status is unchanged
from the rest of this document.

## ARCH-FIX1 (2026-09-17): fence simulation on process authority loss

At the QA-RECOVERY-002 head `097cb92804ede1449f3fc1dca1a8a063f9aa3cef`:
Core Pull Request Checks — **SUCCESS** (run `35193478755`); governed
Claude QA — ran and returned **"Approved with suggestions"** (run
`35193478806`). An independent Architecture review of that same head
raised **PERSIST002-C-01 (MEDIUM)**: `BattleRoom.updateSimulation()`
(respawn, movement, firing, projectile update/collision/damage,
simulation-origin combat broadcasts) ran without checking current
process/world authority; rejecting new input, or having started
asynchronous graceful shutdown, does not by itself fence that path.
Product Architect disposition: **REQUEST_CHANGES** (implement a fix, not
accept as residual risk).

ARCH-FIX1 implements the fix, narrowly scoped to
`apps/server/src/index.ts` (composes the `writer` capability passed into
`createProductionRoomDependencies()` from both `persistenceRuntime.writer.isControlSafe()`
and `lifecycle.state === 'ready'`, so the room reflects process-level
authority loss reported through the separate schema-maintenance-
connection path and voluntary shutdown, not only the writer's own local
check) and `apps/server/src/rooms/BattleRoom.ts` (a single room-local,
synchronous, terminal-once-observed-lost authority check fencing the
simulation tick, player input application, and the async `SET_PROFILE`
completion boundary), plus a new real-PostgreSQL regression file
`apps/server/test/persistence/simulationAuthorityGate.test.ts` (8
scenarios exercising the real `BattleRoom` simulation path). A manual
negative control against this task's pre-fix `BattleRoom.ts` failed 5 of
the 8 new scenarios as expected, then the working tree was restored to
the fix (that mutation was never committed). Full detail, including exact
fence behavior and what remains explicitly unverified, is in the task
file's ARCH-FIX1 section.

This fix is by its own author and is **not** independently verified
merely because it exists. Core and governed Claude QA for the resulting
ARCH-FIX1 head have not yet been observed — this document does not claim
those checks have passed.

## Independent delta review of PERSIST002-C-01: CLOSED (runtime fix only)

Independent delta review of the ARCH-FIX1 runtime fix (`index.ts`/
`BattleRoom.ts`) **closed PERSIST002-C-01** at
`cc87ab0c679acbce5c16f866f84780c1804c4e31`. The production fix itself is
not reopened by ARCH-FIX2 below.

The same review found two problems in ARCH-FIX1's accompanying test
evidence (not in the production fix), so **ARCH-FIX1's overall delta
disposition remained REQUEST_CHANGES**:

- **REVIEW-C01-B:** the missing-capability regression ran only after
  ordinary cleanup had already removed the ship and emptied the room, so
  it passed identically on both the pre-fix and the fixed code — not
  discriminating.
- **REVIEW-C01-A:** the asynchronous-teardown-window scenario's cleanup
  used a `skipDatabaseDrop` escape hatch that permanently leaked the
  process-private HTTP identity pool's connection and its disposable
  database, instead of the test proving those resources actually closed.

## ARCH-FIX2 (2026-09-17): corrected test evidence for REVIEW-C01-A/B

Test-only correction of both findings, entirely inside
`apps/server/test/persistence/simulationAuthorityGate.test.ts` (plus this
document and the task file):

- The missing-capability scenario now keeps a real, alive, moving+firing
  ship in the room throughout (never disposed/emptied first), establishes
  a healthy positive control, then makes only
  `getActiveProductionRoomDependencies()` return `undefined` for the one
  `updateSimulation()` call under test via a narrowly scoped `vi.spyOn`
  restored immediately afterward. **Negative-control evidence:** run in a
  separate, disposable `git worktree` checked out at this task's
  pre-runtime-fix commit `097cb92804ede1449f3fc1dca1a8a063f9aa3cef` (no
  implementation-worktree files mutated); the corrected scenario failed
  there exactly at the intended assertion (the primed ship's position had
  genuinely advanced, a real ~11-unit move) — not via an unrelated
  exception or broken fixture. The same scenario passes against the
  fixed candidate.
- The teardown-window scenario's cleanup no longer uses
  `skipDatabaseDrop` (removed entirely). After its freeze assertions, it
  now advances the injected writer clock and calls the writer's own
  `performHeartbeat()` (the same method production's heartbeat timer
  would call), driving the real `handleAuthorityLost()` →
  `performTeardown()` path, confirmed via `writer.state === 'failed'`.
  It then waits boundedly for each independently observable effect (room
  disposed, HTTP listener refusing connections, both module-level
  installation stacks restored to their pre-boot baselines, zero
  remaining `pg_stat_activity` rows via a separate observer connection),
  and proves closure by successfully running a plain `DROP DATABASE`
  (no `FORCE`) against its own disposable database.
- The delayed-`SET_PROFILE` scenario's fixed `delay(300)` is replaced
  with a bounded wait on the room's own real per-session profile-
  operation tail (an actual completion signal). Its existing assertions
  are unchanged.
- Documentation correction: the "ordinary per-player disconnect"
  scenario proves only that a **consented** disconnect does not globally
  pause another client. Unconsented-disconnect reconnect grace and
  disconnected-ship inertia are already covered by the pre-existing
  `apps/server/test/productionReconnectLifecycle.test.ts`. Projectile
  continuation specifically during a disconnect remains an **unproved
  existing gap** — no new test is added for it here.

Full suite: **49 files / 454 tests / 0 failed / 0 skipped** (unchanged
count — tests corrected in place, none deleted). Two `npm test` attempts
hit the already-documented, pre-existing Vitest/tinypool
`ERR_IPC_CHANNEL_CLOSED` worker-crash flake; a third attempt completed
cleanly. Those two crashed attempts left exactly 3 orphaned `bs_test_*`
databases, confirmed to have zero active connections and dropped by
their exact individual names; the 19 `bs_test_*` databases already
present before this task began, and the pre-existing `deploy-postgres-1`
container, were left untouched.

This correction is by its own author and is **not** independently
verified merely because it exists. Core and governed Claude QA for the
resulting ARCH-FIX2 head have not yet been observed — this document does
not claim those checks have passed.

Independent review of ARCH-FIX2 **closed REVIEW-C01-B** and confirmed
REVIEW-C01-A's successful-path cleanup, but reproduced the confirmed
early-assertion-failure cleanup gap in the teardown-window scenario — see
ARCH-FIX3 below. **The two `ERR_IPC_CHANNEL_CLOSED` crashes noted above
were NOT unrelated infrastructure noise**: at least this same harness
defect is now confirmed as one real cause. It is not established that
every historical occurrence of this flake elsewhere in the project shares
this cause, and ARCH-FIX3 does not claim to eliminate every possible
cause of it.

## ARCH-FIX3 (2026-09-17): guaranteed cleanup for the REVIEW-C01-A early-failure path

All cleanup responsibility moved into `bootAuthorityTestServer()`'s
`stop()` — shared, idempotent, and state-aware (normal starting/ready;
synthetic-failed-lifecycle-with-owning-writer; teardown already
initiated; already stopped) — called unconditionally from every
scenario's afterEach/finally, never depending on the test body reaching
any particular line. A new permanent regression ("guaranteed cleanup
after an early test failure") boots a real server, creates genuine
authenticated activity, marks the lifecycle failed, throws a unique
synthetic marker before any explicit teardown-triggering code, exercises
the same shared `stop()` path, and independently re-verifies resource
baselines, zero connections, and database removal while confirming the
marker survived. A scratch, disposable-worktree probe (not committed)
injected the identical early failure into the real teardown-window test
under the default `forks` pool: against the pre-ARCH-FIX3 harness it
reproduced the same unhandled pg/IPC crash; against the corrected harness
it failed cleanly on the marker alone, with cleanup still completing.

Full suite: **49 files / 455 tests / 0 failed / 0 skipped** (+1 test, the
new regression; no file added). One `npm test` attempt hit the same
pre-existing flake in an unrelated file (after this file's own 9 tests
had already passed cleanly); a retry completed cleanly. That attempt left
exactly 1 orphaned `bs_test_*` database, confirmed to have zero active
connections and dropped by its exact name; the pre-existing 19
`bs_test_*` databases and the `deploy-postgres-1` container were left
untouched.

This correction is by its own author and is **not** independently
verified merely because it exists. Core and governed Claude QA for the
resulting ARCH-FIX3 head have not yet been observed — this document does
not claim those checks have passed.

## NET-FIX1 (2026-09-18): restrict public matchmaking to canonical admission

Independent Network review of the ARCH-FIX3 head raised
**PERSIST002-NET-01 (HIGH)**: a valid guest credential calling public
`create`/`joinOrCreate` on the `'battle'` room name created an additional,
independent `BattleRoom` instance backed by the same canonical durable
world (`autoDispose=false` means it never self-cleans; it can accept
`SET_PROFILE` and acquire real gameplay leases) — parallel room/simulation
instances for the one singleton world, not multiple world UUIDs.

`installNetworkBoundary()` (`apps/server/src/security/networkBoundary.ts`)
now also narrows the shared, process-level
`matchMaker.controller.exposedMethods` to exactly `['joinById',
'reconnect']`, using Colyseus's own supported public-method restriction and
the same install/nested-ownership/idempotent-restore lifecycle already
trusted for CORS header restoration. `controller.invokeMethod()` rejects an
unexposed method (`MATCHMAKE_NO_HANDLER`, code 4210) before `onAuth` ever
runs, so a rejected `create`/`joinOrCreate`/`join` reserves no seat and
grants no authority. The internal bootstrap room creation
(`matchMaker.createRoom('battle', {})`) is a distinct call `exposedMethods`
never gates, so `apps/server/src/index.ts` needed no changes.

Evidence (real PostgreSQL, real production HTTP/WS composition): extended
`canonicalRoomLifecycle.test.ts` plus 6 new cases prove free-capacity and
full-room `create`/`joinOrCreate`/`join` all rejected (authenticated and
unauthenticated) with the real room inventory
(`matchMaker.query({name:'battle'})`) staying at exactly one room across
repeated/concurrent attempts and after real clients join/leave; the raw
`/matchmake/create/battle` HTTP response is always status 200 with body
`code: 4210` (this project's transport never uses HTTP status to signal
matchmake rejection); an unknown room ID through the still-public
`joinById` gets the distinct `MATCHMAKE_INVALID_ROOM_ID` (4212) and creates
no replacement room; ordinary `joinById` → `SET_PROFILE` still acquires
exactly one real lease referencing the actual canonical room ID.
`productionNetworkBoundary.test.ts`'s Origin-boundary assertions moved from
`joinOrCreate` to `joinById` against the real canonical room ID with a
credential from the allowed-origin identity path, keeping a positive
allowed-origin control and the exact `'onAuth failed'` rejection. A
disposable, detached scratch `git worktree` at the unmodified pre-fix head
(`4f02a00cc9e51d17d24fd80c3a0da6833daf2480`) with only the new tests copied
in reproduced the defect directly (a representative case failed because
`create()` succeeded and a real second room existed afterward, not a boot
failure); the fixed candidate passes the same tests. The scratch worktree
was removed afterward; the implementation worktree was never mutated for
this control.

Full suite: **49 files / 461 tests / 0 failed / 0 skipped** (+6 new cases,
baseline 49/455 → 49/461). Full-workspace typecheck and build (with
`VITE_BURNINGSPACE_SERVER_URL=http://127.0.0.1:2567`) both clean. The
standalone Network client callback diagnostic and
`apps/server/scripts/public-arena-smoke.ts` (both already `joinById`-based)
ran clean against, respectively, the real test-database composition and a
disposable local production-mode server — never real staging. No
pre-existing `bs_test_*` database or the `deploy-postgres-1` container was
touched; the baseline of 19 pre-existing disposable databases was
unchanged after all runs.

**PERSIST002-NET-02 (MEDIUM) remains OPEN**, documentation-only in this
fix: raw transport-peer attribution is unchanged, `X-Forwarded-For`/
`X-Real-IP`/`Forwarded` remain untrusted, and no quota/rate-limit change
was made — recorded in
[`docs/ops/persist-002-staging-db-integration-plan.md`](../ops/persist-002-staging-db-integration-plan.md)
as a deployment availability constraint (shared guest/fresh-auth budgets
behind a single effective transport peer), not an authentication bypass;
public persistence rollout is not authorized until Security/Ops accepts an
explicit mitigation or bounded operating policy.

This fix is by its own author and is **not** independently verified merely
because it exists. Core and governed Claude QA for the resulting NET-FIX1
head have not yet been observed — this document does not claim those
checks have passed.

## PERS-FIX1 (2026-09-18): reuse one DB timestamp for stale-lease release

An independent Persistence review of the NET-FIX1 head
(`c2777bbccfd8b69587379c1cac5ec1d7355b2451`) raised **PERSIST002-PERS-01**:
`claimWorldWriter()`'s stale-lease reconciliation UPDATE called the
VOLATILE `clock_timestamp()` twice, independently, for the same released
row's `updated_at`/`expires_at` — the two calls can diverge and violate
migration 001's `active_session_leases_state_shape_check`. This concerns
the two independent DB-clock evaluations in stale-lease reconciliation,
**not** any canonical-profile timeout.

**PERS-FIX1** (`apps/server/src/persistence/repositories/worldsRepository.ts`)
samples `clock_timestamp()` once via a `WITH db_time AS (...)` CTE reused
for both columns, matching the same idiom already used in
`credentialsRepository.ts`/`sessionLeasesRepository.ts`. Evidence
(`apps/server/test/persistence/writerFencing.test.ts`): PostgreSQL-level
`expires_at = updated_at` and `state_revision`-unchanged assertions added
to the existing takeover tests; a new row-isolation test (unrelated world
and an already-released same-world lease untouched); a new deterministic
regression using a schema-qualified test-only advancing-clock function
behind a narrow `Queryable`-forwarding probe that substitutes
`clock_timestamp()` only inside the fingerprinted reconciliation statement
— exactly one substituted call under the fix (proving single evaluation).
**Negative control:** the same test file, copied unmodified into a
disposable scratch worktree at the pre-fix head
(`c2777bbccfd8b69587379c1cac5ec1d7355b2451`), failed with the real
PostgreSQL error `violates check constraint
"active_session_leases_state_shape_check"` at the exact pre-fix statement;
removed afterward, implementation worktree never mutated.

`writerFencing.test.ts`: 4/4 pass. Full suite: **49 files / 463 tests, 0
failed** (baseline 49/461 + 2 new cases). Full-workspace typecheck clean,
including the test file via a temporary throwaway tsconfig (deleted, not
committed). `npm run build` with `VITE_BURNINGSPACE_SERVER_URL` set only in
the invoking process's environment (never written to a repository `.env`,
restored/absent afterward) completed clean.

**Docker note:** mid-session Docker Desktop's daemon became unresponsive
and needed a user-initiated restart, then a second because the first left
containerd's metadata store read-only, blocking new-container creation
(this is why `backupRestore.test.ts` failed on the first full-suite
attempt; it passed 2/2 after the second restart). Both restarts were
user-initiated, not by this task. `deploy-postgres-1` was `docker start`ed
back up unchanged each time (never recreated/reconfigured); two leftover
ephemeral `bs_backup_test_*` containers from the interrupted attempt were
removed once Docker was healthy.

**Resource accounting:** `deploy-postgres-1` has no persistent volume
(`Mounts: []`); its data lives entirely in the container's own writable
layer, and the container itself was not recreated across either restart.
The NET-FIX1 section above records a baseline of **19** pre-existing
`bs_test_*` databases; **that baseline is no longer current** — after the
Docker Desktop incident, `deploy-postgres-1` now holds 4 total databases
and zero matching `bs_test_*`/`bs_backup_test_*`. This is not attributable
to this task's own test runs (which always create/drop their own
uniquely-named disposable databases; confirmed zero left over) and most
plausibly followed from the containerd-repair restart resetting the
container's writable layer; the exact mechanism was not directly observed.
No other task's resources were deleted or assumed unchanged without
checking.

This fix is by its own author and is **not** independently verified merely
because it exists. Core and governed Claude QA for the resulting PERS-FIX1
head have not yet been observed — this document does not claim those checks
have passed. The runtime fix and negative-control evidence fit the
Product-Architect-authorized PERS-FIX1 direction; this is **not**
independent PERS-01 closure or merge approval.

## SEC-FIX1 (2026-09-18): runtime DB selection, profile authorization ordering, operator secret transport

An independent Security review of the PERS-FIX1 head (supplied report hash
`97ef06b569bb05c5f5ce44d6e37bf25d98cdecdb169c0936ae1e1a5de2cafce0`, treated
as supplied provenance, not independently re-verified here) confirmed three
findings — low severity is not treated as license to leave a confirmed
defect unaddressed:

- **PERSIST002-SEC-01 (MEDIUM):** the runtime (`bootPersistenceRuntime()`
  and `index.ts`'s identity/gameplay pool) could select
  `MIGRATION_DATABASE_URL` (elevated migrator credentials), the same
  selector correctly used by the read-only migration-status CLI command.
  Fixed with a new `readRuntimeDatabaseUrl()`
  (`apps/server/src/persistence/config.ts`) that uses `DATABASE_URL` only,
  unconditionally, never inspecting `MIGRATION_DATABASE_URL` at all, used
  for every runtime connection. The operator CLI's own two selectors are
  byte-for-byte unchanged.
- **PERSIST002-SEC-02 (LOW):** `lockProfilePrefix()`
  (`apps/server/src/persistence/gameplayAuthority.ts`) mutated
  `display_name` before verifying the credential/player association was
  active, so a rejected (invalid/revoked/mismatched) credential could
  still durably rename a player (`withTransaction` commits on any normal
  return). Fixed by moving the mutation after the credential check, same
  transaction and lock order, no new preflight step.
- **PERSIST002-SEC-03 (LOW):** `runPgDumpSnapshot`/`runPgRestore`/
  `runPsqlFile` (`apps/server/scripts/persistence-tooling.ts`) passed the
  raw connection password as a `--dbname` docker/tool argument, visible in
  host docker CLI argv, container command metadata, and the tool's own
  argv. Fixed with a `.pgpass`-format entry (host/port/db/user wildcarded,
  password escaped and control-character/percent-encoding validated)
  supplied over stdin into a file created inside the ephemeral container's
  own filesystem (never a host bind mount) by a fixed, never-interpolated
  shell wrapper, relying on the container's own `--rm` plus its own
  `trap ... EXIT` for cleanup.

Evidence, all against real PostgreSQL/Docker: a 15-case unit matrix for
`readRuntimeDatabaseUrl()` plus a real role-separated-Postgres regression
proving every real connection (including a real query through a separate
identity pool) used exactly `burningspace_runtime` via `pg_stat_activity`,
a forbidden `CREATE TABLE` failing with SQLSTATE `42501`, and
migration-only startup failing closed before any connection
(`apps/server/test/persistence/config.test.ts`,
`persistenceRuntimeBoot.test.ts` +2); 5 real-PostgreSQL cases proving a
revoked or mismatched credential never mutates `display_name` (including
an authenticate-then-revoke-then-resubmit spectator case), with a valid-
credential positive control still succeeding
(`gameplayAuthorityProfileMutation.test.ts`); a unit matrix for the new
password-stripping/pgpass-escaping logic plus a real backup+restore cycle
with the genuine `node:child_process.spawn` wrapped (never replaced) to
prove no captured `docker run` argv ever contained the password, while
stdin genuinely did
(`persistenceToolingSecretTransport.test.ts`). **Negative controls:** all
three test files (SEC-03's trimmed to drop the new-export-only unit
matrix, which cannot exist pre-fix), copied unmodified into a disposable
scratch worktree at the PERS-FIX1 head
(`cbc91039fee1b7bd5329553383080bea5ed40844`), failed exactly as expected —
real `burningspace_migrator` usage and a silent migration-only boot for
SEC-01, 4/5 mutated-display_name failures for SEC-02 (the positive
control correctly non-discriminating), and the real password plainly
visible in captured argv for SEC-03. Both scratch worktrees were removed
after use; the implementation worktree was never mutated for either.
`db-privilege-check.ts` (unchanged) run against a fresh role-separated
instance: 22/22 probes passed.

Full suite: **52 files / 495 tests, 0 failed** (baseline 49/463 + 32 new
cases). Full-workspace typecheck, both script-specific tsconfig checks,
and the three new test files (via a temporary, deleted throwaway
tsconfig) all clean. `npm run build` with `VITE_BURNINGSPACE_SERVER_URL`
scoped to that one process only (confirmed absent from the shell before
and after) completed clean. No Docker restart was needed this session;
resource inventory before/after matched (`deploy-postgres-1` untouched at
4 total databases, 0 disposable residue).

This fix is by its own author and is **not** independently verified
merely because it exists. Core and governed Claude QA for the resulting
SEC-FIX1 head have not yet been observed. This is **not** independent
SEC-01/02/03 closure or merge approval, and does not reopen the
already-closed C-01/REVIEW-C01-B/NET-01/PERS-01 dispositions above.

**PERSIST002-NET-02 (MEDIUM) now explicitly BLOCKS PUBLIC PERSISTENCE
ROLLOUT**, not merely repository merge: deferring its implementation
relative to merge is accepted; deferring it relative to public
persistence deployment is not — see
[`docs/ops/persist-002-staging-db-integration-plan.md`](../ops/persist-002-staging-db-integration-plan.md)
for the updated gate (implemented mitigation + spoof-resistance/
multi-client tests + explicit Security/Ops acceptance + separate PA
deployment authorization required; a documented "bounded operating
policy" or a raised quota alone does not close it).

## Status reconciliation (2026-09-18): SEC-01/SEC-02 independently closed; SEC-03 partially remained open

An independent Security delta review of the SEC-FIX1 head
(`de424972826bc6f8424658530958ed56de0a87f8`) **closed PERSIST002-SEC-01**
and **PERSIST002-SEC-02**. **PERSIST002-SEC-03 remained LOW / OPEN**: the
SEC-FIX1 correction only stripped a *userinfo* password; a `password` or
`sslpassword` connection-string *query parameter* still reached
Docker/pg-tool argv unchanged. SEC-FIX2 (below) closes that residual path.

Per the same reconciliation, **C-01 (the ARCH-FIX1 runtime fix),
REVIEW-C01-A, REVIEW-C01-B, PERSIST002-NET-01, and PERSIST002-PERS-01 are
all previously closed** and are **not** pending repeat independent review.
The individual sections above (ARCH-FIX1–3, NET-FIX1, PERS-FIX1, and the
"Independent delta review of PERSIST002-C-01" section) remain as the
historical record of how each was fixed and reviewed; they are preserved
unchanged and should be read as history, not as open items.

## SEC-FIX2 (2026-09-18): reject secret-bearing database query options

**PERSIST002-SEC-03 residual — query-string `password`/`sslpassword`
reached Docker/pg-tool argv unchanged:** SEC-FIX1's
`toPasswordFreeConnection()` only ever stripped a *userinfo* password;
`password=...` or `sslpassword=...` placed in the connection URI's
*query string* rode straight through inside `dbUrl` into
`docker run ... pg_dump|pg_restore|psql`'s `--dbname` argument,
unprotected — the same argv-exposure class SEC-FIX1 fixed for userinfo,
left open for this one query-parameter path.

Product Architect decision, implemented in
`apps/server/scripts/persistence-tooling.ts`: for all three operator
wrappers (`runPgDumpSnapshot`/`runPgRestore`/`runPsqlFile`), a connection
URI containing any query parameter **named** `password` or `sslpassword`
(case-insensitive, checked before decoding so a percent-encoded name is
still caught; rejected even when the value is empty, the parameter is
repeated, or a userinfo password is also present) is now **rejected
outright, before spawning Docker or any PostgreSQL tool** — no
password-precedence rule, no silent discard. The new
`rejectSecretBearingQueryParameters()` runs as the very first step inside
the shared `runPgTool()`, before `resolveContainerDatabaseAccess()`'s own
platform-specific URL transformation could throw an unsafe raw parse
error, and before `toPasswordFreeConnection()`'s empty-userinfo-password
early return could let a query-string secret through untouched. It
parses the raw, still-percent-encoded query string by hand (never the
lenient `URLSearchParams`) so malformed/ambiguous percent-encoding in a
parameter *name* fails safe (rejected) rather than risking a permissive
decode dodging the name check; only parameter names are ever inspected or
decoded, values are never read, and the connection string itself is never
mutated or reserialized, so every other accepted setting (`sslmode`,
`connect_timeout`, `application_name`, etc.) keeps its exact existing
semantics. `sslpassword` (a TLS private-key passphrase) is deliberately
**not** supported by the `.pgpass`/stdin channel — that channel exists
only for the ordinary database login password; adding encrypted-key or
service-file support is explicitly out of scope for this correction. The
accepted secret channel itself (stdin-to-private-container-file wrapper,
`.pgpass` escaping/permissions, the fixed shell script, invocation-scoped
cleanup, the pinned image, Linux host networking, Docker Desktop host
resolution, snapshot lifetime/restore verification) is **unchanged**.

Evidence, extending
`apps/server/test/persistence/persistenceToolingSecretTransport.test.ts`
(+21 cases, all against real PostgreSQL/Docker where relevant): a 15-case
unit matrix for `rejectSecretBearingQueryParameters()` (query-only
`password`/`sslpassword`, each combined with a userinfo password, both
keys together, a repeated key, an empty value, a bare key with no `=`, a
percent-encoded name, mixed case, malformed percent-encoding, a totally
malformed URI, an ordinary value merely *containing* the word "password",
no query at all, and ordinary settings passing through); a real
`runPsqlFile` invocation with `application_name=password-check` still
succeeding (names, not values, are inspected); 5 new cases calling the
three actual exported wrappers directly with forbidden inputs, each
asserting a safe `PersistenceToolError` rejection **and** an unchanged
real `node:child_process.spawn` call count (snapshotted immediately
around the call so unrelated fixture setup cannot satisfy the
assertion) — proving zero Docker/tool processes are ever started for a
rejected input — plus a check that the thrown error's own message and
enumerable properties never contain the rejected sentinel. **Negative
control:** the three wrapper-level tests, copied unmodified into a
disposable scratch worktree at the SEC-FIX1 head
(`de424972826bc6f8424658530958ed56de0a87f8`) without touching its
pre-fix `persistence-tooling.ts`, all failed exactly as expected — the
spawn count went from 0 to 1 in each case, proving the pre-fix wrappers
really did spawn a real `docker run` with the query-string secret still
present, instead of rejecting it. The scratch worktree was removed after
use; the implementation worktree was never mutated for this control.

Full targeted suite (`persistenceToolingSecretTransport.test.ts`): 31/31
pass. Existing `backupRestore.test.ts` end-to-end coverage: 2/2 pass,
unchanged. Both operator-script typechecks
(`tsconfig.persistence-tools.json`/`tsconfig.external-staging.json`) and
full-workspace `npm run typecheck` clean. `npm run build`, with
`VITE_BURNINGSPACE_SERVER_URL=http://127.0.0.1:2567` scoped to that one
process only (confirmed absent from the shell before and after), clean.

**Unexpected failure, disclosed:** a full `npx vitest run` under this
repository's default (forks) pool configuration hit the same
pre-existing, previously documented Vitest/tinypool
`ERR_IPC_CHANNEL_CLOSED` worker crash on **five** consecutive attempts in
this session, each in a different, unrelated test file
(`level2DurableRecovery.test.ts`, `persistenceRuntimeBoot.test.ts`,
`productionReconnectLifecycle.test.ts`, `guestIdentityEndpoint.test.ts`,
then again in an unrelated file), none of them touched by this change.
Each crashed attempt's exactly-named orphaned disposable database was
confirmed to have zero active connections and dropped by its exact name;
no other resource was touched. A diagnostic-only `--pool=threads` run
(explicitly **not** a substitute for the required default-pool
configuration) completed cleanly at **52 files / 516 tests**, confirming
no logic regression from this change; a clean run under the actual
required default (forks) pool configuration was not obtained this
session despite five disclosed attempts, and is recorded here as an
unexpected, pre-existing environmental limitation rather than retried
further or forced by altering pool/timeout settings.

*(Historical, as of SEC-FIX2 publication; superseded by the QA-RECOVERY-003
section below.)* This fix was by its own author and was **not**
independently verified merely because it existed; Core and governed
Claude QA for the SEC-FIX2 head had not yet been observed then, and it was
not independent SEC-03 closure or merge approval. Independent SEC-03
closure was later recorded at `629f165...`.

**PERSIST002-NET-02 (MEDIUM) remains OPEN and continues to explicitly
BLOCK PUBLIC PERSISTENCE ROLLOUT** (unchanged from SEC-FIX1): its
implementation may be separate from repository merge, but public rollout
still requires an implemented admission-budget mitigation,
spoof-resistance and multi-client budget tests, explicit Security/Ops
acceptance, and a separate Product Architect deployment authorization —
see
[`docs/ops/persist-002-staging-db-integration-plan.md`](../ops/persist-002-staging-db-integration-plan.md).
No quota, proxy-trust, or Caddy change was made.

**Documentation-only scan correction** (commit
`629f165d9a259df2fb245cefce930d56270c1419`, the reviewed pre-publication
checkpoint for QA-RECOVERY-003): the
SEC-FIX2 head's Core run failed the "Scan Phase A files for high-signal
secret material" step because an illustrative
`postgres://user:password@host/db` example added to
`docs/ops/persist-002-staging-db-integration-plan.md` used a hostname the
scanner does not allow; changed to `127.0.0.1`. No SEC-FIX2 technical
byte changed.

## QA-RECOVERY-003 (2026-09-19): bounded QA-diagnostic capacity and run-ID display — technical patch PA-reviewed and approved for publication

Three evidence sources are kept separate and must not be conflated:

1. **Core Pull Request Checks** run `35387608566`, job `105738070748`,
   attempt 1: **SUCCESS** at source head
   `629f165d9a259df2fb245cefce930d56270c1419` — the test/build/typecheck/
   diagnostic/Caddy/container-integration evidence for that checkpoint.
   None of it belongs to the Claude QA run.
2. **Claude QA Review Pilot** run `35387608535`, job `105738069692`,
   attempt 1: overall **FAILURE at the diagnostic sanitizer**. The
   owner-provided Step Summary confirms `execution_file_invalid` /
   `record_count_limit` (`MAX_RECORDS` was 200) and run ID shown
   `unavailable` (the run-ID field used `safe_int`'s general `10**9`
   default — a display defect that did not cause `record_count_limit`).
   Validation and publication succeeded. The exact historical record
   count is **unknown** and is not claimed, nor attributed to any other
   historical QA failure.
3. **Independent final functional QA:** a separate review returned
   **APPROVE**, accepted by the Product Architect, at `629f165...`. It is
   not a result of either workflow job.

**Current dispositions at `629f165...`:** PERSIST002-SEC-03 independently
**CLOSED**; final independent functional QA **APPROVE**; C-01,
REVIEW-C01-A, REVIEW-C01-B, PERSIST002-NET-01, PERSIST002-PERS-01,
PERSIST002-SEC-01 and PERSIST002-SEC-02 remain closed. None of these
reviews is repeated for this diagnostic-only patch. `629f165...` is the
reviewed **pre-publication checkpoint**, not the permanent PR head; the
mandatory automatic QA workflow status was unsatisfied at that checkpoint
solely because of the sanitizer failure above.

The patch (`.github/scripts/sanitize-claude-diagnostic.py`,
`.github/scripts/test-claude-qa-audit.py`):

- `MAX_RECORDS` `200 -> 2000` — an explicit bounded resource-budget
  decision, not a measured historical count and not a guarantee for future
  runs. `MAX_FILE_BYTES` 1,000,000, `MAX_DEPTH` 20, `MAX_FREEFORM_LENGTH`
  500 and every UTF-8/duplicate-key/NUL/depth/secret check are unchanged;
  the whole accepted file is still parsed, and a file over 2000 records
  still fails closed with `execution_file_invalid` / `record_count_limit`
  and a nonzero exit.
- The trusted run-ID field alone gets an explicit `2**63 - 1` bound; the
  general `safe_int` default and other fields are untouched, and
  zero/negative/out-of-range IDs stay "unavailable".
- A fixed-label stdout line surfaces the already-allowlisted subreason
  (or "unavailable") — never exception text, transcript fragments, paths,
  session IDs or tokens.

`.github/workflows/claude-qa-review-pilot.yml` is unchanged (blob
`89ccd3928ee452ebb23ecb632a7d93b6a3d76ddb`); no classifier, routing,
reviewer-prompt, agent, Action-pin, validator, renderer or publisher file
is touched.

**Verification:** the Product Architect personally ran the classifier
suite (29/29, exit 0), the QA audit (89 PASS checks, exit 0) and
independent synthetic CLI/AST probes (27/27) against the reviewed patch
(SHA-256 `aad35aa4ef0539e3b4eef1e42d2edf06e7a17622a20019457fdde5e17711fcc9`);
the PA report SHA-256
`55a74e73599308458fb907fc9d62ec677702777d5bd0bc65e00c01b66bd29b03` is
supplied provenance, not recomputed here. Approved Git blobs: sanitizer
`0b4ff8193b7d198cc05924518bfa5214ad8f704b`, audit
`af850e7fd907d831b584619713497802d79fcf77`. *(Historical preparation
evidence:)* the patch was first prepared locally and uncommitted; a
synthetic negative control showed the original sanitizer rejecting a
201-record fixture with `record_count_limit` and showing run ID
`35387608535` as unavailable, while the patched sanitizer accepted it with
genuine result extraction and displayed the exact ID. This reproduces the
two diagnosed code paths; it is not a replay of the unavailable
historical transcript.

**Publication state (at publication time; the exact-head outcomes are recorded in the SOURCE-TEXT-FIX1 entry):** committed and pushed as one commit on top of
`629f165...`. Exact-new-head Core and governed Claude QA outcomes have
**not yet been observed** and no success is anticipated. Application tests
are unchanged; the reviewed Core baseline is 52 files / 516 tests / zero
skipped, so a Core result must show a completed test summary and any
discrepancy must be reported rather than inferred from a green step.

**Still open, unchanged:** QA-01 (test-completeness hardening, deferred
separate work); QA-02 (review-artifact archival) and QA-03 (final
evidence reconciliation); **PERSIST002-NET-02 (MEDIUM/OPEN)**, which
blocks public persistence rollout — see
[`docs/ops/persist-002-staging-db-integration-plan.md`](../ops/persist-002-staging-db-integration-plan.md);
the final Product Architect merge approval and the human merge. Missing
original review reports are not reconstructed and their hashes are not
claimed as independently verified.

## SOURCE-TEXT-FIX1 (2026-09-19): visible escapes for embedded control characters

**Exact-head outcomes at `f8a9ab48373101158ad4e6585f755303c68c4ba7`
(QA-RECOVERY-003 as published):**

- Core Pull Request Checks run `35418072318`: **SUCCESS**; the completed
  application suite reported **52 files / 516 tests passed**.
- Claude QA Review Pilot run `35418072316`, job `105830449356`, attempt 1:
  the diagnostic sanitizer step **SUCCEEDED** (the QA-RECOVERY-003
  capacity/run-ID correction worked on a real run). The overall workflow
  nevertheless **FAILED** because the reviewer's own output was rejected by
  the unchanged validator: `blockers[0]` exceeds the 500-character item
  limit (failure comment `5738973423`). That output is unvalidated and is
  **not** an accepted QA approval; the validator and the failed review were
  not edited or weakened.

**Separately verified source issue.** The unvalidated reviewer output
pointed at raw control characters in two source files, and the Product
Architect independently inspected the source. Byte-level inventory at
`f8a9ab48...`: `apps/server/test/persistence/worldDiscoveryOrigin.test.ts`
line 199 had one raw NUL (U+0000) immediately before `unreachable` in a
`?? '...unreachable'` fallback string; `apps/server/scripts/public-arena-smoke.ts`
line 49 had raw U+0000, U+001F and U+007F inside the Origin-validation
regex character class. No other raw control bytes, non-ASCII bytes, CRLF or
lone CR were present in either file. Because of the raw NUL, Git treated
both files as binary against the PR base (numstat `-`/`-`, no textual
diff).

**Representation-only correction** (blobs before: `worldDiscoveryOrigin.test.ts`
`77a39232f62c1e638186fdd71cbd99667836d011`, `public-arena-smoke.ts`
`3e1be0b9abee5211359a2008fb235be8d6bf764f`): the NUL became the visible
escape `\u0000` (the string still starts with a NUL followed by
`unreachable`), and the class became `/[\u0000-\u001f\u007f]/u` (same
matched set, same `u` flag). Nothing else changed: no reformatting, no
line-ending or Unicode rewrite, no test/assertion/timeout/cleanup change,
no Origin-policy, authentication, rate-limit or runtime change, and no
`.gitattributes`/textconv override. Both files now contain no raw control
bytes and compare against the PR base as text (numstat 261/0 and 66/19).

**Equivalence evidence (temporary local probe, not committed):** the old
and new fallback strings have identical length (12) and identical character
codes; the old and new regexes agree for every ASCII code point 0..127 (the
matched set is exactly U+0000..U+001F plus U+007F) and for 11 representative
valid/invalid Origin strings; regex flags are identical (`u`). The
`RegExp.source` text differs by design; behavior was compared.

**Validation (local, loopback only):** `worldDiscoveryOrigin.test.ts`
against real disposable PostgreSQL 6/6 passed, 0 skipped;
`npx tsc -p apps/server/scripts/tsconfig.external-staging.json --noEmit`,
`npx tsc -p apps/server/scripts/tsconfig.persistence-tools.json --noEmit`
and `npm run typecheck` clean (a temporary tsconfig covering the two
changed files reported only a `process.send` typing error on an untouched line of the test's telemetry-filter block; an identical baseline run was not established, so it is not claimed to be pre-existing); `public-arena-smoke.ts`
against an owned local production-mode server on a disposable database
completed with the hostile-Origin check, and a smoke Origin containing
U+0001 was rejected with the same "exact HTTP or HTTPS origin" error; the
unchanged Phase A scanner passed over its 30 files; `git diff --check`
clean. A full local rerun was not performed; the normal remote Core run
remains required. The QA-RECOVERY-003 files are unchanged
(`sanitize-claude-diagnostic.py` `0b4ff8193b7d198cc05924518bfa5214ad8f704b`,
`test-claude-qa-audit.py` `af850e7fd907d831b584619713497802d79fcf77`, and
the workflow `89ccd3928ee452ebb23ecb632a7d93b6a3d76ddb`).

*(At publication time; the later observed outcomes and the merge are recorded in the post-merge status.)* Exact-new-head automatic Core and governed QA outcomes for the correction commit were **not yet observed** then. The earlier independent
acceptances and closures stand; the binary-diff observation alone does not
invalidate them or show that earlier reviewers did not read these files.
Still open at that time (current state: see the post-merge status): QA-01 (deferred test-completeness hardening), QA-02
(original-review archival), QA-03 (final evidence reconciliation),
PERSIST002-NET-02 (MEDIUM/OPEN, blocks public persistence rollout), the
final PA merge approval and human merge.

## PERSIST002-NET-02 (2026-09-19): admission budget hardening — IMPLEMENTED LOCALLY, NOT CLOSED

Task: [PERSIST002-NET-02 — Admission Budget Hardening](../tasks/persist-002-net-02-admission-budget-hardening.md)

- **Base:** exact `origin/main` `3aab85dbc21e01cf0689a1f9bb2dc59d2e64cb96` (merge commit of PR #87), verified by `git fetch origin --prune`.
- **Branch / worktree:** `security/persist-002-net-02-admission-budget-hardening` in a dedicated implementation worktree. The read-only blueprint branch was not reused and the preserved primary checkout was not modified.
- **State:** local working-tree changes only. **No commit, no push, no PR, no merge, no workflow dispatch, no image publication, no VPS access, no staging traffic, no Caddy reload on any real host, no DB schema or migration change.**
- **What changed:** one canonical server-private admission-peer identity resolver (`apps/server/src/security/admissionPeerIdentity.ts`) now keys BOTH admission budgets. Under a trusted edge peer, the internal `X-BurningSpace-Edge-Peer` assertion (Caddy `header_up ... {remote_host}`, SET/overwrite on the public **server** route; explicitly REMOVED on the public **client** route per PA FIX1) gives each public client its own budget; from any untrusted peer the header is ignored entirely. Malformed or missing assertions from a trusted peer FAIL CLOSED onto the existing `rate_limited` / `auth_rate_limited` shapes. `X-Forwarded-For`, `X-Real-IP` and `Forwarded` remain unused for admission identity, `trusted_proxies` remains unused, and no rate-limit quota changed.
- **Untouched by design:** `networkBoundary.ts`, `peerRateLimiter.ts`, `tokenBucketRateLimiter.ts`, `rooms/BattleRoom.ts`, and all gameplay profile/input limiters.
- **Negative control:** built against exact baseline `3aab85db...` in a disposable detached worktree. Baseline reproduced the bug through real admission behavior (client B rate-limited on its first request by client A's consumption; 3 player rows). The fixed code gives B an independent budget in the same scenario, and the fixed code run WITHOUT trusted-edge configuration collides again — proving the header alone grants no authority.
- **Caddy proof:** pinned real Caddy 2.11.4 (sha256/sha512 verified against `deploy/edge/caddy/caddy-validation-release.json`) executed in a throwaway Linux container. `fmt --diff` clean on the rendered real template, `adapt` + `validate` pass, adapted JSON shows the internal header SET only on the server route from `{http.request.remote.host}` and REMOVED only on the client route, and the runtime edge-contract check reported `runtimeExecuted: true` with all 39 assertions true, including the NET-02 spoof-resistance set and the PA FIX1 client-route stripping proof.
- **Factual correction recorded:** Caddy's current `reverse_proxy` defaults already ignore incoming `X-Forwarded-*` values for spoof-resistance. Nothing in this work claims the current edge blindly trusts attacker-controlled `X-Forwarded-For`; the dedicated internal header was chosen for explicitness and testability.
- **Rollout value deliberately not committed:** `BURNINGSPACE_TRUSTED_EDGE_PEERS` is a required substitution in `deploy/docker-compose.staging.yml`, and the committed examples carry the explicit direct-peer-only sentinel `none`. The live Docker gateway address is not guessed here; a public rollout must measure the exact peer inside the target container, and `none` or an omitted value is never rollout acceptance.
- **One approved surface exception:** `apps/server/scripts/external-staging-preflight.ts` received a single `ENV_KEYS` allowlist entry (no validation logic change) because its strict inventory check otherwise rejects the new required variable in `deploy/external-staging.env.example`. This was raised to and approved by the PA before editing.
- **NET-02 is NOT CLOSED.** It closes only after publication, exact-head Core SUCCESS, governed QA, independent Architecture / Network / Security / QA review, PA acceptance and human merge. Even a CLOSED NET-02 removes only one rollout blocker and does **not** authorize persistence deployment. QA-01 and QA-02 remain unrelated deferred items.

## PERSIST002-NET-02 PA FIX2 (2026-09-19): authenticate the trusted edge hop — IMPLEMENTED LOCALLY, NOT CLOSED

PA source-delta review of FIX1 found one HIGH security blocker,
`PERSIST002-NET02-EDGE-AUTH-01`. FIX2 addresses it locally. NET-02 stays
**OPEN**.

- **Blocker:** the trusted direct socket peer is the Docker bridge / NAT
  gateway, which identifies the host-side NAT path and **not** the Caddy
  process. Another local process on the VPS could reach the host-published
  loopback port, arrive with the same trusted peer, forge
  `X-BurningSpace-Edge-Peer`, and be treated as an edge-attributed client.
- **Pre-FIX2 negative result** (real server, real PostgreSQL, trusting
  `127.0.0.1`, direct loopback call, no proof): forged peer `198.51.100.11`
  and forged peer `198.51.100.22` each obtained an independent capacity-3
  burst (`[201,201,201,429]` twice), creating six durable players from one
  socket peer.
- **Fix:** the peer allowlist is retained but is now only one factor. A second
  cryptographic factor, `X-BurningSpace-Edge-Proof` carrying
  `BURNINGSPACE_EDGE_ASSERTION_SECRET` from the operator-controlled Caddy
  environment, authenticates the hop. Node honors the peer assertion only when
  the canonical direct peer is trusted **and** the proof authenticates; the
  proof is checked first. Startup fails closed on any mismatched pair.
- **Secret handling:** exactly 32 random bytes in canonical unpadded base64url
  (43 characters). Only a SHA-256 verifier is retained, privately; the
  resolver's public config omits it structurally; comparison is
  `crypto.timingSafeEqual` over fixed 32-byte digests. The secret, verifier,
  supplied proof and raw header values are never logged. Diagnostics carry
  only `edge_proof_missing` / `edge_proof_malformed` / `edge_proof_rejected`.
- **Post-FIX2 proof:** the same direct bypass now returns `429 rate_limited`
  for every shape (no proof, wrong proof, malformed proof, padded proof,
  repeated proof, empty proof) across two forged identities, with **0** player
  rows; twenty distinct forged identities consume no token, leaving a genuine
  client's full capacity-3 burst intact; the identical request through the
  trusted edge proxy that SET-overwrites both headers succeeds.
- **Array contract correction:** `Array.isArray` now always rejects for both
  internal headers; the single-element acceptance test is replaced with
  rejection evidence.
- **Caddy:** the public server route SETs both internal headers and the public
  client route REMOVEs both. The rendered `/etc/caddy/Caddyfile` keeps
  `{$BURNINGSPACE_EDGE_ASSERTION_SECRET}` unresolved, so the on-disk config
  never contains the secret; the adapted-config inspector rejects an artifact
  in which it was resolved.
- **Operator environment:** because `/etc/caddy/burningspace.env` is
  documented as a non-secret inventory, the secret is delivered through a
  separate root-owned, `caddy`-readable
  `/etc/caddy/burningspace-edge-secret.env`, added to the reviewed systemd
  drop-in as the one exact additional file this required. **Superseded by PA
  FIX3-A below:** that environment channel was rejected and replaced by a
  systemd `LoadCredential=` unit credential.
- **Ops accuracy, recorded deliberately:** the Docker bridge peer allowlist is
  a network-location restriction, **not** proof of the Caddy process. The edge
  proof authenticates the Caddy/operator hop. After Docker network recreation
  the observed direct peer may change and must be re-measured before an
  authorized rollout. It is not claimed that the Docker gateway address
  uniquely identifies Caddy.
- **Validation:** complete suite against reachable PostgreSQL 17.11 — **54
  test files / 655 tests / 0 skipped**; `npm run typecheck` clean; `npm run
  build` clean (with the CI-supplied `VITE_BURNINGSPACE_SERVER_URL`);
  `git diff --check` clean; classifier 29 OK; Claude QA audit 89 PASS / 0
  FAIL; Phase A secret scan clean. Edge preflight self-tests 101. Pinned real
  Caddy **2.11.4** runtime contract check executed in a throwaway Linux
  container: `runtimeExecuted: true`, **54 assertions, all true**, 56 tests,
  covering both internal headers on the server route (including HTTP and
  WebSocket upgrade) and zero values for both on the client route. The check
  uses a runtime-generated disposable secret and never prints it.
- **State:** local working-tree changes only. **No commit, no push, no PR, no
  deployment, no image publication, no VPS access, no Caddy reload on any real
  host, no production secret creation, no database or schema change.**

Status: `IMPLEMENTED LOCALLY / PA SOURCE REVIEW PENDING`.

## PERSIST002-NET-02 PA FIX3 (2026-09-19): secure credential transport + canonical proof — IMPLEMENTED LOCALLY, NOT CLOSED

PA source review of the FIX2 patch **accepted the core architecture** and
returned three bounded corrections. All three are implemented locally. NET-02
stays **OPEN**.

- **FIX3-A (HIGH) `PERSIST002-NET02-SECRET-TRANSPORT-01`:** `EnvironmentFile=`
  is rejected as the secret transport and **removed**. The edge secret now
  reaches Caddy as a systemd unit credential: source
  `/etc/caddy/burningspace-edge-assertion-secret` (`root:root` `0600`, raw
  43-character value, no `KEY=` prefix, no trailing newline), drop-in line
  `LoadCredential=burningspace-edge-assertion-secret:/etc/caddy/burningspace-edge-assertion-secret`,
  exposed to `caddy.service` alone at
  `/run/credentials/caddy.service/burningspace-edge-assertion-secret`, and read
  by the public server route through
  `header_up X-BurningSpace-Edge-Proof {file./run/credentials/...}`. This is
  `LoadCredential=`, **not** `LoadCredentialEncrypted=`; no encryption-at-rest
  claim is made. The Node server's own delivery is unchanged.
- **FIX3-B (LOW) `PERSIST002-NET02-PROOF-CANON-01`:** the incoming proof
  verifier now applies the same canonical base64url round-trip as the startup
  parser, rejecting a non-canonical spelling of the real secret as
  `edge_proof_malformed` before hashing.
- **FIX3-C (MEDIUM) `PERSIST002-NET02-ENV-EXAMPLE-01`:** the malformed bare
  line in `deploy/external-staging.env.example` (a generation command split
  across lines) is removed; the file now parses cleanly through
  `docker compose --env-file` and the repository's own preflight parser.
- **Runtime evidence, re-run after the TypeScript change:** complete suite
  against reachable PostgreSQL 17.11 — **54 test files / 659 tests / 0
  skipped**. Focused unit suite 113. Direct host-local bypass still fails
  closed for every shape with 0 player rows. Canonical-equivalence test proven
  discriminating: with the FIX3-B check temporarily removed it fails.
- **Edge evidence:** edge preflight self-tests 108; template mode, render,
  `caddy fmt --diff` clean, `adapt` + `validate` pass, adapted JSON retains
  only the approved `{file....}` placeholder and no secret; staging preflight
  self-tests 56 plus a live compose-config parse of the repaired env example;
  `systemd-analyze verify` passes with and without the credential source
  present. Pinned real **Caddy 2.11.4** runtime contract: `runtimeExecuted:
  true`, **57 assertions, all true**, 59 tests — including proof that the
  running Caddy's own `/proc/<pid>/environ` contains neither the secret nor
  the variable name, and that the on-disk Caddyfile contains no secret.
- **CI contract synchronized:** edge-contract assertion count **54 -> 57**
  (numeric contract only). **Incomplete as written — see PA FIX4-D below:**
  a later commit on this branch also added CI provisioning of the exact
  `/run/credentials/caddy.service` path, recorded as
  `PERSIST002-NET02-CI-01`.
- **State:** local working-tree changes only. **No commit, no push, no PR, no
  merge, no workflow dispatch, no deployment, no image publication, no VPS
  access, no Caddy reload on any real host, no production secret creation or
  use, no database or schema change.**

Status: `PA SOURCE APPROVED / PUBLICATION AUTHORIZED / AWAITING EXACT-HEAD CI AND INDEPENDENT REVIEWS`.

PERSIST002-NET-02 — **OPEN**. PUBLIC PERSISTENCE ROLLOUT — **BLOCKED**.
**NO DEPLOYMENT AUTHORIZED.**

## PERSIST002-NET-02 PA FIX4 (2026-09-19): review hardening — PUBLISHED ON PR #88, NOT CLOSED

Independent Architecture, Network and Security reviews and governed Claude QA
all returned **approve / approved with suggestions, no blockers** on head
`b3ca93567abf3254f1baa181e4c2ff6d42454ba2`. PA FIX4 implements exactly four
bounded corrections on the existing PR #88 branch.

- **FIX4-A `PERSIST002-NET02-CHECKER-SAFETY-01`:** the edge contract checker
  can no longer overwrite a pre-existing credential at the exact
  production-compatible runtime path. Creation is exclusive
  (`writeFileSync(..., { flag: 'wx' })`), a pre-existing path raises a
  deterministic `EDGE_CREDENTIAL_PRESENT` error with a fixed diagnostic, and
  cleanup removes the file **only** when this invocation created it. Five
  discriminating guard assertions cover refusal-to-overwrite, the
  pre-existing file being left intact, cleanup skipping what it did not
  create, exclusive creation, and removal after use. The exact production
  path, 43 bytes, absent newline, mode `0400`, unprivileged checker and
  unprivileged Caddy are all preserved, and the secret is never printed.
- **FIX4-B `PERSIST002-NET02-SECRET-CREATE-01`:** the runbook now creates the
  rollout credential private from its first write (`umask 077` plus
  `install -m 0600 -o root -g root /dev/null`, then redirect into that inode)
  instead of relying on a later `chmod`. Measured on Linux: the previous
  procedure yielded mode `644` under `umask 022`; the corrected procedure
  yields `root:root 600 43` with no trailing newline.
- **FIX4-C `PERSIST002-NET02-PROOF-WHITESPACE-01`:** the edge proof is no
  longer trimmed before verification. A genuine secret padded with ASCII
  space, NBSP, en space, ideographic space, ZWNBSP or a line separator is now
  rejected as `edge_proof_malformed`. The edge **peer** keeps its existing
  trim contract, and a whitespace-only header is still reported as `missing`,
  so no unrelated public behavior changed.
- **FIX4-D `PERSIST002-NET02-CI-01`:** the governance record now states the
  full truth about the `pr-checks.yml` delta — see the task file. In summary:
  the historical Core failure on `0eef8342…` occurred **only** during
  edge-contract initialization after tests/build/typecheck/preflight had
  passed; the root cause was the unprivileged GitHub-hosted runner being
  unable to create the exact `/run/credentials/caddy.service` path; **no
  application or Caddy contract source defect was found**; `b3ca9356…` added
  narrowly scoped provisioning of that one directory with fail-closed
  pre-existence handling, an `EXIT`-trap cleanup and a credential-removal
  assertion; checker and Caddy stayed unprivileged; the exact
  production-compatible path stayed under test; exact-head Core then passed
  with `runtimeExecuted: true` and 57/57 checks. This CI correction is **PA
  technically accepted** and **does not authorize merge or deployment**.

**CI contract:** FIX4-A raises the edge-contract assertion count, so
`.github/workflows/pr-checks.yml` carries a further exact numeric update
**57 -> 62** and nothing else.

**Explicitly deferred, no scope expansion:** Docker peer-drift silent
degradation (rollout must re-measure the peer on the final composed topology
and run a genuine multi-client admission smoke; no new runtime diagnostics
added); limiter bucket-table exhaustion (capacities, `maxBuckets`, IPv6 /64
policy and eviction unchanged, no global limiter added); Node-side Docker
environment secret delivery; secret rotation; broader stale-documentation
cleanup; and the historically present QA attempt-1 failure comment, which was
not deleted or rewritten.

**State:** implemented and **published** on PR
[#88](https://github.com/pittonje/BurningSpace/pull/88), which remains
**OPEN**.

- FIX4 source commit: `55fe274b90dc3f43dabcdbe87b7328f6c9a267c8`
- Parent: `b3ca93567abf3254f1baa181e4c2ff6d42454ba2`
- Commit message: `fix(network): address NET-02 review hardening`

Publishing FIX4 does **not** authorize merge. **No merge, no auto-merge, no
deployment, no VPS/Contabo access, no image publication, no Caddy reload, no
real edge secret, no database or schema change.** Merge authority remains
human-only.

**Exact-head automatic checks for `55fe274b…`** (triggered automatically by
`pull_request` on publication; no manual dispatch and no rerun):

- **Core Pull Request Checks** — run `35459015045`, job `105939378346`,
  attempt 1: **SUCCESS**. Observed in its log: `Test Files 54 passed (54)`,
  `Tests 676 passed (676)`, no DB-dependent skips,
  `runtimeExecuted: true` / `caddyVersion 2.11.4` with
  `caddy_edge_contract_assertions_verified` reporting **62** checks, and
  `phase_a_secret_scan_completed` over 30 files.
- **Governed Claude QA Review Pilot** — run `35459015056`, job
  `105939378428`, attempt 1: **FAILURE**. Steps 1–7 succeeded; step 8
  `Publish QA review comment` failed with the renderer limit
  `summary exceeds max length 2000`, and a sanitized
  "Not approved — automation failure" comment was published against
  `55fe274b…`. This is the same QA harness rendering limit previously seen at
  head `b3ca9356…` attempt 1; it is **not** a review finding against the FIX4
  change, and exact-head governed QA evidence is therefore still
  **outstanding**.

Status: `PA FIX4 PUBLISHED / AWAITING EXACT-HEAD GOVERNED QA AND BOUNDED DELTA REVIEWS`.

PERSIST002-NET-02 — **OPEN**. FIX4 did not close it. PUBLIC PERSISTENCE
ROLLOUT — **BLOCKED**. **NO DEPLOYMENT AUTHORIZED.**

## PERSIST002-NET-02 repository-stage closure

PERSIST002-NET-02 — **MERGED / CLOSED**.

- PR: [#88](https://github.com/pittonje/BurningSpace/pull/88), state **CLOSED / MERGED**
- Approved exact source head: `75b74b0ea12d2fbc4899d4ded22920c3700249db`
- Merge commit / current `main`: `360958d31db08ad7c141a2a44b69f92744606456`
- Merge parents: `afb61276e0ad75b5a3964183e9b316b97eaa7e33` and `75b74b0ea12d2fbc4899d4ded22920c3700249db`
- Source-head tree: `44e211ef14ede17d545734ee616cc809da0347c5`
- Merge-commit tree: `44e211ef14ede17d545734ee616cc809da0347c5`; trees are equivalent
- Merged at: `2026-09-19T20:33:09Z`
- Core Pull Request Checks: run `35466241776`, **SUCCESS**, bound to the approved source head
- Governed Claude QA: run `35466241823`, **SUCCESS**, **Approved with suggestions**, blockers: **None**, bound to the approved source head
- Independent QA closure review: **APPROVE WITH SUGGESTIONS**, blockers: **None**; closure condition satisfied
- Independent delta reviews: Architecture **APPROVE WITH SUGGESTIONS**, Network **APPROVE WITH SUGGESTIONS**, Security **APPROVE WITH SUGGESTIONS**; blockers: **None**
- Product Architect final disposition: **APPROVED FOR HUMAN MERGE**
- Human merge: **completed**

The accepted CI evidence is for the approved source head; the merge commit was
not rerun through PR CI. Tree equivalence establishes that the merge commit
contains the exact approved source tree. Historical FIX1/FIX2/FIX3/FIX4
records and failed QA attempts remain preserved above.

**PUBLIC PERSISTENCE ROLLOUT — BLOCKED**

**DEPLOYMENT — NOT AUTHORIZED**

Repository closure grants no authority for VPS/Contabo access, image
publication, real edge secret creation or use, Caddy reload, PostgreSQL
activation, persistence deployment, schema/migration execution, or external
staging mutation. The deferred rollout findings remain open, including final
composed-topology Docker peer re-measurement, genuine multi-client admission
smoke, 10,000-bucket observability/future hardening, Node-side Docker
environment secret handling, and secret rotation.

## Current next safe action

Prepare a separate rollout/deployment readiness gate for Product Architect
review. Do not execute deployment; a later rollout requires separate Product
Architect authorization.
# ROLLOUT-01 implementation checkpoint (2026-09-20)

Active task: [PERSIST002-ROLLOUT-01](../tasks/persist-002-rollout-01-staging-readiness.md).
Branch `ops/persist002-rollout-01-readiness`, exact base
`ac5ddaac7f70f261fe8357e3fa448ef61c7e56ad`. R1 contract and R2 immutable operations
implemented and locally verified; R3–R4 pending. See the task for validation and
the SQL LF packaging correction (canonical migration blob unchanged).
NET-02 remains MERGED / CLOSED. Deployment NOT AUTHORIZED; public persistence
rollout BLOCKED. Public staging remains the earlier non-persistent runtime.
Reviewers are declared in the task and deferred until all four packets per the
explicit implementation authorization; no independent agents are invoked.
