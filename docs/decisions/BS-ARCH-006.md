# BS-ARCH-006 — Balance and configuration package boundaries

Status: `accepted`

Date: `2026-07-14`

Owner: `Product Architect`

Scope / domain: `Architecture — balance and configuration separation`

## Decision

packages/balance and packages/config are retained package boundaries for the gradual separation of balance data and configuration. packages/balance already contains versioned MVP constants; packages/config currently remains an immature structural boundary. Neither package's current maturity should be overstated.

## Rationale

The package boundaries preserve a safe path toward separating balance and configuration without falsely claiming that both packages are fully integrated or mature.

## Consequences

Future work may populate and integrate these packages through dedicated tasks. Current documentation must distinguish the implemented balance content from the largely structural configuration boundary.

## Supersedes

none

## Superseded by

none

## Depends on

none

## Source evidence

- `packages/balance/package.json`
- `packages/balance/src/**`
- `packages/config/package.json`
- `packages/config/src/**`
- `PROJECT_CONTEXT.md`

## Verification

Verified against current package contents and application imports. No balance, configuration, package, or dependency change is introduced.

## Notes

Original decision date not recovered; the Date field records Product Architect migration approval (DOCARCH-002C).
