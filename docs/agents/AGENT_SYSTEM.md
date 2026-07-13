# BurningSpace Agent System

## Purpose

This document defines how specialized agents collaborate on one coherent BurningSpace repository. The system reduces repeated repository discovery, routes review by risk, and keeps scope and merge authority explicit.

## Core ownership rule

**Codex is the only agent allowed to modify production code.**

Other agents may prepare implementation guidance, design test matrices, review changes, validate evidence, propose documentation corrections, or record findings. They do not create competing production implementations.

## Roles

| Role | Ownership | Boundary |
|---|---|---|
| Product Architect | Goals, scope, accepted decisions, architecture authorization, and permission to merge | Does not delegate scope expansion implicitly |
| Preparation Agent | A concise Implementation Packet based on the smallest relevant repository slice | Read-only; does not implement or approve its own packet |
| Codex | Accepted implementation, tests, implementation documentation, and accepted corrections | Sole production-code writer; works only within an accepted Task Definition |
| Test Architect | Test matrices, cases, expected outcomes, and coverage risks | Does not modify production code or replace deterministic execution |
| Documentation Keeper | Documentation-drift detection and exact proposed corrections | Does not modify production code or broaden the active task |
| Claude QA | Independent PR review, blockers, suggestions, and approval status | Read-only toward production code during ordinary review; does not merge |
| Specialist reviewer | Focused review for an identified risk domain | Invoked by risk; does not implement, expand scope, or merge |

Specialist roles may include Multiplayer Reviewer, API Guardian, Security/CI Reviewer, Performance Analyst, and Dependency Guardian. Their existence does not make them mandatory for every pull request.

## Work lifecycle

Product decision → Implementation Packet → Codex implementation → deterministic CI → risk-routed review → Codex corrections → human merge

The Product Architect accepts the Task Definition and any architecture decisions. The Implementation Packet makes that task implementation-ready but does not replace authorization.

## One-task ownership

Each active task has one scoped branch and one implementation owner. Codex must verify branch, worktree, base, and working-tree state before editing. Parallel tasks must use isolated worktrees and non-overlapping file ownership. A task must stop rather than overwrite another task's files.

## Read-only reviewer rule

Reviewers inspect evidence and report findings. They do not edit production code, create implementation commits, push branches, approve their own scope expansion, or merge pull requests. Accepted corrections return to Codex under the original scope or a newly accepted Task Definition.

## Branch and worktree isolation

- One task uses one branch.
- A worktree owned by another task or agent is not task input and must not be modified.
- Dirty, contradictory, or unexpectedly advanced state is a stop condition.
- Reset, clean, stash, destructive branch operations, amend, and force-push require explicit task authorization.

## Scope control

Only an accepted Task Definition authorizes implementation. An Implementation Packet may narrow files, symbols, tests, and commands, but cannot alter architecture, add dependencies, or expand goals. Review findings are triaged against the active scope; they do not silently become implementation requirements.

## Findings outside scope

Confirmed findings outside the active Task Definition are recorded in the technical-debt register or proposed as a future task. Recording a finding does not authorize an immediate fix. The Product Architect controls prioritization and task creation.

## Human authority

No agent merges pull requests. The Product Architect decides whether a pull request may be merged, and a human performs the merge after that decision. CI success and reviewer approval are evidence, not merge authority.

## Stop conditions

Agents must stop and report when:

- architecture is unresolved;
- scope must expand;
- a new dependency is required;
- another task owns the affected files;
- repository state is dirty or contradictory;
- a security boundary would be weakened.

The agent must preserve evidence, identify the blocked decision, and avoid speculative implementation while stopped.
