# PERSIST002-NET-02 — Admission Budget Hardening

Owner: Product Architect
Risk: HIGH — network / security admission boundary
Base: `3aab85dbc21e01cf0689a1f9bb2dc59d2e64cb96` (`origin/main`, merge commit of PR #87)
Branch: `security/persist-002-net-02-admission-budget-hardening`
Status: **MERGED / CLOSED — REPOSITORY STAGE ONLY; PUBLIC ROLLOUT STILL BLOCKED**

## Authority

PERSIST-002 is MERGED (PR #86). PERSIST002-NET-02 was recorded open by the
post-merge reconciliation (PR #87) as a MEDIUM finding that explicitly
**blocks public persistence rollout**. This task implements the bounded
mitigation only. It does not reopen or reinterpret any accepted decision, and
it creates no new accepted decision record.

- Task: [PERSIST-002 — Durable World & Identity Foundation](persist-002-durable-world-identity-foundation.md)
- Architecture: [Persistent World and Durable Identity Architecture](../architecture/PERSISTENT_WORLD_IDENTITY_ARCHITECTURE.md)
- Rollout gate: [PERSIST-002 staging database integration plan](../ops/persist-002-staging-db-integration-plan.md)
- Edge contract: [Public Arena Caddy edge runbook](../ops/public-arena-caddy-edge-runbook.md)

The dated FIX1-FIX4 sections below preserve historical checkpoint wording and
evidence. Their OPEN, awaiting, and not-authorized statements describe those
earlier checkpoints; the current repository-stage status is recorded in the
final closure section.

## Problem

Both admission budgets — `POST /identity/guest` (capacity 3, refill 1/60s) and
fresh `BattleRoom.onAuth` (capacity 10, refill 1/s) — keyed their
`PeerRateLimiter` buckets from the direct Node transport peer
(`request.socket.remoteAddress` / `context.req.socket.remoteAddress`).

Under the real public topology

```
public client -> Caddy -> host loopback published Docker port
              -> Docker bridge/NAT -> Node container
```

every public client collapses onto one effective Node socket peer (the Docker
bridge gateway). One client exhausting its burst therefore denied admission to
every other public client.

This was proven, before any fix, against exact baseline
`3aab85dbc21e01cf0689a1f9bb2dc59d2e64cb96` through real server admission
behavior: see "Negative control" below.

## Factual correction carried into this task

Caddy's current `reverse_proxy` defaults **ignore** incoming `X-Forwarded-*`
values for spoof-resistance. BurningSpace is **not** working around a Caddy
trust bug, and no documentation in this task may claim that the current Caddy
configuration blindly trusts or appends attacker-controlled `X-Forwarded-For`.

A dedicated internal header was nevertheless chosen because it gives
BurningSpace an explicit, narrow, independently testable edge contract:

- it is owned entirely by this edge contract;
- Caddy SET-overwrites it (`header_up` without `+`);
- Node reads it only from an explicitly trusted direct socket peer;
- no proxy-chain parsing is needed;
- a future change to generic forwarded-header policy cannot silently alter
  BurningSpace admission semantics.

`X-Forwarded-For`, `X-Real-IP` and `Forwarded` remain completely unused by
BurningSpace admission logic.

## Behavioral contract

### One canonical resolver

[`apps/server/src/security/admissionPeerIdentity.ts`](../../apps/server/src/security/admissionPeerIdentity.ts)
is the single admission-peer identity resolver. Both `POST /identity/guest`
and fresh `BattleRoom.onAuth` route through one per-process resolver
instance. No second copy of peer-key logic exists. Gameplay profile/input
message limiters are untouched.

### Internal header

Exactly `X-BurningSpace-Edge-Peer`. Node reads it **only** when the canonical
direct `request.socket.remoteAddress` is in the configured trusted-edge peer
set.

### Trust configuration

`BURNINGSPACE_TRUSTED_EDGE_PEERS`, comma-separated **exact IP literals**.

| Value | Meaning |
| --- | --- |
| absent | direct-peer-only (empty trusted set), not explicitly configured |
| `none` | direct-peer-only, explicitly configured |
| `172.18.0.1` / `172.18.0.1,127.0.0.1` / `::1` | that trusted set |
| present but empty | **startup fails** |
| malformed in any element | **startup fails** |

Rejected at startup: CIDR, DNS names, `host:port`, `[IPv6]` wrappers, zone
identifiers, empty elements, and any mixing of `none` with real addresses.

The variable is **not** made globally mandatory by `NODE_ENV=production`;
existing production-mode tests continue in direct-peer-only mode. The real
staging Compose path (`deploy/docker-compose.staging.yml`) does require it,
through a required `:?` substitution rather than a silent default.

### Canonicalization

- Direct socket peer and trusted-edge config: canonical IP address semantics.
- Internal edge header: exactly ONE IP literal. Before parsing — max 64 bytes,
  outer whitespace trimmed, control characters rejected, comma rejected, `%`
  rejected, array/multiple header values rejected. For the edge header
  specifically, ports, `[IPv6]` wrappers, `host:port` forms and DNS names are
  rejected. Validation uses `node:net` `isIP`.
- IPv4 → canonical IPv4 key.
- IPv4-mapped IPv6 → `::ffff:a.b.c.d` normalizes to the same identity as
  `a.b.c.d`.
- IPv6 → canonicalized deterministically and **aggregated to /64** for budget
  purposes.
- Key spaces are namespaced `direct:` and `edge:` so they can never collide.

The /64 aggregation is an explicit rate-limit policy decision: it prevents one
ordinary IPv6 /64 from cheaply manufacturing enough syntactic peer identities
to exhaust the bounded 10,000-bucket map. Trust matching deliberately uses the
**exact** address, never the /64, so trusting one IPv6 host never trusts its
whole /64.

### Accepted limitation

An IP-based limiter does not identify a human or a device. Clients sharing one
public IPv4 address (carrier NAT, a school, an office) or one IPv6 /64 share an
admission budget. This is a rate-limit fairness trade-off, not an identity
mechanism, and it prevents no Sybil attack.

### Failure behavior

- Direct peer **not** trusted: the internal header is ignored completely and
  the canonical direct peer keys the budget. A forged header grants no
  authority whatsoever.
- Direct peer **is** trusted: a single valid internal assertion is REQUIRED.
  Missing, empty, repeated, comma-listed, overlong, control-bearing, ported,
  bracketed, zoned or otherwise malformed assertions FAIL CLOSED for that
  admission attempt. There is deliberately **no** shared trusted-proxy
  fallback bucket and no edge-degraded shared key.

Existing public protocol shapes are preserved exactly:

- `/identity/guest` → the existing `429 {"ok":false,"error":"rate_limited"}` path;
- fresh `BattleRoom.onAuth` → the existing `auth_rate_limited` failure shape.

No client protocol field was added. Origin rejection still happens BEFORE
admission identity resolution and token consumption, exactly as before.

When the direct transport peer is genuinely unavailable or is not an IP
literal at all, the resolver keeps the pre-NET-02 conservative behavior: one
fixed shared key (`direct:unavailable`), rather than failing admission closed
on a transport quirk. This is not an edge-degraded bucket — it is only ever
reached when there is no direct peer address to key from.

### Bounded diagnostic

A trusted-edge assertion failure emits at most one operational line per
distinct fixed reason per 60 s, carrying only an allowlisted reason
(`edge_assertion_missing` / `edge_assertion_repeated` /
`edge_assertion_malformed`) plus a suppressed-count. No raw IP, no raw header
value, no header name. The reason map is bounded by construction. Nothing is
emitted at all in direct-peer-only mode.

### Limits unchanged

| Limiter | Capacity | Refill | maxBuckets | Idle eviction |
| --- | --- | --- | --- | --- |
| Guest identity | 3 | 1 / 60 s | 10,000 | 600,000 ms |
| Fresh auth | 10 | 1 / s | 10,000 | 600,000 ms |

No quota was increased and no rate limiting was disabled.

## Caddy contract

The **public SERVER** `reverse_proxy` block SETs the header:

```
header_up X-BurningSpace-Edge-Peer {remote_host}
```

`header_up` without `+` is a SET/overwrite, so any client-supplied value is
replaced by Caddy's own direct connecting host.

The **public CLIENT** `reverse_proxy` block REMOVEs it (PA FIX1):

```
header_up -X-BurningSpace-Edge-Peer
```

This is least privilege for a security-internal header. Forwarding an
attacker-supplied value to the static client upstream was not an exploitable
admission bypass — that upstream owns no admission logic — but the header is
now stripped so it never reaches an upstream that has no business seeing it. No
peer value is ever synthesized for the client upstream.

Not used: `{client_ip}`, `X-Forwarded-For` as the BurningSpace source,
`trusted_proxies`, `Forwarded`, `X-Real-IP`, or any proxy chain.

`apps/server/scripts/external-staging-edge-preflight.ts` positively enforces
the per-route contract: exactly one SET and exactly one REMOVE of that header
in the template; the SET carries the exact `{remote_host}` value and lives only
in the server route; the REMOVE carries no value and lives only in the client
route; neither route carries the other's operation; no `+add` or wildcard form
is accepted; and no new `header_up` dependency on `X-Forwarded-*` /
`X-Real-IP` / `Forwarded` is introduced.

## Negative control

Built against exact baseline `3aab85dbc21e01cf0689a1f9bb2dc59d2e64cb96` in a
disposable detached worktree (never in the implementation worktree), using the
real production server, real test PostgreSQL, one real local HTTP proxy peer
per synthetic public client, both reaching Node through the SAME socket peer:

- baseline: client A gets 3 × 201 then 429; client B's **first** request gets
  429; exactly 3 player rows created;
- fixed code, identical scenario: client A gets 3 × 201 then 429; client B
  still gets 201; 4 player rows created;
- fixed code **without** trusted-edge configuration: A and B collide again,
  proving the header alone grants no authority.

## Risk classification

| Dimension | Level |
| --- | --- |
| runtime | medium |
| networking | high |
| security | high |
| protocol | none |
| persistence | low |
| performance | low |
| ci | medium |
| documentation | medium |

## Review routing

Required independent review after publication:

- Architecture
- Network
- Security
- QA

Gameplay: **Not applicable.** No gameplay rule, balance, movement, combat,
faction, respawn or profile semantics changed, and no gameplay message limiter
was touched.

Visual: **Not applicable.**

No reviewer ran during the implementation session. Human merge only.

## Deployment boundary

This task authorizes **no** deployment. Specifically not: commit-time
deployment, image publication, VPS/Contabo access, staging traffic, production
secrets, a Caddy reload on the real host, DB schema/migration change, or any
change to real staging configuration.

`BURNINGSPACE_TRUSTED_EDGE_PEERS=none` in the committed documentation-safe and
local-CI env examples is a deliberate direct-peer-only sentinel for those
topologies. The live Docker gateway address is deliberately **not** guessed in
this change. A public persistence rollout MUST supply the exact peer observed
inside the target container; `none` or an omitted value is never rollout
acceptance.

## Closure conditions

The repository-stage closure conditions are satisfied:

- implementation publication;
- exact-head Core SUCCESS;
- governed QA;
- independent QA review;
- independent Architecture review;
- independent Network review;
- independent Security review;
- PA acceptance;
- human merge.

Even a CLOSED NET-02 removes only one rollout blocker. It does **not**
authorize persistence deployment. QA-01 and QA-02 remain unrelated deferred
items.

## File surface

Runtime:

- NEW `apps/server/src/security/admissionPeerIdentity.ts`
- MOD `apps/server/src/index.ts`
- MOD `apps/server/src/http/identityGuestEndpoint.ts`
- MOD `apps/server/src/persistence/productionRoomDependencies.ts`

Unchanged by design: `networkBoundary.ts`, `peerRateLimiter.ts`,
`tokenBucketRateLimiter.ts`, `rooms/BattleRoom.ts`.

Edge / config:

- MOD `deploy/edge/caddy/Caddyfile.template`
- MOD `deploy/docker-compose.staging.yml`
- MOD `deploy/staging.env.example`
- MOD `deploy/external-staging.env.example`
- MOD `apps/server/scripts/external-staging-edge-preflight.ts`
- MOD `apps/server/scripts/external-staging-edge-contract-check.ts`
- MOD `apps/server/scripts/external-staging-preflight.ts` — **one allowlist
  entry only.** Its `ENV_KEYS` Set rejects any unknown key in
  `deploy/external-staging.env.example`, which the CI compose-render step
  consumes, so declaring the new required variable there is impossible without
  this one line. No validation logic changed. This file was outside the
  originally expected surface and was raised to and approved by the PA before
  editing.

Tests:

- NEW `apps/server/test/security/admissionPeerIdentity.test.ts`
- NEW `apps/server/test/persistence/admissionBudgetIsolation.test.ts`
- MOD `apps/server/test/persistence/freshAuthRateLimiting.test.ts` — explicit
  direct-peer-only fixture only.

CI:

- MOD `.github/workflows/pr-checks.yml` — exact edge-contract assertion count
  synchronization only (26 → 39).

Documentation:

- NEW this file
- MOD `docs/handoffs/CURRENT.md`
- MOD `docs/ops/public-arena-caddy-edge-runbook.md`
- MOD `docs/ops/persist-002-staging-db-integration-plan.md`

## PA FIX2 — authenticate the trusted edge hop (PERSIST002-NET02-EDGE-AUTH-01)

PA source-delta review found one HIGH security blocker against the FIX1
design. It is addressed here. NET-02 remains **OPEN**.

### The blocker

FIX1 trusted a direct socket peer identified by
`BURNINGSPACE_TRUSTED_EDGE_PEERS`. In the real staging topology the Node
container observes the Docker bridge / NAT gateway for connections arriving
through the host-published loopback port. That address identifies the
host-side Docker NAT path, **not** the Caddy process, so another local process
on the VPS could bypass Caddy:

```
local process -> 127.0.0.1:${BURNINGSPACE_SERVER_BIND_PORT} -> Docker NAT -> Node
```

and arrive with the same direct socket peer as Caddy, forge
`X-BurningSpace-Edge-Peer`, and be treated as an edge-attributed client. This
violated the accepted requirement that a direct caller reaching Node without
trusted Caddy must not be able to assert another admission identity.

Reproduced against the pre-FIX2 tree with a real production server and real
PostgreSQL, trusting `127.0.0.1`, calling Node directly with no proof:

```
forged peer 198.51.100.11 -> [201, 201, 201, 429]
forged peer 198.51.100.22 -> [201, 201, 201, 429]
```

Two independent capacity-3 budgets and six durable players from one socket
peer.

### The fix

The exact direct-peer allowlist is kept, but demoted to **one** factor — a
network-location restriction. A second, cryptographic factor authenticates the
Caddy/operator hop.

Internal headers:

- `X-BurningSpace-Edge-Peer` — the claim.
- `X-BurningSpace-Edge-Proof` — the proof.

Environment:

- `BURNINGSPACE_TRUSTED_EDGE_PEERS`
- `BURNINGSPACE_EDGE_ASSERTION_SECRET`

Node uses the peer assertion only when **both** hold: the canonical
`request.socket.remoteAddress` is in `trustedEdgePeers`, **and** the supplied
proof authenticates against the configured secret. A trusted socket peer alone
is not sufficient. The proof is authenticated **before** the peer assertion is
inspected, so an unauthenticated caller learns nothing about peer parsing.

### Secret format

Exactly 32 random bytes, canonical unpadded base64url, exactly 43 characters
over `[A-Za-z0-9_-]`, no padding, no whitespace, no alternative encoding. The
one explicit direct-only sentinel is `none`.

| peers | secret | result |
| --- | --- | --- |
| absent / `none` | absent / `none` | direct-peer-only |
| non-empty | valid 256-bit secret | trusted-edge |
| non-empty | missing / `none` / malformed | startup failure |
| absent / `none` | a real secret | startup failure |

No real secret is committed. Examples carry `none` for both; a real rollout
must replace both.

### Server verification

The raw secret is parsed away at startup: only a SHA-256 verifier is retained,
privately, and the built resolver's public config omits it structurally. A
supplied proof is shape-checked, decoded, hashed, and compared with
`crypto.timingSafeEqual` over two fixed 32-byte digests. The secret, the
verifier, the supplied proof and the raw internal header values are never
logged. Diagnostics carry only the fixed codes `edge_proof_missing`,
`edge_proof_malformed` and `edge_proof_rejected`.

Public failure shapes are unchanged — `/identity/guest` returns
`429 rate_limited`, fresh auth returns `auth_rate_limited` — and **no token
bucket is consumed for an invalid edge proof**.

### Array contract correction

`Array.isArray(raw)` now always rejects, for both internal headers. The
previous single-element recursive acceptance contradicted the approved strict
contract. The unit test `accepts a single-element array header value` is
removed and replaced with rejection evidence for both headers.

### Caddy

**Superseded by PA FIX3-A below:** the proof source shown here was the Caddy
environment placeholder. PA rejected service environment as the transport; the
server route now reads a systemd credential file instead. See the FIX3
section for the current contract.

Public **server** route SETs both:

```
header_up X-BurningSpace-Edge-Peer {remote_host}
header_up X-BurningSpace-Edge-Proof {$BURNINGSPACE_EDGE_ASSERTION_SECRET}
```

Public **client** route REMOVEs both:

```
header_up -X-BurningSpace-Edge-Peer
header_up -X-BurningSpace-Edge-Proof
```

No forwarded-header trust. (Also superseded by FIX3-A: the proof now comes
only from the systemd credential file, the render special-case that preserved
an unresolved `{$VAR}` is removed, and the adapted-config inspector requires
the retained artifact to carry exactly the approved `{file....}` placeholder.)

### Operator environment contract

`/etc/caddy/burningspace.env` is documented as a **non-secret** inventory that
must contain no tokens, so the secret cannot live there. One additional exact
file is therefore required and modified:
`deploy/edge/caddy/systemd/caddy.service.d/10-burningspace-edge.conf`.

**Superseded by PA FIX3-A below:** this section originally used
`EnvironmentFile=`. PA rejected service environment as the transport; the
drop-in now carries `LoadCredential=` instead. See the FIX3 section.

### Ops accuracy

The Docker bridge peer allowlist is a **network-location restriction, not
proof of the Caddy process**. The edge proof authenticates the Caddy/operator
hop. After Docker network recreation the observed direct peer may change and
must be re-measured before an authorized rollout. Nothing in this work claims
that the Docker gateway address uniquely identifies Caddy.

### Additional changed files (FIX2)

- MOD `deploy/edge/caddy/systemd/caddy.service.d/10-burningspace-edge.conf`
- MOD `.github/workflows/pr-checks.yml` — edge-contract assertion count
  synchronization only (39 → 54).

### Status

`IMPLEMENTED LOCALLY / PA SOURCE REVIEW PENDING`. No commit, push, PR,
deployment, image publication, Caddy reload on a real host, production secret
creation, or database/schema change.

## PA FIX3 — secure Caddy credential transport + canonical proof

PA source review of the FIX2 full patch accepted the core architecture and
returned three bounded corrections. NET-02 remains **OPEN**.

### FIX3-A (HIGH) — PERSIST002-NET02-SECRET-TRANSPORT-01

**Rejected:** `EnvironmentFile=/etc/caddy/burningspace-edge-secret.env` plus
`header_up X-BurningSpace-Edge-Proof {$BURNINGSPACE_EDGE_ASSERTION_SECRET}`.
The edge secret exists specifically to stop another host-local process from
impersonating Caddy, so service environment is not an acceptable final
transport.

**Approved and implemented:** a systemd unit credential.

- credential ID: `burningspace-edge-assertion-secret`
- operator source: `/etc/caddy/burningspace-edge-assertion-secret`, `root:root`
  `0600`, containing **only** the canonical 43-character base64url value —
  no `KEY=` prefix, no trailing newline
- drop-in:
  `LoadCredential=burningspace-edge-assertion-secret:/etc/caddy/burningspace-edge-assertion-secret`
- service credential path (unit is `caddy.service`):
  `/run/credentials/caddy.service/burningspace-edge-assertion-secret`
- public **server** route:
  ```
  header_up X-BurningSpace-Edge-Peer {remote_host}
  header_up X-BurningSpace-Edge-Proof {file./run/credentials/caddy.service/burningspace-edge-assertion-secret}
  ```
- public **client** route still REMOVEs both.

`EnvironmentFile=` is removed. The secret must never appear in the Caddy
environment, `Environment=`, `EnvironmentFile=`, the rendered Caddyfile,
retained adapted JSON, or a command line.

This is `LoadCredential=`, **not** `LoadCredentialEncrypted=`. No
encryption-at-rest claim is made.

The Node server continues to receive `BURNINGSPACE_EDGE_ASSERTION_SECRET`
through its existing Docker server configuration; FIX3 deliberately does not
expand into Docker-secret architecture.

**Preflight contract now requires/rejects:**

- the exact `LoadCredential=` line, and rejects any `Environment=` /
  `EnvironmentFile=` line in the drop-in;
- the exact `{file.<runtime path>}` proof source, rejecting the environment
  placeholder, any other credential id or path, an arbitrary host file, a
  request header, and literal values;
- the FIX2 route ownership and SET/REMOVE checks, unchanged.

The FIX2 render special-case that preserved `{$BURNINGSPACE_EDGE_ASSERTION_SECRET}`
unresolved is removed: every `{$VAR}` must now resolve, and `{file.*}` passes
through as a Caddy runtime placeholder. The adapted-config inspector now
requires the retained artifact to carry exactly one edge-proof value equal to
the approved `{file....}` placeholder.

One adjacent correction was required: the template's forbidden-directive scan
matched the bare word `credentials` anywhere, which the approved runtime path
`/run/credentials/caddy.service/...` legitimately contains. That check is now
anchored to a directive position (line-leading `credentials`), so the
prohibition is preserved without a false positive.

### FIX3-B (LOW) — PERSIST002-NET02-PROOF-CANON-01

The incoming proof verifier now applies the same canonical round-trip the
startup parser already used: after `decoded.length === 32`, it requires
`decoded.toString('base64url') === supplied.value`, rejecting otherwise as
`edge_proof_malformed`, and only then hashes and compares with
`crypto.timingSafeEqual`.

The discriminating test builds an alternate spelling of the **actual
configured disposable secret** by flipping an unused low bit of the final
base64url character, proves the alternate text decodes to byte-identical
output, and proves the resolver rejects it while accepting the canonical
spelling. With the check temporarily removed the test fails, confirming it
discriminates.

### FIX3-C (MEDIUM) — PERSIST002-NET02-ENV-EXAMPLE-01

The FIX2 patch had split a generation command across lines in
`deploy/external-staging.env.example`, leaving a bare non-comment line
containing a quote. That command is removed and replaced with documentation
text pointing at the runbook. `BURNINGSPACE_EDGE_ASSERTION_SECRET=none` is
retained in the repository-safe Node/Compose examples. The canonical
generation command lives in the runbook as a single textual line producing
exactly 43 characters with no newline, written directly into the credential
source file rather than as `KEY=value`.

### Additional changed files (FIX3)

- MOD `deploy/edge/caddy/systemd/caddy.service.d/10-burningspace-edge.conf` —
  `EnvironmentFile=` replaced by `LoadCredential=`.
- MOD `.github/workflows/pr-checks.yml` — edge-contract assertion count
  synchronization only (54 -> 57).

  **Superseded / incomplete as written:** a later commit on this branch
  (`b3ca9356…`) also added CI provisioning of the exact
  `/run/credentials/caddy.service` path, so `pr-checks.yml` is no longer an
  assertion-count-only change. See **FIX4-D — PERSIST002-NET02-CI-01** below
  for the full, accurate record.

### Status

`PA SOURCE APPROVED / PUBLICATION AUTHORIZED / AWAITING EXACT-HEAD CI AND INDEPENDENT REVIEWS`.

The Product Architect completed source review of the FIX3 delta and
authorized publication. The implementation is **not** accepted for merge.

- PERSIST002-NET-02 — **OPEN**
- PUBLIC PERSISTENCE ROLLOUT — **BLOCKED**
- **NO DEPLOYMENT AUTHORIZED**

Publication covers the repository only. No merge, deployment, image
publication, VPS access, Caddy reload on a real host, production secret
creation/use, or database/schema change is authorized by it.

## PA FIX4 — review hardening

Independent Architecture, Network and Security reviews and governed QA all
returned **APPROVE / Approved with suggestions, no blockers**. PA FIX4
implements exactly four bounded corrections. NET-02 remains **OPEN**; merge
and deployment remain unauthorized.

### FIX4-A — PERSIST002-NET02-CHECKER-SAFETY-01

`external-staging-edge-contract-check.ts` materializes its disposable
credential at the exact production-compatible runtime path. Previously
`installDisposableEdgeCredential()` used ordinary write semantics and
`removeDisposableEdgeCredential()` removed that exact path unconditionally, so
running the checker as root on a real Caddy host could have overwritten and
then deleted the live operator credential, causing a fail-closed admission
outage.

Corrections:

- creation is now **exclusive** (`writeFileSync(..., { flag: 'wx' })`); a
  pre-existing path raises a deterministic `EDGE_CREDENTIAL_PRESENT`
  `ContractError` with a fixed diagnostic that never prints the path contents
  or any secret;
- ownership is tracked (`ownedCredentialPath`), set only after a successful
  exclusive create, so a later verification failure still cleans up the file
  this invocation made;
- cleanup removes the credential **only** when this invocation created it, on
  success or failure; a path the checker did not create is never touched.

The exact production-compatible path, 43 bytes, absent newline, mode `0400`
while Caddy reads it, the unprivileged checker and unprivileged Caddy are all
preserved. The secret is still never printed.

Five discriminating guard assertions run before the runtime proof, against a
disposable temporary path, and are reported as contract checks:
`credentialRefusesToOverwriteExisting`, `preExistingCredentialLeftIntact`,
`cleanupSkipsCredentialItDidNotCreate`,
`disposableCredentialCreatedExclusively`,
`disposableCredentialRemovedAfterUse`. The real
`/run/credentials/caddy.service/...` contract remains exercised by the Caddy
runtime proof that follows.

### FIX4-B — PERSIST002-NET02-SECRET-CREATE-01

The runbook previously generated the rollout secret with a plain redirection
and only afterwards applied `chown`/`chmod`, so under a common `umask 022` the
file existed world-readable in between. Measured on a Linux host that
procedure yields mode `644`.

The runbook now creates the target private **before** any secret bytes are
written (`umask 077` plus
`install -m 0600 -o root -g root /dev/null <path>`, then redirect into the
existing private inode), and verifies with `stat -c '%U:%G %a %s'` expecting
exactly `root:root 600 43`. Measured result of the corrected procedure:
`root:root 600 43`, no trailing newline, canonical 43-character base64url.
The value is never printed. Node-side Docker environment delivery is
unchanged and out of scope.

### FIX4-C — PERSIST002-NET02-PROOF-WHITESPACE-01

Both internal headers previously shared `readSingleInternalHeader()`, which
applied `raw.trim()`. A genuine proof surrounded by whitespace therefore
became valid after trimming, contradicting the FIX3 contract that exactly one
canonical 43-character spelling is authoritative on the wire.

`readSingleInternalHeader()` now takes an explicit
`InternalHeaderWhitespacePolicy`:

- the edge **proof** uses `'exact'` — the raw string is returned unchanged, so
  surrounding ASCII space, NBSP, en space, ideographic space, ZWNBSP or line
  separator survives into the canonical-shape test and is rejected as
  `edge_proof_malformed`;
- the edge **peer** keeps `'trim'`, its existing documented contract.

A header carrying only whitespace is still reported as `missing` under both
policies, so that public behavior is unchanged. `timingSafeEqual`, the
canonical base64url round-trip, fixed-length digest comparison,
array/repeated-header rejection and fail-closed behavior are untouched.

### FIX4-D — PERSIST002-NET02-CI-01 (governance reconciliation)

Earlier FIX3 records described the `pr-checks.yml` change as only an
assertion-count synchronization. That is no longer the whole truth. The
record is corrected here.

- The historical Core run on `0eef83422cfb021d1ce9deb3cd8f18c81839cc08`
  failed **only** during edge-contract initialization. Application tests,
  build, typecheck and the staging/edge preflights had already passed in that
  same run.
- Root cause: the GitHub-hosted, unprivileged runner could not create the
  exact `/run/credentials/caddy.service` path that the checker deliberately
  exercises. The failure surfaced as the generic
  `RUNTIME_UNEXPECTED ... during initialization` because the stage had not yet
  advanced.
- **No application or Caddy contract source defect was found.**
- Head `b3ca93567abf3254f1baa181e4c2ff6d42454ba2` added narrowly scoped CI
  provisioning for that exact directory: fail-closed if it already exists,
  `sudo install -d -m 0700` owned by the runner, an `EXIT` trap removing only
  that path, and a post-run assertion that the disposable credential was
  removed by the checker.
- The checker and Caddy remained **unprivileged**; `sudo` is used only to
  create and delete that one directory, never to run repository-controlled
  code.
- The exact production-compatible credential path remained under test.
- Exact-head Core then passed with `runtimeExecuted: true` and 57/57 checks.
- This CI correction is **PA technically accepted**. It does **not** authorize
  merge or deployment.

FIX4-A raises the contract assertion count from 57 to **62**, so
`.github/workflows/pr-checks.yml` carries a further exact numeric contract
update (57 -> 62) and nothing else.

### Explicitly deferred (not implemented in FIX4)

Recorded so the residual risk is not lost, with no scope expansion:

1. Silent degradation after Docker peer drift — if the real gateway changes
   and is not trusted, clients collapse onto `direct:`. Safe but
   operationally degraded. Rollout must re-measure the peer on the final
   composed topology and include a genuine multi-client admission smoke. No
   new runtime diagnostics were added.
2. The 10,000-bucket table can be filled by an attacker controlling many IPs
   or IPv6 /64s. Bounded-memory by design, not a regression relative to the
   previous single global bucket, and invalid edge proofs consume no limiter
   entry. Observability and any secondary tier belong to rollout/future
   hardening. Capacities, `maxBuckets`, IPv6 /64 policy and eviction are
   unchanged, and no global limiter was added.
3. Node-side secret delivery remains the Docker/container environment,
   explicitly excluded from FIX3 and unchanged here.
4. Secret rotation procedure — not part of FIX4.
5. Broader stale-documentation cleanup — only text required for FIX4
   correctness and governance was changed.
6. The QA attempt-1 failure comment remains historically present on the PR and
   was not deleted or rewritten.

### Status

`PERSIST002-NET-02 — MERGED / CLOSED`.

## Final repository-stage closure

PERSIST002-NET-02 is closed at the repository stage through PR [#88](https://github.com/pittonje/BurningSpace/pull/88).

### Merge provenance

- Approved exact source head: `75b74b0ea12d2fbc4899d4ded22920c3700249db`
- Merge commit / current `main`: `360958d31db08ad7c141a2a44b69f92744606456`
- Expected merge parents: `afb61276e0ad75b5a3964183e9b316b97eaa7e33` and `75b74b0ea12d2fbc4899d4ded22920c3700249db`
- Source-head tree: `44e211ef14ede17d545734ee616cc809da0347c5`
- Merge-commit tree: `44e211ef14ede17d545734ee616cc809da0347c5`
- Tree equivalence: approved source head == merge commit
- PR state: **CLOSED / MERGED**
- Merged at: `2026-09-19T20:33:09Z`

### Accepted final evidence

- Core Pull Request Checks: run `35466241776`, **SUCCESS**, bound to the approved source head
- Governed Claude QA: run `35466241823`, **SUCCESS**, disposition **Approved with suggestions**, blockers: **None**, bound to the approved source head
- Independent QA closure review: **APPROVE WITH SUGGESTIONS**, blockers: **None**; independently verified the approved source head, exact-head Core/governed-QA evidence, acceptance/test discrimination coverage and source/merge tree equivalence
- Architecture delta review: **APPROVE WITH SUGGESTIONS**, blockers: **None**
- Network delta review: **APPROVE WITH SUGGESTIONS**, blockers: **None**
- Security delta review: **APPROVE WITH SUGGESTIONS**, blockers: **None**
- Product Architect final disposition: **APPROVED FOR HUMAN MERGE**
- Human merge: **completed**

The accepted Core and governed QA runs are exact-head evidence for the
approved source head. The merge commit itself was not rerun through PR CI;
tree equivalence establishes that it contains the exact approved source tree.
No unavailable review IDs, timestamps, or hashes are inferred here.

### Rollout boundary

**PERSIST002-NET-02 — MERGED / CLOSED** records implementation and repository
closure only. **PUBLIC PERSISTENCE ROLLOUT — BLOCKED.** **DEPLOYMENT — NOT
AUTHORIZED.** This record grants no authority for VPS/Contabo access, image
publication, real edge secret creation or use, Caddy reload, PostgreSQL
activation, persistence deployment, schema/migration execution, or external
staging mutation.

The deferred rollout findings remain separate and unchanged: Docker peer drift
must be re-measured on the final composed topology; a genuine multi-client
admission smoke is required before an authorized rollout; 10,000-bucket
observability/future hardening remains deferred; Node-side Docker environment
secret handling remains deferred; secret rotation remains deferred; and other
previously recorded rollout items remain out of scope. No rollout task is
started by this closure.

The next safe action is to prepare a separate rollout/deployment readiness gate
for Product Architect review, without executing deployment.
