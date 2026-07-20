# DOCARCH-003 — Canonical Development Roadmap

Owner: `Product Architect`

Merge authority: `Human only`

## Purpose

Create an evidence-based canonical development roadmap without changing
accepted decision semantics or runtime behavior. Roadmap-blocking unknowns must
remain explicit future decision gates or dedicated tasks.

## Authority and boundaries

- Accepted decisions remain canonical in their domains.
- DOCARCH-003 creates no new accepted decision records; the count remains 35.
- Observed implementation is evidence, not immutable architecture or mechanics
  authority.
- DOCARCH-003 does not modify runtime, packages, dependencies, architecture,
  design, workflows, scripts, tests, or GitHub settings.
- The Product Architect decisions recorded in
  `docs/roadmap/DOCARCH-003_READINESS_BASELINE.md` are roadmap-scope authority,
  not accepted decision records.

## DOCARCH-003A — Readiness Baseline and Roadmap Scope Lock

Active in this PR.

Scope:

- readiness baseline;
- Product Architect roadmap decisions;
- exact DOCARCH-003B file scope;
- DOCARCH-004 and DOCARCH-005 reserved scope;
- corrected `CURRENT.md`;
- A-stage review artifact.

No canonical roadmap implementation. No decision records. No runtime changes.

Exact A-stage file scope:

- create `docs/roadmap/DOCARCH-003_READINESS_BASELINE.md`;
- create `docs/tasks/docarch-003-canonical-development-roadmap.md`;
- create `docs/reviews/docarch-003a-readiness-baseline-and-scope-review.md`;
- modify `docs/handoffs/CURRENT.md`.

## DOCARCH-003B — Canonical Development Roadmap

Pending after DOCARCH-003A merges.

Expected create:

- `docs/roadmap/CANONICAL_DEVELOPMENT_ROADMAP.md`;
- `docs/reviews/docarch-003b-canonical-development-roadmap-review.md`.

Expected modify:

- `docs/tasks/docarch-003-canonical-development-roadmap.md`;
- `docs/handoffs/CURRENT.md`;
- `PROJECT_CONTEXT.md`.

The provisional changed-path count is 5. DOCARCH-003B makes no decision,
runtime, architecture, design, workflow, package, or dependency change.

The canonical roadmap must contain:

- an evidence-based current baseline;
- delivery waves and dependency order;
- the approved MVP boundary;
- the smallest credible campaign vertical slice;
- explicit decision gates;
- dedicated deferred tasks;
- validation requirements;
- completion criteria;
- DOCARCH-004 and DOCARCH-005 reserved scopes.

The smallest credible campaign vertical slice must include one outpost with
exactly six governed sectors, accepted shield thresholds, the 4/6 post-capture
state, relevant accepted sector/outpost mechanics, integrated outpost respawn,
required ship control/switching, and minimum server-side creep participation
needed by `BS-MECH-019`. It must not silently expand into full economy,
logistics, mining/resource production, portals, or advanced creep AI.

## Reserved follow-on scope

DOCARCH-004 is reserved for cold-start sequence, authority recovery, stale
`CURRENT` recovery, active-task discovery, sole-next-action recovery, forbidden
actions, merge authority, takeover success criteria, and a cold takeover drill.

DOCARCH-005 is reserved for vendor/model-independent roles, minimum role
capabilities, implementer/reviewer separation, standardized evidence, fallback
routing, model replacement, prompt/adapter portability, and AGENT-004 recovery
or creation.

Neither follow-on task is implemented by DOCARCH-003.

## Reviewer routing

Required for both substages:

- **Product Architect** — confirms roadmap authority, MVP boundary, deferred
  gates, and substage scope.
- **Architecture Reviewer** — confirms authority separation, dependency order,
  package-boundary wording, and architecture-sensitive roadmap sequencing.
- **Gameplay/Product Reviewer** — confirms accepted mechanics fidelity, the
  one-outpost/six-governed-sector vertical slice, and minimum creep inclusion.
- **Documentation consistency review** — confirms alignment among baseline,
  task, roadmap or pending boundary, review artifact, context, and handoff.
- **Claude QA** — verifies evidence, exact changed-path scope, counts, and
  completion gates.
- **Human-only merge** — required by `BS-PROC-001` and is not delegated.

Security/CI Reviewer is not required unless scope expands into security or CI
semantics. Network Reviewer is not required because these substages change no
protocol, room, message, or connection behavior. Visual Design Lead is not
required because no UI, asset, VFX, loader, or presentation behavior changes.
Separate generic QA review is not added because the mandated Claude QA and
documentation consistency reviews cover this documentation-only evidence and
scope-lock change; executable behavior is unchanged.

## Non-goals

- No runtime or test implementation.
- No accepted decision creation or modification.
- No architecture or design-document change in A.
- No security, CI, workflow, script, package, dependency, or GitHub-setting
  change.
- No DOCARCH-004, DOCARCH-005, SEC-006, CI-004, or runtime-task
  implementation.

## Completion condition

DOCARCH-003 closes only after DOCARCH-003B completes required review, evidence,
final-head checks, and human merge.
