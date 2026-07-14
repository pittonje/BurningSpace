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

- DOCARCH-002C1 — active in this PR.
- DOCARCH-002C2 — pending.
- DOCARCH-002C3 — pending.
- DOCARCH-002C4 — pending.

## DOCARCH-002C1 accepted IDs

- `BS-ARCH-001`
- `BS-ARCH-002`
- `BS-ARCH-003`
- `BS-ARCH-004`
- `BS-ARCH-005`
- `BS-ARCH-006`
- `BS-ARCH-007`

## C1 allowed files

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

## C1 forbidden files

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

## Validation expectations

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
