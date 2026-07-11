# PR-005 Network Review

Date: 2026-07-11

Branch: `refactor/profile-contract-isolation`

Reviewed commits: `6241fc0`, `4dd0061`; accepted follow-up fix: `4fd9d8c`

Reviewer type: external Claude `network-reviewer`

External Claude availability: available; review was run manually by the user in read-only mode.

## Blockers

None.

## Important suggestions

The original implementation had an erased type-only cycle between `factions.ts` and `profile-contract.ts`. It was non-blocking but fragile if a future import became runtime. Resolved in `4fd9d8c` by moving the dependency-neutral `Faction` definition to `faction.ts` while retaining the legacy `factions.ts` exports.

## Minor suggestions

- Keep the narrow profile objects clearly documented as the intended future consumer API.
- Add CI enforcement for focused compatibility and network diagnostics in a separately scoped follow-up.

## Validation commands considered

- `npm run build`
- `npm run typecheck`
- `npm run check:protocol-profile`
- `npx tsx apps/client/scripts/network-client-callback-check.ts`
- wire-literal, identity, application-diff, manifest-diff, and dependency-direction checks

## Approval status

Approved. Wire values, payload shapes, object identity, validation, callbacks, schemas, room behavior, application consumers, and server authority are unchanged.
