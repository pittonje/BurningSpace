# OPS-002 — Public Arena External Staging Deployment and Validation Review

## Metadata

- Status: `PENDING`
- Task: `OPS-002 — Public Arena External Staging Deployment and Validation`
- Branch: `<pending>`
- Base: `<pending>`
- Reviewed commit: `<pending>`
- Pull request: `<pending>`
- Target environment: `<pending — non-secret identifier only>`
- Deployed commit/image: `<pending>`
- Deployment execution date: `<pending>`

Do not place host credentials, private addresses, tokens, private keys, SSH
configuration, provider secrets, or complete environment dumps in this file.

## 1. Scope verification

- [ ] Changed paths match the approved OPS-002 implementation/evidence scope.
- [ ] No unapproved runtime, protocol, gameplay, persistence, identity,
      dependency, or topology change exists.
- [ ] Phase A repository preparation and Phase B execution evidence remain
      distinguishable.

Evidence: `<pending>`

## 2. Environment binding

- [ ] The exact approved repository head and deployed image/build identifiers
      are recorded.
- [ ] The target is one controlled alpha/non-persistent staging environment.
- [ ] Environment identity is recorded without secret values.

Evidence: `<pending>`

## 3. Secret handling

- [ ] Real environment files and credentials remain outside Git.
- [ ] CI, PR, operational logs, generated assets, and evidence contain no
      unintended secrets.
- [ ] Public server origin is treated as public configuration, not a secret.
- [ ] Reconnect-token query material is redacted from edge/access logs.

Evidence: `<pending>`

## 4. DNS

- [ ] Client and server names resolve to the intended staging edge.
- [ ] No unintended management hostname or address is exposed.

Evidence: `<pending>`

## 5. TLS

- [ ] Client HTTPS and server HTTPS/WSS certificates are valid for their names.
- [ ] HTTP redirects to HTTPS where appropriate.
- [ ] Insecure obsolete TLS protocols are rejected where controlled by the
      selected edge.

Evidence: `<pending>`

## 6. Reverse proxy

- [ ] The external edge terminates TLS and routes to loopback services only.
- [ ] `Host`, timeout, and long-lived WebSocket handling are coherent.
- [ ] No hostile Origin rewriting or permissive recovery workaround exists.

Evidence: `<pending>`

## 7. Origin preservation

- [ ] The browser's original allowed Origin reaches the server unchanged.
- [ ] Hostile and absent production Origins are not rewritten into an allowed
      value.

Evidence: `<pending>`

## 8. WebSocket upgrade

- [ ] `Upgrade` and `Connection` are forwarded correctly through the real edge.
- [ ] Allowed gameplay and reconnect WebSockets succeed.
- [ ] Hostile raw WebSocket upgrade is rejected.

Evidence: `<pending>`

## 9. Loopback and firewall exposure

- [ ] Server and client container host ports remain explicitly loopback-bound.
- [ ] Direct Node, static-client, admin, and dashboard ports are externally
      unreachable.
- [ ] Firewall exposure matches the approved edge-only topology.

Evidence: `<pending>`

## 10. Client build endpoint

- [ ] `VITE_BURNINGSPACE_SERVER_URL` is the exact approved public server
      staging origin.
- [ ] Generated client assets contain no secret material.
- [ ] Missing or malformed production client configuration fails closed.

Evidence: `<pending>`

## 11. Health/readiness

- [ ] `/health` and `/ready` are reachable through the intended operations
      route without exposing gameplay or secret state.
- [ ] Readiness is true only after successful startup and false during drain.

Evidence: `<pending>`

## 12. Allowed-Origin smoke

- [ ] Allowed-Origin matchmaking, profile setup, and gameplay connection
      succeed through the real edge.
- [ ] The exact configured allowlist is recorded without unrelated origins.

Evidence: `<pending>`

## 13. Hostile-Origin smoke

- [ ] Hostile matchmaking is rejected.
- [ ] Hostile raw WebSocket upgrade is rejected.
- [ ] Absent Origin is rejected in production.

Evidence: `<pending>`

