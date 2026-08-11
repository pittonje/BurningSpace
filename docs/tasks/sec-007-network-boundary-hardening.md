# SEC-007 — Network Boundary Hardening

Owner: `Product Architect`

Wave: `Wave 1 — Authority and Security Hardening`

Risk: `HIGH — production network/security boundary`

Merge authority: `Human only`

## Baseline and authority

- TEST-003 / PR #54 is human-merged at
  `e337c4d55d80af41ef27aa4c87baa42a73926bd3`.
- SEC-007 resolves the bounded Wave 1 production Origin and message-abuse
  boundary before public exposure.
- This task creates or changes no accepted decision. The accepted count remains
  35: 18 `BS-MECH`, 5 `GAME-001`, 7 `BS-ARCH`, 4 `BS-PROC`, and 1 `CI`.
- `BS-ARCH-001` server authority, existing package/protocol direction, and
  `BS-PROC-001` human-only merge remain unchanged.

## Exact changed paths

Modify:

- `apps/server/src/index.ts`;
- `apps/server/src/rooms/BattleRoom.ts`;
- `apps/server/test/support/startProductionBattleServer.ts`;
- `.github/workflows/pr-checks.yml`;
- `docs/handoffs/CURRENT.md`.

Create:

- `apps/server/src/security/networkBoundary.ts`;
- `apps/server/src/security/tokenBucketRateLimiter.ts`;
- `apps/server/test/networkBoundary.test.ts`;
- `apps/server/test/productionNetworkBoundary.test.ts`;
- `docs/tasks/sec-007-network-boundary-hardening.md`;
- `docs/reviews/sec-007-network-boundary-hardening-review.md`.

The expected total is exactly 11 paths. No client, schema, system, shared,
protocol, balance, configuration-package, manifest, lockfile, decision,
roadmap, governance, deployment, or dependency path is authorized.

## Production Origin configuration

`BURNINGSPACE_ALLOWED_ORIGINS` is a comma-separated list of exact HTTP or HTTPS
origins. Entries are canonicalized through URL-origin normalization; duplicates
are removed deterministically. Wildcards, `null`, non-HTTP schemes, malformed
values, credentials, paths, queries, and fragments are invalid.

Production (`NODE_ENV=production`) fails before listening when the variable is
missing, empty, or invalid. Production rejects missing Origin and matches only
an exact normalized configured origin—never a suffix, substring, regular
expression, hostname-only rule, or implicit wildcard.

Without an explicit list outside production, missing Origin remains available
to local Node tests and diagnostics, and HTTP/HTTPS Origins are accepted only
for `localhost`, `127.0.0.1`, or `::1`, with any explicit local port. Remote,
malformed, wildcard, and non-HTTP origins are rejected. An explicit
development/test list replaces implicit loopback Origin acceptance while
missing Origin remains available outside production.

## HTTP matchmaking and CORS

- `BattleRoom.static onAuth` checks the active policy against the matchmaking
  request headers before a seat is reserved; it adds no identity behavior and
  changes no join options or room selection.
- Allowed CORS requests receive their exact normalized
  `Access-Control-Allow-Origin` plus `Vary: Origin`.
- Denied and missing production Origins explicitly override Colyseus's default
  wildcard with an empty allow-origin value and never reflect a hostile Origin.
- The `/health` endpoint remains available without Origin and the existing 404
  behavior is preserved.

## WebSocket handshake

The production and test bootstraps pass the same policy's callback-form
`verifyClient` callback to `WebSocketTransport`. Allowed handshakes continue;
disallowed or missing production Origin is rejected before connection with
HTTP 403 and `Origin is not allowed.`. This is connection-boundary enforcement,
not authentication. Existing transport `maxPayload` behavior is unchanged.

## Rate-limit defaults and environment overrides

Defaults:

- profile burst: 8 messages;
- profile refill: 1 token per second;
- player-input burst: 80 messages;
- player-input refill: 40 tokens per second.

Optional overrides:

- `BURNINGSPACE_PROFILE_RATE_BURST`;
- `BURNINGSPACE_PROFILE_RATE_PER_SECOND`;
- `BURNINGSPACE_INPUT_RATE_BURST`;
- `BURNINGSPACE_INPUT_RATE_PER_SECOND`.

