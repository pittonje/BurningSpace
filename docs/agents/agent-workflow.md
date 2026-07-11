# Agent Workflow

## Roles

- ChatGPT / Product Architect: owns requirements, architecture intent, acceptance criteria, and resolves design conflicts.
- Codex / Primary Implementer: writes code and documentation, runs checks, and reports scope and risks.
- Claude reviewers: read-only architecture, network, security, QA, gameplay, and visual reviews by default.
- Visual Design Lead / Art Director: owns visual direction, consistency, briefs, and approval of visual output.
- Graphics Generation Agents: produce assets from approved briefs without editing gameplay code.
- VFX Agent: develops readable effects within the approved visual language.
- UI/UX Visual Agent: develops interface presentation and usability without assuming gameplay authority.

## Rules

- Use one branch per task and keep task scope explicit.
- Avoid overlapping writes; establish file ownership before parallel work.
- Codex is the primary code implementer.
- Claude reviewers do not edit files or commit unless explicitly assigned implementation work.
- Visual agents do not edit gameplay code.
- Reviewers return blockers, important suggestions, minor suggestions, and an approval status.
- Product Architect resolves design conflicts and requirement ambiguity.
- Preserve existing prototype files unless a task explicitly authorizes migration or removal.
- Run relevant build, type-check, and focused checks before handoff.

## Reviewer routing

- Select reviewers per task using `docs/agents/reviewer-routing.md`; not every reviewer runs on every PR.
- Every task declares required, recommended/optional, and skipped reviewers with a short applicability reason.
- Read-only reviewers ground findings in concrete repository evidence and name the reviewed commit.
- Reviewer reports identify domain blockers but do not authorize implementation outside the task scope.
- Product Architect resolves conflicts between reviewer domains; Codex remains the primary implementer.

## Handoffs

- Codex and Claude Code use the same `docs/handoffs/CURRENT.md` operational handoff.
- The outgoing implementer records exact branch, `HEAD`, working-tree, PR, validation, and next-action state.
- The incoming implementer verifies Git and PR state before editing and reports mismatches instead of guessing.
- Reviewer reports remain separate from implementation handoff state.
- A handoff records authorized work; it does not authorize scope expansion.
