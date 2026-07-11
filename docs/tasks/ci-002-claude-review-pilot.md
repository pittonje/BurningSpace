# CI-002 — Claude Review Pilot

## Goal

Add one narrow GitHub Actions pilot that automatically runs a read-only
BurningSpace QA reviewer on pull-request creation and updates and posts its
result as a top-level PR comment.

The pilot proves:

- Claude authentication works headlessly;
- the repository Claude configuration is discovered;
- the named QA reviewer can run in GitHub Actions;
- the reviewer remains read-only;
- the reviewer can inspect a PR diff;
- the reviewer can post a structured PR comment;
- no implementation agent or routed multi-reviewer system is involved.

## Planned workflow

Preferred path:

`.github/workflows/claude-qa-review-pilot.yml`

Preferred workflow name:

`Claude QA Review Pilot`

Triggers:

- `pull_request`:
  - `opened`
  - `synchronize`
  - `reopened`
  - `ready_for_review`

Do not use:

- `pull_request_target`
- `workflow_run`
- `issue_comment`
- scheduled execution
- `repository_dispatch`

Restrict the pilot to:

- non-draft pull requests;
- branches from the same repository;
- pull requests opened by the repository owner.

The implementation task should use an explicit job condition equivalent to:

```
github.event.pull_request.head.repo.full_name == github.repository
&& github.event.pull_request.user.login == github.repository_owner
&& github.event.pull_request.draft == false
```

External fork PR support is a non-goal for CI-002.

## Permissions

Use the smallest permissions required by the official action:

```yaml
permissions:
  contents: read
  pull-requests: write
  id-token: write
```

Do not grant:

- `contents: write`
- `issues: write` unless later proven technically necessary
- `actions: write`
- `checks: write`
- `deployments: write`
- `packages: write`
- `security-events: write`

Any permission expansion requires Product Architect approval.

## Actions

The future implementation should use:

- `actions/checkout@v6`
- `anthropics/claude-code-action@v1`

Do not modify the existing CI-001 workflow in this task.

Do not upgrade unrelated actions.

No additional npm dependency is required.

## Authentication

Preferred authentication:

