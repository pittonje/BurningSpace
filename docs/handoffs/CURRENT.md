# BurningSpace Current Handoff

Last updated: 2026-07-11
Updated by: Codex

## Repository state

- Base branch: `main`
- Active branch: `main`
- Upstream: `origin/main`
- Current HEAD: `24465a9` (stable WF-001 merge checkpoint)
- Working tree: Clean after the expected handoff-only reset commit
- Pull request: [#10](https://github.com/pittonje/BurningSpace/pull/10)
- Pull request state: Merged as `24465a9ffc8c7f8d04f46e989293beb9e31cbb66`

## Current task

- Task ID: `CI-001`
- Task title: Core Pull Request Checks
- Task file: None; not created or approved
- Status: Planned; implementation is not authorized

## Goal

Wait for a scoped Product Architect task file defining CI-001 goals, allowed files, acceptance criteria, non-goals, and reviewer routing. Do not implement GitHub Actions or CI from this handoff alone.

## Completed work

- WF-001 introduced the shared Claude/Codex handoff protocol.
- Architecture and QA approved WF-001 with no blockers.
- PR #10 merged into `main` as `24465a9`.
- Local `main` was fast-forwarded to `origin/main`.
- Current operational state was reset from completed WF-001 work to CI-001 planning.

## Files created

None for CI-001.

## Files modified

None for CI-001.

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
| `gh pr view 10` | PR #10 merged as `24465a9` |
| `git pull --ff-only origin main` | Local `main` fast-forwarded to merge commit |
| `git status` | Clean `main` before this handoff-only reset |

Build not run: the merged WF-001 task and this reset are documentation-only and change no executable files.

## Reviewer routing

- Required: Not yet declared
- Recommended: Not yet declared
- Skipped: Not yet declared
- Reason: CI-001 has no approved task file; reviewer selection must be defined there before implementation

## Open blockers and decisions

- Product Architect must create or approve the CI-001 task file and reviewer set.

## Next safe action

Product Architect creates or approves the scoped CI-001 task file.

## Resume instructions

1. Read `PROJECT_CONTEXT.md`, `AGENTS.md`, and this handoff.
2. Verify `main`, the recorded merge checkpoint, and the documented handoff-only child commit.
3. Verify the working tree is clean.
4. Do not implement CI-001 until its committed task file exists.

Expected handoff-only commit subject: `docs: reset handoff after WF-001 merge`.
