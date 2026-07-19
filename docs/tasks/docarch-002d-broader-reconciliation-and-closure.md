# DOCARCH-002D — Broader Reconciliation and Final DOCARCH-002 Closure

Owner: `Product Architect`

Merge authority: `Human only`

## Purpose

Reconcile active project documentation with the canonical decision registry
after completion of DOCARCH-002C, without changing runtime behavior or silently
inventing architectural or product intent.

## Authority

- Accepted decisions are canonical in their domains.
- `PROJECT_CONTEXT.md` is transitional.
- Observed implementation is evidence, not accepted architecture.
- Historical review/task evidence remains immutable.
- Only Product Architect may approve accepted decision semantics.

## Stage split

### DOCARCH-002D1 — Status and Authority Reconciliation

Completed and merged via PR #44.

Scope:

- decision-index status;
- decision README status;
- CURRENT handoff state;
- D-stage task and D1 review artifact.

No decision records.

### DOCARCH-002D2 — Approved Mechanics Decision Migration

Active in this PR.

Creates exactly:

- `BS-MECH-020`
- `BS-MECH-023`
- `BS-MECH-025`
- `BS-MECH-026`
- `BS-MECH-027`

The five records are created in this PR. The accepted count becomes 35.

Exact dependencies:

- `BS-MECH-020` -> `BS-MECH-019`
- `BS-MECH-023` -> `BS-MECH-021`, `BS-MECH-022`, `BS-MECH-026`
- `BS-MECH-025` -> `BS-MECH-024`
- `BS-MECH-026` -> `BS-MECH-028`
- `BS-MECH-027` -> `BS-MECH-026`

D2 changes no runtime behavior or balance constants and makes no changes to
architecture documents, design documents, or `PROJECT_CONTEXT.md`.

The Product Architect-approved meanings are recorded below.

### DOCARCH-002D3 — Context, Architecture and Design Reconciliation

Pending after D2.

Scope:

- reduce root `PROJECT_CONTEXT.md` to durable entrypoint/summary;
- reconcile stale architecture documents;
- mark `balance-v0.1.md` historical/non-authoritative;
- reconcile `mvp-game-design.md` to accepted mechanics;
- close DOCARCH-002;
- make DOCARCH-003 the sole next safe action.

## Approved D2 mechanics

### BS-MECH-020

- owner-relative signed sector-control meter;
- maximum +100 for current owner;
- enemy pressure decreases it;
- capture only at -50;
- -49 remains current-owner territory;
- zero does not switch ownership;
- after capture the new-owner-relative value is +50;
- consolidation to +100 uses the same mechanic;
- no separate automatic consolidation timer.

### BS-MECH-023

- new outpost owner starts with exactly 4/6 governed sectors;
- shield is active;
- former owner must retake at least two sectors to reach 2/6 and disable it;
- selection of the specific four sectors is not decided.

### BS-MECH-025

- sector capture itself does not restore turrets;
- restoration is eligible only when the responsible outpost belongs to the same faction;
- automatic repair also requires the outpost to be undamaged and sufficiently resourced;
- repair speed and cost remain balance parameters.

### BS-MECH-026

- outpost capture occurs at zero structural HP;
- ownership switches immediately;
- no separate capture meter or additional threshold.

### BS-MECH-027

- captured outpost does not reset to full condition;
- transfers with partial HP and partial resources;
- remains vulnerable and undersupplied;
- exact HP percentage, resource retention/burn formula, and emergency reserve are not established;
- old fixed claims such as 50% HP, complete burn, or mandatory reserve are not canonical.

## Document roles

- `PROJECT_CONTEXT.md` becomes a reduced durable entrypoint/summary in D3.
- `packages/shared` remains current canonical broad runtime-contract owner.
- `packages/protocol` is an active transitional public compatibility boundary exposing/re-exporting public contracts while depending on shared.
- shared must not depend on protocol.
- `balance-v0.1.md` is a historical non-authoritative baseline.
- `mvp-game-design.md` remains an active summary and must be reconciled in D3.

## Permanent deferrals

- TestBattleRoom / SEC-006 -> dedicated security task.
- Branch protection / possible CI-004 -> dedicated CI task.
- AGENT-004 and detailed portability -> DOCARCH-005.

## Forbidden scope

No:

- runtime changes;
- balance constant changes;
- package/dependency changes;
- workflow/script changes;
- GitHub-setting changes;
- AGENTS or CLAUDE changes;
- historical evidence rewriting.

## Required reviewers by substage

D1:

- Product Architect
- Architecture Reviewer
- Documentation consistency review
- Claude QA
- human-only merge

D2:

- Product Architect
- Gameplay/Product Reviewer
- Documentation consistency review
- Claude QA
- human-only merge

D3:

- Product Architect
- Architecture Reviewer
- Gameplay/Product Reviewer
- Documentation consistency review
- Claude QA
- human-only merge

Security/CI Reviewer is not required unless scope expands into CI/security
semantics or `.github` files.

For D1, Product Architect approval confirms status and authority semantics;
Architecture Reviewer confirms the authority boundary; documentation consistency
review confirms registry, task, and handoff alignment; and Claude QA verifies
the stated conformance evidence. Network, Security/CI, Gameplay/Product, and
Visual reviewers are not required for D1 because it changes no runtime,
protocol, security/CI semantics, gameplay, or presentation.

For D2, Product Architect approval confirms the accepted decision semantics;
Gameplay/Product Reviewer confirms mechanics fidelity; documentation
consistency review confirms record, registry, task, and handoff alignment; and
Claude QA verifies the migration evidence. Architecture, Network, Security/CI,
and Visual reviewers are not required because D2 changes no architecture,
protocol, security/CI semantics, runtime, balance constants, or presentation.

## Final closure condition

DOCARCH-002 closes only after:

- D1, D2, and D3 are merged;
- five D2 records are accepted and indexed;
- accepted count is 35;
- `PROJECT_CONTEXT` and active architecture/design docs are reconciled;
- no unresolved stale claim is silently retained;
- DOCARCH-003 becomes the sole next safe action.
