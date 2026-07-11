# HYG-001 — Repository Hygiene Foundation

## Goal

Establish text normalization, shared editor defaults, and safe source archives
without dependencies, runtime changes, or broad file rewrites.

## Motivation

Manual repository ZIPs previously risked including `.git`, dependencies, build
output, logs, temporary files, local Claude settings, and platform-specific
line-ending noise.

## Allowed files

- `.gitattributes`
- `.editorconfig`
- `.gitignore`
- `package.json`
- `scripts/create-source-archive.mjs`
- `docs/operations/source-archives.md`
- this task file

## Forbidden files

Workflows, reviewer definitions, reviews, handoffs, project context, runtime
applications/packages, lockfiles, CI-002D3V files, environment files, secrets,
and unrelated paths.

## Line-ending policy

Git auto-detects text and normalizes source, documentation, configuration,
PowerShell, and shell files to LF. Windows batch and command files use CRLF.
Common media, font, archive, PDF, and audio formats are marked binary. Existing
files are not mass-normalized by this task.

## Editor policy

Editors use UTF-8, final newlines, LF, spaces, and two-space indentation by
default. Markdown preserves intentional trailing spaces. Batch/command files
use CRLF; PowerShell and shell scripts retain sensible two-space/LF settings.

## Source archive design

The root `archive:source` command invokes a Node built-in-only script which
validates committed paths and runs `git archive` against `HEAD`. It generates a
ZIP plus SHA-256 checksum under an ignored directory and supports dry-run,
custom output, and explicit dirty-tree acknowledgement.

## Secret-safety boundary

Only tracked path names are inspected; file contents are never scanned or
printed. Known tracked local-secret paths fail safely without printing their
names. Templates such as `.env.example`, `.env.template`, and `.env.sample`
remain allowed. Untracked and ignored files cannot enter a Git archive.

## Acceptance criteria

- Text/editor policies meet the documented baseline without a mass rewrite.
- Archives use committed `HEAD`, never directory recursion.
- Dirty trees refuse by default; `--allow-dirty` excludes uncommitted work.
- Dry-run creates nothing.
- Real ZIP/checksum generation and checksum verification pass.
- No dependency, lockfile, runtime, workflow, audit, review, handoff, or project
  context change occurs.

## Validation

Validate JSON syntax, dry-run, real archive and checksum, archive size,
forbidden tracked paths, clean intended scope, and empty forbidden diffs.

Reviewer routing: one focused Local HYG-001 implementation review by Codex.
Named Claude, Network, Gameplay, Security, QA, Architecture, and Visual agents
are not invoked because this task is isolated repository tooling with an
explicit local-review requirement and no runtime/protocol/visual change.

## Rollback

Revert the two HYG-001 commits. No migration, dependency removal, generated
archive cleanup, or runtime rollback is required.
