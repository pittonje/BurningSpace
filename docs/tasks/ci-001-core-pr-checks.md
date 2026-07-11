# CI-001 — Core Pull Request Checks

## Goal

Add a single GitHub Actions workflow that automatically runs the project's
existing build, typecheck, protocol, and diagnostic checks when a pull
request is opened or updated, with no Claude integration and no secrets.

## Starting state

PR #10 / WF-001 is merged into `main` at `24465a9ffc8c7f8d04f46e989293beb9e31cbb66`.
`main` is fast-forwarded to `origin/main`. No `.github/` directory exists yet.
No repository check has ever run in CI; all checks below currently run only
locally.

## Scope

- One new workflow file: `.github/workflows/pr-checks.yml`.
- The workflow runs the repository's existing validation commands unmodified.
- No new commands, scripts, or checks are introduced.

## Non-goals

- No Claude/Anthropic integration or API usage (reserved for CI-002).
- No routed/conditional reviewer automation (reserved for CI-003).
- No deployment, publication, release, or artifact-upload action.
- No dependency upgrade, lockfile change, or `npm audit fix`.
- No change to `apps/**`, `packages/**`, `package.json`, `package-lock.json`,
  or TypeScript configuration.
- No narrow profile consumer-import work (PR-007 remains separate).

## Required workflow behavior

`.github/workflows/pr-checks.yml` must:

- trigger on `pull_request` for `opened`, `synchronize`, `reopened`, and
  `ready_for_review`;
- support manual `workflow_dispatch`;
- run on `ubuntu-latest`;
- declare top-level read-only permissions:

  ```yaml
  permissions:
    contents: read
  ```

- not use `pull_request_target`;
- check out the repository (`actions/checkout`);
- configure Node.js 20 (Active LTS) via `actions/setup-node`, matching the
  only Node-version evidence in the repository:
  `apps/server/package.json` pins `@types/node: ^20.14.10` and no `.nvmrc`,
  `.node-version`, Volta config, or `engines` field exists anywhere in the
  repository;
- use `actions/setup-node`'s built-in npm cache keyed on `package-lock.json`;
- run `npm ci`;
- run, in order, failing the job if any command exits non-zero:
  1. `npm run build`
  2. `npm run typecheck`
  3. `npm run check:protocol-profile`
  4. `npx tsx apps/client/scripts/network-client-callback-check.ts`
  5. `npx tsx apps/server/scripts/movement-check.ts`
  6. `npx tsx apps/server/scripts/combat-check.ts`
- declare a `concurrency` group keyed on workflow + PR/ref, with
  `cancel-in-progress: true`, so obsolete runs on the same PR are cancelled;
- require no repository secrets, GitHub App tokens beyond the default
  read-only `GITHUB_TOKEN`, or Anthropic/Claude credentials;
- not download or execute any external shell script (`curl | sh` or
  equivalent);
- perform no deployment, publish, release, or artifact-upload step.

## Verified existing commands

All six commands already exist and are runnable from the repository root
(verified via `package.json` and `apps/*/package.json` before writing this
task file):

| Command | Defined in |
|---|---|
| `npm run build` | root `package.json` → `build --workspaces` |
| `npm run typecheck` | root `package.json` → `typecheck --workspaces` |
| `npm run check:protocol-profile` | root `package.json` |
| `npx tsx apps/client/scripts/network-client-callback-check.ts` | file exists at that path |
| `npx tsx apps/server/scripts/movement-check.ts` | file exists at that path |
| `npx tsx apps/server/scripts/combat-check.ts` | file exists at that path |

## Allowed files

- `.github/workflows/pr-checks.yml`
- `docs/tasks/ci-001-core-pr-checks.md`
- `docs/handoffs/CURRENT.md`
- `PROJECT_CONTEXT.md` (concise durable CI status update only)

## Forbidden files

- `apps/**`
- `packages/**`
- `package.json`
- `package-lock.json`
- TypeScript configuration files
- assets
- `.claude/agents/**`
- any dependency upgrade
- any Claude Actions integration
- any CI-002 work

## Reviewer routing

Per `docs/agents/reviewer-routing.md`, this is a deployment/environment
configuration change limited to CI wiring around existing diagnostics.

Required:

- `qa-reviewer`: validates that all six commands are correctly wired,
  failure behavior is correct, and acceptance criteria are verifiable.
- `security-reviewer`: validates read-only permissions, no
  `pull_request_target`, no secrets, no external script execution, and no
  privilege escalation via the workflow.

Recommended:

- `architecture-reviewer`: validates the workflow does not encode
  package-boundary or workspace assumptions that conflict with
  `PROJECT_CONTEXT.md`.

Not applicable:

- `network-reviewer`: no protocol, message, or Colyseus room/schema change.
- `gameplay-reviewer`: no movement, combat, balance, or campaign change.
- `visual-design-lead`: no asset, UI, or presentation change.

Reason: CI-001 executes existing diagnostics unmodified and does not touch
networking, gameplay, assets, or UI.

## Validation

- `npm run build`
- `npm run typecheck`
- `npm run check:protocol-profile`
- `npx tsx apps/client/scripts/network-client-callback-check.ts`
- `npx tsx apps/server/scripts/movement-check.ts`
- `npx tsx apps/server/scripts/combat-check.ts`
- All six commands must also pass inside the new workflow on the opened
  pull request (observed via the Actions run, not just locally).

## Acceptance criteria

- Task scope, allowed files, and forbidden files are explicit (this file).
- Workflow trigger events, `workflow_dispatch` support, runner, and
  `permissions: contents: read` are explicit and implemented exactly as
  specified.
- All six existing validation commands are verified to exist before
  implementation and are wired unmodified into the workflow.
- CI-002 (Claude integration) and CI-003 (routed Claude reviews) are
  explicitly excluded from this task.
- Rollback is deletion of `.github/workflows/pr-checks.yml`; no other file
  requires reversal.
- `docs/handoffs/CURRENT.md` contains an immediately resumable state after
  this preparation commit.

## Rollback plan

Delete `.github/workflows/pr-checks.yml`. No runtime, package, or
configuration file is touched, so no other rollback step is required.

## Follow-up tasks

1. CI-002 — Claude Review Pilot.
2. CI-003 — Routed Claude Reviews.
3. PR-007 — Narrow Profile Message Consumer Imports.
