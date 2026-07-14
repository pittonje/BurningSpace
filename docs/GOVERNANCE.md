# BurningSpace Documentation Governance

## Purpose

This file defines authority rules for BurningSpace repository documentation so the Product Architect role can be transferred without relying on hidden chat context. It identifies which documents may establish project truth, how conflicts are resolved, and how accepted decisions remain distinguishable from tasks, observations, reviews, and history.

## Authority hierarchy

Repository documentation uses these layers in descending priority:

1. Governance rules
2. Accepted decisions
3. Normative architecture and design documents
4. Machine-readable contracts, when later introduced
5. Operational handoff and current-state documents
6. Task definitions
7. Reviews and verification evidence
8. Historical and archive documents
9. Generated indexes

Higher-authority content wins when two documents conflict. Accepted decisions override every lower layer, but they remain subject to governance rules. A lower layer may report, implement, verify, or summarize a higher layer; it may not silently change it.

Generated indexes are derived navigation aids. They are never canonical and cannot establish authority independently of their source documents.

## Conflict rules

- A newer accepted decision supersedes an older accepted decision only when the records contain explicit `supersedes` and `superseded_by` links.
- Operational documents report current state and never override accepted decisions.
- Task documents authorize bounded work but cannot create accepted decisions by accident.
- Review and verification evidence can confirm facts but cannot create accepted decisions by accident.
- Observed implementation is evidence of repository behavior, not automatically accepted architecture or design.
- Historical and archive documents preserve context but cannot override current authority.
- A conflict that cannot be resolved from explicit authority and supersession links must be returned to the Product Architect; implementers and reviewers must not guess.

## Decision status vocabulary

Decision records use exactly these statuses:

- `draft`: incomplete working material with no approval claim.
- `proposed`: complete enough for Product Architect review but not accepted.
- `accepted`: explicitly approved by the Product Architect and authoritative within its scope.
- `superseded`: replaced by another accepted decision identified by an explicit link.
- `rejected`: considered and explicitly declined; it is not authority.
- `unknown`: an ID or decision is known to exist, but its content or status evidence is incomplete.

Only the Product Architect can approve the `accepted` status. Implementers and preparation agents may create `draft` or `proposed` records but cannot self-approve them. `unknown` is valid when an identifier or decision is known but reliable content is incomplete. `superseded` requires a link to the replacement decision. Every accepted decision requires a stable ID. After DOCARCH-002, accepted decisions may not exist only in chat history.

## Decision ID policy

Decision IDs are stable and domain-scoped. The namespace should identify the domain or originating task rather than force every decision into one global sequence.

Examples of valid identifier forms are:

- `BS-MECH-013` for BurningSpace mechanics decisions;
- `GAME-001-D1` for task-local decisions already introduced by a task;
- `DOCARCH-001-D1` for documentation-architecture decisions;
- `DEC-NNN` only for general decisions that do not fit a domain-specific namespace.

DOCARCH-001 defines this policy but does not migrate, rename, normalize, or create actual decision instance files. DOCARCH-002 will decide how to preserve legacy IDs.

## Document classes

### Normative

- Purpose: define approved governance, accepted decisions, architecture, design, or machine-readable contracts.
- Authority level: layers 1 through 4; the specific normative artifact type determines its priority within those layers.
- Allowed content: explicit rules, accepted choices, required boundaries, and approved specifications.
- Forbidden content: unmarked speculation, transient execution state, and claims of acceptance without Product Architect approval.
- Update trigger: an approved governance change, accepted decision, or explicitly authorized normative-document task.
- Owner role: Product Architect, with implementation by an authorized writer when applicable.
- Current examples: `docs/GOVERNANCE.md`; architecture and design documents are normative only where their content is explicitly accepted. Decision records will become normative when marked `accepted` after DOCARCH-002.

### Operational

- Purpose: report the current branch, task, verification state, blockers, and next safe action.
- Authority level: layer 5.
- Allowed content: current repository and pull-request state, active scope, validation summaries, and one next safe action.
- Forbidden content: new architecture, accepted decisions, roadmap changes, or overrides of higher-authority documents.
- Update trigger: task start, checkpoint, handoff, pull-request state change, completion, or merge.
- Owner role: current implementer or handoff owner.
- Current example: `docs/handoffs/CURRENT.md`.

### Task

