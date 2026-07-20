# DOCARCH-003A Readiness Baseline and Roadmap Scope Review

## Review metadata

- Task: `DOCARCH-003A — Readiness Baseline and Roadmap Scope Lock`
- Reviewed implementation commit: `2a05167cb1a1f076e7ec27097da0de3dd7f0b3fe`
- Pull request: #47
- Branch: `docs/docarch-003a-readiness-baseline`

## Repository baseline

- Verification: Base merge confirmed as `0e8586f` / PR #46 via `git rev-parse origin/main` (`0e8586f44d0e03e6cc6df318ef905114a02f036e`). `docs/roadmap/DOCARCH-003_READINESS_BASELINE.md` states DOCARCH-002 is closed, the registry contains 35 accepted decisions (18 `BS-MECH`, 5 `GAME-001`, 7 `BS-ARCH`, 4 `BS-PROC`, 1 `CI`), the repository is a TypeScript npm-workspaces monorepo, the client uses Phaser/Vite, and the server uses Node.js/TypeScript/Colyseus. All independently confirmed against `docs/decisions/DECISION_INDEX.md` (35 rows, matching category counts) and `package.json`/workspace manifests.
- Findings: No discrepancy. The document explicitly states it "is not a mechanics or architecture decision registry" and that "implementation state may evolve," correctly framing itself as evidence rather than authority.

## Implementation classifications

- Verification: The implementation-state matrix uses exactly the six required primary states (`IMPLEMENTED`, `PARTIAL`, `PROTOTYPE`, `DOCUMENTED ONLY`, `ABSENT`, `UNKNOWN`) and every row carries domain, state, evidence paths, governing decisions, principal missing work, and confidence. Two dedicated subagent reviews (architecture-focused and gameplay/mechanics-focused) independently re-verified matrix claims against source:
  - Workspace/client/server bootstrap, connection flow, movement authority, and combat rows (`IMPLEMENTED`) are supported by existing files (`apps/client/src/main.ts`, `apps/server/src/index.ts`, `apps/server/src/rooms/BattleRoom.ts`, `apps/server/src/systems/shipMovement.ts`, `apps/server/src/systems/combat.ts`).
  - `TestBattleRoom` (`PARTIAL`) is not registered in `apps/server/src/index.ts` (only `'battle' -> BattleRoom` is registered) but `TestBattleRoom extends BattleRoom` directly and is structurally close to production room code, consistent with the baseline's framing that SEC-006 isolation is not yet complete.
  - Death/respawn (`PARTIAL`): `apps/server/src/systems/outpostRespawn.ts` is a pure, unintegrated function with no call sites outside its own test; `apps/server/src/systems/combat.ts` implements a separate timed arena respawn. This supports `PARTIAL` rather than `IMPLEMENTED` or `ABSENT`.
  - Ship switching, sectors, governed sectors/shields, and outposts (`DOCUMENTED ONLY`) and turrets/creeps (`PROTOTYPE`) are corroborated: no sector/outpost/turret/capture runtime logic exists anywhere in `apps/server/src`; client-side turret/creep references are confined to non-authoritative presentation (`apps/client/src/systems/NpcManager.ts`, `apps/client/src/world/SpaceMap.ts`), consistent with `BS-ARCH-007`.
  - Shared/protocol contracts (`PARTIAL`) is defensible given partial runtime consumption without full separation, per `docs/architecture/shared-dependency-map.md`.
- Findings: No misclassification found. No runtime evidence was substituted with design prose alone; each row cites concrete evidence paths and the two independent domain reviews found no contradicting evidence.

## Authority separation

- Verification: The baseline states accepted decisions remain canonical, frames implementation only as evidence (e.g., "implementation evidence, not immutable architecture" for `outpostRespawn.ts`), and does not treat `PROJECT_CONTEXT.md` as a decision registry. No new architecture, mechanics, security, or CI decision is minted; the "Product Architect decisions" section explicitly states these "are DOCARCH-003 roadmap-scope authority... not new accepted decision records and do not change the accepted count of 35." The task file (`docs/tasks/docarch-003-canonical-development-roadmap.md`) repeats this constraint. `git diff --name-only origin/main...HEAD -- docs/decisions/` returns no paths — no decision record was touched.
- Findings: No violation. Accepted-decision count independently confirmed unchanged at 35.

