# CI-AUDIT-001 — Full Claude QA System Audit

## Executive result

**Audit system usable with documented limitations.** One functional root
cause for the CI-002QAV/CI-002D3V `structured_output_error` was found and
fixed locally with reproducible evidence; two smaller hardening gaps were
also fixed. All fixes are narrow, security-neutral, and covered by a new
41-check deterministic test suite. Post-merge live verification is still
required (this PR's own workflow change cannot exercise itself).

## Reviewed architecture

`pull_request` (opened/synchronize/reopened/ready_for_review) → job gated
on same-repo + owner + non-draft → `actions/checkout@df4cb1c0…` (v6.0.3) →
`anthropics/claude-code-action@e90deca4…` (v1.0.171, installs Claude Code
2.1.207) running `qa-reviewer` with `--json-schema` and OAuth/OIDC/App-token
auth → safe sanitized diagnostics
(`.github/scripts/sanitize-claude-diagnostic.py`) → embedded stdlib-Python
validator/renderer → deterministic publisher (`gh pr comment --body-file`,
step-scoped `github.token`, live pre-post stale-run re-check).

## Trust boundaries

Untrusted: PR diff/files/title/description/commits/filenames, and
everything Claude returns. Trusted: the workflow definition as it exists
on `main` (the action self-skips when a PR's copy differs — verified
directly in run logs across CI-002D/CI-002D2/CI-002D3/CI-002D3V), GitHub
event context, step-scoped `github.token`, the embedded validator/
sanitizer source, the pinned action SHA. Claude has zero comment/write/
commit/push/token capability; the publisher step is the sole GitHub
mutation path.

## Threat model

1. Reviewed content instructs Claude to change its output/verdict/tools
   (prompt injection).
2. Claude output contains hostile Markdown/Unicode aimed at spoofing
   headings or hiding content in the rendered comment.
3. Secret/token/transcript leakage via logs, diagnostics, or comments.
4. Stale-HEAD or wrong-PR comment publication.
5. A PR's own workflow-file edit running with elevated trust before
   review.
6. Silent zero-comment success (job green, no comment).
7. False approval from unvalidated or malformed Claude output.

## Evidence reviewed

- Full CI-002 lineage from CI-002 pilot through CI-002D3V, including run
  IDs, safe metadata (turns/cost/`is_error`/`permission_denials_count`/
  diagnostic category), and the Action's own explicit error text
  (`--json-schema was provided but Claude did not return
  structured_output`), consistently reproduced across CI-002QAV (25
  turns, $0.4174) and CI-002D3V (18 turns, $0.3609) after schema
  simplification.
- The committed workflow, agent definition, sanitizer, and embedded
  validator/renderer/publisher source, read in full.
- Eight local reproduction experiments (E1–E8a) run against the identical
  locally installed Claude Code CLI version (2.1.207), isolating the
  `--agent` mechanism from schema/tool/model variables one at a time (see
  Structured-output status).

No raw prompt, model response, transcript, tool output, token, header,
cookie, or environment value is reproduced anywhere in this report; only
sanitized scalar fields and one Action-emitted error sentence (itself
free of any credential-shaped content) are cited, consistent with every
prior CI-002 verification's safe-diagnostics boundary.

## Blockers

None found.

## Important findings

**F-1 — Structured output was structurally non-functional whenever
`--agent` and `--json-schema` were combined.** Confirmed by direct local
reproduction on Claude Code CLI 2.1.207 (the exact version the pinned
action installs):

| Exp. | Config | `structured_output` |
|---|---|---|
| E1 | No agent, schema only | present |
| E2 | `--agent qa-reviewer` (committed def.), schema | **absent** |
| E3 | Inline minimal agent (no `tools:` key), schema | present |
| E4 | Inline agent + `model: sonnet`, schema | present |
| E5 | Inline agent + `tools: [Read,Grep,Glob,Bash]`, schema | **absent** |
| E6 | E5 + `StructuredOutput` added to `tools:`, schema | present |
| E7 | E6's tools list, no schema (harmlessness check) | n/a — ran normally |
| E8a | Fixed `qa-reviewer` def. + CI-exact `--allowedTools`/`--disallowedTools`, schema | present |

Root cause: any Claude Code agent definition that declares an explicit
`tools:` allowlist implicitly excludes the CLI's internal
`StructuredOutput` tool unless it is named explicitly — the agent then has
no mechanism to emit the schema-validated output channel, silently falls
back to plain-text `result`, and the action correctly reports
`structured_output` absent. `.claude/agents/qa-reviewer.md` declared
`tools: Read, Grep, Glob, Bash` (E5's exact shape), reproducing the
failure; adding `StructuredOutput` (E6/E8a) resolves it with zero other
change. This is fully consistent with, and finally explains, every prior
CI-002QAV/CI-002D3V observation: genuine multi-turn completion,
`is_error: false`, yet no structured output regardless of schema
constraint simplification — because CI-002D3 correctly ruled out the
schema *content* while never testing the agent's tool allowlist, which is
the actual mechanism.

**F-2 — The workflow prompt had no explicit prompt-injection-resistance
instruction.** The `qa-reviewer` agent definition also lacked one. Nothing
in the existing text told Claude to treat reviewed repository content as
data rather than instructions, potentially expanding the attack surface if
hostile PR content instructed the model to alter its verdict, reveal tool
policy, or attempt actions outside task scope. No exploitation evidence
exists; this is a defense-in-depth gap, not an observed incident.

## Minor findings

**F-3 — Output-contract mismatch between the agent definition and the
workflow's JSON-only invocation.** The generic `qa-reviewer.md` return
contract is four Markdown headings, but the workflow's actual prompt
requires a single JSON object matching the schema — a latent ambiguity for
any other future invocation context of this same agent definition, not a
defect in the current pilot's behavior (the workflow's own prompt text
already overrides it in practice).

Also noted, not fixed (see Deferred risks): a broad `"agent"` needle in
the sanitizer's `classify()` error-text rules, and the absence of an
explicit `--max-turns` bound.

## Confirmed fixes

| ID | Severity | Defect | Evidence | Fix | Validation |
|---|---|---|---|---|---|
| F-1 | Important | `structured_output` never populated with `--agent qa-reviewer` + `--json-schema` | Local reproduction E1–E8a on CLI 2.1.207 (identical to pinned action); matches every live CI-002QAV/CI-002D3V run signature | Added `StructuredOutput` to `tools:` in `.claude/agents/qa-reviewer.md` | Local E6/E8a reproduction (schema + CI-exact `--allowedTools`/`--disallowedTools` + fixed agent → `structured_output` present, `is_error: false`); `test-claude-qa-audit.py` static check; requires CI-AUDIT-001V for live confirmation |
| F-2 | Important | No prompt-injection-resistance instruction in workflow prompt or agent definition | Manual review against the Section 6.F threat model | Added an explicit "Prompt-injection resistance" block to the workflow prompt and one sentence to the agent definition | `test-claude-qa-audit.py`: prompt/agent content checks |
| F-3 | Minor | Agent's generic Markdown-heading contract conflicts with the JSON-only invocation contract | Manual review of `.claude/agents/qa-reviewer.md` vs. workflow prompt | One-sentence precedence rule: use the invoking prompt's machine-readable format when required | `test-claude-qa-audit.py` (agent content parses; no behavior change to current pilot, which already dictates JSON) |

## Structured-output status

**Locally confirmed fixed; not yet live-verified.** E8a reproduces the
exact committed post-fix configuration (fixed agent definition +
CI-identical `--allowedTools`/`--disallowedTools` + `--json-schema`) on
CLI 2.1.207 and returns `structured_output` present with `is_error: false`
in 2 turns. This PR's own workflow/agent changes cannot be exercised on
this PR itself (self-modifying-workflow skip, consistent with every prior
CI-002D* PR). CI-AUDIT-001V (not implemented here) must confirm this on a
live post-merge run before the fix is considered fully proven.

## Prompt-injection resistance

Before this audit: implicit only (read-only tools, no comment capability).
After: the workflow prompt explicitly instructs Claude to treat all
reviewed repository content as untrusted data, ignore embedded
instructions, never reveal system/tool/credential configuration, and
report suspected injection attempts as findings; the agent definition
carries the same instruction for any other invocation context. This is
additive guidance layered on the pre-existing structural boundary (no
write/comment/push tools), which remains the primary control.

## Tool-policy review

`--allowedTools "Read,Grep,Glob,Bash(gh pr view:*),Bash(gh pr diff:*)"` /
`--disallowedTools "Write,Edit,NotebookEdit"` — unchanged, verified via
`test-claude-qa-audit.py` to contain no write-capable tool and no
`gh pr comment` capability. No conflict between allow/disallow lists (they
address disjoint tool sets). The `StructuredOutput` addition is to the
agent's own `tools:` allowlist (the SDK's per-agent tool policy), not to
the workflow's `--allowedTools`/`--disallowedTools` CLI flags — it grants
no filesystem, network, or GitHub-mutation capability; it only lets the
agent emit its structured JSON output through the intended internal
channel, confirmed harmless in E7 (present with no schema, run completes
normally).

