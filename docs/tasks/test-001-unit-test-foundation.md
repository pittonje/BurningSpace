# TEST-001 — Unit Test Foundation

## Goal

Add a small deterministic unit-test foundation for existing pure server logic without changing runtime behavior.

## Starting state

The repository had diagnostic scripts but no formal test framework, root test command, Vitest configuration, or unit-test files.

## Test framework decision

Vitest 3.2.4 is added as the only new root development dependency and pinned exactly for compatibility with the existing Vite 5 workspace. It supports the repository's ESM TypeScript setup and runs the selected source modules directly in a Node environment. A test-only alias resolves `@burningspace/shared` to its canonical source entry because the package runtime export targets build output that may not exist before a test run.

## Selected test targets

- Player input validation: verifies neutral input, payload shape validation, finite angles, sequence rules, accepted input, and angle normalization. These tests protect the server's input trust boundary.
- Combat damage: verifies non-lethal damage, lethal clamping and lifecycle state, ignored non-positive damage, and dead-ship protection. These tests protect deterministic authoritative damage behavior.

## Minimal extraction

No extraction was required. Both targets already expose deterministic, I/O-free functions.

## Allowed files

- Root package manifest and npm lockfile
- Root Vitest configuration
- Two package-local test files
- This task document

## Forbidden files

Claude and CI infrastructure, review reports, current handoff and durable project context, assets, gameplay design, protocol migrations, browser E2E, deployment, and persistence files remain out of scope.

## Acceptance criteria

- `npm test` exits successfully in run mode twice.
- At least two behavior categories and six meaningful assertions are covered.
- Tests use no network, browser, Phaser, real timer, randomness, or Colyseus server.
- Build, typecheck, and relevant existing diagnostics pass.
- Vitest is the only added direct dependency and runtime behavior is unchanged.

## Validation

- `npm test`, first successful run: 2 files and 15 tests passed.
- `npm test`, second run: the same 2 files and 15 tests passed.
- Build and typecheck passed.
- Profile compatibility, movement, and combat diagnostics passed.
- Vitest loaded the root configuration and exited in run mode.
- Diff and forbidden-scope checks passed.

Reviewer routing: QA and Architecture concerns apply. Security, Network, Gameplay, and Visual reviews are skipped because tests exercise existing pure validation and combat behavior without changing runtime, protocol, authority, UI, or assets.

## Known limitations

TEST-001 establishes focused unit tests only. It adds no coverage threshold, browser tests, integration tests, snapshots, or CI workflow changes. Existing diagnostic scripts remain authoritative broader smoke checks.

## Rollback

Remove the Vitest dependency and scripts, configuration, two test files, and this document, then regenerate the lockfile with npm.
