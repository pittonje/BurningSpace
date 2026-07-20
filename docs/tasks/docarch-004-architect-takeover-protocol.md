# DOCARCH-004 - Architect Takeover Protocol

Owner: `Product Architect`

Merge authority: `Human only`

## Purpose

Establish, through bounded stages, how a newly assigned Product Architect
recovers BurningSpace authority, current program state, active work, exact
permitted scope, exactly one safe next action, unresolved decision gates,
forbidden actions, merge authority, and review and evidence requirements from
repository truth alone, without chat history.

## Program state

- DOCARCH-000 through DOCARCH-003 are complete.
- DOCARCH-004A completed and merged through PR #49 at merge commit
  `858d14568f4dd6f040255df1b925046028237377`.
- The Product Architect accepted separate B and C stages through the merged
  DOCARCH-004A review evidence.
- DOCARCH-004 remains open.
- DOCARCH-004B is active and authors the protocol candidate.
- DOCARCH-004C is reserved after B and independently validates the merged
  protocol; it is not active in B.
- The accepted decision count remains 35 (18 `BS-MECH`, 5 `GAME-001`,
  7 `BS-ARCH`, 4 `BS-PROC`, 1 `CI`).
- DOCARCH-004B introduces no accepted decision record and no runtime change.
- DOCARCH-005 - Role and Model Portability remains reserved after
  DOCARCH-004.

## DOCARCH-004A - Readiness Assessment

Completed and merged through PR #49. A established the readiness baseline,
identified four blocking gaps, and recorded Product Architect approval for
separate protocol-authoring and independent-validation stages. Its assessment
and review evidence remain unchanged.

## DOCARCH-004B - Architect Takeover Protocol Authoring

Active bounded documentation stage.

### Exact B-stage file scope

Create exactly two files:

- `docs/agents/ARCHITECT_TAKEOVER_PROTOCOL.md`;
- `docs/reviews/docarch-004b-architect-takeover-protocol-review.md`.

Modify exactly seven files:

- `PROJECT_CONTEXT.md`;
- `AGENTS.md`;
- `CLAUDE.md`;
- `docs/agents/context-usage.md`;
- `docs/agents/handoff-protocol.md`;
- `docs/tasks/docarch-004-architect-takeover-protocol.md`;
- `docs/handoffs/CURRENT.md`.

The exact changed-path count is nine. No other path may change.

### B-stage objectives

- Establish the canonical cold-start entrypoint.
- Reconcile reading-order adapters.
- Define authority and conflict recovery.
- Define read-only repository preflight.
- Define `CURRENT.md` freshness rules.
- Define deterministic stale-`CURRENT.md` reconciliation.
- Define active-work and exact-scope recovery.
- Define sole-next-action arbitration.
- Define stop conditions and forbidden actions.
- Define merge-authority and evidence recovery.
- Define the mandatory takeover report.
- Define testable takeover success criteria.
- Define the DOCARCH-004C validation contract.

### B-stage non-goals

- No independent cold takeover drill.
- No DOCARCH-004C task, review, instructions, result, or simulated evidence.
- No new or modified accepted decision.
- No gameplay, runtime, architecture, design, package, workflow, script, test,
  dependency, repository-protection, or CI change.
- No model or vendor selection and no DOCARCH-005 implementation.

### Reviewer routing

Required:

- Product Architect - confirms protocol authority, recovery rules, success
  criteria, and stage boundaries.
- Architecture Reviewer - confirms authority separation and the
  implementation-evidence boundary.
- Documentation consistency review - confirms protocol, adapters, task,
  handoff, and unchanged authority sources agree.
- Claude QA - verifies exact scope, counts, deterministic recovery coverage,
  evidence requirements, and closure conditions.
- Human-only merge - required by `BS-PROC-001`.

Gameplay/Product Reviewer is not required unless protocol work changes
gameplay or roadmap scope; B changes neither.

Security/CI Reviewer is not required unless workflow, security, repository
protection, or CI scope expands; B changes none of those areas.

### DOCARCH-004B closure condition

DOCARCH-004B closes only after:

- the protocol candidate is authored;
- adapter reading orders are reconciled;
- independent conformance review is completed;
- Product Architect approval evidence is recorded;
- Claude QA evidence is recorded;
- all required checks pass on the final pull-request head;
- a human merges the B-stage pull request.

The protocol remains a candidate until human merge.

## Program continuation after B

After B human merge:

- the protocol becomes the active canonical operational takeover procedure;
- DOCARCH-004 remains open;
- DOCARCH-004C becomes the next bounded stage;
- an independent cold takeover validation must occur before DOCARCH-004
  closes.

B authors the protocol and does not perform the drill. C independently
validates the merged protocol. DOCARCH-005 remains reserved after DOCARCH-004.
