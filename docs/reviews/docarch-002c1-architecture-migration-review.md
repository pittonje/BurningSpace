# DOCARCH-002C1 — Architecture Migration Conformance Review

Reviewed implementation commit: `16e78540218da6e128174dbbfdb4edcca27d3b45`

## Record conformance matrix

| Record | Decision exact match | Status | Owner | Date | Dependencies | Source evidence | Implementation-fact vs architecture-decision distinction | Transitional-boundary wording | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| `BS-ARCH-001` | Matches required meaning: server owns authoritative simulation/world/campaign/AI/resources/capture/ownership; client renders, predicts, sends input; not authority. Does not prohibit harmless client rendering/prediction/prototype. | accepted | Product Architect | 2026-07-14 | none (correct) | `PROJECT_CONTEXT.md`, `AGENTS.md`, `docs/architecture/server-authoritative-model.md` — all exist and support the statement | Consequences clause explicitly permits client render/predict/prototype without claiming architecture change | Not transitional by nature; no overreach | MATCH |
| `BS-ARCH-002` | Matches required meaning: current npm-workspaces monorepo; migration to another tool requires a dedicated approved task; no claim of permanence; no tooling change made | accepted | Product Architect | 2026-07-14 | none (correct) | `package.json` (workspaces field), `package-lock.json`, `PROJECT_CONTEXT.md` — all confirmed current | Correctly frames npm usage as current state gated behind future approval, not an eternal rule | "requires a dedicated Product Architect-approved task" avoids permanent-forever framing | MATCH |
| `BS-ARCH-003` | Matches required meaning: client retains Phaser 3/Vite/Colyseus browser client; server retains Node.js/TypeScript/Colyseus/@colyseus/ws-transport; replacement requires dedicated approved task | accepted | Product Architect | 2026-07-14 | none (correct) | `apps/client/package.json` (phaser, colyseus.js, vite), `apps/server/package.json` (colyseus, @colyseus/ws-transport), `PROJECT_CONTEXT.md` — verified byte-for-byte against manifests | States current stack as fact, gates replacement behind approval; does not forbid a future approved replacement | Wording ("requires a dedicated ... task") leaves room for future approved change | MATCH |
| `BS-ARCH-004` | Matches required meaning: `packages/shared` is current canonical location for broad runtime/profile contracts; ownership explicitly transitional; not declared the permanent public protocol boundary | accepted | Product Architect | 2026-07-14 | none (correct) | `packages/shared/package.json`, `packages/shared/src/**`, `PROJECT_CONTEXT.md`, `docs/reviews/docarch-002-decision-recovery-report.md` — all consistent | Explicitly separates "current canonical location" (fact) from "does not establish ... permanent" (boundary limitation) | Critical transitional clause present verbatim: "This ownership is transitional and does not establish packages/shared as the permanent public protocol boundary." | MATCH |
| `BS-ARCH-005` | Matches required meaning: protocol may act as transitional public compatibility facade depending on shared; shared must not depend on protocol; dependency direction verified against reality; depends on BS-ARCH-004 | accepted | Product Architect | 2026-07-14 | `BS-ARCH-004` (correct) | `packages/protocol/package.json` (declares `@burningspace/shared` dependency), `packages/protocol/src/**` (imports `@burningspace/shared` in `profile.ts`, `profile-compatibility-check.ts`), `packages/shared/package.json` (no dependencies field), `PROJECT_CONTEXT.md` | Rationale explicitly calls this a "transitional facade"; Consequences frame the shared→protocol prohibition as an accepted constraint, not an implementation description | "Transitional public compatibility boundary" in title and rationale | MATCH |
| `BS-ARCH-006` | Matches required meaning: balance/config remain boundaries for gradual separation; balance holds versioned MVP constants; config remains immature/structural; neither maturity overstated; no false consumption claim | accepted | Product Architect | 2026-07-14 | none (correct) | `packages/balance/package.json`, `packages/balance/src/**` (`mvp-balance-v0.1.ts`), `packages/config/package.json`, `packages/config/src/**` (`map.full-mvp.ts` only) — grep confirms no `apps/**` source imports either package | Explicitly states "Neither package's current maturity should be overstated" and does not claim application integration | Frames both as boundaries for "gradual separation," not finished systems | MATCH |
| `BS-ARCH-007` | Matches required meaning: local GameScene/prototype remains reference/prototype material, not multiplayer/campaign authority; client-authoritative model must not be copied as multiplayer truth; depends on BS-ARCH-001; does not forbid preserving/consulting prototype | accepted | Product Architect | 2026-07-14 | `BS-ARCH-001` (correct) | `PROJECT_CONTEXT.md`, `apps/client/src/scenes/GameScene.ts` (confirmed exists) | Distinguishes "preserved as reference and prototype material" (fact/allowed) from "must not be copied into multiplayer systems" (restriction) | Preservation is explicitly permitted; only the authority model, not the file, is restricted | MATCH |

