# DOCARCH-004 — Architect Takeover Protocol

Owner: `Product Architect`

Merge authority: `Human only`

## Purpose

Establish, through bounded stages, how a newly assigned Product Architect
recovers BurningSpace authority, current program state, active work, exact
permitted scope, exactly one safe next action, unresolved decision gates,
forbidden actions, merge authority, and review and evidence requirements from
repository truth alone, without chat history.

## Program state

- DOCARCH-003 completed through merged PR #48
  (`d8df95aba50c654df0819f7eacc95e848748cdfc`).
- DOCARCH-004 is active.
- DOCARCH-004A is the active readiness-assessment stage.
- The accepted decision count remains 35 (18 `BS-MECH`, 5 `GAME-001`,
  7 `BS-ARCH`, 4 `BS-PROC`, 1 `CI`).
- DOCARCH-004 creates no new accepted decisions in stage A.
- No runtime, package, workflow, architecture, design, agent-adapter, or
  script change occurs in stage A.
- Protocol implementation is not included in stage A.
- The cold takeover drill is not included in stage A.
- DOCARCH-005 — Role and Model Portability remains reserved after DOCARCH-004
  and is not implemented here.

## DOCARCH-004A — Readiness Assessment

Active stage. Bounded assessment only.

Exact A-stage file scope:

Create:

- `docs/roadmap/DOCARCH-004_READINESS_ASSESSMENT.md`
- `docs/tasks/docarch-004-architect-takeover-protocol.md` (this file)
- `docs/reviews/docarch-004a-readiness-assessment-review.md`

Modify:

- `docs/handoffs/CURRENT.md`

The exact changed-path count is 4. No other path may change.

### A-stage objectives

- Inventory existing takeover-relevant authority and operational evidence.
- Classify readiness across 28 required domains using the six assessment
  classifications defined in the assessment artifact.
- Identify blocking gaps that prevent a safe cold takeover.
- Assess stale-`CURRENT.md` detection and recovery separately.
- Assess active-work discovery, including merged-branch, closed-task,
  multiple-candidate, and no-active-task cases.
- Assess sole-next-action recovery, validation, and arbitration.
- Assess merge-authority verification and its separation from external
  point-in-time GitHub state.
- Assess takeover success-criteria coverage.
- Assess cold-takeover-drill requirements without performing a drill.
- Recommend later bounded staging without canonically selecting it.

### A-stage non-goals

- No final Architect Takeover Protocol.
- No canonical cold-start checklist, takeover runbook, or stale-CURRENT
  recovery algorithm.
- No cold takeover drill execution or drill instructions.
- No new or modified decision records; the count remains 35.
- No merge-authority enforcement tooling, workflow, or branch-protection
  change.
- No DOCARCH-004B, DOCARCH-004C, DOCARCH-005, or AGENT-004 artifacts.
- No canonical IDs for unnamed future work.

### Required reviewers for A

- Product Architect — confirms assessment authority boundaries, gap
  classifications, staging evaluation, and follow-up decision list.
- Architecture Reviewer — confirms authority separation, repository-evidence
  fidelity, and the runtime-versus-authority boundary.
- Documentation consistency review — confirms assessment, task, handoff, and
  review artifacts agree with each other and with unchanged authority sources.
- Claude QA — verifies evidence, exact changed-path scope, counts, domain
  completeness, classification discipline, and closure conditions.
- Human-only merge — required by `BS-PROC-001`.

Gameplay/Product Reviewer: not required unless the assessment changes gameplay
or roadmap scope; it changes neither.

Security/CI Reviewer: not required unless the PR modifies security, workflows,
branch protection, or CI; it modifies none of these. Point-in-time GitHub
observations in the assessment are read-only evidence.

### DOCARCH-004A closure condition

DOCARCH-004A closes only after:

- the readiness assessment is implemented;
- the independent conformance review is completed;
- Product Architect approval evidence is recorded;
- Claude QA evidence is recorded;
- all required checks pass on the final pull-request head;
- a human merges the A-stage pull request.

## Program continuation after A

DOCARCH-004 itself remains open after the A-stage merge.

After A merges:

- the Product Architect resolves the follow-up staging (single stage versus
  separate authoring and validation stages) and the other section 17
  follow-up decisions recorded in the assessment;
- protocol implementation begins through a new bounded stage under a
  Product Architect-approved scope;
- cold takeover validation remains required before DOCARCH-004 closes.

No canonical DOCARCH-004B/DOCARCH-004C structure exists until the Product
Architect approves the readiness recommendation. DOCARCH-005 remains reserved
after DOCARCH-004.
