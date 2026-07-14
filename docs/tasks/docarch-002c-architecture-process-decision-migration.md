# DOCARCH-002C — Architecture, Process, and CI Decision Migration

Owner: `Product Architect`

Merge authority: `Human only`

## Purpose

Migrate Product Architect-approved architecture, process, and CI decisions into the canonical decision registry in staged, non-overlapping work.

## Authority

Decision authority is defined by `docs/GOVERNANCE.md`. Only the Product Architect approves accepted decision records. Observed implementation remains evidence and does not independently establish accepted architecture.

## Stage split

- DOCARCH-002C1 — architecture decision migration.
- DOCARCH-002C2 — process decision migration.
- DOCARCH-002C3 — CI decision migration.
- DOCARCH-002C4 — reconciliation, index cleanup, and stage closure.

## Stage status

- DOCARCH-002C1 — completed and merged via PR #40.
- DOCARCH-002C2 — completed and merged via PR #41.
- DOCARCH-002C3 — active in this PR.
- DOCARCH-002C4 — pending.

## DOCARCH-002C1 accepted IDs

- `BS-ARCH-001`
- `BS-ARCH-002`
- `BS-ARCH-003`
- `BS-ARCH-004`
- `BS-ARCH-005`
- `BS-ARCH-006`
- `BS-ARCH-007`

## C1 historical scope

- `docs/decisions/BS-ARCH-001.md`
- `docs/decisions/BS-ARCH-002.md`
- `docs/decisions/BS-ARCH-003.md`
- `docs/decisions/BS-ARCH-004.md`
- `docs/decisions/BS-ARCH-005.md`
- `docs/decisions/BS-ARCH-006.md`
- `docs/decisions/BS-ARCH-007.md`
- `docs/decisions/DECISION_INDEX.md`
- `docs/decisions/README.md`
- `docs/tasks/docarch-002c-architecture-process-decision-migration.md`
- `docs/reviews/docarch-002c1-architecture-migration-review.md`
- `docs/handoffs/CURRENT.md`

## C1 historical forbidden files

Every path outside the C1 allowed-file list is forbidden. In particular, C1
must not modify mechanics or task-local decision records, B1/B2 review
artifacts, governance, templates, durable context, entrypoints, architecture
or design sources, agent documents, runtime applications, packages, workflows,
manifests, or lockfiles.

## Non-goals

- No roadmap, takeover, portability, or gameplay-conflict work.
- No process or CI decision records in C1.
- No runtime, package, dependency, workflow, architecture-source, design, `PROJECT_CONTEXT.md`, `AGENTS.md`, or `CLAUDE.md` changes.
- No B2 review-artifact backfill.

## DOCARCH-002C2 purpose

Migrate the Product Architect-approved process-governance decisions without changing workflows, GitHub settings, governance sources, agent adapters, runtime code, packages, or historical review artifacts.

## C2 accepted IDs

- `BS-PROC-001`
- `BS-PROC-002`
- `BS-PROC-003`
- `BS-PROC-004`

BS-PROC-004 is Product Architect-approved for C2.

## C2 allowed files

- `docs/decisions/BS-PROC-001.md`
- `docs/decisions/BS-PROC-002.md`
- `docs/decisions/BS-PROC-003.md`
- `docs/decisions/BS-PROC-004.md`
- `docs/reviews/docarch-002c2-process-migration-review.md`
- `docs/decisions/DECISION_INDEX.md`
- `docs/decisions/README.md`
- `docs/tasks/docarch-002c-architecture-process-decision-migration.md`
- `docs/handoffs/CURRENT.md`

## C2 forbidden files

Every path outside the C2 allowed-file list is forbidden. In particular, C2 must not modify architecture, mechanics, or task-local decision records; historical review artifacts; governance; templates; durable context; entrypoints; agent, architecture, or design documents; runtime applications; packages; workflows; manifests; lockfiles; GitHub settings; or branch protection.

## C2 review and evidence requirements

- Human-only merge authority remains mandatory.
- Required reviewers are Product Architect, Architecture Reviewer, Documentation consistency review, and Claude QA.
- BS-PROC-004 requires each required review role to record a verdict and evidence bound to the reviewed commit, with required checks passing on the final pull-request head.
- Historical B1/B2 artifacts remain immutable and are not backfilled.
- PR #40 established the complete-review-evidence precedent.
- Security/CI Reviewer is not required because C2 changes no workflow, script, or repository setting. CI classifier suggestions are advisory unless this task explicitly requires them.

## DOCARCH-002C3 purpose

Migrate the Product Architect-approved CI-003-D1 governance decision without changing workflows, scripts, GitHub settings, runtime code, packages, dependencies, or CI behavior.

## C3 accepted IDs

- `CI-003-D1`

CI-003-D1 is Product Architect-approved for C3.

## C3 allowed files

- `docs/decisions/CI-003-D1.md`
- `docs/reviews/docarch-002c3-ci-routing-migration-review.md`
- `docs/decisions/DECISION_INDEX.md`
- `docs/decisions/README.md`
- `docs/tasks/docarch-002c-architecture-process-decision-migration.md`
- `docs/handoffs/CURRENT.md`

## C3 forbidden files

Every path outside the C3 allowed-file list is forbidden. C3 must not change workflows, scripts, GitHub settings, branch protection, CI bugs, agent adapters, governance, architecture or design documents, runtime applications, packages, manifests, lockfiles, or historical review artifacts.

## C3 review and evidence requirements

- Human-only merge authority remains mandatory.
- Required reviewers are Product Architect, Security/CI Reviewer, Architecture Reviewer, Documentation consistency review, and Claude QA.
- BS-PROC-004 requires each required review role to record a verdict and evidence bound to the reviewed commit, with required checks passing on the final pull-request head.
- C4 remains pending. DOCARCH-002D remains separate broader reconciliation after C4.
- AGENT-004 and detailed portability policy remain deferred to DOCARCH-005.
- This task introduces no workflow, script, setting, or branch-protection enforcement change.

## C1 historical validation expectations

- Exactly twelve changed paths and seven new architecture decision records.
- Twenty-five accepted decision records after C1.
- Template order, metadata, dependencies, source evidence, and index uniqueness are verified.
- No mechanics/task-local decision file changes and no C2/C3/AGENT-004 records are created.
- Do not run dependency installation, tests, builds, typechecks, or runtime diagnostics.

## Required reviewers

- Product Architect
- Architecture Reviewer
- Claude QA
- Documentation consistency review

Human-only merge authority remains mandatory.

## Known handoff gap

PR #39 / DOCARCH-002B2 is merged and B2 is closed. `CURRENT.md` remained stale after that merge. Product Architect and Claude QA blank rows in the B2 review artifact are historical incompleteness, are not open B2 work, and must not be backfilled or used to reopen B2 in this task.