All seven records use the exact `DECISION_TEMPLATE.md` section order (Title/Status/Date/Owner/Scope/Decision/Rationale/Consequences/Supersedes/Superseded by/Depends on/Source evidence/Verification/Notes), `Supersedes: none`, `Superseded by: none`, and a `Notes` line reading "Original decision date not recovered; the Date field records Product Architect migration approval (DOCARCH-002C)." No record claims this PR changed runtime architecture; each Verification section states no runtime/dependency/contract/package change is introduced (or, for `BS-ARCH-005`, describes verification without claiming any change).

## Transitional-boundary verification

- `BS-ARCH-002`: gates any workspace/package-manager migration behind a dedicated approved task; does not assert npm permanence. No change required.
- `BS-ARCH-004`: explicitly disclaims permanent public-protocol-boundary status for `packages/shared` while confirming current canonical ownership. This is the most safety-critical clause in the set and is present and correctly worded.
- `BS-ARCH-006`: explicitly disclaims overstating `packages/config` maturity and does not claim application integration of either package (confirmed no `apps/**` imports of balance/config).
- No record in the set converts a transitional/current-state fact into an unqualified permanent rule.

## Package and dependency verification

- `apps/client/package.json` and `apps/server/package.json` both declare `@burningspace/protocol` and `@burningspace/shared`; `apps/server` additionally declares `colyseus` and `@colyseus/ws-transport`; `apps/client` declares `phaser` and `colyseus.js` — matches `BS-ARCH-003`.
- `packages/protocol/package.json` declares a dependency on `@burningspace/shared`; `packages/shared/package.json` declares no dependencies — matches `BS-ARCH-005`'s required direction.
- Source-level grep confirms `packages/protocol/src/profile.ts` and `packages/protocol/src/profile-compatibility-check.ts` import `@burningspace/shared`, and no file under `packages/shared/src/` imports `@burningspace/protocol` — no cycle, no reversal.
- `packages/balance/src/index.ts` re-exports `mvp-balance-v0.1.ts` (versioned constants); `packages/config/src/index.ts` re-exports only `map.full-mvp.ts` (structural topology) — matches `BS-ARCH-006`'s maturity characterization. Neither package is imported by `apps/**`.
- `docs/architecture/shared-dependency-map.md`'s "Target dependency graph" section independently states `packages/shared -X-> packages/protocol`, consistent with `BS-ARCH-005`.

## Dependency and supersession verification

- `BS-ARCH-005 -> BS-ARCH-004`: present and correct.
- `BS-ARCH-007 -> BS-ARCH-001`: present and correct.
- `BS-ARCH-001`, `BS-ARCH-002`, `BS-ARCH-003`, `BS-ARCH-004`, `BS-ARCH-006`: `Depends on: none`, correct.
- No cycles. No additional or invented dependency found in any record or in `DECISION_INDEX.md`.
- All seven records: `Supersedes: none`, `Superseded by: none` — no false supersession claims.

## Registry and index verification

- `git diff` for `DECISION_INDEX.md` shows only additive changes: seven new `BS-ARCH-*` rows plus a new "Approved, pending migration — DOCARCH-002C" section; every pre-existing row (18 mechanics/task-local entries) and the "Reserved" / "Not recovered" sections are byte-unchanged.
- Exactly 25 accepted decision instances exist across the repository (`BS-MECH-005`, `BS-MECH-006`, `GAME-001-D1`–`D5`, `BS-MECH-013`–`019` minus gaps, `BS-MECH-021`, `BS-MECH-022`, `BS-MECH-024`, `BS-MECH-028`, `BS-ARCH-001`–`007`), each appearing exactly once in `DECISION_INDEX.md`.
- All seven `BS-ARCH` records appear as `accepted` with correct dependency columns matching their record files.
- Pending C2/C3 entries list exactly `BS-PROC-001`, `BS-PROC-002`, `BS-PROC-003`, `CI-003-D1`; no files exist for any of these (confirmed by the 12-path changed-file scope, which contains no `BS-PROC-*.md` or `CI-003-D1.md`).
- `AGENT-004` is not listed anywhere in `DECISION_INDEX.md`.
- Reserved (`BS-MECH-020`, `023`, `025`–`027`) and unrecovered (`BS-MECH-001–004`, `007–012`) ranges are unchanged.
- `README.md`'s only change is a one-line status-sentence update naming DOCARCH-002C1; it continues to point to `DECISION_INDEX.md` and does not duplicate registry content.

