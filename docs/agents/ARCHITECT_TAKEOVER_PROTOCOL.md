# BurningSpace Architect Takeover Protocol

- Status: Candidate until human merge
- Program: DOCARCH-004
- Stage: DOCARCH-004B
- Baseline: merged DOCARCH-004A / PR #49
- Accepted decisions: 35
- New decisions introduced: none
- Chat history required: no
- Repository mutation during recovery: prohibited
- Independent validation: required through DOCARCH-004C

This is an operational recovery protocol. It does not replace accepted
decisions, governance, or the canonical roadmap. Accepted decisions remain
canonical in their domains. Mutable GitHub state is supporting operational
evidence only, and implementation evidence cannot establish product or
architecture authority. This protocol becomes active only after human merge.
DOCARCH-004 remains open pending independent DOCARCH-004C validation.

## 1. Purpose

This protocol lets a newly assigned Product Architect perform a cold takeover
without prior chat context. It provides a reproducible method to recover
repository authority, current program state, bounded work, unresolved gates,
merge and evidence requirements, and exactly one safe next action. Its purpose
is safe continuation without invented authority and with conclusions that a
second independent reviewer can reproduce.

## 2. Scope and non-goals

In scope are repository identity, authority discovery, accepted-registry
verification, current program and work recovery, stale-state reconciliation,
next-action arbitration, stop conditions, merge and evidence recovery, and
takeover success criteria.

Out of scope are model or vendor selection, gameplay or architecture design,
changing accepted decisions, performing implementation work, modifying
repository protection, and executing DOCARCH-004C.

## 3. Core safety rule

The entire takeover discovery and reconciliation phase is read-only.

Before takeover success is declared, the incoming architect must not edit
files; create branches or commits; push; open or merge pull requests; alter
issues, checks, protection, secrets, or workflows; approve implementation
work; or invent missing decisions. Commands that only inspect the local
repository or remote metadata are allowed.

If discovery reveals a correction or implementation need, record it in the
takeover report and derive the one next safe action. Mutation begins only
later, under committed bounded scope.

## 4. Canonical cold-start entrypoint

The single cold-start entrypoint is `PROJECT_CONTEXT.md`. It directs an
incoming Product Architect to this protocol.

`AGENTS.md` and `CLAUDE.md` are entrypoint adapters. They may link to this
protocol but must not maintain independent competing takeover sequences.
`docs/agents/context-usage.md` defers Product Architect cold takeover here.

## 5. Required reading sequence

Read in this deterministic order:

1. `PROJECT_CONTEXT.md`.
2. `docs/agents/ARCHITECT_TAKEOVER_PROTOCOL.md`.
3. `docs/GOVERNANCE.md`.
4. `docs/decisions/README.md`.
5. `docs/decisions/DECISION_INDEX.md`.
6. All accepted process and architecture records needed to understand
   authority.
7. Accepted mechanics records relevant to the current program.
8. `docs/roadmap/CANONICAL_DEVELOPMENT_ROADMAP.md`.
9. `docs/handoffs/CURRENT.md`.
10. The task and review artifacts named by `CURRENT.md`, when valid.
11. Merged task and review artifacts needed to reconcile stale state.
12. Repository history and current Git or pull-request metadata.
13. Runtime implementation only where necessary to verify implementation
    state.

Reading is sufficient only when the incoming architect can account for the
repository identity, authority precedence, accepted decision count, current
program, current bounded stage, `CURRENT.md` freshness, active task and review
status, exact scope, unresolved gates, forbidden actions, merge authority, and
one safe next action.

## 6. Authority precedence

`docs/GOVERNANCE.md` governs document classification and conflict handling.
Within that governance envelope, use the following recovery precedence for
takeover claims:

1. Accepted decision records for the domains they govern.
2. Governance and accepted process records.
3. The canonical roadmap.
4. Merged bounded task and review evidence containing explicit Product
   Architect approval.
