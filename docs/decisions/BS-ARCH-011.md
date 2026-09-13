# BS-ARCH-011 - Canonical persistent world lifecycle and recovery

Status: `accepted`
Date: `2026-09-13`
Owner: `Product Architect`
Scope / domain: `Architecture - world bootstrap, readiness and recovery`

## Decision

Use one canonical persistent world with UUID and unique public-arena slug.
Create it through explicit idempotent bootstrap after migration. Normal startup
validates configuration/DB/schema, resolves world, claims writer epoch, recovers
durable state/reconciles stale leases, creates one canonical room, then becomes
ready. Missing/incompatible persistence fails readiness. Keep health distinct.
Store identity/world/faction metadata durably; operational leases are invalidated
on recovery. Leave ship transform/health/respawn/high-frequency state persistence
as later classification gates. Adopt architecture sections 6-8 and 10-14,
including staging isolation, native backup/restore and exact PERSIST-002 proof.

## Rationale

World UUID avoids global unscoped campaign tables. Explicit bootstrap and
singleton room routing prevent accidental new worlds after reconnect or capacity
limits. Private same-host PostgreSQL is appropriate staging without claiming
final production topology.

## Consequences

PERSIST-002 replaces campaign joinOrCreate with discovery/joinById and keeps
one world room alive while owned. Store DB data in a persistent volume with no
public port; injected runtime/migration credentials have separate privileges.
A tested fresh-target restore is mandatory. Arena battle reset is not a decision
that future campaign ships/health are disposable. Later waves remain gated.

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

BS-ARCH-001, BS-ARCH-003, BS-ARCH-007, BS-ARCH-008, BS-ARCH-009, BS-ARCH-010

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