## Product Architect decisions

- Verification: All five required decisions are present and accurately recorded in `docs/roadmap/DOCARCH-003_READINESS_BASELINE.md` ("Product Architect decisions" section): (1) MVP boundary — inclusions and exclusions match the required list exactly; (2) decision-record boundary — DOCARCH-003 creates no accepted decision records, unknowns become future gates/tasks; (3) `outpostRespawn.ts` — accepted respawn semantics remain authoritative, current helper is evidence not immutable architecture, must be revalidated, may be adapted without changing `BS-MECH-005`/`BS-MECH-006`/`GAME-001-D1`–`D5` meanings; (4) `TestBattleRoom` — preserve diagnostics, SEC-006 must structurally isolate from production registration with a preference for test-only infrastructure/dedicated entrypoint plus an automated exposure guard; (5) `CURRENT.md` — stale post-D3 handoff corrected in A, general recovery procedure reserved for DOCARCH-004.
- Findings: No wording mints a new accepted mechanics, architecture, security, or CI decision. No exact balance value or implementation algorithm not present in accepted decisions is introduced (verified against `docs/design/mvp-game-design.md`, which explicitly leaves the four-sector selection algorithm, repair speed/cost, and post-capture retention formula "unresolved").

## MVP boundary

- Verification: MVP inclusions (authority/security hardening; persistence and minimum identity/session foundation; territorial gameplay; one outpost with exactly six governed sectors; accepted shield thresholds; turret destruction/restoration; outpost capture and partial post-capture state; outpost respawn integration; accepted ship control/switching requirements; minimum server-side creep participation required by `BS-MECH-019`; minimum client UX and operational/deployment surface; stabilization) and exclusions (full economy, full logistics, mining/resource production, portals, advanced creep AI, broad post-MVP systems) match the task's required boundary verbatim in substance.
- Findings: No reduction to arena-combat-only or one-outpost-plus-one-sector scope. Persistence/identity is correctly sequenced ahead of campaign expansion in both the MVP boundary text and the roadmap-shape wave ordering. No new exact balance value or algorithm is introduced beyond accepted decisions.

## Vertical-slice boundary

- Verification: The "Authority corrections" section states the minimum campaign slice "requires one outpost with exactly six governed sectors, the accepted shield thresholds, the 4/6 post-capture state, and the relevant accepted sector/outpost mechanics," matching `BS-MECH-021` (governance cardinality: exactly six), `BS-MECH-022` (shield active at three-or-more of six, inactive at two-or-fewer), and `BS-MECH-023` (4/6 post-capture state, shield active, former owner must retake two sectors). The same slice definition and its constraints (no silent expansion into economy/logistics/mining/portals/advanced creep AI) are repeated in `docs/tasks/docarch-003-canonical-development-roadmap.md` under the DOCARCH-003B expectations. Minimum creep participation required by `BS-MECH-019` is explicitly included in the slice; advanced AI and full economy are explicitly excluded.
- Findings: No omission of the six-governed-sector or 4/6 post-capture requirement. No minimum-creep exclusion. No economy/logistics/portal inclusion.

## Protocol/shared authority

- Verification: The baseline's "Authority corrections" section states `packages/shared` "remains the current canonical owner of broad runtime and profile contracts" and `packages/protocol` "is an active transitional public compatibility boundary... while depending on shared," with the accepted direction `protocol -> shared` and the explicit statement that "shared must not depend on protocol." Independently confirmed: `packages/protocol/package.json` declares `@burningspace/shared`; no file under `packages/shared/src` imports `@burningspace/protocol`; this matches `BS-ARCH-004`, `BS-ARCH-005`, and `docs/architecture/shared-dependency-map.md`.
- Findings: Protocol is never presented as the canonical broad-contract owner. Balance/config are correctly described only through their existing `PARTIAL`/`DOCUMENTED ONLY` classifications and are not overstated as current active authorities.

## DOCARCH-003B scope

