# AGENT-001 — Agent Collaboration Foundation

## Goal

Define the minimal repository foundation for bounded multi-agent preparation, implementation, testing, review, documentation, and technical-debt recording while keeping Codex as the sole production-code writer.

## Starting state

- Full Claude QA is restored and documented on `main` after CI-AUDIT-001V.
- TEST-001 is merged on `main` and deterministic unit tests are available.
- CI-001 is operational.
- Reviewer guidance exists, but there is no automated risk routing.
- No shared Implementation Packet contract or Preparation Agent exists.

## Role boundaries

The Product Architect owns scope and accepted decisions. The Preparation Agent produces advisory implementation packets. Codex alone changes production code. Test Architect and Documentation Keeper roles prepare bounded artifacts. Claude QA and specialist reviewers remain independent and read-only toward production code. No agent merges pull requests.

## Artifact flow

Product decision → Implementation Packet → Codex implementation → deterministic CI → risk-routed review → Codex corrections → human merge.

Only an accepted Task Definition authorizes work. Packets, test matrices, reviews, reports, and debt entries cannot expand scope automatically.

## Preparation Agent

The first Preparation Agent reads the accepted task and the smallest directly relevant repository slice, inventories symbols and dependency direction, identifies exact files and tests, and returns one concise packet. Its tool allowlist is read-only and it cannot implement, commit, invoke agents, approve itself, or merge.

## Routing model

Tasks assess runtime, networking, security, protocol, persistence, performance, CI, and documentation risk as none, low, medium, or high. The smallest reviewer set covering material risks is routed; mandatory all-reviewer fan-out is explicitly avoided. AGENT-001 does not automate routing.

## Technical-debt policy

Confirmed findings outside active scope are recorded rather than fixed. Entries preserve evidence and proposed future work but grant no implementation authority. The Product Architect owns prioritization, and resolved entries remain concise historical records.

## Allowed files

- `AGENTS.md`
- The three AGENT-001 documents under `docs/agents/`
- `docs/tasks/IMPLEMENTATION_PACKET_TEMPLATE.md`
- This task document
- `docs/debt/TECHNICAL_DEBT.md`
- `.claude/agents/preparation-agent.md`

## Forbidden files

Runtime applications and packages, workflows and workflow scripts, manifests and dependencies, Vitest configuration, assets, review reports, current handoff, durable project context, and the existing QA reviewer definition remain unchanged.

## Acceptance criteria

- Production-code ownership is unambiguous and belongs only to Codex.
- Roles, lifecycle, one-task ownership, read-only review, isolation, scope control, human authority, and stop conditions are documented.
- Risk-based routing covers the required change classes without mandatory all-reviewer fan-out.
- Eight artifact contracts define ownership, fields, size, location, and authority.
- The Implementation Packet template is implementation-ready and concise.
- The Preparation Agent is structurally read-only and follows the required process and output.
- Technical-debt recording does not authorize immediate fixes.
- All internal paths exist and forbidden diffs are empty.

## Validation

Run Git whitespace, status, diff, path-existence, content-consistency, and forbidden-path checks. Confirm no runtime, dependency, workflow, QA reviewer, current handoff, or durable context change.

Reviewer routing: Documentation Keeper concern and deterministic documentation checks apply. Claude QA provides independent PR review. Runtime, networking, protocol, persistence, performance, gameplay, dependency, and workflow/security specialist review are not required because those fields remain `none`.

## Known limitations

- Routing is documentation-only.
- No automatic agent invocation exists.
- The Preparation Agent has not yet been piloted.
- Token savings are not yet measured.
- Documentation Keeper, Test Architect, and specialist agent definitions are not implemented in AGENT-001.

## Rollback

Remove the seven new documentation/agent files and revert the narrow `AGENTS.md` links and ownership sentence. No runtime, dependency, data, or workflow rollback is required.
