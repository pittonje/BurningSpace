# Agent Handoff Protocol

## Purpose

This protocol reduces repeated repository exploration and permits safe Codex ↔ Claude Code switching. Product Architect decisions and future coding sessions use the same separation between durable context, task authority, and current operational state.

## Document responsibilities

### PROJECT_CONTEXT.md

Contains only durable information:

- stack;
- architecture;
- package boundaries;
- preservation rules;
- accepted design baseline;
- workflow;
- high-level current direction.

It must not become a detailed session log. Historical command output and checkpoint-by-checkpoint progress belong elsewhere.

### Task file

Contains:

- exact goal;
- scope and non-goals;
- allowed files;
- acceptance criteria;
- selected and skipped reviewers.

The task file is implementation authority. When no task file exists, `CURRENT.md` must say so and implementation must wait for a scoped Product Architect brief. A bootstrap workflow task may use an external Product Architect brief only when that brief explicitly forbids creating its own task file; `CURRENT.md` must record that exception. The exception does not authorize implementation of the next task without a committed task file.

### docs/handoffs/CURRENT.md

Contains current operational state:

- active task and task file;
- branch, base branch, upstream, PR, and current `HEAD`;
- implementation status;
- exact changed files;
- checks already run;
- blockers and open decisions;
- preserved invariants;
- one next safe action;
- expected reviewer set.

`CURRENT.md` is mutable. It represents only the latest work state and is not a changelog. Historical details remain in task files, pull requests, review reports, and Git history.

`Current HEAD` records the latest stable implementation checkpoint known when the handoff is written. A commit cannot contain its own resulting hash. When a final commit changes only handoff/workflow documentation, `CURRENT.md` must identify the recorded checkpoint and expected handoff-only commit subject; the receiver verifies that branch tip is that single documented child before continuing.

If further corrections require another commit, the outgoing implementer first updates the recorded stable checkpoint and expected child relationship. Do not accumulate an undocumented chain of handoff-only commits.

## Required update moments

Codex or another implementer updates `CURRENT.md`:

- after creating the task branch;
- after an implementation checkpoint;
- before handing work to another agent;
- after resolving a blocker;
- after opening the PR;
- after final validation;
- after merge and return to `main`.

## Handoff verification

The receiving agent runs:

```bash
git status --short --branch
git log --oneline -5
```

When a PR exists, it also runs:

```bash
gh pr view <number>
```

The receiving agent compares branch, `HEAD`, working tree, PR state, and task status with `CURRENT.md`. A documented single handoff-only child commit is verified against its subject and parent. Any other mismatch must be reported before editing; do not guess, reset, stash, or overwrite another session's work.

## Compactness rules

- Keep `CURRENT.md` below 200 lines under normal conditions.
- Do not paste terminal transcripts or large diffs.
- Do not repeat full architecture or design documents.
- Link to the relevant repository file.
- Store only commands and result summaries needed to resume work.
- Replace stale operational state instead of accumulating history.

## Security rules

- Never include secrets, access tokens, private local values, or local Claude settings.
- Never include `.env` contents.
- Secret names may be documented; secret values may not.
- Do not place personal absolute paths in committed handoffs.
- Keep `.claude/settings.local.json` local, ignored, untracked, and unmodified.

## Completion rules

At task completion:

- record the final commit and PR;
- record validation results;
- state whether the task is ready for human review;
- identify one next safe task or action;
- after merge, reset `CURRENT.md` to the next active task or an explicit idle/planning state.
