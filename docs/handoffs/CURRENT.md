# BurningSpace Current Handoff

Last updated: 2026-07-11
Updated by: Codex

## Repository state

- Base branch: `main`
- Active branch: `docs/agent-handoff-protocol`
- Upstream: None; branch not pushed yet
- Current HEAD: `81aae8b612d20c6a0e36c126c10c0dbfdfdb6df8`
- Working tree: Documentation changes in progress
- Pull request: None
- Pull request state: Not created

## Current task

- Task ID: `WF-001`
- Task title: Agent Handoff Protocol
- Task file: External Product Architect WF-001 brief; no repository task file was authorized
- Status: Implementation in progress

## Goal

Create a compact shared handoff system that separates durable project context, exact task authority, and current operational state so Codex, Claude Code, Product Architect, and future sessions can resume safely without repeating a repository-wide audit.

## Completed work

- Confirmed PR #9 merged as `81aae8b` and synchronized `main`.
- Created the dedicated WF-001 branch.
- Read the permitted workflow context and final PR-006 Architecture/QA evidence.
- Drafted the Claude entrypoint, handoff protocol, current handoff, and concise workflow references.

## Files created

- `CLAUDE.md`
- `docs/agents/handoff-protocol.md`
- `docs/handoffs/CURRENT.md`

## Files modified

- `AGENTS.md`
- `PROJECT_CONTEXT.md`
- `docs/agents/agent-workflow.md`

## Preserved invariants

- Server authority unchanged.
- Wire format and networking unchanged.
- Gameplay and balance unchanged.
- Runtime source, scripts, dependencies, and assets unchanged.
- Reviewer definitions unchanged.
- Local Claude settings remain private and ignored.

## Verification completed

| Command | Result |
|---|---|
| `git status` | Clean `main` before branch creation |
| `gh pr view 9` | PR #9 merged as `81aae8b` |
| `git pull --ff-only origin main` | Already up to date |

Build not run: WF-001 is documentation-only and changes no executable files.

## Reviewer routing

- Required: `architecture-reviewer`
- Recommended: `qa-reviewer`
- Skipped: `network-reviewer`, `security-reviewer`, `gameplay-reviewer`, `visual-design-lead`
- Reason: No protocol/networking, credential/CI, gameplay/balance, visual, asset, or runtime change

## Open blockers and decisions

None.

## Next safe action

Run the documentation-only scope validation and prepare the Architecture review handoff.

## Resume instructions

1. Read the task authority named above and `docs/agents/handoff-protocol.md`.
2. Verify branch and `HEAD`.
3. Verify the working tree.
4. Continue from the next safe action.

After WF-001 merges, the next planned work is `CI-001 — Core Pull Request Checks`; its task file must be approved before implementation. Do not expand this handoff into CI-002 or CI-003 details.
