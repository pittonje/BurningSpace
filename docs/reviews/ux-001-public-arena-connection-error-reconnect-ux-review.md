# UX-001 — Public Arena Connection, Error, and Reconnect UX Review

## Metadata

- Status: `PENDING`
- Task: `UX-001 — Public Arena Connection, Error, and Reconnect UX`
- Branch: `TBD`
- Base: `TBD`
- Reviewed commit: `TBD`
- Pull request: `TBD`

Review evidence must distinguish actual network lifecycle truth from
player-facing rendered state and from non-binding implementation suggestions.
Do not infer successful connection or reconnection from presentation alone.

## 1. Scope verification

- [ ] Changes remain within the task's bounded client-only implementation
      scope and authorized test/evidence paths.
- [ ] No server, protocol, schema, shared-contract, dependency, deployment,
      gameplay, campaign, or accepted-decision change is present.
- Evidence:

## 2. Client lifecycle state model

- [ ] Idle, initial connecting, connected/ready, connection lost,
      reconnecting, reconnected, and terminal failure semantics are explicit.
- [ ] Actual lifecycle truth, rendered state, and transient presentation are
      distinguishable in code and tests.
- Evidence:

## 3. Initial connection UX

- [ ] Initial progress, actual join success, bounded failure, and safe retry
      behavior match the task.
- [ ] A failed join is not obscured by a follow-on profile action.
- Evidence:

## 4. Disconnect UX

- [ ] Unexpected loss is visible and is not presented as still connected.
- [ ] Consented disconnect remains idle, idempotent, and reconnect-free.
- Evidence:

## 5. Reconnect UX

- [ ] Active reconnect is distinct from initial connection and terminal
      failure.
- [ ] Reconnected is based on actual reconnect success and authoritative room
      rebinding, not a UI timer or heuristic.
- Evidence:

## 6. Terminal failure / recovery

- [ ] Automatic attempts stop after the NET-001 bounded operation.
- [ ] Recovery uses the existing scene architecture and does not fabricate
      continuity or silently create a replacement session.
- Evidence:

## 7. Duplicate-attempt and stale-callback safety

- [ ] Repeated user actions cannot create concurrent connect/reconnect work.
- [ ] Stale operations and callbacks cannot overwrite a newer successful
      lifecycle state.
- Evidence:

## 8. Player-facing error safety

- [ ] Error categories are bounded, readable, and separate from profile
      validation errors.
- [ ] UI excludes raw exceptions, stack traces, tokens, allowlists, internal
      hosts, and credentials.
- Evidence:

## 9. NET-001 preservation

- [ ] Retry count/delays, token privacy, session ownership, listener rebinding,
      cleanup, and grace semantics are unchanged.
- [ ] No parallel reconnect or automatic `joinOrCreate` continuity fallback
      exists.
- Evidence:

## 10. SEC-007 preservation

- [ ] Origin, CORS, WebSocket verification, validation, and trust boundaries
      are unchanged.
- Evidence:

## 11. Server-authority preservation

- [ ] UI state is not used as proof of server acceptance or canonical gameplay
      state.
- [ ] No client-created continuity, ownership, or persistence claim exists.
- Evidence:

## 12. Protocol/schema preservation

- [ ] No wire message, schema field, shared contract, matchmaking API, or
      server event was added or changed.
- Evidence:

## 13. Automated test evidence

- Initial connection success:
- Initial connection failure:
- Unexpected disconnect:
- Reconnect start:
- Reconnect success:
- Reconnect terminal failure:
- Duplicate action prevention:
- Stale callback rejection:
- Player-facing sanitization:

## 14. Visual/interaction evidence

- Status distinction and gameplay-active clarity:
- Terminal recovery action:
- Repeated-action guards:
- Flicker/transient-state behavior:
- Fit with existing Phaser/DOM visual language:

## 15. Regression evidence

- Core CI/tests:
- NetworkClient callback diagnostic:
- NET-001 reconnect lifecycle tests:
- Protocol compatibility:
- Movement/combat diagnostics:
- Public Arena smoke where applicable:

## 16. Findings

Record each finding with severity, repository evidence, required disposition,
and whether it blocks the reviewed commit. Do not treat optional visual or
implementation suggestions as network lifecycle facts.

## 17. Network/Runtime Reviewer

- Verdict: `PENDING`
- Reviewed commit: `TBD`
- Evidence source: `TBD`
- Findings: `TBD`

## 18. Visual/UX Reviewer

- Verdict: `PENDING`
- Reviewed commit: `TBD`
- Evidence source: `TBD`
- Findings: `TBD`

## 19. Product Architect

- Verdict: `PENDING`
- Reviewed commit: `TBD`
- Evidence source: `TBD`
- Findings: `TBD`

## 20. Claude QA advisory result

- Result: `PENDING — ADVISORY / NON-BLOCKING`
- Reviewed commit: `TBD`
- Evidence source: `TBD`
- Substantive blockers, if any: `TBD`

## 21. Human merge gate

The implementation remains human-merge-only. The gate requires successful
Core CI/tests on the reviewed head, approving Independent Network/Runtime and
Independent Visual/UX verdicts, Product Architect approval, resolution of all
substantive blockers, and confirmation that scope remains within this task.
Claude QA is advisory/non-blocking unless the Product Architect elevates the
risk or the implementation enters a HIGH-RISK boundary.