- Verification: `docs/tasks/docarch-003-canonical-development-roadmap.md` states DOCARCH-003B is "Pending after DOCARCH-003A merges," with expected creates limited to `docs/roadmap/CANONICAL_DEVELOPMENT_ROADMAP.md` and `docs/reviews/docarch-003b-canonical-development-roadmap-review.md`, expected modifies limited to `docs/tasks/docarch-003-canonical-development-roadmap.md`, `docs/handoffs/CURRENT.md`, and `PROJECT_CONTEXT.md`, and a stated provisional changed-path count of 5. The section explicitly excludes decision, runtime, architecture/design, package/dependency, and workflow/script changes. No canonical roadmap file exists yet in the repository (`docs/roadmap/` contains only `DOCARCH-003_READINESS_BASELINE.md`).
- Findings: DOCARCH-003B is correctly reserved and not implemented in this PR.

## DOCARCH-004 scope

- Verification: Both the readiness baseline and the task file reserve, without implementing, the cold-start reading sequence, authority recovery, stale/`CURRENT`-versus-git discrepancy recovery, active-task discovery, sole-next-safe-action recovery, forbidden actions, merge-authority verification, takeover success criteria, and a cold takeover drill.
- Findings: No DOCARCH-004 artifact or protocol content is implemented in this PR; the reservation is scope-only.

## DOCARCH-005 scope

- Verification: Both documents reserve, without implementing, vendor/model-independent roles, minimum role capabilities, implementer/reviewer separation, standardized evidence formats, fallback model routing, model-replacement procedure, prompt/adapter portability, and `AGENT-004` recovery or creation.
- Findings: No DOCARCH-005 artifact is implemented in this PR; the reservation is scope-only.

## CURRENT correction

- Verification: `docs/handoffs/CURRENT.md` now states PR #46/DOCARCH-002D3 is merged, DOCARCH-002 is closed, the accepted count is 35, the readiness assessment is complete, DOCARCH-003A is active, the active branch/task/review paths match exactly (`docs/docarch-003a-readiness-baseline`, `docs/tasks/docarch-003-canonical-development-roadmap.md`, `docs/reviews/docarch-003a-readiness-baseline-and-scope-review.md`), DOCARCH-003B is pending, DOCARCH-004/005 are reserved only, no decisions are created, runtime and forbidden areas are unchanged, the required reviewer set is listed, and there is exactly one `## Next safe action` heading (deterministic grep count = 1) reading "Required reviewers complete the DOCARCH-003A readiness baseline and roadmap scope-lock conformance review," matching the required text exactly.
- Findings: No stale claim that D3 is active or unmerged remains. Correction is complete and accurate.

## Accepted-count verification

- Verification: `docs/decisions/DECISION_INDEX.md` lists exactly 35 accepted rows; a file count under `docs/decisions/` (excluding `README.md`, `DECISION_TEMPLATE.md`, `DECISION_INDEX.md`) returns exactly 35 files. Category breakdown confirmed by manual tally of the index: `BS-MECH-005`, `006`, `013`–`028` = 18; `GAME-001-D1`–`D5` = 5; `BS-ARCH-001`–`007` = 7; `BS-PROC-001`–`004` = 4; `CI-003-D1` = 1. Total = 35.
- Findings: Count and category breakdown are unchanged and correctly restated in the baseline, task file, and `CURRENT.md`.

## Scope verification

- Verification: `git diff --name-only origin/main...HEAD` returns exactly four paths: `docs/handoffs/CURRENT.md` (M), `docs/reviews/docarch-003a-readiness-baseline-and-scope-review.md` (A), `docs/roadmap/DOCARCH-003_READINESS_BASELINE.md` (A), `docs/tasks/docarch-003-canonical-development-roadmap.md` (A). `git diff --name-status` confirms exactly one `M` and three `A` entries. No path under `docs/decisions/`, `docs/GOVERNANCE.md`, `docs/architecture/`, `docs/design/`, `AGENTS.md`, `CLAUDE.md`, `docs/agents/`, `.github/`, `apps/`, `packages/`, or any script/manifest/lockfile appears in the diff. Pre-existing untracked `.codex/` and `claude-qa-full-38.log` are untouched.
- Findings: Exact four-file allowlist is clean; no forbidden path changed.

## Validation summary

