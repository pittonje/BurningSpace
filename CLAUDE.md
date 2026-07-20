# BurningSpace Claude Entry Point

## Cold Product Architect takeover

Read `PROJECT_CONTEXT.md` first and then follow
`docs/agents/ARCHITECT_TAKEOVER_PROTOCOL.md`. That protocol owns the complete
cold-recovery order. Prior Claude sessions, memory, and chat history are not
required and are not authority.

## Normal bounded-task execution

With a fresh and verified handoff, read `PROJECT_CONTEXT.md`, `AGENTS.md`,
`docs/handoffs/CURRENT.md`, the task file named in `CURRENT.md`, and only the
architecture, design, and source files relevant to that task.

If `CURRENT.md` says that no task file exists, do not implement. Ask the Product
Architect for the scoped task brief.

## Working rules

- Treat `PROJECT_CONTEXT.md` as durable navigation and project summary,
  subordinate to governance and accepted decisions.
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
