# BS-ARCH-004 — shared as current canonical runtime contract owner

Status: `accepted`

Date: `2026-07-14`

Owner: `Product Architect`

Scope / domain: `Architecture — contract ownership`

## Decision

packages/shared is the current canonical location for broad runtime contracts and profile contracts. This ownership is transitional and does not establish packages/shared as the permanent public protocol boundary.

## Rationale

Existing runtime and profile contracts already depend on packages/shared, but future boundary refinement must remain possible without contradicting the current repository truth.

## Consequences

Current contract additions must respect packages/shared ownership unless a separate approved migration changes that boundary. This decision must not be used to claim that packages/shared is the permanent public protocol layer.

## Supersedes

none

## Superseded by

none

## Depends on

none

## Source evidence

- `packages/shared/package.json`
- `packages/shared/src/**`
- `PROJECT_CONTEXT.md`
- `docs/reviews/docarch-002-decision-recovery-report.md`

## Verification

Verified against the current package contents and application dependency graph. No contract or dependency change is introduced.

## Notes

Original decision date not recovered; the Date field records Product Architect migration approval (DOCARCH-002C).
