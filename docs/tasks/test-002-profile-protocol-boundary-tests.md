# TEST-002 — Profile Protocol Boundary Tests

## Goal

Add deterministic Vitest coverage for profile runtime-object identity across the public protocol boundary and the required one-way dependency from protocol to shared.

## Accepted decisions

- `packages/shared` owns the canonical profile contracts.
- `packages/protocol` is the transitional public re-export boundary.
- Shared must not depend on protocol.
- Type-only compatibility remains covered by `npm run check:protocol-profile`.
- No dependency or production-code change is allowed.

## Starting state

The protocol facade already re-exports the canonical profile message objects, and the compiled compatibility diagnostic checks runtime identity, wire values, and type assignability. Vitest previously covered only server tests and resolved only the shared source entrypoint.

## Files changed

- `vitest.config.ts`
- `packages/protocol/test/profileBoundary.test.ts`
- `docs/tasks/test-002-profile-protocol-boundary-tests.md`

## Test coverage

- Strict identity of `ProfileClientMessages` from the protocol and shared public source entrypoints.
- Strict identity of `ProfileServerMessages` from the same entrypoints.
- Recursive lexical inspection of `packages/shared/src/**/*.ts` for static imports, re-exports, dynamic imports, requires, and protocol package subpaths without matching comments or ordinary strings.

## Validation commands

- `npm test` twice
- `npm run build`
- `npm run typecheck`
- `npm run check:protocol-profile`
- Git whitespace, status, diff, and forbidden-path checks

Vitest verifies the public source entrypoint through aliases. `npm run build` and `npm run check:protocol-profile` continue to verify compiled package compatibility.

## Risk classification

| Field | Level | Reason |
|---|---|---|
| runtime | none | Production runtime code is unchanged |
| networking | none | No connection, synchronization, or authority behavior changes |
| security | none | No trust boundary or permission changes |
| protocol | low | Existing public exports are verified but not changed |
| persistence | none | No stored data or migration changes |
| performance | none | No production path changes |
| ci | none | Workflows and commands are unchanged |
| documentation | low | TEST-002 behavior and limits are recorded |

## Review routing

CI-001 and the accepted Test Architect matrix are required. Claude QA is optional under the unit-test-only routing rule because no runtime helper is extracted. API Guardian is not required because the public boundary is tested but not changed.

## Forbidden changes

Runtime consumers, shared source, protocol source, manifests, dependencies, workflows, assets, durable context, current handoff, payloads, message names, wire formats, and compiled-output assumptions remain unchanged.

## Acceptance criteria

- Both public profile message objects retain strict identity.
- Shared TypeScript source has no static, dynamic, re-export, require, or subpath dependency on protocol.
- Tests resolve public package names through source aliases and do not depend on `dist`.
- Two independent `npm test` runs pass without a preceding build.
- Build, typecheck, and profile compatibility checks pass.
- Exactly three authorized files change.

## Known limitations

The reverse-dependency check is a focused lexical check for TypeScript dependency syntax, not a general-purpose TypeScript parser. Vitest verifies the public source entrypoint through aliases; compiled package compatibility remains covered by build and `check:protocol-profile`.
