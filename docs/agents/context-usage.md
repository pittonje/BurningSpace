# Project Context Usage

`PROJECT_CONTEXT.md` is the first project file future agents, reviewers, and chat sessions should read. It is the compact handoff source for the current stack, repository state, preservation rules, package boundaries, accepted design baseline, workflow, and recommended next work.

It is not a task file. Task-specific scope, non-goals, and acceptance criteria remain in `docs/tasks/`.

Detailed rules remain in their dedicated locations:

- Architecture: `docs/architecture/`
- Design: `docs/design/`
- Agent behavior: `AGENTS.md` and `docs/agents/`

Recommended first-read order:

1. `PROJECT_CONTEXT.md`
2. `AGENTS.md`
3. The current file in `docs/tasks/`
4. Relevant architecture documents
5. Relevant design documents

Codex should update `PROJECT_CONTEXT.md` when implemented work changes the stack, structure, architecture, package boundaries, accepted design baseline, agent workflow, or current PR status. Keep it concise; do not use it as a changelog.

Suggested instruction for a new session:

> Read PROJECT_CONTEXT.md first. Then read AGENTS.md and the current task file in docs/tasks/. Treat the latest project context as authoritative over older assumptions, and do not act outside the task scope.
