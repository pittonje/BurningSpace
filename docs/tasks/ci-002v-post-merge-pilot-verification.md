# CI-002V — Post-Merge Claude QA Pilot Verification

## Goal

Verify the merged CI-002 workflow on a normal subsequent pull request.

## Starting state

- PR #13 merge commit: `558ce3484e6a02bc8015674095c19bc3d6e6124f`, merged
  into `main` at `2026-07-11T11:48:44Z`.
- CI-001 (`.github/workflows/pr-checks.yml`) active on `main`.
- CI-002 (`.github/workflows/claude-qa-review-pilot.yml`) active on `main`.
- Official Claude GitHub App installed (Product Architect-attested;
  empirically corroborated in the CI-002 pilot runs by successful OIDC
  token exchange).
- `CLAUDE_CODE_OAUTH_TOKEN` Actions secret name present (confirmed via
  `gh secret list --app actions`; no value accessed).
- No runtime or dependency changes are planned in this task.

## Verification scope

The verification PR must prove:

1. Core Pull Request Checks starts and passes.
2. Claude QA Review Pilot starts and executes instead of being merge-gated.
3. OAuth authentication succeeds.
4. GitHub App OIDC token exchange succeeds.
5. `qa-reviewer` is invoked.
6. Exactly one top-level QA comment is posted by the workflow run.
7. The comment contains, in this order:
   - Blockers
   - Important suggestions
   - Minor suggestions
   - Approval status
8. No inline comments are posted.
9. No progress or sticky comment is posted.
10. No file is edited by the automated reviewer.
11. No commit or branch is created by the automated reviewer.
12. CI-001 remains independent.
13. Secrets do not appear in logs, comments, or repository files.

## Allowed files

- `docs/tasks/ci-002v-post-merge-pilot-verification.md`
- `docs/reviews/ci-002v-pilot-verification.md`
- `docs/handoffs/CURRENT.md`
- `PROJECT_CONTEXT.md`

## Forbidden files

- `.github/workflows/**`
- `apps/**`
- `packages/**`
- `package.json`
- `package-lock.json`
- TypeScript configuration files
- assets
- `.claude/agents/**`
- environment files
- existing historical task or review reports

## Reviewer routing

Required:

- automated `qa-reviewer` through the CI-002 workflow;
- `security-reviewer` manually and read-only.

Recommended:

- `architecture-reviewer` manually and read-only.

Not applicable:

- `network-reviewer`;
- `gameplay-reviewer`;
- `visual-design-lead`.

## Acceptance criteria

- CI-001 passes;
- CI-002 executes fully;
- authentication succeeds;
- exactly one top-level QA comment is produced for the initial PR run;
- all four required headings exist and are in order;
- reviewer remains read-only;
- no secret value is exposed;
- no forbidden file changes;
- Security approves;
- Architecture finds no CI-003 scope leakage;
- verification PR remains open for human review.

## Non-goals

This task does not:

- implement CI-003;
- add reviewer routing automation;
- edit CI-002;
- add sticky comments;
- add inline comments;
- support external forks;
- modify runtime code;
- modify dependencies;
- implement PR-007.

## Rollback

Close the verification PR without merging, or revert its documentation-only
commit.

No workflow, runtime, or dependency rollback is required.

## Follow-up

CI-003 — Routed Claude Reviews

Do not create the CI-003 task file in this task.
