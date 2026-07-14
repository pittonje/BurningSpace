# DOCARCH-000 — Repository Truth Reconciliation

## Goal

Reconcile the repository documentation with the verified Git and GitHub state after CI-003 and CI-003V.

## Strategic purpose

This task establishes a truthful baseline for preserving architecture and roadmap continuity while making the Product Architect role transferable to another agent without dependence on hidden conversational state.

## Verified starting state

- Verified reconciliation baseline before DOCARCH-000: `8076585bbed07ba0cec5dbd6ba8c61aae1505226`.
- CI-003 implementation source HEAD `b6d75ce042da32045e16d3f058aa80dd87360254` merged through PR #32 as `9842457830b6ce46d0be8418752845166f8ad965`. CI-001 passed; Claude QA did not execute because the pull request changed the protected workflow relative to the default branch. That reviewed workflow-identity exception was expected and was not a routing implementation failure.
- CI-003V Phase A source HEAD `ee8536caf56486df6537bacced3490ed91f80b65` merged through PR #33 as `a88e28d8fcc7fc6f55811d7e03eeb7d0301f2997` and passed its documentation-only live verification.
- CI-003V Phase B source HEAD `dd7da168c185380aa2613f816af28b02d3449b4a` merged through PR #34 as `8076585bbed07ba0cec5dbd6ba8c61aae1505226` and passed its QA-required live verification.
- CI-003 is implemented and fully verified.

## Documentation contradictions

- The Phase A evidence still says live evidence is pending.
- `CURRENT.md` still describes Phase B as pending or active.
- No Phase B evidence file exists.
- `PROJECT_CONTEXT.md` still describes CI-003 as blocked, pending, or unverified.

## Allowed files

- `docs/tasks/docarch-000-repository-truth-reconciliation.md`
- `docs/reviews/ci-003v-phase-b.md`
- `docs/reviews/ci-003v-phase-a.md`
- `docs/handoffs/CURRENT.md`
- `PROJECT_CONTEXT.md`

## Forbidden files

All files outside the five-path allowlist are forbidden, including runtime code, tests, workflows, scripts, agent definitions, dependencies, governance and decision documents, and unrelated task or review documents.

## Required changes

1. Finalize the Phase A evidence with verified pull-request, commit, workflow, routing, skip, and comment facts.
2. Add the Phase B evidence with verified pull-request, commit, workflow, routing, pipeline, comment, and commit-binding facts.
3. Replace obsolete CI-003 verification state in `CURRENT.md` with the completed operational state and one next safe action.
4. Replace stale CI-003 statements in `PROJECT_CONTEXT.md` with a compact durable record.
5. Preserve all accepted architecture, product, package, agent-role, and roadmap content.

This task introduces no governance hierarchy, migrates no decisions, changes no architecture, changes no roadmap item, and changes no model-routing rule.

## Acceptance criteria

- Phase A and Phase B each have an explicit final status of `Verified` and an explicit passing conclusion.
- Source HEADs, merge commits, run IDs, job IDs, routing outcomes, and commit binding are recorded without conflation.
- `CURRENT.md` states that CI-003 is implemented and fully verified, leaves no CI-003 verification task active, and contains exactly one next safe action.
- `PROJECT_CONTEXT.md` contains durable CI-003 facts only.
- Exactly the five allowed files change.
- Product Architect review, deterministic documentation validation, CI-001, and automatically routed Claude QA are expected.
- Documentation Keeper is conceptually relevant; this task does not claim that an automated Documentation Keeper executed.
- Multiplayer Reviewer is skipped because no multiplayer behavior or networking changes.
- API Guardian is skipped because no protocol or public API changes.
- Security/CI Reviewer is skipped because no CI implementation, workflow, permission, secret, or security boundary changes.

## Validation

Run:

```text
git diff --check
git status --short
git diff --name-only
git diff --stat
```

Verify the five-path allowlist, completed verification wording, distinct source and merge commits, recorded run IDs, exact Phase B reviewed-commit binding, durable-only project context, operational-only handoff state, and absence of architecture, decision, governance-schema, roadmap, and model-routing changes.

Do not run dependency installation, tests, builds, typechecks, or runtime diagnostics for this documentation-only task.

## Known limitations

- Exact routing output fields are values captured during the original live verifications; DOCARCH-000 does not claim to re-extract them from raw workflow logs.
- This task reconciles existing facts only. It does not establish the future documentation authority system or start DOCARCH-001.

## Rollback

Revert the single DOCARCH-000 documentation commit. No runtime, dependency, workflow, data, or deployment rollback is required.
