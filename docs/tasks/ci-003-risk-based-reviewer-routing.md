# CI-003 — Risk-Based Reviewer Routing

## Goal

Add deterministic, path-based risk routing to the existing Claude QA workflow while preserving its security, validation, publication, and stale-run boundaries.

## Accepted architecture

- The live classifier is checked out and executed only from the pull request's trusted base SHA under `trusted-ci/`.
- One `routing` step owns fail-safe defaults, live metadata and changed-file retrieval, stale-state and truncation checks, classifier execution, output validation, and a bounded filename-free summary.
- Changed-file metadata is transported as one JSON array containing only `filename`, `previous_filename`, and `status`.
- The pull-request head classifier is a CI-001 test subject only and never controls live routing.
- Only the literal `false` output can skip the complete Claude QA pipeline.
- Classifier, retrieval, metadata, stale-state, malformed-input, and empty-input failures require QA.

## Exact routing rules

Rules use first-match precedence after malformed-path validation:

1. `workflow_security`: `.github/**`, `.claude/**`, `CLAUDE.md`, `AGENTS.md`, `PROJECT_CONTEXT.md`, `docs/agents/**`, and `docs/handoffs/CURRENT.md`.
2. `dependency`: any root or nested `package.json`, `package-lock.json`, `npm-shrinkwrap.json`, `yarn.lock`, or `pnpm-lock.yaml`.
3. `test_only`: paths containing an explicit `test`, `tests`, or `__tests__` segment.
4. `documentation_only`: other `docs/**` paths and ordinary root Markdown.
5. `network_room`: only `apps/server/src/rooms/**`, `apps/client/src/network/**`, and `apps/client/src/scenes/NetworkTestScene.ts`.
6. `gameplay_authority`: `apps/server/src/systems/**` and `apps/server/src/schema/**`.
7. `protocol_api`: production paths under `packages/shared/**` and `packages/protocol/**`.
8. `unknown`: every other valid path.

Current and previous names are both classified whenever `previous_filename` is present. Removed entries classify their current `filename`. A PR may skip QA only when it has at least one entry and every classified current and previous path is `test_only` or `documentation_only`. Documentation plus tests may skip; every other combination requires QA.

## Output contract

| Output | Contract |
|---|---|
| `qa_required` | `true` or `false` |
| `risk_level` | `none`, `low`, `medium`, `high`, or `unknown` |
| `risk_areas` | Stable deduplicated subset of the eight ordered path areas; maximum 8 |
| `manual_reviewers_required` | Stable subset of Documentation Keeper, Test Architect, API Guardian, Multiplayer Reviewer, Security/CI Reviewer, and Dependency Guardian |
| `post_merge_verification_required` | `true` or `false` |
| `reason_codes` | Stable subset of the accepted twelve fixed reason codes |
| `tested_base_sha` | 40 lowercase hexadecimal characters or `unavailable` |
| `tested_head_sha` | 40 lowercase hexadecimal characters or `unavailable` |

Default outputs require QA with `unknown` risk, empty bounded collections, `classifier_error`, and unavailable SHAs. No raw changed path is written to classifier stdout, workflow outputs, summaries, or routing comments.

## Test matrix

- Ordinary docs, explicit test directories, and their allowed combination skip QA.
- Protocol, gameplay, room/network, workflow, agent, dependency, mixed production, and unknown paths require QA.
- Workflow and dependency precedence overrides test-like naming; explicit protocol test directories remain test-only.
- Governance documents require QA, while ordinary root Markdown is documentation-only.
- Empty, absolute, drive-letter, backslash, control/NUL, dot-segment, repeated-separator, leading-dot, and empty-segment paths fail closed.
- Empty sets, corrupt JSON, forced exceptions, malformed entry metadata, count mismatch, more than 3000 changes, retrieval errors, stale state, and a missing trusted classifier fail closed.
- Flattened multi-page JSON, duplicates, renames in both directions, deleted production files, collection bounds, fixed vocabulary, no path leakage, and byte-identical repeated results are covered.
- The existing QA audit checks trusted checkout configuration, token scope, unchanged permissions and pins, exact five-step gating, invocation constraints, validator behavior, sanitizer behavior, and stale publication boundaries.

## Security invariants

- Live routing never executes pull-request-head code.
- Defaults are written before any fallible operation, and the routing step always exits successfully with QA required on failure.
- REST retrieval is paginated and slurped; decoded entry count must equal live `changed_files`, which must not exceed 3000.
- Live base and head SHAs must be valid and match the event SHAs.
- Filenames remain JSON data and are never interpolated into shell commands or exposed through routing outputs.
- Path validation rejects unsafe forms without normalization.
- Only `routing` and `Publish QA review comment` receive `GH_TOKEN`.
- Existing permissions, Action pins, OIDC flow, GitHub App behavior, Claude invocation, sanitizer, validator, renderer, publisher, concurrency, owner/fork/draft gate, and stale-run protection remain intact.
- All five Phase-2 steps are gated, so intentional skip produces no diagnostic, rendered output, comment, automation-failure comment, or stale-output action.

## Self-modifying limitation

The CI-003 implementation pull request cannot demonstrate a live skip because its base does not contain the trusted classifier. Its expected live result is `classifier_error`, `qa_required=true`, execution of the full existing Claude pipeline, and a successful job. This fail-safe result is evidence of the trust boundary, not a routing defect.

## CI-003V requirement

CI-003 is not verified until both post-merge phases pass:

### Phase A

- Open a real ordinary docs-only PR that does not change governance, agent, or handoff documents.
- Confirm `qa_required=false` and correct tested base/head SHAs.
- Confirm all five Phase-2 steps are skipped, the job succeeds, and zero QA comments are posted.

### Phase B

- Observe the next genuine QA-required PR.
- Confirm `qa_required=true`, the complete pipeline executes, and exactly one valid QA comment is posted.
- Confirm `reviewed_commit` matches the live head and stale-run protection remains effective.

## Allowed files

- `.github/scripts/classify-pr-risk.py`
- `.github/scripts/test-classify-pr-risk.py`
- `.github/scripts/test-claude-qa-audit.py`
- `.github/workflows/claude-qa-review-pilot.yml`
- `.github/workflows/pr-checks.yml`
- `docs/tasks/ci-003-risk-based-reviewer-routing.md`
- `docs/reviews/ci-003-security-review.md`
- `docs/handoffs/CURRENT.md`

## Forbidden files

Runtime applications and packages, manifests and lockfiles, agent definitions, durable project context, assets, dependencies, Actions, sanitizer/validator/renderer/publisher internals, and all files outside the eight-path allowlist remain unchanged. `PROJECT_CONTEXT.md` remains forbidden until CI-003V succeeds.

## Validation

```text
python .github/scripts/test-classify-pr-risk.py
python .github/scripts/test-claude-qa-audit.py
npm test
npm run build
npm run typecheck
git diff --check
```

Also verify exact forbidden-path diffs, eight changed files, unchanged permissions and pins, two GH_TOKEN steps, one routing step, and exact gating of all five Phase-2 steps. No PyYAML is used.

## Rollback

Revert the CI-003 commits to remove the classifier, tests, trusted checkout, routing step, Phase-2 gates, CI-001 audit step, and documentation. The prior always-run Claude QA workflow then resumes. No runtime, dependency, data, or deployment rollback is required.
