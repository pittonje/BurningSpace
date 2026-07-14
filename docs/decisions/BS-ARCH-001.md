# BS-ARCH-001 — Server-authoritative multiplayer model

Status: `accepted`

Date: `2026-07-14`

Owner: `Product Architect`

Scope / domain: `Architecture — multiplayer authority`

## Decision

The server owns authoritative simulation, world state, campaign state, AI, resources, capture, and ownership rules. The client renders, predicts, and sends input or commands; it is not the authority for multiplayer truth.

## Rationale

Multiplayer state must have one authoritative source so clients cannot create conflicting or trusted gameplay truth.

## Consequences

Client-side systems may render, predict, prototype, or display state, but client-side results cannot replace server authority.

## Supersedes

none

## Superseded by

none

## Depends on

none

## Source evidence

- `PROJECT_CONTEXT.md`
- `AGENTS.md`
- `docs/architecture/server-authoritative-model.md`

## Verification

No runtime change is introduced. Current server/client architecture evidence is consistent with this decision.

## Notes

Original decision date not recovered; the Date field records Product Architect migration approval (DOCARCH-002C).
