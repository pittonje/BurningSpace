# GAME-001 — Outpost Respawn Eligibility

## Goal

Introduce pure server-authoritative calculations that determine whether an outpost is eligible as a player respawn point.

## Accepted decisions

- BS-MECH-005 requires control of all six adjacent sectors and applies a separate 120-second combat lock.
- BS-MECH-006 requires every adjacent sector to be exactly 100% stabilized.
- GAME-001-D1 through GAME-001-D5 define pure calculation, strict sector cardinality, exact stabilization, an exclusive combat-lock boundary, and no shield input.

## Starting state

- No campaign-domain implementation exists yet.
- No combat-lock producer exists yet.
- This task introduces only pure eligibility calculation.

## Files changed

- `apps/server/src/systems/outpostRespawn.ts`
- `apps/server/test/outpostRespawn.test.ts`
- `docs/tasks/game-001-outpost-respawn-eligibility.md`

## Public API

- `OUTPOST_ADJACENT_SECTOR_COUNT`
- `OUTPOST_RESPAWN_COMBAT_LOCK_MS`
- `AdjacentSectorControlState`
- `hasOutpostRespawnTerritorialEligibility`
- `isOutpostRespawnEligible`

## Test matrix

- Exactly six allied sectors at 100% with no lock are territorially and finally eligible.
- Five or seven allied sectors at 100% are ineligible.
- One enemy-owned sector makes the outpost ineligible.
- One allied sector at 99% makes the outpost ineligible.
- Six allied sectors at 80%, or values between 50% and 99%, are ineligible.
- An active combat lock makes valid territory ineligible.
- The combat lock is expired at the exact `combatLockUntilMs` boundary.
- A null combat lock permits valid territory.
- A new degraded snapshot is evaluated immediately without cached state.
- Meeting a separate shield threshold does not grant respawn eligibility.
- The combat-lock duration constant is 120,000 ms.

## Validation commands

```text
npm test
npm test
npm run build
npm run typecheck
git diff --check
```

## Risk classification

Low. The new calculation is pure, server-local, deterministic, and has no runtime integration.

## Required review

- CI-001
- Product-Architect-approved Test Matrix
- Claude QA

Multiplayer Reviewer is not required until room or campaign-state wiring. API Guardian is not required because no public shared contract changes.

## Forbidden changes

- No room, client, package, config, workflow, asset, protocol, persistence, timer, shield, or network changes.
- No runtime respawn execution or campaign-state integration.

## Acceptance criteria

- Territorial eligibility requires exactly six adjacent sectors owned by the outpost faction and stabilized at exactly 100%.
- Final eligibility additionally requires no active combat lock.
- The combat lock is active only while `nowMs < combatLockUntilMs`.
- The functions are pure and deterministic, with all required boundaries covered by tests.
- The final diff contains exactly the three authorized files.

## Known limitations

- The six-sector constant is duplicated locally.
- The combat-lock value is consumed but not produced by a damage or timer system.
- Server-local placement is temporary pending a future campaign-domain boundary.

## Rollback

Revert the single GAME-001 commit; no migration, stored state, protocol, or runtime integration requires additional rollback work.