## Task and CURRENT verification

- `docs/tasks/docarch-002c-architecture-process-decision-migration.md` defines C1 (architecture), C2 (process), C3 (CI), C4 (reconciliation/closure); states B2 is merged and closed; explicitly states B2 historical blank review rows "must not be backfilled or used to reopen B2"; lists exactly `BS-ARCH-001`–`007` as C1 accepted IDs; states "No process or CI decision records in C1" under Non-goals; declares `Merge authority: Human only`; and its allowed/forbidden file lists match the actual 12-path diff exactly.
- `CURRENT.md` marks PR #39/B2 as "merged and closed" and states "B2 is not reopened"; names DOCARCH-002C1 as the active task on branch `docs/docarch-002c1-architecture-decisions`; points to the new task file; does not claim C1 is merged (states "active"); makes no claim that C2 is active; contains exactly one "Next safe action" line; and lists Product Architect, Architecture Reviewer, Claude QA, documentation consistency review, and human-only merge as required.

## Validation results

- `git diff --check origin/main...HEAD`: clean, no whitespace errors.
- `git diff --name-only origin/main...HEAD`: exactly 12 changed paths, matching the expected list precisely; no forbidden path (no `BS-MECH-*`, `GAME-001-*`, `docs/GOVERNANCE.md`, `DECISION_TEMPLATE.md`, `PROJECT_CONTEXT.md`, `AGENTS.md`, `CLAUDE.md`, `docs/architecture/**`, `docs/design/**`, `docs/agents/**`, `apps/**`, `packages/**`, `.github/**`, `package.json`, `package-lock.json`) was touched.
- `git diff --stat origin/main...HEAD`: 12 files changed, 492 insertions, 16 deletions — consistent with 7 new decision files (~47–49 lines each), 1 new task file, 1 new review-artifact skeleton, and 3 small modified files.
- Repository state check: branch `docs/docarch-002c1-architecture-decisions`, HEAD `16e78540218da6e128174dbbfdb4edcca27d3b45`, PR #40 `headRefOid` matches, PR state `OPEN`/not draft/`MERGEABLE`/`CLEAN`. Only pre-existing untracked `.codex/` and `claude-qa-full-38.log` present, untouched.
- No `npm install`, test, build, typecheck, or runtime diagnostics were run, per instructions.

## Blocking findings

None.

## Non-blocking notes

None.

## Product Architect

Verdict:

Findings:

## Architecture Reviewer

Verdict: APPROVED

Findings: All seven `BS-ARCH` records preserve the required architecture meanings precisely, retain the required transitional-boundary language (most critically `BS-ARCH-004` and `BS-ARCH-006`), match package-manifest and import-graph evidence exactly, declare correct dependencies with no cycles or inventions, and introduce no runtime, package, or dependency change. Scope is clean at exactly 12 changed paths with no forbidden files touched.

## Claude QA

Verdict:

Findings:

## Documentation consistency review

Verdict: APPROVED

Findings: All seven records use the exact `DECISION_TEMPLATE.md` section order and required metadata (`Status: accepted`, `Owner: Product Architect`, `Date: 2026-07-14`, consistent `Notes` phrasing). `DECISION_INDEX.md` additions are purely additive with no modification to the 18 pre-existing entries, reserved ranges, or unrecovered ranges; the registry now totals exactly 25 accepted instances, each listed once. `README.md`'s single-line update remains non-duplicative and points to the index. `docs/handoffs/CURRENT.md` correctly reports B2 closure without reopening it, names C1 as the sole active stage, and contains exactly one next safe action. The task file's stage split, accepted-ID list, non-goals, and allowed/forbidden scope match the actual diff.

## Evidence and validation summary

Scope verification, record metadata checks, architecture conformance (7/7 MATCH), transitional-boundary checks, package/dependency verification against manifests and source imports, dependency/supersession graph checks, registry/index checks, task/CURRENT checks, and `git diff --check`/`--name-only`/`--stat` validation were all performed and passed. See sections above for full detail.

## Blocking findings

None.
