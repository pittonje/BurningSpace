# Source archives

Create a ZIP archive of the committed source tree:

```text
npm run archive:source
```

Archives are written to the ignored `artifacts/archives/` directory. Each ZIP
has a matching `.sha256` checksum file.

Preview the source commit, safety check, and intended output without creating
files:

```text
npm run archive:source -- --dry-run
```

Choose another output directory:

```text
npm run archive:source -- --output-dir C:\path\to\archives
```

The command normally refuses a dirty working tree. To intentionally archive
committed `HEAD` while excluding all uncommitted changes, use:

```text
npm run archive:source -- --allow-dirty
```

The archive is produced by `git archive`, not by recursively copying the
working directory. Therefore `.git`, ignored and untracked files, local
dependencies, local build output, local settings, and untracked environment
files are excluded. Manually zipping the repository is discouraged because it
can include those files and create platform-dependent line-ending noise.

The command prints the full source commit. Verify it with:

```text
git show --no-patch <source-commit>
```

Verify the ZIP checksum using a SHA-256 tool and compare it with the generated
`.sha256` file.