```yaml
claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

The token must be generated manually outside the repository with:

```
claude setup-token
```

The repository administrator must:

1. install the official Claude GitHub App for the repository;
2. add `CLAUDE_CODE_OAUTH_TOKEN` under GitHub Actions repository secrets.

Never:

- write a token into YAML;
- write a token into documentation;
- print a token;
- commit a token;
- copy a token into `CURRENT.md`;
- read or expose secret values.

Only the existence of the secret name may be checked.

`ANTHROPIC_API_KEY` is an alternative future decision, not an automatic
fallback.

If OAuth authentication hangs or fails:

- stop;
- record the sanitized error;
- do not silently switch authentication methods;
- request Product Architect direction.

## QA reviewer behavior

The future workflow must run the existing named agent:

`qa-reviewer`

Use the Claude CLI agent option through `claude_args`:

```
--agent qa-reviewer
```

The reviewer must remain read-only.

Restrict available tools to the minimum needed for review:

- `Read`
- `Grep`
- `Glob`
- `Bash` only for approved GitHub read/comment commands

No access to:

- `Write`
- `Edit`
- `NotebookEdit`
- `git commit`
- `git push`
- branch creation
- file deletion
- workflow dispatch
- issue editing
- label editing

Preferred allowed GitHub commands:

- `gh pr view`
- `gh pr diff`
- `gh pr comment`

The reviewer prompt must explicitly say:

- read `PROJECT_CONTEXT.md`;
- read `AGENTS.md`;
- read `docs/handoffs/CURRENT.md`;
- read the active task file when one exists;
- review the current PR diff and task acceptance criteria;
- do not edit files;
- do not create commits;
- do not push;
- do not implement fixes;
- do not run destructive commands;
- do not expand task scope.

Required comment sections:

```
## Blockers
## Important suggestions
## Minor suggestions
## Approval status
```

The reviewer must post exactly one top-level review comment per workflow
run.

Inline comments are not part of this pilot.

Sticky-comment replacement and comment deduplication are deferred to
CI-003. CI-002 may produce one new review comment for each PR update.

Do not enable progress-tracking comments.

## Concurrency

Cancel obsolete review runs for the same pull request.

Use a PR-aware concurrency group similar to:

```yaml
group: claude-qa-pilot-${{ github.event.pull_request.number }}
cancel-in-progress: true
```

## Relationship to CI-001

CI-001 remains the source of build and diagnostic checks.

CI-002 must not duplicate:

- `npm ci`
- build
- typecheck
- protocol check
- network callback diagnostic
- movement diagnostic
- combat diagnostic

The QA pilot reviews the PR and its acceptance criteria. It does not
replace the Core Pull Request Checks workflow.

## Non-goals

CI-002 does not:

- implement routed reviewers;
- run Architecture, Network, Security, Gameplay or Visual agents
  automatically;
- edit code;
- fix reviewer findings;
- create commits;
- create branches;
- merge pull requests;
- support fork PRs;
- implement sticky-comment management;
- use `pull_request_target`;
- change CI-001;
- modify runtime code;
- modify dependencies;
- change package manifests or lockfile;
- modify protocol, gameplay, assets or schemas;
- implement PR-007.

## Allowed implementation files

Future CI-002 implementation may change only:

- `.github/workflows/claude-qa-review-pilot.yml`
- `docs/tasks/ci-002-claude-review-pilot.md`
- `docs/handoffs/CURRENT.md`
- `PROJECT_CONTEXT.md`

A separate Security review report may be added under:

- `docs/reviews/ci-002-security-review.md`

only when the task explicitly chooses to store it.

## Forbidden files

Do not modify:

- `apps/**`
- `packages/**`
- `package.json`
- `package-lock.json`
- TypeScript configuration files
- assets
- `.claude/agents/**`
- `.github/workflows/pr-checks.yml`
- environment files
- existing historical review reports

## Reviewer routing

Required:

- `security-reviewer`
  - verifies events, permissions, OIDC, secret handling, same-repository
    restriction, prompt-injection surface and read-only tools.

- `qa-reviewer`
  - the GitHub Actions pilot itself must produce the QA review comment;
  - manual verification confirms the output sections and read-only
    behavior.

Recommended:

- `architecture-reviewer`
  - may verify CI-002 remains separate from CI-003 and does not change
    agent ownership or package boundaries.

Not applicable:

- `network-reviewer`
  - no protocol or network behavior change.

- `gameplay-reviewer`
  - no gameplay or balance change.

- `visual-design-lead`
  - no visual or asset change.

## Acceptance criteria

The future implementation is accepted only when:

- the official Claude GitHub App is installed;
- GitHub Actions secret `CLAUDE_CODE_OAUTH_TOKEN` exists;
- the workflow uses `pull_request`, not `pull_request_target`;
- only same-repository, owner-created, non-draft PRs run the pilot;
- permissions are minimal;
- the existing `qa-reviewer` is invoked;
- Write and Edit tools are unavailable;
- the reviewer cannot commit or push;
- exactly one top-level QA comment is posted by the test run;
- the comment contains all four required headings;
- no runtime or dependency files change;
- CI-001 still passes independently;
- Security review approves;
- the CI-002 PR remains unmerged pending human review.

## Test strategy

The CI-002 implementation PR itself is the pilot test.

After opening the PR:

- confirm Core Pull Request Checks starts;
- confirm Claude QA Review Pilot starts;
- confirm OAuth authentication succeeds;
- confirm the QA comment appears;
- confirm the comment has all required headings;
- confirm no files or commits were created by the reviewer;
- push one harmless documentation correction only when needed to test the
  synchronize trigger;
- do not create artificial runtime changes solely for testing.

## Rollback

Delete:

`.github/workflows/claude-qa-review-pilot.yml`

Remove the repository secret manually when the Claude integration is no
longer needed.

No runtime, schema, protocol, data or dependency rollback is required.

## Follow-up

CI-003 — Routed Claude Reviews

CI-003 remains separate and is not authorized by CI-002.
