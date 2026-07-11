# CI-002D — Safe Claude Invocation Diagnostics

## Reviewed state

- Base: `main` at PR #16 merge commit `346d095`.
- Branch: `ci/safe-claude-invocation-diagnostics`.
- CI-002RV status: Failed; CI-003 remains blocked.
- Scope: one workflow diagnostic step, one stdlib-only sanitizer, and allowed
  documentation only.

## Failed runs

CI-002RV Claude QA runs `29156077671`, `29156150151`, and `29156280877` each
obtained OIDC and GitHub App tokens, installed and initialized Claude Code,
then ended after one turn with `is_error: true`, zero cost, zero permission
denials, and no structured output. Each produced one sanitized, SHA-bound
failure comment and failed loudly.

## Confirmed working layers

- OAuth secret availability and masking.
- GitHub OIDC acquisition and Claude GitHub App token exchange.
- Claude Code installation and SDK initialization.
- Execution-file write on the pinned Action's failure path.
- Deterministic validation, sanitized failure rendering, publication, and job
  failure.
- CI-001 independence.

## Unverified layers

- Model request acceptance, model availability, and OAuth entitlement.
- JSON Schema acceptance by the model/API.
- Named agent loading and interaction with structured output.
- Effective CLI/SDK compatibility after initialization.
- Provider response and Action extraction beyond the sanitized result record.

## Exact Action version

`anthropics/claude-code-action@e90deca47693f9457b72f2b53c17d7c445a87342`
(`v1.0.171`). Official source inspection confirms declared outputs
`execution_file`, `structured_output`, and `session_id`; `claude_args` input;
SDK parsing for `--agent`, `--json-schema`, tool allow/disallow flags; JSON
execution-file writing; and catch-path publication of `execution_file` even
when the Action fails.

## Exact Claude Code version

The pinned base Action installs Claude Code `2.1.207`. All three failed runs
logged that same version.

## Invocation reconstruction

| Component | Expected | Actual | Status |
|---|---|---|---|
| YAML scalar | Literal multiline string | Literal `claude_args` string | Pass |
| Argument order | Agent, allowed tools, disallowed tools, schema | Same order | Pass |
| Agent | `qa-reviewer` | One value: `qa-reviewer` | Pass |
| Allowed tools | Read-only plus two scoped `gh` reads | One quoted value; parser expands comma list | Pass |
| Disallowed tools | Write/Edit/NotebookEdit | One quoted value | Pass |
| JSON Schema | One valid JSON value | One single-quoted 609-byte value | Pass |
| Newline behavior | Separates flag/value pairs | Shell parser treats newlines as whitespace | Pass |
| Backslash behavior | No schema backslash continuation | None present | Pass |
| Max turns | Not explicitly set | SDK default | Informational |
| Model setting | Agent definition alias | `sonnet` in trusted agent definition; run initialized `claude-sonnet-5` | Unverified availability |

Effective token sequence was reconstructed as four flag/value pairs:
`--agent`, `--allowedTools`, `--disallowedTools`, and `--json-schema`.

## JSON Schema validation

The 609-byte schema parses with the Python standard-library JSON parser. It is
an object schema, requires all six expected fields, sets
`additionalProperties: false`, constrains array counts and string lengths, and
contains no Markdown fences or embedded newlines. No syntax or transport defect
was found statically.

## Tool configuration analysis

Pinned source uses `shell-quote`, protects shell metacharacters, merges
`allowedTools`/`disallowedTools` into SDK arrays, and removes them from generic
`extraArgs`. The scoped `Bash(gh pr view:*)` and `Bash(gh pr diff:*)` values
round-trip as literal tool patterns. No write or comment tool is available.

## Model configuration analysis

The workflow sets no explicit `--model`; the trusted `qa-reviewer` definition
uses alias `sonnet`, observed by the Action as `claude-sonnet-5`. Static source
cannot prove model availability or OAuth entitlement. CI-002DV must use safe
metadata to distinguish model resolution/auth/provider categories if exposed.

## Candidate failure categories

All thirteen task categories remain candidates. Static inspection reduces the
likelihood of malformed schema transport and obvious tool-argument splitting,
but does not eliminate runtime incompatibility, agent/schema interaction,
model/entitlement, settings, provider, or Action extraction failures. No root
cause is claimed.

Conceptual A/B ordering for a future separately authorized experiment:

| Variant | Single variable removed/changed | Diagnostic value |
|---|---|---|
| A | No JSON Schema | Separates schema/structured-output path |
| B | No named agent | Separates agent loading/interaction |
| C | No explicit tool restrictions | Separates tool configuration; security cost makes it unsuitable first |
| D | Explicit supported model | Separates alias/model resolution after entitlement evidence |
| E | Minimal prompt plus schema | Minimal structured-output request |
| F | Minimal prompt without schema | Minimal model request |
| G | Existing complete configuration | Baseline |

