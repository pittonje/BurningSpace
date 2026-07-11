# CI-002QAV — Re-verify Full Claude QA

## Goal

Verify the unchanged full Claude QA workflow after Claude token availability
has returned.

## Hypothesis

The previous one-turn, zero-cost failures were caused by exhausted account or
subscription token availability rather than the JSON Schema invocation.

## Success criteria

1. OAuth and OIDC exchange succeed.
2. Claude Code initializes.
3. qa-reviewer genuinely runs.
4. Invocation progresses beyond the previous immediate failure.
5. More than one turn or non-zero cost is observed.
6. `structured_output` is present.
7. The workflow validator accepts the result.
8. Exactly one top-level QA comment is posted.
9. The comment contains, in order:
   - `## Blockers`
   - `## Important suggestions`
   - `## Minor suggestions`
   - `## Approval status`
10. No sanitized automation-failure comment is posted.
11. No duplicate comment appears.
12. Claude creates no files, commits, branches, labels, issues or reviews.
13. No secret, prompt, transcript or environment value is exposed.
14. CI-001 passes independently.

## Failure criteria

The verification fails when the run again shows:

- one turn;
- zero cost;
- `is_error: true`;
- no structured output;

or when authentication, validation, publication or secret safety fails.

## Scope

Documentation only.

## Forbidden paths

- `.github/workflows/**`
- `apps/**`
- `packages/**`
- `package.json`
- `package-lock.json`
- TypeScript configuration
- assets
- `.claude/agents/**`

## Decision after verification

If full QA succeeds:

- retain the full QA workflow;
- close PR #19 as superseded;
- do not continue the schema-removal experiment.

If the same immediate failure repeats:

- leave PR #19 open;
- do not modify the workflow;
- return to Product Architect for a decision.