5. `PROJECT_CONTEXT.md` durable navigation and program summary.
6. The active bounded task.
7. `CURRENT.md` operational handoff.
8. Current repository implementation as evidence.
9. Git history and historical documents as background.
10. Chat history is unavailable and has no authority.

This ordered recovery view does not override the governance hierarchy:
governance remains controlling, and accepted decisions override lower-layer
summaries in their domains. Git and GitHub can prove that a branch or pull
request is merged, closed, open, or stale; they cannot establish product or
architecture semantics. A newer lower-authority source cannot override a
higher-authority accepted decision. Ambiguity between claims of equal
authority is a stop condition.

## 7. Repository identity and read-only preflight

Record the repository remote, default branch, current local branch, local
`HEAD`, `origin/main`, tracked clean or dirty state, untracked files, current
worktree, and current pull-request state when available.

Use read-only commands equivalent to:

```text
git remote -v
git status --short --branch
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
git log --oneline --decorate -12
```

Remote inspection such as `gh pr view` is allowed but remains point-in-time
evidence. Preflight must not fetch, checkout, reset, stash, clean, create a
branch, or otherwise mutate the repository during recovery.

## 8. Accepted-registry verification

Read `docs/decisions/DECISION_INDEX.md`, enumerate the individual decision
record files, and verify each accepted status, the total, and category counts.
Compare the index with the files and stop on an unexplained mismatch.

The point-in-time baseline for this protocol is 35 accepted records:

- 18 `BS-MECH`;
- 5 `GAME-001`;
- 7 `BS-ARCH`;
- 4 `BS-PROC`;
- 1 `CI`.

Future legitimate accepted-decision work may change these counts only through
its governed process. If this protocol continues to state a baseline count,
that bounded work must update it.

## 9. Current-state evidence ledger

Create a written or structured ledger before drawing a current-state
conclusion. For every claim record:

- the claim;
- its source;
- authority level;
- freshness evidence;
- status as `confirmed`, `stale`, `conflicting`, `absent`, or
  `external-only`;
- the consequence.

At minimum, ledger the active program, active stage, active branch, active
task, active review, expected changed paths, reviewer requirements, closure
conditions, and next safe action.

## 10. CURRENT freshness test

`CURRENT.md` is fresh only when every applicable condition is true:

- the named branch exists, or its explicitly documented no-branch state is
  valid;
- the named pull-request state agrees with the claimed stage;
- named task and review paths exist;
- task and review metadata agree;
- the active branch contains the named task and review artifacts;
- no later human-merged bounded stage supersedes the claim;
- the named next action has not already been consumed;
- the roadmap and merged Product Architect staging evidence permit the named
  work;
- required predecessor stages are complete;
- `CURRENT.md` contains exactly one next safe action.

If any required condition fails, classify `CURRENT.md` as stale. Staleness is
a state to reconcile, not a claim that `CURRENT.md` is permanently unreliable.

## 11. Stale-CURRENT reconciliation procedure

Use this deterministic, read-only procedure:

1. Freeze repository mutation.
2. Record every `CURRENT.md` claim in the evidence ledger.
3. Verify `origin/main` and recent merge history.
4. Identify the latest human-merged bounded stage represented on
   `origin/main`.
5. Read that stage's task, review evidence, and closure state.
6. Determine whether an open branch or pull request represents authorized
   successor work.
7. Verify that successor work has a committed bounded task and exact scope.
8. Compare candidate work with the canonical roadmap and merged Product
   Architect staging approval.
9. Classify operational state as exactly one of:
   - active valid stage;
   - completed stage with no active successor branch;
   - stale handoff with one authorized successor;
   - ambiguous successor state;
   - unauthorized or conflicting work.
10. Derive the sole next action using section 15.
11. Produce the takeover report.
12. Do not update `CURRENT.md` during discovery.
13. Implement any `CURRENT.md` correction later through a bounded, reviewed
    documentation task.

This procedure applies when the named branch was merged or deleted,
`CURRENT.md` names a closed task or consumed merge action, several task files
appear plausible, no active task exists, task and review metadata disagree,
or remote GitHub state is unavailable. When GitHub is unavailable, classify
its facts as unavailable and continue only if local repository evidence is
sufficient; otherwise stop.