CI-002D implements no A/B variant. It only gathers safe metadata; CI-002DV
decides whether any one-variable experiment is justified.

## Safe diagnostic design

The workflow passes the declared `execution_file` output and trusted run
metadata to `.github/scripts/sanitize-claude-diagnostic.py`. The script caps
files at 1,000,000 bytes, records at 200, nesting at 20, validates UTF-8,
rejects nulls and duplicate keys, accepts JSON/JSONL, and never executes or
prints source records. It emits a fixed Step Summary table, restricts codes,
types, model names, numbers, and booleans, and normalizes to the task's fixed
category set. Invalid or missing input writes a complete fail-closed summary
and exits nonzero. Diagnostics never enter PR comments.

## Sanitizer tests

| Case | Accepted | Category | Sensitive text exposed | Expected |
|---|---|---|---|---|
| Missing file | No | `execution_file_missing` | Zero | Pass |
| Empty file | No | `execution_file_invalid` | Zero | Pass |
| Valid JSON result | Yes | `success` | Zero | Pass |
| Valid JSONL result | Yes | `success` | Zero | Pass |
| Malformed JSON | No | `execution_file_invalid` | Zero | Pass |
| Oversized file | No | `execution_file_invalid` | Zero | Pass |
| Excessive record count | No | `execution_file_invalid` | Zero | Pass |
| Null byte | No | `execution_file_invalid` | Zero | Pass |
| Invalid UTF-8 | No | `execution_file_invalid` | Zero | Pass |
| Nested object | Yes | `unknown_safe_error` | Zero | Pass |
| Duplicate keys | No | `execution_file_invalid` | Zero | Pass |
| Bearer token in error | Yes | `unknown_safe_error` | Zero | Pass |
| JWT-like string | Yes | `unknown_safe_error` | Zero | Pass |
| API-key-like value | Yes | `unknown_safe_error` | Zero | Pass |
| GitHub-token-like value | Yes | `unknown_safe_error` | Zero | Pass |
| URL query string | Yes | `unknown_safe_error` | Zero | Pass |
| Cookie header | Yes | `unknown_safe_error` | Zero | Pass |
| Authorization header | Yes | `unknown_safe_error` | Zero | Pass |
| Base64-like string | Yes | `unknown_safe_error` | Zero | Pass |
| Prompt fragment | Yes | `unknown_safe_error` | Zero | Pass |
| Tool-output fragment | Yes | `unknown_safe_error` | Zero | Pass |
| Very long free-form error | Yes | `unknown_safe_error` | Zero | Pass |
| Safe HTTP status | Yes | `unknown_safe_error` | Zero | Pass |
| Safe provider error type | Yes | `unknown_safe_error` | Zero | Pass |
| Schema error | Yes | `json_schema_error` | Zero | Pass |
| Model-resolution error | Yes | `model_resolution_error` | Zero | Pass |
| Unknown error | Yes | `unknown_safe_error` | Zero | Pass |
| Success with structured output | Yes | `success` | Zero | Pass |

Result: **28/28 passed; sensitive exposure zero**. Temporary fixtures and test
harness were removed.

## Security boundaries

`pull_request`, repository/owner/non-draft gates, minimal permissions, OAuth,
OIDC, cancellation, read-only Claude tools, `show_full_output: false`, trusted
publisher context, and sanitized failure comments are unchanged. No `set -x`,
environment dump, raw execution output, prompt, transcript, header, token, or
event payload is emitted.

## Local findings

- Exact arguments and schema are statically well-formed.
- The sanitizer is fail-closed and deterministic under the required matrix.
- Build, typecheck, protocol-profile, network callback, movement, and combat
  checks pass; the existing Vite chunk warning is unchanged and informational.
- Workflow YAML validation requires GitHub CI because no local YAML parser or
  actionlint is installed; structural inspection and shell syntax pass.

## Local Architecture Review

This is a local structured Codex review, not an execution or approval from the
named Claude `architecture-reviewer`. No blockers found: diagnostics are a
narrow observability layer, do not publish reviews, do not mutate runtime state,
and remain separate from deterministic comment publication. CI-003 remains
blocked. Important limitation: the self-modifying workflow cannot prove the new
step until after merge.

## Remaining uncertainty

The exact invocation failure and whether the Action output exposes enough safe
metadata remain unknown until CI-002DV. The current PR cannot remotely exercise
its modified workflow definition. No root cause is asserted.

## Post-merge experiment

After human review and merge, CI-002DV opens a normal documentation-only PR,
observes the trusted Step Summary, confirms zero leakage, and chooses at most
one minimal A/B change only if the sanitized category is insufficient.

## Current status

Implementation and local validation complete; pending PR CI and human review.
CI-003 remains blocked and PR-007 remains deferred.