## 14. Authoritative gameplay smoke

- [ ] Participant and owned ship state replicate from the authoritative server.
- [ ] Authoritative movement succeeds.
- [ ] The client does not decide canonical gameplay outcomes.

Evidence: `<pending>`

## 15. UX-001 connection/reconnect smoke

- [ ] Unexpected loss, reconnecting, success, and terminal failure remain
      truthful through the external edge.
- [ ] Reconnect within NET-001 behavior succeeds without duplicate player,
      session, or ship ownership.

Evidence: `<pending>`

## 16. Shutdown/drain

- [ ] SIGTERM makes readiness false before bounded drain.
- [ ] Expected lifecycle logs are present and normal shutdown exits cleanly.

Evidence: `<pending>`

## 17. Restart/reset behavior

- [ ] Restart behavior is observed and documented as room/world resetting.
- [ ] No persistence, account safety, or continuity guarantee is claimed.

Evidence: `<pending>`

## 18. Logs and redaction

- [ ] Expected bounded lifecycle events are present.
- [ ] Logs omit credentials, Origin allowlists, reconnect tokens, query bearer
      material, private management data, and gameplay state.
- [ ] Client-facing failures contain no stack trace or secret detail.

Evidence: `<pending>`

## 19. Rollback

- [ ] Previous and target approved commits/images are bound.
- [ ] Configuration is backed up or reproducible without storing secrets here.
- [ ] Rollback is executed or rehearsed within the approved bound.
- [ ] Post-rollback validation passes and expected room reset is recorded.

Evidence: `<pending>`

## 20. Repository and image binding

- [ ] Deployed images derive from the exact approved merged repository commit.
- [ ] Image digests/build identifiers and the post-deployment clean repository
      state are recorded.

Evidence: `<pending>`

## 21. Core evidence

- Implementation-head Core run: `<pending>`
- Evidence/final-head Core run: `<pending>`
- Result and exact reviewed head: `<pending>`

## 22. Findings

Blocking findings: `<pending>`

Non-blocking findings: `<pending>`

Abort events and disposition: `<pending>`

## 23. Operations/Security Reviewer

- Verdict: `<pending>`
- Reviewed commit/environment: `<pending>`
- Evidence source: `<pending>`
- Required changes: `<pending>`
- Date: `<pending>`

## 24. Network/Runtime Reviewer

- Verdict: `<pending>`
- Reviewed commit/environment: `<pending>`
- Evidence source: `<pending>`
- Required changes: `<pending>`
- Date: `<pending>`

## 25. Claude QA

- Substantive verdict: `<pending>`
- Reviewed commit: `<pending>`
- Workflow run: `<pending>`
- Wrapper conclusion: `<pending>`
- Blockers: `<pending>`
- Product Architect infrastructure disposition, if applicable: `<pending>`

## 26. Product Architect

- Verdict: `<pending>`
- Reviewed commit/evidence: `<pending>`
- Findings disposition: `<pending>`
- Date: `<pending>`

## 27. Deployment GO

- Environment-specific GO: `<pending>`
- Authorized target and commit/image: `<pending>`
- Authorization source/date: `<pending>`
- Rollback readiness confirmed: `<pending>`

No repository merge or Phase A completion is itself a deployment GO.

## 28. Post-deployment verification

- [ ] The complete external smoke matrix passed.
- [ ] No abort condition remains unresolved.
- [ ] Rollback evidence and limitations are recorded.
- [ ] Staging remains explicitly alpha/non-persistent.
- [ ] No public-production claim or unrestricted launch occurred.

Evidence: `<pending>`

## 29. Closure / human gate

- [ ] Required specialist reviews approve.
- [ ] Mandatory Claude QA is satisfied or has an explicit policy-compliant
      Product Architect infrastructure disposition.
- [ ] Product Architect approval and environment-specific deployment GO exist.
- [ ] Final-head Core and post-deployment evidence are bound.
- [ ] Any implementation/evidence PR follows human-only merge authority unless
      a later exact Product Architect authorization says otherwise.

Closure status: `<pending>`