- Repository state: branch `docs/docarch-003a-readiness-baseline`, HEAD `2a05167cb1a1f076e7ec27097da0de3dd7f0b3fe`, clean tracked working tree (only pre-existing untracked `.codex/` and `claude-qa-full-38.log`, both ignored); base `origin/main` at `0e8586f44d0e03e6cc6df318ef905114a02f036e` (merged PR #46).
- PR #47: `headRefOid` matches the reviewed commit, `state: OPEN`, `isDraft: false`, `mergeable: MERGEABLE`, `mergeStateStatus: UNSTABLE` (see Non-blocking notes on the failing `qa-review` check). `gh pr checks 47`: `checks` reports `pass`; `qa-review` reports `fail`.
- `git diff --check origin/main...HEAD`: clean (no output).
- `git diff --name-only` / `--stat` origin/main...HEAD: exactly 4 files changed, 495 insertions(+), 16 deletions(-); exactly one implementation commit over `origin/main` (`2a05167`).
- Deterministic checks confirmed: exactly four changed paths matching the allowlist; exactly three new files and one modified file (`CURRENT.md`); zero decision-record files touched; 35 accepted decision-record files and 35 accepted index rows with category counts 18/5/7/4/1; no canonical roadmap file (`docs/roadmap/CANONICAL_DEVELOPMENT_ROADMAP.md`) exists yet; shared/protocol authority wording matches `BS-ARCH-004`/`BS-ARCH-005`; vertical slice explicitly names one outpost and exactly six governed sectors with the 4/6 post-capture state; minimum creep participation required by `BS-MECH-019` is included in MVP; full economy/logistics/portals/advanced creep AI are excluded from MVP; DOCARCH-003B remains pending with the correct 5-path provisional scope; DOCARCH-004/005 are reserved only; `CURRENT.md` contains exactly one `## Next safe action` heading with the exact required text; no forbidden path changed.
- Independent architecture-focused and gameplay/mechanics-focused source-level verification (via dedicated read-only reviewer passes) corroborated every matrix classification and both the protocol/shared and vertical-slice claims against actual repository source (`apps/server/src`, `apps/client/src`, package manifests), finding no misclassification and no invented balance values.
- This artifact's committed skeleton (prior to this update) contained all required sections with blank external verdict fields and no requirement for the evidence commit to self-reference its own SHA.
- No dependency installation, build, typecheck, test, runtime server, deployment, or migration commands were run, per instructions.

## Blocking findings

None.

## Non-blocking notes

1. PR #47's `mergeStateStatus` is `UNSTABLE` because the `qa-review` GitHub Actions check (Claude QA Review Pilot) reports `fail`. Inspection of the run (`gh api repos/pittonje/BurningSpace/actions/runs/29709648168/jobs`) shows the failure occurred at the "Run Claude QA reviewer" and "Publish QA review comment" steps — an automated-pilot invocation/publishing failure, not a content-based rejection of the reviewed documents. This is distinct from the manual "Claude QA" evidence section in this artifact, which remains blank per instructions. This should be investigated and re-run (or otherwise resolved) before human merge, consistent with `BS-PROC-004`'s requirement for passing final checks; it does not indicate any defect in the readiness baseline, task file, or `CURRENT.md` content reviewed here.

## Product Architect

- Verdict: APPROVED FOR HUMAN MERGE
- Findings: No blockers. Approval accepts the Architecture, Gameplay/Product, and Documentation consistency reviews and confirms the readiness baseline, MVP boundary, vertical-slice boundary, DOCARCH-003B scope, reserved DOCARCH-004/005 scopes, accepted-count preservation, and corrected CURRENT state.
- Reviewed commit: `29dee9c07fb2478acd0a4df23750fe05533fd802`
- Evidence source: Verified Product Architect PR comment (author `pittonje`, author association `OWNER`): https://github.com/pittonje/BurningSpace/pull/47#issuecomment-5018289159
- Date: 2026-07-20 (comment posted 2026-07-20T02:43:45Z UTC)

## Architecture Reviewer

- Verdict: APPROVED
- Findings: Independent read-only architecture-focused verification confirmed the `protocol -> shared` dependency direction (`packages/protocol/package.json` declares `@burningspace/shared`; no `packages/shared/src` file imports `@burningspace/protocol`), matching `BS-ARCH-004` and `BS-ARCH-005` exactly, with `packages/shared` correctly retained as the canonical broad-contract owner and `packages/protocol` correctly described only as the transitional compatibility boundary. `IMPLEMENTED` matrix rows (workspace, client/server bootstrap, connection flow, movement/state authority, combat) are supported by existing evidence paths. `TestBattleRoom` is not registered in `apps/server/src/index.ts` (only `'battle' -> BattleRoom` is registered) but `TestBattleRoom extends BattleRoom` directly, so its `PARTIAL` classification and the statement that SEC-006 isolation is not yet complete are accurate rather than overstated. The document mints no new architecture decision and does not contradict `BS-ARCH-001` through `BS-ARCH-007`. The seven-wave roadmap shape correctly sequences authority/security hardening and persistence/identity ahead of territorial, outpost/infrastructure, and client-UX waves. The exact four-file diff touches no architecture, package, or runtime file.
- Reviewed commit: `2a05167cb1a1f076e7ec27097da0de3dd7f0b3fe`
- Evidence source: Read-only inspection of `docs/roadmap/DOCARCH-003_READINESS_BASELINE.md`, `docs/tasks/docarch-003-canonical-development-roadmap.md`, `docs/architecture/shared-dependency-map.md`, `docs/architecture/package-boundaries.md`, `docs/decisions/BS-ARCH-001.md` through `BS-ARCH-007.md`, and direct source/manifest verification (`apps/server/src/index.ts`, `apps/server/src/rooms/TestBattleRoom.ts`, `apps/client/src/main.ts`, `packages/shared/src`, `packages/protocol/src`, `packages/*/package.json`)
- Date: 2026-07-20

## Gameplay/Product Reviewer

- Verdict: APPROVED
- Findings: Independent read-only gameplay/mechanics-focused verification confirmed the vertical-slice claim (one outpost, exactly six governed sectors, accepted shield thresholds, 4/6 post-capture state) against `BS-MECH-021`, `BS-MECH-022`, and `BS-MECH-023`. The minimum-creep-participation claim tied to `BS-MECH-019` is accurate and correctly separated from advanced AI/economy, consistent with the `PROTOTYPE` classification for creeps (`apps/client/src/systems/NpcManager.ts`, client-only, non-authoritative per `BS-ARCH-007`). Death/respawn `PARTIAL` classification is accurate: `apps/server/src/systems/outpostRespawn.ts` is a pure function with no call sites outside its own test, while `apps/server/src/systems/combat.ts` implements a separate, unrelated timed arena respawn. Ship switching/sectors/governed sectors/outposts (`DOCUMENTED ONLY`) and turrets (`PROTOTYPE`) classifications are corroborated — no sector/outpost/turret/capture runtime logic exists anywhere in `apps/server/src`. The MVP boundary introduces no invented balance value or selection algorithm; `docs/design/mvp-game-design.md` explicitly leaves the four-sector selection algorithm unresolved and the baseline does not resolve it. Full economy, logistics, mining/resource production, portals, and advanced creep AI are correctly excluded from MVP.
- Reviewed commit: `2a05167cb1a1f076e7ec27097da0de3dd7f0b3fe`
- Evidence source: Read-only inspection of `docs/roadmap/DOCARCH-003_READINESS_BASELINE.md`, `docs/tasks/docarch-003-canonical-development-roadmap.md`, `docs/design/mvp-game-design.md`, `docs/decisions/BS-MECH-005.md`, `BS-MECH-006.md`, `BS-MECH-013.md` through `BS-MECH-028.md`, `GAME-001-D1.md` through `GAME-001-D5.md`, and direct source verification (`apps/server/src/systems/outpostRespawn.ts`, `apps/server/src/systems/combat.ts`, `apps/client/src/systems/NpcManager.ts`, repo-wide grep for sector/outpost/turret runtime logic)
- Date: 2026-07-20

## Documentation consistency review

- Verdict: APPROVED WITH NON-BLOCKING NOTES
- Findings: `docs/roadmap/DOCARCH-003_READINESS_BASELINE.md`, `docs/tasks/docarch-003-canonical-development-roadmap.md`, and `docs/handoffs/CURRENT.md` are mutually consistent on every required fact: base merge `0e8586f`/PR #46; DOCARCH-002 closed; accepted count 35 with category counts 18/5/7/4/1; DOCARCH-003A active in PR #47 with a scope limited to the readiness baseline, Product Architect decisions, the exact DOCARCH-003B file scope, DOCARCH-004/005 reservations, the `CURRENT.md` correction, and this review artifact; DOCARCH-003B pending with a provisional 5-path scope; DOCARCH-004/005 reserved without implementation; no new decision record created; and no runtime, package, architecture, design, workflow, or script change. `PROJECT_CONTEXT.md`, `AGENTS.md`, `docs/GOVERNANCE.md`, `docs/decisions/README.md`, `docs/decisions/DECISION_INDEX.md`, `docs/architecture/shared-dependency-map.md`, `docs/architecture/package-boundaries.md`, and `docs/design/mvp-game-design.md` (all unmodified by this PR) are consistent with the baseline's claims about protocol/shared authority, the DOCARCH-002 closure state, and the accepted mechanics governing the vertical slice. `CURRENT.md` correctly repairs the stale post-D3 handoff and contains exactly one `## Next safe action` heading with the exact required text. The committed review-artifact skeleton contained every required section with blank external verdict fields before this update. The exact four-file scope is clean: three new files, one modified file, zero decision records touched, no forbidden path affected.
- Reviewed commit: `2a05167cb1a1f076e7ec27097da0de3dd7f0b3fe`
- Evidence source: Read-only inspection of the PR #47 four-path diff, `PROJECT_CONTEXT.md`, `AGENTS.md`, `CLAUDE.md`, `docs/GOVERNANCE.md`, `docs/decisions/README.md`, `docs/decisions/DECISION_INDEX.md`, `docs/handoffs/CURRENT.md`, `docs/tasks/docarch-003-canonical-development-roadmap.md`, `docs/roadmap/DOCARCH-003_READINESS_BASELINE.md`, `docs/tasks/docarch-002d-broader-reconciliation-and-closure.md`, `docs/reviews/docarch-002d3-context-architecture-design-reconciliation-review.md`, `docs/architecture/shared-dependency-map.md`, `docs/architecture/package-boundaries.md`, `docs/design/mvp-game-design.md`, deterministic diff/count checks, and `gh pr view`/`gh pr checks`/`gh api` output for PR #47
- Date: 2026-07-20

## Claude QA

- Verdict: Approved
- Findings: No blockers. Important suggestion: the pipeline's own `qa-review` GitHub Actions check (Claude QA Review Pilot) had reported fail (`mergeStateStatus` UNSTABLE) at review time and should be resolved/re-run before human merge per `BS-PROC-004`'s passing-checks requirement, even though it appeared to be an automation/publishing failure rather than a content defect — resolved by the successful rerun (attempt 5) of the same workflow run, after which `qa-review` reports pass. Minor suggestions: (1) confirm the pre-filled Architecture, Gameplay/Product, and Documentation consistency verdicts in the embedded review artifact reflect an actual completed multi-agent review process and not a template shortcut, since the diff itself cannot prove those reviews were genuinely performed by independent agents; (2) have the human merge step double-check that DOCARCH-003B's provisional 5-path scope and MVP/vertical-slice wording in the roadmap task file stay binding once DOCARCH-003B actually begins, since this A-stage document is roadmap-scope authority rather than an accepted decision record.
- Reviewed commit: `29dee9c07fb2478acd0a4df23750fe05533fd802`
- Evidence source: Claude QA Review Pilot successful run (attempt 5, conclusion `success`): https://github.com/pittonje/BurningSpace/actions/runs/29709838172 and its published approval comment: https://github.com/pittonje/BurningSpace/pull/47#issuecomment-5018265323. Earlier "Not approved — automation failure" comments from failed attempts of this workflow (structured output empty/whitespace-only) are superseded by this successful rerun evidence.
- Check conclusion: SUCCESS
- Date: 2026-07-20 (run completed 2026-07-20T02:36:54Z UTC; approval comment posted 2026-07-20T02:36:48Z UTC)
