# Project Context Usage

`PROJECT_CONTEXT.md` is the first project file future agents, reviewers, and
chat sessions should read. It is compact durable navigation and a project
summary, not independent authority or a substitute for current-state
verification.

It is not a task file. Task-specific scope, non-goals, and acceptance criteria remain in `docs/tasks/`.

Detailed rules remain in their dedicated locations:

- Architecture: `docs/architecture/`
- Design: `docs/design/`
- Agent behavior: `AGENTS.md` and `docs/agents/`

## Cold authority recovery

A cold Product Architect takeover follows
`docs/agents/ARCHITECT_TAKEOVER_PROTOCOL.md` after `PROJECT_CONTEXT.md`. This
file does not define an independent takeover order. Chat context is an optional
convenience and is never takeover authority.

## Normal bounded-task context

For a fresh, verified handoff, gather only the context needed by the active
bounded task: `AGENTS.md`, `docs/handoffs/CURRENT.md`, the task named there,
and relevant accepted decisions, architecture, design, review, or source
files. Expand reading when the task or a discovered conflict requires it; do
not reread the entire repository by default.

Codex should update `PROJECT_CONTEXT.md` when implemented work changes the stack, structure, architecture, package boundaries, accepted design baseline, agent workflow, or current PR status. Keep it concise; do not use it as a changelog.

Suggested instruction for a normal bounded-task session:

> Read PROJECT_CONTEXT.md first. Then read AGENTS.md, CURRENT.md, and the task
> named there. Verify the handoff, follow governance and accepted decisions,
> and do not act outside committed task scope.
