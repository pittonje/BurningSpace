# AGENT-004 — Preparation Agent Pilot Results and Model Routing

## Goal

Record verified Preparation Agent pilot evidence, establish provisional model-routing guidance, standardize repeatable pilot metrics, and register the recurring Claude QA output-length observation as technical debt. AGENT-004 documents evidence only and does not implement automated routing.

## Accepted decisions

- Sonnet is the current default for medium- and high-risk preparation.
- Haiku is provisionally limited to low-risk mechanical preparation with a very small allowlist; it is not declared universally unusable.
- Unresolved architecture always returns to the Product Architect.
- Model escalation cannot authorize architecture invention, scope expansion, new dependencies, or implementation work.
- Preparation Agent remains read-only, Codex remains the sole production-code writer, and no agent may merge pull requests.
- Deterministic documentation checks and Product Architect review are required. Normal automatically triggered Claude QA is expected; no special deep review or specialist reviewer is required.
- Documentation Keeper is conceptually relevant, but no dedicated Documentation Keeper agent exists yet. Its absence does not block AGENT-004, so Codex performs the focused local documentation review without presenting it as Documentation Keeper approval.

## Starting state

- AGENT-002 and AGENT-003 produced two successful Sonnet preparation pilots.
- Preparation model routing and repeatable pilot metrics were not yet documented.
- Routing remained documentation-only with no automated model selection.
- The technical-debt register contained no entry for recurring Claude QA structured-output length sensitivity.

## AGENT-002 evidence

The Haiku attempt failed: it inspected 17 files against an 8-file limit, inspected two forbidden runtime files, ignored a stop condition, proposed runtime assertions for TypeScript-only symbols, and produced malformed, duplicated output. The packet was rejected; this evidence does not establish that Haiku is universally unusable.

The Sonnet attempt required Product Architect correction rounds. Its final packet had zero unresolved questions. Codex read zero additional repository files, used one implementation prompt and one recovery prompt caused by an interrupted continuation rather than missing scope, completed implementation in one session, discovered no missing scope, matched the packet's changed-file count exactly, and had no deviation from the final packet. TEST-002 merged through PR #29.

## AGENT-003 evidence

Sonnet detected that no campaign/outpost domain and no implemented 120-second combat-lock producer existed, then stopped rather than inventing architecture. The Product Architect supplied GAME-001-D1 through GAME-001-D5, and the final packet had zero unresolved questions. Codex read zero additional repository files, used one implementation prompt and no recovery prompt, completed implementation in one session, discovered no missing scope, matched the packet's changed-file count exactly, and had no deviation from the packet. GAME-001 merged through PR #30.

## Model-routing conclusion

Use Haiku provisionally for low-risk mechanical preparation such as formatting, link correction, naming inventory, and simple documentation alignment. Use Sonnet by default for protocol and API boundaries, networking, server authority, gameplay logic, test architecture, dependencies, CI, security, and other medium- or high-risk preparation. Route every unresolved architecture question to the Product Architect. This is guidance only, not automated routing or expanded authority.

## Pilot metric standard

- preparation model;
- source/config files inspected;
- directory listings or repository navigation operations;
- forbidden files inspected;
- unresolved questions;
- packet correction rounds;
- additional files Codex reads;
- implementation prompts;
- recovery prompts;
- implementation sessions;
- missing scope discovered;
- modified-file count versus packet;
- deviations from packet.

File reads and directory listings are recorded separately. No token count is asserted because automatic token accounting does not exist.

## Files changed

- `docs/agents/PREPARATION_AGENT_GUIDE.md`
- `docs/agents/AGENT_ROUTING.md`
- `docs/debt/TECHNICAL_DEBT.md`
- `docs/tasks/agent-004-preparation-agent-pilot-results.md`

## Allowed files

- `docs/agents/PREPARATION_AGENT_GUIDE.md`
- `docs/agents/AGENT_ROUTING.md`
- `docs/debt/TECHNICAL_DEBT.md`
- `docs/tasks/agent-004-preparation-agent-pilot-results.md`

## Forbidden files

Runtime applications and packages, agent definitions, workflows, scripts, manifests, dependencies, test configuration, durable project context, the current handoff, existing tests, `AGENT_SYSTEM.md`, and `AGENTS.md` remain unchanged. AGENT-004 does not implement CI-003.

## Acceptance criteria

- The Preparation Agent guide contains the required sections, model guidance, 13 pilot metrics, successful pilot baselines, and current limitations.
- Routing guidance is additive and links to the guide without altering the existing routing table or rules.
- Exactly one open TD-001 entry records verified evidence without claiming a root cause or authorizing CI work.
- Pilot figures match accepted evidence and do not include invented token counts.
- Role names and authority boundaries remain consistent with the agent system.
- Exactly four authorized documentation files change and no executable file changes.

## Validation

- Run `git diff --check`, `git status --short`, and `git diff --stat`.
- Verify guide section order, all 13 metrics, additive routing, the guide link, a single TD-001 entry, existing referenced paths, terminology, pilot figures, and the absence of automated-routing claims.
- Verify exact forbidden-path diffs are empty.
- Perform `Local AGENT-004 documentation review — performed by Codex.`
- Do not run install, test, build, or typecheck commands because the task is documentation-only.

## Known limitations

- Evidence covers only two successful Sonnet pilots.
- Model routing and token accounting are not automated.
- Dedicated Test Architect and Documentation Keeper agents do not yet exist.
- Preparation Agent remains read-only, and Product Architect review remains mandatory.

## Rollback

Revert the single AGENT-004 documentation commit. No runtime, workflow, dependency, stored-state, or deployment rollback is required.
