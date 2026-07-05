# Contributing

## Branch Naming

- `feature/<issue>-<name>`
- `fix/<issue>-<name>`
- `docs/<issue>-<name>`
- `architecture/<issue>-<name>`
- `art/<issue>-<name>`
- `test/<issue>-<name>`

## Agent Workflow

- One task, one branch, one PR.
- One agent should not work in the same branch at the same time as another agent.
- Read `AGENTS.md` before starting.
- Use `PLANS.md` for cross-module or long-running work.
- Do not push directly to `main`.

## Labels

- `feature`: gameplay or product capability.
- `bug`: defect or regression.
- `design`: product/gameplay decision.
- `architecture`: cross-system technical decision.
- `docs`: documentation-only change.
- `test`: verification-only change.
- `art`: visual or asset direction.

## Required Checks

```bash
npm install
npm test
```

