# BurningSpace Preparation Agent Guide

## Purpose

The Preparation Agent turns an accepted task into a concise, implementation-ready packet by inspecting the smallest relevant repository slice. It is advisory and read-only: the Product Architect accepts decisions and scope, while Codex remains the sole production-code writer.

## When to use Preparation Agent

Use the Preparation Agent when implementation benefits from an exact file allowlist, existing-symbol inventory, deterministic test matrix, validation commands, forbidden changes, and explicit stop conditions. It is especially useful before boundary-sensitive, gameplay, networking, dependency, CI, security, and test-architecture work.

## When not to use it

Do not use the Preparation Agent to invent unresolved architecture, implement changes, perform open-ended repository audits, approve its own packet, replace deterministic validation, or merge a pull request. A trivial task that is already implementation-ready may not need a preparation pass.

## Model routing

Model selection is provisional and risk-based. Capability does not grant authority.

### Haiku

Use Haiku provisionally only for low-risk mechanical preparation such as formatting, link correction, naming inventory, simple documentation alignment, and similarly bounded tasks with a very small allowlist. The rejected AGENT-002 attempt limits the current routing recommendation; it does not establish that Haiku is universally unusable.

### Sonnet

Sonnet is the current default for protocol and API boundaries, networking, server authority, gameplay logic, test architecture, dependencies, CI and security, and other medium- or high-risk preparation.

### Architecture uncertainty

Always return unresolved architecture to the Product Architect. A larger model does not authorize architecture invention, scope expansion, new dependencies, or implementation work.

## Required task input

Preparation requires an accepted goal, current architectural decisions, exact non-goals, known ownership constraints, applicable repository instructions, and enough risk context to select a bounded read set and reviewer route. Missing decisions are questions for the Product Architect, not assumptions for the packet.

## Repository inspection limits

Inspect only the smallest source and configuration slice required by the task, normally the 3–8 exact paths expected by the Implementation Packet template. Treat source or configuration file reads separately from directory listings and repository-navigation operations: both are measured, but a listing is not counted as a file read. Record forbidden reads explicitly and stop before expanding beyond the accepted limit.

## Stop-condition behavior

Stop and return the unresolved question when architecture, scope, dependencies, ownership, security boundaries, or required evidence cannot be resolved inside the accepted task. Preserve what was learned, identify the decision owner, and do not invent a design or continue into implementation.

## Implementation Packet acceptance checklist

- The Product Architect has accepted all architecture and scope decisions.
- The goal, non-goals, exact read set, and exact modification allowlist are explicit.
- Existing symbols and dependency direction are grounded in inspected evidence.
- Required changes and deterministic test cases have observable outcomes.
- Validation commands already exist in the repository.
- Forbidden changes and stop conditions prevent silent scope expansion.
- Reviewer routing matches the documented risk fields.
- No unresolved question remains and no implementation work is included.

## Codex handoff

After Product Architect acceptance, hand Codex one packet with exact paths, changes, tests, validation, commit constraints, and final-report requirements. Codex verifies branch and worktree state, performs the accepted implementation, and reports deviations. The packet cannot authorize scope expansion, and neither Codex nor any other agent may merge the pull request.

## Pilot metrics

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

File reads and directory listings are deliberately separate measures: opening source or configuration content measures evidence consumption, while listings and navigation measure repository discovery without implying that file content was read. Do not invent token counts.

## Successful pilot baselines

### AGENT-002 / TEST-002

The accepted Sonnet packet reached zero unresolved questions after Product Architect correction rounds. Codex read zero additional repository files, used one implementation prompt and one recovery prompt caused by an interrupted continuation rather than missing scope, completed implementation in one session, discovered no missing scope, matched the packet's changed-file count exactly, and had no deviation from the final packet. The work merged through PR #29.

### AGENT-003 / GAME-001

Sonnet detected the missing campaign/outpost domain and combat-lock producer and stopped instead of inventing architecture. After the Product Architect supplied GAME-001-D1 through GAME-001-D5, the final packet had zero unresolved questions. Codex read zero additional repository files, used one implementation prompt and no recovery prompt, completed implementation in one session, discovered no missing scope, matched the packet's changed-file count exactly, and had no deviation from the packet. The work merged through PR #30.

## Current limitations

- Only two successful Sonnet pilots are available.
- Model routing is not automated.
- Token accounting is not automatic.
- No dedicated Test Architect agent exists yet.
- No dedicated Documentation Keeper agent exists yet.
- The Preparation Agent remains read-only.
- Product Architect review remains mandatory.
