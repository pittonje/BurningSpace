# BurningSpace Current Handoff

Last updated: 2026-09-17
Updated by: Implementation engineer — ARCH-FIX2: corrected ARCH-FIX1's test evidence (REVIEW-C01-A resource leak, REVIEW-C01-B non-discriminating regression), committed and pushed

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

Active bounded implementation task: [PERSIST-002 — Durable World & Identity Foundation](../tasks/persist-002-durable-world-identity-foundation.md), branch `feat/persist-002-durable-world-identity-foundation`, **PR [#86](https://github.com/pittonje/BurningSpace/pull/86) — OPEN, not merged, no auto-merge**. Packets 1–7, post-implementation corrections FIX1–FIX4, the QA-RECOVERY-001/002 infrastructure patches, and ARCH-FIX1/ARCH-FIX2 are pushed as local sequential commits; the branch itself has never been reset, rebased, or amended. At the QA-RECOVERY-002 head `097cb92804ede1449f3fc1dca1a8a063f9aa3cef`, Core Pull Request Checks were **SUCCESS** (run `35193478755`) and governed Claude QA ran and returned **"Approved with suggestions"** (run `35193478806`). An independent Architecture review of that head then raised **PERSIST002-C-01 (MEDIUM)** — `BattleRoom.updateSimulation()` and related paths did not check process/world authority before running; Product Architect disposition was **REQUEST_CHANGES**. **ARCH-FIX1** (`cc87ab0c679acbce5c16f866f84780c1804c4e31`) implemented the runtime fix; **independent delta review CLOSED the runtime finding PERSIST002-C-01 at that commit**, but found ARCH-FIX1's own test evidence insufficient (REVIEW-C01-A: a resource leak in the teardown-window scenario's cleanup; REVIEW-C01-B: a missing-capability regression that passed on both pre-fix and fixed code), so ARCH-FIX1's overall delta disposition remained **REQUEST_CHANGES**. **ARCH-FIX2** is a bounded, test-only correction of both findings — see the task file's ARCH-FIX2 section, and the section below, for full evidence. Independent verification of ARCH-FIX2, and Core/Claude QA for the resulting ARCH-FIX2 head, have not yet been observed. Required independent Network and Security reviews, Product Architect final acceptance, and human merge remain outstanding. No staging deployment, image publication, or VPS/Contabo contact has occurred at any point; the branch implementation is not the same thing as the deployed staging environment described above, which remains unchanged and non-persistent. See the task file's Status section for the full evidence list.

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

## Current next safe action

The next action is: **independent verification of ARCH-FIX2's corrected
test evidence for REVIEW-C01-A and REVIEW-C01-B**, and
obtaining/inspecting Core Pull Request Checks and governed Claude QA for
the resulting ARCH-FIX2 PR head. Independent Network and Security
reviews remain to be routed and bound to whichever HEAD is current when
they begin; Product Architect final acceptance and human merge remain
outstanding. Actual staging rollout with persistence enabled remains a
later, separately authorized task — see
[`docs/ops/persist-002-staging-db-integration-plan.md`](../ops/persist-002-staging-db-integration-plan.md).
