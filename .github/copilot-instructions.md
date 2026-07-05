# GitHub Copilot Instructions

Before suggesting code, read:

- `AGENTS.md`;
- `docs/design/GAME_VISION.md`;
- `PLANS.md`;
- relevant files under `docs/design`, `docs/architecture`, and `docs/adr`.

## Core Rules

- Keep gameplay server-authoritative.
- Do not add production account, economy, database, auth, or pilot service skeletons unless the task explicitly approves implementation.
- Do not add dependencies without justification.
- Do not commit secrets.
- One task should map to one branch and one PR.

## Required Commands

```bash
npm install
npm test
```

## PR Expectations

- State scope and out-of-scope work.
- Link updated docs/ADR when architecture changes.
- List tests run.
- Call out open decisions and risks.

