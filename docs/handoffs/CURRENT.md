# BurningSpace Current Handoff

Last updated: 2026-09-18
Updated by: Implementation engineer — PERS-FIX1: reused DB timestamp for stale-lease release (PERSIST002-PERS-01), committed and pushed

## Current state — Public Arena external staging: ONLINE

- Client: https://game.burningforge.dev
- Server origin: https://game-server.burningforge.dev
- Environment: `burningspace-staging-01` on the existing shared Contabo VPS.
- OPS-002 external staging deployment is complete and validated.
- Original deployed application release: `4a774354859c036d45666496539c2fc3c24b9f1c`.
- Server runtime remains on the approved immutable server image from OPS-002.
- Subsequent MOBILE-001B/C updates replaced only the static client container; server, Caddy, TLS and network remained unchanged during those bounded client-only updates.
- Public health/readiness and the bounded external multiplayer smoke passed after the client updates.
- Persistence remains **NOT IMPLEMENTED** in runtime: world/player campaign state is still in-memory and may reset on server restart. Staging is not production or campaign MVP.

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

PR #85 merge commit (current `origin/main`): `98bda8f5bed41112f5687eb4ef2fd52a0c82950a`

Status: **ARCHITECTURE/SECURITY REVIEW APPROVED / PRODUCT ARCHITECT ACCEPTED / MERGED / CLOSED**

Active bounded implementation task: [PERSIST-002 — Durable World & Identity Foundation](../tasks/persist-002-durable-world-identity-foundation.md), branch `feat/persist-002-durable-world-identity-foundation`, **PR [#86](https://github.com/pittonje/BurningSpace/pull/86) — OPEN, not merged, no auto-merge**. Packets 1–7, post-implementation corrections FIX1–FIX4, the QA-RECOVERY-001/002 infrastructure patches, and ARCH-FIX1/ARCH-FIX2 are pushed as local sequential commits; the branch itself has never been reset, rebased, or amended. At the QA-RECOVERY-002 head `097cb92804ede1449f3fc1dca1a8a063f9aa3cef`, Core Pull Request Checks were **SUCCESS** (run `35193478755`) and governed Claude QA ran and returned **"Approved with suggestions"** (run `35193478806`). An independent Architecture review of that head then raised **PERSIST002-C-01 (MEDIUM)** — `BattleRoom.updateSimulation()` and related paths did not check process/world authority before running; Product Architect disposition was **REQUEST_CHANGES**. **ARCH-FIX1** (`cc87ab0c679acbce5c16f866f84780c1804c4e31`) implemented the runtime fix; **independent delta review CLOSED the runtime finding PERSIST002-C-01 at that commit**, but found ARCH-FIX1's own test evidence insufficient (REVIEW-C01-A: a resource leak in the teardown-window scenario's cleanup; REVIEW-C01-B: a missing-capability regression that passed on both pre-fix and fixed code), so ARCH-FIX1's overall delta disposition remained **REQUEST_CHANGES**. **ARCH-FIX2** was a bounded, test-only correction of both findings. Independent review of ARCH-FIX2 then **CLOSED REVIEW-C01-B** and confirmed REVIEW-C01-A's successful-path cleanup, but found its early-assertion-failure cleanup path still defective (could leak resources and obscure the original test failure behind a secondary error). **ARCH-FIX3** moves all cleanup responsibility into the harness's shared, guaranteed `stop()` path. Independent verification of the remaining REVIEW-C01-A path, and Core/Claude QA for the resulting ARCH-FIX3 head, have not yet been observed. A separate independent Network review of that head then raised **PERSIST002-NET-01 (HIGH)**: public `create`/`joinOrCreate` could create additional parallel `BattleRoom` instances against the same durable world and acquire real gameplay leases. **NET-FIX1** restricts the shared Colyseus `matchMaker.controller.exposedMethods` to exactly `joinById`/`reconnect`, so only admission into and reconnection to the already-published canonical room are ever exposed publicly — see the task file's NET-FIX1 section, and the section below, for full evidence. **PERSIST002-NET-02 (MEDIUM) remains OPEN**, documentation-only in this fix. Independent Network delta review of NET-FIX1, the still-outstanding REVIEW-C01-A verification, required independent Security review, Product Architect final acceptance, and human merge all remain outstanding. No staging deployment, image publication, or VPS/Contabo contact has occurred at any point; the branch implementation is not the same thing as the deployed staging environment described above, which remains unchanged and non-persistent. See the task file's Status section for the full evidence list.

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

## Current next safe action

The next action is: **independent Persistence delta review of
PERSIST002-PERS-01** for the PERS-FIX1 head, alongside the still-outstanding
**independent Network delta review of PERSIST002-NET-01** and the
still-outstanding **independent verification of the remaining REVIEW-C01-A
early-failure cleanup path**, and obtaining/inspecting Core Pull Request
Checks and governed Claude QA for the resulting PERS-FIX1 head. Independent
Security review remains to be routed and bound to whichever HEAD is current
when it begins; Product Architect final acceptance and human merge remain
outstanding. Actual staging rollout with persistence enabled remains a
later, separately authorized task, explicitly gated on Security/Ops
accepting a NET-02 mitigation or bounded operating policy — see
[`docs/ops/persist-002-staging-db-integration-plan.md`](../ops/persist-002-staging-db-integration-plan.md).
