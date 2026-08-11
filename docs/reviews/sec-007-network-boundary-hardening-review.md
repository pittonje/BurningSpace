# SEC-007 — Network Boundary Hardening Review

## Metadata

- Status: `REVIEW COMPLETE`
- Task: `SEC-007 — Network Boundary Hardening`
- Branch: `game/wave1-sec-007-network-boundary-hardening`
- Base: `e337c4d55d80af41ef27aa4c87baa42a73926bd3`
- Reviewed commit: `0a43352b6a14e81e19015025b415b05971203562`
- Pull request: #55

## Scope

`git merge-base HEAD origin/main` returns `e337c4d55d80af41ef27aa4c87baa42a73926bd3`
(the human merge commit of PR #54 / TEST-003) and `git rev-list --count <base>..HEAD`
returns `2`. `gh pr view 55` reports `headRefOid`
`0a43352b6a14e81e19015025b415b05971203562`, `baseRefName` `main`, `state` `OPEN`,
`isDraft` `false`, `mergeable` `MERGEABLE`, `mergeStateStatus` `UNSTABLE`. Local
`HEAD` equals the pull-request head and the tracked working tree was clean at
review start.

`git diff --name-status <base>...HEAD` returns exactly the eleven authorized
paths:

- `M .github/workflows/pr-checks.yml`
- `M apps/server/src/index.ts`
- `M apps/server/src/rooms/BattleRoom.ts`
- `A apps/server/src/security/networkBoundary.ts`
- `A apps/server/src/security/tokenBucketRateLimiter.ts`
- `A apps/server/test/networkBoundary.test.ts`
- `A apps/server/test/productionNetworkBoundary.test.ts`
- `M apps/server/test/support/startProductionBattleServer.ts`
- `M docs/handoffs/CURRENT.md`
- `A docs/reviews/sec-007-network-boundary-hardening-review.md`
- `A docs/tasks/sec-007-network-boundary-hardening.md`

`git diff --check <base>...HEAD` reports no whitespace defects. No client
production source, shared or protocol package, schema, system, movement,
combat, death, or respawn path changed. `package.json`, `apps/server/package.json`,
`package-lock.json`, `vitest.config.ts`, `PROJECT_CONTEXT.md`,
`docs/decisions/`, `DECISION_INDEX.md`, the roadmap, and `docs/GOVERNANCE.md`
are all unchanged. No dependency changed.

Two commits exist over the merge-base rather than the one the task text
requested. The second, `0a43352` `fix(ci): isolate PM2 telemetry from Vitest
IPC`, is a disclosed recovery from a real, deterministic Linux Core-CI failure
and touches only `apps/server/test/support/startProductionBattleServer.ts`,
which is already an authorized path. Core run `31458625469` on `ecafdb66`
failed with `[vitest-pool]: Unexpected call to process.send(). Make sure your
test cases are not interfering with process's channel.` and the received value
`{"type":"axm:monitor",...}`, caused by `TypeError` `ERR_INVALID_ARG_TYPE` in
Vitest's `deserialize`. The recovery is analysed under **Test helper and PM2
IPC** below; both attempts remain in the run history, so evidence is preserved.
The deviation is recorded as non-blocking.

## Origin configuration

`apps/server/src/security/networkBoundary.ts` is strictly fail-closed for
production.

`parseNetworkBoundaryConfig` throws
`BURNINGSPACE_ALLOWED_ORIGINS is required in production.` when `NODE_ENV` is
`production` and the variable is absent, and `parseAllowedOrigins` throws
`BURNINGSPACE_ALLOWED_ORIGINS must not be empty.` for an empty or
whitespace-only value. Because the variable is mandatory in production,
`originMode` is always `exact-allowlist` there — production can never fall into
`local-development` mode — and `allowMissingOrigin` is `!production`, so a
missing production Origin is rejected.

`normalizeOrigin` rejects, in this order and before any URL parsing: empty
values, any `*`, the literal `null`, interior whitespace or `U+0000`-`U+001F`
and `U+007F` control characters, backslashes, and anything not matching
`^https?://`. It then extracts the raw authority and rejects an empty authority
or any `@` (userinfo), validates bracketed IPv6 hosts with an optional `:digits`
suffix, and for non-bracketed hosts rejects any authority with more than one
colon or a non-numeric port. Only then does it construct a `URL`, re-check the
protocol, and reject any credentials, non-`/` pathname, query, fragment, or raw
path — including forms such as `https://play.example.com/./` that the URL
parser would otherwise normalize away. The return value is the canonical
`url.origin`, and `parseAllowedOrigins` deduplicates through a `Set` and freezes
the result, so duplicates collapse deterministically and order is the first-seen
order.

Matching is exact string equality against the canonicalized allowlist
(`config.allowedOrigins.includes(normalizedOrigin)`). There is no suffix,
substring, regular-expression, hostname-only, or implicit-wildcard rule anywhere
in the module. A non-string Origin header — the array form produced by duplicate
`Origin` headers — is rejected outright.

Default-port normalization was checked directly. `HTTPS://PLAY.EXAMPLE.COM:443`
and `https://play.example.com/` both canonicalize to `https://play.example.com`,
while `https://play.example.com:8443` stays distinct and `http://LOCALHOST:80`
canonicalizes to `http://localhost`.

A normalization sweep was run against a production config allowing only
`https://play.example.com`. Every accepted variant canonicalized to exactly that
origin: case variants, `:443`, `:0443`, a trailing `/`, `%2E` in the host, and
the IDNA-equivalent fullwidth and ideographic-full-stop forms — all of which are
the same origin under WHATWG/UTS-46 rules that a browser applies itself. Every
malformed or broadening form was denied: `https://play.example.com.` (trailing
dot is a distinct origin), `%00`, `?`, `#`, `/..`, backslash forms,
`https://user@play.example.com`, `https://play.example.com@evil.test`,
`https:/\play.example.com`, `https:\\play.example.com`, `:+443`, `null`, `NULL`,
the empty string, `*`, and `http://play.example.com` against an `https` entry.
No malformed textual origin normalized into a different accepted canonical
origin.

Development behaviour is bounded, not permissive. With no explicit list,
`isRequestOriginAllowed` accepts a missing Origin and accepts only hostnames in
`{localhost, 127.0.0.1, ::1, [::1]}` with any explicit port; `https://remote.example.com`,
`file://localhost`, and `https://localhost.evil.com` are all rejected. Supplying
an explicit list outside production replaces implicit loopback acceptance with
exact matching while missing Origin remains available, which is what
`apps/server/test/networkBoundary.test.ts` asserts.

## Fail-closed startup

`apps/server/src/index.ts` calls `parseNetworkBoundaryConfig()` as the first
statement of `startServer()`, before `createServer`, before the transport, and
before `listen`. `installNetworkBoundary(networkBoundaryConfig)` runs before the
Colyseus `Server` is constructed, and
`createWebSocketVerifyClient(networkBoundaryConfig)` is passed to
`WebSocketTransport`, so both matchmaking and handshake policy are in place
before the socket binds. `registerProductionRooms(gameServer)` is still the only
room registration, and the `/health` 200 and `/not_found` 404 responses and the
`Number(process.env.PORT ?? 2567)` behaviour are byte-identical to the previous
handler.

`listen` is now awaited through a promise with paired `once('error')` /
`once('listening')` handlers that deregister each other. The `catch` block calls
`gameServer?.gracefullyShutdown(false)`, closes the HTTP server if it is
listening, calls `networkBoundary.restore()`, and rethrows, so a failure after
policy installation cannot leave the global CORS hook patched or a socket open.
`gameServer.onShutdown` also restores the policy.

Verified directly against the built `apps/server/dist/index.js` with
`NODE_ENV=production`:

| Environment | Result |
|---|---|
| no `BURNINGSPACE_ALLOWED_ORIGINS` | exit `1`, `BURNINGSPACE_ALLOWED_ORIGINS is required in production.`, no listener on the port |
| `*` | exit `1`, `... entry 1 must not contain a wildcard.` |
| `https://a.com/path` | exit `1`, `... entry 1 must not contain credentials, path, query, or fragment.` |
| `ws://a.com` | exit `1`, `... entry 1 must use an absolute HTTP or HTTPS origin.` |
| `https://*.a.com` | exit `1`, `... entry 1 must not contain a wildcard.` |
| `BURNINGSPACE_INPUT_RATE_PER_SECOND=0` | exit `1`, `... must be a finite positive number.` |

In every case the process exited before binding; `Get-NetTCPConnection` showed
no listener. Production cannot listen with a missing or invalid allowlist.

Startup logging adds exactly one line,
`Network security: production exact-origin mode`. No origin list, header, token,
or environment value is logged.

## HTTP matchmaking boundary

`BattleRoom.static onAuth(_token, _options, context)` calls
`assertRequestOrigin(context)` and converts a throw into `false`. It performs no
identity or account logic, reads no token, does not mutate join options, and
does not select a different room. `context.headers` is the raw matchmaking
request header set: `@colyseus/core` `Server.js` builds the `AuthContext` as
`{ token, headers: req.headers, ip, req }`.

Ordering was confirmed in the pinned `@colyseus/core@0.16.5` `MatchMaker.js`:
`joinOrCreate`, `create`, `join`, and `joinById` each `await callOnAuth(...)`
before `reserveSeatFor(...)`, and `callOnAuth` throws
`ServerError(AUTH_FAILED, "onAuth failed")` on a falsy result. A denied Origin
therefore never reaches seat reservation, so no participant and no ship can be
created.

`apps/server/test/productionNetworkBoundary.test.ts` proves the behaviour end to
end against the real registry and real room: a hostile Origin and a missing
Origin both reject with `onAuth failed`, the allowed Origin obtains a usable
seat, and the room then reports `participants.size === 1` and `ships.size === 1`
with `ownerSessionId` equal to the joining session — no state was created for the
denied clients. The server answered `/health` with 200 after the rejections.

The same result was reproduced against the real production bootstrap
(`node apps/server/dist/index.js`, `NODE_ENV=production`,
`BURNINGSPACE_ALLOWED_ORIGINS=https://play.example.com,HTTPS://ALT.EXAMPLE.COM:443`):
hostile and missing-Origin joins were rejected with `onAuth failed`, while a
client sending `Origin: HTTPS://PLAY.EXAMPLE.COM:443` joined the real `battle`
room, received a ship, and matched ownership. Server output showed
`[BattleRoom] created`, `joined`, `ship created`, and `profile` lines only for
the allowed client.

## WebSocket handshake boundary

`createWebSocketVerifyClient(config)` returns the callback form of the `ws`
`verifyClient` hook and is passed through `TransportOptions extends ServerOptions`
into `new WebSocketServer(options)` by `@colyseus/ws-transport@0.16.5`. It reads
`info.req.headers.origin`, calls `callback(true)` when allowed, and otherwise
`callback(false, 403, 'Origin is not allowed.')`. It performs no identity
authentication. The transport still applies its own `maxPayload` default of
4 KiB because neither bootstrap sets `maxPayload`.

Because matchmaking rejects a hostile Origin first, the integration suite never
drives the handshake phase with a hostile Origin, so the handshake boundary was
verified independently by probing raw HTTP upgrades against a live server built
from the production factories with the production config:

| Upgrade `Origin` | Result |
|---|---|
| `https://play.example.com` | `UPGRADE 101` |
| `HTTPS://PLAY.EXAMPLE.COM:443` | `UPGRADE 101` |
| `https://hostile.example` | `HTTP 403 Forbidden` |
| absent | `HTTP 403 Forbidden` |
| empty string | `HTTP 403 Forbidden` |
| `https://play.example.com.evil.test` | `HTTP 403 Forbidden` |
| `https://play.example.com\@evil.test` | `HTTP 403 Forbidden` |
| `null` | `HTTP 403 Forbidden` |

The stack traces on the accepted upgrades show `ws` calling
`Object.verifyClient (apps/server/src/security/networkBoundary.ts)` before
`completeUpgrade`, confirming the hook is live rather than merely configured. A
seat obtained with an allowed Origin therefore cannot be upgraded from a hostile
Origin: the verifier runs on the upgrade request itself, independently of the
seat token.

The Node integration clients set Origin explicitly through
`new Client(url, { headers: { Origin } })`. This was traced through
`colyseus.js@0.16.22`: `Client.consumeSeatReservation` forwards `this.http.headers`
into `Room.connect`, which passes them to `Connection.connect` and then to
`new WebSocket(url, { headers, protocols })`. A direct header capture confirmed
the `origin` header reaches the server on the upgrade request, and that
`new Client(url)` sends none.

## CORS behavior

The pinned `@colyseus/core` default `getCorsHeaders` reflects any Origin
unconditionally (`origin || '*'`), and `Server.handleMatchMakeRequest` merges
`DEFAULT_CORS_HEADERS` — which contains `'Access-Control-Allow-Origin': '*'` —
underneath it for both the `OPTIONS` 204 and the `POST` matchmake response.
`installNetworkBoundary` replaces that factory with one that evaluates the
Origin through the active policy and returns
`{ 'Access-Control-Allow-Origin': <exact normalized origin or ''>, Vary: 'Origin' }`,
so the merged result always overrides the default wildcard.

Verified against the real production bootstrap:

- allowed preflight → `204`, `Access-Control-Allow-Origin: https://play.example.com`,
  `Vary: Origin`;
- denied preflight → `204`, `Access-Control-Allow-Origin: ""`, never `*`, never
  the hostile Origin, `Vary: Origin`.

An empty allow-origin value fails the browser CORS check for both credentialed
and non-credentialed modes and cannot be mistaken for a permissive fallback. The
unit test additionally asserts that no header value in the denied response
contains the hostile origin. `/health` remains reachable with no Origin at all
(`200 {"ok":true,"service":"burningspace-server"}`), and the 404 body is
unchanged.

## Profile-message limiting

`BattleRoom.handleSetProfile` consumes the profile bucket as its first statement,
before participant lookup, before `validateProfile`, and before any mutation. The
defaults are burst `8` and refill `1`/s, asserted exactly by the unit test.
Accepted messages continue through the unchanged nickname, mode, faction, and
profile-lock path.

An excess message returns immediately after
`sendBoundedProfileRateLimitNotice`, so it cannot touch nickname, faction, mode,
participant, or ship state. The notice reuses the existing
`ProfileServerMessages.PROFILE_REJECTED` with the exact reason
`Profile update rate limit exceeded.`, and is itself bounded to one per second
per session through `lastProfileRateLimitNoticeAt` keyed off the same monotonic
clock as the bucket. The first excess message is always notified because the map
starts empty. The connection is not closed.

`onLeave` deletes the session's profile bucket, input bucket, and notice
timestamp alongside the pre-existing `inputs`, `weapons`, and
`lastInputReceivedAt` entries, so no limiter state leaks after leave.

The integration test uses burst `2`, refill `0.25`/s and a frozen injected clock.
After two accepted updates and one rejected update it sends twelve further
flood messages and then a `PLAYER_INPUT`, waiting for
`lastProcessedInput === 1` before asserting. Because Colyseus delivers a single
client's messages in order, that wait is a genuine causal barrier rather than a
fixed sleep: the input cannot be processed until every preceding profile message
has been. The assertions then prove at least one ordinary update succeeded,
exactly one rejection notice was emitted for thirteen excess messages
(`rejectedProfiles` equals a single element), final participant and ship state
equal the last accepted profile `AlphaTwo`/`red`, `ownerSessionId` is unchanged,
and `room.connection.isOpen` is still true. With the clock frozen, the notice
window and the bucket are both deterministic and independent of wall time.

## Player-input limiting

`BattleRoom.handlePlayerInput` consumes the input bucket as its first statement,
before ship lookup, before the participant/mode check, before the existing 10 ms
guard, and before `validatePlayerInputMessage`. Defaults are burst `80` and
refill `40`/s, asserted exactly by the unit test. A rejected message returns
silently — no `client.send`, so a flood produces no per-message response — and
therefore cannot update `this.inputs`, `this.lastInputReceivedAt`, or
`ship.lastProcessedInput`. Accepted input continues through the unchanged
validation and simulation path.

The integration test uses burst `2`, refill `1`/s, a frozen clock, and two real
clients. Two inputs are accepted and confirmed causally
(`lastProcessedInput === 2` observed through the *other* client's replicated
state). Twenty-two further inputs are then sent and the test asserts
`lastProcessedInput` is still `2` — if the limiter were bypassed it would be
`24`. Crucially it also asserts
`Math.hypot(velocityX, velocityY) < 100`: because rejected input never refreshes
`lastInputReceivedAt`, `getRuntimeInput` falls back to neutral input after
`NETWORK_INPUT_TIMEOUT_MS = 300`, and the ship decelerates at
`NETWORK_SHIP_DECELERATION = 650` from a peak near `270`. Had the limiter check
been placed after the timing update, the ship would have continued accelerating
toward `NETWORK_SHIP_MAX_SPEED = 500` and the assertion would fail. That makes
"rejected input does not refresh authoritative timing" a directly proven
invariant, not an inferred one.

The observer's ship is asserted positionally unchanged to four decimal places,
proving no cross-session effect. Advancing the injected clock by one second then
refills exactly one token, the next input is accepted, and the test waits
causally for `lastProcessedInput === 25`; both connections remain open. All
assertions read client-visible replicated state and no server-private state is
mutated or read.

## Normal-client compatibility

The fourth integration test runs an ordinary client at approximately 20 Hz
(25 inputs at 50 ms intervals) against the production defaults and asserts every
sequence up to `25` becomes authoritative, that `rejectedProfiles` is empty, and
that the connection stays open. The default budget of burst `80` with `40`/s
refill leaves a factor-of-two headroom over the `NETWORK_TICK_RATE = 20` client
cadence, so normal play is not throttled. Ordinary profile setup is unaffected
below the limit.

The pre-existing `productionBattleRoomAuthority.test.ts` harness continues to
pass unchanged, which also exercises the default local-development policy path
with clients that send no Origin.

## BattleRoom behavior preservation

The full `BattleRoom.ts` diff contains only these semantic additions: the static
`onAuth` Origin check, the profile token bucket, the input token bucket, the
bounded rejection-notice map, the `PROFILE_RATE_LIMIT_NOTICE_INTERVAL_MS`
constant, the `sendBoundedProfileRateLimitNotice` helper, and three cleanup
deletions in `onLeave`. Nothing else in the file changed.

Unchanged accordingly: movement, acceleration, speed, combat, projectile
behaviour, damage, death, respawn, faction rules, profile-lock rules below the
limit, spectator rules, snapshots, message names, and
`maxClients = MAX_ROOM_CLIENTS`. `onCreate` still registers exactly the two
existing handlers. No schema file, system file, validation file, shared or
protocol package, or client source changed anywhere in the pull request, so no
gameplay rule and no wire contract moved. `movement-check` and `combat-check`
both returned `{"ok": true}` on the reviewed head.

## Security regression tests

`apps/server/test/networkBoundary.test.ts` (58 tests) covers the production
configuration errors (missing, empty), twenty malformed configured-origin
grammars including wildcards, embedded newline and tab, terminal and path
backslashes, a scheme without an authority separator, path, normalized dot path,
query, empty query, fragment, credentials, empty username, empty username and
password, empty port, empty IPv6 port, an unsupported scheme, and `null`;
canonicalization with duplicate removal and frozen output; every rate-override
variable rejecting `0`, `''`, `-1`, `NaN`, and `Infinity`; the precision
boundaries `0.5`, `1e20`, and `1e-320`; the exact production defaults; exact
production matching including a rejected missing Origin, a rejected sibling-suffix
host, a rejected path-embedded host, and a rejected array header; local
development loopback behaviour; explicit development allowlists; CORS reflection
with `Vary`; nested and out-of-order policy restoration back to the original
factory; verifier accept, and 403 with `Origin is not allowed.` for disallowed
and missing Origin; and the token bucket's full/empty/refill/cap/isolation/
delete/clear/invalid-configuration/backwards-clock behaviour. Every token-bucket
test injects `now` — no real timer is used.

The fail-closed cases that would matter most are present: no test permits a
materially broader production origin, and the only paths that accept an Origin
require exact canonical equality.

`apps/server/test/productionNetworkBoundary.test.ts` (4 tests) uses the real
`registerProductionRooms` registry, the real `BattleRoom`, the real
`WebSocketTransport`, an ephemeral loopback server (`listen(0, '127.0.0.1')`),
the real production policy implementation, ordinary `colyseus.js` clients, and
client-visible replicated state for every authority assertion. It covers exact
allowed Origin, disallowed Origin, missing production Origin, health
availability, allowed and denied CORS, the profile flood, the input flood,
normal 20 Hz input, connection usability after rejection, absence of participant
and ship state for denied clients, and another player's state being unaffected.
`afterEach` leaves every room through `Promise.allSettled` and stops the server;
`stop()` is idempotent and restores the network policy in a `finally`. There is
no `TestBattleRoom`, no production test hook, no fixed port, no server-private
state mutation, and no vacuous assertion — each of the four tests fails if the
corresponding boundary is removed.

## CI test enforcement

The only change to `.github/workflows/pr-checks.yml` is a three-line
`Run test suite` step executing `npm test` after `Install dependencies`.
Triggers, `permissions: contents: read`, the concurrency group and
`cancel-in-progress`, Node 22, `actions/checkout@v4`, `npm ci`, `npm run build`,
`npm run typecheck`, `npm run check:protocol-profile`, the trusted PR-risk
routing audit, the risk classifier, Claude routing, and secrets are all
unchanged. `npm test` uses Vitest source aliases and does not depend on build
output, which the run order confirms.

Core Pull Request Checks run `31459208815` on
`0a43352b6a14e81e19015025b415b05971203562` concluded `success`, and its log
shows `> vitest run` followed by `Test Files  8 passed (8)` and
`Tests  97 passed (97)`, then `Profile protocol compatibility check passed.`
`gh pr checks 55` reports `checks pass`. The Linux Core run therefore executed
and passed the suite on the final implementation head, and the previous
`ecafdb66` failure is resolved.

## Test helper and PM2 IPC

`startProductionBattleServer.ts` still constructs an ordinary Colyseus `Server`
over `WebSocketTransport` bound to a bare `node:http` server and registers rooms
solely through `registerProductionRooms`. It now accepts an optional explicit
`NetworkBoundaryConfig`, defaults to `parseNetworkBoundaryConfig({ NODE_ENV: 'test' })`
for local-development compatibility, and uses the same
`installNetworkBoundary` and `createWebSocketVerifyClient` factories as
production. It duplicates no security logic, defines no room of its own, and
never references `TestBattleRoom`. Every failure path — transport construction,
listen error, unresolvable address — now shuts down the game server, closes the
HTTP server when listening, and restores the network policy before rethrowing;
`stop()` remains idempotent via the `stopped` flag and restores in a `finally`.
The helper also gained the same `/health` and 404 handler as production, which
is what makes the health assertion meaningful.

The second commit converts the previous install/restore IPC filter into a
worker-lifetime installation. `installPm2TelemetryFilterForWorkerIpc` wraps
`process.send` only when it exists and is not already marked, and marks the
wrapper with `Symbol.for('burningspace.test.pm2-telemetry-worker-filter')` via
`Reflect.defineProperty`, so repeated calls are idempotent and the marker
survives Vitest's per-file module-registry reset. The filter drops a message
only when it is a non-null object whose `type` is a string beginning with
`axm:`; every other message and every additional argument is forwarded unchanged
through `Reflect.apply(workerSend, process, [message, ...args])`. Vitest's
fork-pool birpc frames and Tinypool control messages do not carry an `axm:`
type, so no test result or runner control message can be suppressed — and a
suppressed result would surface as a hang or failure, never as a false pass. The
wrapper owns no timer, socket, or process and does not mutate the PM2 singleton.

The change is technically necessary: the previous restore-on-stop shape left a
window in which a `@pm2/io` metrics tick fired after `gracefullyShutdown` and
entered the raw worker channel, which is exactly the `axm:monitor` payload in
the `ecafdb66` failure. It cannot enter production output — `apps/server/tsconfig.json`
sets `rootDir: "src"` and `include: ["src"]`, and the built `apps/server/dist`
contains only `index.js`, `rooms`, `schema`, `security`, `systems`, and
`validation`, with no test-support or PM2 artifact. Nothing was skipped or
weakened: the suite still reports 97 passing tests with zero skipped, locally and
on Linux CI. All required properties hold, so the two-commit deviation is
non-blocking.

## Determinism and cleanup

`vitest.config.ts` sets `fileParallelism: false`, `maxWorkers: 1`, and
`sequence.concurrent: false`, so tests are strictly sequential in a single
worker. Under that execution model the module-level installation stack in
`networkBoundary.ts` is race-free: `installNetworkBoundary` captures the previous
CORS factory only on the outermost install, throws
`Network boundary CORS policy ownership was replaced unexpectedly.` if another
owner has taken the hook, and `restore()` is guarded by a `restored` flag, marks
its own record inactive, compacts only trailing inactive records, and restores
the original factory only when no installation remains and the current factory
is still identity-equal to the installed one. `getActiveNetworkBoundaryConfig`
returns the most recent active installation, so stopping an inner server cannot
strand an outer server's policy. The out-of-order restoration case is covered by
a unit test that asserts the surviving policy stays authoritative and that the
original factory is restored at the end. Production installs exactly one policy
before listening and never restores until shutdown, so no production request can
observe a stale test policy.

All waits in the integration suite are bounded (`WAIT_TIMEOUT_MS = 5000`,
`TEST_TIMEOUT_MS = 15000`) and each timeout names the missing condition. Flood
barriers are causal ordered-message waits rather than fixed sleeps. The token
buckets use an injected clock in both flood tests, so refill behaviour is
deterministic. Ports are ephemeral and loopback-only.

Local validation on the reviewed commit, all commands run from the repository
root:

| Command | Result |
|---|---|
| `npm test` | Pass — `Test Files 8 passed (8)`, `Tests 97 passed (97)`, 0 skipped |
| `npx vitest run networkBoundary.test.ts productionNetworkBoundary.test.ts` ×3 | Pass — 3/3, `Tests 62 passed (62)` each, exit `0` each (4.14 s, 4.13 s, 4.32 s) |
| `npm run typecheck` | Pass — every workspace `typecheck` script |
| `npm run build` | Pass — every workspace `build` script |
| `npm run check:protocol-profile` | Pass — `Profile protocol compatibility check passed.` |
| `npx tsx apps/client/scripts/network-client-callback-check.ts` | Pass |
| `npx tsx apps/server/scripts/movement-check.ts` | Pass — `{"ok": true}` |
| `npx tsx apps/server/scripts/combat-check.ts` | Pass — `{"ok": true}` |

The eight discovered test files are `networkBoundary.test.ts` (58),
`outpostRespawn.test.ts` (13), `playerInput.test.ts` (11), `combat.test.ts` (4),
`productionNetworkBoundary.test.ts` (4), `productionRoomRegistry.test.ts` (3),
`profileBoundary.test.ts` (3), and `productionBattleRoomAuthority.test.ts` (1) —
97 tests, the pre-existing 35 plus the 62 new security tests. Vitest exited
cleanly every time and left no Node process behind. All review-time smoke
servers were stopped and no listener remained on any probe port.

## Documentation consistency

`docs/tasks/sec-007-network-boundary-hardening.md` records SEC-007, Wave 1,
`HIGH — production network/security boundary` risk, the TEST-003 / PR #54
baseline `e337c4d55d80af41ef27aa4c87baa42a73926bd3`, the accepted count 35 with
the split 18 `BS-MECH` / 5 `GAME-001` / 7 `BS-ARCH` / 4 `BS-PROC` / 1 `CI`, and
that it creates or changes no accepted decision. It states the exact Origin
policy including the exact-match and no-wildcard rules, the exact rate defaults
(profile 8 / 1 per second, input 80 / 40 per second), the four override
environment variables and their precision-safe constraints, the exact rejection
reason strings, the eleven exact paths, the explicit non-goals, the unit and
integration test expectations, the single `npm test` CI change, the integrated
review requirement, mandatory Claude QA, Product Architect approval, human-only
merge under `BS-PROC-001`, and reconnect ownership and lifecycle as the next
boundary that SEC-007 does not activate.

Every claim in the task document matches the implementation as reviewed. It
introduces no semantic authority outside the bounded task: it invents no
decision ID, and its Origin and rate rules are operational configuration recorded
in a layer-6 task document, not an accepted decision. Reviewer routing is
declared with reasons for the skipped gameplay and visual reviewers, satisfying
`AGENTS.md`.

`docs/decisions/` still holds exactly 35 records excluding `README.md`,
`DECISION_TEMPLATE.md`, and `DECISION_INDEX.md`, split 18 / 5 / 7 / 4 / 1. No
decision file changed, `DECISION_INDEX.md` did not change, and no security
behaviour is presented anywhere as an accepted architecture or mechanics
decision. `PROJECT_CONTEXT.md`, `docs/GOVERNANCE.md`, and the canonical roadmap
are unchanged; the roadmap's Wave 1 already names an explicit WebSocket origin
policy and profile-message rate limiting, with reconnect/recovery listed
separately, so SEC-007 sits inside the declared wave and correctly defers
reconnect.

`docs/handoffs/CURRENT.md` records PR #54 / TEST-003 human-merged at the correct
baseline, Wave 1 active, SEC-007 as the sole active bounded task at `HIGH` risk,
the correct branch, task, and review paths, the accepted count 35 with its
split, no gameplay or accepted-decision change, DOCARCH-004 open but paused,
PR #51 open and draft as frozen historical methodology evidence, PR #52 closed
and superseded, and reconnect as the next boundary and not active. It contains
exactly one `## Next safe action`, reading "Independent Security/Runtime reviewer
validates SEC-007 on the current pull-request head." It does not claim SEC-007
complete, PR #55 merged, reconnect active, Wave 1 complete, or DOCARCH work
active.

This review artifact was committed at `ecafdb66` as a `PENDING` skeleton with
blank sections, one integrated verdict block, and blank Product Architect and
Claude QA blocks.

## Blocking findings

None.

## Non-blocking notes

1. **The Colyseus `reconnect` matchmaking method is not covered by `onAuth`.**
   In the pinned `@colyseus/core@0.16.5`, `joinOrCreate`, `create`, `join`, and
   `joinById` all call `callOnAuth` before `reserveSeatFor`, but
   `matchMaker.reconnect` does not. It is not reachable as a seat source here:
   `BattleRoom` never calls `allowReconnection()`, so `Room.checkReconnectionToken`
   reads an always-empty `_reconnections` map and the method always throws
   `MATCHMAKE_EXPIRED`, and the WebSocket verifier is an independent second gate
   that returned 403 for every hostile and missing Origin in live probing.
   Recording it because reconnect ownership and lifecycle is the declared next
   boundary, and that task should add an explicit Origin check on the reconnect
   path rather than inherit this gap.

2. **The handshake boundary is proven by the direct verifier test, not by
   integration.** Because matchmaking rejects a hostile Origin first, no
   integration test drives a hostile upgrade, so the wiring of `verifyClient`
   into the transport is asserted only indirectly. This is the acceptable shape
   for the task, and live probing confirmed the wiring on a running server, but
   an integration-level raw-upgrade assertion would lock it in against a future
   refactor that drops the transport option.

3. **`normalizeOrigin` trims before validating.** Leading and trailing
   whitespace -- including tab, CRLF, `U+00A0`, `U+3000`, and `U+FEFF` -- is
   stripped, so those variants of an allowed origin are accepted. This is not a
   broadening: every accepted variant canonicalizes to the same configured
   origin, interior whitespace is still rejected, and HTTP header parsing strips
   optional whitespace before the value ever reaches the policy. Trimming is
   also required for comma-separated allowlist parsing.

4. **`describeNetworkBoundaryMode` keys off `production` only.** A non-production
   process configured with an explicit exact allowlist still logs
   `local-development mode`, understating the active policy in the startup
   banner. Diagnostic only; reporting `config.originMode` would be more precise.

5. **Burst overrides are accepted up to `Number.MAX_SAFE_INTEGER`.** The range
   checks correctly reject `0`, negatives, non-finite values, sub-precision
   refill rates, and magnitudes beyond the safe range, so the limiter cannot be
   silently disabled by a numeric edge case. An operator can still choose an
   explicit burst large enough to be practically unlimited. A documented sane
   upper bound would reduce the blast radius of a configuration typo.

6. **`matchMaker.controller.getCorsHeaders` is an undocumented extension point.**
   Replacing it is the only available hook for matchmaking CORS in this Colyseus
   version and is the correct technique here, but it is version-fragile. The
   install-time identity guard and the restoration unit test mitigate it; a
   dependency-bump checklist entry would help.

7. **`securityNow += 4_000;` is dead code.** It is the final statement of the
   profile-flood test with nothing following it, so it advances nothing. Harmless,
   but it reads as an intended refill assertion that was never written.

8. **The new test files are not statically typechecked.**
   `apps/server/tsconfig.json` includes only `src`, so `npm run typecheck` covers
   neither `networkBoundary.test.ts` nor `productionNetworkBoundary.test.ts`.
   This is the pre-existing repository-wide gap already recorded in the TEST-003
   review, restated only because two more test files now depend on it.

9. **`TokenBucketRateLimiter.consume` throws on backwards clock movement.**
   Because the injected clock is `performance.now`, this is unreachable in
   production, and failing loud rather than open is the right default. Noting it
   because the throw would surface inside a Colyseus message handler rather than
   as a denial if a future caller ever supplies a non-monotonic clock.

10. **Limiters are per-session and reset on rejoin.** A client that disconnects
    and rejoins receives a fresh budget, since `onLeave` correctly deletes the
    session's bucket. This is inherent to session-keyed limiting; connection- and
    identity-level abuse control belongs to the declared reconnect/lifecycle
    boundary, which SEC-007 explicitly excludes.

## Integrated Security/Runtime Reviewer

- Verdict: `APPROVED WITH NON-BLOCKING NOTES`
- Reviewed commit: `0a43352b6a14e81e19015025b415b05971203562`
- Evidence source: Independent integrated Security/Runtime review of PR #55 —
  repository, scope, and two-commit verification; line-level inspection of
  `networkBoundary.ts`, `tokenBucketRateLimiter.ts`, `index.ts`, `BattleRoom.ts`,
  and `startProductionBattleServer.ts` against the pinned `colyseus@0.16.5`,
  `@colyseus/ws-transport@0.16.5`, and `colyseus.js@0.16.22` contracts; an origin
  normalization sweep over 41 malformed and equivalent forms; live raw-upgrade
  probing of the WebSocket verifier; production fail-closed and allowed-origin
  smoke runs against the built server; three consecutive targeted security-test
  runs; the full local regression suite, typecheck, build, protocol-profile
  check, and all three diagnostics; Core CI log verification on the final head;
  and documentation, CURRENT, and accepted-count verification — all recorded
  above.
- Date: 2026-08-11

The production Origin policy is strictly fail-closed: the allowlist is mandatory,
every malformed form is rejected before URL normalization, matching is exact
canonical equality with no suffix, substring, regular-expression, hostname-only,
or wildcard rule, and no malformed textual origin normalized into a different
accepted origin. Production cannot bind without a valid allowlist. Both the HTTP
matchmaking phase and the WebSocket handshake phase are enforced, and each was
confirmed against a running server rather than only in unit isolation. Denied
CORS responses override the framework's default wildcard and never reflect a
hostile Origin. Neither rate limiter can be silently disabled through a numeric
edge case, rejected input cannot refresh authoritative timing or state, a profile
flood mutates nothing and produces one bounded notice, and normal 20 Hz play is
untouched. Gameplay, schema, and wire contracts are unchanged. The security tests
are causal and deterministic across repeated runs, the PM2/Vitest wrapper is
narrowly scoped to `axm:` telemetry and cannot reach production or hide runner
IPC, and Core CI including `npm test` passes on the reviewed head. The notes
above are deferred follow-ups; none weakens the production boundary.

## Product Architect

- Verdict: `APPROVED FOR HUMAN MERGE`
- Reviewed commit: `958989b61e6d636501c20688e70993938fae678f`
- Evidence source: Owner-authored Product Architect approval on PR #55:
  https://github.com/pittonje/BurningSpace/pull/55#issuecomment-5251089806
- Date: 2026-08-11

Findings: The Product Architect accepted the integrated Security/Runtime verdict
`APPROVED WITH NON-BLOCKING NOTES` and confirmed that blocking findings are none.
The approval explicitly confirms fail-closed production startup and exact
canonical Origin matching with every malformed, wildcard, and broadening form
rejected; bounded local-development loopback defaults; matchmaking authorization
before seat reservation with independent WebSocket handshake enforcement; denied
CORS responses that never reflect a hostile Origin or expose wildcard access;
the profile limiter defaults of burst 8 / refill 1 per second and the input
limiter defaults of burst 80 / refill 40 per second, with invalid overrides
failing startup, bounded rejection amplification, no state mutation from excess
messages, unaffected 20 Hz play, and limiter cleanup on leave; unchanged
BattleRoom gameplay, schema, snapshot, message-name, and max-client behavior;
`npm test` as a required Core check with 97 tests in 8 files passing, the
targeted 62-test security suite passing three consecutive runs, and all
diagnostics green; the clean eleven-path bounded scope with no dependency,
manifest, lockfile, client, shared/protocol, schema, roadmap, governance, or
`PROJECT_CONTEXT` change; and accepted decisions remaining exactly 35 with the
split 18 / 5 / 7 / 4 / 1. The two-commit implementation deviation is explicitly
accepted as a bounded test-infrastructure repair for deterministic Linux
PM2/Vitest IPC interference, with the wrapper filtering only `axm:*` telemetry
and forwarding ordinary worker IPC unchanged.

Accepted non-blocking follow-ups: reconnect handling must not rely solely on
`BattleRoom.onAuth` because the Colyseus reconnect path bypasses that hook, with
the WebSocket Origin verifier remaining the current independent gate, and a
future reconnect task must explicitly preserve Origin and ownership validation
across reconnection; a future hardening task may add a full split-Origin
seat/upgrade integration scenario beyond the direct verifier and live handshake
evidence; optional rate-limit bounds may be tightened below
`Number.MAX_SAFE_INTEGER`; the security-mode log description may be made more
precise; dead test-only clock advancement may be removed; and server test files
may later receive explicit TypeScript project coverage.

Human merge remains conditional on this Product Architect evidence and the
successful Claude QA evidence being recorded, on Core Pull Request Checks and
Claude QA passing on the final evidence-commit head, and on no new substantive
blocker appearing. This is owner-authored pull-request-comment evidence, not a
formal GitHub review.

## Claude QA

- Verdict: `Approved with suggestions`
- Reviewed commit: `958989b61e6d636501c20688e70993938fae678f`
- Evidence source: Claude QA Review Pilot workflow run ID `31471800343`:
  https://github.com/pittonje/BurningSpace/actions/runs/31471800343
  (`qa-review` job `93716531964`:
  https://github.com/pittonje/BurningSpace/actions/runs/31471800343/job/93716531964;
  published verdict comment:
  https://github.com/pittonje/BurningSpace/pull/55#issuecomment-5250640565)
- Check conclusion: SUCCESS
- Date: 2026-08-11

Evidence state: the run's `headSha` is exactly
`958989b61e6d636501c20688e70993938fae678f`, its `status` is `completed` and its
`conclusion` is `success`, and the published comment records the same reviewed
commit and workflow run. Blockers are none and no substantive
`CHANGES REQUIRED` verdict exists.

Findings — important suggestions, all non-blocking:

1. The Colyseus `matchMaker.reconnect` path is not covered by `onAuth`/Origin
   enforcement — only `joinOrCreate`, `create`, `join`, and `joinById` are. It is
   currently inert because `BattleRoom` never calls `allowReconnection()`, but the
   upcoming reconnect-lifecycle task must add an explicit Origin check there
   rather than inherit the gap.
2. Task closure conditions require exactly one implementation commit plus one
   later evidence commit, but the pull request contains two implementation
   commits (`ecafdb66` network-boundary hardening and `0a43352` PM2/Vitest IPC
   fix) before the evidence commit. The deviation is disclosed and scoped to an
   already-authorized test-support file; QA asked that the Product Architect
   accept it explicitly, which the approval above does.
3. The WebSocket handshake Origin rejection is exercised only by a direct
   unit-level verifier test and manual live-probe evidence rather than by an
   automated integration test driving a real hostile raw upgrade, because
   matchmaking rejects hostile Origins first.
4. Rate-limit burst/refill overrides are accepted up to
   `Number.MAX_SAFE_INTEGER` with no documented practical ceiling, so an operator
   typo could make the limiter effectively unlimited without startup failing; a
   documented sane upper bound is suggested.

Findings — minor suggestions, all non-blocking:

5. `describeNetworkBoundaryMode()` branches only on `production`, so a
   non-production process running an explicit exact allowlist still logs
   `local-development mode`, understating the active policy.
6. `securityNow += 4_000;` is the final statement of the profile-flood
   integration test with no subsequent assertion and should be removed or
   completed.
7. The new security test files are outside `apps/server/tsconfig.json`'s
   `include: ["src"]`, so `npm run typecheck` does not statically check them —
   a pre-existing repository-wide gap that now covers two more security-critical
   test files.
8. The precision-safe minimum refill rate (`1000/Number.MAX_VALUE`) is a
   theoretical floor offering negligible practical protection against a
   near-zero refill misconfiguration; a more realistic minimum would be a more
   meaningful guard.

## Human merge gate

Human merge requires an approving independent integrated Security/Runtime
verdict, mandatory substantive Claude QA, Product Architect approval, one
combined evidence commit, and passing Core Pull Request Checks on the final
head. No agent may merge this pull request.