Every override must parse as a finite positive number and remain within the
precision-safe token-bucket range or startup fails. Burst capacity must be at
least one message, all values must be no greater than
`Number.MAX_SAFE_INTEGER`, and a refill rate must yield a finite one-token
retry interval. The dependency-free per-session token buckets start full,
refill through a monotonic injectable clock, cap at capacity, use no timers,
and expose explicit per-key delete and full clear operations.

## Profile-message enforcement

The profile bucket is consumed before participant lookup, payload validation,
or state mutation. An excess message cannot change profile, participant, or
ship state and reuses `PROFILE_REJECTED` with the exact reason
`Profile update rate limit exceeded.`. A separate one-per-second notification
boundary prevents response amplification during a flood. The first excess does
not disconnect the client, and accepted messages preserve all existing
nickname, mode, faction, and profile-lock semantics.

## Player-input enforcement

The input bucket is consumed before ship lookup, validation, the existing 10 ms
guard, or authoritative input mutation. Excess messages are silently dropped
without updating sequence, `lastInputReceivedAt`, or current authoritative
input. The connection is preserved. Defaults retain substantial headroom over
the normal client cadence of approximately 20 messages per second. Existing
movement, combat, projectile, damage, death, respawn, faction, spectator,
schema, and snapshot behavior is unchanged.

Profile, input, and bounded-notice state is deleted when its session leaves.

## Tests and CI enforcement

- Unit coverage verifies fail-closed configuration, normalization, exact
  production and local-development Origin behavior, CORS, WebSocket 403
  verification, override parsing, nested policy restoration, and deterministic
  token-bucket behavior with injected time.
- Production integration coverage uses the real registry, real `BattleRoom`,
  real WebSocket transport, ephemeral loopback server, and explicit Node Origin
  headers. It covers allowed, hostile, and missing Origin; health; CORS;
  profile-flood mutation/notification boundaries; input-flood sequence/timing
  boundaries and refill; another-player isolation; and normal 20 Hz behavior.
- `.github/workflows/pr-checks.yml` now runs `npm test` in the existing Core job
  after `npm ci`, without changing triggers, permissions, concurrency, Node,
  trusted routing, Claude routing, or existing checks.

Required validation includes three consecutive targeted security-test runs,
the full test suite, typecheck, build, protocol compatibility, all three
existing diagnostics, production fail-closed and allowed-origin smoke checks,
and exact scope verification.

## Explicit non-goals

No identity, accounts, authentication, reconnect, persistence, sectors,
outposts, deployment, reverse-proxy trust, IP policy, gameplay, protocol,
schema, dependency, permanent ban, database, or new wire-message work. Reconnect
ownership and lifecycle remains a later boundary and is not active.

## Review and evidence routing

Required:

- One independent integrated Security/Runtime Reviewer covering Origin and
  transport enforcement, matchmaking/CORS behavior, input/profile limiting,
  deterministic tests, production behavior preservation, CI, and docs.
- Mandatory substantive Claude QA on the reviewed implementation head.
- Product Architect approval bound to the reviewed PR and commit.
- One later combined evidence commit after those verdicts.
- Passing final-head Core Pull Request Checks, now including `npm test`.
- Human-only merge under `BS-PROC-001`.

Infrastructure-only Claude failure permits at most one manual rerun on the same
HEAD. A repeated infrastructure-only failure requires explicit Product
Architect override evidence; substantive `CHANGES REQUIRED` must be
investigated. Non-blocking notes are deferred.

Separate Architecture, Network, Security, QA, and Documentation sessions are
combined into the Product Architect-authorized integrated Security/Runtime
review for this bounded task. Gameplay review is skipped because no gameplay
rule, balance value, or behavior changes. Visual review is skipped because no
UI, asset, VFX, loader, or presentation path changes.

## Closure conditions

SEC-007 closes only after exactly the authorized paths and one implementation
commit exist, all local validation passes, Core CI including `npm test` passes,
the integrated reviewer and mandatory Claude QA provide substantive verdicts,
Product Architect approval is recorded, one combined evidence commit binds the
artifact, final-head checks pass, and the human owner merges the pull request.

## Next runtime boundary after merge

Reconnect ownership, disconnect lifecycle, and minimum reconnection behavior.
That work is not activated by SEC-007.