## 12. Active-work recovery

Valid active work requires all applicable evidence:

- explicit authorization from the roadmap or merged Product Architect
  evidence;
- a committed bounded task;
- exact changed-path scope;
- a matching branch or open pull request;
- predecessor completion;
- compatible task and review metadata;
- no higher-authority conflict.

An open branch alone is not authorization. An uncommitted chat packet is not
repository authority. If an authorized next stage exists but no committed
task or branch exists, classify it as authorized next work, not active
implementation.

## 13. Exact-scope recovery

Recover scope only from a committed bounded task artifact. The scope must
identify allowed paths, forbidden paths, intended outputs, reviewer set,
validation requirements, closure conditions, and the next-stage boundary.

If no committed exact scope exists, implementation must not begin. The sole
next action is creation and review of a bounded task packet as an explicit
scope-reconciliation task. Previous chat instructions are not recoverable
scope.

## 14. Unresolved decision-gate recovery

Inspect accepted decision records, the canonical roadmap decision-gate table,
the active task, and unresolved questions in merged review artifacts. Produce
a list of every gate that blocks the proposed next work.

No implementation may cross a blocking gate. Missing values or algorithms
must not be inferred from runtime placeholders, historical prose, or developer
preference.

## 15. Sole-next-action arbitration

The takeover report must contain exactly one next action. Select it by the
first applicable case below.

### Case 1 - Valid active pull request or bounded stage exists

The next action is the next unmet closure requirement of that same stage:
implementation, independent review, Product Architect approval, evidence
completion, fresh final-head checks, or human merge. Do not start a successor
stage.

### Case 2 - Previous stage is merged and exactly one successor is explicitly authorized

If a committed task and active branch already exist, continue that bounded
stage. If no committed task exists, the next action is: **Prepare and review a
bounded task packet for the authorized successor stage.** Implementation does
not begin yet.

### Case 3 - No successor is explicitly authorized

The next action is: **Product Architect records a bounded staging or decision
resolution.** No implementation begins.

### Case 4 - Several plausible successors remain

The next action is: **Product Architect performs a bounded reconciliation
decision selecting one successor.** Do not choose by convenience, branch age,
unfinished code, or chat memory.

### Case 5 - Authority or evidence conflict remains

The next action is: **Stop implementation and create a bounded
authority-reconciliation task.**

## 16. Stop conditions

Stop immediately when:

- the accepted decision count or index is inconsistent;
- authority sources conflict without a precedence resolution;
- `CURRENT.md` cannot be reconciled;
- active scope is absent;
- several next actions remain;
- a blocking decision gate remains;
- branch or pull-request evidence contradicts task state;
- task and review artifacts disagree materially;
- repository identity is uncertain;
- required human merge authority cannot be established;
- external evidence is unavailable and local evidence is insufficient;
- tracked working state is unexpectedly dirty;
- requested work would cross bounded scope.

A stop condition is a valid takeover outcome only when the sole next action is
an explicit reconciliation task. Takeover status remains incomplete until all
success criteria pass.

## 17. Forbidden actions

Canonical or accepted prohibitions are:

- do not invent decisions;
- do not treat implementation as accepted authority;
- do not cross unresolved gates;
- do not replace independent review with self-review;
- do not treat green checks as Product Architect approval;
- do not permit automated merge;
- do not rewrite evidence history.

Default task-level safety conventions are:

- do not broaden scope or edit unrelated files;
- do not use `git add .` or `git commit -a`;
- do not amend;
- do not rebase or force-push without explicit bounded authority;
- do not perform unrelated cleanup;
- do not modify workflows to bypass a failed review.

Task-level conventions apply unless an explicit bounded task authorizes
otherwise. Such authorization does not override accepted decisions or
governance.

## 18. Merge authority and evidence recovery

Recover and record the human-only merge policy, Product Architect approval,
independent reviewer verdicts, Claude QA evidence, evidence commit, final-head
checks, head-SHA binding, and self-review limitations.