- Purpose: authorize one bounded outcome and define its scope, non-goals, acceptance criteria, validation, and routing.
- Authority level: layer 6.
- Allowed content: implementation requirements, exact file boundaries, tests, risks, and reviewer selection.
- Forbidden content: accidental accepted decisions, implicit scope expansion, or changes that contradict higher authority.
- Update trigger: Product Architect task definition or an explicitly accepted preparation packet.
- Owner role: Product Architect for authority; Preparation Agent may prepare and Codex may implement only after acceptance.
- Current example: `docs/tasks/**`.

### Evidence

- Purpose: record observations, review findings, validation, and verification results.
- Authority level: layer 7.
- Allowed content: reproducible evidence, reviewed commits, findings, outcomes, and limitations.
- Forbidden content: creating accepted decisions, silently changing requirements, or claiming implementation authority.
- Update trigger: a completed review, test, audit, or live verification event.
- Owner role: the named reviewer, verifier, or evidence author.
- Current example: `docs/reviews/**`.

### Historical

- Purpose: preserve superseded, completed, or archived context for traceability.
- Authority level: layer 8.
- Allowed content: dated historical state and links to the authority that replaced it.
- Forbidden content: presenting old state as current or overriding active authority.
- Update trigger: explicit archival or supersession work.
- Owner role: Product Architect or Documentation Keeper under an accepted task.
- Current examples: superseded task and review prose retained for traceability; no dedicated canonical archive is established by DOCARCH-001.

### Generated

- Purpose: provide derived navigation, indexes, or reports from canonical sources.
- Authority level: layer 9.
- Allowed content: reproducible summaries and links back to source documents.
- Forbidden content: unique decisions, requirements, or authority unavailable in canonical sources.
- Update trigger: regeneration from canonical inputs.
- Owner role: the generating process and the role accountable for its source data.
- Current example: no active generated index is canonical.

### Entrypoint

- Purpose: direct a human or agent to the canonical reading order and applicable instructions.
- Authority level: no independent authority beyond the canonical sources it references.
- Allowed content: concise navigation, required reading, safety reminders, and adapter-facing instructions that point to canonical governance.
- Forbidden content: conflicting authority, hidden decisions, or rules that contradict canonical governance.
- Update trigger: canonical entrypoint or reading-order changes.
- Owner role: Product Architect for instruction policy; authorized implementer for scoped updates.
- Current examples: `AGENTS.md` and `CLAUDE.md`. `CLAUDE.md` is an entrypoint document with adapter-facing instructions, not a simple adapter or configuration document; it must point to canonical governance and must not define conflicting authority.

### Adapter/config

- Purpose: adapt canonical instructions to a vendor, tool, agent, or configuration surface.
- Authority level: no independent documentation authority.
- Allowed content: tool-specific mappings, prompts, permissions, and configuration that implement canonical rules.
- Forbidden content: accepted decisions, conflicting governance, or silent expansion of an agent's authority.
- Update trigger: an accepted adapter or tool-configuration task.
- Owner role: the authorized tool or workflow maintainer.
- Current example: `.claude/agents/**` are vendor/tool adapters.

## PROJECT_CONTEXT.md transition rule

`PROJECT_CONTEXT.md` is currently a transitional compact project context and summary. Until DOCARCH-002 and DOCARCH-003 split accepted decisions and roadmap into canonical sources, it remains operative for topics not yet migrated.

After that migration, `PROJECT_CONTEXT.md` summarizes and links to canonical sources. It must not override accepted decisions.

## Product Architect transfer rule

A future Product Architect must be able to determine project truth from repository documents alone. Chat history may provide useful context, but after the DOCARCH migration it must not be required to determine accepted architecture.

When repository evidence is incomplete or contradictory, the incoming Product Architect records the uncertainty and resolves it through an explicit decision or scoped task rather than relying on undocumented memory.

## Roadmap preservation rule

Roadmap and project direction may change only through accepted decisions, Product-Architect-approved roadmap documents, or explicit follow-up tasks. DOCARCH-001 changes no roadmap content.

## Migration order

- DOCARCH-000 reconciled repository truth.
- DOCARCH-001 creates documentation authority rules.
- DOCARCH-002 performs Decision Inventory and Recovery.
- DOCARCH-003 and DOCARCH-004 will handle roadmap and takeover work as separately approved.
- Later tasks may add a manifest, linting, generated indexes, and enforcement.
