# PERSIST-001 — Architecture / Security Review

Status: `APPROVE`

Date: `2026-09-13`

Reviewed commit: `356b2f94573c3be641296a26fff727158063ed36`

Base: `3b3621d248a73f67e1bed89cd3c267d5539f2c34`

Task: [PERSIST-001 — Persistent World & Durable Identity Architecture](../tasks/persist-001-persistence-identity-architecture.md)

Architecture: [Persistent World & Durable Identity Architecture](../architecture/PERSISTENT_WORLD_IDENTITY_ARCHITECTURE.md)

## Verdict

Independent combined Architecture/Security review: **APPROVE**.

- BLOCKER: 0
- HIGH: 0
- MEDIUM: 0
- LOW: 0
- INFO: non-blocking observations only

Product Architect disposition: **ACCEPTED** for PERSIST-001 architecture at the reviewed commit above. PERSIST-002 remains a separate bounded implementation task and is not authorized by this review artifact itself.

## Review scope

The review independently checked the complete PERSIST-001 documentation/decision delta and the relevant current runtime boundaries. It covered:

- compatibility of BS-ARCH-008 through BS-ARCH-011 with BS-ARCH-001 through BS-ARCH-007;
- PostgreSQL as the canonical durable campaign store with `pg`, explicit SQL and typed repositories;
- durable player UUID separation from transient Colyseus `sessionId`;
- 256-bit opaque bearer credential semantics, verifier-only database storage, revocation and rotation;
- browser bearer-storage/XSS limitations and the intentionally bounded MVP account model;
- immutable durable faction membership and concurrency-safe first assignment;
- one active gameplay lease per player/world, duplicate-session prevention and stale-lease recovery;
- server instance identity, writer epoch/fencing and zombie-process prevention;
- database outage/fail-closed behavior and readiness semantics;
- short Colyseus reconnect versus durable identity recovery;
- canonical world bootstrap, stable world UUID and state revision semantics;
- relational schema keys, constraints, foreign keys and transaction boundaries;
- migration serialization, schema ledger, expand/migrate/contract and rollback/restore semantics;
- runtime versus migration database privileges, secrets and internal-only staging network boundary;
- `pg_dump` / `pg_restore` backup-and-restore evidence, including stale-session invalidation after restore;
- threat model and logging boundaries;
- the 19-step PERSIST-002 acceptance contract and required race/failure cases.

## Key conclusions

### Identity and credentials

`playerId` is durable identity; `client.sessionId` remains transient transport identity. A player UUID alone cannot authenticate. Possession of a valid non-revoked high-entropy credential is the MVP identity proof.

Plain SHA-256 verifier storage is acceptable for a uniformly random credential with at least 256 bits of entropy; this is not a human password and does not require a password KDF. A server-side HMAC/pepper may be considered future hardening but is not required for PERSIST-002.

The architecture correctly forbids silent recovery of a claimed identity after an invalid or revoked credential. Raw credentials are not stored server-side and must not be logged.

### Faction and session ownership

The first durable faction assignment is protected by the membership uniqueness/transaction model rather than an unsafe check-then-update sequence. Subsequent sessions recover the stored faction rather than overwriting it.

`active_session_leases` plus transactional acquisition, unique player/world ownership, lease UUID, server instance identity and writer epoch provide an implementable single-writer/fencing model. A second live claimant cannot legitimately control a duplicate session, and a dead process cannot permanently retain ownership.

### Persistence and recovery

The architecture correctly avoids database writes in the 20 Hz gameplay loop. Durable semantic transitions commit transactionally before success is acknowledged to the client.

Application startup verifies schema, claims the canonical world writer epoch, reconciles stale leases and only then becomes campaign-ready. Health and readiness remain distinct.

Migration and rollback semantics are realistic: explicit migration runner, advisory-lock serialization, migration ledger/checksums, fail-closed schema mismatch, expand/migrate/contract compatibility, and backup restore rather than pretending destructive migrations always have safe automatic DOWN operations.

A backup is not accepted merely because `pg_dump` succeeded; PERSIST-002 must restore into a fresh isolated database and verify world/player/faction/revision/revocation state without reviving stale active sessions.

## Existing architecture consistency

The four new accepted architecture records extend rather than supersede the existing model:

- server authority remains governed by BS-ARCH-001;
- npm-workspaces / TypeScript monorepo remains governed by BS-ARCH-002;
- Node.js / TypeScript / Colyseus and Phaser / Vite remain governed by BS-ARCH-003;
- shared/protocol ownership and dependency direction remain governed by BS-ARCH-004 and BS-ARCH-005;
- balance/config boundaries remain governed by BS-ARCH-006;
- local `GameScene` remains non-authoritative under BS-ARCH-007.

The decision registry was independently reconciled as 39 accepted records: 18 BS-MECH, 5 GAME-001, 11 BS-ARCH, 4 BS-PROC and 1 CI. The 35 pre-existing accepted decision records remain unchanged by PERSIST-001.

## Non-blocking observations

- An HMAC/pepper for credential verifiers is optional future hardening, not required for random 256-bit bearer credentials.
- The documentation-only PERSIST-001 review route intentionally uses one combined Architecture/Security review; PERSIST-002 runtime work must receive Architecture, Network, Security and QA coverage appropriate to authentication/persistence implementation.
- Guest creation intentionally does not solve Sybil resistance or anonymous double-creation before a credential has been stored; that is outside the MVP identity foundation.

No Product Architect question remains that blocks PERSIST-002 architecture implementability.

## Validation evidence

The independent review verified:

- exact reviewed range and clean worktree;
- authority commit precedes the reviewed architecture commit;
- exactly 13 changed files at the reviewed commit, all documentation;
- `git diff --check` clean;
- 39 unique indexed accepted decisions;
- no semantic diff in sampled pre-existing accepted decisions;
- relevant current `BattleRoom`, reconnect and runtime-lifecycle boundaries against the architecture claims.

No runtime, deployment, workflow, package, lockfile, SQL migration, dependency or secret change is part of the reviewed PERSIST-001 architecture commit.

## PR #85 automated QA follow-up

PR #85 later ran the automated Claude QA pilot on the same reviewed architecture commit. The Claude invocation itself completed successfully, but the deterministic publisher rejected one overlong blocker string (`>500` characters), so the workflow wrapper concluded `FAILURE` and posted a sanitized failure comment.

The substantive automated-QA concern was not an architecture defect: the PR description already stated that independent Architecture/Security review had completed, while the repository still contained the pre-review `CURRENT.md` / task status and had no in-repository review artifact. This review file and the accompanying documentation-only evidence reconciliation close that mismatch. The failed wrapper is not represented as a successful automated QA run; exact-head PR checks must rerun on the evidence follow-up commit.
