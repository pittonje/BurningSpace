# PR-006 — Reviewer Coverage Validation & Routing

## Goal

Validate the previously unused Security, Gameplay, and Visual Design Lead Claude reviewers against the complete current repository and establish evidence-based reviewer routing for future tasks.

## Starting state

PR #8 / PR-005 is merged into `main` at `76095f51edf3b8fbd58c437f37af3f782ade5f92`. Six reviewer definitions exist, but stored reports exist only for Architecture, Network, and QA.

Historical PR-005 documents called the next narrow profile import task PR-006. The confirmed Product Architect decision supersedes that plan: this workflow task is PR-006 and the narrow consumer-import task is PR-007.

## Confirmed review coverage gap

`security-reviewer`, `gameplay-reviewer`, and `visual-design-lead` had never produced stored repository reports. No complete matrix declared when each of the six reviewers was required, recommended, optional, or not applicable.

## Scope

- Exhaustively inventory tracked repository files.
- Run the three unused reviewers independently and read-only.
- Verify every retained finding against repository evidence.
- Calibrate definitions only if an objective baseline failure requires it.
- Store coverage, validation, domain, and cross-discipline reports.
- Add reviewer routing and task-level selection rules.
- Run unchanged project checks and focused diagnostics.

## Non-goals

- No security hardening, dependency upgrade, or deployment infrastructure.
- No gameplay, balance, campaign, protocol, schema, networking, UI, VFX, or asset change.
- No PR-007 consumer cutover.
- No replacement of Phaser, Colyseus, npm, or preserved prototype files.

## Full repository coverage

Inspect every tracked text/source/config file and every tracked asset. Exclude ignored local configuration, `node_modules`, and generated build output. Record method and limitations in `docs/reviews/pr-006-repository-coverage.md`.

## Agents under validation

- `security-reviewer`
- `gameplay-reviewer`
- `visual-design-lead`

## Validation rubric

Each agent must launch under its configured name, remain read-only, read required context, inspect relevant evidence, return the exact required headings, distinguish current defects from future/accepted limitations, avoid invented behavior, and produce a meaningful domain approval.

## Baseline-run procedure

Record branch, commit, definition hash/model/tools/headings, then run one reviewer at a time. Preserve filtered output, run `git status --short` after each, and independently verify all retained claims.

## Calibration procedure

If a definition fails, preserve its baseline hash/output, make the smallest read-only correction, rerun only that agent once, and record before/after hashes. Do not change model or broaden permissions without Product Architect approval. Passing definitions remain untouched.

## Finding triage

Record verified findings with stable `SEC`, `GP`, and `VIS` IDs, severity, current/future classification, evidence, owner, follow-up, and blocker status. Do not implement runtime findings in PR-006. Critical/High findings require Product Architect escalation.

## Reviewer-routing deliverable

`docs/agents/reviewer-routing.md` defines task-dependent triggers, a change-type matrix, skipped-reviewer reasons, report naming, and domain-specific approval semantics.

## Allowed files

- The three agent definitions only if objective calibration is necessary.
- `docs/agents/agent-workflow.md` and `docs/agents/reviewer-routing.md`.
- PR-006 task/review reports.
- Concise workflow updates in `AGENTS.md` and `PROJECT_CONTEXT.md`.

## Forbidden files

Application/package source, scripts, assets, styles, schemas, manifests, lockfile, TypeScript configuration, local settings/environment files, and generated output.

## Validation

- `npm run build`
- `npm run typecheck`
- `npm run check:protocol-profile`
- `npx tsx apps/client/scripts/network-client-callback-check.ts`
- `npx tsx apps/server/scripts/movement-check.ts`
- `npx tsx apps/server/scripts/combat-check.ts`
- Empty runtime, script, asset, manifest, lockfile, and base-config diffs.

## Acceptance criteria

- All tracked files are classified and inspected using the documented method.
- Security, Gameplay, and Visual Design Lead actually run and pass the common rubric.
- Baseline hashes and evidence-based reports are stored.
- False positives and prototype limitations are separated from confirmed findings.
- Reviewer routing covers all required change types.
- Agent definitions remain unchanged unless a baseline failure proves otherwise.
- Architecture and QA approve the completed workflow.
- All validations pass with no runtime behavior change.

## Rollback plan

Revert only PR-006 documentation/workflow commits. Runtime and assets require no rollback because they are unchanged.

## Reviewers for PR-006

Required:

- This task strengthens the documentation-only matrix defaults because validating these three reviewer domains is the subject of PR-006 itself.
- `security-reviewer`: validate security audit coverage and findings triage.
- `gameplay-reviewer`: validate authority/gameplay distinction and scope.
- `visual-design-lead`: validate assets, presentation, placeholder policy, and pipeline coverage.
- `architecture-reviewer`: validate role boundaries and routing architecture.
- `qa-reviewer`: validate inventory, evidence, acceptance criteria, and scope.

Not required:

- `network-reviewer`: PR-006 changes no network contract, Colyseus behavior, schema, or runtime network code.

## Follow-up task

PR-007 — Narrow Profile Message Consumer Imports. Switch only the selected profile consumers to narrow `ProfileClientMessages`/`ProfileServerMessages`, retaining compatibility exports and preserving wire/runtime behavior.
