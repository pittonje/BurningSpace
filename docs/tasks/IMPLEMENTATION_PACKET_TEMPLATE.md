# TASK-ID — Implementation Packet

## Goal

One precise outcome.

## Accepted decisions

- Decision ID: reference accepted decisions instead of repeating project history.

## Files to read

Prefer 3–8 directly relevant files.

- `<3–8 exact repository paths>`

## Files allowed to modify

Use exact paths or narrow patterns.

- `<exact path or narrow pattern>`

## Existing symbols

| Symbol | File | Purpose |
|---|---|---|
| `ExistingSymbol` | `<exact path>` | Existing behavior reused by the implementation |

## Required changes

1. Describe an implementation-ready change.
2. Preserve accepted boundaries and unrelated behavior.

## Test matrix

| Case | Input/state | Expected result |
|---|---|---|
| Example | Deterministic input or state | Observable expected result |

## Validation commands

List only existing repository scripts and exact focused commands already present in the repository.

```text
npm test
npm run build
npm run typecheck
```

## Forbidden changes

- List explicit paths, behaviors, dependencies, and architecture outside scope.

## Stop conditions

- Stop if architecture is unresolved.
- Stop if scope, dependencies, file ownership, or security boundaries must change.
- Add task-specific contradictions or missing evidence here.

## Expected commits

1. `type: concise implementation commit`

State the maximum commit count and prohibit amend or force-push when applicable.

## Final response format

- Repository state
- Files created and modified
- Validation results
- Scope verification
- Risks, blockers, and follow-up work
- Pull request state and next safe action

## Packet guidance

- Do not repeat full project history.
- Do not ask Codex to perform a repository-wide audit.
- Do not include unresolved architecture choices.
- Separate implementation from post-merge verification.
- Specify whether Claude QA is required through the risk-routing decision.
- Keep the packet concise, normally 150–250 lines.
- The packet remains advisory until the Product Architect accepts it.
