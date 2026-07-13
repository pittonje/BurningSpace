# Security/CI review artifact — prepared for Product Architect and Claude QA

## Review status

This is a focused Codex-prepared security and CI artifact. It records the accepted challenge review and deterministic evidence; it is not an execution or approval by an automated Security/CI Reviewer.

## Challenge-review blockers and resolution

### B1 — Self-modifying classifier trust

Risk: a pull request could modify its own classifier and use the modified copy to suppress QA.

Resolution: the workflow checks out `github.event.pull_request.base.sha` into `trusted-ci` with the existing pinned checkout Action. Live routing executes only `trusted-ci/.github/scripts/classify-pr-risk.py`. The pull-request-head copy runs only as a test subject in read-only CI-001.

### B2 — Unsafe or incomplete changed-path transport

Risk: newline-delimited or shell-interpolated filenames, rename loss, and deletion handling could misclassify changes or expose untrusted path data.

Resolution: the REST files endpoint is paginated and slurped into one logical JSON array under `RUNNER_TEMP`. Only `filename`, nullable `previous_filename`, and `status` are preserved. Current and previous names are classified, removed files retain their current filename, and paths never become shell commands, outputs, summaries, or routing comments.

### B3 — Retrieval, truncation, and stale-state false skips

Risk: API failure, malformed objects, incomplete pagination, endpoint truncation, or a changed PR head/base could produce an incomplete apparently low-risk set.

Resolution: fail-safe outputs are written before network or parsing. Live metadata supplies base SHA, head SHA, and `changed_files`; live/event SHAs must match. The decoded entry count must equal metadata, `changed_files` above 3000 is rejected, and malformed JSON or entries fail closed. Retrieval errors and stale state keep QA required, and the routing step always exits zero after publishing only bounded status.

### B4 — Partial pipeline gating and boundary regression

Risk: gating only Claude invocation could still run diagnostics, stale render/publish logic, post failure comments, or broaden credentials and permissions.

Resolution: exactly five Phase-2 steps are gated. Checkout and Claude invocation use `steps.routing.outputs.qa_required != 'false'`; diagnostic, render, and publisher steps use `always() && steps.routing.outputs.qa_required != 'false'`. Only `routing` and the existing publisher receive `GH_TOKEN`. Permissions, pins, OIDC, GitHub App behavior, full-output suppression, concurrency, owner/fork/draft gate, sanitizer, validator, renderer, publisher, and stale-run protection are unchanged.

## Classifier safety

- Standard library only, deterministic, network-free, and no dynamic evaluation.
- Reads a single JSON file and never imports or executes changed repository code.
- Rejects empty, absolute, drive-letter, backslash, control/NUL, dot-segment, repeated-separator, leading-dot, and empty-segment paths without normalization.
- Uses first-match ordered rules and stable deduplication.
- Emits only bounded fixed-vocabulary JSON and never emits raw paths.
- Empty, malformed, unknown, and exceptional inputs require QA.

## Deterministic audit evidence

- Classifier tests cover ordinary docs/tests, all production and governance classes, precedence, malformed variants, empty/corrupt/exceptional inputs, flattened pagination, renames, deletions, counts, truncation, stale/default contracts, leakage resistance, vocabulary bounds, and repeatability.
- The updated QA audit checks trusted checkout configuration, live trusted path, absence of PR-head routing execution, exact two-step token scope, exact five-step gates, unchanged permissions and Action pins, `show_full_output: false`, and unchanged owner/fork/draft conditions.
- CI-001 runs both Python audit scripts under read-only permissions before its existing checks.

## No path or secret exposure

Changed paths remain only in runner-temp JSON. The routing summary contains booleans, fixed risk words, fixed reviewer names, fixed reason codes, and validated SHAs. No new secret is introduced, and no permission is expanded.

## Self-modifying limitation and CI-003V

The implementation PR's old base lacks the trusted classifier, so fail-safe `classifier_error` and full QA execution are expected. This PR cannot prove the skip path. After merge, CI-003V Phase A must verify a real ordinary docs-only skip with no QA comment, and Phase B must verify a genuine QA-required PR with one SHA-bound valid comment and preserved stale-run protection. CI-003 must remain unverified until both phases pass.
