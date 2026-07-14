# BS-ARCH-002 — npm-workspaces TypeScript monorepo

Status: `accepted`

Date: `2026-07-14`

Owner: `Product Architect`

Scope / domain: `Architecture — repository structure and workspace tooling`

## Decision

The repository uses an npm-workspaces TypeScript monorepo. Migration to another workspace or package-management system requires a dedicated Product Architect-approved task.

## Rationale

Repository structure and package-management changes affect every application, package, developer workflow, and CI path and must not occur incidentally.

## Consequences

pnpm, yarn, or another workspace/tooling migration is not allowed inside an unrelated implementation or documentation task.

## Supersedes

none

## Superseded by

none

## Depends on

none

## Source evidence

- `package.json`
- `package-lock.json`
- `PROJECT_CONTEXT.md`

## Verification

Verified against the root workspace configuration at the migration base commit. No workspace or dependency change is introduced.

## Notes

Original decision date not recovered; the Date field records Product Architect migration approval (DOCARCH-002C).