- Only the human merge authority performs the merge; agents and automation do
  not merge.
- Successful checks do not equal approval.
- Approval on an older SHA is not final-head evidence.
- An evidence commit does not need to reference its own SHA.
- Required checks must pass on the evidence-commit `HEAD`.
- Branch protection is mutable external evidence and cannot weaken repository
  policy.
- Inability to inspect GitHub protection does not permit automated merge.

Product Architect approval must be attributable to the pull request and
reviewed commit. Required independent and Claude QA verdicts must be bound to
their reviewed commits. The implementer cannot substitute self-review for a
required independent verdict.

## 19. Required takeover report

Every takeover produces a report containing:

- repository and worktree;
- local branch, `HEAD`, and `origin/main`;
- authority sources read;
- accepted count and categories;
- current program and stage;
- `CURRENT.md` freshness verdict;
- latest completed bounded stage;
- active task, review, branch, and pull request;
- exact permitted scope;
- unresolved gates;
- forbidden actions;
- merge authority and evidence state;
- sole next safe action;
- stop conditions or blockers;
- external-state dependencies;
- confidence and reproducibility evidence.

The report must cite repository paths and commit or pull-request evidence where
relevant. It must distinguish repository authority from mutable external
observations.

## 20. Takeover success criteria

A takeover succeeds only when all are true:

1. Repository identity is verified.
2. Recovery was performed without chat history.
3. Discovery was read-only.
4. Authority precedence is correctly stated.
5. Accepted decision count and categories are verified.
6. Current program and bounded stage are identified.
7. `CURRENT.md` is classified as fresh or reconciled as stale.
8. The latest completed stage is identified.
9. Active work is identified or its absence is established.
10. Exact committed scope is recovered, or its absence is explicitly
    identified.
11. Unresolved decision gates are listed.
12. Forbidden actions are listed.
13. Merge authority and evidence requirements are recovered.
14. Exactly one safe next action is produced.
15. No unsupported semantic decision is introduced.
16. A second independent reviewer can reproduce the conclusion from
    repository evidence.

If any criterion fails, takeover is not complete. The protocol may still
produce a safe stop action, but the report must state that takeover is
incomplete.

## 21. DOCARCH-004C validation contract

The future independent drill must validate these scenario classes against the
merged protocol:

- fresh `CURRENT.md` and active implementation;
- stale `CURRENT.md` after human merge;
- merged or deleted named branch;
- consumed next action;
- no active task;
- conflicting task and review artifacts;
- multiple plausible successor stages;
- unresolved decision gate;
- unavailable GitHub external evidence;
- an uncommitted stage packet unavailable to the replacement architect.

The drill requires a clean context, no previous chat access, repository-only
authority recovery, no repository mutation during discovery, a written
takeover report, predeclared expected truth, pass/fail comparison, an
independent reviewer, exact-next-action evaluation, and reproducibility.

This PR does not create a drill task, instructions packet, results, or
simulated evidence and does not perform the drill.

## 22. Failure modes

The protocol fails if the incoming architect trusts stale `CURRENT.md`, treats
an open branch as authorization, treats chat instructions as committed scope,
selects among tasks by convenience, treats GitHub configuration as policy,
treats runtime placeholders as decisions, starts a successor before its
predecessor closes, merges on green checks without approval, or updates
`CURRENT.md` during discovery and thereby hides the original conflict.

## 23. DOCARCH-005 boundary

DOCARCH-005 owns vendor/model-independent role definitions, minimum capability
requirements, model portability, fallback routing, model replacement, prompt
and adapter portability, and AGENT-004 recovery or creation.

DOCARCH-004 defines repository-authority recovery by a competent replacement
architect. It does not select or evaluate vendors or models.

## 24. Protocol maintenance

Any protocol change requires a bounded task, independent review, Product
Architect approval, Claude QA evidence, final-head checks, and human merge.
Adapters must link to this protocol and must not duplicate competing takeover
algorithms.
