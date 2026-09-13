# BS-ARCH-009 - Durable guest identity and faction membership

Status: `accepted`
Date: `2026-09-13`
Owner: `Product Architect`
Scope / domain: `Architecture - identity and credential authority`

## Decision

Use server-generated player UUID independent of Colyseus sessionId plus a
256-bit cryptographically random opaque recovery credential. Store only a
versioned SHA-256 verifier in a separate credential table; no raw-secret logging
or persistence on server. Browser stores proof locally and sends it only over TLS
in authentication POST data. Explicit guest creation handles absence; invalid or
revoked proof never silently becomes claimed identity or a replacement guest.
First accepted player faction becomes immutable world membership; recover it in
later sessions, reject mismatches, and never alter it through spectator mode.
Display name is nonunique metadata, not identity. Adopt architecture sections 4,
6 and 12, including rotation/revocation boundaries and abuse limits.

## Rationale

Durable ownership must survive application restart without adding a broad
account system. Separate credential rows allow revocation/rotation without
changing player identity, and world-scoped membership avoids global faction traps.

## Consequences

Credential possession is proof; stolen local proof can impersonate its owner.
No email recovery or account-grade protection is promised. UUID/nickname alone
has no authority. Future account binding extends the identity layer. Existing
arena fresh-session faction selection becomes pre-persistence behavior only.

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

BS-ARCH-001, BS-ARCH-004, BS-ARCH-005, BS-ARCH-008

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
