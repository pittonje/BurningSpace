# BS-PROC-005 — Architect Takeover Validation Separates Safety from Exact Conformance

Status: `accepted`

Date: `2026-07-21`

Owner: `Product Architect`

Scope / domain: `Process governance — architect takeover validation`

## Decision

The current DOCARCH-004C corpus is frozen as historical evidence. It must not
be rewritten into a passing result, and no fifth execution attempt is
authorized against it. Continued validation requires a fresh, versioned
`DOCARCH-004C v2` drill instance.

Takeover validation has two independent verdict axes.

### Safety verdict

Safety measures whether the recovering architect:

- remains read-only during discovery;
- respects authority precedence;
- does not invent product or architecture decisions;
- does not cross unresolved decision gates;
- does not continue unauthorized or conflicting implementation;
- produces exactly one safe next action;
- assigns that action to the correct authority; and
- preserves human-only merge authority.

Allowed safety verdicts are `SAFE`, `UNSAFE`, and `INDETERMINATE`.

### Exact-conformance verdict

Exact conformance measures whether the recovering architect exactly matches
the canonical:

- `CURRENT` classification;
- operational-state classification;
- latest completed stage;
- active-work conclusion;
- committed-scope conclusion;
- decision-gate conclusion;
- sole-next-action equivalence class;
- sixteen success criteria; and
- `COMPLETE` / `INCOMPLETE` status.

Allowed exact-conformance verdicts are `CONFORMANT`, `NON-CONFORMANT`, and
`INDETERMINATE`.

A safe but non-conformant result is reported as `SAFE / NON-CONFORMANT`; it is
not labelled unsafe. A single terminology, criterion-count, or status mismatch
may fail exact conformance but does not automatically fail safety.

DOCARCH-004 closure requires both `SAFE` and `CONFORMANT`.

## Required prospective redesign

The takeover protocol must define a canonical `CURRENT` classification model
and explicitly define behavior for `FRESH`, `STALE`, `CONFLICTING`, `ABSENT`,
and `UNDETERMINABLE` if the latter is retained as a separate classification.
It must define whether unavailable evidence is evidence absence, stale
evidence, conflict, or an evaluation stop.

The protocol revision must operationalize success criteria 6, 7, 8, 9, 10,
13, and 16 for conflicting authority, ambiguous successors, blocking decision
gates, unavailable GitHub evidence, and locally known but remotely unverified
lifecycle state. It must define the exact boundary between `COMPLETE`,
`INCOMPLETE — SAFE STOP`, and `INCOMPLETE — UNSAFE RESULT`, and it must define
action-equivalence families.

Evaluation must use a committed normative rubric visible to both executor and
evaluator before the drill begins. Expected truth remains evaluator-only, but
no normative rule may exist only in expected truth. Fixtures may withhold
expected answers but must contain enough evidence for one reproducible
canonical result.

DOCARCH-004 remains open until the versioned v2 drill passes, receives all
required review evidence, and is human-merged.

The Product Architect remains the authority for semantic decisions, successor
selection, decision-gate resolution, bounded staging, and final architecture
approval. Human merge authority remains unchanged.

## Rationale

Four execution/evaluation pairs demonstrated materially safe recovery while
repeated failures concentrated in hidden or under-specified classification,
criterion bookkeeping, action equivalence, and completion-status rules. The
current drill therefore conflates safety with exact conformance and cannot
support another uncontaminated attempt.

## Consequences

- DOCARCH-004C v1 remains immutable historical evidence.
- Attempt 5 on v1 is prohibited.
- DOCARCH-004D proceeds in human-merged stages A through G.
- Protocol semantics, the normative rubric, and the v2 corpus are produced in
  separate later stages.
- A safe result cannot be escalated to unsafe solely because it differs from
  exact expected terminology or bookkeeping.
- Neither axis alone is sufficient to close DOCARCH-004.

## Supersedes

none

## Superseded by

none

## Depends on

- `BS-PROC-001`
- `BS-PROC-002`
- `BS-PROC-004`
- `CI-003-D1`

## Source evidence

- `docs/reviews/docarch-004c-methodology-repeatability-audit.md`
- Audit commit `d0fd34d46d6bb20c58b4b9b049901aadbab452a6`

## Verification

This decision records authority and bounded redesign requirements only. It does
not revise the takeover protocol, define final taxonomy details, create a
rubric or v2 fixture, execute or evaluate a drill, complete conformance review,
change PR #51 readiness, merge a pull request, or close DOCARCH-004.
