# BurningSpace Artifact Contracts

## Purpose

Artifacts pass bounded context between roles without transferring architecture, implementation, or merge authority implicitly.

## Contracts

| Artifact | Owner | Purpose | Required fields | Intended maximum size | Allowed output location | Authorizes code changes? | May owner modify production code? |
|---|---|---|---|---|---|---|---|
| Task Definition | Product Architect | Authorize one outcome and its boundaries | ID, goal, accepted decisions, allowed and forbidden files, acceptance criteria, risks, stop conditions, merge rule | As short as completeness permits | `docs/tasks/` or an explicit Product Architect task brief | Yes, only after Product Architect acceptance | No; Codex remains the writer |
| Implementation Packet | Preparation Agent | Make an accepted task implementation-ready | Goal, Decision IDs, files to read/modify, symbols, required changes, test matrix, validation, forbidden changes, stop conditions, expected commits, final format | 150–250 lines | `docs/tasks/` or preparation output named by the task | No; it is advisory until accepted | No |
| Test Matrix | Test Architect | Define deterministic cases and expected outcomes | Scope, risks covered, cases, inputs/state, expected results, exclusions, commands | 100 lines | `docs/tasks/` or task-linked output | No | No |
| Codex Implementation Report | Codex | Hand off implementation evidence concisely | repository state, changes, validation, files, risks, blockers, PR state, next action | 50 lines when practical | Final task response or task-linked implementation note | No; it reports already authorized work | Yes, only while implementing an accepted task |
| QA Review | Claude QA | Independently evaluate acceptance, regressions, and scope | blockers, important suggestions, minor suggestions, approval status, evidence references | 150 lines unless blockers require evidence | PR comment or `docs/reviews/` when explicitly authorized | No | No |
| Specialist Review | Routed specialist | Evaluate one identified risk domain | domain, reviewed scope, findings by severity, evidence, residual risk, recommendation | 150 lines unless evidence requires more | PR comment or `docs/reviews/` when explicitly authorized | No | No |
| Documentation Drift Report | Documentation Keeper | Identify stale or contradictory documentation | source of truth, drifted path/section, exact mismatch, proposed correction, urgency | 100 lines | `docs/reviews/`, `docs/tasks/`, or task output when authorized | No | No |
| Technical Debt Entry | Finding author; priority owned by Product Architect | Preserve confirmed out-of-scope work | ID, status, priority, source task, area, evidence, risk, future task, dependencies, dates | 30 lines per entry | `docs/debt/TECHNICAL_DEBT.md` | No | No; a future accepted task is required |

## Authority rules

- Only an accepted Task Definition authorizes work.
- An Implementation Packet narrows execution but cannot change architecture or authorize itself.
- Test and review artifacts provide evidence; they do not transfer implementation authority.
- Review findings do not automatically expand the active pull request.
- Codex corrections require the finding to be accepted and remain within scope, otherwise a new Task Definition is required.
- The Codex Implementation Report stays concise and links to durable evidence instead of repeating project history.
- Technical-debt entries do not authorize immediate fixes.
- No artifact author may approve their own scope expansion.
- No artifact author may merge a pull request.
