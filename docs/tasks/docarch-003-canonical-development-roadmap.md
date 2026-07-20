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
- The Product Architect decisions recorded in
  `docs/roadmap/DOCARCH-003_READINESS_BASELINE.md` are roadmap-scope authority,
  not accepted decision records.
- DOCARCH-003 changes no runtime, package, dependency, architecture, design,
  workflow, script, test, balance value, or GitHub setting.

## DOCARCH-003A — Readiness Baseline and Roadmap Scope Lock

Completed and merged via PR #47.

A established:

- the point-in-time readiness baseline;
- the Product Architect MVP and vertical-slice scope lock;
- the exact DOCARCH-003B file scope;
- DOCARCH-004 and DOCARCH-005 reserved scopes;
- the corrected post-DOCARCH-002 handoff;
- the A-stage review evidence.

DOCARCH-003A created no decision record and changed no runtime behavior.

## DOCARCH-003B — Canonical Development Roadmap

Active as the final DOCARCH-003 roadmap candidate.

Exact B-stage file scope:

Create:

- `docs/roadmap/CANONICAL_DEVELOPMENT_ROADMAP.md`;
- `docs/reviews/docarch-003b-canonical-development-roadmap-review.md`.

Modify:

- `docs/tasks/docarch-003-canonical-development-roadmap.md`;
- `docs/handoffs/CURRENT.md`;
- `PROJECT_CONTEXT.md`.

The exact changed-path count is 5. DOCARCH-003B creates no decision record and
changes no runtime, architecture, design, workflow, package, dependency,
script, test, balance value, or GitHub setting.

## Canonical roadmap contents

The B-stage roadmap defines:

- the evidence-based current baseline by reference to the A-stage baseline;
- seven ordered delivery waves and their dependencies;
- the approved MVP boundary;
- the minimum credible campaign vertical slice;
- consolidated unresolved decision gates;
- per-wave validation requirements and completion criteria;
- cross-cutting testing, security, CI/merge-governance, persistence,
  documentation/authority, and balance tracks;
- roadmap delivery-status semantics;
- dedicated deferred work and post-MVP domains;
- the DOCARCH-004 next-program boundary and DOCARCH-005 reservation.

The minimum credible campaign vertical slice contains one outpost with exactly
six governed sectors, accepted shield thresholds, the 4/6 post-capture state,
relevant accepted sector/outpost mechanics, minimum server-side creep
participation required by `BS-MECH-019`, turret destruction/restoration,
production outpost-respawn integration, accepted ship control/switching,
persistence, reconnect, room-level tests, and minimum client visibility.

The roadmap does not select storage/database technology, deployment topology,
capture rates, player/creep weights, creep participation algorithms, the four
retained sectors, turret repair cost/speed, resource sufficiency, post-capture
HP/resource formulas, or post-MVP mechanics. Those remain explicit gates.

## Validation criteria

Before B is ready for human merge, evidence must confirm:

- exactly seven waves in the approved order;
- Wave 1 is `READY`, not `ACTIVE` or `COMPLETE`;
- Waves 2–6 are `NOT STARTED` or `DECISION GATED` as appropriate;
- Wave 7 is `DEFERRED`;
- every wave includes purpose, entry prerequisites, included systems, explicit
  exclusions, governing accepted decisions, required decision gates, expected
  outputs, validation requirements, completion criteria, major risks, and
  unlocks;
- the MVP includes persistence, minimum identity/session, reconnect,
  territorial core, one outpost with exactly six governed sectors, minimum
  creep participation, outpost/infrastructure, required client/operations
  surface, and stabilization;
- full economy, full logistics, mining/resource production, portals, advanced
  creep AI, and broad post-MVP systems remain outside MVP;
- unresolved values and technology choices remain gates;
- accepted decision meanings, server authority, shared/protocol direction, and
  prototype boundaries are preserved;
- `PROJECT_CONTEXT.md` links rather than duplicates the roadmap;
- `CURRENT.md` contains exactly one next safe action;
- the registry remains at 35 accepted decisions with category counts
  18/5/7/4/1;
- exactly the five authorized paths changed and no forbidden path changed.

No dependency installation, build, typecheck, test, runtime server, deployment,
or migration is run for this documentation-only task.

## Reviewer routing

Required for DOCARCH-003B:

- **Product Architect** — confirms roadmap authority, MVP boundary, decision
  gates, completion criteria, and follow-on program ordering.
- **Architecture Reviewer** — confirms server authority, dependency order,
  persistence sequencing, package-boundary wording, and unresolved architecture
  gates.
- **Gameplay/Product Reviewer** — confirms accepted mechanics fidelity, the
  one-outpost/six-sector slice, minimum creep participation, and exclusions.
- **Documentation consistency review** — confirms roadmap, context, task,
  handoff, review artifact, and decision references agree.
- **Claude QA** — verifies evidence, exact changed-path scope, counts, wave
  structure, gate preservation, and closure conditions.
- **Human-only merge** — required by `BS-PROC-001`; review and checks do not
  delegate merge authority.

Security/CI Reviewer is not required unless scope expands into security or CI
semantics. The roadmap sequences future security and CI work but changes no
security behavior, workflow, script, setting, or enforcement. Network Reviewer
is not required because no protocol, room, message, connection, or runtime
behavior changes. Visual Design Lead is not required because no UI, asset, VFX,
loader, or presentation behavior changes. Separate generic QA review is not
added because mandated Claude QA and documentation consistency review cover
this documentation-only scope; executable behavior is unchanged.

## Non-goals

- No runtime or test implementation.
- No accepted decision creation or modification.
- No architecture or design-document change.
- No security, CI, workflow, script, package, dependency, balance, or
  GitHub-setting change.
- No storage, identity, deployment, mechanics, algorithm, or numeric balance
  selection.
- No DOCARCH-004, DOCARCH-005, SEC-006, possible CI-004, or runtime-task
  implementation.
- No new canonical identifier for unnamed future work.

## DOCARCH-003 closure condition

DOCARCH-003 closes only after:

- DOCARCH-003B implementation is complete;
- required conformance review is complete;
- Product Architect approval evidence is recorded;
- Claude QA evidence is recorded;
- all required checks pass on the final head;
- a human merges the B-stage pull request.

Until human merge, the roadmap remains a candidate and DOCARCH-003 remains
open.

## Post-merge program order

After DOCARCH-003B human merge, DOCARCH-003 closes and DOCARCH-004 — Architect
Takeover Protocol becomes the next repository program for readiness assessment.
DOCARCH-005 — Role and Model Portability remains reserved after DOCARCH-004.
Neither follow-on program is implemented here.
