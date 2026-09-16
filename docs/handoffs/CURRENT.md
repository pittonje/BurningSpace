# BurningSpace Current Handoff

Last updated: 2026-09-16
Updated by: Implementation engineer — QA-RECOVERY-001: PA-approved QA-infrastructure diagnosability patch and PR #86 evidence reconciliation, committed and pushed

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

Active bounded implementation task: [PERSIST-002 — Durable World & Identity Foundation](../tasks/persist-002-durable-world-identity-foundation.md), branch `feat/persist-002-durable-world-identity-foundation`, **PR [#86](https://github.com/pittonje/BurningSpace/pull/86) — OPEN, not merged, no auto-merge**. Packets 1–7 plus four bounded post-implementation corrections (FIX1–FIX4) are pushed as local sequential commits through implementation checkpoint `0dba3e74562b3d0e395a5cad2a29732512e68515`; the branch itself has never been reset, rebased, or amended. Core Pull Request Checks are fully **SUCCESS** at that exact implementation checkpoint (run `34948430842`, job `104313315933`, attempt 1), including the Caddy edge contract and staging-container integration gates. Automated Claude QA at that same checkpoint did **not produce a validated review**: two independent automation failures occurred (see "PR #86 evidence" below) — this is an infrastructure gap, not a QA approval, not a QA rejection of the implementation. QA-RECOVERY-001, a bounded QA-infrastructure diagnosability/documentation patch, is now committed on top of that checkpoint (Product Architect approved it for exactly one bounded commit/push); Core and Claude QA for the resulting new PR head are pending and have not yet been observed — see the task file's Status section for the exact new HEAD and current run status. Required independent Architecture, Network, Security, and QA reviews, Product Architect final acceptance, and human merge remain outstanding. No staging deployment, image publication, or VPS/Contabo contact has occurred at any point; the branch implementation is not the same thing as the deployed staging environment described above, which remains unchanged and non-persistent. See the task file's Status section for the full evidence list.

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

## Current next safe action

*(Historical preparation evidence, dated 2026-09-15: QA-RECOVERY-001 was
prepared as a local, uncommitted patch against the QA reporting
infrastructure and this documentation, then inspected and approved by
Product Architect for exactly one bounded commit/push, with its three
technical files' Git blob hashes frozen and verified unchanged before
that commit.)*

QA-RECOVERY-001 is now committed on top of implementation checkpoint
`0dba3e74562b3d0e395a5cad2a29732512e68515` and pushed to PR #86. The
resulting new PR head has not yet had Core or Claude QA observed — this
document does not claim those checks have passed. The next action is:
**obtain and inspect Core Pull Request Checks and governed Claude QA for
the resulting new PR head**, and report their outcome (including, if the
sanitizer still fails, the "execution file subreason" value from its
safe Summary table). Independent Architecture, Network, Security, and QA
reviews remain to be routed and bound to whichever HEAD is current when
they begin; Product Architect final acceptance and human merge remain
outstanding. Actual staging rollout with persistence enabled remains a
later, separately authorized task — see
[`docs/ops/persist-002-staging-db-integration-plan.md`](../ops/persist-002-staging-db-integration-plan.md).
