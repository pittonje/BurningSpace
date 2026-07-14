# BS-ARCH-005 — protocol as transitional public compatibility boundary

Status: `accepted`

Date: `2026-07-14`

Owner: `Product Architect`

Scope / domain: `Architecture — protocol and package dependency direction`

## Decision

packages/protocol may re-export or expose stable public contracts while depending on packages/shared. packages/shared must not depend on packages/protocol.

## Rationale

The transitional facade allows public compatibility to evolve without creating a dependency cycle or reversing the current contract ownership direction.

## Consequences

A packages/shared to packages/protocol dependency or import is prohibited unless this decision is explicitly superseded.

## Supersedes

none

## Superseded by

none

## Depends on

BS-ARCH-004

## Source evidence

- `packages/protocol/package.json`
- `packages/protocol/src/**`
- `packages/shared/package.json`
- `packages/shared/src/**`
- `PROJECT_CONTEXT.md`

## Verification

Verified against the current dependency and import graph: packages/protocol depends on packages/shared, and no packages/shared dependency on packages/protocol exists.

## Notes

Original decision date not recovered; the Date field records Product Architect migration approval (DOCARCH-002C).
