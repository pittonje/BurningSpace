# BurningSpace Agent Instructions

## Project and stack

BurningSpace is a server-authoritative multiplayer space game bootstrap. The current repository is an npm-workspaces monorepo with a Phaser/Vite client, a Colyseus server, a shared package, a preserved local prototype, and an existing multiplayer foundation.

Read `PROJECT_CONTEXT.md` first, then this file, `docs/handoffs/CURRENT.md`, the current task named there, and relevant architecture/design documents. The latest project context overrides older assumptions unless the Product Architect explicitly says otherwise.

## Non-negotiable rules

- The server is authoritative for multiplayer and future campaign gameplay.
- The client renders, presents UI, and sends future input or requests; it does not decide canonical outcomes.
- Keep balance constants in `packages/balance`, map/topology configuration in `packages/config`, protocol contracts in `packages/protocol`, and generic shared types in `packages/shared` as migration progresses.
- Preserve existing prototype files and assets unless a task explicitly authorizes their migration or removal.
- Do not silently change startup scene order, asset paths, networking behavior, package manager, or core frameworks.
- Validate all client messages server-side and never trust client claims about gameplay state.
- Do not commit secrets or local environment files.

## Agent roles

- Product Architect owns requirements and resolves design conflicts.
- Codex is the primary implementer.
- Claude reviewers are read-only by default and report findings rather than editing.
- The Visual Design Lead owns visual direction.
- Graphics, VFX, and UI/UX agents stay within approved briefs and do not edit gameplay authority code.

## PR expectations

- Every implementation session reads `docs/handoffs/CURRENT.md` and updates it before switching agents or ending a meaningful checkpoint.
- `PROJECT_CONTEXT.md` stores durable state, while task files remain authoritative for exact scope; do not reread the whole repository unless the task explicitly requires an audit.
- Before implementation, every task must declare its applicable reviewer set using `docs/agents/reviewer-routing.md`, including a short reason for skipped reviewers.
- Work on one scoped branch/task at a time and avoid overlapping writes.
- Read the relevant task and architecture documents before editing.
- State non-goals and preserve unrelated behavior.
- Keep changes small enough to review and migrate mixed responsibilities incrementally.
- Run `npm run build` and `npm run typecheck` when possible, plus focused checks for affected systems.
- Report created/modified files, verification results, blockers, risks, and follow-up work.

## Current structural direction

- `apps/client`: rendering, input, UI, audio, and presentation.
- `apps/server`: authoritative simulation, validation, rooms, AI, and world logic.
- `packages/protocol`: client/server messages and snapshots.
- `packages/balance`: accepted gameplay balance constants.
- `packages/config`: map and topology configuration.
- `packages/shared`: generic IDs, math, and simple shared types.