## Validator review

Unchanged by this audit (zero-line diff against `main`). Re-verified via
the new test suite as fail-closed across: absent/empty output, malformed
JSON, missing/extra fields, wrong types, oversized arrays/strings,
malformed/mismatched SHA, empty expected SHA (fail-closed), control
characters, bidi controls, null bytes, duplicate JSON keys, and a `#`
character in `approval_status`. The one-comment guarantee (catch-all
`except Exception` in `main()`) is independently re-verified by injecting
a synthetic unanticipated exception into `render_success` and confirming
the sanitized failure comment is still written with only the exception's
type name surfaced, never its message.

## Renderer review

Four headings render in `Blockers → Important suggestions → Minor
suggestions → Approval status` order, confirmed programmatically. Array
items always render with a literal `- ` list-item prefix by construction,
which the test suite confirms prevents a hostile array item like
`"## Fake approval heading"` from ever appearing as a bare Markdown
heading in the rendered body (it always appears as `- ## Fake approval
heading`, a list item, not a heading).

## Publisher review

Unchanged. Live pre-post re-check of `headRefOid`/`state`/`isDraft` against
the PR before posting (skips silently when superseded/closed/drafted);
`gh pr comment --body-file` with `GH_TOKEN` scoped via `env:` to this step
alone (confirmed exactly one occurrence of `GH_TOKEN` in the whole
workflow file); posts, then fails the job when validation failed. No
inline review, label, issue, branch, or commit creation exists anywhere in
the workflow.

