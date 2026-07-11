# CI-002D — Safe Claude Invocation Diagnostics

## Goal

Add safe, allowlisted diagnostics for the repeated one-turn, zero-cost Claude
Code failure without exposing raw execution output, secrets, prompts, tool
results, or environment values and without weakening the deterministic
publication boundary.

## Starting evidence

CI-002RV runs `29156077671`, `29156150151`, and `29156280877` obtained OIDC and
GitHub App tokens, installed and initialized Claude Code 2.1.207, then ended
after one turn with `is_error: true`, zero cost, zero permission denials, and no
structured output. Each run posted one sanitized SHA-bound failure comment and
failed loudly. CI-001 remained green.

## Problem statement

Authentication and deterministic failure publication are proven, but existing
safe logs cannot distinguish a CLI argument, schema, agent, tool, model,
entitlement, settings, compatibility, provider, or Action extraction failure.
The root cause remains unconfirmed pending post-merge diagnostics.

## Diagnostic boundaries

- Consume only the pinned Action's declared execution-file output.
- Extract fixed metadata and sanitized error classification only.
- Keep `show_full_output: false` and never emit raw records.
- Write diagnostics only to GitHub Step Summary, never PR comments.
- Preserve the existing validator, publisher, permissions, event, gates, and
  stale-run behavior.

## Candidate failure categories

1. Invalid or malformed `claude_args`.
2. Invalid JSON Schema syntax or transport.
3. Unsupported interaction between `--agent` and `--json-schema`.
4. Unsupported or unavailable model.
5. Invalid model alias.
6. OAuth subscription or model-entitlement issue.
7. Claude Code Action and Claude Code CLI compatibility issue.
8. Project or managed settings conflict.
9. Agent-definition loading failure.
10. Custom tool restriction failure.
11. Prompt construction failure.
12. Action result-extraction defect.
13. Transient provider failure.

No category is ranked as confirmed before CI-002DV evidence exists.

## Safe diagnostic contract

The sanitizer accepts an execution-file path plus trusted run metadata, caps
input size, record count, nesting, and output length, parses JSON or JSONL with
duplicate-key rejection, and emits only allowlisted scalar metadata. It
normalizes outcomes to a fixed category, redacts sensitive patterns, and fails
closed without printing parsed source records or tracebacks.

## Allowed files

- `.github/workflows/claude-qa-review-pilot.yml`
- `.github/scripts/sanitize-claude-diagnostic.py`
- `docs/tasks/ci-002d-safe-claude-invocation-diagnostics.md`
- `docs/reviews/ci-002d-invocation-diagnostics.md`
- `docs/reviews/ci-002d-security-review.md`
- `docs/reviews/ci-002d-qa-review.md`
- `docs/handoffs/CURRENT.md`
- `PROJECT_CONTEXT.md`

The Local Architecture Review is stored as a clearly labeled section in the
main diagnostic report because a separate Architecture report is not in the
authorized file list.

## Forbidden files

- `.github/workflows/pr-checks.yml`
- `apps/**`
- `packages/**`
- `package.json`
- `package-lock.json`
- tsconfig files
- assets
- `.claude/agents/**`
- environment files, secrets, and deployment configuration
- CI-003 and PR-007 implementation

## Security requirements

Preserve `pull_request`, same-repository/owner/non-draft gates, current minimal
permissions, OAuth/OIDC, cancellation, read-only Claude tools, workflow-owned
publication, and `show_full_output: false`. Never dump environment, prompt,
transcript, Action inputs, tokens, headers, cookies, raw errors, execution
records, or GitHub event payloads.

## Local validation

- `git diff --check`, workflow YAML, shell syntax, Python syntax.
- Independent JSON Schema parsing and exact `claude_args` reconstruction.
- At least the 28 required sanitizer cases with zero sensitive-text exposure.
- Build, typecheck, protocol-profile, network callback, movement, and combat
  checks.
- Empty diffs for every forbidden path.

## Reviewer routing

Local Claude tokens are exhausted; Claude Code and named Claude reviewer agents
must not be invoked. Perform sequential structured Codex reviews and label them
exactly `Local Security Review`, `Local QA Review`, and `Local Architecture
Review`. These are not executions or approvals by named Claude agents.
Network, Gameplay, and Visual reviewers are skipped because this task changes
only CI diagnostics and documentation.

## Acceptance criteria

- Safe diagnostic extraction reads the declared Action execution file and
  produces an allowlisted Step Summary.
- Invalid or unsafe input fails closed with deterministic categories and no raw
  source disclosure.
- All required sanitizer cases pass with zero sensitive-text exposure.
- Existing failure publication and security boundaries remain unchanged.
- Local validation and all three structured Codex reviews pass.
- Only allowed paths change; CI-003 and PR-007 remain blocked/deferred.

## Post-merge verification

CI-002DV must observe the diagnostic Step Summary from the trusted workflow on
a subsequent PR, determine only what the sanitized evidence supports, and keep
CI-003 blocked until the invocation path is reliable.

## Rollback

Revert the CI-002D workflow diagnostic step and sanitizer script together. The
pre-existing deterministic validation and publication flow remains independent.

## Follow-up

Human review and merge of CI-002D, then CI-002DV. Do not implement CI-002DV,
CI-003, or PR-007 in this task.
