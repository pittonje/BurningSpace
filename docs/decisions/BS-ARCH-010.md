# BS-ARCH-010 - Gameplay leases and durable reconnect ownership

Status: `accepted`
Date: `2026-09-13`
Owner: `Product Architect`
Scope / domain: `Architecture - active sessions and process fencing`

## Decision

Allow at most one gameplay lease per player/world; acquire transactionally
before spawn. Reject an independently live second claimant, preserve same-session
NET-001 reconnect, and distinguish it from durable recovery using a new session.
Use process UUID, world writer epoch and expiring leases; conditional lease UUID
updates prevent stale cleanup. Heartbeat 5s, writer TTL 15s, local safety deadline
request-start +10s, active session TTL reconnect grace +15s, fixed recovering
deadline equal to grace. Grace remains default 10s, validated 1-60s. DB/heartbeat
loss fails closed and stops control. Boot claims only unowned/expired writer,
invalidates prior-epoch sessions and bounds recovery attempts to 30s. Adopt
architecture sections 3, 5-7 and 12, including clock assumptions and DB guards.

## Rationale

A database identity alone does not prevent two tabs controlling two ships or
an old process retaining authority. Separate lease and writer generations make
ownership reclaimable and delayed operations unable to modify successor claims.

## Consequences

Pinned Colyseus reconnect skips onAuth: explicitly validate DB credential and
lease before re-enabling input after allowReconnection. Keep short reconnect token
memory-only and distinct from browser durable proof. Multiple spectators have no
gameplay lease. Lease release never authorizes future campaign ship switching.

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

BS-ARCH-001, BS-ARCH-003, BS-ARCH-008, BS-ARCH-009

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
