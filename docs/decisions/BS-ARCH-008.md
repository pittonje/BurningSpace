# BS-ARCH-008 - PostgreSQL persistence, consistency and migrations

Status: `accepted`
Date: `2026-09-13`
Owner: `Product Architect`
Scope / domain: `Architecture - storage and durable transaction boundary`

## Decision

Select PostgreSQL as canonical campaign storage, with pg, explicit parameterized
SQL and typed server-only repositories. Use semantic transactions and monotonic
world revisions, never per-tick persistence. Use versioned SQL, an explicit
migration command, serialized runner, successful migration ledger/checksums and
fail-closed schema compatibility. Expand / migrate / contract is the production
strategy. Application rollback requires compatible schema and authority behavior;
destructive DB rollback requires verified backup restoration, not presumed DOWN.
The concrete contract is architecture sections 3, 6 and 9-11.

## Rationale

Relational ownership, strong transactions, uniqueness/FKs, mature migrations and
backups, and Node/TypeScript integration fit the single-server foundation and a
future external database. No concrete repository requirement warrants a large ORM.

## Consequences

Reject JSON/files, browser storage, Redis alone, deployed authoritative SQLite
and document storage chosen solely for convenience as canonical campaign stores.
SQLite is possible only for separately justified isolated tooling, not acceptance
of PostgreSQL semantics. PERSIST-002 must test real migration failure, compatibility,
backup and fresh-target restore; dependencies and SQL are not installed here.

## Explicit non-goals

No runtime/dependency/SQL/deployment implementation in PERSIST-001. No sectors,
outposts, turrets, economy, mining, logistics, portals, broad accounts, horizontal
scaling, tick or projectile persistence. No PERSIST-002 start before independent
review and final PA task acceptance; no push, PR or merge in this authoring task.

## Relationship to prior decisions

Extends server authority and retained framework/package boundaries; does not
supersede or rewrite BS-ARCH-001-007. Existing mechanics and human merge/review
authority remain unchanged. NET-001 transient continuity remains applicable;
its session token is not promoted to durable identity. Future campaign ship
control remains subject to BS-MECH-013/014 and later data classification.

## Supersedes

none

## Superseded by

none

## Depends on

BS-ARCH-001, BS-ARCH-002, BS-ARCH-003, BS-ARCH-004, BS-ARCH-005, BS-ARCH-006

## Source evidence

- [Committed PERSIST-001 authority](../tasks/persist-001-persistence-identity-architecture.md):
  human expressly granted Product Architect authority; PA defaults audited against repository.
- [Concrete architecture contract](../architecture/PERSISTENT_WORLD_IDENTITY_ARCHITECTURE.md).
- [Canonical Wave 2 roadmap](../roadmap/CANONICAL_DEVELOPMENT_ROADMAP.md).

## Verification

Selected and recorded under delegated PA authority. This accepted decision status
is not independent review, final task acceptance, implementation authorization,
merge approval or a claim of deployed persistence. Architecture/Security review
of the completed task remains pending and must bind its final commit.
