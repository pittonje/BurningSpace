# BurningSpace Agent Routing

## Purpose

Review effort is selected from the actual change risk. Deterministic checks always run when applicable, while human and agent reviewers are added only for the risk domains they cover. AGENT-001 defines this policy but does not automate routing or GitHub labels.

## Risk fields

Every Task Definition or Implementation Packet assesses these fields:

| Field | Question |
|---|---|
| runtime | Can executable behavior or startup behavior change? |
| networking | Can connection, synchronization, validation, or authority behavior change? |
| security | Can permissions, trust boundaries, secrets, or untrusted-input handling change? |
| protocol | Can public contracts, messages, payloads, serialization, or compatibility change? |
| persistence | Can stored data, migrations, recovery, or deployment state change? |
| performance | Is measured latency, throughput, memory, build size, or resource use affected? |
| ci | Can required checks, automation, credentials, or release gates change? |
| documentation | Can operational or durable project guidance change or drift? |

Allowed levels are `none`, `low`, `medium`, and `high`.

- `none`: the field is not touched.
- `low`: localized, declarative, or easily reversible impact.
- `medium`: behavior or a boundary changes but has focused validation and rollback.
- `high`: authority, security, persistence, compatibility, or broad operational behavior can fail materially.

## Routing table

| Change class | Typical risk | Required deterministic evidence | Routed review |
|---|---|---|---|
| Documentation-only | documentation low–medium; other fields none | Link/path checks, content checks, and forbidden diffs | Documentation Keeper; Claude QA optional |
| Type-only or import-boundary | runtime low; protocol low–medium | CI-001 and focused compatibility checks | Lightweight QA; API Guardian when a public boundary changes |
| Unit-test-only | runtime none unless helper extraction occurs; documentation low | CI-001, tests run twice when determinism matters | Test Architect matrix; Claude QA optional unless runtime code is extracted |
| Gameplay authority or state transition | runtime high; networking medium–high | CI-001 plus focused deterministic state-transition tests | Test Architect, Claude QA, and Multiplayer Reviewer required |
| Network or protocol | networking/protocol medium–high | CI-001 plus compatibility, validation, and synchronization evidence | Test Architect, API Guardian, and Claude QA required; Multiplayer Reviewer also required for authority or synchronization changes |
| Workflow or security | security/ci high | Safe local validation, CI execution, and explicit post-merge verification plan | Security/CI Reviewer and Claude QA required; post-merge verification required |
| Performance | performance medium–high only after measurement | Reproducible baseline and post-change measurements | Performance Analyst only after measured evidence exists; no speculative optimization task |

## Routing rules

- Record a level for every risk field, even when it is `none`.
- Route the smallest reviewer set that covers all non-`none` material risks.
- A high-risk field cannot be downgraded merely to avoid a reviewer.
- Not every reviewer is required on every pull request.
- Optional review does not become mandatory without an accepted task update.
- Reviewer findings cannot expand the active PR automatically.
- A specialist review reports within its domain and does not replace deterministic CI.
- Routing decisions belong in the Task Definition or accepted Implementation Packet.

## Current limitation

Routing is documentation-only. No workflow, label, bot, or automatic agent invocation implements this table yet.
