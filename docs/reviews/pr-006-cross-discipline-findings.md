# PR-006 Cross-Discipline Findings

The table contains only findings independently verified against the reviewed repository. PR-006 documents and routes them; it does not implement runtime fixes.

| ID | Reviewer | Severity | Current/Future | Evidence | Recommended owner | Proposed follow-up | PR-006 blocker? |
|---|---|---|---|---|---|---|---:|
| SEC-001 | Security | Medium | Production readiness | `apps/server/src/index.ts` has no WebSocket origin policy | Server/Security | Origin and reverse-proxy hardening task before public deployment | No |
| SEC-002 | Security | Medium | Current weakness | `BattleRoom.handleSetProfile()` has no cooldown and broadcasts room info after acceptance | Server/Network/Security | Scoped profile-message abuse-resistance task | No |
| SEC-003 | Security | Medium | Dependency readiness | Read-only audit: 13 transitive advisories, no high/critical | Architecture/Security/QA | Dedicated Colyseus/dependency upgrade assessment | No |
| SEC-004 | Security | Low | Future | No production deployment or secret-injection model exists | Architecture/Security | Deployment assumptions document before hosting | No |
| SEC-005 | Security | Low | Current accepted default | `apps/client/vite.config.ts` binds dev/preview to `0.0.0.0` | Client/Security | Document LAN exposure or scope host configuration later | No |
| SEC-006 | Security + Gameplay | Low | Future regression risk | `TestBattleRoom` can mutate state but is diagnostic-only and unregistered | Server/QA | Recurring check that test rooms never enter production registration | No |
| GP-001 | Gameplay | Low | Current documentation | Historical documents assign the narrow cutover to PR-006 | Product Architect/Docs | Supersede with PR-007 in current task/context | No |
| GP-002 | Gameplay | Low | Current workflow | No PR-006 task/routing document existed at baseline | Product Architect/Codex | Add task and routing documents in PR-006 | No |
| GP-003 | Gameplay | Low | Future maintainability | `gameConfig.ts` colocates prototype gameplay and camera presentation values | Client/Architecture | Separate presentation constants in a scoped structural task | No |
| GP-004 | Gameplay + QA | Low | Future tooling | Focused diagnostics are invoked by paths rather than named npm scripts | QA/Architecture | Consider a manifest-only tooling task | No |
| GP-005 | Gameplay + Network | Informational | Planned migration | Profile consumers still use broad-object aliases | Network/Architecture | PR-007 narrow consumer-import cutover | No |
| VIS-001 | Visual | Medium | Future readability | Shared ship texture differentiated primarily by faction tint | Visual Design | Faction silhouette/marking brief | No |
| VIS-002 | Visual | Medium | Future readability | Blue tint is applied over red-biased `player-ship-game.png` | Visual/Graphics | Approved faction-specific ship asset task | No |
| VIS-003 | Visual | Low | Current pipeline | No asset provenance/brief/version log | Visual Design | Create visual asset log in a visual-doc task | No |
| VIS-004 | Visual | Low | Current pipeline | Multiple unused base/background/temp variants have undocumented purpose | Visual Design | Document preserved source and active variants | No |
| VIS-005 | Visual | Low | Future consistency | Health thresholds and faction color tokens are duplicated | Visual/UI | Centralize presentation tokens in a scoped UI task | No |
| VIS-006 | Visual | Informational | Current prototype | Invulnerability is represented by an alpha pulse | Visual/QA | Manual readability check during future visual work | No |

No Critical or High finding was confirmed. Runtime security, gameplay, network, assets, and dependencies remain unchanged in PR-006.
