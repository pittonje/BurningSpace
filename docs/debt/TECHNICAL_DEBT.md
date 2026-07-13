# BurningSpace Technical Debt

## Usage rules

- Record confirmed findings outside the active task instead of fixing them opportunistically.
- A technical-debt entry does not authorize implementation or scope expansion.
- The Product Architect controls priority, status, and future-task authorization.
- Search for duplicates first; a duplicate references the existing entry rather than creating a second record.
- Evidence must be concise, reproducible, and free of secrets.
- Resolved entries remain as concise historical records and name the resolving task or pull request.
- Do not migrate historical findings into this register during AGENT-001.

## Entry template

## TD-000 — Title

- Status:
- Priority:
- Source task:
- Area:
- Evidence:
- Risk:
- Suggested future task:
- Dependencies:
- Created:
- Resolved by:

## TD-001 — Claude QA structured-output length sensitivity

- Status: Open
- Priority: Medium
- Source task: AGENT-004
- Area: Claude QA structured output
- Evidence: On PR #28 and PR #30, the first QA run exceeded a deterministic schema field-length limit; rerunning on the unchanged HEAD succeeded. This did not indicate an implementation defect, and no root cause has been conclusively established.
- Risk: A valid review may initially fail publication or validation, delaying a pull request and obscuring the distinction between automation output failure and an implementation finding.
- Suggested future task: Make reviewer output reliably remain within schema limits without weakening validation.
- Dependencies: Product Architect authorization for any workflow, schema, or reviewer change; TD-001 does not authorize such a change inside AGENT-004.
- Created: 2026-07-13
- Resolved by: Not resolved