## Failure-diagnostic review

The sanitizer's `CATEGORIES` set and `classify()` rules were read in full.
Categories are accurately named for what they detect; `structured_output_
error` specifically (success + not error + no structured output) is the
exact category that has appeared in every affected run, and this audit's
fix directly targets its root cause. The sanitizer fails closed on missing
file, invalid/oversized/malformed file, and any unexpected internal
exception (`unknown_safe_error` fallback), verified by the new test suite,
including a live redaction check that Bearer-token-shaped text in a
synthetic error message never reaches the Step Summary or stdout.

## Self-modifying workflow behavior

Confirmed directly from the live run logs of every prior CI-002D* PR (D,
D2, D3, and this task's own expected PR): GitHub's action-level workflow
validation causes `anthropics/claude-code-action` to self-skip when the
calling PR's workflow file differs from the default branch's copy,
producing a `permission_denials_count`-free, zero-turn "workflow
validation" skip rather than any real invocation. This audit's PR is
subject to the identical constraint (it modifies both the workflow and the
agent definition) and therefore explicitly requires CI-AUDIT-001V as a
separate post-merge, documentation-only verification task — not implemented
in this PR.

## Test coverage

New: `.github/scripts/test-claude-qa-audit.py`, stdlib-only, 41
deterministic checks across three areas — invocation contract (15),
embedded validator/renderer (19), sanitizer (5, redaction-focused) — plus
2 local live CLI experiments retained as documented evidence (E6/E8a) for
the structured-output fix, not part of the repeatable CI suite (they
require the Claude Code CLI and network access, unlike the stdlib-only
test file). No new dependency was added; the script uses only
`json`, `os`, `re`, `shlex`, `subprocess`, `sys`, `tempfile`, `types` from
the standard library.

## Secret safety

No secret, token, header, cookie, prompt, transcript, or environment value
appears anywhere in this report, the new test script, or any local
experiment output copied into documentation — confirmed by direct
inspection of every value quoted above and by the new automated redaction
test (`sanitizer: secret-shaped text never reaches summary or stdout`).

## Remaining risks

- F-1's fix is proven locally on the identical CLI version but not yet on
  a live GitHub Actions run of the modified workflow — CI-AUDIT-001V is
  required before treating it as fully resolved in production.
- Other reviewer agent definitions (`security-reviewer.md`,
  `architecture-reviewer.md`, etc.) share the pre-fix `tools:` shape and
  would hit the same F-1 defect if ever invoked with `--json-schema`; none
  currently are, so this is not an active defect, only a latent one
  relevant to CI-003 planning.

## Deferred work

- Sanitizer `classify()`'s `"agent"` needle (under `agent_load_error`) is
  broad enough to also match unrelated error text containing the word
  "agent"; no observed misclassification, deferred pending real evidence.
- No explicit `--max-turns` ceiling; observed runs have stayed well-bounded
  (1–25 turns); deferred as a reliability nice-to-have, not a defect.
- Applying the `StructuredOutput` tools fix to other reviewer agents:
  deferred to CI-003 planning, since they are not currently invoked with
  `--json-schema` and touching `.claude/agents/**` beyond `qa-reviewer.md`
  is out of this task's evidence-based scope.
- `.gitattributes` LF-pinning for `.github/workflows/*.yml` (raised in a
  prior CI-002R security review): still not applied; still theoretical on
  this Windows environment, still not on this task's allowed-files list.

## CI-003 status

Remains blocked. This audit neither authorizes nor implements CI-003; the
structured-output fix must be live-verified (CI-AUDIT-001V) before
Product Architect reconsideration.

## Rollback

Each change is independently and trivially revertible: remove
`StructuredOutput` from `.claude/agents/qa-reviewer.md`'s `tools:` line;
remove the "Prompt-injection resistance" block from the workflow prompt;
remove the one-sentence precedence rule from the agent definition; delete
`.github/scripts/test-claude-qa-audit.py`. No component depends on any of
these in a way that would break if reverted independently.

## Final assessment

**Audit system usable with documented limitations.** The structured-output
defect that blocked CI-002 since CI-002RV now has a locally reproduced
root cause and fix; prompt-injection resistance and output-contract
clarity are hardened; a real automated test suite now exists where none
did before. The one open item is mandatory: a live post-merge run
(CI-AUDIT-001V) to confirm the fix in production, since this PR's own
workflow change cannot prove itself.
