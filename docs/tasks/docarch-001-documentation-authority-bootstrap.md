# DOCARCH-001 — Documentation Authority Bootstrap

## Goal

Create the minimal documentation authority layer required to preserve BurningSpace architecture and roadmap continuity while making the Product Architect role transferable without hidden chat context.

## Strategic purpose

DOCARCH-001 defines how repository documentation becomes authoritative and makes DOCARCH-002 decision recovery safe. It prevents operational, task, review, historical, generated, entrypoint, or adapter prose from silently overriding accepted authority.

## Scope

- Define the documentation authority hierarchy and conflict rules.
- Define exact decision statuses and the domain-scoped stable ID policy.
- Define document classes, ownership, allowed content, and authority boundaries.
- Create an intentionally empty decision registry and placeholder-only template.
- Update the operational handoff and add one governance link to `AGENTS.md`.

## Non-goals

- No decisions are migrated, recovered, renamed, normalized, or instantiated.
- No roadmap content changes.
- No runtime architecture changes.
- No package-boundary changes.
- No model-routing changes.
- No CI, workflow, script, dependency, test, agent-adapter, or enforcement changes.
- No architecture manifest, generated index, lint rule, or bulk historical cleanup.

## Allowed files

- `docs/GOVERNANCE.md`
- `docs/decisions/README.md`
- `docs/decisions/DECISION_TEMPLATE.md`
- `docs/tasks/docarch-001-documentation-authority-bootstrap.md`
- `docs/handoffs/CURRENT.md`
- `AGENTS.md`

## Forbidden files

All files outside the six-path allowlist are forbidden. In particular, do not modify `CLAUDE.md`, `PROJECT_CONTEXT.md`, `docs/agents/**`, reviews, prior tasks, workflows, scripts, runtime applications or packages, manifests, dependencies, tests, or agent definitions.

Only `README.md` and `DECISION_TEMPLATE.md` may exist under `docs/decisions/` after DOCARCH-001. Decision instance files are forbidden.

## Required changes

1. Add `docs/GOVERNANCE.md` with the accepted authority hierarchy, conflict rules, decision vocabulary and ID policy, document classes, transition rules, transfer rule, roadmap preservation rule, and migration order.
2. Add an empty decision-registry README that points to governance and defers inventory and legacy-ID treatment to DOCARCH-002.
3. Add a placeholder-only decision template with the required metadata and sections.
4. Replace stale DOCARCH-000 operational state in `CURRENT.md` with DOCARCH-001 state and one next safe action.
5. Add exactly one `AGENTS.md` link to documentation governance.

DOCARCH-001 creates authority rules only. It does not migrate accepted decisions or change roadmap, runtime architecture, package boundaries, CI, or model routing.

## Acceptance criteria

- The authority hierarchy contains all nine accepted layers in priority order and states that higher authority wins.
- Conflict rules prevent tasks, operational documents, reviews, evidence, observations, history, and generated output from creating or overriding accepted authority.
- Decision statuses are exactly `draft`, `proposed`, `accepted`, `superseded`, `rejected`, and `unknown`; only the Product Architect may approve `accepted`.
- Decision IDs are stable and domain-scoped; `DEC-NNN` is not universal or preferred.
- `CLAUDE.md` is classified as an entrypoint with adapter-facing instructions; `.claude/agents/**` are vendor/tool adapters.
- `PROJECT_CONTEXT.md` is transitional and remains operative only for topics not yet migrated until DOCARCH-002/DOCARCH-003 complete the split.
- The decision registry contains only its README and template, with no decision instance files.
- `CURRENT.md` contains exactly one next safe action and does not name a speculative PR or merge commit.
- Exactly six authorized files change.

## Validation

Run:

```text
git diff --check
git status --short
git diff --name-only
git diff --stat
```

Verify the exact six-path allowlist, two-file decision directory, status vocabulary, Product Architect acceptance boundary, evidence-versus-design distinction, class assignments, transitional project-context rule, one next safe action, and forbidden-path exclusions.

Do not run dependency installation, tests, builds, typechecks, or runtime diagnostics for this documentation-only task.

## Risk and routing

- Runtime: none.
- Networking: none.
- Security: none.
- Protocol: none.
- Persistence: none.
- Performance: none.
- CI: none.
- Documentation: medium, because repository authority and architect handoff rules change.

Required reviewers:

- Product Architect, because only that role may accept the documentation authority model.
- Automatically routed Claude QA, because changes to `AGENTS.md` and `docs/handoffs/CURRENT.md` classify as `workflow_security` with `qa_required=true`.

Optional reviewer:

- Architecture Reviewer, if the Product Architect requests independent governance review. It is not required by default because no runtime, package-boundary, CI, or protocol architecture changes occur.

Skipped reviewers:

- Network Reviewer: no networking, synchronization, room, or protocol behavior changes.
- Security Reviewer: no permissions, secrets, trust boundaries, workflow implementation, or CI behavior changes.
- Gameplay Reviewer: no mechanics, balance, authority simulation, or campaign rules change.
- Visual Design Lead: no assets, UI, VFX, presentation, or loader paths change.

## Rollback

Revert the single DOCARCH-001 documentation commit. No runtime, dependency, workflow, data, or deployment rollback is required.

## Follow-up

The next task is DOCARCH-002 — Decision Inventory and Recovery. DOCARCH-002 is not active until separately prepared and accepted.
