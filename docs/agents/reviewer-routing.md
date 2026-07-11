# Reviewer Routing

## Purpose

Select review domains from the actual change surface and risk, not from a fixed all-reviewers checklist. Every task declares its reviewer set before implementation.

## General rules

- `Required` reviewers must approve before a task is ready for human merge review.
- `Recommended` reviewers should run unless the task records a concrete non-applicability reason.
- `Optional` reviewers may be requested for useful secondary coverage.
- `Not applicable` means the domain is not materially affected; task files still record the reason when omission could be ambiguous.
- Reviewers remain read-only, cite repository evidence, and do not authorize implementation outside task scope.
- One change may require several reviewers. Overlap is intentional at trust, authority, and presentation boundaries.

## Reviewer matrix

| Change type | Architecture | Network | Security | QA | Gameplay | Visual |
|---|---:|---:|---:|---:|---:|---:|
| Documentation-only | Recommended | Optional | Optional | Optional | Optional | Optional |
| Package-boundary migration | Required | Recommended | Optional | Required | Recommended | Optional |
| Dependency or lockfile change | Required | Optional | Required | Required | Optional | Optional |
| Client/server protocol change | Required | Required | Recommended | Required | Recommended | Optional |
| Colyseus room or schema change | Required | Required | Recommended | Required | Recommended | Optional |
| Server input validation | Recommended | Required | Required | Required | Required | Not applicable |
| Authentication or persistence | Required | Required | Required | Required | Recommended | Optional |
| Deployment/environment configuration | Recommended | Recommended | Required | Required | Not applicable | Not applicable |
| Gameplay rule change | Recommended | Recommended | Recommended | Required | Required | Recommended |
| Balance constant change | Recommended | Optional | Optional | Required | Required | Recommended |
| Campaign system implementation | Required | Required | Required | Required | Required | Recommended |
| Local prototype change | Optional | Not applicable | Optional | Required | Required | Recommended |
| UI layout change | Optional | Optional | Optional | Required | Recommended | Required |
| Asset addition/replacement | Optional | Not applicable | Optional | Required | Recommended | Required |
| Loader-path change | Recommended | Not applicable | Optional | Required | Optional | Required |
| VFX/readability change | Optional | Optional | Optional | Required | Required | Required |
| Pure backend refactor | Recommended | Recommended | Recommended | Required | Optional | Not applicable |
| Security hardening | Recommended | Recommended | Required | Required | Optional | Optional |
| Test/diagnostic-only change | Optional | Recommended | Recommended | Required | Recommended | Optional |

The matrix gives defaults. A task may strengthen them based on risk, but weakening a `Required` trigger needs Product Architect approval and a written reason.

### Architecture Reviewer

Required for package boundaries, workspace dependencies, authority separation, major module structure, persistence architecture, and cross-package ownership. Architecture approval does not replace specialist approval.

### Network Reviewer

Required for protocol exports, message names/payloads, Colyseus rooms/schemas, input handling, snapshots, connection lifecycle, and client/server network consumers. Test-room registration and network diagnostics are at least Recommended.

### Security Reviewer

Required for client-to-server validation, authentication/accounts, persistence, secrets/environment, deployment, debug/test endpoints, dependency exposure, external services, rate limiting, and administrative functionality. Recommended for new rooms/endpoints and large dependency changes.

### QA Reviewer

Required for implementation, verification, migration, bug-fix, and release-readiness PRs. Optional for narrowly editorial documents when no executable behavior, acceptance evidence, or workflow invariant changes.

### Gameplay Reviewer

Required for movement, combat, health/damage, death/respawn, factions/spectators, ships, resources, mining, sectors, outposts, portals, creeps, campaign progression, and runtime balance. Recommended when constants/config can influence gameplay. The preserved local prototype and authoritative multiplayer path must be evaluated separately.

### Visual Design Lead

Required for visual assets, faction identity, UI/HUD presentation, VFX/readability, loader paths, asset naming/provenance, and generated-art briefs. Recommended for major player-facing scenes. Missing final art alone never blocks an unrelated backend or structural PR.

Visual, Graphics, VFX, and UI work stays within approved asset/presentation paths and briefs. It must not modify server authority, protocol, shared gameplay contracts, or balance without the corresponding task and reviewers.

## Reviewer selection in task files

Every new task declares:

- Required reviewers and why each trigger applies.
- Recommended/optional reviewers selected for secondary risk.
- Skipped reviewers and a short reason they are not applicable.

Review execution is sequential when independence matters. A report must name the reviewed commit and remain read-only.

## Review report naming

Store reports as `docs/reviews/<task>-<reviewer>-review.md`, for example `docs/reviews/pr-007-network-review.md`.

## Approval semantics

- Approval applies only to the reviewer's domain and reviewed commit.
- Product Architect resolves conflicts, requirement ambiguity, and severity disputes.
- Codex remains the primary implementer; reviewer findings do not grant edit authority.
- QA approval does not replace Security, Network, Gameplay, or Architecture approval.
- Visual approval does not grant gameplay or server-authority approval.
- Gameplay approval does not authorize protocol, validation, or server-authority changes outside the approved gameplay-rule scope.
- Security approval does not establish gameplay correctness.
- A blocker stops readiness but does not expand the task scope; out-of-scope fixes become separate tasks.
