# BS-ARCH-007 — Local GameScene prototype is non-authoritative

Status: `accepted`

Date: `2026-07-14`

Owner: `Product Architect`

Scope / domain: `Architecture — client prototype boundary`

## Decision

The local client GameScene and prototype path is preserved as reference and prototype material. It is not multiplayer authority, and its client-authoritative model must not be copied into multiplayer systems.

## Rationale

The local prototype remains useful as reference material, but its authority model is incompatible with the server-authoritative multiplayer architecture.

## Consequences

Prototype logic must not be treated as canonical BattleRoom, campaign, capture, resource, ownership, or multiplayer-state logic.

## Supersedes

none

## Superseded by

none

## Depends on

BS-ARCH-001

## Source evidence

- `PROJECT_CONTEXT.md`
- `apps/client/src/scenes/GameScene.ts`
- relevant local prototype files referenced by `PROJECT_CONTEXT.md`

## Verification

No runtime change is introduced. The record documents the existing authority boundary between the local prototype and multiplayer systems.

## Notes

Original decision date not recovered; the Date field records Product Architect migration approval (DOCARCH-002C).
