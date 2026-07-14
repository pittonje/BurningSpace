# BS-ARCH-003 — Current client and server framework retention

Status: `accepted`

Date: `2026-07-14`

Owner: `Product Architect`

Scope / domain: `Architecture — application frameworks`

## Decision

The client remains Phaser 3, Vite, and the Colyseus browser client. The server remains Node.js, TypeScript, Colyseus, and @colyseus/ws-transport. Framework replacement requires a dedicated Product Architect-approved task.

## Rationale

Framework replacement has project-wide consequences and must not be bundled into structural documentation, registry, or unrelated implementation work.

## Consequences

Documentation and decision-migration tasks must not replace Phaser, Vite, Colyseus, Node.js, TypeScript, or the current transport stack.

## Supersedes

none

## Superseded by

none

## Depends on

none

## Source evidence

- `apps/client/package.json`
- `apps/server/package.json`
- `PROJECT_CONTEXT.md`

## Verification

Verified against current client and server package manifests. No framework or dependency change is introduced.

## Notes

Original decision date not recovered; the Date field records Product Architect migration approval (DOCARCH-002C).
