# DOCARCH-002 — Decision Inventory and Recovery

## Goal

Recover BurningSpace decision references into a repository evidence inventory, separate confirmed meaning from proposed identifiers and implementation facts, and obtain the Product Architect approvals required before canonical decision records are created.

## Strategic purpose

DOCARCH-002 transfers decision knowledge from repository history and controlled Product Architect exports into the documentation authority system established by DOCARCH-001. The work preserves architecture and roadmap continuity without allowing task, review, or implementation evidence to become accepted decisions accidentally.

## Staged migration

- DOCARCH-002A — inventory and approval matrix: records evidence, proposed mappings, conflicts, missing context, and exact approval questions. It creates no decision instance files.
- DOCARCH-002B — mechanics migration: creates only the Product-Architect-approved clean mechanics records, with Gameplay Reviewer coverage.
- DOCARCH-002C — architecture/process migration: creates approved architecture, process, and CI decision records, with Architecture Reviewer coverage.
- DOCARCH-002D — reconciliation, indexes and resolved conflicts: reconciles transitional sources, completes indexes and links, and migrates conflict decisions only after explicit supersession and implementation scope are approved.

## DOCARCH-002A scope

- Preserve and classify existing decision IDs and repository references.
- Record Product Architect-confirmed meanings separately from proposed IDs.
- Create a visibly unapproved proposed ID map.
- Document five repository conflict clusters without changing their sources.
- Record missing ID ranges and unresolved predecessor references without fabricating records.
- Present the exact Product Architect approval matrix for later stages.
- Update the operational handoff.

## Non-goals

- No decision instance files are created and no registry decision status changes.
- No conflicts are resolved or silently normalized.
- No runtime, balance, workflow, script, dependency, agent, architecture implementation, design baseline, roadmap, or project-context change.
- No existing ID is renamed and no missing ID is invented.
- No DOCARCH-002B, DOCARCH-002C, or DOCARCH-002D implementation begins.

## Allowed files

- `docs/tasks/docarch-002-decision-inventory-and-recovery.md`
- `docs/reviews/docarch-002-decision-recovery-report.md`
- `docs/handoffs/CURRENT.md`

## Forbidden files

Every file outside the three-path allowlist is forbidden. In particular, `docs/decisions/**`, `PROJECT_CONTEXT.md`, design and architecture baselines, runtime applications and packages, workflows, scripts, dependencies, agents, tests, and roadmap files remain unchanged.

The decision registry must continue to contain only `docs/decisions/README.md` and `docs/decisions/DECISION_TEMPLATE.md`.

## Authority rules

- Product Architect-confirmed meaning is authoritative even when its proposed stable ID is not yet approved.
- `BS-MECH-013`, `BS-MECH-014`, and `BS-MECH-015` retain their confirmed stable IDs and accepted authority; their migration remains pending DOCARCH-002B and their future files require Product Architect review before merge.
- Repository-explicit accepted candidates require Product Architect confirmation of canonical wording or status before migration.
- Proposed IDs are navigation proposals only and are not approved stable IDs.
- Current Product Architect direction outranks potentially stale conflicting repository text or code; DOCARCH-002A records the conflict but does not reconcile it.
- Observed implementation is evidence only and is not automatically accepted design.
- Missing IDs and predecessor references remain unresolved until a controlled Product Architect export is supplied.
- Human merge authority remains mandatory.

## Acceptance criteria

- The report includes all required existing references, confirmed meanings, proposed mappings, conflicts, missing ranges, implementation facts, and staged approvals.
- Existing stable IDs are preserved exactly.
- Confirmed meaning and proposed ID approval are separate fields.
- Every proposed ID is visibly unapproved and no proposed-ID file exists.
- Every conflict identifies current direction, stale evidence, authority interpretation, affected files or symbols, supersession need, implementation reconciliation need, and blocked migration status.
- `BS-MECH-001–004` and `BS-MECH-007–012` are recorded as not recovered without placeholders.
- `BS-MECH-014` records its unresolved predecessor without inventing an ID.
- The Product Architect approval matrix does not ask for reconfirmation of the exported meanings of `BS-MECH-013–015`.
- `CURRENT.md` contains exactly one next safe action.
- Exactly three authorized files change; the decision registry remains unchanged.

## Validation

Run:

```text
git diff --check
git status --short
git diff --name-only
git diff --stat
```

Verify the exact three-path allowlist, unchanged two-file registry, absence of decision instances, preserved IDs, unapproved proposed IDs, unresolved conflicts, non-fabricated missing ranges, separated implementation facts, and one next safe action.

Do not run dependency installation, tests, builds, typechecks, or runtime diagnostics for this documentation-only evidence task.

## Risk and routing

- Runtime, networking, security, protocol, persistence, performance, and CI risk: none.
- Documentation and authority-migration risk: medium.
- Required: Product Architect review of the approval matrix and conflict register.
- Required: automatically routed Claude QA because `docs/handoffs/CURRENT.md` classifies as `workflow_security` with `qa_required=true`.
- Gameplay Reviewer is not required for DOCARCH-002A because no mechanics record or gameplay behavior changes; it is required for DOCARCH-002B.
- Architecture Reviewer is not required for DOCARCH-002A because no normative architecture/process record or implementation boundary changes; it is required for DOCARCH-002C.
- Network, Security, and Visual reviewers are not applicable because their runtime domains are unchanged.

## Rollback

Revert the single DOCARCH-002A documentation commit. No runtime, data, dependency, workflow, or deployment rollback is required.

## Follow-up

The Product Architect reviews and accepts the approval matrix and conflict register. DOCARCH-002B remains inactive until the clean mechanics ID and wording matrix is accepted.
