# CI-003V Phase B — QA-Required Routing Verification

## Purpose

Record the completed live verification of the CI-003 QA-required routing path on a genuine governance-documentation pull request.

## Pull request

- Final status: `Verified`.
- Pull request: PR #34.
- Source HEAD: `dd7da168c185380aa2613f816af28b02d3449b4a`.
- Merge commit: `8076585bbed07ba0cec5dbd6ba8c61aae1505226`.
- Workflow run ID: `29288257624`.
- Workflow job ID: `86945799226`.
- CI-001: succeeded.
- Claude QA workflow: succeeded.

## Routing evidence

- Captured classification: `workflow_security`.
- Captured `qa_required`: `true`.
- Tested base SHA: `a88e28d8fcc7fc6f55811d7e03eeb7d0301f2997`.
- Tested head SHA: `dd7da168c185380aa2613f816af28b02d3449b4a`.
- The trusted classifier checkout used the expected base commit.

## Pipeline evidence

All five Claude-dependent Phase-2 steps succeeded:

1. Checkout repository
2. Run Claude QA reviewer
3. Summarize safe Claude invocation diagnostic
4. Validate and render QA review
5. Publish QA review comment

## QA comment evidence

- Deterministic QA comment count: `1`.
- Approval: `Approved`.
- No raw Claude output or transcript is reproduced here.

## Commit binding

- `reviewed_commit`: `dd7da168c185380aa2613f816af28b02d3449b4a`.
- The reviewed commit matched the source HEAD exactly.
- Stale-run protection remained active.

## Evidence limitations

Direct Git and GitHub queries established the pull-request state, source and merge commits, workflow identifiers and conclusions, CI-001 result, and deterministic comment count.

The exact classifier output values, Phase-2 step outcomes, approval, reviewed-commit value, and stale-run result were captured during the original live verification. They were not freshly extracted from raw workflow logs during DOCARCH-000 preparation.

The changed-path classification rule, trusted classifier checkout, complete Phase-2 execution, and exact reviewed-commit binding corroborate the captured routing result. This corroborating inference supports but does not replace the originally captured values.

## Result

CI-003V Phase B passed.

Together with the completed Phase A verification, this establishes that CI-003 is fully verified.
