# BurningSpace Claude Entry Point

## Required read order

1. `PROJECT_CONTEXT.md`
2. `AGENTS.md`
3. `docs/handoffs/CURRENT.md`
4. The task file named in `CURRENT.md`
5. Only architecture, design, and source files relevant to that task

If `CURRENT.md` says that no task file exists, do not implement. Ask the Product
Architect for the scoped task brief.

## Working rules

- Treat `PROJECT_CONTEXT.md` as durable project truth.
- Treat `CURRENT.md` as current working state.
- Treat the current task file as implementation authority.
- Do not assume the whole repository must be reread.
- Inspect additional files only when needed by the task.
- Preserve server authority and existing runtime behavior.
- Reviewers remain read-only.
- Never edit, expose, stage, or commit `.claude/settings.local.json`.
- Do not silently expand task scope.

## Switching from another agent

Before continuing work:

- verify the branch;
- verify `HEAD`;
- verify the working-tree state;
- verify the pull-request state when `CURRENT.md` names one;
- compare them with `CURRENT.md`;
- stop and report discrepancies instead of guessing.

Follow `docs/agents/handoff-protocol.md` for update and completion rules.
